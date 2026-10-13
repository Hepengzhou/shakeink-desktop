# 文本右键菜单正式实施方案独立审核

审核日期：2026-10-13（Asia/Shanghai）。审核来源：`2026-10-13-text-context-menu-plan.md`、`docs/evidence/text-context-menu/control-inspection.json`、其生成脚本、原菜单/IPC/命令/composer/Monaco 源码和本地类型声明。审核者仅写本文件，未改生产文件，未运行真实用户数据、供应商或目标系统验收。

阶段依据：用户已明确批准本次 HTML，原 HTML 审核门已解除；应依 AGENTS.md 完成正式方案独立审核、用例独立审核、TDD、代码审查及真实目标验证。本报告不要求再次 UI 批准。

结论：**总体方案可用，四处具体合同须修订后再判定正式方案审核通过。** 修订前不把本审核作为进入实施的通过记录。问题局限于请求取消、普通引用的 token 重水合、会话切换过渡可用状态及 Monaco 菜单拦截时序，不需要重写真实 Web 业务组件。

## 已成立的方案与证据边界

### 特殊 input 改用 renderer 原生能力是可继续验证的路线

`scripts/inspect-text-controls.mjs` 对九种控件逐个填入合成数据、聚焦并发送真实 Ctrl+A，读取 `Selection.toString()` 和 `queryCommandEnabled`。`control-inspection.json` 明确限定 Synthetic Chrome capability，实际记录：email/number 的 selectionStart/End 为 null，但可见选区准确且 copy/cut/selectAll 为 true；date、datetime-local、month、week、time 可见选择存在，copy/selectAll 为 true、cut 为 false；普通 password 的 copy/cut 为 false，内容仅记 `[masked]`。据此选择 renderer 路线、不引入 main 文字回传是合理的简化，覆盖现有 CSS 可选控件比仅检查 selectionStart 更完整。

该证据尚未证明部分选区、右键前后选区保持、execCommand 执行结果、paste/delete/redo、只读/禁用、Electron 版本或真实系统剪贴板。后续必须对真实 Electron 九种类型执行独立案例，且结合 queryCommandEnabled 与本来源 snapshot；不能把 `queryCommandEnabled=true` 当作已执行通过。特殊 input 必须走独立能力/选择分支，不能将 null 范围传回现有 `nativeTextEdits` 的 `value.slice(selectionStart,selectionEnd)` 路径。`native-text-edits.ts:46-49,81` 证明后者对 null 范围不能读取特殊控件真实选择。

此正式方案变更覆盖此前 design 技术预案中“main 临时 selectionText 回传”的备选路线；只要 renderer 方案完成逐类真实验证，旧备选不应进入当前 IPC 协议。不能因 Chrome 研究结果把 Electron 差异静默省略。

### 原生菜单、静态选择与编辑来源的边界正确

`desktop/main/input-context-menu.ts:6-25` 的旧生命周期可复用为 per-window pending、替换/关闭/失焦/异常清理；`desktop/main/index.ts:121-123,457-463` 已有 sender、mainFrame、本地协议和返回后重新认证的源代码。新模块应在此基础上严格限制能力布尔/固定 ID，正文和 Key 仍只进入受限 clipboard 操作。旧 `DesktopCommandController.tsx:31-34` 的 API Key 菜单入口必须在真实控制器中停止安装，保留旧协议测试即可，避免双入口。

主进程从真实 webContents 获取 zoom，CSS 视口位置转换并限制内容边界的方向合理；不得信任 renderer 自报 zoom、physical pixel 比例或屏幕原点。还需真实 0.75/1/2 zoom、DPI 和键盘入口验证。Electron 本地 `MenuItemConstructorOptions` 支持 `registerAccelerator`；本次 popup 只显示当前绑定标签而不重复注册/执行，应在单元测试断言此行为。

