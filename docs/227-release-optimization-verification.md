# Release 优化测试与测量

## 收尾结论（2026-10-19）

用户要求“优化到目前已经可以了，直接收尾吧”。当前最终交付为layout候选（imI2oy / 589c3f46），功能验证通过：core2240/2240、browser614/614、package50/50、新包原生流程、构建及两typecheck通过，1287输入同版。app减少52.7%、ZIP减少43.6%；固定九对18次ready缩短10.0%、长任务减少42.7%，但5秒总工作集861424→888592KiB（增加3.15%），原内存门禁失败。最终首编/输入3+3未执行。按用户要求停止追加优化并收尾，不能宣称全部原验收目标已通过。完整最终结果见[229总结](229-release-optimization-summary.md)与`closeout-verification.json`。

以下按时间保留调研/候选的历史执行记录，“待执行/待审核/最终包”等阶段表述以本收尾结论及229为准；旧候选通过/失败不混算为当前包结果。

执行日期：2026-10-18 至 2026-10-19；目标系统为本机 macOS arm64。前置产物：[调研](220-release-optimization-research.md) → [方案](221-release-optimization-plan.md) → [方案审核](222-release-optimization-plan-review.md) → [用例](223-release-optimization-cases.md)及[审核](224-release-optimization-cases-review.md) → [实施](226-release-optimization-implementation.md)及[代码审核](225-release-optimization-code-review.md)。

候选包第1轮的构建、类型检查、完整自动化及原生流程已通过，尺寸达标；随后5秒总工作集门禁失败（见下文）。本轮整体尚未验收通过，追加内存调研/方案按独立审核流程推进。

## 候选1构建与完整回归（后续内存失败）

全部使用 Node v24.18.0，保留现有测试文件及断言。证据根目录为 `docs/evidence/release-optimization-2026-10-18/`。

| 范围 | 命令/输入 | 结果 | 证据 |
|---|---|---|---|
| 正式源码构建 | `npm run build`（Prisma、Next UI、全部桌面入口） | 退出0 | `build-offline-final.log` |
| 类型检查 | `npm run typecheck` / `npm run typecheck:foundation` | 均退出0 | `typecheck-final-2.log` / `typecheck-foundation-final.log` |
| 全部 unit + integration | 257 + 34 个原文件，Node test concurrency=3，180s/file | 2204/2204，fail/cancel/skip/todo 均0，源码前后 SHA 不变 | `core-final.json` / `core-final.tap` |
| 全部 browser | 57 个原文件，真实 Chromium，concurrency=1，180s/file | 604/604，fail/cancel/skip/todo 均0，源码前后 SHA 不变 | `browser-final.json` / `browser-final.tap` |
| 完整打包回归 | `SHAKEINK_TEST_PACKAGE_APP=<最终app> SHAKEINK_TEST_PACKAGE_ZIP=<最终ZIP> npm run test:package` | 50/50，fail/cancel/skip/todo 均0，退出0 | `package-tests-final.log` |

`run-suite.mjs` 保存完整文件清单、Node/平台、开始/结束时间和测试前后源码指纹；没有抽选用例。退役备份测试位于 `tests/retired/`，不属于当前执行集合。打包命令会重复部分 unit 签名策略用例，三个分组次数不相加宣称独立用例总数。

新增回归覆盖：真实 runtime closure、required/optional/peer 与 import-only/deep exports、stale/hash/逃逸/符号链接/旧输出/缺输入清单的先验拒绝、完整命令快照与 live owner 优先级及异步失败/撤销、官方 NextRequest/Response/cookies/stream 语义、实际 Provider 初始化的断网 QueryClient 行为。包回归使用两个独立 OS 进程运行包内真实 service/Prisma/adapter，写入、重复写入拒绝后内容保留、关闭后重新读取；模块 hook 拒绝包外依赖回退。

## 候选1实际包（非最终交付）

路径由 `final-paths.json` 唯一确定，尺寸和 SHA 见 `artifact-metrics-final.json`。最终 app 位于 `release/.staging/adhoc-arm64-3PoyMp/volume/玄印写作.app`；交付目录为 `release/adhoc-macos-arm64-cf487445-d4a9-45ec-b9f5-5a12a5666b46/`。

