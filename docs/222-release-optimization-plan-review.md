# Release 优化技术方案独立审核

日期：2026-10-18（Asia/Shanghai）。审核范围：`220-release-optimization-research.md`、`221-release-optimization-plan.md`，以及当前构建、打包、运行资源探针、真实服务入口和快捷键目录实现。审核者独立于方案编写与后续实施；本记录不声明代码、测试或发布验收已通过。

## 结论

优化方向合理：删除渲染静态导出后不再运行引用的重复 npm 包，以及推迟空工作台的 Monaco 装载，有直接源码依据。继续使用真实业务组件、官方 NextResponse、严格持久化和现有安全门禁，符合本轮范围。

当前方案需补入下列三个阻断项后再进入用例审核与 TDD。补充可由主代理自主完成，无须重复请求用户 UI 批准。其余通过条件必须作为实施、代码审核与验收的门禁，不能靠包体积下降抵扣功能失败。

## 阻断项

### B1：内联 Next 后必须独立保留它及内联 compiled 模块的许可

`node_modules/next/server.js` 不仅加载 NextResponse，还加载 user-agent 等导出；`next/dist/server/web/spec-extension/user-agent.js` 直接引用 `next/dist/compiled/ua-parser-js`。目前 `prepare-package-resources.mjs` 只独立复制 Monaco、Lucide、Electron 等许可，`THIRD_PARTY_NOTICES.md` 对其余生产依赖的假设是其 LICENSE 仍位于包内 node_modules。内联 Next 并裁掉它的整包后，这一假设失效。

修正：由 service metafile 的实际内联输入确定 Next 及 compiled 包归属，保存 Next 自身 `LICENSE.md`，并保存实际内联 compiled 包随附的 LICENSE/NOTICE（可取最近包归属的许可文件，去重保留 provenance）。每份保存源路径、目标路径和 SHA；验包逐字节核对。不能仅在文档声称“保留许可”或只验证 Monaco 的许可。

### B2：generated 与 live 目录必须规定元数据优先级及失败状态

`src/lib/desktop/command-runtime.ts` 当前合并使用 `{...command, ...existing, defaults: [...]}`，原意是静态身份提供 label/scope，运行时提供 Monaco 元数据。完整 generated catalog 已含 `monacoId`、`monacoArgs`、`monacoBindings`；若直接先发布完整快照、随后沿用原 publish 路径，快照中的同名字段会覆盖 live 行，defaults 则形成并集。live 新的 when/权重/参数或删除的绑定可能被旧快照遮蔽，不能用命令总数相等证明等价。

另外，原启动调用 `initializeMonacoCommandCatalog` 的失败会将目录设为 unavailable；改用快照后，首次 `bindMonacoCommandTarget` 当前只记录 console.error，可能让已设 ready 的状态在 live 校验失败后继续保持 ready。

修正：明确静态应用身份、generated 基础目录、已验证 live 目录的字段优先级。live 的 Monaco 元数据必须优先，编辑器关闭/卸载后仍能使用完整 generated 目录；不重挂载编辑器或改模型/选区/撤销栈。首次 live 校验失败必须反映 unavailable，不能把 ready 当成已验证实际适配器。用例应覆盖首次挂载、重复/并发挂载、卸载先于异步完成、live owner 释放，以及同 ID 但不同 when/args/weight/defaults 的合并反例。双平台比较完整规范化行（包括绑定元数据），而非仅比较 count。

### B3：包内闭包必须以真实解析文件与真实运行行为验收

方案的“包根闭包”不能实现为仅 `require.resolve(name)` 或 `require.resolve(name + '/package.json')`：例如当前 `@img/sharp-darwin-arm64/package.json` 只导出 `./sharp.node` 和 `./package`，没有根导出，且 sharp 依靠存在的 optional dependency 装载平台 native/libvips。Prisma 使用 `src/generated/prisma`，并按深路径动态导入 `@prisma/client/runtime/query_compiler_fast_bg.postgresql.*`；现有 `packaged-resource-probe.cjs` 只检查 WASM magic 和 PGlite SELECT，不能证明真实 Prisma client、模型事务和磁盘落盘可用。

