# macOS 发布流程修复验证

## 2026-10-18 重新构建、签名与 DMG 验证结果

会员资格已实测有效，Developer ID Application 证书已通过 Apple 官网签发并安装，当前本机有 1 个有效签名身份；团队为 `738DY63GV2`。详见 [本轮证书配置进展](10-signing-setup.md)。

- 使用 Node 24.18.0 完成 `npm run typecheck`，退出码 0。
- 首次受限环境构建停留在 Turbopack 编译阶段且无 CPU 活动，停止该次构建后，以正常本机权限运行同一 `npm run build`，UI 优化编译、TypeScript、静态导出及桌面进程编译全部成功，退出码 0。日志为 `release/evidence-20261018/build-native.log`。
- 初次独立静态审核与 16 项单元测试未发现问题；本轮真实工具验证随后暴露了两处参数兼容性缺陷，不能以原静态审核代替真实系统验证。`codesign` 不支持 `--version`，已改用 `xcrun --find codesign`；`-R` 的内联要求必须以 `=` 开头，已修正 App、子对象及 DMG 的三处调用，保留原 Apple/证书类型/团队要求正文。
- 两处修复均先补用例并记录失败，再实施修复。正常本机权限下签名发布与打包配置测试最终 23/23 通过，0 跳过，独立审核另行复跑同样通过。真实系统二进制的裸要求/内联要求对照记录于 `release/evidence-20261018/requirement-native-comparison.json`；受限环境中的修后原生验签仍可能因系统信任服务不可达失败，不能将其单独归为语法错误或跳过处理。最终通过日志为 `requirement-green-native.log`，最终类型检查 `typecheck-final.log` exit 0。
- 构建前执行当前完整 `npm run test:package`：47 项中 44 通过、3 失败、0 跳过。失败是旧 `release/mac-arm64` App/ZIP 的 `out/index.html` 与当前输入不一致，另一个缺 worker 负例也在此前置资源一致性检查处失败；不能将此套件写成全通过。旧产物同时用于签名损坏/未签名负例，未覆盖它们来消除失败。新正式产物须通过自身完整资源、依赖与真实系统信任检查。
- 本轮另执行完整本地单元/集成回归（Node 24、concurrency=4）：2192 tests，2175 pass、17 fail、0 cancelled、0 skipped，exit 1，约 275.5 秒。17 个失败标题全部出现于 2026-10-16 的历史失败清单，本轮没有新的失败标题，没有 MACREL 失败；历史 `BDC06 legacy root migration` 本轮通过。这只是标题对照，不等于对历史源状态逐项独立复现或已解决其余业务问题。证据为 `release/evidence-20261018/core.tap` 与 `core-summary.json`；不宣称全量业务回归全绿。
- `git diff --check` 及 entitlement plist 语法校验通过。

本轮请求的 DMG 重编译、Developer ID 签名、公证及最终包验证已完成。交付版本沿用 `0.1.0-alpha`，目标为 Apple Silicon `arm64`，本次生成 DMG。

| 最终产物与实际检查 | 结果 |
| --- | --- |
| 交付目录 | `release/verified-macos-arm64-7b92b578-1156-4036-bafc-cd90e2ceb04b` |
| DMG | `ShakeInk-0.1.0-alpha-mac-arm64.dmg`，346533718 字节（约 330.5 MiB） |
| 最终 SHA-256 | `7445ea7df5f71c01e5dc676668d9d83a306d85f0e657847e712cbff7166f989d` |
| 实际签名身份 | `Developer ID Application: James Gong (738DY63GV2)`；外层 DMG 和盘内 App 的叶证书 SHA-1 均为 `369509723F1E02E6B50E2401B35800C234BBB583` |
| App 公证 | `d821126e-01f1-441f-bf9d-97bf6ea0de96`，`Accepted`，票据验证通过 |
| DMG 公证 | `6db0a031-5dc5-499a-a336-32d96b1117e5`，`Accepted`，票据验证通过 |
| 最终包独立重验 | 新进程 `npm run package:verify:mac -- 'release/verified-macos-arm64-7b92b578-1156-4036-bafc-cd90e2ceb04b' --team-id 738DY63GV2`，exit 0，`passed: true` |
| 验证范围 | 实际最终散列、大小、逐块 blockmap、DMG 完整性与外部 Apple Developer ID/Team 要求、只读挂载 App、全部原生对象、架构/时间戳/运行时/最小 JIT 权限、当前资源及包内依赖、票据/系统策略/Gatekeeper |
| 公钥证书复核 | 外层 DMG 与内层 App 均精确匹配本轮安装证书；叶证书当前有效，提取的三张公钥证书相邻链签名通过；两者 Gatekeeper 均为 `accepted / Notarized Developer ID` |

