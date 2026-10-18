# Ad-hoc 临时 DMG 测试用例

2026-10-16。依据已通过独立审核的 `01-plan.md`、`02-plan-review.md`。本文件是测试设计，以下未提前记为执行通过。

| ID | 范围与触发 | 必须满足的断言 |
| --- | --- | --- |
| ADH-01 | 平台与入口保护 | darwin/arm64 以外及未知参数在构建/写 output 前拒绝；临时入口不请求 Developer ID 或公证认证。 |
| ADH-02 | 配置与正式边界 | 派生临时配置仅 dir、无身份/公证、non-hardened；输入 base 深度快照不变。原正式 `releaseMode` 不接受临时绕过参数；无认证的原 `preflightMacRelease` 仍拒绝，正式配置及入口关键散列前后相同。 |
| ADH-03 | 原生对象与路径 | 真实小型临时树中识别 Mach-O、无扩展文件和嵌套 bundle；Framework 内部链接可接受，外部/悬空/循环链接及根符号链接拒绝；签名函数必须限定自有 stage，不能写出 stage。 |
| ADH-04 | 签名顺序/失败 | 命令端口记录显示子代码先、所属 bundle 后、顶层最后；使用 `-`、无时间戳和显式非 runtime，最小权限；中途命令失败不运行后续最终化，不写成功结果。 |
| ADH-05 | 独立签名验证 | 逐项严格验签和顶层 deep strict 均执行；实际显示须 adhoc、无 Developer ID Authority/Team、无 runtime，主程序仅 allow-jit；缺签、错架构、混入真实身份、错误 flags/权限均拒绝。 |
| ADH-06 | 临时产物身份 | 独立目录/文件含 adhoc-test 标识；未签 DMG、无公证的限制明确，清单不使用正式 verified 格式，不产生正式更新元数据、不自动发布。DMG、清单及说明的普通文件/路径约束与最终 SHA-256 可重算。 |
| ADH-07 | DMG 与清理 | 创建后 `hdiutil verify` 通过；挂载参数为 readonly/nobrowse/自有 mountpoint。内层验签失败仍 detach；detach 失败不递归删除挂载点；任一失败不输出成功最终目录。 |
| ADH-08 | 真实最终 DMG 完整性 | 从实际最终 DMG 中读取 app，对所有原生对象、arm64、plist、资源及包内依赖实测；复制到自有安装目录后重验。只改一个自有副本的已封印资源时原生 codesign 必须拒绝，原 DMG 与安装副本不变。 |
| ADH-09 | 本机真实安装副本启动/重开 | 使用同一 DMG 的复制 app，隔离 SHAKEINK_TEST_ROOT；确认 `app.isPackaged`、arm64、真实 `shakeink://app/`、原工作台/本地 IPC 与数据库可用、无模型、renderer sandbox=true。正常退出，同目录再次打开；首次/再次启动前后 app 均严格验签。失败/强杀不能记正常通过。 |
| ADH-10 | 离线范围 | 测试进程网络隔离先用控制负例证明外部连接拒绝、本地控制通道可用，再运行真实 app 及子进程；若 sandbox 与 Electron 不兼容，记录失败尝试，改用可执行的受限方案并精确说明覆盖层，未达到整进程隔离则不标完整离线通过。 |
| ADH-11 | 回归与保留 | 专用单元/打包测试、类型检查、全量 core 各自记录真实结果；源业务路径零修改，正式发布 5 文件、原用户未提交文件及旧坏样本散列保持。既有失败单列，不能改业务或放宽断言掩盖。 |
| ADH-12 | 真实信任与收件端 | 原生 spctl/syspolicy 拒绝记录为缺信任/公证的结果，不计通过；干净15.7.5/M4+微信下载隔离、安装、“仍要打开”实际点击、目标机断网首启只有实际完成才通过。无设备时明确待验证；本机直接执行不代替该流程。 |

TDD：先提交 `macos-adhoc.test.ts`，确认缺少实现时 RED，再实施模块至 GREEN。受控命令端口仅证明顺序、失败停止和清理；真实最终 DMG/复制 app/签名篡改负例及进程启动承载系统正例。每个测试保留触发阶段，不以任意后续失败替代预期失败。

签名范围只写入本轮自有 staging。启动及篡改负例只操作临时目录，不启动/清理用户的正常实例，不读真实用户数据或 Key。安装说明使用“如果系统显示此入口”，不能保证所有 macOS 都提供“仍要打开”。

执行调整（2026-10-16，属于 ADH-10 已批准的兼容性回退）：外层 SBPL 与 Chromium 自身沙盒不兼容，保留失败后改为正常原生启动；网络观察只验证应用既有 defaultSession 协议过滤器。固定 URL 在自有隐藏空白窗必须触发 requestfailed，且 errorText 精确为 net::ERR_BLOCKED_BY_CLIENT，DNS/超时/一般 fetch 拒绝均不能替代。保留产品 CSP/transport/会话过滤器，不安装未生效的测试 route。完整应用断网首启依旧未验证。异步主题控件通过真实 click 后，分别等待 bootstrap 持久化值和 radio 已选状态，并在冷重开验证；不使用即时 check 来替代异步落盘断言。各次窄复核见 05-code-review.md。
