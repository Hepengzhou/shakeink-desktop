# 左侧导航技术方案（已批准 v8 的正式实施）

日期：2026-10-13。用户已明确“UI 设计审核通过，可以继续”，批准 product-design.md v8 与对应 HTML。以下设计阶段记录保留；本节及执行边界补充是正式实现来源。批准不等同于实现或验收完成。

## 正式执行与文件责任

1. 独立审核本方案后，编写 SN-01–16 真实组件/纯逻辑/Windows Electron 测试用例并独立审核。先执行未实现要求的红灯测试，保存独立基线，才能进入实现。HTML 的 53 组与 787 帧仅保留设计证据。
2. 导航实现范围：SidebarTree、UnavailableWorks、NavigationLabel、ScenarioLibraryDialog、导航状态辅助函数；不复制业务服务。原查询键、mutation、guard、真实头像与引用操作复用。分类只改变左侧渲染；Dialog 的生命周期、未绑定指引和统一维修 flight 单独验证。SidebarHoverCard/OutlineTreeMenu/ScenarioCreateDialog 可局部增加 pause 或焦点透传：仅关闭悬停和非模态菜单，保留原导出、确认、业务 Dialog 输入与服务；Shell 的 interactionPaused 由 moving/hidden 控制。
3. 布局实现范围：原 DashboardShell/Group/Panel 上单一布局写入协调器与固定宽抽屉；纯数学目标投影/帧合成放 src/lib/desktop/sidebar-layout.ts 便于 TDD。ChatPanel 与 ContentTabs 只接恢复按钮 caption props，保留其已有未提交修改、原业务实例与安全区。desktop.css 只追加局部导航 token/样式与 drawer phase 规则。
4. 合并后独立审核上述真实代码与测试，修复阻断项。验证顺序为专项单元/真实 React 浏览器交互 → 全量 unit/integration 与 typecheck → UI/desktop 构建 → 当前 Windows Electron 真实组件、隔离数据库、零模型、离线测试。原生拖拽注册必须有实际目标证据，计算样式仅是补充。其它操作系统未执行据实记录。
5. 台账逐项记录代码、命令、失败及证据。测试失败先区分本次回归和独立基线；不能把已有失败忽略成“全量通过”。不得发布、修改父目录、引入 HTML 数据或用启动冒烟代替业务组验收。

正式测试用例文件：docs/reviews/2026-10-13-sidebar-navigation-test-cases.md；正式方案审核文件：docs/reviews/2026-10-13-sidebar-navigation-plan-review.md；实施前基线目录：docs/evidence/sidebar-navigation/baseline/。

### 场景离开门控的可等待路径

在 stores/tabs.ts 局部新增 openTabForNavigation(tab, signal): Promise<boolean>，复用 sceneLeaveGuard；保留现有 openTab/activateTab 的 void 语义与其它调用。开始时捕获 activeTabId、activationNonce、既有目标对象；await guard 后检查 AbortSignal、当前源激活版本与目标是否被替换/删除，符合才原子追加/激活并返回 true；拒绝错误由调用者呈现，false 不关闭 Dialog。ScenarioLibrary 的每次开启请求具有 AbortController；取消、账户/目录 scope 改变、作品撤销或卸载 abort，finally 清 busy。创建成功后的记录进入已创建态，禁用重复提交；成功离开才关闭，guard 拒绝则返回已更新的管理列表并显示“已创建，页面尚未切换”，可重试打开该记录，绝不再次 POST。该最小 store 扩展也纳入独立审核和竞争/取消用例。

场景入口继续调用现有 openAllScenes，仅用户点击时清 scope/search；保留现有先清偏好再触发 guard 的行为，不声称拒绝后偏好不变。本轮不事务化 SceneWorkspace 或其它场景业务入口。分类切换/折叠不调用 openAllScenes。

取消请求通过 abort 与 guard promise 的竞速立即返回 false，不依赖 guard 最终完成；后台 guard 完成也因signal/源版本检查不能提交。原 afterSceneLeave 的异步分支同样在捕获的源 activeTabId/activationNonce 仍有效时执行 action，防止较旧 void 调用在新导航后覆盖当前激活；同步 void 分支和其它业务语义保留。

