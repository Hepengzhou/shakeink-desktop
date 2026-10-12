# AI 对话首屏正式接入代码独立审核

初审日期：2026-10-12；最终原生证据复核：2026-10-13（Asia/Shanghai）。审核代理：implementation_review。范围：只读审核本轮实际 diff、欢迎/向导/模型/导航/选卡组件、公共资源清单和 Windows 验证脚本；仅写本审核记录，不修改源码或测试。依据同日方案、方案审核、CES-01–11 用例及用例审核。

**复审结论：代码审核通过，无已知新增阻塞项。** 初审发现已在实际源码中修复，最终专项60项通过；最终Windows双主题20组可观察检查的原始证据和指纹已独立核对。全量仓库回归尚未全绿，38文件浏览器复验仍待最终汇总；未观察的 visibility 分支和未执行范围继续单列，不把此结论当作整体全部验收通过。

## 发现与跟踪

1. **CES-05：外部消息副作用与选卡关闭，已修复。** `ChatPanel.tsx:1365` 的 `handleSendCardMessage` 先读实时所选模型和共享目录；无模型时把 text/action 放入明确暂停的待确认队列，并提示已保留，不跳过问题、不清选卡或原草稿动作。复审进一步发现 `CandidateActionPanel` 原 `sendMessage` 也会在事件返回后重复清选卡，已由主代理删除该重复判断；`CandidateActionPanel.tsx:121` 只发送原事件，统一由 ChatPanel 决定入队/直接发送时的关闭。采用候选稿链路不变。最终完整组件用例 CES-05d/05e 已同时验证外部事件和实际点击原选卡按钮两层，选择、槽位、完整意图保留且零 POST。
2. **CES-01：导航请求标记，已修复。** `ChatPanel.tsx:1632` 的欢迎 loading 条件包括 `requestedConversationId`，请求提交至 passive effect 开始加载的间隔也不呈现旧欢迎。
3. **CES-01：零消息当前选卡原占槽，已修复。** `ChatPanel.tsx:956` 的 `showCardPanel` 不再要求消息非零，仍按当前会话/作品归属和待答优先级判定，零消息也使用原 `CandidateActionPanel`。完整组件用例已增加原面板可见的断言。

两项验证关注也已处理：CES-01b 不再把单独待创建标题视为生成/建书状态；确认向导使用 `CreateNovelDialog.tsx:336` 的官方 Base UI `Popup.finalFocus` 回调。仅 ChatPanel 传真实 editor ref，确定准备草稿后聚焦它；取消返回原触发焦点，侧栏原调用行为保持。浏览器和 Windows 脚本均增加确认后的实际焦点断言。

### 后续 CES-06 发送清理增量复审

验收发现作者从失败的会话导航继续有效发送时，旧导航 alert 仍显示。主代理先用完整组件 CES-06b 取得有效 RED：`navigation-send-red.tap` 为 `1 !== 0`（发送后旧 alert 未清）。初次3行修复放在 execution token 成功之后；本代理识别到后方仍有 pendingRequest 的 message/storySelection 不匹配拒发分支，因此该位置会在未发送时误清错误。增加同一个 CES-06b 的拒发部分后再次取得有效 RED：`navigation-send-preflight-red.tap` 为 `0 !== 1`。

最终增量源码已复审通过：`use-agent-chat.ts` 仅在所有本地 send preflight 通过之后、markSent/生成状态及实际请求之前清 `conversationLoadError`。空消息、恢复未就绪、execution token 被拒、pendingRequest 不匹配的返回都仍保留旧目标错误；有效新活动开始后由新回合承担自身错误提示。没有修改既有默认值、模型选择、请求体、回合或导航所有权逻辑。当前 CES-06b 同时检查拒发零 POST且 alert 保留，再检查有效发送完成后 alert 消失。

最终增量后来完成两轮专项运行，各有58通过、2项超时。超时位置在真实按钮稳定性或夹具初始化/虚拟页面导航之间漂移，不能当作 GREEN，也不能只根据其不涉及业务断言就略去。随后主代理仅扩充夹具环境预算：每case180秒、Chrome启动60秒、动作等待30秒、导航独立60秒。复审未发现删除/放宽任何业务、几何、帧、草稿或模型断言，生产源码未再修改。

本代理已读取预算调整后的 `final-scoped-budgeted.tap` 完整汇总：60通过、0失败、0取消、0跳过，时长55370.4519ms；它覆盖最终20项完整组件及空态/动画/导航单元，而不是沿用旧19项报告。此前超时记录仍为失败/未完成证据，最终全量浏览器另由主代理执行并记录。

