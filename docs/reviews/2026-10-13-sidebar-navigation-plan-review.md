# 左导航 v8 正式技术方案独立审核

日期：2026-10-13。审核人：独立子代理 `sidebar_design_review`。仅审核技术方案与真实源代码，未实施、未运行测试；未修改生产、用例、台账或其它设计文件。

## 结论

**通过，可进入测试用例独立审核及经审核用例的 TDD 红灯阶段；无未解决的方案阻断项。** 用户批准依据为 `docs/implementation-boundaries.md:3–5`，不是旧 HTML 的通过结果。正式实现来源为 `design/sidebar-navigation/technical-plan.md:1–19` 的正式段，以及其真实组件复用、fold/scroll、布局执行边界。HTML 53 组/787 帧不计正式测试或目标系统验收。

当前状态：`planReview=passed-for-test-case-review`，`blocking=0`，`implementation=not-started`，`testsExecuted=none`，`nativeAcceptance=not-run`。本审核不跳过用例审核、实际红灯、TDD、code review、全量回归或真实目标验证。

## 源核查与执行边界

| 核查项 | 真实证据及方案评估 |
| --- | --- |
| 真实渲染与查询复用 | `SidebarTree.tsx:325,459,818,916,1038,1235,1292` 是正式角色、伏笔、试验场、世界、正文、未绑定/绑定会话真实子树。`novel-list.ts:17–18` 为共享 `['novels']`，`SidebarTree.tsx:1238,1305–1312` 共用 `['chat-conversations']`。方案要求从同一节点/函数提取过滤分支，保留 type/novelId/refId、query/mutation、头像/引用/操作；不可建立另一套业务列表或从 HTML 导入 fixture。角色两查询独立失败、正文原根菜单、未绑定指引都有明确范围。 |
| 条件渐隐与图标 | `SidebarTree.tsx:264–273` 当前头像优先、文字truncate；`:397–406,621–624` 是真实照片和伏笔字头像。`stores/tabs.ts:119–134` 的getTabIcon被左右共用。局部NavigationLabel/主图标槽位及局部Pointer覆盖不改共享右侧图标；章状态/错误/控制图标、真实图片优先级保留。现有Seal和本地品牌SVG复用，不能复制原型路径或生成假Logo。 |
| 场景入口 | `SceneWorkspace.tsx:23` 的openAllScenes先更新作品scope/search再调用openTab。正式方案 `technical-plan.md:19` 明确保留这项既有点击副作用，而分类切换/折叠不调用它；未误称guard拒绝后偏好完全不变。右侧SceneWorkspace/SceneTree业务不重写。 |
| 试验场可等待门控 | `stores/tabs.ts:239–243,258–285` 的原openTab/activateTab是void，guard失败由toast处理；`:299–308` 的activateTabForNavigation有Signal/源激活版本校验，但仅处理已有目标。正式方案 `technical-plan.md:17` 新增可等待openTabForNavigation，捕获源activeTabId/activationNonce及目标身份，await原guard后再检查Signal和失效状态，原子追加或激活；不改变原void调用。Dialog失败/false保持、取消和scope撤销abort、finally解除busy均明确。 |
| 创建成功与Dialog生命周期 | `SidebarTree.tsx:1556–1568` 原创建成功先setDialog(null)、再openTab并自动展开；`:1573–1611` 为原改名/删除、缓存失效和详情Tab关闭。正式方案移除自动展开，并把API已创建但guard拒绝转为已创建态/更新管理列表，禁止重复POST，可重试打开同一记录。列表/创建/改名/删除互斥，原queryKey `['scenarios', novel.id]`、scenario refId和原创建角色表单保持。真实Base UI Popup支持initialFocus/finalFocus透传（`ui/dialog.tsx:43–63`）；不得靠伪造DialogTrigger或广播Escape处理返回焦点。 |
| 不可用作品统一维修 | `UnavailableWorks.tsx:9–23` 的alive/flight/busy防重复，`:24–34` 保留真实workId、锁修复、错误和重试。`novel-list.ts:6–14` 把不可用与可读作品同时返回。方案要求共用该控制器、busy/flight，不复制维修逻辑，过滤分类仅增加disclosure表现。维修控制器必须在作品/过滤视图切换时保持同一生命周期；不可按每作品/每view新建独立flight。折叠body隐藏不得取消维修/清busy，scope离开与旧异步完成按失效规则处理。 |
| 每视图fold/scroll | `SidebarTree.tsx:370,590,962,1095` 原嵌套expanded，`:1237` 未绑定组当前有内部state。方案 `technical-plan.md:23–25` 把group fold按view+novelId独立，不可用用workId，默认展开，当前view内部hidden+inert保留实例；正文菜单是header sibling，不随body隐藏。切view、账户/目录、删除实体的状态清理和有效focus fallback明确。待恢复位置不能被自然夹限覆写；用户wheel/触摸/键盘/拖动及主动定位接管，异步列表到达由ResizeObserver/rAF再恢复；不能把HTML的同步数据当实际异步查询证明。 |
| 单一Shell布局写入 | `DashboardShell.tsx:136–149,205–214,271–280` 当前三组rAF写完整layout，`:238,359,430` 另有卸载repin/挂载/恢复写入。方案补充唯一协调器：原show/hide/fullscreen改intent、S及最新C/Q轴合成、其余轴推导、终态约束投影；挂载/卸载repin和restore也进同一提交者，不能留下第二个setLayout循环。保留原Group/Panel及420/560ms spring，固定内层W，仅用实际外层V裁切/平移，保持SidebarTree/编辑器实例。 |
| 目标存储与取消 | `workspace-layout.ts:7–10` 的settled helper不会自行修复打开中间值；`DashboardShell.tsx:411–435` 当前adapter读取中间layout并有恢复rAF，`:177–178` 会记录中途sidebar值。方案明确先返回协调器预计最终sizes/visibility再交helper，保存正常打开目标；restore/换向/卸载统一generation取消旧回调，不能把V当新偏好。`workspace-draft-source.ts:7–15` 要求合法百分比和总和，终态读值必须通过原schema。 |
| 窄屏、caption与native | `DashboardShell.tsx:472–486` 现窄屏导航直接切pane；`globals.css:2108–2141` 强制全宽/display，不能套桌面百分比动画。方案用实际Group全宽覆盖层+保留underlay，断点679/900后完成校正，不污染200–420桌面偏好。`ChatPanel.tsx:1698–1708` 恢复按钮目前只在hidden时显示，`ContentTabs.tsx:19–29,55–80` 两caption尚无恢复；局部caption props提供hidden-or-animating/快速换向和有效focus目标。`desktop.css:139–143` 已记录裁切后代仍可能注册no-drag；方案要求撤销内层app-region或有界host，并以真实Electron hit-test确认，44DIP/zoom与macOS88px安全区保留。 |

