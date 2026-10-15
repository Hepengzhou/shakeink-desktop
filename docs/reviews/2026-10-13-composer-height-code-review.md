# AI 对话输入框最大高度翻倍：独立代码审核

日期：2026-10-13（Asia/Shanghai）。范围仅为 `ChatPanel.tsx` 本次注释/effect/max-h 三行、`chat-empty-dock.css` 的 96→192，以及 `scripts/verify-composer-height.mjs` 全文件。其它任务改动未修改。

结论：**通过，当前无阻塞项。** 原脚本的滚动前置条件与菜单关闭操作已在本轮审查反馈后修正。实际 Windows 专项15/15和原浏览器全量41文件425/425结果已补审，依据见下；本记录不替主代理声明核心全量、macOS或安装包验收通过。

产品变更：`git diff --numstat` 实测 `ChatPanel.tsx` 为 3 行替换，CSS 为 1 行替换；完整 diff 仅包含本项。`ChatPanel.tsx:1492–1498` 保留先设置 auto、再按 scrollHeight 取最小值的原自适应 effect，把上限改为 280px。`ChatPanel.tsx:2087–2089` 将同一真实 contenteditable 的最大高度同步为 280px，保留内部滚动与空态48px/会话态52px最小高度。`chat-empty-dock.css:10` 保留原媒体条件和空态作用域，仅将96px改为192px。符合最新用户允许翻倍的范围，无设计 HTML、复制示例、模型配置、服务或上游目录变更。

专项脚本实际行为：

- `:33–39, 52–60, 72–79` 从实际 editor 读取 inline height、计算样式、DOM 矩形、client/scrollHeight；填入真实多行文本后断言280px或192px，并检查短文/清空自然收回。预期不从产品源码提取，不会随旧上限自动变成通过。
- `:48–50, 109–145` 使用真实 Windows BrowserWindow 调整尺寸，以 renderer `innerHeight` 判断 ≤650 和 >650；paper/ink 分别覆盖空态与有消息会话、小窗口、滚动、收回和 Shift+Enter。
- `:41–46` 检查模式/发送按钮在视口内，并真实点击模式按钮、打开和关闭菜单。无模型状态的发送按钮本来禁用，本项不将其点击或供应商发送作为通过项。
- `:81–105, 129–132` 使用隔离 `Workspaces` inbox 与真实 prisma 会话/消息，关闭数据库后再启动 Electron，通过原 SidebarTree 点击条目并确认真实消息，不伪造 renderer 接口或 React 状态。`defaultState` 的模型为空（`desktop/core/settings.ts:40–49`），bootstrap 进一步检查模型数量为0与实际 dataRoot；脚本不读取或写入 Key。
- `:15, 82, 93, 154–159` 在 mkdtemp 新建的专属目录中创建两套主题数据，Electron 由 `SHAKEINK_TEST_ROOT` 指向隔离目录。`desktop/main/brand-startup-paths.ts:28–35` 将 bootstrap 设为主题 root 的 `-bootstrap` 兄弟目录，仍位于本次临时总目录内；`desktop/main/index.ts:64–79` 将 userData 设到该隔离 bootstrap。退出后先检查总目录绝对父路径及专属前缀再递归清理，删除目标没有越出本次 mkdtemp 目录。
- `:22–30, 150–159` 绑定源码和编译输出 hash，失败时保留错误、尺寸和截图，正常进入验证后成功/失败均关闭 Electron、清理隔离数据并写报告。red/green 标签只用于证据目录，相同高度断言保留。

本轮发现并已修复的测试前置问题：旧脚本在 fill 后直接向下 wheel，fill 会把光标置于末尾且可能已滚至底部；旧红灯记录 `scrollTop=740`，等于 `880−140`，此时向下滚动无法继续增大。当前 `scroll():62–70` 已先设 `scrollTop=0` 并 poll 确认，再记录 before 和发出 wheel，最后验证实际滚动增量和高度不变。该赋值只准备起点，成功滚动仍由真实 Electron 的 Playwright/CDP wheel 输入触发。旧红灯在 CH-01 已退出，未进入此分支，修正没有改变形成红灯的280px预期。

验证依据：`node --check scripts/verify-composer-height.mjs` 执行两次均 exit0；未另启动 Electron 或构建，避免与主代理争用。首轮审核脚本 SHA256 为 `4f24e7a09cc69912f0989db7a255d5e1c7edaadb5976d48cc9e6573c74c818ba`；当前补审后 SHA256 见下。`docs/evidence/composer-height/red/windows-electron.json` 记录 Windows Electron 的空态实测 inline/computed/实际高度均140px，scrollHeight880px、innerHeight900，失败明确为预期280px实际140px；无 renderer 错误、观察到的HTTP请求数0、main监听快照0，隔离数据已清理，属于有效旧高度红灯。

