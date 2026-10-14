# 右侧内容抽屉真实 Windows 验收用例

收尾状态（2026-10-14）：用户确认“此任务目前已满足要求，可以直接收尾了”，已停止后续运行。21为44段/80check部分通过、整轮failed；22因主动缩放迟到整轮failed，冷启恢复helper尚未执行。23命令driver提案未实现/未执行，目录包动画与剩余空caption项目未执行。下文保留用例设计及审核历史，不作为全部通过报告；最终事实见 `2026-10-14-content-drawer-verification.md`。

初稿日期：2026-10-13。修订日期：2026-10-14（Asia/Shanghai）。状态：**第二十一次44captures/80checks已完成，正文livezoom新资格、窄屏/跨断点/reduced/journal及冷启closed目标与opening均通过；冷启新editor从DB原文初始化，旧脚本未走保留草稿UI即期待未确认正文，整轮仍failed。实际磁盘保留原全文/autosave op与revision及staged修改，限定真实查看/复制/粘贴恢复的DF404源码/check/hash已独立终审准入22；旧21不补算通过。** 本文不是通过报告。依据已补审通过的 `2026-10-13-content-drawer-plan.md`、`2026-10-13-content-drawer-plan-review.md` 及用户批准的 HTML。

本代理只写 `scripts/verify-content-drawer.mjs` 和本文件，未修改生产组件、种子、既有 native helper 或其他测试。脚本没有复制导航 CRUD 验收；仅使用既有真实隔离工作区建立本专项需要的正文、角色、主题与空 caption。

## 真实数据与执行边界

- 每次新建系统临时目录 `xaanink-sidebar-*`，复用 `scripts/seed-sidebar-navigation.ts`。该 seed 通过真实 Workspaces、PGlite、Prisma、DraftJournal 与正式 schema 建立两部合成作品，全部记录及账号仅在隔离目录。`XAANINK_TEST_ROOT` 指向该根；bootstrap 必须返回同一根、零模型及 `xaanink://app/` 协议。
- 正文、角色、主题通过真实 React UI 和 CDP 键盘/鼠标输入；查询/持久化检查走现有 local fetch→IPC 和 `desktop.readDraft`。不导入或修改 renderer 业务 store，不替换 body，不创建模拟 Monaco，不把 HTML 样稿作为产品证据。
- Monaco 仅通过现有 React hook 的只读实例发现读取真实对象。动作开始前存 actual editor DOM、editor 对象、model 对象/ID、selection、layoutInfo、scroll、version/alternativeVersion 和正文摘要；之后比较对象 identity、连接状态和 dispose 计数。关闭后的 `isVisible=false` 不代表实例丢失，保活断言使用 `isConnected` 与 editor/model identity。
- 开发 Electron和传入 exe 的目录包使用同一专项脚本，分别使用不同 label。证据目录创建不带 `recursive`，重复 label 在写任何旧报告之前因 EEXIST 拒绝。每次运行保存完整源文件、构建资源和 Electron exe SHA-256，结束再次检查，不允许构建中途变更与验收混合。
- 报告和逐帧 JSON 清理隔离根、工作区路径、用户 home 和 Key 形状；只保存合成界面截图，不保存完整 bootstrap、真实用户文件或 Key。临时夹具保留供失败诊断；脚本没有递归删除或移动命令。

## 执行方式

先完成用例独立审核与正式实现/构建。使用 **Node.js 24 或更高版本**，先让 PATH 中的 `node --version` 显示 v24+；脚本在创建证据/夹具之前检查 Node 版本，报告保存实际 harnessNode。当前系统默认 Node 20 不用于产品验收；本轮语法核验已用提供的 bundled Node 24.19.0 完成。示例命令中的 label 只是待执行命名，不表示存在证据：

```powershell
node --version
node scripts/verify-content-drawer.mjs development-green-01
node scripts/verify-content-drawer.mjs package-green-01 'D:\Projects\xaanink-desktop\release\win-unpacked\玄印写作.exe'
```

开发运行读取当前 `dist`、`.next/static`、`out`；目录包读取 exe 同目录 `resources`。必须已有匹配构建。证据写入 `docs/evidence/content-drawer/windows-<label>/report.json`、每段 `<name>-frames.json` 和阶段截图。失败保留原始报告、截图及未完成 capture，改进后必须使用新 label，不能覆盖 red 或失败证据。

2026-10-14 的 `windows-development-01` 已真实启动隔离工作区、renderer offline/0 models/无 main 监听并保持源/包版本稳定；随后因为 `getBounds.width=1801` 与请求 1800 的 exact outer 断言失败，尚未进入动画采样。原报告及截图保留，不能将这次启动或本 helper 修订计为动画验收通过。既有 sidebar 实测同一 scale=1.5 机器的请求 1800×1000、outer 1801×1001、content 1800×1000、renderer 1800×1000，证明外框可有 1 DIP 量化差，而实际 CSS 目标仍准确。

窗口 helper 保留参数的原生 DIP 语义。每次记录原始 request、每轮 adjusted request、actual outer、actual content、renderer inner/outer W/H、devicePixelRatio、Electron zoom、display scale 和 mode/phase；CSS 目标为 `round(request DIP / 实际 zoom)`，**innerWidth/innerHeight 必须精确达到目标，容差为 0 CSS px**。899/900 断点用 zoom=1，必须实际 CSS 899/900，不能以 outer 的 ±1 DIP 代替。

仅 CSS 未达目标时可做最多四轮 native 设置，每次按实际 CSS delta 和 zoom 得出补偿方向、原生宽/高各最多改 1 DIP，总偏移最多 3 DIP；超过 2 CSS px 的差异或窗口最小值/clamp 都失败，不能任意调整窗口绕过断点。outer 相对每轮 adjusted request 仅接受已有证据支持的 1 DIP 量化，仍不替代严格 CSS 断言。两次 in-flight 跨断点 resize 使用同一 helper 的 `settled:false`：只等两个 rAF 获取真实尺寸，不等待动画 settle，连续原始 capture 不停止。

in-flight 另保存 `inFlightResizeGeometry`：发出 native resize 之前和精确 CSS 目标达成时均读真实 viewport V/inner W/H，要求 `0.2 < V < W−0.2` 且仍为同一个 opening/closing 方向。仅有 moving 标签、但实际 V 已为 0 或完整 W 的终态注册 bookkeeping 必须失败，不能计为窗口 resize 与真实物理运动重叠通过。最终模式及所有动画 W/H/行框/相对布局/平移容差保持原判据。

`windows-development-02` 已实际通过隔离离线启动、1800×1000 精确 CSS 窗口目标、初始 caption 和三个 HWND 窗控命中；随后在正文准备时等待“已保存”超时，仍未进入动画采样。截图的“待保存”和“修改 1”符合正式三阶段保存：`src/lib/staged-save.ts` 的正文/角色/主题 PATCH 白名单先自然暂存，`src/components/content/use-autosave.tsx` 的 `SaveStatusIndicator` 在 hasStaged 时将 saved/saving/pending 都显示为 `staged-pending-indicator` 的“待保存”。旧失败报告、截图保持原样；修订准备判据不能计为产品动画通过。

三处准备使用同一只读 helper。修改前，从**当前真实活动业务面板**的 React hook 获取实际 AutosaveController 的 Playwright handle，仅读取 snapshot；记录动作前 revision、时间及实际 Tab ID。正文匹配字符串正文，角色匹配 `name/bio`，主题匹配 `title/synopsis`。修改后要求该 controller 仍属于同一活动面板，latest revision 大于动作前基线、latest 值等于本次输入；真实 `desktop.readDraft` 返回的落盘 autosave 必须匹配该 latest 的 operationId/revision/值，且当前/落盘控制器均为 saved、pending/inFlight/failed 为空、paused=false。当前 Tab 的 staged batch 必须仍 editing，确切目标/modify/PATCH/请求路径/字段值一致，updatedAt 不早于修改前；旧 journal 中偶然同值不能作为本次就绪。

