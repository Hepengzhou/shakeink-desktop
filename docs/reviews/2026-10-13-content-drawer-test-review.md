# 右侧内容抽屉：正式用例独立审核

日期：2026-10-13（Asia/Shanghai）。审核 `2026-10-13-content-drawer-test-cases.md`、`tests/helpers/content-drawer-fixture.ts` 及实际 `tests/browser/content-drawer.test.ts`、`content-drawer-popup.test.ts`。本代理只写本报告，没有修改生产代码、fixture 或用例。

当前结论：**用例文档和真实组件隔离策略合理；P2-1 已在修订源码中关闭，P2-2/3 补齐并补审前，暂不准入根因 red/TDD。** 该结论是用例质量审核，不是产品失败或 green；编译、缺模块、环境和采样器故障均不能算根因 red。

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

## P2-2：控件几何与真实 caption scale 尚未被测

当前采样仅记录带 `data-geometry` 的 body/fields/actions 父框和整个 caption，尚未测真实 Tab/工具按钮/字段 input 各自矩形；父框相同不证明控件没有缩放或变形。`captionScale` 从 inner 读取，新增 wrapper 是 ContentTabs 的父层，读不到子树上 `--content-tab-scale`，可能始终为空而掩盖实际 caption 的 scale 变化。

最小修订：按稳定选择器/序号记录活动业务及真实 caption 的 input/按钮/Tab 矩形，逐帧与完整形态比较，不测隐藏 Tab；从真实 caption/ContentTabs 读取 scale，记录并断言 transform 的 scaleX/scaleY 为 1。保证正文 Range 行框、W/H、相对控件、caption padding/scale 都由真实 DOM 判据覆盖，而非依赖临时标记或预期 CSS 结构。

## P2-3：文档声明的 app-region Browser 判据尚无实际断言

文档 CD-07 规定动画 caption 为 initial、终态恢复 drag/no-drag；当前 sample 记录 region，但两份 test 没有断言它。正式方案明确有/无 Tab 两条 caption，不能只在真实系统计划中提及后就把 Browser 判据算为覆盖。

最小修订：至少加入有 Tab/无 Tab caption 的动作期及隐藏 app-region=initial、恢复后的 caption drag 与交互控件 no-drag 断言。该 Browser 检查只证明 CSS，真实 HWND 的越界 no-drag/窗口控件命中继续单列目标系统验收。

## Sanity 和证据边界

本代理先做隔离浏览器 mount/空状态采样 sanity：真实 Shell 挂载 1 个，采样器返回 5 帧。默认 Node v20 的命名导入互操作诊断曾失败，改 namespace/default 互操作后退出 0；这不是产品 red。随后按仓库约定使用 bundled Node v24.19.0 与 Chrome 独立补核完整 body：退出 0，真实 Shell/body 各 1 个，稳定状态采样 7 帧，W=436.40625/H=760，三段自然文字行数 4/4/2，page errors 为空。只执行编译、挂载和采样器 sanity，未执行用户目标的 red/green 断言，未增生产后门。

上述三项修订后继续补审。同意的其余覆盖不必机械重复，也不要求添加镜像实现的结构测试；每个新增断言均应直接证明用户形态约束或已批准的交互边界。
