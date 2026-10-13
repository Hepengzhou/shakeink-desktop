# 文本选区右键菜单独立方案审核

审核日期：2026-10-13（Asia/Shanghai）。审核范围：`research.md`、`product-design.md`、`technical-plan.md`、`viewer.tsx`、`preview.css`、`index.html` 及相关既有源码。审核方式为源码和本地类型声明核对；未执行安装版原生菜单、未使用用户数据或真实 Key，不声明目标系统通过。审核者只写本文件。

结论：统一适配器、Electron 原生菜单、原组件复用和用户 HTML 审核门的方向成立。初稿存在两处文本契约冲突和三处审核稿交互问题，须先修订，再完成用户 HTML 审核。后续实现前还须补齐原生特殊控件通道、Monaco 菜单保留及异步执行守卫的具体合同。以下结论区分已经存在的源码事实与后续方案要求。

## 已核对且可保留的方案

- `src/lib/desktop/input-commands.ts:25-65` 的菜单入口确实只接受带 `data-desktop-clipboard="api-key"` 的 password input；`DesktopCommandController.tsx:31-34` 确实只安装该入口。现有普通控件命令支持不等于右键菜单覆盖，调研的主要原因准确。
- `desktop/main/input-context-menu.ts:6-25` 已有每个 BrowserWindow 替换 pending 菜单、失焦/关闭取消和 `Menu.popup({window:owner})`。可扩展该生命周期，无需另造 DOM 菜单作为安装版实现。`desktop/shared/input-context-menu.ts:2-15` 的严格协议目前只有六项命令，加入引用、删除、纯文本粘贴和菜单分组需要同步更新协议、主进程及 preload。
- `src/app/desktop.css:18-23` 包含 email、number、date、datetime-local、month、week、time、contenteditable 和 plaintext-only；只改 `inputTypes` 或只接 `selectionStart` 不能覆盖现有可选文本。只读/禁用来源应区分“能读取选区”与“能修改”，不能因禁用就整体忽略文本菜单。
- `ChatPanel.tsx:1481-1509` 具有原有 DOM→store 同步和外部草稿变化全量重建路径；`ChatPanel.tsx:1645-1655` 已有聚焦、末尾 Range、`insertDraftAtCaret(...,{nativeUndo:true})` 和同步的可复用写入模式。引用应复用后者，不能只 `setDraft(old+quote)` 引发重建丢撤销。
- `CommentablePreview.tsx:238-274` 通过正文块、DOM 选区和渲染映射生成评论锚点；`text-selection.ts` 只处理左键拖选及卡片行为。统一右键处理必须保留这些左键流程，不把右键事件变成卡片点击或评论提交。
- `DesktopCommandController.tsx:17-19,41-46` 明确把 dialog/alertdialog 作为命令屏障；`components/ui/dialog.tsx` 使用 Base UI Portal/Popup。方案中的“Dialog 内基本操作可用、禁止编辑背景时引用置灰”符合既有边界。
- 本轮用户明确要求 HTML 审核，优先于 AGENTS.md/旧批准的一般自动推进条款。当前不能因旧 UI v0.13 已批准而进入生产实现；方案已保留该门。HTML 操作与模拟剪贴板也不能当作原生菜单验收。

## 必须修订：提交 HTML 前

### R1：明确 chip 的引用正文与复制正文不同

初稿产品“引用到对话”一节同时要求“可见文字、无隐藏元数据”，又写“chip 包含于选区时复用原序列化格式”；二者不能同时成立。`composer-editor.ts:14,65-69,141-169,173-185` 证明 chip 的 `data-insert` 可携带未显示的标识负载，`selectedEditorText` 会还原完整序列。若直接把这个结果作为普通 Markdown 引用，还会隐式保留实体身份，冲突于产品的跨作品普通文本约定。

必须确定：右键“引用到对话”取选区中的可见标签/文字作为普通引用；原草稿中的 chip DOM、序列、稳定身份仍保留；剪切/复制继续走原本的序列化合同。引用和剪贴板不能共享未经区分的 `selectedEditorText` 结果。审核稿应展示至少一个原 chip 保留及普通引用结果的说明或场景。

