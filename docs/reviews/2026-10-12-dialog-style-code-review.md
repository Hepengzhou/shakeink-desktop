# 对话框样式实施独立 code review

日期：2026-10-12。范围：五个批准的产品文件 diff，新增 `tests/browser/dialog-appearance.test.ts`、`scripts/smoke-dialog-style.mjs`、`scripts/seed-dialog-style-fixture.ts` 及其目标证据。原有 composer 未提交改动未纳入评审。本代理未修改产品/测试/脚本，未执行测试或构建；唯一写入本文件。

## 产品代码结论

**最终独立 code review 通过，未发现阻断缺陷。** 修改符合已批准第二版：10% 黑色遮罩、无虚化、两主题轻影，保留 ring/布局/事件、排除定位 popup 和内联卡片。已只读复核 25/25 目标浏览器结果、7/7 相关 modal commands 结果、UI 编译/TypeScript 成功，以及真实 Windows 两主题 24 场景/18 交互的最终证据。通过范围仅限本轮列明的样式和交互；未执行项不冒称通过。

| 来源 | 独立检查 |
| --- | --- |
| `src/app/desktop.css:2–12` | 对话专属 overlay/shadow token，不更改全局 shadow-1/2/3。`.desktop-dialog-surface` 保留四个 Tailwind inset/ring 层与透明零影 fallback，追加批准的两段主题投影；不是粗暴覆盖 ring 的 box-shadow |
| `src/components/ui/dialog.tsx:34,56` | 共享 Backdrop 移除 blur 类并加专属 overlay；Popup 保留原 `ring-1 ring-foreground/10` 并加 surface；Portal、尺寸、动画和 close 属性无变更。55 使用位置继续经同一入口 |
| `src/app/desktop.css:105` | 已删除设置框旧 30px/100px 重影，原两栏宽高/边框/圆角未改 |
| `planning.module.css:350–360` 及后部 | 实际 `.dialog` 改用 token 并明确两种 backdrop-filter none；form/detail 统一投影。后置 foreground 35% 规则及 eventDrawer 旧侧影都已删除，没有后规则覆盖新值；四个 React 分支未重写 |
| `CreateNovelDialog.tsx:471,475` | 只替换局部背板/面板类，原 absolute 范围、点击冒泡与 Escape 分层代码不动；未增加全屏第二层，也未保留 45%/60% 或 shadow-2 覆盖 |
| `ScenarioPanel.tsx:221,224` | 专属 overlay 仅位于 active 配置条件内；`.desktop-scenario-dialog` wrapper 直接包原 ConfigForm，CSS 只命中其直接子 `.sc-config`；draft 内联路径未改 |

没有使用全局 `[role=dialog]` 或通用 Popup 选择器，伏笔 dialog-role 定位浮窗不会误纳入。`.ink` 仅覆盖对话阴影，纸色第二段 `.08` 正确保留，不是遮罩误用 8%。原生系统确认/文件目录边界随第二版已批准，产品 diff 未转换原生流程。

## 新测试审查

新浏览器文件现场编译当前 globals+desktop 与规划 CSS module，使用真实共享 Base UI、向导、ScenarioPanel/ChatView/ConfigForm、菜单/选择/Tooltip/ModelChoiceSelect；数据 GET 为内存夹具，Settings/规划/伏笔为明确标注的 CSS probe。无关 Monaco 模块替换为 throwing boundary，意外渲染会报错而不是假成功。所有非 GET 请求被拒绝。

断言读取已存在的实际节点，归一化背景颜色，检查 alpha/无虚化、两段准确投影、可见 1px ring、布局和关闭/焦点行为。四规划名称覆盖三种真实 CSS 形态，但未把 probe 写成实际 PlanningWorkspace 操作。菜单等排除项、真实 draft 内联的原 shadow-2 都有检查。

DIA-07 的 border 以同主题/同 scpane 上下文、未套专属类的 `.sc-config` 临时节点为 baseline。现有 paper scpane 缺少 chat-line-strong 的上下文可能计算为 0px；对照原值合理，不应为本次样式修改凭空要求或新增 1px。产品未更改该旧 border/token 事实。真实 Electron 脚本改为先读取同工作区 draft ConfigForm 的 border width/color，再与 active 弹出配置比较，更强地保留原有状态。

## 红灯与绿色证据边界

已读 `red.tap`：25 项中 21 失败、4 通过，其中 **18 项是本目标的有效样式失败**（共享 blur/轻影、设置重影、两主题四规划 CSS 分支、向导深罩、active 配置旧罩）。另 2 项伏笔影序列化包含透明 Tailwind 层、1 项嵌套 Tab 属测试 harness 调整，不能统称 21 项全部是产品目标红灯。最终测试通过透明层归一化、动画稳定及既有 border baseline 校正了这些测试前提，未要求修改产品行为来迁就夹具。

