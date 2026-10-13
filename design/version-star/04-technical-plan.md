# 技术方案：0.10-alpha 与 Star

顺序：调研、产品、UI → 本方案独立审核 → 测试用例独立审核 → TDD → 独立代码审核 → 全量/实际系统测试 → 总结。

- package/lock 同步 `0.10.0-alpha`；新增 `desktop/shared/project-info.ts` 固定仓库 URL、三入口文案和版本格式函数，只缩写零 patch 的 alpha 版本，未知/其它版本按实际输入保留。
- bootstrap 和系统关于的版本来自 `app.getVersion()` 再格式化；设置仍复用真实 SettingsDialog。
- 新增窄能力 `DesktopBridge.openProjectRepository(): Promise<void>`，preload 调固定 IPC，main 用现有 trusted(event) 校验主窗口和 frame；不接受 renderer URL、不扩大全局命令/快捷键目录。
- 共享真实 React ProjectStarPrompt 复用三处文案中 settings/welcome；控件有 pending、防重复、错误状态及重试。只在点击时访问 bridge，不改变 settings/onboarding。
- Windows About 从实际 settings.appearance.theme 解析 paper/ink，仅 system 时读取 nativeTheme.shouldUseDarkColors；生成独立静态 HTML（版本转义、无 script、默认 CSP 禁止资源），链接用 target=_blank/noopener/noreferrer，捕获窗口打开和导航，只将等于固定仓库 URL 的请求转给系统；内部窗口一律deny，所有其它目标拒绝，失败用所属窗口原生错误提示。保留 BrowserWindow sandbox/contextIsolation/no Node。
- macOS 保留 app.showAboutPanel，不传 credits，显式设 version 空字符串，避免原生面板附带未格式化 build version。`build/Credits.html` 含固定 HTTPS 超链接；electron-builder mac.extraFiles 放到 Resources/Credits.html。原生链接由 AppKit/系统浏览器打开，不提供 React pending/应用错误重试能力。独立静态一致性测试覆盖地址/文案/打包路径。macOS 目标机未具备不得声称通过。
- CSS 窄范围补充 desktop.css，保留已批准工作台和原业务 React。账本 requirements-traceability.json 与 migration-map.json 增加本轮记录，不覆盖他人字段。
- 本任务不需要供应商、GitHub登录、HTTP监听或新依赖。测试隔离临时根；外部打开测试截获 shell.openExternal，验证真实 IPC 路由与精确目标，但不称为真正系统浏览器启动。最终 Windows 单次真实系统打开可另行执行。
- 全量既有失败单列，并与修改前基线对比；不会删旧测试或把未执行平台计为通过。
