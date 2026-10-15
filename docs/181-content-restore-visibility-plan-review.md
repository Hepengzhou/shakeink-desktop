# 180 方案独立审核

日期：2026-10-15。审核对象：`docs/180-content-restore-visibility-plan.md`（右侧面板展开/收起按钮显隐时序修复方案）。审核方式：只读对照真实源码、既有测试与脚本逐条核实，未修改任何文件。

## 逐条核实

### 1. 根因陈述 —— 结论：成立

- `contentHidden: view.contentPhase !== "open"` 确在 `src/components/layout/useSidebarDrawer.ts:624`；传递链 `DashboardShell.tsx:45` → `ChatPanel.tsx:1720`（`{contentHidden && onShowContent && (...)}`）与方案一致。
- 相位机 `Phase = "open" | "opening" | "closing" | "closed"` 在 `useSidebarDrawer.ts:10`；动画开始进入中间相位的提交点在 `lockContent` 的 `:175`（`update({ contentAnimating: true, contentPhase: phase })`，函数体 :156-176）；收尾才写终态在 `:355`（`update({ contentAnimating: false, contentPhase: r.contentGoal ? "open" : "closed", ... })`）。方案对「第一帧即为 true / 动画播完才消失」的推导与代码一致。
- 时长：`showContent`（:409-432）宽屏经 `startAxis`（:403-408，`opening ? 560 : 420`）展开 560ms、窄屏 `contentMotion` 560ms（:428）；`hideContent`（:433-448）宽屏 420ms（:406）、窄屏 420ms（:447）；`prefers-reduced-motion` 为 0（:15、:406、:428、:447）。方案引述准确。
- 历史背景属实：`docs/reviews/2026-10-13-content-drawer-plan.md:37` 确有「`contentHidden`在动画中也为 true……恢复按钮切换最新意图」；:45 确有 pointer capture 的批准记录。按 AGENTS.md「历次修改以后者为准」，2026-10-15 新要求取代该中途反转设计的处理合法。

### 2. `!== "closed"` 语义 —— 结论：成立（附两处表述说明）

逐个相位来源核实：

- 初始挂载（`useSidebarDrawer.ts:25`）：只可能是 `"open"` 或 `"closed"` 终态，新旧条件等价。
- `showContent`：`:424` `lockContent(true, true)` 与命令同一同步任务提交 `"opening"`（:175），恢复按钮在首个 rAF 动画帧绘制前的同一 React 提交内卸载 —— 满足要求 1。
- `hideContent`：`:443` `lockContent(false)` → `"closing"` 全程隐藏；仅 `:355` 收尾置 `"closed"` 后挂载 —— 满足要求 2。收起按钮位置 `ContentTabs.tsx:200-208`（有 Tab，`显示 / 隐藏内容面板`）与 `:85-93`（空 Tab，`隐藏内容面板`）引述准确。
- `startSidebar`（:369）与 `toggleFullscreen`（:463-473，guard 在 :463，借相位在 :469）：均以 `goal=true` 借内容相位（`"closing"/"opening"`），内容面板全程可见，`:355` 收尾回 `"open"`。旧条件下恢复按钮确实在内容可见期间闪现（附带修正成立）；新条件下全程隐藏，语义正确。
- `resized`（:577）与 `apply`（:613）：直接写终态 `"open"/"closed"`，语义正确。
- 窄屏 `closeContentOverlay`（:449-459）：新条件下 chat 头部恢复按钮在 `"closing"` 期间不再渲染；旧条件下它虽渲染但被 `chatInert`（:625，窄屏 `contentPhase !== "closed"` 即 inert + aria-hidden）置为不可交互，且窄屏真正的恢复入口是底部导航「查看内容」（`focusContentRestore` 窄屏选择器 :192-193 不依赖 `contentHidden`）。功能不变，差异仅为不可交互元素的提前消隐，方向与新要求一致。**说明**：方案「窄屏路径不变」严格说只覆盖焦点路径，建议表述收窄。
- 反向排查「contentPhase 非 `closed` 但按钮应可见」的场景（侧栏开关、全屏进/退、resize 跨断点、apply 恢复后、窄屏各 pane）逐一核对，均不存在。

### 3. 焦点恢复兜底 —— 结论：必要且充分（实现要点见问题 P4）

