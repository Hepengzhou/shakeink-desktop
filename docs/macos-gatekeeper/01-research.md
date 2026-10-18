# macOS 安装包无法打开调研

日期：2026-10-16。范围：玄印写作 `0.1.0-alpha` 的 macOS Apple Silicon 安装与首次打开。本文先整理系统机制与调查方法；具体根因、证据和修复方案随后见 `02-analysis.md`。本阶段只新增调查文档与取证文件，业务代码和安装包不作修改。

## 用户现场

- 用户确认收到 `ShakeInk-0.1.0-alpha-mac-arm64.dmg`。
- 图一提示“玄印写作已损坏，无法打开。你应该将它移到废纸篓”，并显示文件由 WeChat 创建。该文字能说明来源关联，不能证明微信改变了文件内容。
- 图二显示 Apple M4、macOS Sequoia 15.7.5。序列号不进入文档或证据。
- 图三已在“隐私与安全性”的安全性区域，来源设置为“App Store 与已知开发者”，截图没有“仍要打开”。不能将此归因于用户未滚动到正确位置。
- 用户后续确认报错后立刻查看了该设置，因此当前没有依据将按钮缺失归因于显示时间窗已过。
- 用户转述目标机上的 Codex 分析：“玄印写作”的签名校验失败，被 macOS 阻止启动；应用带有微信下载来源的隔离标记。这是目标机诊断摘要的用户转述，尚无原始命令输出和退出码。见 [现场补充记录](evidence/recipient-report-20261016.json)。
- 同名文件可能来自不同次构建，必须比较 SHA-256，才能把本地包检测结果准确关联到接收端。

## 系统机制

| 来源 | 与本问题相关的结论 |
| --- | --- |
| [Apple 安全打开 App](https://support.apple.com/en-us/102445) | 系统区分开发者无法验证、无法检查恶意软件、应用已被修改或损坏等警告。图一不能仅按“未知开发者”处理，也不能据此认定存在恶意软件。受管理设备的来源设置还可能受到限制。 |
| [Apple 未知开发者打开说明](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac) | Apple 当前指南描述的“仍要打开”是尝试打开后约一小时内的例外入口。该指南不是 15.7.5 的现场记录，不能由此认定本次缺少按钮就是超时。 |
| [Apple 可信执行诊断](https://developer.apple.com/forums/thread/706442) | 下载隔离属性会触发 Gatekeeper；开发机本地运行可能漏报。先检查 `syspolicy_check distribution`，再区分签名、Gatekeeper、运行时崩溃等问题。 |
| [Apple 签名深入说明](https://developer.apple.com/library/archive/technotes/tn2206/) | 严格校验需覆盖嵌套代码与资源；应由内向外签名，完成签名后不再修改包内容。`codesign --deep` 可用于验证，不应充当正式签名策略。 |
| [Electron 签名说明](https://www.electronjs.org/docs/latest/tutorial/code-signing) | 向 macOS 用户分发 Electron 应用应完成开发者签名和 Apple 公证，不能用本地可运行替代发布资格。 |
| [Apple 产品验收方法](https://developer.apple.com/forums/thread/130560) | 应在未运行过该产品的干净系统中，通过会保留下载隔离状态的途径获取最终包，断网安装并按用户方式运行；普通命令行预检不能代替这一验收。 |

以上为官方机制说明；用户补充的签名失败和隔离标记与本地样本缺陷一致，支持主故障链。精确包关联、目标机签名错误细项和按钮缺失的系统判定仍需原始结果印证。

## 仓库调查入口

会话没有暴露 CodeGraph 工具，采用原生文件读取。相关文件为：

- `electron-builder.config.cjs`：macOS 身份、公证、DMG 配置。
- `scripts/package-desktop.mjs`：本机构建、afterPack、归档与资源验包顺序。
- `scripts/macos-menu-localization.mjs`：签名前本地化写入。
- `scripts/inspect-packaged-app.mjs`：资源、依赖、架构检查的覆盖范围。
- `tests/unit/packaging-config.test.ts`：现有“不签名、不公证”契约。
- `tests/packaging/package-archive.test.ts`：归档 CRC、文件表和关键文件散列。
- `release/REBUILD-20261016.md`、`release/rebuild-20261016-final.log`、`release/verify-rebuild.mjs`：同名本地包的构建及启动证据。

## 根因查找方法

1. 固定本地 DMG 的 SHA-256、字节数、当前源码提交和工作树状态，区分构建样本与用户原件。
2. 只读挂载 DMG，检查容器校验和、包内应用及最终签名状态。对本地展开目录作辅助对比，避免只验开发目录。
3. 分别运行严格签名校验、发布策略诊断和公证票据校验，保留命令、退出码、原始输出。沙箱/系统服务错误单列，不冒充 Gatekeeper 拒绝。
4. 核对主程序、Helper 和本机原生库的架构/最低系统要求。元数据兼容只排除显性不匹配，不能代替 15.7.5 的运行验收。
5. 对照已安装的 electron-builder `26.15.3` 源码核实 `identity: null` 的实际控制流，避免套用新版配置文档。
6. 检查既有测试为什么未阻止缺陷进入 DMG，区分功能验收、归档完整性与系统发布信任。
7. 把已证实根因、现场待确认因素、最小修复范围和验证条件写入问题分析文档，经独立子代理审核后交用户审核。

## 调查与修复边界

本次优先修复构建和发布流程，不改 React 业务组件、IPC、数据库、模型配置、默认数据、快捷键或 Web 来源仓库。仅在独立验证表明需要时评估运行时权限；不能为通过签名而关闭 renderer sandbox 等现有保护。

不把关闭 Gatekeeper、批量清除隔离属性或让终端用户重新签名作为产品修复。下载完整性与来源可信要分别验证。真正签名、公证需要开发者身份及授权凭据；只读取验证结果，不把证书私钥、账号凭据或用户真实数据写入仓库。

输出顺序：调研 → 实物取证与根因定位 → 问题分析和修复方案 → 独立审核 → 用户审核。用户通过问题分析后，再进入用例审核、TDD、代码审核和目标系统验收。
