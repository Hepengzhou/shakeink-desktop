# macOS 安装包损坏提示根因分析与修复方案

日期：2026-10-16。状态：包内发布缺陷已证实，接收端补充诊断支持主故障链；独立复审及用户审核已通过，进入实施，见 [实施方案](04-implementation-plan.md)。前序产物：[调研文档](01-research.md)，审核记录：[独立审核](03-review.md)。

## 结论

当前同名本地 DMG 的应用没有完成面向用户分发所需的签名与公证：构建显式跳过签名，留下 Electron 原始的 linker ad-hoc 签名，不能完整封印应用及 `Info.plist`；Apple 原生发布检查因此失败。同时，应用和 DMG 均未附加公证票据。现有资源/归档/直接启动检查不能阻止这种包进入 release。

这些是已在实际 DMG 内证实的产品发布缺陷，修复应限定在打包、签名、公证和发布验收流程。M4 选择 arm64 包符合架构；当前检查未发现显性的最低系统版本不匹配。不能把用户截图解释成业务代码崩溃，也不能认定微信损坏了包。

用户补充：报错后立刻查看“隐私与安全性”；目标机上的 Codex 分析认为应用签名校验失败、被 macOS 阻止启动，并带有微信下载来源的隔离标记。这与本地实测的签名缺陷一致，进一步支持“下载隔离状态下的应用因签名失败被系统阻止”这一主故障链。

**该补充是用户转述的目标机诊断摘要；接收端 SHA-256、原始命令输出与退出码仍未提供，设备是否受组织管理也尚未说明。** 因此尚不能证明两份 DMG 字节完全一致，或断言“没有仍要打开”的具体系统原因已全部查明。

## 实物与证据

| 项目 | 结果 |
| --- | --- |
| 用户确认文件名 | `ShakeInk-0.1.0-alpha-mac-arm64.dmg` |
| 本地样本 SHA-256 | `2abef4f3708c20b4dd19e09db39ddc7c0659bf6dbba154b50dc2d19a3c291cda` |
| 本地样本大小 | 345,736,762 字节 |
| 仓库提交 | `9e7cd79f0e1e4f165cab17685b5191ca48d37bb6`；调查开始时另有 `desktop/shared/command-catalogs.generated.json` 未提交修改，保留原状 |
| 诊断机器 | macOS 27.0.1、arm64；与用户的 macOS 15.7.5 区分 |
| 实物检查方式 | 只读挂载 DMG，对盘内 `.app` 运行 Apple 原生工具；没有启动、重新签名或清除隔离属性 |
| 包内与构建记录关系 | `Info.plist`、主程序、main/service 入口四项 SHA-256 均与本地展开目录及构建 manifest 一致 |
| 原生架构和部署版本 | 扫描到的 17 个 Mach-O 文件均为 arm64；Electron 相关文件最低 13.0，四个原生依赖最低 11.0 |

原始证据：[盘内应用诊断](evidence/dmg-native.json)、[DMG 挂载日志](evidence/dmg-attach.log)、[构建与实物比较](evidence/comparison.json)、[Helper 部署版本补充](evidence/deployment-fallback.json)、[源码与样本保留核对](evidence/preservation.json)。`collect.mjs`、`compare.mjs` 是文档内的取证脚本，不参与产品构建。取证完成后已卸载只读镜像，原始记录中的临时挂载路径不作为持续可用的文件链接。

接收端补充单独记录于 [用户转述的现场诊断](evidence/recipient-report-20261016.json)，不混入本代理实测的原生工具结果。

原生检查经沙箱外只读执行，关键结果为：

| 命令对象与目的 | 退出码 | 实际结果及含义 |
| --- | --- | --- |
| `hdiutil verify`，DMG 容器 | 0 | 容器校验和有效；不等于应用受系统信任 |
| `codesign --verify --deep --strict --verbose=4`，盘内应用 | 1 | `code has no resources but signature indicates they must be present` |
| `codesign --display --verbose=4`，盘内应用 | 0 | `Identifier=Electron`、`Signature=adhoc`、`TeamIdentifier=not set`、`Info.plist=not bound`、`Sealed Resources=none`；display 成功只代表可读取签名信息 |
| `syspolicy_check distribution`，盘内应用 | 70 | 报资源签名错误、ad-hoc 不适于分发、缺少票据、签名未完整覆盖 `Info.plist` |
| `spctl --assess --type execute --verbose=4`，盘内应用 | 1 | 返回同一资源签名错误 |
| `xcrun stapler validate`，盘内应用及 DMG | 各 65 | 两者均没有附加票据 |
| `codesign --display --verbose=4`，DMG | 1 | DMG 本身未签名；不能单用这一项推断盘内应用状态 |

