# Ad-hoc 临时 DMG 最终证据独立审核

2026-10-16。审核对象为本轮临时产物及其实际执行证据；只写本文件，没有启动应用、重跑重型用例、挂载/修改 DMG、修改业务代码或操作账户/钥匙串。

## 结论

**限定验收通过：本临时 DMG 的完整性，以及本机隔离安装副本的正常首次启动、退出与重开。没有未关闭的本范围审核阻断意见。** 该结论不包含整应用断网首启、收件人的 macOS 15.7.5/M4、微信隔离与 Finder 手动例外、完整业务验收或正式 Developer ID/公证发布。

审核文件包括 `06-verification.md`、`03-test-cases.md` 的执行调整、`05-code-review.md`、`requirements-traceability.json` 的 `macosAdhocTemporaryRevision`、本目录 evidence 中的构建/测试/保留记录及 `finalize-record.mjs`，并交叉读取产物清单、原生策略结果、全部六次启动报告和最终两张截图。当前文档、台账及交付摘要均保持上述限定，没有将失败或未执行项目记为全部通过。

## 独立核对结果

| 项目 | 本次审核依据及结果 |
| --- | --- |
| 最终文件 | `ShakeInk-0.1.0-alpha-mac-arm64-adhoc-test.dmg`，独立读取实际文件：406,008,897 字节，SHA-256 为 `4f503f3c46f5ed0e5b38815aa6f5a29ee2e0e43841658a902554f74e51839d68`，与清单、SHA256SUMS、交付记录、策略检查及全部启动记录一致。 |
| DMG 与包内完整性 | 已审核构建入口和验证器的实际控制流；构建日志记录最终静态校验完成，清单记录实际镜像验证、只读挂载、26 个代码对象/17 个 arm64 Mach-O 的逐项 strict 与顶层 deep strict。实际容器 display 为 exit 1 且精确未签名诊断；应用 display 为 adhoc、flags=0x2、Team 未设置、有效 v2 资源封印。未以工具任意失败替代 unsigned。 |
| 资源与依赖 | 最终包报告记录 27,047 文件、340 项项目资源比对；包内依赖实际 Sharp 转码、PGlite 内存查询结果 42/正常关闭、WASM 与模块解析检查成功。这些与真实 Electron 启动分开记录。 |
| 两次实际启动 | 成功报告 `startup-5a328271-b9f9-41e2-8306-c4d731bd6029.json` 的 first-launch/reopen 均 passed=true，正常退出 code=0、signal=null，errors 为空。实际 packaged/arm64、安装副本 appPath、隔离 userData、renderer sandbox=true、Node Server listeners=0、中文菜单、默认无模型、本地数据库/IPC、主题 ink 持久化和 renderer pageerror 为空均有对应断言记录。 |
| 签名前后及负例 | 两轮 signatureBefore/signatureAfter 均为相同 26/17 的 Ad-hoc/arm64 验证。只修改另一自有副本的 LICENSE，原生验签以 exit 1 的 sealed-resource-invalid 拒绝；原安装副本随后重验成功，dmgUnchanged=true。本次独立最终散列计算同时确认镜像未改变。 |
| 网络观察 | 两轮固定 URL 的原生 requestfailed 均精确为 `net::ERR_BLOCKED_BY_CLIENT`；harness 不安装 route，不接受 DNS/超时/一般 fetch 拒绝作为成功。scope 明确仅为现有 default-session 协议过滤观察，processNetworkPolicy=false，whole-application offline first launch 仍在未验证列表。 |
| 正式边界与旧样本 | 本次重新计算 preservation-before 所列全部 7 项：正式发布五文件、预存 generated 文件及旧坏 DMG 均逐字节散列相同。`git diff --name-only -- src desktop prisma` 仅显示该预存 generated 文件，且其本轮散列不变。正式发布门没有因临时包改变。 |

独立散列复核时间为 `2026-10-16T12:00:03.641Z`；产物目录的 `native-policy.json` 与 evidence 中原记录字节相同。对最终清单、成功启动报告和交付记录另做只读一致性断言，退出 0，没有重跑产品来制造新证据。

两张成功截图均已实际查看：可见原工作台及选中“玄墨”的主题引导。它们与启动报告一致，但引导仍显示，不能由此声称已完成全部引导或业务面板验收。本次通过依赖有限启动、真实本地 IPC/数据库与正常重开断言，不扩展为完整业务通过。

