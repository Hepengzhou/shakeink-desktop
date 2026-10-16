# 测试用例：story-navigation 刷新前重检快速资料结构检查点

日期：2026-10-16 · 方案：`docs/story-navigation-refresh-healing/02-technical-plan.md`
执行约束：**仅运行 `tests/integration/story-navigation-refresh.test.ts` 一个文件**，禁止全量测试（用户本次明确要求）。经独立审核：用例与种子已对照源码逐项核实（审核意见见本文 §5）。

## 1. 测试设施

- 框架：`node:test` + tsx（与 `package.json` 的 `test` 脚本同款：`node --import tsx --test <file>`）。
- 数据库：PGlite 临时目录实例 + `LocalPGliteAdapter` + `PrismaClient`，真实迁移经 `loadMigrations("prisma/migrations")` + `migrateDatabase` 建库（设施参照 `tests/integration/local-database.test.ts`，迁移加载参照 `desktop/service/database/migrations.ts:49`）。
- 上下文：所有被测服务调用包在 `runInDatabaseContext({ workspaceId, database }, fn)` 内（`desktop/service/context.ts`），使 `@/lib/db` 的 scoped client 指向测试库。
- 直接先例：`tests/integration/local-task-defaults.test.ts` 已在同设施上调用 `beginChatRequest`。
- 每个用例独立作品数据；`after` 断开并清理临时目录。

## 2. 公共种子（STALE-01/02/03/05/06 共用）

复刻取证得到的最小塌缩条件（种子内不使用任何真实用户数据）：

1. `User`（id 任意，如 `test-author`；按 `prisma/schema.prisma` User 模型必填项补齐 email/passwordHash/name）+ `Novel`（未删除）。
2. `StoryWorkflow`：`updateStoryWorkflow(scope, { expectedVersion: 0 })` 创建；brief 任意字符串。
3. `Volume` 1 卷（index/title/summary 必填）+ `Chapter` 1 章（index/title 必填，**`outline` 非空、`content` 为空**——这是 `sceneChoiceId` 形态的前提：`story-navigation.ts:112-113` 的 `pendingChapter` 要求章纲非空且正文为空，否则 scene 选项 id 退化为 `scene:item:A,item:B:`，`:206`）。
4. `PlanningDocument.data`（须经 `planningSchema.parse`，见 `src/lib/planning/domain.ts:197-206`）：1 条 worldline（仅 id/name 必填）；1 条 `primary:true` 的叙事线（id/name）；≥1 张卡（id/line/title 必填，`tellings` `min(1)` 且 telling 仅 id 必填，`:122-146`，**`chapter` 为 null**，planning 数据**不含** volumes/chapters）——使卡被判定为「未分章讲述卡」，`ready=false` 时菜单塌缩为唯一「整理卷章大纲」（`story-navigation.ts:168-183`）。
5. 物品 A、B：`createItem`（真实服务 `src/lib/services/item.ts:84`，`attributes: []`，**`description` 非空**——否则第 6 步检查点 `passed=false`，面板一开始就没有 question）。
6. 对 A、B 各跑一次 `checkStoryMaterialStructure`（`src/lib/services/story-workflow.ts:359`）→ 新鲜 passed 检查点。
7. 面板：`prepareStoryTask(scope, [itemA.key, itemB.key], false)` → 断言返回 `question`，且 choices 含 `scene:chapter-outline:<章id>:`（记为 `sceneChoiceId`），并记下 `question.questions[0].question` 供 STALE-05 使用。
8. 会话：`Conversation`（title 必填，`activeAttemptId=null`）+ `ChatTurn`（conversationId/userId 必填，`userMessageId` 与 `clientRequestId` 必填且唯一，`status:"waiting_user"`，`interaction={ id, kind:"question", revision:1, state:"pending", payload: <第7步的 question> }`）。

预期塌缩验证（反向控制）：把物品 A 的 `description` 改为另一段非空文本（`updateItem`）后，直接调 `prepareStoryTask(scope, keys, false)` 应返回 `question=undefined` 且 `autoProceed.task==="outline"`——种子不合格则本组用例全部无效，须先修正种子。

## 3. 用例

### STALE-01 回归：编辑物品后刷新面板恢复（修复前必败）

步骤：种子 → `updateItem` 改物品 A 描述 → `refreshStoryNavigation(userId, turnId, interactionId, 1)`。
断言：
- 正常返回不抛错（修复前抛 `INTERACTION_STALE`「当前已有唯一下一步，请直接继续」）；
- 返回 interaction 的 `revision=2`、`state="pending"`；
- `payload.storyNavigation.choices` 含 id === `sceneChoiceId`；
- `payload.storyNavigation.contextHash === navigationContextHash(await readStoryArtifacts(scope))`。

