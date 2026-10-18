# Ad-hoc 临时 DMG 独立 Code Review

日期：2026-10-16。依据本目录已通过的方案和用例，审阅 `scripts/macos-adhoc.mjs`、`scripts/package-adhoc-macos.mjs`、`scripts/test-adhoc-startup.mjs`、`tests/unit/macos-adhoc.test.ts` 及 package.json 中临时命令/注册。唯一写入文件为本审核记录，未改实现、操作账户/钥匙串或访问用户数据；仅独立运行隔离单元及语法检查，没有运行应用或签名原包。

## 最终代码审核结论

**复审通过，无未关闭的代码审核阻断意见，可以继续实际构建及验收。** 首轮两项 P2 已修正并复核，启动 harness 冻结后已审阅。当前没有据本审核取得真实最终 DMG 或实际启动正例；受控单元 GREEN 不等于这些验收已经通过。首轮问题保留如下。

### P2-ADH-CR1（已关闭）：所有 Helper app 强制非零资源数会拒绝合法零资源 bundle

首轮 `checkAdhocDisplay()` 对 seal=true 要求 `Sealed Resources version=2 ... files=[1-9]...`，`verifyAdhocApp()` 对顶层及所有 `.app` 都启用该规则。Info.plist 和主可执行文件由代码签名专用槽绑定；只有这些内容的合法 Helper 可以没有普通封印资源条目，不能用资源数大于零代替严格完整性校验。首轮单元的 display 对所有对象统一给 files=4，未覆盖此差异。

修正应区分资源完整的主应用和小 Helper：顶层继续要求有效非空资源封印；Helper 仍需有效 v2 封印和逐项 strict 验证，但允许合法的零资源数。主代理已安排作者将 vendor Helper 复制到自有临时 stage 原生重签确认，禁止改动原包或仅为了通过测试减弱顶层资源校验。待新 freeze 后核对真实命令结果和对应测试。

### P2-ADH-CR2（已关闭）：DMG “unsigned”字段尚未由实际容器状态验证

首轮 `createAdhocDmg()` 和 `verifyAdhocDmg()` 在 hdiutil 检查及内层应用校验后直接返回 `containerSignature:'unsigned'`，没有检查容器实际签名状态；CLI 把该字段写入清单。当前创建命令没有执行签名，但重验函数仍可能接受已签容器并报告 unsigned。首轮单元“没有调用 codesign 签容器”只证明命令顺序，不能证明实际容器状态。

应读取最终 DMG 的原生签名状态，明确区分实际未签名、存在签名和工具异常。未签名是本临时路径的受验事实，不是把任意 codesign 失败都当成预期；已签容器或未能确定状态时，不得输出 unsigned 成功结论。需要相应状态分类的正负例及真实最终容器证据。

## 已核查的边界

- 临时入口使用独立派生配置和唯一 staging，仅生成目录后单独 Ad-hoc 签名；正式发布脚本和配置未被加入绕过分支。临时进程移除签名/Apple 认证环境项，避免 builder 发现或导入身份。
- 原生扫描按实际 Mach-O 魔数发现 Resources 中模块、动态库和独立二进制；根/内部链接和特殊文件有拒绝分支，架构在签名前先检查，逐个子项先于所属 bundle，顶层最后，签名显式 options=0。
- 验证器检查真实 adhoc 标记、无 Authority/Team、flags 无 runtime 和最小 JIT；命令端口测试只代表这些判断的控制流，实际产物仍需原生证据。
- 签名目标和 DMG 创建路径限制于 adhoc stage，不覆盖已有 DMG；挂载使用 readonly/nobrowse，自有临时目录在 detach 成功后才清理，detach 失败保留。
- 临时文件名、清单格式及目录与正式 verified 分开，清单明确正式验收未通过；目前 startup 明确标为 not-run，没有冒充已启动。
- 安装说明放在 app 外，手动例外使用条件语气，没有清除隔离或全局关闭 Gatekeeper 的指令；目标系统、微信隔离及目标机首启仍待验证。

## 修正复审与独立检查