v8新增分类组fold与品牌。四过滤视图以view+novelId维护collapsed set（默认空，新增作品默认展开），group标题原生button aria-expanded/controls绑定稳定body id；只切导航，不调用业务open。内部body保持挂载但hidden+inert，不清子expanded/查询缓存，正文OutlineTreeMenu为header sibling且fold后可用；临时菜单/焦点归标题，业务Dialog及删除/导出等操作不销毁。不可用作品以真实workId复用原错误/维修/重试，继续统一busy/flight，不伪装空态或复制维修控制器；未绑定指引不是作品。scope/作品移除清理对应状态，失效focus回标题/菜单/分类Tab。

每视图scrollTop分实际与待恢复值：结构变短自然夹限不能覆盖待恢复；展开/异步列表高度变化再恢复，鼠标/触摸/拖动/键盘或主动偏离自然夹限值的定位接管。切视图前先采集实际意图，ResizeObserver/rAF只合并恢复且卸载清理，不统一归零；仅当前分类挂载与当前分类内部fold保留两者并存。

品牌在SidebarWindowControls下、create区前复用Seal variant=mark，class覆盖30px、装饰包装aria-hidden，邻接17/24px、600、0.06em本地宋体fallback标题；44px品牌行上4/下8、左右20、图文gap10，原窗控44与创建32保持。原型引用相同本地SVG，验hash和实际加载，不把图片占位或外部字体带入产品。品牌也在完整固定抽屉内，不能被逐帧压缩。

v7历史仅将--icon-work改为宣纸#657077/玄墨#a6b0b8中性石板灰；完整树开合文件夹和过滤作品标题共用同一token，不改解析/点击/头像优先、其他类型或布局。v6全量设计报告存archive-v6/，v7当时重新核验新色的实际DOM/对比。

v6覆盖v5的选中Tab强调色：复用右ContentTabs同类selected-bg/selected-border与foreground，paper #f8f3e4/#d8cba6、ink #2a2826/#4b4640，1px透明边始终占位、6px圆角，选中只变颜色，不复制caption逆zoom/拖拽逻辑。外组/未选项透明，当前28px尺寸和留白保持；键盘focus用foreground混色。原v5产物已归档archive-v5/。

新增导航主图标解析仅从真实业务type和CharacterRoleType决定局部iconTone，不按译名或图标形状匹配；默认作品图标使用novelExpanded选择FolderClosed/FolderOpen，已有cover avatar优先；分类标题按本视图fold状态切FolderClosed/Open。金手指左侧局部Pointer override，不修改stores/tabs共享getTabIcon和右侧图标。

TreeNode局部新增tone/data属性并给主图标显式槽位（或等价仅主图标选择器），CSS custom property在该行供主图标与身份徽标共用；不要用覆盖全部svg的规则。角色分组和人物依据PROTAGONIST/SUPPORTING/ANTAGONIST/伏笔身份共用四色，去掉其旧text-muted/active:text-primary及旧badge primary/gold分支的冲突。已有CroppedImage照片/cover不染色；伏笔真实字头像保留首字/20px虚线圆容器，文本/边框与tag用身份tone，不能只改未渲染fallback。支持主/配/反/伏笔姓名后徽标与完整身份ARIA；active/hover不改图标tone。未知type/role回原中性，不改业务实体。

分类色表在product-design.md，本地拟写desktop.css的paper/ink变量。真实CHAPTER_STATUS_ICONS、状态点/加载错误/暂定标签、箭头/+菜单/原生窗控各自保留形状与状态颜色，不引入主题颜色覆盖其状态；只有普通正文/卷图标用manuscript色。真实类型/状态区分必须靠后续原组件用例与目标验收，合成HTML不能证明头像/状态实现通过。

