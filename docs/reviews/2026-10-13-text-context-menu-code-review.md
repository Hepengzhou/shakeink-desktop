# 文本右键菜单独立 code review

审核日期：2026-10-13（Asia/Shanghai）。依据当前 AGENTS.md、`docs/implementation-boundaries.md` 的 2026-10-13 批准、正式方案、用例及独立用例审核。审阅者只新增本文件；未修改生产/测试文件、其他聊天改动或 Git 提交。生产修正及后续验收由主代理完成。

最新复核结论：**需修正 R8/P1 后复核。** 前轮证实的 R1–R7（四处 P1、三处 P2）已修正并复核。安装包 Windows 正文复制验收失败后的独立诊断进一步证实：同一有效 Monaco 选区在用户激活期限后，copy 静默失败，原生 EditContext cut 还会在复制失败后删除正文。已知代码问题 R8 阻断继续放行；安装包那一次点击的实际因果仍需主代理原生 execCommand/activation/IPC 诊断另证，不能将独立 Chrome 重现直接回写为确定的 Windows 原因，也不能把源码浏览器通过扩大成安装包全部验收通过。

## 已证实的问题与修正

### R1 / P1：普通控件迟到粘贴绕过菜单事务失效

初审 `src/lib/desktop/text-context-selection.ts` 的 paste/undo/redo 委托只调用 `options.nativeEdit(id, root)`。`native-text-edits.ts` 在剪贴板 await 后只核对自己的焦点/输入 epoch 和内容快照，不知道当前菜单已经 cancel、dispose 或因会话/属性 ABA 失效。普通 input 也没有它自己的属性 MutationObserver。

独立真实 Chrome 重现使用内存打包的完整 ChatPanel、DesktopCommandController、原 React Input 和延迟内存剪贴板：选择粘贴，给同一 input 的 readonly 属性添加再移除，待来源 observer 取消菜单后释放剪贴板，实际受控值仍被替换。命令返回：

```json
{"case":"paste-after-source-attribute-ABA","before":"Initial editable text","after":"LATE_CLIPBOARD","menuCount":1}
```

主代理保存失败回归为 `docs/evidence/text-context-menu/late-clipboard-red.tap`，与上述独立重现一致。现已在 `nativeTextEdits.run(id, control, assertTransaction?)` 的进入、await 后及最终副作用处调用外部 guard，`captureDOMTextContext` 委托时传入本次菜单 `assertCurrent`。独立专项复跑中的 `TCM12 clipboard completion cannot revive a cancelled input transaction` 已通过；其他原生编辑调用的可选参数兼容保留。R1 代码阻断已解除。

### R2 / P1：Monaco 复制和剪切使用不存在的 EditorAction

初审 `src/lib/desktop/monaco-text-context.ts` 对复制/剪切调用 `editor.getAction(id).run()`。当前安装 Monaco 0.56 的独立源码 `node_modules/monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js:31–103` 将这两个 ID 注册为 MultiCommand；`codeEditorWidget.js:777–778` 的 getAction 只查询 EditorAction 的 `_actions`，因此必为 null。

独立运行真实 Monaco（非 fake editor）创建合成模型/选区，注册真实适配器后查询及执行，结果：

```json
{"copyGetAction":false,"cutGetAction":false,"contextGetAction":true,"copyEnabled":true,"copyError":"编辑器操作当前不可用"}
```

现已改为 `editor.trigger('text-context-menu', 'editor.action.clipboardCopyAction'/'editor.action.clipboardCutAction', {})`，沿真实 Monaco command 分发；`editor.action.showContextMenu` 仍是有效 EditorAction。修正与已安装源码的 `codeEditorWidget.js:780–827` 分发链一致。R2 代码阻断已解除；真实系统剪贴板成功仍由 Windows 原生验收另证。

### R3 / P1：引用等待聚焦期间，来源取消仍能追加旧文本

