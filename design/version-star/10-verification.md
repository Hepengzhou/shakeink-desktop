# 测试与真实系统验证

日期：2026-10-13（Asia/Shanghai）。本次功能范围通过；项目整体验收未全通过。

## 命令与结果

使用捆绑 Node v24.19.0；普通 PATH 的 Node v20.12.2 不符合项目要求，首次启动测试子进程遭 EPERM，未计为产品测试结果。随后获得工具审批，使用 Node24/本机 Edge 执行隔离测试。

| 层级 | 结果 | 证据 |
| --- | --- | --- |
| 双主题 UI 稿渲染 | 宣纸/玄墨均无水平溢出，主代理查看宣纸稿 | docs/evidence/version-star/design-check.txt 与 design/paper.png、ink.png |
| TDD实现前 | 包版本/缺两个真实React入口为行为红灯；缺IPC为静态红灯；新模块缺失单列加载失败 | tdd-red.tap |
| 最终专项与旧About文字回归 | 9/9通过 | tdd-green-final-route.tap |
| 受影响原用例复测 | 57项55通过、2条既有模型配置失败；新增15条夹具依赖问题已全部修复 | affected-regression.tap |
| 完整browser | 45/45文件，461/461用例通过；0失败/取消/跳过 | docs/evidence/chat-empty-state/browser-full-files-version-star.json；逐文件目录browser-files-version-star |
| UI/main/preload/service构建 | 通过，静态UI无HTTP运行服务 | build-ui.txt、build-desktop-final.txt |
| 完整TypeScript | 通过 | typecheck-final.txt |
| Windows目录包 | 本机x64/Electron44.6.0，通过静态340项目资源及依赖检验，不发布、不安装 | package-dir-final.txt、release/package-static-win32-x64.json |
| 实际Windows开发Electron | 两主题共22组通过 | windows-electron/report.json |
| 实际Windows最终目录包 | 两主题共22组通过，包括小窗真实鼠标Star点击 | windows-package/report.json |
| 最终完整unit/integration | 1966项，1925通过、38失败、1取消、2跳过，退出1 | core-final.tap |

证据均在 `docs/evidence/version-star/`，表内带其它目录者除外。核心最终命令为 `node --import tsx --test --test-reporter=tap --test-concurrency=4 tests/unit/*.test.ts tests/integration/*.test.ts`，降低资源竞争但保留完整文件及断言。

## 核心回归对照

修改前完整基线：1961项，1902通过、40失败、17取消、2跳过（baseline-core.tap）。首次完整回归：1966项，1896通过、55失败、13取消、2跳过（core-full.tap）。独立审核明确15个新增失败为旧harness缺ProjectStarPrompt/关于helper依赖，本轮补齐并保留原业务断言；最终完整回归为上述1925/38/1/2。

`core-comparison.json` 最终失败/取消标题均在基线出现，新增残留标题0。不能据“没有新增”把38失败、1取消或2跳过改成通过，也不能将不同整轮的数量相加。既有问题涉及闭合源/退役恢复测试、DesktopApp抽取harness、模型配置、Windows/macOS平台断言等，本任务没有扩展修改这些无关源码或降低原断言。

## Windows逐项实际覆盖

隔离Workspaces真实初始化，未使用真实作品/Key，默认零模型。从隔离的image-choice恢复状态点击真实“跳过”，确认引导完成事务落盘后才出现欢迎页Star；点击Star与设置Star、独立关于链接均验证精确固定目标且状态文件字节不变。“开始创作”退出并恢复账户焦点。设置末行强调、真实版本0.10-alpha、反馈与禁用文档保持。

关于实际BrowserWindow的sandbox/contextIsolation开启、Node/preload关闭；实际链接通过窗口打开回调转shell且不创建内部窗口。恶意popup与导航拒绝，关于文档保持；实际注册IPC handler对其它window/frame/sender以及伪造origin拒绝且不调shell。origin项临时覆盖隔离主frame.url测试谓词后立即恢复，属于实际callback谓词测试，不冒称恶意网页真实加载。

paper/ink分别执行1440×900与800×600、150%应用缩放；等待实际CSS viewport宽533±1px、高≤400px，检查对话框、CTA、开始按钮完整四边；小窗welcome滚动后真实点击Star，开始创作仍可操作。原生capturePage截图显示完整设置左右行及欢迎按钮。最初Playwright screenshot在高DPI裁切，历史报告/截图分别保留在*-first、*-second、*-unsettled-resize、*-cdp-cropped等目录，不用那些截图证明小窗通过。主代理查看paper-settings-small与ink-welcome-small-star。

App.getVersion为0.10.0-alpha，两处界面用户格式为0.10-alpha。正常关闭重开仍一致，完成后不重复全流程。主进程监听Server快照为0；firstWindow之后网络观察为0HTTP，包含离线reload。该观察不是启动全程main/worker网络审计，不等同系统网络接口断开。开发版/目录包均为真实Windows进程，未切换platform伪装。

独立关于第一次真实点击已转系统路由但Playwright等待取消导航不结束；本轮将产品链接改为target=_blank/noopener/noreferrer，主进程固定地址处理并deny内部窗口。修订后专项和真实Windows均通过。初次HTML静态测试将转义后的安全onerror文本误判为标签事件，改为限定真实标签的断言，未修改转义行为。

## 包一致性与限制

`package-fingerprints.json` 已核对main/preload/service三个编译文件与最终包逐字节一致，包manifest的name/version/main/license/repository/dependencies与来源语义一致。Builder正常去除scripts/devDependencies并重排JSON，不能要求manifest逐字节相等。Mac Credits额外资源、唯一固定href、无远程资源及原生参数在单元测试通过；动态版本的macOS归档/安装验收测试在Windows未执行。

外部打开测试拦截shell.openExternal，证明真实IPC与精确系统目标路由，未真正启动系统浏览器或登录/点击GitHub Star。NSIS安装、macOS原生面板/安装包、物理IME/键盘、系统DPI变更未执行。按AGENTS.md不声明跨平台或“全部测试通过”。
