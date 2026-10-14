# 右侧内容抽屉独立代码审核

日期：2026-10-14。审核者：独立子代理 `content_drawer_review`。最终结论：**七项 P2 已完成实际 red → 最小修订 → 对应用例 green，最终稳定源的 62 项组合全部通过；当前范围未发现阻断，准入主代理全量回归、匹配构建及真实目标系统验证**。这不是产品验收或最终总结批准。

## 范围与证据边界

逐份比较 `docs/evidence/content-drawer/baseline-sources/` 中 13 个生产源文件的精确快照与当前同路径文件，另审核新增 `src/lib/desktop/content-drawer-context.tsx`。使用 `git diff --no-index -- <snapshot> <current>`，退出 1 表示有差异。未以当前 HEAD 或整个工作树差异代替本任务基线。已提交导航修改的 `SidebarHoverCard.tsx`、`sidebar-drawer-fixture.ts` 不属于本次变更。

审核只写授权范围内的审核报告，没有修改生产和测试。实现文档为进行中草稿；审核者未执行真实 Windows 产品、构建或目录包验收。此前可见根因 red 及后续 green 的原始记录由主代理保留；不能将不可见零宽注册帧的旧失败当成可见挤压证明。

## 已关闭的问题与审核历史

### P2-1：局部浮层状态未尊重调用方的取消

初审 `src/lib/desktop/content-drawer-context.tsx:24–28` 在调用 `props.onOpenChange` 前清除 blocked、更新 localOpen。共享 DropdownMenu / Select / Tooltip 在内容 owner 内改为受此 localOpen 控制，因此调用方调用公共 `details.cancel()` 后，局部状态仍可打开 Popup。Base UI 的 `internals/createBaseUIEventDetails.d.ts:63` 明确提供 `isCanceled`，取消不能仅留给底层已经被外部 open 覆盖的状态机处理。

最小修订：先通知调用方，确认 `details.isCanceled` 为 false 后才提交局部 open / 解除闩锁。暂停强制关闭仍是 owner 约束；内容 owner 外应继续原 primitive 语义。新增真实取消用例已只读审核：当前 `tests/browser/content-drawer-popup.test.ts:155–160` 检查真实回调计数为 1 且 Popup 未打开，防止以 disabled 绕过回调取得假绿。

补审：当前 context `29–36` 已先调用 caller，再检查真实 `details.isCanceled`，随后才解除 blocked / 提交 localOpen；对应 red-03、green-03 及最终 green-05 已闭环。

### P2-2：SubmenuRoot 未参与 owner 暂停，旧意图可跨父层重挂复活

初审 `src/components/ui/dropdown-menu.tsx:111–112` 仍直接返回裸 `MenuPrimitive.SubmenuRoot`，与顶层 DrawerDropdownMenu 的局部控制协议不同。SubContent 的 Positioner 暂停隐藏能阻止当前帧命中，却不能清除受控 open / defaultOpen 的旧意图。父 Popup 退出后子 Root 可卸载；重新打开父菜单会重挂子 Root，单纯在子 Root 的 effect 中记录“曾暂停”不足以覆盖此生命周期。

这不是未使用 API 的假设：真实 `ChapterContentPanel.tsx:360–368` 使用共享 DropdownMenuSub；Base UI `menu/submenu-root/MenuSubmenuRoot.d.ts` 保留 Root 的 open / defaultOpen / disabled 契约。最小修订：SubmenuRoot 使用相同暂停和取消协议，并让稳定的父 Root 或内容 owner 保存暂停事实，使重新挂载子层的旧意图仍保持关闭。首次挂载且从未暂停时仍应尊重默认/受控行为；新子 trigger 操作可以恢复打开。

新增真实 controlled / defaultOpen 子菜单用例已准入 red-03：当前 `content-drawer-popup.test.ts:163–180` 实际打开父层和子层、无外部点击调用真实 Shell hide、检查首 rAF 两层不可用、重开父层后子层不复活，再由新的子 trigger hover 打开。没有替换 primitive 或修改业务 store 来模拟结果。

补审：当前 `dropdown-menu.tsx:14–16,111–117` 顶层和子层均提供稳定 Root 的暂停历史 Provider 并使用相同 helper；context `18–27` 在重挂子层时继承暂停历史，首次未暂停的默认状态仍保留。局部 context=null 时仍走原始 primitive，Modal 子树不会因为祖先 Popup 历史而暂停。对应 red-03、green-03 及最终 green-05 已闭环。

已实际读取 `docs/evidence/content-drawer/red-03/popup-review.tap`：3 tests / 0 pass / 3 fail，cancelled=0、skipped=0、todo=0。真实 cancel 用例失败于 Popup 实际仍为 true；controlled 和 defaultOpen 子菜单均失败于重开父层后旧子浮层实际为 true；三项 fixture page errors 均为空。这是上述共享层问题的真实 red，不计产品 green。后续 `green-03/popup.tap` 真实 11/11 专项包含三项对应成功，补审闭环；最终组合仍须在最终稳定源重跑。

## 已核查的实现路径

以下行号已按 green-05 的最终稳定生产源重核。caption ready、restore 及真实指针的实证收敛另列在后续 P2。

| 要求 | 当前源码依据与审核判断 |
| --- | --- |
| 固定完整形态 | `DashboardShell.tsx:49–57` 的 viewport / inner 包住真实 ContentTabs；`useSidebarDrawer.ts:120–131,156–176,222–229` 记录 W/H、首次注册后准备完整 W，以右锚 `translateX(max(W−V,0))` 平移；`desktop.css:505–507` 裁切视口而非缩放内层。首次展开可用宽 `hook:77–90` 从 Group borderbox 扣除真实 padding / border / separator borderbox 与 margin / gap，避免读取暂时的旧 Panel 注册宽；与库 dist `336–343` 的可用 flex 空间语义相符，未改左侧原 availableWidth。 |
| 首可见真实控件 | hook `66–69,265–276` 注册稳定准备回调，实际 caption ready 前保持 V=0 及未启动轨道；`ContentTabs.tsx:49` 的 layout effect 注册/清理真实 `strip.prepare`，空 Tab 返回 true；strip `115–146` 同步测量真实已提交 compact / overflow 与 capacity。 |
| 唯一 Group writer | hook `203–210` 唯一 `Group.setLayout`；rAF、注册 repin 与恢复均经过该函数。`230–244,542–563` 观察 Group / direct Panel 布局根，未观察业务子树。 |
| 换向/全屏替换 | hook `156–176` 已冻结时保留 W/H，`403–407` 替换最新 secondary；`461–474` 隐藏或 closing 全屏忽略，open/opening 全屏保留冻结。`328–355` 等所有相关轨道完成，先提交终态拓扑，再写合法终态、解冻。最终逐帧专项通过。 |
| 窄屏与偏好 | hook `409–430` 首 show 同时设 visible=true、全宽像素轨道；`449–459` 返回对话仅关闭覆盖层并保留 visibility 偏好，`460` 切换依据当前 overlay goal；`329–346,565–579` 动作期间延迟模式变化并按最新 intent 提交终态。 |
| 实例保活 / restore | hook `433–448` 收起不卸载；`597–614` restore 取消全部轨道、冻结、待执行焦点，`contentMounted=旧 mounted 或新 visible`；没有复制或替换业务组件/编辑器。冷启隐藏从未挂载与收起后保活是不同状态。 |
| 焦点与 Modal | hook `177–196,527–540` 仅在恢复入口仍持有焦点所有权时恢复旧控件，业务 Dialog 排除；共享 `dialog.tsx:12` 重置局部 context=null，Portal 子树输入和内部 Select 沿用正常语义。 |
| 标签取消 | `ContentTabs.tsx:51–57` 暂停边沿关闭菜单并 strip.pause；`useContentTabStrip.ts:207` 取消延迟 focus 并 `finish(false,false)`；finish `73–84` 不排序、不公告/回焦，先清 drag 再 release capture。 |
| 隐藏命令 | `command-runtime.ts:45–52`、`use-command-target.ts:9` 用连接、真实 rect 与 inert / hidden / aria-hidden 祖先排除保活但不可交互的编辑目标，rootless 全局布局命令仍可用。 |
| 原生标题栏 | `desktop.css:508–515` 暂停内容及所属 Portal 的 app-region；ContentTabs `43–47,69,72,81,101` 使用冻结 captionZoom / sidebar 按钮状态。CSS 检查不能替代真实 HWND 命中。 |
| 移动恢复按钮的实际手势 | `ChatPanel.tsx:1726–1731` 仅对真实 primary mouse / button0 的按下设置 pointer capture，保留原 onClick、键盘和 no-drag；正常 pointer-up / cancel 由浏览器释放 capture，无强制回调代替输入。 |

