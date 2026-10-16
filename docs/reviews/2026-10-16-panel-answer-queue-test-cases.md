# 抽卡选卡面板选项立即处理修复测试用例

日期：2026-10-16（Asia/Shanghai）。前置产物：`2026-10-16-panel-answer-queue-research.md`、`2026-10-16-panel-answer-queue-plan.md`（独立方案审核通过，3 项 P2 已纳入方案与本文档；本文档经独立用例审核，1 项 P1 + 4 项 P2 已落实）。

范围遵守用户本次明确批准：禁止全量测试，仅针对本次修复。底座 `tests/browser/chat-empty-state.test.ts`（完整真实 ChatPanel + 真实 store + fetch 存根，Node 24 + `SHAKEINK_TEST_CHROMIUM` 真实 Chrome），新增 CES-11 系列用例。证据按先例只跑本文件（证明既有用例无回归），不跑其他套件。

## Fixture 布点要求

1. **新增 `POST /api/chat/turns/{turnId}/interaction` 路由**（skipQuestion 的服务端跳过端点，`use-agent-chat.ts:761`），返回最小合法 TurnState：`{ turn: { id: <路径 turnId>, conversationId: <当前已加载会话 id>, latestAttemptId: "fixture-attempt", status: "succeeded", interaction: null }, attempts: [], messages: [], recovery: { latest: true, canRetry: false, canResume: false, hasEffects: false, unknownExternal: false } }`。
   - `conversationId` 必须等于当前已加载会话：`applyTurnState` 守卫（`use-agent-chat.ts:265`）要求 `conversationId === data.turn.conversationId` 且 `accountId === userId` 且非生成中，否则早退、pendingQuestion 不清空，用例会假红。fixture 在会话 GET 路由记录 `lastLoaded` 供本路由回读。
   - `status: "succeeded"` + `interaction: null`：`restoredQuestion`（`use-agent-chat.ts:108-114`）返回 null，pendingQuestion 清空。
   - `messages: []`：`turnMessages` 映射为空，`setMessages` 按 turnId 过滤不命中（CES-10 的合成消息无 turnId 字段，列表保留）。
   - 失败注入：turnId 为 `ces11-turn-fail` 时返回 `500 { error: "合成跳过失败" }`（CES-11e 的 skip 失败回落分支）。
2. **新增 `POST /api/chat/conversations/{id}/title` 存根路由**（审核 P1-1）：任何成功回合收尾都会 fire-and-forget 发起该请求（`use-agent-chat.ts:520-522` → `conversation-title.ts:17`），fixture 现有路由均不命中（`conversations` 与 sop-plan 路由都有 `$` 锚定），落入 `unexpected` 会导致 11a/11b/11c 修复后仍假红。返回 `200 { changed: false, reason: "not-default" }`（not-default 保留每会话守卫、不触发列表刷新，最干净）。**连带影响**：CES-05b/05c/06b 的既有基线失败签名即包含此未存根 title POST（`docs/evidence/card-panel-scroll/baseline-probe.txt`），加存根后三者可能转绿——实现后重新核对并更新基线记录，不机械套用旧结论。
3. 带 interaction 的待答问答布点：`f.patch({ queuePaused: true, pendingQuestion: { markerStyle: "letters", questions: [{ question, options }], interaction: { turnId: "ces11-turn", id: "ces11-ia", revision: 1, action: "answer" }, ...(drawRedraw 按需) } })`。**不需要** patch accountId（审核 P2-1 修正）：挂载恢复 effect 在 `use-agent-chat.ts:408` 即置 `accountId = userId`（"fixture-author"），严格早于 `:426` 置 `recoveryStatus: "ready"`，scenario 等待 ready 后 accountId 必已就位。
4. 会话加载布点沿用 CES-10 先例：`f.response("fixture-scroll-conv", 200, { conversation: { id, novelId: "fixture-work", modelId: null, title }, messages })` + `f.request(...)`；draw 组卡消息结构同 CES-10（`drawChapterCandidates` output `{ ok:true, draw:{ drawId, chapterId:"chapter", chapterTitle:"合成章", candidates:[...] } }`）；候选详情/章节路由 fixture 已有（`:74-75`）。
5. 模型必须显式选中（`f.choose()`），否则落入无模型入队分支（CES-05d/05e 语义）。
6. **红探针写法**（审核 P2-2）：11a/11b/11e 在旧代码下没有任何 POST 可等，「等待 /api/chat POST」会退化为 30s 超时而非断言签名。统一写法和 CES-05d/05e 一致：点击后 `frames(page)` 直接断言队列与 posts；**绿灯路径**才用 `waitForFunction(calls 含 /api/chat POST && !isGenerating)` 等回合完成。
7. **DOM 断言前等渲染提交**（审核 P2-4）：面板可见性/横幅断言前 `frames(page)` 或 `waitFor({ state: "hidden" })`（底座既有先例）。