- Ad-hoc 内层 app 签名/资源封印及 arm64 验证通过；实际 DMG 挂载后再次验包、真实 PGlite/Sharp/WASM 探测通过。
- ZIP 所有条目 CRC、路径、文件表及关键入口字节与最终 app 一致；截断 ZIP、缺 worker/字体/HTML、损坏历史签名样本等反例继续拒绝。
- Next、Prisma CLI、Monaco 重复源码包不在最终 node_modules；所需 generated Prisma、PGlite WASM/data、Sharp native、Monaco 离线 worker/资源及内联第三方许可均保留并验指纹。
- 默认零模型、无模型后备；原生运行 sandbox=true，Node Server listening 数为0。

## 候选1原生业务验收

执行最终包，使用公开中文夹具和隔离 canonical 临时目录；`electron.launch` 返回后、调用 `firstWindow()` 及执行 UI 操作前，将 renderer context 设为 offline；不声称早于 renderer 首条脚本。真实 UI 执行以下流程，未调用付费模型：

1. 首次编辑前设置可检索全部419条命令；真实录制快捷键、多绑定和冲突原子转移；切换玄墨主题并持久化。
2. 原 Monaco 首次编辑、中文输入、Tab切换后同一编辑器 DOM、选区及撤销行为保留、撤销/重做、Cmd+S 本机草稿提示。
3. 使用实际正文菜单导出 TXT/MD/DOCX/PDF。前三种文件保留新增中文，DOCX 实际解包，PDF 实际解析并核对标题/页面及本地中文字体路径；仅 SaveDialog 的目标路径被测试端口控制。
4. 正常退出码0，再启动独立 app 进程；主题及两个自定义绑定保留、默认模型仍0。正式原文保持不变；设置→通用→查看草稿的真实只读 textarea 中，完整516字符与“原文+10个测+换行+新增中文段落”逐字一致。此流程遵循未批准内容保留为草稿的既有语义，没有将 Cmd+S 改成批准正文。
5. 核对实际原生菜单、sandbox、无 Node 监听，第二次正常退出码0，无 pageerror/观察到的 HTTP 请求。

完整通过报告为 `native-business-exact-prose.json`（另加正式原文逐字等于公开种子断言；此前 `native-business-complete.json`、`native-business-final-verified.json` 也通过）；`native-recovery-verified.png` 已滚到新增中文段落，实际可见内容与逐字比较对应。脚本为 `native-editor.mjs`；没有安装覆盖用户应用，没有使用真实用户数据。

## 候选1尺寸与性能

尺寸以普通文件字节总和计，符号链接独立计数；同版基线已在修改前确认 out/dist 字节与原工作树一致。ZIP 两侧均使用 `ditto -c -k --norsrc --keepParent`，未用历史 DMG 作为同版收益基线。

| 指标 | 同版基线 | 最终包 | 减少 |
|---|---:|---:|---:|
| app 逻辑文件字节 | 1,047,630,756 | 491,473,106 | 53.09% |
| 同方式 ZIP 字节 | 360,594,897 | 198,938,954 | 44.83% |
| 普通文件数 | 27,024 | 3,040 | 88.75% |

最终 DMG 221,356,162 bytes，SHA256 `6f30330cc624811c9eb06605bf4531760c2df699855032972eab600b525ae19d`；ZIP SHA256 `653db840844e76ada44208afca5f90eab459c7303c917e7d7f3fe44906ef848e`。

最终空闲三轮启动与三轮首次编辑对照：待完整浏览器回归结束后执行。测量脚本 `scripts/benchmark-release.mjs` 记录 launch→账号控件 attached、5秒稳定后的 working set、renderer heap、CDP 实际解析脚本文件字节及 buffered longtasks；`native-editor.mjs ... measure 3` 记录同夹具首次编辑及10次输入→两次 rAF。工作集进程相加可能重复共享页，main 含 service worker，不等于私有物理 RAM；未强制 GC，未控制 OS 磁盘缓存。

