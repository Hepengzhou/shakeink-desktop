# 左导航 UI 独立方案审核 v8

日期：2026-10-13（Asia/Shanghai）。审核人：独立子代理 `sidebar_design_review`。本轮新增范围：其余四分类的所有作品分组可折叠展开，以及创建作品上方增加既有应用Logo和“玄印写作”品牌标题。完整v7历史见 [archive-v7/plan-review.md](archive-v7/plan-review.md)。本轮只写当前审核文档，不改生产或台账，不替用户批准UI，不扩旧业务/生产测试。

## 当前结论

v8已核对Seal品牌资产、44px原生控制栏、真实作品/暂不可用列表、正文根菜单及嵌套展开状态来源。局部disclosure和品牌区方案、双主题新增运行、当前文档/报告/截图一致；正文菜单独立、不可用分组覆盖、每视图状态及滚动/焦点边界已在方案/原型范围落实。

最终结论：**v8可交用户UI审核，无未解决P0/P1/P2；仅通过用户UI审核前的方案/设计媒介复核**。本轮独立双主题品牌/disclosure核验、主代理53组/9个源及品牌文件hash/17段787帧与最终文档一致，两份失败与元数据标签修正据实保留。继承的单行场景/试验场、全部作品五分类/设定六入口、新对话普通态、24px渐隐、角色6px组、灰度Tabs/四色身份及固定形态抽屉继续有效。历史HTML运行不计v8通过，用户尚未批准，真实组件/系统均未实施验收。

## v8新增源证据与初审边界

| 要求 | 真实源证据 | 审核边界/关闭条件 |
| --- | --- | --- |
| 既有Logo与品牌标题 | `src/components/marketing/seal.tsx:5–36`已有Seal variant=mark、seal-mark-paper/ink.svg及双img主题CSS；`OnboardingController.tsx:72`也使用同一mark；`globals.css:103`已有书卷衬线字体变量。 | 正式复用Seal，不复制SVG路径或生成新Logo。30px mark、17/24px/600/0.06em标题和44px品牌块放创建区上方，配对文字时图形装饰，避免重复报应用名；离线资产必须实际加载成功。 |
| 不动原生caption | `WindowControls.tsx:9`的SidebarWindowControls为h-11/desktop-drag；SidebarTree在创建区前挂载该真实组件。 | 44px原控制栏保持独立，品牌不塞入原生drag区域或挪窗控。品牌/创建/底栏固定，短窗只缩树区，不压缩高度；抽屉保留完整内层品牌几何。 |
| 四分类所有作品可折叠 | `SidebarTree.tsx:1745`原作品novelExpanded，世界/角色/卷的expanded对象在`:370,590,962,1095`；旧过滤标题原为静态归属。 | 新group fold按view+novelId独立、默认展开，不能复用作品树novelExpanded或重置子expanded；原生button、aria-expanded/controls与稳定id、箭头/Folder同步，只切导航内容，不调用openTab或改draft。 |
| 正文菜单与焦点 | `OutlineTreeMenu.tsx:21–39`是实际根/卷菜单与操作状态，`SidebarTree.tsx:2025`原正文根菜单。 | 根菜单是标题disclosure的独立sibling，不能嵌套button，也不能放折叠body内；折叠后仍可添加卷/导出/删除。有效焦点留标题/根菜单；隐藏body不可Tab进入，内部portal/异步操作不得把焦点送回已隐藏实体。 |
| 暂不可用作品也覆盖 | `novel-list.ts:6–17`返回novels和unavailableWorks；`UnavailableWorks.tsx:24–33`保留错误说明、真实锁修复/重试。 | 过滤分类的不可用作品也需disclosure；展开体保留原错误与修复/重试，不能伪装暂无记录或开业务。作品完整视图的原状态卡保持。未绑定指引非作品，不伪造novelId或删除原会话入口。 |
| 折叠与滚动/缓存 | 技术方案既有每视图scrollTop与异步加载恢复；浏览器在内容变小时会自然夹限scrollTop。 | 区分自然夹限与待恢复位置，不统一scrollTop=0、不让折叠scroll事件永久覆盖原保存值；保持query/entity key、嵌套fold和各视图状态。所选分类内部body用hidden+inert保留挂载，不因组收放卸载操作/查询；切分类仍仅挂载所选视图，外层保留每view状态。 |