### R2：修复审核稿默认正文选区入口

`viewer.tsx:67` 使用 `#body-preview [data-review-text]` 查后代，而 `viewer.tsx:143` 的 `data-review-text` 在 `#body-preview` 自身；真实 `MarkdownPreview.tsx:25` 的后代是 `data-text-preview`。因此初始 effect 会返回，默认显示的“当前选区”文案不能代表实际选区，预期的初始菜单也不会打开。应选择实际正文节点，建立真实 Range 后展示菜单。

同时 `sourceAt` 目前把整个 `#body-preview` 当文本源，`selectAll` 对它执行 `selectNodeContents` 会覆盖审核用章节元信息、标题和底部说明。正文来源应限定到真实 Markdown 渲染边界，使全选只作用于文本内容，并保留跨段落选区。

### R3：使键盘菜单真正可操作

`viewer.tsx:53-56` 打开菜单后没有移入菜单焦点，而 ArrowDown/Up/Home/End 只注册在 `viewer.tsx:150` 的菜单容器。用户按 Shift+F10 后焦点仍在源区域，随后方向键无法到达菜单的 handler。需要在键盘打开时聚焦首个可用菜单项，并保存源 Range；Esc/取消恢复原来源焦点与选区，不能将选区复原与菜单焦点争用混在一起。鼠标打开应继续保留原选区。

### R4：敏感演示剪贴板关闭菜单后也不显示内容

`viewer.tsx:113` 的复制会把 API Key 合成夹具加入 `clip`，`viewer.tsx:146` 只在 popup 存在且敏感时遮挡展示；复制后 popup 已关闭，侧栏重新显示 clip。这里是合成夹具，不构成真实密钥泄露，但审核稿的行为与“敏感内容不在审核栏显示”不一致。需记录剪贴板内容的敏感标记，跨菜单关闭和场景切换继续遮挡；正常 password 与获准 API Key 的不同复制能力也须在产品/审核稿说明清楚。

## 必须补齐：测试用例审核与 TDD 前

### T1：特殊原生控件的受限文本回传及唯一菜单所有权

技术初稿要求文字始终留在 renderer，又要求用 Electron 的原生 context-menu 对无 `selectionStart` 控件获取准确选区，合同尚不闭合。本地 `node_modules/electron/electron.d.ts:21430-21436,21501-21504` 确认 `isEditable`、`selectionText` 和 `editFlags` 是 main 的 context-menu 参数。必须明确普通 DOM 源的菜单请求仍不携带文字；仅特殊控件允许 Electron 自身传来的选区在 main 临时内存存在，经验证的同窗口/主 frame/当前请求向原 renderer 回传非敏感选区，永不记录日志或持久化，password/API Key 不进入引用回传。

还须写明 DOM 路径、原生 fallback 与 Monaco 哪条路径拥有一次右键请求，如何避免两次 Menu.popup，如何在主进程原生回调与 renderer 快照间配对。关闭/失焦/来源卸载/替换请求/导航要终结 pending；不能以新的全局 focus 去推测原控件。`desktop/main/index.ts:457-463` 当前使用全局 `window`，扩展时应绑定已认证 sender 对应窗口和主 frame，阻止不同窗口复用选择；坐标须使用受限有限值与统一缩放语义。

对 email、number、date 等来源分别用真实 Electron 验证。若目标 Chromium 对某种控件没有可选文字或没有某项编辑能力，按其实际 editFlags 禁用该项，不能回退到整个 value 冒充选区，也不能把整类控件默认为“不支持菜单”。

### T2：Monaco 模型选区和专属菜单动作

本地 `monaco.d.ts:2353,2664,2673,3052-3056,3855,6384` 提供模型范围文本、canUndo/canRedo、selection(s)、contextmenu 配置和 onContextMenu。现有 `MonacoMarkdownEditor.tsx:112-157` 没有关闭内置菜单，`monaco-commands.ts:175-203` 则通过真实 action/trigger 保留编辑栈。应明确只在文本区域接管菜单；查找输入、评论 ViewZone、滚动条、装饰和非文本区各走其原来源。

