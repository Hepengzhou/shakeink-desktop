# Release 优化首版独立代码审核

日期：2026-10-18（Asia/Shanghai）。审核基于首版工作区 diff、`scripts/runtime-dependencies.mjs`、两份新增测试与 `red.tap`/`targeted.tap`。只修改本审核文件；没有修改产品、测试、旧包或源码依赖。下列两项复现均仅在临时目录生成和清理隔离夹具。

## 结论

**当前不通过，修复 R1/R2/R3 后复核。** 六项 targeted 测试通过只覆盖当前已写断言；不能抵扣下述删除越界问题，也不代表待补的包内 ORM、新进程重开、原生编辑/导出或全量回归通过。

## 发现

### R1 · P1：node_modules 根链接会绕过包外删除防护

位置：`scripts/runtime-dependencies.mjs:103`、`:114`、`:149`、`:157`。

`packageDirectories` 与 `assertDependencyTree` 从 `appRoot/node_modules` 直接 readdir，只对其子项 lstat，没有先检查 node_modules 根及祖先链。`packageAt` 只在存在被访问的 external 根时检查候选包 realpath；空 external 清单绕过该检查。若 node_modules 根为指向包外目录的 symlink，扫描会读取包外包名，最终 `rm(appRoot/node_modules/<name>, {recursive:true})` 经中间链接删除包外真实目录。这与方案“任何删除前拒绝包外链接”的要求相反。

已执行隔离复现：在临时 project 的 `release/already-published/resources/app` 写入五个摘要正确、externals 为空的运行入口及 manifest，令 node_modules 链接到同级独立 `outside-node-modules`（仅含 sentinel 包）；调用 pruner 后得到：

```json
{"acceptedPublishedTarget":true,"acceptedMissingInputManifest":true,"acceptedNodeModulesRootSymlink":true,"outsideDeleted":true,"removed":["node_modules/sentinel"]}
```

修正：在任何遍历/读取候选包或删除前，lstat 并验证允许输出根至 appRoot、node_modules 根和待处理包的每级路径，拒绝 symlink/非目录/realpath 不一致；删除对象必须是已验证的普通目录。增加根链接负例，断言包外 sentinel 与包内未引用 sentinel 都未改变。

### R2 · P1：仅位于 release 下不能证明是本次新输出，且缺构建清单仍放行

位置：`scripts/runtime-dependencies.mjs:147-156`，两处 package afterPack 调用。

pruner 唯一目标约束是 appRoot 位于 `project/release`。它接受任何历史/已发布目录，并无调用者提供的本次 staging 或准确输出路径绑定；只要 manifest 相同，便会删除旧包内容并重写 package.json。项目 `dist/runtime-dependencies.json` 缺失时还显式转为 null，随后仅相信包内自声明 externals，这正是上述复现接受缺输入 manifest 的原因。当前测试仅验证传 project 根被拒绝，未验证已发布包或错误 release 子目录被拒绝。

修正：两个打包入口向裁剪器传入本轮创建的 staging/准确 appRoot 约束，并验证它与 afterPack 输出一致；普通本地打包也使用唯一的新目录。裁剪器独立拒绝旧发布目录/错误目标，构建输入 manifest 缺失必须立即失败，与包内清单不一致同样失败。为缺源 manifest、相同 manifest 的历史目标、错误 resources 目录加失败前无改动断言，保留允许的新 staging 正例。不要通过扩大到整个 release 作为授权范围来满足测试。

### R3 · P2：所有 external 都按 require 条件解析，拒绝合法 import-only 外部依赖

位置：`scripts/runtime-dependencies.mjs:46`、`:137`。

manifest 只保存 external 字符串，丢失 esbuild 的 import kind；实际验证统一 `createRequire(entry).resolve(specifier)`。动态 `import()` 遇到只提供 `exports.import`、没有 require/default 的包，在 Node 中可正常运行，却被裁剪器作为缺导出拒绝。现有测试的 import-only child 只走 metadata 闭包，未被当作实际 external 验证，因此未覆盖此分支。

已在临时目录写入 CJS 运行入口 `module.exports=import("import-only")` 和仅含 import exports 的真实包，Node 导入得到 42，而 `verifyRuntimeDependencies` 返回：

```json
{"importValue":42,"verifierError":"ERR_PACKAGE_PATH_NOT_EXPORTED"}
```

修正：manifest 保留完整 specifier 与实际加载种类/条件，按发出引用的 require/import 语义验证包内解析；实际解析结果仍须包内且不可回退。增加 import-only 根、深路径以及 require/import 分别映射不同文件的夹具。此发现证明所承诺的 CJS/ESM 支持未完整实现，不声称已安装的某一个生产依赖必然触发它。

## 已确认合理的实现

- 两个 afterPack 都在签名/归档前调用裁剪并继续执行原资源/依赖验证；未降低签名公证、安全或数据持久化设置。
- manifest 覆盖五个固定入口并绑定文件 SHA；packageAt 按调用者 Node 搜索路径读实际 package.json，避免将受限 exports 的 metadata 误判为缺包。required、存在的 optional、非 optional peer 和循环有实现；保留所需包内部资源。
- Next 使用已安装官方实现内联，没有改写业务 handler/NextResponse；根据 metafile 输入收集最近许可并独立保留 Next LICENSE.md，许可字节在复制与验包时校验。
- Next UI config 与 desktop build 均调用完整 generated catalog 校验器，包含 sourceHashes/version/shape/SHA。startup 模块只导入完整 JSON 目录和轻量 command runtime；现有 targeted 构建图验证未导入 Monaco 主体。
- snapshot 使用低优先级，live 高优先级，不再将 snapshot 的旧 defaults 合入 live；live owner 全部撤销可恢复快照，闭包 cleanup 幂等。实际 editor/model 生命周期没有重写。

## 仍待完成的验收门禁

这些是已批准测试契约的执行缺口，不将主代理已明确在补的项目误写为已通过：

1. package/Node 真实 generated Prisma + 原 adapter 事务提交/回滚、关闭、新进程磁盘重开；实际裁剪后包的解析守卫和 Sharp/PGlite 运行资源验证。
2. 两个平台完整 live/generated 行等价、源 hash/SHA/schema/重复 ID 等负例，以及异步初始化取消后的 cleanup 与 unavailable/ready。当前 C02 用例标题提到静态 labels，但只使用新 sentinel ID，尚未断言与真实静态业务 ID 冲突时的 label/scope。DesktopApp snapshot ready 与 editor live unavailable 是两条独立异步写入路径，须用受控时序证明后完成的 snapshot 不会遮蔽已发生的 live 校验失败。
3. 许可缺失/篡改、manifest 篡改/重复入口、缺 worker/入口、两个 hook 顺序和已批准的文件完整性负例，不能只依赖 happy path 的 provenance 循环。
4. 本次正式 build/typecheck、全部活动 unit/integration/browser/packaging，以及本机真实包的快捷键、原生编辑/导出/持久化；启动/首开编辑器/输入/切 Tab、内存、长任务和同算法体积实测。未具备的其他目标系统和发行验收仍单列未验。

`red.tap` 中多数初始失败为新模块尚不存在，C02 另有实际 defaults 行为失败；保留这些原始事实。后续报告应分清行为 RED、模块缺失 RED 与当前 targeted GREEN，不把六项测试通过写为全量或真实业务验收通过。

## 修复复核（2026-10-18）

**R1/R2/R3 均已解决，修复代码复核通过，无新增源代码阻断项。** 本节取代首版“当前不通过”的结论；仍不代替实际包、原生业务、全量及性能验收。

