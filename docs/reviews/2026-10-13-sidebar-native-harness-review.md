# 左导航真实 Windows 验证媒介独立审核

日期：2026-10-13。审核人：独立子代理 `sidebar_design_review`。本次只读审另一作者的三个验证脚本及必要的真实启动路径；没有执行seed、启动Electron、调用HWND、修改脚本或生产代码。本人此前参与导航实现，本报告仅审核独立作者的验证媒介；UI生产实现另由其他审核者复核。

## 结论

**当前冻结媒介源码审核与development-11真实可达矩阵事实审核通过，本次resize P1已由真实同场景完整帧关闭。** `attempt01–10=failed`原证据保留；M06真实red/TDD/代码独审/新构建后，冻结928aaff媒介第11轮87checks完整通过，无旧partial拼接。具体28组帧、33有效native、2不确定不计、源/构建物SHA与完整仓库仍failed/allAcceptance=false，见 `2026-10-14-sidebar-navigation-final-evidence-review.md`。empty fullscreen真实UI不可达/未执行、mac/NSIS/物理拖窗/IME边界保持。下表主要行号为初审版本，后续增量以文末补审的当前行号/快照为准。

## 源文件与边界核查

| 范围 | 源证据及评估 |
| --- | --- |
| 写入安全与隔离 | `seed-sidebar-navigation.ts:19–23` 对参数和系统temp做realpath，检查规范化相对路径位于temp、目录名以shakeink-sidebar-开头且内容为空，然后只在该根创建data/work子目录。验证器`:10–18`限制label字符、先以exclusive mkdir保留不可覆盖的本轮证据目录，再mkdtemp新建seed根；没有递归删除或读取真实用户作品的代码。失败目录保留。 |
| 真实Workspaces/数据库/Profile | Seed `:23,26–74`使用正式Workspaces、正式迁移、真实Prisma上下文及DraftJournal，两个正式作品数据库和inbox均经原服务创建/写入并finally关闭；资料为明示合成数据。`:75–81`从正式defaultState和schema保存隔离Profile/onboarding，无模型或Key。数据不注入renderer store。 |
| 实际启动根 | 验证器`:129–138,228–232`用同一Node启动seed，再以SHAKEINK_TEST_ROOT启动原Electron/可选打包exe，断言实际bootstrap.dataRoot、0模型、shakeink协议。`desktop/main/index.ts:68–83,229`与`brand-startup-paths.ts:27–36`证明有效隔离根的userData/bootstrap/session位于测试目录，非真实appData fallback。空内容全屏另建第二个owned temp根。 |
| 真transport及观察 | 验证器`:49–50`的readApi调用正式fetch，observer只记录后转发原fetch，未fake响应/API；设置/Profile更新调用原desktop.settings IPC。`:132–138`启动原完整工作台，renderer从firstWindow后设offline，主进程listening Server计数必须0；`:39,223,231`三次launch均挂同一pageerror/HTTP观察。该网络观察明示从firstWindow起，不声称覆盖更早启动网络或全系统端口。 |
| 真实UI与实例保留 | `:163–175`由真实Tabs/分组与键盘动作检查分类、折叠hidden/inert、节点DOM仍连接和右Tabs顺序/激活；实际Monaco通过原“编辑”入口挂载，真实键盘写草稿，`:58`验证原Monaco DOM handle仍连接、重新激活可见及view-lines文本哈希。`:186–195`UI触发POST/PATCH/DELETE后由真实本地GET验证持久数据。仅声称同一真实Monaco DOM和可见草稿保留，不用CSS示例/替代组件证明编辑器实例或其它29类业务。 |
| 原生坐标与DPI | 验证器`:70,74,91`从实际BrowserWindow取HWND/zoom，DOM CSS点乘真实Electron zoom后交原生helper。PS `:19–26,31–38`显式切调用线程至PER_MONITOR_AWARE_V2、验证已生效，用ClientToScreen原点及窗口DPI/96得到屏幕物理坐标，签名低16位打包WM_NCHITTEST，finally恢复线程context。这避免调用线程DPI虚拟化；Windows消息的坐标/HTCAPTION=2/HTCLIENT=1依据见下文官方来源。 |
| moving点位及真实命中 | 验证器`:72–104`先确认opening/closing；moving选择固定右端caption工具，避免左侧restore按钮随V滑动造成失真。调用前后检查同一按钮/空caption DOM和同一采样点仍在其rect、仍处clip泄漏区、同一moving phase；不稳则记录inconclusive，最多重采4次且settled不计通过。只有一致观测的实际HTCAPTION/HTCLIENT正确才标passed。`:139–140,203–233`覆盖open、真实滚动后caption、closed、middle/reversal、全屏、实际zoom、空/非空右Tabs。CDP键盘/指针与WM查询真实HWND；不声称物理鼠标拖窗。 |
| 逐帧严格范围 | `:107–120`每rAF重新query节点并用WeakMap检查inner/sidebar/子节点身份与数量，防止旧elements固定数组制造假通过。保存preflight及所有帧；baseline取第一帧W>0/V>0的moving帧，零可见初始化帧仍做实例/节点检查、保留原数据。只对opening/closing有效可见帧比完整形态，排除终态正常resize/断点校正。W容差0.05 CSS px、V-W平移0.1、子元素几何0.15，字体/行高/字重/nowrap/颜色/背景/渐隐/文字/overflow精确字符串比较；原生DOM容差写入报告，不借用旧HTML数值。原始frame JSON在断言前写入，失败中断另保存incomplete帧。 |
| 版本、失败与报告 | `:23,40–46,126–128,235–239`记录脚本、全部相关导航/弹窗/菜单/hover源、CSS/Logo与lock hash；测试前后重新hash实际dist/.next/out或resources包（JS/CSS/HTML/asar）和Electron exe，文件新增删除/字节变化均拒绝最终pass。status先running，只有全部断言/错误/HTTP/版本稳定通过才passed；catch写failed及截图/版本快照。证据label不可覆盖历史失败。 |

