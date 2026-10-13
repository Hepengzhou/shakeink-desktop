# 左侧导航 UI 调研

日期：2026-10-13（Asia/Shanghai）。范围为本地桌面仓库和用户提供的导航截图；按源代码核对现状，不读取实际作品、用户资料或 Key。本文为第一项产物，正式实现尚未开始。

## 用户要求与现状

| 要求 | 当前证据 | 设计结论 |
| --- | --- | --- |
| 两个创建入口更宽松、换图标 | `src/components/layout/SidebarTree.tsx:1672` 起，两行均为 `h-7`（28px），无行间距；图标为 14px 的 Plus、MessageSquarePlus | 当前 v4：每行 32px、行间距 4px、文字 14px/20px；18px NotebookPen 与 MessageCirclePlus，第二行名称为“新对话” |
| 底部用户选项增高 | `SidebarTree.tsx:2057` 起，外层纵向 padding 8px、按钮纵向 padding 4px、头像 24px | 底栏 72px，按钮 52px，头像 32px，用户名和邮箱保持现有双行布局 |
| 去掉属性项 | `SidebarTree.tsx:1919` 起，属性为设定下的独立 TreeNode | 只撤销左导航入口，既有属性定义、业务面板注册和数据不随导航调整删除 |
| 所有导航长标题渐隐 | `SidebarTree.tsx:272` 的 TreeNode 标签使用 truncate；底部姓名/邮箱也使用 truncate | 按实际溢出启用文字透明遮罩，完整字符串仍供可访问名称和完整名称提示使用 |
| 情景试验场不显示展开内容 | `SidebarTree.tsx:1955` 起，分组默认展开，点击只切换展开，子树挂载即请求列表；空态占据额外一行 | 改成单行入口，不带展开箭头、不渲染树内子项；点击管理弹窗，保留现有试验场打开和增删改能力 |

## 第二轮参考与修订

用户认为 v1 的 44px 创建入口过高，补充 Codex“新聊天”“你的 dot”截图，要求参考字号、高度和布局。截图体现出紧凑的单行入口、清楚的文字、左图标与文字固定间隔、垂直居中。截图未包含 DPR/系统缩放，不能把截图物理像素当成 Codex 的实际 CSS 规格。

v2 采用 32px 行高、4px 行距、14px 字号、20px 行高、500 字重；图标仍 18px，左右 padding 12px、图文间隔 10px。相较 v1 每行减少 12px，创建区整体减少 26px；相较现有产品 28px 的无间距入口，仍增加适量留白。底部用户区、树节点和其他本轮要求保持。v1 原型及其报告保存在 `archive-v1/`；此轮历史以 v2 为当时的审核依据，当前 v3 见下节。

## 第三轮：分类 Tabs、场景与新对话

用户最新要求把“创建对话”改为“新对话”，图标使用附图的圆形气泡内加号；本地 `lucide-react/dist/esm/icons/message-circle-plus.mjs` 提供对应 MessageCirclePlus（气泡轮廓 + 中央横/竖两条线）。采用该真实图标，继续 18px/1.7 规格。

“场景”不显示树内展开内容。现有 `SidebarTree.tsx:1990–2007` 使用 sceneKey/GlobalSceneTree；`src/components/content/scene/SceneWorkspace.tsx:23` 的 openAllScenes 已打开真实 scenes 面板。最新方案去掉导航箭头/子树，点击复用 openAllScenes；右侧 SceneTree、场景引用和管理能力保留。由于左导航不再出现任何场景名称，v1/v2 对全局场景子树标签渐隐的改动已不再需要；不为了旧要求改右侧目录树。

“作品阁”换为作品、设定、角色、正文、对话五项 Tabs。现有真实数据分布在 SidebarTree 内多个子树：设定节点 `:1813–1926`、CharacterSubtree/ForeshadowCharacterSection、WorldSubtree、OutlineSubtree `:1037` 起（小说详情缓存 `['novels', novel.id]` 的卷章）、ConversationsNode `:1291` 起（共享 `['chat-conversations']`，按 novelId 过滤）和未绑定作品的 UnboundConversations。不得让分类视图使用一份新造的业务列表或只显示当前作品。

设计解释：“作品”展示当前完整的所有作品树；其余四项按所有作品分组，只显示该分类的条目，作品名作分组标题。角色分类为平铺人物名单并保留身份标记，包括伏笔角色；正文保留卷→章；设定保留世界层级；对话包含未绑定作品的“小说创作指引”，避免无作品会话失去入口。分组标题仅用于辨认归属，不增加其他分类业务项。空、加载、错误和暂不可用状态独立显示，不能把未读取的数据伪装成空列表。

v3 仍为用户待审核 HTML，生产代码不改。五个 Tabs 的切换、键盘操作、各分类的树折叠/滚动保持需要新增设计检查；旧 v2 HTML、报告与独立审核保存在 `archive-v2/`。

## 第四轮：留白、身份标记与抽屉动作

用户最新要求分类 Tabs 上下加大留白、上方更宽松；角色主/配/反/伏笔等标记跟在姓名后面左对齐；收放侧栏时文字和布局不能随分栏变窄而变形。

Tabs v3 外 margin 为上4px/下8px，当前 v4 调为上16px/下12px；36px组高和28px选项高保持。创建区已有底部8px padding，因此可见按钮到Tabs之间还包括原8px留白；这里16/12是Tabs自身外间距，避免测量口径混淆。