“保留有用的专属动作”需变成具体合同：在公共文本分组后追加 Monaco 本地可用动作，或采用明确的编辑器操作子菜单，基于真实 action/when 和用户快捷键配置，不能静态硬编码失效 action。写明多光标选区的复制/引用顺序、分隔方式和全部范围的版本/身份守卫；不能仅读主选区而把多个选区执行给另一快照。菜单撤销/重做状态应由真实历史能力判断，不能只因 action 存在便启用。

### T3：每次异步副作用前检查源与目标 epoch

`native-text-edits.ts:56-101` 已在 clipboard await 后复查输入/DOM/焦点，并用 MutationObserver/takeRecords 防编辑 host 的属性 ABA。应复用其保护且增加会话/作品/窗口与统一请求 epoch：A→B→A 会话或同值输入并非旧请求再次合法；preview DOM Range 和 Monaco model/selection 也需生命周期递增证明，不能只最终 JSON/HTML 相等。

引用追加须在最终插入前核对当前对话身份、recovery、creatingNovel、composer 可编辑/未在 IME 组合、无背景 modal 屏障；无需模型也允许准备草稿，且不得调用发送。clipboard 写入后剪切删除须再次校验；clipboard 读取后粘贴须再次校验。输入/选区变化、重开菜单、模型换绑、来源卸载、窗口切换均终结旧操作。右键 pointerdown 建立本次 epoch 后再取快照，不能把打开菜单的自身事件判为污染；恢复目标焦点的内部事件也不能误杀合法提交。

### T4：完整类别矩阵和真实历史验收

测试必须分别列 AI 用户消息/回复/代码、可编辑及只读 composer、普通 input/textarea、plaintext-only contenteditable、只读/可选禁用控件、Portal 内表单、卡片摘要、评论正文和 Markdown/正文跨段选区、Monaco 普通及多光标选区、特殊原生控件、正常 password/API Key。涉及不可编辑控件，引用还需当前对话可写的独立判断。

为引用增加“原草稿、实体 chip、撤销一次撤销引用、重做恢复引用、源是 composer 自身、原文不变、没有自动发送”的真实组件用例，并逐项覆盖异步 ABA/取消。全量浏览器/单元通过不能代替 Windows/macOS 原生 Menu.popup 操作；不能只 mock 菜单返回 ID 或查询模板就判相应场景通过。缺少真实 macOS 机器必须保留待验收。

## 复核状态

2026-10-13 初审：待修订 R1-R4；T1-T4 在实现前必须进入正式方案/测试合同。主代理已通知将落实 chip 可见文本引用、特殊控件临时主进程选区回传及 HTML 修订；通知代表修订意向，尚不作为完成证据。待补丁后逐项核对并追加复核结论。

## 2026-10-13 修订后独立复核

结论：**R1-R4 已在设计合同和审核稿范围内修订，可提交用户 HTML 审核。** 这只解除独立审核提出的 HTML 提交阻碍，不代表用户已批准，也不代表生产实现、原生菜单、完整测试或最终验收已经通过。T1-T4 中尚需具体化的实施合同继续保留，必须在用户通过 HTML 后、测试用例审核及 TDD 前落实。

本次复核只读取修订后的文档、源文件、构建入口、验证脚本、结果 JSON 和四张截图，另外计算结果 JSON 中八个生产文件的当前 SHA-256；八项均与报告一致。没有重新执行会改写截图/结果 JSON 的验证脚本，没有修改生产源码，也没有访问真实用户数据或 Key。