修正：清单保留 external 的完整 specifier 和实际入口位置，从每个引用者按 Node 的真实查找层级定位对应包目录；支持 scoped、nested、导出受限及 CJS/ESM 深路径。必需依赖缺失或解析逃逸必须在任何删除前失败；已存在 optional/必要 peer 也纳入闭包。实际验包在清空 NODE_PATH、包外工作目录下禁止依赖从项目 node_modules 或祖先目录补齐，探针增加生产 generated Prisma client 的事务写入、关闭、磁盘重开读取；保留 Sharp native 图像转换及 PGlite WASM/data 验证。补充嵌套同名不同版本、受限 exports、缺失传递依赖、包外符号链接与 manifest 篡改反例。

## 实施与验收通过条件

1. **裁剪范围**：只对本次新 staging 输出的 `appRoot/node_modules` 做删除；先完成整个清单/闭包/路径/入口 SHA 验证再开始。使用 lstat/realpath 校验符号链接和 package root，拒绝路径逃逸，不沿链接递归删除项目目录；失败不得生成可交付安装包。两个既有打包入口都必须执行，仍在签名与归档前完成。不改原安装包、源码 dependencies 或上游仓库。
2. **清单完整性**：全部五个既有运行入口与任何后续新增入口都绑定摘要；esbuild metafile 中 built-in/Electron 和包依赖明确区分。未能静态分析的运行 require/import 或文件定位不能被默默忽略；应保留有证据的显式运行资源根或构建失败。Next 内联输入若有 `__dirname`/文件读取/动态 require，须逐项验证其打包后语义；不可把 `packages: external` 下仍残留 Next 深路径的输出宣称为已经内联。
3. **NextResponse**：在无 node_modules/next 的隔离包中运行实际编译后的业务/等价探针，覆盖 JSON 编码、状态码、响应头、cookie set/delete、多 Set-Cookie 与使用到的流式响应；与当前安装的官方行为一致。继续运行真实 dispatcher/worker 路由测试；源码单测中已有将 NextResponse mock 成 Response.json 的用例不构成内联兼容性证据。
4. **启动边界**：正式 Next UI 构建也必须验证 generated catalog 的 sourceHashes/版本/shape/SHA，不能只在最终 desktop 构建时检查。轻量模块对 Monaco runtime 无导入链。空工作台的 JS 请求/执行证据须表明 Monaco 主体未提前装载；编辑器打开时仍使用原 assembly 和离线 worker。设置在先开编辑器前可搜索、录制、追加/删除、冲突原子转移完整目录的绑定，修改后重开应用与首次编辑都生效。
5. **用户数据与业务**：真实包在独立数据目录完成新建作品、打开正文、输入、保存、关闭重开、撤销重做/选区与 Tab 保活，以及 TXT/Markdown/DOCX/PDF 四格式真实导出。图片输入/转换不依靠删除前的开发环境。29 类面板、98 工具和 121 路由保留；对应既有 unit/integration/browser 回归不能被一个启动冒烟替代。无真实供应商调用的测试明确说明其范围，不虚构端点验收。
6. **性能**：同一 Electron/架构、同一构建输入与相同新目录条件，各三次记录原始结果、入口/包 SHA、文件精确字节/数量及相同算法 ZIP。明确 working set 可能重复计算共享页，不等同独占物理 RAM；main worker 的内存计入所属主进程。记录启动 ready、首开编辑器耗时、长任务、编辑输入/切换响应，避免仅将启动成本挪到首次编辑便宣称卡顿改善。原始测量应包含有效启动/失败状态，失败样本不进入成功中位数。若未达到方案指标，应解释并继续处理或据实标未满足。
7. **门禁与范围**：补方案 → 用例独立审核 → RED → 实施/GREEN → 独立 code review → 全量回归与真实目标系统验证 → 总结，顺序保持。Windows/Intel Mac、Developer ID 签名/公证及下载隔离的已有待验项不得因本机 arm64 静态/运行通过而升级为通过。此方案审核不代替这些验收。

## 审核依据与边界

阅读了 `docs/implementation-boundaries.md`，以及 `scripts/build-desktop.mjs`、两个 package 入口、`electron-builder.config.cjs`、`scripts/inspect-packaged-app.mjs`、`scripts/packaged-resource-probe.cjs`、`scripts/prepare-package-resources.mjs`、generated catalog 的生成/校验/源清单、`DesktopApp.tsx`、`MonacoMarkdownEditor.tsx`、`monaco-commands.ts`、`command-runtime.ts`、`ShortcutSettings.tsx`、真实 service/Prisma 入口及上述已安装依赖源码。CodeGraph 本会话不可用，未将任何未执行的 CodeGraph 查询写成证据。本审核只改本文件；未实施产品代码或运行发布验收。