v5历史范围（选中Tab色已由上方v6覆盖）：外组/未选Tab（含hover）透明，36px组高/28px选项高，上16px/下12px留白，间隔4px；ARIA/roving/focus可见保持。新对话删除isNewConversation对背景/文字/图标的全部active分支及仅供该样式使用的局部binding，继续原requestNewConversation，不写新chat状态。旧v4设计在archive-v4/。

设定视图复用原设定目录节点后，追加物品/情景试验场/场景/世界线/叙事线/大纲的真实入口渲染函数；与作品视图共享同一函数、原type/novelId和回调，不重复query/mutation。物品、世界线、叙事线、大纲走原openSimpleTab；场景仅用户激活入口时调用openAllScenes，分类渲染/切换不得触发scope/search重置；试验场沿用ScenarioLibraryDialog和原缓存/refId、管理/“+”焦点返回当前分类实例。作品完整树不删除六入口，其他过滤分类不增加六入口。分类切换只变导航，右侧业务实例/草稿/历史会话选中不变。

v4当前创建入口仍为32px/4px/14px/20px/500，图标18px。“新对话”、五分类和单行场景/试验场保持；Tabs外margin改上16px/下12px，角色标記放姓名后6px，侧栏收放用固定内层宽度的水平抽屉动作。v3历史在archive-v3/，生产文件尚未改。