同时只读真实 GET：正文 detail、角色 list 按真实 ID 找实体、主题 GET（尚无主题时允许正式 `theme:null`）。非成功 HTTP、包络或已存在实体丢失都失败。GET 返回字段 hash/长度/是否匹配本次输入单独记录；**未落库的合法暂存不要求 GET 提前变成本次修改，也不宣称数据库保存完成**。controller 保存失败/paused、任何落盘 autosave error/failed、journal issues、实际 UI 保存错误或 renderer page error 均不忽略。真实“待保存”指示及“修改 N”按钮、controller/journal/GET 摘要需连续至少四次且不少于 180 ms 稳定，再开始原动画采样；完整准备记录保存到 `preparationReadiness`。helper 不调用业务 controller 的 schedule/flush/retry/dispose，不确认/发送修改、不强制 DB 写入、不禁用 autosave、不接 renderer store；最后只释放 Playwright handle。动画、Monaco 和原生命中判据未调整。

`windows-development-03` 的真实正文准备已通过，GET 仍诚实记录原数据库内容、最新输入已在实际 autosave/staged journal 中完成；首段 `CD-N01-ink-long-body-close` 保存 42 个原始 rAF，随后失败于旧 harness 读取不存在的 `getLayoutInfo().contentHeight`（undefined 相减产生 NaN），源/构建/exe 均未变化。安装的 Monaco 0.56.0 公共类型 `node_modules/monaco-editor/monaco.d.ts` 中，`EditorLayoutInfo` 的 width/height 是编辑器可视尺寸，contentWidth 是可视正文区域宽，**没有 contentHeight**；实际 `ICodeEditor.getContentWidth()/getContentHeight()` 返回正文总宽/高，和 viewport/scroll 尺寸各有不同含义。修订在绑定基线、editorState、reset baseline、preflight 和每个 rAF 中独立记录 `editor.contentSize={width:getContentWidth(),height:getContentHeight()}`，保留实际 layoutInfo；动作期继续比较 layout width/height/contentWidth，并比较真实总内容 width/height，全部要求有限数值，容差仍为 0.25 CSS px。没有删除全文高度断言或增加容差；旧报告/frames/截图原样保留，缺少总高度的旧采样不能重解释成通过，必须新 label 重跑。

`windows-development-04` 的首次关闭仍 failed：12 个 interval 帧中，仅 item id39/index38 的空 DIV 在三帧 raw rect width 从 16777216 变为 16777215；其他全部节点 x/y/w/h 变化均小于 0.25 CSS px，真实 Monaco layout 1079×741、可视正文宽 1024、总正文尺寸 879×17221 恒定。安装 Monaco 0.56.0 的 `esm/vs/editor/browser/view.js` 创建 `.lines-content.monaco-editor-background`，并在 `_applyLayout` 明确将该 absolute 虚拟画布宽、高均设置为 16777216；`editorScrollbar` 将其置于实际 scrollable wrapper 下，真正 view-lines 宽度另由正文 scrollWidth 决定。全局 translate 的大坐标 rect 精度是待验证原因，**旧 raw 没有 class/computed/offset/client，不能仅凭空 DIV 和大宽认定原因或改计通过**。

诊断修订仅在每个原节点上补存完整 absolute raw `rect`、class、inline/computed width/height、offsetWidth/Height、clientWidth/Height、own transform，以及实际 Monaco editor DOM 的 owner identity；不删除任何节点，原 raw x/y/w/h、文字行框和公共 API 仍全部保存。`monacoVirtualCanvas` 仅标记实际绑定 editor DOM 下、直接父级为 `.monaco-scrollable-element` 的 `.lines-content.monaco-editor-background`，不按一般“大宽”筛选。当前 width 原 0.25 rect 断言尚未替换，需主代理使用新 label 获取这个明确节点真实 CSS layoutwidth 未变、全部可见行框和公共 API 仍一致的样本，再经独立审核决定仅该 sentinel 的 local layoutwidth 交叉 oracle。旧04 frames/report/截图保持 failed，不重计通过；本次诊断测量不是几何豁免。

`windows-development-05` 首次严格 close 通过：37 个 rAF、8 个实际中间 V、maximumRelativeGeometryDelta=0.0001220703125；真实 owned sentinel 的 offset/client 均为 16777216，computed/inline 的科学记数串 `1.67772e+07px` 稳定，本轮没有重现 raw width−1。这只证明本轮首段 close，不足以修改 sentinel oracle 或把旧04改计通过。随后 hidden released-caption 旧算法取 x=1788,y=16，进入 Windows 右端原生关闭按钮区域，WM_NCHITTEST=HTCLOSE(20)，整轮仍 failed；DOM elementFromPoint 看不到非 DOM 窗控，不能把该结果接受为 HTCAPTION(2)。

caption 选点修订仅取实际 caption 空白、右抽屉释放区和 Windows 原生安全区的交集。发探针前后都读取真实 native content bounds、zoom、maximized/fullscreen；右界按实际 native content/zoom 与 renderer width，至少排除正式产品的 138 DIP（CSS 为 138/zoom）右端窗控，且 y 位于正式 32 DIP caption row，普通窗避开 1 DIP 上边框。可用且非空的实际 WindowControlsOverlay titlebar rect 进一步收紧交集，并保存可用性/原始 rect；不可用时使用正式产品固定 reserve，不能只靠 DOM contains。before/after 均保存 `safeArea` 与 caption/button 点是否在安全区，同一 DOM、释放区、阶段与 zoom 仍须有效；任何漂移仍 inconclusive→失败。WM_NCHITTEST 期望仍为 caption=2、fixed button=1，native 三个窗控独立期望 8/9/20；没有把 20 转成 2。05 原报告/raw/截图保留，待新 label 实测。

`windows-development-06` 的 moving HWND 两个命中实际为 2/1，caption/safeArea/leak/phase 均有效，但按钮在关闭中移动导致 after.sameButton=false，整段诚实标记 inconclusive、整轮 failed。旧 selector 的 DOM 顺序先取 `[data-content-restore]`，其 x≈1322.802 并非固定 app menu，不能仅凭“按钮”名称当作固定控件。`WindowControls.tsx` 的真实 `button.desktop-windows-menu[data-desktop-menu-button]` 与 desktop.css 的 position:fixed 是唯一 HTCLIENT 探针；修订必须存在且仅一个、可见/非 inert/实际 position=fixed，不再使用 restore 替身。before/after 都保存实际 selector/class/computed position/display/visibility/absolute rect，原按钮中心点必须仍命中同一真实 DOM、处于安全区，x/y/width/height 变化小于原几何 0.25 CSS px。未改变 HT2/1、moving phase/sameCaption/releasedZone 或 sentinel oracle；06 原 inconclusive 证据不改计通过，待新 label。

`windows-development-07` 取得同帧交叉证据，但整轮仍 failed：56 个原始帧、26 个 interval，唯一 id39 是 exact `.lines-content.monaco-editor-background`、实际绑定 editor/getDomNode 且 direct scrollable child，所有归属标记恒真、无直接 text/行框。11 个动作帧的 raw width=16777215，preflight=16777216；同帧 inline/computed 恒为 `1.67772e+07px`，offset/client W/H 恒为 16777216，ownTransform 恒为 identity，公共 layout 1079×741/contentWidth1024 和 total content 879×17221 固定。11336 次文字 Range 比较，行框数量变化 0，max delta=0.000244140625；其余原节点 rect 无 ≥0.25 变化。原 frames SHA-256 `ed961f68b62d7ff416b7c73cf9be702e304312938765b38726f3919c3afcbf2b` 保留；这些交叉证据只用于审核判据，不能修改旧07的 failed。

