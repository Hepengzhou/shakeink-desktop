# Release 优化技术方案

收尾状态（2026-10-19）：按用户要求保留当前成果并停止追加优化。[最终总结](229-release-optimization-summary.md)与[测试收尾结论](227-release-optimization-verification.md)为最新状态；下文保留调研/方案/实施的阶段记录，未将内存门禁失败改为通过。

前置：[调研](220-release-optimization-research.md)。执行顺序：独立方案审核 → 用例及独立审核 → RED → 实施/GREEN → 独立 code review → 全量自动化和本机真实包验证 → 总结。用户已授权自动推进。

## 实施范围

1. 构建 service 时将 `next/*` 的已安装官方实现内联，其他 npm 包继续 external；不替换 NextResponse、不修改业务 handler。输出 esbuild metafile 导出的 external 清单、各运行入口 SHA 到 `dist/runtime-dependencies.json`，不将源码映射带入包。
2. 在两个既有打包入口的 afterPack、静态检查之前，读取并验证 manifest 与实际包入口 SHA；从 external specifier 的包根开始，按包内实际解析位置计算 dependencies、存在的 optionalDependencies 和非 optional peers 的闭包。先完成全部验证，再仅删除该次输出 appRoot/node_modules 中不在闭包的包。未知、缺失或逃逸的必需依赖立即失败；不裁包内部运行文件，不修改项目 node_modules、不改源码 package 依赖、不改变签名公证门禁。保留输出报告、闭包和删除大小，方便复核。
3. 资源检查器收录运行依赖 manifest，核查完整 closure/no-fallback；Monaco 许可证改校验已有 runtime-licenses/Monaco-MIT.txt，而不要求重复携带 Monaco 源码。旧损坏样本及已发布包保持原样，新的本地包写入唯一目录。
4. 新增轻量启动目录模块，只发布经过既有构建器严格核验的完整 generated catalog；DesktopApp 启动使用此模块，不导入 Monaco runtime。首次挂载真实编辑器仍调用原 bindMonacoCommandTarget，加载原 Monaco 并执行版本/平台/shape 校验，保留原错误处理、全部快捷键、when 条件、撤销栈/选区/草稿和原组件生命周期。设置无需先打开编辑器即可搜索、编辑全部快捷键。
5. 不引入新的业务 loading 层、不移除 29 面板/98 工具/121 路由；本次不动 PGlite 参数、连接池、备份退役范围或网络安全策略。两平台目录共用生成源，但原生 Windows 验证必须由 Windows 机器执行。

## 测量与验收

- 对当前同一代码基线包和优化包记录准确文件字节、文件数、分配大小、压缩 ZIP，记录 SHA。期望 app 字节至少降低 35%、同方法 ZIP 至少降低 25%；框架大小不作为优化收益。
- 同一测试脚本各 3 次独立新目录，记录 readyMs、5 秒稳定窗口的所有 app.getAppMetrics working set（main 含 worker，进程相加可能重复共享页，非物理 RAM）、renderer heap、已加载 JS 字节和 buffered longtasks。期望 startup JS 明显下降、working set 中位数至少降低 10%；耗时/longtask 无实质回退。内存与速度不根据包体积推断。
- 冷启动验证没有提前下载/执行 Monaco 主体；首次编辑离线加载 worker，完整命令数与 live 目录一致。实测打开正文、输入、切换/保活、撤销重做、保存、重开与四格式导出。没有付费调用，默认零模型。
- 新增反例：stale manifest、缺少依赖、路径逃逸、缺少 worker/入口、完整生成目录失效；已有 package/archive、NextResponse、全部 unit/integration/browser、类型检查、正式构建必须通过。不得为指标修改业务测试断言或跳过失败。
- 本地 macOS arm64 包实测通过仅代表该目标；Windows、Intel Mac、开发者签名公证/目标机下载隔离与跨平台正式验收的既有未验状态不提升。若不可用据实单列。

## 回滚与风险

变更仅在构建/打包与启动目录入口，回滚对应提交即可恢复旧打包流程和 eager Monaco。裁剪先完整验证再修改；包内新增 manifest 不含用户目录/Key。动态资源仍保留在各依赖原路径；如果闭包/包验检查或真实业务验证失败，不能交付该包。启动快照的可信性来自每次正式构建的源指纹及完整目录校验，编辑器 runtime 仍再次校验实际注册表；不能使用简化静态命令表代替完整快照。

## 独立审核补充门禁