## P2-3：Tooltip 在抽屉移回静止鼠标下时自动复活

源码核查 Base UI TooltipRoot `79–83` 的 disabled 关闭、TooltipTrigger `147–172` 的 hover/focus disabled 门控及共享 helper；当前普通 Tooltip 用例将鼠标移开，不能据它单独声称证明所有 stale 事件情形。

独立只读 Chrome 诊断使用已有真实 Shell fixture：`Node v24.19.0 --import tsx --input-type=module`，启动实际 Chrome，focus 打开真实“内容提示”→真实 Shell callback hide→关闭完成→没有新 trigger 输入的 callback reopen。命令退出 0，fixture page errors 为空；采样为 `{popup:true,focus:"内容提示",phase:"open"}` → `{popup:false,focus:"显示内容面板",phase:"closed"}` → `{popup:false,focus:"内容提示",phase:"open"}`。这个实际路径没有复现程序回焦复活，不能据此覆盖 hover。

随后在取消 / 子菜单 helper 修订已落盘的版本，实际 hover 打开同一个真实 Tooltip，保持鼠标静止，调用 Shell hide→等待 540ms→Shell toggle→等待 1200ms，无鼠标移动、点击、键盘或 trigger 事件注入。命令退出 0、fixture page errors 为空；采样为 `{popup:true,focus:null,phase:"open"}` → `{popup:false,focus:null,phase:"closed"}` → `{popup:true,focus:null,phase:"open"}`。因此布局移回旧鼠标位置仍会重开 Tooltip，违反批准方案“新的用户主动打开才恢复”。现有 `content-drawer-popup.test.ts:88` 主动移开鼠标隐藏了该路径。

独立事件 trace 命令也退出 0、无 page errors：closing 时只有 `pointerleave/mouseleave`，open 时出现 `pointerenter/mouseenter`；同一 client 坐标、movementX/Y=0，期间没有 pointermove / mousemove，四事件均 `isTrusted=true`。因此布局产生的 enter 也是可信浏览器事件，不能仅用 isTrusted 或 trigger-hover reason 作为新主动操作的判据。

初审提出最小修订：新增同样的真实静止鼠标用例并保留其 red，再由内容 owner 的 Tooltip / helper 门控区分旧 hover 或布局产生的 enter 与新的用户操作；关闭后首次显式新 hover / 键盘操作仍应正常可用。不要禁用 owner 外 Tooltip、业务 Dialog 的浮层或通过全局 Escape 处理。

已只读准入 `content-drawer-popup.test.ts:95–114`：静止鼠标恢复后 Popup 必须关闭，随后同一 trigger 内实际移动 2 CSS px 必须能开，原 mouse-away / new-hover 用例保留。已实际读取 `docs/evidence/content-drawer/red-04/tooltip-stationary.tap`：1 test / 0 pass / 1 fail，cancelled / skipped / todo 均 0、page errors 空；失败于无新输入情况下 Popup 实际仍为 true。该 red 后才允许修改 Tooltip 专属输入门控。

补审 `tooltip.tsx:26–129`：仅内容 owner 的 DrawerTooltip 使用输入 gate。缓存的 hover details 是真实 Base UI 未取消对象，暂存时没有先通知 caller / 调用 cancel；只在同一连接、可见、非 inert / hidden 的 trigger 上实际 pointer 坐标变化后提交。`41–47` 清 pending 后经共享 helper 先通知 caller、检查真实 isCanceled，避免重复通知或复用取消对象；`74–79` press 只清 pending，不逆转 Base UI closeOnClick；`80–91` 键盘只在当前 task 的真实 focusin 匹配 trigger 后放行，外部 key 本身不会重放旧提示。`51–56,92–117` 在暂停、离开、关闭和卸载时清 pending / fresh / key，并移除 document listeners。context=null 的原 Root 路径 `22–24` 保留。对应 red-04、green-03 及最终 green-05 已闭环。

已实际读取 `docs/evidence/content-drawer/green-03/popup.tap`，其实际格式为默认 spec reporter（文件扩展名不代表 TAP）：11 tests / 11 pass / 0 fail，cancelled / skipped / todo 均 0，39.85 秒。包含原 hover / fresh hover、静止鼠标拒绝复活 / 同 trigger 新移动可开、真实 cancel、两种 Submenu、真实 Select / ItemLevelPicker、owner 外菜单及 Modal 子树可用。这三项 P2 已在静态修订和对应真实专项中闭环；不是全产品 green。

## P2-4：跨断点重开首个可见帧的真实 Tab 尚未准备完整

已读取 `docs/evidence/content-drawer/geometry-01/geometry.tap` 和 `geometry.json`：稳定被测源、15 tests / 13 pass / 2 fail、cancel / skip 均 0。CD03 899→900 重开首可见帧 Tab 实际宽 27px，对终态 55px；W/H 已满足要求。原 strip `measure` 通过 RO → rAF 才更新 viewport capacity，且 compact / overflow 的 React 控件改变 tools 宽；必须在可见之前准备真实控件，不能只保证 inner 宽。

独立方案追加准入已记入 plan-review：完整 W/H 落 DOM → 同步 strip.prepare → 已提交的 compact / overflow 与实际计算一致才 ready → 首次产生可见 V 的相关轨道启动。空 Tab、cleanup、隐藏/restore 取消、无排序/回焦、无 flushSync / 固定帧等待都属于准入边界。当前 `useContentTabStrip.ts:115–146`、`ContentTabs.tsx:49`、hook `66–69,265–276` 静态符合该边界。已实际读取 `geometry-03/caption-preparation.tap`：4/4 pass、0 fail/cancel/skip/todo，包含原 CD03 两个断点方向、长标题及初挂三命令；最终 green-05 同样通过，P2 已关闭。

## P2-5：restore 的精确输入 target 被库注册迟写污染

geometry-01 的 CD04 失败为 `24.941 should equal 25`，原 .05 容差保留。独立单次带 adapter read / DOM 测量诊断曾得到正确 25，只能记未复现。主代理 `docs/evidence/content-drawer/restore-diagnostic-02/report.json` 前后相同源 hash、无观察期间 adapter read / 强制 layout，六次中第六次实际捕获：20.3–24.6ms owner 写 flex25/75/0 后，32ms 库 preserve-pixel 投影写 24.941/75.059/0，实际 sidebar319 / available1279，最终 target / lastSidebar 亦变成 24.941。这确证是晚写与保存污染，不能当成容差 / CSS 舍入处理。

最终 restore 专属握手在 hook `53–65,230–261,485–511,565–579,597–618`：合法输入 target 保持到新 divider / minSize 拓扑注册和最后目标写入确认；库的晚非用户回调经唯一 writer repin，自身写不当成完成确认。匹配真实 divider 拓扑、queued restore 已消费、真实非 writing / 非 user 回调确认精确 target 后释放；尺寸真实变化、新显隐/全屏/restore/unmount 取消旧 pin。主代理 `restore-diagnostic-03/report.json` 在稳定源、无期间 read / forced layout 的八次 900ms 观察中均精确 25、drift=0；不覆盖原迟写 red。

人工分栏补审保留其真实收敛过程。`restore-green-01/02` 失败于新增 pointer 执行之前的 `divider.contains(elementFromPoint(center))`：1px divider 中心实际命中相邻 chat，库 dist `1277–1315` 以当前 Group 的 expanded hit region 判断，未要求 target 必须属于 divider DOM。等同 oracle 修正保留真实 client point、同 Group / 非 inert / 无外部遮挡，并要求实际 mousemove 让库 separator=hover，随后真实 down / move40px / up、Group 和偏好变化及 240ms 不回滚；没有 force、模拟回调或放宽原 25/40/35 断言。

`restore-green-03` 随后在实际拖动阶段失败。强化诊断 `restore-pointer-red-01/restore.tap` 为 1/0/1、page errors 空：真实 hover / active / down / move40px / up 都已执行，Group sidebar 仍 319.5px / flex25。库 dist `3238–3239` 的 user metadata 等到 pointer-up，pin observer 中途钳回旧值。因此最终 `releaseActiveRestore` 仅读取当前 Group 的 direct active separator，在 repinCurrent 和 queued owner frame **任何写入前**移交；callback / MO / RO 均经该入口，结束和键盘 user metadata 仍保留。无 active 的非 user 迟写保护仍在，不永久锁人工分栏。已实际读取 `restore-green-04/restore.tap`：1/1 pass、0 fail/cancel/skip/todo，原精确比例及真实拖动 / 持久性均通过；最终 green-05 同样通过，P2 已关闭。