**第二阶段提案与最终源码已独立准入（运行08 snapshot=A545506B…），首段关闭已实际执行，非整轮通过**：仅 reference/current 都是唯一 actual-owned、同 owner/DOM identity、direct scrollable child、exact canvas class、无任何直接 text/行框的固定 2^24 sentinel，才能按真实 offset 数值比较 W/H，同时 client W/H 必须交叉一致。inline/computed W/H 与 ownTransform 必须逐帧严格同 reference；offset/client W/H 必须均为有限数值、精确 16777216，再以原 0.25 CSS px 比较局部尺寸。CSS 科学记数串原样保留，不以 parseFloat 将舍入字符串伪造为精确 2^24；新增只读真实 CSS Typed OM width/height 的 value/unit/type/serialization，available/unavailable 如实记录且前后一致，实际支持时额外要求 px、finite、精确 2^24。不覆盖原 raw rect/w/h；资格任一不满足即明确失败，普通节点继续原严格 rect 比较，不跳节点。

该节点 x/y、全部普通节点和可见 view-lines/文字 Range，以及公共 Monaco viewport/content API、model/selection/scroll/undo 原判据一律保持。**任何 checked oracle 可能抛错之前**，完整 frames 文件先保存 `virtualCanvasGeometry.samples` 的逐帧 raw rect/W/H/delta、实际 local/Typed OM，以及 `maximumRawGlobalDelta`；main report 的 `virtualCanvasDiagnostics` 同时保存独立最大值与原文件来源，明确仅诊断而非 pass。成功 capture 的 `maximumRelativeGeometryDelta` 只用被验证的实际局部 sentinel W/H 和其他节点原 rect，`maximumRawVirtualCanvasGeometryDelta` 单独呈现大画布全局矩形差，`virtualCanvasLocalComparisons` 记录实际交叉次数。没有将 raw 差静默清除，也不按一般“大宽”过滤节点；旧07仍 failed，必须新 label 执行。

`windows-development-08` 真实首段 close 通过：57 个 rAF、26 个完整动作区间帧、23 个 actual intermediate V、局部布局 max delta=0.0001220703125，26 次具名 sentinel 局部交叉，raw canvas width delta=1 独立保存；运行的 harness snapshot 与最终独立审核 A545 完全一致，source/bundle/exe 稳定。随后 opening native before/after 均 opening、实际 HT2/1、同固定 menu、安全区/zoom 均有效；旧点 x=1285.416748 等于释放区 right=1297.416748−12，被向左移动的右抽屉消耗，after.sameCaption/leakPointStillValid=false，整轮仍 inconclusive/failed。

释放区左侧选点提案已独立准入：`leak=true` 仍使用实际 caption 空白 ∩ released-original-content zone ∩ native safe area 的原 start/end，只从 `start=max(caption.left+8,safe.left+8,released.left+12)` 向右扫描，而非靠运动中的 right−12；普通 nonleak 仍保持原右向左扫描。每点仍实际 elementFromPoint 属于同 caption 且排除交互控件。before 保存真实方向/start/end/caption rect、released zone 和点内校验，after 保存实际新 released zone；原 before/after sameCaption、leakPointStillValid、safe、same phase/zoom/fixed menu 及 HTCAPTION2/HTCLIENT1 全保持，边缘被吞仍必须失败，不能用 phase 或容差接受。08 原失败报告及完整/interrupted frames 保留；本次只改选点范围，不改生产或普通/文字/API/sentinel 几何判据，待新 label。

`windows-development-09` 真实正文 close/open、undo/redo 与同 Monaco model、HWND，以及角色 close/open 已完成，四段 capture/19 个 checks 已保存，页面 errors/HTTP requests 均为 0，source/bundle/exe 与 5043 snapshot 稳定；随后主题准备超时。最后一份样本证明实际 controller rev2 saved/current op、唯一落盘 autosave rev2、expected title/synopsis、待保存/修改2/无错误均正确，但旧 helper 把 THEME targetId 当作 novelId，导致过滤后的 stagedChanges 为空。

本代理只读保留的**合成 owned fixture**（先检查 fixture.synthetic=true 及 novelId 与09相同）真实 drafts.json：client revision48483、正确 theme Tab batch 的 phase=editing，唯一 THEME modify 的 targetId 实际为完整 `/api/novels/<synthetic-novelId>/theme`，与 PATCH requestURL 相同、novelId正确、title/synopsis匹配、updatedAt1791969910123。`staged-changes.ts` regular modify 使用 `Object.values(params)[0] ?? url`，Theme pattern 无参数，实际契约正是 URL（不采用过时类型注释、novelId 或数据库 theme.id）。限定修订仅 Theme 调用以已知真实 themePath 作 targetId；helper 增加未按 targetId 过滤的本 batch 同 kind/op 的 `stagedCandidateIdentities`，GET 的 `entityId` 单独记录，便于追溯身份。原 current operation/revision、落盘唯一同 op、PATCH/字段/时间/phase/UI/4样本180ms 稳定条件全部保持；不接 store、不确认/发送、不强制数据库保存。09 原失败证据不改计通过。

手动分栏阶段在09尚未执行，不能称为实际 red 或通过。只读09 Group1800/contentW1079.291748 及持久布局比例约 sidebar16%/chat24%/content60%，结合 DashboardShell 的静止 chat min420、content min30%，可知原 `s.x−95` 会扩大 content、消耗 chat 仅约十余像素的剩余空间，无法构成合法 >50 px 前置。经独立准入，仅将同一真实鼠标 down→steps12→up 的目标改为 `s.x+95`，缩 content 约到984，仍远高 content min约540，并给 chat 增加空间。原实际 abs(before−after)>50、收放后完整宽恢复差<3、全部 motion/实例判据保持；执行后才记录真实方向、请求距离和 before/after，不虚构实际分栏结果。

`windows-development-10` 使用最终独立审核的 9F345 harness，主题 current/controller/journal/实际 staged URL 准备已通过；之前正文/角色四段 capture、20 个 checks 保存，页面 errors/HTTP requests 为0，source/bundle/exe 稳定。Select capture 的完整 raw 在第一次 closing rAF 缺失唯一 id42：SPAN、class/role=null、空直接文字/0行框、raw rect/offset/client W/H均0；其他真实节点身份仍在，实际 bound listbox 首帧已 inert。旧 raw 没有 aria-owns/parent/clipPath，不能据外观把它认定为 FocusGuard 或改计10通过。

实际安装的 `@base-ui/react` 1.8.0 `FloatingPortal.js:197-200` 会在非模态 open guards 存在时生成独立空 SPAN，以 `aria-owns` 链接真实 DIV[data-base-ui-portal]；`internals/constants.js:42-46` 的 ownerVisuallyHidden 固定 position=fixed/top=0/left=0/clipPath=inset(50%)。该 SPAN 不是 FocusGuard。真实 SelectPortal 与 ItemLevelPicker 的 Popover.Portal 均调用此 FloatingPortal；仅下一 label 的实际 DOM 资格才能证明所遇节点身份。本轮已独立准入严格 runtime 路径，并在两限定文件实施，未再启动诊断应用。

只有具名 Select pause / ItemLevelPicker hide 的 reference 必须恰有一个实际 SPAN：单个 aria-owns token 解析的 connected DIV[data-base-ui-portal] 含显式绑定的实际 connected listbox（其最近 select-content 祖先也属于同实际 portal）或该具名 Picker dialog；无 class/role/childNodes/直接文字/行框/tabindex/contenteditable/交互标记，实际 rect 与 offset/client W/H finite 且精确0，inline/computed fixed/0px/0px/inset(50%) 全精确成立。Picker 在等待真实空等级体系 dialog 后只读绑定、收起/重开检查完成后清除引用，不泛收集 Portal/dialog，也不改变 outside-click 与 pause 共存的生命周期边界。

完整原始 items/rect 不删除；在任何资格或几何断言之前另保存 `portalOwnerUtilities` reference ids、每一帧 potential/source node 完整实际证据、数量及退出状态，main report 单列 diagnostic，不能把 raw 保存当通过。reference 唯一资格先严格断言；同 node 若仍存在则每帧资格和 source/parent/portal/popup/style 全精确不变，失去资格明确失败；退出后重新挂载或新的 linked utility id 失败。仅该实际 qualified id 的合法 popup-hide 退出从普通几何身份列表分列，所有其他节点的 fresh IDs/0.25 px/文字/Monaco/API、实际 phase/viewport/inert 和 popup 首个 motion 可见帧必须 inert 的判据保持。Item outside-click 在 Shell click 前可能关闭 open guards，此生命周期可先退出，但不能将它称为隔离 pause 因果。新 label 资格不成立就失败；10原失败保持。