## 用例

### CES-11a（报告场景，红绿核心）：选稿问答待答时点「继续改进这张」，先退问答再立即执行、不入队

步骤：加载会话（少量填充消息 + 末尾 draw 组卡，CES-10 布点）→ `f.choose()` → patch 带 interaction 的**同章选稿问答**（`drawRedraw: { drawId, chapterId: "chapter", chapterTitle: "合成章" }`）+ `queuePaused: true` → 点 `candidate-card-alpha` → `frames` 后断言 `candidate-action-panel` 可见且 `ask-user-panel` 不可见（覆盖生效，问答只是让位而非清除）→ 点 `cap-option-improve` → 绿灯路径等 `/api/chat` POST 完成且 `!isGenerating`。

断言：

1. 调用序列中 `POST /api/chat/turns/ces11-turn/interaction`（body `{ id: "ces11-ia", revision: 1, action: "skip" }`）**先于** `POST /api/chat`（先退问答再执行；`f.calls` 按序记录）。
2. `POST /api/chat` 的 `body.message` 含 `为基础改进，再抽 3 份候选` 且含 `chapterId: chapter，candidateId: candidate`；`body.interaction` 为 undefined（skip 后不带问答载荷——防假绿：skip 未生效时 send 会把旧问答 interaction 附上去，`use-agent-chat.ts:487`）。
3. 终态：`queuedMessages` 为空（**未入队**）、`pendingQuestion` 为 null（问答关闭）、`selection` 为 null（选卡面板关闭）。
4. DOM（frames 后）：`candidate-action-panel` 与 `ask-user-panel` 均不可见；无「排队消息等待确认」横幅。

红绿预期：旧代码入队（queuedMessages 长度 1、无任何相关 POST、面板保留）→ 红；修复后全绿。

### CES-11b（泛化）：内容面板类外部消息遇无关待答问答，同样先退问答再立即执行

步骤：加载会话（空消息）→ `f.choose()` → patch 带 interaction 的**普通待答问答**（无 drawRedraw，与候选无关）+ `queuePaused: true` → `f.external("以《合成章》候选稿 合成角度甲（chapterId: chapter，candidateId: candidate）为基础改进，再抽 3 份候选。我的意见：（无具体意见，按三个改进方向各自判断）", "fixture-work")`（即 CandidatePanel/评分卡「按意见改进」经 chat:send-message 的同一入口）→ 绿灯路径等回合完成。

断言：`interaction` skip POST 先于 `/api/chat` POST；`body.message` 与外部文本逐字一致；终态 `queuedMessages` 空、`pendingQuestion` null；frames 后 `ask-user-panel` 不可见。

红绿预期：旧代码入队 → 红；修复后绿。与 11a 合证「任何一个问答工具面板的有效选项」统一入口语义。

### CES-11c（护栏，新旧均应通过）：AskUserPanel 直答仍直发并附 interaction，不走 skip

