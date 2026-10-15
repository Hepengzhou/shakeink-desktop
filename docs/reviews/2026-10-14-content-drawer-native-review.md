# 右侧内容抽屉真实 Windows harness：独立审核

日期：2026-10-14（Asia/Shanghai）。只读审核 `scripts/verify-content-drawer.mjs` 和 `docs/reviews/2026-10-13-content-drawer-native-cases.md`，并核对现有真实 seed、HWND helper、Monaco、ItemLevelPicker、命令门控源码。本代理只写本报告，未改生产源、脚本、seed 或其他测试。

最终补审结论：**原 N-P2-1/2/3/4 已在实际源码与用例文档中关闭，native harness 通过独立准备审核；正式实现、独立 code review 和匹配构建完成后，可按本 harness 执行真实 Windows/目录包验收。** 当前无未解决的 harness 准入阻断。只做静态审核和 bundled Node v24.19.0 `--check`，未运行 harness、启动产品或创建数据库，不能把本文视为目标系统通过证据。Browser red/TDD 准入由单独正式用例审核决定，已完成准备审核；产品执行结果仍由主代理分层记录。

## 最终修订补审

| 原问题 | 实际修订与核对 | 结论 |
| --- | --- | --- |
| N-P2-1 phase/首帧 baseline 漏验 | `startCapture` 动作前记录真实 journal/Group/separator 与 preflight；`stopCapture` 由 actual V 对 pre/final 的变化和 phase 的联合区间取连续全帧，非终态 V 不许提前结束 phase。Closing 用完整 preflight；普通 opening 用最终合法完整形态；仅命名 resize/live-zoom case 用动作前独立合法 target W/H，再固定首可见控件/行框。实际 closed V≈0/open V≈W另验。 | 关闭。首可见帧不以自己的错误 W/H作为唯一正确 oracle；至少 4 个真实中间 V 样本，不能只用标签帧充数。 |
| N-P2-2 reduced 标签假失败 | reduced 比较所有采样 V 仅为旧/新几何端点，允许 bookkeeping 标签，非零端点仍验证完整形态和合法终态。 | 关闭。 |
| N-P2-3 inert 结构绑定 | 按真实 inner/tabs 的 `closest('[inert]')` 观察合法祖先，不要求 viewport 自己带 inert；open/hidden恢复检查同样修订。 | 关闭。 |
| N-P2-4 可达命令与 direct Picker 因果 | 真实 Select 改 `desktop.command('view.content')` IPC，Popup焦点保持且无 outside click；原始 Popup 状态逐帧记录、仍 visible 则必须 actual inert，重开不复活、主动输入可再开。Native direct Picker明示普通 caption外点击生命周期；新增 Browser实际Picker无外点击case承担context因果，已完成源码补审。文档矩阵与IPC路径一致。 | 关闭。没有扩大无关 DesktopCommandController 范围，也不冒称被listbox/Dialog门控阻止的键盘路径已执行。 |

额外补核：native 几何仅排除元素自身隐藏 input/aria-hidden proxy，避免已实测的 BaseUI Select fixed 1px form proxy 被当作可见字段；不按 drawer aria-hidden 祖先过滤，动作期真实内容继续测量。表单在真实“已保存”状态后采样，保留实际业务保存机制。用例文档已写明运行使用仓库 Node 24，脚本创建证据/夹具前拒绝旧 Node，记录实际 harnessNode；本次语法检查确由 v24.19.0 执行。

以下为初稿问题与源码依据的审核历史，已在上述补审关闭，不再作为当前阻断。

## 已确认的证据和作用范围

- 脚本使用真实 Electron/目录包、真实协议 React 工作区和现有 Workspaces/PGlite/IPC/DraftJournal seed；通过 `SHAKEINK_TEST_ROOT` 和 bootstrap 根校验隔离用户数据，0 模型，不替换 renderer body，不导入 renderer store，不创建 fake Monaco。实际表单仅作代表性形态，不冒称全部 29 面板业务验收。
- 实际 Monaco 从 React hook 的对象发现，随后比较 editor DOM、editor/model 对象 identity、model ID、dispose、文字摘要、selection、scroll、version/alternativeVersion/layoutInfo。隐藏不可见用 `isConnected` 而非 `isVisible` 判断保活。撤销标记在动画之前建立，动画后真实 Ctrl+Z/Ctrl+Y验证既有历史，冷启明确为新实例。
- 每段重新查询活动 panel/caption/Tab/控件/Monaco 行节点并分配 WeakMap identity，保存直接文本 DOM Range 行框和 textarea 行内容 extent，而非只比较外壳宽度。Native HWND 调用保留原 helper，真实 zoom/DPI/client origin 转换和前后点有效性检查，不能把漂移或 settled 命中计为 motion 通过。
- Evidence label 限定并拒绝 EEXIST，源/构建/exe hashes 前后比较，不覆盖失败证据；仅合成界面截图，文本报告清理隔离路径/home/Key 形状，无递归删除或移动。离线观测从 firstWindow 开始的边界写清，未宣称 pre-entry/service-worker 无网络；main listening Server 另验。
- Scope 区分开发和目录包、CSS 几何与用户主动 zoom 的物理缩放，macOS/真实 IME/物理鼠标拖窗/NSIS/system DPI 列为未执行项。
- 独立只读命令：bundled Node v24.19.0 `--check scripts/verify-content-drawer.mjs` 退出 0。它只证明语法。

## 初稿 N-P2-1（已关闭）：phase-only 筛帧及自选首帧 baseline 漏验

初稿 `startCapture` 第 121 行用第一条 phase=opening/closing 且 V>0 的样本作为完整 baseline；`stopCapture` 第 126、129 行仅比较 phase moving、且跳过 baselineIndex 之前的样本。若实现提前改 phase 或首个可见帧已被缩窄，可能跳过不利样本，或把错误首帧本身当作正确完整形态。

最小修订：用实际 V 对动作前/最终稳定 V 的变化界定连续运动区间，phase 仅增加冻结帧而不能排除实际运动。非终态 V 必须保持 motion phase；首个可见帧从独立完整形态基准验证，不依赖其自称完整。Closing 使用 preflight 的实际完整 W/H；普通 opening 用合法目标/最终合法完整 W/H交叉验证；full、跨断点/live zoom 的允许最终 reflow 单独标注。零 V 注册准备帧可以保留，但不能跳过任何首个可见错误帧。

## 初稿 N-P2-2（已关闭）：减少动态效果不能仅以 phase 字符串为判据

初稿第 127 行 allowInstant 要求零 phase moving 帧。合法 React/注册时序可能有瞬间 opening/closing bookkeeping，实际 V 已是 0 或完整终态，没有任何挤压中间帧。这会把生命周期标签当成用户可见动画。

最小修订：reduced 只允许实际几何端点，断言没有部分 V/挤压帧并最终落位。保留短暂 phase 记录，但不能仅据此认定用户约束失败或通过。

## 初稿 N-P2-3（已关闭）：inert 判据不应绑定某个 wrapper 属性

初稿第 118、150–151 行读取并断言 viewport.inert。方案只要求真实内容不可聚焦/点击，inert 放在合法 Panel/inner/viewport 祖先均能满足；Browser fixture 已用 closest 观察实际内容。

最小修订：按实际 inner/tabs 的 inert 祖先及显示状态判断 interaction pause，不要求特定 wrapper 的直接属性。Open 时无不可见祖先；hidden/motion 时真实内容被暂停，兼顾 Portal 的独立 owner 验证。

## 初稿 N-P2-4（已关闭）：真实 popup 命令路径与直接 Picker 因果覆盖

初稿 Select 用键盘 Control+Alt+R 收起，但现有 `DesktopCommandController` 对 listbox 目标提前返回；直接 ItemLevelPicker 的 Popover 默认 role=dialog，又会触发现有 any-dialog 的全局命令门控。不能把这些既有路径限制当作新的动画失败。Native ItemLevelPicker 外部 caption click 本身会关闭 Popover，漏接暂停 context 也可能通过生命周期路径。