## 历史失败与测试调整

产物目录有六份独立启动 JSON，时间顺序为 `cb55723e`、`33cd7ee1`、`cc9df7cf`、`3bfd5b80`、`74b9c017`、`5a328271`；前五份仍为 passed=false，只有末份为 true，且均绑定同一最终 DMG 散列。

- 前两轮施加外层 SBPL，工作台未就绪；第二轮自有进程日志保留 sandbox initialization failed/Operation not permitted、GPU exit 6 及 FATAL。之后同包无外层策略实际进入工作台，支持该测试条件下的沙盒兼容性问题；不因此给整进程离线能力记通过。
- 第三、四轮因测试 route 未观察到请求而失败；产品已有 CSP/transport/session guard 保留，未把原生先行取消改称 route 生效。
- 第五轮已观察精确 session guard 拒绝，随后旧 `.check()` 的即时状态断言失败；最后改用真实 click，分别等待持久化主题值及 checked 状态，并在重开时重验。没有删除该断言、替换产品组件或追溯改写旧报告。
- 测试调整属于 ADH-10 已批准的兼容性回退及异步控件等待，相关版本经 `05-code-review.md` 窄复核。最终成功记录不能抵消之前的失败，也不能恢复未达到的进程隔离范围。

## 原生信任及回归结果

`native-policy.json` 的实际输出显示 Gatekeeper assessments enabled；spctl 应用评估 exit 3/rejected，syspolicy_check exit 70 并明确列出 Adhoc Signed App 与 Notary Ticket Missing，App/DMG stapler validate 均 exit 65 且说明没有附票据。记录保留真实诊断、signal/killed/工具错误边界，不能将这些结果解释为正式信任通过。临时清单始终为 `formalReleaseAccepted:false`、`notarized:false`；文件列表没有正式 verified 清单或更新元数据。

发布策略单元 TAP 为 35/35、0 fail/cancel/skip；类型检查日志无诊断，主代理执行记录为 exit 0。全量 core 原始 TAP 与 JSON 一致：285 文件、2,179 项，2,162 pass、17 fail、0 cancel，进程 exit 1、未超时、运行期间输入无变化。本次直接提取前后两份原始 TAP 的失败标题并归一化项目路径，新增标题为空，原 BDC06 标题不再失败，与 comparison.json 一致。此比较证明失败标题没有新增，不是对这 17 项业务失败的根因分析或业务无回归的充分证明；全量 core 仍未通过。

原打包回归确为 47 项、45 pass、2 fail。两个失败的实际错误均为 `out/index.html` 与输入不一致；测试源确实固定读取旧 `release/mac-arm64/玄印写作.app`，其中缺 service worker 负例在其前置资源一致性检查已失败，并未成功完成该负例。旧样本未为消除失败而覆盖；新 DMG 的资源实测独立记录。两项失败不能消去，也不否定本次绑定新镜像的有限完整性证据。

## 最终化与交付界限

已读 `evidence/finalize-record.mjs`：它先核对实际 DMG 散列、启动报告及策略报告的同一散列、两轮成功/正常退出/签名/功能/篡改负例，再仅更新包外临时 metadata、策略副本及说明。它不写 DMG，不签名公证，不运行正式推广；最终未验项合并保留。脚本内本轮固定的 35/35 和 legacy 45/2 等摘要值已与原始 TAP 交叉核对，不以脚本常量本身作为测试证据。

安装说明对“仍要打开”使用条件语气，明确没有按钮或仍报已损坏时按该设备未通过处理，没有要求关闭 Gatekeeper 或清除下载隔离。正常手动运行使用正常数据目录，与自动测试的隔离目录区分清楚；本次没有读取真实用户数据或凭据。

本审核允许把该文件作为**已完成完整性与本机正常启动/重开的临时测试 DMG**交付。收件人 macOS 15.7.5/M4、微信真实传输隔离、Finder/“仍要打开”实际操作、目标机断网首启、整应用网络隔离、全部业务及正式 Developer ID/公证验收仍未通过或待验证。不得将本限定结论写成原始问题在所有目标环境已经修复，或用户要求的全部验收均已通过。
