# UI 文字禁选代码实现

前置：调研、方案及独立方案审核、用例及独立用例审核，新增浏览器用例先执行红灯。具体 diff 是本次真实 React 组件变更，不引入设计稿工作台。

## 统一策略

`src/app/desktop.css` 为每个元素应用继承的 `--desktop-text-selection`，默认 none，标准/WebKit 属性一致。`data-text-preview` 仅标记原文；`data-text-input`、文本型 input、textarea、可编辑根及 Monaco 的 `.native-edit-context` 为输入例外。原子 mention chip、普通控件和 `data-text-ui` 重建 none 边界。策略覆盖 portal 和后挂载 UI。

Monaco 原生 EditContext 输入层为普通 div，不带 contenteditable，故使用精确类选择器恢复输入；编辑器行号、工具、状态、评论作者等仍禁选。既有伏笔 mark 和 Monaco hover 的显式 text 规则跟随局部策略，正文链接继续可选。

## 原文覆盖

Markdown HTML 与 CommentablePreview 的 PreviewBlock 单独放行；外层包含作者、时间、浮钮等 UI 的容器不放行。评论正文/引用、用户/助手/思考原文、队列、候选摘录/作者意见、草稿、变量、模板、实体简介、伏笔引用和报告正文均精确标记。

业务区域覆盖生成草稿、前后修订及差异原文、场景/角色/物品/属性/等级简介、章纲、剧情主干/节拍/场景台词（含旧数据 fallback 和导演指示）、角色弧简介/因果、世界线/叙述披露及提案、卷简介、评分/改进意见与引用。差异符号、字段前缀、空态、状态及评分不放行。SidebarHoverCard 通过明确的 `blurbIsPreview` 区分内容简介与静态帮助。

完整源节点表见独立 `-plan-review.md`，额外遗漏的发现/修复见 `-content-code-review.md`。实现没有根据显示文字长度推断所有字符串都是预览；工具详情按明确内容字段判定。

## 真实卡片事件边界

真实红灯表明，仅 CSS 不能修复 draggable 卡片阻断拖选，或摘录选取同时触发打开/切换。`src/lib/desktop/text-selection.ts` 由 `Providers` effect 挂载并清理：

- 仅预览原文起点按下时暂停可拖动祖先，松开、失焦、cleanup 后恢复原属性。
- 预览在卡片/交互角色/label 内时隔离向外 click/dblclick，保留原生选区默认操作。
- 正文内真正 button、链接、输入及其他控件继续接收原事件；独立正文的评论选区处理保留。
- 标题/徽标等非正文区域继续执行点击、引用拖动和默认 label 操作。

专项测试锁定无 role 的 draggable 卡、临时 false 状态、role=checkbox、label 默认动作、真实内部控件和后挂载卡等边界。

## 审核与验证入口

独立代码审核分工：主策略/聊天/模板/伏笔及新增补漏由 `selection_audit` 审核；原 content/score 标记由 `selection_chat_impl` 审核。各实现者的修改均经另一方或主代理复核；不以自审代替独立结论。

测试：`tests/browser/text-selection.test.ts`、`tests/browser/text-selection-cards.test.ts`；真实 Windows：`scripts/verify-text-selection.mjs` 和只生成隔离数据的 `seed-text-selection-fixture.ts`。结果与执行限制以随后验证文档为准。

保留进入任务时已有 creation-context 代码、文档、脚本和台账修改；没有改动上游 Web 目录、真实作品或 Key。

独立窗口补漏：desktop/main/index.ts 的 Windows About data URL HTML 在原 body 样式增加标准/WebKit none；它没有输入或预览。其它自有维护/重定位窗口都加载同一 React 根。TS-ABOUT 真实模板红灯后转绿，并经原 app.about 命令创建实际窗口复核。