| 项目 | 复核及关闭依据 |
| --- | --- |
| CR1：合法 Helper | `module-helper-probe.json` 记录对 vendor Helper 的自有临时副本原生重签：strict/deep exit 0、Signature=adhoc、flags=0x2、Team 未设置、有效 v2 封印 files=0；源 Helper 文件散列前后相同。修正仅允许嵌套 app 的有效零资源封印，主 app 仍需非空 v2 封印，各对象 strict 与顶层 deep 保留。新增 nested 正例与顶层零资源拒绝先 RED 后 GREEN，问题关闭。 |
| CR2：实际 unsigned | create/verify 两条路径在最终 DMG 上读取 codesign display。仅原生 exit 1、无 signal/killed、且 stderr 精确等于该文件未签名诊断时返回 unsigned；display 成功表示存在签名并拒绝，其它 exit 1、不可用、权限或超时均失败。原始诊断只在模块内部判断，公开错误仍脱敏，正式模块未修改。相应回归先 RED 后 GREEN，问题关闭。 |
| 容器测试范围 | 新单元覆盖 signed、确切 unsigned 及多类工具异常；作者辅助真实小 DMG 探针因 hdiutil“设备未配置”失败，未算作容器正例。后续最终包仍需实际创建、unsigned 和挂载证据。 |
| 独立单元执行 | `node --import tsx --test tests/unit/macos-adhoc.test.ts`：14/14 通过，0 fail/cancel/skip。已读实际断言，不仅检查测试名称。 |
| 语法 | 对临时模块、构建 CLI 和启动 harness 的 `node --check` 均退出 0。未执行 harness 或启动真实 app。 |
| 正式边界保留 | 当前正式 builder 配置、打包入口、macos-release、独立重验 CLI、最小 entitlement 五文件，及预存 generated 文件 SHA-256 均与本轮 preservation-before 对应值相同。package.json 新增临时入口/测试注册，未删除正式门。 |

## 启动 harness 审核

已审阅冻结后的 `scripts/test-adhoc-startup.mjs`：

- 只从调用方指定的临时 DMG 读取并比对清单散列，实际只读挂载后复制 app 到新建临时目录；启动数据根独立，校验 appPath、userData、isPackaged、arm64 和 renderer sandbox，没有启动正常安装目录的应用。
- 每次启动前后执行真实 Ad-hoc 完整性校验。启动检查真实自定义协议、原组件、菜单、bootstrap/local IPC、空模型、主题持久化及本地数据库 API，不用模拟 API 替代；全业务 UI 覆盖仍明确未验证。
- 正常退出由 app.quit 触发并断言 exit=0、signal=null，同隔离目录重开。失败清理对 app.close 设上限，仅针对该 harness 的 ChildProcess TERM/KILL；强杀不计正常通过，进程仍存活则保留目录并记失败。
- 网络先对同一外部端点和 loopback 做无策略/有策略对照，要求外部 connected → EPERM 且 loopback 保留；真实主进程和继承子进程再次探测。策略在 exec 前施加，报告准确保留 loopback/Unix socket，未将其称为整机完全断网。
- 篡改负例只修改另一个自有副本的封印资源，要求真实 codesign exit 1 且命中特定封印错误；原安装副本再次校验，原 DMG 散列再比对，不能用任意其它错误代替负例。
- 报告以 passed=false 初始化，仅在所有断言完成后置 true，异常保留阶段结果。构建清单的 startup=not-run 与独立实际启动报告分开，不提前生成启动成功声明。

harness 本身未把 spctl/syspolicy 错误归类为预期拒绝；这些系统策略命令若在后续验收中单独执行，仍需保留实际结果，工具内部错误/超时不能作缺公证拒绝的证据。本代码审核没有取得或认证任何 Gatekeeper 接受结果。

## 实际验收限定

完整性、启动和回归分别报告。最终 DMG 的容器状态、内层签名/资源、复制 app 的真实启动和重开、网络对照及篡改负例仍以实际命令和界面证据为准；本审核未提前宣称这些执行成功。

正式 Developer ID、公证、干净 15.7.5/M4、真实微信下载隔离/手动例外、目标机断网首启及全量业务回归的限制保持。代码复审通过不等于临时产物已交付，也不能降低此前正式发布验收门槛。

## 实际首启失败后的诊断窄补充审核

已阅读首轮 [startup 失败记录](../../release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0/startup-cb55723e-51e2-49ac-9b01-82b74a12f1e9.json)、新增 harness 诊断代码及 `evidence/check-native-policy.mjs`；没有启动产品或重跑完整用例。**本次诊断代码复审通过，不改变上述代码结论，也不把失败的首启改判为成功。**

首轮记录对应实际 DMG SHA-256 `4f503f3c46f5ed0e5b38815aa6f5a29ee2e0e43841658a902554f74e51839d68`。复制 app 的 26 个原生对象/17 个 Mach-O 完整性检查已记录成功，但首次启动在等待账号菜单 90 秒后超时，passed=false。它未达到后续实际主进程/子进程网络探测、功能检查、正常退出及重开，不得计作完整启动通过；前置独立网络对照成功也不能替代这些步骤。

### P2-ADH-CR3（已关闭）：可选窗口诊断不能阻止失败落盘及进程清理

