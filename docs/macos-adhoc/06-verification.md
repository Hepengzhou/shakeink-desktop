# Ad-hoc macOS arm64 临时 DMG 验证记录

2026-10-16。本轮只增加临时打包、签名和测试路径。正式发布仍要求 Developer ID、Apple 公证与票据校验；本临时包不能代表正式发布验收。

## 产物

- 文件：`release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0/ShakeInk-0.1.0-alpha-mac-arm64-adhoc-test.dmg`
- 大小：406,008,897 字节（约 387.2 MiB）。
- SHA-256：`4f503f3c46f5ed0e5b38815aa6f5a29ee2e0e43841658a902554f74e51839d68`。
- 应用及内层代码 Ad-hoc 签名；DMG 容器实际未签名；未公证、无票据、无 Apple 验证的个人/开发者身份。
- 实测本机：macOS 27.0.1（26A434）、arm64；Electron 44.6.0。没有把本机结果当作收件人的 macOS 15.7.5 / M4 结果。

## 实际执行

| 项目 | 结果与范围 | 证据 |
| --- | --- | --- |
| 本机构建 | `npm run package:adhoc:mac` exit 0；本地 dir 构建后逐项重签，自有 staging，不发布 | `evidence/build.log` |
| DMG 完整性 | `hdiutil verify`、只读挂载及最终字节 SHA-256 通过 | 产物目录 `adhoc-test.json`、`SHA256SUMS.txt` |
| 原生签名 | 26 个代码对象、17 个 Mach-O 全部 arm64；逐项 strict 与顶层 deep strict 通过；实际 `Signature=adhoc`、flags=0x2、无 Authority/Team、无 runtime | `adhoc-test.json`、`evidence/native-policy.json` |
| 资源及依赖 | 27,047 个包内文件检查、340 个项目资源与输入一致；Sharp 实际转码、PGlite 内存查询 42 且正常关闭、WASM 与包内解析检查通过 | `adhoc-test.json` |
| 正常启动及重开 | **通过**。从实际 DMG 复制的安装副本，隔离数据；两次真实工作台、packaged/arm64、sandbox=true、Node Server listeners=0、无模型、主题持久化、本地数据库/IPC、零 renderer pageerror；均正常退出 code 0/signal null，启动前后严格验签 | `startup-5a328271-b9f9-41e2-8306-c4d731bd6029.json` 及首启/重开截图 |
| 篡改负例 | **通过**。只改自有克隆的封印 LICENSE 资源，原生 deep strict 以 sealed-resource-invalid 拒绝；原安装副本重验仍通过，最终 DMG SHA-256 不变 | 同一成功启动报告 `tamperNegative`、`installedCopySignatureAfterNegative`、`dmgUnchanged` |
| 整进程网络隔离尝试 | 两次失败，不计离线通过。外层 SBPL 与 Chromium 自身沙盒不兼容，日志出现 `sandbox initialization failed: Operation not permitted`、GPU exit 6 及 FATAL；应用工作台未出现 | `startup-cb55723e-51e2-49ac-9b01-82b74a12f1e9.json`、`startup-33cd7ee1-7757-4337-9438-51a66a370ef8.json` |
| 网络测试回退 | **现有会话过滤观察通过**。正常原生启动，未安装测试 route；自有隐藏 blank 窗发固定 HTTP(S) 请求，必须得到该 URL 的 `requestfailed` 且精确 `net::ERR_BLOCKED_BY_CLIENT`。不把一般 DNS/超时计通过；保留产品 CSP、transport 与 defaultSession 协议过滤器。此范围不覆盖 main、utility、Chromium 网络服务进程的全部网络 | 成功启动报告两轮 `rendererNetworkGuard`；源证据 `desktop/main/index.ts:282`、`desktop/main/static-ui.ts`、`src/lib/desktop/transport.ts` |
| 发布策略相关单元 | 35/35 通过，含 Ad-hoc 14 项、正式发布门及配置检查 | `evidence/release-unit.tap` |
| 类型检查 | `npx tsc --noEmit` 初次与最终均 exit 0；最新 harness 语法检查 exit 0 | `evidence/typescript.log`、`typescript-final.log` |
| 原打包回归命令 | 47 项，45 通过、2 失败。两项硬编码旧 `release/mac-arm64`，本轮重建 `out/index.html` 后旧包与新输入不一致；没有覆盖/更新旧缺陷样本来消除该失败。新 DMG 的资源比对已另行真实通过 | `evidence/package-tests.tap` |
| 全量 core | 285 文件、2,179 项，2,162 通过、17 失败、0 取消；exit 1。测试运行期间输入文件散列无变化；与前次失败标题比对没有新增，前次一个取消项本次通过。没有修改业务或放宽测试 | `evidence/core-final.json`、`core-final.tap`、`core-failure-comparison.json` |
| 保留约束 | 正式发布 5 文件、原用户未提交 generated 文件及旧坏 DMG 共 7 项散列与本轮开始前相同；其他 tracked `src`/`desktop`/`prisma` 无修改 | `evidence/preservation-before.json`、`preservation-after.json` |

