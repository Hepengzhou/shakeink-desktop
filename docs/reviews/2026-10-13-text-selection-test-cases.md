# UI 文字禁选测试用例

前置：调研、方案及独立方案审核。先红后绿；只用隔离合成文字。

| ID | 操作 / 范围 | 期望 |
| --- | --- | --- |
| TS-01 | 真实产品 CSS 下标题、说明、空态、统计、列表、状态、错误、tooltip、portal UI；双主题 | computed user-select 为 none；真实鼠标拖拽/双击不能得到文字选区 |
| TS-02 | 普通文本/搜索/密码/数字 input、textarea，含 readonly/disabled | 输入文字为 text；可编辑控件 Ctrl+A、Shift+方向键、键入/撤销保持正常；按钮式 input、checkbox/radio 等 UI 为 none |
| TS-03 | contenteditable true/plaintext-only；composer 根 false + data-text-input；原子 chip false | 编辑/草稿正文可选；chip 标签 none；输入、真实鼠标/键盘选区正常 |
| TS-04 | 实际 MarkdownPreview，含标题、段落、链接、强调、列表、表格、高亮代码 | 正文及全部嵌套内容可鼠标选取；外侧标题 none |
| TS-05 | 实际 CommentablePreview / 评论正文和 quote | 原文可选；作者/时间/按钮 none；选区评论功能保留；评论输入可选 |
| TS-06 | preview 内 UI、UI 按钮内 preview、再内层按钮/输入 | 最近边界正确恢复 text/none/text；不能被父按钮或整个预览容器错误放行 |
| TS-07 | 非 Markdown 清单：摘录、差异、模板、草稿、队列、实体/伏笔原文、场景卡及披露 | 使用真实组件/源码节点覆盖检查；只有内容节点带 preview 标记，标签/空态/符号保持 none |
| TS-08 | 真实 Sonner toast、dialog/menu portal、动态挂载 UI | 标题/说明及动作文字不可选，点击/键盘焦点仍生效 |
| TS-09 | 全量 unit/integration、全部 browser、typecheck、build | 记录实际命令、计数与完整失败；既有 Windows 基线问题需对比，不虚报全绿 |
| TS-W01 | 新构建的真实 Windows Electron，隔离根离线启动，引导/工作台/设置/菜单 | 无模型；实际 UI 鼠标拖拽禁选，portal 全覆盖；无 renderer HTTP 请求 |
| TS-W02 | 真实 Electron 输入、保留草稿、真实业务预览 | 输入/预览鼠标与键盘可选；周边 UI 不可选 |
| TS-W03 | 真实 Monaco 正文和分屏预览，选取、编辑、撤销、切换视图 | 真实编辑器选区存在；原文修改和撤销正常，预览可选，行号/工具/状态禁选 |

Chromium 组件测试使用产品 CSS 与真实 React 组件，数据为隔离输入，不是 Electron 或业务流程证明。Windows 通过仅覆盖当前机器；macOS/安装包若未执行单独记录。测试不得读取真实用户资料、Key，不调用模型供应商。

TS-07 全量节点映射引用 `2026-10-13-text-selection-plan-review.md` 的“非 Markdown 内容边界清单”，并补入 `chat/SearchPalette.tsx:111` 的消息 snippet 与 `content/scene/SceneWorkspace.tsx:67` 场景 description（空态除外）。实际组件鼠标验证必须包括候选 button 内 excerpt 和 draggable 场景卡简介，兼验卡片非正文区仍可拖动；不能仅查标记。工具预览覆盖 `ToolCallCard.tsx:17/48` 长正文/quote，字段名和状态仍 none；折叠评论覆盖 `ReviewCommentsSection.tsx:90`。

计划脚本：`tests/browser/text-selection.test.ts`（产品 CSS/真实 Markdown、评论、变量、hover 组件、输入和嵌套策略行为），`scripts/verify-text-selection.mjs`（实际 Windows Electron，真实 ChatPanel composer 即使 false 的草稿、Monaco/Markdown 和 UI），以及真实候选/场景卡专项组件测试。先运行新增行为断言失败证据，再实现。TS-W02 必须验证真实 ChatPanel，不可仅合成 contenteditable。

TS-ABOUT：desktop/main/index.ts 的独立 Windows About 真实 HTML（不是 React 根）全部标题、版本、说明和许可 UI 禁选。tests/browser/about-text-selection.test.ts 读取实际模板、真实鼠标拖选/双击，先红后绿；Windows runner 经原 app.about 命令创建真实沙箱窗口复核。
