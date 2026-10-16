# 正文抽卡卡片点击失效调研

日期：2026-10-16（Asia/Shanghai）。

问题报告：鼠标点击正文抽卡卡片经常无效，尤其是点卡片中间区域时大概率没有任何效果。约束：鼠标点击卡片中任何位置时，此卡片应立刻变为被选中状态，不应有任何延迟。

## 结论（根因）

**`src/lib/desktop/text-selection.ts` 的 `installTextPreviewSelection` 在 document 捕获阶段无条件吞掉落在 `[data-text-preview]` 上的 click/dblclick**，导致抽卡卡片中部摘录区（`<p data-text-preview>`，`CandidateDrawCard.tsx:310`）上的单击永远无法到达卡片的 React `onClick`。

证据链：

1. 抽卡候选卡整体是一个 `<button onClick={onOpen}>`（`src/components/chat/CandidateDrawCard.tsx:286-296`），`onOpen` 同时打开候选全文 Tab 并写入选中态（`openCandidateTab`，`CandidateDrawCard.tsx:81-98` → `useCardSelection.selectCard`）。卡片本体没有延迟逻辑，两个 zustand 写入均为同步。
2. `text-selection.ts:41-42` 在 document 上以**捕获阶段**注册 `click`/`dblclick`；`click` 处理器（`text-selection.ts:31-38`）命中「preview 且其祖先可交互/可拖」时执行 `event.stopPropagation()` + `event.preventDefault()`。捕获阶段在 document 上 stopPropagation，事件根本到不了 React 根容器，卡片 `onClick` 不会触发。
3. 命中判定 `previewAt`（`text-selection.ts:8-14`）：目标是摘录 `<p>` 时，`target.closest(controls)` 找到的是外层 `<button>`，而 `preview.contains(control)` 为 false（button 在外不在内），故返回该 preview——摘录区**每一次**单击都被吞，不是偶发逻辑。
4. 与「中间区域大概率无效」完全吻合：卡片顶部徽标行（`CandidateDrawCard.tsx:297-309`）与底部字数行（`WordCountLine`，`CandidateDrawCard.tsx:71-77`）不是 preview，点击正常；中部摘录 `<p>` 带 `line-clamp-4 min-h-[6.2em]`，是卡片最大的一块命中区域（含文字下方留白），点击这里必失效。用户感到「经常」无效，是因为中部面积占比最大。

## 该拦截的来历（为什么是现在的写法）

2026-10-13 批准的 UI 文字禁选方案（`docs/reviews/2026-10-13-text-selection-plan.md` 第 23 行「行为红灯补充」）发现：真实候选按钮在**拖选/双击摘录**时会误触发开 Tab，Scene/Characters/Items/Level 卡的 draggable 阻断拖选。因此新增 `installTextPreviewSelection`，意图是**仅隔离文本选取手势产生的 click/dblclick**，保留卡片正常动作。

实现把「隔离」做成了无条件拦截：凡是 preview 上的 click/dblclick 一律 stopPropagation。拖选和双击被正确隔离了，但**普通单击也被一并杀死**——这是当时的过度纠正，即本次 bug。

现行行为由 `tests/browser/text-selection-cards.test.ts` 锁定，其中以下断言正是旧规则的产物，修复后必须按新规则更新：

- `doubleClickText` 系列（5 类卡片 × 2 主题）：断言双击 preview 后 `active === null`（不开 Tab）。
- 「preview press suspends draggable and mouseup restores it」（4 类可拖卡）：无位移按下+松开后断言 `active === null`。
- planning/checkbox/label 三个合成边界用例：断言 preview 上的抬起点击/双击不触发外层动作（计数为 0）。

## 新约束与旧规则的冲突点

用户本次约束（2026-10-16）：点击卡片任何位置立刻选中，**不应有任何延迟**。按 `AGENTS.md`「同一要求历次修改以后者为准」，新约束优先。

冲突分析：

- 区分「单击」与「双击的第一次击键」唯一可靠办法是等待系统双击间隔内是否有第二击——这必然引入延迟，被新约束明确禁止。因此**双击摘录将必然触发一次卡片动作**（由序列中第一次 click 触发），旧规则中「双击 preview 不开 Tab」的断言无法保留，须按新行为改写；词选区本身由原生 mousedown 行为完成，不受影响。
- 「拖选释放不触发卡片」与「单击立即触发」不冲突：可用 mousedown→click 的位移阈值区分，无需延迟。

## 排除其他嫌疑

- `src/lib/desktop/text-context-menu.ts:81,87` 的 mousedown 捕获只在 `button===2`（右键）时拦截；contextmenu/selectionchange 与左键单击无关。
- `src/components/ui/tooltip.tsx:97,103` 的 document 捕获 click 仅清理 tooltip 状态，不 stopPropagation。
- `CandidateDrawCard.tsx:141` 的 `pointerdown` 捕获只在换一批悬浮框钉住时用于点外部关闭，且目标是 window 级、不 stopPropagation 卡片点击。
- 选中态写入链路（`useCardSelection`、`useTabsStore.openTab`）同步无延迟；`aria-pressed` 由 zustand 选择器驱动（`CandidateDrawCard.tsx:284`）。
- `text-context-selection.ts` 是右键菜单的文本捕获，不拦截左键。

## 影响面

`installTextPreviewSelection` 由 `src/app/providers.tsx:12` 全局挂载，同一「preview 单击被吞」潜伏于所有「preview 位于可交互/可拖卡片内」的结构（Scene/Character/Item/Level 卡、Planning 可拖 article、role=checkbox/label 容器内的 preview）。修复规则在共享适配器内统一调整，各卡行为一致：普通单击=触发卡片自然动作；选取手势（拖选、双击/三击、Shift+单击）=保持隔离。

## 相关文件

- `src/lib/desktop/text-selection.ts`（修复对象）
- `src/components/chat/CandidateDrawCard.tsx`（受害组件，无需修改）
- `src/app/providers.tsx`（挂载点，无需修改）
- `tests/browser/text-selection-cards.test.ts`（行为基线，需按新规则更新+新增用例）
- `docs/reviews/2026-10-13-text-selection-{plan,code-review}.md`（旧规则批准记录）
