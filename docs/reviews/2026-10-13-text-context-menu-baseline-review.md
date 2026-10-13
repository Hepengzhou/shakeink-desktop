# 文本右键菜单任务：剩余核心基线失败独立审计

日期：2026-10-13（Asia/Shanghai）。仅新增本文件；只读 TAP、既有源码、测试夹具、Git 差异及 Windows 目录 stat，不修改生产或测试，不运行真实用户数据，也不以此代替主代理的隔离基线复验。

结论：**targeted 重跑的 38 个 testCodeFailure 标题与本任务实施前的 38 个失败标题完全相同，未发现新增失败标题或文本菜单执行链导致的失败。38 项仍然失败，不能宣布核心测试全部通过。** 其中存在真实既有 Windows 兼容缺口及配置导入契约问题，不能统称“环境失败”；另有明确旧夹具/跨平台断言缺口，以及一个底层原因被包装后尚待隔离核实的重定位失败。

## 数量与比较方法

读取 `docs/evidence/text-context-menu/core-targeted-rerun.tap`：207 tests、167 pass、**38 fail、1 cancelled、1 skipped**。其中有 39 行 `not ok`，多出的 AR104-C02 为 `testTimeoutFailure`，按 Node TAP 汇总属于 cancelled，不能漏记或算进 38 个失败。

读取 `core-before.tap` / `core-before-summary.json`：1951 tests、1908 pass、38 fail、3 cancelled、2 skipped。按每个 `not ok` 的 failureType 排除 timeout/cancel 后比较完整标题，两份报告的 38 个失败集合相等，newFailures 与 removedFailures 均为空。基线另外两个 BDC06/BDC07 timeout 不在这次 targeted 失败集合中；不能因为未再次超时就推断它们全量通过。

此前新增的 24 个 `Unexpected dependency @/lib/desktop/text-context-menu` 等失败属于五个 strict controller 夹具；它们已仅补显式依赖并完成相关 28/28 测试，不能混入这 38 项。本文件不重跑这些检查或完整核心测试。

## 文本菜单依赖核对

本任务生产改动集中于 main/preload/IPC 的新文本菜单通道、DesktopCommandController、ChatPanel、composer-editor、native-text-edits、MonacoMarkdownEditor 及新增 text-context/quote/Monaco 适配器。堆栈中的 `application-cold-source`、`configuration-transfer`、`draft-journal`、`root-relocation`、`directory-sync`、`DesktopApp`、package inspector 和相关失败测试路径没有本任务直接改动；`git diff --name-only` 对这些具体文件为空。

- `application-cold-source.ts:1-17` 依赖 root/data/ownership、原 draft journal、workspace schema 及旧保留/恢复模块，不导入任何新增 text-context/quote/composer/Monaco 菜单模块。configuration-transfer 只依赖 settings、shortcuts、VersionedStore 和 thinking-effort；DraftJournal 只依赖 drafts schema、VersionedStore 和 fs/crypto/path。
- 新 main 菜单代码仅增加 import/实例和 registerIpc 中 `desktop:text-context-menu` / cancel handler。用 TypeScript AST 比较当前与 HEAD 的 `createWindow`、`restoreBusiness`、`launch`、`createOrdinaryServiceWorker`，四个函数文本（归一 CRLF）完全相等。失败的窗口/启动夹具只抽取这些旧函数，不执行新 menu handler。
- 真实 DesktopApp 的生产组件树会间接挂载已修改 Controller/ChatPanel；然而 BRUI 测试把 Controller/DashboardShell 等显式替换为占位函数，B55/REC56/U71 抽取 effect/callback 后手动注入依赖。其失败均在旧抽取夹具缺少既有自由变量时发生，尚未到文本菜单模块。
- Worker IPC-01 确实构建整个分发入口，但 worker 已成功运行并返回有效 novels response，其失败是原接口增加 unavailableWorks 与旧 strict expected 不一致，不是构建或新 main 菜单启动错误。

上述是失败栈与执行路径的关联审计，不是对整个仓库不存在任何潜在回归的证明；主代理仍须完成独立隔离全量比较。