经主代理决定采用最小路径：保持生产 DesktopCommandController 的本次范围不变；Select 可通过实际 `window.desktop.command('view.content')` IPC 触发公共命令，并核对没有被现有 Modal 门控阻断。Native ItemLevelPicker 保留诚实的 outside-click+pause 共存生命周期范围，不宣称单独证明 context 因果；Browser fixture 增加真实 ItemLevelPicker、合成空 query 缓存和无外点击的真实 Shell 命令调用，独立验证首 rAF暂停、不复活和新操作重开。新增实际 case 完成补审后，才把 direct context 行为算作覆盖。

## 补审及执行要求

作者已完成上述修订，本代理按最终实际源码和 native cases 复核，actual-V interval、独立 opening oracle、reduced 及真实 IPC 范围一致。无需为验收扩大无关快捷键/业务服务范围。

实现、独立 code review、匹配构建完成后才运行 native script。每次新 label 单独保存原始全帧、命令结果和真实 HWND 结果；失败/漂移/未完成 capture 保留，不能事后覆盖。正式产品、全仓回归、29 类业务和未执行平台仍按台账各自记录，本专项语法审核或代表性形态不替代它们。

## 真实执行后的窗口 DPI 准备补审（N-P2-5 已关闭）

已实际读取 `docs/evidence/content-drawer/windows-development-01/report.json`：初次隔离产品 launch 离线、0 models、无 main listening server、renderer errors/HTTP 均空、sources/bundles/executable 前后稳定；随后旧 `bounds` 在 native outer1801 对 request1800 精确断言失败，尚未进入任何抽屉动画采样。status=failed 保留，不将启动成功或 helper 修订计为动画验收。另核既有真实 `sidebar-navigation/windows-preparation/development-07-bounds-snapshot-01/snapshot.json` 及 diagnostic 文档：相同 Windows display scale1.5 下外框与实际 content/renderer 不同，最小高度还会发生真正 clamp，不能无条件放宽尺寸。

当前 `scripts/verify-content-drawer.mjs:82–115` 与 native-cases `27–33` 一致：保留调用参数的 native DIP 语义，按实际 zoom 求 `round(request DIP/zoom)` 的 CSS 目标。每轮完整记录 request/adjusted request、outer/content、renderer inner/outer、dpr/visualViewport、zoom/display scale、mode/phase；outer 对本轮 request 的 1 DIP 仅用于有实际证据的外框量化，实际 innerWidth/innerHeight 必须零容差精确达到目标，不能以 outer 容差假称进入899/900断点。CSS miss 仅在不超过2px且非最小值/clamp时可按真实 delta 的方向逐轴1DIP补偿，最多4轮、总偏移3DIP；不可达则保留观测并失败，不改生产阈值或几何 oracle。

两次原 in-flight 宽高 / 断点调用统一该 helper 的 `settled:false`，只等两 rAF，连续原始 capture 保持，未调用 animation settle。补审发现初稿仅要求 moving phase 仍可能把终态注册 bookkeeping 当成实际 resize 运动；已最小补强 `84–87,103–104`：发出原生 resize 之前和精确 CSS 目标达成时均记录真实 V/W/H，要求 `0.2 < V < W−0.2` 且同一 opening/closing方向。完整实际动画区间 / W/H / 全文行框 / 控件 / 平移及最终合法 mode 的原断言不变。

独立 bundled Node24.19.0 `--check scripts/verify-content-drawer.mjs` 实际退出0；补审版本 SHA-256 为 `6c053bfdc8fa8ada1fda3fab4bc5cb9e7839f17bbd2617efb26a41c49b7386d6`。DPI / in-flight 准备修订无遗留阻断，准入新 label 的实际 development / directory run。审核者未运行这个补审版本，不据静态 helper 逻辑、旧 sidebar 或 development-01 启动部分结果声明当前 drawer/native 通过。

## 三阶段保存的真实准备就绪补审（N-P2-6 已关闭）

已实际读 `windows-development-02/report.json`：status=failed、源 / bundles / executable 稳定、HTTP和renderer errors空；新版 strict CSS bounds、caption HWND初校、三个原生窗控命中和真实Monaco动作前baseline有部分通过，随后正文准备等“已保存”15s超时，尚无动画 capture。`staged-save.ts:225,228,234` 的正文/角色/主题 PATCH 白名单和 `use-autosave.tsx:86–100` 的三阶段指示意味着合法暂存期间 controller saved 与 UI“待保存”共存，不能通过强制落库、确认 / 发送修改、禁用 autosave 或修改生产文案满足旧文字等待。

限定修订已核 `verify-content-drawer.mjs:120–160` 及正文 / 角色 / 主题三处调用：修改前只读当前实际活动面板范围内的 React hook，取得唯一真实 AutosaveController 的 Playwright handle及 revision/time/tab；不读写 renderer store，不调用 controller schedule/flush/retry。每轮仍确认同一实际 panel/tab/controller，latest revision严格高于基线且等于current revision，输入值精确匹配；`desktop.readDraft` 的唯一落盘 autosave 必须与该最新 operationId/revision/值对应，且当前/落盘snapshot均saved、pending/inFlight/failed为空、unpaused。

正文字符串、角色name/bio、主题title/synopsis分别匹配当前Tab的staged batch：editing phase、准确目标 kind/id、modify/PATCH/request path/body、updatedAt不早于本次修改前。旧批次或旧autosave同值不能获得就绪。真实UI pending indicator与修改按钮及controller/journal/GET摘要至少四样本且180ms不变；current或journal保存error/failed、paused、journal issues、UI保存错误和pageerror都拒绝。真实GET包络/实体检查及实际responseStatus、字段长度/hash/匹配状态单列，合法未批准暂存不要求数据库提前成为新值，`finalizationClaim=false`。Theme尚未创建时正式theme:null仅作为真实GET状态记录，不能据它代替journal/输入就绪。

初稿GET证据曾将实际r.ok结果后固定记status200，补审要求并已修为返回/记录真实r.status；未更改业务行为。`finally binding.controller.dispose()` 仅释放Playwright JSHandle，不执行产品controller.dispose；原全帧/首可见/形态/Monaco/原生命中oracle未变。最终Node24.19.0 `--check` 实际退出0，脚本SHA-256 `36263f193c821abd1056c0c37bbed8d71ec3f8898f15a2bb399c12b0f873d085`。准备合约无遗留阻断，准入新label运行；审核者未运行该版本，不将此补审、development02部分初校或controller/journal就绪本身计为动画/产品验收通过。

## Monaco 全文尺寸 API 的执行后补审（N-P2-7 已关闭）

独立读取 `windows-development-03/report.json` 及 `CD-N01-ink-long-body-close-frames.json`：真实正文准备已完成、第一次close原raw有42个rAF/42个editor样本，版本稳定；报告failed于旧layoutInfo.contentHeight断言。所有42帧的layout没有contentHeight，也未独立采contentSize；layout.height均为741，只能说明viewport高度，不能据它重解释全文高度已测且通过。旧报告/raw/截图保留，不替换或补造旧值。

安装的Monaco0.56.0公共 `monaco.d.ts:4627` 的EditorLayoutInfo只有viewport width/height及正文可视区域contentWidth，没有contentHeight；`6498/6511` 的 `getContentWidth()/getContentHeight()` 才是全文尺寸，区别于 `getScrollWidth/Height()` 的viewport/内容最大值。实际 `codeEditorWidget.js:659–681` 调用viewLayout相应内容尺寸函数，源码契约核实，不依赖猜测字段。旧undefined−undefined为NaN必然拒过，是测量对象错误，不能通过删除高度要求解决。

当前限定修订在bindActualEditor、editorState、resetEditorBaseline、preflight与全部连续rAF分别记录 `contentSize={width:getContentWidth(),height:getContentHeight()}`，保留实际layoutInfo。`verify-content-drawer.mjs:271` 动作期继续对layout.width/height/contentWidth作finite和原0.25CSSpx比较，并独立对真实全文width/height作finite和同一0.25比较；编辑器/model identity、选区、scroll、版本/撤销、首可见/全部帧及其他业务字段oracle不变。report元数据单列两者含义，不用viewport.height代替全文高，也不改变allowTerminalReflow边界。

独立Node24.19.0 `--check`实际退出0，最终脚本SHA-256为 `e21945cf563d24dbf401ff3baa978ec3995a0abd8779c014babf291c77b7188b`。API与numeric/invariance补审无遗留阻断，准入新label实际重跑；旧42帧缺全文总高，不能补算此项通过，本补审仍不代表产品验收。