## P2-6：初次挂载前同任务换向沿用了尚未注册准备的暂定宽

独立现有 fixture 诊断用真实注册的 `view.content` 命令，在初始未挂载 / 无 Tab 时同一 evaluate 连续 toggle 三次，未改 DOM/store 或替换 hook。hook 源前后均 `b930bf6228d8e2e3699c105ff6bf75ddd5ab81a9a19f83ee5ed1ffc58b06940c`；Node24/Chrome 命令退出 0、page errors 空。1280 下首可见 V=7.328125、W=436.71875，moving W 同为 436.71875，最终合法 W=436.40625。该差值 .3125 是独立诊断线索，未冒称已经违反原 .35 browser 容差的正式 red。

源码依据：初挂 `lockContent` 先按旧 separator 拓扑估算暂定 W，隐藏新 intent 清 contentOpening / percentage / preparing，第三次 show 在已有 frozen 上不重做尚未完成的首次准备，暂定 W 因而沿到可见阶段。已有可见完整形态换向与“冻结了但未首次完成准备”必须区分。

已只读准入新增当前 `content-drawer.test.ts:169–176`，用 1920 宽放大该真实 separator 暂定差，仍保留原容差和完整 raw / 首可见断言。另准入 `162–166` 用真正 Zustand tab title 的足够长单 Tab 检查 ready 收敛，排查旧 capacity / overflow 的候选反馈问题。

已实际读取 `red-05/caption-preparation.tap`：2 tests / 1 pass / 1 fail、cancelled / skipped / todo 均 0、page errors 空。足够长的真实标题实际收敛通过，**没有复现振荡，不因此改变 overflow 公式或将猜测列为阻断**。1920 初挂换向正式失败于首可见 V=12.59375、W=749.609375 对终态 749.234375，差 .375 超过原 .35 容差。最终 hook `156–176,222–229,265–276` 仅修未完成准备的状态事实：首次锁为未 prepared，注册宽校正 / 真正 strip.ready 后才 prepared；hide 停止准备等待但保留尚未完成的注册校正，后续 show 可重新准备未完成形态，已准备的同 W 换向沿用冻结。没有固定等待或跳过首可见帧；geometry-03 的 4/4 及最终 green-05 均通过，P2 已关闭。

## P2-7：已在移动恢复按钮开始的真实鼠标手势失去 pointer-up

`green-04/drawer-suite.tap` 为 61 tests / 60 pass / 1 fail：所有几何检查及 33 项旧相关用例通过，原 repeated reversal 最后为 open 对期望 closed。随后的 `reversal-diagnostic-01/report.json` 六次均真实 double click 且终态 closed，未复现原失败；不能将该偶发记录直接归为已证明的 capture 缺失。

新增确定性用例 `content-drawer.test.ts:89–119` 在 closing 中用真实驱动以新鲜 center 按下，原 client 坐标保持 80ms；要求 trusted down 实际属于恢复按钮、命中 / 非 inert / closing、按钮实际移出旧点超过半宽，再要求实际 up / click 仍属于开始该手势的按钮。原 instant reversal、键盘重开、逐帧完整形态和终态断言保留。`red-06` 只在开始手势之前因 RPC 间按钮移动而未命中，不计此问题根因。驱动修正为 `locator.click({force:true,delay:80})` 只省去 stable 等待，全部真实输入前置仍强测，未模拟 onClick 或替换 Shell callback。

已实际读取 `red-07/held-pointer.tap`：1/0/1、0 cancel/skip/todo、page errors 空；上述 trusted down / closing / hit / non-inert / 固定点及真实移动前置均通过，失败在 pointer-up 的实际 target 不再是恢复按钮。随后才对 `ChatPanel.tsx:1726–1731` 做最小修订：真实 primary mouse button0 的 pointerdown 调用浏览器 setPointerCapture，原 onClick / 键盘 / no-drag / 外观不变，正常 up / cancel 自动释放。未增加模拟回调或业务状态分支。`pointer-green-01/held-pointer.tap` 原 instant 和新增 held 2/2 pass，完整几何阈值不变；最终 green-05 同样通过。该确定性手势问题已闭环，原 green-04 偶发失败证据仍保留。

## 测试 oracle 的等同语义修正

已核实 `react-resizable-panels/dist/react-resizable-panels.js:3533–3565`：ARIA / inert rest props 在外层 `#content[data-panel]`，className 在内层样式 wrapper。CD01 改读真实 `#content` 的 aria-hidden 合理，不应为迎合错误 selector 添加产品冗余属性。Select fixture 补真实 items 映射、外部控件从 bottom0 移到 bottom48 避免遮挡真实底部 nav、普通内容外菜单等待正常退出动画、移动 restore 先验证 visible / 非 inert / center 实际命中再 force 指针 click，均未放宽 owned Portal 首 rAF 暂停或几何/换向结果要求。原失败记录继续保留。

已只读准入 native harness 两项与实现契约一致的修正：旧 mode 仅约束实际非终态 V，终态注册帧仍完整保留并严格检查冻结形态，最终独立验证合法 mode；cold hidden 首 show 允许 absent preflight / 注册帧，第一次真实 DOM 建立 identity 基准，首可见形态仍用独立完整 oracle，closing / 已存在后丢失 DOM 均必须失败。这些是准备阶段修正，不是产品或原生通过结论。

## 最终稳定源与验证准入

已实际读取 `docs/evidence/content-drawer/green-05/drawer-suite.tap` 和 `run.json`：Node v24.19.0、真实 Chrome、TAP、concurrency=1、exitCode=0；62 tests / 62 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo，169.29 秒，范围是新 29 项及旧 33 项相关用例。运行前后 sourceHashes 一致。独立重新计算 run 中 17 份生产 / 测试文件 SHA-256，全部与运行后的记录相同；其中生产范围仍为原 13 份快照对应文件及新增 context。最终 hook hash 为 `db43fb6155ff1f49ec0f7b297b7baa5548c56fb23a56fc5ed8ea5a28c2e0e818`，ChatPanel 为 `4cc9a511ed45057920ed4cada19363c5caac13568df868b5bee2c3620c024bad`，新增 context 为 `aa13e0386755b8f51b5b5db05da896153c217c3582af0f0117118231f3430224`；其余完整 hash 在 run.json。

七项 P2 的最终实码补审无遗留阻断，准入主代理全量回归、匹配此源的构建和真实目标系统验证。上述 Chrome fixture 复用真实 Shell / hook / caption / primitive，但部分 body 是受控测试内容；不能据这 62 项声称全部 29 类业务面板、真实编辑器状态、真实 HWND 命中、目录包冷启或全部平台已通过。需由主代理组合真实组件 / 目标系统证据后才决定产品验收，本报告不替代该步骤。

## 构建组合脚本的静态边界

初次应主代理补充要求只读审核新增 `scripts/verify-content-drawer-build.mjs`：严格 Node24，以同一个 process.execPath 顺序执行 typecheck → Prisma generate → Next build → desktop build，任一 stage 非零退出即停止后续 stage；证据目录用独占 mkdir 防覆盖，按 stage 保存日志、退出码和被测源 / 产物 hash。bundled Node v24.19.0 的 `--check` 实际退出 0。此处只确认脚本语法和组合流程，不表示 build 已通过。

build-01 启动时的 runner inventory 是 src / desktop / tests 的 ts / tsx / css 与列出的 extras，不能把 stableSources 扩大为全部构建输入稳定；它未包括 Prisma schema、Next / PostCSS / TypeScript 配置、runner 本身及 build-desktop 引用脚本，且初次文件列表固定。主代理已明确保留原始 build.json，另补构建输入 manifest，独立确认四个 artifactHashes 非空，并把最终 14 份生产 hash 与 native 实际加载的 bundle hash 关联。按这个限定准入继续组合；缺产物或源 / 构建关联不成立不能标匹配构建通过。下面保留该初次边界并记录 build-02 的具体修订。

### build-01 后的命令目录重生成与 runner 补审