1. 保留 `SidebarTree.tsx` 的真实 React、状态、查询、mutation、原向导、头像、悬停卡、引用拖拽、所有其他树分组和账号菜单；以局部样式调整创建与账户区域，使用已安装 Lucide 新图标。不得引入 HTML fixtures。
2. 新增轻量 `NavigationLabel`（拟定 `src/components/layout/NavigationLabel.tsx`），保留完整React文本、title和类名；ResizeObserver按实际完整内容容器测量溢出，挂载/文本/字体/尺寸变化经rAF合并，卸载清理。文字末端24px条件mask；角色姓名与标记同组，组flex:0 1 auto/min-width:0，姓名可缩、身份标记shrink:0，gap6px；只对角色启用，其他tag/操作位置沿用。短姓名用内在宽度，长姓名只缩文字不缩标记。样式落desktop.css，不改ContentTabs专用zoom。
3. 主树标签、分类作品分组标题、创建入口、账户触发器/菜单头部、UnavailableWorks 标题使用上述组件。v3 已取消 GlobalSceneTree 的导航挂载，因此不再改 SceneTree/SceneWorkspace 内的目录样式、key、prefs、焦点/键盘或引用逻辑。保留拖拽帮助 title，完整名称提示挂在文本元素。
4. 删除设定下属性 TreeNode 和唯一闲置图标 import；不删除 registry、tabs 类型、服务、schema、既有面板。
5. 情景试验场导航不保留 expandable/onToggle/scenarioKey 或树内 ScenarioSubtree。入口 active 按当前 Tab 的 type 和 novelId 判定，不能仅按 tab id 猜测。移除创建成功后自动展开逻辑。
6. 将既有列表查询和列表打开/菜单行为移入管理 Dialog，可抽为 `src/components/layout/ScenarioLibraryDialog.tsx`；只在打开时加载，保留 `['scenarios', novel.id]` 缓存键和原详情 Tab ID。清晰处理 pending/error/empty/列表。创建、改名、删除调用原 mutation/原弹窗，管理与操作弹窗互斥。显式保存导航行/“+”与列表操作启动 ref（不能假设 TreeNode 是 DialogTrigger）；用 Base UI 的 initialFocus/finalFocus 或等价受控焦点恢复实现产品返回规则。弹窗切换时抑制旧弹窗 finalFocus 返回导航的抢焦，待新弹窗挂载后聚焦对应按钮/记录；记录已删或 ref 已卸载时回列表“新建”或仍存在的导航入口。直达创建 cancel 回“+”，列表操作 cancel 回原记录/新建。打开详情使用原 openTab/activateTab 的场景离开 guard；实际激活成功才关闭列表，不绕开 guard、不误显示成功。create success 同样尊重现有门控。无需新增列表 Tab 类型或改 29 面板 registry。
7. 场景入口移除 expandable、sceneKey/toggle 和 GlobalSceneTree 挂载；点击复用 openAllScenes，按当前 Tab 的 type/novelId 判断关联选中。右侧 scenes/scene/scene-image registry、场景目录及能力保持。
8. 在 SidebarTree 中增加局部 NavigationView（works/settings/characters/manuscript/conversations）和受控分类 Tablist，替换作品阁文字。仅改变导航渲染，绝不修改 useTabsStore 的 tabs 数组、ChatPanel 当前对话、编辑器 key 或 drafts。默认 works；键盘 roving tabIndex，方向键自动激活，稳定 panel id/aria-labelledby，焦点留在选项。
9. 提取同一个真实节点/列表的渲染分支供完整树与分类复用，不维护第二套业务逻辑。设定复用当前固定节点、WorldSubtree（支持 baseDepth）和物品/试验场/场景/世界线/叙事线/大纲六个原入口；角色给 CharacterSubtree/ForeshadowCharacterSection 增加列表布局分支并保留真实角色数据/引用/头像/菜单，两个真实 query 各自显示 loading/error，只有都成功且总数0才显示暂无角色，不沿用失败返回null的歧义。正文用 OutlineSubtree(kind=content, baseDepth) 去掉外层正文目录，在可折叠作品标题的独立sibling位置保留原 OutlineTreeMenu(kind=content) 的添加卷/整书导出/删除全部卷章（空列表也可达）；content 列表空态单独渲染“暂无正文”，不复用旧“暂无大纲，去生成”或打开 outline。对话复用 ConversationsNode/UnboundConversations 的 list-only 分支，继续共享 ['chat-conversations'] 缓存和原 chat store 切换动作。分类内每个真实作品独立处理 pending/error/empty，可按指定范围提取 SidebarNavigationViews.tsx，但必须引用同一真实函数/查询/mutation。
10. 复用 useNovelList 的可用和不可用作品清单，所有分类跨全部作品，不依赖 works 下某个作品是否展开。entity key/cache key 继续用真实 novelId/refId，不能用标题做 key；分类状态仅存本轮会话的每视图 expanded/scrollTop，账户或目录 scope 变动重置，作品移除清理。首次视图从顶部开始，之后恢复先前 scrollTop，ResizeObserver/rAF 重新测量渐隐。仅挂载所选分类的导航内容，让已有 React Query 承担缓存/去重/失效，不用 hidden 模拟“已加载成功”；过滤页卸载导航子树不得卸载右侧原业务面板。
11. DashboardShell真实原Panel中加裁切视口/固定内层，不重写Group和SidebarTree。关闭前从sidebar DOM测量完整px宽W；打开前把保存百分比与当前Group可用尺寸换算/夹到实际目标W，复用springEase及420/560ms。原setLayout只驱动可见占位V，固定内层width:W/不flex-shrink/translateX(V-W)，不是设置SidebarTree宽度=V。读实际Panel裁切宽度同步位移，避免库minSize/邻栏补偿导致计算值与实际宽度不同。动作中额外resize保留W，只更新裁切；完成后才校正真实可用宽度。
12. 取消/换向延续当前可见V，保存完整打开目标而非中途宽度；反复点击/恢复布局/卸载都取消旧rAF和过时回调，最终transform清理且hidden占位0；布局持久化沿用settledWorkspaceLayout，不把中间裁切值当新分栏偏好。保持SidebarTree相同挂载key，原query、分类、滚动和草稿不重建。只有手动拖宽或动作外resize触发正常内层宽度更新。捕获refs只在当前账户/目录有效。
13. 隐藏/动作期用inert和正确ARIA移出导航焦点序；关闭前将内部焦点转可见恢复入口，并关闭hover/非模态菜单，保留业务Dialog输入。动画中的导航内部非模态弹层不应跟随transform产生错位；真实BaseUI portal焦点/关闭联动与native drag/no-drag区域需专项验。打开结束恢复有效原焦点，否则回收放按钮；减少动态效果跳终态但保持裁切规则。HTML只验证设计媒介，后续真实Windows至少覆盖200/260/420px、zoom/字体、长标题/错误说明/身份标记、双主题、多次换向、隐藏重开/状态持久化和与内容区同时动画。
14. UI审核通过后依次独立方案复核→测试用例及独立审核→实际红灯→TDD实现→独立code review→相关/全量回归→真实目标验证。macOS/安装包未实测不标通过。台账保留其它任务修改。

