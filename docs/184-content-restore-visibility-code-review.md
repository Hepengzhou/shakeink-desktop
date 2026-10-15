# 184 恢复按钮显隐时序 code review

日期：2026-10-15。审核对象：2026-10-15 需求（恢复按钮在展开动画前隐藏、收起动画完成后才出现）的未提交实现，依据 `docs/180-content-restore-visibility-plan.md`（含 181 审核修订与勘误）与 `docs/182-content-restore-visibility-cases.md`（含 183 审核修订）。审核方式：只读逐行对照 `git diff`（4 个改动文件 + 4 个文档）与真实源码/测试；本报告为唯一新建文件，未修改任何其他文件。浏览器套件未由本审核执行（GREEN 证据属 185 验证报告），行为结论均为静态推导，标注处为「未能确证」。

改动面核实：`git status --porcelain` 与 `git diff --stat HEAD` 确认改动恰好为 `src/components/layout/useSidebarDrawer.ts`（+19/-2）、`src/components/layout/ChatPanel.tsx`（+4/-4）、`tests/browser/content-drawer.test.ts`（净增改写）、`tests/helpers/content-drawer-fixture.ts`（+3/-2）及 docs/180–183 四个新文档，与计划清单一致，无计划外改动。

## 1. 正确性 —— 结论：通过

- **核心条件**：`contentHidden: view.contentPhase === "closed"` 在 `useSidebarDrawer.ts:639`，渲染条件 `ChatPanel.tsx:1721`（`contentHidden && onShowContent`）——`===` 与 180 勘误（181 勘误段）一致，非初稿笔误的 `!==`。
- **需求 1（展开前隐藏）**：`showContent`（:413-436）在同一点击事件处理器内经 `lockContent(true, true)`（:428）于 :175 同步提交 `contentPhase: "opening"`；React 19 离散点击同步 flush（183 §1 已核实），按钮与 `data-content-phase`（DashboardShell.tsx:29）同一提交原子落地，首个 rAF 动画帧绘制前即卸载。CD-08 第一条（content-drawer.test.ts:88-105）的微任务检查点直接断言该时序。
- **需求 2（收尾后出现）**：`hideContent`（:437-452）经 `lockContent(false)`（:447→:175）提交 `"closing"`，全程 ≠ `"closed"` 按钮不渲染；终态 `"closed"` 仅在收尾分支 :355 的 `update` 写入，按钮与该提交同批挂载。CD-08 第二条（:107-130）断言「首个含按钮帧相位必为 closed 且可见宽度 < 1px」。
- **借相位路径**：`startSidebar`（:373）与 `toggleFullscreen`（:473，guard :467）均以 `lockContent(true, false, "closing"/"opening")` 借内容相位且 `contentGoal=true`，内容面板全程可见；新条件下按钮全程隐藏，消除了旧条件（`!== "open"`）下内容可见期间按钮闪现的问题，与 180 实施设计 1「附带修正」一致；收尾 :355 回 `"open"` 按钮仍不挂载，无新死角。
- **`contentInteractionPaused` / `chatInert`**：分别为 `view.contentPhase !== "open" || underlayInert`（:639）与 `underlayInert || !chatVisible || narrow && contentPhase !== "closed"`（:640），均未改动；内容区在运动中保持 inert（DashboardShell.tsx:49-50），行为不变。
- **窄屏**：closing 期间 chat 头部恢复按钮由「渲染但被 `chatInert` 置为不可交互」变为「不渲染」，差异仅视觉且方向与新需求一致（180 :54 已按 181 P3(a) 写明）；窄屏真正恢复入口是导航「查看内容」（DashboardShell.tsx:33，`focusContentRestore` 窄屏选择器 :192-193 不依赖 `contentHidden`），功能不变。
- **`resized` / `apply`**：`resized` 在 :586 对 `r.sidebar || r.secondary || r.contentMotion || r.contentFrozen` 直接早退，运动中绝不写相位；静止时（:592）只写终态。`apply`（:612-630）取消 rAF、清全部运动标记并直写终态（:628）。两条路径都不会让按钮在动画中出现/消失。
- **相位死角排查**：收尾分支必经（:329 门控 + :363 在 `contentFrozen` 期间持续 `kick()`，每个运动序列必然进入 :347-361）；`apply` 中断有完整重置（:615-618）；组件卸载取消 rAF（:633）。反向排查「内容已隐藏但相位非 closed」（全屏时 contentPhase="open" 且 chat 不可见，按钮无关；窄屏侧栏覆盖时按钮渲染但随 chat 一起 inert，与侧栏恢复按钮同模式，非本轮回归）与「内容可见但相位 closed」均未发现。

## 2. 焦点兜底（`contentSettleFocus`）—— 结论：通过