## development04 虚拟绘制层的大坐标测量：仅追加诊断准入

已实际读取 `windows-development-04/report.json` 与 close raw：failed、源 / bundles / executable稳定；仅空DIV id39/index38在三个closing帧的bounding rect width由16777216变16777215，实际Monaco layout及公共全文尺寸均一致。安装 `view.js:105,333–334` 创建lines-content背景层并将其W/H固定16777216，但旧raw未记class或local CSS / offset / client，不能仅凭数值相似直接认定该节点、过滤或改计通过。普通节点和可见文字0.25CSSpx原精度继续保留。

独立批准两阶段中的第一阶段：当前 `verify-content-drawer.mjs:197` 对每个原节点只追加完整absolute rect、class、inline/computedW/H、offset/clientW/H、ownTransform、实际editor owner identity及直接scrollbar父关系。候选必须是 `.lines-content.monaco-editor-background`、owner严格等于已绑定真实DOM且等于actual getDomNode、direct父是monaco-scrollable-element；不以一般大宽度识别。local四种sentinelbool和直接文本行框数量全部保留作证据，未删除节点或替换任何原0.25 rect / Range / API oracle。

Node24.19.0 --check实际退出0，第一阶段诊断脚本SHA-256 `746df628233499aa2dc4d8c34914303704d4896f4298d35b8127f6f5e8f4f090`；准入主代理新label development05在原严格判据下补采。第二阶段仅明确sentinel的local-layout交叉oracle当前**未批准**，须取得实际CSS/offset/client不变、全部普通可见DOM/行框/API仍满足原精度的独立证据后另审；不增加通用大宽排除、宽松容差或省略文字。development04原始failed保留，不因本静态源推导或追加诊断转为产品通过。

development05实际补采已读取：第一次strict close通过，raw37帧中唯一结构候选id39为actualeditor的`.lines-content.monaco-editor-background`，全部rawW/H、offset/clientW/H均16777216，inline/computed均稳定科学计数串`1.67772e+07px`、ownTransform恒定；注意parseFloat科学串不等于精确sentinel，原bool必须诚实保留。此轮**未复现**rect−1，不因此认定旧04根因或批准改变sentinel oracle。strict.25仍保留，旧04仍failed。

05后续实际failed于隐藏释放caption的HWND probe：before point=1788×16 CSSpx，位于1800宽窗口右端原生窗控区，返回HTCLOSE20；同次restore按钮点1608×16.167返回HTCLIENT1。DOM elementFromPoint仍属于caption，不能识别没有DOM节点的原生窗控。主代理已批准仅补nativeRegions选点避开138DIP系统安全区和before/after守卫，仍要求caption HTCAPTION2 / button HTCLIENT1；具体实码待补审，不将20当2、修改产品或把05整体记通过。

### Windows原生窗控安全区选点补审（已准入新label）

实际复核 `verify-content-drawer.mjs:289–316`：main只读实际content bounds/zoom/maximized/fullscreen，安全区取renderer与nativeCSS宽各扣138DIP/zoom、32DIP/zoom标题行、普通窗口上边框，以及可用WindowControlsOverlay实际titlebar rect的交集；记录WCO可用性/visible/rect，不用请求宽代替实际宽。caption点再与真实blank DOM及本次released zone交集，原close区域不会成为期望HTCAPTION的候选。

记录before探针后立即入report；caption和fixed button在probe前后必须仍落安全区，保持相同DOM命中 / released zone / phase / zoom且非OS fullscreen，否则failed-before或inconclusive，不把settled采样冒称moving。实际HWND仍严格要求caption=HTCAPTION2、button=HTCLIENT1，原nativeControls的8/9/20不变，没有接受05的HT20或调整生产窗控/几何。

Node24.19.0 --check实际退出0，脚本SHA-256 `c6de2c336255476de9d2126075264c65f705bdae235dce167654c070184d74e5`。限定选点修订独立补审无阻断，准入新label实际development / directory run。sentinel strict oracle仍未修改，05整体failed继续保留，不据此次静态修订计native通过。

### development06 固定菜单控件补审（已准入新label）

独立读取06实际report：首moving probe的HWND命中为HTCAPTION2/HTCLIENT1，safeArea / sameCaption / releasedZone / phase均有效，但before在DOM顺序中选择了会随chat边缘移动的restore按钮（x1322.802），after.sameButton=false，因此inconclusive、整轮failed，不能据正确瞬时hits计稳定moving sample通过。

核真实 `WindowControls.tsx:20` 与 `desktop.css:187`：`button.desktop-windows-menu[data-desktop-menu-button]` 是position:fixed的真正应用菜单。当前 `verify-content-drawer.mjs:302–313` 必须找到唯一该实际button，不再fallback动态restore；before保存selector/class/position/display/visibility/rect/connected/inert/实际中心命中，要求fixed、真实可见并在安全区。after重新查同一实际节点、仍fixed、原中心仍实际命中/安全、非inert、x/y/width/height变化小于原.25CSSpx；实际class/display/visibility/rect等证据齐全。所有caption / phase / leak / safeArea / zoom / native system controls与HT2/1及sentinel严格oracle保持，漂移仍inconclusive失败。

独立重读最终311及Node24.19.0 --check，退出0、最终SHA-256 `5d4899937e91b4097a3754f1e878dfef61ad4756574cbd64e81f01522cd5fff0`。限定fixed-menu修订无遗留阻断，准入新label实跑；06原inconclusive / interrupted raw保留，不修改生产源或补计native通过。

### development07 唯一虚拟画布局部尺寸交叉：第二阶段方案准入

已独立读取07原close frames及安装Monaco `view.js:105,333–334`：56总帧、26动作区间帧，唯一id39/owner37确为实际bound editor/getDomNode的direct scrollable child、exact lines-content背景层，无直接文字/行框。11帧raw width由16777216读成16777215，但同帧offset/client四个尺寸均精确2^24，inline/computed四串严格不变、ownTransform恒为identity。其他节点rect最大变化0.0001220703125；11336次文字Range坐标比较最大0.000244140625、数量无变化；Monaco实际viewport和公共全文尺寸恒定。原raw SHA-256 `ed961f68b62d7ff416b7c73cf9be702e304312938765b38726f3919c3afcbf2b`及07整轮failed保留。

这组同帧证据支持第二阶段的具体限定提案，已准入作者只修改harness与native-cases：reference和current都须为唯一、同owner/id、真实bound/getDomNode/direct-parent、exact class且无直接文字/行框的明确source sentinel。只有该节点W/H使用实际offset数值作原.25CSSpx比较，同时client/offset四值finite且精确2^24、inline/computed及ownTransform逐帧strictSame；资格不满足必须普通strict比较或明确失败，不得排节点。该节点x/y、全部普通DOM/view-lines/文字Range与Monaco公开API、model/selection/scroll/undo保留原精度和要求。可追加真实TypedOM numeric px交叉，支持时要求有限且精确2^24；不解析科学串冒称精确值。

原raw rect/w/h全保留，canvas逐帧原始W/H与delta/max须在断言前存入证据并独立报告，不在几何max中静默隐藏。当前是具体技术方案准入，实际修码、Node24语法检查及新label运行仍须后续补审；不改生产、通用大宽过滤或容差，不把07改计通过或宣称产品验收。

实际第二阶段实码已复核 `verify-content-drawer.mjs:197–203,240–244,274–289,293`：采样保留原rect/w/h并新增真实TypedOM单位和值，没有解析科学串冒造canonical值。所有raw canvas样本/相对独立reference的W/H delta/max在原证据写入前构造，即后续任一assert失败仍可读取；main report的独立diagnostic在任何checked oracle之前记录raw max与文件来源，不标pass。判据只在before或after结构候选出现时进入严格资格检查，两边须同一id/owner、唯一candidate、exact class、真实owner/父关系且直接text/行框空；任一资格不符明确失败，未过滤节点。offset/client四值finite且精确2^24、支持TypedOM时px/finite/exact2^24、availability前后一致及样式串/ownTransform不变后，只有该节点W/H改为local numeric原.25比较。节点x/y及所有普通项、Range和Monaco API原检查保留，普通relative max与原始canvas global max在结果中分别命名，raw测量未覆写。

