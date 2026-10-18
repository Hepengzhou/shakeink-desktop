# Release 体积、启动内存与卡顿调研

收尾状态（2026-10-19）：按用户要求保留当前成果并停止追加优化。[最终总结](229-release-optimization-summary.md)与[测试收尾结论](227-release-optimization-verification.md)为最新状态；下文保留调研/方案/实施的阶段记录，未将内存门禁失败改为通过。

日期：2026-10-18（Asia/Shanghai）。范围：当前独立桌面仓库；不修改上游、不改变批准 UI 或任何业务流程。

## 现状与证据

- 原历史 `release/mac-arm64/玄印写作.app` 磁盘分配约 1,101,784 KiB；Frameworks 294,564 KiB、Resources 807,180 KiB。旧 DMG 约 330 MiB、ZIP 约 344 MiB。这是既有历史样本的尺寸，不能充当当前代码基线。
- 当前代码基线采用上一轮全量回归构建的 `release/regression-20261018-2rNl9J`，测量及与当前输入的核对见 `docs/evidence/release-optimization-2026-10-18/`。基准固定 Electron 44.6.0、macOS arm64、Node 24.18.0，独立空目录、默认零模型。启动时间为发起进程到账号按钮可见；不宣称清除了操作系统文件缓存。
- `electron-builder.config.cjs` 正向收集项目资源，但 builder 另行收集所有 production dependencies。`scripts/build-desktop.mjs` 将所有 npm 包设为 external，静态导出的 React/Monaco 等依赖仍被整包重复收集。
- 历史包内 Monaco 源码约 99,244 KiB，Next 及 SWC 约 207,952 KiB，Prisma 整个命名空间约 179,440 KiB，另外 Prisma CLI 42,136 KiB。Prisma client、PGlite、Sharp 是实际运行依赖，不能整族删除。
- `desktop/service/routes.generated.ts` 保留真实动态业务路由；`dist/service/index.cjs` 仍引用 `next/server`。只删除 Next 会破坏路由，必须先将该 API 的实际官方实现打入 service bundle，保留 NextResponse 的行为。
- `DesktopApp.tsx` 启动 effect 调用 `initializeMonacoCommandCatalog`；后者在 `monaco-commands.ts` 的 `loadRuntime` 导入 `monaco-setup`，间接加载整个 Monaco。虽然 MarkdownEditor 已使用 dynamic，启动命令目录绕过了这个加载边界。
- 仓库已有 `command-catalogs.generated.json`，darwin 419 / win32 403 个完整命令，含 when、权重、所有绑定；`verify-command-catalogs.mjs` 验证版本、源文件 SHA 和目录 SHA。可以先使用该经过构建校验的真实完整快照，编辑器打开时仍执行原 live runtime 校验和注册。

## 结论

优先优化两个有直接代码证据的重复成本：安装包中没有运行引用的生产依赖，以及空工作台提前加载 Monaco。保留 PGlite 的严格持久化、目录权限/租约、原组件实例和全部业务路由，不以降低数据保障、关闭 GPU、限制 V8 heap、删语言/字体/功能或更换框架换取指标。

依赖裁剪必须依据构建 external 清单及真实依赖闭包，在输出包内执行；保留所需包的全部运行文件、native/WASM/data 和许可。ESM/CJS、动态加载和 optional dependencies 是重点风险，需要真实包运行、真实数据库、图片和导出来验证。

## 参考资料与限制

