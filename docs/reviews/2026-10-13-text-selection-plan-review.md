# UI 文字禁选方案独立审核

日期：2026-10-13（Asia/Shanghai）。审核者：独立子代理 `selection_audit`。

审核输入：`2026-10-13-text-selection-research.md`、`2026-10-13-text-selection-plan.md`、`docs/implementation-boundaries.md` 及真实 React/CSS 源码。本审核只写此文件，未修改产品文件、其他文档或已有 creation-context 改动；未读取用户数据或 Key。

## 结论

技术方向通过：统一默认禁选、真实正文节点显式标记、用继承的 `--desktop-text-selection` 表达最近内容/UI 边界，能够处理正文位于按钮内以及正文内再嵌控件。它不依赖模拟工作台，不改布局和编辑器生命周期，符合原组件复用约束。

当前方案需补下列实施细则后进入用例阶段；此结论是方案审核，不代表代码或行为已通过。

1. 将 composer 明确写为 `data-text-input`，该根自身同时出现 `contenteditable=false` 时以输入边界为准，内部原子 chip 的 `contenteditable=false` 仍为 UI 边界。证据：`ChatPanel.tsx:1969` 以 `canSend` 控制可编辑属性，但 `1971` 始终为 textbox，无模型时可能仍有草稿；`composer-editor.ts:65` 才是原子 chip。
2. 仅文本型 input 与 textarea 恢复 text；不要无差别放行所有 input。checkbox、radio、button、submit、reset、file、range 等控件文字仍为 UI。只读 textarea 的正文也应恢复（`desktop/RecoveryDialog.tsx:31`、`comments/comment-drafts.tsx:51`）。
3. 纳入下表非 Markdown 预览完整清单。混合节点只标记原文，不将 UI 前缀、状态、空态、作者、时间、评分或操作一起放行。`SidebarHoverCard` 的同一个 `blurb` 同时承载真实简介和静态帮助，需显式来源标记；不能仅因字段名是 blurb/summary/description 就放行。
4. 明确处理既有显式 `user-select:text` 规则，而非允许所有更具体第三方规则绕过策略：`globals.css:2037` 的 `foreshadow-mark[role=link]` 应跟随所在正文边界；Monaco 的编辑正文可保留 JS 选区，但工具提示/错误/查找等 UI 文字仍须禁选。不得通用禁用 `[role=link]`，因为伏笔高亮仍是正文。

## Markdown 和输入边界

| 源码 | 精确节点 | 处理 |
| --- | --- | --- |
| `src/components/editor/MarkdownPreview.tsx:24` | 实际 HTML 正文 div | text；外壳无需扩大例外 |
| `src/components/comments/CommentablePreview.tsx:144` | `PreviewBlock` / `[data-block]` | text；394/401 外层含评论卡片与操作，保持默认策略 |
| `src/components/comments/CommentBubble.tsx:56` | `CommentMarkdown` | text；124 的原文引用另标记；作者/时间/徽标/操作仍 none |
| `src/components/layout/ChatPanel.tsx:326` | 助手 HTML block | text；消息卡外壳不放行 |
| `src/components/layout/ChatPanel.tsx:1967` | composer textbox | data-text-input；true/false 状态皆保持输入文字例外 |
| `src/components/chat/composer-editor.ts:65` | 原子引用 chip | none；这是输入内部的 UI 原子边界 |
| `src/components/editor/MonacoMarkdownEditor.tsx:107` | Monaco Editor | 保留 JS 编辑选区、命令、撤销；原生 textarea 恢复 text；不将整个 `.monaco-editor *` 放行 |

Monaco 本地依赖的 `node_modules/monaco-editor/esm/vs/editor/browser/viewParts/viewLines/viewLines.css:36` 至 40 已将 no-user-select 行设置为 none，44 至 49 的 mac hover 设置为 text。因此 CSS none 并不等于禁止其 JS 编辑选区。最终必须真实拖选/Shift 选区、复制、输入替换和撤销验证，不能只看 computedStyle。