原生信任检查明确未通过：Gatekeeper 仍 enabled；`spctl --assess` exit 3、`rejected`；`syspolicy_check distribution` exit 70，实际说明 Adhoc Signed App 与 Notary Ticket Missing；App/DMG `stapler validate` 均 exit 65，明确未附票据。以上是本临时包的信任限制，不能当作正式校验通过。工具异常也不当作预期拒绝。本轮原生结果没有超时或 ENOENT。

模块阶段的小型 DMG 探针曾因 `hdiutil create`“设备未配置”失败，原记录保留在 `evidence/module-container-probe.json`，未计正例；后续本轮实际原生构建、镜像校验及只读挂载已成功，见独立产物证据。

启动尝试全部保留，没有覆盖失败来生成成功记录：前两轮外层 SBPL 导致 GPU/网络子进程沙盒初始化失败，随后同包无外层策略能进入工作台，构成受测条件的对照；第三/四轮在测试路由断言失败，应用已有 transport/CSP/session 过滤先行拒绝请求，不能声称 route 生效；第五轮已观察具体原生拒绝，停在 `.check()` 对异步受控 radio 的即时状态断言；最终改为真实点击后同时等待持久化状态与已选中状态，第六轮完整通过。所有调整都在测试 harness，没有更改产品策略、正常业务或 DMG 字节。失败报告均保持 `passed:false`，详情见产物目录对应 `startup-*.json`。

## 安装及“仍要打开”

1. 校对包外 `SHA256SUMS.txt`。可在终端输入 `shasum -a 256 ` 后，把 DMG 拖入终端补齐路径并回车；结果应与上方 SHA-256 一致。
2. 打开 DMG，将“玄印写作.app”拖到“Applications / 应用程序”。从“应用程序”首次打开它。
3. 如果提示开发者无法验证或 Apple 无法检查恶意软件，关闭提示，打开“系统设置 → 隐私与安全性”，下滚到“安全性”。
4. **如果出现此应用的“仍要打开”**，点击并按系统提示认证，再确认“打开”。Apple 说明该入口通常在尝试打开后约一小时内提供；它为这个应用保存用户例外。
5. 如果仍提示“已损坏”、没有该按钮或仍无法打开，记录系统版本、完整提示和 DMG 散列，按该设备未通过处理。该说明不保证每台设备都有此按钮。

依据：[Apple 官方打开说明](https://support.apple.com/zh-cn/102445)、[Apple 关于安全设置例外的说明](https://support.apple.com/en-gb/guide/mac-help/mh40617/27/mac/27)。本轮没有关闭 Gatekeeper、清除下载隔离或要求用户执行相关命令。

## 未验证及审核范围

- 干净 macOS 15.7.5 / M4，微信真实传输后的隔离、Finder 首次打开和实际“仍要打开”按钮操作：未执行。
- 真实目标机整进程断网首启：未执行；本机 SBPL 方式失败不能计为产品离线能力通过。
- 全部正常业务验收：未通过全量 core，既有 17 项失败单独保留。
- Developer ID、正式公证/票据、正式 release 信任正例：本临时包未执行，正式发布门保留。

顺序产物为 `01-plan.md` → `02-plan-review.md` → `03-test-cases.md` → `04-test-review.md` → `05-code-review.md` → 本记录 → `07-evidence-review.md`。方案、用例、最新代码及最终证据均经独立审核通过，无本临时交付范围的未关闭阻断意见。最终独立复核重新计算了镜像及 7 项保留散列，核对全部失败/成功启动记录、两张成功截图、原生信任拒绝和回归原始结果。本轮交付结论仅为临时 DMG 的完整性及本机正常启动/重开通过，其他上述范围继续保留未通过或待验证状态。
