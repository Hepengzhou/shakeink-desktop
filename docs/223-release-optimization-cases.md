# Release 优化测试用例

依据：[方案](221-release-optimization-plan.md)。先独立审核本清单，再编写/执行 RED；不以改变阈值或删除旧断言消除失败。

| ID | 层级 | 断言及反例 |
| --- | --- | --- |
| OPT-P01 | unit/真实 FS | esbuild external 根支持 scoped/subpath、builtin 排除；各入口 hash 与 manifest 对应。缺少 manifest、stale hash、未知外部依赖失败，不删除任何文件。 |
| OPT-P02 | unit/真实 FS | required/optional/非 optional peers 的真实包内 closure 含嵌套版本、循环；不存在的 optional 可忽略，required 缺失必须失败。保留包的 WASM/data/native/LICENSE 字节。 |
| OPT-P03 | unit/真实 FS | 裁剪只删除指定的新输出 app/node_modules 未引用包；符号链接/包外解析/错误目标/项目自身拒绝。计算完整 closure 后才执行；无父 node_modules fallback。 |
| OPT-P04 | package | 真包无 Next/SWC/Prisma CLI/Monaco 原 npm 源包，全部运行 external 可解析且闭包完整；项目 out/worker/字体/migrations 完整；Next/compiled 及 Monaco 许可保留源 SHA。原负例仍拒绝 worker/入口缺失。 |
| OPT-P05 | integration/package | service 中真实官方 NextRequest/NextResponse 行为：JSON/status/header、cookie set/get/multiple/redirect 与 installed Next 等价。包内真实原 generated Prisma/adapter 事务写入、回滚、关闭、持久化重开查询；Sharp 转码；PGlite WASM 正常。网络禁用，不从父项目解析。 |
| OPT-C01 | unit/build graph | 启动目录模块没有 Monaco runtime 导入；完整 darwin419/win32403 命令不缺 ID/绑定/when/权重；schema/version/未 resolved/空目录失败。与原生成/live browser 套件核对全部字段。 |
| OPT-C02 | unit | snapshot 低优先级，live 高优先级，同 ID live metadata 生效，静态标签/作用域按既有规则；撤销 live 后恢复 snapshot；取消启动不泄漏目录；校验失败 unavailable、成功 ready。 |
| OPT-N01 | macOS真实包 | 同一脚本优化前后各3次独立规范路径空目录；记录入口 hash、启动、所有进程 working set、renderer heap/loaded JS/buffered longtasks；不把 OS cache 当冷磁盘，不声称 RSS sum 是独占 RAM；正常退出。 |
| OPT-N02 | macOS真实包 | 新包默认0模型、无监听服务、原生菜单/sandbox、本地模板真实读取、主题持久化和重开；冷启动前后 Monaco 加载边界确实不同。 |
| OPT-N03 | macOS真实包 | 使用隔离公开 seed，完成引导（只测试夹具 precondition）；设置在打开编辑器前显示完整快捷键。真实原正文编辑器离线首次打开、输入、切换 tab 后实例/草稿/选区保留、撤销重做、保存/关闭重开；TXT/MD/DOCX/PDF 实际生成并校验。受控原生 picker 必须注明，不算物理OS选择器。 |
| OPT-R01 | 全量 | 当前全部活动 unit/integration/browser/packaging、typecheck/foundation、生产 build；串行隔离高开销迁移文件，任何失败保留原输出并修复/完整文件复跑，不误记一次全绿。 |
| OPT-S01 | 体积 | 相同打包/压缩方法的前后准确字节和SHA/文件数；目标 app下降35%、ZIP下降25%、working set中位数下降10%、startup JS下降；耗时/longtask无实质回退。若未达标继续调查，不根据bundle大小推断RAM/帧率。 |

原生仅有 macOS arm64，不能以 Windows platform 模拟覆盖原生 Windows；无法执行的外部供应商/目标机签名、隔离和Intel验收不填通过。全部测试使用独立目录，不访问用户作品与 Key。用例允许先创建旧包无关的新 fixture，禁止覆盖已有损坏样本或正式产物。