本轮 `--test-force-exit` 仅用于 Node 在所有测试与 after hooks 完成后退出，避免测试进程的其他存活句柄拖住整组；它不修改测试断言或把未完成的测试标为成功。本代理认可该有界测试执行方式，但此旗标和通过结果本身不能证明没有遗留句柄、RAF或监听器。生产动画 cleanup 的运行证据仍须来自实际生命周期断言，不能从强制退出推导。

### 全量浏览器逐文件 runner 复审

原全量force-exit命令在43条已观察 ok 后超过8分钟无新输出，由主代理仅中断自有 exec session，工具退出码1。已独立读取 `browser-full-force-exit-interrupted.json`：observedOkLines=43、observedNotOkLines=0、finalCounts=null、status=interrupted，没有最终suite summary；它不能记为 GREEN或全38文件通过。

新增 `check-browser-file-regression.mjs` 的源码复审通过，可执行但尚不声明其结果。它只枚举当前原 `tests/browser/*.test.ts`，逐文件新Node进程运行原断言；每文件5分钟总预算，已观察案例后2分钟无输出则看门狗判失败/未完成。PID只来自本脚本刚spawn且未exit的child，Windows终止仅使用该PID的子树，不枚举或按进程名终止无关Chrome/用户程序。

初审识别并已修复两类runner问题：终止操作本身没有上限，以及watchdog失败后仍可把TAP部分计数算成complete。最终taskkill最多10秒，随后最多3秒等待owned child退出；fallback释放读管道并unref未退出handle，避免runner自身又被该handle卡住。不确认退出时明确cleanupFailure，停止启动后续文件并列出unattemptedFiles，不能推测子进程已清理。

最终每文件complete要求无watchdog、正常close、整数exitCode、7项非负整数计数且tests=pass+fail+cancelled+skipped+todo。只有exit0且无fail/cancel才passed；不完整时counts=null，解析片段仅保留observedCounts。全量只有全部原文件完成才能合计，否则总counts=null；未尝试文件不会被标成已执行。分别保留原TAP、每文件JSON、最终全38汇总，原中断证据不覆盖。独立 `node --check scripts/check-browser-file-regression.mjs` exit0；未启动重复大测试或改生产/测试源码。

#### 原生Toolhelp清理与续跑更新（源码复审通过）

逐文件首轮实际报告不是全量通过：expectedFiles=38、files=15、passedFiles=14、complete=false、counts=null，第15文件为dialog-appearance，后23文件明确未尝试。主代理为避免本机taskkill挂住，新增原生Toolhelp快照 helper 和tag/startIndex续跑。保留不同轮次原证据及明确选定slice的方向正确，但该更新需再次审查，不能自动继承旧taskkill runner通过结论。

初审识别的根PID复用、陈旧PPID祖先链及不安全身份未计Unresolved问题已修复。最终helper验证held root的创建时间位于spawn前后UTC窄窗（只补1ms字符串量化容差，整窗≤1秒）、node名、快照根ParentID等于仍存活runner。后代只能经已持有并验证的父节点加入，每条边要求child真实StartTime≥held parent真实StartTime且≤快照时间。全链验证完毕才开始终止，任一不安全身份均fail closed；通过直接 `TerminateProcess(held Handle)` 终止已验证对象，不再按PID重新查找目标，不按全局名字/目录选择清理对象。

runner根据helper真实退出码、超时和未确认child退出驱动cleanupFailure；使用唯一有界cleanupDone，即使root close先到，也等待helper结果再结算，避免helper尚未exit时因null状态误停。PowerShell spawn使用windowsHide，保持10秒helper/3秒child退出预算和未退出handle unref；无法确认清理仍停后续文件并列unattempted，不伪造已清理。tag分隔每轮证据，scope明确startIndex选定slice，不能把部分slice的passed说成全部原38通过。

当前runner/helper源码复审通过，可由主代理先执行合成父子进程、错误创建窗口拒绝和无关进程保持三个真实检查，再续跑index14。本代理独立 `node --check` 与PowerShell Parser均exit0，只做语法/源码审查，未运行清理helper或大套件。实际helper及续跑结果仍须绑定新证据；本结论不声明它们已执行。

### 原作品锁浏览器夹具增量复审

原38文件覆盖报告360项中359通过、1失败，唯一失败为 `work-lease-ui.test.ts` 的LUI23-14（定向RED同样13通过/1失败）。独立读取诊断TAP：旧实例取消后，新工作台唯一残留真实dialog的标题和内容为“选择主题”，对应HEAD已有 `OnboardingController` 启动引导，不是作品锁遗留；本轮 `DesktopApp.tsx`/`OnboardingController.tsx` 无生产diff。

