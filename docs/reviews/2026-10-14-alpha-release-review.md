# Windows 0.1.0-alpha 方案与用例独立审核

日期：2026-10-14（Asia/Shanghai）。审核角色：独立 release reviewer。范围为项目版本、现有 Windows 构建链及本次发布验证；不授完整业务验收。只读产品/测试/配置，唯一新增文件为本记录。

## 先行方案结论

通过。`2026-10-14-alpha-release-plan.md` 保持现有本机 Windows x64/Node 24/Electron/NSIS 实现，保留未提交改动，不改变依赖、不发布远端、不签名。没有要求新产品实现。

源文件依据：

- `package.json:3`、`package-lock.json:3`、`package-lock.json:9` 当前三处为 `0.10.0-alpha`，三处同步为 `0.1.0-alpha` 即为项目元数据变化；不应全局替换依赖或历史证据版本。
- `desktop/shared/project-info.ts:10` 的 `displayAppVersion` 只缩写零 patch alpha，目标输出为 `0.1-alpha`。`desktop/main/index.ts:497/694/699` 已从 `app.getVersion()` 向 bootstrap、macOS About、Windows 独立 About 提供显示版本。`SettingsDialog.tsx:72` 显示 bootstrap.version，生产 UI 不需要冻结版本常量。
- `electron-builder.config.cjs:6` 安装包名从 metadata version 派生，Windows target 为 NSIS，`signExecutable:false`；`scripts/package-desktop.mjs:28-29` 对 Windows afterPack 执行 `verifyProjectResources` 和 `verifyPackagedDependencies`，`build` 显式 `publish:'never'`。本机预检读取本地 Electron/Sharp PE 架构和锁定版本。
- `inspect-packaged-app.mjs` 的独立 CLI 仅支持 macOS，Windows 使用 afterPack 的两项通用检查，不能直接将 `npm run package:check` 当 Windows 静态验包。

## 随后用例结论

通过。用例覆盖三处 metadata 一致性、有效 SemVer、显示与实际 runtime 一致、Windows PE/安装包 metadata、实际打包依赖、真实隔离 packaged 启动和离线重启。执行要求如下：

1. 先更新 unit 目标为 `0.1.0-alpha` 并运行 RED，metadata 修改后 GREEN；增加目标显示 `0.1-alpha`，保留 `0.10.0-alpha` 等历史格式回归。browser 版本字符串是隔离 fixture，保留其旧版本覆盖合理。
2. `verify-version-star.mjs:71/103/128/130/134` 都写死旧版本，需全部按 package metadata 和共享显示函数派生，避免真实验证脚本在目标构建后误报。launch 需删除 `ELECTRON_RUN_AS_NODE`，以兼容工具宿主环境。
3. 正式 packaged 脚本可用 `node --import tsx scripts/verify-version-star.mjs --packaged`。它使用隔离临时根、零模型、观察 renderer 请求、设置 offline、断言 main active Server=0、双主题设置/About/重启；观察从 firstWindow 后开始，不能据此宣称全进程启动网络审计。外链 endpoint 截获只证明路由，不证明系统浏览器打开。
4. 全量 unit/integration/browser 回归使用已有 `scripts/verify-content-drawer-regression.mjs`，须记录实际失败，不替既有失败标通过。适用打包测试为 config、PK113 review；`tests/packaging/packaged-resources.test.ts:10` 与 `package-archive.test.ts:14-15` 硬编码 mac-arm64 产物和 macOS 命令，不运行或据实标平台未覆盖。
5. `tests/unit/packaging-config.test.ts:56` 的 `/node_modules\/electron\/dist$/` 不接受 Windows `join()` 返回的反斜杠，是现有完整 core 回归风险。若本次仅记录则必须单列；若最小修复，保留 RED/GREEN 和独立 code review，不能把失败隐去。
6. Windows PE 的版本 string 与数值字段分别核验，安装包 filename 和 packaged package metadata 应为完整项目 SemVer。主 EXE 的 ProductVersion 按 builder 数值化规则；NSIS installer 的 string ProductVersion/FileVersion 为完整 SemVer，fixed 数值为四段式。验目录 EXE不等于 NSIS 安装验证。

本审核依据实际读文件及 `rg` 命令结果；没有运行新版本测试或构建，故不声明实现、GREEN 或 Windows产物验收完成。待主代理完成修改后进行独立代码审核。

## 独立代码审核与目标测试复核

2026-10-14，在方案/用例审核之后完成。审核限定 `package.json`、`package-lock.json`、`tests/unit/version-star.test.ts`、`scripts/verify-version-star.mjs`，使用实际 `git diff --` 核对，未修改产品/测试文件。

结论：通过，未发现本次版本/验证脚本变化引入的阻断项。package 只改项目 version；lock 只改根及根包 version，没有依赖版本变化。unit 将 release 目标设为 `0.1.0-alpha` 并增加短显示断言，保留历史 release 格式回归。真实验证脚本导入现有 `displayAppVersion`、读取 package metadata，settings、About、bootstrap、完整 runtime version、restart 五处断言均已消除旧版本冻结；每次 launch 环境删除 `ELECTRON_RUN_AS_NODE`，其余隔离测试根、无模型、网络请求观察与 main listener 检查继续保留。