- **置位**：仅 :359 收尾分支且 `!r.contentGoal` 时置位，紧跟 :355 的 `update` 同一 rAF 回调同步执行，早于任何 React 提交/flush，消费不会落空。「hide→运动中 reopen→settle open」因 `contentGoal=true` 不置位，不误触发（CD-05 第二段 :324-327 时序同构）。
- **消费**：`useLayoutEffect` :531-541，门控 `view.contentPhase === "closed"`；先清标记（:535）再清 `contentClosingFocus`（:537），一次性语义完备。与既有 `contentRestoreFocus`（:351→:542）同「rAF 置标记 → layout effect 按相位消费」模式。
- **183 P1 门控实现正确**：:539 `if (!active || active === document.body || !!contentInnerRef.current?.contains(active)) focusContentRestore()`——仅当焦点在 body（inert 后 Chromium 自动落点）或仍在内容 inner 内时恢复；用户运动中转移到内容外则跳过，且 `contentClosingFocus` 已在 :537 清除，即「跳过聚焦并清标记」，逐字对应 183 P1 修正建议。CD-08 第三条（content-drawer.test.ts:132-146）真实覆盖：hide 后 120ms 转焦外部按钮，断言收尾后焦点不被抢。
- **重置完备性**：`apply` 适配器 :618 同步重置 `contentSettleFocus` 与 `contentClosingFocus`；每次 `captureContentFocus`（:179）重置 `contentClosingFocus`，连续 hide 无残留；组件卸载后标记无意义。
- **`focusContentRestore` 返回值忽略**（:539）：可接受。失败路径仅对话框门控（:191）与目标不可见（:194）；收尾后无后续帧可重试正是 181 P4(c) 批准的一次性语义（「有 Dialog 不抢焦点」），帧内路径 :289 保留「失败留标记下帧重试」原语义，两者分工清晰。
- **与帧循环 :289 无冲突/无重复聚焦**：宽屏运动中按钮未挂载，:289 恒返回 false；收尾帧 :288-289 先于 :355 的 update 执行，此刻相位仍 `"closing"` 按钮未挂载，仍失败；收尾后 :363 条件全 false 不再 `kick()`，layout effect 成为唯一聚焦者。窄屏 :289 在运动中即成功并清标记（导航按钮恒可见），layout effect 消费时 `contentClosingFocus` 已 false，天然跳过，不会重复聚焦。
- **P3（理论备注，非阻塞）**：若某 show 命令与收尾 `"closed"` 更新被批进同一 React 提交，`view.contentPhase === "closed"` 门控会跳过消费使标记残留；既有 `contentRestoreFocus`（:542 门控 `"open"`）存在完全同构的理论窗口，且 `apply`（:618）与下次收尾均会重置/重置位，实际路径（用户事件与 rAF 分属不同任务）不可达。维持与既有模式一致即可，无需本轮处理。

## 3. 注释与文档一致性 —— 结论：通过

- 新注释 `ChatPanel.tsx:1719-1720`（「contentHidden 仅在 contentPhase "closed" 后为 true：点击即随 "opening" 提交隐藏，收尾置 "closed" 才重新挂载」）与实现逐字相符。
- `useSidebarDrawer.ts:356-358`（收尾注释，含「wide mode has no visible restore control during the motion itself」）与 :532-534（消费注释，含用户转移焦点例外）准确描述行为。
- 残留检查：对 ChatPanel.tsx 全文件 grep `restore|revers|in-flight|moving|pointer`，旧注释「The visible caption control also reverses an in-flight content drawer.」与 pointer capture 块注释均已随代码删除，无残留描述旧行为的注释；`focusContentRestore` 两个调用点（:289、:539）注释/语义与各自路径一致。
- `contentHidden` 全部消费点（ChatPanel.tsx:875/882 prop、:1693 win32 padding、:1721 渲染；DashboardShell.tsx:45 传递）无遗漏；:1693 padding 随 `contentHidden` 同步，与按钮实际占位一致（138px 安全区随动为纯视觉权衡，180 :37 已写明）。
- 文档侧：180 引用的 `:624` 等行号为编辑前源码，属方案文档常态，无需回改；181 勘误与 182/183 修订均已落进实现。

## 4. 测试质量 —— 结论：通过