初审统一菜单在返回时核对来源，随后只调用 `quote.append(source.text)`。quote lease 和 ChatPanel 的逐帧聚焦/最终插入 guard 只检验目标草稿，不知道原来源已经取消。

独立完整产品 CSS + 真实 ChatPanel 重现：选引用后暂使 editor.focus 不生效以进入实际 requestAnimationFrame 等待；给来源属性 B→A 使 source observer 取消；恢复正常 focus 后依然写入 `"> Selected user text\n\n"`。初次未加载产品 CSS的探索出现 insertHTML 失败，未计为问题证据；加载真实 CSS 后才证实错误。主代理另保存 `docs/evidence/text-context-menu/quote-source-red.tap` 的相同失败。

现已让 quote append 合并来源事务 guard 与目标 lease，ChatPanel 在每次等待和最终插入前检查。来源 `isContentCurrent` 在合法的内部聚焦/光标转移后保留内容/编辑状态守卫，focus wrapper 记录预期选区；用户输入、外部 pointer/focus/scroll、DOM/属性 ABA、上下文变更和 dispose 仍终结事务。独立专项中的 `TCM13 quote waiting for composer focus still rejects source cancellation` 已通过；主代理 `browser-quote-green.tap` 亦记录 6/6。R3 代码阻断已解除。

### R4 / P2：可选取的 disabled 特殊 input 被误判无选区，且全选抛异常

初审特殊 input 只有 activeElement 为自身才读取 document Selection；disabled 控件无法聚焦，故实际选区被置空，isCurrent 也恒为 false。同时菜单仍启用 selectAll，对 disabled email/number/date 直接调用 setSelectionRange，实际抛 InvalidStateError。

独立 Chrome 实际鼠标拖选证实 disabled text、email、number、date 都有选区；email/number/date 的 selectionStart 为 null、activeElement 不是自身。email 的精确部分选区为 `writer@exampl`，DOM anchor/focus 是 BODY 同一 offset、range 文本为空且 intersectsNode 为 false，不能用整个 value 或 DOM range 冒充可见原生选区。

七类 disabled 原生类型独立事件研究均能在 document capture 观察可信 primary pointerdown、12 次按钮按下中的 pointermove、pointerup 和右键 contextmenu。email/number 的 selectionchange target 为该 field，date/datetime-local/month/week/time 为 Document。示例可见选择分别为 `writer@example.i`、`12345`、`2026/10/13`、`2026/10/13 10`、`2026年10月`、`2026 年第 42 周`；本次 time 右键位置移出原选择，Chromium 正确清空选择，不能强行用 value 制造成功。

主代理已新增仅由可信 primary pointer 取得的 disabled 原生选择 lease，复查源连接/父节点/value/`:disabled`，外部选择/焦点/按键/blur 失效；支持 `fieldset[disabled]` 继承，不支持的全选禁用。`docs/evidence/text-context-menu/structured-second.tap` 实际逐七类 enabled + disabled 拖选/复制通过；未拿 value 替代可见原生选择。审阅者读源码及此结果核对。中途 enabled date 的失败原因是已经聚焦时又调用 root.focus 清掉 Chromium 原生日期选区，最新 restore 仅在未聚焦且非 disabled 时聚焦，保留既有原生选区。R4 代码阻断已解除；Electron 逐类型能力仍须另验。

### R5 / P2：从 composer 引用遗漏可见 chip 名称

独立专项执行到新增 TCM11 真组件用例时，原 `Selection.toString()` 因 chip 的 contenteditable=false / user-select:none 跳过可见名字。旧草稿正确保留，但新增引用实际成为 `> > \n> \n\n`，没有“原标签”。主代理保存相同失败于 `browser-expanded.tap`。

