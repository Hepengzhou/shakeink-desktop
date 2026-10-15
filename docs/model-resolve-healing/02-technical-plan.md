# 技术方案：失效模型引用的解析期自愈（model resolve healing）

日期：2026-10-15
前置：`01-research.md`（根因：冻结快照/会话修补持有已删除模型记录的旧 UUID，与当前配置的新记录 UUID 错配）

## 1. 目标与验收语义

- **G1**：已配置一个可用的对应角色默认模型时，任务持有的失效模型 id 不再触发「当前任务没有可用模型」；该次任务直接以当前默认模型执行。
- **G2**：确实没有任何可用配置（未配置 / 默认也已失效）时，保持原有报错码与弹窗引导不变。
- **G3**（保留约束，不得破坏）：
  - 显式 null（用户明确不选该角色）继续阻断：`MODEL_NOT_SELECTED` / `MODEL_NOT_CONFIGURED`；
  - 审核模型绝不隐式落回文本模型（DEFAULT-14 语义）；
  - 失效 id 绝不自动挑中**未被配置为默认**的任意剩余记录（DEFAULT-11 语义收窄后的表述）；
  - `intent: "selection"` 的显式选择校验保持严格，不自愈。

## 2. 方案选型

| 方案 | 描述 | 结论 |
| --- | --- | --- |
| A. worker 层重试 | `resolveLocalModel`（`desktop/service/models.ts:36-47`）捕获 `MODEL_NOT_FOUND` 后省略 id 重新调用，让主进程走 `:35` 的默认回退 | **否决**：首次失败已在 `desktop/main/index.ts:198-201` 发出 notice，对话框会闪现；多一次 RPC；notice 抑制与重试分散两层 |
| B. 主进程解析层自愈（选定） | `ModelService.resolve()`（`desktop/main/model-service.ts:31-55`）在「显式 id 找不到记录」时，回退到该角色**当前配置的默认模型 id** 再查一次 | 单点改动；失败才发 notice，自愈成功零弹窗；覆盖全部 invoke 调用方（聊天文本、审核、文生图、SOP、重试），因为它们都经 `model.resolve` |
| C. 删除时级联改写 PG 快照 | `removeModel` 同步清理 `Conversation.reviewModelId` 与各 `defaultsSnapshot` | **否决**：跨进程跨存储（state.json 在主进程，快照在 worker PG，会话目录可外置未挂载）；冻结快照是历史事实，不应改写；无法覆盖 state.json 自愈重置、跨机拷贝等记录消失路径 |

## 3. 设计：`ModelService.resolve` 自愈规则

现行逻辑（`desktop/main/model-service.ts:34-40`）：

```
kind  = role === "image" ? "IMAGE" : "TEXT"
id    = selection.id === undefined ? settings.agent[roleKey] : selection.id
if (!id)                          → MODEL_NOT_SELECTED / MODEL_NOT_CONFIGURED
model = state.models.find(id)
if (!model)                       → MODEL_NOT_FOUND
```

改为（仅第 4 步插入自愈，其余分支逐字保留）：

```
roleKey = role === "image" ? "imageModelId" : role === "review" ? "reviewModelId" : "textModelId"
id      = selection.id === undefined ? settings.agent[roleKey] : selection.id
if (!id)                            → MODEL_NOT_SELECTED / MODEL_NOT_CONFIGURED   （不变）
model   = state.models.find(id)
if (!model && selection.intent !== "selection") {
  fallback = settings.agent[roleKey]
  if (fallback && fallback !== id) model = state.models.find(fallback)            // 自愈：唯一目标是当前配置的该角色默认
}
if (!model)                         → MODEL_NOT_FOUND                              （不变）
```

后续校验（`:39` enabled、`:40` kind、`:43-47` keyFor/`MODEL_KEY_MISSING`、`:52-53` 并发复查/`AUTHORIZATION_REVOKED`）对**最终选中的记录**照常执行，无需改动：

- 自愈到的默认已停用 → `MODEL_DISABLED`（如实告知，引导设置页）；
- 自愈到的默认密钥缺失 → `MODEL_KEY_MISSING`；
- 校验期间被并发删改 → `AUTHORIZATION_REVOKED`。

