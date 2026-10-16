# 产品设计:AI 区域与右侧内容面板按比例分割

日期:2026-10-17(独立方案审核后修订)。调研依据:`docs/chat-content-proportional-split/research.md`。

## 行为规格

1. **比例定义**:chat 与 content 的分割比例 = 两者当前宽度占 Group 宽度的百分比之比(持久化 `WorkspaceLayout.sizes.chat / sizes.content`,百分比语义不变)。用户拖拽或键盘调整分割线后,新比例即成为后续窗口缩放的基准。
2. **窗口缩放保持比例**:宽屏模式(≥900px)下,窗口任意放大、缩小、最大化、还原(含出带因子,如 1440↔2560),chat:content 比例维持不变,且最大化→还原往返后比例与持久化 `sizes` 还原;sidebar 保持像素固定(200–420px 约束内),不在本次变更范围。
3. **约束优先**:chat 最小 420px、content 最小 30%、sidebar 200–420px 的既有约束不变。极端缩窄导致约束与比例不可兼得时约束优先(库 `ge()` 机制,与现行为一致);900px 宽下三者最小值加 2px 分隔条合计 892 ≤ 900,约束恒可满足。
4. **不涉及的场景**:窄屏(<900px)覆盖模式无 chat/content 分割;content 关闭时 sidebar 像素固定、chat 吸收剩余空间;收放动画期间仍由布局协调器逐帧合成,不经过静止 resize 重分配;模式切换(narrow↔wide)的布局投影逻辑不变。
5. **持久化与恢复**:布局仍以百分比持久化;重启/恢复后按比例渲染,窗口尺寸不同则按同一比例换算。

## 技术方案

- **A1** `src/components/layout/DashboardShell.tsx:44`:chat Panel `groupResizeBehavior="preserve-pixel-size"` → 显式 `groupResizeBehavior="preserve-relative-size"`。sidebar、content 配置不动。显式书写:自我说明意图,且 fixture 观测点 `panelConfigs.chat.resize` 可断言精确值防回归。
- **A2** `src/components/layout/useSidebarDrawer.ts` `resized()`(约 `:579-602`):纯 wide→wide 静止缩放不再执行 `r.current = target(); r.needsWrite = true; kick()` 的布局重写,仅更新 `r.width` 与 mode/phase 簿记并照常 `geometry()`;narrow→wide 模式切换保留现有写入路径。缩放由库 `Kn` 单路径等比重分配,hook 经 `onLayoutChanged` 空闲采纳并持久化。
- 其余零改动:`useSidebarDrawer` 动画/恢复/全屏/收放路径、持久化 schema、投影纯函数、CSS。

## 验收映射

| 验收标准 | 落实 |
|---|---|
| 分割线按百分比分配两侧空间 | A1:chat Panel `preserve-relative-size`;比例基准为持久化百分比 |
| 任意缩放/最大化/还原比例不变 | A1+A2:库 `Kn` 单路径精确保持(调研 §布局协调器交互);测试 TC-1(出带因子+往返+持久化)、TC-2(键盘改比例后保持) |
| 通过目标相关测试(禁止全量) | 新增 `tests/browser/chat-content-ratio-resize.test.ts`(TC-1…TC-5)+ 回归 `tests/browser/sidebar-drawer-resize.test.ts`、`tests/unit/sidebar-layout.test.ts`、`tests/unit/workspace-layout.test.ts` |