P2关注点已在方案/原型范围解决：`technical-plan.md:5–9`明确不可用作品真实workId/原维修控制器、hidden+inert保留内容与独立正文菜单、每视图待恢复滚动/主动定位接管及Seal复用；`product-design.md:17,24,42–44,113–119`已覆盖旧静态标题规则并明确组状态/焦点/不可用作品控制器。下面独立键盘/状态/滚动核验通过。真实BaseUI、IPC修复、查询/右侧草稿与原生caption仍待后续实施验收。本轮品牌静态区没有新业务动作，不改变真实身份、模型或在线状态。

## v8独立新增小范围核验

使用已安装headless Chrome、本地file URL和隔离浏览器上下文，拦截全部HTTP。仅执行本轮品牌和分组新增范围，没有重跑历史独立作品色/身份/抽屉或正式业务测试。命令退出码0，实际摘要：

```json
{"revision":"v8","scope":"independent-offline-brand-disclosure-only","themes":["玄墨","宣纸"],"width":200,"height":500,"brand":{"height":44,"logo":30,"fontSize":17,"lineHeight":24,"weight":600,"letterSpacing":1.02,"captionHeight":44,"above":4,"firstActionGap":16,"logoCentreError":0,"titleCentreError":0,"localSvgLoaded":true,"decorativeLogo":true,"horizontalOverflow":false},"views":["设定","角色","正文","对话"],"worksPerView":2,"nativeKeyboardAndAria":true,"nestedFoldRetained":true,"worksFoldIndependent":true,"bodyFocusBlocked":true,"collapsedManuscriptMenuAccessible":true,"emptyErrorFoldRetained":true,"unavailableViews":4,"unboundConversationAccessible":true,"scroll":{"desired":298,"clamped":252,"restored":true,"userIntentOverridesPrior":true,"afterUserIntent":228},"pageErrors":[],"httpRequests":[],"productTests":"not-run","nativeAcceptance":"not-run"}
```

- 两主题Logo的实际src分别为本地`public/brand/seal-mark-ink.svg`、`seal-mark-paper.svg`，两图片都complete且naturalWidth>0；当期主题仅显示对应图形。30px Logo和24px行框标题均在44px品牌行垂直居中，偏差0。字体为Noto/思源宋体/Songti/SimSun衬线fallback，计算17px/24px、600、1.02px字距；不声称未安装字体已加载。品牌在原44pxcaption之后4px，到第一创建按钮16px，200px无横溢出、500px树仍有可滚动空间，底栏72px保持。
- 四分类×两个作品：首次默认展开，Enter折叠、空格展开，aria-expanded/controls对应唯一稳定body，Folder开合同步；不嵌套button、review-message不变。折叠body实际hidden+inert，尝试聚焦内部按钮无法进入；焦点仍在标题。一个作品折叠不影响另一作品、另一分类或作品原树。
- 世界/卷的子fold在外层收放后仍为先前关闭状态。正文根菜单在header内是独立sibling，body没有根菜单触发器；折叠后仍可打开菜单，Escape复焦到该根菜单。空正文与角色部分失败仅在展开体可见，收放不丢状态。
- 四分类的暂不可用作品均有原生disclosure、错误体和重新加载示意；展开时错误可见，折叠后内部重试不能被聚焦，再展开恢复错误。未绑定创作指引会话仍可见，未被当成虚构作品移除。
- 单独滚动测试：保存298px，折叠自然夹至252px，再展开实际恢复298px；随后用户wheel接管，展开实际228px，不再强制回旧298px。这里只验证合成HTML的状态/事件与当前源逻辑，不代表真实异步查询已通过。

当前原型源对应`viewer.tsx:76–80,103–110,138–150,179–184`的分视图fold/待恢复滚动、focus回标题、sibling菜单/hidden+inert体及本地品牌；`preview.css:28–33`为品牌尺寸/字体和disclosure布局。正式来源为上表真实Seal/WindowControls/OutlineTreeMenu/UnavailableWorks；不把原型分组或SVG路径复制进生产。

最终报告与文档：当前`preview-checks.json`为v8/passed/53组、0浏览器错误/HTTP；独立逐项核对9个生产组件/样式/Seal和品牌SVG的hash，均与报告匹配。`drawer-frames.json`为v8/17段/787采样帧、最大差0.00100000000000477px，baseline实际含4个品牌相关项与3个group-toggle；原型label从v7修正为v8有记录，没有修改帧数据或假称重跑。逐帧和旧业务检查由主代理复用脚本执行，独立子代理本轮仅执行上述新增范围。