- 必要性成立：宽屏新时序下，收起帧内按钮未渲染 → `:289` 的 `focusContentRestore()`（:189-197，含可见宽度/inert/对话框门控）永远返回 false；收尾帧 `:289` 先于 `:355` 的 `update` 执行仍失败；收尾后 `:359` 条件全 false 不再 `kick()`（:350-351 已清 `contentFrozen/needsWrite`）。焦点确会落到 body，兜底必要。唯一后续 `kick` 来源是真实宽度变化的 `resized`（:578），即便发生也只是正确聚焦已可见按钮，无害。
- 充分性成立：`:355` 的 `update` 与恢复按钮挂载在同一 React 提交，`useLayoutEffect`（:512-536）在提交后绘制前消费，时机正确；同一「rAF 收尾置标记 → layout effect 按相位消费」模式已被既有 `contentRestoreFocus`（:351→:527）+ CD-05（content-drawer.test.ts:291）通过证明。
- 一次性标记：settle 分支每次运动只进入一次（`contentSettling` 门控 :330/:345/:350）；`apply` 重置区（:601-603）方案已要求同步重置，无遗漏。
- 串扰排查：「hide → 运动中 toggle → settle open」时 `contentGoal=true`，标记仅在 `!r.contentGoal` 置位，不误触发；残留的 `contentClosingFocus` 会被下次 `captureContentFocus`（:179）重置，无害。窄屏下 `:289` 原路径在运动中即成功清 flag，layout effect 消费时 flag 已 false，不会重复聚焦。`focusContentRestore` 全部门控（root、对话框 :191、宽度/inert :193、窄屏文本匹配）核对无误。

### 4. ChatPanel pointer capture 删除 —— 结论：安全

- 新条件下按钮只在 `"closed"` 静态终态渲染，绝不随动画移动，`ChatPanel.tsx:1726-1730` 的 capture 与 :1719 注释确为死代码。
- fixture 提取机制兼容：`tests/helpers/content-drawer-fixture.ts:11-21` 仅按外层 className（`desktop-drag` + `h-11`）定位 header 文本，stub（:87）提供其全部自由标识符；`tests/helpers/sidebar-drawer-fixture.ts:22-31`、`:75` 同机制同 stub，均不受影响。
- 其余拼接真实 caption 的测试（workspace-surfaces.test.ts:57、caption-alignment.test.ts:29、pane-window-drag.test.ts:37、ai-caption-message-drag.test.ts:58、chat-caption-safe-area.test.ts:34、sidebar-restore-safe-area.test.ts:35）均以静态按钮普通 click/press 操作（如 chat-caption-safe-area.test.ts:102、sidebar-restore-safe-area.test.ts:96-100），无按住移动场景，capture 删除对它们无影响。

### 5. 受影响测试清单 —— 结论：清单完整，验证范围需扩大（问题 P1）

- 全量 grep `contentHidden|data-content-restore|clickMovingRestore|contentFixture`：tests/ 内 10 文件 50 处；scripts/ 仅 `verify-content-drawer.mjs:38`。逐一核对：
  - `content-drawer-popup.test.ts`（9 处 `contentFixture`）：仅用 hide/toggle 命令与终态等待，首帧断言对象是内容区 inert，无恢复按钮显隐时序断言 —— 不受影响。
  - `workspace-surfaces / caption-alignment / pane-window-drag / ai-caption-message-drag / chat-caption-safe-area / sidebar-restore-safe-area`：均为 stub 自控 `contentHidden` 或静态点击 —— 不依赖旧时序。
  - `sidebar-drawer*.test.ts`（4 个文件）：恢复按钮是 `[data-sidebar-restore]`（sidebar-drawer.test.ts:9），侧栏行为方案明确不改（`sidebarHidden` 保持 `!== "open"`，useSidebarDrawer.ts:623）—— 不受影响。
  - `scripts/verify-content-drawer.mjs`：`:209`/`:382-383` 均在终态聚焦 + Enter 使用恢复按钮，`closeDrawer` 在 terminal `closed` 后断言 `restore().count()>0` —— 与新时序兼容。
- 结论：除 `content-drawer.test.ts` 外无测试依赖旧显隐时序，清单完整。**但**验证范围问题见 P1。

### 6. 代码消费者完整性 —— 结论：完整（padding 随动可接受，见 P3）

- `contentHidden` 在 src/ 的全部使用：`useSidebarDrawer.ts:624`（定义）、`DashboardShell.tsx:45`（传递）、`ChatPanel.tsx:875/882`（prop 声明）、`:1693`（win32 caption 右 padding）、`:1720`（按钮渲染）。无遗漏消费者。
- `ChatPanel.tsx:1693` 的 padding 构成 = 原生窗控安全区（max 项，138px/zoom）+ 按钮 28px/zoom + 12px。方案「与按钮实际占位一致」只解释了 28px 部分；动画期间 138px 安全区同样消失（展开前段 chat 右缘仍贴窗口右缘时标题文本可短暂延伸至原生窗控下方，纯视觉、非交互 truncate 文本、原生覆盖层命中优先）。评估为可接受，但方案应写明，见 P3。