主代理新增 `selectedEditorVisibleText`：只 clone 本次拥有的选区，将 clone 内 `.composer-chip[data-insert]` 替为 `.composer-chip-name` 的可见文本，交给原 editorToText 换行序列化；原 selectedEditorText 的稳定 payload 复制合同保留。`browser-literal-green.tap` 名称虽有 green，文件仍是 8 pass / 1 fail，因合成 preview-a 的 white-space:normal 折叠原始换行，未据文件名报告通过。随后 fixture 设置明确可见的 pre-wrap 多行，`browser-controls-second.tap` 的该 TCM11 已通过（该日志整体仍有 enabled date 的后续失败，见 R4）。R5 代码阻断已解除。

### R6 / P1：Monaco 延迟引用的来源 guard 忽略模型选区 ABA

修正 R3 后，Monaco `isContentCurrent` 只核对模型/版本/contentRevision/readonly，不核对 onDidChangeCursorSelection 的 revision 与模型选区 fingerprint。DOM 来源需要容忍合法内部 Selection 转移，但转移焦点到 composer 不应取消或改写 Monaco 的模型 getSelections；不能由此放宽模型选区来源。

独立复用真实 Monaco browser fixture，仅让 quote receiver `append` 在 Promise 后再次执行原传入 assertCurrent：菜单选引用已进入等待，此时 model selection A→B→A，再释放 Promise。输出证实仍然追加旧引用且没有错误：

```json
{"case":"delayed-monaco-quote-after-model-selection-ABA","quotes":["> Alpha\n\n"],"errors":[],"value":"Alpha Ω\nSecond line\nThird 中"}
```

重现没有 fake editor、没有写系统剪贴板或生产文件。`tests/browser/monaco-text-context.test.ts` 的原 receiver 替换成以下内存代码即可，再执行 `f.select(1,1,1,6)`、正文右键选择 quote、等待 quoteStarted、`f.select(2,1,2,4);f.select(1,1,1,6);releaseQuote()`：

```javascript
globalThis.quoteGate=new Promise(resolve=>globalThis.releaseQuote=resolve)
// receiver 替换；target identity 与 available 保持 fixture 原值。
append:async(text,assertCurrent)=>{
  globalThis.quoteStarted=true
  await globalThis.quoteGate
  assertCurrent()
  quotes.push(text)
}
```

现已在 `src/lib/desktop/monaco-text-context.ts:6,8` 增加独立 selectionRevision，`:19` 保存原选择 epoch/fingerprint，`:29` 的 quote guard 同时核对 selectionRevision 与原 fingerprint；模型/正文变化增 contentRevision，配置事件仅实际 readonly 状态变化才增 contentRevision。统一菜单仍在 `text-context-menu.ts:63,71` 传递合并 guard，因此既拒绝 A→B→A，又容忍接收器聚焦和 lineNumbers/wordWrap/fontSize 的正常布局配置变化。

主代理 `monaco-quote-aba-red.tap` 记录 selection ABA 1 fail / readonly、model 2 pass 的真实失败基线，`monaco-browser-quote-aba-green.tap` 记录修正后的全 13/13 通过。审阅者独立复跑新增四条延迟引用用例（selection/readonly/model ABA + 正常配置/接收器 focus）为 4 pass、0 fail，其余旧 10 条明确 skip；正常 case 的 quote 为 `> Alpha\n\n` 且焦点为真实 quote-target，三类 ABA 的 quotes 均为空、正文不变。R6 代码阻断已解除。

### R7 / P2：普通 Monaco 菜单把纯布局/配置事件当作来源变更

后续真实安装包证据 `docs/evidence/text-context-menu/windows-package.json` 为 failed，stage=menu-editor-copy，checks为空；`windows-package-monaco-menu.png` 真实截图显示正文选区高亮、复制菜单 enabled 和原生菜单。该证据没有点击命令 ID、恢复焦点时的编辑器事件或实际 clipboard 内容/长度，因此只能确认该次复制期望没有达成，不能独自证明是源 guard、Monaco clipboard 命令或 UIA 点击问题。

独立内存打包真实 Monaco + 生产 controller/adapter，并注册真实 cursor/config/focus/blur 事件观测，四种实际操作结果如下（合成模型选区始终 `[1,1,1,6]`，readonly 始终 false）：

