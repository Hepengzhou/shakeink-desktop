# UI 文字禁选：content / score 独立代码审核

日期：2026-10-13（Asia/Shanghai）。审核者：子代理 `selection_chat_impl`。

审核输入为 `2026-10-13-text-selection-plan-review.md` 的完整节点清单、方案/用例文档，以及 `git diff -- src/components/content src/components/score` 和真实源码。原实施者为 `selection_audit`；审核者未审核自己实施的 chat/layout/admin/foreshadow 修改。初始审核范围包含 17 个修改文件。发现清单外遗漏后，主代理明确授权本审核者修复下述 6 个文件，最终本目录范围涉及 21 个修改文件；这些新增修复另由主代理或另一独立代理复核，本文不将其称为独立通过。

## 初始审核结论与发现

既定方案清单中的 content/score 原文节点已标记，未发现扩大到整面板、混入字段前缀/评分/作者/时间/空态的放行。初始扫描发现了清单外的真实预览遗漏，原状态不能满足所有输入/预览文字保留可选的目标。

| 发现 | 原源码证据 | 所需边界 / 当前处理 |
| --- | --- | --- |
| 情景聊天旧格式正文及导演指示被禁选 | `scenario/chat/ChatView.tsx:288/293/444/445/446/461/462`；`TurnBlock` 在 `turn.flow.length === 0` 时渲染旧旁白和 beat；direction 为导演输入的回放 | 已修复：direction、think 仅原文 span；旁白、say、act 标记正文节点；“旁白指示”、“内心”及角色/情绪/回合元信息保持 UI |
| 章纲列表中的摘要被禁选 | `OutlinePanel.tsx:181/182` 的 `chapter.outline`，位于章导航 button 内 | 已修复：只放行 outline span，章名/状态/导航按钮仍为 UI |
| 属性定义简介被禁选 | `AttributesPanel.tsx:248/249` 的 `d.description || "暂无介绍"` | 已修复：有真实 description 时才加 preview，名称/类型/适用对象/可选值及空态不放行 |
| 角色弧线简介、因果正文被禁选 | `character-arc/arc-chain.tsx:143/260/273`；`src/lib/arc-stage.ts:411` 的 summarizeStage 取描述首个非空行 | 已修复：brief 原文 span 与因果 dd 放行；brief 的“压力/选择/代价”前缀单独保留 UI，因果 dt、空态、markers chip、阶段名称/依据导航仍为 UI |
| 卷简介混在章数统计中被禁选 | `planning/PlanningWorkspace.tsx:1282` 的 `章 · v.summary` | 已修复：拆分 summary span，数字、“章”及分隔符仍为 UI |
| 改进对话框意见、建议、引用被禁选 | `score/ImproveContentDialog.tsx:177/180/183`；`src/lib/improve-draw.ts:14/24/54` 区分正文与 dimension 统计摘要 | 已修复：非 dimension 的 row.text、suggestion 原文、quote 放行；dimension 的分数/意见数摘要、row.label、“建议”前缀、checkbox 及操作保持 UI |

上述遗漏均已在修复前通过直接源码读取得到证据，已即时通知主代理。本文的修复后复查仅确认这些新边界与原文/前缀/空态的分割一致，不能替代另一审核者对新增修改的独立审核。

## 原 17 个修改文件的独立节点检查