静态来源求交且按 Selection 可见文本读取、恢复端点方向，已由 HTML 修订源码和二十一项报告支持；普通编辑/composer 仍保持独立编辑所有权。方案把自身 selectionchange 与真实用户选择变化区分，使用 observer.takeRecords 防源属性 ABA，是必要方向；应用时不能简单吞掉所有“最终仍相等”的 selectionchange，用户真实 A→B→A 仍须终结旧请求。

### 真实 composer 和 Monaco 模型复用正确

`ChatPanel.tsx:1481-1509` 表明外部 setDraft 会触发全量 render，而 `:1645-1655` 的末尾选择、原生插入和 syncFromEditor 已是可复用的历史保留路径。保留原 chip DOM、无模型仍准备草稿、引用不发送是正确合同；新增接收器 registration revision、会话/draft/作品/切换 epoch 是防目标 ABA 的适当机制。

本地 `monaco.d.ts:2319,2664,2673,3056,6282,6312,6384,6699` 支持模型版本、真实 undo/redo 能力、多选区、内容/选区变化、鼠标上下文和位置目标查询。按模型位置稳定排序、空行连接多选引用，同时保留原复制/剪切和 trigger 粘贴编辑栈，能避免隐藏 textarea 误读正文。需观察 model、version 和整个 selections 列表，任何模型/选区变更都失效；不会只比较 getAlternativeVersionId，从而让撤销回到相同内容复活旧请求。

## 正式方案必须修订的四项

### P1：请求协议和取消需要同一个 requestId

当前方案的严格请求只有 `{kind,commands,position}`，取消为无参数 `cancelTextContextMenu()`，但 renderer 存在请求 epoch、替换请求、dispose 和异步取消。仅按窗口取消无法区分“旧请求迟到取消”与“当前新菜单取消”：同窗口先打开 A，再打开 B，A 的迟到失效回调就可能取消 B。只在 renderer 检查返回 epoch 不能保护 main 的 pending。

必须把受限 requestId 加入 show 请求与返回配对，使用 `cancelTextContextMenu(requestId)`；main 只取消 sender/owner/frame 与 ID 都匹配的 pending。返回命令亦带 ID，或 Promise 闭包加 ID 核对，不能依赖“当时窗口最新”。新窗口/主 frame 替换、渲染进程消失、导航、失焦、业务 gate 关闭须 null 结束并清理旧 pending。添加 A→B→迟到 cancel(A) 不关闭 B、其他窗口不得取消、窗口关闭/throw/callback 一次 resolve 的用例。

### P1：普通引用不能被 insertDraftAtCaret 自动变成新实体 chip

方案 append 用原 `insertDraftAtCaret({nativeUndo:true})`。但 `composer-editor.ts:319-320` 调用 `renderDraftIntoEditor(container,text,hydrate)`；该函数扫描 `MENTION_TOKEN_RE` 并以 `createChipElement(hydrate(token) ?? fallbackChipData(token))` 水合。即使传入不返回数据的 hydrate，也仍会创建 fallback chip。因而源选中的普通文字含 `@[角色/标签](标识)` 时，新 Markdown 引用可能成为带实体身份的 chip，违反“普通文本引用/不隐式移植实体”，而源是 composer 取可见标签只解决一部分来源。

必须明确引用的新文字使用纯文本原生插入合同，不对新 quote 运行 mention 水合；原草稿中的实体 chip 仍原样保留。还须考虑持久化/关闭重开/切换会话恢复后 `renderDraftIntoEditor` 对 quoted token 的重新水合，不能仅保证本次 DOM 插入是纯文本。可通过 Markdown 引用行的明确字面量规则或可逆的序列化边界解决，不能为了测试直接修改整框 innerHTML/value，也不能简单 trim/删除原选中文字。测试至少含 quote 中完整 token、括号负载、同名实体以及原草稿已有真实 chip，并执行引用撤销/重做、草稿恢复和会话往返。

### P1：quote 可用性须排除已存在的切换/加载过渡