[Electron 官方性能建议](https://www.electronjs.org/docs/latest/tutorial/performance)建议测量模块成本、延后不必要工作并减少模块加载开销；[esbuild 官方 API](https://esbuild.github.io/api/#packages)说明 external 依赖须在运行时存在。上述建议用于形成假设，效果以本项目实测为准。

CodeGraph 目录存在，但本会话工具目录没有 codegraph 工具，本机 PATH 也没有 codegraph CLI。本轮使用明确相关文件与构建器 metafile 调查，没有将未执行的 CodeGraph 查询写成证据。默认沙箱不能启动 Electron；原生基准通过已授权的系统执行环境运行，原失败日志保留。

## 后续内存调研（2026-10-19）

首轮最终三轮采样不满足内存目标：5秒总工作集中位853,968→1,215,392KiB（+42.32%），Browser（含worker）分别382,128/402,688/788,992与824,672/779,888/1,118,272KiB；原始paired报告完整保留。Renderer used heap约29→21.6MB、解析JS8,091,673→3,763,156bytes不能代替总内存达标。main启动屏障已在创建窗口前await完整worker数据库/迁移/模板初始化，因此不能说5秒时初始DB仍在初始化。ABBA固定0/5/15/30/60秒时间序列正在诊断初始化后堆/WASM/页释放的影响，不修改原5秒结果。

实际公开隔离根的 `inbox/database/postgresql.conf` 配置 `shared_buffers = 128MB`、max_connections=100；每个作品是独立PGlite实例，工作区connect目前只有dataDir和relaxedDurability:false。PostgreSQL文档说明shared_buffers是数据库页缓存，可以仅在启动时设置；缓存减少不改变数据容量上限，但可能增加大数据扫描I/O，需要实测。PGlite已安装0.5.8的types/source提供startParams以及静态defaultStartParams；其初始WASM内存默认128MiB、可自动增长，不能将initialMemory或WASM maximum当数据容量裁剪。

候选最小优化：每个真实PGlite实例保留全部官方defaultStartParams，仅追加 `-c shared_buffers=32MB`；保留原relaxedDurability:false、默认initialMemory/maximum、迁移、连接池、事务、锁和退役逻辑。是否采用取决于独立方案/用例审核、实际缓存配置与大于缓存数据集的持久化/事务/查询验证、包内WASM内存和同方法整应用测量。

来源：[PGlite API](https://pglite.dev/docs/api)、[PGlite官方源码](https://github.com/electric-sql/pglite/blob/main/packages/pglite/src/pglite.ts)、[PostgreSQL资源配置](https://www.postgresql.org/docs/current/runtime-config-resource.html)；实际安装类型 `node_modules/@electric-sql/pglite/dist/pglite-BdeXTuy6.d.ts`、实现 `dist/index.cjs` 以及 `desktop/service/workspaces.ts:298`。官方当前文档用于解释语义，兼容性以实际锁定0.5.8及真实执行为准。
# 追加调研：候选2总WSS未达标后的空数据库初始化（2026-10-19）

完整新core/browser/package/原生功能通过后，固定九对18次M05执行成功但总WSS1151152→1065088KiB仅降7.4763%，低于10%；ready中位增加173.098ms。`memory-nine-pairs.json/.log`原样保留，不重采同候选、不改时点/统计。只降低32MB缓存不能消除WASM默认128MiB初始页；尝试initialMemory64MiB在本地0.5.8因WASM声明最小2048页而LinkError失败，`initial-memory-probe-64.log`保留，排除此方向。

读取installed0.5.8初始化实现确认：全新数据库会在既有engine外递归创建`noInitDb:true`临时PGlite，执行initdb并dump/import，导致额外WASM、编译代码和FS临时数据。已有数据库走PG_VERSION恢复，不走该分支。官方[API](https://pglite.dev/docs/api)提供loadDataDir/dumpDataDir，官方[预生成空FS说明](https://pglite.dev/docs/prepopulatedfs)明确可跳过initdb且必须与PGlite版本相符。该机制不需要改库、上限/GC或持久化策略。

先行诊断只对隔离公开空PG、Node24独立进程进行一次plain→seed→seed→plain；非应用验收，不代替M05。同installed0.5.8内存空库dump gzip4511261bytes、公有表空。普通初始化两次PGlite.create，seed加载一次；ready936.020/1014.268ms对422.705/401.849ms；5秒RSS1588117504/1568751616对956874752/957874176bytes。全部公开中文写入/读回正确，WASM仍134217728bytes。原始`database-seed-probe.mjs`、`probe-seed*.json/.log`及归档保留。RSS为诊断进程值，不能直接宣称产品将节省同等字节。

候选方向：在构建时由同installed版本生成无应用表/无用户行的空PG归档，随包携带并绑定archive/package/WASM/data指纹；仅真正空的新数据库用loadDataDir，既有数据库一律原恢复路径。原迁移、作者初始化、模板事务、锁/目录身份/失败保留和strict sync全部照旧。代价是约4.5MB gzip资源、空库cluster初始化标识/时间来自build模板；业务UUID/目录隔离和后续事务仍须单独验证，不把它称成数据库容量限制或迁移替代。