| 初审项 | 修订证据与复核结果 |
| --- | --- |
| R1 chip 引用正文合同 | `product-design.md:38` 现在明确选中 chip 仅引用可见标签、剪切/复制/粘贴保留原序列化；`technical-plan.md:19` 同步该边界。`viewer.tsx:145` 增加不可编辑原子标签示意，引用取 Selection 的可见文本，原子标签没有隐藏实体负载。脚本验证正文引用后原 chip 数量仍为一，证明审核稿这条保留行为；具体选中 chip 后引用的真实组件合同仍由后续 T4 用例证明。 |
| R2 默认选区及正文来源边界 | `viewer.tsx:4,67-76,40,147` 使用 memo 包裹真实 MarkdownPreview、定位实际 `data-text-preview` 正文节点，再建立默认 Range；外层章节标题/说明不再带 `data-review-text`，右键来源和全选范围落在正文。报告的初始选区精确值、只读单菜单及正文/Markdown 真实鼠标右键检查与修订吻合；`preview-paper.png` 实际显示正文高亮和九项菜单。全选排除审核文字由当前来源边界代码核对，现有脚本尚未对这一点单独执行断言。 |
| R3 键盘菜单可操作 | `viewer.tsx:55-59,80-84,98-102,154` 新增键盘打开标记、首个可用菜单项聚焦、方向键导航及 Esc 恢复来源焦点/保存 Range。验证脚本实际发送 Shift+F10、ArrowDown、Esc，并断言首项焦点、导航变化和原 input 焦点恢复；足以证明报告中这条审核稿行为。输入选区方向的精确保留仍需后续产品适配器按 T3/T4 核对，不能从目前的 focus 断言推导。 |
| R4 敏感演示剪贴板持续遮挡 | `viewer.tsx:19,117,150` 增加独立 `clipSecret`，复制敏感合成字段后即使 popup 关闭仍遮挡侧栏。验证脚本实际复制 API Key 合成占位，断言引用禁用、复制可用及关闭后的遮挡。`preview-ink.png` 在切换到正文与玄墨后仍显示遮挡，支持跨菜单/场景/主题持续遮挡；报告不包含正常 password 的单独 UI 演示，产品文档已明确正常 password 与获准 API Key 的能力差异。 |

特殊控件的文字通道冲突已在 `research.md:39` 与 `technical-plan.md:9` 澄清：普通菜单请求只传能力/标识；特殊控件允许 Electron 事件选区临时存在 main 内存，经同窗口/主 frame/请求与非敏感来源守卫回传后释放，禁止日志与持久化。这是可实施的设计边界。事件配对、唯一菜单所有权、main sender 绑定和能力校验仍属于 T1 后续技术细化及测试内容，当前没有实现证据。

### 审核稿验证报告能证明的范围

`verify-preview.mjs` 的十五项结果与具体断言基本对应：离线 file URL 加载后的实际 DOM 选区和九项菜单；选中正文追加引用、原草稿/示意 chip 保留及发送禁用；鼠标拖选后单次右键打开 AI 回复、Markdown 与正文菜单；composer 可编辑项；普通 input 剪切/粘贴/删除及 Chromium 撤销；键盘打开/导航/Esc；只读全选及修改项禁用；无选区粘贴；合成 API Key 的复制与遮挡；双主题及设计用平台快捷键标签；480×900 视口菜单边界、无横向溢出和外部关闭；浏览器错误、HTTP 请求及所列八个源文件在脚本运行前后的哈希比较。

这些不是十五组产品业务验收。其中“只读拒绝修改”验证的是菜单 disabled 状态；composer 检查的是命令可用状态，没有逐项执行；正文全选边界、选中 chip 的引用、引用自身撤销/重做、跨段/多选区、普通 password、Dialog、真实特殊 input、会话/DOM ABA 与 IME 不在现有脚本执行范围。报告已经在 scope 明确排除产品、Electron 原生菜单、系统剪贴板、真实 macOS 和物理 IME，不能扩写为这些行为通过。八个源文件哈希相等只证明所列文件在这次脚本执行区间内未变化，不能证明仓库所有文件或其他任务没有改动。

已查看 `preview-paper.png`、`preview-editable.png`、`preview-ink.png`、`preview-narrow.png`：菜单信息分组、引用首项、禁用态、双主题、示意原 chip 和引用后草稿可辨识；窄视口菜单在画面内，截图处于页面滚动位置。当前未发现阻止用户审核此稿的信息结构或排版问题。废弃的 `preview-failure.png` 不应作为成功证据提交。

下一门：用户明确通过本次 HTML。通过后继续 T1-T4、测试用例独立审核、失败测试、实现、独立 code review 和真实目标验证；不能因本次复核“可提交审核”自动跳到实现。

## 2026-10-13 用户历史分组修订独立复核