### STALE-02 端到端：storySelection 点击过期面板不再报错（用户场景）

步骤：种子 → `updateItem` 改物品 A 描述 → `beginChatRequest(userId, { clientRequestId, conversationId, interaction: { turnId, id: interactionId, revision: 1, action: "answer" }, storySelection: { kind: "choice", choiceId: sceneChoiceId }, message: "生成场景" })`（字段以 `src/lib/chat-protocol.ts` 的 `chatRequestSchema` 为准）。
断言：
- 正常返回不抛错（修复前抛 `VERSION_CONFLICT`「创作进度已变化，请重新核对选项后继续」）；
- 返回 `turn.action` 部分匹配 `{ kind: "storyTask", task: "scene", scope: { sourceKeys: ["chapter-outline:<章id>"] } }`（实际还携带 `sourceKey` 字段，须用部分匹配）；
- 库中该回合 `status="queued"`，原面板回合 interaction 已置 `state="answered"`。

### STALE-03 无编辑刷新：幂等零写入

步骤：种子（不编辑任何内容）→ `refreshStoryNavigation(userId, turnId, interactionId, 1)`。
断言：正常返回 `revision=2`；物品 A/B 行的 `updatedAt` 不变；`StoryWorkflow.version` 不变（重检全部 `reused:true`）；choices 与原面板一致。

### STALE-04 边界：非快速资料目标不触发 AI 评审

步骤：种子 + 角色 C（`character` 行，`roleType` 等必填项按 schema 补齐，`growthArc` 必须为空、`arcStages` 为空——否则 arc 选项不出现，面板可能无 question，`story-navigation.ts:159-167`）→ 面板以 `[characterC.key]` 为目标建立（同公共种子第 7-8 步；预期 focus=character 时 choices=[arc, outline] 共 2 个 → `question` 存在；若选项构造变化导致无 question，调整种子使塌缩条件成立后再记录实际种子）→ 改角色 C 的名字 → `refreshStoryNavigation(...)`。
断言：不抛任何模型/评审类错误（测试环境不配置评审模型，若走 AI 评审必抛）；`StoryWorkflow.checkpoints` 中**不存在** `character:*` 键（刷新只重检快速资料）。

### STALE-05 端到端：标签回答分支（story-task.ts:163-167 + chat-turn.ts:170-173）

步骤：同 STALE-02，但请求**不带 `storySelection`**，`message` 用真实客户端格式（`src/components/chat/AskUserPanel.tsx:117`）：`【回答问题】<公共种子第7步 question.questions[0].question>\n我的回答：生成场景`（`selectedStoryChoice` 要求消息以 `\n我的回答：<label>` 结尾并与选项 label 精确全等，`src/lib/story-task.ts:68-72`）。
断言：正常返回不抛错（修复前抛 VERSION_CONFLICT）；`turn.action.task==="scene"`；预检的标签守卫（`chat-turn.ts:170-173`：刷新后标签须仍能命中选项）不误抛「当前评审或内容已变化」。

### STALE-06 反向边界：内容清空仍诚实失败

步骤：种子 → `updateItem` 把物品 A 的 `description/appearance/acquisition` 清空、`effects:[]`（结构检查 passed=false）→ `refreshStoryNavigation(...)`。
断言：抛 `ContentError`，`code==="INTERACTION_STALE"`、消息含「当前已有唯一下一步」（锁定「重检不强制 ready」的边界语义，防止未来误改）。

## 4. 通过标准

- STALE-01~06 全部通过；
- 反向控制（公共种子第 8 步后的塌缩验证）成立；
- 临时把 `refreshStoryNavigation` 中新增的重检循环注释掉后，STALE-01/02/05 失败、STALE-06 仍通过（变异验证，验证后恢复代码）；
- 只运行上述单文件：`node --import tsx --test tests/integration/story-navigation-refresh.test.ts`。

## 5. 独立审核记录（2026-10-16，explore 子代理）

审核结论：6 个用例与种子对照源码逐项核实可行。已按审核意见修正：STALE-05 的消息格式改为真实客户端格式（`【回答问题】…\n我的回答：生成场景`）；公共种子补齐 Prisma 必填字段（User.email/passwordHash/name、Conversation.title、ChatTurn.userMessageId+clientRequestId、Volume/Chapter 必填项）；显式标注三个隐性前提（物品 description 非空、planning 不含 chapters/volumes 且卡 chapter=null、章 outline 非空/content 为空）；STALE-02 断言改为部分匹配（实际 action 携带 `sourceKey`）；测试文件置于 `tests/integration/`（与 `beginChatRequest` 先例 `local-task-defaults.test.ts` 一致）。
