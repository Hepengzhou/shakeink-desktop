# 左侧导航 v8 正式实现

用户于 2026-10-13 批准 `design/sidebar-navigation/index.html` v8，并明确允许继续。本实现以累计修订后的产品要求 SN-01–16 为准，保留工作区其他任务的修改。批准边界见 `docs/implementation-boundaries.md`。

## 按顺序交付

| 阶段 | 产物与状态 |
| --- | --- |
| 调研 | `design/sidebar-navigation/research.md` |
| 产品设计 | `design/sidebar-navigation/product-design.md`，v8、SN-01–16 |
| HTML 设计 | `design/sidebar-navigation/index.html`，用户已批准；历史设计检查保留在同目录，不计正式产品测试 |
| 技术方案、独立审核 | `design/sidebar-navigation/technical-plan.md` 正式实施段；`2026-10-13-sidebar-navigation-plan-review.md` |
| 测试用例、独立审核 | `2026-10-13-sidebar-navigation-test-cases.md`、`2026-10-13-sidebar-navigation-test-review.md` |
| TDD、代码实现与独立审核 | 本文、导航和抽屉两份独立 code review；实际 red/green 证据位于 `docs/evidence/sidebar-navigation/` |
| 测试 | `2026-10-13-sidebar-navigation-verification.md`，记录最终实际结果及边界 |
| 总结 | `2026-10-13-sidebar-navigation-summary.md` |

## 实现变化

| 范围 | 最终行为 | 正式组件 |
| --- | --- | --- |
| 顶部、底部 | 真实本地 Seal +「玄印写作」品牌；32px 创建入口、NotebookPen/MessageCirclePlus；「新对话」无选中状态；账户区72px，资料来自当前账户 | SidebarTree、Seal、NavigationLabel、desktop.css |
| 五分类 | 作品/设定/角色/正文/对话等宽键盘可达 Tabs；选中中性气泡细边。切分类只改变左侧显示，右侧 tabs、编辑器和会话草稿保持 | SidebarTree、sidebar-navigation-state |
| 过滤作品 | 跨全部真实作品；四过滤视图按 view + ID 独立折叠，默认展开，body hidden + inert。正文根目录菜单独立于 body，空正文或折叠也可用 | 原设定、角色、卷章、会话组件；OutlineTreeMenu |
| 设定入口 | 原设定目录加物品、情景试验场、场景、世界线、叙事线、大纲。属性只移除左入口；场景和试验场均单行 | 原 ID、原缓存、原打开动作；原业务面板和 registry 保留 |
| 试验场管理 | 同一 Dialog Root 内管理/创建/改名/删除；只在列表开启时查询。原 cast form 复用，真实 CRUD。等待场景离开 guard，取消可中断等待；POST 已成功而导航被拒绝时保留已创建记录并允许重试打开。真实目标暴露原更新服务事务内再次借用连接，已将第一次读取交给当前tx | ScenarioLibraryDialog、ScenarioCreateDialog、tabs store、scenario-lab服务一行修正 |
| 名称、身份、图标 | 仅实际溢出启用24px渐隐，完整 title/ARIA 保留，图标/操作/身份徽标不被裁切。角色徽标贴姓名后6px，与 fallback 图标同身份色；封面、照片、章节状态保留。默认作品 FolderClosed/Open 石灰色，左金手指 Pointer | NavigationLabel、主题24类语义色、原 CroppedImage/章节 status |
| 不可用作品 | 四过滤视图同样折叠；仍由一个原 UnavailableWorks 实例控制维修 flight、busy、错误和真实 workId | UnavailableWorks 的展示包装扩展 |
| 固定抽屉 | 保留真实 Group/Panel/SidebarTree 实例；完整 inner W 固定，实际可见 V 只决定 V−W 平移与裁切。收420ms/开560ms、快速反向、并行内容/全屏意图、明确 restore、减少动态均由一个 Group writer 合成 | DashboardShell、useSidebarDrawer、sidebar-layout |
| 窄屏和原生标题栏 | 动作期间冻结完整形态与断点模式，终态以最新收放指令切模式。<900px 全宽覆盖、保留真实 underlay；不把窄屏宽度写成桌面偏好。隐藏/运动内层 inert，caption 恢复入口存在于 ChatPanel 和空/非空 ContentTabs。静止树只注册有界 no-drag host，隐藏/运动注销内层原生区域 | 原 ChatPanel/ContentTabs caption 扩展、desktop.css |

DashboardShell、SidebarTree、ChatPanel、ContentTabs 和业务面板继续使用真实 React 源。HTML 设计、示例人物/作品、调试工具条、虚构版本和测试结果不进入安装版工作台；验证数据只在隔离目录创建。无新增 HTTP 服务、模型后备或远程字体。

## 生命周期与并发边界