- 内联 Next/compiled 实现后，根据 esbuild metafile 输入为每个内联包/compiled 子包收集最近 LICENSE/COPYING/NOTICE 资源，复制到 runtime-licenses 并记录路径/SHA；不能因删依赖丢失第三方许可。保留 Next 自身 LICENSE.md，静态与包回归验证原字节。
- generated snapshot 通过低优先级目录发布；原实时目录保持较高优先级（相同 ID 的 runtime when/args/权重不能被 snapshot 覆盖）。静态业务命令的人类标签/作用域规则继续沿用；live 目录撤销后快照仍完整可查。首次 live 版本/平台/shape 校验失败将目录标为 unavailable，不能一直显示 ready；成功后恢复 ready。
- 打包裁剪先在真实 output 内验证所有入口 hash、完整 closure、路径不逃逸且无外部符号链接；source node_modules 与已发布目录不在删除范围。包内 metadata 的 dependencies 与 actual external roots 对齐，不把不存在的构建依赖继续列为运行依赖。
- 回归必须包括包内真实 generated Prisma client + 原 adapter 的事务写入/查询/关闭/新进程重开；NextResponse/NextRequest 的状态、JSON、header、cookies 语义与已安装官方版本等价。默认禁止 HTTP、无父项目回退；一次顶层 require 不构成完整业务通过。

## 原生验证发现的离线策略修正（2026-10-19）

实际浏览器会话断网后，设置IPC仍可用而业务查询暂停；独立审核确认 HEAD 与当前 Provider 都直接 new QueryClient()，默认 online 模式在 queryFn/IPC 之前暂停。这是既存问题，与依赖裁剪无关，但阻挡本轮最终包离线验收。最小修正限独立桌面的 `src/app/providers.tsx`：QueryClient 默认 queries/mutations 使用 networkMode:'always'；queries 显式保留 refetchOnReconnect:true，以保留此前重连刷新语义。不改 onlineManager、网络过滤、模型网关、业务读写函数或 UI。

追加 TDD 必须先在原 Provider 默认下复现 offline query/mutation paused，再修正实际 Provider 默认。验证断网本地读取/写入和取消、重连仍刷新、模型缺失/权限/写入门控仍有效；最终 UI/包重新构建并执行全部回归与真实浏览器会话断网首启/首次编辑。原未断网性能基线保留，不将首轮测试失败改记为通过。

## 内存门禁失败后的追加候选方案（待独立审核，2026-10-19）

原始5秒总工作集门禁失败，不以较晚有利时间点或渲染器堆替代。本轮新增调研确认每个PGlite实例当前页缓存128MiB。拟仅在Workspaces.connect的PGlite.create追加 `startParams:[...PGlite.defaultStartParams,"-c","shared_buffers=32MB"]`。这变更了原第5点“不动PGlite参数”的范围，须按独立方案审核→追加用例审核→RED→实施→独立code review重走，不能直接带入交付。

保持官方默认启动参数完整前缀、原relaxedDurability:false（等待持久化完成）、默认WASM初始/最大内存及自动增长；不修改用户postgresql.conf文件、不修改SQL/业务schema/迁移/连接池/授权锁或界面。页缓存降低并非数据容量上限。大于缓存的实际数据集必须证明持久化、流式读取/随机查询、提交/回滚、关闭/重开与目录隔离仍正确，并比较重复扫描耗时；明显性能回退必须解决或撤回。

验收：新根及既存128MB配置根的实际SHOW shared_buffers均32MB；包内真实service也核对，PGlite参数default前缀完整。至少64MiB实际表数据（关闭TOAST压缩）大于32MiB缓存，验证全量checksum、事务拒绝/回滚、关后新OS进程读回；实际数据库WASM内存及同方法应用5秒三轮内存对照证明收益，保留首轮失败和ABBA诊断全部样本。正式UI/桌面构建、全部unit/integration/browser/package及本机原生流程针对新包重跑，交付SHA更新；旧候选暂不视为最终。

追加审核风险登记：startParams会替换而非自动叠加默认值，必须完整拷贝静态前缀且不mutate。32MiB是本次候选选择，不是官方推荐。wal_buffers、transaction/subtransaction buffers等自动派生设置可能跟随shared_buffers改变，必须记录实际server_version与相关pg_settings的setting/unit/source；写入和混合随机点读也纳入对照，不能宣称只有一个effective setting变化。PGlite官方默认含-F（Postgres fsync关闭）属于原有实现；relaxedDurability:false指库自身等待文件系统同步，不以SHOW fsync作为本轮持久化增强证据。
# 追加方案：构建期空PG模板（候选3，待独立审核）

目标是消除全新数据库递归临时initdb engine；候选2九对仅降7.48%的失败不追认。保留32MB缓存、WASM128MiB默认及最大/增长、所有原PGlite默认参数和relaxedDurability:false。

