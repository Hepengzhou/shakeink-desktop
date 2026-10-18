# 2026-10-18 全量自动化回归

当前仓库全部活动自动化回归通过，最终证据独立审核完成，无阻断项。最终采用的各组结果均无失败、取消、跳过或 TODO。

本轮覆盖当前仓库全部活动自动化测试：254 个 unit、33 个 integration、57 个 browser 和 4 个 packaging 文件，共 348 个文件。打包命令另执行相关 unit，计数存在交叉，不将各层相加解释为独立业务验收用例。`tests/retired` 按已有退役清单排除。

运行基线为提交 `532995adac2907ad7cff88dd80c2fbfe61021f33` 加当前工作树，Node v24.18.0、匹配 Playwright 的 Chrome for Testing 153.0.8010.12、macOS 27.0.1 arm64。所有数据使用隔离临时目录和公开 fixture，没有真实用户数据、Key 或付费调用。开始时已有的 macOS 签名/打包与命令目录改动保留。

## 已完成结果

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| Core 全部 287 文件 | 2191/2191 | [bulk 2176](evidence/regression-2026-10-18/core-bulk-final.tap)、[brand 完整文件 14](evidence/regression-2026-10-18/brand-data-timeout-targeted.tap)、[owned-root 完整文件 1](evidence/regression-2026-10-18/owned-root-timeout-targeted.tap) |
| Browser 全部 57 文件 | 604/604 | [完整覆盖证明](evidence/regression-2026-10-18/browser-complete-coverage.json) |
| 打包回归 | 49/49 | [完整 TAP](evidence/regression-2026-10-18/package-final.tap) |
| 生产构建 | 退出 0 | [构建日志](evidence/regression-2026-10-18/build.log) |
| 完整类型检查 | 全部最终修改后退出 0 | [最终日志](evidence/regression-2026-10-18/typecheck-final-all-fixtures.log) |
| Foundation 类型检查 | 退出 0 | [最终日志](evidence/regression-2026-10-18/typecheck-foundation-complete.log) |
| 当前包真实启动与重开 | 2/2，均正常退出 0 | [执行记录](evidence/regression-2026-10-18/packaged-startup.json) |

Core 以 bulk 285 文件和两个实际迁移完整文件分组覆盖，路径并集无重无漏。原整轮的超时取消保留在 [core-final.tap](evidence/regression-2026-10-18/core-final.tap)，没有将该失败命令改记为通过。最终 1192 项源/脚本/依赖声明输入冻结证据见 [core-final-inputs.json](evidence/regression-2026-10-18/core-final-inputs.json)。

浏览器原始完整运行实际为 604 项、601 通过、3 失败、退出 1，原 [TAP](evidence/regression-2026-10-18/browser-final.tap) 与 [metadata](evidence/regression-2026-10-18/browser-final-run.json) 保持 failed。三条失败各自对应的文件已修正并完整复跑：[聊天 28/28](evidence/regression-2026-10-18/ces10-chat-full.tap)、[内容抽屉 20/20](evidence/regression-2026-10-18/content-drawer-final.tap)、[侧栏采样 10/10](evidence/regression-2026-10-18/sidebar-measurement-final.tap)，均退出 0。结合原整轮未变的 54 文件 546 项，最终覆盖 57 文件 604 项。审计核对原新完整文件测试身份有序数组、源前后 SHA、904 项未变共同输入及共享模板字节不变；无遗漏或重复。这是完整文件分组验证，没有宣称一次单命令全绿。

## 修复范围与证据

本轮修复测试夹具与当前已批准行为之间的漂移：恢复真实组件依赖和 ref 提取、遵循权威模型目录及旧模型不可用语义、校准实际命令目录和本机原生编辑按键、隔离 macOS 临时路径别名、使用当前包作为打包正例。迁移测试的三处 60 秒预算调整为 180 秒；真实严格持久化流程实测 74.37 秒，原数据/安全/持久化断言保留。没有修改产品业务源码或放宽生产安全守卫。