## 文件范围

拟修改：SidebarTree、DashboardShell（原Group内局部抽屉包装/动画联动）、desktop.css、UnavailableWorks；拟新增NavigationLabel、ScenarioLibraryDialog，必要时提取SidebarNavigationViews及useSidebarDrawer（均真实组件局部复用），以及专项测试/验证脚本。无需改SceneTree/SceneWorkspace或原MarkdownEditor/ContentTabs/ChatPanel/registry业务渲染。

## v4独立初审的执行边界补充

1. **唯一布局写入者**：原sidebar/content/chat三个rAF均写完整layout，不能继续并发写旧快照。在原DashboardShell内部增加单一rAF协调器，现有show/hide/fullscreen函数只更新intent，不再各自setLayout。主轴为sidebar S(t)；第二轴按最新命令保留content C(t)或chat Q(t)，剩余轴由100-S-第二轴推导。普通侧栏收放保留当前content，chat吸收变化；chat全屏时保留Q=0，content吸收；content/chat命令切换第二轴意图时从当前合成值开始。统一投影正常终态约束（sidebar 200–420px、chat420px、可见content原30%），再确定打开目标W；动作期0宽只是临时许可，不能以小于200的临时目标结束再被库强行扩回。保留原420/560ms spring、content挂载后的preservedSidebar repin和Panel集合，但repin也由同一写入者执行。后续用例必须覆盖sidebar与content/fullscreen同时切换而不互相覆盖。
2. **实际DOM测量**：Panel.className在nested div，本地类型定义提供Panel.elementRef和Group.elementRef；用两者测真实外层V和Group换算基准，不用固定内层宽或window宽猜百分比。统一协调器目标计算与DOM测量需要容差、rAF合并和动画generation清理。
3. **终态持久化**：workspace draft read显式返回协调器的预计最终sizes/visibility，而不是lastMeasuredSizes中途值，再交settledWorkspaceLayout做总和/隐藏归一化。lastSidebarSize保存正常终态打开目标；隐藏或中途反向不把中间值覆盖目标。layout restore取消协调器、替换intent和完整尺寸，待Panel注册后只一次落位；不能声称现有settledWorkspaceLayout能自动修正展开中的中间尺寸。
4. **恢复与换向入口**：ChatPanel头部现有恢复按钮只在sidebarHidden时出现；改为“hidden或drawerAnimating”保持显示，并让callback切换当前目标方向。chatVisible=false全屏时，在ContentTabs现有caption（有/无业务Tab两分支）增加同一恢复/换向控件；只改caption props/工具，不改面板映射、key或编辑器。仅当前实际可见caption作为focus恢复目标，动画结束打开后再隐藏外部恢复控件。WindowControls、ChatPanel、ContentTabs保留Windows44DIP/zoom安全padding与macOS原生窗控88px安全起点。正式可修改范围因此包含ChatPanel/ContentTabs的局部caption联动；业务渲染保持。
5. **窄屏独立分支**：<900的CSS当前强制sidebar全宽并按narrowPane隐藏Panel，不由百分比动画控制。窄屏W取实际Group全宽；保留同一个SidebarTree/Panel，在Group内用受控absolute覆盖层加裁切/translate，动作中保留原目标chat/content面板实例作为underlay。通过drawer phase/underlay data属性只覆盖sidebar宿主display/position，处理原max-width/全宽规则；打开后underlay不可聚焦，关闭完成再按原narrowPane显示目标。根部可见的工作区导航提供动作中换向入口，不把全宽W写进桌面200–420px偏好。跨679/900断点时维持已捕获W至动作结束，再进入新模式并校正尺寸，不在中途重排侧栏。
6. **原生拖拽区域专项验证**：真实Electron已有“裁切后代no-drag仍注册矩形”的源代码记录，inert/overflow不证明原生命中安全。预案在moving/hidden时对平移内层及其所有显式drag/no-drag后代撤销注册（局部CSS reset app-region，而非把整层换成no-drag继续注册）；只在静止且可见时恢复，窗口其余可见caption继续负责拖拽。实现时需检查Electron实际CSS初始值和实际命中，若reset仍产生注册矩形，改由有界可见caption host承担注册并移除内层显式区域，直到真实鼠标hit-test证明不遮挡邻栏/窗控。隐藏离屏后代同样清理；不改变动画视觉内容，不把HTML或计算样式当native通过。两平台/zoom和减少动态效果分别据实验收，未实测不通过。