`windows-development-11` 使用独立审核的 7062 harness，4段 capture/20checks、准备状态全通过，页面 errors/HTTP requests为0，source/bundle/exe稳定；Select资格 reference count=0，整轮仍failed。实际新 raw id45 已记录空 SPAN/无交互/全部零面积及 canonical inline/computed styles，aria-owns `_r_68_` 指向 connected DIV[data-base-ui-portal] 并包含实际 bound listbox，唯一 scope blocker 为 listbox 自身 `slot=null`。源码 `src/components/ui/select.tsx` 的 Popup 设置 select-content，内部 SelectPrimitive.List 才是 role=listbox（安装的 SelectList 实现也明确该 role）；此为 harness 定位假设错误。

经独立准入，仅将 Select scope 改为实际 bound listbox role 与 `popup.closest('[data-slot="select-content"]')`：该实际祖先 connected、不同于内层 popup、包含 tracked listbox，并被同 aria-owned portal包含。raw 保留 listbox 的真实 direct slot=null，另记录实际最近 ancestor 的 id/tag/slot/connected/containsTrackedPopup/insideAriaOwnedPortal，及真实最近 owned positioner 的 id/tag/owned/connected/containsSelectContent/同 portal归属；存续帧这些关系仍精确不变。没有换成 Popup 外壳引用，没有改原 listbox closest-inert/可见性测量，没有泛认任意 slot 祖先。其余 utility canonical资格、原raw、普通fresh-ID/0.25 px/text/API/phase/native判据保持；11原失败不重计，12随后取得下述实际资格证据。

`windows-development-12` 使用独立审核的 C455 harness，6段 capture/22checks 保存、准备状态通过，页面 errors/HTTP requests为0，source/bundle/exe稳定。Select pause 58rAF/28完整区间/25 actual intermediate V 通过，随后主题 open 也通过。新 raw 唯一 id47 为 canonical 空 owner SPAN，aria-owns→实际 portal43→bound listbox44/directslot=null→connected select-content ancestor45 与 ownedPositioner46 的所有真实链接成立；59份独立 utility样本中58帧记录该具名 proxy退出，无新ID或复活，普通全部布局/文字及首帧实际 popup inert 通过。独立 reviewer 已实际核这份资格证据；只计上述真实通过段，整轮仍failed。

失败发生于暂停后新的主动频道点击已让实际 listbox重新可见，随后 `keyboard.press('Escape')` 清理等待hidden15s超时；failure.png与报告显示实际 `base-ui-_r_33_-list` 仍可见。`DesktopCommandController.tsx:58` 对 listbox/Select早return以交由组件处理，本行不消费事件；安装的 BaseUI Select/useDismiss 确有自己的 Escape 和 outside-press 路径。现有失败证据没有 event target/defaultPrevented 等路由样本，不能称具体 Escape 根因已经定位、不能把它归因为这行 early-return，也不扩改产品键盘行为。

经独立准入，仅在新的实际 user trigger→listbox waitFor/显式 isVisible=true 断言**之后**，用真实可见“主题设定”heading外点击并等待实际 listbox hidden，再清除只读引用。此为后续 capture 的 UI清理，不改变前面的 `desktop.command('view.content')` IPC pause 原因、不用 outside-click 替代其因果证明、不写 Root/state/store/callback。记录 `postAssertionCleanup` 的实际外点击边界，原全部 proxy资格/普通几何/text/API/phase/native/首motion popup inert保持；13不声称 Escape验收通过，12原失败不重计。

`windows-development-13` 使用独立审核的 CEA harness，source/bundle/exe稳定、errors/HTTP为0，已保存6段 capture/22checks。fresh listbox重新打开可见的显式断言已通过；其后的 heading locator动作虽检测标题visible/enabled/stable，但实际 fresh Portal `_r_6r_` 内 `<div role=presentation data-base-ui-inert>` 每次拦截指针，因此15s超时而**从未实际发出 cleanup点击**。这不是实际点击后 popup未关闭；13仍failed，不改计通过。

安装的 `InternalBackdrop.js:28-31` 明确该marker供 Floating UI outside-press detection；`SelectPositioner.js` 在 mounted/modal 时渲染带 trigger cutout 的 InternalBackdrop，`useDismiss.js:321` 通过真实 outsidePress调用setOpen(false)。经独立准入，新的cleanup仍先保留 fresh-user trigger/listbox可见断言，再把真实主题heading滚入视图并测其实际中心。只读 `elementFromPoint` 必须命中 connected、实际visible、非HTML `[inert]`、pointer-events非none的 DIV[role=presentation][data-base-ui-inert]；其最近 BaseUI portal必须与**当前 fresh listbox** 的最近portal是同一实际节点且包含实际select-content/listbox，点与目标均在二者之外。不能泛认其他Backdrop、其他Portal或选项。

在任何cleanup资格断言之前，主报告单列 `selectCleanupDiagnostics` 保存真实headingBox/点、elementFromPoint target属性/rect/CSS/connected/inert、fresh listbox/content/portal与包含关系，失败也留。资格全成立后才通过 `page.mouse.click` 向该真实坐标发出CDP鼠标输入，等待实际 listbox hidden，再清除旧只读popup引用；成功记录实际输入与hidden后置条件。不会force underlying heading、不会DOM click/dispatchEvent、不会直接调用onOpenChange/store，原 IPC pause及proxy/几何/文字/API/phase/native判据不变。14只有真实鼠标结果通过才能计cleanup通过，不称标题收到点击或Escape通过。

`windows-development-14` 使用独立审核的 6AA harness，source/bundle/exe稳定、errors/HTTP为0，13段 capture/35checks保存。真实 qualified Backdrop清理、主题后续收放、actual ItemLevelPicker popup hide/reopen、fast reversal和bothclose已通过；Item hide为59rAF/28区间/25actual intermediate V，唯一actual qualified owner SPAN id41以aria-owns `_r_73_` 链接真实portal39包含显式bound dialog40，canonical空结构/style/零面积及role资格成立；native因果仍限于实际outside-click生命周期，不替代browser隔离pause证明。此后bothopen的旧最终宽基准失败，整轮仍failed。

bothopen实际 first-visible W1079.687744、其后完整motion W约1079.6875/H1000不变，frame25/26右V已到最终1079.291748但phase仍opening，左phaseopening→open；frame27才双方open后完整W合法重排至1079.291748。前一个bothclose的live separator实际宽0.6666666865 CSSpx；`desktop.css:254-257` 的border-only 1px会在当前DPR1.5发生snapping，不能以常数1px代替。真实journal内容百分比约60.005%，Group1800下初始1slot独立投影1079.689967、终态2slot1079.289933，与实际均差<0.003 CSSpx；旧bothopen没有live separator而用了fallback1，openingTarget错误为1079.48995。14不是motion挤压已证实的product red，也不能改计通过。

经独立准入，startCapture额外保存实际direct separator border-box rect/computed border/box-sizing/margins和Group padding/border/gap/panel数、actual sidebarV。每次pre-action有真实live divider时建立校准，完整key含当前launch、真实Electron zoom、renderer DPR/visualViewport scale、mode、窗口CSS宽高、Group宽高和主题class；新launch显式清缓存。仅具名bothopen在0divider预备状态可复用**紧邻bothclose** preflight的同精确key/双方open/2个live divider校准；无合法校准立即失败，不用fallback1、产品冻结属性或首可见W反算。零slot/narrow不需要divider宽，其他case不能使用此cache例外。独立初始W/H继续用动作前真实journal合法投影、Group实测结构预算和校准gutter，原0.08px不变。

具名bothopen的真实restore之后不固定sleep：连续rAF保存期间等待actual右V>.2且<真实完整W−.2、rightphaseopening及当前1个separator，才发送原Ctrl+Alt+b；再等actual左右V同时处于各自0/完整W端点之间且双方opening，记录命令前/后actual V/W、两phase、separatorCount与时间。过晚没有真实重叠须失败，不能把bookkeeping当并行通过；原完整raw不断采样。该操作顺序证明initial1slot在左命令前已真实注册，不能靠调度猜测。

