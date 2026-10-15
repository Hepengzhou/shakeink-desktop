# Windows 0.1.0-alpha 构建与验证

2026-10-14（Asia/Shanghai）。已按用户要求生成 Windows x64 NSIS Release 安装包；版本与发布产物的限定检查通过。完整仓库回归未全绿，不声明全部业务或安装验收通过。

## 产物

- `release/ShakeInk-0.1.0-alpha-win-x64.exe`：286,286,310 字节，SHA-256 `58949af762101bf347139f113a2d1113d3c97ebbee28abcccba02b8566740d89`。
- 同目录提供 `.exe.blockmap` 和 `.exe.sha256`；打包目录为 `release/win-unpacked`。
- NSIS 自身为 x86 stub，载荷应用为真实 x64 PE；安装器 FileVersion/ProductVersion 均为 `0.1.0-alpha`。主应用 FileVersion=`0.1.0-alpha`、ProductVersion=`0.1.0.0`，符合本机 builder 的预发布版本编码。
- `package.json`、lock 根、lock 根包及包内 metadata 均为 `0.1.0-alpha`；现有界面格式显示 `0.1-alpha`。
- 沿用现有配置：不签名、`publish=never`。构建核验阶段未执行 NSIS 安装，后续本机安装见下。旧版本产物保留。

## 实际执行

Node 24.19.0、Windows x64、Electron 44.6.0。本轮保留此前未提交的模板库修改并使用当前工作树构建；未修改上游或业务生产组件。

| 范围 | 实际结果 | 证据 |
| --- | --- | --- |
| 版本 TDD | 原生 RED 4/5，唯一版本不匹配；修改后 GREEN 5/5；独立复跑 5/5 | `docs/evidence/alpha-release/version-red-native.tap`、`version-green.tap`；独立审核文档 |
| 构建 | types、commands、Prisma、Next 正式静态导出、desktop 全部 exit 0；记录的构建输入稳定 | `docs/evidence/content-drawer/alpha-release-build-01/build.json` |
| NSIS | 正式默认目标 exit 0；afterPack 在归档前完成；340 项项目资源、真实包内依赖/PGlite 正常关闭 | `docs/evidence/alpha-release/package.log`；`release/package-static-win32-x64.json` |
| Windows 适用打包回归 | 4/4 | `docs/evidence/alpha-release/packaging-review.tap` |
| 真实打包程序 | 双主题 22/22，设置/About/bootstrap/原生 runtime 版本一致，关闭重开及离线 reload；零模型、观测期间 renderer HTTP 0、pageerror 0、主进程 listening Server 0 | `docs/evidence/alpha-release/native-passed-03/report.json`及截图 |
| 完整 unit/integration | 276 文件、2069 tests、2028 pass、38 fail、1 cancelled、2 skipped；输入稳定 | `docs/evidence/content-drawer/alpha-release-core-01/core.json`及 TAP |
| 完整 browser 首轮 | 54 文件、550 tests、545 pass、5 fail；输入稳定 | `docs/evidence/content-drawer/alpha-release-browser-01/browser.json`及 TAP |
| browser 失败涉及文件串行复验 | 原四文件 63/63、0 fail、0 skipped；输入稳定 | `docs/evidence/content-drawer/alpha-release-browser-recheck-01/browser.json`及 TAP |

首次版本 RED 被沙箱 `spawn EPERM` 阻止的日志单独保留，不计 TDD RED。真实 Windows 子进程验证在已授权原生环境执行。

## 限定与残留

core 的 39 个 not-ok 标题（含 1 cancelled）均存在于之前 `baseline-core-01` 的 40 个标题；本次无新增失败标题。比较仅证明名称集合，不推断业务安全或失败原因。Windows 包配置的旧路径正则仍为其中一项失败，未在本次发布范围改写。比较记录为 `docs/evidence/alpha-release/core-comparison.json`。

首次 browser 与正式构建并行，`configuration-transfer-ui-review.test.ts` 读取临时重建中的 `.next/static/chunks` 发生 ENOENT，整文件未执行；另四项为指针命中断言和三个超时。四个相关原文件随后进行串行复验，63/63 通过，没有修改生产或测试断言。首次失败保留；未重新跑第二次完整 browser，也不将重叠用例相加成全量通过。串行通过本身不证明另外四项失败的根因。

真实版本验证的前两次失败完整保留于 `native-attempt-01`、`native-attempt-02`。旧脚本账号名未适配当前 `账号菜单：姓名 邮件`；宽窗中的窄导航按钮隐藏，原账号/textarea 聚焦候选也与现有 DOM 不一致。本轮只修改验证脚本定位，在真实 800px 窄窗验证当前可见导航 fallback，并回到 1440px 继续版本验证；不授宽窗账号焦点恢复通过、不修改生产聚焦逻辑。脚本修改发生在正式构建后，脚本不进入安装包；包中生产组件未改变。

原 macOS 硬编码打包用例未执行，不列为 Windows 通过。真实包运行验证使用隔离无模型/无 Key 根目录并清理；外链只截获路由，网络观察始于 firstWindow 后，不扩称整个启动期/所有子进程审计。上述构建验证阶段没有执行安装器、默认用户数据写入、供应商调用或 macOS 验收。

方案、用例、独立代码及产物审核见 `2026-10-14-alpha-release-plan.md`、`2026-10-14-alpha-release-review.md`。最终安装器及记录的五项产物已由独立代理重算 hash/bytes；独立资源核验为 340 resources / 26763 files。

## 后续本机重新安装

用户随后明确要求在本机重新安装最新 release。原系统登记及安装目录 metadata 为 `0.1.0`，位置为 `C:\Program Files\shakeink`，安装前应用未运行。

重新校验同一安装器 SHA-256 后，使用 `/S /allusers /D=C:\Program Files\shakeink` 在原 per-machine 目录执行 NSIS 升级流程，安装器实际 exit 0。该流程向旧卸载器传递 `--updated` 保留用户数据；没有手工删除用户数据或读取作品、Key。

安装后系统登记为「玄印写作 0.1.0-alpha」，包内 metadata 为 `0.1.0-alpha`，主 EXE 与 release 主 EXE SHA-256 完全一致。实际安装目录的项目资源校验 340 项通过，包文件表 26763 项。证据为 `docs/evidence/alpha-release/local-installation.json`、`local-installation-resources.json`。

此结果证明本机既有安装位置的 NSIS 重新安装及静态文件核验完成；没有启动正常用户数据下的应用或执行完整业务验收，不改变上述全仓回归未全绿结论。