## 保留的失败与边界

RED、独立 review 首轮删除器反例、类型推断首轮失败、首次 package fixture 缺 manifest 的48/50，以及先前被停止的 browser 均保留原始记录，不改计通过。断网原生首轮发现原 Provider 默认 online 会暂停本地 IPC 前查询，按追加方案/用例 TDD 修正并重建。此前重开测试误将草稿保存当成批准正文的 `native-business-final.json` 仍为失败；后续完整复验才证明原文与草稿分别持久。

本轮不是跨平台业务总验收。Windows、Intel Mac、实际物理中文 IME、整机断网、付费模型、干净目标机下载隔离/安装/Gatekeeper 未执行；保留既有台账状态。正式发布 preflight 因缺少 `APPLE_KEYCHAIN_PROFILE` 拒绝（`release-preflight.log`），没有绕过。交付为 Ad-hoc 测试包，DMG 容器未签名、未公证，不能宣称正式可信分发已通过。

## 候选1的性能门禁失败

`paired-benchmark.json` 四组各3轮完整运行成功只代表执行无异常，不代表性能阈值通过。原始0/5秒口径：ready中位2548.53→2470.02ms，startup解析JS8091673→3763156bytes，longtasks279→161ms；但总working set853968→1215392KiB，增加42.32%，未达到至少减少10%的方案门禁。首次编辑中位1790.12→1380.32ms、输入两rAF中位17.28→16.68ms；首次编辑longtasks0→112ms，属于延后解析成本，不能省略。所有轮次原始结果见baseline-paired/optimized-paired/baseline-editor/optimized-editor报告。后续ABBA固定时间序列和PGlite缓存候选独立方案见220/221及审核，不能用后时点覆盖此失败。

## OPT-M01～M03追加验收（2026-10-19）

按222/224追加设计与225独立代码审核，已执行真实配置RED→GREEN。`cache-options-red.tap`1/2（实际128不等32）→`cache-options-green.tap`2/2，覆盖真实inbox/作品、新旧配置、完整默认参数、原文件字节及strict fs.syncToFs等待/false/错误传播。`cache-data-red.json/.tap`→`cache-data-green.json/.tap`1/1，三个独立OS进程校验67,306,534字节载荷、70,320,128字节table/70,238,208字节TOAST、EXTERNAL存储、1027行完整checksum/特殊尾批、64固定点读、真实提交/写后rollback/duplicate拒绝、inbox/作品隔离、既存配置SHA与原默认128MB回退。

`cache-performance.json/.log`为独占且仅执行一次的预声明ABBA四OS进程，全部数据checksum一致。每进程3次正式checksum扫描取中位，再按每配置两个独立进程的轮值取中位（即两值平均）。扫描包含实际读取、adapter传输及完整校验开销，initial/cold标签仅指该进程首次读取，不代表已清空OS磁盘缓存。

| OPT-M03指标 | 128MB默认缓存 | 32MB候选缓存 | 变化及预声明门禁 |
|---|---:|---:|---|
| 正式checksum扫描中位 | 178.209ms | 216.662ms | +38.453ms/+21.58%，小于max(基线10%,50ms)=50ms，通过 |
| 64次固定混合读写/rollback整批 | 55.128ms | 61.976ms | +6.848ms/+12.42%，小于max(基线10%,20ms)=20ms，通过 |
| 提交组成耗时 | 30.495ms | 33.150ms | 原样披露，不替代整批门禁 |
| 点读组成耗时 | 8.694ms | 10.216ms | 同上 |
| rollback组成耗时 | 15.882ms | 18.540ms | 同上 |
| 实际WASM buffer | 197,722,112bytes | 134,217,728bytes | -32.12%，不等于整应用内存收益 |


每轮522个真实文件同步调用均relaxed=false且完成；保持PGlite默认-F，不宣称新增fsync保障。首次扫描/点读、warmup及每轮明细、PG18.3派生配置和文件指纹都在原报告。32MB存在小幅查询耗时取舍，不能称数据库加速；新包整应用9对5秒内存门禁与全部回归仍待执行，旧候选三轮失败不被覆盖。