已读 `green.tap`：tests 25、pass 25、fail/skipped/cancelled/todo 均 0。已读 `modal-commands-green.tap`：tests/pass 7、fail/skipped/cancelled/todo 均 0。已读 `build-ui.txt`：Next UI 编译成功、TypeScript 完成。构建不计作测试通过，也未执行全量测试。本代理仅审核主代理实际命令生成的记录，未重跑这些命令。

## 真实脚本与夹具审查

seed 仅接收专用 mkdtemp 目录，在真实 Workspaces/Prisma 本地数据内创建最小作品、世界/时期/待定位事件、角色/场景和 active/draft 试验场，零模型配置，无 mock HTTP/API。smoke 强制真实 win32、默认本地开发 Electron 参数，确认 bootstrap 数据根与零模型，读取编译样式表/sourceHashes；无拟议 CSS 注入或 React state 注入。

脚本逐场景读取计算样式/截图/焦点与关闭结果，验证部署到当前编译 CSS 的真实组件。实际三规划分支明确列为通用 form、period-detail、event-detail；冻结时期居中 detail 明确 `not executed`，说明常规入口打开 period-detail 且冻结“修改时期”禁用，未用状态注入假称真实通过。

局部试验场配置已有无 Escape handler/无 focus trap 事实被记录为既有行为，不为了统一阴影改变它。网络证据限定 firstWindow 后 renderer 观察区间和每场景 main Node Server 快照，未冒称全 OS TCP/main/worker 全生命周期无网络。清理前校验精确目录位于 tmpdir 且具有专用前缀，没有递归删除外部用户目录。

审查中指出的验证脚本收口要求已关闭：每次 capture 检查 pageerrors/consoleErrors/rendererHTTP，最终两主题 `runTheme` 完成并关闭窗口后，写 `status:passed` 前再次对三个数组 `assert.deepEqual(...,[])`，覆盖最后截图后的 Escape/close 观察区间。最终 JSON 三数组均为空，记录的最终脚本 SHA256 与当前文件一致。

## 最终组合复核状态

已读取最终有效 `docs/evidence/dialog-style/windows-electron.json`：2026-10-12 15:15:08–15:15:47（Asia/Shanghai）执行，真实 win32/Electron 44.6.0、缩放 1，status passed；两主题各 12 场景，共 24 场景、18 交互。每场景记录实际 compiledStyleSheets、计算样式与截图，脚本同时断言模型零配置与隔离数据根；全部对话罩为 `rgba(0,0,0,0.1)`/none，两层向导为两个局部 10% 罩，内联配置和账户菜单无对话罩。各场景 pageerror/consoleError/rendererHTTP 和 main Node Server 快照均为 0；网络结论仍限声明的观察区间。

本代理只读计算了 manifest 列出的 18 个来源/编译文件 SHA256，均与当前文件一致，包含五产品文件、最终测试脚本、真实运行的 main/service/preload、out HTML/CSS。未以旧编译版或设计预览注入作为实施验收。

已查看 `windows-paper-contact-sheet.png` 与 `windows-ink-contact-sheet.png`，两主题各包含 12 个真实截图，背景字形/边缘清楚，设置/嵌套/向导框与规划右侧详情布局保留，试验场遮罩仅在业务区、draft 内联和账户菜单维持原有分层。联系表是浏览实际场景图的组合，不能增加新的测试通过数。

保留的 `windows-electron-failure.json` 为较早的 verifier 假设失败：paper wizard-detail 实际细边 `0.666667px` 在 DPR 1.5 下被旧断言要求为 `1px`。最终脚本按实际 device-pixel snapping 范围验证，sc-config 则以真实 draft 同上下文 border baseline 对照；异步 Tab redirection 等待稳定后检查。产品 border/焦点逻辑未为这些脚本修正而改变。旧失败文件不是最终有效 run，也不把其全部假设错误伪称产品缺陷。

三规划分支（通用 form、period-detail、event-detail）在两主题均实际执行；冻结时期居中 detail 仅源入口与真实 CSS-module probe 覆盖，真实 UI 操作仍 `not executed`。原生系统框、物理输入/IME、macOS、安装包、29 面板完整业务回归亦未执行。不将这些项目写成真实通过；源码/CSS 共享入口的覆盖证明与实际界面证据在最终台账分开记录。

本代理未运行截图/测试/构建、未改产品或验证脚本；最终结论基于审阅源码 diff、实际命令记录、匹配哈希和上述真实图像证据。
