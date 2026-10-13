# Windows10 resize 协调增量独立方案审核

2026-10-14，审核人sidebar_design_review。只读审方案、原Windows10全部32帧、当前hook/Shell/安装Group源码、新增11条测试源及作者实际red/green；本审核未改生产/fixture/测试/harness，也未自行执行用例。**方案/测试源/最新代码门禁均通过，code-review blocking=0；development-11实际同场景严格全帧已关闭本次resize P1。** 首次red2pass/9fail和Native10失败保留，修正后原28＋新11实际39/39pass、typecheck0；最新实际证据见 `2026-10-14-sidebar-navigation-final-evidence-review.md`，全仓仍failed/allAcceptance=false。原反方向及源码基准问题已补齐，历史记录如下。

## 实际问题与候选边界

Windows10 failed67，源/包/exe稳定、errors/HTTP空。raw index6 V83.15625/W267.083343506/offset−183.927093506；index7 closing/wide V285.083343506/W不变/offset0，违反raw V−W18px；index8回V84.802085877。actual native899×1000/outer900×1001仍满足1DIP，mode冻结正确，内部节点52/caption字体不变。此为真实viewport P1，正常后帧和旧Native08通过不抵消。

安装Group `:1953–1994`自然ResizeObserver以requestedLayout/requestedAxisSize经Kn preserve-pixel投影；公共setLayout `:1539–1559`用当前存储axisSize更新requested值。当前hook`:137`正常writer清注册pending，`:310`补偿只pending，`:321`移动resize只geometry。候选“owner按新DOM宽写后库另投影”有源码依据，但native raw缺API时序，不能当已定根因。

候选实施原则合理：保留原单write/单rAF、冻结W与像素轨道，保存最近owner pose按真实直接Panel总宽重合当前百分比，保持该帧最新secondary轴；补偿覆盖wide Sidebar motion及旧注册pending，只在完整API、真实不匹配、非writing时走原write。继续directGroup/Panel根Observer/no-subtree、Math.min/V≤W/raw公式，禁私有缓存写入/新loop/同值扰动。restore取消、终态所有pending释放、静止拖宽/桌面偏好与cleanup必须在具体源和行为核对。

## 用例原则待补项

现计划`:20–24`为双主题×DPR1/1.5 closing1800→899四条、opening和同时fullscreen1800→899两条。collector在真实动作前、70ms时确为moving，再自然viewport resize，public API/原write/原RO只观察转发，首/all样本严格；与Native高度不变1000匹配，不能fake调度或重复跑到出现红灯。

**一项P2必须补：至少一个899→1800中途resize的首/all-moving真实Group案例**，检验扩展补偿不会误写冻结narrow模式或把全宽写进桌面偏好；与root明确要求的反方向一致。1600→899可以同时补作为前序尺寸边界，但不因未复现先猜尺寸专属根因。默认fixture参数及旧28组不能改。补反方向后即可原则通过编写/独审测试源；当前仍不允许据候选改生产。

后续按具体源审→当前生产真实red完整trace→定因最小修正→原28＋新案例/typecheck→独立代码补审→最新core/build/browser/uniqueWindows。若Chrome fixture未复现，保持Windows10真实失败与全部观察，不宣称red/修复已通过。

当前源快照：hook **3a486b861a2831ddf677a957948b957ddfa7dd7be01ad843bcb5f1d03fe088c9**，Shell **17484465832de9a76faa90eac4703d639932a821d84c8da7c9e54d71f6cded11**，冻结harness **928aaff2cba4649709937c3bb4496ccb7475a0b57d054e003d688c561354fd0b**。方案初审SHA **ffc556ce4fbf9d923af652500079a6c3d597c6f7b361b4f84cf94aaf094695cf**；后续修订另记。

## 反向及CSS观测修订复核