## A：闭源保留模块的真实 Windows 兼容缺口（20 fail，另 1 cancelled）

共同源证据：`desktop/core/application-cold-source.ts:151-154` 在同步 capture walk 的第一层检查目录必须满足 `mode & 292n`（POSIX 0444）及 `mode & 73n`（POSIX 0111），否则抛 `APPLICATION_COLD_SOURCE_UNREADABLE`。这些 fixture 用真实 Windows 临时目录，并未人为使目录不可读。

独立只读探针使用本次测试同版本 Node v24.21.0，对可成功 readdir 的仓库目录输出：

```json
{"node":"v24.21.0","platform":"win32","isDirectory":true,"modeOctal":"40666","posixRead":292,"posixExecute":0,"readdirSucceeded":true}
```

这证明“POSIX 执行位为零”并不等价于 Windows 目录不可读取；该生产帮助器的 POSIX gate 与 Windows stat 语义不兼容。直接抛错和未到后续 hook 的断言失败应分开记录，但不能把后者当作各自安全测试已经执行成功。此模块属于既有闭源保留/恢复代码，本次菜单不导入或调用它；是否仍为取消备份后的活动入口另由 scope 台账判断，不能借修菜单复活被取消功能。

| 完整失败标题 | targeted 堆栈/断言与判断 |
| --- | --- |
| AR104-C01 the private source-only post-CAS seal protects raw bytes but cannot reconstruct the former pointer authority or an execution proof | application-cold-source.ts:154→192→343；test application-cold-source-104-review.test.ts:31。直接 unreadable，后续 seal 验证未执行。 |
| AR104-C03 a managed directory replacement during yielded inventory IO cannot be learned as original ownership | 同测试 :53 `replaced=false`，mock fsPromises.lstat 还没到触发点；前置同步 walk 可先拒绝。不是该替换安全性已验证。 |
| AR104-C04 revoking captured native callbacks invalidates an already issued proof even after its public callback is replaced | application-cold-source.ts:154→192→343；test :58。首次 preservation 未成功，无已签发 proof 可供验证。 |
| AC36-20 an unrelated canonical work is observed without reading its contents or claiming them as copied bytes | application-cold-source.test.ts:16→fixture preserve :46→生产 walk :154。直接 unreadable。 |
| AC36-01 corrupt closed database bytes, full latest journal, managed session state and empty directories have a separate private closed-source copy | test :50 / 生产 :154。未到复制与原字节核对。 |
| AC36-02 raw DTO, JSON clone, modified proof and another operation never reconstruct the original private source grant | test :75 / 生产 :154。首次 proof 创建先失败。 |
| AC36-06 source missing managed namespace is explicit while an appearing missing item invalidates the original inventory | test :138 / 生产 :154。未到 missing inventory/后置新增判断。 |
| AC36-07 late source identity/bytes replacement refuses issuance and preserves all foreign replacements | test :153 `assert.ok(destination)`；destination 仅 after-receipt hook 写入，前置失败使其 undefined。 |
| AC36-07 late copy identity/bytes replacement refuses issuance and preserves all foreign replacements | 同 :153 / after-receipt 未到；不是 copy late replacement 被验证。 |
| AC36-07 late receipt identity/bytes replacement refuses issuance and preserves all foreign replacements | 同 :153 / after-receipt 未到；不是 receipt 替换被验证。 |
| AC36-07 late unknown-source identity/bytes replacement refuses issuance and preserves all foreign replacements | 同 :153 / after-receipt 未到；unknown-source 替换未执行。 |
| AC36-08 captured owner revocation after the last host await cannot be bypassed by replacing callbacks | test :170，预期父目录 1 项、实际 0 项；after-receipt owner revocation 未到，前置拒绝被 refused 接住后计数失败。 |
| AC36-08 captured cold revocation after the last host await cannot be bypassed by replacing callbacks | 同 :170，0≠1，cold revocation hook 未到。 |
| AC36-08 captured lock revocation after the last host await cannot be bypassed by replacing callbacks | 同 :170，0≠1，lock revocation hook 未到。 |
| AC36-13 strict closed-source metadata refuses healthy labels, work identifiers and extra source authority fields | test :226 / 生产 :154。初始 preservation 未完成，后续 metadata 负例未执行。 |
| AC36-14 data creation cannot reidentify and populate an empty foreign replacement across a yielded mkdir | test :248 `assert.ok('proof' in result)` 失败；成功 proof 在注入 creation race 前已缺失。 |
| AC36-14 inbox/database/global creation cannot reidentify and populate an empty foreign replacement across a yielded mkdir | 同 :248；inbox/global creation race 尚未获得前置成功结果。 |
| AC36-15 journal semantic read followed by a different journal during inventory IO rejects the changed raw source without learning its new bytes | test :265 `replaced=false`；同步 source gate 在 async inventory hook 前拒绝，不能据此评估预期 journal 变化。 |
| AC36-16 a captured physical seal survives pointer replacement but grants no new authority and still checks all original source/copy/host observations | test :275 / 生产 :154。seal 创建先失败。 |
| AC36-17 a managed file or directory first observed before IO cannot be reidentified after a same-byte or empty-directory replacement | test :304 `replaced=false`，预期观察后替换的 hook 未到；相同前置 gate 是强关联原因。 |