独立Node24.19.0 `--check`实际退出0，最终冻结脚本SHA-256 `a545506b382317720c1bfe17f3f7b9afc07a613e30f4e9f4f46267edcbcb8b1f`。最终版比预读9351版本补齐main report失败diagnostic及TypedOM availability严格不变，已重读实码和native-cases结果边界并重新检查/hash。具体实码补审无遗留阻断，准入新label development08；旧07failed及全部原raw保持。审核者未执行本脚本，不据静态准入确认当前native/产品通过。

### development08 展开释放区域的选点补审

实际08报告首close为57总帧/26interval/23actual intermediate V，通过local geometry最大0.0001220703125，独立raw canvas width delta仍为1。报告harness为审核的A545版本，源/包/executable稳定；随后open-native整轮failed/inconclusive保持。before的caption点x1285.416748是releasedZone右1297.416748减12，left为720.718842；after仍opening、safe/zoom不变、实际HT2/1且同fixed menu稳定，但sameCaption/leakPointStillValid变false。所取点靠向左移动的抽屉边缘，不能把瞬时正确hit算稳定区域通过。

已准入限定修订提案：保留实际caption blank、released zone和native safeArea的原交集及margin，从交集start（含released left+12）向右扫描真实blank点。before/after同caption、同phase、released-zone/安全区/zoom、fixed menu稳定及HTCAPTION2/HTCLIENT1严格要求全部不变；不能接受被边缘覆盖或settled采样。仅两harness/doc文件，可取得稳定实码/hash/Node24check后另准入新label；无生产修改或08重新计通过。

最终实码 `verify-content-drawer.mjs:318–332` 和native-cases59/61/100已补审：只在leak=true的实际released交集中从start向右扫描，nonleak保留原方向；仍对实际elementFromPoint及no-interactive blank判断。before记录captionSelection扫描界限/方向/actual rect和releasedZone内实际bool并断言，after另记录新的actualZone并保持原sameCaption/leakPointStillValid/phase/zoom/nativeSafe/fixedMenu守卫和HT2/1。没有等待settle、放宽守卫或改动画/普通几何oracle。独立Node24.19.0 --check退出0、最终作者确认冻结SHA-256 `5043cb65ddc52e043770678aaac686318ace1c7be21857ba0aa4d973520fd389`与本代理实际hash一致。无遗留阻断，准入development09；08整轮failed/inconclusive与首close单段通过的边界保留，未声明新的native结果。

### development09 主题暂存目标身份诊断

独立实读09报告：审核5043脚本，versionStability全部true；19checks、正文及角色真实close/open四captures分别55/59/58/59帧，actual intermediate V分别23/33/25/33，全部passed；记录的六组HWND/nativecontrols也passed，renderer errors/HTTP请求为空。随后主题准备119样本/15s超时，整轮failed保留，不将前四段部分通过提升为完整native或主题验证通过。

主题最后样本controller和唯一对应journal operation/revision2均saved且预期title/synopsis精确、无pending/inFlight/failed/paused，UI为待保存/修改2且无保存错误；但helper按THEME+novelId筛选的stagedChanges为空，真实GET仍是未经确认的旧字段。源码 `staged-save.ts:234` 的theme路径没有params，实际 `staged-changes.ts:370` 常规modify使用 `Object.values(params)[0] ?? url` 作为targetId，因此真实目标应请求URL，而不是novelId或数据库theme.id；`staged-save.ts:44` 注释与现实现不一致，不能以注释猜改产品。已要求作者读取09保留的合成journal核当前Tab批次/novel/targetKind/op/targetId/requestURL的真实关联后，再提交限定harness身份修正及补充未过滤候选身份证据。原controller/operation/revision/字段/时间/phase/UI/四样本180ms和动画oracle保持；具体提案/最终码仍待日志交叉及补审。

保留journal已由本代理独立只读交叉：临时目录只在fixture.synthetic=true且works包含09novelId唯一匹配时读取data/drafts.json，不输出路径或整草稿。snapshot revision48483、当前theme Tab批次editing、唯一THEME modify的targetId与requestURL均为`/api/novels/<09 novelId>/theme`、novelId归属匹配、PATCH、两预期字段精确、updatedAt1791969910123，文件SHA-256 `02525ed503171e2f21c9323b520d0836743c28966c0f430fd1d63ea00606b0ed`。因此准入已知themePath作为exact targetId的CALL修订和未过滤本批次kind/op候选身份/API entityId诊断；不能从任意候选反推oracle、放宽业务字段或强制保存。

另对尚未执行的manual driver作边界预检：09真实Group1800/contentW1079.291748，`DashboardShell.tsx:44,49` settled chat最小420、content最小30%。末separator位于chat左/content右，原向左95扩大content会触及chat余量，不能预设有大于50的合法变化；向右95缩content到约984仍远高约540的最小值、同时增加chat，是合法真实pointer方向。准入仅改driver为+95，保留真实down/12steps/up、absdelta>50、重开宽度恢复<3及所有运动精度/身份检查，并记录方向和实际before/after。此项未执行，不称actual manual red；具体最终码/hash/check仍待补审。

最终限定实码 `verify-content-drawer.mjs:151,154,372,399` 与native-cases63/65/67/106已实际补审：candidateChanges先按当前batch的kind/op列实际身份，仅诊断；changes再用已知exact targetId筛选，与旧predicate等价。Theme CALL用固定真实themePath同时作GET path和expected targetId，没有从journal选择一个目标使oracle自证；ready表达式及错误/唯一operation/revision/字段/PATCH路径/时间/UI/四样本180ms要求原样。GET entityId独立记录，不作为数据库已确认保存的替代。manual只改+95方向，并记录实际center至目标的请求距离、before/after，全部原真实pointer与>50/restored<3/运动要求保留。

Node24.19.0 `--check`实退出0，最终冻结script SHA-256 `9f34558c2b806c6baacf5458387e2524452f60530f96b16e81bd26d7728abfbf`与独立实际hash一致；生产14文件经独立hash与09snapshot全部一致。两项限定harness修订无遗留阻断，准入development10；09整轮failed与正文/角色四段已测通过边界保留，尚未执行的主题/手动/后续范围不因静态审核计通过。

### development10 Select 零尺寸节点生命周期：先证实语义

10实际report已读取：9F345/源/包/executable稳定，正文、角色、主题准备均passed，四段已有captures/20checks保存；整轮随后failed于Select pause的fresh IDs比较。原raw仅preflight id42退出，空SPAN无class/role/直接文字/行框，rect/offset/client W/H均0、位于innerLeft/y0；首closing帧实际Popup仍visible但已inert/ariaHidden。不能因某节点全零就允许消失或过滤，否则会掩盖真实内容塌缩。

本代理核安装 `FloatingPortal.js:136,197–200` 的非FocusGuard aria-owns空span随focusManager open有意卸载；`internals/constants.js:42–46` ownerVisuallyHidden为fixed/top0/left0/clipPath inset(50%)，与旧raw形状相似。旧raw尚无aria-owns、portal关联或computed clipPath，当前只作源码线索，不据此断定id42或修改oracle。已要求实际DOM证明aria-owns对应当前真实SelectPortal、包含实际tracked listbox并核canonical hidden样式/空内容/真实生命周期后，再审核精确utility独立采样提案；普通visible DOM/text和Popup首motion inert要求保持，原10failed/raw保留。

主代理授权两条证据路径后，选择最小的严格runtime资格路径：后续新label必须实时证明aria-owns实际解析到connected `DIV[data-base-ui-portal]`，且含当前tracked真实Select listbox；源FloatingPortal79–84及SelectPortal28支持该归属判据。唯一reference utility须是无class/role/children/直接文字/行框/交互属性的SPAN，canonical fixed/top0/left0/clipPath及所有rect/offset/clientWH为0才可独立记录。任何zero业务节点、资格失效或其他proxy仍走普通strict或明确失败，不能通用zero过滤。原始utility身份/attrs/styles/关联/几何/lifecycle全部另存raw，普通items fresh IDs/原.25和全文文字/API以及Popup首motion真实inert要求保持。新label真实raw随后独立核资格，不回推10身份、不重计旧失败；具体最终码待补审。