原始 `npm run package` 的长进程已载入修复前的内联 requirement 参数，完成真实 App 签名、公证和附票据后，在旧参数的 afterSign 校验处退出 1，不能把原命令记为成功。退出后，以新进程对该 App 执行全部真实信任、资源及依赖门；26 个原生对象、17 个 Mach-O、340 项项目资源均通过。再通过 `electron-builder` 的 `prepackaged` 入口在新 staging 生成签名 DMG，保留 `forceCodeSigning`、DMG 签名和原最终化门，实际 DMG 公证、附票据、验包、元数据重算及推广全部完成，恢复命令 exit 0。恢复脚本和公钥复核脚本均事先经独立审核，没有使用模拟 Apple 响应代替真实检查。

证据位于 `release/evidence-20261018/`：`release-result.json`、`dmg-notary.json`、`app-notary-status.json`、`resume-dmg.log`、`independent-verification.log`、`certificate-audit.json`、`certificate-audit-commands.json`，汇总为 `verification-report.json`。闭集 verified 目录只含 DMG、blockmap、`release.json` 与 `SHA256SUMS.txt`，报告另存，不改写验包后的交付文件。公钥证书临时文件已在成功卸载后清理，没有导出签名私钥，没有远端发布。

最终证据经独立复核通过，无必修问题。复核另行只读重算 DMG 与 blockmap 的 SHA-256，均与清单一致；记录为 `release/evidence-20261018/final-evidence-review.json`。该结论限定本轮 DMG 构建、签名、公证与交付证据。

本轮为当前开发机 macOS 27.0.1 的真实签名/公证验包。完整本地业务回归仍有上述 17 项失败；尚未执行最终 App 启动/完整业务 UI、干净 macOS 15.7.5 Apple Silicon 保留下载隔离的安装及断网首启、Intel/Windows 发布验收。本轮签名结果不宣称上述范围通过。

以下保留 2026-10-16 历史记录，其中“尚未加入计划”等前提状态已由上方本轮实测更新。

2026-10-16。**发布流程代码已实施并通过独立复审，最终安装包验收尚未完成。** 当前 Apple 账户尚未加入付费开发者计划，本机没有有效 Developer ID Application 身份或可用公证配置；不能生成并交付宣称签名、公证全通过的新 DMG/ZIP。

## 已实施的修复

- macOS 正式归档默认先预检签名身份、公证认证、系统检查工具和 Gatekeeper 状态；缺少前提即在构建前失败。`--dir` 保留本地验包，Windows 仍使用原 NSIS 配置。
- 按最小 JIT 权限由内向外签名，保留现有资源/依赖检查和菜单本地化。在归档前核验实际 Developer ID、Team、时间戳、运行时保护、票据、所有原生代码和系统策略。
- `.app` 附票据后归档；DMG 另行公证和附票据，验包后才从最终字节生成及逐块核对 blockmap、大小、SHA-512/SHA-256。只有全部通过才生成唯一的 verified 发布目录，不复用中间更新元数据，不覆盖旧包，不自动远端发布。
- ZIP 解压前检查原始路径、重复/冲突、链接关系及 CRC；DMG 只读挂载验证内层应用。新增独立重验命令，外部预期 Team 为必填。

实现和范围依据：[实施方案](04-implementation-plan.md)。详细接口与 TDD 记录：[模块实现](08-module-implementation.md)。

## 已执行检查

| 范围 | 实际结果与证据 |
| --- | --- |
| 配置 TDD | 旧配置对两项新断言 RED 2/2；实现后 GREEN 2/2。见 `evidence/config-red.tap`、`config-green.tap` |
| 模块与原生负例 | 最终 18/18 通过，独立审核代理另复跑 18/18。覆盖真实临时文件/归档/元数据与受控系统端口；原坏包先无 Team 筛选验证完整性失败，再验证新门拒绝。见 `evidence/module-green.tap`、`module-validation.json` |
| 完整打包回归 | 最终 `npm run test:package` 33/33 通过，0 fail/cancel/skip，约 43.5 秒；包含发布模块 16 项及原专用套件 17 项。资源、真实包内依赖、ZIP 完整性、Windows 分支及原坏包拒绝均保留。见 `evidence/package-tests-complete.tap`；注册扩充前的 17/17 另存于 `evidence/package-tests-final.tap` |
| 类型检查 | 初轮暴露新增 JS 接口推断问题，JSDoc 边界修正后完整 `tsc --noEmit` exit 0。见 `evidence/typecheck.log`、`module-typecheck.log`、`module-validation.json` |
| 代码审核 | 首轮两项 P2 为负例触发类别和失败路径覆盖，均已补强并复审关闭；无剩余代码审核阻断。见 [代码复审](09-code-review.md) |
| 语法/差异 | 新增三个发布脚本语法检查及 `git diff --check` 通过；最小 entitlement plist 校验通过 |
| 实际正式打包入口 | 本机 `npm run package` exit 1，提示缺少 `APPLE_KEYCHAIN_PROFILE`，未开始 build、未生成新 release；这是缺前提时的预期失败保护，不能计为正式构建成功。见 `evidence/package-preflight-native.log` |
| 原数据保留 | 调查中的旧 DMG SHA-256 与原未提交命令目录修改均保持原值。见 `evidence/preservation-final.json` |
| 全量 core 初轮 | 2162 tests：2137 pass、19 fail、6 cancelled。另旧证据脚本在获取 git stdout 时异常，TAP 已保留；不将其视为通过。见 `evidence/core-console.log`、`core-first-summary.json` |
| 全量 core 最终复验 | concurrency=4，284 文件、2165 tests：2147 pass、17 fail、1 cancelled、0 skipped；无全局超时，执行期间输入散列保持一致。见 `evidence/core-final.json`、`core-final.tap`、`core-final-failures.json`。未通过全量验收 |