`design-verification.md:7–25,27–33`准确保留首轮28组后wheel事件尚未到达的脚本时序失败、第二轮36组后主动210px被旧760px覆盖的原型问题与captureScroll修正，第三轮53组完整通过。两失败不计通过；`research.md:75–81`、产品v8及技术首部与当前品牌/disclosure实现媒介一致，主规格已替代旧静态标题，无未关闭一致性问题。

独立目视`preview-v8-final.png`和`preview-paper.png`：真实Logo、书卷标题、创建区间距和四分类作品箭头/文件夹层级清楚，底栏/顶部保持固定，灰度Tabs和身份色保留。截图仍为合成媒介；真实Seal/SidebarTree、workId维修生命周期、异步查询/删除焦点、业务Dialog草稿及原生caption/zoom均待批准后的正式实现验证。

## v7历史独立核验（不计v8执行）

作品石板灰paper#657077/ink#a6b0b8，开合Folder与过滤标题共用同一token；v7独立仅双主题260×900的颜色/对比检查，主代理最终47组/17段773帧，以及首次并行source audit失败，都在[archive-v7/plan-review.md](archive-v7/plan-review.md)和[archive-v7/design-verification.md](archive-v7/design-verification.md)。既有封面优先、其他23tone及图标/布局继续保留；v8在过滤标题新增disclosure，因此覆盖之前“标题不可折叠”的规则。旧47组/773帧与独立作品色测试不计v8执行。

## 继承v6图标方案的源证据与边界

| 要求 | 源证据 | 审核边界 |
| --- | --- | --- |
| 分类Tabs灰度气泡及亮细边 | `src/app/desktop.css:130–132,138,145` 中ContentTabs使用foreground文字、selected-bg/border、1px边框和6px圆角；玄墨为#2a2826/#4b4640。宣纸`globals.css:158`全局editor-bg为#f9f4e4，但`desktop.css:177`在workspace-content覆盖为#f8f3e4；`DashboardShell.tsx:512–514`将真实ContentTabs放在该祖先内，故桌面右侧实际取#f8f3e4/原border#d8cba6。 | 左导航借用桌面内容区中性token及正常CSS px，不改变右侧ContentTabs；不复制其caption逆zoom、原生拖拽或关闭按钮逻辑。外组及未选项/hover仍透明，焦点环保留。只有当前项中性背景/可见细边/foreground，不能留primary选中强调。 |
| 作品默认文件夹随折叠状态切换 | `SidebarTree.tsx:1745,1755–1766,1772–1778`：novelExpanded来自现有expanded；BookOpen为默认，coverUrl头像优先；箭头切换折叠，正文点击打开详情并必要时展开。已安装`lucide-react/dist/esm/icons/folder-closed.mjs`及`folder-open.mjs`。 | 无封面作品保留FolderClosed/FolderOpen和真实novelExpanded，封面/动作/缓存不变。v8覆盖旧分类标题静态FolderOpen规则，改为按独立group fold开合，不能调用原作品点击动作。 |
| 金手指手指形态 | `src/stores/tabs.ts:119–134` 的GOLD_FINGER当前为Sparkles且getTabIcon由导航和右侧共用；`SidebarTree.tsx:1886–1899` 调用该共享图标；本地`pointer.mjs:10–33`有竖起食指/手掌轮廓。 | 导航局部将GOLD_FINGER图标覆盖为Pointer，保留settingType、Tab ID、动作及右侧/其他面板图标。不要全局改shared getTabIcon导致本次左导航之外变化。 |
| 角色图标/标记同色且身份不同色 | `SidebarTree.tsx:264–270` avatar优先于Icon，active当前将fallback改primary；`:397–406`正式角色为真实CroppedImage；`:413–418`仅主角有旧标记；`:621–624,640–643`伏笔使用虚线圆形字头像及gold标记。 | 四身份明确tone token，正式无头像fallback与标记同色，active/hover不将icon重置primary；真实头像不可染色。伏笔字头像保留字/虚线/容器并取同身份色，不只修改不可见fallback图标。完整身份文字/ARIA保留，不能仅颜色区分。 |
| 不同条目图标主题适配 | `globals.css:126–177,197–249`有宣纸/玄墨foreground、gold、chart等实际token；`SidebarTree.tsx:1128`章节icon来自CHAPTER_STATUS_ICONS，`:1714`错误警示为destructive。 | 仅主要业务入口/实体图标应用tone映射；创建、账户、原生窗控、箭头、操作/加载/错误不被宽泛selector改色。最终方案明确真实章节状态形状、状态颜色/数据/说明保留；普通正文/卷图标才用正文色。现有图片和hover卡/拖拽内容不重做。 |

