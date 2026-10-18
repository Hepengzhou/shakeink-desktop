# macOS 发布证书和公证配置

## 2026-10-18 本轮签名与公证结果（覆盖下方历史账户状态）

已通过本机 Developer 和已登录的 Apple Developer 官方账户页确认会员资格有效，团队 ID 为 `738DY63GV2`。本机旧版 Xcode 15 的图形界面无法在当前 macOS 启动，因此使用钥匙串访问的证书助理生成 RSA 2048 CSR，私钥保留在本机钥匙串。用户在本轮明确确认申请与安装后，通过 Apple 官网的 G2 Sub-CA 签发 Developer ID Application 证书并导入登录钥匙串。

实际 `security find-identity -v -p codesigning` 返回 1 个有效 Developer ID Application 身份，证书 SHA-1 为 `369509723F1E02E6B50E2401B35800C234BBB583`，有效期为 2026-10-18 至 2027-11-17（UTC）。没有导出私钥，也没有将 CSR、证书文件或认证秘密写入仓库。最终 DMG 及盘内 App 已独立核对实际叶证书，均与本轮证书指纹一致；叶证书在检查时有效。实际公钥链签名、Apple 系统信任、票据及 Gatekeeper 检查均通过，详见 `release/evidence-20261018/certificate-audit.json`。

首次检查时 `shakeink-notary` 公证 profile 不存在。用户随后在本机完成应用专用密码配置，并明确回复“已配置完成”；实际 `notarytool history` 认证成功，修复工具探测参数后，正式预检返回 `ready: true`。应用专用密码未经过聊天或项目文件。

App 公证请求 `d821126e-01f1-441f-bf9d-97bf6ea0de96` 与 DMG 公证请求 `6db0a031-5dc5-499a-a336-32d96b1117e5` 均已返回 `Accepted`，两者均已附票据并通过实际验证。最终目录为 `release/verified-macos-arm64-7b92b578-1156-4036-bafc-cd90e2ceb04b`，交付版本 `0.1.0-alpha`、架构 `arm64`，DMG 大小 346533718 字节，SHA-256 为 `7445ea7df5f71c01e5dc676668d9d83a306d85f0e657847e712cbff7166f989d`。原旧坏包保持原值。

独立新进程命令 `npm run package:verify:mac -- 'release/verified-macos-arm64-7b92b578-1156-4036-bafc-cd90e2ceb04b' --team-id 738DY63GV2` 实际退出码 0，`passed: true`。最终结果及完整限制见 [本轮验证记录](11-verification.md) 与 `release/evidence-20261018/verification-report.json`。本轮完成 DMG 签名、公证和验包；完整业务回归仍有 17 项失败，干净目标机器及离线首启验收尚未执行。

下方 2026-10-16 的注册故障与待激活状态为历史记录，不代表本轮会员状态。

2026-10-16。用户授权协助安装签名证书。当前本机没有有效 Developer ID Application 身份，也未找到可直接安装的证书导出文件。用户登录并自行确认 Apple Developer Agreement 后，最初账户页面显示“加入 Apple Developer Program／立即注册”。后续本轮身份提交已成功，Developer 显示等待相关邮件、网页账户标记“待处理”；会员资格激活及签发证书尚未确认完成。

## 2026-10-16 历史账户步骤（现已完成）