角色标记现在位于 `SidebarTree.tsx:272` 的 flex-1 标签后、作为行级 sibling（`:273`）；原型 `.row-main` 同样 flex:1，所以短姓名也把标记推至右侧。v4 把角色姓名和身份标记作为一组：短名字后6px即标记，长名字只压缩并渐隐姓名，标记固定宽度，不挤掉原动作。其他非角色标记不因本次修订移动。

`DashboardShell.tsx:112–157` 的 animateSidebarTo 用 group.setLayout 逐帧将 sidebar 分栏百分比收至0；`:481` 在动画中放开 minSize，但 SidebarTree 仍直接填充不断变窄的 Panel（`:486`），导致重排。既有 springEase 和打开560ms/收起420ms 已有用户批准，可复用；不重写真实分栏或用HTML替换工作台。

方案采用原 Panel 内的裁切视口与固定宽度内层。动画开始记录完整导航宽 W，按当前可见分栏 V 令内层 translateX=V-W；内层始终宽W，原Panel只调整可见占位，邻栏继续沿原Group吸收空间。完整侧栏向左离场/从左入场，内容、字体、行数、徽标和渐隐阈值不随动画改变。手动分栏拖宽仍是正常尺寸调整；不能用给所有元素nowrap掩盖动画中的挤压。

v4 HTML提供真实时间的收起/展开按钮、相邻区域示意和慢速预览；隐藏/动画期间导航不接收焦点，外部恢复入口始终可达，快速换向从当前位置继续。生产实现还需验证原生拖拽安全区、窗口resize、焦点/菜单与右侧编辑器不重挂载，HTML结果不证明这些通过。旧v3设计和报告归档在archive-v3/。

独立审核追加源证据：DashboardShell的多个完整setLayout写入会竞争，需单一布局合成；ChatPanel恢复按钮仅sidebarHidden可见，内容全屏时需ContentTabs caption入口；settledWorkspaceLayout保留展开中间值，需传入协调器终态；globals.css的<900强制全宽/隐藏规则需单独覆盖层分支；desktop.css已有裁切子元素原生区域注册的风险记录。具体执行条款已纳入technical-plan.md，不能由原型宣称真实解决。

## 真实组件与遗漏点

主组件为已迁移的真实 Web React `SidebarTree`，不可替换成原型。`DashboardShell.tsx` 的 sidebar 默认宽度 260px、最小 200px、最大 420px；`WindowControls.tsx` 保持现有 44px 桌面控制栏。除创建和账户区域之外，业务树行高继续为 28px、缩进继续为每级 14px。

v1/v2 调研确认 GlobalSceneTree 的场景名独立使用 truncate，但 v3 已取消整个导航场景子树，故不再修改共享 SceneTree。`src/components/desktop/UnavailableWorks.tsx:28` 的不可用作品标题同样为 truncate，当前导航和分类分组标题需纳入渐隐。账户菜单中的姓名、邮箱也需覆盖。

## 与右侧 Tabs 的一致性依据

`src/app/desktop.css:149–150`：ContentTabs 标题为单行 `text-overflow:clip`，仅 `data-overflow="true"` 时使用从右端 24px 开始的透明度遮罩。`src/components/layout/useContentTabStrip.ts:134` 使用 `scrollWidth > clientWidth + 1` 测量，ResizeObserver 和字体加载事件更新状态。导航采用相同的条件、方向和 24px 渐隐距离，只作用于文字，不遮罩图标、标签、头像和操作按钮。导航尺寸采用当前业务 UI 的 CSS px，保留已有 Electron zoom 行为；不套用 Tabs 标题栏专用的逆 zoom 换算。

## 情景试验场入口的可达性

`src/components/content/registry.tsx:79` 已注册单个试验场详情 `scenario`，`ScenarioPanel.tsx` 需要 `refId=labId`。当前仓库没有独立试验场列表面板，不能把无 refId 的 Tab 当作可用列表打开。

设计选择：复用现有 SidebarTree 列表查询、创建/重命名/删除 mutation 和既有 ScenarioPanel，以现有 Dialog 打开管理列表。移除树内 ScenarioSubtree，列表仅在弹窗打开时取数。点击已有试验场打开原详情 Tab；创建仍用原 ScenarioCreateDialog，成功后打开原详情；重命名同步原 Tab 标题，删除沿用原确认。弹窗外的左导航始终只有一行“情景试验场”。这是本次需要审核的行为落点。

## 图标与主题

图标来源为仓库已安装的 `lucide-react`，本地包存在 `notebook-pen.mjs` 和 `message-circle-plus.mjs`。HTML 原型直接打包这两个 React 图标，避免手工绘制导致审核和实现不一致。新图标为 18px、strokeWidth 1.7；业务树已有 14px 图标保留。

宣纸、玄墨颜色取自 `src/app/globals.css` 的 sidebar / foreground / muted-foreground / primary / hover-wash / active-wash / sidebar-border。保持现有选中洗色与字体风格。设计原型中的数据为公开合成示意，不复制用户截图中的作品、角色、对话或账户名称。

## 顺序与验证边界

本次最新请求明确要求“HTML，需要我审核”，覆盖之前允许自动推进的通用批准。调研 → 产品设计 → HTML 审核后暂停，收到此次 UI 批准再实施。方案和测试用例分别独立子代理审核，实施按 TDD，随后独立代码审核、全量用例及真实目标验证。HTML 浏览器检查只证明设计原型，不代表正式产品、安装包或 macOS 验收。

当前工作区已有其他任务修改；本次使用独立 `design/sidebar-navigation/` 目录，不改这些实现文件。两个验收台账仅增加本次 pending 记录，保留原状态。