- **R1 已解决**：`plainChain` 在扫描 node_modules 前无条件检查根和祖先路径，拒绝 symlink、非目录及 realpath 不一致；实际裁剪还从受信 project/staging 检查 appRoot。入口、manifest、许可及包 metadata 改用普通文件检查，删除前重新检查 node_modules 根。空 externals 也不能再绕过根链接检查。新增根链接负例断言包外 unused sentinel 保留。
- **R2 已解决**：`createPruneSession` 在空 staging 内 mint 进程内 WeakMap capability，绑定 project、stage device/inode 及输入 manifest 字节。prune 要求本次 capability、未使用、目标位于该 stage，源 manifest 必须存在并同时匹配 mint 时和包内字节；使用后不可重放。两个正式入口在输出写入前 mint session；本地 `--dir` 也使用唯一 staging。已存在包无从在其非空目录取得 session，缺源 manifest 不再降级放行。
- **R3 已解决**：manifest 保留 `{specifier, kind}`；require 与 import 分支分别按 Node 实际条件解析。import 分支使用 Node 24 parent URL 解析，不执行包代码，再确认目标是包内真实文件。import-only 根/深路径正例通过，同一引用改为 require 的反例正确拒绝；原包根 metadata 定位仍支持受限 exports。

独立复跑命令：`node --import tsx --test tests/unit/release-optimization.test.ts tests/integration/release-next-compatibility.test.ts`，结果 **8/8 通过、0 skipped、exit 0**。与主代理 `review-fixes.tap` 的用例一致，本审核另行实际运行确认；未写入或覆盖其证据日志。

### 新增实际包 Worker 用例复核

`tests/packaging/packaged-worker.test.ts` 确实 require 所选包的 `dist/service/index.cjs`，在 Worker 内安装 resolve 守卫，拒绝包外 file module 和非 builtin URL；实际路径通过原 service/RpcPeer 与原 generated Prisma/adapter 访问独立磁盘目录，没有用测试 ORM 替代生产实现。它创建作品/主题、提交模板事务、拒绝重复模板 mutation 后检查原内容，正常 close，再用新 Worker 读取同一落盘数据。代码设计通过；本轮代码审核没有自行运行实际包用例，不宣称其执行结果通过。

范围需准确：新 Worker 是独立 JS/模块生命周期，但仍属同一 OS 进程，报告使用“新 Worker 重开”。重复模板的冲突在 `addPrompt` 首次写入前检查，证明异常未改原内容，不能单独声称已经覆盖“多次写入中途失败后回滚”。可与原有事务回滚套件及真实应用退出/新进程重开证据共同验收；没有要求新增或改变业务功能。

### 剩余实际风险与验收边界

1. 构建/静态/targeted 通过不能证明被裁剪后的全部原业务在 Electron 内可运行。继续执行既定实际包 ORM、原生编辑/快捷键/导出/退出重开、完整回归和包体积/内存/首开与输入响应测量，使用本次唯一输出路径，避免默认路径误选历史包。
2. 前述目录状态异步时序（live unavailable 后 snapshot 完成）与取消 cleanup 仍需既定受控时序测试证明，静态业务 ID 的 label/scope 碰撞也尚未由当前 sentinel 用例覆盖；没有据此宣称已经发生用户业务故障或增设 UI 功能。
3. 未具备的 Windows/Intel Mac、签名公证/下载隔离和真实供应商验证继续单列。当前未发现修复引入关闭安全设置、降低持久化或更改原业务流程的实现。

## 原生离线查询停滞评估与最小修正批准（2026-10-19）

### 结论与来源

**应修正桌面 QueryClient 的网络状态默认策略，最小技术方案与以下用例契约审核通过，可自主按 RED → 修正 → GREEN → 真实包复验推进。** 该缺陷影响已批准的离线本地业务，属于当前验收中发现的兼容问题；本轮只读评估没有修改生产代码。

`src/app/providers.tsx` 当前和 HEAD 均为 `useState(() => new QueryClient())`，该文件、SidebarTree 和本地 transport 都没有本轮优化 diff。已安装的 TanStack `query-core/src/retryer.ts` 在缺省 networkMode 时使用 `online`，`canFetch` 依赖 `onlineManager.isOnline()`；`onlineManager.ts` 默认初值为 true，监听 window 的 online/offline 事件，离线事件后会阻止 query/mutation 首次执行，并可暂停后续 retry。因此它不只是 fetch 失败后重试，而是可能在本地 IPC queryFn/mutationFn 执行前暂停。

真实业务中 `SidebarTree` 通过 `useNovelList()` 获取作品，Provider 包裹整个工作台；`installDesktopTransport` 将同源 `/api/*` 的 fetch 转为 `bridge.request` + MessagePort。上述本地调用不依赖 Internet，却被 Provider 的全局联网状态门控。基线已经具有该策略，当前证据没有表明它由 Next 内联、包依赖裁剪或 Monaco 延迟装载引入。

原生失败证据 `native-business.json` 和 `native-editor-failure-verify.png` 显示设置/完整 419 命令可操作，但作品/指引列表保持 loading，既无 pageerror 也无 HTTP 请求。主代理观察到查询 fetchStatus=paused，与上述机制吻合。另以本机已安装真实 QueryClient/MutationCache 在隔离内存中设 onlineManager=false 做机制复现，未更改生产 Provider，输出：

```json
{"online":false,"defaultProvider":{"queriesExecuted":0,"queryFetchStatus":"paused","mutationsExecuted":0,"mutationPaused":true},"localIPCDefaults":{"queriesExecuted":1,"queryFetchStatus":"idle","mutationsExecuted":1,"mutationPaused":false,"value":42,"mutationValue":43}}
```

该复现仅证明根因和建议策略的库语义，不能代替修正后真实 Provider/Electron 验证。TanStack 初始状态为 true，因此“主机起初离线”和“运行中收到 offline 事件”也须分开测；不能只根据 navigator.onLine 的初值推断全部时序。

### 批准的最小方案

只在独立桌面仓库的 Provider 创建 QueryClient 时配置 `defaultOptions.queries.networkMode = 'always'` 和 `defaultOptions.mutations.networkMode = 'always'`，使真实本地查询、写入及既有重试不被 Internet online/offline 状态暂停。同时明确 `queries.refetchOnReconnect = true`：本机库在 networkMode=always 时会默认将它改成 false，显式保留当前 reconnect 刷新行为以缩小差异。其余 retry、staleTime、focus 刷新、缓存、失效与取消规则保持既有默认/显式配置。

两类都需处理：只改 queries 会留下模板编辑、作品重命名等 mutation 在离线时永久 pending。无需改全局 onlineManager、伪造 navigator 联网状态、逐个重写真实业务组件、增加 loading 层或更换 transport。该配置仅影响本地 React Query 调度；renderer 远程 fetch 拒绝、主进程模型网关的授权/Key/请求失败、零默认模型和离线资源策略继续保留。正常业务的失败必须按原通道报错，不能因 always 自动变成成功。

### 必测契约

| ID | 必须证明的行为 |
| --- | --- |
| OPT-O01 | 使用实际 Provider 创建的 QueryClient 配置（直接挂载真实 Provider 或从其原 initializer 执行，不能在测试里另造一份预期 defaults）。真实库 onlineManager=false 时，未缓存本地 queryFn 与 mutationFn 各按预期执行并完成，状态不是 paused；基线配置在相同条件产生 paused，形成行为 RED。验证配置只覆盖上述最小字段，保留 reconnect 刷新。测试恢复全局 onlineManager 并清理 client，避免影响其他用例。 |
| OPT-O02 | 本地 query/mutation 的取消、既有重试与失效读回继续有效；本地服务断开/显式失败仍按原约定报错，不能静默成功或无限 pending。在线 → 离线 → 在线事件及离线期间 invalidation 都不使本地工作台卡住，不能仅用预填 QueryCache 掩盖查询未执行。 |
| OPT-O03 | 重新构建真实包，在独立目录分别覆盖窗口初始化阶段即 renderer offline、已加载工作台后触发 offline 两种时序，观察 navigator/online事件与真实查询状态。作品/指引列表完成，首开真实编辑器、输入/保存、代表性真实 mutation/失效读回和退出/新进程重开成功。保留原 HTTP 拒绝和零模型条件，并记录原生用例的实际错误/请求。 |
| OPT-O04 | 原有 core/browser/package 回归按改动范围补跑 Provider、业务查询/保存、离线加载相关用例；最终性能/体积数据必须对应包含该修正的新包及其 SHA，不能沿用旧 app 的通过结论。 |