## OPT-O01 / OPT-O02 追加契约（2026-10-19）

- OPT-O01：从实际 Providers 的 QueryClient 初始化表达式取得 client，onlineManager=false 时 queryFn 与 mutationFn 必须执行并完成，不能 paused；offline新请求可取消且 AbortSignal 仍有效。默认 refetchOnReconnect 必须明确为 true，网络恢复后 active stale query 仍重新读取。先在原初始化上 RED，再实现；禁止用全局强制 online 掩盖。
- OPT-O02：最终新包启动前将 Electron 浏览器会话 offline=true，使用真实本地DB/IPC加载作品和会话列表、完整快捷键、首次编辑、保存、四格式导出及正常退出/新进程重开。仍默认零模型、原生sandbox和HTTP拒绝策略，不能将此扩称为整机所有子进程断网或付费供应商验收。

## 页缓存追加用例（方案222复核通过后，2026-10-19）

下列新增用例需独立审核后才进入RED，不修改既有用例来适配新实现。所有输入为公开隔离夹具；基线128MB和候选32MB共享相同PGlite0.5.8、数据/机器/Node、默认参数/持久化策略。

- **OPT-M01 真实配置与边界（RED→GREEN）**：从实际Workspaces初始化inbox并创建真实作品；核对两类engine的SHOW shared_buffers=32MB。保存完整PGlite.defaultStartParams前缀并验证调用后未改变；调用选项实际包含完整前缀、仅追加-c shared_buffers=32MB，relaxedDurability仍false，未加initialMemory/maximum或关闭增长。记录server_version、shared_buffers/wal_buffers/transaction_buffers/subtransaction_buffers等存在项的setting/unit/source；不存在的版本项明确缺失。原数据库postgresql.conf保持128MB字节，关闭再开旧根仍有效32MB、文件SHA不变；去除候选后旧根仍以原默认128MB打开，数据正确。现状应先因实际128MB不符32MB断言失败。
- **OPT-M02 超缓存数据正确性**：通过真实Workspaces/Prisma adapter在隔离DB建测试表，payload SET STORAGE EXTERNAL禁TOAST压缩，至少64MiB实际pg_total_relation_size及内容字节大于32MiB缓存；校验所有行完整checksum与随机点读；实际write事务提交、异常rollback及重复键拒绝后原数据保持。正常关闭后由新OS进程重开并完整checksum；再以默认128MB的原PGlite options打开该既存数据，证明可回退且不迁移/损坏。两份公共root在inbox/作品隔离下不会串数据。记录WASM实际buffer长度，自动增长允许且不得以缩小initial/maximum或forced GC制造收益。
- **OPT-M03 性能与持久化探针**：固定64MiB实际数据，同一二进制以128/32两选项在独立OS进程/复制根比较。预声明ABBA各2次（或增加成完整重复组，保留所有轮次），每轮warmup后3次全量checksum扫描、固定seed的64次混合随机点读/更新提交及异常回滚；报告写入、扫描、点读的绝对值和相对变化，不只报最快一轮。候选中位回退超过 `max(基线10%, 扫描50ms / 混合批次20ms)` 即不接受并调查；不因不利结果调整阈值。库relaxedDurability:false选项保留，观察实际fs.syncToFs调用；默认-F继续保留，不把SHOW fsync=off误报本轮持久化失败或增强。
- **OPT-M04 包内与整应用**：包内helper在真实PGlite.create外加只读记录器（不替换engine/数据库/adapter），记录实际options、SHOW和WASM长度，验证最终原service打开的inbox/作品均32MB、默认前缀完整、false策略、无包外模块回退；其原事务/新OS进程读回断言保留。对新包重新执行完整构建、两类typecheck、全部unit/integration/browser/package和原生正文/完整草稿/快捷键/导出流程，全部新SHA绑定。
- **OPT-M05 总内存门禁**：旧三轮5秒WSS失败原样保留；ABBA时间序列仅诊断自然GC/WASM/页留存，不替代5秒门禁。新候选最终采样在无本轮并行测试下，预声明9个交替配对（基线→候选、候选→基线轮换，每侧9次独立新根），同一现有benchmark的5秒WSS与脚本/longtasks/ready口径，记录每轮全进程与renderer heap、使用全部成功轮次中位；仍要求总WSS降低至少10%，不得改用renderer heap或后时点代替。首开编辑和输入各3轮同夹具，记录延后Monaco产生的长任务，即使首次编辑更快也不能省略。