仅该具名bothopen使用合法终态拓扑reflow：初始独立WH先验证首visible shape，再冻结该完整控件/文字/API形态；区间同时纳入左右phase以及actual左右V变化/最终端点，右标签提前open不能隐藏左运动。只在双方phase实际open、两侧V均已到最终端点、且已离开组合motion/注册区间后才允许W变化，另核final实际2个separator；全部原0.08/0.25、首popup inert、identity、scale/right锚、文字/Monaco检查保持。普通case不泛化此拓扑豁免；14失败证据保留，15随后得到下述真实校准/顺序/完整区间证据。

`windows-development-15` 使用独立审核的 F921 harness，source/bundle/exe稳定、errors/HTTP为0，13段 capture/35checks保存，整轮仍failed。实际same-key校准来自紧邻bothclose的2个0.6666666865px border-box，独立初始目标1079.689966正确，firstvisible6实际W1079.687744；命令前actual右V18.354/左V0/1slot，命令后actual右V569.364/左V73.979/双方opening/2slot，真实重叠得到raw证明。失败只在旧left-phaseguard：帧6/7右已运动，但左命令尚未开始且sidebarclosed/V0等于preflight；帧8才首次sidebaropening/V0，帧10才首次actual左V17.031；guard过早将启动前旧端点当作“距未来终态>0.2的运动帧”。15原失败不重计。

经独立准入，仅具名bothopen增加 `sidebarVisibleStart`（actual左V相对pre变化>原0.001）、`sidebarPhaseStart`（首opening/closing标签）与二者较早的 `firstSidebarMotionIndex`，完整raw在断言前保存这些索引。所有named左V样本及pre/final端点必须finite；索引前必须维持实际旧V（原0.001内）和旧phase；索引起任何actual左V距最终V>原0.2仍必须moving，因此启动后的early-open不能隐藏后续运动。联合区间/全部帧不删，首visible/full W/H及普通0.25/文字/API/inert全部保持；不是泛用旧端点来豁免动作中退出或提前终止。16仍需真实执行后核最终判据，15failed保持。

`windows-development-16` 使用独立审核的 58B9 harness，source/bundle/exe稳定、errors/HTTP为0；bothopen与fullscreen close已真实通过，共15段capture保存。fullscreen open preflight仍closed/V0/W1512.03125，Monaco layoutWidth1512/contentHeight11682/scrollTop10941；idx2 opening/V0时inner切换至合法普通目标W1091.218994，idx3仍V0时Monaco layout1091并重wrap、scrollTop13667；idx4首visible V18.34375至final全部scrollTop13667、contentHeight14611、layoutWidth1091恒定。实际model/版本/选区100:498全程保持。失败来自harness跨不同完整排版继续要求旧像素scroll10941，旧16仍failed；现有raw没有model视口anchor，不能声称其语义保留已经验过。

`hideContent` 明确恢复chatVisible=true，随后 `showContent` 按真实目标打开普通宽；所以此动作的target不是原fullscreen宽。真实Monaco组件配置automaticLayout/wordWrap；安装的ViewModel `_onConfigurationChanged` 先captureStableViewport，再重wrap并以原model position恢复其视口相对高度，因此绝对scrollTop可以在V0目标准备期间改变。公开 `saveViewState().viewState.firstPosition/firstPositionDeltaTop` 来自真实ViewModel.saveState；`getTopForPosition(原line,column)-getScrollTop()` 是同一模型位置相对视口的实际像素量。不能要求重wrap后的新firstPosition.column与旧wrap列边界相等，也不读取私有viewModel作为运行判据。

经独立准入，仅具名 `CD-N04-content-fullscreen-open` 记录公共viewState及固定原preaction firstPosition的逐帧actual top/scroll/delta。资格必须是preclosed/V0、紧邻已完成的真实fullscreen-close之前完整open W与closed W均对应当前preW，且动作前独立journal/Group正常目标W实际不同；首visible起每帧完整WH另严格比较这个独立目标。原公共anchor delta与saveViewState.firstPositionDeltaTop先交叉，全部V0准备及visible/终态样本必须finite、原modelposition不变、相对视口delta严格保持0.1px内；全部model/editor/selection/version/undo位置仍从preaction比较。任何实际anchor不保留仍失败，17结果才证明是否成立。

raw在断言之前保存 `scrollPreparation` 来源、firstVisibleIndex、独立WH、原/终态pixel值、原anchor及**相邻采样实际pixel变更**的index/V/前后值。像素重定位仅可在首visible之前且V<=原0.001；首visible起所有帧scrollTop必须与独立终态值相差<原0.1，scrollLeft仍与preaction<0.1，首visible/full形态与原0.25文字/API/ordinary全部保留。通常同W动作仍用原preaction像素scroll，不泛用firstvisible逃避检查；没有restore/setScroll或任何editor写操作，没有改产品。16缺anchor的原失败不重计；17已在下段记录真实结果。

`windows-development-17` 使用独立审核的55DB harness，source/bundle/exe稳定、errors/HTTP为0，28段capture/55checks保存。actual fullopen 50帧中原公共模型位置95:1/viewport offset−15全程差0，47可见帧pixel scroll13667严格不变，新的anchor判据真实通过；Tab拖拽、主题、真实手动分栏和zoom0.75/1.25动画也通过。失败在zoom1.25 native-controls的旧raw unsafe scan，报告列“物品/关闭物品/新物品”；该次尚未发出native系统窗控probe，整轮仍failed，不改计通过。

真实zoom1.25 raw：renderer1440、native content1800DIP，原native右safe区边界1329.6CSS/标题行25.6CSS；captionPadding144.8，真正tab viewport right1228.000061、tools right1295.200073均在safe区外。物品Tab原框x1314.908/right1391.708、新物品原框x1396.508/right1477.975，属于width-max-content track在clip viewport右外的布局框。当前及baseline `desktop.css:209/212-216` 已有viewport overflow:hidden/no-drag与所有后代app-region:initial；仅原始rect不能说明有绘制/注册越界，旧17 raw尚无新资格，不能反推为完整窗控通过。

经独立准入，仅actual `.content-tab[role=tab]` 或其 `.content-tab-close` 具有相同真实ContentTabs/直接track/唯一viewport归属时可使用该viewport的有效裁剪。新run必须实读viewport overflowX/Y=hidden、app-region=no-drag，节点至viewport以下链条computed区域均none且无inline覆盖，并从实际CSSOM保存确切 `.content-tabs-viewport *` 的authored initial声明；不以仅computed none推断源码initial。所有祖先实际rect/overflow/app-region/connected/inert保存，任何no-drag祖先登记框本身都须在原窗控safe区外；资格失去则回到原raw危险框检查，不泛裁剪普通按钮或工具。

全部candidate原raw rect/危险标签仍保留，另保存qualified effectiveRect、危险raw交集中心的实际elementFromPoint/目标identity及其是否命中原Tab/close，危险点仍命中该Tab则资格失败。实际bounded viewport和全部caption tools独立使用原始框检查同一138DIP/32DIP安全区，不能靠DOM命中豁免Electron native登记框。所有diagnostic先写report再断言，失败也留；通过此fresh资格后才继续真实HWND minimize/maximize/close=8/9/20，原固定menu、native区宽高及命中预期不变。18必须提供新真实资格和native结果，17原失败保留。

`windows-development-18` 使用独立审核的D135 harness，source/bundle/exe稳定；zoom1.25真实fresh裁剪/source/区域/命中资格及viewport/tools安全检查通过，raw“物品/关闭物品/新物品”框全保留，实际effective unsafe为空，随后真实HWND窗控命中8/9/20通过。因此只记录这次新的资格/native通过，17原失败不回计。