## 方案补充复核（2026-10-18）

已顺序复核方案新增的“独立审核补充门禁”，结论为**方案通过，可进入测试用例独立审核与后续 TDD**。这是设计门通过，不是实现/验收通过。

- B1 已在方案层解决：实际 metafile 输入驱动 Next/compiled 许可收集，保留 Next LICENSE.md，记录打包路径和 SHA，并验证原字节。
- B2 已在方案层解决：明确 snapshot 低优先级、live 高优先级，live 释放后快照完整可查，并明确 live 失败 unavailable/成功 ready。实施时优先级须同时覆盖 defaults：live 已删除的绑定不能因与 snapshot 做并集而复活；保留静态业务身份规则。
- B3 已在方案层解决：保留全部实际外部包内部资源，按引用者位置遍历 required、存在的 optional、非 optional peer 与嵌套闭包；定位 metadata 使用调用者的 `require.resolve.paths` 对应查找层级并直接读取候选 package.json 根，支持受限 exports，同时用完整 external specifier 验证实际运行入口。真实 generated Prisma/adapter 事务、关闭和新进程磁盘重开，以及 NextRequest/NextResponse 官方语义比较均已成为门禁。

无剩余方案阻断项。先完整验证再裁剪、全部入口摘要、不可分析动态加载不得静默遗漏、正式 UI 构建校验目录、首次编辑与输入性能、原业务回归和跨平台范围仍按前述通过条件验收；独立用例审核负责将这些条件细化为可执行断言。

## 追加数据库页缓存候选方案独立审核（2026-10-19）

**方案通过，可提交追加具体用例进行独立审核；尚不批准把 32MB 候选视为最终验收通过。** 已明确复核 220/221 的追加范围：它覆盖原方案“不动 PGlite 参数”的限制，但仅限 `Workspaces.connect` 每个真实实例追加 shared_buffers 启动覆盖，不改变其它业务、数据库生命周期或持久化规则。用户已授权本轮优化自动推进，无需重复 UI 批准；仍须先完成用例审核与 RED，再实施和独立 code review。

### 语义与32MB合理性

