# 调研：已配置可用模型却弹出「当前任务没有可用模型 —— 审核模型已不存在」

日期：2026-10-15
状态：调研完成，结论均附源码/命令证据

## 1. 问题现象

用户已在设置中配置一个可用文本模型，并将同一模型选为默认审核模型；模型连通性测试通过。执行需要审核的任务时弹出对话框：

- 标题「当前任务没有可用模型」，正文「当前任务选择的审核模型已不存在」（截图见需求）。
- 对应 `ModelRequiredNotice` 的 `code = "MODEL_NOT_FOUND"`、`role = "review"`，文案出自 `src/components/desktop/ModelRequiredDialog.tsx:18`。

## 2. 弹窗来源链路（已逐段核实）

1. 唯一产出口：`desktop/main/index.ts:198-201` —— worker RPC `model.resolve` 抛错时经 `modelFailureNotice` 转换并 `send(notice)`。
2. 过滤器：`desktop/main/model-guidance.ts:5-11` —— 仅 `ModelAuthorizationError`、code 在白名单、`intent` 为 `undefined`/`"invoke"`、`role ∈ {text, review, image}` 时生成 notice；`intent: "selection"` 的失败不弹窗。
3. 传输：主进程 `desktop/main/index.ts:125-127` → preload `desktop/preload/index.ts:35-38`（`desktop:event` 通道）→ 渲染端 `src/components/desktop/DesktopApp.tsx:133` 存 `modelRequired`，`:184` 渲染 `ModelRequiredDialog`。

## 3. 审核模型解析链（任务执行时）

1. 业务入口：`src/lib/services/review.ts:286`、`src/lib/services/content-review.ts:59`、`src/lib/services/story-material-review.ts:56`、`src/lib/sop/runner.ts:186` → `getModelForUser(userId, { role: "review", ignoreChatSession: true })`。
2. `src/lib/ai/provider.ts:33-34`：取执行期冻结快照 `execution.taskDefaults`，以 `modelIdForRole(defaults, "review")` 取出快照中的 `reviewModelId`，调 `resolveLocalModel`。
3. `desktop/shared/task-defaults.ts:17-19`：`explicit !== undefined ? explicit : defaults.reviewModelId` —— 返回的快照值**可能为 null**。
4. `desktop/service/models.ts:36-47` `resolveLocalModel` → RPC `model.resolve`，参数 `{ role, intent: "invoke", id, task }`；`:41` 处 `id !== undefined` 即携带 —— **null 被显式传递**，因此主进程「省略 id 时回退当前全局默认」分支（`desktop/main/model-service.ts:35`）对 worker 调用实际不可达。
5. 主进程权威判定 `desktop/main/model-service.ts:31-55` `ModelService.resolve()`：
   - `:34` `review → kind TEXT`（审核模型就是普通 TEXT 模型）；
   - `:36` 无 id → `MODEL_NOT_SELECTED`（已有同类模型）或 `MODEL_NOT_CONFIGURED`；
   - `:37-38` `state.models.find(m => m.id === id)` 找不到 → **`MODEL_NOT_FOUND`（本 bug 的抛出点）**；
   - `:39` 停用 → `MODEL_DISABLED`；`:40` 类别不符 → `MODEL_KIND_MISMATCH`；`:43-47` 密钥缺失 → `MODEL_KEY_MISSING`；并发变更 → `AUTHORIZATION_REVOKED`。
6. 冻结快照来源 `src/lib/services/chat-turn.ts`：新会话在创建时冻结当时全局默认（`:155`、`:194-195`）；同会话新回合**继承 `conversation.defaultsSnapshot`**（`:199-202`），唯一修补点 `:203-204` 仅在快照 `reviewModelId === null` 且 `conversation.reviewModelId` 非空时覆盖；重试沿用原 attempt/turn 快照（`:201`）。

## 4. 根本原因：模型标识生命周期错配

桌面模型的权威存储是主进程 `state.json`（不在 Prisma）：

