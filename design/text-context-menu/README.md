# 文本右键菜单审核产物

按顺序阅读 [调研](research.md)、[产品设计](product-design.md)，打开 [HTML 审核稿](index.html)。技术预案见 [technical-plan.md](technical-plan.md)，独立审核见 [plan-review.md](plan-review.md)。

HTML 可直接离线打开，无 HTTP 服务与远程资源。初始展示正文选区与菜单；切换顶部场景、拖选正文或输入框文本，再单击鼠标右键。可操作引用、演示复制/粘贴、剪切、删除、全选、撤销；菜单键或 Shift+F10可打开菜单，方向键导航，Esc 关闭。引用追加到对话草稿，不发送。主题和平台切换仅展示设计效果。

最新修订：非输入框、非编辑文本不显示撤销/重做，输入框和编辑区保留历史分组。只读输入框仍显示两项，但禁用。刷新已打开的 HTML 可查看修订稿。

用户发送的聊天消息支持部分选取、双击选词与三击整段选取后的右键复制。新增父容器选区边界回归已先失败再修复；当前共 21 项审核稿检查通过。



预览使用真实 `MarkdownPreview`。其余审核用编辑控件与菜单为设计演示；剪贴板限于本页面内存，不读取或写入系统剪贴板。合成占位文本、审核工具栏和本页面不进入正式产品。

构建：`node design/text-context-menu/build-preview.mjs`。审核稿验证：`node design/text-context-menu/verify-preview.mjs`。结果见 [HTML 验证](design-verification.md)。截图和 `preview-checks.json` 仅证明 HTML 产物，不作为 Electron 原生菜单、产品测试或真实 macOS 验收。

当前阶段为等待本次 HTML 用户审核。生产实现、测试用例独立审核、TDD、子代理 code review、全量用例与真实目标系统验证在审核通过后推进。
