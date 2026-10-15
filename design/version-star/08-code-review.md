# 版本与 Star 入口独立代码审核

日期：2026-10-13（Asia/Shanghai）。审核角色：独立子代理。仅新增本审核文档；未修改源码、既有测试或其他人的工作，未复跑全量测试。

## 结论

本轮版本与三个 Star 入口的实现、专项测试及已执行 Windows 目录包验证范围通过，产品代码未发现阻断问题。15 个本轮新增测试 harness 失败已闭环，完整 browser 45 文件 / 461 项通过，Windows 开发版和最终目录包各 22 组验证通过；已独立核对最终产物一致性及原生小窗截图。整体 core 仍未通过：最终 1966 项中 1925 pass / 38 fail / 1 cancelled / 2 skipped，最终失败或取消标题均在基线存在，无新增标题。真实 macOS 原生/安装包验收未执行，系统浏览器真实打开未执行，不能写成全部验收通过。

## 实现证据

- **实际版本。** `package.json:3`、`package-lock.json` 顶层及根包均为合法 SemVer `0.10.0-alpha`。`desktop/shared/project-info.ts:10` 仅将零 patch 的 alpha 缩写为用户格式；`desktop/main/index.ts:497` 的 bootstrap 与 `:694` / `:699` 的 About 从 `app.getVersion()` 派生，未固定旧显示版本。普通版本、非零 patch 与其他 prerelease 的保持行为有单测。
- **三个准确入口。** `SettingsDialog.tsx:72` 将共享真实 React 组件放在关于 Group 最后一行，原版本、反馈、帮助仍保留；`OnboardingController.tsx:83` 只在 welcome 正文挂载，原开始创作与提交、退出和焦点逻辑未变。Windows About 使用 `project-about.ts:5` 的真实 HTML 生成器；macOS 保留原生 About。三处文案不同，地址一致，没有 Star 数量、身份读取或支持完成状态。
- **固定外部能力与 frame 校验。** `DesktopBridge.openProjectRepository()` 无 URL 参数，`preload/index.ts:27` 仅调用固定 IPC。`main/index.ts:570` 先调用既有 `trusted`，其 `:125` 校验主窗口 webContents、主 frame、`shakeink:` 协议与 `app` 主机，再打开共享常量。渲染器额外传入的参数不会成为目标地址。
- **About 边界及新路由。** `project-about.ts:12` 的共享 forward 只有完整字符串等于固定仓库地址才调用外部打开。链接现采用 `target="_blank"` 与 `rel="noopener noreferrer"`，`setWindowOpenHandler` 对精确仓库打开系统浏览器，并始终返回 deny，禁止创建内嵌 popup；其他 popup 不调用 shell。普通导航先 preventDefault 再使用同一 forward。`main/index.ts:697` 保留 sandbox、contextIsolation、禁用 Node 且无 preload；`:698` 在 loadURL 前安装处理器，并在仍存在的所属窗口显示打开失败。HTML 转义实际版本且 CSP 禁止默认资源，只有内联样式；无脚本或远程资源。paper/ink 依据实际设置，仅 system 使用系统明暗。
- **可选行为及重试。** `ProjectStarPrompt.tsx:10` 使用 ref 锁与 disabled pending 防连续触发；失败显示 role=alert 并恢复按钮。操作不写设置或引导，不锁开始创作；异步结果仅影响当前组件的本地状态。正文、说明和图标来自共享真实产品文案。
- **主题与短窗。** `src/app/desktop.css:213` 起新增规则使用现有主题 token，设置末行具有轻背景与左强调线，并保留左右布局；按钮允许换行，copy 可收缩。已有设置 body 与欢迎 body 的 overflow/min-height、独立 footer 继续承载短窗口滚动。实际 800×600 / 150% 及相反系统主题仍须本轮窗口证据，静态 CSS 不能证明可见性。
- **macOS Credits。** `main/index.ts:694` 设置格式化 applicationVersion、空 build version，不传 credits 字符串。`build/Credits.html` 有固定链接、同源产品文案、无脚本或远程资源；`electron-builder.config.cjs:32` 的 `mac.extraFiles` 目标为 `Resources/Credits.html`，符合 Contents 基目录。AppKit 链接失败由系统管理，代码未承诺应用内 pending 或重试。Windows 审核不构成 macOS 原生通过证据。

## 测试证据与验收补充

已读取 `docs/evidence/version-star/tdd-green-final.tap` 与路由修订后的 `tdd-green-final-route.tap`：均为 9 tests / 9 pass / 0 fail / 0 skipped，包括本轮 5 个 unit、3 个真实 React 组件 browser 用例及 About 文本不可选择回归。`about-text-selection.test.ts:7` 改为调用生产生成器，仍拖拽/双击逐项断言，不以复制 HTML 替代正式 About；这是必要迁移，没有删掉原行为检查。