早期沙箱内 `spctl` 曾返回 Code Signing 子系统内部错误，相对路径 `stapler` 曾返回路径解析错误。它们不作为拒绝证据；以上表格只采用绝对路径、原生环境执行的结果。`otool` 也曾对名称含括号的三个 Helper 解析路径失败，补用 `vtool -show-build` 均成功读取最低版本 13.0；这不是应用内 Helper 缺失。

## 根因一 打包跳过最终应用签名

`electron-builder.config.cjs:10,35` 设置 `forceCodeSigning: false` 和 `mac.identity: null`。`scripts/package-desktop.mjs:19–38` 原样把它传入 builder，没有面向外部分发的强制签名分支。最新成功构建日志明确写着 `skipped macOS code signing`，原因是 identity 显式为 null。

已安装的 `app-builder-lib 26.15.3` 在 `out/macPackager.js:290–300` 遇到 null 身份直接返回；`out/mac/MacTargetHelper.js:13–19` 在未启用强制签名时只记日志。因此这不是缺少证书后偶发失败，而是当前配置主动允许缺少有效分发签名的产物构建成功。

盘内主程序与 `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron` 的 SHA-256 完全相同，原始 Electron bundle 也返回同一严格校验错误。这说明打包保留了原始可执行文件的 linker 临时签名，没有为最终应用建立开发者身份和资源封印。不能把它归因于“正式签名后，被本地化步骤单独破坏”：现有本地化写入发生于 afterPack，而 builder 的签名阶段在后；当前后续签名被配置跳过了。

影响覆盖应用外层和部分嵌套 Framework/Helper，不能只对最外层临时重签一下就宣布修复。即便部分 `.node`/`.dylib` 的本地完整性检查通过，也不等于整个应用已获得 Developer ID 分发信任。

证据：[配置](../../electron-builder.config.cjs)、[打包入口](../../scripts/package-desktop.mjs)、[成功构建日志](../../release/rebuild-20261016-final.log)、[比较记录](evidence/comparison.json)。

## 根因二 公证与离线票据流程缺失

`electron-builder.config.cjs:36` 另将 `mac.notarize` 设为 false。当前 null 身份还会在调用公证步骤前直接返回；即便只修复签名，显式 false 仍会阻止公证。该控制流可在已安装 `macPackager.js:316–318` 与 `mac/MacTargetHelper.js:256–267` 复核。

应用没有有效 Developer ID 签名，当前也就不具备以该临时签名完成标准公证的前提。`stapler` 已证实应用和 DMG 均无附加票据。这里依据配置和实物判断当前构建没有完成公证流程，而不是仅从“票据未附加”反推“从未公证”。