同源未执行前置已审核：真实ItemLevelPicker265的Popover.Portal与安装PopoverPortal34也调用FloatingPortal。准入仅该具名native Picker实际dialog定位后只读绑定当前Popup、收起/重开检查后clear，复用aria-owns→actual portal→这个显式Popup的严格资格及可见首motion inert；仍是outside-click与pause共存的生命周期，Browser已有无外点击因果覆盖不由native冒称替代。不是泛收集dialog/Portal、生产变更或未执行red。

最终 `verify-content-drawer.mjs:201–209,248–259,287–309,396` 和native-cases69–75/114已实际补审：仅两个具名capture生成完整source/attrs/styles/parent/portal/Popup raw；reference必须唯一关联真实已显式绑定且visible/connected Popup，严格验证empty非交互SPAN、单token、portal归属、inline/computed canonical样式及finite精确0WH后才分列该id。所有原items/rect均先保存，mainreport独立raw diagnostics不标pass；全帧该node若存在就重验证并保持同source/parent/Popup资格，退出后复活或新linked id明确fail。非关联/零尺寸业务节点都普通fresh ID/原.25/text/API比较，原visible Popup首motion inert和全部actual V/首可见/identity要求不变。Picker绑定与clear只读、实际触发方式不变。

独立bundled Node24.19.0 --check退出0、作者冻结SHA-256 `7062e2276fe97237eb440e318458796960100f0938fd39f0643f8089756f7203`与本代理实际hash一致。具体限定实码无遗留阻断，准入development11。按选定runtime路径，11的实际raw必须再独立核资格；这次源码准入尚不能证明10旧id42，也不将10或未执行Picker/手动阶段改计通过，生产范围未扩。

### development11 Select List 与 Popup 祖先的测量修正

实际11raw已独立核：preflight id45是canonical empty/noninteractive/零尺寸SPAN，单aria-owns `_r_68_`链接connected BaseUI DIV portal且包含显式bound id44/role=listbox；source样式和空结构全部成立。唯一scope拒绝来自direct popup slot=null。报告为7062版本/源/包/executable稳定、四captures/20checks、renderer errors与HTTP请求0，整轮failed保留。原10缺属性的id42仍不能反向补造身份或改计通过。

此前把实际listbox与Popup外层的slot混为一体，已纠正：真实 `select.tsx:97,105` 将select-content设在Popup而List为子节点，安装SelectList41才赋role=listbox。准入仅Select scope修为actual listbox role与真实connected closest select-content祖先，祖先须包含bound listbox且同aria-owned portal包含该祖先；direct slot=null真实记录保持，祖先/稳定ownedPositioner identity与link另存。原bound对象、Popup首motion inert、utility empty/canonical/lifecycle、ordinary fresh/.25/text/API不变。暂停态inert/aria/data-paused等真实动态只作为独立raw，不放进要求恒定的source身份对象。具体最终码/hash/check仍待补审和下一实际raw；不需额外整轮诊断、不改生产或11failed。

最终 `verify-content-drawer.mjs:202–203` 与native-cases77–79/118实码补审完成：bound实际listbox对象继续保留，scope只要求role=listbox和不同节点的actual closest select-content祖先connected/contains该对象且位于同aria-owned portal。direct slot真实null不覆写，新增祖先id/tag/slot/连接/包含/归属和真实closest owned-positioner稳定id/tag/owned/link证据；没有纳入paused/inert/aria动态状态作为恒定身份。其它完整qualification/lifecycle/ordinary geometry/text/API/首Popupinert代码未修改。独立Node24.19.0 --check实0，最终冻结hash `c4557fdb076a44e1bbcb51ae14ed2a54865b1044ee32b059d5988c3f369963b5`与本代理实际hash一致；无遗留阻断，准入development12。新实际raw仍须核祖先资格，11原failed及前段通过边界保留，本源码补审不产生产品通过结论。

### development12 实际 Select 资格闭环与清理路径

12raw已独立核：唯一utility id47 canonical empty/noninteractive/WH0，aria-owns `_r_68_`→portal43→bound listbox44/direct slot=null，actual closest select-content45与ownedPositioner46 connected/contains/同portal均真、matchesScope=true。独立lifecycle59样本（preflight加58rAF）中仅reference出现一次、之后58样本退出不复活；首closing Popup实际visible但已inert/ariaHidden。Select pause与theme-open新增通过，报告6captures/22checks，C455及源/包/executable稳定、renderer errors/HTTP均0；旧10未知属性与11错误slot失败仍保持，不将12资格回填旧记录。

整轮12随后在新用户重开Select后的Escape清理等待15s仍见visible listbox，failed保留。`DesktopCommandController.tsx:58` 对listbox只reset/return，不消费按键，不能据此断言已证明Escape拦截根因；真实`SelectRoot.js:291`调用useDismiss，其outsidePress真实路径`useDismiss.js:321`关闭Root，也有自己的Escape路径。当前缺实际keydown target/trusted传播跟踪，根因未证实，不改生产/global Escape或声称Escape已通过。

准入仅把新用户打开已visible之后的cleanup改为真实主题heading外点击，再等待实际hidden。新操作确实打开的断言/await保留，动作期IPC暂停因果、source utility资格/lifecycle、fresh IDs/.25/text/API/首motion inert全部保持；外点击只是动作后的清理路径，不代替之前的无外点击暂停。具体最终码/hash/check仍待补审，12failed不重计整轮通过。

最终script389与native-cases81–85/124已实读补审：实际新user trigger→visible wait及显式isVisible=true之后，才真实click可见主题heading、actual hidden wait并清只读引用；无callback/store/Root写入。成功记录明确pause仍由既有desktop.command IPC、postAssertionCleanup为外点击/no Escape claim，旧source utility/lifecycle/ordinary几何和motion/inert断言原样。Node24.19.0 --check实际0，最终冻结hash `cea30843f727bcc7461b55905bba1d2ec0bd887e8d433094188bba50c9822d46`与独立实际hash一致，无遗留阻断，准入development13。12部分通过与整轮failed及Escape原因未证实保留，新label不声明Escape通过或未执行阶段完成。

### development13 模态 Backdrop 的实际外点击清理

13实际日志为6captures/22checks、CEA和源/包/executable稳定、renderer errors/HTTP为0，整轮failed。标题visible/enabled/stable，但freshPortal `_r_6r_`中的`role=presentation[data-base-ui-inert]`拦截locator.click，未发出实际清理pointer，不能写成外点击无效或隐藏失败。安装 `InternalBackdrop.js:28–31` 明确这个marker供Floating UI outsidepress检测，SelectPositioner的modal Backdrop路径及useDismiss321提供真实outsidepress关闭。

准入仅fresh visible断言之后的真实mouse cleanup：将实际标题滚入视图并取其中心，在当前fresh listbox上只读验证该点实际hit为connected/visible/非HTMLinert的真实Backdrop marker、处于同一actual BaseUI portal且在Listbox及SelectContent外；坐标/实际target/portal关系先存证据，失败亦保留，再page.mouse.click由Backdrop实际接收pointer并等待真实hidden。不是force heading click、合成event或调用Root/store/callback，不改IPC暂停/geometry/proxy/native或生产Escape。最终码/hash/check待补审，13failed及未click事实保留。

最终helper50–61/call400及native-cases87–91/130已实际补审：当前fresh listbox.evaluate获取actual target/actual portal/content关系和heading实中心，main report的非pass诊断在资格断言前await save，失败亦留。严格actual DIV[role=presentation][data-base-ui-inert] marker、可见connected/nonHTMLinert/pointer-events、同Portal及点和target均outsideListbox/Content全成立后，才真实page.mouse.click并等待actual hidden，再记录passed后置。freshvisible显式断言仍先于helper，原pause IPC/source proxy/普通几何/text/API/motion/inert不动。独立Node24.19.0 --check实际0，最终冻结hash `6aa33a67c10ea601974f3e41667b7536061e651f983b6143d3e3595593e804f8`与实际hash一致，无遗留阻断，准入development14。13未点击/整轮failed保留，新实际input/hidden结果才可记cleanup通过，不声称heading或Escape行为已验收。

### development14 实际 Item/清理闭环与并发终态拓扑

14报告13captures/35checks、6AA及源/包/executable稳定、errors/HTTP为0，随后both-open比较失败，整轮failed保持。实际fresh Select清理点命中同freshPortal `_r_68_`可见非HTMLinert Backdrop、在Listbox/Content外，真实mouse与hidden后置passed。Item raw唯一id41 canonical empty/noninteractive/0WH，aria-owns→actualPortal39→explicit Picker dialog40真实归属真；60utility样本中存在4后退出56、不复活，首motion Popup已hidden/inert，Item hide与reopen通过；这仍是outside-click共存生命周期，不升级隔离pause因果。