## 候选2构建、包内与原生验收

加入32MB配置后的新包已完成 `npm run package:adhoc:mac`（内部完整Prisma/Next/desktop构建）退出0，`package-cache-final.log`；最终两种类型检查退出0，`typecheck-cache-final.log`、`foundation-cache-final.log`。此前新增fixture缺数组注解导致构建停止，失败保留于`package-cache-build-type-failed.log`；只补两处类型后完整typecheck通过，`cache-types-only.json`证明发射JS逐字同SHA，因此M03原结果无需重跑/追加。

`final-cache-paths.json`绑定新app/ZIP/DMG：stage为 `release/.staging/adhoc-arm64-JS63QP/volume/玄印写作.app`，交付目录 `release/adhoc-macos-arm64-56b0beb0-bc6c-4fb8-80d4-fb5d5518c7d3/`。精确文件统计及两归档SHA见`artifact-metrics-cache.json`。新app491,473,325bytes，ZIP198,939,043bytes（减少53.087%/44.830%），DMG221,377,768bytes。

OPT-M04完整打包回归`package-cache-tests.log/.json`50/50退出0。包内record profiles实际观察write/reopen的3/2个持久化engine，全部cache32MB、原完整default前缀和relaxedDurability:false；原事务拒绝/读回与模块不逃逸断言保留。首轮测试记录器误对库内部noInitDb引导实例查询SQL，等待超时49/50；失败保留`package-cache-tests-harness-failed.log`，修正仅跳过该无SQL实例的观察并原样返回，不修改生产/原参数/实际数据库或断言。

`native-cache-final.json`证明新包执行同前述真实完整流程且成功：实际公开种子原文逐字不变，重开设置只读UI完整516字符草稿一致，两个正常退出，默认零模型/原生菜单/sandbox/Node Server0、快捷键/主题、Tab选区/撤销重做及四格式导出。其耗时是在功能回归并发期间采集，只作为流程证据，不作正式性能对照。完整293个core文件/57个browser文件正在重新执行，九对内存门禁尚未开始；旧2204/604结果不冒充新候选完整回归。

### 新候选浏览器并行首轮的失败保留

新候选并行core/browser时，CES-10a stage-1 action panel swap 实际geometry断言失败（groupBottom750.234375大于viewportBottom535.375）。未改变任何ChatPanel/选择卡片布局或原断言；该场景运行完整原组件、HTTP受控，不执行本地Workspaces数据库。原失败为`browser-cache-concurrent-failed.tap/.json`，`browser-cache-stopped.json`记录仅停止核实的本轮browser driver10个后代，driver收集退出1并保存源码后指纹。不把这份部分失败运行计为完整通过。随后等core结束，原57文件将独占完整重跑，以实际结果判断；不能先将失败认定为负载偶发或改记通过。

### 新候选core完成

`core-cache-final.json/.tap`完整257 unit + 36 integration共293文件、2207/2207通过，fail/cancel/skip/todo均0，退出0、源码前后SHA不变。包含新增页缓存配置/严格同步及大数据新OS进程/默认128回退原用例，未替换任何原文件。之后不再同时跑数据库/原生/打包负载，独占重跑完整57个browser文件；这份最终浏览器报告仍使用`browser-cache-final`名称，原失败已无损移名保存。

最终首次编辑/输入性能采样前修正证据统计：旧脚本10次输入取第6顺序值（上中位），最终两边统一改为第5/6顺序值平均后，再取3轮中位；此前功能报告和候选1原始数值不重写、不用于最终输入改善声明。新报告记录脚本SHA/Node与统计定义；UI操作、采样数/两rAF步骤及退出断言不变，旧脚本保留`native-editor-before-median-fix.mjs`。

### 新候选完整独占浏览器回归完成

`browser-cache-final.json/.tap`完整57个原文件、604/604通过，fail/cancelled/skipped/todo均0，正常退出0、源码before/after相等且changedInputs为空；耗时725628.800041ms。CES-10a保留原断言并在本轮通过，未修改测试或ChatPanel。首轮并行几何失败继续保留，单次独占通过不足以认定其根因。最终core与browser输入映射相同；随后确认无本轮测试/构建/原生残留进程才开始M05预声明18次采样。

