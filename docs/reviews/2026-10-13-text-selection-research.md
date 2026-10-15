# UI 文字选取调研

日期：2026-10-13（Asia/Shanghai）。范围：本独立仓库的真实 React UI。

## 需求解释

所有界面标题、导航、按钮、字段标签、说明、状态、错误、统计、菜单、提示和空态文字不可鼠标选取。输入控件的文字、编辑器正文和内容预览文字继续可选。预览中的操作、作者/时间等界面元信息仍是 UI 文字。

## 源码发现

- `src/app/layout.tsx` 统一加载 `globals.css` 和 `desktop.css`；可用桌面样式覆盖所有业务面板、设置、引导以及挂到 body 的 portal，无需重写 Web 组件。
- `desktop.css` 目前仅拖拽区和 tab 禁选；`ui/button.tsx`、`label.tsx` 等局部使用 `select-none`，不足以覆盖普通标题、说明及状态。
- `MarkdownPreview.tsx` 的 HTML 正文、`CommentablePreview.tsx` 的 `PreviewBlock` 是精确预览边界。后者外层 `.markdown-body` 同时包含评论气泡、作者/时间及操作，不能对整个容器无差别放行。
- `ChatPanel.tsx` 用户消息、助手 Markdown 和展开的思考原文是内容；生成状态、工具行等仍是 UI。composer 使用 contenteditable，mention chip 为 contenteditable=false 原子节点。
- `MonacoMarkdownEditor.tsx` 使用真实 Monaco，其文本选区由编辑器控制；应保留现有挂载、命令、选区和撤销，仅保证原生 textarea 不受禁选影响。
- 非 Markdown 预览包括正文差异、候选稿摘录、生成草稿、创作模板原文、提示词变量高亮、场景旁白/言行/主干/节拍卡、实体悬浮简介、伏笔原文及评论摘录。部分摘录位于 button/menuitem 内，应允许嵌套内容重新建立预览边界。
- `globals.css` 的 `.foreshadow-mark[role="link"]` 显式 text；新策略需保证其遵守所在内容边界。

## 技术选择

采用 CSS 默认禁选 + 显式内容边界。用可继承的 `--desktop-text-selection` 传递局部策略，每个元素应用该值。预览根将变量设为 text，嵌套 UI 控件设为 none，输入根设为 text；更内层的真实预览可再次设为 text，因此可正确处理候选卡按钮中的正文。不拦截 selectstart、mousedown 或键盘事件，不依赖文本内容或 API 数据判断。

## 验证边界

先以真实产品 CSS/React 组件进行 Chromium 鼠标、键盘和 DOM 选区验证，再构建实际 Electron，在隔离测试根离线验证 Windows UI、输入、预览及 Monaco。全量单元/集成和浏览器套件分别记录，不把模拟业务数据的组件测试记为真实业务通过；macOS 未执行则明确保留未执行状态。

当前工作区已有 creation-context 修改，本任务保留它们，不改用户数据和 Key。

最终入口复核发现 `desktop/main/index.ts` 的 Windows「关于」窗口使用独立 data URL HTML，不加载 React 全局 CSS；标题/版本/说明均为 UI，需在该文档加入标准/WebKit 禁选样式。其它维护/重定位窗口加载同一 `shakeink://app/`，已被全局策略覆盖。
