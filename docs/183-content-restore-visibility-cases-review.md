# 182 用例独立审核

日期：2026-10-15。审核对象：docs/182-content-restore-visibility-cases.md（右侧面板恢复按钮显隐时序回归用例，V01–V07）。审核方式：只读对照真实源码、react-resizable-panels v4 安装包与既有测试逐条核实，未修改任何文件。前置：180 方案已按 181 审核（P1–P4）修订，本文对照修订后版本（docs/180-content-restore-visibility-plan.md:50-65 修订记录与目标执行范围）。

## 逐条核实

### 1. V01/V02「同一同步任务内」断言 —— 结论：成立

- 同步提交链：showContent（useSidebarDrawer.ts:419 update({contentVisible:true,...}) + :424 lockContent(true,true)）与 hideContent（:442 update + :443 lockContent(false)）均在事件处理器内同步执行，lockContent 于 :175 同步提交 contentPhase:"opening"/"closing"；toggleContent（:460）宽屏分支按 state.current.contentVisible 分派：初始 closed 时 contentVisible=false，恢复按钮点击走 showContent；面板打开时收起按钮点击走 hideContent。方向正确。
- React 19（package.json:54，react 19.2.4）对 click 离散事件仍在事件派发内同步 flush（SyncLane + dispatch 末尾 flushSyncCallbacks），故 page.evaluate 中 button.click() 返回后同一任务可读已提交 DOM。data-content-phase 与恢复按钮同受 view 驱动、同一提交原子落地（DashboardShell.tsx:29 data-content-phase={drawer.contentPhase}、:45 传 contentHidden），不会读到「相位已变、按钮未变」的混合态。
- 宽度 < 1px 可靠：V01 初始 contentMounted=false（useSidebarDrawer.ts:25 初值，fixture 无持久布局），点击后同一提交 contentMounted false→true、Panel id="content" 以 defaultSize={0} 挂载（DashboardShell.tsx:47-49）。react-resizable-panels v4 安装包实证：未注册布局时 Panel 渲染 flexBasis: defaultSize 且 flexGrow: 0（node_modules/react-resizable-panels/dist/react-resizable-panels.js:3527-3532），故同任务视口宽度为 0。captureSample 视口查询 .content-drawer-viewport ?? #content（content-drawer-fixture.ts:121）在该提交即存在；即便走 :122-123 empty 兜底，visible 亦为 0，< 1px 断言恒真且语义即「动画尚未播放」。
- RED 方向同样确定：旧实现 contentHidden = phase !== "open"（useSidebarDrawer.ts:624 现状），V01 点击后同任务相位 "opening" 仍满足旧条件 → 按钮同任务仍在；V02 点击后 "closing" → 按钮同任务出现。RED 可观测、非概率性。

### 2. V02 ContentTabs 按钮选择器 —— 结论：成立

- 「显示 / 隐藏内容面板」按钮在 ContentTabs.tsx:200-208，仅 !strip.compact 渲染；compact 判定 tight = available < size*3 + gap*2 + captionGap（useContentTabStrip.ts:124），阈值约 90px。fixture 视口 1280（content-drawer-fixture.ts:95 默认）、1 个 Tab 时内容 caption 可用宽约 340px（目标内容宽约 (100-20)/2 ≈ 40%，useSidebarDrawer.ts:422），远不触发 compact；openContent()（fixture :171-176）走有 Tab 分支（ContentTabs.tsx:96-211），按钮稳定存在，onClick={onToggleContent} 即 DashboardShell.tsx:53 的 drawer.toggleContent。按 role + exact name 命中 :202 的 aria-label，选择器正确。

### 3. V03 反转序列与逐帧无按钮断言 —— 结论：成立

- 命令序列 hide →（运动中）toggle → toggle 在现有 hook 上产生两类相位：hide 后 contentVisible=false（:442），首个 toggle 走 showContent（"opening"），再 toggle 时 contentVisible=true（:419）走 hideContent（"closing"）（分派点 :460 宽屏分支；V03 默认 1280 宽屏）。与被改写旧用例（content-drawer.test.ts:82 曾断言两类相位均出现）机制一致。
- RED 稳定性：旧实现下运动相位帧（"opening"/"closing"）恢复按钮确定性存在（!== "open" 全程为 true），逐帧断言「运动帧无按钮」必失败，非偶发。
- 键盘 Enter 重开：终态 "closed" 后按钮存在，press("Enter") 触发 click → showContent，与既有 :85-87 模式相同。assertFixedFrames 几何比对沿用 complete 参考，无新增前提。

### 4. V04 时序窗口 —— 结论：成立（附 P1 场景缺口）