## 非 Markdown 内容边界清单

行号是审核时当前源码节点起点；后续属性修改可使行号变化。

| 源文件 / 行号 | 应保留 text 的原文 | 邻接 UI 仍保持 none |
| --- | --- | --- |
| `layout/ChatPanel.tsx:274` | 用户消息 HTML 正文 | 复制、展开/收起、修改批次 chip |
| `layout/ChatPanel.tsx:443` | 思考展开正文 `thinking.text` | 思考行标题、耗时、箭头 |
| `layout/ChatPanel.tsx:751`、775 | 展开记录中的 `pre` 内容 | details summary、错误标题、说明、重试按钮 |
| `chat/QueueRow.tsx:30` | 排队消息 `q.text` | 队列标题、发送/编辑/删除操作 |
| `chat/TurnProgressCard.tsx:124` | 草稿片段 `progress.draft.preview` | 草稿标题/预览标识、进度、步骤状态 |
| `chat/CandidateDrawCard.tsx:310` | 候选摘录 `candidate.excerpt`，位于 button 内 | 候选名称、状态、字数、整卡交互 |
| `chat/CandidateDrawCard.tsx:340` | `draw.basedOn.feedback` 作者原意见部分 | “基于…”、“作者意见”前缀；不要整行放行 |
| `chat/ToolCallCard.tsx:17` | 长字符串的正文/大纲截断预览 | 工具字段名、结果状态、数字、空值；不能所有 FieldValue 放行 |
| `chat/ToolCallCard.tsx:48` | quote 原文 | 同行字段名 |
| `chat/ReviewCard.tsx:92` | AI 评审正文摘要 | 评审员、目标名、评分、评论数、打开动作 |
| `admin/PromptsClient.tsx:46` | `HighlightedContent` 变量高亮预览正文及 mark/span 后代 | “变量高亮预览”字段标签 |
| `layout/CreateNovelDialog.tsx:519` | 真正模板 `detailTemplate.prompt` | 空白模板帮助文本、模板元信息、返回/使用按钮 |
| `content/CascadePanel.tsx:175`、181 | `item.before`、`item.after` 原文 | “修订前/后”、“（空）”占位、状态及 AI 修订说明标签 |
| `content/ChapterHistory.tsx:165`、202 | 每个 `part.text` 差异正文 | 增加/移除符号、段数、相同版本提示、summary、恢复说明 |
| `content/CharacterPanel.tsx:929` | AI 生成草稿 `draft` | 返回修改/采用按钮、对话框标题 |
| `content/SettingPanel.tsx:362` | AI 生成草稿 `assistText` | 返回修改/采用按钮、对话框标题 |
| `content/SubAgentPanel.tsx:137`、139、141、157、159 | JudgeReplay 的 issue、suggestion、excerpt 内容 | 维度、目标环节、建议前缀、待办标题和计数 |
| `content/SubAgentPanel.tsx:175`、185 | ReaderReplay 的 summary、detail 内容 | 分数、维度名 |
| `content/SubAgentPanel.tsx:219`、222、234、236、238 | CharacterReplay 摘要、建议、意见和引用 | 评分、维度、建议前缀 |
| `content/SubAgentPanel.tsx:254`、262、272 | EditorReplay 的 verdict、risks、suggestions 正文 | 风险/方向建议字段标题、分数 |
| `content/SubAgentPanel.tsx:291`、305、314 | PlaywrightReplay 创作描述、章节 outline、问题正文 | 项目/章节标题、章节计数、问题分组标题 |
| `content/SubAgentPanel.tsx:333` | WriterReplay 正文片段 | 已落库字数、完整正文导航说明 |
| `content/SubAgentPanel.tsx:360`、370 | ScenarioReplay 输出全文、输入上下文原文 | “输出”、“输入上下文”summary 及字数 |
| `content/scenario/chat/ChatView.tsx:334` | 旁白 `group.content` | 回合/角色元信息 |
| `content/scenario/chat/ChatView.tsx:359`、360、361 | 台词、行为、内心原文 | 内心字段前缀、头像、角色名、情绪状态 |
| `content/scenario/chat/ChatView.tsx:402`、404 | 用户回合行为及其它内容 | “我 · 角色名”头部 |
| `content/scenario/beats/BeatsView.tsx:171` | 非编辑态节拍卡正文 `card.text` | 卡片编号、角色/场景引用 chip、删除菜单 |
| `content/scenario/trunk/TrunkView.tsx:134` | 非编辑态主干卡正文 `node.text` | 卡片编号、删除菜单 |
| `content/planning/PlanningWorkspace.tsx:522` | materialNotes 的 `ref.note` 资料注释原文 | 资料类目、名称、角色及格式前缀 |
| `content/planning/PlanningWorkspace.tsx:804` | telling.intent 叙述正文 | 卡标题、视角/可靠度元信息、展开/细化动作 |
| `content/planning/PlanningWorkspace.tsx:830`、831、834 | reveal、withheld、作者 fact 原文 | “披露”、“暂不披露”、details summary |
| `content/planning/PlanningWorkspace.tsx:4191`、4193 | 明确“披露预览”视图中的 intent、reveal | 预览视图按钮、卡标题/视角 |
| `content/planning/PlanningWorkspace.tsx:4387`、4398、4403 | 提案 fact、intent、reveal/withheld 内容 | 标题、叙述者、可靠度、“披露/保留”前缀 |
| `content/planning/PlanningWorkspace.tsx:4657`、4661 | 章节讲述卡的 intent、reveal 预览 | 卡标题、讲述/构思类目、视角、checkbox/label |
| `content/CharactersPanel.tsx:173` | 角色 bio/personality 简介截断预览 | 年龄/职业元信息、暂无简介占位 |
| `content/ItemsPanel.tsx:183` | 物品 description 简介截断预览 | 暂无介绍占位、等级/标签 chip、操作 |
| `content/TropePanel.tsx:198`、201 | 爽点正文及 referenceCase 参考正文 | checkbox、选中状态、自定义徽标、“参考”前缀 |
| `content/level-card-parts.tsx:57`、134 | 等级/途径 description 正文 | 暂无简介占位、别名、标签、能力名、等级统计 |
| `layout/SidebarHoverCard.tsx:96` | 从真实内容提取的 blurb | 标题/类目/统计、静态帮助、空态、人物名单 |
| `chat/EntityHoverCard.tsx:222`、268、391、425 | 实体、设定、世界简介原文 | 角色/类别、等级、标签、打开按钮 |
| `chat/ComposerChipHoverCard.tsx:254`、299 | 实体/场景简介原文 | 名称、角色/类别、打开按钮 |
| `foreshadow/references.tsx:68` | `foreshadowBrief(foreshadow.content)` 正文摘要 | 伏笔标题按钮 |
| `foreshadow/references.tsx:95` | quote 或触点 summary 内容，位于 menuitem 内 | “打开引用位置”帮助、引用类目/名称、缺失状态 |
| `foreshadow/references.tsx:162` | 选中的原文 `selection.quote` | 对话框标题、搜索、选择、保存操作 |
| `foreshadow/references.tsx:171` | `t.summary` 触点摘要，位于 button 内 | “无触点摘要”占位、伏笔名、触点类别 |
| `foreshadow/references.tsx:190`、206 | detailed 触点 summary、引用 quote | 芯片、引用标题、定位说明、操作 |
| `score/ReviewCommentsSection.tsx:90` | 折叠评论 `preview`，位于 button 内 | 作者、时间、状态徽标、展开箭头 |
| `content/ReviewCard.tsx:94`、95、97、139 | issue、suggestion、excerpt、humanComment 报告/留言原文 | 维度、建议/人工附言前缀、评分/状态/时间、操作 |
| `score/ScoreReportPanel.tsx:91`、93、98、162、164、169、177、179 | 评审 issue、suggestion、excerpt、summary、detail 原文 | 维度/方面、建议前缀、分数、作者/时间、状态、操作 |

