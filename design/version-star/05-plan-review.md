# 技术方案独立审核

审核日期：2026-10-13（Asia/Shanghai）。审核角色：独立子代理。范围：01-research、02-product、03-ui、04-technical-plan、index.html，以及现有设置、引导、主进程、preload 和打包配置。只读实现；本次未执行测试、不声明实现通过。

## 结论

可以进入测试设计。方案覆盖用户三个入口、实际版本与固定 GitHub 地址，继续复用既有 React 设置及引导组件，保留 macOS 原生 About。不需要重新请求 UI 批准。审核期间主代理已修订 02/04/06：macOS 链接由系统管理、About 显式空 build version；这两项已闭环至方案和用例。应用实际主题解析须继续落实到实施及验证。

## 证据与判断

- `package.json:3` 当前为 `0.1.0`；`package-lock.json` 根版本及 `packages[""]` 版本需要一起变为合法 SemVer `0.10.0-alpha`。`desktop/main/index.ts:495` bootstrap、`:691` 原生 About、`:694` Windows About 当前都取 `app.getVersion()`。共享格式函数是合理集中点，不能将 UI 固定写成旧版本。
- `src/components/desktop/SettingsDialog.tsx:71` 关于我们目前依次为版本、反馈、帮助；新增支持区域应在同一 Group 最后且保持突出样式。`OnboardingController.tsx:82` 是欢迎正文，`:87` 是独立开始创作按钮；正文添加独立组件可以保持 `perform`、引导 receipt、退出/finalFocus 逻辑不变。
- `src/app/desktop.css:264` 已有正文 `min-height:0` 和 `overflow:auto`，可承载欢迎新增内容；`:319` 至 `:360` 已有欢迎和短窗口规则，新增 CSS 应放在实际文件 `src/app/desktop.css`，需要回归短窗口正文与固定 footer。
- `desktop/main/index.ts:124` 的 `trusted` 已校验主窗口 webContents、主 frame、`shakeink://app` origin。无 URL 参数的专用 IPC 可复用该校验； About 独立窗口无需开放 preload。独立窗口的 `will-navigate` 和 `setWindowOpenHandler` 必须在 `loadURL` 前绑定，每条路径先阻止内嵌导航，只有完整固定 URL 匹配才交给 `shell.openExternal`。
- [Electron 官方 About 文档](https://www.electronjs.org/docs/latest/api/app#appsetaboutpaneloptionsoptions) 明确：未提供 credits 时 AppKit 从 main bundle 查找 Credits.html。因此将固定链接放在 `Contents/Resources/Credits.html` 并不提供 credits 参数，方向正确。[Electron macOS 源码](https://github.com/electron/electron/blob/main/shell/browser/browser_mac.mm) 使用普通字符串构建 credits，不能以 HTML 字符串参数替代文件加载。
- 本仓库实际 `node_modules/app-builder-lib/out/platformPackager.js:131` 至 `:137` 将 mac extraFiles 的基础目录设为 app/Contents；`options/PlatformSpecificBuildOptions.d.ts:89` 至 `:94` 也明确该规则。应使用 `mac.extraFiles: [{ from: "build/Credits.html", to: "Resources/Credits.html" }]`，而非把目标写成包含 Contents 的重复路径。静态测试应验证配置、文件固定 href 与禁止资源请求；真实安装包链接点击仍需要 macOS 目标机。
- 用户动作才打开外部 URL、不拉取星数、不请求 GitHub 身份，能够保持默认无模型、离线启动和无 HTTP 服务。原型仅是新增区域说明，不导入正式工作台，符合 implementation-boundaries。

## 应补充的具体项

1. **macOS 原生链接失败语义已修订。** 02-product 与 04-technical-plan 现已明确 AppKit/系统浏览器管理打开与失败，不承诺应用内 pending 或重试提示。保留真实 macOS 包测试，不能以 Windows 的 mock shell 证明该平台通过。
2. **macOS build version 方案已修订。** 04-technical-plan 和 VS-08 已明确 `version: ""`，避免默认附带构建版本。当前 Windows 主机只能验证参数/打包静态结构，原生最终版本呈现仍需目标机检查。
3. **Windows About 的主题依据应用实际主题。** 现有 `desktop/main/index.ts:655` 已通过 `syncNativeThemeSource(nativeTheme, windowTheme)` 将应用主题同步至 nativeTheme；`window-appearance.ts:11` 的映射为 paper/light、ink/dark、system/system。因此方案读取同步后的 `nativeTheme.shouldUseDarkColors` 可成立。测试仍应包含应用主题与系统明暗相反的情况。实际 CSS 修改路径为 `src/app/desktop.css`。

## 测试设计最低覆盖

版本 root/lock 同步与 `0.10.0-alpha → 0.10-alpha`；普通版本、非零 patch、其它 prerelease 不误改；三个入口目标一致及各自文案/位置；UI 未点击不调用 bridge； pending 防重复和失败后重试；引导完成/点击 Star/开始创作/焦点及数据不变；恶意 URL、其它 frame 与其它窗口拒绝；About sandbox/CSP/导航和 popup 拒绝；Credits.html 安装目标静态检查；双主题、短窗口和键盘；完整回归及真实 Windows Electron。macOS 原生安装包验收保留待目标机执行。

本审核没有编辑 package、React、主进程或已有其它工作，也未使用启动冒烟代替业务验证。