| 操作 | 实际事件 | 来源 current | 菜单复制结果 |
| --- | --- | --- | --- |
| `document.activeElement.blur()` 后选择 copy，controller 合法 restore focus | blur、focus，没有 cursor/config | true | Alpha，errors为空 |
| `editor.setSelections(editor.getSelections())` 后选择 copy | 没有 cursor/config | true | Alpha，errors为空 |
| `editor.layout({width:700,height:300})` 后选择 copy | config，selection/readonly不变 | false | 剪贴板仍为原 SENTINEL，错误“文本来源已变化” |
| `editor.updateOptions({lineNumbers:'off',wordWrap:'on',fontSize:18})` 后选择 copy | config，selection/readonly不变 | false | 剪贴板仍为原 SENTINEL，同上错误 |

已确认的根因是 `src/lib/desktop/monaco-text-context.ts:8` 在所有 configuration 通知上增加总 revision，`:19` 保存 ticket，`:26` 的普通 `current()` 强制总 revision 不变；quote 的 isContentCurrent 已避开这个过严条件，但普通 copy/cut/paste 等仍会在菜单返回或恢复 focus 后的 guard 被拒绝。只有布局/配置改变却仍是同一正文与真实选区时，菜单应保持可操作。

最新生产修正使普通 current 与 quote guard 都使用内容/模型/readonly epoch、真实选区 epoch/fingerprint（`monaco-text-context.ts:6–10,20,27,30`）；selection epoch 只在真实 fingerprint 改变时递增，A→B→A 两次变化仍终结旧源；readonly A→B→A、model/content/version、dispose 继续严格失效。作者的 `monaco-copy-layout-red.tap` 记录两个真实 ordinary copy 失败，`monaco-browser-layout-green.tap` 全 16/16 通过；审阅者独立复跑 pending copy + delayed quote 六条回归为 6 pass、0 fail、旧 10 条明确 skip，typecheck exit 0。重复 cursor 通知没有由 blur→focus 的真实 Chrome操作复现，不作为已证实根因。R7 代码问题已解除。

后续 `windows-package.json` 确实增加 nativeChoices=`["text.copy"]`，排除点错命令；editorEvents 的末尾为真实模型 1:1→1:9、version=1、readonly=false，没有 configuration 或恢复焦点后的重复 cursor，剪贴板仍是前一 composer 的隔离内容。这份诊断没有支持将 R7 定为此次 Windows失败的确定原因，不能据修正 R7 就宣称安装包复制已通过。

复现沿用 `tests/browser/monaco-text-context.test.ts` 的内存 fixture，菜单弹出后 `f.take()` 保存适配器快照，依次做上表任一实际操作、`f.choose('text.copy')`，读取 navigator.clipboard 和 f.errors；未使用 fake editor，也未修改生产或测试文件。真实事件采集代码：

```javascript
editor.onDidChangeCursorSelection(e=>diag.push({type:'cursor',selection:JSON.stringify(editor.getSelections()),reason:e.reason,source:e.source}))
editor.onDidChangeConfiguration(()=>diag.push({type:'config',readonly:editor.getRawOptions().readOnly===true,selection:JSON.stringify(editor.getSelections())}))
editor.onDidFocusEditorText(()=>diag.push({type:'focus'}))
editor.onDidBlurEditorText(()=>diag.push({type:'blur'}))
```

### R8 / P1：用户激活期限后 Monaco 原生 copy 失败，EditContext cut 仍删除正文

此前浏览器 fixture 预先授予 clipboard-read/write，且 `page.evaluate(f.choose)` 默认带 CDP userGesture。右键以后等待再 evaluate 会重新授予激活，不能代表由主进程 IPC 返回的自然迟到菜单动作。因此“立即 choose + 预授 clipboard 权限”不足以证明桌面原生菜单在合法长时间停留后可复制/剪切。