实际修复diff只包含解释注释及原 `emptyChildren` 边界增加 `./OnboardingController` 的generic null子组件，14项所有原业务/事件/订阅/几何断言未改变。仍执行真实DesktopApp、WorkLeasePendingDialog、BaseUI Dialog/Button及原lease状态逻辑；没有调用onExit或伪造引导完成、模型配置或锁修复成功，原guideRequest/ref保持真实状态。本代理认为这是原子组件隔离范围对新增独立workspace child的适配，复审通过；该null边界不用于证明引导业务。

独立读取 `work-lease-ui-rig-green.tap`：14通过、0失败/取消/跳过，时长9176.1159ms。没有重复运行大测试。主代理可使用这个当前文件指纹的独立14项结果，重建注明分文件来源的最终38覆盖汇总；原360/359/1报告、定向RED和诊断仍须保留，不改写为原全量命令已通过。本段不声明新的组合汇总已经完成，最终core复验另待实际结果。

### 原数据根目录身份采样夹具增量复审

最终core真实RED记录DR65-01的外来目录身份：actual inode=`39406496740159527`、expected=`39406496740159530`，device相同。独立数值命令证明该整数超过 `Number.MAX_SAFE_INTEGER=9007199254740991`，且 `String(Number(39406496740159527n))` 正好输出日志中的expected。生产 `directoryIdentity` 原本使用 `lstat(path,{bigint:true})`，本轮 `root-ownership.ts`/`data-root.ts` 无diff，因此日志直接支持夹具Number身份采样失真，不能把它说成已证实目录被换或正文丢失。

实际修复唯一差异是测试DR65-01的 `stat(p)` 增加 `{bigint:true}`；保持相同foreign设备/inode字符串结构、9条原深等价/外来目录不能被认领删除/迁移回滚/真实PGlite冷开断言。它把期望采样精度提高到原生产契约，不删除或放宽断言，源码复审通过。

独立读取 `data-root-directories-bigint-green.tap` 的最终summary：9通过、0失败/取消/跳过，时长48937.7778ms，文件与测试指纹已绑定。未运行重复大测试。完整core的1946项原RED仍须保留；这份9项GREEN只证明该修正文件，不能直接把旧整组40失败改为全量通过。

## 已核对契约

- 欢迎组件只呈现 Logo、标题、七入口；实际动作仍由同一个 `ChatPanel`、`useAgentChat`、store、contenteditable 和原 `CreateNovelDialog` 承担。没有引入预览 HTML/JS 或预览模板数据。
- 纯净守卫覆盖恢复、加载错误、生成/建书、跟随/执行恢复、问题/计划/请求、真实队列、当前归属选卡、通知、SOP 和进程。空队列即使 `queuePaused=true` 仍允许欢迎；当前实现另阻断 SOP 的读取和错误，并提供真实提示/重试。
- composer 父结构固定；欢迎与消息滚动区是其兄弟。模板追加先聚焦并选中末尾，只插入 suffix，使用原 `insertDraftAtCaret(...,{nativeUndo:true})` 后调用原 `syncFromEditor`，没有全量重建既有引用 DOM。组合输入期间入口禁用。
- 向导 `initialPreset` 在 false→true 的 layout effect 初始化，独立复制四组 Set、清空选卡与二次确认；开窗中 rerender 不重复套用。普通/侧栏调用不传 preset，保留本地启用模板查询、错误门控、两步替换和 `requestNewConversation({novelId:null,...})`；确定不建书或发送。
- 模型查询从原 `ModelPicker` 抽取，query key、响应契约和 staleTime 保持。没有用 `defaultModelId` 或列表第一项兜底。新发送按钮/命令/handleSend 和 central sendText 校验先于建书；自动队列校验先于队首 remove，目录/选择变化重评估。继承默认和旧回合 retry/approve/reconcile 的源码未被改写。
- 会话加载错误受 execution token、abort 和 account/conversation/draft owner 约束；加载开始、reset、草稿导航、账户恢复及通过全部本地 preflight 的有效新发送清理，新旧请求隔离仍沿用原机制。
- 一个 RAF 调度五个 sprite，直接写 frame/style；卡图连续分数位置展开至 12、停住、反向归零；Logo 64 帧交互循环。空闲不调度，降低动态/blur/hidden/modal/零尺寸/卸载暂停并清理 listener、observer 和 RAF。主题 CSS 局部作用，纸图 `grayscale(1) sepia(.5) brightness(.62)`、墨图灰暗，左小图标为静态 PNG。
- 两主题的尺寸、最大800px、480px断点及 dock 共享 gutter 源码符合方案；原44px原生标题栏 JSX 未改写。真实截图与 native lifecycle 由主代理验收，不由源码审核替代。

