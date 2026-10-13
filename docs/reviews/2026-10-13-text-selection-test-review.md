# UI 文字禁选测试用例独立审核

日期：2026-10-13（Asia/Shanghai）。审核范围：调研、方案、独立方案审核、修订后的测试用例文档、新增与既有测试源码及相关真实组件；只写本审核文件，未运行产品、模型或测试。

## 结论

**修订后通过，用例设计无剩余阻断项。** TS-01～TS-W03 已覆盖默认 UI 禁选、输入例外、Markdown、评论、嵌套边界、portal、全量回归及 Windows Electron/Monaco 的主要路径。复审时，文档已补充完整非 Markdown 源节点清单引用、真实候选按钮/可拖动场景卡的鼠标行为及真实 ChatPanel 草稿验收。可进入测试补充及 TDD 实施；本结论不表示脚本完整或行为已通过。

## 已闭合的初审问题

1. **TS-07 原先只有类别，缺少完整的纯文本预览源映射。** 真实源码中，`src/components/chat/SearchPalette.tsx:111`～`:112` 将 `h.snippet` 放在搜索结果按钮里；`src/components/chat/ToolCallCard.tsx:15` 明确注明“长文本（正文/大纲内容）：截断预览块”，`:17`～`:22` 展示自然文本，`:48` 展示 `quote-block` 原文；`src/components/score/ReviewCommentsSection.tsx:54`～`:65` 明确为折叠评论首句预览。修订后的用例文档引用独立方案审核的“非 Markdown 内容边界清单”，并补充消息 snippet、工具正文/quote、评论首句和场景 description。该清单将已有差异、候选、模板、草稿、实体/伏笔、场景/剧情等内容映射到精确源节点及相邻 UI；这一设计缺口已闭合。用例补充段的 `desktop/SearchPalette.tsx` 是笔误，实际文件为 `chat/SearchPalette.tsx`，执行按真实路径。

2. **按钮/可拖动卡中的预览原先缺少真实组件事件用例。** `src/components/chat/CandidateDrawCard.tsx:286`～`:314` 的 excerpt 位于真实 `button` 内；`src/components/content/scene/SceneWorkspace.tsx:67` 的场景简介位于同时带 `role="button"`、`draggable` 和 `onDragStart` 的 `article` 内。即使 computed `user-select` 为 text，父控件点击/原生拖动仍可能阻止鼠标文字选区。修订文档已要求真实候选 button 内 excerpt 和 draggable 场景卡简介鼠标验证，且卡片非正文区仍可拖动；这一设计缺口已闭合。执行必须保留原组件事件，不能以去掉 draggable/事件的合成 HTML 代替；场景暂无介绍占位、搜索结果按钮内 snippet 及相邻 UI 同时覆盖。

## 执行时的判据

- 鼠标禁选/放行必须先清空旧 Selection，再用真实鼠标操作并读取 Selection；只检查 computed style 或用 `Range.addRange()` 人工创建选区不能证明鼠标行为。双击选词与跨节点拖拽分别验证；嵌套 UI 的断言应同时检查选区包含正文且不包含 UI marker，不能只检查长度大于零。输入框用原生 `selectionStart/selectionEnd` 或其类型的原生选区行为，不误用 `window.getSelection()`。
- TS-02 的 readonly/disabled 应分别记录：readonly 草稿可选且禁止修改；disabled 保留 Chromium 原生可选性/焦点行为，CSS 不额外禁选。数字、日期等 input 不支持统一 selectionStart 断言，需按原生类型判定；输入类型覆盖与方案 `:13` 保持一致，按钮式 input、select/option、checkbox/radio 的可见 UI 标签仍 none。
- TS-03 使用实际 composer 根的 `contentEditable={canSend}`（`src/components/layout/ChatPanel.tsx:1969`）切换 true/false，false 时保留已存在草稿 text；引用 chip 的真实 `contentEditable="false"`（`src/components/chat/composer-editor.ts:65`）独立 none。至少包含 plaintext-only 及嵌套 false chip，不能只测普通 contenteditable。
- TS-04/05 测真实 Markdown/CommentablePreview 的正文节点和评论操作，包含正文选区创建评论后的原有功能。TS-08 测真实 Sonner/Radix portal 挂到 body 后的标题、说明、动作和 textarea 的不同边界。
- TS-W03 的 Monaco 由真实 JS 编辑器实例读取选区/选中文字，验证编辑及撤销、readonly 选取、分屏预览；行号、状态、find/hover 工具可见文字单独检查 UI none，find 输入保留原生可选性。不能以原生 textarea 的 CSS 或模拟 Monaco 对象代替真实编辑器结论。

## 证据与限制

已读取本次文档，并使用 `rg` 检查真实组件与新旧测试。现有 `tests/browser/preview-text-commands.test.ts:18` 使用合成 DOM，`:54` 以 `Range.addRange()` 设置选区并模拟编辑器；`tests/browser/composer-clipboard-review.test.ts:31`/`:34` 同样程序化创建选区，`:44` 仅加载局部 composer 样式。它们适合作为既有命令回归，不能替代本次真实产品 CSS 的鼠标 Selection 或真实 Monaco 验收。

复审已读取 `tests/browser/text-selection.test.ts`：其编译真实产品 CSS，挂载真实 MarkdownPreview、CommentablePreview、CommentBubble、HighlightedContent、SidebarHoverCard，并用 `page.mouse` 操作选区。`docs/evidence/text-selection/red.tap` 记录 5 项全部失败（0 通过，5 失败），原始 computed style 为 auto，符合实现前基线；本审核只读取该命令产物，未代执行。

该新增脚本目前仅覆盖代表性内容与合成输入/最近边界，portal 为普通 `createPortal` tooltip，readonly/disabled 只检查 style。真实 Sonner/Radix、原生只读输入选取、实际 composer/Monaco、候选/场景卡事件等已被设计要求覆盖，但脚本仍待补齐。用例文档计划 `scripts/verify-text-selection.mjs` 验证实际 Windows Electron；行为是否通过必须以补齐后真实运行及全量证据为准。未执行平台、安装包及原生 GUI 仍不得写为通过。
