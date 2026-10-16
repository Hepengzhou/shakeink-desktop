# 总结：story-navigation 刷新前重检快速资料结构检查点

日期：2026-10-16 · 状态：已完成（6/6 目标用例通过）

## 问题

依次生成世界线、叙事线、物品后，点击物品回合问答面板的「生成场景」必现「生成中断：创作进度已变化，请重新核对选项后继续」，且「查看最新选项」按钮同样失效。

## 根因（用户真实数据库副本实证）

面板挂起期间，用户编辑了 2 个物品（面板 autosave，合法行为）→ 产物哈希变化 → 回答面板时 `consumeStoryTask` 的 contextHash 校验失败 → 自愈刷新 `refreshStoryNavigation` 以 `review=false` 准备新面板，**跳过了快速资料的结构重检**（正常回合收尾路径 `story-task.ts:68-71` 每次必做）→ 过期检查点把 `ready` 误判为 false → 选项菜单塌缩为唯一 autoProceed（整理卷章大纲）→ 刷新在 `:254` 自弃（INTERACTION_STALE）→ 原始 VERSION_CONFLICT 穿透给用户。两条路径（收尾 vs 刷新）的就绪判定不一致是本质缺陷。

## 修复（+7 行，唯一改动点）

`src/lib/services/story-task.ts:252-258`：`refreshStoryNavigation` 在调 `prepareStoryTask` 前，对 keys 中属 `FAST_MATERIAL_KINDS`（item/scene/world/setting/foreshadow）的目标**串行**重检 `checkStoryMaterialStructure`（廉价、无 AI、幂等、对导航哈希中性）。刷新后面板恢复原有选项（选项 id 与点击 id 逐字节一致），`consumeStoryTask` 一击命中，用户点击正常执行，无任何报错。「查看最新选项」按钮同路径自愈。

## 验证

- 新增 `tests/integration/story-navigation-refresh.test.ts`（STALE-01~06，PGlite + 真实迁移，种子全虚构）；
- TDD：修复前 STALE-01/02/05 复现用户报错文案，修复后 6/6；变异验证（重检失效则复败）通过；主代理独立复跑 6/6；
- 三轮独立子代理审核（方案/用例/code review）均通过，审核意见全部落实（含取证材料脱敏与清除）。

## 边界与后续

- 保留语义：contextHash 决策冻结闸门、autoProceed 设计、内容清空（passed=false）时的诚实失败、非快速资料不走 AI 重评。
- 划出范围：非快速资料目标编辑后的菜单塌缩场景；transient 集合的图像字段缺口（`iconUrl/iconCrop/avatarCrop/portraitCrop`）——与本次无关，另立议题。
- 按用户约束仅运行目标测试文件，未跑全量；台账见 `docs/requirements-traceability.json` 的 `storyNavigationRefreshHealingRevision`。
