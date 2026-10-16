# 实现记录：story-navigation 刷新前重检快速资料结构检查点

日期：2026-10-16 · 方案：`02-technical-plan.md` · 用例：`03-test-cases.md`

## 1. 源码改动（唯一一处，`git diff` 净 +7 行）

`src/lib/services/story-task.ts` `refreshStoryNavigation`（新行号 :252-258），在 keys 归集（:250-251）与 `prepareStoryTask(scope, keys, false)` 之间插入：

```ts
// 与 prepareStoryTask 的 review 循环同款：快速资料结构检查廉价、无 AI、幂等；
// 刷新前按当前内容重检，避免过期检查点把 ready 误判为 false、菜单塌缩成 autoProceed 后刷新自弃。
const kindByKey = new Map(current.artifacts.map(a => [a.key, a.kind]))
for (const key of keys) {
  const kind = kindByKey.get(key)
  if (kind && FAST_MATERIAL_KINDS.has(kind)) await checkStoryMaterialStructure(scope, key)
}
```

- 无新增 import（`checkStoryMaterialStructure`、`FAST_MATERIAL_KINDS` 为 :11 既有导入）；
- 串行 await（`checkStoryMaterialStructure` 对 `storyWorkflow.version` 做 CAS，`story-workflow.ts:369-370`，并行会制造伪 VERSION_CONFLICT）；
- `phase:brainstorm` 不在 `kindByKey` 中自然跳过；非快速资料跳过（其评审走 AI，刷新路径保持轻副作用）。

## 2. 测试文件（新增）

`tests/integration/story-navigation-refresh.test.ts`：PGlite 临时目录 + `LocalPGliteAdapter` + 真实迁移（`loadMigrations("prisma/migrations")` + `migrateDatabase`），全部服务调用包在 `runInDatabaseContext` 内；种子全虚构（夹具作者/作品/物品/角色）。实现 STALE-01~06 及公共种子的反向控制（编辑物品后直接 `prepareStoryTask` 必返回 `question===undefined` 且 `autoProceed.task==="outline"`，种子有效性自校验）。

## 3. TDD 证据

| 阶段 | 结果 |
|---|---|
| 修复前基线 | STALE-01 抛 INTERACTION_STALE「当前已有唯一下一步，请直接继续」；STALE-02 抛 VERSION_CONFLICT「创作进度已变化，请重新核对选项后继续」；STALE-05 抛 VERSION_CONFLICT（标签分支 `story-task.ts:167`）；STALE-03/04/06 通过 |
| 修复后 | 6/6 通过 |
| 变异验证 | 临时使重检循环失效 → STALE-01/02/05 复败、STALE-06 仍过；恢复后 6/6 |
| 主代理独立复跑 | 6/6 通过（7.0s） |

运行命令（全程仅此单文件）：`node --import tsx --test tests/integration/story-navigation-refresh.test.ts`
