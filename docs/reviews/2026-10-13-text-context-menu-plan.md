# 文本右键菜单实施方案

2026-10-13 用户已明确批准修订后的 HTML。实施来源为 `design/text-context-menu/product-design.md`：静态文本无撤销/重做；用户消息选区可复制；引用仅追加普通 Markdown 引用到现有草稿，不发送。保持 Web 原组件与离线桌面边界。

## 菜单所有权与协议

新增独立 `desktop/shared/text-context-menu.ts`，严格校验 `{requestId,kind,commands,position}`，requestId为UUID，kind为preview/input/editor，commands为九项固定布尔能力（`text.quote`,`text.undo`,`text.redo`,`text.cut`,`text.copy`,`text.paste`,`text.pastePlain`,`text.delete`,`text.selectAll`）。position仅允许有限的非负CSS视口坐标。没有正文、Key、chip属性或动态脚本字段。结果为 `{requestId,command}`（command为菜单内固定ID或null）；编辑器专属入口采用固定 `editor.context`，只用于打开原生Monaco菜单，不执行任意主进程命令。

新增 `TextContextMenus`，复用既有原生弹窗的单窗口pending替换、关闭/失焦取消、回调和异常清理机制。按来源生成非空组：引用、输入/编辑历史、剪贴板、选区；editor最后追加“编辑器操作”入口，保留原Monaco全部专属菜单。快捷键从主进程当前平台设置和既有命令目录解析；菜单accelerator只作为标签，不在popup注册第二条命令分发。坐标按真实webContents zoom转换为窗口内容DIP，并限制于所属窗口内容边界。

bridge新增 `showTextContextMenu(request)` 与 `cancelTextContextMenu(requestId)`。主进程验证当前真实sender/主frame/本地shakeink协议、所属BrowserWindow和业务gate；菜单返回后再验证相同owner/frame及requestId。取消只能关闭发起窗口同requestId的pending菜单，迟到取消不得关闭新请求。已有API Key菜单协议保留兼容测试，但真实控制器不再同时安装旧入口，避免一次右键打开两套菜单。

## 渲染端统一入口

新增 `text-context-menu.ts` 文档级捕获委托，识别普通可选input/textarea、contenteditable、原AI composer、`data-text-preview`/`data-text-input`和注册的Monaco适配器。只在实际文本来源接管并preventDefault；控件、按钮、业务菜单和不可选UI保留既有事件。普通弹层和业务面板依托真实DOM自动覆盖，不复制29个面板。

输入框来源与editable能力独立：只读/可选disabled控件显示历史但禁止修改。password禁止引用及普通复制/剪切；明确API Key控件仍采用既有获准编辑能力。preview不显示历史，修改项禁用；全选限定到来源，不包含卡片按钮/章节工具栏。键盘ContextMenu/Shift+F10执行同一路径，IME组合时不执行历史/修改或引用。

选区辅助模块 `text-context-selection.ts`：普通控件读取selectionStart/End，静态DOM取范围与来源交集并以Selection可见换行序列化，恢复原端点和方向；composer复制复用selectedEditorText身份序列，引用取可见chip标签。编辑来源必须有自身选区所有权，不因为静态裁剪放宽修改权限。

特殊input采用经实测的渲染端原生选择能力：`docs/evidence/text-context-menu/control-inspection.json` 已证明Chrome email/number/date等无selectionStart但Selection.toString及queryCommandEnabled可读取真实选区/能力。菜单在该控件为activeElement且原事件同来源时读取可见选区、值和DOM选择指纹；执行copy/selectAll等真实Chromium命令，禁止整个value冒充选区。date等结构化控件按真实queryCommandEnabled禁止不支持的cut/delete/paste。此路线避免原生main事件与renderer快照的异步配对、文字回传和双菜单；实际Electron必须逐类型再验证，若版本差异造成缺口，补方案审核后修适配器，不能静默省略。

## 请求与异步守卫

每个菜单请求保存source、类型、不可变选择、html/value/模型版本、操作epoch、对话目标lease。pointerdown右键先使旧请求失效，再捕获新请求；菜单本身和内部焦点恢复不误杀新请求。focus、selectionchange、input、keydown、composition、外部pointer、scroll、窗口失焦、卸载和重新菜单使旧请求失效；MutationObserver的takeRecords覆盖源DOM/属性ABA，控件事件epoch覆盖用户同值ABA。返回/clipboard await后的每次副作用先检查请求、source、选区/内容、编辑状态和quote目标lease。dispose释放监听器、observer、pending popup。

selectionchange的内部规范化/恢复必须标记并比较最终原选择，不能把自己的快照读取当成用户变化；但A→B→A的实际用户选择事件仍终结旧请求。捕获阶段IME是全局组合屏障，恢复焦点时不提交组合文本。菜单pending期间真实窗口应保持焦点；实际原生menu自身造成的系统焦点事件与切到别的窗口分别验证。