微软文档说明部分Win32坐标API可能按调用线程的DPI awareness虚拟化，并提供临时切换及恢复线程context的接口：[High DPI desktop application development](https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows)、[SetThreadDpiAwarenessContext](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setthreaddpiawarenesscontext)。WM_NCHITTEST传入屏幕坐标并返回caption/client等命中值，坐标需按有符号16位读取：[WM_NCHITTEST](https://learn.microsoft.com/en-us/windows/win32/inputdev/wm-nchittest)。这些来源只支撑审核中的坐标协议，不证明本机调用结果。

## 初审问题关闭情况

1. **P1，冷启动/resize后hidden preflight W=0或旧W当baseline。** 已改首个有效可见moving帧为baseline，保留preflight/零可见准备和全部moving采样，原实例检查持续执行。没有把settled帧混入固定形态检查。
2. **P1，同label覆盖失败证据。** 已用exclusive本轮目录，EEXIST在seed/报告/截图前拒绝。
3. **P1，移动按钮点与原生调用延迟失配。** 已选固定右端工具并检查前后同point/element/leak-zone/phase；失配记录inconclusive且不计成功或静止阶段。
4. **P2，旧节点数组、冷启动观察遗漏、结束包版本缺核对。** 已逐帧fresh selector/identity、三次launch统一观察，源名单补ScenarioCreate/OutlineTreeMenu/HoverCard，并做包和exe结束hash及失败快照。
5. **P2，PowerShell线程DPI上下文不明确。** 已显式PMv2并finally还原；warm helper隐藏窗口、JSON参数调用，没有Invoke-Expression或额外HTTP服务。

## 本审核实际执行与当前快照

只执行静态解析：Node **24.19.0** `--check scripts/verify-sidebar-navigation.mjs` exit0；TypeScript createSourceFile seed parseDiagnostics=0；PowerShell Parser ParseFile diagnostics=0（整体命令exit0）。解析不导入/运行seed，不启动Electron，不调用原生helper。正式测试结果必须由后续实际命令和报告给出。

| 文件 | SHA-256 |
| --- | --- |
| scripts/seed-sidebar-navigation.ts | 6e3bd32b5d11baf78ee63578009c2e245273b910e4e8d07603c5b567a4c5c30f |
| scripts/verify-sidebar-navigation.mjs | aa4e6a5a42d13080d4c7888ccc26c2633a72df4a001fcaaf45daad23b72734a5 |
| scripts/sidebar-native-hit-test.ps1 | 4daacb2a82c44d1b98df7abd13be769a87351ce1d64d563f081055dbae2cc08e |

后续实际范围仍排除macOS、物理鼠标拖窗、Windows IME、NSIS安装和无关业务全组验收，脚本report.unavailable也逐项标示；不可由此脚本的一次启动冒烟替代整个验收矩阵。

## 首轮账户菜单断言修正补审

实际 `windows-development-01/report.json` 保存为 **failed / 4 checks passed**：失败是脚本`:151`要求至少3个menuitem，0 pageErrors、0 HTTP，源/包/exe前后稳定；实际DPI144，open与真实scrollTop900后的caption/button命中已通过。只把这四项作为该次部分结果，未标整体通过。

真实 `SidebarTree.tsx:1983–2016` 账户菜单结构是不可点击的用户Label（姓名/邮箱）、外观Switch及唯一“设置”menuitem。资料和主题控件没有menuitem语义，旧数量断言是验证媒介错误。新`:151`等待真实menu可见、核对合成姓名/邮箱与外观文字、主题Switch可见及ink的aria-checked=true、唯一exact设置menuitem可见/count=1，保留Escape后menu隐藏及account焦点断言。查找限定在实际打开的account menu内，未删除正确业务/焦点期待、未修改生产。

该次补审把`:151`仅在内存恢复为原断言，其余字节不动，重算SHA-256得到原冻结 **88aa59bbf971172ffbe4f29936d30ceec63f33c15142a59e4df2aa9ec826fb4a**，证实该次脚本唯一差异是该行；Node24 `--check` exit0。该次冻结hash为 **3f4b1028…f81d744b**，允许使用新unique label进入第二轮。失败attempt01及截图完整保留，不冒充通过；本审核没有执行第二轮或新原生命中。

## 第二轮手动保存用户资料协议补审

实际 `windows-development-02/report.json` 保留为 **failed / 5 checks passed**，失败为旧profile helper调用通用update后，正式服务拒绝“用户资料需要在编辑用户对话框中保存”；pageErrors/HTTP均0，源/包/exe前后稳定。`desktop/main/index.ts:532–548` 明确手动用户资料走save-profile，通用update拒绝改user，符合批准约定；本失败是媒介调用协议不正确，不改产品来接受该调用。

新验证器`:156–166`三次经真实账号菜单→设置→用户→编辑用户，填写笔名和邮件；保存前bootstrap.user与完整before deepEqual，点击实际“保存”并等待editor隐藏后，与完整expected deepEqual，最后通过真实“关闭设置”控件退出并等hidden。三次依次验证长姓名/邮件、邮箱为空、恢复邮件，原scrollWidth/clientWidth溢出、mask、nowrap、空邮箱无placeholder断言全部保留。`:151`原账户菜单Escape隐藏及account焦点检查完全未动。新设置流程检查实际关闭状态，未声称增加了独立的profile焦点运行证据；源 `ProfileSettings.tsx:90–96,123–129` 保存await完成后关闭，并将finalFocus传给原编辑按钮，原焦点机制未改。

真实UI的链路与选择器对应 `SettingsDialog.tsx:62–67`、`ProfileSettings.tsx:108–109,128–129` 和 `src/stores/desktop.ts:28` 的专用save-profile IPC。验证源名单`:23`补入这些真实SettingsDialog/ProfileSettings/store/main，继续做前后hash；报告描述改为实际手动保存UI，不伪称通用update成功。

独立在内存只还原上述helper、报告描述和4个源名单新增项，重算hash精确得到前冻结 **3f4b1028027522177476ee0b58cba50337808aab5e196e3623474b21f81d744b**；证明其它菜单/场景/编辑器/原生命中/帧严格断言没有被改。当前 **2b9b5cc8…af764935**、Node24 `--check` exit0，blocking=0，可unique03执行。两次失败及部分成功只作为各次实际结果保留，第三次仍未执行；本审核没有启动Electron或修改生产。

## 第三轮真实事务故障后的源名单补审

`windows-development-03/report.json` 保留为 **failed / 10 checks passed**，真实重命名对话框因正式PATCH失败未关闭，0 pageErrors/HTTP且版本稳定。独立作者在同一保留合成数据库运行正式服务，`windows-preparation/development-03-scenario-update-runtime.json` 复现transactionActive再次借用错误；源修正/新真实DB用例需按单独 `2026-10-13-sidebar-scenario-transaction-review.md` 执行，不能改harness断言掩盖500。

本次harness仅`:23`新增 `src/lib/services/scenario-lab.ts`、`desktop/service/context.ts`、`tests/integration/sidebar-scenario-management.test.ts` 三项前后hash名单。独立在内存仅移除这三项，重算精确返回前冻结 **2b9b5cc8edbc941f2b5b98d7e0b920248b457b4a1469beeafab3c42daf764935**，证实所有业务、焦点、native及frame断言无变；新冻结 **9069795a…4a450d0b**，Node24 `--check` exit0。媒介补审通过/blocking=0；04须等一行产品修正独立code review及新build，当前仍not-run。03及真实诊断不冒充已修复/已验收。

## 第四轮 moving 控件选择器补审

`windows-development-04/report.json` 为 **failed / 13 checks passed**：真实试验场CRUD、创建/历史对话及Monaco保留等已通过该次断言，随后首次wide-close moving probe找不到固定工具；0 pageErrors/HTTP，源/包/exe稳定，服务hash为新 **a382f51d…2d556e26**。原 `wide-close-interrupted-frames.json` 保存5帧并标incomplete，不计帧通过或整体通过。

真实 `ContentTabs.tsx:75,156,188–196`分别为empty“隐藏内容面板”、overflow/compact“所有标签”和非空“显示 / 隐藏内容面板”。非空与compact按钮都在`:154`的原content-tabs-tools，`desktop.css:231–232`以margin-left:auto/flex-shrink:0固定于右端，原native no-drag规则保留。旧moving只匹配empty名称及Chat显示入口，是harness语义遗漏。

新脚本仅`:83`为moving增加上述两个非空/compact真实button替代项，原empty/Chat匹配仍保留；没有改前后同DOM/point/phase/leak-zone、inconclusive、HTCLIENT/HTCAPTION或严格帧断言。独立内存移除这两个selector片段后hash精确回 **9069795aab2762f48887f2ee1b5266e8eef45fb04c7426eed3e7cd664a450d0b**；新冻结 **8caae0ce…cc53693f**，Node24 `--check` exit0，媒介补审通过/blocking=0，可unique05执行。生产/构建字节未改，无需因本媒介选择器重建；05尚未执行。

## 第五轮失败与真实尺寸记录增量补审

第五轮实际 `windows-development-05/report.json` failed/14partial：moving HWND命中已通过该次检查，但原完整wide-close帧的首V359.8645935超过W287.75，offset=0造成72.1145935误差，必须作为真实产品问题修复。没有改collector时序、过滤首帧或放宽容差。此事的方案/用例审见drawer-measurement-plan-review，代码审核/新构建仍待。

另核实际窗口 `desktop/main/index.ts:728` 配置minimum760×580，旧harness请求679×500会被系统夹紧，不能称为真实679/500通过。新`:54–62`保存原请求及实际getBounds/getContentBounds/getMinimumSize、display scale/实际zoom与renderer inner/outer尺寸、DPR/visual scale/phase/mode；请求低于实际minimum或明显实际clamp拒过，native outer只允许明示≤1 DIP的边框/物理取整差。settled模式按actual renderer.innerWidth<900核查，不以请求或outer替代CSS断点。

新`:228`Windows窄屏只请求899/760×580并将actualSize写各组证据；679/500仍属于隔离browser覆盖，不伪称本机目标尺寸。`:229–230`中途setBounds后立即读回同样实际数据，不增settle、不暂停或删除rAF样本，也不要求冻结moving mode即时跨断点。

独立内存仅逆转bounds helper/调用、窄屏请求与actualSize记录，hash精确返回前冻结 **8caae0ce0c3e27ebe2a858cf6076f7b8aa940ce7867ff920a729dea4cc53693f**，证明全部native/frame/业务严格断言不变。当前 **e8bb0ba4…cb477aec**，Node24 `--check` exit0，媒介补审通过/blocking=0。06仍not-run且受抽屉产品修正/code review/build门槛约束；05失败与raw全部保留。

## restore 选择与实际键盘焦点增量补审

真实 `DashboardShell.tsx` 全屏时#chat外层Panel设inert/aria-hidden但原ChatPanel仍可渲染有尺寸的restore子按钮；仅用locator visible不能证明它在可见Panel内可聚焦。新脚本`:29,63–74`限定真实非inert/aria-hidden #chat/#content caption，从实际候选取ElementHandle并检查中心点在实际Panel内、elementFromPoint命中该按钮、CSS可交互及无blocked祖先，再focus。focus后以保留的同一handle断言document.activeElement、仍连接/可命中/同Panel且未blocked；locator若错选另一节点会失败，不计成功。之后才Enter，未用DOM.click冒充键盘。

所有原restore.focus调用替换为该helper，reverse第三次Enter前另校验焦点；before/after实测写入restoreFocusObservations。既有实际phase、native点位/client命中、clip-zone、全部rAF/业务期待和尺寸helper都没改。独立内存仅逆转selector、focus helper与这些调用，hash精确回 **e8bb0ba46a88ca13ef4359564d3635395ded590cbb5d25621afa6e0dcb477aec**；当前 **aa4e6a5a…b72734a5**、Node24 `--check` exit0。媒介补审通过/blocking=0，06仍须等待产品门槛，未执行；该DOM焦点验证不替代WM_NCHITTEST或物理鼠标拖窗。

## Windows06 实际结果与待诊断的选点边界

已只读核 `windows-development-06/report.json`：**failed/24项部分通过**，errors/HTTP为空，source/bundle/exe前后稳定。wide-close、wide-open、wide-reverse、wide-after-reverse-open、parallel-sidebar-and-fullscreen五段均有完整严格帧结果，原W0.05/translation0.1/geometry0.15与样式精确期待保留；moving原生点已实际通过的部分也保留。这些部分成功不合并为整体通过。

停止于 `nativeRegions` 找不到clipped zone内真实空白可见caption点（抛错发生在native.probe前），**不是该点返回了错误HT值**。`parallel-fullscreen-open`仅3个interrupted帧，report明确incomplete，不算完整运动/原生命中通过。当前冻结脚本仍 **aa4e6a5a42d13080d4c7888ccc26c2633a72df4a001fcaaf45daad23b72734a5**，没有因06修改任何断言。

须先保存现场caption/viewport/button/clipzone实际rect和候选命中诊断，确认是否确实无合法空白点及其时序，再审核选点或有充分替代覆盖的适用性方案。不能按猜测skip fullscreen-open、把settled代moving、放宽first/all帧/HT/元素点位一致性，或把未发生native调用称成功。诊断与方案尚待，下一unique attempt未执行。

## 双行 caption 选点方案独立补审

已读取 `windows-preparation/development-06-caption-diagnostic.md`及snapshot01–04原始JSON，**最小方案通过，blocking=0，允许编辑该候选扫描增量；最终脚本差异/hash仍须复核后才运行fresh07。** 01/02的opening恢复了可见Chat，与06现场不一致且native0，不能代替失败场景；03/04按正式并行关闭/75ms全屏/从真实content restore聚焦Enter复现Q0下非空Content caption，留有实际键盘目标记录。

snapshot04 actual moving前后均opening：before V65.947921753、W200.104171753，Content caption高44、Tabs viewport y6–38；原y16、原7px grid候选blank=0。备用行y39.6/x188.104171753命中caption自身、app-region=drag、无交互祖先；实际HWND、PMv2、DPI144返回HTCAPTION2，固定右工具x1610/y16返回HTCLIENT1。after V105.572921753，同点仍在(V,W)泄漏区且命中相同caption identity12；工具identity25/rect及中心点未变。该诊断58/60帧和较小W属于保留合成目录的诊断状态，只证明选点可行，不变更06原尺寸/失败或补计其3个中断帧。diag源/main hash、errors/HTTP稳定。

批准的最小增量仅候选选择：**原y=top+min16优先，未找到合法点时再扫描top+height×0.9**；原x起止/7px step、clipzone、真实elementFromPoint/caption.contains和button/Tab/input/no-drag/viewport排除保持。记录选中行及候选数量以便复核；两行无点仍失败，不用N/A。moving前后同phase/元素/点/泄漏区、HT期望、inconclusive上限4、全部rAF/实例/几何/样式严格期待、原动作时序均不变；不改viewport/字体/动画/生产，也不以settled替moving。snapshot04已经证明远离OS顶边的0.9行可实际命中，无需原顶部3px行。

当前正式脚本仍冻结 **aa4e6a5a42d13080d4c7888ccc26c2633a72df4a001fcaaf45daad23b72734a5**；该节是候选方案审核，不是尚未提交的新脚本或07实际通过。所有06与诊断原证据保留。

## 双行选点最终脚本源码补审

当前正式 `verify-sidebar-navigation.mjs` 完整SHA-256为 **58d2d19173954f1b990764d2fbe97e9f0b6806f7f150782771fc042cc1ec073a**；**源码增量通过，媒介blocking=0，可冻结并运行全新unique07。** 本审核只读，没有启动Electron或修改脚本。

`:98–109`先跨全部caption扫描原y行，再fallback至各caption的0.9height行，原x范围/方向/7px步长及真实DOM排除原样。`:105,118`记录实际已检查候选hit/blocker tag/class、selected row/captionIndex及候选数；仍保存被选真实caption/button DOM用于之后同元素/同点核验。两行无点`:110`继续throw；没有N/A、skip或改变动画尺寸/时序。

`:120–136`仍真实moving前后phase一致、同caption/button/point/clipzone、inconclusive至多4次、HTCAPTION2/HTCLIENT1；全部rAF和几何/样式容差及业务矩阵未变。独立只在**内存**把扫描块和返回的诊断字段逆转，SHA精确回先前冻结 **aa4e6a5a42d13080d4c7888ccc26c2633a72df4a001fcaaf45daad23b72734a5**，证明除此无脚本差异。Bundled Node24 `--check`本审核实际exit0。

原01–06及诊断全部保留，snapshot诊断不能给06补通过；**07仍not-run**，完整实际原生/所有帧/窄屏/zoom/冷启与包/源稳定须新轮次执行后据实审计。该媒介补审无需生产重构建，也不承诺目标结果。

## Windows07 实际尺寸边界与待审案例增量

已独立读07报告：**failed/59项部分通过、18段完整frame结果**，errors/HTTP为空，源/包/exe稳定。双行选点已实际越过06的非空fullscreen问题，3档zoom/24与11字体对应的原生/完整帧部分通过保留，不等于全矩阵通过。

失败实际request899×580、outer900×582、content899×582、renderer899×582（zoom1、display scale1.5、minimum760×580），height+2超过原1DIP。真实 `desktop/main/index.ts:728`配置minWidth760/minHeight580、hidden标题栏及Windows titleBarOverlay；该源没有额外setMinimumSize/setBounds改变这些值。安装Electron声明`:2824–2826,3284–3293,3428–3431`区分client content bounds、请求setBounds及最小窗口尺寸，但不证明这台Windows为何返回+2；只能据实际读回判原尺寸案例失败，不能将请求代替实际或武断称固定边框/舍入原因已证明。

当前只授权保留合成目录的580/600及899/760实测诊断；待核真实合法600短窗的outer/content/renderer/minimum/HWND-DPI和原1DIP、actual CSS<900，再审仅案例height变化。不会修改产品minimum/viewport、增加容差或拿600声明精确580已通过；08未执行，正式脚本仍 **58d2d19173954f1b990764d2fbe97e9f0b6806f7f150782771fc042cc1ec073a**。

## 600 高短窗案例方案独立补审

已读 `windows-preparation/development-07-bounds-diagnostic.md` 和 `development-07-bounds-snapshot-01/snapshot.json` 全7组，**仅窄矩阵请求高度580→600方案通过，blocking=0，可修改这一调用后再审源hash；08尚未执行。** 899/760×580两组实际outer高度582、content/renderer582，原1DIP正确拒过。899/760×600实际outer900/761×601、content及renderer899/760×600，原1DIP均满足、实际CSS<900/mode narrow；恢复1800×1000再重做600两组结果一致。

诊断每组minimum760/580、zoom1/display1.5/HWND DPI144不变，实际resize事件与请求前后读回保存；errors/HTTP与源/main hash稳定。证据足以选择合法600短窗，不解释未经native源码证实的Windows+2具体机制，也不声称580精确尺寸或其原案例通过。

批准范围只将原 `[899,760]` 窄矩阵的 `bounds(width,580)` 改为600，保留两种窄宽及全部操作/后续矩阵；原bounds request/actual≤1DIP、minimum检查、actual CSS<900、nativeHT/全部frames/容差保持。不能改product minimum、假viewport、扩大tol或删除07失败。等待唯一调用差异与完整SHA补审，再准入新unique08；不需生产重构建。

## 600 短窗唯一调用源码补审

当前正式脚本完整SHA-256 **0c846ac8ce483b5f1f823e3ec5f06eed4b9c9efacb69a2a5497002cf81cc9473**；**独审通过，媒介blocking=0，可冻结后执行新unique08完整矩阵。** 第250行仅 `bounds(width,580)` 改为600，`[899,760]`两宽/真实读回/操作保留。只在内存逆转此一处调用后，SHA精确回 **58d2d19173954f1b990764d2fbe97e9f0b6806f7f150782771fc042cc1ec073a**，证明minimum/1DIP/actual viewport/双行选点/nativeHT/所有frame和业务矩阵完全未变。本审核实际Node24 `--check` exit0，未改任何脚本/生产或启动Electron。

该补审只放行执行，08仍not-run；原01–07、580实际拒过和诊断保留。后续完整报告必须写实际600短窗范围，并继续披露精确580请求的差异，不将其冒充已通过的用户窗口或更低原生尺寸。

## Windows08 空态前提源审（范围调整待诊断）

已读08实际failed/77partial：25完整capture、30native记录，正常全部组/zoom/font/窄屏/换向/断点/reduced和真实正常cold restoration部分结果保留；errors/HTTP空、源/包/exe稳定。最后独立空态在phase预期closed、实际open的前置断言失败，未调用该场景native/frame。部分通过不代表完整矩阵。

`draft-recovery.ts:218–220`明确tabs0且layout.contentVisible时留TARGET_UNAVAILABLE，restore.layout=null；seed`:70,73`当前空tabs+visible/full/closed journal因此不能作为合法cold恢复前提。这是原协议，不是本次Sidebar修正。**初稿“两合法Tab cold full后真实close0并假定仍Q0”不准通过**：`DashboardShell.tsx:22`最后Tab清零同步hideContent；hook`:241`立即置chatVisible=true/contentVisible=false、`:175`终态卸载Content；真实ContentTabs空分支`:62–81`只有hide，没有全屏控件。禁止改recovery/业务、注入store、增未批准工具制造状态。

下一方案先用真实UI诊断最后Tab关闭及原Chat“显示内容面板”空态路径。若空内容全屏恢复入口在当前真实UI不可达，必须明确该native案例不可达/未执行；可以审核可达的空Content+Chat场景，保留真实空caption、完整Sidebar frames/HT要求，并以原React/API隔离用例另记不可达full分支，不能将调整前后媒介混报或暗skip。初稿说明文档保留为待修提案；当前尚无认可的最终替代或09执行结论。

## 可达 empty Content＋Chat 修订方案独立审核

已读修订诊断说明与 `development-08-empty-ui-snapshot-01/snapshot.json` 的全部6阶段：**修订范围方案通过，blocking=0，可据此写harness增量再独审；09未执行。** 原初稿已明确撤回，seed无需制造空full journal或改业务规则。

实际主题Tab full+sidebar closed为Q0/C1440；原close最后Tab后100ms Q670.427/C768.906，settled Q1440/Content卸载；原Chat显示内容后tabs0、sidebarclosed、Q419.8125/C1019.5209，empty caption只有hide、无full控件。全部实际UI/真实IPC，无renderer store注入，errors/HTTP及生产/seed/harness/main/service hash稳定。这同时证明原稳定empty fullscreen前提不成立、empty＋Chat合法可达。

批准的调整为第三个独立owned实例用普通合法两Tab seed，通过原close按钮清零并等Content卸载，再Chat原显示按钮打开空Content；断言tabs0、Chat/Content真实可见、Sidebarclosed后继续完整open/close frames和实际moving/hidden命中。必须明示恢复入口在Chat caption；真实empty Content caption本身的drag与hide工具命中须有单独实际选点证据，不能只采Chat空白却称empty Content caption已验证。原泄漏区moving测试可继续用可达Chat caption，但应记录实际owner。原HT2/1、point/DOM/phase/allframes/tol及前面非空full/cold目标全部保持。

原“empty fullscreen Content左restore分支”须在最终report.unavailable中明确**真实UI不可达/未执行**，关联recovery/lastTab关闭协议。`tests/browser/sidebar-drawer.test.ts` DRAWER-07确实用原ContentTabs隔离props验证该分支的24px按钮/Enter/mac安全区，只归React媒介，不代替Windows目标。09即便可达矩阵通过也不能泛称全部原生full/empty分支通过；01–08失败与原假设/后续修订历史完整保留。

## 空态最终脚本源码独审

**源码增量通过，媒介blocking=0，可冻结新unique09执行可达完整矩阵。** 当前正式脚本SHA-256 **5dc1821aaf70bcb7ebcb068cf0af7557bb6904ed9306337d344b87ed8ee748d3**；seed保持 **6e3bd32b5d11baf78ee63578009c2e245273b910e4e8d07603c5b567a4c5c30f**，production未改，09未执行。

- 与审核前08脚本缓存逐行比较，变化仅nativeRegions的可选contentCaption定向/owner诊断与断言、末独立实例合法UI路径、unavailable和报告描述，以及sourceFiles新增既有draft-recovery.ts。前面所有场景、双行/x7选择、HT2/1、sameDOM/point/phase/clip、inconclusive上限、全部raw/帧容差未改。
- `:92–120`默认调用保持原选择；仅新contentCaption参数指定真实Content caption及原hide工具，要求两个owner均content、按钮确为隐藏内容面板。`:263–277`普通合法seed的两个实际Tab ID冷恢复后核对，原Sidebar收起也保存严格frames/native；原close按钮逐个清零、实际Content卸载、Chat显示空内容，核tabs0、两个真实Pane可见、Sidebarclosed、恢复入口只属于Chat。
- `:275`先独立测empty Content自己的drag/hide HT，再测实际Chat泄漏区hidden/open/close并明确captionOwner=chat；后者仍收完整Sidebar frames，不以caption不可达为由skip这些动作。`:276`在unavailable明确原cold-empty-fullscreen Content恢复分支真实UI不可达/未执行，DRAWER-07仅浏览器。正常非空full/cold前矩阵保持。
- 初提交1228b850快照漏加计划中的recovery hash名单，已要求且仅补该项。独立内存移除新增名单项后SHA精确回 **1228b8502bd2b9cb3138369a711c6d84103cf36bf7647a5c02fef1b53de499c9**；关联真实recovery源仍 **442f3e5b860107edbf0b286cc3585d9d4f710381b144c694168f603e8447654f**。本审核实际Bundled Node24 `--check` exit0、diff检查无问题；没有执行Electron或修改脚本/seed/源。

该审核只放行执行，不给09预先通过。最终必须据实说明可达矩阵结果、empty fullscreen不可达、600实际短窗、原01–08失败及全仓既有失败；不得笼统宣称所有原生分支/全量用例已通过。

## Windows09 加载前置方案独立补审（2026-10-14）

已核09实际failed/78partial，errors/HTTP空、源/包/exe稳定。`empty-instance-before-close-tabs-frames.json` preflight144项，首新增146项中identity147/148恰为第二作品的“暂无正文”row和label；完整raw及严格失败保留。正常旧矩阵25段仍有完整结果，不与失败末场景拼成整体通过。

真实 `SidebarTree.tsx:1016–1037`小说详情加载完成后无卷生成暂无正文；`:490`正式角色之后始终挂ForeshadowSection，`:631`在Works的伏笔query pending直接返回null、无spinner，`:635`默认展开；`:1277–1307`bound会话默认展开且共用原query。`development-09-roles-snapshot-01/snapshot.json`实际Works初始role0/spinner9；最终8formal＋2FORESHADOW/spinner0/alert0/暂无正文1，两原IPC foreshadow GET200、各1条。早期preflight8不能推断最终只有8，10总角色在当前Works确实可达。

**仅末实例capture前的条件等待方案通过，blocking=0，可编写这一增量后审完整源hash；10未执行。** 前置以实际DOM分开确认两fixture作品标题、formal8与FORESHADOW2、两bound会话标题、第二作品暂无正文、Sidebar spinner0/alert0，记录各计数及view=Works。不得为满足前置切分类/改变fold/数据；不使用固定sleep、不接受运动中新节点、不重设baseline、移采样到首writer后或放宽任何identity/几何/native期待。就绪之后仍按原first/all capture、closeTabs0、Chat显示空内容和全部native矩阵执行；seed/production/前面矩阵不改。

当前脚本仍 **5dc1821aaf70bcb7ebcb068cf0af7557bb6904ed9306337d344b87ed8ee748d3**、seed原 **6e3bd32b5d11baf78ee63578009c2e245273b910e4e8d07603c5b567a4c5c30f**。该审批只确认静态业务前提，不将动态加载当布局修复，也不给新unique10预先通过。01–09及所有诊断保持。

## 加载前置最终脚本源码审核（2026-10-14）

**最小源增量通过，媒介blocking=0，可冻结后执行fresh10完整可达矩阵。** 当前正式harness SHA-256 **928aaff2cba4649709937c3bb4496ccb7475a0b57d054e003d688c561354fd0b**，seed/production保持冻结，10未执行。本审核只读源码与他人真实结果，没有修改脚本或启动Electron。

`:271–277`唯一新增在末独立实例、原capture与关闭动作之前：逐个等待两个实际fixture作品/会话标题、暂无正文；DOM条件分别等formal8/FORESHADOW2/spinner0/alert0。随后用既有frames()等待两次rAF让静态React/标签测量落位，再读取并严格断言当前view=作品、角色/loader/alert计数，记录成功检查的2作品/2会话/第二无正文前置。没有切分类/fold、改数据或查询、固定sleep，也没有在运动开始后等待/更换baseline；原capture仍在真正close动作前启动，全部first/all帧和native期待不变。

与审核前5dc182源码缓存逐行比较只有上述就绪块新增；本审核另在**内存**移除该块后SHA精确回 **5dc1821aaf70bcb7ebcb068cf0af7557bb6904ed9306337d344b87ed8ee748d3**，证明其他collector/identity/count/业务矩阵/HT/phase/point/clip/容差完全未变。本审核实际Bundled Node24 `--check` exit0，review diff检查通过。

该前置只定义静态业务树验收条件，不宣称普通用户加载期间节点不会正常新增，也不延迟产品本身导航动作。无数据、错误或query未完成会使等待失败，不接受新节点或放松采样来制造通过。01–09失败保持，fresh10执行结果及最终报告仍待核。