专项测试验证了版本、HTML 转义/CSP、精确链接与拒绝、失败报告、固定 IPC 静态契约、mac 打包静态契约、设置末行、Enter pending 防重复、welcome 点击失败/Space 重试、开始创作不提交，以及完成前不出现邀请。

07 审核的以下细化应在最终验收记录中闭环，已向主代理说明：

1. VS-06 已补 fragment 和 URL userinfo 否定输入，并同时断言精确 popup 转 shell 且 deny 内部窗口；VS-08 已断言原生参数不含 credits、Credits 唯一精确 href 且无 src/url 资源。路由修订专项日志 9/9 通过，此项闭环。
2. 真实注册 IPC 的其他窗口/frame/origin 拒绝、未点击零打开、状态文件不变、退出 finalFocus 已由 Windows 脚本补足，证据边界见下文；卸载后异步 resolve/reject 不干扰退出仍须专项行为证据。文本正则不能单独证明这些结果。
3. 全量 unit/integration、browser、typecheck、构建、安装包与实际 Windows 双主题/缩放/离线结果由主代理汇总；未执行项目、平台或真实系统浏览器打开必须单列，不能把 shell 截获或原型外观当真实通过。

本审核未把启动冒烟覆盖业务，也未对未执行系统作通过声明。

## Windows 验证脚本及打包测试补审

`scripts/verify-version-star.mjs` 在独立临时根创建默认无模型状态，只恢复 image-choice 后完成欢迎流程；真实生产 UI 的按钮经过 preload / 注册 IPC，shell 被截获为固定地址数组。脚本逐次比较 Star 点击前后 state.json 原文，检查欢迎不退出、开始创作回到账号按钮、About 原生窗口 webPreferences、恶意导航/popup、冷重启版本和零模型。其他窗口/frame 用窄伪 event 调用实际注册 callback，origin 用暂时替换主 frame url 属性检验同一 callback；均在 finally 恢复属性。此项证明实际可信校验谓词，不等同真实恶意 frame 导航。临时目录清理前确认父目录为 tmpdir 且名称符合本轮前缀，范围安全。

已读修订后的 `windows-electron/report.json` 与 `windows-package/report.json`：两份均 22 组 passed、无 pageerror、观察期 0 HTTP 请求、Electron 44.6.0、原始版本 `0.10.0-alpha`。前者 packaged=false、6 个固定目标；后者 packaged=true、最终小窗点击重跑为 8 个固定目标，实际执行 `release/win-unpacked/玄印写作.exe`。两份均包含 paper/ink 各自 533×400 CSS 视口、DPR 2.25 的 settled geometry。已读取 `windows-package-current-script.txt` 的最终 passed / checks=22，当前 captureMain 仅增两帧 requestAnimationFrame 等待保证绘制稳定。脚本 scope 已正确声明 shell 截获、网络观察从 firstWindow 开始、非 macOS/物理键盘/系统 DPI/NSIS 安装。listeningServers 是主进程 active handles 快照；不能单独扩大为整机或所有进程的零监听证明。

小窗口截图疑点已闭环。初次 Playwright page.screenshot 在此高 DPI / zoom 组合中只导出部分像素；改用 Electron `webContents.capturePage()` 后，独立查看更新的 `windows-electron/paper-settings-small.png` 与 `ink-welcome-small.png`，设置 Star 行、完整 CTA 及欢迎开始创作均在完整窗口内，未发现产品裁切。最终又独立查看 `windows-package/ink-welcome-small-star.png`：欢迎支持文案、Star CTA 与开始创作均完整；脚本在小窗实际鼠标点击 Star 后等待固定外部调用计数再截图。width 532–534 等待、geometry 记录及 `fullyInside` 四边检查覆盖设置 dialog/CTA、欢迎 Star CTA/dialog/开始创作，保留滚动和横向溢出断言。VS-09 的上述双主题、800×600 / 150% 小窗口范围可接受通过；系统明暗与应用相反的独立组合没有专门记录，不能增加该项已执行声明。

`tests/packaging/package-archive.test.ts` 从 package.json 派生 zip 文件名；`packaged-resources.test.ts` 和 `scripts/acceptance-packaged-macos.mjs` 从 package.json 派生原始安装版本断言。改动移除固定旧 `0.1.0`，保持安装元数据的 SemVer，未把短 UI 格式用于原始包校验；其余资源、架构、签名、路径检查未弱化。Windows 本轮只审核这些窄改动，不声明 macOS 安装包运行通过。

已核对 `package-fingerprints.json`，并独立重新计算当前 `dist/main/index.cjs`、`dist/preload/index.cjs`、`dist/service/index.cjs` 与最终目录包 `resources/app` 内对应文件的 SHA-256，三者逐字节一致。另独立对 package.json 的 name/version/main/license/repository/dependencies 作排序后的语义比较，六项均一致；Builder 删除 scripts/devDependencies 和规范化 JSON 不误判为版本漂移。因此 Windows 目录包验证对应当前编译产物，而非旧构建。

