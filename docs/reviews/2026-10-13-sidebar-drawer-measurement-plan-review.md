# SN-12 首帧连续性增量方案与用例独立审核

日期2026-10-13，审核人sidebar_design_review。只读审真实Shell/hook、已安装Group源码、Windows05原始帧和增量方案/用例及实际red/green记录。本次未修改生产、未亲自执行这些增量测试；具体源码审核和阶段记录见后续附录。

## 结论

**本文记录的首帧增量方案/用例源和当时10＋18专项审核通过；当前总门槛为Native10新resize P1，blocking=1。** Windows01–10均failed；第十轮运动中跨899实际viewport有一帧V超固定W18px，不能由本文旧专项通过抵消。新的增量方案审核见 `2026-10-14-sidebar-drawer-resize-plan-review.md`，代码当前结论见 `2026-10-13-sidebar-drawer-code-review.md`。不把方案/浏览器通过当真实目标通过，以下分阶段通过/待补表述属于当时历史。

## 证据及方案核查

- `windows-development-05/wide-close-frames.json` 的preflight V=W287.75、offset0；首moving V359.8645935/W287.75/offset0，偏差72.1145935；第二帧0.104187>原0.1。报告failed/14partial、原始全部帧及稳定源/包保留，moving原生命中的部分成功不替代全帧失败。
- `DashboardShell.tsx:34–48`给真实Group传历史initialLayout.sizes，sidebar/chat使用preserve-pixel-size，并在动作开始变min/max和按visibility增减Separator。`useSidebarDrawer.ts:70–73`静止current取getLayout，`:156–181`先同步更改显隐/约束再kick首rAF。安装库 `react-resizable-panels.js:1856–1857,1912–1932,2007–2030`显示resize会重算preserve-pixel比例，注册则从cached/default layout构造当前值。因此“旧20% getLayout”不能直接定为根因；须实际记录结构提交和首writer顺序。
- `technical-plan.md:86`起的新方案、`:101`后补充已覆盖两种候选：全部真实直接Panel外层width/sum（排除divider）换算current/像素约束；保持动作中的既有分隔条；注册完成后从最新实测起点合成；若结构提交在首writer前重施旧initial map，由同一owner提供当前结构快照或明确restore map，防止首次paint跳宽。实际根因以red记录为准，超此范围要补审。
- 显式restore仍优先，窄屏overlay不用于桌面偏好；实测只能校准当前运动起点，不覆盖最新secondary/target意图或把瞬时V存成lastSize。首统一writer与结构注册协调不能增第二动画loop或另一个直接Group writer。content挂卸载/全屏/换向也要保留原业务实例。

## 必须执行的限制及用例边界

1. Root本次明确禁止“去Math.min、放宽tol、skip”。初审发现第4条表述歧义，作者现已在方案`:95`明确**保留现有Math.min(V−W,0)，修正真实V≤W**；该文案问题关闭。不能仅把内层向右跳72px来使等式通过，实施审核将按此限制核查。
2. `test-cases.md:46–56` M01–03涵盖冷挂载20/30/50三栏→idle1440/1800resize→从首moving帧全部采样；逆向resize/两主题/全屏/快速换向；原9drawer+5intent+4pure回归。首帧V不超preflightW+0.1、closing单调、W/内部几何/样式不变及V−W误差≤0.1保留，终态/重新打开像素偏好读回。
3. 具体fixture必须在首次Shell挂载前通过原WorkspaceDraftSource恢复initial layout并有真实content Tab，不能只在已挂载后restore。collector须在click/keypress前注册rAF，保存preflight/first moving/所有帧，并观察原API与constraints/divider/public setLayout输入输出。观察包装只转发原方法，不fake旧百分比、归一化或Group实现；不改变collector顺序掩盖首帧。

## 实施前源快照