- 帧链：hide 动画 420ms（宽屏经 startAxis :406）→ 同帧 :318-327 清 secondary → :329-346 settle 第一分支（提交拓扑、contentSettling=true、kick()）→ 次帧 :347-357 收尾提交 "closed" → React 提交（按钮同提交挂载）→ 现有 useLayoutEffect（:512-536）消费兜底。合计约 455–490ms < CD-05 的 520ms 窗口（content-drawer.test.ts:288-289）。captionPreparation 仅在 opening 路径置位（lockContent :164-165，hide 传 opening=false；:172 对 !goal 再清），hide 路径不引入额外等待帧，无此不确定性。
- fixture 环境下 focusContentRestore（:189-197）门控全通过：win32 平台、无对话框（:191）、按钮同提交挂载且 width>0、chat 宽屏非 inert（:625）、选择器 .workspace-chat [data-content-restore] 命中 stub 渲染的真实 caption 按钮（fixture :87）。
- 但发现一处需求外、设计内的场景缺口（见 P1）：自然收尾（contentGoal=false）且用户在 420ms 运动中已把焦点转移到内容外时，按 180 设计 2 的现行表述（「若 contentClosingFocus 仍成立则调 focusContentRestore()」），兜底会在收尾时抢占用户已转移的焦点；182 用例集（含 CD-05 三段）均未覆盖该时序窗口。

### 5. fixture 增量字段 —— 结论：成立（附 P3 实现注意）

- ContentSample 类型（content-drawer-fixture.ts:112-116）、captureSample（:120-156）、empty 兜底（:122）三处补 restore: boolean 充分；framesDuring（:159-169）以 captureSample.toString() + new Function 序列化注入页面，函数自包含（仅 DOM 与已擦除的类型），新字段兼容。
- 注意：restore 须在 :123 的 early return 之前计算（初始 contentMounted=false 时无 .content-drawer-viewport/#content，会走 empty 分支，而此刻恢复按钮恰恰存在）；若在 empty 中硬编码 false，V01 前置「确认按钮存在」经 sample 读取会失真。182 只说「:122 empty 兜底对象同步补字段」，未写明计算位置，见 P3。

### 6. 删除清单 —— 结论：成立

- clickMovingRestore 全仓仅 3 处：定义 content-drawer.test.ts:13、使用 :78-79，均在待删/待改写范围内，删除安全。
- recoveryPointer 监听代码（:93-99）整体位于被删用例 :90-118 体内，随用例一并删除，无残留引用。:9 的 restore 选择器仍被 :69、:85、:277、:289 使用，保留正确。initialAppRegion/assertPausedRegions 为 CD-07 所用，不受影响。

### 7. V06 的 11 个文件 —— 结论：成立

- 与 180 修订版目标执行范围（docs/180-content-restore-visibility-plan.md:61-65）逐一对应：180 列 12 个 browser 文件 = content-drawer.test.ts（V01–V05 承载文件）+ V06 的 11 个，无多无少。
- 机制核实：sidebar-drawer.test.ts、sidebar-drawer-intent.test.ts、sidebar-drawer-measurement.test.ts、sidebar-drawer-resize.test.ts、sidebar-surfaces.test.ts 均经 withDrawer（sidebar-surfaces.test.ts:5 等）共享 sidebar-drawer-fixture 的真实 DashboardShell + 真实 hook + AST 提取的真实 caption（sidebar-drawer-fixture.ts:22-31），stub ChatPanel 接收真实 contentHidden（:75）；workspace-surfaces.test.ts:19-29、caption-alignment.test.ts（:25 起）、ai-caption-message-drag.test.ts:14-42、chat-caption-safe-area.test.ts、pane-window-drag.test.ts、sidebar-restore-safe-area.test.ts 各自 AST 提取真实 caption 拼入合成外壳。
- contentHidden 用法性质：pane-window-drag.test.ts:37、workspace-surfaces.test.ts:57、caption-alignment.test.ts:29 为自有常量/默认参数，ai-caption-message-drag.test.ts:58 为自有 state——均不依赖 hook 时序；全 grep 未发现任何文件断言「动画中存在恢复按钮」类旧时序（sidebar-drawer* 用的是 [data-sidebar-restore]，sidebar-drawer.test.ts:9）。

### 8. 需求覆盖 —— 结论：两条需求均有直接断言，无阻塞缺口（两处可选补充见 P4）

