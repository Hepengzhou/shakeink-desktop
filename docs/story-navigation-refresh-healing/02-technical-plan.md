# 技术方案：story-navigation 刷新前重检快速资料结构检查点

日期：2026-10-16 · 调研：`docs/story-navigation-refresh-healing/01-research.md`

## 1. 目标与约束

- 目标：消除「面板挂起期间编辑快速资料（item/scene/world/setting/foreshadow）→ 回答面板必现『创作进度已变化』死路」；点击过期面板上的合法选项应正常执行，不报错。
- 约束：任何时候生成任何产物都不应报错；不改变既有「决策上下文冻结」语义（`consumeStoryTask` 的 contextHash 校验保留）；不引入 AI 调用进刷新路径；最小改动面。

## 2. 根因回顾（一行版）

`refreshStoryNavigation` 以 `review=false` 调 `prepareStoryTask`，跳过了快速资料的结构重检（正常收尾路径 `story-task.ts:68-71` 每次必做），过期检查点把 `ready` 误判为 false，选项菜单塌缩为唯一 autoProceed，刷新在 `story-task.ts:254` 自弃，原始 VERSION_CONFLICT 穿透给用户，「查看最新选项」同样必败。

## 3. 修复方案（唯一改动点）

文件：`src/lib/services/story-task.ts`，函数 `refreshStoryNavigation`，在 `:251`（keys 归集完成）与 `:252`（`prepareStoryTask`）之间插入：

```ts
// 与 prepareStoryTask 的 review 循环同款：快速资料结构检查廉价、无 AI、幂等；
// 刷新前按当前内容重检，避免过期检查点把 ready 误判为 false、菜单塌缩成 autoProceed 后刷新自弃。
const kindByKey = new Map(current.artifacts.map(a => [a.key, a.kind]))
for (const key of keys) {
  const kind = kindByKey.get(key)
  if (kind && FAST_MATERIAL_KINDS.has(kind)) await checkStoryMaterialStructure(scope, key)
}
```

要点：

- **无需新增 import**：`checkStoryMaterialStructure`、`FAST_MATERIAL_KINDS` 已在 `story-task.ts:11` 引入。
- **串行而非并行**：`checkStoryMaterialStructure` 内部对 `storyWorkflow.version` 做 CAS（`story-workflow.ts:369-370`），并行会制造伪 VERSION_CONFLICT。
- **`phase:brainstorm`** 不在 `kindByKey` 中，自然跳过。
- **非快速资料（character/theme/trope/attribute/worldline/narrative/卡/卷章/正文）跳过**：其检查走 `reviewStoryCheckpoint`（AI 调用、写评审），刷新路径必须保持轻副作用；这是有意边界。
- **幂等**：检查点新鲜时 `checkStoryMaterialStructure` 早退 `reused:true`（`story-workflow.ts:365`），零写入。
- **对哈希中性**：只写 `storyWorkflow.checkpoints` 与 `version`，均不在 `navigationContextHash` 覆盖面内，不影响 `:260-261` 的提交前比对。
- **并发语义不变**：重检期间确有并发写入时 CAS 抛 VERSION_CONFLICT（`story-workflow.ts:370`），刷新失败、原错误上抛 —— 与今日竞态行为一致；`story-workflow.ts:362` 的 STORY_ARTIFACT_NOT_FOUND 仅在 `:249` 读图与重检内重读之间产物被删的竞态下可达，与 `prepareStoryTask:62-64` 的既有竞态同类，不引入新失败模式。
- **性能备注**：每个 key 的重检各含一次全图读（`story-workflow.ts:360`），上限 20 key 即 20 次全图读；刷新是低频用户动作且非事务持锁，可接受。

### 为什么不在 `prepareStoryTask` 内改

`review=false` 的语义是「只读准备」；把写入藏进该分支会污染函数契约，且其唯一 `review=false` 调用方就是 `refreshStoryNavigation`，在调用方显式重检意图更清晰。