已实际读取 `build-01/build.json` 及 `desktop.log`：typecheck / Prisma generate / Next build 三 stage 均退出 0，desktop stage 退出 1；明确原因是 `verifyCommandCatalogs` 拒绝 command-runtime.ts 的陈旧 source hash。原始记录保持 passed=false，没有把 UI 构建通过写成完整构建成功。

新版 `verify-content-drawer-build.mjs:13–19,27–38,56–62` 在生成 Prisma / UI / desktop 前增加仓库既有 `generate-command-catalogs.mjs` 阶段；以真实 Chrome 在隔离 contexts 枚举已安装 editor 注册，不伪称 macOS 原生验收。manifest 纳入所有 scripts MJS（包含 runner、generate-routes、verify / generate commands 等实际引用脚本）、`prisma/schema.prisma` 与真实存在的 `next.config.mjs` / PostCSS / tsconfig / package 配置。仓库配置实际为 next.config.mjs，没有虚构 prisma.config；catalog JSON 前后 hash 单列，避免把合法生成输出误当冻结源变更。四项必要 artifact hash 任一缺失会令 passed=false。严格 Node24、独占证据 label 和非零 stage 停止均保留；新版 `--check` 实际退出 0。inventoryScope 明确不是每个传递构建输入的完整证明，初次路径列表仍不能证明期间没有新增输入。

已实际检查 `git diff -- desktop/shared/command-catalogs.generated.json`：只有 command-runtime sourceHashes 的一行从 `657253fd9fba6a50d62e69dda3c999751791ec5450219f66acf5d8b25e769e7c` 改成最终 `59a4fd8be5f990fec4d28138b5e3a30fa2797d94f587f68ea11e38e7915005ff`，与当前生产源实际 SHA 一致。独立读取 HEAD 和当前 JSON 深比较：win32 401 个、darwin 417 个 commands 内容完全相同，两平台 commands sha256 分别仍为 `5d8c7faac086077dbfb739bec7302ca5ac3d03d9ac17cf106fb5a7a4acf11bfa` 和 `54811c4ba0a18be2235c4a5aed2c4499649771d7e4abd92a7a0b256a171f1aa8`；schemaVersion 和 Monaco 0.56.0 不变。Node24 调用真实 `verifyCommandCatalogs()` 实际退出 0。因此这是满足现有构建校验的合法重生成，没有改变平台命令行为。

新版 runner / 生成 catalog 补审无新增阻断，准入 build-02 继续执行并按其实际 stage / artifact / hash 结果判断匹配构建；本次补审时 build-02 尚在运行，未将其标为通过，亦不替代 native / 产品验收。

### build-02 完成后的实际复核

已实际读取 `build-02/build.json`：Node24.19.0，typecheck / generate-commands / Prisma generate / UI / desktop 五 stage 退出码均 0，passed=true，记录的 input hashes 前后一致。独立按规范化路径比较 green-05 与 build-02 的本次 14 份生产源 SHA，再重算当前源，三者全部一致；四项 dist / out 必要产物均实际存在且当前 SHA 与 build.json 一致。catalog 输出变化已由上节实际 git diff / 两平台深比较解释。该证据可认定本次匹配构建通过，不替代运行后实际 bundle / 原生目标验证。

## 目录包组合脚本的补审

新增 `scripts/verify-content-drawer-package.mjs` 只读语法检查：Node24 `--check` 退出 0；Windows / Node24 前置、独占 label、调用仓库真实 package-desktop --dir、保存阶段退出码 / TAP counts / 记录源 hash / 必要 executable hash 和 package-static 结果的方向合理。

初稿确定执行障碍：`29–31` 直接运行所有 `tests/packaging/*.test.ts`，其中 `packaged-resources.test.ts:10,13–36,73–75` 硬依赖 mac-arm64 .app，`package-archive.test.ts:14–21,37–43` 硬依赖 mac-arm64 ZIP 和 `/usr/bin/unzip`，没有 host guard。本机 Windows 目录包不能满足这两个文件，不能把缺 macOS 产物的失败当成 drawer 或 Windows 包失败，更不能伪称 macOS 实测通过。最小组合范围应显式选现有 Windows / host 独立测试文件，并在证据记录未执行的 macOS 范围，不改既有测试或用平台外观模拟结果。

实际日志补审需独立确认 `41–43,50` 的 TAP 汇总有效、tests>0、各统计与 included scope 一致；exit1、skip 或未执行项不得计 pass。当前 wrapper 任一 stage 非零即停止并 passed=false，没有把 exit1 变成成功。主代理已启动 package-01，明确保留整套既有 test:package 的原始执行、不取消 / 覆盖 / 重复打包；若实际硬路径失败，按完整文件及明确测试标题分层统计 host applicability，Windows afterPack 与独立 native 另据真实证据判断，不将这些平台障碍归因于 drawer。是否补 host-only 新 label 由实际日志决定，不能事先删掉原失败或声称组合通过。

### package-01 实际结果与范围复核

已实际读取 `package-01/package.json`、`packaging-tests.log` 和 `package-static.json`：Windows 目录打包 stage 退出 0；afterPack 实际校验 340 个项目资源及包内依赖，子进程 exitCode=0 / forcedTermination=false，PGlite query=42 且关闭、Sharp 2×3 PNG 成功。必要 executableHash 非空。记录的源码前后一致。随后原整套 packaging-tests 退出 1，TAP 13 tests / 8 pass / 5 fail / 0 cancelled / 0 skipped / 0 todo；wrapper passed=false，与真实原始日志一致，没有把失败或未执行项计通过。

五个失败按实际触发点记录，不能统一写成缺 macOS 包：`package-archive.test.ts` 在 import 时已被 tsx 的 CJS 输出拒绝 top-level await，整个文件成为 1 个失败、其中两项 ZIP 操作均尚未执行；`packaged-resources.test.ts` 的三项硬依赖 mac-arm64 app 测试分别被现有 Windows host guard 拒绝、缺失 mac 路径、mac 包依赖路径失败；`packaging-config.test.ts` 的本地 Electron 预检用例失败于旧 `/node_modules\/electron\/dist$/` 正则不能匹配实际 Windows 反斜杠路径。其余实际通过的 8 项含 ICNS/ICO/许可指纹及 host 配置 / resource guard / Windows builder dispatch。保留所有原失败与 fixture，这些没有证据指向本次 drawer 改动。

据此只确认目录包生成及静态 afterPack 检查成功；**既有 packaging suite 不通过**，macOS / ZIP 未执行，Electron / HWND / 离线工作台仍待独立 native。是否按明确 host scope 增补日志由主代理决定，不重复打包或抹去原 suite 失败，不将部分阶段结果提升为整套验收成功。

## 原生窗口 DPI 准备修订补审

`windows-development-01` 的实际 failed 报告已读取：离线隔离 launch 成功，但 outer1801 对请求1800 的旧 helper 精确断言在动画前拒绝，因此不算任何 drawer/native 通过。补审后的 `verify-content-drawer.mjs:82–115` 保留 native DIP 参数，实际 CSS target 严格零容差；完整记录 outer/content/renderer/dpr/zoom/display，仅对外框接受已证实1DIP量化，CSS miss 的逐轴补偿最多4轮/总3DIP并拒绝 clamp。两处 in-flight resize 不等待动画 settle，另要求 resize 前及精确目标达成时实际 `0.2<V<W−0.2` 和同一运动方向，不能靠 moving 标签算重叠。Node24 --check 退出0，具体证据与 hash 已补 `2026-10-14-content-drawer-native-review.md`。仅准入新 label 执行，未修改生产源 / 几何容差 / 断点，也未计实际 native 成功。

## 全量 browser-01 的实际失败及旧用例迁移准入

独立读取 `regression-browser-01/browser.tap`：559 tests / 552 pass / 7 fail / 0 cancelled / skipped / todo，退出1；原始全量失败保留，不能以专项62通过代替全量通过。已审核 `2026-10-14-content-drawer-regression-plan.md` 及涉及旧源码，准入最小 fixture 迁移和诊断；生产继续冻结，具体左侧 driver 修订尚待真实 trace 补审。