### 候选2九对内存门禁失败

`memory-nine-pairs.json/.log`完整执行预声明AB/BA交替九对，18次均新根、正常退出0、无pageerror，源码/包入口/manifest/编排脚本前后SHA一致。两侧全部九值中位：总WSS1151152→1065088KiB，减少7.47633675%，未达至少10%，runner退出1、executionPassed=true但passed=false。ready2847.404→3020.502ms（+173.098ms/+6.08%）；启动解析JS8091673→3763156bytes、longtasks287→168ms、renderer heap29011380→21359792bytes不抵扣总WSS门禁。每轮进程原值和所有原始报告保留，独立复算见228。此候选完整功能通过，但整体优化尚未通过，不重复同包试图获取有利样本。

后续诊断：64MiB initialMemory实际因WASM最低128MiB LinkError失败，日志保留，未改生产。一次Node独立进程plain/seed/seed/plain比较见220：同版本纯空PG归档可省去递归noInitDb引擎，公开写读验证通过；其RSS不是整产品验收指标。候选3构建期空PG方案/新增用例须先经独立审核，再RED和实施，后续新包全套及新完整M05仍使用原五秒/10%定义。

## 候选3专项与首次验包拒绝

222/224依序审核→M06/M07 RED→实施→225独立code review（含父包fallback修正）已完成。资源/vanilla/非法字段和字节/SHA/链接/缺失专项最终27/27；Workspaces新旧/损坏分支4/4；原M02加seed三OS67MB载荷两组2/2；原启动恢复/租约专项33/33。真实pointer-written崩溃迁移负/正控制1/1：坏seed启动前后2609文件及60目录完整清单/SHA相同，随后有效seed完成同一migrationId、实际service读回原模板。详见seed-resources-metadata-green.tap、seed-workspaces-green.tap、seed-data-green.tap及两份JSON、seed-startup-green.tap、seed-recovery-green.tap/.json；这些不能替代候选3完整回归及M05。

首轮完整npm package:adhoc:mac的UI/类型/desktop编译通过，afterPack按预期拒绝PGlite资源指纹不符；stage adhoc-arm64-yMEAlE保留，日志无损移名package-seed-metadata-failed.log。独立逐文件比较46项输入，唯一差异是builder移除package.json的scripts/keywords，全部CJS/WASM/data与其余metadata字段相同。修正仅对这两个顶层构建字段规范化且显式编码manifest格式；真实installed树的builder正例及运行main字段改动拒绝均通过，仍需独立复核并重建唯一新stage。没有放宽运行资源、版本或包外解析检查。

第二轮完整构建、afterPack资源检查及app Ad-hoc签名成功后，DMG挂载复验因系统tmpdir返回/var别名、实际位于/private/var而被strict regular检查拒绝。stage adhoc-arm64-GNLLNd和package-seed-mounted-alias-failed.log保留为失败；没有把未交付DMG记为通过。修正仅在host验包入口封存realpath(appRoot)，main同样先封存realpathSync(app.getAppPath())再派生migration/seed固定路径；资源文件和app内部依赖的链接/越界拒绝保持。main变动后仍需完整重建新包，不就地改已签名app或跳过挂载复验。

### 候选3最终构建与包回归

经225两处canonical-root独立复核后，第三轮完整`npm run package:adhoc:mac`退出0（package-seed-final.log）：Prisma/Next UI含TypeScript/desktop、资源闭包裁剪、内层签名/资源封印/arm64、实际DMG挂载再次验包全部通过。app为`release/.staging/adhoc-arm64-0pCEEK/volume/玄印写作.app`，交付目录为`release/adhoc-macos-arm64-57aba5f3-c15a-4998-ad13-cef1dab1f909`；唯一输入见final-seed-paths.json。