## 全量与基线新增失败

逐行比较 `baseline-core.tap` 和 `core-full.tap` 的 not ok 标题，新增 15 项，均为 testCodeFailure：基线总结 fail=40，本轮 fail=55。not ok 还包含 cancelled，不能直接把 not ok 行数当失败数；两次同时有 4 个旧 cancelled 标题不再出现，非本轮产品修复证据。

| 新增失败标题 | 来源 |
| --- | --- |
| settings outside dismissal: pointer cancellation or window blur cannot consume the next unrelated click | `tests/unit/model-settings.test.ts:54` 的依赖白名单不识别新 `./ProjectStarPrompt` |
| ONB-02b: theme failure (before replace) blocks advance and retries frozen identity | `tests/unit/onboarding-controller.test.ts:25` 同一依赖白名单缺新组件 |
| ONB-02b: theme failure (after replace) blocks advance and retries frozen identity | 同上 |
| ONB-06/08: short start failure stays entry, retry acknowledges before mounting text | 同上 |
| ONB-07/08: deleted confirmed model requires explicit selection instead of silent new draft | 同上 |
| ONB-08: profile committed error freezes fields, retains exact retry and only acknowledged result advances | 同上 |
| ONB-08: text committed error freezes fields, retains exact retry and only acknowledged result advances | 同上 |
| ONB-08: image committed error freezes fields, retains exact retry and only acknowledged result advances | 同上 |
| ONB-12b: own-rendered dialogs veto dismiss at every step; only explicit completion exits | 同上 |
| ONB-12c: deleted-model prompt has no exit affordance and vetoes dismiss | 同上 |
| ONB-12d: models entry vetoes dismiss and keeps the explicit decline action | 同上 |
| ONB-08 real TEXT editor retries post-rename creation through Controller/store/repo without duplicate validation | `tests/unit/onboarding-retry-integration.test.ts:41` 的依赖白名单不识别新组件 |
| ONB-08 real IMAGE editor retries post-rename creation through Controller/store/repo without duplicate validation | 同上 |
| macOS About shows GPL-3.0 and the installed version | `tests/unit/repository-license-commands.test.ts` 抽取 executeCommand 的 fixture 缺 `displayAppVersion`，错误为 ReferenceError |
| Windows About shows GPL-3.0 and the installed version | 同一 fixture 缺 `repository`（后续还需 About 生成器/路由/nativeTheme/dialog 等窄依赖） |

以上是首次全量 `core-full.tap` 相对基线的历史新增失败，不能归为既有失败。主代理已完成窄适配，本子代理已独立核对：三个组件 harness 仅允许新 `ProjectStarPrompt` primitive，保留原设置/引导/重试断言；组件本身由专项真实 React browser 另行覆盖。`repository-license-commands.test.ts` 注入真实 `displayAppVersion`、About 生成器及路由 helper，并给抽取 dispatcher 增加受控 repository/nativeTheme/dialog 窄依赖；原许可/版本/关闭准入断言仍保留，原生参数断言新增 `version: ""`。

`affected-regression.tap` 57 tests / 55 pass / 2 fail / 0 cancelled / 0 skipped，15 个本轮新增失败均不再出现。两条余下失败标题为“model configuration: approved close button remains present beside cancel”和“model configuration: catalog choices replace one draft, disable duplicates and retain a failed save for retry”，在 `baseline-core.tap` 中已有，未由本轮修复或忽略。`onboarding-retry-integration` 的供应商数据与图像菜单适配，以及 `model-settings` 新增 IP-06 属本轮前既有修改，审核保留，不据本轮 Star 任务替它们声明完整验收。

另读 `docs/evidence/chat-empty-state/browser-full-files-version-star.json`：startIndex=0、repositoryFiles=expectedFiles=files=45、complete=true、unattemptedFiles=[]，461 tests / 461 pass / 0 fail / 0 cancelled / 0 skipped，确为本轮完整 browser 文件集。

最终已读取完成的 `core-final.tap` 与 `core-comparison.json`：1966 tests / 1925 pass / 38 fail / 1 cancelled / 2 skipped，整体结果未通过。独立从原始 TAP 提取基线与最终 not ok 标题重新比较，最终 39 个 not ok（包括 1 个 cancelled）全部在基线标题集中，新增标题数组为空，与 `newFinalFailures=[]` 一致；表内 15 个本轮新增失败均已消失。最终 core 使用 concurrency=4，其他基线失败的减少不能归因于本轮产品修复，也不能把既有 38 fail / 1 cancelled / 2 skipped 计为通过。最终汇总须明确保留此限制，以及真实 macOS 未执行和 shell 截获范围。

本子代理未修改这些测试或无关代码，仅更新审核记录。