- 三项 DRAG 都在 `pane-window-drag.test.ts:73/87/116` 缺元素超时，未进入几何 / overflow 验证。该 fixture 第37行给 store 只有 platform，虽第35行另定义带 appearance.zoom 的 header 局部 bootstrap，却没有给真实 ContentTabs；当前 ContentTabs44 在 context=null 时读取 bootstrap.settings.appearance.zoom 会抛 TypeError。不将源推导伪称原日志已经输出该 pageerror，原 error 断言在 run 之后被 timeout 跳过。准入把既有 appearance.zoom bootstrap 同样用于真实 store、初始化 / 失败立即保留 rendering errors，不修改生产 Bootstrap 合约、mock ContentTabs 或放宽标题栏判据。
- SURF04 在 `workspace-surfaces.test.ts:280` 等 detached 超时，Panel 已实际 hidden；第287行关最后 Tab 的同类旧预期尚未执行。准入迁移到真实 content closed / V≈0 / inert、右 separator 无占位、同一已挂载身份和颜色保留；关最后 Tab 仍检查真实 body/Tab 退出和空 caption 可再次打开。不能为旧 detached 预期撤回批准保活。
- SURF narrow315 失败原日志未给 width/pane/phase/V，不能断言具体分支。302–306 只等 sidebar phase，右独立运动尚可能 opening；该几何实际读 `.workspace-content` 的可见宽（不是 fixed inner，panelSelectors 的 ContentTabs 仅用于颜色），325旧 inactive chat=0 亦不符合右覆盖层保留全宽 chat underlay。先保存具体 branch / 两侧 phase / 实际 Panel+viewport V / fixed inner W / rect / inert/ARIA / divider，再按正确终态与 selected viewport、全宽 inert underlay、零可见占位验证。保持原.1/.03边缘、色彩、无亮缝 / divider 判据；若终态仍差异则保留真正产品 red，不能预先归成 fixture。
- `sidebar-drawer-resize.test.ts:110` 和 `sidebar-drawer.test.ts:48` 两项实际为 open≠opening，分别在 click返回后70/100ms读阶段，resize/后续shape尚未执行。准入先保留旧真实 pointerdown/up/click target/trusted/time、Node action起止与全部预armed rAF，即使前置失败也存原 trace。新 driver 只在 trace 证明后补审；不得删 moving/实际partialV门槛、跳帧或放宽.1/.03几何/实例/偏好要求。不同并发度只记录运行条件，不据此宣布偶发或无产品问题。

按主代理的源稳定组合边界，在当前 core/native 同源运行完成或明确释放后才修改授权的旧测试；每次新 label，原失败不覆盖。此准入不表示七项已绿、全量回归通过或产品验收。

`windows-development-02` 已实际读取：新 strict bounds、HWND 初校/原生按钮命中及真实 Monaco 动作前 baseline 有部分通过，随后在正文准备等“已保存”超时，动画仍未执行。`use-autosave.tsx:86–100` 将存在暂存修改的 saved/saving/pending 合法显示为“待保存”，该路径需按真实三阶段准备状态判断，不能强制落库、确认 / 发送或改生产语义。已准入仅正文 / 角色 / 主题三处的就绪方案方向，具体真实controller + journal / GET匹配 helper 实码仍待独立补审；development02保持failed，不算drawer动画通过。

core 补核：独立读取 `core-timeout-recheck-01/core.tap` / `core.json`，真实同 Node24、原180000ms timeout、concurrency1、三份 integration 文件共23 tests / 23 pass / 0 fail/cancel/skip/todo、退出0、记录源hash稳定。原 `regression-core-01` 全量日志继续保留，不能用这次23项复核覆盖或改写整组结果。主代理已据此释放旧 fixture 的授权迁移，生产14份继续冻结。

原生三处准备实码补审已完成：`verify-content-drawer.mjs:120–160` 准确绑定当前真实panel/controller、修改前revision/time/tab及本次新latest；当前 / 落盘autosave operationId+revision+字段精确匹配，staged target/method/path/body/time准确、saved且无pending/inFlight/failed/paused、错误/issues不忽略，实际待保存UI与摘要四样本/180ms稳定后才开始原动画。GET改为真实responseStatus/hash/数据库字段匹配独立记录，合法暂存不冒称落库；未调用保存/确认/发送、未改store、生产或frames/oracle。Node24 --check退出0、最终脚本hash `36263f193c821abd1056c0c37bbed8d71ec3f8898f15a2bb399c12b0f873d085`，具体N-P2-6及development02失败边界已补原生审核报告。准入新label运行，不计native/产品成功。

Monaco执行后补审：development03的首个真实close保留42帧、源/包稳定，但失败于旧layoutInfo不存在contentHeight；独立解析42帧全部没有该字段或contentSize。安装0.56.0公共API及实现已核，修订从实际getContentWidth/Height独立采全文尺寸，全部baseline/state/reset/preflight/rAF保留layoutInfo并另记contentSize；layout width/height/contentWidth和全文width/height分别finite且原.25CSSpx比较，不删全文高/不放宽其余oracle。最新脚本hash `e21945cf563d24dbf401ff3baa978ec3995a0abd8779c014babf291c77b7188b`、Node24--check退出0，原生审核N-P2-7已闭环准入新label，不将缺全文高的旧42帧重计通过。生产14份仍未修改。

regression-diagnostic-01 的已落盘原始材料补核：`raw/drag-0.json` 实际记录 appearance TypeError 和空root，补足此前只有源码推导的rendering证据。`raw/surface-760-1.json` 明确第三“查看内容”branch失败：left closed / right opening、W760.000061 / V12.625、chat760且inert，前sidebar/chat终态均全宽；漏等待右终态已在这个独立诊断中复现。准确几何对象是外层V而非innerW，未因旧报告中的对象混淆改产品或放宽断言。两left原driver本轮trace有真实trusted事件、partialV及opening帧；原全量open≠opening未复现，不据正常trace宣布其根因已证实。诊断组合尚须以完成后的run/TAP判断整体结果，具体新driver仍待补审。

旧fixture实码补审与专项：diag01完成的run/TAP实际6 tests / 2 pass / 4 fail / 0cancel/skip/todo、稳定源，三DRAG都有实际appearance TypeError，SURFcontent的partialV已实证。DRAG最小复用已有appearance.zoom bootstrap并立即错误断言，SURF在真实closed/V0/inert/aria、同Panel/Tabs/body/颜色及最后Tab真正body退出上替代detached；narrow保留原可见widthselector/.1/.03/颜色/无sep，等两phase终态并按批准full-width inert chat underlay检查。旧两left未改真实driver或阶段/几何门槛，只记录时钟/完整raw。`regression-migration-01`实际30 tests / 29 pass / 1 fail、稳定源，原七失败对应均通过；唯一新增失败为诊断observer装到没有Shell/sidebar的emptyCaption-only fixture导致setup null，不是产品形态red。准入仅在诊断安装入口加入与finally一致的ENV&&!emptyCaption守卫，原DRAWER07几何/键盘断言不变，保留01并新02复验，当前不计四文件全部通过。

Native04补核：只有一个2^24空DIV的global rect width三帧差1，公共Monaco及其他正文测量一致，但旧raw缺class/local不能直接认定虚拟层或放过。第一阶段additive诊断脚本 `746df628233499aa2dc4d8c34914303704d4896f4298d35b8127f6f5e8f4f090`、Node24check0已准入development05；保留所有原节点/文字/strict.25，仅追加actualeditor所属、exact lines-content / scrollable-parent及CSS/offset/client测量。第二阶段限定sentinel交叉oracle仍须实际证据独立补审，不准通用大宽排除或普通可见文字精度削弱；细节已写native-review，04保持failed。

### 旧测试迁移的最终默认环境补审

独立读取 `regression-migration-04/run.mjs`、run.json及migration.tap：runner显式 `XAANINK_REGRESSION_DIAGNOSTIC:""`，不会安装新rAF诊断observer；真实Chrome、Node24.19.0、concurrency2，四文件30 tests / 30 pass / 0 fail/cancel/skip/todo，退出0、记录22份源前后稳定，63.32秒。本次14份生产源按规范化路径与green05及当前文件独立重算全部一致。migration02也实读30/30带observer成功；migration03原计划关闭observer但runner替换未生效，只诚实算带observer重复核，不能当默认环境证据，最终默认结论只依据04。

最终实码再次核对：DRAG复用真实store所需appearance.zoom；SURF隐藏保活改为closed/实际V0、inert/ARIA、Panel/Tabs/body身份与颜色保留，真实Tabclose仍删除body；narrow正确等两侧终态，实际V、批准underlay及零占位/边缘检查保持.1/.03精度、色彩、无sep。两left仍为原真实click→70/100ms，再检查原phase/partialV/几何，只有无RPC的Node时间wrapper和可关闭诊断记录，没有新driver、删帧或容差变化。诊断guard限制到有Shell/sidebar的fixture，empty-caption原键盘与尺寸oracle不变。

