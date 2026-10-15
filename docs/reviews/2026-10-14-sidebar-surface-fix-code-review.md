# 左导航展示缺陷：独立代码审核

日期：2026-10-14（Asia/Shanghai）。范围：本次两个生产文件的表层修复、新 `sidebar-surfaces` 浏览器用例、抽屉 helper 的合成记录方法、Windows verifier 和证据 runner。只写本审核文件，没有修改代码、启动测试或操作正常用户应用。

结论：**代码审核通过，生产阻断项 0**。允许进入范围回归、构建和真实 Windows 验证；本结论不等同这些后续检查全部通过。

## 生产修复

- `src/app/desktop.css:143` 去掉局部 `scrollbar-width:thin`，没有复制或更改全局轨道/滑块尺寸与主题变量；`globals.css` 的应用基准继续提供外观。
- `SidebarHoverCard.tsx:217` 用 body Portal 承载原来唯一的浮层。Provider 的初始 state 是 null，SSR/首个 hydration render 不会求值 `window` 或 `document.body`；state 只能由客户端悬停事件设置，因此没有新 SSR 全局访问错误。卡片仍处于原 React Provider 树内，QueryClient、导航暂停上下文及惰性查询不会因 DOM 位置改变而丢失。
- owner 令牌、400ms/200ms 计时、window scroll 捕获、行点击/卸载处理、pausedRef 以及 paused/epoch effect 保留。`state && !paused` 在暂停 render 即排除 Portal；清理 effect 归零状态和隐藏计时器，重新展开不会自动恢复旧内容。没有改动抽屉固定宽度、坐标钳制、动画、业务数据或 AI 渲染。
- 根级 z-40 高于普通工作区/窄导航，低于真实共享 Dialog/菜单 z-50。专属 `[data-sidebar-hover-card]` no-drag 仅定义本卡边界，不扩大导航全局排除区域。各卡片内容仍使用全局主题变量，复用原组件和文本预览标记。

## 测试与证据工具

- 新浏览器用例比较实际标准滚动条属性、伪元素和滚动槽；双主题浮层定位要求误差小于 1px，并实际命中卡片中心/右侧。生命周期用例包括已打开卡和不足 400ms 的待定悬停取消；模态测试先要求卡能绘制，再打开真实创作向导，要求卡仍在 DOM 且被遮罩/弹窗盖住。上一轮审核提出的两项前提断言已落实。
- `drawerSeedNavigation` 只向现有 QueryClient 注入公开合成作品、空 worlds/characters 等数据，Shell/Group/Panel/SidebarTree/浮层继续为真实组件。原 helper 的聊天 body 隔离边界仍明确，不把浏览器 helper 当真实数据库或完整 ChatPanel 证明。
- `run-checks.mjs` 使用实际命令退出码、完整 TAP 汇总和失败标题，任何失败停止后续步骤；固定范围文件清单、120s 测试超时、15min 外层预算，没有跳过失败或修改断言。每个 label 先拒绝已有报告/日志，源码运行前后 SHA 比较；它只改证据文件和正常编译产物，没有接触用户数据。
- `verify-sidebar-surfaces.mjs` 限 Windows，创建新 `shakeink-sidebar-*` 临时目录，调用现有真实 seed。seed 约束 canonical tmpdir 内、目录前缀且初始为空，使用 Workspaces/PGlite 生产服务。Electron 只使用该临时 `SHAKEINK_TEST_ROOT`，bootstrap 再校验 root 和零模型；所引用 HWND 来自这一隔离 Electron 进程，没有枚举/操作正常应用窗口。
- Windows verifier 保持严格位置/AI 区域包含范围/实际 DOM 命中、移动保留/滚动清理/抽屉清理/真实业务 Dialog 断言。原生结果要求三个 label 数量/顺序完全对应请求，真实空白 caption 为 HTCAPTION=2，卡中心/右侧为 HTCLIENT=1；原生读取前后又验证卡仍绘制且未位移，避免读已消失卡或空结果产生假通过。源码/bundle/可执行文件运行前后 SHA 保持检查，无测试 CSS 注入或浮层替身。

## 已读执行证据与限度