| 文件 / 内容组 | 检查结果 |
| --- | --- |
| `CascadePanel.tsx` | 修订前/后仅存在原文时放行；“修订前/后”和“（空）”保留 UI |
| `ChapterHistory.tsx` | 两个差异视图的 part.text 独立 span；增加/移除符号、统计、相同版本提示、恢复说明和 summary 不放行 |
| `CharacterPanel.tsx`、`SettingPanel.tsx` | 生成草稿/assistText 放行实际正文 div；对话框说明和采用/返回操作在外 |
| `CharactersPanel.tsx`、`ItemsPanel.tsx` | 真实 bio/personality/description 放行；暂无简介/介绍、年龄/职业、名称、等级/标签和删除操作在外 |
| `ReviewCard.tsx` | issue、suggestion 原文、excerpt、humanComment 放行；建议/人工附言前缀、aspect、状态、时间、评分和操作在外 |
| `SubAgentPanel.tsx` | Judge/Reader/Character/Editor/Playwright/Writer/Scenario 回放的清单正文均覆盖；建议前缀、维度/目标节点、风险/方向标题、章节标题/数量、字数/summary 与完整正文导航说明在外；Writer 添加的省略号在 preview span 外 |
| `TropePanel.tsx` | item.content、referenceCase 原文放行；“参考”前缀、checkbox、选中态、自定义徽标、删除按钮在外 |
| `level-card-parts.tsx` | 等级/途径的真实 description 放行；trim 后为空的暂无简介不放行；别名、标签、能力名、等级统计不放行 |
| `planning/PlanningWorkspace.tsx` | 资料 note、telling intent、reveal/withheld/fact、披露视图、提案和章节讲述卡正文均覆盖；资料类目/名称/角色、披露/保留前缀、叙述者/可靠度、标题和操作在外 |
| `scenario/beats/BeatsView.tsx`、`scenario/trunk/TrunkView.tsx` | 非编辑态 card.text/node.text 放行；编辑态原 textarea 保留；卡编号、回合、引用 chip、菜单在外；双击编辑原事件未改 |
| `scenario/chat/ChatView.tsx` | 原实施的 flow 旁白/台词/行为/内心原文覆盖；内心字段前缀、角色名、情绪和头像在外；旧格式/导演指示遗漏见上表修复记录 |
| `scene/SceneWorkspace.tsx` | 仅真实 description 放行；暂无介绍、名称、势力、路径、坐标、子场景数和引用操作不放行 |
| `score/ReviewCommentsSection.tsx` | 折叠评论的首句原文在 button 内重建 preview；作者、时间、状态徽标和箭头在外 |
| `score/ScoreReportPanel.tsx` | 逐维/旧格式 issue/suggestion/excerpt、reader summary/detail 均覆盖；建议/冒号前缀、维度/aspect、评分、姓名/时间/回放动作在外；无意见空态及结构性历史摘要保持 UI |

## 交互风险与验证要求

读取真实父卡后确认，原文节点位于既有整卡交互中：

- `SceneWorkspace.tsx:67`：article draggable，onDragStart 只排除 button，description 位于卡内。
- `CharactersPanel.tsx:132/135` 与 `ItemsPanel.tsx:143/146`：整卡 draggable + startChipDrag，简介位于卡内。
- `LevelSystemEditor.tsx:271/273/336/369`：等级卡共用 dragProps，LevelCardBody description 位于其内；PathwayCard 无 native draggable。
- 章纲、折叠评论、爽点、弧线及披露等预览还可能位于整卡点击打开/勾选操作内。标记本身不能保证鼠标拖选后父卡不会导航或改变选择。

已向主代理报告上述源码证据。主代理通知实际专项测试已复现，正在由主代理实现共享 preview 事件边界；该共享模块及挂载不属于本文独立审核范围。必须以真实组件验证内容可拖选、mouseup/cancel 后恢复卡片拖动、非正文区域仍可拖引用或打开、真正内层控件/链接保持动作；不能只看 computedStyle 或 presence 标记。

## 执行证据与最终状态

- 执行 `git diff --check -- src/components/content src/components/score`：退出码 0，无输出。
- 用本地 TypeScript `createSourceFile(..., ScriptKind.TSX)` 解析新增修复的 6 个文件：输出 `TSX parser check passed: 6 repaired components`，退出码 0。
- 读取 `git diff --stat -- src/components/content src/components/score`：21 个修改文件，83 insertions / 77 deletions（此计数为本文记录时快照，共享工作区的后续修改可改变计数）。

原 17 个文件的既定标记静态独立审核通过；初次发现的清单外遗漏已修复，新增修复已逐项自查，但须另一次独立复核。完整浏览器、Electron、类型检查/构建结果以主代理实际验收为准。本文不声明已通过真实行为或平台验收，不读取真实用户资料/Key，不调用模型供应商。
