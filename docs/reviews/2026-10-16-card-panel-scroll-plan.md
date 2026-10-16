# 选中抽卡卡片后底部面板遮卡修复技术方案

日期：2026-10-16（Asia/Shanghai）。前置产物：`2026-10-16-card-panel-scroll-research.md`。

## 实现（唯一改动文件 `src/components/layout/ChatPanel.tsx`）

1. `scrollRef`（1054 行附近）旁新增 `const dockRef = useRef<HTMLDivElement>(null)`，挂到底部槽位容器（1854-1860 行的 `shrink-0 px-4 pt-2 pb-3.5` div）。
2. 新增选中卡锚定函数（`useCallback`，空依赖，纯 DOM 读取；nearest 双向最小位移语义，仅在选中/换卡当下使用）：

   ```ts
   const revealSelectedCard = useCallback(() => {
     const list = scrollRef.current
     const thumb = list?.querySelector<HTMLElement>('[data-testid^="candidate-card-"][aria-pressed="true"]')
     if (!list || !thumb) return // 选中来自内容区候选面板等无对话区组卡的场景：静默跳过
     const group = thumb.closest<HTMLElement>('[data-testid="candidate-draw-card"]')
     const target = group && group.offsetHeight <= list.clientHeight ? group : thumb
     const margin = 8
     const lr = list.getBoundingClientRect()
     const tr = target.getBoundingClientRect()
     if (tr.height >= lr.height - margin * 2) {
       if (tr.top > lr.top + margin) list.scrollTop += tr.top - (lr.top + margin)
     } else if (tr.bottom > lr.bottom - margin) {
       list.scrollTop += tr.bottom - (lr.bottom - margin)
     } else if (tr.top < lr.top + margin) {
       list.scrollTop -= (lr.top + margin) - tr.top
     }
   }, [])
   ```

   - 优先锚定整个抽卡组卡（组卡高于视口时退化为选中卡本身）。
3. 选中/换卡当下：`useLayoutEffect(() => { if (showCardPanel) revealSelectedCard() }, [showCardPanel, cardSelection?.candidateId, revealSelectedCard])`——与 composer→面板切换同一提交、绘制前完成，被遮状态不可见。
4. dock 异步增高：`useEffect` 在 `showCardPanel` 期间以 `ResizeObserver` 观察 dockRef，**以 observe 时 `offsetHeight` 为基线且不跳过首次通知**（覆盖「查询极速返回、阶段二提交先于 RO 首次通知」的竞态），每次回调无条件更新基线，回调中 `if (delta > 0 && nearBottomRef.current) scrollRef.current.scrollTop += delta`——保持视口底缘锚定（数学上 dist 不变，nearBottom 状态自持）；收缩交给浏览器原生钳制（与补偿等价）；非底部区不补偿（保护上翻阅读位置）。scrollTop 变化不引起 dock resize，无循环。

不改 `CandidateActionPanel`、`useCardSelection`、CSS；不引入依赖；不动既有新消息落底/`usePreserveAnchor` 逻辑。

备选方案排除（审核记录）：Chromium 原生 scroll anchoring 只补偿滚动容器内部内容位移，不适用「兄弟节点增高挤压视口」；`usePreserveAnchor` 的 240ms rAF 窗口覆盖不了网络级异步阶段二增高，且常开锚定会与用户滚动对抗（其 240ms 会话与本次补偿理论互斥窗口极窄——点卡前 240ms 内刚做展开/收起才会短暂对抗，可忽略但知情）。

## 边界核对

- 组卡比视口高（极矮窗口 + 50vh 面板）：目标退化为选中卡，按 nearest 规则处理，best effort。
- `showWelcome` 隐藏列表 / 会话无对应组卡：querySelector 落空即返回。
- AskUserPanel 优先级更高抢占槽位（`showAskPanel` 真）：`showCardPanel` 为假，本逻辑停用；选稿问答被选中卡覆盖场景（`selectionOverridesAsk`）仍走 `showCardPanel` 分支，正常锚定。
- Esc/✕ 关闭面板：effect 清理，无补偿。
- `ResizeObserver` 观察开始时有一次初始通知，以 observe 时 `offsetHeight` 为基线，不产生补偿。

## 测试（遵守用户批准：仅针对本次修复，不跑全量）

底座：`tests/browser/chat-empty-state.test.ts`（完整真实 ChatPanel fixture），新增 CES-10 系列用例；fixture fetch 的候选详情路由由字面量 `chapters/chapter/candidates/candidate` 放宽为 `chapters/chapter/candidates/<任意id>`（既有用例不受影响）。

- CES-10a（报告场景红绿核心）：底部区点卡 → 面板出现即断言组卡完全在消息视口内；待选项行加载完毕（面板二次增高）后再次断言组卡仍完全可见。
- CES-10b（护栏）：历史组卡滚至视口中部点卡 → scrollTop 不变（±2px）且组卡保持可见（新旧代码均应通过；锁定「可见不扰动」）。
- CES-10c（换卡）：选中 A 卡后再点同组 C 卡（详情路由按 id 放宽）→ 组卡保持完全可见。
- TDD：先跑 CES-10a/10c 对旧代码见红（组卡 bottom 超出视口底缘），修复后全绿；证据存 `docs/evidence/text-selection/` 旁新建 `docs/evidence/card-panel-scroll/`。

## 顺序

独立方案审核 → 用例文档与独立审核 → TDD 红灯 → 实现 → 定向转绿 → 独立代码审核 → 台账 → 总结。