| 文件 | SHA-256 |
| --- | --- |
| src/components/layout/useSidebarDrawer.ts | 60644f7deeb8e81b0728d2e08bf93126b3c5029e5c0ce441de29047030bedca4 |
| src/components/layout/DashboardShell.tsx | d23173d087417a1f55d7c85d431b7f9cf8c3e03d436475b244e8f757730d8519 |
| tests/helpers/sidebar-drawer-fixture.ts | 339f9011541df1e1b23f8b8937474b805a0c50bd94fda4a98f565880360cd2d2 |

## 具体测试源审核

**`measurementCaseSourceReview=passed-for-red`，blocking=0。** 本次只读审核新增 `sidebar-drawer-measurement.test.ts` 与fixture增量，未运行。当前具体4条是双主题×1440↔1800的冷挂载、idle resize、关闭及重新展开；M02的全屏/快速反向与M03原18回归须在修正后按矩阵执行/补齐，不能把这4条称为完整矩阵通过。

- Fixture `:32–40`先创建desktop上下文/真实store，并在首次createRoot.render之前通过原WorkspaceDraftSource.restore放20/30/50和真实theme Tab，保证Hook initialLayout与Group defaultLayout分支可达；已有AI/body隔离明确，不宣称真实编辑器/IPC。
- `:43–59`加载安装的真实Group/Panel并转发原props/API，observe模式只记录default/config及原setLayout调用前后/返回结果，没有实现另一布局引擎或伪造getLayout。未观察模式仍转原handle；所有旧fixture默认保持相同行为。新增包装不会新增Group写入。
- 新测试`:13–35,39–45`在真实click前注册rAF、保存preflight及所有阶段帧，读取直接真实Panel外层宽/API布局/config/Separator/writeCount；原API逐次写入和default映射亦保留。第一moving未过滤，无等待writer后才开始收集。
- `:47–62`从首closing开始校验完整W、V不超preflightW、单调、V−W≤0.1、Separator分配、caption相对/绝对几何/H/styles，最后closed/V0并验证重开实际像素宽偏好；不是源码文本断言。150ms等待仅用于动作前idle resize，不能证明稳态所有环境，但没有延后/跳过动作中第一帧；red需依记录确认preflight已稳定。

实施/green注意：当前caption几何使用deepEqual，几何存在浮点时应仍遵守已声明0.1px政策、styles保持精确；若测试测量误差与真实P1不同，要分开记录，不能因此放宽native容差或忽略首帧。browser观测输出用明确red/green SIDEBAR_MEASUREMENT_STAGE保留阶段，勿用同一默认unspecified覆盖红灯。

| 测试源 | SHA-256 |
| --- | --- |
| tests/browser/sidebar-drawer-measurement.test.ts | 4d3b260ee14096ca029ba446fafa68c027304d69f4babe9f138565fc969eefca |
| tests/helpers/sidebar-drawer-fixture.ts | 95bafe3fb8b3395061a936adb43d9d3b3fc067f2b90d341f0bb548218b97ee5e |

`newMeasurementTests=not-run`、`incrementalCodeReview=pending`。允许实际red并据trace定根因，旧首帧P1仍未关闭。

## M02 同时全屏及早换向源码补审

测试源新增4条M02，**独立源码审核通过，blocking=0，可执行**。原4条严格断言保留，helper未改。新`:82–99`双主题同一浏览器turn对真实Sidebar/ContentTabs按钮调用DOM.click来触发React handlers；`:101–114`双主题在实际closing后触发原restore按钮早换向。均使用提前注册的同一collector，全closing/opening帧校验W、V≤W、V−W、既有Divider、caption/H/styles；并断言全屏最终S/Q0/C100和Divider只在两轨结束后消失，以及换向真实closing/opening记录和恢复原实际宽度。

这些4条是明示的合成DOM事件，不证明键盘焦点、真实Windows/native输入；原专项及实际target仍负责这些边界。当前新测试SHA-256 **dc1d003a09dac4f099f692c43d9ed26c9ffcd7bdc668fae5d224eecac7971e6f**，fixture仍 **95bafe3…b97ee5e**。已核原4 red（0pass/4fail）的raw：beforeAPI15.996/23.993/60.011准确，首closing API20/30/50、sep2→1且writeCount不增加，证明结构注册重施旧map，不是stale getLayout；此前两次实现尝试4fail也保留，third4green仅覆盖该4条。

