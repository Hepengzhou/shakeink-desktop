# Windows 0.1.0-alpha 发布方案

范围：按用户要求将当前工作树项目版本从 `0.10.0-alpha` 改为 `0.1.0-alpha`，使用现有本机 Windows x64、Node 24、Electron 44.6.0 和 NSIS 配置重新构建安装包。保留已有未提交业务修改；不修改上游、不发布远端、不签名。

版本来源保持 `package.json`，同步 lock 根及根包版本。生产 UI 已通过 `displayAppVersion(app.getVersion())` 显示短版本，按现有约定为 `0.1-alpha`，安装元数据保持完整 SemVer。更新已有版本契约测试和写死旧版本的真实验证脚本，后者读取 package 元数据并使用现有格式函数。

执行顺序：独立方案审核 → 独立用例审核 → 原版本契约 RED → 元数据/验证脚本修改 → GREEN → 独立代码审核 → 当前完整单元/集成回归、类型检查、正式 build、NSIS 打包 → 包资源及依赖检查、Windows 原生 PE 版本和安装包散列、隔离目录真实 packaged Electron 离线重启/版本验证 → 记录结果。

## 发布验证用例

1. 原 `tests/unit/version-star.test.ts` 将版本契约目标改为 `0.1.0-alpha`，必须在元数据修改前 RED；修改后 package/lock 三处一致、SemVer 有效，并保留历史显示格式回归。
2. 新版本显示函数输出 `0.1-alpha`；真实 Windows 设置、About、bootstrap、app.getVersion() 与项目元数据一致，离线重启保持一致。
3. 全量当前 unit/integration 套件及 types；浏览器版本相关既有用例；任何平台限定失败或未运行必须单列。
4. `npm run build` 使用 Node 24；`node scripts/package-desktop.mjs` 默认本机 NSIS。afterPack 必须成功检查项目资源及真实包内 Sharp/PGlite/Prisma 依赖。
5. `release/win-unpacked/resources/app/package.json` 版本正确，主 exe PE 架构 x64，Windows 版本字段和安装器产物与本机 builder 的版本编码一致，计算 SHA-256。installed builder 使用 FileVersion=`0.1.0-alpha`、ProductVersion=`0.1.0.0`；数值字段与完整 SemVer 分别核验。
6. `verify-version-star.mjs --packaged` 隔离无模型/无 Key 数据目录、设置网络离线、实际打开设置和 About 并关闭重开；核查应用无监听服务及 renderer HTTP 请求。

边界：当前发布验证不授 macOS 或完整业务逐项验收通过；打包目录运行与 NSIS 实际安装区分。现有 `tests/packaging` 包含写死 macOS 产物的历史用例，不把它们标为 Windows 通过。安装器不写入默认用户配置，所有运行验证使用隔离测试目录。