公证与附加票据是两个步骤；在线能查询到公证记录，也不能替代本项目要求的离线首次启动。修复必须让最终交付路径包含可离线验证的票据。[Apple 关于附加票据的说明](https://developer.apple.com/forums/thread/720093)解释了这一区别。

## 根因三 发布验收缺少系统信任检查

`tests/unit/packaging-config.test.ts:14–24` 把禁止签名和公证写成了成功条件。`scripts/package-desktop.mjs:24–30` 的 afterPack 主要验证资源/依赖，其位置早于最终签名和归档；`scripts/inspect-packaged-app.mjs:66–106` 检查元数据、资源和架构，不验证最终签名、公证与 Gatekeeper。

`tests/packaging/package-archive.test.ts:18–34` 检查 CRC、文件表和部分散列；`release/verify-rebuild.mjs` 通过 Playwright 直接启动本地 Mach-O，并在 firstWindow 后才让 renderer 离线。此前记录准确限定了范围，但发布流程没有增加“最终下载包首次打开”的验收门。

本次盘内应用的 `xattr` 只列出 provenance，没有下载隔离属性；接收端图一显示 WeChat 来源，用户后续又转述目标机诊断发现微信下载来源的隔离标记。结合 [Apple 对下载隔离的解释](https://developer.apple.com/forums/thread/706442)，这支持两条启动路径受到的检查条件不同；具体隔离属性原值尚未提供。此前本地启动通过与接收端签名失败、系统阻止启动并不矛盾。

## 现场补充后的故障链

当前证据支持：应用带有微信下载来源的隔离标记 → 打开时进入系统信任检查 → 应用签名校验失败 → macOS 阻止启动并显示图一警告。隔离标记是正常的下载安全机制；它本身不说明微信改变了安装包内容，也不是应从产品流程中删除的缺陷。发布端需要提供可通过检查的应用。

本地样本的无完整资源签名、无 Developer ID 身份和缺少公证流程，为该故障链提供了独立实物依据；接收端此次具体命中的签名错误细项仍待原始诊断对应。公证缺失是必须一并修复的发布缺陷，不能据此推定系统此次先因公证问题拒绝、再检查签名的顺序。

用户明确说明立刻查看设置，因此不再把“按钮显示时间窗已过”列为本次有证据支持的解释。签名无效与普通未知开发者提醒的处理不同，但目前仍不能单凭摘要确定按钮缺失的具体策略判定；设备管理状态等因素仅保留为待确认项。修复目标是让系统正常验证应用，不能依赖该例外按钮作为安装路径。

## 用户现场尚待闭环的因素

| 现象或假设 | 已知事实 | 结论边界与补证 |
| --- | --- | --- |
| “已损坏”是否为传输损坏 | 本地 DMG 完整且盘内应用已存在签名缺陷 | 接收端 DMG 比对 SHA-256；一致可排除传输改变 DMG 字节，不一致须调查不同构建或传输异常 |
| 接收端是否因签名失败被阻止 | 用户转述目标机 Codex 诊断为签名校验失败，且应用带有微信下载来源隔离标记 | 已支持主故障链；原始命令、退出码和签名错误细项仍待对应，不能将摘要写成主代理直接实测 |
| 是否为 M4/系统过旧 | 17 个原生文件均 arm64；主程序及 Framework 部署最低版本 13.0，已检查依赖 11.0 | 未发现显性架构/部署版本冲突；目标 15.7.5 的实际动态链接、权限及运行验收仍需执行，SDK 版本不等于最低系统版本 |
| 为什么没有“仍要打开” | 图三位置正确，来源设置已允许已知开发者；用户报错后立刻查看设置，转述诊断为签名失败 | 不支持时间窗已过的解释。签名失败时的拒绝分类、是否允许例外及设备管理状态仍需对应，不认定 15.7.5 移除了该功能 |
| 是否为恶意软件/证书撤销 | 截图没有“将损坏你的电脑”类文字；样本没有 Developer ID 身份 | 没有证据归因为恶意软件，也不能用本次静态检查作无恶意软件证明；目标策略若另有明确报告再调查 |

Apple 将损坏类警告与未知开发者警告分别说明，普通例外入口不能代替修复失效签名。[Apple 安全打开说明](https://support.apple.com/zh-cn/102445)支持警告分类；用户立即查看设置的补充不支持以限时入口超时解释本次现象。

接收端可先提供以下只读结果（按实际文件位置替换；保留退出码，不提供序列号、Key 或全机日志）：

```sh
shasum -a 256 "$HOME/Downloads/ShakeInk-0.1.0-alpha-mac-arm64.dmg"
codesign --verify --deep --strict --verbose=4 '/Applications/玄印写作.app'
syspolicy_check distribution '/Applications/玄印写作.app'
xattr '/Applications/玄印写作.app'
```

已知用户报错后立即检查设置；剩余补证为实际散列、相关原始诊断及设备是否受组织管理。无需为了开始修复本地已证实的发布缺陷，重复确认已经报告的现场操作。若散列相同且目标机返回同类签名拒绝，可把包内具体缺陷与本次事故直接关联；若修复签名、公证后仍异常，再依据针对该应用的系统策略/崩溃记录继续分析。

## 最小修复方案

建议采用正式的 Developer ID 签名、公证和附加票据流程。临时 ad-hoc 签名只能作为内部完整性验证手段，不能满足普通用户下载后正常首次打开的修复目标。

1. **区分本地开发与对外分发。** macOS 默认 `npm run package` 以及 `--dmg`/`--zip` 归档命令走发布模式；`package:dir` 保留可离线的本地开发/验包路径，不产生对外安装包。发布构建先进入独立 staging 目录，通过全部最终化检查后才进入可分发清单。缺少有效 Developer ID 身份、所需公证凭据或公证成功结果时失败退出，不能静默退回未签名产物。保留 `publish: never`，不自动上传到发布站点。
2. **先组装，后由内向外签名。** 保留现有 afterPack 资源检查与菜单本地化，在此之后完成 Framework、Helper、原生模块和外层 `.app` 的签名，使用安全时间戳与 hardened runtime。按已安装 builder v26 的字段实现，不引入 v27 配置或升级依赖。核实 V8/JIT 和原生模块所需最小 entitlement，不能为通过签名广泛关闭库校验、renderer sandbox 或其它保护。
3. **公证和票据覆盖实际交付路径。** 应用签名后提交 Apple，等待 Accepted，附加并验证 `.app` 票据；采用现有 v26 的公证能力时，已安装的 `@electron/notarize/lib/index.js:46–49` 在返回前已完成应用 stapling，须验证结果而不是归档后再补应用票据。ZIP/DMG 在应用票据完成后生成。DMG 完成组装/签名后由独立最终化阶段提交公证并附加容器票据。ZIP 本身不能作为 stapler 目标。应用完成签名后不再更改业务资源、图标、元数据或本地化；附加 Apple 票据按官方流程执行。
4. **对最终交付物设置失败门。** 已安装 `dmg-builder/out/dmg.js:44–56` 仅执行 DMG 签名、生成 blockmap 和完成事件，不公证 DMG。因此发布模式明确关闭 staging 的 DMG 更新元数据生成（v26 的 `dmg.writeUpdateInfo: false`），由独立最终化阶段执行“DMG 公证 Accepted → staple/validate → 最终验包 → 依据最终字节生成 blockmap、大小、SHA-512/SHA-256 及其引用 → 进入可分发清单”。ZIP 也只保留与最终归档字节匹配的元数据；不复用中间事件的 `updateInfo`。对最终 DMG 只读挂载、对 ZIP 解压后分别验内层应用的严格签名、开发者身份/Team、票据与 `syspolicy_check`；DMG 另验容器签名/票据/策略。保留 `hdiutil`、归档、依赖和资源检查。任何步骤失败、工具超时或票据无效都停止最终化，不产生成功清单，不推广 staging 产物。
5. **修正测试契约并完成系统验收。** 将“不签名”断言限制在本地模式，新增发布模式缺证书/缺凭据/签名或公证失败必须停止的用例，以及签名后篡改必须被拒绝的负例。增加最终化顺序、失败不得推广、中间 `updateInfo` 不得流出、staple 后最终散列/大小/blockmap 一致性的用例。在正式签名身份可用时检查真实包，不把 mocked 命令成功当成签名通过。随后在干净的 15.7.5 Apple Silicon 环境，用真实下载/微信接收、Finder 安装、断网首次打开完成验收。

## 改动范围与业务保护

候选改动仅限 `electron-builder.config.cjs`、`scripts/package-desktop.mjs`、新增发布模式/最终验包脚本、必要的 `build/entitlements*.plist`、`package.json` 中对应入口、打包测试及发布文档/台账。实际精确文件清单在用例审核前冻结；不改 React 业务组件、IPC、数据库、存储路径、模型、用户数据或上游 Web 仓库，不更改 appId、产品名和数据迁移行为。

Windows 继续使用原 NSIS 分支，macOS 强制签名条件仅作用于 macOS 发布模式。现有 arm64 本机构建、离线资源检查和无默认模型等要求继续保持。真实凭据仅通过本机签名环境或发布环境安全注入，不输出环境变量或密钥，不写入仓库/日志。

新增签名可能改变运行时限制，必须实际覆盖 V8、worker/子进程、Sharp 图片路径、PGlite、文件导入导出、系统菜单及设置持久化。业务代码保持不动是控制风险的边界，仍需回归结果证明签名后的行为。

## 审核与验收门

| 阶段 | 当前状态与通过条件 |
| --- | --- |
| 调研与实物定位 | 已完成本地同名 DMG 的只读取证，证实三项发布流程根因 |
| 独立子代理审核 | 原方案与本次现场补充均通过，见 `03-review.md`；首轮关于 DMG 最终化和更新元数据的 P2 已修正并复审关闭，无剩余文档阻断 |
| 用户审核 | 已通过，用户明确授权指定方案并修复，要求真实 release 包全部签名、公证等校验通过 |
| 现场根因闭环 | 用户转述的签名失败和隔离标记支持主故障链；即时查看设置不支持超时解释。待接收端散列、原始错误细项及按钮缺失的策略条件进一步对应 |
| 用例审核与 TDD | 已执行，发布模块和配置已完成 RED/GREEN 与独立代码复审；详见 `08-module-implementation.md`、`09-code-review.md`、`11-verification.md`。业务源码保持原状 |
| 发布信任验证 | 需有效 Developer ID 身份和公证授权，真实签名、公证、附票据、最终验包全部成功 |
| 系统与业务验收 | 干净 macOS 15.7.5/M4 或适合的 Apple Silicon 目标实际下载、安装及离线首启；保留现有业务回归并按签名影响补原生测试，不以单一启动覆盖所有业务 |

用户已通过本分析并授权实施，发布流程代码已按 `04-implementation-plan.md` 修复并通过独立复审，执行结果见 `11-verification.md`。有效开发者身份、公证授权、真实包全门校验和干净目标环境仍是发布完成条件；当前未宣称安装包已修复验收通过。
