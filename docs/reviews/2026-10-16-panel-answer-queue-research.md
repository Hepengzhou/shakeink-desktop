# 抽卡选卡面板选项被放入消息队列问题调研

日期：2026-10-16（Asia/Shanghai）。

问题报告：正文抽卡卡片出现后，选中其中一张卡片，点击「继续改进这张」或其他选项时，AI 没有立刻处理，而是把该选项对应的消息加入了发送队列（界面出现「排队消息等待确认，尚未发送」与「队列 (1)」，消息卡死不动）。

约束：在任何情况下，当用户在任何一个 AI 对话中的问答工具面板中选择了任何一个有效选项时，应当立刻关闭此次的问答工具面板，然后立刻处理用户的回答，不应有任何等待，更不应放入消息队列。

## 结论（根因）

**选卡操作面板的发消息类选项（继续改进/根据要求改进/修复/其他）经 `chat:send-message` 统一入口发送时，`handleSendCardMessage` 只要看到 `pendingQuestion` 非空就一律入队；而抽卡回合结束时正是带着「选稿问答」待答问题收尾的（`queuePaused` 同时被置真），入队消息被 `queuePaused || pendingQuestion` 双重闸门锁死，永远不会被自动发出，队列横幅的「确认后继续队列」按钮也因 `pendingQuestion` 存在而不渲染——消息永久卡死。**

证据链：

1. **回合结束态**：抽卡 + askUserQuestion 选稿问答后，回合以 `waiting_user` 结束，`use-agent-chat.ts:516-518` 的 `finish()` 置 `pendingQuestion`（带 `drawRedraw` 定位）且 `queuePaused: !!pendingQuestion` = true。
2. **槽位覆盖**：用户点击候选卡 → `useCardSelection.selectCard`（`CandidateDrawCard.tsx:90-97`）→ `selectionOverridesAsk` 命中（`ChatPanel.tsx:955-961`，要求 `pendingQuestion.drawRedraw.chapterId === 选中卡 chapterId`）→ composer 槽位渲染 `CandidateActionPanel`，AskUserPanel 隐藏但 **`pendingQuestion` 状态仍在**（`ChatPanel.tsx:1994-2001`）。
3. **选项发送路径**：「继续改进这张」等行 `runRow`（`CandidateActionPanel.tsx:127-133`）→ `sendMessage` → `dispatchChatSendMessage(text, novelId)`（**不带 `answer` 也不带 `action`**，`ui-events.ts:21-29`）。
4. **入队分支**：`ChatPanel.tsx:1411-1431` `handleSendCardMessage`：无 `action` 时不做 skipQuestion；`state.pendingQuestion` 非空 → `enqueueMessage` + toast「已加入发送队列，当前轮结束后自动发送」。
5. **死锁**：队列自动按序发送 effect（`ChatPanel.tsx:1337-1350`）首行即 `if (isGenerating || queuePaused || pendingQuestion || pendingPlan) return`——`queuePaused` 与 `pendingQuestion` 双双为真，永不触发；队列横幅（`ChatPanel.tsx:1984-1987`）的「确认后继续队列」按钮要求 `!pendingQuestion`，同样不渲染。截图中的「排队消息等待确认，尚未发送」+「队列 (1)」即此状态。
6. **注释自证**：`CandidateActionPanel.tsx:120-124` 「发消息类动作：入队（生成中/待答问答等）时面板保留」；`ChatPanel.tsx:1404-1405` 「有待答问题时普通消息也进队列……普通通知直发会意外『答掉』不相关的待答问题」——这是当初为「普通通知」设计的防御，但把「问答面板的选项回答」也一并误伤。

## 影响面（同一入口的全部调用方盘点）

`chat:send-message` 事件全部由 `ChatPanel.tsx:1443-1468` 的 `onSend` 消费：`answer:true` 走 `sendText` 直发（send 内部自动附 `pendingQuestion.interaction` 并退去问答面板，`use-agent-chat.ts:487/498`）；其余进 `handleSendCardMessage`。