`page.context().setOffline(true)` 只构成 renderer/CDP 离线模拟证据，移除此开关且 HTTP 请求数为 0 只构成“应用 HTTP 拒绝策略下正常本地业务”的证据。两者都不证明整机 OS 断网、主进程与 Worker 全部网络路径隔离、物理输入法或目标机下载隔离已验。原失败记录应保留；未实际执行的 OS/目标系统断网项目继续单列未验，不能因移除开关使测试通过而消除该 Provider 缺陷。

本次同时读取了新增 `lifecycle.tap`（3/3）与 `packaged-orm-3.tap`（1/1）及更新后的 packaged-worker 测试：原 effect body 的失败/取消清理、真实静态 ID 碰撞已有独立记录，ORM 已由两次独立 Node OS 进程各启动包内 Worker 完成写入/关闭/重开。认可这些证据的明确范围；本评估未重复运行原生验收，也未把执行中的其他套件记录为通过。

## 离线最小修正实现审核（2026-10-19）

**Provider 最小修正与新增回归审核通过，无新增实现阻断项。** `src/app/providers.tsx` 只增加 queries/mutations 的 networkMode=always 与 queries.refetchOnReconnect=true，以及说明本地 IPC 调度原因的注释；没有修改原业务组件、缓存/取消实现、联网状态对象、HTTP 拒绝、模型网关、数据落盘或 UI 流程。与前节已批准方案一致。

独立执行 `node --import tsx --test tests/unit/desktop-offline-query.test.ts`，结果 **2/2 通过、0 skipped、exit 0**。测试用 TypeScript AST 提取并执行生产 Provider 的真实 useState initializer，注入本机真实 QueryClient；没有在测试内复制一份期望 defaults。O01 在 onlineManager=false 时验证未缓存 query/mutation 各执行一次且没有 paused；O02 验证原错误对象、AbortSignal 取消、active query 失效读回和重连刷新。原 `offline-red.tap` 为明确行为失败（paused 与缺少显式 reconnect 配置），`offline-green-2.tap` 为 GREEN；中间补等待首次 active fetch 完成是测试同步修正，没有降低断言或改变生产行为。

`tests/packaging/packaging-113-review.test.ts` diff 仅将新增必需资源 `dist/runtime-dependencies.json` 加入原 fixture entries 拷贝列表，全部旧断言保留。该修改恢复完整的验包输入，符合本次新架构，不构成跳过或弱化原测试。首次 package suite 的 48/50 及缺 manifest 原始失败仍保留；本审核没有将尚待完整复跑的 package suite 写为通过。

修正前完整 core 2202/2202 只记录对应版本的结果。最终交付仍需包含新 Provider 的正式 build/新包，并执行已批准的 O03 renderer 两种离线时序、实际业务保存/退出重开及 O04 相关完整回归，更新包 SHA 与性能证据。HTTP0、renderer/CDP 模拟和 OS 断网的范围按前节分别记录，不因本次 unit GREEN 自动提升其他层验收状态。本轮仅追加此审核文件。

## 正文暂存与重开草稿验收语义复核（2026-10-19）

**同意按真实暂存/恢复流程修正原生验收预期，无须修改生产保存或恢复逻辑。** 当前源码不支持把 CmdS 等同于批准/发送暂存修改；要求未发送的 marker 在新进程直接成为正式正文，会测试出超出既有业务契约的行为。复验必须证明草稿实际保留和可读，仅看到正式正文未变还不能排除丢数据。

独立核对的调用与状态依据：

- `src/lib/staged-save.ts` 的 `STAGED_SAVE_ENABLED=true`，且章节 PATCH 属于 CHAPTER_CONTENT 白名单。`ChapterContentPanel.tsx` 的 autosave 经 `apiSend` 调用 `tryStageRequest`；后者把真实修改记录到暂存仓并返回合成回执。`StagedSaveSurface` 的“修改”/“发送”阶段与此一致，尚未发送的修改不能被启动恢复自动提交。
- `DesktopApp.tsx` 的 file.save 调用 `DesktopDraftSession.flush()`，成功提示为“草稿已保存在本机”；session 通过 coordinator flush 与主进程草稿回执确认持久化，没有 confirm/send/approval 的调用。
- `draft-recovery.ts:98` 对 snapshot.autosaves 逐项 retain，合法 autosave 标记为 AUTOSAVE_UNMATCHED；不会用它重放保存请求。已验证 staged sources 可以恢复为待确认数据，但恢复过程同样不发送或批准。
- `SettingsDialog.tsx` 提供“设置 → 常规 → 保留的草稿 → 查看草稿”；`RecoveryDialog.tsx` 的“保留的草稿内容”只读 textarea 经 `recoveryPreview` 提取 autosave pending/failed/inFlight/latest 的 value，允许用户查看、复制或导出。相关正文、暂存、恢复源码均没有本轮优化 diff。

`native-business-final.json` 的前段已记录 before-firstWindow renderer offline、419 快捷键、真实编辑/选区/Tab 保活、undo/redo、CmdS、四格式导出与正常 quit。该次运行随后在新进程要求编辑器包含“优化验证保留段落”而失败，显示原已保存正文；**该报告仍是失败记录，不能追认整轮通过**。源码解释了该断言的预期偏差，尚未独自证明这一次实际磁盘记录中保留了 marker。

批准按同一真实包、独立目录完整复验并另存新报告，必测断言为：

1. 编辑前记录原正式正文，编辑后保留本次完整草稿文本与 marker，CmdS/正常退出均成功。在未执行批准/发送的前提下，新进程通过真实正文读取确认正式原文保持原样，不能因恢复隐式提交 marker。
2. 重开后从真实设置入口打开“保留的草稿”，在真实只读 textarea 可读到该 marker 和相应完整编辑草稿（本夹具远低于 100,000 字预览上限）。不能只检查内存 store、journal 字节或“有 N 条草稿”，也不能在测试中向恢复仓补写 marker。若实际 UI 找不到预期内容，仍按数据保留验收失败调查，不能用本次源码分析豁免。
3. 同次重开验证主题、用户快捷键及默认零模型持久，保留原生菜单/sandbox/无监听与离线请求范围断言。前段编辑/导出检查与上述重开检查一起在新报告完成，完整运行成功后才记对应原生用例通过。

这保持了“暂存草稿持久化、正式内容需原业务确认、恢复不重放”的三项独立保证，没有降低保留用户输入的要求或新增审批行为。原失败报告与复验结果应同时保留；renderer 模拟、HTTP0 与 OS 断网的既有验收边界保持不变。本轮仅追加审核文档，没有修改生产源码或原生脚本。

## 页缓存实现与探针代码独立审核（2026-10-19）