旧fixture迁移独立终审无阻断，准入主代理默认环境全browser02复验；原full-browser01及migration01失败仍保留。原两left fullphase失败未在具名诊断复现，不能宣称其原因已确认或任意归为flaky；当前30专项成功不替代完整559组合或native通过，生产14份仍冻结。

Native05实际strict close已通过，raw37帧唯一明确Monaco虚拟层的CSS串/offset/client及公共API均稳定，rect−1本轮未复现，因此当前不改任何sentinel oracle，旧04不补计通过。05随后在hidden caption HWND sample失败：所选1788×16CSS点实际在Windows系统关闭区，HT20，与空白caption期望HT2不是同一测量区域；restore按钮点返回真实HT1。只准入138DIP原生安全区的选点/before-after守卫方案，具体实码待审，HT2/HT1原判据不变，详见native-review。05整体仍failed，不用部分close通过覆盖后续失败。

### 全browser02及原生安全区实码补审

独立读取 `regression-browser-02/browser.tap` / browser.json：53文件、559 tests / 559 pass / 0 fail/cancel/skip/todo，Node24.19.0 / concurrency2、原180000ms timeout、退出0、记录源前后稳定，467.02秒。本次14份production经规范化路径与green05/当前源码逐项hash全部一致。全部旧浏览器与新抽屉用例的完整组合通过；原browser01及中间诊断失败仍保留，不用559通过宣称core基线残差或未执行系统也绿。

`nativeRegions:289–316` 实码补审已关闭选点阻断：真实native content/zoom、renderer宽及可用WCO rect求安全区，captionblank / released zone再交集；原生138DIP右区和32DIP标题行、普通窗口顶部边框均排除，before/after实际caption/button insideSafeArea、同DOM命中/leak/phase/zoom/nonfullscreen守卫记录，期望仍HTCAPTION2/HTCLIENT1及sys8/9/20。Node24--check0、脚本hash `c6de2c336255476de9d2126075264c65f705bdae235dce167654c070184d74e5`，准入新labelnative run，旧05整体failed，sentinel严格.25仍未改。

Native06已实际读：moving两hits2/1正确，但错误选用了会移动的chat restore而非fixed menu，after.sameButton=false，结果inconclusive / 整轮failed保留。真实WindowControls20 / CSS187及最新脚本302–313已补审：必须唯一实际positionfixed的`.desktop-windows-menu[data-desktop-menu-button]`，before/after完整CSS / rect / 同DOM中心命中 / safe区记录与.25矩形稳定守卫，不fallback动态按钮、不改HT2/1/phase/leak/sentinel。Node24check0、最终hash `5d4899937e91b4097a3754f1e878dfef61ad4756574cbd64e81f01522cd5fff0`，准入新labelnative，未计06通过。

另外独立读取 `final-typecheck-01/build.json`：mode明确`--typecheck-only`，只有tsc --noEmit单stage退出0，记录源稳定；artifactHashes沿用既有build02产物，只认定最终类型检查通过，不声称再次完整构建。全browser02仍559/559，生产14份保持冻结；真实Windows / 目录专项继续按新label结果判断。

Native07第二阶段方案已具体准入：独立核原close56总帧/26interval，唯一actual-owned id39/owner37是安装Monaco明确定义的2^24 lines-content背景画布；11帧rawW−1而同帧offset/clientWH均精确2^24、样式串/identity变换/公开layout与全文尺寸恒定。其他rect最大.0001220703125，11336文字Range最大.000244140625且数量不变。仅该reference/current同时符合唯一真实归属/结构/身份/无直接文字的节点可用finite且exact2^24的local尺寸交叉原.25；候选x/y、所有普通DOM/view-lines/文字/API原精度不变，资格不符不得跳节点。raw画布矩形和逐帧delta/max独立保存，不覆写或从几何报告中静默隐藏。原07failed/raw保留，限定两文件实际码仍待补审；详情与准入条件写native-review，生产14份冻结，不计产品/native通过。

第二阶段实码终审已完成：script197–203实际TypedOM只读numeric观测、240–244全部raw画布W/H及delta/max先存证据且main report在checked oracle前独立记录diagnostic，274–289严格唯一actual-owned/sameowner/id/exactclass/no-direct-text资格和finite canonical local+client/TypedOM+styles检查，TypedOM availability也须前后一致；资格失效明确fail，仅该节点W/H使用offset原.25，x/y/普通DOM/文字/API及全部身份/首可见原判据保持，293分开报告local geometry与raw global delta。Node24.19.0 --check实际0，最终冻结SHA-256 `a545506b382317720c1bfe17f3f7b9afc07a613e30f4e9f4f46267edcbcb8b1f`（预读9351后新增两项证据守卫已重新补审）。无新增生产范围或遗留阻断，准入新label development08，原07failed/raw不改计通过；具体证据界限详见native-review。

实际Native08首close57/26interval/23actualV已通过，localmax.0001220703125及raw画布Wdelta1分开记录；审核A545版本和源/包/executable稳定。随后open HWND虽瞬时HT2/1且同fixed menu/phase/safe/zoom有效，选点恰在released zone右边缘−12并被展开边缘覆盖，after.sameCaption/leakPointStillValid失效，整轮failed/inconclusive保留。仅准入交集左侧start向右扫描blank point的选点提案，所有before/after/native要求保持，实际最终码/hash/check仍待补审；无生产/普通几何容差更改，详细边界在native-review。

该限定选点实码318–332及native-cases59/61/100终审无阻断：仅leak交集start→end真实blank扫描，nonleak旧方向不变；actual扫描界限/rect/before-zone bool+assert和after-zone新增记录，不修改原sameCaption/zone/phase/safe/zoom/menu稳定及HWND HT2/1。Node24check实际0、最终冻结hash `5043cb65ddc52e043770678aaac686318ace1c7be21857ba0aa4d973520fd389`已独立核一致，准入development09。生产14份冻结、08原failed/inconclusive保留，不将准入计产品通过。

Native09实际4captures（正文与角色close/open）、19checks以及6组native采样已部分passed，5043版本/源/包/executable稳定，随后主题准备119样本超时，整轮failed保留。最后controller与唯一journal rev2/字段均saved匹配、UI待保存/修改2无错误，helper却以novelId筛THEME导致changes为空。实际staged-save234无theme params、staged-changes370使用params首值或URL为targetId，注释44与实现有差异；仅准入诊断真实保留journal关联，不能改生产、提前确认保存或弱化就绪要求。作者具体URL身份修订及最终码/hash仍待日志证据补审，详见native-review。

09保留合成journal已独立只读确认唯一当前theme批次editing/唯一THEME modify，actual targetId=requestURL、novelId/PATCH/两字段/updatedAt匹配，snapshotrev48483，draft文件hash `02525ed503171e2f21c9323b520d0836743c28966c0f430fd1d63ea00606b0ed`。准入已知themePath的exact target修订而非猜theme实体id；本批次未target过滤候选身份/API entityId仅追加证据，原strict就绪不变。另核真实Group1800/W1079.29和Shell settled chat420/content30%约束，允许尚未执行manual真实pointer由−95改+95以缩content约984并增chat，保留>50/restored<3/全部原运动判据。此为边界预检不是actualred，两限定文件最终码/hash待补审，生产冻结。

最终151/154/372/399实码与native-cases63/65/67/106已补审：Theme CALL只把已知themePath用作exact targetId；helper先kind/op候选身份诊断再exact target筛选，原ready/错误/operation/revision/字段/PATCH时间/UI稳定条件不变，GET entityId仅记录。manual只改真实pointer+95方向并增加实际请求距离/方向/beforeafter证据，>50/restored<3及运动精度不变。Node24check0、独立hash `9f34558c2b806c6baacf5458387e2524452f60530f96b16e81bd26d7728abfbf`与作者最终冻结一致，14生产hash独立对09snapshot全部一致。无遗留阻断，准入development10；09failed和四capture部分通过按原边界保留，不计未执行范围或产品完成。

Native10实际主题准备也passed、四captures/20checks及9F345源/包/executable稳定，随后Select pause raw id42一个空零尺寸SPAN从fresh items退出，first closing Popup visible但inert/ariaHidden已真，整轮failed保留。安装FloatingPortal197–200 aria-owns owner span与constants42–46 fixed/clipPath的语义是可核线索；旧raw缺真实attrs/portal关系，尚不能据零尺寸或相似源码直接过滤。要求作者实际DOM证明该具体source utility后再提限定生命周期采样；普通DOM/文字精度和真实Popup pause首帧要求不改，详情native-review。