独立使用真实 Chrome/Monaco、生产 controller/adapter、合成模型且**不预授剪贴板权限**：右键选中 Alpha，source current 为 true；一次 evaluate 内设置自然 setTimeout 6500ms，等待期间不再执行 renderer evaluate。回调中观察激活已过期，再实际选择 copy/cut；之后才授予读取权限以验证合成剪贴板。两次真实结果：

```json
{"command":"copy","before":{"active":true,"current":true},"delayed":{"active":false,"current":true},"copyDiag":[{"id":"copy","active":false,"result":false,"focus":true}],"errors":[],"clipboard":"SENTINEL"}
{"command":"cut","before":{"active":true,"current":true,"value":"Alpha Ω\nSecond line\nThird 中"},"delayed":{"active":false,"current":true},"copyDiag":[{"id":"copy","active":false,"result":false,"focus":true}],"errors":[],"value":" Ω\nSecond line\nThird 中","clipboard":"SENTINEL"}
```

copy 没有 copy event，execCommand 真返回 false；source guard 与 hasTextFocus 均有效，剪贴板仍未写入。cut 的 copy 也失败，但模型已经删掉 Alpha，且没有错误提示。全部发生在隔离的内存合成模型，审阅者未修改真实作品。当前 `monaco-text-context.ts:32–33` 的 trigger Copy/Cut 路线无法报告或守住该失败。

独立安装源 `node_modules/monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js:206–211` 明确在 effectiveEditContext 的 cut 分支执行 `executeClipboardCopyWithWorkaround` 后无条件 `focusedEditor.trigger('cut')`。同文件 `:177–184` 的 execCommand copy 结果未被检查；其 Electron workaround 还以 isNative 为条件，Web 打包 Monaco 不能据此承诺正确。不能通过伪造 trusted DOM 事件或全局开放所有 clipboard 权限掩盖问题。

必须让合法菜单的桌面剪贴板操作不依赖已过期的 transient activation，并且只有真实剪贴板写入确认成功、再次检查源/选区/上下文后才剪切原模型；失败或取消不删除正文。保留真实模型范围、多光标复制格式、原生撤销/重做和旧 built-in 行为，相关方案调整由主代理独立审核后落实。需增加**无预授权限、自然延迟且执行前没有 CDP renderer evaluate**的 copy/cut 回归，及 write失败、迟到来源变化、write成功后原生 cut undo/redo。R8 目前未解除。

自然延迟重现的关键代码（普通工具评估造成的 userGesture 在 timer 触发前自然过期）：

```javascript
const result=await page.evaluate(()=>new Promise(resolve=>{
  f.take()
  const before={active:navigator.userActivation.isActive,current:f.current(),value:f.value()}
  setTimeout(()=>{
    const delayed={active:navigator.userActivation.isActive,current:f.current()}
    f.choose('text.cut') // copy 重现用 text.copy
    setTimeout(()=>resolve({before,delayed,copyDiag,errors:f.errors,value:f.value()}),100)
  },6500)
}))
// 到此 copy/cut 已实际完成；之后才 grantPermissions 并读取验证 clipboard。
```

诊断只在内存 bundle 包装 document.execCommand，记录原函数真实布尔返回和 copy event，不伪造返回值；menu resolver 与 clipboard读取的 fixture 含义保持清楚。安装包当前 clicked-ID 已是 copy，但没有这一层 execCommand/userActivation 证据，Windows 具体因果仍待其真实诊断。

## 其余核对与准确边界

