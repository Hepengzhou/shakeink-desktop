# 右侧内容面板抽屉动画调研

日期：2026-10-13（Asia/Shanghai）。本次范围是内容面板收起和展开时的形态，依据当前桌面仓库源码与已批准的左侧导航抽屉设计。右侧内容应保持展开时的完整排版，整体向右移出或从右移入。

## 当前收放行为

`DashboardShell.tsx:46–50` 将真实 `ContentTabs` 直接放进 content Panel。`useSidebarDrawer.ts:184–208` 的内容收放以百分比为动画轴，经 `:87–120` 的统一布局协调器逐帧调用 Group.setLayout，右侧 Panel 的可用宽度随之接近零。右侧没有固定宽度内层，文字、表单、Tab 条和编辑器收到的是持续变化的排版宽度。

与此对应，左侧在 `DashboardShell.tsx:35–39` 已有裁切视口和固定内层。`useSidebarDrawer.ts:55–69` 记录完整宽度 W，以可见宽度 V 计算位移 V−W；`desktop.css:465–467` 提供裁切。左导航内部布局宽度保持 W，动画只影响可见区域和位置。这也是本次用户要求右侧参照的行为。已批准行为见 [左侧导航设计的侧栏抽屉收放](../sidebar-navigation/product-design.md)。

右侧 Tab 还会响应宽度变化：`useContentTabStrip.ts:115–136,146–150` 通过 ResizeObserver 计算标题容量、溢出和紧凑模式。因此只给文字添加 nowrap 无法解决问题，工具按钮、Tab 容量、表单列和编辑器仍会随外层宽度重排。

## 修复涉及的交互边界

| 边界 | 当前源码依据 | 修复要求 |
| --- | --- | --- |
| 内容显隐与全屏共享动画轴 | `useSidebarDrawer.ts:184–220`，secondary 同时接收 content 和 chat 命令 | 右抽屉冻结宽度和阶段必须独立，继续由同一协调器写 Group，避免并行动画竞争 |
| 左右面板同时收放 | `useSidebarDrawer.ts:113–120,176–181` | 每帧合成最新目标，右侧内层宽度在本次内容收放期间保持固定 |
| 900px 断点 | `useSidebarDrawer.ts:251–264` 仅在 sidebar motion 时冻结模式 | 内容收放同样冻结模式，动作结束后再按最新窗口尺寸落位，不能中途切换 CSS 显隐分支 |
| 内容实例 | `useSidebarDrawer.ts:148–150` 收起结束设置 contentMounted=false；Shell `:46` 条件挂载 | 收放保留真实 ContentTabs 和业务编辑实例，防止草稿、选区、撤销、Tab 滚动因抽屉操作重建 |
| Tab 本身的保活 | `ContentTabs.tsx:207–211` 保留各业务 Tab，仅隐藏非活动项 | 保留原机制；抽屉外壳不能破坏它 |
| 焦点与浮层 | Shell `:48` 仅处理左导航覆盖的 inert；ContentTabs `:155–169` 有 portal 菜单 | 隐藏及收放期间右抽屉不可聚焦/点击；焦点转到可见入口；关闭临时菜单，保留业务弹窗输入 |
| 原生标题栏 | `ContentTabs.tsx:65–94` 平台 caption 安全间距；`desktop.css:214–220` 记录越界 no-drag 风险 | 原生窗控保持固定；移动或裁切的控件不能在可见区域之外留下原生命中区，真实 Electron 另验 |
| 持久化 | `useSidebarDrawer.ts:270–275` 保存 target；`workspace-layout.ts` 归一化显隐终态 | 继续保存展开/隐藏的终态和完整分栏偏好，禁止保存动画半途宽度 |

2026-10-13 以 Node 24.19.0 执行 `node --import tsx design/content-drawer/capture-baseline.mjs`，退出码 0。真实 Shell / ContentTabs 的浏览器隔离 fixture 中，业务 body 被替换，并注入固定内容的合成段落。收起采样观察到右侧内层宽度由 436.40625px 降至 4.71875px，段落由 3 行变为最多 53 行，随后 ContentTabs 卸载。原始记录见 [baseline.json](baseline.json)，对照 [展开截图](baseline-open.png) 和 [动作中截图](baseline-mid.png)。该证据证明当前分栏造成重排，不是实际 Electron、Monaco、数据库或全部业务面板验收结果。

## 设计结论

保留原 Group、Panel、真实 ContentTabs 与全部业务面板，只为 content Panel 增加裁切视口和固定宽度内层。开始收起时记录当前实际宽度；开始展开时先投影合法终态、在第一帧前确定完整宽度。动画期间右内层右锚，宽度 W 固定，位移为 W−V，V 为外层实际可见宽度。位移和裁切使内容整体向右离场，内部不用 scale，也不随 V 重排。

沿用左侧收起 420ms、展开 560ms 的临界阻尼曲线。中途反向从当前位置继续，并沿用同一次动作的 W。动作期间额外 resize 只改变裁切边界；完成后按实际可用空间重新排版。正常拖动分栏、切换全屏和静止时窗口调整仍采用原尺寸规则；全屏切换若打断收放，先承接当前几何与最新命令，不能提前解冻 W。

窄窗口以工作区完整宽度为 W，右侧覆盖对话区并向右进出；左导航从左侧覆盖。完成后按最新 pane 选择显示内容或对话，不把窄屏全宽写成桌面偏好。业务数据更新仍可正常发生；固定形态约束针对收放造成的尺寸变化，不冻结真实内容状态。

## 产物顺序

1. 本调研及源码基线证据。
2. [HTML 设计稿](index.html) 与 [设计说明](product-design.md)，经用户审核后才进入正式修复。
3. 技术方案与独立子代理审核，测试用例与独立审核，TDD 修复及独立 code review。
4. 全量用例和实际目标系统验证，依据实际结果更新验收台账并总结。

本次最新用户要求新增 HTML 审核环节，优先于旧范围的免重复 UI 批准条款。