v6初审未发现新增P0/P1。P2范围检查已解决：`archive-v6/technical-plan.md:7–11`、`archive-v6/product-design.md:37–68`明确真实头像/伏笔字头像、章节状态保留和共享getTabIcon的局部覆盖；v6历史独立运行已核验同色/身份差异、active/hover保色、Folder切换及Pointer SVG。HTML不能证明真实头像/状态图标已经迁移，正式用例仍须使用真实React隔离数据验证。

## v6历史独立核验（不计v7执行）

v6独立4组合各5视图及主代理47组/17段776帧，验证灰度选中气泡、Folder开合/Pointer、24种类型tone、角色四色同色与active/hover保色；源证据、运行结果、截图和桌面祖先颜色覆盖均保存在[archive-v6/plan-review.md](archive-v6/plan-review.md)与[archive-v6/design-verification.md](archive-v6/design-verification.md)。v7只改变work token；角色其余四色和上述边界继续有效。776帧、v6身份对比值及历史独立4组合不计本轮执行。

## 继承范围与历史证据

v5的设定六入口与作品完整树共享原实体/动作/novelId；scene复用openAllScenes、scenario管理Dialog/原缓存和refId、所有分类覆盖全部作品、分类切换只改导航、未绑定对话可达、新对话始终普通态均继续有效。v5的primary分类选中配色已被本轮灰度方案覆盖。正文原根菜单/卷章/空态、角色正式/伏笔两query独立失败状态、每视图折叠/异步scroll恢复、属性只去导航入口、24px条件渐隐、32px创建和72px账户区继续有效。

源证据及旧44组/776帧/独立4组合见[archive-v5/plan-review.md](archive-v5/plan-review.md)与[archive-v5/design-verification.md](archive-v5/design-verification.md)。这些是历史，不计本轮v6执行。以下6项v4初审关闭结论继续约束实际实施，当前原型不证明真实Shell/原生路径通过。

## 继承v4的初审问题与关闭条件

### P1-01：并行布局动画必须协调完整 setLayout 写入

- 源证据：`DashboardShell.tsx:136–149` 的 sidebar rAF 写完整 sidebar/chat/content，并固定起点 content；`:205–214` 的 content rAF 固定起点 sidebar；`:271–280` 的 chat rAF 同样固定 sidebar。三个闭包同时运行会覆盖彼此的当前值；内层即使固定W，实际裁切V仍可能回跳。`:349–361` 的 content 注册和 `:229–245` 的卸载 repin 也会写完整布局。
- 要求：明确一个实际布局提交者，合成各轴当前意图/原spring/当前约束，每帧只向原Group提交一致layout；或明确不丢请求的受控协调策略。库注册/卸载 repin、恢复和快速换向不能再把旧起点写回正在运行的sidebar。保留原Panel和420/560ms曲线，不重写工作台。仅“读实际V”不足以解决多写入者竞争。
- 关闭条件：技术方案写明提交/协调原则及内容/聊天并行路径；正式用例必须验证两个动作同开、不同先后和中途换向，HTML只能验证单独抽屉媒介。
- 状态：**已解决（方案）**。`archive-v5/technical-plan.md:32–33` 明确单一rAF提交者、sidebar主轴和content/chat第二轴意图、剩余轴推导，原曲线/Panel保留、repin归入同一提交者，并先投影正常终态约束后确定W。真实并行协调器未实现/未验证，后续用例仍必须执行。

### P1-02：恢复/换向及焦点目标在全屏和展开期需真实存在