**本轮实现审核通过，无新增代码阻断项；可按已批准方法独占执行 OPT-M03。** 审核范围为 `desktop/service/workspaces.ts` 的新增参数、两份 cache integration 测试、`database-cache-phase.ts`、`benchmark-database-cache.mjs` 及 `packaged-worker-phase.ts` 的包内记录器。M01/M02 的现有 RED/GREEN 日志与源码相符；M03 尚未执行，M04 尚待新包，M05 与全部新包验收均未通过。本结论不将候选32MB升级为最终内存目标已达成。

### 生产边界与真实配置

`Workspaces.connect:298` 的生产 diff 仅将原 `PGlite.create` 调用展开，追加 `startParams: [...PGlite.defaultStartParams, "-c", "shared_buffers=32MB"]`。原 dataDir、relaxedDurability:false、创建/既存校验、锁/租约、迁移、Prisma adapter、池及关闭流程均保留，没有修改默认数组或增加 initialMemory/maximum。所有 inbox/作品连接继续经同一入口；没有配置文件写入或持久化降级。

`database-cache-options.test.ts` 包装真实 PGlite.create、保存调用选项并将原参数透传给原函数，返回真实 engine；从实际 Workspaces slot 查询 SHOW/pg_settings。它验证新 inbox/作品、完整默认前缀及静态数组不变、false 策略、既存作品重开、带注释/无关设置的原 conf SHA 不变。严格同步用例在原 `fs.syncToFs` 前设置受控 gate，证实实际业务写入在 gate 放行前未完成；放行后调用并等待原同步方法，检查每次参数为 false，再注入明确同步错误检查原调用拒绝。错误注入只作用隔离测试，结束前恢复原方法，没有进入生产或性能进程。

已读取 `cache-options-red.tap`（1/2）和 `cache-options-green.tap`（2/2）：RED 的实际 shared_buffers 为16384×8KiB，候选应为4096；GREEN 为4096×8KiB，source=command line。严格同步测试在 RED 已通过，因此不能将它写成本次新修复的持久化缺陷。真实 pg_settings 还记录 wal_buffers 512→128、transaction/subtransaction_buffers 32→16，均为8KiB block；不能声称仅一个有效运行参数发生变化。记录的 WASM buffer 197,722,112→134,217,728 字节属于该隔离引擎观测，不能代替整应用5秒总WSS或表述为新的WASM上限。原默认-F对应 fsync=off 继续存在，没有在此轮新增。

### 超缓存正确性与 RED 身份

`database-cache-phase.ts` 通过实际 Workspaces、原 generated Prisma/adapter 创建表和业务根，EXTERNAL 属性禁止 TOAST 压缩。1027行分批写入、17行分批完整读取，精确逐行内容与含长度的 SHA256 校验覆盖最后不满批及中文/emoji/引号/反斜线/换行。固定seed点读、真正提交、实际 UPDATE/INSERT 后抛错回滚、重复键拒绝后原内容、清除已提交测试行和最终完整校验均有断言；没有只靠 count 或同进程对象证明落盘。

`database-cache.test.ts` 依次 execFile 三个独立OS进程执行 seed/reopen/fallback，检查三个pid不同、配置SHA一致。前两阶段实际 Workspaces 的 inbox/作品/第二作品为32MB；fallback 不传候选 startParams，以原默认128MB重新打开三库，完整读回大表并核对另外两库的隔离标记。conf 中保留原128MB及公开注释/无关设置，没有为通过回退而改写候选数据。

已读取 `cache-data-red.tap/json`、`cache-data-green.tap/json`：RED 在完整三阶段数据操作之后因128MB≠32MB失败，属于行为RED；GREEN为1/1，三个实际pid为83163/83263/83290。各阶段大表内容67,306,534字节、table70,320,128字节、TOAST70,238,208字节、index40,960字节，实际完整读取的数据超过32MiB，不是大索引或可压缩逻辑长度冒充。完整checksum均为 `835868a7ef1b16795d95dd931be08585008837b10eef04e779b076e58c5379b4`。`cache-data-harness-1.tap` 的目录授权身份失败原样保留，修正为真实 DirectoryAuthority 授权流程后才取得上述行为RED；不能用该夹具失败替代行为RED或隐去其记录。

### M03 统计、执行方法与范围

`benchmark-database-cache.mjs` 在运行前落盘固定ABBA=[128,32,32,128]、四个独立进程、warmup/扫描次数、混合操作及50/20ms门限。它将同一正常关闭的公开seed数据库复制到四个独立根，逐轮 await 进程结束，不并行采样。每进程先记录首次点读/首扫，再固定64次点读与一次全扫warmup，随后三次正式扫描取进程内中位数；配置聚合使用两个进程值的中位数（即两值均值）。混合批次固定32次点读、16次真实 UPDATE 提交、16次写后回滚，记录全部操作、组成耗时及最终完整checksum，保留开库/初次读取/warmup/同步/WASM数据。

实现的门限准确为 `candidate - baseline <= max(baseline * 0.10, absoluteMs)`，scan50ms、整批mixed20ms，所有门限通过才 report.passed=true，否则退出1；任一子进程异常会保留已有轮次与error且不能产生通过。固定seed、操作次序、聚合方法与224一致，没有挑最快扫描或把同进程重复扫描当独立样本。独立执行 `node --check scripts/benchmark-database-cache.mjs` 退出0；这只是语法检查，本审核未执行性能或数据库负载。

执行时须使用新的报告路径保存完整命令/退出码和失败输出，不覆盖本批/旧批失败；按声明独占，不与构建、全量回归或其他数据库/原生性能探针并行。这里的“cold”仅指本次新进程打开该复制根后的首次读取，且首扫之前已有一次点读；不构成OS冷磁盘/缓存清空证明。扫描耗时包含 adapter、载荷校验及checksum，混合耗时包含既定断言；比较口径相同，但不能将结果称为纯PostgreSQL执行耗时或任意规模业务的性能保证。seed写入耗时单列，不作为四轮稳态写入比较；提交/回滚与整批mixed才是本批对应写路径对照。

### 包内只读记录器及尚待验收项

`packaged-worker-phase.ts` 的 recorder 安装在隔离测试Worker，先调用真实包内 PGlite.create（原this/args），对返回的同一engine执行只读 pg_settings 查询，记录实际options/defaults/WASM，再原样返回该engine。没有替换数据库、adapter、事务、fs或业务结果；原包内模块解析守卫、真实service/RPC事务内容、关闭与两个独立OS进程重开断言保留。包内CJS main与service require使用同一已缓存PGlite导出；若实际记录不到inbox/作品，profiles>=2会失败，不能仅凭顶层require成功放行。

记录器只属于测试helper，不进入生产构建，也不能用于整应用性能采样。当前源码设计通过；仍需对含32MB的新包实际执行并保存profile结果。默认fallback及较大数据正确性证据不代替真实包、原生正文/保留草稿/四格式导出或原锁/迁移/池/退役回归。接下来仍需 M03 对照、新build/两类typecheck、新包与完整unit/integration/browser/package、原生流程，以及预声明9对18次5秒总WSS和两侧中位数至少下降10%的M05。旧2204/604/50、旧原生与旧包指标均保持原版本身份，旧WSS失败继续保留。

本次审核生产文件 SHA256 为 `7b2a77da3b585ef86085f09fd0e6fca9b1710b990ba0552461f4c15ec9a5a2cb`；性能脚本为 `e70ebf4322c0436e6b14ff687da89ff2b25b92b5b7d29915bd2053a9613ed441`，数据phase为 `f7c33ba60fe87f16ec9aad22d5f532cd699ffb7fb4a2633b20943336094f1409`。上述GREEN来自独立读取主代理/实现代理保存的真实输出，本审核没有重新运行M01/M02或未完成项目。仅追加本审核文件，未修改实现、测试、其他文档或启动重负载。

## 包内记录器引导实例修正复核（2026-10-19）