最新用户要求为“非输入框、非编辑的文字应该没有撤销/重做”。本次结论：**修订后的产品合同、技术预案、HTML 源码及验证报告符合该要求，可继续提交用户审核。** 本节覆盖此前审核记录中的“只读预览保留撤销/重做置灰”和“正文九项菜单”旧描述；旧描述仅保留为历史审核记录，不能作为当前实施合同。生产代码仍未在本阶段实现或验收。

源码与文档证据：

- `product-design.md:16,20` 将历史分组限定到输入框和编辑区，并明确只读输入框仍属于输入框；AI 对话、Markdown/正文预览、评论原文、卡片摘要省略整组。验收表新增历史分组及无空分组/连续分隔线要求。`technical-plan.md` 的“菜单来源类型与命令启用能力分别判断”段落实相同规则，未用 `editable=false` 将只读输入框误当静态预览。
- `viewer.tsx:11,28-34` 的快照新增独立 `historyMenu`：input/textarea、composer 编辑宿主、实际 contenteditable 为历史组来源；`editable` 仍单独判断只读/禁用。历史两项的启用条件仍是可编辑且 Chromium 对应历史操作可用，故只读 input 会显示两项并禁用。
- `viewer.tsx` 最后的菜单渲染先过滤撤销/重做，再在现存组的首项“撤销”“剪切”“删除”前生成分隔线。过滤历史组后首项仍是引用，仅在剪贴板/选区组前生成两条分隔线；输入/编辑来源在历史/剪贴板/选区前生成三条。没有空历史分组、连续分隔线或首尾分隔线。

更新的 `verify-preview.mjs:42-49` 实际断言初始正文七个 menuitem、撤销/重做为零、两条分隔线；`:59-65` 对 AI 回复、Markdown 和正文鼠标拖选/右键再次断言历史项不存在和两条分隔线；`:67-70` 对 composer 断言两项均保留和三条分隔线；`:75-76,90-95` 对普通、只读、无选区 input 断言保留，其中只读的两项均 disabled；`:101-110` 对玄墨正文和窄窗口再次断言两项不存在。计数断言结合当前分组源码，可证明本次审核稿没有残留空历史分组；它们不代表安装版 native Menu 已更新。

`preview-checks.json` 当前仍为 `passed`、十五项、无 pageErrors 和 HTTP 请求，第一项已明确写“seven-item menu without undo/redo or empty history separators”，与最新脚本一致。复核重新读取 `preview-paper.png` 与 `preview-editable.png`：正文菜单七项无历史行、编辑菜单保留历史行，分组结构与代码一致。还重新计算了报告所列八个生产文件的当前 SHA-256，均匹配报告；没有执行会改写结果/截图的脚本，没有修改其他文件。

后续 T2/T4 的 Monaco、只读编辑器、特殊原生 input 及完整类别矩阵须采用本次“来源类型决定显示、能力决定启用”新合同。当前审核门继续为用户明确批准修订后的 HTML；此次独立复核不自动授权跳过该门。

## 2026-10-13 用户消息整段选区归属修订：方案与用例初审

用户截图反馈：已经选中自己发送的 AI 对话消息，但复制/引用仍灰色。当前独立结论：**缺陷已被新增真实鼠标三击用例复现；采用当前文本来源与原选区求交的方向成立，但必须保留可见段落换行并严格限制到当前来源。补丁与回归结果尚待复核，此处不宣称已修复。**

原因有具体源码证据：读取时 `viewer.tsx:32-34` 使用 `root.contains(range.startContainer) && root.contains(range.endContainer)` 判所有权。用户消息来源是 `.user-message` 中带 `data-review-text` 的 `p`；浏览器整段选取的尾端可位于父容器的子节点边界。这样的选区明明覆盖该 p 文本，尾端却不是 p 的后代，因此快照把 text 置为空，复制与引用按空选区禁用。原十五项检查只对 AI 回复、Markdown 和正文做部分鼠标拖选，没有该用户消息整段边界用例。

主代理已追加 `.user-message [data-review-text]` 的部分拖选与 `clickCount:3` 整段回归。独立读取的修复前 `preview-checks.json` 为 `failed`，失败位置是 `verify-preview.mjs:79` 的“整段父边界选区必须能复制”断言，具备失败先于修复的实际证据。此失败报告不能沿用旧十五项 passed 状态作为当前稿完成证明；修订后须重新构建并执行完整 HTML 验证。

