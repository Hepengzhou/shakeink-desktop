# 选中抽卡卡片后底部面板遮卡问题调研

日期：2026-10-16（Asia/Shanghai）。

问题报告：选择一个卡片后，底部 composer 槽位切换为选卡操作面板，面板选项内容使其高度变大，但 AI 对话滚动位置未做相应调整，抽卡组卡被面板遮住。

## 结论（根因）

**底部槽位（dock）与消息列表是同一纵列 flex 的兄弟节点：dock 变高 → 消息列表视口（`scrollRef`，flex-1）clientHeight 同步变小，而 scrollTop 不变，视口底缘向上抬，原来贴着底部的抽卡组卡被截进 dock 下方。**

证据链：

1. 布局：`ChatPanel.tsx:1790-1795` 消息滚动区 `min-h-0 flex-1 overflow-y-auto`；`ChatPanel.tsx:1854-1860` 底部 dock `shrink-0`，槽位三选一（`ChatPanel.tsx:1953-1961`）：`showAskPanel ? AskUserPanel : showCardPanel ? CandidateActionPanel : composer 输入框`。
2. 点卡后 `useCardSelection.selectCard` 使 `showCardPanel` 为真（`ChatPanel.tsx:962-966`），`CandidateActionPanel`（`CandidateActionPanel.tsx:190-317`）替换较矮的 composer。面板含头行/检查警示/分组选项（`max-h-[50vh]`）/脚注，实测比 composer 高 200~400px；且 `detailQuery/chapterQuery` 异步返回前只渲染「正在读取候选状态…」，分组到达后**再增高一次**——遮卡分两个阶段发生。
3. 滚动现状：scrollTop 无任何补偿逻辑。`nearBottomRef`（`ChatPanel.tsx:1172-1179`，距底 ≤160px 视为在底）只用于新消息落底与悬浮钮；`usePreserveAnchor`（`ChatPanel.tsx:168-196`）只服务展开/收起过渡；均不覆盖 dock 高度变化。
4. 典型场景：抽卡组卡是最新消息、用户在列表底部。点卡 → dock 增高 Δ → 组卡底部 Δ 被遮住（组卡约 250px，Δ 可达 270px 以上 → 整卡被遮，与截图一致）。
5. 次要场景：用户上翻点历史组卡（卡在视口中部）。dock 增高时 scrollTop 不变、视口底缘上抬 Δ；中部的卡位置不变仍可见——此场景**不应**补偿，补偿反而扰动阅读位置。

## 目标行为

- 选中/换卡当下（同一提交内 composer→面板切换）：若选中卡所在组卡不在消息视口内，**最小位移**滚回视口（nearest 语义，双向）；已完全可见则零位移。
- 面板随后异步增高的每个阶段：用户处于底部区（nearBottom）时按 dock 高度增量 Δ 补偿 scrollTop，保持视口底缘锚定（组卡持续可见）；用户已上翻阅读时不补偿，保护阅读位置。
- 面板关闭/收缩：视口变高，无内容被遮，浏览器原生 scrollTop 钳制即可，不额外处理。
- 选中来自内容区候选面板（对话区无对应组卡 DOM）时：找不到目标即静默跳过。
- 全程瞬时位移（直接写 scrollTop，useLayoutEffect/ResizeObserver 回调均在绘制前执行），无动画、无可见跳动。

## 现有测试底座

`tests/browser/chat-empty-state.test.ts` 的 fixture 挂载**完整真实 ChatPanel**（含 useAgentChat、真实 fetch 存根、真实 store），已支持 `f.response/f.request` 加载合成会话消息、`f.select` 写选中态，CES-05e 已在该底座跑通过选卡操作面板。消息记录经 `toMessageView`（`use-agent-chat.ts:161-188`）映射：role 大写、toolCalls 数组；draw 工具调用 output 形如 `{ ok:true, draw:{ drawId, chapterId, chapterTitle, wordMin, wordBudget, candidates:[...], failures:[] } }`（`drawResultOf`，`draw-redraw.ts:10-18`）即被 `CandidateDrawCards` 渲染为组卡。选中卡 DOM 可由 `[data-testid^="candidate-card-"][aria-pressed="true"]` 精确定位（`CandidateDrawCard.tsx:289-291`），所属组卡为 `[data-testid="candidate-draw-card"]`。

## 相关文件

- `src/components/layout/ChatPanel.tsx`（修复对象：dock ref + 选中卡锚定逻辑）
- `src/components/chat/CandidateActionPanel.tsx`（面板本体，无需修改）
- `src/components/chat/use-card-selection.ts`（选中态 store，无需修改）
- `tests/browser/chat-empty-state.test.ts`（测试底座，新增用例）
