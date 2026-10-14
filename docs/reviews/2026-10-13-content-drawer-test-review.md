# 右侧内容抽屉：正式用例独立审核

日期：2026-10-13（Asia/Shanghai）。审核 `2026-10-13-content-drawer-test-cases.md`、`tests/helpers/content-drawer-fixture.ts` 及实际 `tests/browser/content-drawer.test.ts`、`content-drawer-popup.test.ts`。本代理只写本报告，没有修改生产代码、fixture 或用例。

2026-10-14 最终补审结论：**原 P2-1/2/3 均已在实际修订源码中关闭，新增真实 ItemLevelPicker 无外点击因果 case 也通过源码补审；正式 Browser 用例准入根因 red/TDD。** 当前没有未解决的用例阻断。先按本用例执行未修复版真实几何 red，再进行实现/green；编译、缺模块、环境和采样器故障均不能算根因 red。此结论不代表产品失败、green、真实 Windows 或最终验收通过；native harness 准入见单独 native-review。

## 已符合要求的部分

- fixture 的 esbuild 仅隔离 Chat AI body 和 content registry/Staged/Story body。真实 Shell、useSidebarDrawer、Group/Panel、SidebarTree、ContentTabs、stores、workspace adapter、共享 primitives 和 command runtime 保留。ContentTabs proxy 捕获实际 Shell callback 并原样渲染真实组件，不替换 hook、布局写入或动画，也不增加产品测试后门。
- 正文自然换行且未固定业务宽度，两列字段与 input React 状态可揭示布局缩窄；旧实现无 wrapper 时退回真实 `.content-tabs`/`#content` 测量。根因 red 可由宽度与文字行框触发，而非缺 wrapper/data 属性。
- 实际用例覆盖双主题首次显示/关闭/重开、恢复入口换向、左右并发与 full 替换、hidden/closing full、600/899px 窄屏普通返回与真正隐藏、900/899 双向宽高 resize、并发 restore、减动、实例/草稿/选区/scroll/焦点 ownership、自动激活不抢焦、隐藏 editor target。
- Popup 用例调用真实 shared DropdownMenu/Select/Tooltip/Dialog，覆盖内容 owner 内 uncontrolled/controlled、内容外菜单不被误关、首次 rAF 暂停、关闭 finalFocus 不落回 inert trigger、重开不自动复活、新主动打开、业务 Dialog 输入与其内部 Select 可用及保存。不是全局 Escape 清场测试。
- `CD-07` 已修正为 hide 后等待首次 rAF 再测 enabled，符合 React 提交边界，不再要求同步调用栈中尚未落 DOM 的 inert 已生效。采样已排除 hidden Tab，避免重复 data-key 覆写；作者新增的 `__name` identity shim 只支持 tsx 序列化函数，不替换产品逻辑。
- 文档第 29 行明确真实 Windows/目录包的 Monaco、固定与主动 zoom、有/无 Tab caption、真实 ItemLevelPicker、Tab drag、分栏、冷启和 HWND 验证范围；macOS 外观切换不计真机，未执行项不计通过。隔离 input 不能证明真实 Monaco 或 29 类业务。

## 初稿 P2-1（已关闭）：移动帧过滤依赖被测实现的 phase

补审：当前采样从动作前同步样本开始；`assertFixedFrames` 用实际 V 对初/终值的变化界定连续区间，并保留延迟 phase 的冻结帧；非终态 V 明确要求 moving phase，实际右锚差也逐帧验证。已消除仅依赖被测 phase 过滤的漏洞。旧实现仍先检查实际 W/H 和行框，不以缺 phase 作为根因 red。

当前 `assertFixedFrames` 仅把 phase=opening/closing 的帧纳入比较，phase 已出现但提前变为 open 的实际运动帧会被漏掉。实现只要在至少八帧后提前结束 phase 并继续改变 V/业务宽度，就可能通过“每帧不变”断言。首次可见时错误标签 open 也会漏掉首帧。产品 phase 正是被测状态，不能同时作为唯一采样筛选依据。

最小修订：根据动作段的实际 V 变化和最终目标识别非终态帧，至少将非端点/相邻尺寸变化帧纳入比较；要求 phase 在 V 尚未完成时不能提前落 open/closed。全文动作记录可保留 phase 延迟的冻结帧，但不能依赖 phase 排除实际运动。full 替换允许真正最终 reflow，应单独确定终态，不能把任何 phase=open 都当成允许重排。旧实现仍必须先触发测量宽度/行框变化 red。

## 初稿 P2-2（已关闭）：控件几何与真实 caption scale 尚未被测

补审：已分别采集真实 caption Tab/关闭按钮/工具和活动 panel 的各 input/button；几何 key 保留稳定身份、全屏状态标签统一为同一工具。正文及 Tab title 用真实 Range 行框，scale 从真实 caption/ContentTabs 取非空值，matrix scaleX/Y=1、skew/ty=0 单独断言。只排除 Select 自身的隐藏 1px form proxy，不因整个动作 aria-hidden 而漏采真实控件。独立 Node 24 双 Tab/空 Tab sampler sanity 均可运行，captionScale=1、matrix=1/1；未执行行为 green。

当前采样仅记录带 `data-geometry` 的 body/fields/actions 父框和整个 caption，尚未测真实 Tab/工具按钮/字段 input 各自矩形；父框相同不证明控件没有缩放或变形。`captionScale` 从 inner 读取，新增 wrapper 是 ContentTabs 的父层，读不到子树上 `--content-tab-scale`，可能始终为空而掩盖实际 caption 的 scale 变化。