已核当前计划SHA **0a49ac9473ddacf386e6de2c5cf80845f0680ab9cf9e84d2d48b9bbb8723de50**：M06-01双主题×DPR1/1.5×1800↔899八条closing；M06-02两方向opening及wide closing/fullscreen三条，合计11；窗口height1000保持。narrow→wide期间要求frozen narrow、首/all raw几何及最终桌面偏好，不将overlay899px存成正常宽度。原P2反方向缺口关闭，**原则审核通过，blocking=0，允许编写测试源码；尚不允许直接改生产。**

额外CSS候选已纳观察：globals`:2112,2119,2125`在窄媒体条件下给Sidebar/外Panel flex important并隐藏Separator；现desktop frozenwide只覆盖display。因此新trace还须记录每Panel computed flex/basis/display/width及Separator实际宽，区分CSS对DOM的影响与公共API/requested map变化。不能先把18px归因于库resize；若真实red指向CSS，需先补相应最小方案/范围再改，不能用另一Group writer/假V/clamp对抗样式。当前候选实现范围仍hook/必要Shell、无CSS/harness修改。

## M06 测试源码复核（可执行首次 red）

已完整读取 `tests/browser/sidebar-drawer-resize.test.ts` 和共享 fixture；本审核未运行11条用例，也未改作者源码。当前 SHA256：test **88373a6fa53d08bb4ecf9dee978a41d0e8fca78e21cea0011d1f661aa026b33e**；fixture **f834354494f0c672abf9eba208fd7b6aa1b4807caf02018d1e21a7ee8f74a345**；生产 hook 仍 **3a486b861a2831ddf677a957948b957ddfa7dd7be01ad843bcb5f1d03fe088c9**。

测试 `:13–46` 在动作前注册 collector，保存 preflight、全部 moving、terminal、原 API/write/callback、实际窗口/额外只读 ResizeObserver 事件；`:19–24` 同时采样实际每 Panel flex/basis/display/宽度和 Separator 宽度，不能将 API 与 CSS 几何混同。`:48–52` 在断言前保存 raw；`:92–96` 在70ms时明确确认仍 moving，才实际 setViewportSize。额外 observer 不接管库 ResizeObserver，不改回调、布局或调度。fixture `:45–59` 使用安装库真实 Group/Panel，公共 API 原样转发；changed 现用 useCallback([props.onLayoutChanged])，订阅回调稳定，前项源码审疑问关闭。旧默认700px/DPR1保留于 fixture`:68–69`。

opening 基准已于测试 `:63–85` 改为首个 W>0 且 V>0 的真实 moving 形态，首 positive 及之后每帧严格核 W/H、V≤W、raw V−W、caption/文本几何与样式；此前仅 V===0 的完全不可见 setup 跳过几何，raw、frozen mode 和内层/导航实例身份仍保存并核验，collector 没有后移。closing 使用 preflight，并核每帧单调不反增。仍为原0.1px几何容差，不能忽略任何 positive 首帧或 resize 帧。initialStored 和 preflight API 保留目标证据；本初始15/30/55为显式合法恢复目标，lastSidebarSize===15及 reopen 实测15%断言符合目标存储合同，不接受窄 overlay 或瞬时比例覆盖它。

`:99–141` 共8条双主题×DPR×两方向 closing、2条两方向 opening及1条并行 fullscreen；height1000、冷挂载前 restore、真实 React handler、terminal 最新模式及桌面目标偏好均覆盖。并行 click 明确为浏览器 DOM 合成操作，不计 Windows 输入/数据库/native 验收。AI/业务 body 和网络隔离仍是原 fixture 边界。

**测试源码审核通过，blocking=0，可执行当前冻结生产的首次真实 red 并保存完整 trace。** 这不是11条执行通过，也不是 Native10 P1关闭。需以 actual trace 分辨 CSS 与库 resize 定因后再最小实施；任何 scope 调整、red失败、源码修正、最新回归/build/native结果另记，不以旧通过代替。

## 首次实际 red 复核（生产尚未改）