额外 cancelled 标题：**AR104-C02 cancellation during a real target write waits that physical IO, refuses proof and preserves an intervening foreign file replacement**。targeted TAP:69-76 为 10000ms testTimeoutFailure。test :40-44 等待 `entered.promise`，只有 fsPromises.open hook 命中 `path.startsWith(f.parent+'/') && path.endsWith('/data/state.json')` 后的 writeFile 才 resolve；既存在前置 cold-source unreadable，又有 Windows 原生 `\` 路径与该 POSIX 字符串匹配不一致。两处都足以让 hook 永不进入，不能把 timeout 归为机器慢或取消安全性通过。

## B：真实配置导入快照契约失败（2 fail）

`desktop/core/configuration-transfer.ts:65-71` 的 strict snapshot 仅允许 revision/settings/models；`desktop/core/settings.ts:53` 的 publicState 总是附带 onboarding（至少为 null）；`desktop/main/model-repository.ts:23,94` 原 read/saveModel 返回 `{revision,...publicState(...)}`。因此真实 repository StateSnapshot 被 strict importer 当 INVALID_SNAPSHOT 拒绝。这是生产模块间的既有实际接口不兼容，不是 Key 失效、供应商网络或 Windows 环境。三个模块均未导入新文本菜单。

| 完整失败标题 | 源码与失败位置 |
| --- | --- |
| CFG58-04 actual repository credential replacement makes the reviewed public snapshot stale without importing anything | configuration-transfer-review.test.ts:53-57 创建真实 ModelRepository/saveModel，再将返回快照传 prepareConfigurationImport；堆栈 checkedSnapshot :71→prepare :151，尚未到 credential replacement / stale conflict 的预期断言。 |
| CFG16: resolved settings commit through the existing repository CAS without changing any model credential | configuration-transfer.test.ts:220-225 同样直接传真实 saveModel 返回值；INVALID_SNAPSHOT 先发生，settings CAS 与原 credential 保留尚未被执行。 |

## C：明确旧夹具或跨平台断言缺口（15 fail）

这些条目不能据此宣布对应业务通过；但失败栈足以定位旧 fixture 输入/自由变量/路径断言的问题。它们未触发新文本菜单执行链。

| 完整失败标题 | 具体源证据、分类与本任务关系 |
| --- | --- |
| IPC-01: built worker executes original local handlers with no HTTP server and retains original ownership guards | desktop-worker.test.ts:30 strict expected `{novels:[]}`；实际多 `unavailableWorks:[]`。dispatcher.ts:85-94 明确返回两字段。旧 expected 接口形状过时；worker 正常启动，非新菜单 handler。 |
| AR105-G02 a failed detached actual filesystem writer is reported by its flight without a second unhandled rejection | application-metadata-flight-105-review.test.ts:16 的动态 ESM import 直接 JSON.stringify(join(cwd,...))，Windows 变 `D:\...` 而非 file URL；TAP ERR_UNSUPPORTED_ESM_URL_SCHEME protocol d:，application-metadata-gate 根本未被子进程加载。平台夹具 import 写法，不是 metadata-flight 业务断言。 |
| BRUI-04 actual DesktopApp ignores removed backup/restore events while normal workbench remains mounted | desktop-backup-removal-ui.test.ts:44-47 只抽 DesktopApp 函数且 deps 无 onboardingCanShow；DesktopApp.tsx:36 正常模块导入该函数、:178 调用，eval fixture ReferenceError。Controller/DashboardShell 被占位，本次菜单没有运行。 |
| BRUI-05 actual DesktopApp still flushes normal save and retries ordinary migration cancellation | 同 fixture/onboardingCanShow 缺依赖；尚未执行 save/migration assertion。不能把 ReferenceError 视为实际 DesktopApp 未导入。 |
| B55-05: closing before bootstrap resolves replies unchanged and blocks its late initialization | desktop-bootstrap-effect-review.test.ts:27 的 effectDependencies 有 leasePendingRef，却没有 migrationRef；DesktopApp.tsx:49 正常声明、:118-119 在事件分支使用。抽 effect 不注入该既有 ref 导致 ReferenceError。 |
| REC56-B01: current DesktopApp restore callback uses original read-only target routes and returns preserved-data viewing action | desktop-recovery-bindings-review.test.ts:51 values 无 recoveryRef；真实 DesktopApp.tsx:49 声明，:99 通知 onClick 设置 ref。夹具实际只在点击通知时 ReferenceError，前面的 read-only 路由已返回。 |
| durable drafts survive a fresh journal and contain only the bounded data snapshot | draft-journal.test.ts:12 末尾强制 POSIX mode 0600；Windows 实际为 438=0666、expected384=0600。DraftJournal 持久化/重读前序断言已经通过，mode 位在 Windows 不能替代 ACL 验收。仅判此旧跨平台断言不适配，不能据此声明 Windows ACL 隐私已通过。 |
| MB119-N04 actual inspector rejects wrong raw runtime, display, executable or version metadata before resource probes | test macos-menu-bundle-119-review.test.ts:116-127 在 Windows 调 macOS inspector 并期待 Info.plist 字段错误；inspect-packaged-app.mjs:67 首先明确拒绝非 darwin，实测正是平台拒绝文案。夹具没有限定 macOS，实际 plist 验收未执行。 |
| model configuration: approved close button remains present beside cancel | model-settings.test.ts:81 的 dialog helper 只找 DialogContent 直接子 DialogTitle；ModelConfigurationDialog.tsx:146-149 现在标题在 header div 内且显式 X 按钮存在。helper 返回 undefined，:233 读取 element 报错，未能评估真实 X。旧树形定位夹具，不是本任务改变模型关闭按钮。 |
| model configuration: catalog choices replace one draft, disable duplicates and retain a failed save for retry | model-settings.test.ts:278-285 无 model/无显式选供应商，却使用 openai/gpt-duplicate fixtures；model-catalog.ts:68-69 首项已是 deepseek，ModelConfigurationDialog.tsx:31-32 取初始首项；:138 duplicate 按 provider/endpoint/kind 判断。旧夹具默认 OpenAI 假设失效，expected disabled=true 得 undefined。不能改成接受 undefined 来虚报 duplicate 通过；应在另项工作明确选择对应 provider。 |
| 本地 Electron 预检真实版本/架构，架构或系统不匹配在 builder 前拒绝 | packaging-config.test.ts:54 使用仅 `/` 的 `/node_modules\/electron\/dist$/`；实际合法 Windows `...\node_modules\electron\dist`。此前版本/架构/平台断言已通过，路径正则失败，后面的错误平台负例未执行。 |
| M71-10: reopening the normal macOS workbench after a committed window-only close restores the business gate for its new bootstrap | root-maintenance-main-review.test.ts:139-150 抽 createWindow/restoreBusiness 但 deps 无 installWindowsCloseAccent，也未把实际 process.platform 固定 darwin；index.ts:18 正常导入、:725 在真实 win32 分支调用。AST 比对 createWindow 未被本任务改变；抽取夹具自由变量缺口，不是实际产品未导入。 |
| U71-02: actual DesktopApp pending-cancel branch retains its dialog on failed retry and clears only on confirmed close-cancelled event | root-migration-renderer-review.test.ts:35-43 抽 effect 并定义 migrationPending/setter，却没有 migrationRef；DesktopApp:118 先写 ref，TAP ReferenceError。新菜单未执行，取消分支本体还没被验证。 |
| RW33-01 first synchronous turn uses bootstrap profile, memory-only session and no source DB session fallback | root-relocation-window.test.ts:58 regex `/preload\/root-relocation.cjs$/` 只认 POSIX slash，实际 Windows tempfile `...\bundle\preload\root-relocation.cjs`。启动/隔离 session 等此前断言通过，regex 是精确失败点。 |
| main startup chooses worker's resolved canonical root before any sessionData initialization | root-startup-main.test.ts:20-23 注入真实 node:path.join，但 :36 expected 硬写 `/chosen/.../session`；实际 `\chosen\canonical-root\session`。worker/barrier/ready 顺序与两个位置完全相同，仅路径分隔符不同；AST launch/createOrdinaryServiceWorker 与 HEAD 相同，新 IPC handler 不在测试截取区。 |

## D：重定位底层失败被包装，平台夹具有强关联（1 fail，仍须隔离核实）

完整标题：**RW33-04 actual native DirectoryAuthority/Core commit preserves original data and only then relaunches**。

targeted 堆栈为 root-relocation-window.test.ts:71→bundle eval，错误仅 `RELOCATION_COMMAND_NOT_COMPLETED`。`desktop/main/root-relocation-window.ts:84-90` 在 command handler catch 丢弃具体 cause；TAP 没有底层错误码，不能仅凭包装错误认定真实产品 relocation 失败。

具体平台夹具证据：`root-relocation-window.test.ts:21` fixture 默认 platform='darwin'，:49 将 `{...process,platform}` 作为整个 esbuild bundle 的 process 注入，同时使用真实 Windows fs。bundle 包含 `directory-sync.ts`；其 :16 的默认 platform 是 process.platform，:35-40 只有 win32 才允许 Windows read-only directory fsync 的已知能力限制，而 root-relocation.ts:140,245,293 正常调用 syncOwnedDirectory。该 fixture 把真实 Windows 文件系统放进 darwin 分支，能使正常 Windows 目录同步能力限制被重新抛出；与包装错误有明确调用链关联。

但本审计没有改 fixture/platform 或执行该案例，因此只判**跨平台 fixture 污染的强候选，底层 cause 尚待主代理隔离复验**；不能排除 relocation 另有产品问题，也不能标通过。真实 platform 的独立对照、保持原 assertion 并暴露仅合成错误类别，才可进一步分类。该模块和窗口代码没有 text-context 依赖，本任务亦未修改它。

## 保持的结论与后续证据门

38 fail 的分类为：20 个既有 cold-source Windows gate 级联失败、2 个真实配置快照契约失败、15 个已定位旧 fixture/平台断言失败、1 个待隔离核实的 relocation 包装错误；另记 AR104-C02 cancelled。共同前置 gate 造成的二十个标题不是二十个独立根因，但每个测试仍未通过。

基线标题相等与静态依赖审计支持“不是本任务新增核心失败”的判断；它们不支持“产品全部通过”或“都可忽略”。主代理继续执行隔离基线全量复验，记录真实 runtime/platform、完整失败集合及对应 root cause。需要处理既有产品问题或更新旧夹具时另遵循任务 scope/审核顺序，不在这份只读审计里直接修复，也不降低断言。

新增文本菜单自身仍需其专项、浏览器、真实 Windows 原生条目、系统 clipboard/草稿/正文/撤销、离线安装包及缺失目标待验收的独立证据。本文件没有给这些项目追加成功状态。
