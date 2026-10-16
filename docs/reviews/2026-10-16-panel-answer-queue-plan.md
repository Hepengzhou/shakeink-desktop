# 抽卡选卡面板选项立即处理修复技术方案

日期：2026-10-16（Asia/Shanghai）。前置产物：`2026-10-16-panel-answer-queue-research.md`（根因：`handleSendCardMessage` 对带待答问答的面板选项一律入队，被 queuePaused+pendingQuestion 双闸门永久锁死）。

## 实现（核心改动唯一文件 `src/components/layout/ChatPanel.tsx`）

`handleSendCardMessage`（1411-1438 行）把「有待答问答先退出再立即执行」从仅 action 消息推广到所有经 `chat:send-message` 进入的面板选项消息：

```ts
const handleSendCardMessage = useCallback(async (text: string, action?: ChatAction) => {
  let state = useChatStore.getState()
  if (!hasSelectedModel(state.modelChoice.modelId, queryClient.getQueryData<ModelsResponse>(["chat-models"]))) {
    // …保持不变：未选模型 → 入队 + queuePaused + toast，无任何副作用（CES-05d/05e 锁定）…
    return
  }
  // 变化点：条件从 `action && state.pendingQuestion` 放宽为 `state.pendingQuestion`；
  // skip 调用套 try/catch：网络异常（非 response.ok 的 reject）时按 skip 失败同语义回落入队分支，
  // 不让异常经 void onSend 成为未处理拒绝、消息既未入队也未发送（审核 P2-3）
  if (state.pendingQuestion) {
    try { await skipQuestion() } catch { /* 回落入队分支 */ }
    state = useChatStore.getState()
  }
  if (state.pendingQuestion || state.pendingPlan || state.isGenerating || state.recoveryStatus !== "ready" || state.creatingNovel) {
    // …入队分支保持不变（skip 失败/生成中/待批准计划/恢复未就绪/创建中）…
    return
  }
  if (action) useChatStore.setState({ draftAction: action })
  useCardSelection.getState().clearCard()   // 立即发送即关闭选卡面板（既有逻辑）
  await sendText(text)
  // …draftAction 兜底清除保持不变…
}, [sendText, skipQuestion, queryClient])
```

逐点说明：

1. **只改一个条件**：`if (action && state.pendingQuestion)` → `if (state.pendingQuestion)`。skip-then-send 的机制本体（`await skipQuestion()` → 重读 state → 落入既有直发分支）一行不动，复用 1406-1421 行已批准的 action 路径先例。
2. **为什么覆盖全部调用方是对的**：`chat:send-message` 的非 answer 消息全部来自问答/选卡语境的面板选项或动作跟进（调研影响面表）：选卡面板改进/修复/其他、内容区候选面板改进/推进、采用后推进/换用过渡检查、评分卡按意见改进、换一批未命中 answer 分支。语义依据是 ImproveContentDialog 带 action 消息的既有批准先例（`ChatPanel.tsx:1419-1421`：skip 任意 pendingQuestion 再立即执行）——即便个别调用方（采用后推进、评分卡改进）触发时待答问答与用户动作无关，skip 该问答也是先例语义的一致推广，而不是为本修复新创的行为；`answer:true` 的正式回答路径不经过此函数，不受影响（审核 P2-1 措辞修正）。
3. **面板关闭时序**：skipQuestion 使 `pendingQuestion` 清空（AskUserPanel 退去）；直发分支既有 `clearCard()` 使选卡操作面板关闭回输入框——满足「立刻关闭此次的问答工具面板」。
4. **skip 而非 answer**：面板消息（改进/推进/过渡检查等）不是问答选项文本，附 interaction 会把无关问答误标为「已回答」并篡改历史摘要；skip 与面板 Esc 取消同语义，且是既有批准先例。skip 失败时 `pendingQuestion` 保留、消息回落入队、错误已 toast，不静默丢失。
5. **顺序不变**：模型可用性检查仍在最前（未选模型时不动问答、不动选中态、不入队语义外副作用），CES-05d/05e 继续通过。

## 注释同步（随实现一并更新，不改行为）

- `ChatPanel.tsx:1403-1410` `handleSendCardMessage` 文档注释：改写为「面板选项消息先退出待答问答再立即执行」的新语义（删除「有待答问题时普通消息也进队列」旧约定）。
- `CandidateActionPanel.tsx:7-8` 头部注释与 `120-124` sendMessage 注释：待答问答不再构成入队理由，忙碌态仅余生成中/待批准计划/恢复未就绪等。
- `CandidateDrawCard.tsx:103-104` 换一批注释：未命中 answer 分支时，待答问答由发送入口先退出再立即执行；生成中仍排队。

## 备选方案排除

- **面板侧逐点修复（给 dispatchChatSendMessage 加 immediate 标记、各面板分别传）**：入口分散、未来新面板易漏；统一入口一次修复全覆盖，且与 action 先例同处。
- **附 interaction 当自由文本回答直发**：对同章选稿问答可行，但对无关待答问答（内容区面板可达）会伪造回答历史；skip 语义统一且诚实。
- **生成中也停流直发**：违背 §2.5 已批准排队设计；生成中无待答问答面板，非本 bug 场景。

## 边界核对

- 生成中/待批准计划/恢复未就绪/创建中/未选模型：维持既有排队或保留行为（调研「边界」节逐条）。生成中入队仅在回合**正常收尾**（不再挂新待答问答/计划）时保证自动排空；若回合以新选稿问答收尾，队首会再次等在新问答之后——面板可见、用户处置新问答后即排空，属可恢复等待而非静默死锁（审核 P2-2）。CES-11d 只锁定正常收尾场景；「生成中豁免立即处理」的依据是 §2.5 已批准排队设计，验收总结中将显式记录。
- 旧会话遗留的已入队消息：不迁移；问答退去后 queuePaused 解除即自动按序发送，或横幅「确认后继续队列」手动放行（既有恢复路径）。
- 快速连点同一选项：两次 dispatch 先后到达，第一次 skip+直发，第二次落入生成中入队（与旧代码双次入队等价，均为重复请求；属既有面板未防抖的遗留小问题，不在本次范围）。
- skipQuestion 网络异常（reject 而非 !ok）：try/catch 回落入队分支（审核 P2-3），与 skip 失败降级一致，消息不丢失。

## 测试（遵守用户批准：仅针对本次修复，不跑全量）

底座 `tests/browser/chat-empty-state.test.ts`（完整真实 ChatPanel fixture），新增 CES-11 系列；fixture 需新增 `/api/chat/turns/{turnId}/interaction` POST 存根路由（返回使 `applyTurnState` 清空 pendingQuestion 的 TurnState：turn.conversationId 取当前已加载会话、status 非 waiting_user）。用例详见测试用例文档：CES-11a（报告场景红绿核心）/11b（内容面板类外部消息泛化）/11c（AskUserPanel 直答护栏）/11d（生成中入队边界护栏）。既有用例零改动，fixture 仅新增路由不影响旧断言。