随后1.5稳态预置request1800×1000DIP，旧helper严格目标CSS1200×667。四轮真实证据重复为adjusted height1000→outer1001/content1000/innerHeight666/Group H666.666687，以及adjusted1001→outer1002/content1002/innerHeight668/Group H668；均未达到667。actual minimum760×580，显示workArea2560×1392、窗口位置约560/225，outer与content尺寸正常且在工作区内，没有minimum或屏幕clamp，失败是该fractional zoom/DPI组合的尺寸量化。不能用±1CSS容差把它宣称667通过，也不声明所有原生高度都不可能。

经独立准入，仅将三档稳态zoom循环中 **zoom===1.5** 的native height改为1002，width仍1800；1.5目标1200×668与18实际content1002/CSS668观测一致，0.75/1.25仍用1000。用户zoom验收没有固定1000DIP高度要求；所有实际请求/outer/content/CSS仍由原helper逐次保存并严格达到目标才继续。没有改bounds补偿/外框界限、899/900/780及inflight动作的精确CSS目标、断点模式或0.08/0.25/.1动画/滚动精度。此最终一行由root实际落码并负责语法/hash送审，本代理仅同步文档。19须按新合法WH真实重测，18原failed保留。

Root与独立reviewer已核唯一修订行、Node24语法check退出0及SHA256 `14845377536d6094c2a4c0095b27d5bc16492461fbb4741c6c7f345ab283599c` 一致，准入19；脚本冻结。本代理未再次修改或自行运行脚本。18新1.25裁切与native结果已被独立实读，原667目标不补算通过。

`windows-development-19` 的新1.5/1002预置严格达到renderer1200×668；source/bundle/exe稳定，之后zoom1.5 close仍failed。原raw54帧/26区间/23actual intermediate V中，唯一actual-owned `.lines-content.monaco-editor-background` id48/owner46保持全部source资格；local offset/client W/H全为14913079、实际computed Typed OM各轴14913079px，inline科学串仍1.67772e7px、computed科学串1.49131e7px、ownTransform恒identity。公共Monaco viewport359×351/contentWidth304、总正文270×52311、scroll47671保持；独立raw核对普通geometry最大0.0001220703、6448文字坐标最大0.0001220703、identity/行数无变化。raw global canvas width delta2仍独立保存。这些只是判据审核事实，19原失败不重计通过。