- 分类状态和滚动意图以当前目录 scope 隔离；自然折叠造成的 scroll clamp 保留期望位置，用户 wheel/touch/键盘/滚动条或主动定位接管。异步内容恢复不会覆盖用户意图。
- 瞬态菜单/hover 通过 navigation pause 关闭；业务 Dialog 输入不随分类、折叠被卸载。删除或 scope 变化清理对应 ID，保留其他实体状态。
- `openTabForNavigation(tab, signal)` 在现有场景 guard 之后核对当前 activationNonce、目标对象及 signal；旧 void 导航的迟到 guard 同样核对源版本。取消不等待 guard 完成，也不让迟到结果覆盖新选择。
- 抽屉只有一个 `setLayout` writer。目标布局与中间可见宽分开，恢复取消旧 rAF generation；保存终态目标而不是动画比例。跨断点完成帧把最新指令转给新模式，窄开转宽恢复桌面 sidebar 偏好，选择仍挂载的真实 chat/content underlay。

## 审核和验证证据

导航由 `sidebar_drawer` 独立审核，抽屉由 `sidebar_design_review` 独立审核；双方没有自行批准本人实现。报告记录源 SHA-256、发现和修复。试验场改名焦点、未绑定对话错误显示、冻结模式的根导航、跨断点旧意图覆盖均已修复，并保留失败与修后证据。

实际首轮 red `red/real-component.tap` 是正式 SidebarTree 缺品牌和五 Tabs 的两条行为失败。更早的缺模块、缺浏览器或 fixture loader 错误只作环境诊断。跨断点最新意图 red `red/drawer-cross-intent.tap` 为三条真实失败；修后5条意图用例和原抽屉/纯逻辑共18条通过。测试数据、原生媒介和实际目标系统范围见最终验证文档，不以 HTML 或浏览器计算样式代替 Electron/Windows 结果。

## 真实验收后的服务补充

第三轮Windows实际创建成功，但改名PATCH500；隔离数据库直接运行正式服务也复现context“Use the supplied transaction; borrowing this database again would deadlock”。根因是原 `updateScenarioLab` 已进入事务，却从全局scoped client再次读取existing。方案、用例和测试源先交独立审核，再运行正式handlers/PGlite red：标题更新500≠200，非法外作品角色更新500≠400；DELETE原级联已通过。

修正只有 `src/lib/services/scenario-lab.ts:359` 的 `prisma.scenarioLab.findUnique` → `tx.scenarioLab.findUnique`，保留事务/锁后重读/归属/配置整体解析/原子update和context借用保护。新增DB三组与原内容事务、PGlite adapter共19/19通过，最终typecheck和desktop重建通过。独立结论及源hash见 `2026-10-13-sidebar-scenario-transaction-review.md`。第四轮Windows真实创建/改名/删除已通过；后续native矩阵仍以最终完整报告为准，前轮部分通过不计完整验收。

## 首帧与结构注册的补充

第五轮 Windows 实测发现收起首帧实际可见宽度超出完整内层宽度：preflight 为287.75px，首moving可见359.8646px。提前注册逐帧采样、保留真实Group和原断言的冷挂载测试复现了四次失败。记录显示动作前 `getLayout()` 已准确反映resize后的比例；Panel约束/Separator注册重施库的历史requested layout，发生在下一次owner写入之前。问题来源于结构注册缓存，不能解释成getLayout失真或测量误差。

完整形态继续固定，宽屏动画进度改以像素保存，每帧按真实直接Panel外层宽之和换算比例，交给原唯一Group writer；secondary轨道保留原比例协调。这样运动中放大窗口不会把固定内层宽度重新解释成更大的百分比宽度。注册窗口保留当前意图或显式restore，并经同一writer重新提交；有界MutationObserver只观察Group根的childList/style及直接Panel根style，实际API不匹配且pending时才补写，带重入保护和卸载disconnect。后续owner帧释放注册窗口，普通静止拖宽继续由原分栏组件处理。

增量用例覆盖冷挂载后双向resize、首个及全部moving帧、同turn全屏、快速反向、运动中扩大窗口、终态手动拖宽、显式restore和组件卸载。所有历史red保留，未移除Math.min、跳过首帧、放宽V≤W或V−W容差。当前源的最终审核、实际计数和Windows完整结果以验证文档为准。

## 运动中 resize 与实际分隔线预算的补充

Windows10 又发现一帧实际 V 超固定 W、raw 平移差18px，失败32帧保留。独审后的11条真实Group自然resize用例首次2通过/9失败，分别记录旧窄媒体样式干预、库晚于owner的旧axis投影，以及反向关闭后重新展开的0.14375px稳定目标漂移。具体方案、用例源与独立审核见 `2026-10-14-sidebar-drawer-resize-plan.md`、同名plan-review；不从Chrome记录直接声明原Windows数值同因。

最小修正保留真实分栏组件和唯一writer：DOM `data-narrow-pane` 仅在冻结narrow输出，CSS只恢复原已挂载wide直接Separator显示；最近owner的Sidebar像素pose与当前secondary轴在window/Group resize、原public callback和原有界Observer中按实际可分配宽重合，异常布局不写入目标或宽度偏好。首次非换向opening在原首writer前、真实结构提交后将目标百分比换成W/像素goal，首positive之后保持W不变；换向保留已有W，restore取消初始化记录。分隔线尺寸完全读取实际布局，不假设恒为1px。

新11条和原28条均通过，TypeScript exit0；反向reopen首次actual269.703125px/available1798px、API15%、lastSidebar15，原0.1px断言及随后5帧诊断保留。独立代码审核和最新全量/构建/Windows仍由最终验证文档逐项记录，历史red不覆盖。
