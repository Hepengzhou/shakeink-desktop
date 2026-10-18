# macOS 签名发布流程实施方案

2026-10-16。用户已明确通过问题分析，并要求实施及验证真实 DMG/ZIP 的签名、公证和发布校验。原业务功能、Web 来源、appId 和数据存储行为保持原状。本方案落实已批准的 `02-analysis.md`，由独立子代理审核后进入用例审核及 TDD。

## 发布路径

1. macOS 默认归档及 `--dmg`/`--zip` 为正式发布；仅 `--dir` 是无需身份的本地资源/功能验包，不得生成安装归档。Windows 仍走原 NSIS 路径。
2. 发布预检读取本机有效 Developer ID Application 身份，只有一个时自动选择；多个时要求 `CSC_NAME` 指定名称或指纹。排除 ad-hoc、开发证书和过期身份。公证采用官方支持的 `APPLE_KEYCHAIN_PROFILE`（可选 `APPLE_KEYCHAIN`），不在脚本/参数中传账号密码。缺任何前提即在构建 staging 和覆盖旧包之前停止。预检只公开状态与计数。
3. 基础配置默认允许 macOS Developer ID 签名、公证、hardened runtime、时间戳及 DMG 签名。`--dir` 在入口中显式覆盖为本地模式。新增最小 JIT entitlement，应用与子进程采用同一配置；不给全局 disable-library-validation 或 unsigned-executable-memory。真实原生模块运行若失败必须先查实际签名和加载路径。
4. 正式 builder 输出到独立 `release/.staging/macos-<arch>-<唯一ID>`。保留原 afterPack 资源/依赖/本地化；builder 先完成内外签名和 `.app` 公证/stapling。afterSign 增加实际签名/身份/时间戳/hardened runtime、票据及系统策略检查，成功后才允许归档。
5. builder DMG 阶段关闭中间更新元数据 `writeUpdateInfo:false`。归档完成后独立最终化阶段将 DMG 提交 Apple，要求明确 Accepted，随后 staple/validate。非 Accepted、超时、工具异常都停止，不生成发布成功标记。
6. 对 DMG 执行容器完整性、签名/票据/系统策略，再只读挂载校验盘内应用；ZIP 独立检查 CRC、安全路径并在临时目录解压，校验内层应用。应用检查覆盖严格递归签名、Apple Developer ID/Team、时间戳、hardened runtime、最小权限、架构、票据、syspolicy_check/spctl 以及资源/依赖。仅静态检查的项目按静态范围报告。
7. 所有交付物验完后，基于最终字节重新生成全部 blockmap、大小、SHA-512/SHA-256，逐块校验 blockmap；禁止复用中间 updateInfo。写入 schema 化 release.json、SHA256SUMS.txt，通过独立完整性核对后原子重命名为唯一 `release/verified-macos-<arch>-<ID>` 目录。失败的 staging 不冒充 release；旧包和旧证据不覆盖，`publish:never` 保持。
8. 提供独立 `package:verify:mac` 命令重新检查已验包目录；必须读取最终 manifest，但不能只相信其 passed 字段。对列出的最终文件重新计算散列、blockmap 并重跑 Apple 检查；不执行应用，不自动清理下载隔离标记。

## 精确文件范围

- 修改：`electron-builder.config.cjs`、`scripts/package-desktop.mjs`、`package.json`、`tests/unit/packaging-config.test.ts`、`tests/packaging/package-archive.test.ts`（修复既有 tsx 顶层 await 加载问题，保持断言）、`tests/packaging/packaging-113-review.test.ts`（在 macOS 模拟 Windows 时采用与真实打包入口相同的平台配置分支，保留原 builder 分支断言）。
- 新增：`scripts/macos-release.mjs`（纯策略、身份/命令预检、签名/票据/容器/归档验包、最终化和清单核验）、`scripts/verify-macos-release.mjs`（CLI）、`build/entitlements.mac.plist`、`tests/unit/macos-release.test.ts`、`tests/packaging/macos-trust.test.ts`。
- 文档/台账：`docs/macos-gatekeeper/**`、`docs/requirements-traceability.json`。原有未提交的命令哈希修改保留原状，不把证书、私钥或公证授权放入仓库。

## 测试与错误处理

命令调用全部使用 execFile 参数数组，无 shell 插值；错误只记录工具/阶段/退出码，不输出认证环境值或私钥。unit 通过受控命令端口验证控制流，明确不等于真实签名通过。对路径/归档内容采用实际文件和恶意条目负例。真实已有坏包必须被新验包器拒绝，作为独立原生负例。

测试顺序：独立方案审核 → 独立用例审核 → 新断言在旧实现上 RED → 实现 → GREEN → 独立 code review → 打包回归、类型检查、完整 core 回归 → 正式构建和真实签名公证 → 最终交付物重验 → 干净目标系统隔离下载及离线首次打开。不能用模拟端口或本机普通启动抵消真实签名/目标环境缺口。

## 当前实施依赖

本机只读预检发现 0 个有效 Developer ID Application 身份；尚无已设置的公证认证环境项。Xcode 的 notarytool、stapler、codesign 可用。用户已要求协助安装证书，正在确认开发者计划/既有 p12 状态。该依赖不阻止代码修复和负例测试，但在完成证书与公证配置前不能满足真实发布包全通过的验收。

证书安装按 Apple 官方账户流程办理：已有 p12 则在用户本机导入并验证私钥匹配；没有证书则先确认有资格的开发者团队，经钥匙串生成 CSR、在官方账户申请 Developer ID Application 并安装。不创建自签名证书冒充 Developer ID，不代用户购买会员，也不要求用户在聊天中提供密码。