本代理独立核both-open原raw：G1800，firstvisible index4至26共23可见冻结帧W约1079.6875/H1000、ordinary身份和文字行数变化均0；relative geometry最大0.00030517578125，7912次Range坐标比较最大0.000244140625，raw虚拟画布delta1仍单列。25/26实际V已终值1079.291748但right仍opening、left opening→open，27双方open后W才落到1079.291748。计划27与hook完成时序允许所有相关轨道结束之后的合法布局；现不能据旧final-shape oracle差异宣称产品挤压red。

CSS256为border-only 1px、fractional DPR会实际snap；此前真实both-close preflight两phase均open、G1800的live separator已测0.6666666865348816，both-open没separator时旧fallback1错误。以真实journal投影.60005和实际live宽计算initial一slot独立W1079.689966655、final两slot1079.289933309，均与实际相差<.003，而旧final reference/1px fallback均不能表示这段冻结形态。

准入限定提案：仅named both-open允许最终新left-divider拓扑reflow，首visible的initial完整W/H仍由pre-action journal/Group/初始预计slot及实际separator校准独立求出。校准来自当前live或此前同actual zoom/DPR/mode的live border rect，完整记录来源/rect/computed/time/key并在新launch清理；需要slot而无同key真实校准则失败，不用freeze flags、首帧反算、通用1px默认或容差放宽。named both-open冻结区间须覆盖left或right moving并只在双方终态之后允许reflow，普通全文行框/identity/.08/.25及raw保留；narrow/0slot无须gutter值。具体最终码/hash仍待补审，新证据不重计14整轮或未执行范围通过。

具体最终方案及实码 `verify-content-drawer.mjs:87,199–242,249–278,297–299,421–425` 与native-cases93–101已独立补审：新launch清缓存，actual native zoom/renderer DPR/scale、mode、window/Group尺寸和theme组成精确环境key；preflight direct divider真实rect/computed/border/margins、Group结构预算、sidebarV均进入raw。仅named both-open能用紧邻代码顺序中的both-close两侧open/两个live divider且同key的缓存，动作前无校准立即fail，narrow/0slot无gutter需求，其余case只取current live。独立初始目标由真实journal/Group预算/预计1slot求得，不读冻结属性或反算首W。

真实restore后连续raw不停，等待right实际partial/phaseopening且1slot才原Ctrl+Alt+b，无固定sleep；两次command snapshots与停止时最终端点交叉，确保右和后左实际V都非旧/最终端点，bookkeeping不能充当重叠。named interval联合两phase与实际两V，所有首visible/非终态/注册帧仍原.08/.25及全文/API/identity检查；只有bothphase open、两实际V都到final且在combined interval之后可W reflow，另验最终2个actual separator，generic reflow范围不扩。

独立Node24.19.0 --check实际0，最终冻结SHA-256 `f921eca0883510cf43992a0536aaf0b73341dd58e971233517c4441e5682d092`与实际hash一致。限定实码无遗留阻断，准入development15，须再核实际新校准/driver重叠/完整区间。14整轮failed、已有13段部分通过和Item outside生命周期边界保持，不将静态准入计native整轮或产品完成。

### development15 左命令开始前的阶段门槛

独立实读15raw：same-key实际gutter校准与独立目标1079.689966正确，firstvisible6 W1079.687744/rightV18.354，而left closed/V0仍为preflight旧端点；7仍旧端点，8才left moving tag、10才actualLeftV17.031。before/after命令证据实际right18.354→569.364、left0→73.979，after双方opening，finalLeftV287.75，真实重叠已证实。报告F921及源/包/executable稳定、13captures35checks/0errorsHTTP，但旧guard将尚未发出左命令时的closed/旧V当作非终态motion而失败；15整轮failed保留。

最终限定修订251/259/276–278与native-cases103–105已补审：只named both-open增加实际left V相对旧值>原.001的起点、first moving phase起点及二者更早firstSidebarMotionIndex，原raw在资格断言前保存。所有left样本/pre/final有限；索引前严格旧endpoint（原.001）+oldphase，索引起距final>.2仍must moving，不让启动后的早open标签隐藏未完成运动。仅移除原checked中过早的阶段guard，union完整区间、每帧独立W/H与.25/text/API/identity/inert全部原样，不删帧、不改容差。

独立Node24.19.0 --check实际0、最终冻结hash `58b9ba23abf3b03e8f9b1896237c93f1e59c13d9a57b37d2987fc4255fc6715d`与实际一致，无遗留阻断，准入development16。新实际raw仍须核完整both区间；15失败及已证明的校准/driver事实不重计完整通过，生产未改。

### development16 全屏收起后的普通目标准备与滚动语义

16实际两侧展开已通过，报告15captures/37checks、58B9及源/包/executable稳定，后full-open因旧pre pixel scroll要求失败，整轮failed保持。本代理独立核其raw：pre完整W1512.03125/Monaco1512/contentH11682/scroll10941；index2 opening但V0开始W1091.219，index3仍V0 Monaco改1091/scroll13667，firstvisible4至final共52可见样本scroll13667、layoutW1091/contentW895/contentH14611全部恒定，selection100:498及model/version/undo位置不变。前full-close的W1512/scroll10941保持，当前尚未证实任何可见动作期scroll改变。

实际`hideContent:442`恢复chatVisible=true、show普通合法目标，因此full-close→open确为新的普通分栏W，不是同W复原。真实MonacoMarkdownEditor的wordWrap/automaticLayout和安装ViewModel183–210、StableViewport1188–1194把原model position映射到重wrap后的view line再恢复offset；public IViewState2911–2912记录firstPosition/delta、widget447–459 getTopForPosition提供实际位置坐标。旧raw没有该语义anchor，不能据源码或selection恒定冒称逻辑视口已通过，也不能将16改计通过。

准入限定提案：只named full-open、preclosed、前真实full-close完整W对应pre且独立合法normal目标W不同，允许V0准备期的pixel位置转换。固定preaction saveViewState.firstPosition的原model位置，逐帧只读public getTopForPosition(原line/column)−actualscrollTop，与pre同量offset finite且原.1严格保持；新saveViewState的firstPosition列可因重wrap改变，不以其替换原固定anchor。首visible完整W/H须独立target验证，新的pixel scroll只能在V0 prefix转换，首visible起全部帧相对已验证终态pixel scroll仍严格.1，scrollLeft及pre模型/selection/版本原要求保持，全部可见API/.25/行框/identity不变。普通同W动作仍原pre pixel baseline，不泛化first-visible豁免，绝不restore/set任何editor或store。17实际语义anchor仍待执行，若原anchor不保持必须失败。

最终55DB版本`verify-content-drawer.mjs:201/223/232/243/265/282–285/333`与native-cases107–113实码补审无阻断：scope仅具名full-open，先保留前实际full-close来源与全部相邻pixel变化raw，紧邻已完成动作的完整宽、closed/V0及不同独立普通目标均严格资格检查；原pre模型点固定，公共API两种pre offset先交叉，全部准备/可见/终态帧保持有限anchor及原.1、同模型/选区/版本/undo。首可见之前只允许V<=原.001；之后全部帧W/H独立目标原.08、pixel相对终态原.1，horizontal及普通同W原pre基准不变，原ordinary/text/API/.25与identity/inert不变。没有editor setters。独立bundled Node24.19.0 `--check`实际exit0，SHA256 `55db5d4b4075c4bd050bc37cec7129a075e4eb6323449a1738d15afd3596a528`与作者冻结一致，准入development17。16原failed和旧raw缺anchor的证据边界保持；静态准入不是17实际通过或产品验收。

### development17 实际视口锚点闭环与窗控裁剪诊断

17报告55DB源/包/executable稳定、28captures/55checks、errors/HTTP=0，后zoom1.25 nativeControls安全区检查失败，整轮failed保留。独立实读full-open raw共50帧：固定原model position95:1及pre delta−15，全50帧最大anchor变化0；唯一pixel转换发生index2/V0，10941→13667，firstvisible3至final47个可见样本scroll13667恒定。前真实full-close完整W1512.03125与pre一致、独立normal目标1091.2270905，16限定补充采样在17已取得实际语义证据；此动作通过不等于17整轮通过。

