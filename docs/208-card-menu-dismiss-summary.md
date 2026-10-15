# 规划卡片「…」菜单外部点击关闭 总结

日期：2026-10-16。问题：世界线「时间线」「事件表」视图的事件卡片与叙事线卡片右上角「…」菜单，点击菜单区域外无法取消展示。

## 根因

三处场景共用 `src/components/content/planning/PlanningWorkspace.tsx` 中两处 JSX（`renderCard` :738 叙事卡、`eventCard` :1938 世界事件，后者被时间线/事件表共用），菜单用原生 `<details>/<summary>` 实现，显隐完全依赖浏览器原生 `open` 切换，没有任何外部点击/Escape 关闭逻辑。

## 修复（PlanningWorkspace.tsx，+38/-2）

1. 两处菜单 `<details>` 加 `data-card-menu=""` 标记，与文件内披露/折叠区块（9 处）区分。
2. 两处菜单 `<details>` 加 onClick：点击命中菜单项按钮时，在按钮业务回调之后冒泡关闭菜单（`e.currentTarget.open = false`）。
3. 新增一个 useEffect：document capture 阶段 pointerdown——目标在已开菜单外则关闭；keydown Escape——关闭全部已开卡片菜单，焦点在菜单内时归还 summary。不 preventDefault/stopPropagation，沿用文件内 :223-243 既有监听模式。

行为结果：外部点击关闭、菜单互斥（开一个关另一个）、菜单项执行后关闭、Escape 关闭；summary 原生二次点击切换、披露区块、拖拽、编辑器外部关闭、对话框焦点均不受影响；CSS 与菜单视觉零变化（符合已批准 UI v0.13）。

## 产物与流程台账

| 文档 | 内容 | 结论 |
| --- | --- | --- |
| docs/201-card-menu-dismiss-research.md | 调研 | 根因定位，两候选方案 |
| docs/202-card-menu-dismiss-plan.md | 技术方案 | 最小侵入方案 A |
| docs/203-card-menu-dismiss-plan-review.md | 方案独立审核 | 通过（P2 修订并入：披露区块补全、夹具时间条件） |
| docs/204-card-menu-dismiss-cases.md | 测试用例 CM-01～CM-10 | |
| docs/205-card-menu-dismiss-cases-review.md | 用例独立审核 | 修订后通过（CM-08 收窄、新增 CM-10） |
| docs/206-card-menu-dismiss-code-review.md | 代码独立审核 | 通过，实跑 10/10 |
| docs/207-card-menu-dismiss-verification.md | 验证记录 | RED 7 败 3 过 → GREEN 10/10 |

## 验证

- RED：未修复时 7 条失败 3 条通过，与预期集合一致（缺陷复现）。
- GREEN：修复后 10/10 通过（两次独立运行），`npm run typecheck` 零错误。
- 测试形态：esbuild 打包真实 WorldlinePanel/NarrativePanel + 真实 planning CSS + 无头 Chromium 真实点击；数据为隔离内存夹具，不触数据库/网络/安装包。
- 遵守约束：仅针对本次修复新增测试，未跑全量套件。
