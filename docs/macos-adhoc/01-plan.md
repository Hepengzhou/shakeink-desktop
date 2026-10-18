# macOS arm64 Ad-hoc 临时测试 DMG 方案

2026-10-16。用户明确授权生成临时测试 DMG，保留正式签名、公证校验，不修改正常业务代码；要求签名完整性及启动测试、安装说明，未验证项如实标注。本方案只新增临时构建路径，不改变此前正式 release 的验收门槛。

## 构建边界

- 新增 `scripts/macos-adhoc.mjs`（独立配置、原生对象扫描、Ad-hoc 签名/重验、DMG 创建/只读挂载验证）及 `scripts/package-adhoc-macos.mjs`（入口）。`package.json` 只新增临时构建/测试命令并注册相关测试；保留正式 package/preflight/verify 命令。
- 不修改 `electron-builder.config.cjs`、`scripts/package-desktop.mjs`、`scripts/macos-release.mjs`、`scripts/verify-macos-release.mjs`、`build/entitlements.mac.plist`，也不修改 `src`、`desktop` 业务源码、上游 Web。保留既有未提交修改和旧 release 样本。
- 新增测试限 `tests/unit/macos-adhoc.test.ts`，必要的独立边界测试，以及 `scripts/test-adhoc-startup.mjs`。记录位于本目录，台账仅新增独立 revision。
- 仅支持本机 darwin/arm64。预检在编译/写构建目录前拒绝其它主机/参数；不读钥匙串或使用 Apple 认证。原 Gatekeeper 保持开启，不清除下载隔离或修改全局安全设置。

## 流程

1. 记录正式发布文件、预存未提交文件及旧坏 DMG 散列。预检工具和 Electron/Sharp/libvips 的 arm64 本地运行库；正常执行现有 build。
2. 使用现有 builder 资源正向清单和真实编译产物，唯一 `release/.staging/adhoc-arm64-*` 隔离目录，builder 仅生成 app 目录。派生配置在内存中设置 `identity:null`、`notarize:false`、`forceCodeSigning:false`、`hardenedRuntime:false`，不回写正式配置。Ad-hoc 无 Team 身份，临时运行不使用正式 Hardened Runtime 策略；renderer sandbox 等产品行为仍由原代码执行。
3. 复用 `preparePackageResources`、`installMacMenuLocalization`、`inspectPackagedApp` 和 `verifyPackagedDependencies`。所有本地化、plist、资源修改均在最终签名前完成。
4. 独立扫描实际 Mach-O 魔数和嵌套 app/framework/xpc/appex；拒绝越出应用根、损坏/循环的链接及特殊文件。逐个原生对象验证包含 arm64。按深度由内向外用 `codesign --force --sign - --timestamp=none` 重新签名，显式最小 JIT entitlement，避免继承旧残缺签名；不用 `--deep` 代替签名顺序。
5. 对所有原生代码和 bundle 严格验签，顶层另做 `--deep --strict`；显示信息须为 `Signature=adhoc` 且无 Developer ID Authority/Team，核对主程序最小 JIT 权限及有效资源封印。失败即停止。
6. 在 app 外放置中文安装说明及 `/Applications` 拖放链接，用 hdiutil 创建唯一只读压缩 DMG。应用签名后不再修改其内容。DMG 容器不作 Ad-hoc 签名：Apple 对签名 DMG 推荐 Developer ID Application，临时包只声明内层应用的 Ad-hoc 签名。
7. `hdiutil verify` 后只读挂载 DMG，重复内层 app 的完整性、arm64、资源及依赖验证；从挂载卷复制应用到自有临时“安装”目录后再次校验并启动。挂载/测试资源只在所属临时目录清理；detach 失败保留目录。
8. 只在上述静态检查成功后输出唯一 `release/adhoc-macos-arm64-<ID>/`，含 `ShakeInk-<version>-mac-arm64-adhoc-test.dmg`、SHA256SUMS、中文说明及临时清单。格式不得使用 `shakeink-verified-macos-release`，不产生正式更新元数据或自动发布。

## 测试与交付

- 先经独立方案审核，再写用例并独立审核，随后 TDD 实现和独立 code review。
- 单元覆盖：平台/路径保护、配置独立、签名顺序、完整性/身份/架构失败、越界链接、签名后篡改、DMG 内层失败与 detach 清理；真实最终 DMG 的原生验包承载正例。
- 本机启动：从实际 DMG 复制出来的 app、`app.isPackaged`、`process.arch`、隔离 `SHAKEINK_TEST_ROOT`、真实原组件及本地 IPC/数据库、空模型、renderer sandbox、正常退出及同一隔离目录重新打开。检查全过程未改 app 封印。
- 尽可能对测试进程及子进程施加网络隔离，保留本地测试控制通道；须先证明隔离有效。若只能做到 renderer 网络拦截，只按该层范围记录，不称整机断网测试。测试控制器不是产品的 HTTP 监听服务。
- 运行打包相关回归、类型检查及仓库全量 core（此前 17 fail/1 cancelled 已记录，不能擅改业务代码来消除）；分别记录实际结果，不以启动冒烟替代完整业务回归。
- `spctl`/`syspolicy_check` 对未公证 Ad-hoc 的拒绝按事实单列，不记作正式信任验证通过。
- 开发机为 macOS 27.0.1/arm64；没有干净 macOS 15.7.5/M4 环境。微信下载隔离后的“仍要打开”、目标系统兼容性及目标机离线首启若未实际执行，一律待验证。说明提供手动放行步骤，不代用户点击安全例外。

## 依据

- Apple [Ad-hoc 签名说明](https://developer.apple.com/documentation/security/seccodesignatureflags/adhoc)：无签名身份。
- Apple [签名磁盘映像](https://developer.apple.com/library/archive/technotes/tn2206/#secCodeSigningForOSX10_11_5)：DMG 应使用 Developer ID Application；本文采用未签容器、签名内层应用。
- Apple [手动打开应用](https://support.apple.com/en-au/102445)：设置中的单个应用例外不等于公证或默认信任。
- 已安装 builder v26 和现有正式发布模块/入口为集成依据；具体结果由命令和实际产物记录。
