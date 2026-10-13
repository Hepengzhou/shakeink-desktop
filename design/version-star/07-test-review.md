# 测试用例独立审核

审核日期：2026-10-13（Asia/Shanghai）。审核角色：独立子代理。前置技术方案审核见 `05-plan-review.md`。范围为 `06-test-cases.md`、新建 `tests/unit/version-star.test.ts` / `tests/browser/version-star.test.ts`、实际挂载点和已有相关回归；子代理未复跑测试，也未编辑实现。

## 结论

用例 VS-01 至 VS-11 已覆盖本次版本、三个入口、行为隔离、导航安全、主题/窗口、离线和完整回归，可进入 TDD。以下细化是既有用例的执行要求，应纳入红灯/绿灯证据，不以源码文本存在替代行为验证。

主代理已接受这些细化，并将真实 IPC 窗口/frame/origin 拒绝、系统与应用相反主题、finalFocus 以及实际窗口和离线验证补充到 Windows 验收脚本；这些属于待执行验证，不是已通过结果。

## 新测试覆盖与红灯分类

- unit 文件有版本 metadata/格式、About HTML 转义与 CSP、导航许可/拒绝/错误、IPC/native About/Credits 打包的断言。VS-07 的源码正则只属静态契约，需要上述真实 callback/Windows IPC 否定用例补足；VS-08 应同时确保 macOS About 没有 credits 参数。
- browser 文件挂载真实 SettingsDialog 和 OnboardingController，注入窄 bridge fixture，并测设置末行、反馈/帮助保留、Enter pending 防重复、welcome Space 失败重试、开始创作不提交，以及 theme 步骤隐藏邀请。`finalFocus={() => null}` 表明此文件不能证明焦点回归，须由 Windows 验收补足。
- 按现有测试结构，包版本断言不符、真实已挂载组件找不到 Star 控件，属于有效行为红灯；主进程/preload 正则找不到新增契约属于静态契约红灯；动态 import 缺 `project-info` / `project-about` 属于加载失败；Chromium 启动或 bundle 环境失败属于环境失败。最终 TDD 记录必须分开这四类，子代理此处只审测试结构，不宣称复核了未提供的运行日志。

## 应落实到执行的细节

| 用例 | 独立审核要求 |
| --- | --- |
| VS-01 | 断言 package 与 lock 根包均为 `0.10.0-alpha`；`0.10.0-alpha` 显示 `0.10-alpha`。普通 `0.10.0`、非零 patch `0.10.1-alpha`、其它 prerelease `0.10.0-beta` 必须保留，不静态固定用户版本。特殊字符同时交给 About 转义用例。 |
| VS-02 / VS-03 | 挂载真实 SettingsDialog/OnboardingController，检查最后行、welcome 前隐藏、欢迎正文新增邀请、开始创作仍在 footer；点击支持不能产生 settings/onboarding 提交。退出后检查 finalFocus。mock bridge 用于行为断言，应如实称为组件验证。 |
| VS-04 | 点击、Enter 与 Space 均可触发；尚未点击与仅切换主题不能触发。pending 期间第二次输入不能重复调用；拒绝后显示可访问错误、按钮重新可用且成功重试；卸载后的 resolve/reject 不干扰欢迎退出。 |
| VS-05 / VS-06 | 调用生产 About HTML 生成器和实际导航 callbacks；任意协议、近似主机、用户信息段、查询、片段、子路径不允许进入 shell。所有导航先 preventDefault，popup deny。打开失败指 `shell.openExternal` reject，应有所属窗口可理解提示与再次点击能力；恶意导航拒绝无需弹错误。 |
| VS-07 | 新 IPC 的 trusted 拒绝必须验证其它窗口、非主 frame、错误 origin 时不调用 shell。可用实际注册 callback 与窄端口 fixture；只检查文本里有 trusted 不足以证明拒绝行为。Electron 路由验证固定精确 URL、不允许 renderer 传任意 URL、未点击零调用。 |
| VS-08 | 显式断言 About 参数 `version: ""` 且不含 credits；Credits 文件无远程资源/脚本且只有目标固定 href；配置为 mac.extraFiles 的 `Resources/Credits.html`。Windows 静态验证不得写成 macOS 原生通过。 |
| VS-09 | 除双主题与 800×600/150% 缩放外，包含 OS 深色/应用宣纸，以及 OS 浅色/应用玄墨。现有 syncNativeThemeSource 会将应用主题映射到原生主题，About 应遵循该真实状态。检查邀请/主按钮可达与无横溢出。 |
| VS-10 | 用户状态文件以隔离目录的完成前后快照/语义字段比较，过滤有明确依据的运行时噪声。无模型、无监听和离线结论写清观测对象/范围；单次 shell 精确参数断言不能证明真正系统浏览器启动。 |
| VS-11 | 保留既有完整回归，并记录退出码、执行范围、失败及基线。改动若重构 About HTML，迁移旧测试读取路径但继续保留原行为断言。 |

## 现有回归证据

- `tests/browser/about-text-selection.test.ts` 当前从 `desktop/main/index.ts` 以正则提取内联 About HTML，再验证所有 UI 文字不可选。如果改为 About helper，需要让该测试读取真实新生成器，保留 body user-select 以及拖选/双击断言；不能删去旧测试以使全量变绿。
- `tests/unit/window-native-theme-source.test.ts` 已包含真实主回调的主题同步、不同系统明暗与同步重入用例；本轮独立 About 仍需覆盖颜色输出，而非把这些原窗体测试当作 About 已通过。
- `OnboardingController.tsx` 的 Star 入口应避免调用 `perform`、修改 attempt/receipt；原有 onboarding flow/service/store 回归继续执行，真实目标操作补足 welcome 的开始创作和焦点链。

TDD 红灯应为有意义的缺失行为；不存在模块造成的 import 失败单列为加载失败。所有执行结果另写验证产物，最终未具备真实 macOS 安装包的项目仍为未执行。