## 正式初审问题的处理

1. **P1：void门控无法可靠等待新Tab开启。已由正式方案第17、21行解决。** 实现不得只subscribe activeTabId后猜成功，或在guard尚未结束就close/reset Dialog；也不得对已不存在的目标调用仅支持existing Tab的activateTabForNavigation。新helper必须在原子提交前检查取消和源/目标失效，并以abort/guard竞速立即返回false解除busy，取消旧请求不能留下延迟激活。原afterSceneLeave异步分支同样核查捕获的源activeTabId/activationNonce，防止旧void请求覆盖后续新导航；同步void分支不变。创建已成功但离开被拒绝不能再次创建。这些是代码审核阻断条件，需相应真实store/React用例。
2. **P2：场景偏好副作用需诚实界定。第19行已明确沿用原行为。** 本轮不要求事务化SceneWorkspace；用例应分别断言分类切换不重置偏好，以及场景点击的原重置/guard行为，避免不符合现有源的“失败完全无副作用”断言。
3. **P2：统一维修flight必须有稳定承载。方案已要求统一，执行时不可退化。** 可在SidebarTree稳定层提取原控制器，或让同一个UnavailableWorks实例仅切表现props；禁止view条件分支/key导致维修控制器重挂载。切view/折叠期间第二次repair不得再次发IPC，原pending/restarting状态与真实锁修复交接保持。这项具体实现将在用例/代码审核检查，当前不另起实现。
4. **原v4布局/焦点/目标存储/窄屏/native问题仅作为正式执行约束继续存在。** 方案给出可执行方向，尚未实现和验收；代码审核必须查所有setLayout写入、取消/repin、实际Panel测量与normal约束，真实目标测试必须证明原生命中。不得因为历史HTML报告标为“解决”而省略这些检查。

## 下一阶段最低门槛

测试用例审核需把上述门控取消/竞争、已创建态、统一维修跨view、每view异步fold/scroll、完整Group协调器与adapter目标、窄屏/空caption/原生安全区落实到正式矩阵。可先为未实现要求编写红灯，但未覆盖风险的用例不得用一个UI冒烟替代。实施/测试结果在后续阶段据实填写，本轮没有正式测试结果。