artifact-metrics-seed.json：app495997276bytes/3042files/14links，比同版基线减少52.6553%；ZIP203261401bytes，减少43.6316%；DMG225761748bytes。ZIP SHA256为`f911c9db14a3ddcf64954a703035757f0f8e1427b00d01ed8d6d2e6849401883`，DMG为`f0fa362836a3af6760d0e2cea75340a7a1b1b2d504e021ac85b9bf5673475672`。公开空PG模板计入上述体积，没有省略新增资源。

完整core首轮296文件2235/2240失败5项（core-seed-fixture-failed.json/.tap）。两份抽取实际源码的unit夹具缺少新增realpath依赖、虚拟/bundle不是真实目录，或未给pre-root seed读取前提，未到原关闭等待测试分支。仅补夹具依赖/真实appPath/真实seed loader及控制模板失败，并新增canonical路径/templateAttempted断言；原关闭等待/安全错误/不adopt断言保留，用enteredClose事件代替短轮询。专项13/13，仍须完整core重跑，不把原失败改为通过。

首轮包回归47/50失败3项（package-seed-input-changed-failed.json/.log）：旧三份集成测试import全量build-desktop，重新生成非确定性seed，使当前构建输入偏离已签名app。失败前后包及归档未变，实际包内事务/seed/noInitDb断言当轮已通过。修正仅把这三份测试改为生产service同参数/Next插件的UUID隔离构建，保留原业务/安全断言与时限，原完整文件5/5、10关键输入前后bytes/SHA不变且输出清理（isolated-worker-*.json/.tap）。随后只将两份忽略的公开构建seed从不可变app恢复到prisma，五入口和runtime manifest逐字同app（seed-built-inputs-restored.json）。完整两类types退出0：isolated-worker-typecheck.log/foundation.log。

复跑原完整`npm run test:package`50/50，零fail/cancel/skip/todo、退出0，package-seed-tests.json/.log绑定当前app/ZIP/DMG与log SHA。真实包内write/reopen两OS进程3/2个持久化engine，均32MB/defaults完整/strictfalse，首次恰好两新库loadDataDir、重开无loadDataDir，临时noInitDb为0；原事务拒绝/内容保留和包外解析守卫继续通过。原生与完整core/browser及M05尚待该候选最终结果。

### 候选3完整核心及原生完成

隔离修复独立审核通过后，完整重跑257 unit+39 integration共296文件：core-seed-final.json/.tap为2240/2240，零fail/cancelled/skipped/todo，exit0，1286项源码before=after，298833.8705ms。core-seed-inputs-after.json再次逐项核对五入口/runtime manifest/两seed与最终app一致，未再被测试改写。先前2235/2240及47/50保持原失败身份，不拼合成此整轮通过。

native-seed-final.json（原始native-seed-final/report.json）以同最终app执行前述完整verify1流程通过：窗口启动后、UI任务前renderer context offline；419快捷键/真实录制和原子转移、多绑定/主题、实际Monaco中文输入/Tab同DOM选区及撤销重做、原Save语义、四格式真实导出、正常退出和新进程读回主题/快捷键/零模型。正式原文逐字不变，设置只读草稿UI完整516字符一致；两个退出均code0/signalnull，无pageerror/观察到的HTTP、sandboxtrue、Node Server0。独立目录native-seed-final内两截图保留，恢复截图已滚到底并目视新增中文段落，未覆写旧截图。功能用例耗时不作最终三轮性能对照。当前完整browser-seed-final正在独占运行，随后才执行新完整九对及首编输入。


## 布局补充TDD进度（候选4尚未整体验收，2026-10-19）

