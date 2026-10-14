# 右侧内容抽屉修复实现

日期：2026-10-14。用户已批准 [HTML 交互稿](../../design/content-drawer/index.html)，并确认“此任务目前已满足要求，可以直接收尾了”。本需求已按该确认完成并收尾。本文件承接 [调研](../../design/content-drawer/research.md)、[实施方案](2026-10-13-content-drawer-plan.md) 与独立方案/用例审核。正式实现已通过独立代码审核及 62 项新旧浏览器专项；完整结果和未执行边界见 [验证记录](2026-10-14-content-drawer-verification.md) 与 [总结](2026-10-14-content-drawer-summary.md)。

## 固定形态与统一布局写入

正式 `DashboardShell` 为真实 `ContentTabs` 增加裁切视口和右锚内层。内层记录完整宽度 W、高度 H；可见占位宽度 V 仍由原 Group 布局协调器控制，内层仅作 `translateX(max(W−V,0))` 平移。文字、标签、表单和编辑器继续在固定 W/H 内排版，动画中不跟随 V 缩窄。

`useSidebarDrawer` 保持唯一 Group writer。右内容有独立冻结几何和 phase；快速换向、左导航同时运动或全屏替换轨道时，保留冻结形态至相关轨道和合法终态完成。首次展开等待实际 Panel 注册并扣除 separator 后确定目标宽度；不能把 V=0 的准备阶段当成首个可见完整形态。窗口宽高变化在动作内改变裁切，完成后才恢复正常尺寸；900px 断点同样延迟切换模式。

保持挂载的标签条可能仍持有上一窄屏宽度的测量结果。跨断点后的首个可见帧曾测得标签宽 27px，最终为 55px。为此通过局部 context 注册真实 caption 准备函数：先将完整 W/H 写入 DOM，同步计算 viewport capacity；compact / overflow 所需工具必须经 React 提交并与实际 DOM 一致，才允许 V 从零开始移动。等待依据真实准备结果，不按任意固定帧数延迟；不改变标签排序或业务组件。

窄屏内容从右缘以全宽形态移入。返回对话只关闭覆盖层，保留桌面显示偏好；真正隐藏内容面板才改变 contentVisible。隐藏后 Panel、ContentTabs 和已打开的业务实例继续挂载，占位归零并移除右 separator。工作区 restore 取消旧轨道、冻结及延迟焦点，不让历史动作覆盖新状态。

## 交互、浮层与原生标题栏

动画或隐藏阶段的内容通过 inert / aria-hidden 暂停交互。对话标题栏保留可见恢复入口，支持动画中换向。仅在恢复流程仍持有焦点时才回到此前控件；用户已转移焦点或存在业务 Dialog 时不抢焦点。

内容局部 `content-drawer-context.tsx` 将暂停和冻结的 caption zoom 传入真实 React 组件及其 Portal。内容所属的共享 DropdownMenu、Tooltip、Select，以及 ItemLevelPicker 的直接 Popover 暂停关闭；恢复时旧的 open 意图不能自动复活。共享 Dialog 重置此局部上下文，维持业务弹窗输入与内部 Select 的可用性。局部上下文外的共享组件保持原有行为。

浮层回调先通知调用方并读取 Base UI 实际 `isCanceled`，取消后不提交本地 open。稳定的菜单 Root 保留暂停历史，避免卸载后重挂的受控 / defaultOpen 子菜单复活。Tooltip 的布局 enter 即使 trusted 也不代表新输入；局部门控只在同一可用 trigger 上的新实际输入后处理新意图，保持真实事件与取消 getter，press 不重放旧 hover，退出 / 暂停 / 卸载清理等待及监听。

标签拖拽在暂停时取消，不提交排序，取消延迟焦点。编辑命令目标排除不可见或 inert 祖先，保留编辑器实例不会使隐藏编辑器接收全局编辑命令。内容内部 app-region 在动画/隐藏时置 initial，完成后恢复标题栏 drag 和控件 no-drag；真实 Windows 命中需要另行执行 HWND 验证。

caption 的比例及安全 padding 在动作内使用冻结 zoom；显式整窗 zoom 仍由原生 main 立即应用。因此保证的是抽屉动画期间的 CSS 排版几何，主动 zoom 的物理像素变化另行记录。

## 范围与证据

生产改动限定于 Shell、原布局 hook、ContentTabs/ChatPanel 标题栏、标签拖拽取消与真实 caption 测量准备、桌面 CSS、局部上下文、共享浮层/Modal 边界、直接 ItemLevelPicker Popover 以及命令目标可见性门控。没有复制 HTML 示例进产品，没有替换 29 类业务组件、MarkdownEditor、AI 或 composer。

13 个原生产文件的修改前精确快照保存在 `docs/evidence/content-drawer/baseline-sources/`，独立代码审核以该基线及新局部上下文为范围。此前保存的全 core 基线还包含既有失败；另一个已提交导航修订改变了 SidebarHoverCard 和 sidebar-drawer-fixture，验收报告应记录此差异，不能将所有源差异归于本次抽屉修复。

