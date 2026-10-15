# 测试用例：失效模型引用的解析期自愈

日期：2026-10-15（经独立审核修订，审核结论已逐条吸收）
前置：`01-research.md`、`02-technical-plan.md`（含独立审核结论与 §5 现存测试审计）
范围约束：**只针对当前问题新增/运行用例，禁止全量测试**。本文件列出的用例与回归文件即全部测试范围。

## 1. 验收语义映射

| 目标（02 §1） | 覆盖用例 |
| --- | --- |
| G1 已配置可用默认 → 失效引用自愈、不再弹「不存在」 | HEAL-01/02①/07/08、DEFAULT-27 前半 |
| G2 无有效默认 → 保持报错与引导 | HEAL-02②/03/04/06、DEFAULT-27 后半、DEFAULT-04（改） |
| G3a 显式 null 继续阻断 | HEAL-07、DEFAULT-06/11/14（回归） |
| G3b 审核不落回文本 | HEAL-02②、DEFAULT-14（回归） |
| G3c 不挑未配置为默认的剩余记录 | HEAL-04、DEFAULT-11（回归） |
| G3d selection 意图严格校验 | HEAL-05、RMS-05（回归） |

书面豁免（审核结论，显式说明不另设用例）：

- **自愈后 `MODEL_KEY_MISSING` 路径**：与未自愈路径同为 `:43-47` 一段代码，已由 DEFAULT-05、RMS-04/05 覆盖，不重复构造。
- **自愈后并发复查（`:52-53` → `AUTHORIZATION_REVOKED`）**：同理由 DEFAULT-23 覆盖。
- **notice 不产生**：notice 只在 `model.resolve` 抛错时由 `desktop/main/index.ts:198-201` 发出；HEAL-01/02①、DEFAULT-27 前半断言解析成功即隐含零弹窗；notice 生成函数本身由 `model-guidance` 用例覆盖。index.ts 层无测试设施属既定事实。

## 2. 新增单元用例（`tests/unit/model-service.test.ts`，追加一个 test 块）

夹具沿用该文件既有模式（`ModelRepository` + `ModelGateway` 真实实例、临时 dataRoot、`saveModel` 落记录、改 `state.settings.agent.*` 后整体 `updateSettings` 回传，先例 `local-review-model.test.ts:39-40`）。

**构造注意（审核修正）**：

- 保存第二条 TEXT 记录 B 时，draft 必须使用**不同的 `modelId` 型号串**（唯一性约束为 provider+endpoint+kind+modelId 四元组，`model-repository.ts:95`，照抄会抛「这个模型已经添加」）。
- **悬空默认**（默认指向不存在 id）无法经 `updateSettings` 设置（`:118-123` 校验默认必须指向已存在且启用的同类模型），`removeModel` 也只会置空不留悬空。HEAL-02②/HEAL-04 改为**直接改写 state.json**：文件格式为 `{"schemaVersion":1, revision, value}` + `\n`（`desktop/core/versioned-store.ts:95`），读路径每次重读磁盘无缓存，保持 revision 不变即可继续后续操作；`settingsSchema` 只校验 uuid 形状不校验引用完整性（`desktop/core/settings.ts:24`），悬空 id 可正常加载。此构造更贴近生产根因（state.json 自愈重置/跨机拷贝残留）。