最小修订：按稳定选择器/序号记录活动业务及真实 caption 的 input/按钮/Tab 矩形，逐帧与完整形态比较，不测隐藏 Tab；从真实 caption/ContentTabs 读取 scale，记录并断言 transform 的 scaleX/scaleY 为 1。保证正文 Range 行框、W/H、相对控件、caption padding/scale 都由真实 DOM 判据覆盖，而非依赖临时标记或预期 CSS 结构。

## 初稿 P2-3（已关闭）：文档声明的 app-region Browser 判据尚无实际断言

补审：新增有 Tab/空 Tab 的实际 caption CSS case，正常/hidden/opening/closing/reopen 分别检查，空分支通过真实 store 清空 Tabs、真实 Shell 已注册命令重新打开。独立 div probe 得到 Chromium CSS initial computed value=none，避免错误要求字符串 initial；open 检查 caption=drag、独立工具=no-drag。Tab 内关闭按钮保留 bounded viewport 的原规则，没有不必要的结构镜像要求。真实 HWND 仍由 native harness 单列。

文档 CD-07 规定动画 caption 为 initial、终态恢复 drag/no-drag；当前 sample 记录 region，但两份 test 没有断言它。正式方案明确有/无 Tab 两条 caption，不能只在真实系统计划中提及后就把 Browser 判据算为覆盖。

最小修订：至少加入有 Tab/无 Tab caption 的动作期及隐藏 app-region=initial、恢复后的 caption drag 与交互控件 no-drag 断言。该 Browser 检查只证明 CSS，真实 HWND 的越界 no-drag/窗口控件命中继续单列目标系统验收。

## Sanity 和证据边界

本代理先做隔离浏览器 mount/空状态采样 sanity：真实 Shell 挂载 1 个，采样器返回 5 帧。默认 Node v20 的命名导入互操作诊断曾失败，改 namespace/default 互操作后退出 0；这不是产品 red。随后按仓库约定使用 bundled Node v24.19.0 与 Chrome 独立补核完整 body：退出 0，真实 Shell/body 各 1 个，稳定状态采样 7 帧，W=436.40625/H=760，三段自然文字行数 4/4/2，page errors 为空。只执行编译、挂载和采样器 sanity，未执行用户目标的 red/green 断言，未增生产后门。

追加 Node 24 独立 sampler sanity：真实双 Tab 下逐个读到两个 Tab、Tab close-buttons、工具、正文两个 input 和业务按钮；真实空 Tab caption 下读到单独“隐藏内容面板”工具。两分支 scale=1、caption=drag，独立 initial probe=none，进程退出 0、无 page errors。该检查验证最终采样结构的可执行性，仍未运行 fixedFrames/paused 目标断言。

新增 ItemLevelPicker 的理由：实际 native outside-click 路径只能证明普通关闭生命周期，不能隔离 direct Popover 的 context pause；现有 shared primitive cases 也不会自动覆盖它。

最终补审实际 `content-drawer-popup.test.ts:61–79`、fixture 的真实 import/body 挂载/query seed：直接导入 `src/components/content/ItemLevelPicker.tsx`，esbuild 没有替换它；QueryClient 用源码相同 `settings/novelId/LEVEL_SYSTEM` 和 `worlds/novelId` key 的正常空数组形状，worldIds 为空不产生隐含请求。真实“选择等级”按钮打开实际 direct Base UI Popover 后，通过已捕获的真实 Shell callback 收起，期间没有 click/pointer move/Escape 可独立 dismiss。首 rAF要求 owned Popup 不再 active，finalFocus 不回 inert trigger，重开不自动复活，新主动 click 能再开。该用例直接验证本次真实业务接入 context 的行为，不扩大 DesktopCommandController 范围。

作者/主代理最新 Node 24/Chrome sanity 已提供：trigger/dialog 各 1 个、真实空体系文案、requests/page errors 均为空；该记录仅作实际组件和定位可执行证据，未当作暂停因果 green。本代理完成上述最终源码补审，没有重复全量 sanity 或提前运行 red/green。

## 2026-10-14 首可见帧 oracle 边界修订

主代理首次 `red-01` 暴露的是 Panel 注册准备阶段 W=0/V=0 的断言过早，尚未有用户可见的内容变形。按方案“任何可见帧之前准备 W/H”，独立补审 fixture `assertFixedFrames:188–204` 的最小修订：raw recorder 不变；actual V 与 phase 的联合候选区间不变；仅跳过 leading V≤0.35 的不可见准备样本，从区间内首个实际可见帧连续比较到末个非终态 V/末个 motion phase；比较开始后的 closing V=0 冻结帧继续保留。错误信息现在包含实际 V，不退回 phase-only 漏验。

该修订通过用例补审，Browser 用例继续准入。`red-01` 保留为判据边界修订前失败，不计作用户目标的根因 red；应由主代理以新 label 运行，确认实际可见 W/文字行框变化后再进入 TDD，不能覆盖旧记录或把无效判据失败冒充已完成 red。此处没有修改生产，也没有因测试失败而放宽首个可见帧的形态要求。

同意的其余覆盖不必机械重复，也不要求添加镜像实现的结构测试；每个新增断言均应直接证明用户形态约束或已批准的交互边界。
