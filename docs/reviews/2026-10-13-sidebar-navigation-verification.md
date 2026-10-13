# 左侧导航 v8 验证记录

批准与实施开始：2026-10-13，最终验证：2026-10-14（Asia/Shanghai）。用户已批准v8 UI。M06修正经方案/测试源/red/green/独立代码审核，当前明确导航范围50文件516/516通过，TypeScript和新UI→desktop构建通过；新的Windows development-11完整可达矩阵87/87通过，原01–10失败保留。全仓core仍38失败/1取消（均在实施前基线），完整browser仍19个另项CD失败，故allAcceptancePassed=false；本报告不宣称仓库全绿或安装包验收。证据根 `docs/evidence/sidebar-navigation/`。

## 已完成的正式检查

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 独立技术方案、测试用例审核 | 通过，无阻断 | 本目录 sidebar-navigation-plan-review、test-review |
| 独立导航、抽屉及跨断点补审 | 导航/M06完整代码与最终11执行证据独审均通过、blocking0，本次实际resize P1关闭；全仓failed和未执行边界保留 | sidebar-navigation-code-review、sidebar-drawer-code-review；2026-10-14-sidebar-navigation-final-evidence-review；M06 plan-review |
| 新正式 SidebarTree 首轮行为 red | 两项失败：缺品牌、缺五分类 Tabs | red/real-component.tap |
| 跨断点最新收放意图 red | 三项真实失败，旧模式覆盖最新指令 | red/drawer-cross-intent.tap |
| 导航专项 | 20/20，通过 | green/navigation-final.tap |
| 抽屉专项及跨断点/纯逻辑组合 | 18/18，通过（9抽屉、5最新意图、4纯逻辑） | green/drawer-cross-intent-final.tap |
| 最终布局、guard 及原导航单元回归 | 14/14，0失败/取消/跳过 | green/unit-final.tap |
| 首帧修正前全部浏览器 | **48文件、495测试、495通过、0失败/取消/跳过**；当次源hash不变；后续新源的52/50结果另列，不能替代 | regression/browser-before-native-drawer-fixes.json、browser-before-native-drawer-fixes.tap |
| 最终 TypeScript | exit0 | green/typecheck-final.json、typecheck-final.log |
| 正式 UI 与 desktop 构建 | Next 静态 export、集成 TypeScript 与 Electron main/preload/service 均 exit0；Node24.19.0 | green/build.json、build-ui.log、build-desktop.log |
| 真实试验场事务 red / green | 新正式route/PGlite3项：red 1通过/2失败（实际500）；修正后连原内容事务/adapter共19/19，0失败/取消/跳过 | red/scenario-transaction.tap；green/scenario-transaction.tap |
| 最终服务 typecheck / rebuild | 事务一行修正已独立审核；tsc和desktop main/preload/service重新构建exit0，静态UI源/out未变 | green/typecheck-service-final.json、build-service-final.json；sidebar-scenario-transaction-review |
| 抽屉首帧增量方案/用例源/最终代码独立审核 | passed-for-regression-and-target-validation，blocking0，核当前完整源和12文件前后hash稳定 | sidebar-drawer-measurement-plan-review、sidebar-drawer-code-review末段 |
| 当前完整逐帧增量 | **10/10，0失败/取消/跳过**；第一帧、全部moving、原V≤W/rawV−W/容差不变；包含restore/unmount/手拖 | green/drawer-expanded-measurement-final-10.tap；measurement-green-final/*.json |
| 当前原抽屉/意图/纯逻辑回归 | **18/18，0失败/取消/跳过**；TypeScript exit0；12文件前后无变化 | green/drawer-pixel-observer-original-18-final.tap、drawer-first-frame-typecheck.txt、drawer-first-frame-final-report.json |
| M06最新全仓浏览器 | **52文件、535测试、516通过、19失败、0取消/跳过**；1068项源hash无变化。19失败均来自另项待实施右内容抽屉两文件，不能称全仓通过 | regression/browser.json、browser.tap；sidebar-browser-scope-review |
| M06最新明确导航范围浏览器回归 | **50文件、516测试、516通过、0失败/取消/跳过**；旧48加measurement和resize，明确排除另项两CD文件，1068项源hash无变化、exit0 | regression/sidebar-scope-browser.json、sidebar-scope-browser.tap、run-scoped-browser.mjs |
| M06前正式 UI/desktop 重建 | 历史core之后按序重建，Next静态export/集成TypeScript和desktop main/preload/service均exit0；该历史hook为3a486，不能当0669新源的构建 | green/build-navigation-final.json、build-navigation-final-ui.log、build-navigation-final-desktop.log |
| M06最新专项、类型及独立代码审 | **39/39，0失败/取消/跳过**（新11＋原28含pure4），TypeScript exit0；14个当前SHA核一致、其中10个执行前known SHA稳定；独立代码阻断0 | green/drawer-resize-m06-report.json、drawer-resize-m06-01.tap、drawer-resize-m06-original-28.tap、drawer-resize-m06-typecheck.txt；sidebar-drawer-code-review末段 |
| M06最新完整core | **274文件、1977测试、1936通过、38失败、1取消、2跳过**；完整比较无新增剩余失败标题、1358输入稳定，仍failed | regression/core.json、core.tap；上轮中止另存core-m06-parallel-budget-exhausted.* |
| M06最新UI→desktop顺序构建 | 两命令均exit0、statuspassed，19项源SHA前后相同；完成后才开始Windows11，无并行构建/测试 | green/build-navigation-resize-final.json、build-navigation-resize-final-ui.log、build-navigation-resize-final-desktop.log |
| 最新实际Windows可达矩阵 | **87/87通过**；28完整capture/1107总rAF/856moving，其中832严格几何样式比较、24零Vsetup仍核identity/count；33实际HWND命中通过，另2inconclusive不计；31源/351bundle/exe稳定、errors/观察HTTP0 | windows-development-11/report.json、actual-summary.json、verification.md；原01–10保持failed |

专项数量与全量有重叠，不相加制造总通过数。HTML 的53组设计检查及17场景/787帧只证明设计稿，不计正式测试。首次缺模块/浏览器、fixture loader 和测量 separator 的诊断保留，不当作业务 red。

## 全量回归保留的失败

M06最新完整浏览器52文件实际完成：535测试、516通过、19失败、0取消/跳过；1068项源hash无变化，失败全部仍为两个CD文件，完整结果保持failed。明确范围50文件随后单独实际完整通过516/516，0失败/取消/跳过、1068源hash稳定、exit0；两run有重叠，不相加。历史51/524及49/505保留在 `browser-before-native-resize-fix.*`、`sidebar-scope-browser-before-native-resize-fix.*`。

M06 core与浏览器并行的一轮达到原900000ms整轮预算，由runner自动终止其自己启动的测试树；实际910342ms、源1358项稳定、只交付603个顶层结果/29个not-ok、没有最终counts。归档 `core-m06-parallel-budget-exhausted.json/.tap` 及对应前后source快照，状态budget-exhausted，不能称完整回归或完整基线比较。四个新增已交付标题为3个brand-data迁移60000ms timeout及ROOT11-07启动wake timed-out；并行资源干扰是待核假设，不据此免责。之后在无浏览器/构建的独立时段完整重跑，保留concurrency2和测试自身timeout/断言，只将外层整轮runner预算增加为1800000ms，精确变更经 `2026-10-14-sidebar-core-budget-review.md` 独审。

**最新独立时段core完整结果：274文件、1977测试、1936通过、38失败、1取消、2跳过，exit1，543526ms。** 未耗尽新整轮预算，1358输入前后SHA一致、stableSources=true、sourceChanges=[]、完整comparison=true；39个失败/取消标题全部在实施前基线，新增剩余失败标题0，14个旧失败本轮实际通过。上轮4个超时标题本轮逐一实际通过，不拼接两run统计，也不将其恢复等同于证明CPU根因。`regression/core.json/.tap` 保留全部最新失败，因此全仓core仍是failed。

M06之前的完整core递归274个 unit/integration 文件：**1977测试，1936通过、38失败、1取消、2跳过，exit1**；486610ms内完整执行，未耗尽900000ms预算，现保存在 `regression/core-before-native-resize-fix.json/.tap`。实施前独立基线为1966测试、1911通过、41失败、12取消、2跳过。该历史完整比较中39个失败/取消全部在基线中；新增剩余失败标题为0，14个旧失败实际通过。这只证明该次源没有新增失败标题，不能替代M06最新重跑或把core称作通过。

剩余包括既有 worker 响应旧断言、cold-source/ownership、Windows ESM/路径、旧 VM 依赖和设置/UI断言等；具体失败和原输出保留在 core.tap，基线分类不是每项根因证明。本次未修改无关业务以掩盖失败。

M06前上述完整core包含已审核的首帧/像素/注册修正、试验场事务修正及新增真实route/PGlite三条；1357项输入hash前后一致，`stableSources=true`、`sourceChangesDuringRun=[]`。更早273文件/1974项的结果保存在 `core-before-native-drawer-fixes.*`；该历史run准备验证器时hash变化而stableSources=false，不能替代后续快照。当前专项和全量数量有重叠，不相加。

全部浏览器失败历史保留：

- `browser-before-compatibility.*`：490项、477通过、13失败。旧“作品阁”定位、历史构建 CSS 和旧窄屏双栏假设被批准的新 UI 替代；只修相应三个测试的定位/当前CSS/终态期待，原业务安全断言保留。修正后原三套件22/22通过，说明见 green/browser-compatibility.md。
- `browser-during-build.*`：484项、483通过、1失败。主代理把 UI 构建与浏览器并行，旧 configuration-transfer suite 在 `.next/static/chunks` 暂缺时未能加载（其12项未执行，不计通过）。构建完成后完整48文件重跑，最终495/495通过。没有修改该套件或用局部重跑合并成全量通过。
- `browser-before-native-resize-fix.json/.tap`：历史51文件524项，505通过、19失败。相较旧48文件，新增10条首帧测量文件及另项 `content-drawer.test.ts`、`content-drawer-popup.test.ts`；全部19个not-ok标题均为CD系列新契约。这两文件要求右抽屉固定形态、保活/局部portal暂停、contentPhase/恢复标记/编辑命令门控，属于另项内容抽屉批准方案，本次左导航边界只授权右caption恢复联动。独立只读范围审计保留该项尚未实施及用例补审边界，不把其失败当本次合格TDD red，也不改/删除它们。该历史51文件全仓结果保持failed；当前完整52结果见上。
- `sidebar-scope-browser-before-native-resize-fix.json/.tap`历史另行完整执行49文件：旧48加首帧测量，505/505通过、0失败/取消/跳过、exit0，源hash无变化。runner核排除恰为上述两个CD文件，否则中止。该结果不代替全仓通过；当前50文件新增resize、516/516通过另见上，历史两run未相加。

19项失败不一概归为已证明的产品根因：其中CD-06业务Dialog最终断言为隔离Select实际文本`two`与fixture期待`第二项`不符。该项用例审核仍有自身P2边界，具体诊断见独立scope-review；本报告只核实失败文件与范围，不替另任务完成用例/实现审核。

## SN-01–16 对照

| ID | 已执行覆盖 | 实际 Windows 补充 |
| --- | --- | --- |
| SN-01 | 32px创建入口/14-20字体/图标/新对话无选中、原创建与会话动作；导航专项 | 11实际几何、创建入口/会话动作和编辑器保留通过 |
| SN-02 | 72px账户区/52px按钮/32px头像、长资料条件渐隐 | 原账户菜单及真实编辑用户手动保存、长资料fade通过 |
| SN-03 | 导航属性项移除，原 registry/类型/业务面板保留 | 实际入口不存在通过；不声明重验完整AttributesPanel业务 |
| SN-04 | 双主题三栏宽、长短名称、实际溢出mask、字号/抽屉帧 | 11双主题/zoom0.75、1.25、2/字号11、24及长资料通过 |
| SN-05 | 单行入口、唯一modal、CRUD/取消焦点、POST一次、guard竞争 | 11真实PGlite/IPC创建/改名/删除通过；失败注入/guard竞争仅归隔离fixture |
| SN-06 | 宽/窄/短窗、原分栏几何和账户固定 | 实际899/760×600与wide/zoom读回通过；精确580高度未通过的历史不改 |
| SN-07 | 原组件/缓存/动作/右侧状态保留；旧业务回归、构建 | xaanink://app离线、0模型、初始main监听0、真实Monaco和原生命中通过 |
| SN-08 | 场景单行、分类/fold不改scene prefs、原reset-before-guard | 实际单行及原管理入口通过；guard竞争由fixture验证 |
| SN-09 | 五Tabs鼠标/键盘/roving/独立视图、右状态不变 | 实际分类与Monaco同实例/可见未提交草稿保留通过 |
| SN-10 | 所有作品/伏笔角色/卷章/绑定及未绑定会话；错误重试 | 11实际两作品/8正式＋2伏笔角色/卷章及对话通过；错误注入仅fixture |
| SN-11 | 上16下12、四徽标贴姓名后6px、名称独立fade | 实际角色几何与双色截图通过，照片保留 |
| SN-12 | 固定形态/反向/并行/restore/断点/减少动态/焦点/偏好 | 11全部28段实际帧/33成功WM_NCHITTEST/正常cold恢复/可达empty路径通过；emptyfull不可达未执行 |
| SN-13 | 外层/未选含hover透明、选中中性细边、设定六入口 | 实际双主题/设定入口通过，paper/ink截图已保存 |
| SN-14 | Folder两状态/石灰色、左Pointer、角色同色、照片/章节status保留 | 实际本地资产/四身份色/照片/五章节形态、右Tabs原Sparkles通过 |
| SN-15 | view+ID独立fold/保活/正文菜单/统一维修/scroll意图 | 实际折叠及空正文根菜单通过；维修原控制器仍由原core/WL与browser覆盖，不伪称全目标业务重验 |
| SN-16 | 原双主题Seal、品牌尺寸/间距/安全区 | 实际本地Logo加载、品牌几何及缩放通过 |

## 真实目标执行边界

验证器 `scripts/verify-sidebar-navigation.mjs` 用正式 Workspaces/PGlite/Prisma/DraftJournal，在新建且检查为空的 owned temp 目录放公开合成数据；完整产品 React、真实IPC/设置/业务请求，没有mock业务body或注入renderer store。操作输入由 CDP 合成；原生区域另外向实际 HWND 发送 WM_NCHITTEST，记录真实窗口DPI和Electron zoom，并将调用线程设为PMv2后恢复。代码审核和计算样式不替代实际命中。

每次运行有独占 evidence label，失败不覆盖。每rAF重新读取选择器和DOM身份/数量；第一个W>0/V>0 moving帧确定完整形态baseline，preflight/准备/全部帧仍保存。原生DOM几何容差0.15 CSS px、W 0.05、平移0.1，字体/颜色/背景/渐隐/文字严格一致。终态正常resize不混入moving不变检查；不沿用HTML旧数值。调用原生前后点位/元素/phase不一致记inconclusive，只允许仍moving时重采，不能用settled替代中间帧。

以下Attempt01–10及M06首次red/诊断段记录各历史时点的事实；其中“正在”“待执行”“待独审”仅指当时状态，当前最终结论以末尾development-11节及最新检查表为准。历史失败和未执行条目不被后续通过重标或删除。

Attempt01（windows-development-01/report.json）失败于验证器错误地要求账户3个menuitem，原产品实际是账户Label、主题Switch和一个设置项；4项部分检查已通过。修后补审并保留新hash。Attempt02失败于验证器用通用settings update修改用户，真实服务正确拒绝；5项部分检查通过。改为真实编辑用户UI手动保存并补审。这两轮均无pageerror/HTTP，生产/包/exe hash稳定；部分通过不代表完整目标通过。

Attempt03（10项部分记录）揭示真实试验场PATCH500产品缺陷，实际服务复现、red/green、独立增量审核后按前述一行修复；失败保留。Attempt04（13项部分记录）真实CRUD、创建入口、历史对话、Monaco保留通过，停在媒介moving selector遗漏原非空caption工具名称。补充原固定右端「显示 / 隐藏内容面板」和compact「所有标签」，同点/同DOM/phase/clip/实际HT判定和逐帧断言均保留，独立补审后再用新label。04的5个中断帧是incomplete，不能当完整抽屉通过。最终完整目标结果仍待执行结论。

Attempt05（14项部分记录）暴露真实首帧：preflight V=W287.75px，首moving V359.8646px/offset0，V−W差72.1146px；下一帧亦超原0.1px。通过冷挂载测试追踪实际Group注册缓存后修正，历史05仍failed，未去Math.min、跳帧或放宽阈值。

Attempt06使用最终已审源和重建产物，24项部分记录通过，源/包/exe稳定且pageerror/HTTP为0。wide-close/open、反向、反向后打开、并行全屏收起五段完整帧通过；对应163个已逐帧比对样本，最大内部几何差约0.00003052 CSS px，实际WM_NCHITTEST部分通过。之后parallel-fullscreen-open采样器在固定y线上找不到真实clipping区空白点，在native.probe之前失败，3帧保留incomplete；不能把这轮标完整Windows通过。正在保存实际caption/viewport几何并独立审核合法选点增量，最终完整目标仍待。

Attempt07在独审的原扫描行优先/0.9高度备用行后，59项部分记录及18段完整帧通过；失败为请求899×580而实际outer900×582/content899×582，height误差2超过原1DIP。实际对照两窄宽×580/600及wide往返后，600请求得到content/renderer实际600、outer601，符合原1DIP；仅正式窄窗口请求改600，两宽保留，未改变产品minimum760/580或放宽误差。精确580未通过，不能被600替代标真。

Attempt08保留failed/77项部分记录：25段完整capture、766个moving采样（744个几何比对样本）、最大几何差0.00006104 CSS px；30次native记录中28次通过、2次点位移动inconclusive后在仍moving时重采，未算成功。正常cold target恢复已通过；最后空fullscreen cold seed前提失败。原recovery在无有效Tab且contentVisible=true时将layout保留为TARGET_UNAVAILABLE；关闭最后Tab又会同步恢复Chat并在终态卸载Content，现空header没有fullscreen入口。真实UI诊断证明随后Chat的显示内容可开启空Content，Chat可见，具有合法empty caption。错误seed假设被撤回；独审将最终目标用例改为该真实可达路径，空fullscreen左恢复分支仍由既有React/API fixture验证，实际目标不可达/未执行明确单列，不修改recovery或注入store来制造。

Attempt09保留failed/78项部分记录。独立空内容实例的首次close capture中，第二作品真实详情查询刚完成，preflight144个项变146，新增的是“暂无正文”row/label；原身份/数量断言拒过，未放宽。只读最终DOM及原IPC响应证明Works实际包含8正式+2伏笔角色，伏笔nonflat加载时无spinner而返回null。独审的最终前置在动作前等待两作品标题、8/2角色、两绑定会话、第二作品空正文及无loader/alert，并记录真实Works就绪状态；不改加载行为、采样基线或动态接受新项。历史部分结果不拼接成通过。

Attempt10保留failed/67项部分记录，源/包/exe稳定、pageerror/HTTP为空。`closing-across-899-breakpoint-frames.json` 的32帧全部保留：固定W267.0833435px，index6仍closing/wide、V83.15625px；index7仍closing/wide但V285.0833435px、offset0，实际raw V−W误差18px；index8恢复V84.8020859px。实际窗口content899×1000/outer900×1001满足原1DIP规则、内部身份与52节点保持，但这一帧确为产品宽度溢出，正常前后帧和旧attempt08通过不能覆盖。当前不重跑旧源争取通过，也不放宽V≤W、raw等式或采样时机；新增真实Group自然resize/API/CSS trace及双向跨断点用例先独审、red，再最小修复、代码审核、全量和全新Windows attempt。

M06增量方案与测试源已独审后首次完整执行11条：2通过/9失败、0取消/跳过，原始TAP `red/drawer-resize-m06-initial.tap` 及全部11段 `resize-measurement-red-m06/*.json` 保留。5条wide→899 closing/parallel出现实际V反增；4条反向运动逐帧合格但后续reopen宽度偏离15%目标。真实记录确认两条干扰：旧媒体规则把冻结wide的Sidebar flexGrow强制为1并隐藏两个Separator，而公共API仍为动画比例；自然Group resize又在owner写11.417/33.583/55后，以旧axis投影成22.834/67.166/10，requested map未变。此记录支持修复CSS及resize协调，不能直接声明原Native10的18px全部同因或已解决。

只读reopen诊断 `red/drawer-resize-reopen-diagnostic.json` 记录首次open终态及100ms后都为实际269.84375px、available1798px、API15.008%、lastSidebar15.0083426028921；原15%应269.7px，差0.14375px。动作前closed只有一个Separator、available1799px，像素goal1799×15%=269.85；新增Separator后按1798px投影，数值吻合且不是过早读取。后续具体最小CSS/resize/目标转换方案、修复和最新验证仍待独审，不放宽0.1px或采用后续样本替代失败。

macOS、物理鼠标拖窗、Windows IME、NSIS安装和无关业务全组没有执行。Renderer网络观察从firstWindow之后开始，各次冷启动分别观察；不声称是启动全程或全系统网络审计。最终 core 仍非全绿，`allAcceptancePassed` 保持false。

## 最终development-11完整目标

新构建完成后单独执行冻结harness928aaff/seed6e3bd，不与core/browser/build并行：actual Windows Electron44.6.0，87 checks全通过、28完整capture、1107总采样/856moving；832样本自首W>0/V>0基线起严格核几何/样式，另24个准备样本实际V均0，raw全部保留且identity/count仍检查，不称856全做可见几何比对。最大内部几何漂移0.00006103515625 CSS px，原0.15几何/0.05W/0.1平移及严格字符串要求不变。旧10的closing-across-899路径已实际通过，旧失败仍保存。

33个实际HWND WM_NCHITTEST通过，真实DPI144、PMv2线程；caption HTCAPTION2、工具HTCLIENT1。另2个点位漂移记录inconclusive、不计通过，在仍moving的限定重采后通过。空态用普通合法2Tab journal、原UI关闭两Tab到0/Content卸载/Chat显示空Content形成；Content自有caption/hide定向验证与Chat拥有的restore/leak区域分别记录。正常collapsed冷恢复、键盘恢复及empty开/收全部帧通过。不可达cold-empty-fullscreen分支和NSIS/mac/物理拖窗/IME仍未执行。

31源/351bundle/Electron exe前后完全一致，报告SHA256 `af8261fc4327d68521c1f3c14e63dcc7c3d3cbec329062169565d5afdf13051d`。真实Workspaces/PGlite/IPC、0模型、初始main监听0、观察到的pageerror/HTTP0；不扩大成全启动网络审计。10张实际截图及逐文件SHA在actual-summary.json；主代理已视读ink角色与paper作品。Node24.19.0执行assert式target runner exit0，不虚构TAP格式；Electron内部Node版本另由实际runtime记录。

最终事实独审 `2026-10-14-sidebar-navigation-final-evidence-review.md` blocking0，本次实际resize P1关闭。独审逐一核28 raw/10截图SHA/31源/351bundle/exe，832可见样本最大W差0、raw平移误差0.01020813px、overflow0。空态moving时caption归Chat、右端内容工具归Content；empty自有caption/hide归Content，hidden泄漏区caption与工具归Chat，不能将不同owner合并描述。scope50只排除原两CD文件的范围也已独核。全仓failed及所有未执行仍保留。