新增 catch 原来先读取各窗口 title/body/screenshot，再保存原失败；其中 title 无独立时间上限，窗口无响应时可能让可选诊断阻止 finally 执行。已通知主代理修正并重读确认：catch 首先设 passed=false，将原错误、受限自有进程日志和初始窗口诊断状态保存；每个窗口的整段可选诊断均有 20 秒 deadline，失败/超时记 unavailable，随后继续有上限的自有进程清理。最新 harness 的 `node --check` 退出 0。

诊断只读取此 ElectronApplication 的窗口、自己的 ChildProcess stdout/stderr，并截断文本/日志，未转为扫描用户其它应用或正常实例。截图及文本为隔离测试窗口的失败证据，不能作为实际业务启动通过的证据。第二次运行若载入旧诊断版本，仍按该次真实结果记录；新的源码修复不能追溯改变已启动进程的行为。

### 原生策略观察脚本

`check-native-policy.mjs` 先核对临时格式和实际 DMG 散列，确认 Gatekeeper 状态，在只读挂载应用上记录 codesign、spctl、syspolicy_check、stapler 的真实退出码、stdout/stderr、signal/killed/toolError，前后独立重验 app 完整性并核对 DMG 不变。公开字段是 recorded:true 及明确的只读观察 scope，没有把任意命令拒绝、工具内部错误、不可用或超时转成 passed。该脚本源码审核通过；具体工具结果仍应从实际输出逐项解释。

本次没有重跑 core。主代理报告本轮全量 285 文件、2,179 测试为 2,162 pass、17 fail，输入保持不变；它仍不是全量通过。正式信任、目标机和当前尚未成功的启动步骤继续按未通过/待验证报告，不能由诊断代码通过抵消。

## 进程网络策略不兼容后的 renderer 回退复核

已审阅最新冻结的启动 harness，及第二轮 [startup 失败报告](../../release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0/startup-33cd7ee1-7757-4337-9438-51a66a370ef8.json)。**回退代码审核通过，符合 ADH-10 预先批准的分层记录方案；未取得默认回退路径的实际启动通过结果。** 没有启动产品或改实现；最新 harness 的 `node --check` 退出 0。

第二轮原始记录仍为 passed=false，未取得窗口诊断；自有进程日志反复出现 sandbox initialization failed/Operation not permitted、GPU exit code 6，最后为 GPU 不可用的 FATAL。这定位了施加该测试策略时的 GPU sandbox 初始化失败，与外层 SBPL 和 Electron 子进程 sandbox 不兼容一致。单靠这些日志不证明同一包在无外层策略时必然正常；应保留同包直接原生启动的实际对照结果，再限定归因。该失败没有被删去或重新标为通过。

本次代码变化的范围与断言为：

- 默认直接启动从同一 DMG 复制的原生 exe，不施加外层 sandbox-exec；产品 renderer sandbox=true 断言仍保留，未通过 `--no-sandbox` 等参数改变产品行为。
- 自动化附着 context 后才注册 HTTP(S) route。控制请求使用固定 `.invalid` 地址，必须既被 route 记录，又得到拒绝结果，不能只凭 DNS/联网失败声称拦截生效。
- 默认路径不执行、也不记录主进程/继承子进程 EPERM 成功；报告明确主进程、utility 和 Chromium 服务进程没有进程级网络隔离，并将 whole-application offline first launch 列入未验证。
- `--process-network-policy` 仍可显式运行原策略及前后对照，保留该试验的复现能力；其存在不表示已经在真实应用中成功完成隔离运行。
- 两次启动、正常退出和重开、隔离数据根、本地 IPC/数据库、签名前后完整性、封印篡改负例及失败清理的其它断言未放宽。

当前可认可的默认网络范围仅是“自动化 context 附着后的 renderer HTTP(S) 请求拦截”，不覆盖附着前的启动流量、主/utility/Chromium 服务进程、其它网络类型或整机断网。即使后续默认路径启动全部通过，也不得将其写成整应用离线首启通过。

该变更属于测试 harness；此前 core 结果不能代替对最新 harness 的实际执行。产品/正式发布边界及所有尚未完成的目标系统、真实下载隔离与完整业务验收限制继续保持。

## 保留产品 CSP 的网络控制 fixture 窄复核

已审阅第三轮 [startup 记录](../../release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0/startup-cc9df7cf-36d7-418e-a5dd-b47c9f92c22c.json) 和最新控制 fixture。**本次测试代码修正审核通过；第四轮的实际结果尚未据此记为通过。** 最新 harness 的 `node --check` 退出 0，没有启动产品或修改实现。