主代理授权后选择限定runtime资格路径的方案准入：新label实时证明aria-owns→connected实际BaseUI portal→当前tracked Select listbox，并完整canonical隐藏样式/empty noninteractive SPAN/全部WH0及唯一reference身份才可独立utility生命周期采样；原raw全保留，其他zero或资格失效不能过滤、普通fresh ID/.25/text/API/Popup首motion inert保持。待实际最终码审核及新raw独立核资格，10缺attributes仍failed，不凭源码相似补算通过；详细约束native-review。

最终7062版本201–209/248–259/287–309/396实码和native-cases69–75/114终审无阻断：只两个具名捕获的reference唯一actual Popup portal归属和canonical empty非interactive0WH utility先严格验证，原raw与独立diagnostic先保存；存在时每帧重新资格/身份/样式，退出不复活/new linked id失败，仅该实际id从ordinary fresh/.25分列。所有普通DOM/text/API/实际运动/visible Popup首inert保持。真实Picker source同FloatingPortal，仅显式实际dialog只读bind/clear，不升级outsideclick生命周期为因果。Node24--check0、实际hash `7062e2276fe97237eb440e318458796960100f0938fd39f0643f8089756f7203`与作者冻结一致，准入11并须事后核actual raw资格；10failed和旧未知id42保持原边界，无生产范围扩展。

实际11raw已证明canonical唯一owner id45/aria-owns→真实BaseUI portal→bound listbox id44及所有empty/zero/source样式，唯直接slot=null被旧scope拒绝；7062源/包/executable稳定、四captures/20checks/0errorsHTTP，整轮failed保持。此前List与Popup外层slot的假设已纠正：sharedSelect97/105及installedSelectList41表明真实listbox nested在select-content Popup下。仅准入actual closest祖先身份/归属scope修正，保留direct slot=null及所有其他资格/geometry/首Popupinert，暂停态动态数据不作为恒定source身份。最终码/hash待补审，原10未知id不回推、11不重计pass；详见native-review。

最终202–203及native-cases77–79/118独立补审无阻断：仅actual listbox role+不同节点closest select-content祖先connected/contains/同ariaPortal关系作为Select scope，directslot=null原样，actual祖先和closest ownedPositioner稳定identity/link补充raw，无暂停动态纳入恒定source对象。所有其他qualification/lifecycle/普通.25/text/API/首Popupinert不变。Node24check0/独立hash `c4557fdb076a44e1bbcb51ae14ed2a54865b1044ee32b059d5988c3f369963b5`与作者冻结一致，准入12并须核实际新raw祖先资格；11failed/部分通过保留，未计产品验收。

12 actualraw资格闭环已核：唯一id47/Portal43→boundlistbox44+actualancestor45/ownedPositioner46所有canonical/empty/noninteractive/0WH/真实归属真，directslotnull保留；59utility样本仅preflight存在、后58退出不复活，首closing实际visiblePopup已inert。Selectpause/themeopen新增passed，6captures22checks/C455源包稳定/0errorsHTTP，随后fresh重开Esc cleanup仍visible超时，整轮failed保留。Controller58只是return不消费按键，不能宣称它已证明具体Esc根因；SelectRoot291/useDismiss321有真实outsidepress路径。仅准入保持fresh visible断言后用真实主题heading outsideclick清理，不改原无外点击IPC暂停/普通几何/proxy/native要求或生产ESC；最终码/hash待审，详见native-review。

最终389/doc81–85/124补审无阻断：真实新user click/visible await及显式isVisible真在cleanup前，actual主题heading外点击→hiddenwait→清只读引用只服务后续准备；成功记录pause IPC与postAssertionCleanup/no Escapeclaim边界准确。原proxy/ordinary.25/text/API/运动首inert完全保持，Node24check0/实际冻结hash `cea30843f727bcc7461b55905bba1d2ec0bd887e8d433094188bba50c9822d46`一致，准入13。12failed和新增两段实际通过及Escape原因未证实保持原证据，不计未执行native范围或产品完成。

13实际6captures22checks/CEA源包稳定/0errorsHTTP，title locator虽visible稳定但freshPortal的真实rolepresentation[data-base-ui-inert]拦截，未发pointer，整轮failed保持。InternalBackdrop28–31 marker source明确服务outsidepress，Select modalBackdrop/useDismiss321是同实际关闭路径。准入仅freshvisible断言后验证真实标题center hit=同freshlistboxPortal内可见非HTMLinert Backdrop且outsideListbox/Content，先存actual coords/target/link，再真实mouse.click/hiddenwait。无force/合成/Root/store/生产键盘改动，原IPC/proxy/geometry/inert保持；最终码/hash待补审，13不冒称已执行外点击失败。

最终helper50–61/call400/doc87–91/130实审无阻断：在freshvisible断言后用当前actual fresh listbox测标题center hit/Portal/Content关系，非pass完整diagnostic先await save；strict actual visible/connected/nonHTMLinert同Portal marker和点/target outsideListbox/Content成立后真实mouse.click/actual hidden才记录pass，无force或产品状态写入。Node24check0/实际冻结hash `6aa33a67c10ea601974f3e41667b7536061e651f983b6143d3e3595593e804f8`一致，准入14，原IPC/proxy/ordinary precision/motion不动。13未clickfailed与Escape未证实边界保持，不计后续未测阶段或产品完成。

14实际13captures35checks/6AA源包稳定/0errorsHTTP；fresh Backdrop cleanup及真实Item hide/reopen/proxy唯一实际dialog归属与退出已独立核passed，后both-open整轮failed保持。该段firstvisible4→26 W/H冻结、ordinary IDs/行数差0，rectmax.000305/7912Range max.000244；27双方open之后才合法Wreflow。CSS256 border-only/DPR1.5 live separator此前实测.6666666865，旧缺省1px和final shape不对应初始1slot冻结形态。限定named both-open initial独立prejournal/Group/同zoomDPRmode真实gutter校准的提案已准入，双方moving全区间冻结及双方终态后reflow严格，缺合格校准fail、无容差/首帧反算/生产改动。具体码/hash待审，详见native-review；未据该oracle mismatch定为产品red或重计14整轮。

最终87/199–242/249–278/297–299/421–425实码/doc93–101终审无阻断：actual gutter/Group结构预算及exact launch/zoomDPRmode/windowGroup/theme key记录，新launch清cache，仅named both-open紧邻both-close两open/2live同key允许复用；初始journal1slot独立目标无合法校准fail。Restore实际右partial且1slot后原left快捷键、continuousraw/无固定sleep，beforeafter及最终两V端点证真实重叠；named union双phase/actual双V完整区间，Wreflow仅双方open/两Vfinal且combined区间后/final2seps，普通.08/.25/全文/API/identity/inert不变，generic范围不扩。Node24check0/独立冻结hash `f921eca0883510cf43992a0536aaf0b73341dd58e971233517c4441e5682d092`一致，准入15后仍需核actual raw/calibration；14failed及13已有部分captures边界保持，未计产品完成。

15actual raw已证same-key独立target1079.689966与真实right/left overlap正确；旧guard误要求左命令前closed/旧0端点moving，整轮F921stable13captures35checks/0errorsHTTP failed保持。最终251/259/276–278/doc103–105仅named新增first actualSideV变化或firstSideMoving更早idx；all side V有限，prefix严格原.001旧V+oldphase，启动后距final>.2仍moving。原union/full geometry/text/API/inert无帧删除、无容差更改，Node24check0/独立冻结hash `58b9ba23abf3b03e8f9b1896237c93f1e59c13d9a57b37d2987fc4255fc6715d`一致，无遗留阻断准入16；15failed与既有部分证据原样，未计产品完成。

16actual both-open已通过、15captures37checks/58B9源包稳定，后fullscreen-close→普通目标open旧pre scroll失败，原failed保留。独立raw显示10941→13667仅index3/V0、Monaco宽1512→1091；firstvisible4至final52可见样本scroll/API layout/content大小全稳，model/selection/version保持。hook hide442恢复chattrue/show普通目标和Monaco StableViewport源支持合法不同W的零V准备，尚未证可见产品red；旧raw无逻辑anchor不能补算通过。仅named/preclosed/前full-closeW与独立normaltarget不同的提案准入，固定pre模型position→public getTopForPosition−scroll严格.1语义守卫、仅V0 pixel转换/visible起仍严格.1、普通同W原pre基准及全部WH/text/API精度不变，无editor/store setters。17actualanchor待执行，详见native-review。