代码最终补审仍待M02/原18完整结果与最新源；新增“隐藏1440→打开中70ms→1800增长”的实际全帧用例还需源审/red，不能以已有idle或缩小窗口用例覆盖。产品门槛未关闭，下一Windows轮次未执行。

## M04 打开中扩大窗口源码补审

当前新增第9条`:116–135`已独立审核，**通过，可执行；blocking=0（用例源）**。真实cold1440/20-30-50先收至closed，restore真实click前arm原collector；70ms时setViewport1800，不settle/暂停采样，保留本次第一个opening为完整形态基准且逐一检查所有opening样本。全部W/H/caption/styles、V≤W+0.1及rawV−W误差≤0.1；真实直接Panel总宽>1700证明扩大在运动中被采到，最终open。关闭后的旧内层宽度不替代本次打开first-moving W，未过滤首帧或放宽阈值。

测试当前SHA-256 **7bf9281168f6e18e64d508761d1e44bc83a2effb6b35f05e24e3e8cdcd2235c5**，fixture未改。原18串行TAP已核18/18通过，原4首帧third绿已核4/4；M02/M04仍待新9条实际结果。技术末段已依red明确actual API准确而requested cache结构重施，改用owner current/pending restore及注册窗口同一write复钉，不再实施未经证实的DOM rebase。同步repin新增的重入guard/注册完成释放须最终代码核查；仅有这些测试证据还未关闭产品门槛。

## 新9条实际结果与后续最小方案

已读取 `red/drawer-expanded-measurement-before-growing-fix.tap`：**9 tests / 6 pass / 3 fail**，原4冷resize和同turn全屏2条通过；早换向2条在所有moving形态检查后，终态V回旧20%而失败。其raw beforeAPI15.996/23.993/60.011、V=W287.609375；终态phaseopen API20/30/50、V359.59375而W仍287.609375/sep2。这是终态min/max重新注册后的实际旧requested map，非浮点误差。第9条扩大窗口实际V295.21875>本次固定W288失败，证明百分比轨道在新Group宽下超出完整形态。

依据这3个实际失败，新增最小方案**原则通过，待代码审**：wide Sidebar轨道使用真实像素进度/目标，正常帧以实际直接Panel外层宽度之和（不含divider）换算该帧百分比给原唯一compositor；secondary仍沿原百分比/最新轴协调，不另写完整layout。正常目标投影继续合法，冻结完整W、不可把瞬时V存成目标/lastSize；窗口增长对应的终态像素比例应同步，关闭/换向/reduced/restore及窄screen偏好保持。

完成phase的min/max、Panel挂卸载等结构提交也纳pending注册窗口，同一owner current/明确restore map经同一write复钉，保留重入guard，不能只在动作开始设置pending。当前实际Shape/target/read与同步repin之间不得引入第二rAF/私有库缓存写入。现有Math.min、first/all collector、.1及native原容差原样保留。原raw与三失败保留，完整9/原18及独立代码审核通过前不关闭产品P1，也不允许提前标Windows06通过。

## 注册 Observer 选择及手动拖宽用例补审

**候选方案原则通过，新增用例源通过，blocking=0（进入该bounded实现/执行）。** 实际pixel首版9条为7pass/2terminal reversal fail，原moving/growing检查未放宽；技术末段已解释onLayoutChanged按最后通知map去重，callback复钉在订阅安装前发生，同值write短路导致terminal同map通知被抑制。

MutationObserver限定原Group childList/style及直接Panel根style，禁止观察业务body/innertransform；microtask仅pending+wide+非writing+实际API不匹配时，经已有write复钉保存current/明确restore，不直接改V或库缓存、无第二动画rAF。结构变化刷新所观察Panel，卸载disconnect。pending释放必须覆盖**所有**终态约束提交（独立secondary完成也需后续owner writer，不只sidebar完成），并保护显式restore取消和初始map；idle手拖不能被残留pending回写。