- 源证据：`ChatPanel.tsx:1698–1708` 只在 sidebarHidden 时显示恢复按钮，`DashboardShell.tsx:164–169,501–502` 展开起始即将 sidebarHidden 改false；若导航动画中inert，原内外按钮都会暂时不可用。chatVisible=false时Chat所在Panel为0宽，ContentTabs当前props/工具栏（`:18–29,53–80`）没有sidebar恢复入口。
- 要求：明确始终在可见、非inert区域的恢复/切换控件；chat全屏时有可见caption目标，展开/收起中都能换向。必要时局部增加ChatPanel/ContentTabs caption状态props或DashboardShell的真实控制插槽，范围不得误写为禁止任何标题控件联动。关闭前焦点不能移到0宽Chat按钮；保留原macOS恢复安全间距、Windows caption换算。
- 关闭条件：产品/技术和HTML明示外部入口生命周期、全屏目标与焦点fallback。正式真实目标检查不能用原型邻栏示意按钮代替。
- 状态：**已解决（方案及原型范围）**。`archive-v5/product-design.md:85`、`archive-v5/technical-plan.md:35` 明确Chat/Content两caption的hidden-or-animating恢复/换向控件、只聚焦实际可见caption、空Tab分支及88px/44DIP/zoom安全区，并允许局部caption props联动。HTML外部切换控件始终可用，历史独立运行已验证换向、hidden/in-motion inert与复焦，当前主代理重新验证原型；真实两caption/全屏不计通过。

### P2-01：沿用 settledWorkspaceLayout 本身不能保证展开中保存终态

- 源证据：`src/lib/desktop/workspace-layout.ts:7–10` 只在sidebarVisible=false时把sidebar变0；sidebarVisible=true仍使用 `sizes.sidebar`。`DashboardShell.tsx:411–415` 当前adapter读取实际中间layout。仅保留helper调用会在展开中写入中途宽度。`:177–178` 的快速关闭也直接记录当前小宽度，可能覆盖完整恢复目标。
- 要求：adapter读取应先合成目标 settled layout/完整恢复目标，再沿用原helper规范化；不能把opening裁切V或reverse中间宽度当用户分栏偏好。区分手动分栏尺寸、动画起点、完整目标、实际约束后终态；恢复/卸载必须取消旧回调。
- 关闭条件：技术写清具体snapshot口径，正式用例覆盖opening/closing/reverse中捕获及重开恢复。HTML不证明真实WorkspaceLayout存储通过。
- 状态：**已解决（方案）**。`archive-v5/technical-plan.md:34` 明确read返回协调器预计最终sizes/visibility再交原helper，lastSidebarSize保存正常目标，restore取消并替换旧意图，注册后一次落位。真实adapter、保存/重开未验证。

### P2-02：<900px 单视图 CSS 不能直接沿用桌面百分比动画

- 源证据：`src/app/globals.css:2108–2141` 按data-narrow-pane强制sidebar外包装display/flex全宽并隐藏邻栏；`DashboardShell.tsx:486` 的窄屏收起直接setNarrowPane(chat)，原分栏setLayout被该CSS覆盖。`.workspace-sidebar`处于Panel的nested div，本地库 `react-resizable-panels.d.ts:776,820–822` 说明className落内层，elementRef指外层。
- 要求：明确窄屏收放仍保留完整实际宽W的裁切/平移阶段，以及何时才切原窄屏display终态；不把默认260或200–420范围强加给既有全宽单视图。测量用Group/Panel elementRef的真实尺寸，避免把固定W当外层V。min/default/max数值为CSS px，getLayout/setLayout为百分比；受约束时按实际V同步位移。
- 关闭条件：产品/技术明确窄屏和跨899px边界行为；HTML示意不计为真实Group CSS验收。
- 状态：**已解决（方案）**。`archive-v5/technical-plan.md:33,36` 明确Panel/Group.elementRef、窄屏实际全宽W、保留实例的覆盖层/underlay分支、phase结束才进display终态、跨679/900断点完成后校正，不污染桌面偏好。此分支未实施，原型宽度夹限不冒称真实窄屏Group通过。

### P2-03：native drag/no-drag 区域不能由 inert/overflow 推导通过