`red-04.tap/json`：14 项，8 通过/6 失败，失败为两个主题滚动条差异、两个主题二次变换定位、真实抽屉裁切和真实创作向导被卡覆盖，无取消/跳过。此前 fixture 异常试跑全部保留，不算缺陷证明。

`green-01.json`：12 通过/2 失败。失败是 SS-02 所选较低伏笔行受到原有视口 y 钳制，而测试误期望未钳制 y；修正仅将 SS-02 改为上部真实设定行，继续保留小于 1px 的 x/y、双位置命中和 no-drag 断言，没有改生产定位或容差。red-04 与当前测试 SHA 因这项测试行选择修正不同，不宣称完全相同冻结文件。

已读取 `green-02.json`：14/14 通过，0 失败/取消/跳过；`typecheck-02.json`：tsc 退出 0。两份报告 changedSources 均为空。当前尚未读取最终范围回归、构建或 Windows 实际结果，不能记为通过；安装包/macOS/物理鼠标及旧全仓失败状态继续保留。

Windows 脚本当前记录导航 thumb.color，但尚未比较真实内容滚动区/主题基准；若最终报告把“与内容区一致”归于 Windows，应补实际比较，或准确注明该一致性由浏览器 SS-01 的普通滚动容器比较证明。其 Server 检查只检查 Electron 主进程活跃监听句柄，HTTP 列表只覆盖已注册监听后的 renderer 请求；不能扩称所有子进程/整个启动期网络行为证明。

## 审核绑定 SHA-256

| 文件 | SHA-256 |
| --- | --- |
| src/app/desktop.css | 6c0e3ab1a4cbe02701a88f47be40171d46646d523ef19652604da27544d51a2d |
| src/components/layout/SidebarHoverCard.tsx | d02909c537f72ecb74c2d6e435236c48121e681d928692efcc72b74251ae0801 |
| tests/browser/sidebar-surfaces.test.ts | ed62fe1a55791c1c6013ae2bc1abe41153f9f60c6ee926d3b9b1b842c82dcb34 |
| tests/helpers/sidebar-drawer-fixture.ts | 4314440da7a747c44036cae23d12156eda67f55d8a213eb977e294dff2cf3c6d |
| scripts/verify-sidebar-surfaces.mjs | edd01711c7fb4ae4063a5e326029cfaad2f59359e9252e55bbd9677b1c4c2406 |
| docs/evidence/sidebar-surface-fix/run-checks.mjs | ea1dfafb46bbc4433d65281d7472b00bf61ae2ce81a031dae211aa4bfb891ac9 |

## 取证时序与 Windows 比较修正版复核

已读取 `regression-01.json/log`：unit 55/55、browser 85/86，唯一失败在 SS-06 的“卡仍存在”前提，实际 count=0、期望 1，changedSources 为空。该次没有保留下来的卡可用于层级判断，既不能记为层级通过，也不能单凭此失败判定 Portal 堆叠回归；失败记录继续保留。

**认可将这项取证合并到单次 renderer 调用，代码审核仍无阻断项。** 新脚本在点击真实创建入口之前保存原卡 DOM 引用并注册 rAF，在首个实际可见 Dialog 帧采集；条件检查真实 modal 的 visibility/display/opacity/非零宽度，然后要求原 card.isConnected、浮层数恰为 1 和实际 elementFromPoint 不再命中该卡。不会容忍缺卡、替换卡片、修改计时器或禁用滚动；多次 driver 往返造成的窗口外测量延迟被消除，原 200ms 隐藏行为仍完整执行。先前的“卡能够绘制”前提和真实业务 Dialog 最终可见检查继续保留。

Windows verifier 已补本轮计划要求的真实内容区比较：通过实际 ContentTabs 点击既有主题 Tab，读取 `ThemePanel.tsx:231` 的生产 overflow-y-auto 容器；先要求其 max scroll >0，再将标准宽度、WebKit 宽度、thumb 颜色/边距/圆角/background-clip、track 七项严格与导航比较。没有新建假参考滚动区或注入样式；新增 ChatPanel/ContentTabs/ThemePanel 的 source SHA 监测。前文“Windows 尚未比较内容区”的提醒在脚本层面已落实，实际是否通过仍待新的 Windows 执行结果。