方案 lease 会因 request 切换 epoch 失效，但 `available` 目前只列 canSend、composition、recovery、creatingNovel、modal。`ChatPanel.tsx:912` 的 canSend 本身仅是 recovery ready 且非 creatingNovel；`:1069-1073` 先清除 requestedConversationId，再异步 loadConversation。`:922,1634` 的 isLoadingConversation 是独立状态。`stores/chat.ts:156,159-169` 还分开设置/清除 requested/newConversation 状态。因此“请求已有 pending/loading 时新打开的菜单”可以获得新的合法 lease，却仍向正在切换的 transient 草稿引用。

必须明确 available 和 append 最终复核都排除 requestedConversationId、newConversationRequested/newConversationPayload 的消费过渡及 isLoadingConversation；切换 epoch 订阅要在请求出现、清除、load 起止时持续覆盖，不能只在最终 conversationId 改变时递增。引用受理后 requestChatFocus 自身 chatFocusNonce 和本次 syncFromEditor 不误杀提交。加入“加载中的新菜单禁用引用”“A 请求 B 后迟到命令不改 A/B”“A→B→A 旧 lease 不复活”和“同 conversationId 不同 draftId”用例。无需模型的稳定草稿依然应可引用。

### P1：Monaco 接管须在内置处理前截断，仅文本区接管

本地 `node_modules/monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js:47` 在 ContextMenuController 构造时已经订阅 onContextMenu。仅在 mount 后新增 onContextMenu 监听，内置 listener 很可能已经先打开菜单；而全局设 `contextmenu=false` 会在 `:75-81` 提前按单个 getSelection 改光标，并在 `showContextMenu(:121-122)` 直接返回，影响原菜单、次要多选区和 scrollbar 动作。方案写“恢复原入口”还不足以确定时序。

须明确采用能先于内置处理的选择性 interception（例如 document capture 配合真实 `editor.getTargetAtClientPoint`），仅 CONTENT_TEXT/CONTENT_EMPTY 及等价键盘文本入口接管；文本区事件在 Monaco 自己弹菜单前阻断，非文本区域保持原 contextmenu 设置和行为。不能用最近 `.monaco-editor` 作为全部文本判断。公共菜单选“编辑器操作”在本次 native popup 已关闭且 lease/model/选区仍有效后，聚焦真实 editor 并调用具体 `editor.action.showContextMenu`；这个 action 在 `contextmenu.js:324-335` 已注册。保持内置菜单为 Monaco 原 DOM 菜单，不误称另一个系统原生弹窗。

测试须覆盖一次右键只出现一个公共菜单、专属入口明确点击后只出现原 Monaco 菜单、菜单取消不打开专属菜单、次要多选范围内右键不折叠到主光标、右键范围外符合原光标行为、scrollbar/装饰/查找输入/评论 ViewZone/键盘菜单和 Web 模式不回归。特殊菜单返回不能执行任意 renderer/main command。

## 用例阶段必须承接的验证

- 固定命令 schema 拒绝文本/Key/任意脚本/未知键，kind 控制静态历史组与 editor.context；无空分组/连续分隔线、快捷键来自当前平台设置、无二次 accelerator 注册。坐标有限、边缘限界和真实缩放验证。
- source 与 quote target 的单独 epochs、内部 Selection 恢复标记、源 MutationObserver 属性/文本 ABA、input 同值 ABA、窗口/frame/请求替换、取消/卸载/失焦/scroll/IME；在菜单返回及每次 clipboard await 后执行副作用前复核。
- 每种普通/特殊 input、只读/允许可选 disabled、password/API Key、generic contenteditable/plaintext-only、所有静态来源、Dialog/Portal、composer 与 Monaco 分别验证选择/操作，不能把一次启动冒烟或模板枚举当作覆盖。
- 草稿原 chip 与历史保留、普通引用不会水合实体、无模型可准备、不自动发送、来源是 composer、本次一次撤销/重做、稳定身份以及请求/loading 过渡的禁用。
- 真实 Windows Electron 菜单看到并选择、剪贴板/源文本/草稿核对，离线安装包启动；macOS/物理 IME 缺机器时据实待验收。Chrome 研究、HTML 和模拟 IPC 只证明各自范围。