第三轮无外层 SBPL 时已到达真实工作台：记录有 packaged/arm64、隔离 userData、安装副本路径、renderer sandbox、中文原生菜单及 Node Server 监听数为 0 的实际断言。失败位置是控制请求没有被 route 记录，整体 passed=false。现有 route 断言实际阻止了将该 fetch 失败记为拦截成功；本轮未完成的数据库、正常退出及重开继续保持未通过。

核对产品既有 `static-ui.ts` 的 connect-src self，以及 `transport.ts` 对 window.fetch 的自有处理后，测试不应为了制造外部请求而放宽产品 CSP 或替换 transport。最新修正采用：

- 在同一自有 ElectronApplication 内创建 hidden about:blank 控制窗，show=false、sandbox=true、contextIsolation=true、nodeIntegration=false，没有修改磁盘上的产品文件或原业务窗口安全配置。
- window 事件等待与创建/evaluate 放在同一 Promise.all，外层 15 秒 deadline，两个异步分支的拒绝均被处理。
- 控制窗用原生 fetch 发送固定 `.invalid` 请求，仍同时断言实际 route 记录和 fetch 拒绝，完成后关闭该控制窗。报告明确说明控制窗用途，不将它写成原业务页面已发出外部网络请求的证明。
- 原业务窗口、隔离数据、本地 IPC/数据库、两次正常退出/重开、封印验证及失败清理要求保留。

该 fixture 只能验证自动化附着后 BrowserContext 的 renderer HTTP(S) 拦截路径，不能证明附着前网络、主/utility/Chromium 服务进程、其它网络类型或整应用离线。whole-application offline 仍列未验证；先前三轮失败记录均保留。实际第四轮结果需另行读取，代码修正通过不追溯改变旧记录。

## 现有 session 协议过滤观察的最终窄复核

**本轮代码复审通过，无新增阻断意见。** 已重读当前 `scripts/test-adhoc-startup.mjs`、产品既有 `desktop/main/index.ts` 的 defaultSession 过滤器及本轮失败记录；只执行 `node --check`（退出 0），没有启动产品、修改实现或重跑测试。此节更新当前网络验证范围，取代前两节中描述旧 route fixture 的当前适用性；旧记录仍保留为对应版本的审核过程。

产品现有 `session.defaultSession.webRequest.onBeforeRequest` 仅放行 `shakeink:`、`devtools:`、`blob:`、`data:`，其余协议返回 cancel=true。第四轮 [startup-3bfd5b80 记录](../../release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0/startup-3bfd5b80-d48c-450b-8dd7-e56a0151bbd8.json) 保留实际工作台及 about:blank 两窗截图，整体 passed=false，失败仍是 route 未收到控制请求。源码支持请求已被更早的原生 session guard 取消这一解释，不能把该轮 route 断言改判为成功。

最新 harness 删除测试 route，保留自有 hidden about:blank 控制窗的 sandbox=true、contextIsolation=true、nodeIntegration=false，未改业务页面 CSP、transport 或 session guard。控制请求的 `requestfailed` 等待先于 fetch 注册，并在同一 Promise.all 中处理；匹配固定完整 `.invalid` URL，内层等待 10 秒、外层 deadline 15 秒。必须同时满足 fetch 拒绝和该请求的原生 errorText 精确为 `net::ERR_BLOCKED_BY_CLIENT`，成功后关闭控制窗。普通 DNS 失败、超时、其它网络错误或仅有 fetch 拒绝均不能通过；失败仍进入原有落盘和自有进程清理。

报告中的 `rendererNetworkGuard.scope`、顶层 scope 和控制台 network 字段现只陈述观察到现有 default-session 协议过滤，不再宣称 CDP route 生效。主进程、utility 与 Chromium 服务进程未做进程级网络隔离，whole-application offline first launch 仍显式未验证。即使该控制请求通过，也只证明这个自有同 session 控制窗的具体 HTTP(S) 请求被取消，不能扩展成整应用、其它 session、其它协议或真实断网首启通过。

只读复核时已见 [startup-74b9c017 记录](../../release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0/startup-74b9c017-eb2c-48b5-a382-2c23bc634d29.json)：该固定 URL 已得到精确 `ERR_BLOCKED_BY_CLIENT`，随后旧版本在主题 radio.check 的即时状态检查失败，整体 passed=false。当前源码使用真实 click 后轮询实际持久化主题与可见 checked 状态，仍保留两种断言，没有把旧失败改写为通过。另一个新运行报告在本次读取时尚无完成结果，本审核不认定其已成功。

两次真实启动、正常退出/重开、数据库/IPC、前后封印及篡改负例仍须依最终实际报告逐项验收；本次网络控制代码复审不替代这些结果。正式签名公证、目标 15.7.5/M4、真实微信隔离/手动例外、整应用离线及全量 core 未全绿的限制保持。