只读核 `red/drawer-resize-m06-initial.tap` 与 `resize-measurement-red-m06/` 全11个raw。实际11 tests，**2pass/9fail/0cancel/skip**，duration41253.2482ms。两方向 opening通过；5条wide→899 closing/parallel在移动V反增失败；4条899→1800 closing首/all-moving段通过，但随后reopen15%实测失败。正常帧或2pass不能抵消生产阻断，Native10仍failed67。

典型 ink DPR1.5 实际 trace：1188.2 window-resize，viewport899、modewide、W269.703125；API6.793/38.207/55，但真实Sidebar flexGrow1/flexBasis0%、V9.546875、两个Separator均displaynone/width0。1188.5 owner唯一write输入11.4172628/33.5827372/55，返回11.417/33.583/55；1191.3公共change为22.834/67.166/10，metadata.requestedLayout仍11.417/33.583/55，writeCount不增。1200.7 rAF的V11.5反增，此后才正常writer回9.537/35.463/55。故CSS分配与late库像素再投影两条路径均已有真实证据；不能从这种Chrome red单独断言原Windows index7 18px异常只由哪一条引发。

与源 `globals.css:2112,2119,2125`、`desktop.css:477–480`、hook`:137,267–279,310–321`相符：frozen-wide仅覆盖display、旧媒体flex和Separator仍生效；正常首writer释放registrationpending后，late自然change没有active-motion协调。可据此提具体最小CSS/公有API协调补案，仍须独审其latestpose/secondary/restore/cleanup边界后才改生产。不得把实际V覆写成意图值或放宽原几何/单调断言。

反向reopen目前raw只到closing terminal，没有失败后的actual宽、available Panel sum、API和Divider配置；已要求作者先补只读证据。closed时一条Divider与open后两条Divider相差1px，可令15%像素goal转换产生约0.15px差；这是待确认候选，不能仅凭失败标题称overlay污染偏好，也不能直接扩大容差。应保原0.1px与15%目标断言，依据实际读回审最小目标/分隔条转换方案。

### Reopen 真实读回补证

只读 `red/drawer-resize-reopen-diagnostic.json`：closed wide时Panel sum1799、一条1px Separator、lastSidebar15；首次open terminal时Panel sum1798、两条1px Separator、实际Sidebar269.84375、API15.008、lastSidebar15.0083426028921。原15%合法目标应269.7，差0.14375px，+100ms settled完全同值。前述约0.15px转换候选已有真实读回支持；不是等待早，也不是overlay899px直接写成偏好。startSidebar在结构提交前以1799×15%形成269.85px goal，新增Divider后再除1798改变目标比例；补案需处理目标比例与注册后的合法可分配宽转换，不弱化0.1px/15%断言。

诊断也保留lastContent55→31.111、lastChat30→68.889的过程。单一协调的回写须使用该帧owner最新secondary/目标意图，不能将late库wholemap当用户目标持久化；具体合法settled投影和既有次轴行为在补案/代码复核时核对。本审核仍未改生产或自行运行诊断。

### Reopen 测试观测源码增量审核

当前test SHA **321176d7f2b04a9e30a42b2e4103a87ea474ebd6e26e58a20c7c44ce08c4ca6f**，fixture仍 **f834354494f0c672abf9eba208fd7b6aa1b4807caf02018d1e21a7ee8f74a345**。已完整读新增helper`:54–68`及调用`:127–130`：首次phase-open后同一个evaluate同步捕获actual、真实Panel合计、API、原adapter stored/lastSidebar、computed flex、Separator及配置；随后5rAF仅为诊断。原assert仍只用reopen.first.actual/available、15%与0.1px，不采用后续稳定帧。未改主collector/原frames/原期待或任何native规则。

