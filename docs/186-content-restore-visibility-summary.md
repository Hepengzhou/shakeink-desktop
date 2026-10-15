# 右侧面板恢复按钮显隐时序修复总结

日期：2026-10-15。交付顺序：180 调研/方案 → 181 独立审核（需修订后批准，已修订）→ 182 用例 → 183 独立审核（需修订后批准，已修订）→ TDD 实现 → 184 code review（批准）→ 185 验证（全 GREEN）。

## 需求与根因

- 需求 1：点击 AI 对话区右上角「显示内容面板」后，按钮须在展开动画播放**前**隐藏。
- 需求 2：点击右侧面板「显示 / 隐藏内容面板」收起后，「显示内容面板」按钮须在收起动画播放**完成后**才出现。
- 根因：`useSidebarDrawer.ts` 的 `contentHidden` 原定义为 `contentPhase !== "open"`。相位机在动画开始即入 `"opening"/"closing"`、收尾才入终态，导致展开时按钮等动画播完才消失、收起时按钮在动画起点就出现。

## 改动（4 个源码/测试文件 + 6 个文档）

- `src/components/layout/useSidebarDrawer.ts`：`contentHidden` 改为 `view.contentPhase === "closed"`（按钮只在完全收起后出现）；新增 `contentSettleFocus` 一次性标记与 layout effect 消费——宽屏下恢复按钮改为收尾才挂载，原「动画帧内恢复焦点」路径失效，兜底在收起收尾提交后把焦点移到恢复按钮，且用户在动画中已主动转移焦点时不抢占；`apply` 适配器同步重置。附带修正：侧栏开关/全屏切换借用内容相位时恢复按钮不再闪现。
- `src/components/layout/ChatPanel.tsx`：删除随旧设计失效的 pointer capture 与过期注释（按钮不再随动画移动）。
- `tests/helpers/content-drawer-fixture.ts`：`ContentSample`/`captureSample` 增加 `restore` 字段（早退前计算，两路径同含），支持逐帧显隐断言。
- `tests/browser/content-drawer.test.ts`：新增 3 条 CD-08 用例（V01/V02/V04b）；改写 repeated reversal 为命令驱动 + 逐帧无按钮断言（V03）；删除与新需求冲突的「held pointer recovery」用例与 `clickMovingRestore` 辅助。旧的中途可见按钮反转设计（2026-10-13 批准）按「以后者为准」由 2026-10-15 需求取代，运动中反转保留命令路径（CD-01 same-task、CD-02 已锁定）。
- 文档：`docs/180`–`docs/185`（本文件为 186）。

## 验证（仅目标范围，未全量）

- TDD RED：修复前 4 个目标用例全部失败于预定显隐断言。
- GREEN：`tests/browser/content-drawer.test.ts` 20/20；影响面 11 个 browser 文件 82/82；`npm run typecheck` exit 0。浏览器为 playwright 固定版 chromium_headless_shell-1243（本轮补齐安装）。
- 非回归说明：CD-07 与 CD-01 ink 各有的时序敏感 flake 经对照实验（原始代码同形态失败）确认与本次改动无关。

## 遗留

- CD-07「hide 后 1 个 rAF 内提交 closing」断言对浏览器构建/负载敏感（既有问题），如需根治建议另行放宽为「首个运动帧前」语义并独立评审，不在本轮范围。