- 原生协议仅包含 UUID、固定来源/命令能力、有限坐标；没有正文、Key 或任意脚本字段。主进程进入和返回后复验 trusted sender、主 frame、所属主窗口、聚焦、closing/business gate，单窗口 pending 同 requestId 取消，不会由迟到 A cancel 关闭 B。主进程的 build、popup 异常、closed/blur/navigation 和 callback 共用一次完成/监听释放。已读 unit 断言，仍不能代替真实 popup。
- DesktopCommandController 只安装新委托，未同时安装旧 API Key 菜单。password 普通复制/剪切/引用禁用；显式 API Key 保留获准 copy/cut/paste/history，引用始终禁用。快照及 Key 不传进菜单协议或日志。
- 既有桌面选择政策是 `src/app/desktop.css:1–22` 默认 none，仅 data-text-preview/data-text-input、文字 input/textarea、contenteditable 和 Monaco 原生编辑面建立 text 边界。按钮、Label、summary、导航和普通 UI 帮助未被允许选择。未发现需要扩大未标记 Label 的安全 fallback；在 marker 下的后代和合法业务摘要已由真实组件继承。不能扩大原本不允许选择的 UI。
- 新增 `text-context-modal.ts` 只识别可见的实际 Base UI Dialog、aria-modal=true 的业务对话框、alertdialog 和 open 的原生 dialog，过滤 hidden/aria-hidden/inert。Monaco 常驻非模态 find 的 role=dialog 不再误禁整页菜单。PlanningWorkspace 的四个自绘对话框都标 aria-modal=true；伏笔选择浮层没有模态阻断，属于非模态。上述实际文件已独立读取。
- 静态来源按与本来源范围的交集读取，父段落边界临时规范化后恢复方向；编辑来源必须拥有完整端点。用户消息实际 data-text-preview 在 innerRef 内容 div，消息 CopyButton/折叠按钮在其外。新增真实用户三击整段、AI strong 内选区、嵌套 Base UI Portal input 的独立专项用例已通过。Dialog 基本编辑可用而 quote 关闭，背景受 inert/角色屏障约束。
- quote 接入原 ChatPanel/composer，不调用 send、创建会话、创建作品或供应商。canSend 原定义允许零模型准备草稿，发送门控保留。isLoadingConversation/error/recovery/creating/request/newConversation/composition/modal 在 available 中检查；identity/subscription revision 防会话 A→B→A，父控制器还对 activeTabId 同步订阅取消。
- 新引用只在 formatTextQuote 内转义匹配的新 `@[` token，走纯文本 insertPlainDraftAtCaret；旧 draft、chip DOM/稳定 payload 和全局 mention/scene parser 没有重写。原 UserMessage 是 escapeHtml + explicitOnly linkify；普通 Markdown 后处理的旧实体化行为未被扩大承诺。可见换行应以本次 Selection/真实显示为准，不能拿 white-space:normal 的 raw textContent 换行当保真标准。
- Monaco 仍保持原 contextmenu 开启，document 捕获只在正文命中时阻止原右键进入；未全局删掉 built-in 菜单。多选 quote 以模型范围排序并空行连接，model/content/configuration/dispose revision 防模型 ABA；find/普通输入/ViewZone 与 scrollbar/装饰分流。右键 mousedown 保护在现有选区中的非主范围；真实多光标和专属菜单行为仍须单独验收。
- Electron 44.6 本地类型声明及其官方 menu 文档未说明坐标空间；官方当前 Windows C++源码用 GetContentBounds.origin + x/y，符合当前内容本地 DIP 路线。44.6 对应 C++ 文件本轮未成功抓取，不能用 current/main 当精确版本验证；CSS×zoom、窗口边缘和系统 DPI 必须以真实 Windows 菜单截图决定。[Electron 当前 MenuViews 源码](https://raw.githubusercontent.com/electron/electron/main/shell/browser/api/electron_api_menu_views.cc)

## 独立命令与验证范围

审阅者执行的正式专项命令（当时 fixture 已增加为 9 条 browser，用的是本机 Node v20.12.2；这不代表项目声明的 Node 24 全量验证）：

```powershell
node --import tsx --test tests/unit/text-context-menu.test.ts tests/unit/text-quote-target.test.ts tests/browser/text-context-menu.test.ts
```

实际结果为 19 tests、18 pass、1 fail：10 条 unit 全过；8 条 browser 过，R5 composer 可见名失败。该命令读取的包是可见名修正之前的快照，不能用之后新增源码回写本轮通过。主代理之后的日志按前述路径分别记录。审阅者另已读取 `browser-final.tap`（11/11）和 `monaco-browser-green.tap`（10/10）的完整末尾结果，并逐条审查两个 browser 文件；这两份既有通过结果不含 R6 新发现的延迟引用模型选区场景，R6 后续验证单列。`browser-all.tap` 仍写入时不据尾部判断全量结果；当时 typecheck 中的 Monaco fixture accessor 隐式 any 已由其测试作者补正确 IViewZoneChangeAccessor。

最终复核独立执行以下命令，未写测试/生产文件或 tsbuildinfo：

```powershell
node --import tsx --test --test-name-pattern='delayed quote' tests/browser/monaco-text-context.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

第一条为 4 pass / 0 fail / 10 skipped（实际 Chrome 的全部四条延迟引用场景）；第二条 exit 0、没有错误输出。不得把第一条的 10 skipped 算为本次重跑通过，也不以 typecheck 代替构建或业务用例。

独立 Monaco 查询的可复现内存 bundle 主体如下；esbuild stdin 使用 browser/esm、ttf dataurl、当前 tsconfig，Chrome 的受控页面只装入 bundle/css，不开 HTTP listener：

```javascript
import * as monaco from 'monaco-editor'
import {bindMonacoTextContext} from './src/lib/desktop/monaco-text-context'
import {captureRegisteredTextContext} from './src/lib/desktop/text-context-adapters'
const host=document.createElement('div')
host.style.cssText='width:800px;height:300px';document.body.appendChild(host)
const editor=monaco.editor.create(host,{value:'First selected text\nSecond selected text',language:'plaintext',contextmenu:true})
editor.setSelection(new monaco.Selection(1,1,1,6))
const release=bindMonacoTextContext(editor)
const capture=captureRegisteredTextContext(editor.getDomNode())
// 初审 snapshot 中以下两个是 false，showContextMenu 为 true。
editor.getAction('editor.action.clipboardCopyAction')
editor.getAction('editor.action.clipboardCutAction')
await capture.execute('text.copy',()=>{}) // 初审抛“编辑器操作当前不可用”。
release();editor.dispose()
```

独立 disabled 事件复现的核心命令（其余类型替换 type/value；合成内容，没有 Key 或真实作品）：

```javascript
await page.setContent("<p>Other text</p><input id='field' type='email' disabled value='writer@example.invalid' style='user-select:text;width:300px'><p>Trailing text</p>")
await page.evaluate(()=>{
  globalThis.events=[]
  for(const type of ['pointerdown','pointermove','pointerup','selectionchange','contextmenu'])
    document.addEventListener(type,e=>events.push({type:e.type,target:e.target.id||e.target.nodeName,button:e.button,buttons:e.buttons,isTrusted:e.isTrusted}),true)
})
const box=await page.locator('#field').boundingBox()
await page.mouse.move(box.x+6,box.y+box.height/2);await page.mouse.down()
await page.mouse.move(box.x+110,box.y+box.height/2,{steps:12});await page.mouse.up()
await page.mouse.click(box.x+60,box.y+box.height/2,{button:'right'})
// 读取 document.getSelection().toString()、事件及 field selectionStart。
```

浏览器证据仅证明 Chrome 实际 DOM/React/Monaco行为。审阅者没有执行真实 Electron popup/OS clipboard/离线安装包、Windows 原生最终验收、macOS、物理 IME或全量业务验证；这些由主代理分别记录，未执行部分保持待验收。主代理反馈一次原生 popup 超过应用窗口边界时，验收工具拒绝坐标点击并导致脚本 timeout；本审核没有将此工具限制列为产品缺陷，也没有将该失败脚本计为操作通过，须由其重新实际选中原生条目再验收。