1. 新增`generateDatabaseSeed(project)`构建工具，以installed PGlite新建纯内存默认空PG，确认public应用表为空，dump gzip并关闭；不读取任何用户根。写`prisma/empty-database.tar.gz`及严格manifest：格式/version、archive SHA/bytes、installed package版本及CJS/WASM/initdb/data指纹。每次build:desktop重新生成，确保现有build→start也可用；package准备期校验当前资源，positive files仅加这两个公开资源；原禁止用户PG_VERSION/.db规则保留。
2. 新增worker侧只读loader，验证普通文件、manifest严格shape/大小、归档长度/SHA和当前实际installed PGlite版本/资源SHA。来源由main固定appPath传给worker，不接受renderer输入；在Workspaces初始化/写根之前验证。失败关闭启动，不静默退回未知模板。仅原不带seed的隔离兼容fixture可走旧initdb；main正式入口总是供seed路径。
3. Workspaces仅增加可选只读Blob参数。保留当前先验目录/租约/身份验证；仅经原验证为不存在或空目录的新database附loadDataDir。PG_VERSION已存在或任何非空数据库沿原恢复/验证，不覆盖、不导入模板；非空损坏仍拒绝并保留。原migrateDatabase、作者upsert、Prisma/模板库、连接池及退出次序不变。
4. 验包同时核对两个新资源精确输入字节及manifest绑定，包内跨两OS进程测试明确使用实际seed路径；记录new/inbox首次create没有noInitDb临时实例、重开不附loadDataDir、事务/读回/目录隔离/现有128MB配置和业务UUID仍正确。资源缺失/篡改/不匹配版本必须在写根前失败；旧包作为负例不可被修复或覆盖。
5. 先独立方案审，再独立新增用例审，再RED→实施→独立code review。完整build/类型/core/browser/package/真实本机离线会话功能重新执行；针对新包重新预声明同九对完整M05（新批次文件、不覆盖旧18样本），原5秒/10%阈值不变，再各3轮首编输入。数据库M03缓存配置未再变，原ABBA保留，但新增seed与旧恢复路径均需真实大于缓存载荷校验。若新候选仍不达标继续调查，不改验收口径。

实际首次验包发现electron-builder移除依赖package.json的scripts/keywords；仅此元数据输入采用去除这两个顶层构建字段后的JSON字节指纹，保留其余所有字段及对象键序（包括exports条件优先级）。manifest固定fingerprintFormat明确该规则；版本及全部CJS/WASM/data仍严格指纹。真实复制installed树的删字段正例和改main字段拒绝反例必须通过；原失败stage/日志保留，不就地修改归档。


## 全量浏览器失败后的布局修复边界（待独立审核，2026-10-19）

候选3完整浏览器602/604失败，原报告保持失败；M05暂停。CES-10a底部选卡和CD-03 899→900重开不是可忽略失败，不增加选中后等待、不跳过首可见帧、不放宽几何断言。仅在真实复用组件内修正已有时序，不修改批准布局、业务接口/状态、组件保活或动画曲线。

CD-03只读取证已观察到ContentTabStrip的prepare返回true时仍将viewport容量从27px写为55px；compact工具DOM虽已提交，布局尚未稳定。拟将就绪契约补全为工具DOM与本轮计算容量均稳定，容量发生变化的一轮必须返回false，让原drawer的隐藏preparing阶段继续准备。每轮仍立即写入正确容量，原ResizeObserver/字体/交互测量继续生效；不在可见动画中延迟修正，不改drawer宽高冻结/模式切换或销毁业务面板。具体代码须待诊断完整及独立方案/用例审后实施。

CES根因尚在记录真实layout effect/ResizeObserver/scroll时序，确定后在本节追加针对性方案；仪器错误日志不算产品证据。两项修复后重新生产构建、唯一新包、全部core/browser/package与原生功能验证；旧候选3和失败报告不升级为最终。最终启动/编辑性能仅针对新包和全部通过的同一输入集采样。


### CES-10a 确认后的最小方案（待独立审核）

6轮trace有3轮原立即断言失败，所有轮均显示首个parent layout时卡片可见；CandidateActionPanel独立query提交增高229.375px后，parent依赖未改变不再layout，直到RO下帧delta230补偿才恢复。拟在实际CandidateActionPanel增加可选只读布局通知onLayout，在自身每次有效提交的useLayoutEffect触发；ChatPanel复用一个高度ref和补偿callback，由子layout及既有RO共同调用：仅dock正增长且原nearBottom=true时增量scrollTop；每次先更新高度ref，RO再次收到同尺寸时delta0避免双补偿。原parent选中/换卡layout中的最小reveal保留，并在showCardPanel=false时清空高度基准；面板初次挂载以当前高度建立基准。退出cleanup/断开RO完整，回调不修改业务store/query/UI。

不改滚动距离阈值、smoothscroll、选中规则、数据加载、操作面板文案/布局/动作、近底以外阅读位置。可选onLayout不影响其他调用者。新增真实组件MutationObserver在异步子提交microtask立即采样（RO前），确定性证明组卡可见，原所有CES10断言保留。审核后RED→实现→GREEN/code review，再做新包全量验收。