本代理独立核zoom1.25 open的最终raw：renderer/Group约1440 CSS、captionPadding144.8，真实tabs viewport x1016.3167→1228.0001，真实tools最右1295.2001；138 DIP原右控区换算138/1.25=110.4 CSS，左边界1329.6，原32 DIP行高换算25.6 CSS。被unsafe列出的物品/新物品所属离屏Tab布局框约1314.908→1391.708及1396.508→1477.975，位于真实viewport右侧；此时nativeControls382用全部保留子Tab/button的未裁剪raw rect判断，没有读实际clip/有效命中。生产CSS209/212–216及本任务前baseline已有viewport overflow:hidden、仅bounded viewport no-drag、子层app-region initial；主进程window-appearance27原titleBarOverlay32 DIP未改。现材料指向离屏保留Tab框的采样资格问题，尚无fresh ancestor/computed region/实际命中证明，不能直接过滤或回计17通过。

限定提案已准入实施：只对真实ContentTabs viewport/track内部Tab及其close取得当前DOM归属、overflow:hidden、viewport no-drag/后代computed none与现有reset源规则资格，保留raw rect并独立记录有效clip及raw危险交集真实hit；点若仍命中原Tab/close则失败，资格不成立不得分列。实际viewport、所有独立tools及普通控件仍逐个安全区严格检查，138/32 DIP与原HWND8/9/20不变，diagnostic必须在断言前保留。原`ai-caption-drag.test.ts:20–30`已用真实browser检查同bounded exclusion/reset路径；不泛用zero/大宽/离屏忽略。具体最终码/hash及新runtime证据仍待审核，无生产变更。

最终`verify-content-drawer.mjs:379–398`及native-cases新增17记录/结果边界实码补审无阻断：只有实际Tab或其close、真实唯一viewport与direct track归属才能资格；实际overflow:hidden、viewport no-drag、CSSOM authored initial reset、无inline覆盖及整条后代computed none、所有实际no-drag祖先raw safe均严格检查。原raw、安全区危险交集坐标及真实elementFromPoint/Tab归属完整记录，点仍归原Tab时退回原raw安全判据，普通按钮不使用clip例外。实际bounded viewport、tools及其所有按钮另外独立raw safe；renderer/nativeCSS宽取min使138/32 DIP边界更保守，没有扩大安全区域，原menu余量与native8/9/20要求保持。main report先保存全部候选/资格/raw/point再做断言，失败也留诊断。独立bundled Node24.19.0 `--check`实际exit0，SHA256 `d1358b96fc270e928495419d50d151cef2af0f8bb9f065dda79c47ab29aba137`与作者冻结/root一致，准入development18。17原failed且原raw缺fresh clipping资格不补算通过；18必须取得实际source/clip/hit资格和原生命中结果，静态准入不是产品验收。

### development18 实际裁剪资格与稳态zoom高度夹具

18报告D135源/包/executable稳定、28captures/56checks/0errorsHTTP，zoom1.25 native-controls取得实际资格并通过：唯一viewport hidden/no-drag，CSSOM真实`.content-tabs-viewport *` authored initial/reset及全部后代none、无inline覆盖、registered祖先safe均成立；保留rawUnsafe物品/关闭物品/新物品，三者有效clip为空，其危险交集真实elementFromPoint均命中caption、没有命中原Tab/close；viewport/tools registrationUnsafe为空、原生三个点实际8/9/20。17采样资格问题在此取得新runtime/native闭环，旧17整轮仍failed。

随后zoom1.5窗口准备失败，尚未执行该档动画，18整轮failed保留。独立核四轮windowBounds：请求1800×1000时outer1801×1001/content1800×1000、renderer1200×666（实际Group H666.666687）；height补偿至1001时outer1801×1002/content1800×1002、renderer1200×668。上述两组各重复两次，旧round目标1200×667始终未到达。zoom1.5/DPR2.25、minimum760×580、工作区2560×1392与outer差<=1均正常，没有clamp/redirect或动画形变证据；这里只证明该有限实际OS网格/补偿未提供667，不声称所有OS尺寸不可能。

限定一行提案准入：仅稳态zoom===1.5的非断点夹具高度改1002，以实际已观测content1002/CSS668形成合法精确目标；其他稳态zoom仍1000，width1800、bounds helper原exact/补偿限制、899/900与动作中resize/zoom、所有动画/文字/API精度保持。不是把667接受为666或668，不改产品窗口约束；19必须按新实际完整WH重新运行，18原目标失败不重计。最终实际码/hash/check仍待补审。

最终实际459行明确`bounds(1800,zoom===1.5?1002:1000)`，独立bundled Node24.19.0 `--check`实际exit0、SHA256 `14845377536d6094c2a4c0095b27d5bc16492461fbb4741c6c7f345ab283599c`与root冻结一致；只有该具名稳态档的非断点夹具高度更改，原helper exact、其他1000高度、断点与全部motion判据未改。无阻断，准入development19。18整轮failed、原1200×667未达目标证据保持，19新1200×668必须实际精确满足并跑完矩阵，静态准入不计通过。

另以只读字节复原核对实际变更范围：当前script唯一新bounds表达式替换回原`bounds(1800,1000)`后，replacementCount=1，整文件SHA256精确复原已审D1358B96版本；没有其他script字节变更。

### development19 实际computed超大画布尺寸

19新zoom1.5窗口已实际满足native1002/renderer1200×668，14845377源/包/executable稳定、28captures/56checks/0errorsHTTP后，1.5 close旧local常量16777216资格失败，整轮failed保留。独立raw该段54total/26interval/23actualV：唯一真实owned sentinel id48/owner46、准确class/direct scrollable与real getDomNode关系、空直接文字/行框；pre及全54帧offset/client WH=14913079，实际ComputedTypedOM px=14913079，inline科学串`1.67772e+07px`/computed串`1.49131e+07px`、ownTransform identity始终不变，raw global W在14913078/79/80变化、local完全不变。只读补核26帧普通geometry最大差0.0001220703125、6448次文字坐标比较最大差同值、IDs与行数差0、Monaco public viewport/content/scroll差0；这些诊断不把失败的正式oracle改计通过。

安装Monaco `view.js:333–334`固定style意图2^24，但原科学字符串不能证明runtime精确数值，19也未采typed inline；当前没有可见产品形变证据，不能猜测DPR2.25→浏览器最大尺寸的精确公式或回计19。限定最小提案已准入：仅现有唯一actual-owned/direct/class/空文字source sentinel，新增required实际`attributeStyleMap.get(width/height)` numeric px intent精确2^24；required真实ComputedTypedOM finite正px且<=intent，并与各轴offset/client精确一致，以该独立实际computed值校验canonical local WH。reference/current真实intent与computed strictsame，原local .25及此节点x/y、全部普通DOM/文字/公共API不变；不支持或任一资格失败不能泛化过滤，所有raw global差继续独立保存。最终实码/hash/check及20新增typed-inline实际证据仍待补审。

最终`verify-content-drawer.mjs:218–221/267–269/321–335`实际补审无阻断：typed inline/public computed实际数值只读采集并在raw文件及独立canvas diagnostic之前保存；唯一原source归属/class/无文字资格保持，两Typed API必须available，inline px finite exact2^24、computed px finite正且<=intent、各轴offset/client exact一致，reference/current两个完整typed snapshots deepSame。仅现有sole sentinel沿用local .25；此节点x/y、全部普通几何/文字/API .25、scroll .1原样，无其他大尺寸节点例外、无DPR公式。独立bundled Node24.19.0 `--check`实际exit0，SHA256 `8c30aba520111415778d235f70e243af5ad5b01e8a00a35baea269f56ea0d2ff`与作者/root冻结一致，准入development20。20新的runtime numeric意图/computed资格须实际验证，19缺typed-inline仍failed，不补算完整通过或修改生产。

### development20 动作中显式native zoom边界

20报告8C30源/包/executable稳定、31captures/60checks/0errorsHTTP，随后live-zoom relative geometry failed，整轮failed保持。独立核新1.5 sentinel资格已实际闭环：typedInline两轴numeric px精确16777216，computed/offset/client两轴14913079；close54帧/24interval/21actualV、open53/31/28actualV已passed，ordinary max.0001220703，native1.5系统点8/9/20真实通过。