- 源证据：`src/components/desktop/WindowControls.tsx:9–14` 的侧栏caption为.desktop-drag；`desktop.css:101–102` 全局按钮/角色注册no-drag。`:139–143` 已记录Electron会注册被裁切后代的no-drag布局矩形，并要求对不可见后代重置到initial。`ChatPanel.tsx:1704` 的macOS88px恢复间距与 `desktop.css:117–128` 的Windows44DIP/zoom契约继续有效。
- 要求：明确隐藏/动作期撤销或限制固定内层的原生区域注册，使其只覆盖真实可见有界caption/host；不能只设置inert、pointer-events或overflow就声称native命中正确。具体CSS/元素注册联动保持原控件安全区，减少动态效果仍做状态/区域更新。
- 关闭条件：方案记录有界原生区域处理及真实Electron专项验证，未具备目标系统的项目据实待验收。
- 状态：**已解决（方案边界）**。`archive-v5/technical-plan.md:37,39` 写明moving/hidden撤销平移内层显式app-region注册、静止再恢复；若reset仍注册矩形则改有界host，直到真实鼠标hit-test确认。源代码/计算样式/HTML均不作为native通过，正式两平台/zoom验证仍待执行。

### P2-04：姓名/标记合组后需在按钮可访问名称中保留身份

- 初查原型证据：当时 `viewer.tsx:113` 的row-main aria-label只有姓名，`:116` 将身份标记放入该button内。标记自身aria-label不会覆盖父button显式aria-label，按钮可访问名称仍会只有姓名，未体现产品“完整身份可访问信息”要求。
- 要求：只对角色按钮将可访问名称写为完整姓名及主角/配角/反派/伏笔角色，或用aria-describedby明确关联身份标签；保留真实全文及原操作。非角色名称语义不变。
- 关闭条件：最终HTML/技术方案明确该关联，独立DOM可访问名称核验与标签6px布局一起检查。
- 状态：**已解决（原型及产品要求）**。v5 `archive-v5/viewer.tsx:116,119` 用完整姓名和roleCaption组成父按钮aria-label，主/配/反/伏笔分别提供完整身份；历史独立检查10个短名角色及长姓名，当前主代理重验，名称/身份均在button可访问名称中，标记在姓名后6px且不受mask。

## 已核对的真实来源与可行边界

| 检查项 | 源证据与当前结论 |
| --- | --- |
| 原分栏来源 | `DashboardShell.tsx:477–522` 保留Group和三个原Panel；sidebar数值default260/min200/max420，chat min420，content min30%，动作中原最小尺寸临时放开。不得把HTML工作台引入安装版。 |
| 单位和测量 | 库d.ts `:455–457,739–746,807–814,845–850` 明确Panel数字为px、Panel.getSize有inPixels/asPercentage；Group `:540–546` 提供elementRef/getLayout/setLayout。当前Shell `:125,197` 用window.innerWidth换算，v4应测真实Group可用宽并处理边界/zoom，而不是用展示W替代实际V。 |
| 原曲线 | `DashboardShell.tsx:27–43` 临界阻尼springEase、OPEN560/CLOSE420。固定内层只增加裁切/平移，不改变原批准的时长或用scale压缩。 |
| 角色徽标 | `SidebarTree.tsx:272–282` 当前标签flex-1、tag行级sibling、action固定；`:413–418,640–644` 为正式主角/伏笔标记。角色name/tag组允许姓名缩窄与条件渐隐，徽标shrink-0；其他非角色tag与操作位置保持。 |
| Tabs留白 | 产品明确16/12为Tabs自身外margin，加创建区原8px底padding和树区2px顶padding；不能把组高度或按钮高度改高来冒充留白。 |
| 保持实例 | 原 `SidebarTree` 在Shell中未条件卸载（`:486`），ChatPanel保留user.id key（`:497`），ContentTabs仅由既有contentMounted控制。抽屉不得改业务面板key/导航分类/滚动状态或drafts。 |
| Modal/非模态 | `DesktopCommandController.tsx:19–21,50,65–72` 将dialog当应用命令屏障。不得用广播Escape关掉业务Dialog或丢输入；抽屉只关闭所属悬停/非模态菜单，并显式处理portal finalFocus目标。 |
| 继承v3范围 | 新对话MessageCirclePlus、五分类跨所有作品、角色含伏笔、正文原根菜单/空态、未绑定对话、属性仅去入口、场景/试验场单行、24px条件渐隐都保留；真实缓存/动作/29面板不改。该范围源代码与前轮检查在archive-v3，历史结果不计当前v4执行。 |
| 持久化/恢复 | `DashboardShell.tsx:407–439` 原adapter与恢复rAF，以及卸载 `:460–466` 清理沿用；新增抽屉目标/惯性不能留旧回调或使临时裁切宽度写入偏好。 |

## v4历史独立核验（不计v5执行）