本审核用Node24在内存中删除新增helper并将唯一调用块还原为前版两条读尺寸语句，重算SHA与已审 **88373a6fa53d08bb4ecf9dee978a41d0e8fca78e21cea0011d1f661aa026b33e**完全相同，证明只有这项观测增量。没有写回作者源。**观测源审核通过，blocking=0，允许以新专用stage保存真实诊断；原red-m06全11raw/TAP不得覆写。** 生产修正仍待具体补案，当前Native10 P1未关闭。

## 首红后三项最小补案独审（实施原则通过）

已读取实际trace/稳定reopen读回及补案`:31–45`，方案SHA **9b8d92df5832bcbdb39ab0a0e4d7ec34b69ad140f338e5089af6607aca7a2674**。**实施原则审核通过，方案blocking=0，允许按三项局部范围实施；生产P1仍blocking=1，不能计已修。** 原则信号给出前hook/Shell/CSS为3a486/174844/eefe；随后根代理按已批准范围加该唯一Separator规则，读回CSS SHA **fad7ee11ec2668d22648af8f35f67e77aceada39e9362fb99cf86e1ce64b58f4**。该时hook/Shell仍原hash，正式harness928aaff未动。

1. DOM `data-narrow-pane`仅在实际drawer.mode为narrow时输出，原state/adapter/持久化值不变；避免冻结wide时匹配globals的pane-specific flex规则。desktop CSS仅在既有frozen-wide规则旁覆盖直接已挂载Separator为display:block!important，与原条件挂载配合，不能增加分隔条、固定Panel比例或删除全局窄屏布局。已核原globals`:2110–2125,2127–2131`与desktop`:477–495`选择器：wide覆盖显示的同时须停止pane-specific flex并覆盖Separator隐藏，真正使用库Inline尺寸。旧“无CSS修改”范围在此被这一个有证据的局部规则替代，其他CSS/业务范围不扩大。

2. 最近owner像素pose从真实动作起点取得，以后由原rAF更新；window/Group resize、公共callback及原有限MO在wide Sidebar整个motion与注册pending期间，按实际Panel可分配总宽重新合成该帧current。仍用原最新secondary轴/轴值和唯一write，非writing、API完整、真正不同才补偿；不读取异常DOM Sidebar宽作为pose、不拿库旧wholemap写target/偏好。自身style同值不写、narrow/idle不接管、原Observer根范围/卸载disconnect/restore取消保持。实际geometry在真正公有API复钉后读回，不制造V/clamp。该边界覆盖已观察到owner新宽写后库late投影的窗口，但代码需证明callback/MO去重时仍无首帧漏采或补偿自循环。

3. 非换向wideopening保留合法目标百分比，仅在V0、真实DOM结构注册后、首positive之前，使用实际挂载Separator后的Panel总宽初始化完整W/像素goal；不假定1px，后续motion/resize/reverse都保持该W/goal。保证源码只初始化一次，restore取消该记录，次轴使用共同最新目标。它解决已证实1799→1798的目标漂移，不能通过改期待15%或0.1px接受漂移；完整W在首positive及以后任何moving帧不变，旧reversal/explicitrestore/unmount与新11原断言均保持。

实施后必须核原28＋新11全帧/持久化/普通拖宽/typecheck及独立源审，再最新core/完整52与scope50各自事实、UI/desktop新构建、冻结正式验证器真实Windows。旧首次red11与Native10失败不改，Chrome修正通过也不代表真实Windows已通过。本审核未修改生产/测试/fixture或启动任何目标系统。

## 当前代码阶段状态

M06最新源码已由本审核者在 `2026-10-13-sidebar-drawer-code-review.md` 完成独立增量审核，**code-review blocking=0 / passed-for-latest-regression-and-target-validation**。新11＋原28实际39/39pass、类型检查exit0；实际原始帧及首次reopen均保原严断言，当前14项SHA与执行者报告一致、其中10项已知执行前expected稳定。原生产P1的Chrome专项修正和代码门禁完成，Native10历史failed67不改；最新完整回归/新构建/真实目标验证尚待根代理执行，不能将本阶段称原生全部通过。
