# 版本与 GitHub Star 入口调研

日期：2026-10-13（Asia/Shanghai）。范围仅本独立桌面仓库。

## 现状证据

- `package.json`、`package-lock.json` 根包版本均为 0.1.0；`desktop/main/index.ts` bootstrap 使用 `app.getVersion()`，设置关于页消费 bootstrap.version。
- `src/components/desktop/SettingsDialog.tsx` 关于我们现有顺序为当前版本、问题反馈、帮助文档。可以在末尾新增强调行，保持纯左右设置布局。
- `src/components/desktop/OnboardingController.tsx` welcome 分支在引导提交完成后显示；独立“开始创作”按钮负责退出及焦点恢复。支持动作应放正文内，不影响完成事务与主按钮。
- `desktop/main/index.ts` 的 app.about：macOS 使用原生 About，Windows 使用独立受限 BrowserWindow。保留此边界。
- 已有用户授权的未提交工作遍及模型、文本菜单等文件，本任务按窄范围补丁保留。

## 外部资料

[GitHub 官方说明](https://docs.github.com/en/get-started/exploring-projects-on-github/saving-repositories-with-stars)：用户在仓库首页点击 Star，可收藏项目、表达支持。因此本应用只引导打开首页，不请求 GitHub 凭据、不代为 Star，也不显示无法获知的 Star 状态/数量。

[Electron About 文档](https://www.electronjs.org/docs/latest/api/app#appsetaboutpaneloptionsoptions)：macOS 原生面板未指定 credits 时，从主 bundle 查找 Credits.html。[Electron macOS 实现](https://github.com/electron/electron/blob/main/shell/browser/browser_mac.mm) 的 ShowAboutPanel 使用 initWithString 处理 credits，直接传 HTML 字符串不会产生链接。因此采用安装包 `Contents/Resources/Credits.html`，保留原生面板；开发版 Electron 默认 bundle 与正式包不同，macOS 链接需正式包验收。

项目仓库地址由用户提供：[mySingleLive/shakeink-desktop](https://github.com/mySingleLive/shakeink-desktop)。本轮网页工具访问首页返回 Internal Error，不能据此断言仓库公开性/可用性，不阻止固定目标入口实现。

## 结论

对用户呈现 `0.10-alpha`；npm/Electron Builder 元数据采用合法 SemVer `0.10.0-alpha`。显示格式由真实 `app.getVersion()` 派生，后续版本不能继续展示固定旧字符串。应用离线启动，按钮点击后才请求操作系统打开固定 HTTPS 仓库首页。