新增测试`:135–144`在全部opening记录已取回并断言后，才等80ms并通过真实page.mouse拖第一Divider35px，断言Sidebar真实增宽>20px且原adapter读回比例×实际Panel总宽与实际dragged差≤0.1。未延后motion collector或丢样本，验证协调器释放普通手动resize。测试当前完整hash **d9bb4088cb6920543e3618cef5c7d0e0358fa1d7517e44c043aeb74ee907ff72**，helper不变。最终observer源码/完整9+18及新Windows仍待，不能把候选通过记代码通过。

## M05 显式恢复与卸载源码补审

完整读取当前10条测试及真实Group转发fixture。新增`:147–158`通过原WorkspaceDraftSource.restore明确25/35/40与不同历史last尺寸，随后原adapter读回；再真实React unmount并核查650ms后无组件、原API写入数未增加，fixture仍严格检查pageerror。现有9条采样/容差未修改；该用例不宣称覆盖全部moving几何或真实Windows。

当前源 **6ee93a5d90098217db0ac430d8ed17d7f133053fa30603c9df0da954a78e31bb**、fixture **95bafe3fb8b3395061a936adb43d9d3b3fc067f2b90d341f0bb548218b97ee5e**。**仅一个可执行的源审修正：两次70ms之后、restore及unmount之前各断言实际phase仍为closing**，防止慢调度已settled而把闲置操作当运动取消。无需延时或放宽任何期待；该补充完成并核对后可执行M05。最终代码补审及完整10条结果仍待。

该项现已修正并独立核对：仅在`:149,155`增加实际closing断言，其余流程、原9条及阈值未变。当前完整测试源 **804e287211e914dc5c3e1000687a58cdf0be29e0c7a97ba4dd543cb113699971**。**M05用例源码审核通过，blocking=0，可以执行当前完整10条。** 尚未读取该10条实际结果；不得提前记通过。

## 最终实际结果与代码门禁

已独立读取实现者的 `green/drawer-expanded-measurement-final-10.tap`：**10 pass / 0 fail / 0 cancel / 0 skip**；`green/drawer-pixel-observer-original-18-final.tap`：**18 pass / 0 fail / 0 cancel / 0 skip**。Node24 typecheck实际exit0由执行者报告，空输出保存在 `drawer-first-frame-typecheck.txt`。本审核没有重复执行这些完整组合，结论区分源码独审与读取他人实际执行记录。

当前 `measurement-green-final/ink-1440-1800.json` preflight及第一closing均V=W287.609375/offset0、API15.996/23.993/60.011、sep2；原始首帧保留且不再回旧20%。四冷resize、早换向、并行全屏、opening增长均保存全raw；手拖与明确restore/unmount分别有真实行为断言。最新18修复了Observer阶段窄开→宽完成后pending未释放的1fail，失败TAP亦保留。此前所有red/失败版本均不重标passed。

完整只读代码补审已确认单一write、像素motion/目标不存中间V、direct-root bounded Observer/reentry/cleanup、全部终态writer释放、明确restore优先及普通drag恢复；完整报告在 `2026-10-13-sidebar-drawer-code-review.md`。最终生产hook **3a486b861a2831ddf677a957948b957ddfa7dd7be01ad843bcb5f1d03fe088c9**，Shell **17484465832de9a76faa90eac4703d639932a821d84c8da7c9e54d71f6cded11**，测试 **804e287211e914dc5c3e1000687a58cdf0be29e0c7a97ba4dd543cb113699971**，fixture **95bafe3fb8b3395061a936adb43d9d3b3fc067f2b90d341f0bb548218b97ee5e**。已核 `drawer-first-frame-final-sources-before.json` 与after的12项完全一致，也与当前文件hash一致。src/tests/scripts保持冻结；后续变化须补审。

**放行最新全量回归/构建/实际Windows06准备，blocking=0；Windows06仍not-run。** 该Chrome隔离fixture不替代正式数据库、真实Monaco、Electron/native命中或安装包离线验收。