- R1：V01 同任务移除 + 全部 "opening" 帧无按钮 + 收尾 "open" 按钮不在——直接、完整。R2：V02 同任务无按钮 + 全部 "closing" 帧无按钮 + 「首个含按钮帧相位必为 "closed" 且可见宽度 ≈0」（相位与按钮同提交，不会读到混合态）——直接、完整。
- reduced-motion：CD-04（content-drawer.test.ts:269-279）在 reduce 下断言收起直达 "closed" 且无中间宽度，并于终态使用恢复按钮（:277）；duration 0 时不存在可采样的运动帧，R1/R2 的同任务语义与有动画一致，可视为隐含覆盖。是否加 reduced 变体属可选。
- 「展开动画期间再次点击」：新设计下运动中无按钮可点，命令路径反转由 V03 覆盖。「apply 后按钮状态」：apply 直写终态（useSidebarDrawer.ts:613），CD-04（:222-267）覆盖 restore 至隐藏布局后 "closed" 且后续交互正常，非需求缺口。
- 可选补充（非阻塞）：侧栏/全屏借用相位的「不再闪现」附带修正无专项断言；reduced-motion 下同任务显隐无专项断言。

### 9. TDD 顺序与命令 —— 结论：成立

- 182 §TDD 顺序（fixture+V01–V03 对未修复代码确认 RED 并记录断言原文 → 实现 → V01–V07 GREEN 并记录命令与结果到 185 → 明确豁免其余套件）与 AGENTS.md 顺序及用户「禁止全量测试」约束一致。
- 命令形态与仓库现状一致：仓库浏览器套件标准调用为 node --import tsx --test --test-concurrency=1 [--test-reporter=tap] tests/browser/<files>（scripts/check-workspace-surfaces.mjs:18-22；证据解析依赖 tap 汇总行，:43），并默认注入 SHAKEINK_TEST_CHROMIUM（:31）。182 未写死命令、要求「记录实际命令与结果到 185」，可接受；建议执行时带 --test-reporter=tap 以便证据台账提取通过/失败计数。

## 发现的问题（按严重程度）

- P1（中）焦点兜底在「运动中用户转移焦点 + 自然收尾」窗口抢焦点，且用例集无覆盖：新时序下 hide 开始后内容立即 inert、Chromium 将焦点重置到 body；若用户在 420ms 内把焦点移到内容外（如点击外部按钮），收尾时 contentClosingFocus 仍为 true，按 180 设计 2 现行表述兜底会无条件 focusContentRestore()，抢占用户焦点，违背既有「用户已主动转移……不抢焦点」原则（docs/reviews/2026-10-13-content-drawer-plan.md:43）。CD-05 三段均避开该窗口：第二段（content-drawer.test.ts:296-299）在 settle 前 toggle 反转（contentGoal=true 不置位标记）；第三段（:300-302）hide 时焦点本就在内容外（captureContentFocus :179 得 false）；CD-04 由 apply 重置（:603）兜底。修正建议：实现时在 layout effect 消费点增加门控——仅当 document.activeElement === document.body（或焦点仍在已 inert 的内容子树内）时才恢复焦点；并在 182 增补一条断言（hide → 运动中外部 focus → 自然收尾 → 断言焦点不被抢），或在文档中显式记录该权衡及理由。此修订同时完善 V04 语义。
- P2（低）V05 行号引用自相矛盾：182 称「终态使用恢复按钮的断言（:69、:85-87、:277、:289）不受影响」，但 :85-87 属于被改写为 V03 的用例（:73-88）体内，其「收尾键盘重开」已并入 V03 描述，不属于「其余用例不受影响」。修正建议：从 V05 引用中删去 :85-87（保留在 V03 描述中即可）。
- P3（低）fixture restore 字段计算位置未写明：须在 content-drawer-fixture.ts:123 early return 之前计算并同时落入 empty 与完整样本，否则初始未挂载样本恒为 false。修正建议：在用例变更条目或实现说明中写明「early return 前计算」。
- P4（低，可选）：reduced-motion 下同任务显隐、侧栏借用相位不闪现，均无专项断言；现有隐含覆盖可接受，建议记录为已知取舍，不阻塞。

## 总体结论

需修订后批准。V01–V07 的输入、选择器、相位/几何/时序断言经源码与安装包逐条核实均可执行且 RED/GREEN 方向确定；fixture 增量与删除清单完整；V06 范围与 180 修订一致；TDD 顺序与约束合规。需修订项：P1（焦点兜底增加防抢焦点门控并补一条对应断言，或显式记录权衡——涉及 180 设计 2 与 182 用例各一句），P2/P3 文档表述修正，P4 可选记录。修订均为局部增补，完成后无需再次完整审核，可在 TDD RED 阶段一并确认。