以上是后续真实实施方案，当前仅设计原型；HTML的相邻区域占位只演示恢复入口和空间变化，不证明真实布局协调器或原生系统已实现。

此阶段只新增 `design/sidebar-navigation/` 和台账 pending 记录。设计验证脚本使用 file URL/本地已安装浏览器、合成数据、HTTP 拦截；对涉及的生产源文件比对 SHA-256，验证未修改。报告明确 `productTests=not-run`、`nativeAcceptance=not-run`。正式“全部通过”结论不能依据原型报告。

独立初审补充：UnboundConversations 当前内部 groupExpanded 需提升/传入每视图受控 expanded，避免仅挂载当前分类导致切回作品重置折叠。正文分类卷章异步到达时再次尝试恢复该分类 scrollTop（夹到实际 scrollHeight），不能只在切换那一帧对加载占位设置后永久丢失位置；重命名/删除列表更新后仍测量标题并清理无效实体焦点。正文根菜单和角色两个 query 的失败条件按第9条单独验证。
# 真实目标验收发现的事务修正补充（2026-10-13）

`windows-development-03/report.json` 及 failure.png 记录真实创建成功后重命名返回服务器500。`src/lib/services/scenario-lab.ts` 的 `updateScenarioLab` 已进入 `prisma.$transaction` 却用全局 `prisma.scenarioLab.findUnique`；`desktop/service/context.ts` 明确在 transactionActive 时禁止再次借用同一数据库（避免死锁）。这不是验证器时序，需修复 SN-05 实际 CRUD。

范围只把该 existing 查询交给已提供的 `tx`，保留原未找到错误、lockSceneTree、锁后重读、交叉角色/场景归属校验、事务原子更新和原路由响应。不开第二连接、不关闭保护、不挪出事务、不改数据库/业务协议。SidebarLibrary UI 不用假成功代替实际结果。

测试补充使用临时 PGlite、正式迁移/Prisma/数据库上下文和正式 scenarios POST/PATCH/GET/DELETE handlers，先执行真实 red 再改生产。断言标题持久化且其它配置不变、非法角色补丁400无部分改名、非归属lab404不改、DELETE移除记录及原级联子记录；无mock接口/HTTP监听/真实用户数据。补充独立方案和用例审核通过后才实施，再独立code review、相关服务回归、重建desktop并重跑实际 Windows 矩阵。之前的495浏览器/core结果保留原hash与范围；该服务变化不宣称由旧记录覆盖。

# SN-12 真实抽屉初帧修正方案补充（2026-10-13）

`windows-development-05/wide-close-frames.json` 与 `windows-preparation/development-05-drawer-diagnostic.md` 保留真实 Windows 失败：静止可见 V=固定 W=287.75px；首个 closing V=359.8645935px、offset=0，实际 V−W=72.1145935px；下一帧仍有0.104187px差异。后续帧正常不能覆盖开头失败，也不放宽0.1px几何容差或过滤首帧。

已读正式 hook、Shell 和安装的 react-resizable-panels 源。待 red 验证的原因有两条：preserve-pixel-size 的静止 resize 保留真实像素宽，而 getLayout 可能仍给 resize 前的百分比；关闭命令立即移除 sidebar/chat 之间的1px Separator，又改变可分配总宽。方案如下，独立增量审核通过后才实施：