上述数据/performance probe不是业务数据库的变更：测试表仅存在于隔离目录。未知失败、超时和重试完整保留，旧候选包不升级为最终，任何未执行原生/跨平台/付费供应商范围继续列未验。
- **OPT-M06 空PG模板构建/加载**（候选3，待独立审核）：以真实同版本PGlite生成无应用表/用户行的gzip归档与严格manifest；原默认配置、locale/encoding与普通initdb等价，package版本/CJS/WASM/initdb/data及archive精确指纹。资源缺失、额外/非法manifest字段、非法bytes/SHA、归档损坏、版本/输入指纹不符、资源符号链接须拒绝；worker在写隔离root前失败。build→start和两package入口都绑定资源，不引入HTTP或动态下载。
- **OPT-M07 真Workspaces新旧分支**：用实际生成seed、真实Workspaces及原Prisma/adapter，在独立临时根完成inbox/两个作品、原迁移/作者/模板事务、不同业务UUID、提交/异常回滚/duplicate拒绝与关闭/新OS进程重开。wrapper只观察并完整透传PGlite.create；new DB有loadDataDir且无noInitDb递归，既有DB无loadDataDir；完整非空现有数据/128MB配置SHA保留，损坏非空不导入/不覆盖。公开大于32MiB载荷的checksum跨OS持久化、原默认128MB回退仍按M02全流程执行，新fixture可显式供seed加载，不能只mock create。
- **OPT-M08 最终产品再验收**：新包全build/两typecheck、全部unit/integration/browser/package、原本机离线会话业务完整重跑；包内helper实际传新seed固定路径并观察首次/重开、模块不逃逸。新完整九对启动批次必须新命名保存，原五秒WSS/两侧九值中位/10%门禁不变；首编/输入各3轮同脚本。旧M05全18次失败及初始64MB LinkError保持失败身份，不覆写、删不利样本或改门禁。


## OPT-U01 抽屉caption布局准备（待独立审核）

保持原CD-03 899→900及反向用例全部步骤/65ms窗口/逐rAF固定尺寸和首可见帧断言。新增独立确定性真实hook测试：在工具compact标志已匹配、实际工具宽变化导致viewport容量旧27px/新55px时调用prepare，必须立即写正确容量且返回false；下一次输入/DOM/容量均稳定才返回true。工具标志尚未提交也返回false；已稳定反复prepare不阻塞。测试观察真实hook和DOM/测量输入，不复制measure实现；不得把更迟的帧当首帧或仅测试字符串包含。

修复后完整content-tabs/content-drawer及相关sidebar套件保留字体/缩放/工具overflow、拖拽/焦点、窄宽模式/恢复/保活/降动效原断言，再执行57文件全浏览器。新增测试若引入新文件/数量，最终证据按实际发现清单计数，不沿用604常量。


## OPT-U02 选卡异步子提交补偿（待独立审核）

新增CES-10d使用原ces10公开消息/真实ChatPanel/query/候选卡，点击前注册只读取证MutationObserver；在实际候选操作面板由loading长到完整选项的DOM提交microtask中，立即记录原真实消息viewport/group geometry。等待选项存在仅用于取回已记录结果，必须断言首次增高提交时已完整可见（RO前），不能用后续rAF或sleep结果替代。旧实现应稳定RED。记录的observer在成功/失败finally断开，不修改DOM/store或控制产品调度。

原CES-10a立即stage1、stage2，10b中部历史选择scrollTop不动、10c换卡不遮挡保留。新增覆盖：近底同步增量只一次（子layout后原RO不重复），上翻阅读时异步增长不挪动视口；测试需通过真实子面板加载触发而非直接调用复制补偿算法。完整chat-empty-state与card-select业务套件及全部浏览器全跑。