先由账户本人完成 [Apple Developer Program 注册](https://developer.apple.com/enroll/) 和激活，包括要求的身份核验、协议及付款。基础开发者账号与付费计划是不同资格；用户已完成的基础协议不等于 Developer ID 证书已可申请。

激活后，使用符合权限要求的开发者团队申请 Developer ID Application；不需要为当前 DMG/ZIP 另申请 Developer ID Installer。申请依据为 [Apple 的 Developer ID 证书说明](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/)。用户账号和证书材料不写入项目。

### 2026-10-16 补充：App 注册提交失败

用户提供的 Developer 截图为“正在提交”期间弹出“发生错误／无法处理请求”。用户确认发生在提交姓名、身份证或人脸验证之后、付款之前。它能确定失败阶段，不能单凭该文案确定身份核验未通过、账户受限或服务端故障。

本机只读检查：macOS 27.0.1、arm64；`Developer.app` 11.1（1110.5.3），应用声明最低 macOS 26.0。核对 [App Store 官方页面](https://apps.apple.com/cn/app/apple-developer/id640199958) 当前列出的版本同为 11.1。仅提取该进程近 30 分钟日志中的错误域/数字错误码和 HTTP 状态码汇总，未得到可解释此次失败的明确码；没有把原始日志、身份信息或图片保存到项目。开发者系统状态页未能通过当前读取方式取得服务项实时状态，不记录为“服务正常”。

随后依用户请求用 Computer Use 逐步复现：从“立即注册”进入，用户亲自填写证件资料、拍摄并确认自拍后，App 出现同一“发生错误／无法处理请求”，关闭后返回“立即注册”。未进入订阅/付款。系统设置的“Apple 账户建议”同时明确显示“若要在此 Mac 上使用 iCloud，你必须接受新条款与条件”及“部分账户服务要求你重新登录”；账户详情中的个人信息、登录与安全及 iCloud 按钮呈禁用状态。已打开“iCloud（中国大陆，由云上贵州运营）”条款入口交用户本人审阅决定。这是明确待处理的设备账户状态，不是已证明的后台失败唯一根因。

用户随后确认已完成条款并重新登录。Computer Use 观察到本人完成重新登录的双重认证，账户详情按钮恢复可用；剩余提示为端对端加密数据未同步。只读核对：自动日期时间启用并使用 Apple 时间源，中国标准时间；VPN 断开，自动发现/自动配置代理、HTTP/HTTPS/SOCKS 代理均关闭。没有修改这些网络开关。

重启 Developer 后，由本人重新提交证件及自拍验证。用户报告成功，主代理又用 Computer Use 核实页面显示“信息已提交／现在你可以使用这个 iCloud 账户来注册 Apple Developer Program”，并进入英文姓名、地址、电话的注册资料页。本轮相同步骤重试已通过；前后对照提示 iCloud 账户状态与故障有关，组合处理后恢复。处理组合包括条款确认、重新登录和重启 App，未单独隔离每一项，也未取得 Apple 后台日志，不宣称其中任一单项是唯一充分根因。身份提交成功仍不等于付费会员资格已经激活。

随后观察到 Developer 返回账户页，注册按钮停用并显示“你将很快收到相关邮件”。又通过 Computer Use 只读核对已登录的 [Apple 官方账户页](https://developer.apple.com/account/)，账户标记为“待处理”。当时尚不能据此确定付款是否完成、会员何时激活或所选实体类型。

用户之后明确回复以个人身份注册，并确认已付款；这两项按本人报告记录，未读取订单、卡片或付款凭据。用户提供的邮件截图主题为“Agreement signed: Apple Developer Agreement”，正文仅确认签署该协议，不能作为付费会员资格已激活的证据。再次用 Computer Use 检查本地 Developer，仍显示“你将很快收到相关邮件”。此前证书管理入口曾返回找不到属于当前账户的团队，尚未证明可申请证书。网页注册协议页面本轮读取不稳定，没有代为再次接受协议或重新购买。

[Apple 官方注册帮助](https://developer.apple.com/cn/help/account/membership/program-enrollment/)说明，购买交易处理完成后会收到确认邮件；若购买后 24 小时仍未收到会员资格确认，应联系 Apple Developer Support，并在其官方支持渠道提供注册 ID。当前应等待并核实本次已付款注册的激活结果，再继续申请证书。

本次核查依据：设备须登录 iCloud、注册账号须开启双重认证、本人法定姓名及证件资料须准确；官方允许注册账号与设备 iCloud 账号不同，无需为了排查而退出系统 iCloud。Apple 支持在符合要求的 Mac 上注册，且要求整个注册流程使用同一设备。依据：[中国大陆 App 注册说明](https://developer.apple.com/cn/help/account/membership/enrolling-in-the-app/)。当前下一步是等待本次注册的 Apple 邮件，并在同一设备按其指引继续，由本人处理后续协议及订阅付款（如仍未完成），再核实资格激活。

若后续再次出现同类错误，可退出并重新打开 Developer，在可直连 Apple 服务的另一网络上重试，检查是否有 VPN/代理干扰和日期时间错误。这是隔离网络因素的排查步骤，不是已确定的根因。依据：[Apple 服务连接排查](https://support.apple.com/zh-cn/108093)。

若后续再次失败且上述排查无效，通过 [Apple Developer Support](https://developer.apple.com/cn/contact/) 请求查询注册记录和身份验证状态；官方 [身份验证说明](https://developer.apple.com/cn/help/account/membership/identity-verification/)明确指出，需要使用 App 以外的方式验证身份时应联系支持团队。不要自行把更换账号或设备当作已验证的修复方案。可由用户提交以下说明，并仅在 Apple 官方安全渠道提供所需身份资料：

> 我通过 Mac 上的 Apple Developer 11.1 注册 Apple Developer Program，提交身份信息后、进入付款前，页面停在“正在提交”，随后提示“发生错误／无法处理请求”。请协助查询本账号的注册记录和身份验证状态，确认是否需要补充资料或修复未完成的注册记录；如 App 无法继续，请提供适用的其他身份验证流程。可按要求补充错误发生时间、截图及注册 ID（如有）。

目前本轮身份提交已通过、账户待处理；签发证书仍依赖有效会员资格。已取得本机处理前后的实际界面对照结果，尚未获得 Apple 后台的具体错误码或单项因果解释。注册故障文档已通过 [独立复审](12-enrollment-review.md)；该审核不能替代会员激活或真实签名公证验收。

## 证书安装流程

1. 在 macOS 钥匙串访问中创建 CSR，将私钥留在本机钥匙串。Apple 的 [CSR 创建流程](https://developer.apple.com/help/account/certificates/create-a-certificate-signing-request/)说明了对应操作。
2. 在官方 Certificates, Identifiers & Profiles 中选 Developer ID Application，上传 CSR，下载 Apple 签发的 `.cer` 并安装到生成 CSR 所用的钥匙串。
3. 若使用另一台 Mac 已有的身份，需导入包含匹配私钥的 `.p12`，仅导入公钥证书不足以签名。导入密码在用户本机处理。
4. 用 `security find-identity -v -p codesigning` 确认存在有效 Developer ID Application。正式流程只有一个身份时自动选择，多个时以 `CSC_NAME` 设置预期身份指纹或唯一名称。

2026-10-16 尚未生成私钥、提交 CSR、申请或安装证书；2026-10-18 已完成，见本文顶部本轮实测记录。

## 公证授权

建议由用户在本机终端交互式配置钥匙串 profile，账号/密码不经聊天或源码传递：

```sh
xcrun notarytool store-credentials shakeink-notary
```

按 Apple 的交互提示完成账号、团队及应用专用密码或相应授权。然后在构建终端设置：

```sh
export APPLE_KEYCHAIN_PROFILE=shakeink-notary
```

可选 `APPLE_KEYCHAIN` 指定已配置的钥匙串路径。发布流程拒绝同时设置优先级更高的 Apple ID/API key 环境认证，以确保实际使用该 profile。不要启用可能输出认证内容的调试日志。可参考官方 [Electron notarize 的钥匙串认证说明](https://packages.electronjs.org/notarize/main/index.html)。

## 构建和独立验包

使用项目要求的 Node 24：

```sh
npm run package:preflight
npm run package
```

正式构建先预检，再编译、签名、公证、归档、DMG 最终化并重算元数据。只有全部检查通过才输出唯一的 `release/verified-macos-<架构>-<ID>` 目录，清单为 `release.json`。保留 `publish: never`，不会自动发布到远端。

用真实身份对应的十位 Team ID 独立重新核验该目录：

```sh
npm run package:verify:mac -- '<实际 verified 目录>' --team-id '<实际 Team ID>'
```

`npm run package:dir` 仅用于本地资源与功能测试，不产生对外安装归档。旧的 `release/ShakeInk-0.1.0-alpha-mac-arm64.dmg` 仍是调查中的未签名旧样本，保留用于负例；不能当作本次修复后的安装包分发。

最终还需在干净的 macOS 15.7.5 Apple Silicon 环境完成保留下载隔离的安装、断网首启及签名影响到的业务验证，详见 `06-test-cases.md` 的 MACREL-14/15。