打包回归首轮曾有一次 ZIP 90 秒超时及一个在 macOS 上错误取用基础强制签名值的 Windows 模拟用例失败。后者改用真实入口同一平台配置生成函数，保留原 builder 分支断言；降低同时运行任务的负载后完整串行套件已通过。首轮原始结果保留于 `evidence/package-tests.tap`，没有跳过或放宽 ZIP 断言。

本轮没有修改 `src`、业务 core/main、数据库、模型行为或上游 Web。全量 core 最终仍有配置快照、模型目录/编辑器、界面闭包变量、worker/侧边栏及数据库迁移相关失败/取消，具体用例和位置见 `core-final-failures.json`；没有失败的 MACREL 标题。这些失败不能由定向发布测试抵消，也未据此擅改正常业务源码。

全量 core 完成后，仅把已经包含在 core 清单中的 `tests/unit/macos-release.test.ts` 注册到 `npm run test:package`；这项命令注册不改变产品脚本或 core 固定用例清单。该专用命令随后再次完整运行，33/33 通过。最终生产发布文件与 core 运行时记录的散列保持一致；未把运行结束后的测试注册变更写成该轮输入完全未变。

`git diff --exit-code -- src desktop/core desktop/main tests/integration` 及本轮失败的单元测试文件检查为无差异（`evidence/unchanged-business.diff` 为空）。这只能证明这些路径没有本轮工作区修改，不能代替对每项失败的基线复现，也不能据此宣称完整业务回归通过。

## 2026-10-16 历史验收状态

| 条件 | 当前状态 |
| --- | --- |
| 安装 Developer ID Application 证书 | 尚未完成。本人完成 iCloud 条款及重新登录、重启 App 后，相同身份提交步骤通过复验。用户确认个人注册并已付款；本地 App 复查仍显示将收到相关邮件，最新成功读取的网页账户为“待处理”，尚未确认会员激活。邮件截图仅为基础协议签署通知。界面与因果限定见 `10-signing-setup.md`，文档复审见 `12-enrollment-review.md`。尚未创建私钥/CSR或签发证书 |
| 真实签名及 Apple 公证 Accepted | 未执行，缺有效身份与公证授权；没有用临时签名或受控响应代替 |
| 最终 DMG、盘内 app、ZIP 内 app 全部真实信任检查 | 未完成，尚无新正式包；原坏包拒绝只计负例 |
| 真实最终发布目录独立重验 | 未完成，未生成 verified 目录；不能以测试 fixture 中的清单作交付物 |
| 干净 macOS 15.7.5 Apple Silicon 下载及断网首启 | 未执行，需在真实签名包具备后完成；开发机直接运行或 renderer 离线不能代替 |
| 全量业务用例全绿 | 未通过；最终复验 17 fail、1 cancelled，不宣称已通过全部用例 |

## 2026-10-16 后续步骤记录

按 [证书和公证配置](10-signing-setup.md) 完成开发者计划激活、证书安装和钥匙串公证 profile 后，运行 `npm run package:preflight`、`npm run package`。只有真实检查全部成功后，再用实际 Team ID 运行 `npm run package:verify:mac -- '<verified目录>' --team-id '<Team ID>'`，记录唯一产物目录、Apple 公证请求与结果、最终散列及目标机器验收证据。

原 `release/ShakeInk-0.1.0-alpha-mac-arm64.dmg` 是保留的已知坏样本，不能当作此次修复后的安装包分发。用户要求“所有校验必须通过”保持为完成门槛，当前没有降低或宣布满足该门槛。