**测试helper修正审核通过；新包完整package复跑及持久化engine记录的现有证据核对通过。** 原 `package-cache-tests-harness-failed.log` 为49/50，包内Worker用例等待80秒后被SIGTERM终止，stdout/stderr为空；该次仍是失败记录，不能追认通过。

独立读取已安装PGlite0.5.8的实际CJS初始化代码：首次建库时先复制options，设置 noInitDb=true、dataDir/fs/extensions/loadDataDir清空，再递归调用PGlite.create构造initdb引导实例。它不执行普通数据库启动/数组类型初始化等SQL就绪路径。原recorder对每个create返回值立即查pg_settings，因而也误查了这个内部引导实例；不能将此测试探针造成的挂起写成生产数据库无法离线启动。

修正保留 `await Reflect.apply(create,this,args)`，仅在返回的options.noInitDb为true时立即返回原engine；正常持久化engine仍执行原只读pg_settings和WASM观察，再返回同一engine。没有跳过生产inbox/作品或改参数、数据库/adapter/事务/fs/业务结果。父测试新增t.diagnostic只保留原helper输出的实际profiles，原事务、重复拒绝后原内容、正常关闭、新OS进程重开及包外解析守卫断言均未减少。本轮生产diff仍只有已审核的32MB参数，不要求仅因测试helper修正而重建相同app字节。

已独立解析完成的 `package-cache-tests.log`：完整50/50、fail/cancelled/skipped/todo均0。write/reopen两个独立OS进程的实际记录分别为3/2个持久化engine；全部options保留完整defaults前缀再追加32MB、relaxedDurability=false，shared_buffers=4096×8KiB/source=command line，WASM各134,217,728字节。extra write记录不改变原语义，不将它写成3个独立作品。包路径为 `release/.staging/adhoc-arm64-JS63QP/volume/玄印写作.app`；独立核对其五入口和包内manifest均与当前dist逐字节/摘要一致，新service SHA为 `b46ebd24ffffcfb0dce0a134c6e9be99ef37a17b2cc00695c42d8414978dfb7a`。本次是读取已执行结果，没有重跑package或原生负载。

### 类型注解与既有M03身份

`database-cache-phase.ts` 另仅为两处reports数组增加 `Record<string,unknown>[]` 类型注解。独立移除这两处注解重建旧源文本，得到原已审核源SHA `f7c33ba60fe87f16ec9aad22d5f532cd699ffb7fb4a2633b20943336094f1409`；当前源SHA为 `413c175d8832aa6647600976885e949351a5be628424619b0745e96beac22306`。独立以TypeScript transpileModule（ES2022/ESNext）比较前后发射JS逐字相同，SHA均 `ee4e0220b7cf5d61f9513af1a3b1ec7663a5a08104852c1aa9b026ceae8bb097`，与 `cache-types-only.json` 一致。该证据解释M03报告仍绑定旧TS源SHA的原因，旧报告不改写，不另选有利性能轮次；新完整回归仍需绑定当前类型修正后的源指纹。

新package50/50与包内32MB记录通过并不自动完成新core/browser、真实原生编辑/完整草稿/导出、首编输入及9对5秒总WSS门禁。最终228/227/229及台账仍须分别核对这些未完成事项。本节只追加本审核文件，没有修改helper、生产代码或归档。

## 候选3 空PG模板实现独立审核（2026-10-19）

范围：新增shared验证器、service loader、构建生成器、main/service启动接线、构建/prepare/inspect/builder正向清单、Workspaces第三Blob及empty分支、M06/M07和大数据fixture、startup fixture与packaged-worker观察。**已审实现的主要新旧库边界合理；首轮发现的父目录运行库回退已修复。最终实现审核仍待本节列明的M06恢复反例等通过条件闭合，不将部分GREEN作为完整候选验收。** 本审核未改产品/测试，没有重新执行数据库、构建、原生或性能负载。

### S1 · 父目录PGlite回退：发现与修复

初版 `desktop/service/database/seed.ts` 仅由createRequire(import.meta.url).resolve推导packageRoot，没有绑定本次appRoot。独立仅执行Node解析、未创建任何文件的反例：以不存在的 `release/.staging/review-only-no-files/volume/Review.app/Contents/Resources/app/dist/service/index.cjs` 为createRequire入口，PGlite仍解析为本项目node_modules。这不能证明包内运行资源齐全，违反222的父目录回退拒绝边界。

已复核修正：正式loader默认expected为manifest所属appRoot的固定 `node_modules/@electric-sql/pglite`，要求expected realpath等于其规范绝对路径，并与实际require解析的realpath强相等。service正式调用只传manifest路径，没有fixtureRuntimeRoot override；source资源夹具才显式绑定自身installed root。正向测试仍使用实际库/归档，新增“空app拥有同版完整manifest/archive但缺自身runtime”拒绝，`seed-resources-green-2.tap` 15/15。**S1在代码层已解决**；没有增加可由renderer控制的运行库回退。

### 已确认的实现约束

- `desktop/shared/database-seed.ts` 的严格schema限定format/version、固定归档名、有限大小/合法SHA和严格嵌套字段；指纹来自固定installed资源遍历，不按manifest中的路径去读取宿主文件。它绑定package.json及所有实际CJS/WASM/data，必要核心资源缺失拒绝；regular文件、大小、realpath校验拒绝文件及祖先链接。归档长度/SHA不符拒绝，只读返回Blob，没有数据根IO。
- `scripts/database-seed.mjs` 从同installed PGlite无dataDir的新内存库生成，没有用户根或旧归档输入，也不导入应用service。原default PG配置与strictfalse保留；dump后原engine正常关闭，再真实内存loadDataDir校验vanilla profile并关闭，之后发布资源并重新校验。build:desktop在运行入口构建前每次生成；prepare只校验，普通build→start有资源。生成/关闭/校验失败会拒绝构建，不继续进入签名/归档。
- main唯一普通service Worker工厂固定传appPath/prisma路径；service对正式bootstrap缺seed路径失败，loadDatabaseSeed在startOwnedRoot前完成。原readRootStartup、稳定锁/恢复/初始化次序保留，校验错误不能进入recover/resolve；无seed兼容仅保留原bootstrap-free隔离fixture。原Worker/global网络拒绝、模型网关或业务路由未变化。
- Workspaces仅增加private readonly可选Blob及局部emptyDatabase标志。原create=false先validateDatabase；create=true也先lstat/readdir，非空先原验证，只有missing/空目录设置empty并附loadDataDir。原授权/品牌/规范路径/storagePath/租约检查仍先行，原migrateDatabase、adapter、作者upsert与关闭/失败释放保留；没有复制/擦除/覆盖已有数据库、提前应用迁移或预填业务数据。
- builder/inspect只额外放行两个精确prisma资源，原PG_VERSION/.db/作者数据排除不变；输入与包内资源字节校验、PGlite运行指纹验证位于原完整验包链。三个严格启动场景fixture按新固定seed契约补输入，原恢复断言不减；packaging-113 fixture只增加必需资源拷贝。`.gitignore`只忽略两个生成物，没有忽略新增实现/测试。

### 真实新旧数据与记录器复核

M06初始 `seed-resources-red.tap` 包含模块缺失RED及实际旧worker ready≠failed的行为RED，二者身份分开。后续14/15项GREEN为阶段结果；当前 `seed-resources-review-green.tap` 已26/26，新增bytes零/非整数/非有限/超限、hash形状、嵌套额外字段、foreign路径、祖先链接/大manifest等明确拒绝原因。生成器亦已补非系统关系/过程、自定义数据库/角色为空的SQL断言和重导入profile比较；这些是构建保障，不宣称运行时遍历用户库判断空模板。