### 语义要点

1. **自愈目标唯一**：只能是 `settings.agent.{role}ModelId` 当前指向的记录。绝不遍历挑选其他剩余记录 —— DEFAULT-11 场景（冻结 id 与默认同时失效）仍报 `MODEL_NOT_FOUND`，现存断言不受影响。触发条件「显式 id 失效」覆盖一切显式来源：冻结快照（text/review/image）、对话修补的 `Conversation.reviewModelId`，以及 composer 每回合显式覆盖的 `input.modelId`（`src/lib/services/chat-turn.ts:202`）——后者失效时同样静默解析到当前文本默认，不再弹窗（G1 的应有之义）。
2. **角色隔离**：`role: "review"` 只看 `reviewModelId`，不会落回文本默认（DEFAULT-14 语义保持）；text/image 同理各看各的。
3. **intent 门禁**：`"selection"`（`ReviewModelSelection` PATCH 前的显式选择验证，`src/lib/services/chat-turn.ts:41`）不自愈，用户选什么就验证什么。
4. **`intent: undefined` 的调用方**（`model.start` `:64`、`startImage` `:98`）：旧 id 已删时 resolve 可自愈到当前默认记录，但**绝无可能用错模型发请求**——真正的兜底是 `gateway.begin(input.modelId, …)`（`:71`/`:100`）仍以原始入参的旧 UUID 取租约：删除提交即同步 `gateway.remove(id)`（`desktop/main/model-repository.ts:34`、`:51` → `desktop/core/model-authorization.ts:51`），旧 id 已不在网关 records，`begin` 在 `model-authorization.ts:62` 抛 `MODEL_UNAVAILABLE`，`gateway.fetch` 永不执行。注意 `authRevision` 不能保证不等（新记录从 1 起，`:65`/`:99` 可能判等放行），`payload.model` 校验（`:69`）在「同型号串重加」场景也会通过，二者都不是兜底。行为差异：该并发窗口下错误码由 `MODEL_NOT_FOUND`/`AUTHORIZATION_REVOKED` 变为 `MODEL_UNAVAILABLE`；`start`/`startImage` 不经 `modelFailureNotice`（`desktop/main/index.ts:198-201` 只包 `model.resolve`），无弹窗语义变化，可接受。
5. **不改写冻结快照/会话行**：自愈是解析期求值，每回合重新生效；用户在设置里改默认，旧会话下次执行即跟随新默认。这符合 2026-10-15 需求「已配置好可用模型后不再出现」，同时快照作为历史记录保持原样。
6. **恰好覆盖同类受害路径**：配置导入（`desktop/core/configuration-transfer.ts:193-202` 只把绑定回写 settings，PG 快照不动）、state.json 自愈重置后重加、会话目录跨机拷贝 —— 这些场景的会话快照旧 id 均经同一自愈逻辑解析到导入/重加后的当前默认。

### 显式不做的事

- 不放宽 `chat-turn.ts:49` 的 `REVIEW_ALREADY_SELECTED` 守卫、不改 `ReviewModelSelection.tsx:22` 的 `eligible`：自愈生效后，`MODEL_NOT_FOUND` 弹窗仅在「当前默认同样不可用」时出现，此时内联候选（当前默认）本就不存在，组件自然只显示「去配置模型」，引导正确。两处旧闭环缺陷成为不可达路径，不值得扩大改动面。
- 不改写 `Conversation.reviewModelId` / `defaultsSnapshot`（冻结语义不变）。
- 不新增日志设施（主进程现无统一日志；用量记录按实际解析出的模型入账，`UsageRecord` 已可追溯实际执行模型）。

## 4. 改动清单

| 文件 | 改动 |
| --- | --- |
| `desktop/main/model-service.ts` | `resolve()` 内提取 `roleKey` 变量复用；`:37-38` 之间插入自愈分支（约 6 行）；`const model` 改 `let` |
| `tests/unit/model-service.test.ts` | 新增自愈单元用例（见 03） |
| `tests/unit/model-defaults.test.ts` | DEFAULT-04 按 §5 审计结论更新（断言前置空默认；测试名语义收窄） |
| `tests/integration/local-review-model.test.ts` | 新增端到端复现用例（见 03） |
| `docs/requirements-traceability.json` | 新增本次 revision 台账条目 |

