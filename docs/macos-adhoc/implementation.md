# Ad-hoc 临时模块实施记录

2026-10-16。依据独立审核通过的 01 方案和 03 用例实施，仅新增 `scripts/macos-adhoc.mjs`、其单元测试与本目录模块证据；正式签名模块、配置、npm 入口及业务代码均未由本模块实施代理修改。

先写测试，缺少模块时 12/12 失败，见 [module-red.tap](evidence/module-red.tap)；实现后原 12 项通过，补充真实 Helper 探针和容器签名状态回归后最终 14/14 通过，见 [module-green.tap](evidence/module-green.tap)。TypeScript 全量 `tsc --noEmit` 和模块 `node --check` 均退出 0，命令与结果记录于 [module-validation.json](evidence/module-validation.json)。

## 接口与边界

| 接口 | 实现行为 |
| --- | --- |
| `assertAdhocHost(platform,arch,args)` | 仅 darwin/arm64；无参数为 build，唯一 `--preflight` 为 preflight，其余在写目录前拒绝。 |
| `createAdhocConfiguration(base,output)` | 内存中派生 dir-only 配置，无身份/公证、non-hardened，关闭强制签名、DMG 签名/更新信息及 publish；不改 base。 |
| `scanAdhocCode(app)` | 对真实文件魔数发现所有 Mach-O，含 Resources 下 `.node`、`.dylib` 和独立工具；发现嵌套 app/framework/xpc/appex，接受安全内部 Framework 链接，拒绝根链接、外部/悬空/循环链接及特殊文件。 |
| `signAdhocApp(app,options)` | 签名仅限实际的 `release/.staging/adhoc-arm64-*` 自有目录内；全部 Mach-O 先验 arm64、权限先验最小 JIT，再按深度由内向外逐项签名并独立重验。 |
| `verifyAdhocApp(app,options)` | 全部原生对象严格验签，读取实际 display 要求 adhoc、无 Authority/Team、无 runtime；app 必须有资源封印和最小 JIT；顶层再 deep strict。架构只对 Mach-O 文件运行 lipo，不对 bundle 目录运行。 |
| `createAdhocDmg(source,image,options)` | 输入/输出限定自有 stage，已有输出拒绝覆盖；hdiutil 创建 UDZO 后验证，不签 DMG 容器，并实际读取 codesign display 确认未签状态。 |
| `withMountedAdhocDmg(image,callback,options)` | 容器完整性先验、自有目录只读挂载；callback 获得 mountpoint；finally detach，detach 失败保留目录，避免删除仍挂载的卷。 |
| `verifyAdhocDmg(project,image,options)` | 挂载前重新实读容器签名状态；挂载内 app 走完整 Ad-hoc/arm64 验证，再复用既有真实资源及 Node 依赖检查；无应用启动或 Apple 信任通过含义。 |

签名参数显式为 `--force --sign - --timestamp=none --options 0 --entitlements <最小JIT文件>`；不使用 deep 签名。签名中途失败即停止，不能继续签外层或输出成功报告。模块使用私有 execFile 端口读取容器诊断，所有公开工具错误重建为脱敏错误；正式发布模块不修改。没有访问钥匙串、Apple 账号或真实用户数据。

## 本轮实际验证范围

14 项单元使用真实临时文件树和受控 OS 命令端口，验证平台与配置隔离、路径/链接、架构先验、内到外签名、最小权限、display/flags/资源封印拒绝、签名失败停止、DMG 无覆盖、只读参数、内层失败 finally detach 和 detach 失败保留。正式模块缺 profile 仍拒绝，临时参数不能绕过正式 releaseMode。

集成前真实复制 Electron Helper.app 到本轮 `/private/tmp/shakeink-adhoc-helper-probe-*/release/.staging/adhoc-arm64-native-probe/`，对副本主程序及 bundle 用相同 Ad-hoc 参数重签。真实 codesign strict/deep 退出 0，display 显示 `Signature=adhoc`、flags `0x2(adhoc)`、`Sealed Resources version=2 ... files=0`；原 Helper 全文件 SHA-256 前后相同。完整命令及输出见 [module-helper-probe.json](evidence/module-helper-probe.json)，可重跑脚本为 [module-helper-probe.mjs](evidence/module-helper-probe.mjs)。没有启动该副本，不计最终产品/DMG 正例。

由此确认 nested Helper 的有效零资源封印应允许。先补 nested 零资源正例/顶层零资源拒绝回归，旧检查失败见 [module-helper-red.tap](evidence/module-helper-red.tap)；仅调整 nested app 允许 version 2、files=0，顶层应用仍要求 files>=1；全部对象仍必须通过实际 strict，顶层仍 deep strict。未放宽缺失封印、身份、flags、权限或架构要求。

P2-ADH-CR2 指出原先容器未实读就固定报告 unsigned。新增“已签/无法确认不得报未签”回归先失败，见 [module-container-red.tap](evidence/module-container-red.tap)，随后创建和重验各自调用真实 `codesign --display --verbose=4`。只接受未被终止的原生 exit 1，且 stderr 必须精确为该文件的 `code object is not signed at all`；exit 0 的已签容器拒绝，其他 exit 1、工具缺失、权限或超时均报安全的“无法确认”错误，不输出原始诊断。受控用例逐项覆盖这些分支，成功 unsigned 报告现在来自实读门返回值。

额外尝试在自有目录创建只含哨兵文件的小型 DMG，以原生复核容器检查；当前 hdiutil 创建 exit 1，诊断为“create failed - 设备未配置”，因此未执行到 codesign，不计任何容器正例。失败原始证据见 [module-container-probe.json](evidence/module-container-probe.json)，脚本见 [module-container-probe.mjs](evidence/module-container-probe.mjs)。最终产品 DMG 的实际容器状态仍由主代理后续构建/检查记录承载。

受控输出不能证明真实 codesign、DMG 创建或启动成功。Ad-hoc 包无 Developer ID/公证，不能计正式信任通过；实际最终 DMG、原生完整性/篡改、安装副本启动/重开及网络限制由主代理后续执行。目标 macOS 15.7.5/M4 与微信下载隔离流程没有在本模块阶段执行。

```sh
/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node --import tsx --test --test-reporter=tap tests/unit/macos-adhoc.test.ts
/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node --check scripts/macos-adhoc.mjs
/Users/dt_flys/.nvm/versions/node/v24.18.0/bin/node node_modules/typescript/bin/tsc --noEmit
```