当前修正版绑定：`tests/browser/sidebar-surfaces.test.ts` SHA-256 `e9a39bbcfceeb2d81d6b8b00be46418cd02b29aaab07ec591393852e1877f816`；`scripts/verify-sidebar-surfaces.mjs` SHA-256 `defae9239e494713c77796181b3b5946bc758561344639d05cdd107087aced87`。两个生产文件及证据 runner 与前表 SHA 相同。regression-02 尚未读取终态，不记为通过。

## 范围回归及边距读值前提复核

已读取终态 `regression-02.json`：8 个 unit 文件 55/55、8 个 browser 文件 86/86，全部 0 失败/取消/跳过；新 14 项已包含在 86 项中，不重复累加。`typecheck-03.json` 的 tsc 退出 0，`build-01.json` 的 Next UI 与 desktop build 均退出 0。三份报告 changedSources 均为空，监测 1073 个源文件，不能扩称全仓测试绿色。

`windows-01/report.json` 保留失败：实际 border 读值 `2.66667px` 不等于脚本写死的 `3px`，尚未完成滚动条比较或原生命中。认可调整边距数值前提：新版先独立读取实际 devicePixelRatio，再用 `floor(3*dpr)/dpr` 计算整物理像素对应的 CSS used value，并 `toPrecision(6)` 序列化为六位有效数字（不是加入六位小数容差）。例如 DPR 1.5 的结果为 4/1.5，字符串 `2.66667px`，与前次失败读值相符。

修改没有改 CSS 的 3px 标准、截图外观、产品代码或比较容差；仍对 border 作严格字符串相等，导航与真实溢出 ThemePanel 的七项属性也仍严格 deepEqual。该计算是对当前实际 Chromium/DPR 环境读值前提的修正，其他 DPI/浏览器不在本轮通过声明范围。读取时 verifier SHA-256 为 `e441d55e78a54fc507ab90dab07dff3bafd6c1fe61fe1a64a70f020be309ced6`；其余前述生产、浏览器测试、helper、runner SHA 未变。

已读 `windows-02/report.json` 也为 failed：真实 theme-panel 存在但 hidden，等待可见超时，尚未进入新的 scrollbar 比较和 native 检查。两个 Windows 失败均保持原样，当前不能宣布 Windows 验收通过；需由后续新的独立 attempt 提供可见真实内容区和全部检查终态证据。

## Windows 前提及诊断增强复核

当前 verifier SHA-256：`51e44ed3b0d1d208f54fcec2734c66cd3741bff83a644e5ddfb4454affa66545`。已独立读取完整脚本增量，**认可，未发现强改 DOM/CSS/store 或放宽结果断言，阻断项 0**。

- 初始条件新增实际工作台恢复检查：等待种子既有两 Tab 全部出现且原正文 Tab 为 selected；随后等待抽屉终态及连续五次稳定 panel 几何。0.02px 仅用于判断测量前是否静止，不用于任何最终位置或样式验收容差。
- 主题内容区先走真实 ContentTabs 点击，点击前后保存工作区和 hidden/inert/display 祖先记录。若真实面板仍不可见，走真实左导航“设定 → 对应作品 → 主题”入口并再次检查已有主题 Tab selected、生产 ThemePanel visible。这属于用户可执行的准备路径；没有调用 store.setState、私有布局方法、取消 inert、删除 hidden 属性或写入 CSS。保留原入口失败诊断，不能将后续成功解释为原 Tab 点击/冷恢复问题已修复。
- 角色选择器改为真实 accessibleName `林舟 · 主角`，与 `SidebarTree.tsx:440` 的 `accessibleLabel` 一致，不改条目内容或条件。
- 七项滚动条实际严格相等、内容区真实 overflow、位置 1px、AI 范围及实际命中、三个 native label/HT1/HT2、模态原卡存活、生命周期清理断言均保留。新增失败现场和源/bundle/executable 后核只增加证据；失败分支仍设置 failed/退出 1。
- Electron、原生命中及关闭的对象仍为这次 `_electron.launch` 创建的隔离进程；`ownedProcessId` 用于归属记录，无按全系统 HWND 查找并操作正常窗口的代码。

此复核仅批准 harness 增量，windows-03 尚未读取实际终态，不在此登记 Windows 通过。