步骤：空会话状态 → `f.choose()` → patch 带 interaction 的普通待答问答（无 drawRedraw、无 queuePaused）→ `ask-user-panel` 可见 → 点 `ask-option-0-0`（单问题点击即提交）→ 等回合完成。

断言：`POST /api/chat` 的 `body.interaction` 深等于 `{ turnId, id, revision, action: "answer" }`（回答通道原样附着）；`body.message` 为 `【回答问题】…\n我的回答：…` 格式；**无** interaction skip POST；`queuedMessages` 空；`pendingQuestion` null。

红绿预期：新旧均绿；锁定修复不误伤问答面板的正式回答路径（answer 通道不经 `handleSendCardMessage`）。

### CES-11d（边界护栏，新旧均应通过）：生成中选卡选项仍入队（§2.5 已批准排队设计）

步骤：加载会话 + draw 组卡 → `f.choose()` → 点 `candidate-card-alpha` 待 `cap-option-improve` 出现 → `f.patch({ isGenerating: true })` → 点 `cap-option-improve` → `frames`。

断言：`queuedMessages` 长度 1 且文本含 `为基础改进`；无 `/api/chat` POST；`candidate-action-panel` 仍可见（入队保留选中态语义）。

红绿预期：新旧均绿；锁定「生成中豁免立即处理」边界不被本次修复误改（方案审核 P2-2：豁免依据为 §2.5 已批准排队设计，验收总结显式记录；仅锁正常收尾自动排空场景）。

### CES-11e（回落护栏，红绿核心）：skip 失败（500）时消息入队保留、问答保留、不静默丢失（方案 P2-3）

步骤：同 11a 布点，但 pendingQuestion 的 interaction.turnId 用 **`ces11-turn-fail`**（fixture 返回 500）→ 点 `cap-option-improve` → `frames` → `waitForFunction` 等 interaction POST 记录（绿灯确定性优先；旧代码下红签名为该等待的 30s 超时，已在 red tap 实际捕获，属与本文档第 6 条 frames 直断约定的知情偏差，code review P2-2 已记录）→ `frames` 后断言。

断言：`POST .../interaction` 已尝试（证明非 action 消息也走 skip 优先）；**无** `/api/chat` POST；`queuedMessages` 长度 1 且文本含 `为基础改进`（回落入队，消息不丢）；`pendingQuestion` 保留（问答未被误清）；`candidate-action-panel` 仍可见。

红绿预期：旧代码不尝试 skip 直接入队（无 interaction POST）→ 红；修复后绿。try/catch 的网络 reject 分支与 500 的 !ok 分支在 handleSendCardMessage 汇入同一回落入队分支，本例锁定该汇合语义。

## 覆盖面豁免清单（审核 P2-3：同一修复点，不单设例）

以下触发点全部汇入同一 `dispatchChatSendMessage → handleSendCardMessage` 修复点，由 11a/11b/11e 覆盖机制本体，不再单设用例：「根据要求改进」行内输入（`CandidateActionPanel.tsx:157-166` submitInput）、修复区各行（fix/adopt-adjust 消息类）、内容区 CandidatePanel 按钮（`CandidatePanel.tsx:122,154`）、candidate-accept 采用后推进/换用过渡检查（`candidate-accept.ts:107,113`）、ScoreHoverCard/ScoreReportPanel 按意见改进、换一批 else 分支（`CandidateDrawCard.tsx:173-175`；其命中本章选稿问答的 answer:true 分支由 11c 同路径覆盖）。

## TDD 与证据

先跑 CES-11a/11b/11e 对旧代码确认红（失败签名分别为：11a/11b 队列断言失败且无 POST；11e 无 interaction POST），实现后跑全文件（证明既有用例无回归、fixture 新增路由无副作用）转绿，并核对 CES-05b/05c/06b 是否因 title 存根转绿以更新基线记录。证据：`docs/evidence/panel-answer-queue/ces11-red.tap`、`ces11-green.tap`。