## 独立命令证据

- 读取公共 `manifest.json` 后逐个检查 bytes、PNG IHDR 尺寸、SHA-256、批准源图字节：21 张，失败 0。Manifest SHA-256：`1353f3bf2e590889bb2ecd9c05161d826e432d63f14bb6e167cfe7b61ee3e0fe`。
- `node --import tsx --test tests/unit/chat-empty-state.test.ts tests/unit/chat-empty-motion.test.ts tests/unit/navigation-chat.test.ts`：初审38通过；新增 owned-error/retry/reset/草稿导航/旧失败用例后独立复跑40通过、0失败、0跳过。首个 sandbox 执行因子进程 `EPERM` 未运行；受权重试成功，未把环境失败误记为代码 RED 或通过。
- 只读复审三份旧 unit 夹具 diff：`chat-model-selection`、`chat-selection-review` 加载实际新 `use-chat-models.ts` 再控制 React Query 接口，继续执行原 ModelPicker 选择/HTTP竞态回调；`composer-command-review` 只为实际捕获的新增 `hasLiveModel` 依赖提供有效模型条件，保留原快捷键路由的所有断言。没有删除、弱化、跳过测试，没有在夹具中重写生产选择逻辑。无模型门控由完整 ChatPanel 用例另行证明，不能把这个 routing fixture 的 `true` 当作模型验证。独立执行这三文件：17通过、0失败、0跳过。
- 已读取独立浏览器执行报告及原始 TAP：19通过、0失败、0跳过，文件 SHA-256 `0e8918ca2901250bcde337fcbe38b776df7366b2230a77d2f84e740476d51bea` 与报告一致。实际 CES-05e 点击真实 CandidateActionPanel 的“继续改进这张”，检查完整消息、暂停队列、选择及槽位、零 POST；CES-03/05c 检查确认后的实际 editor 焦点。完整浏览器执行由 production_audit 完成，本代理未重复运行，不把组件夹具称为原生验收。
- Windows 脚本只使用 `mkdtemp` 下合成资料，断言真实 `bootstrap.dataRoot`、Windows平台、零模型、自有protocol；调用 `context.setOffline(true)`，没有注入模拟桥或监听服务。读真实本地 API 核查确定后无作品落库；最终递归清理前检查 temp 根和固定前缀。最终 `windows-electron.json` 完成于 `2026-10-12T16:02:42.223Z`（北京时间2026-10-13 00:02:42）：双主题20组具体检查全部passed，页面错误0、渲染HTTP请求0、两次main监听快照均0。独立逐项重算其8个源码/资产/编译产物/脚本hash，匹配8项、差异0。没有重复运行大测试。
- 原生焦点验证边界已复核：脚本先关闭 Playwright 的 Chromium focus emulation，再在真实 Electron 进程创建第二个 `BrowserWindow` 接收原生焦点，等待主窗口 `document.hasFocus()===false` 后验证 sprite 归零，销毁辅助窗口后恢复主窗口焦点。读取首轮 `windows-electron-failure.json` 可见真实 `mainFocused:false/helperFocused:true`，后续失败发生在等待 true `document.hidden`，并非失焦分支。辅助窗口只加载 about:blank，由同一 app.close 清理，没有合成 blur/visibility event 或覆写原生属性。
- **CES-08 visibility 分支未观察，不能标为通过。** 较早失败和最终通过证据均表明实际 `BrowserWindow.hide()` 后 native visible/focused 均为 false，但自动化受控渲染器仍报告 `document.hidden=false`。最终纸/墨各有一条 native-hide 记录：nativeHidden=true、focused=false、frame=0、hidden=false；两次真实焦点转移均为 mainFocused=false/helperFocused=true。`limitations` 保留两主题 true document.hidden/visibilitychange 未观察。这里认可真实blur/hide导致动画停止及其恢复，只证明声明的具体检查，不能称原 CES-08 全部通过。
- 本代理实看最终 `paper-short.png` 与 `ink-welcome.png`：真实工作台没有示例作品/审核工具，四功能卡等高、单色彩色静态小图标和低亮右图、底部三题材卡、关联行和同一composer均可见；纸右图暖灰黄，墨右图灰暗，短窗口卡片与composer可达。截图不替代动态/点击断言。