最终201/223/232/243/265/282–285/333及native-cases107–113实审无阻断：限定前full-close完整宽与当前closed/V0资格，独立普通目标不同，原pre模型位置固定且全部raw帧公共anchor finite/.1守卫，先保存相邻pixel变更/来源；首visible至final独立WH/.08及pixel/.1，ordinary/text/API/.25、horizontal和普通同W原pre像素基准全部保持，无editor写操作。独立Node24check0、实际冻结hash `55db5d4b4075c4bd050bc37cec7129a075e4eb6323449a1738d15afd3596a528`一致，准入17。16failed/旧raw缺语义anchor不能补算通过；当前没有据此修改生产或认定产品完成，17实际anchor若偏移仍须失败。

17实际full-open50帧固定原model95:1/offset−15、anchor最大差0，唯一10941→13667 pixel转换在index2/V0，firstvisible3→final47可见样本全固定，具名语义anchor闭环已独立核实。17整轮仍55DB稳定/28captures55checks/0errorsHTTP后zoom1.25窗控安全区failed保留。最终raw真实viewport右1228.0001/tools右1295.2001，原138 DIP换算safe左1329.6，unsafe物品/新物品仅未裁剪布局框位于viewport右外；nativeControls382没量实际clip，生产与baseline已有viewport hidden+独立no-drag/后代initial，不据该raw冒称产品bug或直接过滤。限定fresh真实viewport归属/overflow/app-region/实际hit资格提案待终审，138/32 DIP与HT8/9/20及普通控件要求保持；生产14继续冻结，详见native-review。

最终nativeControls379–398补审无阻断：只actualTab/close、唯一真实viewport/direct track的strict源/归属/overflow/registered祖先safe资格可按clip测有效区域；CSSOM authored initial及实际none/无inline覆盖交叉，raw危险交集实点仍归Tab则退回原raw，普通controls不例外。所有候选raw/资格/point先保存，真实viewport/tools另独立safe，138/32 DIP、原menu及native8/9/20保持，native/renderer边界取min更保守。独立Node24check0/实际冻结hash `d1358b96fc270e928495419d50d151cef2af0f8bb9f065dda79c47ab29aba137`一致，准入18；原17failed及缺fresh clipping证明的raw不回计，18实际资格/native仍待执行，无生产改动或产品完成声明。

18实际28captures56checks/D135稳定/0errorsHTTP，1.25clip严格fresh资格已独立核：source CSSOM initial、真实hidden/no-drag viewport与后代none/ancestor安全真，三个rawUnsafe Tab有效clip为空、实际点命中caption不属Tab，registrationUnsafe为空、native8/9/20通过。后zoom1.5旧1000DIP高度→目标CSS667未能在四轮有限OS网格补偿中达到（1000→content1000/CSS666，1001→content1002/CSS668，重复两次），无clamp，整轮18failed保留。仅准入该named稳态档高度1002（真实已观测content1002/CSS668），其余1000/所有helper exact、断点与motion精度不动；最终码/hash/19actual仍待审，生产14冻结无新产品问题证据，详见native-review。

最终459行onlyzoom1.5 height1002一行实码已独立补核，Node24check0/实际冻结hash `14845377536d6094c2a4c0095b27d5bc16492461fbb4741c6c7f345ab283599c`一致，无阻断准入19；原helper exact/其他fixture/断点/motion全部精度保持。18failed及667旧目标保留，新668必须在19取得精确actual证据，不算生产改动或产品验收。

19窗口1002/1200×668 actual已满足，14845377稳定28captures56checks/0errorsHTTP，后1.5 close旧sentinel必须local2^24资格failed保留。独立54帧唯一id48/owner46 source恒定，pre及全帧真实local+ComputedTypedOM WH14913079、inline科学串对应source意图2^24，rawglobalWdelta2另存；26帧ordinary max.000122/6448文字坐标max.000122、IDs/行数差0/publicAPI与scroll差0，只读补核不计正式通过。准入required真实typed-inline exact2^24+真实computed positive finite<=intent/local exact一致的独立canonical资格，仅该已识别source sentinel；原local .25/x/y/普通/text/API/raw保持，不猜DPRclamp公式，不泛large过滤，19缺typedinline不回计。最终码/hash/20runtime待审，详见native-review。

最终218–221/267–269/321–335实际终审无阻断：required真实inline numeric px exact2^24、required独立computed正finite<=intent及local exact交叉，reference/current两typed snapshots strictsame、rawtyped/global差先保存，sole source资格与原local .25/x/y/普通/text/API/scroll保持。独立Node24check0/实际冻结hash `8c30aba520111415778d235f70e243af5ad5b01e8a00a35baea269f56ea0d2ff`一致，准入20；19failed保留，新runtime数值资格待实测，生产14未改，不计产品完成。

20 actual新1.5 typed intent2^24/computed-local14913079资格、close/open原普通精度与native8/9/20均独立核passed。8C30稳定31captures60checks/0errorsHTTP后explicit livezoom track−.53955/intrinsicTab约−.265/修改−.271及下游文字约.804超过旧cross-same-style .25，整轮failed保留；独立W/H/caption声明/publiceditor保持、行数/IDs无变，尚无生产误冻证据。方案11保证不因抽屉重排，显式mainzoom的used像素网格不能冒充同DPR样式；仅两个具名livezoom的真实native/DPR时序+量化资格、同DPR epoch原.25/跨实际边界有限网格budget提案待源码及新runtime证据审核，普通几何/API/scroll与所有collapse仍原精度。不得回计20或笼统称跨DPR所有CSS框无变化，详见native-review。

F3主体epoch方案补审后两资格缺项已在7554闭环：actual zoom请求两侧phase/W/V及真实nonendpoint/moving守卫，className/inlineWH与semantic/font/padding声明strictSame。最终129/131/210/226/268–270/292/328–350实码、独立Node24check0/SHA256 `7554b3138c4de57cadc1f344759fc59706896915adbade767934c6db796ada24`一致，无阻断准入21。仅两个named实际native+DPR边界有限像素格budget；每连续DPR epoch最后仍moving且独立WH的参考/所有帧原.25，普通与wholeW/H/anchor/API/scroll/semantic/linecount精度保持；same-grid与raw-cross-grid分列。20failed/缺新资格不能补算，21runtime仍待核，不称跨DPRraw全固，无生产变更或产品完成声明。

21实际7554稳定44captures80checks/0errorsHTTP，正文livezoom两实际DPR epoch/.000244与raw-cross.80417、真实main比与两侧非端点/used borders已独立核通过，empty-caption livezoom尚未执行。后cold新Monaco=GETseed与旧暂存全文不等失败，原21failed保留。独立owned synthetic journal证明旧长正文48305字符/UTF8 hash `1a1310a988d38e77fb70562ea200a9b8d01bb4616b66a2bc54348e14f98a8adc`=21 initial真实editor hash，batch editing/唯一PATCH和recovery AUTOSAVE_UNMATCHED latest48307 saved/无失败待写完整保留，新autosaves idle。ChapterEditor59 GET初值、draft-recovery98不重放、RecoveryDialog查看复制导出是原业务恢复契约，非drawer丢稿证据。仅准入named cold actual查看→复制→真实菜单粘贴恢复helper，前后journal sameSnapshot/DB未提交truth/原expected全文与未确认control严格保持、原clipboard内存finally复原/无私有内容日志；最终源码/hash/22actual待审，不改产品或降低cold数据项，详见native-review。

最终178–205/522–523实码独立补审无阻断：真实pre/cold disk及current controller基线、原snapshot/path/batch/DB exact，真实Recovery readonly唯一完整原正文→actual Copy boolean→真实菜单Paste/原expected全文→natural saved和旧Recovery/首control保持，original Clipboard内存finally复原/无私有diff，其他oracle未改。独立Node24check0/实际冻结hash `df404b6e9ba4fc0ebe3c10806d3ad7278387050487be53e776fe8a34a7e7d730`一致，准入22；JSON键序仅作者理论提醒、当前source无实际差异，不修改已运行冻结版。21failed与全部oldraw保持，22 actual恢复/empty及目录包仍待核，无生产变更或产品完成声明。