结果边界：request/pageerror 监听在 firstWindow 返回后安装，故零错误/HTTP结论限于观察时段；main监听数来自启动就绪后的一次当前句柄快照，不能扩大为所有进程/整个生命周期的网络审计。Shift+Enter 覆盖实际换行；零模型门控使本轮不覆盖已配置模型的发送行为。Playwright/CDP 输入不代表物理鼠标/IME；开发 Electron 不代表安装包或 macOS 验收。源码/构建读取在顶层验证 try 之前，缺失构建等初始化失败不能算有效红灯，亦不能按本轮专项通过处理。待实际绿灯及全量命令结果回报后据实补充，不提前标全绿。

补审 `toolbar()`：通过，无新增阻塞。`green-attempt-1.json` 保留初次真实 green 的12个完成检查；失败位于 ink CH-06 最后一次菜单关闭断言，Escape 后菜单仍可见，没有把该失败计为通过。当前脚本改为点击实际“标准模式”menuitem 再等待菜单关闭（`:45–47`），原 React 对应 `ChatPanel.tsx:2194–2197` 的 `setMode('standard')`，隔离默认模式原已是 standard；该操作验证实际菜单项可点击并可关闭，未削弱280/192px、滚动或收回断言。默认模式菜单点击的覆盖不代表已验证 Escape 关闭语义。当前脚本 SHA256 为 `1726e88dacf1ae44b4217a2d07402e89d3c448af43062238b2455d928045b151`，补审语法检查 exit0。

主代理授权补审后执行原浏览器回归入口 `scripts/check-browser-file-regression.mjs composer-height`。当前 `tests/browser` 枚举41个 `.test.ts` 文件，较此前38个基线增加3个；按原runner全量执行并据实记录，覆盖原38个文件，未修改测试源码或断言。浏览器结果已写入指定 `docs/evidence/chat-empty-state/browser-files-composer-height` 与 `browser-full-files-composer-height.json`。本审核子代理不启动额外Electron；核心回归由主代理另行执行。

补审实际 green：已读取 `docs/evidence/composer-height/green/windows-electron.json`，状态 passed、15个完成检查；其脚本 hash 与当前补审版 `1726e88dacf1ae44b4217a2d07402e89d3c448af43062238b2455d928045b151` 一致，ChatPanel hash 为 `d28a3133914b77e0ebf323f92fbb1b72edfc0aec7f930e95f2ac5028e4e70507`，CSS hash 为 `99bd8051f2b6b7ccdf8eb376a90ccdc8048918343592da281fdc68905a8ebdf1`。paper/ink 各自实测正常空态及会话高度280px、小窗口空态192px（innerHeight650），7行自然高度167px；短文/清空收回至48px/52px。报告记录 wheel 增量断言、模式菜单实际操作及 Shift+Enter 通过；观察时段renderer错误/HTTP为0，两主题main监听快照均0，隔离数据已清理。主代理已查看真实截图；本补审依据原始JSON与源码hash确认尺寸结果，不另运行专项。

浏览器执行环境：bundled Node v24.19.0。第一次sandbox启动因 spawn EPERM 没有测试子进程启动，记录 `browser-files-composer-height/initial-sandbox-spawn-failure.txt`；批准以相同命令越过子进程sandbox限制后，41文件全部完成但缺失默认 Playwright Chromium headless shell，425用例仅5通过、420基础设施失败。完整初次结果保存在 `browser-files-composer-height/attempt-1-no-chromium`。原测试支持环境变量 `SHAKEINK_TEST_CHROMIUM`，重跑将其指向已安装 Chrome `154.0.8037.98`，无需修改测试源或安装浏览器。

最终浏览器全量：同一现有exec session 59858结束，exit0。`browser-full-files-composer-height.json` 记录从 startIndex0 枚举并完成全部41文件，41文件通过，425用例全部通过，失败/取消/跳过/todo均0，complete=true、未尝试文件和失败文件均为空；无watchdog终止或不完整文件。执行时段为北京时间2026-10-13 14:53:50至15:01:54，Node v24.19.0、win32。与此前 `browser-final-file-coverage.json` 的38文件逐项比对无遗漏，新增 `about-text-selection`、`text-selection-cards`、`text-selection` 分别为1/56/8例，因此本轮425为原360加65例。新一轮使用原测试源码和断言，包含完整ChatPanel组件20/20及composer clipboard24/24。逐文件测试hash与TAP/JSON保留在指定目录；初次基础设施失败不删除，也不计为产品通过或本轮有效高度红灯。

