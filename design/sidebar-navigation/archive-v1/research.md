# 左侧导航 UI 调研

日期：2026-10-13（Asia/Shanghai）。范围为本地桌面仓库和用户提供的导航截图；按源代码核对现状，不读取实际作品、用户资料或 Key。本文为第一项产物，正式实现尚未开始。

## 用户要求与现状

| 要求 | 当前证据 | 设计结论 |
| --- | --- | --- |
| 两个创建入口更宽松、换图标 | `src/components/layout/SidebarTree.tsx:1672` 起，两行均为 `h-7`（28px），无行间距；图标为 14px 的 Plus、MessageSquarePlus | 增至 44px、行间距 6px；改用 18px 的 NotebookPen 与 MessageCircle，统一线宽 |
| 底部用户选项增高 | `SidebarTree.tsx:2057` 起，外层纵向 padding 8px、按钮纵向 padding 4px、头像 24px | 底栏 72px，按钮 52px，头像 32px，用户名和邮箱保持现有双行布局 |
| 去掉属性项 | `SidebarTree.tsx:1919` 起，属性为设定下的独立 TreeNode | 只撤销左导航入口，既有属性定义、业务面板注册和数据不随导航调整删除 |
| 所有导航长标题渐隐 | `SidebarTree.tsx:272` 的 TreeNode 标签使用 truncate；底部姓名/邮箱也使用 truncate | 按实际溢出启用文字透明遮罩，完整字符串仍供可访问名称和完整名称提示使用 |
| 情景试验场不显示展开内容 | `SidebarTree.tsx:1955` 起，分组默认展开，点击只切换展开，子树挂载即请求列表；空态占据额外一行 | 改成单行入口，不带展开箭头、不渲染树内子项；点击管理弹窗，保留现有试验场打开和增删改能力 |

## 真实组件与遗漏点

主组件为已迁移的真实 Web React `SidebarTree`，不可替换成原型。`DashboardShell.tsx` 的 sidebar 默认宽度 260px、最小 200px、最大 420px；`WindowControls.tsx` 保持现有 44px 桌面控制栏。除创建和账户区域之外，业务树行高继续为 28px、缩进继续为每级 14px。

场景节点不是 TreeNode：`src/components/content/scene/SceneWorkspace.tsx:72` 的 GlobalSceneTree 使用共享 `SceneTree.tsx`，名称也为 truncate。`src/components/desktop/UnavailableWorks.tsx:28` 的不可用作品标题同样为 truncate。本次渐隐范围必须覆盖这些导航内名称，并保留场景目录面板的独立现有交互；不能只替换主树标签后称“全部完成”。账户菜单中的姓名、邮箱也需覆盖。

## 与右侧 Tabs 的一致性依据

`src/app/desktop.css:149–150`：ContentTabs 标题为单行 `text-overflow:clip`，仅 `data-overflow="true"` 时使用从右端 24px 开始的透明度遮罩。`src/components/layout/useContentTabStrip.ts:134` 使用 `scrollWidth > clientWidth + 1` 测量，ResizeObserver 和字体加载事件更新状态。导航采用相同的条件、方向和 24px 渐隐距离，只作用于文字，不遮罩图标、标签、头像和操作按钮。导航尺寸采用当前业务 UI 的 CSS px，保留已有 Electron zoom 行为；不套用 Tabs 标题栏专用的逆 zoom 换算。

## 情景试验场入口的可达性

`src/components/content/registry.tsx:79` 已注册单个试验场详情 `scenario`，`ScenarioPanel.tsx` 需要 `refId=labId`。当前仓库没有独立试验场列表面板，不能把无 refId 的 Tab 当作可用列表打开。

设计选择：复用现有 SidebarTree 列表查询、创建/重命名/删除 mutation 和既有 ScenarioPanel，以现有 Dialog 打开管理列表。移除树内 ScenarioSubtree，列表仅在弹窗打开时取数。点击已有试验场打开原详情 Tab；创建仍用原 ScenarioCreateDialog，成功后打开原详情；重命名同步原 Tab 标题，删除沿用原确认。弹窗外的左导航始终只有一行“情景试验场”。这是本次需要审核的行为落点。

## 图标与主题

图标来源为仓库已安装的 `lucide-react`，本地包存在 `notebook-pen.mjs` 和 `message-circle.mjs`。HTML 原型直接打包这两个 React 图标，避免手工绘制导致审核和实现不一致。新图标为 18px、strokeWidth 1.7；业务树已有 14px 图标保留。

宣纸、玄墨颜色取自 `src/app/globals.css` 的 sidebar / foreground / muted-foreground / primary / hover-wash / active-wash / sidebar-border。保持现有选中洗色与字体风格。设计原型中的数据为公开合成示意，不复制用户截图中的作品、角色、对话或账户名称。

## 顺序与验证边界

本次最新请求明确要求“HTML，需要我审核”，覆盖之前允许自动推进的通用批准。调研 → 产品设计 → HTML 审核后暂停，收到此次 UI 批准再实施。方案和测试用例分别独立子代理审核，实施按 TDD，随后独立代码审核、全量用例及真实目标验证。HTML 浏览器检查只证明设计原型，不代表正式产品、安装包或 macOS 验收。

当前工作区已有其他任务修改；本次使用独立 `design/sidebar-navigation/` 目录，不改这些实现文件。两个验收台账仅增加本次 pending 记录，保留原状态。
