# Release 优化实施记录

收尾状态（2026-10-19）：按用户要求保留当前成果并停止追加优化。[最终总结](229-release-optimization-summary.md)与[测试收尾结论](227-release-optimization-verification.md)为最新状态；下文保留调研/方案/实施的阶段记录，未将内存门禁失败改为通过。

依据：[调研](220-release-optimization-research.md)、[方案](221-release-optimization-plan.md)、[方案审核](222-release-optimization-plan-review.md)、[用例](223-release-optimization-cases.md)及[用例审核](224-release-optimization-cases-review.md)。实施中的独立审核见 [代码审核](225-release-optimization-code-review.md)。本记录不替代实际测试结果。

## 已实施

- `scripts/build-desktop.mjs` 保留全部原入口和动态业务路由，只内联真实 installed Next server 实现。`runtime-dependencies.mjs` 从 esbuild metafile 生成五入口 SHA、external specifier/kind 与内联许可清单。运行时需要的包仍以真实 Node require/import 条件解析。
- 两个打包入口在签名/归档前基于真实依赖闭包裁剪构建/前端重复包；保留所需包内部全部 WASM/data/native 文件。package metadata 的 dependencies 同步为实际 external roots，来源包版本保留。项目 node_modules、旧发布样本和业务源码依赖声明不变。
- 删除器必须取得本次空 staging 的单次 capability，绑定目录 device/inode、输入 manifest 字节；拒绝历史输出、无输入清单、入口/hash差异、required缺失、父项目fallback、任意祖先/依赖符号链接。完成闭包/资源验证后才删除。本地 `--dir` 也改为唯一 staging，避免覆盖历史包。
- `prepare-package-resources.mjs` 按 Next metafile 输入收集最近许可证并记录原路径/SHA到 provenance，保留已有 Monaco 许可证。静态验包核对 runtime manifest 与资源字节，要求没有多余依赖；不放宽现有签名、公证、作者数据和 Key 边界。
- 启动时 `DesktopApp` 使用完整 generated command catalog（darwin 419 / win32 403），两种正式构建均验证 sourceHashes/版本/shape/SHA。快照以低优先级发布；实时 editor owner 保持较高优先级，实时默认绑定/when/参数不会被快照复活或覆盖；释放后恢复完整快照。
- 首次实际编辑仍沿用原 Monaco 动态加载、离线 worker、版本/平台/shape 校验、命令目标和格式动作；失败显示 unavailable，成功 ready。不修改原 editor model、undo stack、选区/草稿、Tab保活或业务组件实现。

## TDD 与审核修正

首版新用例先执行 RED，缺少构建/快照能力及目录优先级不符合新契约；随后首批 6/6 GREEN。独立 code review 用隔离 sentinel 重现了根符号链接、旧输出及缺输入清单问题，并发现 import-only exports 条件不匹配。修复后加入明确回归反例，`review-fixes.tap` 8/8。原始失败保留；最终全量与实际包结果统一记录在后续测试文档。

证据目录：`docs/evidence/release-optimization-2026-10-18/`。默认沙箱首次 Next 编译没有推进，以已核实的本轮 PID 终止并用原配置在系统环境重试，原日志仍保留。类型检查首轮退出0。此处不声称生产构建、打包、原生业务或全量回归已通过。

## 离线验收修正（2026-10-19）

原生会话 offline=true 的首次失败证据保留于 native-business.json。独立审核确认原 Provider 默认 online 策略会在 IPC 前暂停本地业务。按追加方案/用例先执行原 Provider RED（offline-red.tap 0/2），再仅为桌面 Provider 的 queries/mutations 配置 always，保留 refetchOnReconnect:true。offline-green-2.tap 2/2，涵盖真实初始化表达式、实际 QueryClient、断网读写、错误、取消、失效和重连刷新。

修正前全量 core 已完成 2202/2202；旧 browser 因即将重建而主动停止，只保留部分证据、不计最终通过。最终新 Provider/UI 将重新构建，全部 core/browser/package 重新执行。首次 package 48/50 的两个失败是独立负例 fixture 没有拷贝新增必需 runtime manifest；现仅补齐 fixture 输入，保留其原缺HTML/字体时必须拒绝的断言。正常原生业务专项第二轮已完成快捷键、首次编辑、Tab/选区保活、undo/redo、保存和四格式导出；重开后旧定位器命中隐藏内容而失败，最终定位改为可见真实节点，原始失败和正常退出记录保留，不将整轮记通过。

## 候选1构建及回归（随后内存门禁失败，2026-10-19）

最终源码重新执行 `npm run build`、两种类型检查均退出0。完整257个unit+34个integration原文件2204/2204，57个browser原文件604/604；两个执行组前后1275项源码指纹一致。最终app/ZIP执行完整打包回归50/50；无跳过/取消。最终实际macOS arm64包离线会话的快捷键、编辑状态、撤销重做、四格式导出及新进程完整516字符草稿恢复均通过，并将正式正文与公开种子逐字比较确认原样保留。详细证据、测量口径及尚未执行的目标环境见 [测试记录](227-release-optimization-verification.md)；本文早期“尚未通过”描述保留为阶段记录。

## 候选1内存失败及页缓存TDD（2026-10-19）

