# 文本选区右键菜单调研

文本已可选中，但 AI 对话、AI 输入框、普通输入框和预览文本缺少统一的桌面右键菜单入口。修复需要同时覆盖菜单打开、原选区保留、编辑操作和引用草稿；仅调整 `user-select` 无法完成目标。

调研日期：2026-10-13（Asia/Shanghai）。源码基线：`c4cf283` 加当前工作区；当前存在其他任务的未提交修改，本任务保留这些修改。本文的缺陷结论来自源码路径，尚不宣称已在真实安装版完成复现或修复。

## 现有文本边界

| 文本范围 | 现有入口 | 已具备能力 | 缺口 |
| --- | --- | --- | --- |
| AI 用户消息、AI 回复、消息里的 Markdown | `src/components/layout/ChatPanel.tsx` 的 `data-text-preview` | 正文允许选取；已有整条消息复制按钮 | 无选区右键菜单 |
| AI 输入框 | `ChatPanel.tsx` 的 `.chat-composer-editable`，`src/components/chat/composer-editor.ts` | contenteditable、原子引用 chip、草稿同步、原生撤销、纯文本粘贴 | 有文本命令适配器，无右键入口 |
| 普通 input、textarea | `src/lib/desktop/input-commands.ts` | 常见文本控件有命令注册与选区导航 | 右键入口仅接受特定 API Key 控件；email/number/date 等不满足现有 `selectionStart` 判定时仍须处理 |
| Markdown 预览 | `src/components/editor/MarkdownPreview.tsx` | 真实 Markdown 渲染与 `data-text-preview` | 无选区右键菜单 |
| 正文预览、评论原文 | `src/components/comments/CommentablePreview.tsx` | 渲染文本到源码的选区映射、添加评论与浮动入口 | 右键需共存，不能清除评论锚点或拦截正常左键操作 |
| 卡片摘要、评论内容、其他业务预览 | `src/lib/desktop/text-selection.ts` 及 `data-text-preview` | 卡片原文可拖选，避免误开卡片 | 现有适配器仅监听左键选取相关事件 |
| Markdown 正文编辑 | `MonacoMarkdownEditor.tsx`、`src/lib/desktop/monaco-commands.ts` | 真实 Monaco 模型、命令、撤销和现有编辑器菜单 | 若接入统一文本菜单，必须用模型选区并防止双菜单 |

## 已证实的实现缺口

1. `src/lib/desktop/input-commands.ts:31` 的 `installInputContextMenu` 只在 `isAPIKeyControl(target)` 成立时调用原生菜单；该判定要求 password 类型且带 `data-desktop-clipboard="api-key"`。
2. `src/components/desktop/DesktopCommandController.tsx:33` 只安装这一入口。`desktop/main/index.ts` 注册了 `desktop:input-context-menu` IPC，但没有为所有文本建立 `webContents` 的 `context-menu` 通用兜底。
3. `desktop/shared/input-context-menu.ts` 的菜单协议只有撤销、重做、剪切、复制、粘贴、全选，没有引用到对话。`desktop/main/input-context-menu.ts` 可复用原生菜单生命周期、单窗口替换和取消机制。
4. `src/app/desktop.css:18` 明确允许 `data-text-preview`、`data-text-input`、编辑文本控件和 Monaco 文本区域选取。该 CSS 解决可选取性，并不负责创建 Electron 菜单。
5. `tests/browser/text-selection.test.ts`、`text-selection-cards.test.ts` 和 `scripts/verify-text-selection.mjs` 验证拖选、控件编辑、卡片行为等，未覆盖所有文本的右键菜单打开与执行。`tests/unit/input-context-menu.test.ts` 的目标夹具是 API Key 控件，不能证明通用覆盖。

这解释了“可以选中却没有相应菜单”的结构性原因。各控件的事件时序、真实原生菜单和目标系统行为仍需在后续实施中逐项验证。

## 平台与编辑器依据

Electron 的 [`webContents` context-menu 事件](https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu) 给出选中文字、可编辑性、文本控件类型和编辑能力标志，适合确认特殊控件的原生能力。[`Menu.popup`](https://www.electronjs.org/docs/latest/api/menu#menupopupoptions) 将菜单绑定到指定窗口，支持坐标与关闭回调；当前原生菜单类已使用这条路径。

[`contextmenu` 事件](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event) 的常规入口是鼠标右键或菜单键。方案优先在渲染端识别真实文本来源，建立选区快照，再请求原生菜单；特殊原生文本控件的能力由 Electron 补足。上述官方文档是 API 依据，不替代当前版本的执行验证。

本仓库安装的 `node_modules/monaco-editor/monaco.d.ts` 明确提供 `getSelection`、`getSelections`、`getValueInRange`、`onContextMenu` 和 `contextmenu` 选项。Monaco 不能通过隐藏 textarea 的 DOM 选区读取正文，也不能用 `input.value` 代替模型修改。

## 建议方案

延续现有原生菜单设施，增加统一的文本来源与选区适配器。普通输入框、composer、预览和 Monaco 分别提供选区与操作能力，菜单选择只返回受限命令 ID。一般选中文字留在渲染端快照中，不作为打开菜单的 IPC 载荷进入主进程或日志。特殊原生控件由 Electron 的原生事件提供选区，允许临时存在主进程内存；仅经同窗口、同请求守卫回传非敏感选区，不持久化、不记录。

引用操作把可见的选中文字转成普通 Markdown 引用，追加到当前 AI 草稿并聚焦输入框；用户原草稿和实体 chip 保留，不触发发送或供应商调用。敏感控件保留其现有复制/粘贴能力，但不向 AI 草稿引用密码或 Key。

HTML 用于审核菜单信息结构、禁用状态、引用结果和边界交互。正式实现继续复用真实 Web React 组件，原生菜单的像素与动画由目标操作系统决定。

## 产物与阶段

下一步为 [产品设计](product-design.md)，再提交 [HTML 设计稿](index.html) 给用户审核。用户最新要求明确设置本次 HTML 审核门，覆盖仓库通用的“无需重新 UI 批准”。通过后再依次完成技术方案与独立审核、测试用例与独立审核、TDD、代码审查、全量测试与真实目标系统验证、总结。