上表把只读报告的自由正文作为内容预览；结构性评审历史行、状态提示、校验错误、字段名及帮助仍按 UI 处理。不能把“来自服务端的字符串”本身作为预览判断条件。

Sidebar blurb 来源证据：`SidebarHoverCard.tsx:225` 静态帮助工厂、295/331 空态、363 主角元信息均不放行；278/302 真正简介放行。`SidebarTree.tsx:429` 角色 bio、633 前置角色 note、974 世界 description 是内容；386 人名列表、609/1192/1254 静态说明及所有 staticHoverCard 调用仍禁选。建议 `blurbIsPreview` 这类布尔语义标记由真实来源提供。

## CSS 优先级验收条件

- 变量应只在边界根重置，后代继承。不得把每个后代一律重置 none，导致内容内部普通 span 又被禁选。
- 正文 boundary 在 button/menuitem 内重建 text；正文内 button/summary/label/显式 data-text-ui 又重建 none；UI 内若有 textarea 或真正预览则可再恢复 text。
- 统一规则应同时覆盖标准和 WebKit 属性，并覆盖挂到 body 的菜单、提示、对话框等 portal。SVG/原子 chip 不扩大到内容区域。
- 原生 text input、textarea、contenteditable true/plaintext-only、显式 data-text-input 要最后保证输入策略；contenteditable false 原子 chip 仍在其自己的最近边界重置 none。
- 伪元素生成的 placeholder/帮助仍是 UI；不能随 composer 输入变量意外获得可选状态。