- **CD-08 R1（:88-105）**：真实按钮 `.click()` → 微任务检查点断言 `phase==="opening"`、按钮已移除、可见宽 < 1px → 逐帧断言全部 `"opening"` 帧无按钮（≥8 帧防假采样）→ 收尾 `"open"` 按钮仍不存在。微任务=首个绘制前的依据由 183 §1 实证（React 19 离散事件同步 flush + react-resizable-panels v4 安装包 defaultSize=0 渲染 flexBasis 0），成立。
- **CD-08 R2（:107-130）**：真实 ContentTabs「显示 / 隐藏内容面板」按钮（ContentTabs.tsx:200-208，openContent 走有 Tab 分支，选择器命中 :202 aria-label）→ 检查点 `"closing"` 无按钮 → 全部 `"closing"` 帧无按钮 → 首个含按钮帧相位 `"closed"` 且宽 ≈0 → 收尾后按钮挂载且不在 inert 子树。断言与需求逐条对应。
- **CD-08 焦点不抢（:132-146）**：正文输入框聚焦 → hide → 运动中（120ms）转焦「外部焦点」→ 断言 closing 帧存在且无按钮、收尾后外部按钮保持焦点、按钮仍出现。直接锁定 183 P1。
- **改写的 CD-01 reversal（:64-86）**：命令驱动 hide→toggle→toggle（宽屏分派 :464，与旧用例同机制产生两类相位）；保留实例断言（:81）、`assertFixedFrames` 几何固定（:74）、键盘 Enter 重开（:82-85）并新增「opening 帧无按钮」。原有效覆盖（实例保留、几何固定、键盘重开）未丢失；运动中命令反转另有 CD-01 same-task（:197-205）与 CD-02（:148-175）双重锁定。
- **被删用例覆盖去向**：「repeated … follows the visible restore control」与「held actual pointer recovery」的前提（运动中可见/可点的移动按钮 + pointer capture）即本次需求禁止的行为，删除合法；静态终态真实点击/键盘操作恢复按钮仍由 CD-01 首次开闭（:60）、CD-04 reduced（:305）、CD-05（:317-318）覆盖；`clickMovingRestore` 与 `recoveryPointer` 全仓 grep 无残留引用。
- **fixture `restore` 字段**：类型 :113；`captureSample` 在 :122 计算（早于 :124 `if (!inner || !viewport) return empty` 早退），同时落入 `empty` 兜底（:123）与完整返回（:156 `...empty` 展开），两路径字段齐全，符合 183 P3 实现要点；函数自包含（仅 DOM 全局），经 `new Function` 序列化注入（:162）兼容。
- **CD-05 时序窗口**：新兜底聚焦落在 ≈420ms+2 帧+layout effect（约 455–490ms），小于 :316 的 520ms 等待（181 §7 已分析，含 30fps 降速余量）；余量较旧实现收窄但充分，列为已知取舍。
- **未能确证**：TDD RED/GREEN 的实际执行结果与 11 个 caption 拼接/hook 共享套件（182 V06）运行结果，属 185 验证报告范围，本审核未执行。

## 5. 副作用面 —— 结论：通过

- `git diff` 无计划外改动：ChatPanel 仅删 `onPointerDown` 块与换注释；useSidebarDrawer 恰好 4 处（runtime 初始化 :49、收尾置位 :356-359、layout effect 消费 :531-541、apply 重置 :618）加 :639 条件；测试与 fixture 如清单。
- **AST 提取不受影响**：8 处提取点（content-drawer-fixture.ts:16、sidebar-drawer-fixture.ts:27、caption-alignment.test.ts:18、chat-caption-safe-area.test.ts:18、sidebar-restore-safe-area.test.ts:18、workspace-surfaces.test.ts:24 均匹配 `desktop-drag`+`h-11`；pane-window-drag.test.ts:19 匹配 `h-11`；ai-caption-message-drag.test.ts:33 匹配 `className="desktop-drag flex h-11` 前缀）全部锚定 header 外层 className，而 `ChatPanel.tsx:1692` 的 className 本轮未动；编辑只删一个 button prop 与注释，未引入新自由标识符，各 stub（content-drawer-fixture.ts:87 等）提供标识符仍然充分。

## 6. AGENTS.md 遵循 —— 结论：通过

- 无以模拟接口冒充真实验证：fixture 为 esbuild 现场打包真实 DashboardShell/useSidebarDrawer/ContentTabs + AST 提取的真实 caption，playwright-core 无头 Chromium 驱动，文档（182 :3）如实声明。
- 保留他人修改：diff 仅含本轮 4 文件；文档为 180–183 过程文档与本报告，无计划外文件。
- 验证范围遵守「禁止全量测试」约束（180 :61-65 定向清单 + typecheck），本审核未越权执行任何套件。

## 发现的问题

- 无 P1（必须修）、无 P2（应修）。
- **P3-1（建议/理论备注）**：收尾 `"closed"` 更新与 show 命令同批提交时 `contentSettleFocus` 消费门控理论上可跳过导致标记残留；与既有 `contentRestoreFocus` 模式同构、实际不可达、重置路径完备（useSidebarDrawer.ts:531-541 vs :542-550、:618）。记录备查，不要求处理。
- **P3-2（已知取舍）**：CD-05 焦点断言 520ms 窗口余量收窄至约 30–65ms（useSidebarDrawer.ts:355→:531 链路，content-drawer.test.ts:316），181 §7 已论证充分；若 CI 环境出现抖动可优先考虑放宽该等待而非改实现。
- **P3-3（环境说明）**：RED/GREEN 与 V06 定向套件执行结果未能确证（本审核为静态 code review，执行证据以 185 验证报告为准）。

## 总体结论

**批准。** 核心条件 `contentHidden === "closed"`（useSidebarDrawer.ts:639）在所有相位来源（showContent/hideContent/借相位/resized/apply/窄屏/全屏）下同时满足两条 2026-10-15 需求，无新增相位死角；`contentSettleFocus` 焦点兜底的置位/消费/重置完备，183 P1 防抢焦点门控逐字落地且与帧循环原路径无冲突；注释全部与新行为一致；CD-08 三条用例断言真实对应需求，改写与被删用例的覆盖去向完整；fixture 增量正确；改动面与 AST 提取兼容性核实无计划外影响。合并前请以 185 验证报告补齐定向套件与 typecheck 的实际执行证据。
