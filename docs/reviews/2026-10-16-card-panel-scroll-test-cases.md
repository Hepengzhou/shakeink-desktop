# 选中抽卡卡片后底部面板遮卡修复测试用例

日期：2026-10-16（Asia/Shanghai）。前置产物：`2026-10-16-card-panel-scroll-research.md`、`2026-10-16-card-panel-scroll-plan.md`（独立方案审核通过，6 项 P2 已纳入本文档）。

范围遵守用户本次明确批准：禁止全量测试，仅针对本次修复。底座 `tests/browser/chat-empty-state.test.ts`（完整真实 ChatPanel + 真实 store + fetch 存根，Node 24 + `SHAKEINK_TEST_CHROMIUM` 真实 Chrome），新增 CES-10 系列用例。

## Fixture 布点要求（审核 P2-5，漏掉会错因红灯）

1. `f.response(id, 200, extra)` 的 extra 必须覆盖 `conversation`：`{ id, novelId: "fixture-work", modelId: null, title: "合成会话" }`——`CandidateDrawCards` 以 novelId 为门，缺省 null 组卡不渲染。
2. 消息记录走 `toMessageView`：`role` 大写 `USER/ASSISTANT`；draw 工具调用 `{ toolCallId, toolName: "drawChapterCandidates", input: null, output: { ok: true, draw: {…} } }` → `summarizeOutput` 判 done → `drawResultOf` 提取 → 组卡渲染。
3. 合成 draw：`drawId:"fixture-draw"`、`chapterId:"chapter"`、`chapterTitle:"合成章"`、`wordMin:0`、`wordBudget:0`、`failures:[]`、3 张候选 `id` 分别为 `candidate / candidate-b / candidate-c`，`variant` 分别 `alpha / beta / gamma`（thumb testid `candidate-card-alpha` 等），`label/status:"ready"/hardChecks:[]/wordCount/excerpt` 均为合成文案。
4. 点卡选中态的 `conversationId`/`novelId` 必须与加载会话一致（既有 CES 用例均用 `conversationId:null`，本系列是首个真实加载会话路径）。
5. fixture fetch 候选详情路由放宽：`:74` 字面量 `chapters/chapter/candidates/candidate` 改为按 `chapters/chapter/candidates/<任意id>` 匹配并回显该 id；**放宽后的响应不得返回 mapped `variant` 字段**（省略之，面板头行 label 恒回落 `selection.label` 即各候选合成 label）——否则头行会翻转为 VARIANT_LABELS 映射文案（如「沉浸氛围」），10c 的等待条件在修复后代码上也会超时（错因红；审核 P1）。既有用例仅用 `candidate`、断言不含 label，不受影响。
6. 填充消息：若干 `ASSISTANT` 长文消息使列表可滚动；10b 在组卡后再加填充消息（组卡非末尾）。

## 用例

### CES-10a（报告场景，红绿核心）：底部区点卡，组卡全程不被面板遮住

步骤：加载会话（填充消息 + 末尾 draw 组卡）→ 确认已落底 → `getByTestId("candidate-card-alpha").click()` → 断言面板出现即组卡完全在消息视口内（阶段一检查点：`groupRect.bottom <= listRect.bottom + 1` 且 `top >= listRect.top - 1`）→ 待 `cap-option-improve` 出现（detail 到达、面板二次增高）→ `frames()` 后再次同样断言（阶段二检查点）。

红绿预期（已按 fixture 实测修正）：fixture 的 fetch 存根返回极快，loading 态与选项加载完成态在观测上合并为一个状态（实测 dock：composer 116px → 面板 364.6px，Δ≈249 全部在可观测的第一次增高完成），因此**红灯由阶段一检查点稳定承担**（旧代码实测组卡 bottom 超出视口底缘约 284px）；阶段二检查点作为同态复核。生产环境网络较慢时两阶段分开出现，useLayoutEffect 承担换入瞬间、ResizeObserver 承担后续增量，两条路径均被本用例覆盖（增量补偿正是 fixture 中面板二次增高的主要承担者）。

### CES-10b（护栏，新旧均应通过）：视口中部历史卡完全可见时零扰动

步骤：会话中 draw 组卡后有足量填充消息 → 加载落底后 `groupEl.scrollIntoView({block:"center"})` 再额外上滚，**使组卡置于视口上三分之一处**（审核 P2-2：预检断言「组卡完全可见且四边余量 > 8px」——与 reveal 的 margin=8 不动区严格对齐；底缘余量还须大于面板全程总增高，不满足则继续上滚后复核）→ 记录 `scrollTop` → 点卡 → 待选项行加载完毕 → 断言 `|scrollTop - 记录值| <= 2` 且组卡仍完全在视口内。

红绿预期：旧代码亦通过（卡在中部本就不被遮），锁定「可见不扰动」不被修复破坏；若旧代码也红，说明几何余量不足，属用例缺陷而非产品红灯（审核 P2-2）。

### CES-10c（换卡）：选中 A 卡后再点同组 C 卡，组卡保持可见

步骤：10a 场景选中 alpha 并待选项行加载完毕 → `candidate-card-gamma` click → **待 C 卡详情返回、面板重渲染后**（等待 `cap-option-improve` 重新出现且 `已选择` 头行含 gamma 对应 label）再断言组卡完全在视口内（审核 P2-3：Playwright 点击前自动 scrollIntoView 会在旧代码下掩盖遮卡，断言时点必须定在 C 卡选项行加载完毕、阶段二增高之后）。

红绿预期（已按 fixture 实测修正）：fixture 中 C 卡详情返回后面板无进一步可观测增高（同 10a 的合并态），Playwright 点击前的自动 scrollIntoView 已把组卡带回视口，故本用例在旧代码下亦通过，定位为**换卡流程的绿侧覆盖**（证明换卡后组卡保持可见、无错误滚动）；红敏感受理由 10a 承担。断言时点仍定在 C 卡详情入缓存后（`f.client.getQueryData(["content-candidates","detail","chapter","candidate-c"])` 确定等待，避开陈旧选项行命中）。

## 断言辅助

- `listRect` = 消息滚动容器 getBoundingClientRect，获取方式：**从组卡元素向上找首个 `scrollHeight - clientHeight >= 1` 的可滚动祖先**（与 `usePreserveAnchor` 同走法），不用 `.overflow-y-auto` 全局选择器（会误中面板内 `max-h-[50vh] overflow-y-auto` 的分组容器）；`groupRect` = `[data-testid="candidate-draw-card"]` getBoundingClientRect；均经 `page.evaluate` 同帧读取。
- 「完全在视口内」：`groupRect.top >= listRect.top - 1 && groupRect.bottom <= listRect.bottom + 1`（1px 圆整容差）。

## TDD 与证据

先跑 CES-10a/10c 对旧代码确认红（失败签名 = 组卡 bottom 数值超出视口底缘数值），实现后整套（含既有 CES 用例不受 fixture 路由放宽影响）转绿。证据：`docs/evidence/card-panel-scroll/ces10-red.tap`、`ces10-green.tap`（运行全文件以证明既有用例无回归，但**不**跑其他套件）。