| 调用方 | 语义 | 待答问答下现状 |
|---|---|---|
| `AskUserPanel` 提交（`handleAnswerQuestion`，`ChatPanel.tsx:1397-1401`） | 问答面板正式回答 | 直发，**本就合规** |
| `pending-answer.ts` `dispatchPendingAnswer`（answer:true） | 采用命中待答选项 | 直发，合规 |
| `CandidateDrawCard` 换一批（`CandidateDrawCard.tsx:169-177`） | 命中本章选稿问答走 answer:true 直发；否则普通消息 | 未命中时**入队卡死** |
| `CandidateActionPanel` 改进/修复/其他（`CandidateActionPanel.tsx:121-122`） | **问答工具面板的有效选项** | **入队卡死（本 bug）** |
| `CandidatePanel` 以此为基础改进/推进（`CandidatePanel.tsx:122,154-157`） | 同上（内容区面板） | asAnswer 命中时直发；否则**入队卡死** |
| `candidate-accept.ts` 采用后推进/换用过渡检查（`candidate-accept.ts:106-114`） | 采用动作后的跟进通知 | 有待答问答时**入队卡死** |
| `ScoreHoverCard`/`ScoreReportPanel` 按意见改进（候选） | 同改进语义 | **入队卡死** |
| `ImproveContentDialog`（带 `action`） | 正文改进对话框 | **已合规**：`ChatPanel.tsx:1419-1421` 先 `skipQuestion()` 再立即执行 |

关键事实：`selectionOverridesAsk` 要求 `pendingQuestion.drawRedraw.chapterId === 选中卡 chapterId`，即**能与选卡操作面板共存的待答问答只有同章选稿问答**；面板选项就是用户对该问答的处置决定，入队在任何语义下都不成立。

## 既有先例（修复应遵循的语义）

`handleSendCardMessage` 对带 `action` 的消息（正文改进对话框）已实现正确语义（`ChatPanel.tsx:1406-1421`）：有待答问答时先 `skipQuestion()`（等同面板 Esc 取消，POST `/api/chat/turns/{turnId}/interaction` `{action:"skip"}`），再立即 `sendText` 执行，「不让改进任务排队等待旧问题」。本次修复把同一语义从「仅 action 消息」推广到「所有问答/选卡面板选项消息」。

`skipQuestion`（`use-agent-chat.ts:757-764`）：无 interaction 时本地清除；有 interaction 时 POST skip 并 `applyTurnState`（`use-agent-chat.ts:264-276`，`restoredQuestion` 只在 `waiting_user + pending question` 时返回非空，skip 后自然清空）。

## 边界（不在本次修复内，保持既有批准设计）

- **生成中（isGenerating）**：面板选项仍入队（§2.5 排队设计：当前轮流结束后自动按序发送，队列行有「立即发送」可手动抢发）。生成中没有待答问答面板，`send` 起始即清 `pendingQuestion`（`use-agent-chat.ts:498`），两者不共存；入队会随回合正常结束自动排空，不属于「卡死」。
- **待批准计划（pendingPlan）**：与既有 action 路径一致，仍入队（计划批准是独立闸门，不由选卡选项代为跳过）。
- **恢复未就绪/创建作品中**：`send` 本身会拒收（`use-agent-chat.ts:462`），入队保留是唯一不丢消息的选择。
- **未选可用模型**：保留既有「入队 + queuePaused + toast」行为（CES-05d/05e 锁定），模型检查必须先于一切副作用。
- skipQuestion 失败（服务端状态已变化）：toast 已提示，此时 `pendingQuestion` 仍在，消息回落入队分支——不静默丢失，属可接受降级。

## 相关文件

- `src/components/layout/ChatPanel.tsx`（修复对象：`handleSendCardMessage` 1403-1438 行）
- `src/components/chat/CandidateActionPanel.tsx`（面板本体；仅注释与实现同步）
- `src/components/chat/CandidateDrawCard.tsx`（换一批注释与实现同步）
- `src/components/chat/use-agent-chat.ts`（skipQuestion/finish，无需修改）
- `tests/browser/chat-empty-state.test.ts`（测试底座：完整真实 ChatPanel fixture，新增 CES-11 系列；fixture 需补 `/api/chat/turns/{id}/interaction` 路由）