`database-seed-workspaces.test.ts` 确实使用真实PGlite生成的公开vanilla Blob并将同一对象送入实际Workspaces/原Prisma；fixture归档先完成才安装观察器，真实this/全部args透传且返回原engine。noInitDb调用记录在委托前，内部引导实例不执行SQL，不会因“跳过观察”虚报零次。两根/各两作品、原迁移checksum、固定LOCAL_AUTHOR_ID、模板库、实际章节提交/写后rollback/duplicate后正文、实时createdAt和独立应用/作品/内容ID都有断言；重开同根不附seed。

已读取 `seed-workspaces-red.tap`（2通过/2行为失败）：新库loadDataDir=0而应6，显式empty partial=0而应1，真实旧路径递归noInitDb；现有/损坏保留断言原已通过。`seed-workspaces-green.tap` 四完整用例4/4：六新库复用Blob且无内部引导engine、既有128MB配置/内容/迁移记录保留、create=true但PG_VERSION非空仍不导入、显式空partial可导入、迁移失败证据保留，以及损坏作品/ready inbox/未知非空inbox/链接目标拒绝且全部原字节未改。测试自己删除隔离partial数据库以建立空目录前提，不是新增产品自动清除行为。

`seed-data-green.tap` 保留原plain三OS路径并增加seed三OS路径，2/2。独立读取两份JSON：plain pid27056/27248/27292，seed pid27320/27452/27481；均1027行、67,306,534内容字节、EXTERNAL存储、TOAST70,238,208字节，完整checksum `835868a7ef1b16795d95dd931be08585008837b10eef04e779b076e58c5379b4` 跨seed/reopen/default128 fallback一致，三库conf SHA不变。seed阶段记录三次loadDataDir且noInitDb为0，reopen均无seed；fallback用原默认128MB独立读回。该证据不是内存/性能样本，不替代真实包。

packaged-worker helper已改为实际所选包的固定seed路径；仍原方法/参数/engine透传，对noInitDb仅记录，不发SQL，随后明确断言其为0。首次write恰好两个新库附seed、reopen为0，其他32MB/defaults/strictfalse、原RPC业务、重复拒绝后原文、两OS进程和包外解析守卫保留。源码设计合理；候选3新包尚未运行该helper，不使用候选2的50/50及3/2 engine profile充当新seed包结果。

### M03函数等价与尚待闭合项

独立运行提供的纯转译比较脚本：先核对旧完整发射JS的SHA `ee4e0220b7cf5d61f9513af1a3b1ec7663a5a08104852c1aa9b026ceae8bb097` 和旧source SHA `f7c33ba60fe87f16ec9aad22d5f532cd699ffb7fb4a2633b20943336094f1409` 绑定原cache-performance输入，再将当前整模块ES2022/ESNext发射JS解析为AST，用removeComments:true的printer比较13个函数。全部规范化函数文本逐字相等，各SHA与 `seed-m03-equivalence.json` 一致，benchmark脚本SHA仍 `e70ebf4322c0436e6b14ff687da89ff2b25b92b5b7d29915bd2053a9613ed441`。先前按逐函数单独transpile/getText得到的不同hash属于打印方法差异，没有据此判逻辑改变；这里也不声称整个新增模块JS逐字未变。旧M03保持原工作负载/样本身份，不重跑挑样；新seed分支性能由后续新包M05/首编输入实测。

剩余已批准执行门禁：M06仍需真正既存根/恢复日志的坏资源前置失败及完整快照不变反例和有效资源恢复控制，不能仅凭新空根无marker就认recover前置已实测。生成器的 `NOT LIKE 'pg_%'` 中下划线为SQL通配符，应精确识别保留pg_前缀，以免将pgfoo式非系统schema/role也排除；这是vanilla断言精度，不据此推断当前fresh-memory seed已含用户数据。待上述补齐复核后再关闭实现审核；完整新build/类型/core/browser/package、同新包原生与新九对仍全部另验。只追加225，未改实现或启动负载。

### 候选3最终实现复核关闭

**上述实现审核待补项已全部解决，候选3代码审核通过，无剩余实现阻断项，可进入完整新build/打包及全量验收。** 这不表示候选3已经满足M05或最终用户目标。

生成器全部相关schema/关系/过程/role检查已由SQL通配匹配改成精确 `!~ '^pg_'`，自定义database/role及非系统关系/过程为空的断言仍在，真实重导入profile比较不减。`seed-resources-final-green.tap` 完整26/26、零fail/cancelled/skipped/todo，保留初始模块缺失/行为RED及14/15/26阶段日志。shared正向验证、S1包根强绑定、main固定路径/service前置与Workspaces新旧选择均保持前节已审核实现。

新增 `database-seed-recovery.test.ts` 不是模拟startOwnedRoot：它用真实关闭的Workspaces/模板库、实际DataRootManager迁移hook在pointer-written后抛RootMigrationCrash，得到verified journal、已指向target的pointer和完整源/目标数据库。以相同真实编译service启动坏seed，断言生产startup envelope恰为ROOT_STARTUP_FAILED且RPC ready因资源错误拒绝；之后才比较整个base目录快照。有效seed在同一个migrationId继续真实recover，journal变complete、原managed根按原流程清理，并从实际RPC读取原公开模板ID/内容/version。该正向控制证明此前确实存在本应修改/清理的可恢复状态，不是对无关空目录做不变断言。

独立解析 `seed-recovery-green.json/.tap`：1/1，UTC17:18:15.733～17:18:48.243；坏seed前后2609文件的路径/长度/SHA及60目录逐项完全相等，清单SHA均 `992539aa156ede85f59790d1048eba2892bdd726b7f76e710239217f40e4605a`，migrationId `8e589a8a-8bf3-4d4e-9b87-7ffea79b532a` 的正向控制完成，原模板 `cmve3a2g9000t6q6v12ggg4ht` 保留。没有重新读取已清理的临时数据库来伪造复验，也没有自行运行该负载。

本次冻结生产源SHA：Workspaces `00f8427d670f677b36881afcc427fd1b827970dd9271dafbb096b9409504c2ce`；shared validator `04d1340019581bffadbea95e969a73d956406130be872951b872253c157f6015`；service loader `8e2726c3fcacb567b4f86860f2b65be995ac3f69f4fe523701eff9333ae85617`；generator `31c2f68f3672e774626e2541cd7a81ac3782500f739d77eaf8cf0509d2c368e3`。最终套件应按其当前完整源指纹执行，不能把候选2的2207/604/50、原生或九对结果移作候选3通过。M03规范化函数等价证明与旧JS/meta已独立核对；归档复现脚本仍应指向保存于evidence的副本，避免未来依赖/private/tmp存活，这不改变已完成的比较或要求重跑性能。只修改审核文档，没有实现改动或重负载。

## 打包器元数据规范化兼容修复复核

**修复方向与当前实现通过，无新增阻断，可重建完整新包。** `package-seed-metadata-failed.log` 保留完整UI/desktop构建后、实际afterPack验包以DATABASE_SEED_RUNTIME_MISMATCH拒绝的失败；stage `adhoc-arm64-yMEAlE` 不补写/覆盖，也不能作为成功包。

独立仅比较该失败包中实际PGlite package.json与installed版本，差异准确只有顶层scripts/keywords被electron-builder删除；在两侧删去这两个字段后，JSON.stringify输出逐字相同，包括其余对象键序。本轮不是放行未知版本或忽略全部package.json，问题来自原始metadata字节被已知打包步骤重写。