TDD 证据复核：`docs/evidence/alpha-release/version-red-native.tap` 记录 5 tests/4 pass/1 fail，唯一失败为 expected `0.1.0-alpha`、actual `0.10.0-alpha` 的版本契约，属于有效 RED。`version-green.tap` 记录 5/5。初次 sandbox spawn EPERM 的 `version-red.tap` 不计为契约 RED。

独立执行命令（使用 Node 24.19.0，原生提升运行以避免 sandbox child spawn EPERM）：

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --import tsx --test tests/unit/version-star.test.ts
```

实际返回 exit 0：tests 5、pass 5、fail 0、cancelled/skipped/todo 均 0，duration 170.7624ms。此结果仅为目标 unit 合约验证；正式构建、全量回归和 packaged Windows 产物仍待主代理执行后核验。既有 packaging Windows path 断言及其它完整回归失败保持据实记录要求。

## 产物核验准备（未对旧产物授通过）

只读检查时 release 内目录包仍是旧产物，旧安装器名为 `ShakeInk-0.1.0-win-x64.exe`，不能作为本次 alpha 成品。待新 NSIS 完成后独立读取 packaged `resources/app/package.json`、主 EXE 和安装器 PE machine/version、重算 SHA-256，并核对本次 afterPack/真实 packaged 验证记录。

版本规则来自实际已安装 builder 源码：`winPackager.js:160-161` 的主 EXE opts 分别为 fileVersion=`appInfo.buildVersion`、productVersion=`getVersionInWeirdWindowsForm()`；`appInfo.js:67-87` 默认生成 `0.1.0.0`。`NsisTarget.js:186-187/383-393` 使用数值 `VIProductVersion`，同时 installer string `ProductVersion`/`FileVersion` 为完整 `0.1.0-alpha`。因此主 EXE ProductVersion `0.1.0.0` 不应因缺少 alpha 后缀误拒；最终以实际字段及源规则分别记录。

已有完整基线 `docs/evidence/content-drawer/baseline-core-01/core.json`：1977 tests、1935 pass、39 fail、1 cancelled、2 skipped、stableSources=true；其 failures 数组含 cancelled 的 not-ok，共 40 项。实际 core.tap 显示冷源/源权限及 timeout、配置 snapshot、抽取 UI 的未定义符号、Windows ESM URL、业务契约和静态源断言等失败。此分类仅描述已见失败，未断言根因已修复或无业务影响；本次结果须与 exact test name 对比，并保留 fail/cancelled/skipped 独立计数。

Windows 可适用打包测试为 `tests/unit/packaging-config.test.ts` 和 `tests/packaging/packaging-113-review.test.ts`，前者既有路径断言失败需单列；ICNS/ICO/provenance 单项可单独运行。硬编码 mac-arm64 .app/ZIP 的其它资源/archive 用例不覆盖本次 Windows 成品。afterPack 执行实际项目资源及包内 Sharp/PGlite/Prisma 检查，是Windows静态依赖证据；真实 Electron 离线/版本验收及 NSIS 安装各为不同范围。

## 真实验收脚本导航适配审核

首次 packaged attempt 的 `docs/evidence/alpha-release/native-attempt-01/report.json` 为 failed，只有 paper completion-gate/welcome 两项通过，错误为旧 exact `账号菜单` selector不存在；该失败保持证据，不计为整个版本验收通过。`SidebarTree.tsx:1968` 的真实账号按钮 aria-label 为 `账号菜单：${user.name} ${user.email}`，将 settings 入口匹配改为 `/^账号菜单：/` 合理。

焦点验证另有边界：`DesktopApp.tsx:51-55` 仍先找旧账号标签，再找 nav 首 button，再找旧 textarea 标签；当前 `ChatPanel.tsx:2009-2014` 是 div textbox。`DashboardShell.tsx:30` 与 `desktop.css:464-465` 使 nav 仅窄窗可见，因此不能在 1440 宽窗直接将期待焦点改为 nav 并宣称通过。若本发布范围维持生产实现，可在独立用例关闭 welcome 前将真实窗口置为窄窗、等待实际 narrow mode/nav可见，然后验 nav首 button焦点，再恢复宽窗执行设置/About版本验证；结论限于窄窗当前合法fallback，不代表宽窗初始引导账号恢复目标通过。本次不修改生产聚焦实现。

## 新 Windows alpha 产物独立核验

结论：本次版本、构建及静态成品有限通过，未执行 NSIS 安装。独立读取 Windows `VersionInfo`、PE machine并重新计算文件散列，结果如下。

| 产物 | 字节数 | PE | FileVersion / ProductVersion | SHA-256 |
| --- | ---: | --- | --- | --- |
| `release/ShakeInk-0.1.0-alpha-win-x64.exe` | 286286310 | 0x014c，x86 NSIS installer stub | 0.1.0-alpha / 0.1.0-alpha | `58949af762101bf347139f113a2d1113d3c97ebbee28abcccba02b8566740d89` |
| `.exe.blockmap` | 285387 | 不适用 | 不适用 | `0be178ba6b1634442583443bfd7c92b49ca5174e7f7807aca3c18b28ea11fc4c` |
| `release/win-unpacked/玄印写作.exe` | 246238720 | 0x8664，x64 app | 0.1.0-alpha / 0.1.0.0 | `4d12fcbcbd75c5e35563f3d73a552895598e369e3d0bb37a19eb70cdc44a0bb3` |

独立校验 `.exe.sha256` 文本的 hash+basename 精确一致，`artifact-hashes.json` 所记录安装器、blockmap、主 EXE、packaged package、afterPack manifest 五项 hash和字节数均匹配。项目 package、lock 根和 `packages['']`、packaged package version 四处都为 `0.1.0-alpha`；packaged main 为 `dist/main/index.cjs`。

独立执行 Node 24 `verifyProjectResources(process.cwd(), 'release/win-unpacked/resources/app')`，exit0，340 projectResources、26763 packagedFiles：现有 out、dist 五入口、migrations、runtime licenses 必需资源及其 hash 均与构建输入一致，禁止数据/开发文件保护通过。`build.json` 的 dist/main、dist/service、dist/preload、out/index.html 四项散列另行重算均匹配。该证据覆盖目录包；没有单独解包 installer 或宣称安装成功。

核读 `alpha-release-build-01/build.json` 的 Node24.19.0 typecheck、命令生成、Prisma生成、Next正式UI构建、desktop构建各 stage exit0，passed/stableSources=true。`alpha-release/package.log` 最终 stage=packaged、NSIS archs=x64；afterPack=340resources/PGliteClosed=true/publish=never。实际 manifest 同时记录 queryResult42、Sharp0.34.5 PNG2x3、Prisma WASM magic0061736d、依赖probe exit0/forcedTermination=false。适用 `packaging-review.tap` 四项通过，未替 macOS专用用例计通过。

## 实际 packaged 版本验收核读

审核最新 harness diff：账号入口正确匹配动态label；focus用例真实 setBounds800x900并等待nav可见，关闭欢迎弹窗后验真实nav首button焦点，再setBounds1440x900且等待nav隐藏。report.scope明确排除宽窗账号焦点；增加script、SidebarTree、DesktopApp source hashes，不改生产聚焦实现。此有限修正通过。

`docs/evidence/alpha-release/native-passed-03/report.json` 与正式 windows-package report 的SHA相同。实际22 checks passed（paper/ink各11），errors=[]、观察HTTP0、两主题 packaged=true/Electron44.6.0/runtime version0.1.0-alpha/main listeningServers0，离线重启通过、隔离数据清理完成。独立重算其15项 source hashes全匹配。attempt01/02失败证据保留，不宣称宽窗账号focus恢复、系统浏览器打开、启动前全进程网络、NSIS安装或全业务验收通过。

## 完整回归风险

本次完整 core实际2069 tests、2028 pass、38 fail、1 cancelled、2 skipped，stableSources=true。独立按名称比较 `baseline-core-01`：39个not-ok标题都在旧基线40项中，无新增标题，旧模型authorization项不再失败。这只证明标题对比，既有失败仍存在，仓库不是全绿。

首次完整browser实际550 tests、545 pass、5 fail，stableSources=true。保留原始失败；configuration-transfer-ui-review加载 ENOENT `.next/static/chunks` 与并行build相撞的解释应配串行复验，不能替原轮标通过。其余指针/样式/向导相关失败同样需如实记录。主代理正在四文件串行复验，本审核时最终记录尚未生成；不得将本次版本构建有限通过扩大为完整回归或正式全业务验收通过。

## 最终串行复验与台账审核

已读取 `alpha-release-browser-recheck-01/browser.json`：targeted=true、4 files、exit0、63 tests/63 pass，fail/cancelled/skipped/todo全部0、stableSources=true、error=null；command明确 `--test-concurrency=1`，只列 configuration-transfer-ui-review、content-drawer、dialog-appearance、local-wizard-templates 四个原文件。结论为这些文件串行复验通过，不合并到首次完整550项结果，不覆盖原始5项失败，不据此断定全部失败根因。

核读 `2026-10-14-alpha-release-verification.md` 与两台账 `alphaReleaseRevision`：版本、产物路径/SHA、build/5项版本合约/4项打包review/22项真实包验证、core2069/2028/38fail/1cancel/2skip、browser首轮550/545/5fail、四文件串行63/63均与实际证据一致。文档明确 full-regression-not-green、隔离数据、窄窗fallback、未执行NSIS安装/macOS/供应商，并保留失败attempt。migration-map标记allRepositoryAcceptancePassed=false、installerExecuted=false、macOSExecuted=false，准确反映有限范围。

`git diff --check` 实际exit0；LF/CRLF提示不属于差异格式失败。此次最后审核未重跑测试、构建或安装、未接触默认用户数据。最终结论维持：用户要求的0.1.0-alpha Windows x64 NSIS产物已构建，版本/构建/静态成品及限定真实版本验证通过；完整仓库回归未全绿，宽窗账号focus、完整业务和安装过程不授通过。审核范围无新阻断项。