- 原候选3完整browser-seed-final.json/.tap：57文件604条，602通过/2失败，退出1，零skip/cancel/todo，1286输入前后相同。不能记为全绿，M05未执行。候选3原生/核心/包通过仅属于其原版本。
- CES固定6轮只读有效诊断3过/3失败，后者与原立即几何一致；另两组仪器错误保留且排除产品根因，细节ces-scroll-diagnostic.md。新增ces-child-layout-red.tap：1/2，10d在子增长提交微任务精确RED、10e上翻通过。实施后完整chat-empty-state.test.ts **30/30**，退出0、零skip/cancel/todo（ces-child-layout-green.tap），含未改原10a/b/c和新增MO首增长/仅一次/上翻/隐藏重开。
- Drawer固定3次原用例和12次带观测诊断几何均过，但12/12捕获ready=true仍容量27→55；不宣称重捕了首visible错误。新增真实ContentTabs契约drawer-preparation-red.tap：7过/1失败，实际第二次prepare错误true；修复后drawer-preparation-green.tap：8/8，亚像素/缩放/单多长标题有限收敛。完整相关文件和独立代码审核在进行。
- 两项修复后将以layout唯一新证据和包重新build/两typecheck/全core/browser/package/原生，全部通过才执行新九对M05与3+3首编/输入。此节不是最终通过结论。


布局专项最终状态：独立code review225通过；原10browser+3unit完整一次135/135、U01新增8/8、ChatPanel完整30/30全部退出0；两类完整类型检查layout-typecheck.log/layout-foundation.log退出0，15项专项输入前后相同，原几何断言未改。见drawer-preparation-validation.json及源指纹记录。生产构建/Adhoc完整打包退出0（package-layout-final.log），新静态签名/资源/实际挂载DMG检查通过。全量core/browser/package和原生及性能仍在后续执行，尚非最终通过。

新候选路径见final-layout-paths.json；app495,998,124字节、3042文件14links，相对同源码原基线1,047,630,756字节减少52.65525%；同ditto方法ZIP203,261,789字节，相对360,594,897减少43.63154%，SHA307abac4625425bfb28aed5455c75e2d2a949b155e4fb0ed27ed734d6ac48cd0。DMG225,788,196字节，SHA27911655b8c5dfae6a2207772f3ab7388f95b5d4933fa07af929a49215d7d8c4；不将DMG与不同压缩方法基线相减。准确数据artifact-metrics-layout.json。


最终layout全core已结束：296文件（257unit+39integration），2240/2240，退出0/无signal，fail/cancel/skip/todo均0，1287项源码/配置输入before=after，changedInputs为空（core-layout-final.json/.tap/-run.log）。完整58文件浏览器仍运行，不能据其当前片段写最终通过。


最终layout全browser已结束：58文件614/614，退出0/无signal，fail/cancel/skip/todo均0；1287输入before=after且与完整core及当前源码完全一致（browser-layout-final.json/.tap/-run.log）。原CES-10a/CD-03跨断点首帧全部原断言本轮真实通过，新增2个CES与8个准备契约使604→614。没有重试、选取部分文件替代整轮或改宽容差。新包50项及原生和最终性能在其后执行。


最终layout包测试：npm原命令实际退出0，原spec完整50/50、零fail/cancel/skip/todo，全部50个✔（package-layout-tests.log，SHA008451a10b87781448bbb6b4ef79a4ebb77e17648c30a8783b820586ce217750）。新汇总runner误按TAP找计数，导致wrapper退出1/JSON null；原package-layout-parser-failed.json与package-layout-tests-run.log保留。correct-package-layout-summary.mjs仅从同一未改日志唯一spec计数、50✔/0✖、原child0/null与同targets重新推导汇总，package-layout-tests.json显式summaryCorrection/noTestRerun，独立审核确认。真实测试没有重跑，也不存在把真实失败改成通过；解析脚本失败单列。

最终layout原生verify1退出0（native-layout-final.json和同字节native-layout-final/report.json），仍使用已审4221a425…脚本。419命令先于首编、F8/F9真实记录/多绑定/原子冲突转移、ink主题持久化；真实离线浏览器会话首编、同DOM/选区/Tab/撤销重做/CmdS未批准草稿语义，TXT/MD/DOCX内容标记、PDF标题/页数/中文字体，2次正常quit0/newOS重开、原文不变/完整516字草稿与10测+保留段落exact恢复均通过。root实际查看新recovery截图确认末尾标记。默认零模型、sandboxtrue、NodeServer0、无观察到的HTTP不变。断网范围仍为launch返回后renderer context，不扩称OS断网/最早脚本/付费供应商；PDF不声称正文逐字提取。该单verify耗时不作为最终3+3性能结果。