| ID | 步骤 | 预期 | 红绿 |
| --- | --- | --- | --- |
| HEAL-01 | 保存 A、B 两条 TEXT（B 用不同型号串）；`textModelId = B`；`resolve({ role: "text", id: <不存在UUID> })` | 解析成功，返回记录的 `id === B`（自愈到当前文本默认），且序列化不含明文 Key | 修复前红（`MODEL_NOT_FOUND`） |
| HEAL-02 | `reviewModelId = B`、`textModelId = A`（均有效）；① `resolve({ role: "review", id: <不存在UUID> })`；② 改写 state.json 把 `reviewModelId` 置为不存在 id，再 `resolve({ role: "review", id: <不存在UUID> })` | ① 返回 `id === B`（审核默认）；② `MODEL_NOT_FOUND` —— 角色隔离，绝不落回有效的文本默认 A | ① 修复前红；② 守卫（前后均绿） |
| HEAL-03 | `textModelId = null`（defaultState 初始即 null，无需设置）；`resolve({ role: "text", id: <不存在UUID> })` | `MODEL_NOT_FOUND`（无自愈目标，报错保留） | 守卫 |
| HEAL-04 | 改写 state.json 把 `textModelId` 置为另一个不存在 id；`resolve({ role: "text", id: <不存在UUID> })` | `MODEL_NOT_FOUND`（默认同样失效时不挑在场的剩余记录 A） | 守卫 |
| HEAL-05 | `textModelId = B` 有效；`resolve({ role: "text", id: <不存在UUID>, intent: "selection" })` | `MODEL_NOT_FOUND`（selection 门禁：显式选择校验不自愈；若实现漏写门禁此例转红） | 守卫 |
| HEAL-06 | `textModelId = B` 设置后，再 `saveModel(rev, { ...draftB, id: B.id, enabled: false, apiKey: "" })` 停用 B（同 scope 空 key 合法，`prepareModel` `:88` 仅 `!prior \|\| changedScope` 时强制 key；`saveModel` 不校验默认指向）；`resolve({ role: "text", id: <不存在UUID> })` | `MODEL_DISABLED`（自愈后照常过 enabled 校验） | 修复前红（报 `MODEL_NOT_FOUND` 而非预期 `MODEL_DISABLED`） |
| HEAL-07 | ① `textModelId = B`，`resolve({ role: "text", id: A })`（A 有效且 ≠ 默认）；② `resolve({ role: "text", id: null })`；③ `resolve({ role: "text" })`（省略 id） | ① 返回 `id === A`（命中路径不受自愈影响）；② `MODEL_NOT_SELECTED`（显式 null 阻断不变）；③ 返回 `id === B`（省略 id 语义不变） | 守卫 |
| HEAL-08 | 追加一条 IMAGE 记录 C 并设 `imageModelId = C`；`resolve({ role: "image", id: <不存在UUID> })` | 返回 `id === C`（image 分支自愈闭合 roleKey 三分支） | 修复前红 |

## 3. 修改既有用例（`tests/unit/model-defaults.test.ts` DEFAULT-04，`:47-53`）

- 现状：`:49` 传 `randomUUID()` 期望 `MODEL_NOT_FOUND`，但夹具 `:14` `textModelId` 指向有效记录 → 新语义下会自愈成功、断言必败（02 §5 审计结论）。
- 改法：`:49` 断言前先把 `f.state.settings.agent.textModelId = null`（mock 夹具 `f.state` 可变，`:19`），再断言 `MODEL_NOT_FOUND`；`:51` 的 `MODEL_DISABLED` 断言不变（显式 id 命中了停用记录，不进入自愈分支）；测试名收窄为「absent and disabled explicit records are accurately blocked when no configured default remains」。

## 4. 新增集成用例（`tests/integration/local-review-model.test.ts`，编号 **DEFAULT-27**）

编号说明：DEFAULT-15 已被 `local-chat-defaults.test.ts:17` 占用，现存最大编号 DEFAULT-26（`local-task-defaults.test.ts:156`），本用例取 DEFAULT-27。

沿用 DEFAULT-14 的设施（`Workspaces` + PGlite 真实库、`ModelRepository`/`ModelService`/`ModelGateway` 真实实例、`configureModelTransport` 直连、SSE 假响应断言 `authorization` 头与 `model` 字段、不泄露 Key）：

**DEFAULT-27: removed-then-readded model heals frozen review snapshots to the configured default**