历史 `archive-v4/viewer.tsx:47–66` 的原型使用真实rAF与原临界阻尼420/560ms、generation取消、固定bodyWidth和progress，`:159–172` 仅改变裁切宽度和translate3d。`archive-v4/preview.css:12,14` 为16/12px外间距与name/tag gap6布局。原型相邻区/控件不是原Group/原生caption；慢速预览是审核工具，不进入产品。

独立运行使用已安装无界面Chrome、临时隔离profile、本地file URL、全部HTTP拦截。仅检查本轮新增范围，没有重跑旧业务/全量测试。实际结果：

```json
{"revision":"v4","scope":"independent-offline-synthetic-prototype","results":[{"theme":"玄墨","width":200,"closeFrames":27,"openFrames":37,"shortNameGap":6,"longNameFade":true,"badgeMask":"none","geometryTolerance":0.05},{"theme":"宣纸","width":200,"closeFrames":27,"openFrames":35,"shortNameGap":6,"longNameFade":true,"badgeMask":"none","geometryTolerance":0.05}],"reversalSynchronousJump":0,"nodeIdentityRetained":true,"hiddenFocusBlocked":true,"focusRestored":true,"nonmodalMenuClosed":true,"reducedMotionTerminals":true,"pageErrors":0,"httpRequests":0,"productTests":"not-run","nativeAcceptance":"not-run"}
```

- 双主题200px/500px短窗，Tabs自身外margin实测上16px/下12px，未加高原28px选项。10个短名角色姓名后6px就是标记，长姓名只渐隐姓名、徽标mask为none，完整姓名/身份在可访问名称中。
- close/open合计126个独立采样帧，完整W、创建/选项/树行/name组/徽标/账户的宽高与相对Y在0.05px几何容差内；字体、行高、文字、段落行框数量、mask和overflow状态严格一致。每帧translateX=V-W，scaleX/Y恒1；closed V=0、opened V=W。相同sidebar与tabpanel节点保留。
- 中途反向的同步位置跳变实测0；隐藏/动作期inert与aria-hidden有效，尝试聚焦导航不能进入；完整展开后返回原收起控件。正文非模态菜单在动作开始关闭；减少动态效果直接闭合/展开，inert终态随之更新。

历史 `archive-v4/preview-checks.json` 为revision=v4、passed/40组、0 pageErrors/HTTP；`archive-v4/drawer-frames.json`为17段/772采样帧，记录最大几何差约0.001px（0.05px容差），样式/文字/行数/渐隐仍严格比较。其脚本 `archive-v4/verify-preview.mjs:199–204` 明确逐帧比较、记录容差和精确文本/样式，不是只检查终态。当轮独立复核6个生产源文件hash，全部与报告匹配。历史严格浮点几何断言失败在归档验证文档据实保留，不将失败或归档v3结果记为当轮通过。

历史 `archive-v4/design-verification.md` 已同步v4/40组/17段772帧，并据实保留两次浮点测量失败和0.05px口径调整；字体/文字/行数/渐隐仍严格一致。当轮独立读取逐帧case数量及最大值，确认为17段、最大0.00100000000000477px。该差值是几何测量舍入范围，实际固定形态由各帧尺寸/相对坐标、样式、文本及行框共同证明，不以宽松容差替代重排检查。

当轮独立目视 `archive-v4/preview-v4-final.png`、`archive-v4/preview-drawer-mid.png`、`archive-v4/preview-paper.png`：新增Tabs上下留白及姓名后标记与规格一致；中途只看到被裁切的固定内层，文字、标记与底栏没有挤压/堆叠。截图是合成设计内容，不证明真实caption或业务通过。

没有读真实作品或Key、运行产品或全量测试、修改生产/台账、开HTTP监听服务。原型节点身份及焦点只证明HTML媒介；单一真实Group协调器、caption安全区、业务Dialog/草稿、存储重开、窄屏CSS和native鼠标命中均仍待正式实施验证。

- `uiRevision=v8`
- `planReview=passed-for-user-ui-review-only`
- `htmlDesignReview=passed`
- `uiApproval=awaiting-user`
- `implementation=not-started`
- `productTests=not-run`
- `nativeAcceptance=not-run`

收到用户本次UI批准后仍需按AGENTS.md完成独立方案复核、测试用例及独立审核、TDD、代码审查、全量回归与真实目标验收。本报告不解除这些阶段要求。
