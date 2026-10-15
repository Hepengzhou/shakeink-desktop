# 右侧面板展开/收起按钮显隐时序修复方案

日期：2026-10-15。范围：AI 对话区右上角「显示内容面板」恢复按钮与右侧面板「显示 / 隐藏内容面板」收起按钮的显隐时序。本轮要求（2026-10-15，以后者为准）：

1. 点击「显示内容面板」后，该按钮必须在右侧面板展开动画播放**前**隐藏，而不是等动画播完才消失。
2. 点击「显示 / 隐藏内容面板」收起后，「显示内容面板」按钮必须在收起动画播放**完成后**才出现，而不是动画播放前就出现。

## 现状机制

- 动画不是 CSS transition，而是 `src/components/layout/useSidebarDrawer.ts` 的 rAF 驱动 JS 动画：`showContent`（:409-432）展开 560ms，`hideContent`（:433-448）收起 420ms，`prefers-reduced-motion` 时为 0；相位机 `Phase = "open" | "opening" | "closing" | "closed"`（:10）。
- 相位在动画**开始**时进入 `"opening"/"closing"`（`lockContent` :156-176，:175），在动画**收尾**时才进入终态（:355 `update({ contentAnimating: false, contentPhase: r.contentGoal ? "open" : "closed" })`）。
- 恢复按钮渲染条件：`ChatPanel.tsx:1720` `{contentHidden && onShowContent && (...)}`，`contentHidden` 来自 `DashboardShell.tsx:45` → `useSidebarDrawer.ts:624`。
- 收起按钮：`ContentTabs.tsx:200-208`（有 Tab，`aria-label="显示 / 隐藏内容面板"`）与 :85-93（空 Tab，`aria-label="隐藏内容面板"`），`onClick={onToggleContent}`。

## 已确认原因

`useSidebarDrawer.ts:624`：

```ts
contentHidden: view.contentPhase !== "open",
```

恢复按钮的显隐绑定的是**已稳定终态相位**（`=== "open"`），而非操作意图或全闭相位：

- **展开**：点击后相位变 `"opening"`，仍 `!== "open"` → 整个 560ms 动画期间按钮一直渲染，直到收尾变 `"open"` 才卸载（违反要求 1）。
- **收起**：点击后相位立刻变 `"closing"`（≠ `"open"`）→ `contentHidden` 第一帧即为 true → 按钮在 420ms 收起动画起点就挂载（违反要求 2）。

历史背景：`docs/reviews/2026-10-13-content-drawer-plan.md:37` 曾批准「`contentHidden` 在动画中也为 true；恢复按钮切换最新意图」，`ChatPanel.tsx:1719` 注释与 :1726-1730 的 pointer capture、`tests/browser/content-drawer.test.ts:73-118` 两个 CD-01 用例均为该中途反转设计服务。**2026-10-15 要求与此冲突，按『历次修改以后者为准』，新要求取代该中途反转设计**：动画期间不再提供可见恢复按钮；运动途中反转仍保留命令路径（`view.content` 命令 / `toggleContent`，CD-01 same-task :169-177、CD-02 :123-134 已覆盖）。

## 实施设计

1. **`useSidebarDrawer.ts:624`**：`contentHidden` 改为 `view.contentPhase === "closed"`（渲染条件 `ChatPanel.tsx:1720` 是 `contentHidden && onShowContent`，`contentHidden=true` 才渲染按钮，故应为 `===`；初稿写成 `!==` 系笔误，本行即修正）。
   - `"closed"` → 按钮可见；`"open"/"opening"/"closing"` → 隐藏。
   - 要求 1：点击 `showContent` 同一提交内相位即 `"opening"`（:175），按钮在首个 rAF 动画帧绘制前卸载。
   - 要求 2：`"closing"` 全程隐藏；仅当 :355 收尾置 `"closed"` 后才挂载。
   - 附带修正：侧栏开关/全屏切换借用内容相位（`lockContent(true, false, "closing"/"opening")`，:369、:469）时，旧代码会让恢复按钮在内容面板保持打开期间闪现；新条件下一并消除。
   - `ChatPanel.tsx:1693` 的 win32 caption 右 padding 随 `contentHidden` 同步变化，与按钮实际占位一致，无需额外改动；动画期间 138px 窗控安全区 padding 也随按钮一并不存在（此时 chat caption 尚未伸到窗控下方，纯视觉、无功能影响）。