已安装 PGlite 0.5.8 的 types 暴露 startParams/defaultStartParams；实际 `dist/index.cjs` 使用用户 startParams 或默认值，二者不会自动合并。因此正确形式必须是 `[...PGlite.defaultStartParams, '-c', 'shared_buffers=32MB']`；不得只传两项、修改官方静态数组或用 `postgresqlconf` 替代。官方 API 也采用保留默认前缀后追加参数的用法。[PGlite API](https://pglite.dev/docs/api)

shared_buffers 是数据库页缓存，32MB 高于 PostgreSQL 最小要求，缩小它不等同于缩小数据库可存储容量；但 32MB 是本项目单用户、每作品独立实例场景的待验工程候选，官方资料没有给出“该应用应使用32MB”的结论。减少缓存可能增加读取/写回成本，不能仅凭128→32的差额声称整应用能节省96MiB或满足总WSS目标。[PostgreSQL资源配置](https://www.postgresql.org/docs/current/runtime-config-resource.html)

`-c` 可以重复追加，并在启动时覆盖文件中的同名设置；文件字节未改与运行值被覆盖是两个事实。此方案需承认它会覆盖既存数据库的 shared_buffers 配置，而不是声称用户文件未动就代表运行配置没变；无须通过写文件、迁移数据或新增设置界面实现。[PostgreSQL启动参数](https://www.postgresql.org/docs/current/app-postgres.html)

本机锁定实现仍使用默认128MiB初始 WASM 内存、原最大值与自动增长；追加页缓存不应设置 initialMemory 或其它内存上限，也不应把缓存值包装为容量/作品大小限制。是否实际减少 WASM 分配、进程工作集及首启占用，须由候选真实执行证明，不能从参数值推算。

### 必须纳入追加用例的风险与门禁

1. **参数完整性与实际生效**：生产创建路径保留完整 defaultStartParams、顺序与所有原选项，只追加这一个设置；官方静态数组前后不变。新根、既存128MB配置根、inbox 与真实作品实例，均查询实际 SHOW/pg_settings=32MB；记录 server_version、block_size 和来源，按真实运行版本解释参数。不能仅在另一份手写 PGlite 构造器里证明该值。
2. **配置与持久化不变**：保留 `relaxedDurability:false` 的准确选项名及 await/关闭/回执路径，不引入名为 durability 的替代选项。配置文件含注释及无关设置的既存夹具，打开/写入/正常关闭/新进程重开后原 postgresql.conf 字节不变；不得设置 postgresqlconf、ALTER SYSTEM 或改其它参数来取得收益。PGlite 官方默认前缀本身已有 `-F`，不能把这里的“不降低PGlite同步保障”误写为原生 PostgreSQL fsync 已打开；验收比较原有 PGlite flush 行为，不为测试擅自删默认参数。[PGlite源码](https://github.com/electric-sql/pglite/blob/main/packages/pglite/src/pglite.ts)、[PGlite持久化选项](https://pglite.dev/docs/api)
3. **派生配置风险**：默认 wal_buffers 会随 shared_buffers 自动选择；部分版本的事务状态缓存也使用相关默认计算。只追加一个用户参数，不代表全部有效缓存参数都保持原值。记录实际 wal_buffers 等派生值，并验证事务/写入性能，不额外钉死它们以掩盖结果，也不改变 SQL 事务语义。[PostgreSQL WAL配置](https://www.postgresql.org/docs/current/runtime-config-wal.html)
4. **超过缓存的数据正确性**：至少64MiB实际存储数据，确认表/TOAST实际占用大于32MiB，不能仅靠逻辑字符串长度或可高度压缩数据。关闭压缩须采用真实支持的存储设置并验证；分批/流式全量读取、确定性 checksum、固定种子随机点读、提交及“已发生写入后再抛错”的回滚均保留完整内容。正常关闭后由新 OS 进程打开再验，覆盖原128MB根被新配置读取和新写入后按原默认配置重开，证明没有引入格式/容量兼容性问题。所有数据在隔离夹具，不触碰用户作品。
5. **性能退化对照**：64MiB数据同时超过新缓存、处于原缓存范围，适合暴露差异，但只扫一次不足以说明缓存影响。用同数据、同查询与固定次序的首扫/重复扫描、随机读取和混合写入对照128MB；预先在追加用例中明确统计方法与“明显退化”的判据，保留所有样本，不按测后结果调阈值。既有目录锁、事务超时/失败、连接池/退役与并发访问回归继续执行，不因平均扫描时间合格而忽略这些边界。
6. **内存证据与原门禁**：记录数据库 WASM 实际内存与 main含Worker/renderer 的整应用数据，保持原 ready+5秒三轮总WSS口径及至少10%目标；ABBA 0/5/15/30/60诊断单独保留，不把后时点释放或较小renderer heap替代原门禁。不强制GC、不削减持久化/迁移/池/锁，不挑有利轮次；如果32MB没有真实收益或出现不可接受的查询/交互退化，撤回该候选或另提方案。
7. **新版本完整验收**：新方案使之前 app/源码指纹的“最终”身份失效。用新正式 UI/desktop 构建、新唯一打包输出与 SHA 重跑全部活动 unit/integration/browser/package及本机原生业务、完整草稿恢复/导出/离线范围和同方法性能。保留旧候选的通过/失败及首轮WSS回退，不将旧2204/604/50或旧native证据直接升级为新候选通过。没有要求新增产品功能、修改批准UI或改变任何正常业务流程。

本节批准的是候选技术方向及以上设计门禁，不是32MB最佳值、数据安全/性能已实测或全部用户目标已完成的结论。本次只追加方案审核，没有修改代码或启动数据库/原生/扫描负载。

## 候选3：构建期空PG模板方案独立审核（2026-10-19）

**技术方向通过，可进入新增具体用例的独立审核；尚不进入生产实施或宣称内存达标。** 本节连同以下边界构成方案通过条件。已顺序读取220/221追加调研/方案、实际Workspaces/service/root-startup/migrations、锁定0.5.8初始化实现及公开诊断脚本。没有运行数据库/原生/性能负载，也没有改生产代码。

### 机制与诊断证据的范围

已安装0.5.8在新库无loadDataDir时递归创建noInitDb引导engine，而传loadDataDir直接导入归档；已有PG_VERSION时传loadDataDir会明确报“Database already exists”。官方文档也明确预生成FS可跳过initdb，且只保证与生成它的对应PGlite版本兼容；API要求loadDataDir使用dumpDataDir生成的Blob/File。这支持同installed版本构建期生成的方向，不支持跨版本通用模板或随意文件复制。[官方预生成FS说明](https://pglite.dev/docs/prepopulatedfs)、[dumpDataDir/loadDataDir API](https://pglite.dev/docs/api)

诊断plain→seed→seed→plain中的create次数/ready/RSS仅证明该机制值得进一步测试，不等于完整应用、更不等于M05。候选2九对下降7.4763%及旧失败保持失败；64MiB initialMemory因WASM最小值失败的方向排除，不因此修改库最小/最大内存或强制GC。新模板会复制PG集群初始化标识/时间及原系统目录状态，这是物理空库复用的真实代价；当前目录身份、作品UUID、租约及应用迁移不应依赖这些复制值，须实际验证，不能仅以“空库”推断绝无状态。

### 必须进入具体用例/实现审核的门禁

1. **生成源与空库语义**：每次build:desktop从同installed PGlite显式纯内存新库生成，不接受用户目录、既存作品、诊断归档或环境路径作为数据源，也不导入应用service以取得seed。既有build→start路径必须具备资源，package准备只验证本次资源；生成/关闭失败须停止构建，不能继续使用上轮遗留归档。除public外也需排除任何非系统schema中的应用关系/数据、`_desktop_migrations`、作者/作品/模板行和自定义数据库等；正常PG系统目录不是“用户数据”。生成后以同库在隔离内存实际重新导入并校验干净状态、可查询/可关闭，避免只有gzip/SHA正确而归档不可用。归档与manifest在构建成功前成对校验；可有构建时间/cluster ID导致的非确定性，但每一轮包必须绑定该轮准确字节。
2. **固定资源与版本绑定**：manifest严格版本/shape、有限字节与合法SHA；指纹键/资源路径使用固定allowlist，不让manifest或renderer指定任意宿主文件。绑定package版本、实际CJS入口、pglite.wasm/initdb.wasm/pglite.data等声明资源及归档长度/SHA，定位到本次app/installed包内的真实普通文件，拒绝符号链接/父目录回退/缺失。manifest里的SHA是完整性比较，不是独立签名信任源；包封印/验包及源码构建输入的已有门禁继续存在。保留PGlite原LICENSE及相关许可，不因归档内含PG系统文件而从保留依赖中剥离许可。
3. **校验时点与失败关闭**：worker loader需在 `startOwnedRoot` 调用前完成只读校验，而不只在其initialize回调或Workspaces.initialize前。当前startOwnedRoot的recover/resolve可能已恢复/调整权威状态，放在回调内不足以满足“坏资源不写根”。main只传固定appPath派生路径；正式main每个正常service启动入口都必须提供，缺路径不得降级为旧initdb。保留无seed只限既有显式隔离fixture兼容，不增加renderer参数、环境绕过或产品回退分支。测试在新根和既存公开根用哨兵/清单证明坏资源未创建或改写业务根、数据库、品牌/目录及恢复状态；原稳定实例锁等既有main启动行为按其原边界记证，不将“业务根未改”扩写成进程完全无任何文件操作。
4. **真正空的新库限定**：第三个只读Blob不能自行授权建库。继续使用原create权限、规范路径/品牌/目录身份/租约、活动storagePath和原数据库验证，只有其允许且database确实missing或空目录时传loadDataDir；create=true本身不代表空。PG_VERSION存在或任何非空目录均不能导入。损坏非空、未知文件、目录/PG_VERSION链接及重建不许可状态沿原拒绝/恢复规则，不删除“清空重试”。校验后先保留原锁/身份检查，再进入原PGlite.create；导入或迁移失败也不覆盖已有数据，不新增自动擦除/再导入。空inbox允许的原显式恢复边界仍可使用同一模板，不扩大其重建范围。
5. **迁移/身份/隔离/持久化**：模板仅是vanilla PG datadir，不能提前应用应用迁移或预填作者/模板以减少启动工作。原loadMigrations/migrateDatabase checksum事务、作者upsert、模板库初始化、Prisma adapter、32MB完整defaults、strictfalse、锁/池/退役及退出次序保留。两个独立新根/作品均导入同模板后产生各自应用/作品/业务UUID与实时创建时间，事务写入互不串库；共享cluster系统值不作为应用身份。现有128MB conf库和有业务内容的大库打开不得附loadDataDir，配置原字节和checksum仍保留。新seed库和旧恢复库均覆盖超过缓存数据、写后rollback/duplicate、正常关后新OS进程完整读回；用同一Blob并发/先后创建也不能消费/修改后影响下一库。
6. **包资源/运行效果**：只在正向清单增加两个准确公开资源，不放宽原PG_VERSION/.db/作者数据排除规则或递归携带生成临时目录。开发build/start、两个package入口的准备/检查、真实包Worker两独立OS进程均使用实际新资源。记录真实持久化create/loadDataDir与noInitDb递归次数：新inbox/作品消除临时engine，重开不传loadDataDir；不能只在手写构造器里展示收益。坏manifest/归档/版本/资源SHA/链接/缺资源均在既定时点失败，旧包负例不修复。两独立OS进程不是两操作系统；Windows/Intel等未验状态不因此升级。
7. **新候选完整验收**：资源约4.5MB压缩体积、校验读入/Blob保留和解压的启动成本必须计入新app/ZIP/首次启动、ready、5秒总WSS和首编/输入；不能只报少一个engine的理论节省。按顺序新增用例审核→行为RED→实施/GREEN→独立code review→新build/类型/完整core/browser/package/同新包原生正文完整草稿导出，再按同九对18次/原5秒/两侧中位至少下降10%及各3轮首编输入验证。新批次拒覆盖旧失败，诊断RSS不并入最终采样；若未达标继续调查，不能换时点/阈值/样本。原M03保留其相同缓存配置/原数据工作负载身份；seed大数据和既有恢复路径正确性仍需新执行，不把旧ABBA变成新路径已验。

方案已明确每次build生成、package准备验证，这解决了仅package生成会破坏普通build→start的问题。以上门禁细化既有“空模板/只新库/坏资源写根前失败/原业务不变”的要求，没有授权改变UI、自动批准草稿、降低持久化、修改数据库容量或新增恢复擦除。无剩余技术方向阻断项；具体用例应将这些边界落实后才进入RED。本次只追加222审核文档。

## CD-03 caption容量稳定追加方案独立审核（2026-10-19）

**221本轮Drawer最小方案通过，可继续独立用例审核；CES不在本次批准范围。** 本节只读取真实hook/owner/样式、原用例与固定诊断报告，未运行浏览器或修改实现。目标是补全已经存在的caption准备完成契约，不新增布局、业务状态或动画行为。

证据边界明确：原完整browser的602/604失败不变；固定3次原CD-03和两组各6次诊断均通过原几何断言。12/12 trace确实记录真实prepare先在旧非compact工具52px时写capacity657→27、返回false，真实compact提交后再写27→55却返回true；owner收到true即结束隐藏preparing。所有12轮首真实可见tab与最终tab均55px，故该证据证明ready缺少容量稳定条件，尚未重现原首帧28px或证明唯一因果。tight/overflow在这12轮均为true，应撤回“本轮已证明overflow振荡”的推断；菜单/容量反馈仅作为保留回归的潜在边界。诊断格式错误不计产品失败，3/12轮GREEN也不替代完整browser验收。

批准只在useContentTabStrip.measure/prepare中加强返回值：每次照常计算并立即写正确capacity，继续原title overflow/reveal/拖拽逻辑；仅原compact/menu工具DOM匹配且已应用capacity在本次未改变时返回true。容量缺失或改变必须false，沿现有owner的V=0/kick流程继续准备，下一次实际稳定后放行。不得改useSidebarDrawer运动曲线/时长、W/H冻结/模式、ContentTabs/CSS/业务实例、原字体/ResizeObserver响应，不能以可见后补偿代替准备，也不加入固定帧计数或sleep。

实现比较应以实际已应用的CSS容量为准：读写前后经过同一CSSOM规范化的值，或等价且有测试的规范化比较；避免把parseFloat后的CSS值与未规范化长小数严格比较，导致稳定亚像素尺寸永远false。此要求不放宽原0.35px几何断言，亦不授权忽略27→55的真实变化。工具flags尚未提交时即使容量未变也须false；已稳定时反复prepare必须true。长标题、多标签、紧/非紧边界、实际缩放、双向模式切换及快速反转需在有限准备内完成；若出现真实振荡，记录输入并重新分析，不能无限隐藏或加超时强制ready来掩盖。

方案通过不宣称修复了原CD-03偶发失败；须先确定行为RED，再实施/GREEN和独立代码review，保留原CD-03首可见帧及全部真实控制/文字行框断言。完整新build/唯一包、全量core/browser/package及原生流程按既定顺序重新验证，当前失败候选不升级最终；完整新输入全绿后才允许性能九对。无其它技术方案阻断项，本次仅追加222。

## CES-10a异步子提交方案独立审核（2026-10-19）

**221新增可选onLayout通知及共享高度基准方案通过，可继续OPT-U02独立用例审核。** 限实际CandidateActionPanel与ChatPanel的布局补偿时序，不改变smooth scroll、选中/清除规则、数据查询/写入/业务动作或阅读阈值。本次只读取已知源文件、installed React DOM实现和6轮原始摘要，不运行浏览器。

`ces-scroll-diagnostic-v3-summary.json`完整6轮中0/2/4原立即断言通过、1/3/5失败；失败几何与完整browser相同。6轮初parent layout均hasThumb=true/listHeight688，组卡当时完全可见；子query独立提交面板113.25→342.625px，列表底降535.375，MO微任务记录组卡底仍750.234375，之后RO才以delta230、nearBottom=true将scrollTop3967→4197并恢复底520.234375。全部轮次只有该一次parent reveal，没有后续同依赖layout。日志中空依赖callback捕获的showCardPanel=false不代表调用门控为false，应按真实外层条件和DOM解释；__name/ASI两个仪器错误组排除产品根因。

原selected是CandidateThumb订阅selection后直接渲染aria-pressed，初始通知和父ChatPanel在同一次更新时已提交DOM。installed React DOM先完成mutation再进入layout，layout递归先子后父；静态顺序与trace吻合，不能据父子effects顺序推断最初selected缺失。问题在后续子query自己的commit没有改变父showCardPanel/candidateId，父原layout不再运行。前节smooth-scroll覆盖、thumb迟到的候选解释现未获这6轮支持，不据此修改原平滑滚动或等待前置来回避失败。

批准最小实现为CandidateActionPanel每次有效commit的useLayoutEffect调用可选onLayout；父以同一稳定补偿函数和同一height ref服务该通知及原RO。首次挂载只建立当前dock高度基准，初选/换卡仍由原parent layout执行最小reveal；之后每次先更新基准，再仅在delta>0且原nearBottom=true时增量scrollTop。同一尺寸随后RO必须delta0，缩小只更新基准、不能反向拉动阅读；保留原offsetHeight等测量口径，不因整数/小数混用产生重复增量。callback只处理DOM/refs，不set业务store/query、触发新请求或改变布局/操作内容，其可选性保留其它调用者原行为。

生命周期门禁必须落实：子layout先于父layout，所以父初始化/注册RO不能无条件覆盖刚消费的高度或把首次mount当二次增长；showCardPanel=false清空基准，卸载断开RO，旧实例/旧可见期已排队回调不能在清空后重新污染基准。可用当前活动/节点身份守卫等最小等价措施，不需要新增业务状态。快速换卡、关后重开、会话切换、未选中/其它panel分支及开发重复effect不泄漏观察器或重复补偿。用户真实上翻后nearBottom=false的异步增长仍只更新基准，不能强制reveal或拉回底部；下一次用户主动选择仍沿原选择契约。

该方向直接解决已证实的提交窗口，仍须确定性新RED→实现/GREEN和独立代码review，原CES-10a/b/c及card-select业务断言全部保留；不能把MO之后再读最终状态当RO前证明。Drawer与CES两处新修复均完成后再新build/唯一包/完整同版回归和原生验收，全部通过才按既定性能门禁采样。无剩余技术方向阻断，本次仅追加222，未实施或改测试。