已有nativeTextEdits负责普通控件/composer剪贴板及真实历史。预览复制通过受限writeClipboardText发送精确选择，绝不剪切原文。普通新增delete用原生delete；特殊控件用真实queryCommandEnabled+execCommand和异步clipboard守卫；generic contenteditable不直接写innerHTML/value。clipboard失败如实提示，不删除或粘贴迟到内容。

## 真实composer引用

新增 `text-quote-target.ts` 注册一个当前ChatPanel的草稿接收器，提供 `identity()`、`available()`、`append(text)` 及订阅失效能力。lease包含registration revision与conversationId/draftId/novelId/recovery/creating/request切换epoch，A→B→A也失效。canSend可准备草稿但无需模型；composition、recovery、creatingNovel、requestedConversationId、newConversationRequested、isLoadingConversation、conversationLoadError和modal屏障禁用引用。加载开始后到完成期间持续禁用，不能只等切换请求标记清除即恢复可用。

ChatPanel只新增引用接入effect/ref。执行前核对lease，requestChatFocus展开同一面板，在真实composer末尾使用Chromium原生纯文本插入逐行 `> ` 引用并syncFromEditor，保留旧chip DOM、撤销、草稿和模型门控；不将新引用交给会自动解析MENTION_TOKEN_RE的insertDraftAtCaret路径。源为composer先快照再追加；不调用发送，不创建会话/作品，不改变其他作者工作流。引用一次应可撤销/重做。

引用格式器只对本次新增引用里的实体序列起始符做必要Markdown转义，将字面 `@[` 写为 `@\[` 后再加 `> ` 前缀。这样新引用不会在追加、发送或重建时触发MENTION_TOKEN_RE/scene身份提取；已有草稿，包括原先在 `> ` 行中的真正实体chip，仍按原解析合同保留。不得采用“所有引用行都不水合”的全局规则，不修改旧草稿或全局实体解析器。转义是新引用的明确文本格式，没有隐藏实体负载；源原文和旧chip序列不变。增加含token字面量的新引用追加/重建/重开和旧引用行chip恢复兼容用例。

## Monaco接入与专属动作

新增 `monaco-text-context.ts`，在真实Monaco实例mount后注册其DOM所属适配器。公共适配器注册合同为 `capture(target,point?)` 返回 `{root,kind,text,commands,isCurrent,restore,execute(id,assertCurrent),dispose}`；另可提供右键mousedown的selection保护。使用getSelections/model.getValueInRange按模型位置稳定排序，以空行连接多选区引用；复制/剪切继续真实Monaco原动作，不能用隐藏textarea。model version、selections、disposed/model-change事件使快照失效；undo/redo取模型真实canUndo/canRedo。paste通过受限剪贴板读取与复核后editor.trigger原生编辑路径，保留模型撤销。

由document的contextmenu捕获阶段调用 `getTargetAtClientPoint`，只在CONTENT_TEXT/CONTENT_EMPTY命中接管并在内置ContextMenuController收到事件前stopPropagation。保持Monaco `contextmenu=true`；不能仅在后注册onContextMenu中preventDefault，也不能全局关掉菜单选项。右键mousedown若命中任意已有选区，先阻止内置把非主选区折叠的处理并保留全部选区，再由contextmenu捕获创建快照；若命中未选中正文位置则沿用原光标定位后捕获新选区。

Monaco查找框和评论ViewZone归普通input，scrollbar/toolbar/装饰仍走原菜单。公共菜单的“编辑器操作”在原生菜单关闭后明确调用 `editor.action.showContextMenu`，不重建其静态列表，不删除原专属动作。该action不是DOM右键事件，不再次触发公共捕获；一次右键只有一个菜单。保留Web模式默认Monaco行为。真实多光标非主范围右键、scrollbar原专属菜单、find/ViewZone输入和专属入口必须分别验收。

## 文件分工与验证顺序

主代理：统一选择/上下文/quote模块、DesktopCommandController、ChatPanel轻量接入、浏览器及实际Electron验收与台账。原生菜单子代理：仅新增shared/main text-context模块、bridge/preload/main handler及相应unit测试。Monaco子代理：仅新增monaco-text-context、MonacoMarkdownEditor接入及相应unit测试。独立审核者只写审核文档；任何重叠必须先通知主代理，不覆盖现有其他任务修改。

本方案独立审核通过后编写完整用例并独立审核，再先执行失败回归，随后实现与独立code review。记录专项、全量unit/integration/browser、typecheck/build、隔离Windows Electron及离线安装包的实际结果。原生菜单操作需真实看到并选择条目、核对clipboard/正文/草稿/撤销，单查模板或mock返回不算验收。macOS和物理IME若无可用真实目标，据实标待验收，不能宣称全部通过。