2. **焦点恢复兜底**：旧代码在收起动画帧内（:289 `if (r.contentClosingFocus && focusContentRestore())`）即可把焦点移到当时已可见的恢复按钮；新时序下宽屏模式按钮在收尾才挂载，帧内尝试永远失败，而收尾帧后不再 `kick()`（:359），焦点会丢失到 body。修复：runtime 增加一次性标记（如 `contentSettleFocus`），仅在 :347-357 收尾分支且 `!r.contentGoal` 时置位；在现有 `useLayoutEffect`（:512-536）中当 `view.contentPhase === "closed"` 时消费一次：若 `contentClosingFocus` 仍成立则调 `focusContentRestore()`（:189-197，自身含可见性/inert/对话框门控），成功后同步清 `contentClosingFocus`。**用户焦点优先门控**（183 审核 P1）：消费时若 `document.activeElement` 既非 `document.body` 也不在（已 inert 的）内容 inner 内，说明用户在动画期间已主动转移焦点，跳过聚焦并清 `contentClosingFocus`，不抢占用户焦点（延续 2026-10-13 已批准原则；CD-05 第三段同原则）。「hide→运动中 reopen→settle open」场景因 `contentGoal` 门控不置位，不误触发。窄屏**焦点路径**不变（导航「查看内容」按钮运动中恒存在，:289 原路径仍可命中；窄屏 closing 期间 chat 头部恢复按钮由 inert 渲染变为不渲染，本就不可交互，无功能影响）。`apply` 适配器重置区（:597-616）同步重置该标记。`contentRestoreFocus`（打开方向，:351→:527）不受影响。
3. **`ChatPanel.tsx:1719-1730`**：删除已死的 pointer capture（按钮只在 `"closed"` 静态终态渲染，不再随动画移动）与过期注释，按钮保留 `onClick={onShowContent}` 与既有样式/aria，与侧栏恢复按钮同构。
4. **侧栏 `sidebarHidden`（:623）保持 `!== "open"`**：本轮要求只针对右侧面板，不改左侧行为。

## 受影响既有测试（均限于 `tests/browser/content-drawer.test.ts`）

- :73-88「CD-01 repeated close/open reversal follows the visible restore control」：前提为收起中可见按钮，与新要求冲突 → 改写为命令驱动反转，并逐帧断言运动期间无恢复按钮；保留实例/几何断言与收尾键盘重开。
- :90-118「CD-01 held actual pointer recovery…」：前提（运动中可见且移动的按钮 + pointer capture）整体失效 → 删除；对应生产代码同步移除。
- :69、:85-87、:277、:289 等在终态使用恢复按钮的断言不变；:289 焦点断言由设计 2 兜底继续通过。
- `clickMovingRestore` 辅助函数随之不再使用 → 删除。
- fixture `tests/helpers/content-drawer-fixture.ts` 的 `captureSample`/`ContentSample` 增加 `restore: boolean`（`.workspace-chat [data-content-restore]` 是否存在），含 :122 `empty` 兜底对象同步补字段；纯增量字段，供逐帧显隐断言，其它用例不受影响。

## 修订记录（2026-10-15，依据 181 独立审核）

- 验证范围扩到本次编辑的直接影响面（审核 P1）：`ChatPanel.tsx` 真实 caption 被 7 个测试文件经 AST 提取拼接（content-drawer-fixture、sidebar-drawer-fixture、caption-alignment、ai-caption-message-drag、chat-caption-safe-area、pane-window-drag、sidebar-restore-safe-area、workspace-surfaces），`useSidebarDrawer.ts` 被 content-drawer 与 5 个 sidebar-drawer* 文件经 fixture 真实执行，编辑会使其 bundle 重建，故全部纳入定向执行范围；其余 unit/integration/browser 套件明确豁免（遵守「禁止全量测试」）。
- 运动中反转的既有覆盖修正为 CD-01 same-task（:169-177）与 CD-02（:123-134）（审核 P2）。
- 「窄屏路径不变」限定为焦点路径；补充 win32 padding 安全区说明（审核 P3）。
- 实现要点：兜底聚焦成功后清 `contentClosingFocus`；fixture `empty` 对象补 `restore` 字段（审核 P4）。

## 验证与交付顺序

独立审核本方案 → 用例文档及独立审核 → 先写回归测试并确认旧代码失败（TDD RED）→ 实现及独立 code review → 仅执行本轮目标范围 + `npm run typecheck`；**不执行全量 unit/integration/browser 套件** → 验证报告及总结。不使用模拟接口冒充真实验证；测试经 esbuild 现场打包真实 DashboardShell/useSidebarDrawer/ContentTabs 与真实提取的 ChatPanel caption。

目标执行范围（本次编辑的直接影响面，逐文件可对应到被改源码）：

- `tests/browser/content-drawer.test.ts`（主回归：真实 hook + 真实 caption + 新增/改写用例）
- `tests/browser/sidebar-drawer.test.ts`、`sidebar-drawer-intent.test.ts`、`sidebar-drawer-measurement.test.ts`、`sidebar-drawer-resize.test.ts`、`sidebar-surfaces.test.ts`（sidebar-drawer-fixture 共享真实 hook 与真实 caption）
- `tests/browser/caption-alignment.test.ts`、`ai-caption-message-drag.test.ts`、`chat-caption-safe-area.test.ts`、`pane-window-drag.test.ts`、`sidebar-restore-safe-area.test.ts`、`workspace-surfaces.test.ts`（各自拼接真实 ChatPanel caption，编辑后 bundle 重建的编译/行为安全）