旧候选的完整功能通过并未满足5秒总WSS目标；该候选明确保留为memory-gate-failed，不作为最终优化验收。220/221追加调研/方案、222独立方案通过、223/224追加用例与独立审核后才写新测试并执行RED。`cache-options-red.tap`实际SHOW16384个8KiB块（128MiB）不等4096，严格sync等待/false/原错误传播已通过；`cache-data-red.json/.tap`先执行三独立OS进程完整67,306,534字节载荷/70,320,128字节table/70,238,208字节TOAST、事务/作用域/既存配置SHA/默认128回退正确性，再因实际128不等32失败。初次fixture授权缺await的harness失败另保留，不当成RED行为证据。

随后仅在Workspaces.connect的PGlite.create保留dataDir/relaxedDurability:false并追加完整PGlite.defaultStartParams副本加 `-c shared_buffers=32MB`；不覆盖原文件、schema/迁移/连接池/锁/退役代码或WASM初始/最大内存。`cache-options-green.tap`2/2，`cache-data-green.tap`1/1；PG18.3实际cache32MB，WASM初始化197,722,112→134,217,728bytes。自动派生wal_buffers由512→128个8KiB块，transaction/subtransaction buffers由32→16个8KiB块，按真实profile记录，不声称只有一个effective setting变化。默认-F保持，false持久化语义按PGlite本身sync等待验证。

新增包内PGlite只读记录器仅在测试helper透传原参数/返回同一engine并读取settings/WASM；没有放入产品。大数据独立实现按指定文件范围由database_cache_probe子代理完成，独立代码审核仍由optimization_review执行。查询性能/整应用内存门禁、新构建/新包/全套回归未完成前不能将此配置提升最终通过，结果续记227。

## 候选3构建期空PG模板TDD（2026-10-19）

候选2完整18次5秒总WSS仅减少7.4763%，不达10%门禁，保留为失败；未重采同包。220追加官方API/预生成FS调研及隔离诊断，221/222方案、223/224用例依序独立通过后进入RED。M06旧worker实际ready而非资源失败、M07实际0/6新库使用Blob且6个临时noInitDb被观察，失败日志保留。

新增`generateDatabaseSeed`每次desktop构建以同installed PGlite纯内存默认空库生成gzip归档；验证非系统schema仅public且无用户关系/过程、自定义数据库/角色，实际重导入对比版本/encoding/locale。严格manifest绑定归档与installed package/CJS/WASM/data指纹；两个生成资源被忽略源控、显式随包并与构建输入核对，不包含用户数据或应用迁移结果。

main提供固定appPath资源，service在startOwnedRoot（含recover/resolve）前校验，正式缺seed或资源不匹配拒绝。loader将实际PGlite解析绑定同一app的node_modules，拒绝父项目fallback；只有独立源测试可显式绑定其installed runtime。Workspaces第三只读Blob只对原检查确认missing/empty的database传loadDataDir；既有PG_VERSION/非空损坏路径不导入、删文件或清空。原迁移/作者/模板、默认参数+cache32、strictfalse、WASM默认/上限/增长及业务逻辑不变。

M07四组、原+seed两组67MB三OS进程全checksum、现有128MB配置和原默认回退均GREEN；原启动恢复/指针/租约专项33/33。包内recorder计入所有noInitDb（只避免向无SQL引擎发查询）并要求0，检查恰好两个新库用Blob、重开不使用；没有将观察器加入产品。独立review要求的坏资源/恢复状态哨兵继续补验，尚未进行新包最终构建/全量/性能，不能以这些专项通过宣告整体目标完成。


## 全量浏览器失败后的实际组件布局修复（2026-10-19）

候选3完整602/604失败保留，先追加221/222方案与223/224用例审核，再执行确定性RED。ChatPanel真实子详情提交MO快照在RO前记录列表底535.375、组底750.234375，新增CES-10d准确失败（同文件10e上翻已通过）。最小实现仅CandidateActionPanel可选onLayout在有效useLayoutEffect通知父；父共享dock高度ref，由子layout及原RO消费同一正增量、先更新高度再按原nearBottom门控补偿。初挂建基准，原选中/换卡最小reveal保留，隐藏清ref，旧RO有活动/DOM身份守卫并断开。原查询、动作、store、滚动阈值/平滑滚动、内容/文案布局均未改。

ContentTabStrip新增容量稳定条件：同一CSSOM读取写前/写后自定义viewport容量，保持原计算并立即应用；只有原工具flags已提交且容量本轮未变才返回ready。沿既有隐藏准备阶段自然再测，无新state/计时器/帧计数/动画曲线。真实ContentTabs新增确定性RED证明compact标志已提交但27→55容量写入的轮次旧实现错误返回true；其余flags未提交false、亚像素和缩放/标题有限收敛一并验证。原CD03首真实可见帧/原全部几何断言保留。

这两项是回归发现的既存布局时序问题修复，不计为新的包体积/内存收益。新候选使用全新layout命名证据与唯一包；独立代码审核、全量回归/原生验收与性能仍须全部实际通过后才能总结。旧candidate3外部adhoc-test.json已标optimizationAcceptance.failed，原归档保持字节和SHA。