### 7. CD-05 在新时序 + 焦点兜底下 —— 结论：可通过

- 时序链：hide 420ms → 同帧 `:318-327` 清 secondary → `:329-346` settle 第一分支（提交拓扑、`contentSettling=true`、`kick()`）→ 次帧 `:347-357` 收尾提交 `"closed"` → React 提交（按钮同提交挂载）→ layout effect 消费聚焦。合计 ≈ 420ms + 2 帧（60Hz 约 33ms）+ 微任务，约 455-490ms，小于 CD-05（content-drawer.test.ts:288-289）的 `waitForTimeout(520)`。即使环境降至 30fps 仍在预算内。余量较旧实现（动画初帧即聚焦）收窄但充分。

### 8. 验收顺序与约束 —— 结论：符合（验证范围按 P1 修订）

- 方案顺序（独立审核本方案 → 用例文档及独立审核 → TDD RED → 实现 + code review → 目标范围验证 → 总结）与 AGENTS.md 规定一致；明确只执行 `tests/browser/content-drawer.test.ts` 全文件 + `npm run typecheck`、不执行全量套件，遵守了用户「禁止全量测试」约束。不使用模拟接口冒充真实验证的声明与 fixture 真实提取机制一致。

## 发现的问题（按严重程度）

- **P1（中）验证范围过窄**：方案 §「受影响既有测试」断言影响均限于 `content-drawer.test.ts`，行为层面属实；但 `ChatPanel.tsx` 被编辑（删除 pointer capture）后，7 个拼接真实 caption 的测试文件（workspace-surfaces、caption-alignment、pane-window-drag、ai-caption-message-drag、chat-caption-safe-area、sidebar-restore-safe-area，及经 sidebar-drawer-fixture 的 sidebar-drawer*.test.ts）会重建 bundle。若 header 编辑引入语法/结构破坏而从不运行，这些套件会静默失效。**修正建议**：目标验证范围在 `content-drawer.test.ts` + typecheck 之外，增加上述 caption 拼接测试文件（仍为定向范围，不违反「禁止全量」约束），或在方案中显式说明豁免理由并自担风险。
- **P2（低）引用不精确**：方案称运动中命令反转由「CD-02 :128-134、CD-03 :215 已覆盖」。`content-drawer.test.ts:215`（CD-03）是 settle `"closed"` 后的 reopen，非运动中反转；实际覆盖是 CD-01 same-task（:169-177，同任务 toggle×3）与 CD-02（:123-134）。**修正建议**：用例文档阶段更正引用，不影响方案正确性。
- **P3（低）表述补全**：(a)「窄屏路径不变」应限定为焦点路径——窄屏 `"closing"` 期间 chat 头部恢复按钮由「渲染但 inert/aria-hidden」变为「不渲染」（useSidebarDrawer.ts:625 已使其不可交互，差异仅视觉且方向一致）；(b) `ChatPanel.tsx:1693` padding 随动除 28px 按钮占位外，138px 窗控安全区在动画期间同样消失，方案应写明该短暂纯视觉权衡。**修正建议**：在方案/实现说明中补一句即可，不改代码。
- **P4（低）实现要点（移交 TDD/code review）**：(a) layout effect 消费兜底成功后应与 `:289` 语义一致同步清 `contentClosingFocus`，避免残留；(b) fixture `ContentSample` 增加 `restore` 字段时，`content-drawer-fixture.ts:122` 的 `empty` 兜底对象需同步补字段保持类型完整；(c) `focusContentRestore` 因对话框门控（:191）返回 false 时一次性标记被消费不重试——与既有「有 Dialog 不抢焦点」原则一致，实现时保留该语义。

## 总体结论

**需修订后批准。** 核心机制判断全部成立：根因陈述准确；`contentHidden !== "closed"` 在所有相位来源下同时满足两条 2026-10-15 需求且无应可见而隐藏的场景；焦点兜底必要且充分，消费时机与既有 `contentRestoreFocus` 同模式、CD-05 时序可通过；pointer capture 删除安全且 fixture 兼容；受影响测试清单完整、验收顺序合规。需修订项：P1 扩大定向验证范围（或显式豁免理由），P2/P3 表述更正与补全，P4 实现要点带入下一阶段。修订后无需再次完整审核，可在用例文档阶段一并确认。


## 勘误（2026-10-15）

本审核引用的方案表达式 `contentHidden !== "closed"` 与 180 初稿同为笔误；正确实现为 `contentHidden === "closed"`（`ChatPanel.tsx:1720` 渲染条件是 `contentHidden && onShowContent`，true 才渲染按钮）。本报告全部行为级结论（相位来源排查、无「非 closed 但按钮应可见」场景、焦点兜底必要性等）不受影响，180 已在「实施设计 1」就地修正。