安装的Monaco view.js仍明确要求canvas16777216；[Chromium CSSPrimitiveValue源码](https://chromium.googlesource.com/chromium/src/%2B/3ae2445b341657eb817974dbbcd0f0ac6fc0345a/third_party/blink/renderer/core/css/css_primitive_value.cc) 对CSS长度设上限并留出rounding余量，说明巨大声明长度与actual used layout不必相同。当前runtime Chromium152/DPR2.25的具体14913079由真实API读取，**不从DPR猜测或硬编码精确clamp公式**，也不解析科学记数串伪造2^24数值。

经独立准入，只有既有唯一actual-owned/direct/exact class/无直接文本的source sentinel增加 **required** `attributeStyleMap.get('width'/'height')`：actual numeric px inline intent各轴必须精确2^24。已有computedStyleMap也改为required，actual numeric computed各轴须finite/正px/不超过intent，offset/client各轴必须严格等于这个独立computed值；reference/current的两个Typed snapshots与现有CSS串/ownTransform严格不变，再以原0.25检查local W/H。unsupported或任何资格不成立均失败，不泛认任意大框；该canvas x/y、所有普通DOM/文字/Monaco API原判据不变。原raw rect/delta全部保留，typedInline与typedComputed一并在任何oracle抛错之前落盘。此后canonical used size以此严格交叉为准，前述07阶段的16777216固定本地值仅是当时实际环境及旧判据记录。

独立reviewer已实核最终SHA256 `8C30ABA520111415778D235F70E243AF5AD5B01E8A00A35BAEA269F56EA0D2FF`、Node24check退出0及上述限定源码，准入20并冻结。19没有typedInline数值意图，仍failed；20真实numeric意图/readback及完整矩阵必须新run实测，不以准备审核计通过。本代理未启动产品，文档在root新run时独立同步，脚本不再修改。

`windows-development-20` source/bundle/exe稳定，31captures/60checks已完成、HTTP/pageerror均为0。1.5稳态动画及numeric inline intent2^24/computed14913079/local严格交叉通过；随后正文展开中的实际native zoom1→1.25阶段失败。原raw首个变化处 `.content-tabs-track` W751.072937→750.533386，Tab123.239586→122.975006，修改按钮86.9375→86.666672；全区间普通框最大差0.7999878、10712次文字坐标最大差0.8041687，identity及行框数不变，原采集字体/行高/padding/text/value不变。完整inner W959.75/H1000、真实editor959×741/contentWidth904和model/scroll保持。旧20未采逐帧DPR、实际native请求两侧V或四边used-border新资格，保持failed，不由此补算通过或宣称生产全部几何已验收。

独立审核准入的修订**只适用于** `CD-N05-live-zoom-CSS-geometry`、`CD-N05-empty-caption-live-zoom` 两个明确主动zoom动作。保存真实main zoom before/after与逐帧DPR/visualViewport scale；请求两侧均须actual moving且0.2<V<W−0.2，实际DPR比须等于native zoom比，OS display/DPI及visual scale不变，唯一DPR边界也必须落在非端点运动。所有原帧仍保存，必须恰有两个连续DPR epoch；每个epoch按其最后一个仍满足独立完整W/H目标且moving的真实样本，用原0.25检查全部普通框及文字行框，不使用合法终态reflow作基准。

跨真实DPR边界另存ordinary/text raw差异及由实际两网格计算的有限上界 `1/dprOld+1/dprNew`；这不是通用0.25放宽。跨全过程className、inline W/H、semantic font/border-style、原字体/行高/padding/text/value、identity/行数保持；逐帧保存实际四边computed border widths，同DPR须严格相同，跨网格须finite/非负且差不超过上述预算，结合既有content-tab固定1px边框及button border声明约束。完整W/H、冻结caption/内联安全padding、右锚/transform、Monaco公共API/scroll/model及首帧inert仍用原判据。raw元数据在断言前落盘，成功后分列same-grid最大值与cross-grid原始最大值，不能笼统称跨DPR每个CSS框完全不变。

最终SHA256 `7554B3138C4DE57CADC1F344759FC59706896915ADBADE767934C6DB796ADA24`、Node24check退出0及两项补强（实际请求两侧phase/W/V、跨全过程class/inlineWH）已被独立reviewer实际核对，准入21。脚本保持此hash冻结；本代理仅同步文档，21实际资格和完整矩阵仍需root新label执行。

`windows-development-21` source/bundle/exe稳定，44captures/80checks，HTTP/pageerror均0。正文livezoom实际DPR1.5→1.875及mainzoom资格通过，same-grid最大0.000244140625、cross-grid原始最大0.804168701171875，后者小于实际两网格上界1.2；其后899/780窄屏、两个真实非端点跨断点resize方向、reduced、真实45ms journal采样和cold closed/opening均通过。整轮在新cold editor正文检查失败，empty caption及目录包仍未完成。

真实owned合成journal独立核对为rev55/issues[]：原章batch仍editing/唯一CHAPTER_CONTENT PATCH，正文48305字符；recovery唯一该长正文为AUTOSAVE_UNMATCHED，saved/latestRevision=revision48307，pending/inFlight/failed均null且paused=false，全文与首次真实Monaco UTF8正文SHA一致；新autosaves均idle/latest=null。ChapterContentEditor从GET chapter.content初始化；draft-recovery把旧autosave保留为编辑副本；RecoveryDialog明确只查看/复制/导出，没有自动向新editor注入草稿。旧脚本跳过该UI后期待未批准正文成为DB正文，不能据此宣称丢稿，也不能把expected换成seed而放弃恢复验收。此处正文SHA采用直接UTF8 bytes；先前诊断JSON.stringify字符串的SHA是不同编码边界，不能混称。

获独立准入的修订仅named cold正文：关闭前只读当前真实panel controller及readDraft/GET，固定唯一正文autosave的id/完整snapshot/op/revision、原editing batch/PATCH和正式DB正文。cold后严格验证recovery path仍为原id、完整snapshot相同、原batch及GET DB truth相同、issues为空；再通过真实app.settings IPC→通用→查看草稿，实际编辑副本按钮逐项查看只读textarea，必须唯一完整全文等于原expected且未截断。真实点击复制内容，实际readClipboardText仅boolean校验为合成expected；原用户clipboard只存内存，finally恢复，不入证据或assert actual差异。

关闭RecoveryDialog后，新真实editor须确实等于已记录DB正文；通过真实全选和正文菜单粘贴恢复原全文，严格断言原expected不变，再走已有自然autosave/磁盘staged-ready检查。原recovery完整snapshot仍须保留、批次仍editing且原首control（operationId/expectedVersion/baseline/expectedUpdatedAt）保持；staged首op与latest autosave op各自对原基准比较，不能错误要求二者相同。没有业务store注入、editor setter、确认/发送或强制DB保存；新cold editor/model单列，不能冒充跨进程保活。21原failed保留，22须实际UI恢复后才产生新结论。

独立reviewer已实际核178–205的限定cold helper、522–523调用、Node24check退出0及SHA256 `DF404B6E9BA4FC0EBE3C10806D3AD7278387050487BE53E776FE8A34A7E7D730` 一致，无阻断准入22。脚本冻结；本代理未启动应用或native，22新UI恢复/raw及empty caption完整结果由root实际执行后组合。

`windows-development-22` source/bundle/exe稳定，31captures/60checks、HTTP/pageerror均0；正文livezoom非端点请求资格失败。before time176080.3为opening/V446.9167/W959.75；after time178273.6已open/V=W599.8917。实际DPR首次变化在idx106/time178167.2，此时也已open/V=W767.8000，证明缩放未与运动重叠，不能以“只是ack晚”放宽守卫。moving实际17帧/619.1ms，rAF间隔14.6–56.6ms（中位38.4）；这些只是调度记录，没有process CPU或逐IPC耗时，不能归因某个具体FS/IPC步骤。

源码中desktop settings在repository持久化后才setZoomFactor；旧动作路径还串行读取main before、bootstrap、settings和main after。正式`view.zoomIn`命令用已缓存真实设置递增0.1并走同一正式持久化。最小driver提案采用真实命令，在动作前采native before，首实际partial V立即触发，保留actual native after/DPR边界及两侧moving/非端点全部守卫；continuous setup正文1.15→1.25、empty1.4→1.5按真实增量记录，不能再称原1→1.25。新setup不额外要求bounds，实际CSS/Group/独立目标均记录，原三档和窄屏精确尺寸检查不变。须独立准入后实施并新label重测；22failed保留，cold新UI helper及empty本轮尚未执行。

## 验收矩阵

| ID | 实际动作和对象 | 必须断言与证据 |
| --- | --- | --- |
| CD-N01 | 从真实正文导航打开 seed 的长标题章，真实 MarkdownEditor→编辑模式；输入 100 行中英长行，开启 wordWrap；打开 ChapterContentPanel 的“正文功能菜单”确认真实工具。两主题各收起/展开。 | 包含 caption/Tab、工具条、帮助段落、Monaco 实际 `.view-line`/span 行框的全部 rAF；完整 W/H、控件相对坐标/大小及行框数和尺寸固定，无新增折行、无 scale。wordWrap 在动作前允许既有排版，动画不得增加折行。 |
| CD-N02 | 动作前真实选择两个字符并用 CDP wheel 建立非零 Monaco scroll；在动作前建立独立撤销历史标记。收起不可见、展开、换向、全屏、主题/宽高/窄屏动作后继续编辑。 | actual DOM、editor/model 对象/ID、dispose=0、正文、selection、scroll 及 model version/alternativeVersion。逐帧读实际 layoutInfo；动画后真实 Ctrl+Z 撤销**动画之前**的标记，Ctrl+Y 恢复；隐藏时真实 IPC editor.focus + Ctrl+Z 不能改变保留的不可见模型。跨终态窗口重排后允许合理 scroll 重定位，但动作期间 scroll 不变；冷启为新实例，不冒充同实例保活。 |
| CD-N01/03 | 真实角色“身份·外在”长姓名及简介；真实主题长书名及简介、频道 Select。 | 角色容器响应式卡片、标签、字段、工具和主题表单逐帧比较；输入值/textarea scrollHeight/scrollWidth 固定。真实 Select Portal 打开且保留焦点时，通过既有 `window.desktop.command('view.content')` 的真实 IPC 收起（避免 listbox 键盘门控，不使用外部点击）；每帧采集 actual popup 的 connected/visible/inert/aria-hidden，首个动作帧不得仍可交互；展开后不自动复活，新的主动点击仍可打开。此专项仅证明两种代表性表单，不声称已验收全部 29 面板。 |
| CD-N03 物品/拖拽 | 在隔离作品中通过真实物品管理 UI 创建一个物品，打开 ItemLevelPicker 直接 Popover，再点击可见 caption 收起并重开；真实 Tab 按住鼠标移动超过 6 px，出现 ghost 后键盘收起，再 mouseup。 | 原生产品实际 Popover 关闭且不自动复活；该可操作真实路径的 outside-click 和 pause 共存，不能单独宣称隔离 pause 因果证明。2026-10-14 新增 browser 实际 ItemLevelPicker case（真实组件、空 Query cache、真实 Shell hide，无外部点击）负责因果暂停、不复活和主动再开，未执行前不得称该项已通过。既有仅 shared Menu/Select/Tooltip/Dialog 的旧 browser 用例不能替代此 direct Picker 项。Tab ghost/source 清除、mouseup 不提交新顺序、取消后的焦点不落入 inert 区域，超过终态无旧 focus rAF 抢焦。 |
| CD-N04 | 收起→80 ms 展开→65 ms 再收起；左右同时收起和同时展开；内容工作区全屏（chat 实际 Panel 宽度为 0）后右抽屉收放。 | 最新意图终态、全部阶段完整固定形态；right independent phase 在左右共同落位前保持冻结。真实正文 instance 仍保活。内容全屏指真实 ContentTabs 全屏按钮；不将该项描述为 OS 物理全屏操作。 |
| CD-N05 | 静止时真实鼠标拖拽 content separator；899×680、780×680 实际 Electron 窗口；窄屏“查看内容”→收放→“返回对话”；收起中 1800×1000→899×680，展开中 899×680→1700×980。 | 手动分栏实际改变静止 W，再收放恢复该完整宽；窄屏为右覆盖层。**跨断点和宽高 resize 动作期继续采样真实业务字段、工具、文字行框、Monaco layoutInfo，相对布局及 W/H 全固定**；动作期 CSS mode 不变，终态落实新 mode 和最新 pane。返回对话持久化 `contentVisible=true/pane=chat`，真正隐藏为 false。 |
| CD-N05 zoom | .75、1.25、1.5 稳态 zoom 后收放；普通正文展开中从 1→1.25；真实零 Tab empty caption 展开中 1.25→1.5。 | 冻结完整 W/H、`--content-tab-scale`、真实 caption 控件与内联安全 padding，empty caption 同样比较；动作结束才接收新排版。两具名主动zoom必须通过真实main/DPR/非端点资格，同DPR连续epoch用原0.25检查，跨真实DPR边界只允许实际两像素网格的有限预算且原语义、行数、整体W/H/API/scroll固定。不能把物理缩放或边框像素取整说成全部CSS框完全不变。 |
| CD-N06 | reduced-motion 收放；正常收起时每 45 ms 真实 readDraft IPC 读取磁盘 journal；关闭并冷启同一隔离根，再通过真实保留草稿UI恢复正文。 | 减动实际 V 仅为旧/新合法端点，无几何中间值，允许 React 注册 bookkeeping 短暂使用 opening/closing 标签；等待真正合法终态。journal 样本只能为旧完整偏好或新合法目标，lastContentSize不能保存中间宽。冷启是closed，原autosave id/op/revision/全文及未确认staged字段完整保留；实际查看/复制/粘贴恢复原全文，新editor从DB原文初始化的truth独立记录，新开实例重新建立baseline。 |
| CD-N07 | 在每次 initial/cold/empty launch 查看真实 bootstrap 和 main 活动监听；整个可观察会话保持 renderer offline、0 模型、无页面错误/外部 HTTP。 | 保存每个 launch 的 protocol、runtime、bounds、zoom、listener 数；所有已观察 HTTP/pageerror 必须为零。Playwright 调试通道是验收工具，不是产品 HTTP 监听。请求与页面错误观察从 firstWindow 开始，不能将此称作 pre-entry/service-worker 网络拦截；正式离线启动的额外已有 guard 验证仍由主代理组合。 |
| CD-N07 HWND | 开放/隐藏/动作期间，真实释放出来的 chat caption 空白点；固定 app-menu button；native 右端三个窗控，包含常态、maximized、不同 zoom、empty caption。 | 不改 `sidebar-native-hit-test.ps1`，调用真实 HWND WM_NCHITTEST，caption=HTCAPTION(2)、固定菜单/按钮=HTCLIENT(1)、native minimize/maximize/close=8/9/20。移动探针前后须同一阶段、同一实际元素且固定坐标仍位于 released zone；漂移只能是 inconclusive→失败，不能拿 settled 结果计 motion 通过。检查 clipping 后越界子控件 app-region/no-drag 不覆盖 chatcaption；检查 renderer 内容控件未进入右端固定 138 DIP 窗控安全区。 |

## 逐帧判定协议

定位使用真实 `.content-drawer-viewport`、`.content-drawer-inner`、`.content-tabs`。每次动作前同步采集完整 preflight 和真实磁盘目标，rAF 每帧重新 query viewport/inner/tabs/active panel、计算真实 CSS style，并由 WeakMap 分配 identity和连接状态，不引用已脱离文档的缓存子节点。初始注册/零宽预备帧和终态仍全部保存。

隐藏偏好冷启允许尚未首次创建 content Panel。对此 preflight 和注册准备帧记录 `exists=false`、缺失节点、实际 V、Group W/H、mode/phase 与独立目标；不能在发出打开命令之前要求已经存在 inner。命令后首次真实完整 DOM 作为该新挂载动作的固定 identity 基准，首个可见完整形态仍严格比较独立终态 oracle、全文行框和布局；不存在的注册帧只能是 V≈0。动作前已有 DOM，或本动作已观察到真实 DOM 后再消失，均必须失败；closing 绝不接受 absent preflight/帧。冷启首次挂载在报告 registration 单列，不把新的 DOM/editor/model 与上一次进程的 identity 比较，也不称跨进程实例保活。此兼容修正已独立准入，仍未运行 native。

**运动区间由实际 V 对 preflight/最终 V 的变化确定，不能仅按被测 `data-content-phase` 筛帧。** 从首次实际 V 变化（0.001 CSS px）或 phase moving 二者较早处开始，连续采样到最后一个非终态 V 或最后一个 moving 标签二者较晚处；中间即使产品提前标记 open/closed，帧也纳入比较，非终态 V 必须仍为 moving phase。终态必须实测 closed V≈0 或 open V≈完整 W，不以标签本身代替。普通动作至少 4 帧**实际 V 位于旧/新端点之外**的 motion，不能用 opening 标签持续四帧但最后瞬间跳变代替运动；观察窗口至少 820 ms 后再等待实际 viewport 几何稳定，避免提前 phase/短暂静止导致提早停止采样。报告分别保存完整区间、实际中间 V 和 phase 标签帧数，三者不混称。

首个 V>0.001 的真实可见帧完整保存并接受断言，不能把该帧自身错误的 W/H 当作独立正确基准：收起/反向从**动作前已完整打开的 preflight**建立 W/H、实际控件及文字行框基准；普通展开从**最终合法完整形态**建立独立基准，连同首可见帧一起比较。这样整个动作错误地固定在默认窄宽、最后才重排，也不能通过。

显式跨断点/宽高 resize、动作中主动 zoom，以及上述唯一具名bothopen的1→2slot终态拓扑，使用 `allowTerminalReflow` 标记真正终态重排。其 closing 仍用 preflight 完整形态；其 opening 的初始 W/H 在动作之前按实际 Group W/H、真实 journal 的 lastContentSize/sidebar/chat intent、实际 separator slot/校准gutter及Group结构预算、批准的 200/420 px/30%合法投影求独立目标，不能读取产品 frozen-width 或首帧反推。先校验首可见 W/H 等于这个目标，再将该完整形态的控件/行框冻结至实际 V 区间完成；具名bothopen还延长到左右actual V/phase共同完成。窄屏目标是动作前实测 Group W/H；在完成后才接受新窗口尺寸的合法排版。内容工作区全屏态的普通关闭和重开仍分别使用 preflight 和最终完整形态，没有将 full 字样作为任意豁免。

当前实现的两阶段终态先在相关轨道完成、实际 V 到终态后提交新 mode/divider，再保留冻结及 moving 标签至下次注册提交。旧 mode 断言只适用于**实际非终态 V**，不能把已结束物理运动的注册 bookkeeping 误判为模式提前切换。这些终态注册帧仍全部纳入宽高、文字行框、控件相对布局、scale/平移、DOM identity 与祖先 inert 检查，不删帧；真正结束后另外要求最终 mode 等于实际 `window.innerWidth` 对应的 900 px 合法模式。此调整已独立审核，仅修正 harness 的等同语义定位，不是产品 native 通过证据。

减动模式按所有采样的实际 V 仅为旧端点或最终合法端点（0.2 CSS px）判断，无几何中间帧；不要求 zero phase 标签帧。非零可见端点仍检查完整形态，短暂注册标签不构成虚假失败。

每段实际运动比较 W/H（0.08 CSS px）、完整相对几何与 DOM Range 每个行框（0.25 CSS px）、transform matrix 的 scale=1/skew=0/ty=0。右锚检查 `tx=max(W−V,0)` 以及 `inner.right−viewport.right=max(W−V,0)`（0.2 CSS px）；不能误写为左栏 `V−W`，也不能只验证 transform 字符串而遗漏 actual bounds。V>W 时位移为 0、无缩放。不可交互从真实 inner/tabs 的 `.closest('[inert]')` 判断，允许 inert 合法位于 Panel 或其他内容祖先，不要求某个指定 wrapper 自己带属性；完成后按终态恢复。固定 caption scale/实际 computed padding 和新 CSS mode 只在所有相关动作完成后变化。

文本测量覆盖真实活动业务 panel、caption/Tab及直接文本节点的 DOM Range rects；textarea 另比较内容 scrollWidth/scrollHeight。只排除**元素自身**的 `input[type=hidden]` 或 `[aria-hidden=true]`，避免 BaseUI Select 的 fixed 1 px 不可见 form proxy 被当成真实字段；不根据抽屉祖先的 aria-hidden 排除子控件，motion 中真实字段仍全部采样。owned Portal 自身若仍可见，则必须实际 inert，不能只凭 aria-hidden 宣称不可交互。Monaco 读取实际 layoutInfo 与每帧 selection/scroll/model version；不以外壳 W 不变代替正文排版。人工截图用于查看具体形态，自动原始行框证据用于验证全过程，不能只用终态两张截图证明没有挤压。

## 结果边界

本代理只执行 Node 24.19.0 的 `--check` 语法检查，没有启动应用或自行运行 native。前二十次边界见上述记录；第二十一次正文livezoom新资格/窄屏/跨断点/reduced/journal/cold目标与opening已真实通过，冷启未走真实草稿恢复UI使整轮仍failed。原autosave/staged全文已独立核实保留；当前仅named cold恢复helper修订，DF404源码/check/hash独立终审准入22。实际cold Copy/Paste恢复、empty caption及目录包完整矩阵尚待完成。审核不等于产品通过，旧失败均未重计通过。开发和目录包必须分别执行后再写实测结果。本专项不承担全仓回归、所有业务操作、macOS、物理鼠标拖窗、Windows 真实 IME、NSIS 安装或系统显示比例变化；这些未执行项目不得计通过。