`databaseSeedInputs` 现在只对package.json先JSON.parse、delete顶层scripts/keywords，再JSON.stringify后计算SHA；不递归删除字段、不排序对象或替换runtime元数据。name/version、main、exports及条件优先顺序、依赖/平台/其它字段仍进入指纹；其余CJS/WASM/data继续按实际原始文件字节SHA验证。该运算不写回installed或包内metadata。manifest新增必需固定literal `fingerprintFormat: runtime-metadata-without-scripts-keywords-v1`，generator与严格loader一致，缺失/未知编码拒绝，不静默猜测旧指纹。其余归档长度/SHA、包根、链接与pre-startOwnedRoot校验不变。

新增回归复制真实installed PGlite完整树，只删除这两字段后用实际readDatabaseSeed成功返回Blob；同一副本修改main后仍明确DATABASE_SEED_RUNTIME_MISMATCH。`seed-resources-metadata-green.tap`完整27/27、零fail/cancelled/skipped/todo，原所有资源反例仍在。独立node --check generator退出0；没有重新运行数据库或打包负载。

本节替代此前“package.json原始字节SHA”的单项表述：它现在是明确编码的运行元数据指纹，archive及其它运行文件仍是原始字节指纹。新增编码/实现使前节shared validator与generator的源SHA失效，最终新build/完整回归/M05应绑定新实际源指纹及新唯一stage，旧失败证据保持原身份。不能用27项资源GREEN或旧完整构建替代后续新包全量/原生/性能验收。本次只追加审核文档。

## 挂载路径别名与正式appRoot规范化复核

**宿主验包及main的两处根路径规范化修复通过，可继续新的完整build/打包及回归。** `package-seed-mounted-alias-failed.log`保留第二轮完整UI/TypeScript/desktop构建及后续流程，最终在DMG挂载资源复验因DATABASE_SEED_UNSAFE失败；stage `adhoc-arm64-GNLLNd`仍是失败样本，不能因较早构建/afterPack/签名步骤成功就改记完整打包通过。

独立查询本机tmpdir为 `/var/folders/.../T`，realpath为 `/private/var/folders/.../T`。withMountedAdhocDmg使用tmpdir建立只读挂载目录；verifyAdhocDmg已先校验实际app目录、canonical mount边界与原签名/资源检查，再将别名形式的appRoot传给verifyPackagedDependencies。新seed regular检查会将这种宿主路径别名也判为不规范，符合失败栈；这与包内某个资源文件是外逃链接不同。

host修复仅在 `verifyPackagedDependencies` 入口先 `appRoot=await realpath(appRoot)`，与原verifyProjectResources/inspectPackagedApp先封规范根的方式一致。后续所有读取及探针以该同一真实root为准，资源regular、包内runtime指纹/链接、no-fallback及readonly mount/签名验证均未放宽，没有修改被挂载包或用户数据。

正式main也在唯一普通Worker工厂由可信 `app.getAppPath()` 取得 `realpathSync` 的applicationRoot，再派生migrations/seed固定路径，避免合法app路径别名触发同一误拒。该修改不处理/放宽用户dataRoot、作品路径/品牌/租约；包内资源或node_modules子路径若为链接，仍由原严格校验拒绝。realpathSync沿用已有import，没有引入renderer输入、环境回退或新业务流程。

独立node --check host脚本退出0；没有执行挂载/签名/原生或数据库负载。因包含main产品源码变更，先前“只修host、五入口字节不变、直接pack已构建资源”的提议已撤回，不按它验收。下一轮应实际完整 `npm run package:adhoc:mac`，生成新的seed/五入口和唯一stage，并完成既定全量/真实包/性能门禁。历史两轮完整build成功可以分段记录，其各自后续打包失败也保留；不能将分段状态拼成一条未执行的全绿命令。本次只追加代码审核文档。

## 首轮完整core暴露的源码抽取fixture修正复核

**两份fixture修正审核通过，可重新执行完整core；没有产品/包/五入口改动或原安全断言削减。** 首轮完整core296文件、2235/2240、fail5、exit1、changedInputs为空，原始JSON/TAP/-run.log已另存 `core-seed-fixture-failed.*`，保持失败。失败栈分别是未注入realpathSync、真实fs尝试访问虚拟/bundle，以及ready在新增资源校验/当前模板库依赖之前未进入原close场景；不将这些fixture缺失误写为数据库内容损坏，也不追认该整轮通过。

`root-startup-main.test.ts` 继续抽取实际main函数体，只增加realpathSync绑定，明确只接收虚拟/bundle并返回/canonical/bundle；新增workerData migrations和seed均使用该canonical根的断言，原worker→barrier→sessionData→ready完整trace、失败不建后备session及源码同步屏障断言均保留。`root-startup-review.test.ts` 的实际fs场景将appPath从不存在的/bundle改为真实cwd，仍使用真实realpathSync，不替换用户根/session安全验证。

RS67-09继续执行实际service ready initializer、真实startOwnedRoot和可控Workspaces.close门。它现在提供实际loadDatabaseSeed及有效本轮build资源，再让当前localTemplateLibrary.initialize明确抛出原合成私密sentinel；新增templateAttempted=true证明失败确实到达目标阶段，不能以资源/未定义依赖的先行失败冒充清理覆盖。旧prisma/PROMPT_TEMPLATES模拟没有当前初始化依赖的同等保证，替换为真实调用处的控制更准确；Workspaces仍是原有隔离清理fixture，未称真实数据库引擎故障注入。

本审核指出，真实资源读入后继续100×1ms轮询closeStarted会把机器负载混成清理失败。现已改为close入口resolve的enteredClose事件，最多5秒只作测试诊断超时并在finally清timer；事件到达后，closeStarted/templateAttempted、关闭释放前settled=false、安全ROOT_INITIALIZATION_FAILED且不包含sentinel、前后均不adopt等原断言全部保留。该同步修正不更改产品超时或放宽关闭次序。

已读取最终 `seed-startup-harness-final-green.tap`：两个完整文件13/13，零fail/cancelled/skipped/todo；先前专项green及首轮完整失败均保留。专项只证明这些修正，完整2240 core、新包/package、native/browser及新M05仍须按当前输入重新完成；不得把13项GREEN加到2235个旧成功项拼成整轮通过。本次只读diff/原始日志并追加审核，没有执行测试或改实现。

## 旧集成测试的构建副作用隔离复核

**新增helper与三个集成文件的修正审核通过，无实现阻断，可按当前冻结输入重新执行完整core及package。** `package-seed-input-changed-failed.log/.json`仍保留47/50、fail3的整轮失败：旧测试导入完整build-desktop后重新生成seed，当前prisma输入与已签名包不再相等，静态验包正确拒绝。包内实际Worker/Prisma/seed用例通过不能把这一整轮改成50/50；本次也没有通过放松静态校验或修补旧包来解决差异。

`tests/fixtures/build-service-worker.ts`直接构建实际desktop/service/index.ts，bundle/platform/node24/CJS/sourcemap/metafile/packages、import.meta.url define/banner和bundleNextServer插件均与正式service构建相同。该插件仅解析官方Next入口；helper不导入完整构建脚本、不生成routes/catalog/seed、不写五个正式dist入口或runtime manifest。每个文件拥有dist/unique-test-worker-UUID目录；成功在after清理自身目录，构建失败也清理同一目录并重新抛出错误。它不是mock Worker，也没有增加业务或运行库后备。

conversation-worker-lifecycle、desktop-worker、local-work-images三份diff仅增加helper/after、共享本文件的构建Promise，并将Worker入口换为该次实际构建的entry；其原workerData、所有业务/安全断言、超时、RPC和隔离数据根关闭清理保持原样。这些原用例继续覆盖bootstrap-free兼容入口的真实本地业务；不将其视作正式main固定seed路径或打包资源证明，后者由原M06/M07/M08及包内用例另验。