livezoom raw51帧/28interval，原独立目标W959.750546/H1000，firstvisible3至moving期W约959.75/H1000、captionScale1/padding178、Monaco layout/content及scroll保持；实际终态才W767.8/H800/captionScale1.25/padding144.8。idx10开始track751.072937→750.533386，两个intrinsic Tab宽−.26458/−.27499、修改button宽−.27083；下游普通/文字相对坐标变化约.8，10712文字坐标最大.8041687，IDs与行数差0，既有font/padding字段不变。原raw没有逐帧DPR及border used/intent资格，不能把这些跨环境变化直接认定为产品误冻、也不能放宽旧.25后补算20。

正式方案11承诺“CSS排版几何不因抽屉收放重排”，用户main zoom立即应用是显式整窗样式操作；固定W/H和caption scale声明不等于保证所有浏览器used border/字体像素网格在新DPR后仍是同一值。限定提案方向只适用于两个具名explicit livezoom：记录真实native zoom前后因果时序及逐帧DPR/visualScale，严格资格为同OS display的mainzoom与DPR相同比例变化、实际非端点motion重叠，独立W/H/transform/phase/API/scroll/semantic styles/IDs/行数全区间原精度不变。仅该真实变化边界以实测`1/dprOld+1/dprNew`有限像素网格预算检查完整相对geometry/行框，原raw delta分列；每个连续同DPR epoch全部moving/冻结帧对该epoch最后仍满足独立W/H的样本保持原.25，不得取真正终态重排后的样本或删边界帧。普通及稳态zoom仍原.25，不泛用样式变化豁免；真实DPR/border资格、具体码/hash和新label仍待补审，不将此称为跨DPR同样式几何完全不变或产品完成。

F3A02B1B初次实际补审：Node24check0/hash一致，两个具名scope、两连续DPR epoch、actual OS/mainzoom比、boundary非端点、epoch last-reference moving+独立WH、同grid .25及原whole/API/scroll/semantic/linecount守卫主体正确。发现两项最小资格缺项，已要求作者修后准入：appearance129/131 renderer before/after仅time/DPR/visualScale，需真实phase/W/V及两侧moving/nonendpoint确认；跨DPR允许量化时，除semanticStyle还须比较已采className/inlineWidth/inlineHeight，保证authored布局尺寸声明未变化。只补只读/原字段断言，不改生产或computed自动宽，不增加容差。最终冻结码/hash仍待补审，F3版本尚未准入21。

最终7554版本129/131/210/226/268–270/292/328–350实际补审无阻断，两项缺项已闭：请求前后实际phase/W/V与native zoom/display/DPR/time只读记录，两侧finite真实非端点且moving、boundary亦actual moving；className/inlineWidth/inlineHeight与原semantic及font/padding等声明严格不变，真实四边used border按每DPR epoch严格不变、跨边界仅实测像素格预算。每个连续epoch最后参考仍moving并满足独立初始W/H，没有选真正终态新排版；所有原checked帧、IDs/行数/文字、wholeW/H/transform/anchor/inert/API/scroll守卫保留。同DPR相对geometry/行框原.25，只有两named实际mainzoom/DPR边界允许有限`1/oldDpr+1/newDpr`预算，成功报告分别保存same-grid与raw-cross-grid最大值，完整新raw资格及边界预算在断言前先存，普通/稳态cases没有扩大精度。

独立bundled Node24.19.0 `--check`实际exit0，SHA256 `7554b3138c4de57cadc1f344759fc59706896915adbade767934c6db796ada24`与root冻结一致，准入development21。21必须实际证明新DPR/边框/请求时序资格及epoch结果；20旧raw缺该证据仍failed，不回计通过。此为明确用户zoom边界的测量契约澄清，不是生产改动，也不是承诺跨DPR每个raw CSS框绝对无变化或产品验收完成。

### development21 实际zoom资格与冷启动保留草稿

21报告7554源/包/executable稳定、44captures/80checks/0errorsHTTP，正文livezoom、稳态zoom、窄屏/实际跨断点inflight、reduced、持久布局journal及cold closed/open已通过，后新cold编辑器全文断言失败，整轮failed保留。独立正文livezoom raw已证明main1→1.25/DPR1.5→1.875，同display/visualScale1，请求前后opening且actual V383.17→680.84/W959.75；实际Tab used border.666667→.533333、class及inline尺寸不变，两个still-moving/frozen DPR epoch最大.000244140625、raw cross最大.804168701171875在有限budget1.2内。此是显式native zoom边界验证；empty-caption livezoom位于cold之后，本轮未执行，不计全部两具名livezoom矩阵通过。

本代理独立只读root指定且fixture.synthetic=true/作品和第2章ID与21一致的owned journal：snapshot rev55/issues[]，正文batch editing、唯一CHAPTER_CONTENT/PATCH请求，content48305字符，原始UTF8 SHA256 `1a1310a988d38e77fb70562ea200a9b8d01bb4616b66a2bc54348e14f98a8adc`精确等21首次真实Monaco textHash。recovery唯一AUTOSAVE_UNMATCHED保留相同全文/latest revision48307/status saved，无pending/inFlight/failed/paused；新autosaves全部idle/latestnull。旧staged首operationId与latest autosave operationId不同符合staged-changes81–109首control合并，必须各自与原记录比较，不误要求二者相同。长草稿没有在cold/drawer过程中丢失，不能据新editor的DB seed值宣称丢draft。

实际ChapterContentPanel59新实例由GET chapter.content初始化；draft-recovery98将旧autosave保留为AUTOSAVE_UNMATCHED，无写请求重放；RecoveryDialog27/31/34仅查看、复制、导出，string autosave preview经recovery-preview直接保留原文且本例<100000无截断。当前cold脚本495直接新“编辑”后要求旧暂存内容已在DB/input中，混淆了保留草稿与数据库提交。准入只cold helper的最小真实恢复路径：close前real readDraft固定唯一原autosave/staged及DB原稿；cold严格sameSnapshot/path/id/rev/op/fullvalue及batch、真实DB仍未提交；现有app.settings→通用→查看草稿，逐真实编辑副本按钮读取readonly textarea、唯一原全文精确匹配，再实际复制并boolean核clipboard全文。关闭对话后真实新DB editor原稿单列，实际Ctrl+A/正文菜单粘贴并严格Monaco全文=原coldExpected，natural autosave及原recovery/首staged control和未确认状态保持。原剪贴板只内存保存/finally复原，不日志、不在assert差异暴露；不写store、不直接注入expected、不确认/发送或删cold数据验收。最终码/hash与22实际UI恢复仍待补审，21原failed不回计。

最终`verify-content-drawer.mjs:178–205/522–523`独立实码补审无阻断：quit前读取仍连接的真实正文controller与唯一同snapshot磁盘autosave、batch/实际GET建立基线；cold按原path/id查唯一AUTOSAVE_UNMATCHED及完整原snapshot/rev/op/value、batch exact/DB unchanged，日志只长度/hash/元数据。实际Settings通用/查看草稿和readonly预览逐按钮唯一完整正文资格先存，再实际Copy、剪贴板仅boolean exact检查；新cold编辑器真实DB初值单列，实际全选与正文菜单Paste后等待/严格全文仍=原coldExpected，natural autosave新当前操作完成及旧recovery immutable/首staged control保持。旧autosave op与旧staged首op各自比较，未自动confirm/send/回放。原clipboard只局部内存、finally实际复原，未输出私有内容或实际差异。其他drawer/native oracle未改。

独立bundled Node24.19.0 `--check`实际exit0，SHA256 `df404b6e9ba4fc0ebe3c10806d3ad7278387050487be53e776fe8a34a7e7d730`与作者/root冻结一致，准入development22。作者随后提出JSON对象键序理论上可影响stringify完整比较；本代理核staged schema/record此正文路径没有实际键序差异证据，不据假设更改已启动22的冻结源码。若未来实际键序失败，完整deepStrictEqual可等价保留字段/类型/值语义，不能删字段。22新的真实UI复制/粘贴恢复和剩余empty矩阵仍待实际核，21原failed保持，未计整轮或产品完成。