### 选区求交合同

1. 先固定本次右键命中的 source，建立该来源的内容 Range。只对同一 Document、非空且未折叠的选择求交；交集起点取原选择/来源起点的较后者，终点取两者终点的较前者。父节点的相邻子节点边界需规范化到来源内容边界，不能仍要求 start/endContainer 都是 root 后代。
2. 交集为空、仅接触边界、选区仅在另一消息或已被正常点击折叠时，text 必须为空，复制/引用继续禁用。原选区跨多个来源时，只允许当前右键来源的交集可见文字；不得用未裁剪的 `Selection.toString()` 读取相邻消息、审核说明或另一输入区。一个来源内部跨 p、行内标签、Markdown 节点的选择仍属于同一来源。
3. 快照保留裁剪后的内容范围用于本次复制/引用，但源身份、DOM/content 变化守卫及菜单取消不因此放宽。生产可编辑宿主的剪切/删除/粘贴仍需独立编辑所有权合同，不能因为静态可读范围求交成功，就允许写入一个跨宿主的旧选区。
4. 可见文本序列化要保留来源内的段落换行、用户实际选中的空格及 Unicode；裁剪只移除来源外文字，不能整体 trim 本来源文本来规避边界。静态菜单继续省略撤销/重做，source 判定不改变历史分组规则。

### 必须防止的换行回归

独立执行了只包含两段合成文字、无用户数据的 headless Chrome 内存实验。对 `<div><p>第一段。</p><p>第二段。</p></div>` 的同一个完整 Range，命令结果为：

```json
{"rangeText":"第一段。第二段。","visibleSelectionText":"第一段。\n\n第二段。"}
```

因此简单把快照的 `Selection.toString()` 改成交集 `Range.toString()` 会吞掉渲染段落分隔。补丁需要可靠的可见文本提取：例如完整属于本来源的可见选择沿用浏览器 Selection 序列化，跨来源/父边界选择按规范化交集提取并恢复原选择；或另用经多段/代码/列表验证的可见文本序列化。不能把 DOM 字符串拼接当作正文可见文字的通用等价物。该实验未写截图/报告文件，首次启动受 sandbox 的 spawn EPERM 限制，经工具审批启动后命令成功；没有改生产或设计文件。

### 补丁后复核必需用例

- 对用户发送消息分别真实部分拖选、双击词语、三击整段，然后在选区中单击右键。复制和引用可用，剪切/删除按静态状态禁用，撤销/重做不存在；执行复制后验证确切本来源文字，执行引用后验证源消息与原草稿/示意 chip 保留。三击应记录实际端点或明确验证父边界被规范化，而不是仅截图菜单。
- 对同一 AI 回复的两个段落建立真实跨段选择，执行复制与引用，断言内部 `\n\n` 或对应可见段落分隔仍在；Markdown 的正文/列表/代码换行亦应在后续完整类别矩阵覆盖。仅对单行整段字符串 trim 后相等，不能证明内部换行或首尾用户空格保留。
- 对跨用户消息与 AI 回复的选择在当前源右键，证明结果只含当前源选中的交集；再将选区留在 A 源而右键 B 源，交集为空时复制/引用须禁用。测试必须同时检查“不包含相邻源的可辨识文字”，避免看菜单 enabled 即误判归属正确。
- 保持既有无选区、只读输入框、历史分组、省略空分隔线、敏感字段及键盘菜单回归。最终报告区分修复前 failed 证据和修复后 passed 证据，HTML 通过仍不代表安装版 Electron 原生菜单或生产代码已经修复。

状态：等待主代理完成 HTML 补丁、重建与真实鼠标回归后复核。只在本文件追加方案及用例审核，没有修改其他文件。

## 2026-10-13 用户消息整段选区修订：补丁后独立复核

结论：**HTML 审核稿中的用户发送消息整段选区误判已修正，复制与引用可用，可提交修订稿继续用户审核。** 本次修改范围是设计预览，生产实现和 Electron 原生菜单仍未由本结论证明。前一节“等待补丁”状态由本节复核结果覆盖；原十五项说明为较早版本记录，当前主代理完整 HTML 报告为十九项。