### 为什么不放宽 `consumeStoryTask` 的 contextHash 闸门

该闸门是已批准设计：防止作者基于过期前提做决策。自愈架构（预检刷新 + 主事务严格校验 + 捕获再刷新，`chat-turn.ts:156-177/300-313`）已经选定「刷新而非放行」，本次只修复刷新路径自身的缺陷，不重做架构决策。

## 4. 修复后行为（逐路径核对）

1. **用户场景（本案）**：物品面板挂起 → 编辑物品 → 点击「生成场景」→ 预检发现过期 → `refreshStoryNavigation` 重检 6 个物品（编辑过的 2 个重写检查点，其余 reused）→ `ready=true`，选项恢复 `[prepare-writing:…, scene:chapter-outline:ch-01:]` → 面板 revision+1 落库 → 主事务 `consumeStoryTask` 校验新面板：哈希一致、选项 id 命中 → 正常建回合执行 scene 任务。**无报错**（已在用户数据库副本上实证选项 id 与点击 id 完全一致）。
2. **「查看最新选项」按钮**：同走 `refreshStoryNavigation`，同样恢复，不再报「当前已有唯一下一步」。
3. **无编辑的正常刷新**：重检全部 reused，行为与今日一致。
4. **内容被清空（passed=false）**：`ready=false` 属实，菜单塌缩为诚实状态，刷新仍抛 INTERACTION_STALE —— 保持既有语义，不在本次扩张。
5. **非快速资料目标被编辑**：刷新跳过 AI 评审，选项集合按当前检查点状态生成；可刷新则刷新，不可刷新维持原错误路径 —— 不劣化。

## 5. 测试策略（详见 03-test-cases.md）

新增 `tests/unit/story-navigation-refresh.test.ts`（node:test + PGlite + 真实迁移，参照 `tests/integration/local-database.test.ts` 设施）：

- STALE-01 回归：复刻取证种子（卷章+主叙事线未分章卡片+2 物品新鲜检查点 → 面板含 `scene:` 选项）→ 编辑物品 → `refreshStoryNavigation` 成功且选项含原 scene id（修复前必抛 INTERACTION_STALE）。
- STALE-02 端到端点击（storySelection 分支）：同种子经 `beginChatRequest` 回答面板（storySelection=scene）→ 正常建回合、action=storyTask scene（修复前抛 VERSION_CONFLICT「创作进度已变化」）。
- STALE-03 无编辑刷新：幂等，物品行与检查点不被重写。
- STALE-04 边界：快速资料以外的目标（角色）被编辑时刷新不触发 AI 评审（无评审模型也不报模型类错误，且不写角色检查点）。
- STALE-05 端到端点击（标签回答分支，`story-task.ts:163-167` + `chat-turn.ts:170-173`）：同种子以纯文本「生成场景」回答（不带 storySelection）→ 正常建回合、action=storyTask scene（修复前抛 VERSION_CONFLICT；同时锁定刷新后标签仍可命中选项的 `chat-turn.ts:170-173` 守卫）。
- STALE-06 反向边界：物品内容被清空（结构检查 passed=false）→ 刷新仍抛 INTERACTION_STALE「当前已有唯一下一步，请直接继续」（诚实塌缩，防止重检被误改为强制 ready）。

仅运行本文件；本次任务按用户明确要求禁止全量测试（替代 AGENTS.md 流程中的全量用例阶段，已在任务约束中声明）。

## 6. 台账

完成后在 `docs/requirements-traceability.json` 增加 `storyNavigationRefreshHealingRevision` 条目（scope/status/各文档链接），status 置 `implemented-and-scoped-verified`（以 STALE-01~04 通过为准）。

## 7. 不做的事

- 不改 `consumeStoryTask` 的哈希闸门与选项校验；不改 `navigationRecommendations` 的选项构造；不改 autoProceed 设计；不处理非快速资料的 AI 重评；不补 transient 图像字段缺口（与本案无关，另立议题）；禁止全量测试。