1. 以 Group 的真实直接 `[data-panel]` 外层宽度构成测量快照（sidebar/chat/已注册content），分母为三个真实 Panel 宽度之和，排除 Separator；0px隐藏pane仍是同一真实Panel。仅在宽模式、注册完整且总宽非零时取得 current sizes；getLayout 只用于注册/键集合检查，不作为静止动画起点。窄模式仍用已保存的桌面目标，不能把overlay全宽写入偏好。若未注册完整，不用错误快照盖掉保存目标。
2. Sidebar/Chat 最小值和打开目标的百分比→CSS px 换算用同一真实可分配宽度，避免以包含分隔线的Group/window总宽猜测。静止宽模式 resize 先采集库已经保持的实际像素布局，再通过唯一writer做必要终态投影；不能再次写回 resize 前比例，把静止Sidebar从288扩成360。现有统一secondary意图、restore显式sizes和终态存储保留。
3. 动作开始时 Separator 保持到关闭终态，Shell只调整这两个现有Separator的显示条件：侧栏/对话在各自visible或animating期间保留相应已存在分隔条，关闭动作不先拆掉1px；其静止显隐和拖宽能力保持。打开需要加入Separator时，先完成真实React/Panel注册提交，首个统一rAF读取提交后的可分配宽和真实current；打开完整W与目标同一快照确定。移动期仍只由同一writer写Group，不加第二循环/第二业务树。
4. 初始统一帧及换向起点以最新真实Panel测量校准当前轴（同时发生content挂载/命令时保留最新secondary轨道），不是旧快照百分比。动画内W保持，实际V由原Panel外层测量；保留现有 `Math.min(V−W,0)`，不能靠删除或新增clamp掩盖jump。修复必须让每个真实moving V≤W（仅既定浮点容差），并保持offset与严格V−W相等；用初帧不超preflightW和单调收起证明根因已修，而非只删除clamp让内层先向右跳72px。
5. 修改限 useSidebarDrawer、DashboardShell 的现有Separator/element measurement接线及新增专项测量测试；不改导航业务、右侧registry/body、原字体/样式或验证器容差。先独立方案+用例审核 → 真实React red → bounded实现 → 全drawer/纯逻辑及独立code review → UI重建 → 唯一新Windows attempt原始全帧重验。旧18green、05failed及raw帧文件保留，只证明旧源各自范围。

根因尚未定案：安装库 preserve-pixel-size 自身会重算resize后的比例，不能从首帧数值断言 getLayout 一定陈旧。新red必须同时记录preflight和每moving帧的实际DOM、原公共API getLayout、真实Panel min/max/default配置、Separator个数及原公共setLayout调用序列（测试包装只观察/转发原接口，不实现另一个布局引擎）。fixture要在首次Shell挂载前通过真实WorkspaceDraftSource恢复20/30/50，令Group有真实initial defaultLayout，不能仅挂载后restore而漏掉库的结构提交路径。

如果记录证明React提交min/max/Separator变化时，在hook首write前重施旧initialLayout.sizes，则单独DOM rebase不足：Group结构提交的defaultLayout必须来自当前动作起点或显式待restore，而非历史初始map；由同一布局owner以提交前真实snapshot协调结构变化，防止首paint短暂回20%。首次加载、content挂/卸载、restore的显式sizes和当前目标都必须分别覆盖，窄屏DOM不用于覆盖桌面偏好。该实现选择按实际red观测确定，超出上述边界需再次独立补审；不能用collector延后/过滤首帧规避。

真实red已定案（`red/drawer-first-frame-measurement.tap`、`measurement-red/*.json`）：preflight公共API正确为15.996/23.993/60.011，与实际288px一致；首moving在owner首write之前重施20/30/50。安装库注册时优先已缓存的requestedLayout，而preserve-pixel-size resize只重新计算actual layout；因此不实施前述候选的额外DOM百分比重基。动作current继续以准确公共API读取，目标/prefs与窄屏偏好保持独立。