未修复版本的可见根因 red 为 `docs/evidence/content-drawer/red-02/root-cause.tap`：双主题首个可见帧的内容宽度分别为 7.421875px、26.125px，预期完整宽度为 436.40625px。更早的 red-01 是零宽注册准备阶段的 oracle 诊断，保留但不作为可见挤压根因证据。最终 green、全套回归、构建、真实 Windows/目录包执行及其限制将写入验证报告。

Restore 保留合法 target 的局部 pin，防止分栏库新注册后的晚回调把已写入的 25% 改成 24.941%。queued restore 和自身 API 写不能当作注册完成；真实非用户完成回调须在新 separator 拓扑中经唯一 writer 确认精确 target 才移交。实际拖动又证明库等到 pointer-up 才报告用户 meta，过晚移交会让 observer 在中途钳回旧比例。因此 `releaseActiveRestore` 只检查当前 Group 的 direct active separator，在 repinCurrent 和 queued owner frame 任何写入前移交；callback / MutationObserver / ResizeObserver 都经该入口，结束和键盘 user meta、新命令、真正窗口宽高变化、restore / unmount 同样清旧保护。没有固定等待或永久限制手动分栏。

`restore-pointer-red-01/restore.tap` 在真实 hover / active / down / move40px / up 后仍测得 Group sidebar 319.5px / flex25，是手动拖动的实际失败；更早 `restore-green-01/02` 只是 1px border 的 DOM contains 定位不合库 expanded hitRegion 契约，分别保留。最终等同输入判据使用同 Group、非 inert、无外部遮挡的实际 client 点及库真实 hover/active，再检查 Group / 偏好增量和 240ms 不回滚；`restore-green-04/restore.tap` 原 25/40/35 精度及实际拖动均通过，未放宽目标比例。

移动恢复按钮的手势收敛单独记账。`green-04/drawer-suite.tap` 为 61 tests / 60 pass / 1 fail，原快速换向终态曾为 open 而非 closed，但全部几何与旧相关用例通过；只读 `reversal-diagnostic-01/report.json` 六次都实际双 click、终态 closed，不能把原单次偏差称为已证明的 capture 根因，也没有删去原用例。独立追加真实 held pointer，driver 用 `locator.click({force:true,delay:80})` 采新鲜中心执行 down/up，只省去 stable 等待；仍严格检查 trusted down 命中 / closing / 非 inert、client 原点不变、按钮实际移动超过半宽、trusted up/click 接收、open 终态和全部逐帧形态。

`red-06/held-pointer.tap` 的早期 down 已未命中按钮，仅作 setup 诊断保留。等同驱动修订后的 `red-07/held-pointer.tap` 为 1/0/1、page errors 空，实际 down、固定点与真实位移前置全部通过，pointer-up 的真实 target 离开恢复按钮。这才支持局部修订：ChatPanel 的右恢复 caption 按钮仅对 primary mouse/button0 的 pointerdown 调用浏览器 `setPointerCapture`，保留既有 onClick、键盘、no-drag 和外观，正常 up/cancel 释放；不模拟业务回调、不固定位置。修订后 `pointer-green-01/held-pointer.tap` 原 instant 与新增 held 2/2 pass，最终组合仍保留并通过原快速换向要求。

冻结源专项为 `docs/evidence/content-drawer/green-05/drawer-suite.tap` 与 `run.json`：bundled Node v24.19.0、真实 Chrome、TAP、concurrency=1，62 tests / 62 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo，169.29 秒，退出 0；新增 29（main 18、popup 11）及旧相关 33。执行前后对全部 13 份原生产文件、新 context 和 3 份测试/fixture 计算 SHA-256，`stableSources=true`；独立审核也核对当前源与结果相同。浏览器复用真实外壳、标题栏及 primitive，但隔离部分业务 body；此结果不代替真实 Monaco / 29 类业务 / 原生 HWND / 目录包冷启，也不把既有 core 的 39 fail、1 cancel、2 skip 称作全仓通过。

后续原用例的最小契约迁移经独立审核，最终全量浏览器 `regression-browser-02` 为53文件559/559通过。`build-02` 的类型检查、命令生成、Prisma、Next及desktop五阶段通过；生成命令目录只更新本次command-runtime的source hash，Windows401/Darwin417条命令内容不变。测试迁移后的 `final-typecheck-01` 仅执行tsc并通过，不另称重建。`package-01` 目录打包与340项包内资源检查通过。实际开发构建21有44段/80check部分通过，22因主动缩放迟到整轮failed；目录包动画未执行。用户确认现有结果满足要求后停止追加验证，失败及未执行项详见验证记录。上述浏览器/构建阶段的14份生产源与最终专项一致；随后原生测试脚本定位与测量修订不修改生产代码。