具体证据：

- `viewer.tsx:32-52` 为只读来源建立内容 Range 并裁剪静态选区交集；`!editable || owned` 保证可编辑宿主仍需原来的两端归属。空/折叠/无交集选择不生成文本。父容器边界与跨来源范围裁剪分别比较 start/end 与内容边界，仅留下本来源文本。
- 完全属于来源的选择继续读 `Selection.toString()`；父边界/跨来源选择临时将 Selection 设为交集读取可见文本，并在 `finally` 用原 anchor/focus 端点和 `setBaseAndExtent` 恢复方向。没有改用会丢段落分隔的 `Range.toString()`；静态历史组过滤保持原修订。`product-design.md:29` 与 `technical-plan.md:21` 同步说明父边界规范化、跨来源只读取当前源、可见换行及不放宽编辑命令守卫。
- `user-message-red-checks.json` 保存修复前真实鼠标三击后复制 enabled 断言失败；`preview-user-message-before.png` 是失败场景证据，不作成功截图。最新 `preview-checks.json` 为 `passed`、十九项、无 pageErrors/HTTP 请求。
- 新增四项中，用户消息部分选择和三击全段选择由真实鼠标完成并执行菜单复制，三击还断言引用可用、历史两项不存在；跨来源归属和同来源多段换行采用构造 Range 加真实右键/菜单执行，报告名称明确标记 constructed range。前者复制内容与用户消息全文相等，排除相邻 AI 回复；后者逐行 Markdown 引用包含原 Selection 的可见段落分隔。二者不能称为真实鼠标拖选覆盖全部跨段/跨来源场景。
- 已查看 `preview-user-message.png`：用户消息整段高亮，侧栏来源为 AI 用户消息，复制/引用可用，剪切/粘贴/删除禁用，七项菜单没有历史组。八个报告中的生产文件当前 SHA-256 再次全部匹配。

除读取上述证据，独立审核还用本地离线 HTML 和临时 headless Chrome 执行三项额外检查，均 `passed`：

1. 在用户消息文字位置真实双击选词、右键，复制与引用均可用。
2. 选区仅属于用户消息，右键另一 AI 回复来源时，复制与引用均禁用。
3. 以反向 anchor/focus 建立跨用户消息/AI 回复选择，右键用户消息后确认原端点及方向不变，执行复制后结果仅为用户消息。

独立命令输出为 `scope="Independent HTML checks only; no artifacts written"`，没有覆写主代理报告、截图或其他文件。这三项与主代理十九项报告分别陈述，不能把它们合并冒充已落盘的二十二项完整验收报告。多窗口、DOM/会话 ABA、IME、Monaco、完整选区空格/Unicode、实体 chip 和真实系统剪贴板继续属于 T1-T4 后续验证。

交付文档检查：读取时 `design-verification.md` 仍写十五项，已提醒主代理在提交前同步为十九项并说明两项构造 Range 的边界测试；审核者未修改该文件。当前源码与成功报告本身不需要再修改。用户审核门、产品实现顺序和真实目标验收要求保持。

## 2026-10-13 最终二十一项报告核对

最终复核通过：`preview-checks.json` 实际含二十一项，`status=passed`、`pageErrors=[]`、`httpRequests=[]`；`design-verification.md`、README 和两份台账已统一为二十一项。前一节要求同步交付文档的事项已完成。最终六项新增用例清楚区分真实鼠标部分拖选/双击/三击，与构造跨来源、完全无交集、同来源跨段 Range 后的右键命令检查；正文写明后三项不能替代真实跨段鼠标拖选验收。

报告 scope 和交付文档仍明确限定离线 HTML 审核稿，未宣称生产实现、Electron 原生菜单、系统剪贴板、IME 或真实 macOS 通过。此次只读核对报告、相关文档和测试名称，并确认八个所列生产文件当前哈希均匹配；没有重跑全脚本，没有修改其他文件。本修订独立复核结束，可将当前 HTML 继续提交用户审核，批准前保留生产阶段门。