无 IPC、schema、前端组件改动。

## 5. 现存测试影响审计

实现时必须逐一核对以下断言 `MODEL_NOT_FOUND` / 相关语义的现存用例。独立审核（2026-10-15）已逐个推演，结论如下：

- **需修改** —— `tests/unit/model-defaults.test.ts:47-53`（DEFAULT-04）：`:49` 传 `randomUUID()` 期望 `MODEL_NOT_FOUND`，但夹具 `:14` 的 `textModelId` 指向有效启用记录 → 新规则下自愈成功、断言必败。改法：断言前先将 `f.state.settings.agent.textModelId = null`（无自愈目标），`MODEL_NOT_FOUND` 保持；测试名中「instead of falling back」语义收窄为「无有效默认时不落回」。自愈成功路径由新增用例覆盖（见 03）。
- 不变 —— `tests/unit/model-service.test.ts:34`：该测试从未把 `settings.agent.textModelId` 指向被删模型（默认为 null；`removeModel` 亦会置空，`model-repository.ts:111`）→ 无自愈目标，仍 `MODEL_NOT_FOUND`。
- 不变 —— `tests/integration/local-task-defaults.test.ts:90-96`（DEFAULT-11）：被删的冻结 id 即当前默认（`:35` `textModelId: ids[0]`，`:94` 取的正是它）→ `fallback === id`，不自愈，仍 `MODEL_NOT_FOUND`。测试名「never pick remaining records」在新规则下精确化为「never pick *unconfigured* remaining records」，断言无需改。
- 不变 —— `tests/integration/local-review-model.test.ts:48-52`（DEFAULT-14 后半）：快照为 null → 走 `!id` 分支，`MODEL_NOT_SELECTED` 不变。
- 不变 —— `tests/integration/review-model-selection.test.ts`：该文件**不存在**失效 id 的 `MODEL_NOT_FOUND` 断言；`:157` 的 `randomUUID()` 期望 428 走 `intent: "selection"`（`chat-turn.ts:41`），门禁拦截不自愈；bundle 跨机拷贝用例（`:102-133`）只做数据搬运校验，从不解析模型。无需任何改动。
- 不变 —— `tests/integration/local-model-generation.test.ts:70`：`:69` `removeModel` 删除唯一模型并把 `textModelId` 置空 → 无自愈目标，仍 `MODEL_NOT_FOUND`。
- 实现者仍须全库检索复核（`grep -rn "MODEL_NOT_FOUND" tests/`），确认无其他漏网断言。

## 6. 测试策略

只新增/运行与本次问题直接相关的用例（用户约束：禁止全量）。详见 `03-test-cases.md`：

- 单元：自愈成功 / 无有效默认仍 NOT_FOUND / selection 意图不自愈 / 默认停用 → MODEL_DISABLED / null 与省略 id 行为不变。
- 集成：真实复现用户场景 —— 配置模型并设为文本+审核默认 → 建会话冻结快照 → 删除并重新添加「同一」模型（新 UUID）并重设默认 → 审核任务直接以新模型执行成功、用量记到新模型；以及无有效默认时仍阻断。
- 回归：运行受影响的既有测试文件（`model-service`、`model-defaults`、`local-review-model`、`local-task-defaults`、`local-model-generation`、`review-model-selection`、`model-guidance`），确认旧断言在新语义下全部成立或按第 5 节审计结论更新。
- `npm run typecheck` 通过。

## 7. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 「静默换模型」让用户不知实际执行模型已变 | 自愈目标即用户在设置页看到并测试过的当前默认模型，符合直觉；`UsageRecord.modelId` 记实际解析结果，用量页可追溯 |
| 自愈引入并发窗口 | 复用既有 `:52-53` 复读复查与网关 `begin` 复查，窗口语义不变 |
| 未来有人误传型号串当 UUID | 自愈只按 `settings.agent` 的 UUID 精确查找，不引入模糊匹配，行为可预期 |
