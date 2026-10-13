# 左导航 UI 独立方案审核 v7

日期：2026-10-13（Asia/Shanghai）。审核人：独立子代理 `sidebar_design_review`。本轮仅核验作品文件夹图标改为中性石板灰：宣纸#657077、玄墨#a6b0b8，完整树开/关图标及过滤分类标题共用--icon-work。完整v6历史见 [archive-v6/plan-review.md](archive-v6/plan-review.md)。本轮只写当前审核文档，不改生产或台账，不替用户批准UI，不扩旧业务/抽屉测试。

## 当前结论

v7作品配色的独立双主题定向运行已通过，普通/hover/选中及分组Folder颜色一致。与归档v6的设计CSS逐字比较，仅两处--icon-work值变化，其他23种tone和布局/规则完全一致。真实封面优先、角色头像/状态图标及共享图标边界继承v6。

最终结论：**v7可交用户UI审核，无未解决P0/P1/P2；仅通过用户UI审核前的方案/设计媒介复核**。独立双主题作品色核验、最终47组/17段773帧及文档一致；首次并行source audit失败保留，不计通过。继承的单行场景/试验场、全部作品五分类/设定六入口、新对话普通态、24px渐隐、角色6px组和固定形态抽屉继续有效。下列v4的2项P1/4项P2及v6范围仅在方案/原型范围已解决，真实组件/系统均未实施验收。用户尚未批准，历史HTML运行不计本轮v7通过。

## v7独立新增小范围核验

命令使用本机headless Chrome、隔离浏览器上下文、本地file URL和全部HTTP拦截，退出码0。只核本轮作品图标颜色；双主题260×900px，未重跑旧抽屉、身份/业务或全量测试。实际结果摘要：

```json
{"revision":"v7","scope":"independent-offline-work-icon-color-only","onlyTwoWorkCssTokensChanged":true,"paper":{"color":"#657077","openClosedGroupSameColor":true,"normalAndGroupContrast":4.082252,"hoverClosedContrast":3.743440,"selectedContrast":3.591458},"ink":{"color":"#a6b0b8","openClosedGroupSameColor":true,"groupContrast":8.778302,"selectedContrast":7.362276},"pageErrors":[],"httpRequests":[],"productTests":"not-run","nativeAcceptance":"not-run"}
```

完整树FolderOpen/FolderClosed随原展开状态切换，点击作品展开后的active图标也严格同色；设定分类两个作品标题FolderOpen取同一token。颜色与金手指/主角原金色区分，未改其token。宣纸普通/分组背景的实际RGB为239/230/207，选中wash合成后233.33/214.07/191.61；对比按这些实际背景合成，不能沿用只检查普通目录状态的3.735值称为包括作品选中状态的最低。以上计算只证明当前合成HTML的明确颜色与背景，不证明真实产品或完整无障碍验收。

源证据：`preview.css:2–3`定义两主题--icon-work，`:21,24`分别供完整树主图标和过滤分类Folder；`viewer.tsx:116–123,139`仍使用原FolderClosed/Open和分组FolderOpen。与`archive-v6/preview.css`逐字一致性断言仅放入两处指定替换，证明本轮设计CSS未改其他颜色或布局。

最终一致性：`research.md:71–73`、`product-design.md:15,45`、`technical-plan.md:5`和`design-verification.md:7–27`均为v7石板灰/同token范围；独立结果和验证文档明确普通、hover、选中、分组不同背景的对比口径。独立目视`preview-v7-works.png`：作品容器为中性灰，与金手指/主角金棕区分，原结构及其他业务图标保留。

主代理首次`preview-checks-v7-first-run.json`为v7/failed/46组，末尾source hash发现执行期间`desktop.css`有并行任务的`.desktop-project-star`设置/欢迎样式修改；未回滚无关修改，也未放宽断言。源状态稳定后原脚本重新完整执行，当前`preview-checks.json`为v7/passed/47组、0错误/HTTP。独立核对当前6个生产hash与最终报告匹配，只证明最终这次窗口前后稳定，不声称整个v7期间都无外部源码变化。

当前`drawer-frames.json`读取为v7/17段/773采样帧，最大几何差0.00100000000000477px（0.05px容差）；此为主代理复用脚本的新采样，独立子代理本轮没有扩跑旧抽屉。776帧与v6独立4组合仍仅归档。当前正式实现、产品测试、Windows Electron/macOS/安装包验收均未开始，本报告不替用户批准UI。

## 继承v6图标方案的源证据与边界

| 要求 | 源证据 | 审核边界 |
| --- | --- | --- |
| 分类Tabs灰度气泡及亮细边 | `src/app/desktop.css:130–132,138,145` 中ContentTabs使用foreground文字、selected-bg/border、1px边框和6px圆角；玄墨为#2a2826/#4b4640。宣纸`globals.css:158`全局editor-bg为#f9f4e4，但`desktop.css:177`在workspace-content覆盖为#f8f3e4；`DashboardShell.tsx:512–514`将真实ContentTabs放在该祖先内，故桌面右侧实际取#f8f3e4/原border#d8cba6。 | 左导航借用桌面内容区中性token及正常CSS px，不改变右侧ContentTabs；不复制其caption逆zoom、原生拖拽或关闭按钮逻辑。外组及未选项/hover仍透明，焦点环保留。只有当前项中性背景/可见细边/foreground，不能留primary选中强调。 |
| 作品默认文件夹随折叠状态切换 | `SidebarTree.tsx:1745,1755–1766,1772–1778`：novelExpanded来自现有expanded；BookOpen为默认，coverUrl头像优先；箭头切换折叠，正文点击打开详情并必要时展开。已安装`lucide-react/dist/esm/icons/folder-closed.mjs`及`folder-open.mjs`。 | 仅无封面时FolderClosed/FolderOpen随真实novelExpanded更新，不改封面、作品动作或缓存。分类中的作品分组标题不具备折叠行为，使用静态FolderOpen表示其下已有内容，不造开关状态。 |
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

- `uiRevision=v7`
- `planReview=passed-for-user-ui-review-only`
- `htmlDesignReview=passed`
- `uiApproval=awaiting-user`
- `implementation=not-started`
- `productTests=not-run`
- `nativeAcceptance=not-run`

收到用户本次UI批准后仍需按AGENTS.md完成独立方案复核、测试用例及独立审核、TDD、代码审查、全量回归与真实目标验收。本报告不解除这些阶段要求。