- 记录主键 `id` 为 UUID（`desktop/core/settings.ts:9-17`），`modelId` 字段只是供应商型号串（如 `deepseek-chat`）。
- **编辑保留 id；删除后重新添加 = 全新 UUID**（`desktop/main/model-repository.ts:90` `prior?.id ?? creationId ?? randomUUID()`）；删除为硬删（`:113`），只把 `settings.agent.{text,review,image}ModelId` 置空（`:111`）。
- **PG 侧的 `Conversation.reviewModelId` 与所有 `defaultsSnapshot` 从不被清理/重映射**。配置导入重映射同样只改 settings（`desktop/core/configuration-transfer.ts:51-59`）。

因此一旦模型记录被删除后重新添加（或 state.json 自愈重置后重加、会话目录跨机拷贝），旧会话快照仍持有已不存在的旧 UUID，而当前设置里的「同一个模型」已是另一个 UUID：

- 任务执行按快照旧 UUID 查 `state.models` → 必中 `MODEL_NOT_FOUND`；
- 当前全局默认审核模型是有效新记录、连通性测试也通过 —— 与报错并存，即用户所见矛盾现象。

**为什么文本模型不报错、只有审核报错**：同会话新回合的文本模型由请求载荷显式覆盖（`chat-turn.ts:202` `overrideTaskDefaults(conversationDefaults, { modelId: input.modelId, ... })`，composer 发送的是当前有效模型 id），而审核模型完全来自冻结快照，无任何请求侧覆盖。

**为什么「测试通过」不能排除此故障**：连通性测试链路（`desktop/main/model-configuration.ts:112` → `:194-218` → `:348-393`）验证的是**草稿**的 Key + endpoint + **供应商型号串**；任务解析用的是 state.json 记录的 **UUID**。两者正交，测试从不对快照引用的 UUID 是否存在作任何证明。

## 5. 修复闭环断裂（bug 放大器）

即便用户看到弹窗想修复，应用内也无路可走：

1. 弹窗内联「应用到当前任务」只对 `MODEL_NOT_SELECTED` 开放：`src/components/desktop/ReviewModelSelection.tsx:22`（`eligible` 条件），`MODEL_NOT_FOUND` 时组件 `return null`（`:37`）。
2. 即便强发 PATCH，`src/lib/services/chat-turn.ts:49` 守卫因快照 `reviewModelId !== null` 抛 `REVIEW_ALREADY_SELECTED`。
3. 同会话新回合无限继承陈旧 id（`chat-turn.ts:199-202`；`:203-204` 要求快照为 null 才覆盖，陈旧 id 非空 → 永远继承）；重试沿用旧快照（`:201`）。
4. 结论：受害会话在应用内永久报错，唯一出路是新建会话。

## 6. 既有设计约束（修复必须尊重的边界）

- **审核模型绝不隐式落回文本模型**：`tests/integration/local-review-model.test.ts:15`（DEFAULT-14，快照 reviewModelId 为 null 时阻断，报 `MODEL_NOT_SELECTED`）。
- **冻结快照不跟随提交后的全局变更**：`tests/integration/local-task-defaults.test.ts:29`（DEFAULT-07），`:90-96`（DEFAULT-11）断言「被删除的冻结 id 不会挑中剩余记录」——注意其场景里全局默认也同时被删，解析仍须报 `MODEL_NOT_FOUND`。
- 显式 null（用户明确不选）必须继续阻断（DEFAULT-11 前半，`MODEL_NOT_SELECTED`）。
- 本次需求（2026-10-15 用户指令）要求「已配置好一个可用模型后，不再出现找不到可用模型」。按 `AGENTS.md`「同一要求历次修改以后者为准」，该要求优先于「冻结 id 失效即硬失败」的旧语义，但不得破坏上述三条保留约束（详见 02 技术方案的语义界定）。

## 7. 结论

- 代码不存在 id/modelId 混用、大小写或前后空白类低阶错误；判定逻辑本身正确。
- 根因是**标识生命周期错配**：任务解析使用会话创建时冻结（或对话修补写入）的记录 UUID，该记录已被删除/重置，当前配置的新模型是另一个 UUID。
- 次要缺陷是 `MODEL_NOT_FOUND` 的修复闭环完全断裂，受害会话无法自愈。
- 修复方向：在解析层对「显式选择的 id 已失效」场景自愈到**当前配置的对应角色默认模型**（仅限 invoke 意图、仅当默认记录真实存在），并在无有效默认时保持原有报错与引导语义不变。详见 `02-technical-plan.md`。