## 用例要求

新增测试必须覆盖上述边界的代表性组合及源码范围台账完整性；鼠标双击/拖选证明 UI 不产生选区，输入和正文实际选区、复制、键盘替换与撤销仍可用。测试至少包括：portal UI、预览内作者/按钮、button 内摘录、摘录内 UI、无模型 composer 草稿、composer 原子 chip、只读 textarea、Markdown 链接/表格/代码、伏笔 mark、plain diff 原文与符号、只读卡切换编辑、Monaco JS 选区。

静态扫描只能辅助证明标记覆盖，不能代替浏览器或 Windows Electron 行为证据。平台未执行如实记录。本审核未执行行为测试。

## 复审结论

2026-10-13 再读更新后的 `2026-10-13-text-selection-plan.md`：此前四条实施细则均已明确补齐。composer 同元素优先级、文本型 input 白名单、混合内容拆分、SidebarHoverCard 来源区分、foreshadow 显式规则和 Monaco 工具 UI 审计已纳入方案；完整节点范围以本审核表作为依据。方案审核通过，可以进入独立用例审核和 TDD。

补充清单：

| 源文件 / 行号 | text 内容 | 仍为 UI |
| --- | --- | --- |
| `src/components/chat/SearchPalette.tsx:110` | 对话搜索命中 `h.snippet` 消息片段，位于按钮内 | 消息角色、搜索标签、空态、选中/导航交互 |
| `src/components/content/scene/SceneWorkspace.tsx:67` | 场景卡片 `row.description` 简介原文 | 场景名、势力、路径、坐标、暂无介绍占位、子场景计数、引用动作 |

方案中的 `desktop/SearchPalette.tsx` 是目录笔误，实际为 `chat/SearchPalette.tsx`，实施及台账按真实路径记录。

场景卡在 67 为 draggable article，正文标记本身不一定足以允许鼠标拖选。方案补充的“先真实组件测试证明阻断，仅按下内容期间临时退出拖动、其它区域保留引用拖动”处理原则通过；用例需同时证明正文能拖选、卡片外正文区域仍能拖引用、松开/取消后恢复。若实测无阻断，则无需新增事件逻辑。

本次复审仍只确认方案，不声明已完成实现、测试或平台验收。