1. 保存模型 A（`modelId: "fixture-review-v1"`，TEXT），`updateSettings` 设 `textModelId = reviewModelId = A`。
2. `beginChatRequest("local-author", { clientRequestId: randomUUID(), message: "…" })` 建会话（最小请求，先例 `local-task-defaults.test.ts:59`），取 `scope = scopeFor(binding.conversation, binding.turn, binding.attempt)`（`chat-turn.ts:34`）。
3. **前提断言**：`scope.taskDefaults!.reviewModelId === A`（钉住「快照冻结的是 A」，先例 `review-model-selection.test.ts:73`）。
4. `removeModel` 删 A → 以**同型号串**重新保存得 B（新 UUID，合法：`:95` 只对现存记录查重；这也是真实用户操作），`updateSettings` 设 `textModelId = reviewModelId = B`。
5. 在 `runInChatExecution(scope, …)` 内执行 `generateText({ userId: "local-author", action: "fixture.review", role: "review", prompt: "…" })`（沿用含已删除 A 的旧会话快照）。
6. 断言：调用成功；`UsageRecord.modelId === B`；响应与用量记录不含明文 Key。
   **A/B 区分依据**（审核补充）：A、B 同型号串，gateway 捕获的 `model` 串无法单独区分；决定性断言是 `UsageRecord.modelId`（UUID 级）与 gateway 成员身份 —— A 删除时已 `gateway.remove(A)`（`model-repository.ts:34` → `model-authorization.ts:51`），`begin(A)` 只会抛 `MODEL_UNAVAILABLE`（`model-authorization.ts:62`），成功 fetch 必持 B 租约。可选增强：B 换不同 `apiKey` 并在 gateway 断言 `authorization` 头已切到 B 的 key。
7. 后半（G2 保留）：`removeModel` 删 B（默认被置空，`:111`）→ 同一 scope 再执行 → 拒绝且 `code === "MODEL_NOT_FOUND"`；断言 gateway 捕获的请求数不变（全程未发新请求）。

## 5. 回归范围（只跑以下文件，禁止全量）

```
node --import tsx --test \
  tests/unit/model-service.test.ts \
  tests/unit/model-defaults.test.ts \
  tests/unit/model-guidance.test.ts \
  tests/integration/local-review-model.test.ts \
  tests/integration/local-task-defaults.test.ts \
  tests/integration/local-model-generation.test.ts \
  tests/integration/review-model-selection.test.ts
```

- 依据：02 §5 审计列出的全部 `MODEL_NOT_FOUND` 相关断言都在这些文件内；`model-guidance` 覆盖 notice 生成语义。
- 已审计排除：`tests/unit/model-error-classification.test.ts:13`（DEFAULT-13）也含 `MODEL_NOT_FOUND` 字样，但属纯错误码分类映射，不经 resolve，不受影响 —— 实现者 grep 命中它时不必停摆。
- 另跑 `npm run typecheck`。
- 实现者须先 `grep -rn "MODEL_NOT_FOUND" tests/` 复核无其他遗漏断言；若发现 02 §5 与本节未列出的受影响断言，停下来回报，不得擅自改语义。

## 6. 通过标准

1. TDD 红绿：**红集 = HEAL-01、HEAL-02①、HEAL-06、HEAL-08、DEFAULT-27 前半**（修复前分别报 `MODEL_NOT_FOUND`/`MODEL_NOT_FOUND`/`MODEL_NOT_FOUND`/`MODEL_NOT_FOUND`/`MODEL_NOT_FOUND`，其中 HEAL-06 是报错码不对）；**守卫集 = HEAL-02②、HEAL-03、HEAL-04、HEAL-05、HEAL-07**（修复前后均绿，验证语义不退化）。修复后全部通过。
2. 第 3 节 DEFAULT-04 修改后通过；第 5 节回归文件全部通过。
3. `npm run typecheck` 通过。
4. 任何用例不接触真实网络、真实 Key；夹具 Key 均为 `fixture` 字样假值。