## 复核状态

初审待四项修订。已向主代理发送源码依据及具体可落实的改法；待正式方案补丁后追加复核，不要求扩大授权，也不修改其他任务文件。

## 正式方案修订后复核

结论：**四项原阻断合同已具体修订，正式方案独立审核通过，可进入测试用例编写与独立审核阶段。** 此结论覆盖本文初审“待四项修订”状态；不允许跳过用例审核直接实现，也不代表任何新增模块、原生菜单或业务行为已经测试通过。用户 HTML 已批准，不需再次批准。

| 初审项 | 最新方案中的修订 |
| --- | --- |
| 请求取消所有权 | show schema 增加 UUID requestId，返回 `{requestId,command}`；cancel(requestId) 仅作用于相同 sender/owner/frame/ID 的 pending，明确迟到取消不能关闭新请求。原生菜单生命周期与 renderer epoch 各自保留。 |
| 普通引用不隐式水合 | ChatPanel append 改 Chromium 原生纯文本插入，不让新 quote 经过 insertDraftAtCaret 的 mention 解析；补充引用行字面量判断、composer 恢复规则、消息 BLOCKQUOTE 不实体化及 scene 身份解析排除引用行，并规定追加/序列化/恢复和原 chip 保留案例。非引用行原有身份与剪贴板合同保持。 |
| 切换/加载目标可用性 | available 明列 requestedConversationId、newConversationRequested、isLoadingConversation、conversationLoadError 及 recovery/creating/composition/modal 屏障；加载开始到完成持续禁用，不能随 requested 标记清除提前恢复。registration/目标身份/切换 epoch 仍守住 A→B→A。 |
| Monaco 捕获时序与原菜单 | document contextmenu capture 配合 getTargetAtClientPoint，在内置处理之前仅拦 CONTENT_TEXT/CONTENT_EMPTY，保持 contextmenu=true；mousedown 命中任意已有范围时保留全部 selections，范围外按原行为定位。专属入口在原 native popup 关闭后调用具体 editor.action.showContextMenu，非文本/查找/评论/scrollbar/Web 模式分别保留并验收。 |

这些修订与本报告所引源代码机制相符，能指导受限范围的 TDD 实现；尚需具体失败用例及实际结果来证明执行时序。特殊 input renderer 路线继续保留 Chrome capability 与真实 Electron acceptance 的区别，不重新引入旧 main 文字回传。

### 用例阶段必须承接的一个新增兼容边界

引用行字面量规则会触及既有序列化语义：现有 `composer-editor.ts:382-389` 不区分 quote 行，允许旧草稿中的 `> @[类型/标签](负载)` 被水合成真实 chip。最新方案“非引用行原 chip 保持”尚不能证明**旧草稿引用行内已有真实 chip**在恢复/会话往返后也保持身份。这不是重新 UI 批准门，但必须加入正式用例，而不能只测试普通行里的 chip。

用例审核须明确测试旧草稿 quote 行已有 chip、普通行原 chip 与新引用中的 token 字面量三种情况；若简单全局 quote-line 禁水合使第一种退化为文本，应在实现前选择可兼容区分的新表示或更窄规则，并更新技术合同。原组件复用和旧 chip 保留约束不能因为新纯文本引用而被默默放弃。

后续验证门继续包括 request A/B 迟到取消、内部选择恢复与真实 source ABA、目标 request/load 过渡、partial 特殊 input 真实命令/系统剪贴板、原 composer 一次撤销/重做、Monaco 非主多选范围/专属菜单/非文本共存、缩放与 native popup 焦点，以及全量与真实目标系统。没有实际目标机器的条目须保留待验收，不以方案或 mock 补记成功。

本次复核只读最新正式方案和相关既有源码，只追加本审核文件；未写生产实现、未改其他任务文件。