已读取三个完整文件运行的 `isolated-worker-green.tap`：5/5，零fail/cancelled/skipped/todo，duration_ms 15494.339791。before记录UTC17:36:34.188，after记录17:36:56.274；十项输入（五入口、runtime manifest、两seed资源、routes及catalog）的路径/bytes/SHA逐项完全相同，changed=[]、remainingIsolatedDirectories=[]、unchanged=true。日志中的MODEL_NOT_SELECTED属于原无模型任务场景，不把它描述成真实供应商请求通过。本审核未重跑数据库/构建负载。

`seed-built-inputs-restored.json`记录后续UTC17:37:15仅从同一个不可变已签名app恢复两项忽略的公开生成输入，时序在上述隔离前后测量之后。恢复后seed manifest SHA为 `67d77fc901083950d082b5f8344e3087885230e1beb61c2d8c93dbc71627b952`，archive为 `af7360706ee594c97ed1fb1acbd0b212e8df1ac3e46d72097d632ff143ed95e7`；五dist入口和runtime manifest仍按记录逐字等于同包。该操作恢复验收输入身份，没有修改源码/app/归档，不改变seed每次正式构建生成的契约；此前失败和isolated测量仍绑定各自原SHA，不追认成最终包通过。完整core/package、之后完整browser/native及新M05仍须真实完成，不能把5项GREEN或恢复记录代替最终整轮。本次只追加审核文档。

## OPT-U02 选卡子提交时序实现审核

**ChatPanel/CandidateActionPanel及新增真实组件用例审核通过，无实现阻断，可纳入新的完整构建与验收。** 仅可选布局通知、共享高度基准和原RO接线改变；没有改选中/发送/问答/采用等业务动作、查询数据或界面文案/布局，没有放松原CES-10a/b/c。

CandidateActionPanel在所有有效commit的useLayoutEffect中，active时调用可选onLayout；hook位于条件return之前，未违反hooks顺序，其它未传回调调用者保持原行为。ChatPanel的稳定callback读真实dock/list，先将offsetHeight写入同一带dock身份的ref，再在同dock、正delta且原nearBottom=true时调整scrollTop。初挂ref=null只建立基准；parent原初选/换卡layout仍最小reveal，随后记当前高度，因此不会在首次mount凭空补偿。子query独立commit直接补偿，随后RO读同一已消费高度得到delta0；缩小只更新基准，上翻时也只记高度。回调没有set业务store/query，scroll事件沿原handleScroll处理。

showCardPanel=false的layout清空ref；RO只有observing且当前ref.dock准确相同时才调用共享函数，cleanup先置false再disconnect。隐藏commit到passive cleanup间，null guard阻止旧回调污染基准；重开时即使同一个dock DOM仍保留，使用的是本次共享当前高度而非旧observer私有高度。parent注册RO未再覆盖child已消费高度；卸载无额外定时器/监听器。未发现双补偿、旧高度跨关闭复用或阅读阈值改变的代码路径。原smooth scroll及选择最小reveal不变，不能把本修复描述成关闭平滑滚动获得通过。

`ces-child-layout-red.tap`完整新增2项1通过/1失败：原实现在首次子增长MO微任务中previousDockHeight135→365，组卡529.09375～750.234375而listBottom535.375，形成明确业务RED；上翻护栏原已通过，仪器错误不充作RED。fixture只为实际候选API增加defer/release，与原conversation gate共用受控机制，确保真实loading/完整选项分开提交。MO点击前安装，只读取实际DOM/geometry、增长数组必须非空，成功/失败finally断开；没有拦截RO或通过迟等重测替代原首次记录。

已读取 `ces-child-layout-green.tap`完整原文件30/30、零fail/cancelled/skipped/todo，duration_ms42442.011333。新增10d断言首次增长已可见、offsetHeight正增量只一次、后续RO不重放及Esc隐藏/缓存重开；10e真实上滚500px后释放详情，MO和随后帧scrollTop均保持。10e允许原选中卡离开屏幕以阅读历史，这是上翻阅读的真实情形；原10b另保留组卡完整可见/余量足够时零扰动，二者共同覆盖224的阅读护栏，不额外强迫上翻后选中卡必须可见。新例未修改原10a立即stage1或10b/c断言。本审核只读diff/日志，未自行执行浏览器。

## OPT-U01 Drawer容量准备实现审核

**useContentTabStrip最小diff及新增content-tabs-preparation.test.ts审核通过，无实现阻断。** 产品只在原capacity写入前读已应用CSS属性，原setProperty照常立即执行，再读同一CSSOM规范值，以前后相同组成capacityReady，最终return原ready&&capacityReady。原工具flags、overflow/reveal/拖拽、字体/RO均保留，不改owner动画/CSS/业务面板；容量改变当轮false，稳定再次prepare才true。前后CSSOM同编码避免未规范化小数严格比较导致永久等待，未扩大原几何容差或添加固定帧/sleep。

新测试运行真实React/ContentTabs/interaction context取得原callback，加载原desktop.css，实际工具DOM和浏览器矩形参与测量；仅隔离无关正文业务，不mock几何或复制measure。一次同步收窄+flushSync真实提交compact，第二次flags已匹配而实际capacity改变，明确要求false；第三/四次稳定true。另一例在同flush内两次调用证明capacity相同但未提交flags仍false。三种真实caption缩放×单/7长标题、五个亚像素宽度顺序共六例，最多12次原prepare、连续两次true且完整快照相同，不因等不到而空通过。同步有界循环属于测试观察，不进入产品准备逻辑。

`drawer-preparation-red.tap`8项7通过/1失败，失败正是matching flags时第二次返回true；`drawer-preparation-green.tap`完整8/8、零fail/cancelled/skipped/todo，duration_ms3990.0145。原CD-03和共享逐rAF helper无diff，相关完整布局/业务文件、类型检查尚按主代理实际状态继续；固定诊断未重捕原可见28px的限制仍在，不将新契约GREEN夸大成旧首帧失败唯一因果已证。两处代码审核通过允许新完整build/唯一包及全部验收，不把这些局部GREEN拼入旧602/604或提前启动M05。

## layout候选证据脚本增量与预声明

只读逐行diff三个ignored脚本与保留的seed版，变更确为输入/输出报告tag从seed到layout及新九对默认batch；finalizer的类型日志也换成本轮layout名。原9对AB/BA、18次全保留、5秒总WSS、两侧九值中位/至少10%、完整suite/当前源码清单、包路径/五入口/两seed开始末尾SHA与失败保存门禁不变。三个node --check均退出0，未执行采样/metrics/finalizer或读取大归档。

| 本轮脚本 | 预声明SHA256 |
| --- | --- |
| memory-nine-pairs-layout.mjs | fc98d82e2ac3bba6922d588858b8e59008f23e5e01d6e9a6bc3763f2e032a6a7 |
| artifact-metrics-layout.mjs | eea31981ba0b56ad3e7025789570a2fee8effde34fb2b35d654d559cdcc71de0 |
| finalize-layout-verification.mjs | 2e2ae8d088381efa22a500ca5c7e86e596ec3b6c5e3a3175d314eeae1a238ab8 |

以上增量编排可用，但当前没有最终layout包/完整suite/性能结果，不批准提前执行。finalizer是证据装配门禁：它自动核验体积、WSS、JS下降及各三轮成功/同native脚本，并没有自动裁定ready/longtasks/首次编辑/输入是否实质回退。实际指标仍须按原方案独立比较并写明取舍，不能仅凭该脚本passed就称所有性能目标完成。后续final report/227/229/台账必须绑定同一个新layout包；旧seed完整失败及未执行九对保持原身份。最终脚本若再变化，应在采样前记录新SHA及差异，不沿用本表冒称同版。本次仅追加225。