实际选择由同一owner保存动作current，并将其或明确待restore sizes提供给Group defaultLayout；既有两分隔条在sidebar或secondary任一动作期间维持原占位。单独动态default仍被requested缓存优先级覆盖，单独父layoutEffect复钉又会被子Group注册的后续commit覆盖，两版真实4fail记录均保留。最终注册协调在父layoutEffect及已有onLayoutChanged注册回调经同一个write()复钉current，写入重入guard阻止回调覆盖正在合成的帧；pending直到统一compositor首次成功才释放。该同步复钉只处于注册窗口、不另起循环、不写库私有缓存；平常动画仍同一rAF每帧合成一次。现有Math.min与全部帧collector不变，必须真实几何通过及独立code review后才进入新Windows attempt。

新增M02/M04实际执行又记录两项边界（`red/drawer-expanded-measurement-before-growing-fix.tap`，6pass/3fail）：early reversal全moving几何通过但终态Panel最小约束提交再次恢复20%（两主题），以及opening70ms从1440扩大到1800时实际V295.21875超过固定W288。前者还要求终态注册保留pending；后者将Sidebar motion改用实际像素轨道，统一帧只把当帧像素位置按真实直接Panel宽度和换算成百分比。完整像素目标不是瞬时V，窗口变化/并行约束仅投影合法终态；secondary保留独立最新axis百分比意图。该像素轨道首版使M04真实通过，early reversal终态仍失败，不能称完整修正通过。

终态callback缺口已由库源核实：onLayoutChanged按上次已通知map去重。owner在最初20%注册通知内复钉16%时，Group自己的新订阅尚未安装；快换向没有实际尺寸进度，同值setLayout不会更新库requested缓存，也不通知16%；终态又注册20%时被去重。因此父effect和该公共callback均可能漏掉child-only commit。待独立补审的最小选择是在pending注册窗口对原Group的直接Panel style/childList安装MutationObserver，microtask经同一个write()复钉保存的完整current；不改布局引擎/私有缓存、不新增动画循环、不观察/修改业务body或用瞬时V覆盖目标。非pending的idle变化只保留原用户resize路径；一次成功compositor结束pending，终态提交后再有一次writer落位并释放，窄屏不执行桌面复钉。实际全帧与独立代码审核仍需确认这个选择有效且不阻断后续手动拖宽。

Observer约束：仅Group根的childList/style与直接`[data-panel]`根style，不开subtree，不观察内层transform、Monaco或业务后代；结构改变时刷新这组直接root观察，卸载disconnect。仅pending且wide、非writing时检查完整已注册公共API；已与保存current一致则不写（允许安装库3位百分比舍入），不为了缓存人为扰动尺寸。所有补偿仍经同一write与重入guard，不能自循环。pending期间geometry保留完整W，不能因旧DOM瞬时360px把W重置；释放后正常用户拖宽与存储采样恢复。M04终态后新增真实鼠标拖第一Divider35px及存储读回，用实际行为验证释放，而非仅检查Observer源码。

## Windows10 后续 resize 增量

2026-10-14 实际Windows10出现closing/wide一帧V>固定W、raw平移误差18px，完整失败不撤回。后续真实Group、自然resize与公开API观察11条首次red为2通过/9失败；证据分别确认legacy窄媒体CSS越过冻结wide模式、库晚于owner的旧axis像素投影，以及新增Divider前后0.14375px稳定目标漂移。具体已独审的最小增量和测试源见 `docs/reviews/2026-10-14-sidebar-drawer-resize-plan.md`、同名plan-review。

获增量原则审核后，DOM窄pane属性只在冻结narrow输出；desktop.css仅恢复原已挂载wide直接Separator显示。motion保留latest owner像素pose与当前secondary，经原唯一write、public callback和原有界Observer覆盖整个wide运动；首次非换向opening只在首positive之前、真实结构提交后确定W/goal。首positive及后W冻结，normal idle手动resize、目标偏好、restore与cleanup保留。原断言/0.1px/全部raw/正式native脚本不放宽；该增量须原28＋新11、TS、代码独审、完整回归、全新构建和unique Windows证据后验收，不能以Chrome观测直接宣称原Windows数值同因或已通过。