## 第二轮代码补审：再增加50%，420/288px

2026-10-13（Asia/Shanghai）。前述280/192px及第一轮15/15、41文件425/425结论作为历史保留，本节是新的420/288px轮次。审查范围仅为ChatPanel的280→420注释/effect/class、CSS的192→288，以及专项脚本的v2标签、420/288预期和14行中等草稿。

结论：**通过，无阻塞项。** 当前完整产品diff相对仓库基线仍只有ChatPanel三行和CSS一行，继第一轮280/192之后仅将目标同步升到420/288，未触碰其它业务逻辑或作用域。`ChatPanel.tsx:1492–1498` 保留auto重置和scrollHeight自适应上限，`:2087–2089` 保留overflow与48px/52px最小高度；`chat-empty-dock.css:10` 仅在≤650px空态使用288px。单一真实composer复用、草稿事件、原组件和上游边界均保持。

已通读当前 `verify-composer-height.mjs`。标签只允许v2-red/v2-green、默认v2-green，直接控制独立证据目录，旧red/green路径不会被本轮运行覆盖。`longDraft()` 对实际inline height统一断言420px，对真实computed/矩形分别断言420或288；CH-01/03/05/06及相关截图更新420，CH-04空态小窗口及截图更新288。CH-02填入14行，实际矩形必须>280且<420，非固定420px。40行scrollHeight溢出、scrollTop归零后真实wheel增量、尺寸不再增高、模式菜单真实选择、按钮完整位于视口、收回至48/52px及Shift+Enter均未削弱。两主题各7组与全局CH-08仍为15组，临时Workspaces/零模型/bootstrap隔离与安全清理逻辑未改。

实际红灯补审：`docs/evidence/composer-height/v2-red/windows-electron.json` 记录paper正常空态的inline/computed/实际高度均280px，scrollHeight880、innerHeight900，失败明确为预期420px实际280px；没有已完成检查，renderer观察错误/HTTP均0、main监听快照0，隔离数据已清理。红灯报告的产品hash仍是已验证旧280/192的 `d28a3133914b77e0ebf323f92fbb1b72edfc0aec7f930e95f2ac5028e4e70507` 和 `99bd8051f2b6b7ccdf8eb376a90ccdc8048918343592da281fdc68905a8ebdf1`，新验证脚本hash与当前相同，证明是新的420px预期在旧构建上的有效红灯，不是启动故障。旧red/green目录仍在，本轮使用新的v2-red目录保存结果。

当前独立读取SHA256：ChatPanel `a00444df1f152938545938aaa85462feb9c40e870179560f787a9df711942a4e`；CSS `ad8cce982193c6ec072ad12182e6c2b3032ebd0613a43d70b6163e04371a1e7a`；专项脚本 `5ee21b1faef95037942514d67569b02902aedea5503efde5731d6b4bbdc2e0b3`。使用bundled Node24执行 `--check scripts/verify-composer-height.mjs`，exit0；未另行构建或启动Electron，避免与主代理在运行中的UI构建争用。

本节只确认代码及有效红灯，新的v2-green和composer-height-v2核心/浏览器全量尚待实际执行，不能复用上一轮通过结果宣布420/288验收完成。尤其小窗口有消息时420px与工具栏可操作须由新的真实green验证。renderer监听开始时间、main监听快照、零模型发送门控、Playwright/CDP非物理输入及开发构建非安装包/macOS的限制仍保留。

第二轮实际green补审：已独立读取 `docs/evidence/composer-height/v2-green/windows-electron.json`，状态passed、15/15完成检查。报告ChatPanel/CSS/专项脚本hash分别为 `a00444df1f152938545938aaa85462feb9c40e870179560f787a9df711942a4e`、`ad8cce982193c6ec072ad12182e6c2b3032ebd0613a43d70b6163e04371a1e7a`、`5ee21b1faef95037942514d67569b02902aedea5503efde5731d6b4bbdc2e0b3`，均与本次读取当前文件一致。两主题正常空态/会话及650px小窗口会话实际高度420px，小窗口空态288px且inline420px；14行自然高度318px（>280且<420），短文/清空分别收回48px/52px。报告还通过真实wheel增量/尺寸不变、菜单实际选择、按钮完整位于视口及Shift+Enter断言；观察时段renderer错误/HTTP均0、两个main监听快照均0、隔离数据已清理。主代理已查看ink会话420/paper空态288截图。本补审以原JSON与当前hash确认新值结果，未额外运行Electron或构建。