复审源码 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `ChatPanel.tsx` | `9578b269b1ef6d37964b2de8473466335949ed878f9a027f35c25df949de8d2a` |
| `CreateNovelDialog.tsx` | `19ba723e811e4d3bc28692ed31c771dac421fd2bd44a15b0a6cc58275a7aabb0` |
| `use-agent-chat.ts` | `c01e1a28df2cf1102d4016eec2f559d6f843a664f785b14b929fb24a3c1fdad8` |
| `CandidateActionPanel.tsx` | `02cf57c9fd1ef3d470b62e36c9a3aa2354b05579b3ed1e408c7acc33575dfe96` |
| `ChatEmptyState.tsx` | `3d5d3f52ba2643c1ef991aced5cc22eb6750f831e842be43ce23bd2fe8de03c6` |
| `use-chat-empty-motion.ts` | `a03000d6d59214c0a486429915b82e2a9fa7c36e477a6a7f8749fde7dabfac88` |
| `smoke-chat-empty-state.mjs` | `195fba1c2c60312d14fb553d71c2493dd9bf508880f3e9a8eedfcf18644cfb1b` |
| `tests/unit/chat-model-selection.test.ts` | `f98368fefa93010e38d495ac309a700f3c975967b08c4aebeeea6a602fd0ee21` |
| `tests/unit/chat-selection-review.test.ts` | `e19fd3a82822a412a8b53a7c0bcaa0e800fa43e3a19852e2f2869a593cf334d9` |
| `tests/unit/composer-command-review.test.ts` | `2aed525172b17c21252bbee311e0d8711068cc24bb17e99125dd82c24d204c38` |
| `tests/browser/chat-empty-state.test.ts`（最终环境预算，含 CES-06b 拒发） | `2bb7274261ec1d1f673c39b0b01069ae2f062b39fb1d8cd140d0ffd053455477` |
| `final-scoped-budgeted.tap` | `84a7091425748fb0c089931bca29ceb14880e96fef35668503e31ec7a642df3a` |
| `scripts/check-chat-empty-regression.mjs`（标签分离、流式证据及可选 force-exit） | `310bb2e48da604b912c76c89de66c53f78f2fcae626579b33334eb2e6cf75e38` |
| `scripts/check-browser-file-regression.mjs`（有界逐文件runner、slice续跑） | `21b78097bbd0778a90b3297e7a8413c967bc83ccb0269bce362c1f195cf2dc0e` |
| `scripts/stop-owned-test-tree.ps1`（验证held父子身份的原生helper） | `c19a0530d48186b826f8296886b6136142c750bcbe91cd068835e5916f865782` |
| `browser-full-force-exit-interrupted.json` | `998047ee8180a96f7562829f8a108e8eca59818c3ad93748fc06daf5c4c07198` |
| `tests/browser/work-lease-ui.test.ts`（原null child边界适配） | `6a4b961562d9db78139fe76466cf776a35606d65907231baaaac967778acda61` |
| `work-lease-ui-rig-red.tap` | `430c955be48e5a912eb171be2619f34904ebed6b7db18ca5be76da5d78b19f8f` |
| `work-lease-ui-diagnostic.tap` | `89fdd18749d205a6700af3dcd95e8c36f0cdcfc0a973e6273115d14780ca55ba` |
| `work-lease-ui-rig-green.tap` | `3f20da55465b1c034d6182d27aec5b6628bab071b4e7934665f2d6b6c7b2b7a2` |
| `tests/unit/data-root-directories-review.test.ts`（bigint采样精度） | `73f283a8dacd392d198a691961dde69d9f16c7ce1bd2eca8e47ca2635d19c65f` |
| `data-root-directories-bigint-green.tap` | `c6208b3e87ff8f2d1e1c34683e1febfa488be093b101d6b03552d8c6cd086860` |
| `windows-electron.json`（最终双主题20组） | `ec4b5c8b4e7316b5f5e1a9430303a804d46af50342f03007de5a5beb157b899d` |
| `dist/main/index.cjs`（原生证据绑定） | `0f23f28b550020c3b13810147ff28d90e43ce484c8f60fac5289a0c8acacbfce` |
| `out/index.html`（最终编译页面） | `b5adcc8141d85609da329128c62ee79a78f3ecd0f3b5ca1768e7c2615d614c12` |
| `navigation-send-red.tap` | `e7b929a91c69fdb8b7fe8f83e30433e2c0bc6e3a0e006a70a8379feaa34cc1fb` |
| `navigation-send-preflight-red.tap` | `e775d05b3707d05abb216aab6ecb3f7f8a46502294603acc6a749c43f950655b` |

本审核认可明确记录的完整组件及Windows20组可观察证据，不宣称全量回归、CES-08全部分支、物理输入法、供应商生成、macOS或已安装包通过。本轮没有安装/发布结果。后续如生产源码因实际验收再次改变，须绑定新的摘要并复审对应变化。