浏览器最终装载/动画观察辅助修复均先保留实际 RED，再经独立方案/测试审核。它们校准真实滚动视口、React commit 与 rAF 的先后关系，保留原几何容差、首个运动帧、逐帧状态和命令门控要求。完整受影响文件实际复跑后才用于最终覆盖，原整轮的失败与源变化记录保留。

[总计划](evidence/regression-2026-10-18/plan.md)、[计划审核](evidence/regression-2026-10-18/plan-review.md)、[测试与实现审核](evidence/regression-2026-10-18/code-review.md)、[最终证据独立审核](evidence/regression-2026-10-18/final-evidence-review.md)。每项具体方案、RED、修后 TAP 与审核均保存在同一证据目录。机器可读汇总见 [regression-summary.json](evidence/regression-2026-10-18/regression-summary.json)。

## 当前包与真实系统验证

独立新建本地回归产物 `release/regression-20261018-2rNl9J/mac-arm64/玄印写作.app` 和同目录 `current-regression-mac-arm64.zip`，未覆盖固定损坏负例或已有正式 verified 交付物。ZIP SHA-256：`92545edccec2f55b980e41fcde78959fec94e61f4cefba4fa84527c5de7d3625`。这是未签名的本地回归包，没有发布。

真实安装包进程验证 `isPackaged`、隔离数据目录、renderer sandbox、中文原生菜单、默认 0 模型、本地空作品及内置模板读取、玄墨主题保存后重开保留。两次均正常 `app.quit()`。主进程活跃 Node Server handles 为 0；自有隐藏窗口 HTTP 请求由默认 session 过滤实际拒绝。这些观察没有扩展为所有子进程或整机断网证明。

[包资源清单](evidence/regression-2026-10-18/positive-package-resources.json)、[路径](evidence/regression-2026-10-18/positive-package-paths.json)、[旧包保全散列](evidence/regression-2026-10-18/package-preservation-final.json)、[首启截图](evidence/regression-2026-10-18/packaged-first-launch.png)、[重开截图](evidence/regression-2026-10-18/packaged-reopen.png)。

## 范围边界

本轮结果属于当前仓库自动化回归与本机 macOS arm64 包专项。未执行原生 Windows、macOS x64、干净目标机下载隔离/Gatekeeper、真实付费供应商或整进程断网验收。已有 [530 条跨平台正式验收台账](acceptance-active-scope.json) 的执行状态保持不变，没有以自动化或启动检查整体提升。

用户授权的 CodeGraph 已初始化，全部最终辅助修改后 sync/status 均退出 0，索引 up to date：1442 文件、35730 节点、129894 边。见 [最终状态](evidence/regression-2026-10-18/codegraph-status-final-fixtures.log)。

## 复跑入口

使用项目要求的 Node 24（本轮为 `/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node`）。浏览器须设置 `SHAKEINK_TEST_CHROMIUM` 指向匹配的 Chrome for Testing 153：`/private/tmp/shakeink-regression-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`。原命令/精确文件清单保存在 [core bulk metadata](evidence/regression-2026-10-18/core-bulk-run.json)、[浏览器整轮 metadata](evidence/regression-2026-10-18/browser-final-run.json) 和各完整文件复跑 metadata 中；最终覆盖审计程序为 [verify-browser-coverage.py](evidence/regression-2026-10-18/verify-browser-coverage.py)。

打包回归使用 `npm run test:package`，同时将 `SHAKEINK_TEST_PACKAGE_APP`、`SHAKEINK_TEST_PACKAGE_ZIP` 分别设为上文新 App/ZIP 的绝对路径。未设置时测试仍使用原有默认样本，不能以旧损坏包充当正例；显式错误路径也会失败。生成新正例用的 [build-positive-package.mjs](evidence/regression-2026-10-18/build-positive-package.mjs) 使用唯一输出目录，重新生成的路径以其实际 JSON 结果为准。

类型检查入口为 `npm run typecheck` 和 `npm run typecheck:foundation`；生产构建入口为 `npm run build`。本机包专项的脚本为 [packaged-startup.mjs](evidence/regression-2026-10-18/packaged-startup.mjs)，仅针对隔离根与本轮未签名本地包。