主代理授权的第二轮浏览器全量从启动时清单执行，原入口为 `scripts/check-browser-file-regression.mjs composer-height-v2`，使用bundled Node24及测试既有 `SHAKEINK_TEST_CHROMIUM` 指向已安装Chrome154.0.8037.98。启动时枚举42文件，包含上一轮全部41文件，无缺失；同期新增 `tests/browser/image-provider-menu.test.ts`，其实际结果同样保留，不修改其它任务的源或断言以消除失败。第二轮结果将写入独立 `browser-files-composer-height-v2` 和 `browser-full-files-composer-height-v2.json`，不覆盖第一轮证据；核心并发2由主代理另行执行。

第二轮浏览器首次全量已完成：原session31484于北京时间2026-10-13 15:32:23至15:43:56执行42/42文件，报告complete=true、startIndex0、无未尝试文件、无watchdog终止。431例为428通过/3失败，取消/跳过/todo均0，39文件通过、3文件失败，主报告status=failed。本轮没有单次全量全绿。环境恢复的PowerShell外层命令返回0不能代表Node回归成功；以主报告status/counts及三个文件各自exitCode1为准。`image-provider-menu.test.ts` 新增6例全部通过，所有实际执行断言和证据均保留，测试源码未改。

三个原始失败分别为：

- `dialog-appearance.test.ts` 24/25通过，`DIA-01 paper: real shared Base UI backdrop is black 10%, has no blur, and does not filter background` 在隔离fixture `page.goto` 等待load超过3500ms，尚未执行样式断言。
- `root-maintenance-screen.test.ts` 13/14通过，`RUI12-06: continue and quit follow only main flags, use restricted commands and cannot be triggered while another command is pending` 点击“退出应用”等待超过1500ms。
- `root-relocation-screen.test.ts` 22/23通过，`SR-B-08 a failed wipe shows the retry copy and the retry button resends reset-confirm` 定位到“重试”按钮后等待visible/enabled/stable点击超过1500ms。

失败来自独立dialog/maintenance/relocation fixture，没有高度数值断言失败，也没有ChatPanel引用；当前证据只确认发生在导航或按钮可操作等待，不能仅凭超时或同标题就宣布无关/通过。主代理并发2核心回归仍在运行，要求待其结束后才对上述原文件作隔离诊断，本审核子代理遵守此顺序，未立即复跑、未改超时或断言、未修恢复业务。完整原始主报告、逐文件JSON/TAP与testHash保留在 `browser-full-files-composer-height-v2.json` 和 `browser-files-composer-height-v2`。后续诊断结果应另存并追加，不替代该首次全量失败结果。

核心回归结束后，主代理明确授权三个原失败文件各作一次完整隔离复跑，已严格按dialog-appearance→root-maintenance-screen→root-relocation-screen顺序完成。使用bundled Node v24.19.0、本机Chrome154.0.8037.98，以及原命令参数 `--import tsx --test --test-reporter=tap --test-concurrency=1 --test-force-exit --test-timeout=300000`；原文件、断言及各Playwright内部3500/1500ms超时未修改，未启动其它测试、Electron或构建。

独立读取 `docs/evidence/composer-height/v2-browser-isolated-summary.json` 确认三个文件完整完成：dialog25/25、maintenance14/14、relocation23/23，共62/62通过，0失败/取消/跳过/todo；每个真实Node子进程exitCode均0，恢复环境变量后由显式合并exit返回0，非包装默认成功。合并原始TAP另存 `v2-browser-isolated.tap`，按文件BEGIN/END标记保留三个原TAP流；summary含逐文件counts/exitCode/命令和原始/最终hash。

三个测试文件hash依次为 `8e59da2b2af6f09f7eea345d7a76268ea03eab523fc1989de7befcc9ed0904d6`、`274e1135ffed4555728f4d525ed3b7b905b69dd091e05dacdce693647a9a1b62`、`686abbbfdc8b8a55e14ff1cbd9201f8419d0670a7cae9f0f8b01a630cec9612d`，与首次全量各文件testHash一致；ChatPanel/CSS仍为本轮 `a00444df1f152938545938aaa85462feb9c40e870179560f787a9df711942a4e` / `ad8cce982193c6ec072ad12182e6c2b3032ebd0613a43d70b6163e04371a1e7a`。五文件复跑前后hash相同，sourceChanges为空，infrastructureError为null。

原三个超时在本次相同源码完整隔离复跑中均未重现，此观察符合时序敏感的表现，不能据此断言已证明CPU/资源压力的具体因果。再次读取原 `browser-full-files-composer-height-v2.json` 仍为failed、431例428通过/3失败；首次42文件全量失败原样保留，62例复跑作为独立诊断，不改写成一次全量全绿，也不替代主代理核心失败或其它真实target验收结论。
