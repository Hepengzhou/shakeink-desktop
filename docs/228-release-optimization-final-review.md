# Release 优化最终证据独立审核

## 最终收尾状态（2026-10-19）

**按用户“优化到目前已经可以了，直接收尾吧”的要求关闭本轮工作；功能回归通过，原优化验收未全部通过。** 此结论取代下文各阶段的“待执行/继续优化”安排。保留当前已验收功能的layout包与同版源码，停止新候选、诊断和追加性能；不是将未达标项改记通过。

已独立核对[229收尾总结](229-release-optimization-summary.md)、220/221/226/227顶部状态及 `closeout-verification.json`：app普通文件减少52.6553%、同方法ZIP减少43.6315%；本批18轮ready中位2898.032583→2606.826708ms、长任务295→169ms、启动JS8091673→3763613字节。但原5秒总WSS为861424→888592KiB（841.234375→867.765625MiB），**增加3.15385%，至少下降10%的内存目标失败**。最终首编/输入各3轮未执行，单次功能验证时延不作替代；原M05失败及全部18份原始样本保持原样。

功能结果仍为core296文件2240/2240、browser58文件614/614、真实package50/50及新包声明范围内原生业务/完整516字符草稿恢复/正式原文未改/两次正常退出通过，1287项源码同版。package的wrapper解析失败保留，真实spec日志50/50与退出0的更正可采信，详见下文。构建及两类型检查通过，没有将分组重复unit简单相加为独立总数。

只读审核 `verify-closeout.mjs`：它验证当前1287输入、真实包日志/原生报告、18轮原始SHA和两侧真实中位、五入口/manifest/两seed及ZIP/DMG流式SHA，明确要求memory.passed=false并输出originalOptimizationAcceptance.passed=false。主代理已执行退出0；本审核未重新运行该脚本或大文件哈希，另独立计算报告引用的15项原始证据SHA均匹配。该报告的evidenceIntegrityVerified/functionalVerification.passed与原内存目标失败含义分开，没有运行要求memory通过的旧finalizer来伪造完成状态。

`requirements-traceability.json`相对本轮HEAD只有新增releaseOptimization20261018Revision不同，其status为closed-at-user-request-with-unmet-memory-target、functionalRegressionPassed=true、originalAcceptancePassed=false、formalReleaseAccepted=false；其它全部既有顶层台账对象逐项相等，跨平台/业务/签名验收没有被启动或本轮局部通过升级。229所列MB/MiB、百分比、包路径、字节/SHA和未执行范围均与已审报告一致。只认可本机macOS arm64 Ad-hoc声明功能范围，不扩成正式开发者签名/公证、干净目标机安装隔离/Gatekeeper、Windows/Intel、物理IME、付费供应商或OS物理断网通过。

**收尾文档审核通过，无需继续优化；主代理可据此完成文档与全部原始证据归档交付。** 最终ZIP203,261,789字节/SHA `307abac4625425bfb28aed5455c75e2d2a949b155e4fb0ed27ed734d6ac48cd0`，DMG225,788,196字节/SHA `27911655b8c5dfae6a2207772f3ab7388f95b5d4933fa07af929a49215d7d8c4`。证据tar与SHA256SUMS的实际生成/交付由主代理完成后再作为交付事实，本文不提前声明归档已生成。以下审查过程及旧失败全部保留。本次仅更新228，没有修改产品/测试、运行测试/构建或新优化；后续停止负载。

审核日期：2026-10-19（Asia/Shanghai）。范围：`227-release-optimization-verification.md`、本轮原始证据、最终 app/ZIP/DMG 及 `requirements-traceability.json`。本审核只写本文档，不修改生产/测试，不重新运行构建、测试或原生重负载；做了只读 SHA、文件清单与报告交叉核对。

## 初轮阶段结论（历史）

**已完成部分的证据核对通过；整体最终验收尚待浏览器回归、三轮性能对照及最终总结/台账复核。** 初核时 `browser-final.json` 只有开始状态，尚无 completedAt/exit/counts/passed；三轮性能结果尚未提交；`229` 总结尚不存在。这些项目不计通过，也不能根据包体积下降推断内存和卡顿目标已满足。

## 已核对的最终版本与自动回归

- `core-final.json` 与 TAP：291 个原文件，257 unit + 34 integration，2204/2204，fail/cancelled/skipped/todo 均0，exit 0。独立枚举当前这两个目录的全部 `.test.ts`，与报告文件清单一致，无漏项/多项。报告 1275 项输入 before/after SHA 逐项相同，进一步重新计算当前文件 SHA，全部仍匹配；因此本结果包含最终 Provider 修正，不使用修正前 2202 结果替代。
- `package-tests-final.log`：完整 npm test:package 命令，50/50，fail/cancelled/skipped/todo 均0。日志保留实际 app/ZIP、截断 ZIP、缺 worker/HTML/字体、历史损坏样本、安全配置等完整用例，包含包内 service/Prisma 在两个独立 OS 进程写入与重开。它会重复部分 core unit 策略用例，不能将分组数简单相加为独立用例总数。
- `build-offline-final.log` 包含完整 Prisma 生成、Next 正式导出及全部 desktop 入口；最终类型检查日志无诊断。最终 app 五个 runtime manifest 入口 SHA 均与包内实际文件和当前 dist 一致，未以旧构建替代。
- 原 RED、首次 review 反例、48/50 缺 manifest 的旧 fixture 失败、停止的旧 browser、offline 原始失败和错误重开预期的 native-business-final.json 均仍保留，未因后续成功而覆写为通过。

## 最终实际产物

`final-paths.json`、`artifact-metrics-final.json` 和实际文件互相一致。最终 app 为 `release/.staging/adhoc-arm64-3PoyMp/volume/玄印写作.app`；ZIP/DMG 位于 `release/adhoc-macos-arm64-cf487445-d4a9-45ec-b9f5-5a12a5666b46/`。

| 指标 | 独立只读核对结果 |
| --- | --- |
| app 普通文件逻辑字节 | 491,473,106；普通文件 3,040，符号链接 14，与 metrics 完全一致 |
| ZIP | 198,938,954 bytes；SHA256 `653db840844e76ada44208afca5f90eab459c7303c917e7d7f3fe44906ef848e`，已流式重新计算 |
| DMG | 221,356,162 bytes；SHA256 `6f30330cc624811c9eb06605bf4531760c2df699855032972eab600b525ae19d`，已流式重新计算 |
| runtime 清单 | 五入口齐全，入口摘要与包内/当前 dist 无差异 |
| 同方法尺寸收益 | 相比 baseline-size.json 的 app 1,047,630,756 bytes、ZIP 360,594,897 bytes，分别减少 53.0872% / 44.8303%，满足方案的 35% / 25% 尺寸目标 |

尺寸采用普通文件字节，链接负载不混入，不能与 Finder 磁盘分配大小混比。两边 ZIP 的方法声明一致，为 ditto `-c -k --norsrc --keepParent`；基线声明修改前 out/dist 与当时源码构建一致，历史另一份更大 DMG 没有被拿来放大本轮收益。app 无单一目录文件 SHA，身份通过最终路径、五入口摘要、归档与实际文件表/CRC 检查共同绑定。

交付 `adhoc-test.json` 明确 applicationSignature=adhoc、containerSignature=unsigned、notarized=false、formalReleaseAccepted=false、hardenedRuntime=false；其 DMG 大小/SHA 与当前实际文件一致。内部 app 的资源封印/arm64 检查与挂载后验包证据可支持本机 Ad-hoc 测试包范围，不能升级为 Developer ID、公证或 Gatekeeper 正式分发通过。缺少 APPLE_KEYCHAIN_PROFILE 的正式 preflight 拒绝仍保留。

## 原生业务与草稿证据

`native-business-complete.json` 与 `native-business-final-verified.json` 指向上述同一最终 app，均包含完整完成时间、passed=true，首轮和重开退出均 code0/signal=null，无记录到的 pageerror/HTTP 请求。脚本从真实设置/菜单/正文编辑器操作，保留 controlled SaveDialog、CDP 键盘、公开 seed 和隔离目录等范围说明。

已交叉核对脚本断言、报告与 `native-recovery-verified.png`：首次编辑前 419 命令、真实录制/多绑定/冲突转移；编辑器 DOM 保活、选区与撤销重做、CmdS；实际 TXT/MD/DOCX/PDF 导出；独立 app 进程重开主题/自定义绑定/零模型持久；真实“保留的草稿”textarea 完整 516 字符匹配，截图中新增中文段落实际可见。恢复记录保持未批准草稿，不自动重放发送/批准。PDF 证据是实际解析、页数/标题及代码/包内字体资源路径，不把它声称为物理打印或完整视觉排版审核。

初核提出的证据表述精度项（待最终文档/脚本回查）：

1. 脚本直接比较同一 `.monaco-editor` DOM、选区并执行 undo/redo，没有直接读取 Monaco model 对象身份。验收表述可用“同一编辑器 DOM、选区和撤销状态保持”，避免将 model identity 写成已直接实测。
2. renderer offline 的实际时序是 electron.launch 返回后、测试调用 firstWindow() 前 setOffline(true)。这能证明该模拟离线会话中的本地业务完成，未证明在 renderer 第一条脚本运行前已断网，更未证明 OS/主进程/Worker 物理断网。
3. 当前重开断言证明正式正文不含 marker，并把完整恢复文本逐字比较为“重开时正式正文 + 10 个测 + 换行 + marker”。若最终报告使用“正式原文逐字完全未变”，还应将重开正式正文与编辑前或 seed 固定原文直接比较；不要将“不含 marker”扩写为任意内容的完整一致性证明。真实恢复 textarea 的逐字匹配与新增段落可见已直接成立。

上述是测量/表述精度边界，没有发现需要为通过本轮验收修改暂存或审批业务的证据。此前错误重开预期的失败报告保持失败；后续通过报告才支持已批准的真实草稿恢复流程。

## 待证事项与台账

- 全部 browser：等待 57 文件最终 counts/exit/完成状态及源码前后指纹；不使用部分 TAP 或停止的旧运行。
- 启动内存与 UI 响应：等待同方法三轮最终 app/基线对照，含 working set、heap、解析脚本字节、longtasks、首次编辑与输入响应。需核查有效样本、统计口径、原始结果与最终包身份，不能靠单轮 native verify 的耗时替代性能验收。
- `229` 总结与最终 `227`：待上述完成后逐项回查目标、阈值、未验条件和实际 SHA。初核时台账的本轮 revision 为 in-progress，符合当前状态；diff 只新增本轮记录，未将原跨平台业务验收条目批量升级。
- Windows、Intel Mac、物理中文 IME、整机断网、付费供应商、干净目标机下载隔离/安装和正式签名公证继续未验。即使本机全部自动化/原生检查通过，也不将这些状态提升。

后续最终结论将在本文件追加，保留本次待证状态的来由。

## 原生证据精度项复核

三项初核精度项已关闭：227 已将 model 身份表述收窄为直接断言的 DOM/选区/undo 行为，并写明 electron.launch 返回后、firstWindow() 调用前的实际 offline API 时序。新增 `native-business-exact-prose.json` 在同一最终 app 完整复跑成功；脚本还直接断言重开 stored.content 逐字等于 seed 固定原文，再断言恢复 textarea 逐字等于原文与全部新增输入，已同时证明正式原文不改和完整 516 字符草稿可读。首轮及重开退出仍 code0/signal=null，记录到的 errors/httpRequests 均空。

交付目录 `adhoc-test.json` 的 startup 现引用该 exact-prose 报告与 SHA，status 为 passed-local-staging-copy；其 scope 明确没有 installed-copy/Gatekeeper/整机断网或 earliest-renderer-script 声明，formalReleaseAccepted 仍 false，未验清单保留。未发现将有限原生通过扩大成正式分发或跨平台全部通过的记录。浏览器、性能和最终总结/台账仍按前节待证。

## 完整浏览器回归复核

`browser-final.json` 已于 UTC 2026-10-18 16:22:24 完成（Asia/Shanghai 为 2026-10-19 00:22:24）：57 个原文件、604/604，fail/cancelled/skipped/todo 均0，exit0、signal=null、passed=true。独立枚举 `tests/browser/*.test.ts` 与清单相符，无漏项/多项；1275 项输入 before/after 均相同，重新核对当前文件也全部匹配。完整 browser 门禁通过，不使用旧停止运行或部分输出。后续仍待四组顺序性能报告与最终 227/229/台账复核；不在采样期间启动原生或重测试。

## 首轮四组性能审核：内存门禁未通过

`paired-benchmark.json` 按预声明 baseline startup → optimized startup → baseline editor → optimized editor 顺序保留四组三轮结果，全部运行正常结束，没有并行本轮重测试。**runner 的 passed=true 表示运行退出成功，不表示下列性能阈值全部满足。整体最终验收目前不通过内存门禁，不能输出“全部目标完成”。**

| 三轮中位数 | 同版基线 | 最终包 | 当前可支持的结论 |
| --- | ---: | ---: | --- |
| 总 working set（KiB） | 853,968 | 1,215,392 | 当前固定口径样本增加约42.32%，未达减少至少10%的目标 |
| 已解析启动脚本真实文件字节 | 8,091,673 | 3,763,156 | 启动 JS 减少，使用两侧相同 CDP+包内 stat 口径，旧 ResourceTiming=0 未被拿来比较 |
| launch→账号控件 attached（ms） | 2,548.53 | 2,470.02 | 此定义下中位数略降，不等于全部业务已空闲 |
| 启动 buffered longtasks 总时长（ms） | 279 | 161 | 启动样本下降 |
| 首次编辑（ms） | 1,790.12 | 1,380.32 | 同夹具操作路径中位数下降 |
| 每轮10次输入→两次 rAF 的轮内中位数（ms） | 17.28 | 16.68 | 当前输入观测未变慢；包括自动化/调度开销，不是纯键盘延迟 |
| 首次编辑阶段 longtasks 总时长/最大值（ms） | 0 / 0 | 112 / 112 | 新的首次装载阶段长任务必须保留并解释，不能仅报告有利的启动任务数或输入中位数 |

内存差异主要在 Browser（main 含 service Worker）条目：基线三轮 382128/402688/788992 KiB，优化包 824672/779888/1118272 KiB；renderer heap 约29MB→21.6MB 是另一项真实观测，但不能代替未达标的总工作集。WSS 包含共享页且不是独占物理 RAM；宽幅波动要求进一步等量诊断，既不能凭三轮直接断言永恒泄漏，也不能据此将不利结果当噪声丢弃。

只读核对已知初始化入口后的时点结论：`desktop/main/index.ts` 的 launch 在创建 BrowserWindow 前先 `waitRootStartup` 再 `service.call('ready')`；service ready 等待 Workspaces.initialize、inbox 连接、PGlite.create/migrations/Prisma 初始化、模板库事务及 recoverConversationTransfers 完成后才发布。因此不支持“采样时初次数据库初始化的 await 尚未完成”的直接归因。初始化后未回收的 V8/WASM/文件页、后续 UI 读取与进程工作集变化仍可能影响单点结果，当前证据尚不能确定各自贡献。

后续可用相同两包/相同就绪与活动条件的 t=0/5/15/30/60 时间序列、main 的 RSS/heap/external/arrayBuffers 以及交换 AB/BA 次序作诊断，并保持主进程/Worker 统计归属清楚。不得强制 GC、降低持久化、删业务或事后挑选有利时点/轮次来替代原5秒与三轮门禁；若诊断需要调整测量定义，应保留原失败并说明原因。最终性能与总结/台账审定仍待后续实际结果，本轮不因功能回归和体积通过而豁免内存目标。

## OPT-M03 唯一 ABBA 证据独立复核（2026-10-19）

**M03 对照按预声明门限通过；存在已披露的查询耗时取舍，不能称为数据库加速。新32MB包的整体验收仍未完成。** 本轮只读解析 `cache-performance.json/.log` 并独立重算全部层级统计/门限、校验原始记录和输入SHA，没有重新启动数据库、构建、原生或性能进程。报告 SHA256 为 `a205d0529c5f800c63de6755dcb4e9f00ad7f6575e33b521ea2f523f050a4f9d`。

报告开始/完成于 UTC 2026-10-18 16:35:19.541～16:35:36.705，Node24.18.0/PGlite0.5.8。唯一ABBA顺序及独立PID为：128MB/84783、32MB/84811、32MB/84840、128MB/84885。四个关闭seed的复制根独立，完整三扫的轮内中位数分别为175.276125、217.967959、215.355042、181.141042ms；没有丢弃较慢扫描或把六次相关扫描混为六个进程。

| 重算指标 | 128MB两个进程中位 | 32MB两个进程中位 | 差值 / 预声明容差 | 结论 |
| --- | ---: | ---: | --- | --- |
| 三次正式checksum扫描的进程中位（ms） | 178.2085835 | 216.6615005 | +38.452917 / max(17.82085835,50)=50ms；+21.5775% | 在容差内 |
| 固定64操作混合批次（ms） | 55.1280205 | 61.975917 | +6.8478965 / max(5.51280205,20)=20ms；+12.4218% | 在容差内 |

两个值的中位数按算术平均计算，所有派生字段与原报告一致；passed=true 的依据是这两项门限通过，并非相对变化低于10%。首次点读108.1595→90.4002915ms、首扫258.3084375→245.61675ms、warmup212.337333→252.5555625ms也均保留，不能只挑前两项有利数值。227 已同时披露扫描/混合正向耗时增幅与容差，表述符合证据。

完整性独立核对结果：

- 每轮 cold/warmup/三次正式/final 扫描均1027行、67,306,534内容字节，完整checksum均为 `835868a7ef1b16795d95dd931be08585008837b10eef04e779b076e58c5379b4`。混合固定64操作的index/id/kind四轮完全相同，32点读/16提交/16写后回滚，各组成耗时和计数与原逐项记录相符。
- 每轮522项 fs.syncToFs 观察均 relaxed=false、completed=true、无error。该结论是库同步调用及完成状态，不等于522次物理磁盘刷写或断电恢复试验；原默认-F及fsync=off仍在，M01的实际等待/错误传播证据另行成立。
- PG18.3 两侧 shared_buffers 分别16384/4096个8KiB block、source=command line；wal_buffers512/128、transaction/subtransaction_buffers32/16，full_page_writes与synchronous_commit均on，缺失项为空。每轮读取前后 WASM buffer 分别197,722,112/134,217,728字节，没有将其写成初始/最大内存配置已变或整应用WSS收益。
- 混合更新后的 table71,409,664 / TOAST71,327,744 / index40,960 / total71,450,624字节四轮一致；载荷仍未压缩且实际全读超过缓存。报告所列 PGlite CJS/WASM 与数据phase三项输入SHA重新计算仍匹配。

这仅验证固定公开载荷、原adapter/校验开销及本机ABBA工作负载的取舍，不能推论所有数据库规模/业务均无回退。较晚时点时间序列和旧三轮WSS失败保持诊断/失败身份，不能用本节数据库探针或WASM观测抵扣原5秒总WSS至少下降10%的目标。

## M05 九对编排预审：统计正确，执行前补齐证据绑定

只读审核尚未执行的 `docs/evidence/release-optimization-2026-10-18/memory-nine-pairs.mjs` 与实际 `scripts/benchmark-release.mjs`：固定 AB、BA 交替九对共18次，每侧九次逐轮 await；每次 benchmark 建立新的真实规范路径临时根；账号控件attached后等待原5000ms，采用全部 app.getAppMetrics 工作集之和，未改为后时点、renderer heap或强GC。两侧各九个值独立求中位数，判据 ratio≤0.9，未改为配对比值中位或最佳子集。它保留每次脚本/longtask/ready/heap及正常退出检查，统计主体符合224。

**执行前仍需补齐下列编排门禁；这不是样本量、阈值或测量定义变更。** 当前脚本只检查 core/browser 的 passed，再用 core.after核对当前源码；实际 run-suite 的 passed 并不包含零skip/todo、完整文件清单或两报告同一输入版本等全部条件。五入口及可执行文件SHA目前只记录，不与所选新包清单/当前构建绑定或在结束时复核；固定报告/轮次文件名也会在重跑时覆写旧失败。

1. 在启动任何样本前，检查两份最终报告完成时间/正常退出、完整有效counts且pass=tests>0、fail/cancelled/skipped/todo为0、changedInputs为空、各自before/after一致；将当前完整core/browser测试文件清单与其报告清单相等比较，并确认两份输入SHA映射相同且与当前文件一致。该检查可以轻量完成，不需要再启动测试。缺报告/过时browser/部分suite不能只凭passed放行。
2. 将候选可执行文件、五入口及包内 runtime manifest 与本次最终路径/当前构建的预期SHA实际比较，基线绑定其既有身份。记录采样脚本自身SHA，结束时复核两侧可执行文件/五入口、采样脚本与源码输入未变化；出错时保存error与全部已有样本再退出失败，不能留下可误读的完成状态。
3. 使用事前声明的新批次目录或拒绝已存在的报告/轮次路径（例如exclusive create），避免一次失败后重跑覆盖原输出。全部18次的schedule/包身份/阈值先保存，失败完整保留；任何缺样/错误仍须整批失败，不能只替换不利轮次。

主代理已收到上述轻量修正建议。补齐并复核后可按既定九对方法执行；当前没有M05结果，不判内存目标通过。新包build/类型/完整core/browser/package、包内32MB recorder、原生正文/完整草稿/快捷键/导出、首编及输入三轮、最终227/229/台账和新归档SHA仍需对应同一新包独立核对。此前旧候选的全部通过与失败继续按原版本保留，不追认成新32MB包已验收。

## M04复跑与M05门禁补充复核

M04包内helper对PGlite内部noInitDb引导实例的最小跳过已在225独立复核：仅跳过该无SQL数据库实例的观察，原create/参数/engine完整透传。原 `package-cache-tests-harness-failed.log` 49/50与80秒timeout保留；后续 `package-cache-tests.log` 完整50/50、零fail/cancelled/skipped/todo，实际write/reopen两OS进程分别记录3/2个持久化engine，全部32MB/defaults完整/relaxedDurability=false。新app为 `adhoc-arm64-JS63QP`，其manifest与五入口已独立匹配currentdist。两处纯类型注解的前后JS同字节证明亦见225；不改写M03旧源SHA或选择新性能轮次。

再次只读审核尚未执行的M05脚本，前节三项主要修正已落实：

- 两suite完成时间、正常exit、有效完整counts及零失败/取消/skip/todo、changedInputs为空、当前完整测试文件清单、git完整源码清单、各自before=after、两suite同版及当前文件SHA均有启动前强制检查。不能再仅凭passed或旧browser放行。
- 候选runtime manifest与currentdist manifest要求字节相同，准确五入口集合、包内和currentdist各自SHA相等，最后再次核对两manifest及入口。两侧可执行文件和五入口也保存并在末尾复核。当前 `final-cache-paths.json` 的app与executable实际对应同一app，独立只读核对成立；建议脚本加该路径对应断言，防未来误传拆配的paths输入。
- 主报告exclusive create拒绝已有文件，新batch目录mkdir拒绝重用，原始轮次位于该新目录；进程异常保存stdout/stderr、部分轮次及executionPassed=false/error/完成时间，不能就地重跑覆写失败。AB/BA九对、原5秒、九值两侧中位/0.9判据均未改变。独立node --check退出0，未启动任何样本。

尚待两处证据收尾：ignored编排脚本自身SHA没有纳入报告/末尾复核（当前scriptSha256是正式benchmark脚本，该正式脚本已由sourceHashes覆盖）；最终聚合及source/manifest/入口核对仍在逐轮catch之外，若末尾核对失败，主报告虽保留passed=false和全部已保存轮次，仍没有明确error/最终失败完成状态。请将该末尾阶段纳入保存失败的catch，并记录/复核编排脚本自身SHA；这些轻量修正保持同一测量方法。补齐前M05预审待关闭，也没有实际内存结果可判通过。新core/browser、原生与整应用性能继续按实际执行状态记录。

## M05 编排最终预审关闭

**前述编排待补项均已解决，预审通过；仅在完整当前core/browser门禁实际满足且没有并行负载后执行固定18次采样。** 本次再次只读核对实际脚本：selfFilename/selfSha256已写入主报告，末尾明确核对编排自身与正式benchmark SHA；从新batch mkdir、逐轮执行到全部聚合和末尾源码/包/入口复核已被外层try/catch覆盖，任一失败均保存executionPassed=false、passed=false、error及completedAt后抛出，原始子运行stdout/stderr也保留。主报告exclusive create继续在采样前拒绝覆盖，旧目录拒绝重用；候选app/executable精确对应断言已加入。

新增启动前package证据绑定要求exit0、passed及pass50、对应app/executable/ZIP/DMG目标与当前候选相等、原始日志SHA一致。已独立重新读取 `package-cache-tests.json` 与原始log，核对完整50/50和零fail/cancelled/skipped/todo、目标及log SHA `7a3a74558542932f1910b286b7df927980b34618814e071d184962215bdbfbf0` 均一致。完整core/browser检查仍在启动任何样本前；当前运行中的suite不会因partial报告而满足它。

独立node --check退出0；没有执行编排或启动任何样本。九对顺序/全部18次保留/原5秒WSS/两侧九值中位/0.9门禁和旧失败身份均未改变。预审关闭仅说明采样编排可以使用，不构成M05内存结果、当前完整suite或整体最终验收已通过；实际报告、首编输入、最终归档/227/229/台账仍按后续证据核对。

## 新浏览器首轮失败与完整独占复跑待证

**新32MB版本的浏览器回归当前未通过，M05不得启动。** 已只读核对首轮 `browser-cache-final.tap` 第291行起的CES-10a失败及配套JSON：stage-1 panel swap时groupTop529.09375、groupBottom750.234375，消息viewport为77～535.375，原“整组完整可见”断言确实失败，未降低几何容差。该driver报告UTC2026-10-18 16:43:44.913开始、16:48:21.985结束，57文件计划清单、exit1/signal=null、passed=false、changedInputs为空；因中途停止没有完整TAP汇总，counts均null，不能当成0或一次完整57文件执行。

`browser-cache-stopped.json` 记录driver93269及其10个后代、停止原因和停止前TAP SHA；独立核对所列ppid链均归属于该driver。主代理仅停止这棵已核实的测试进程树，让driver记录正常的失败退出和源码after，保留原始失败/停止证据。后续若为完整独占新一轮腾出final tag，须无损改名保留这轮JSON/TAP/日志及可追溯身份，不覆写成通过。

另直接读取 `tests/browser/chat-empty-state.test.ts`：该场景运行真实ChatPanel/useAgentChat/composer，通过公开受控HTTP响应及QueryClient夹具提供数据，没有执行本地service/Workspaces/PGlite；测试及 `src/components/layout/ChatPanel.tsx` 无本轮diff。因此当前失败不是证明32MB数据库读写损坏的证据。并行core数据库压力是待排除的环境因素，尚不能据此宣布根因为负载、忽略失败或称产品必然没有问题。

认可按既定原断言、原测试源码，在core完成后完整独占重跑57个browser文件；不以单独CES-10a或部分suite代替完整回归，不先改业务/测试来消除未归因失败。后续独立审核须核对完整604用例结果、正常退出、无skip/cancel/todo、全部原始失败保留，以及当前源码before/after与最终core相同，再决定浏览器门禁是否通过。此项关闭前保持整体待证/M05未启动；本次未运行测试、停止进程或修改实现。

## 原生输入统计修正预审

**`native-editor.mjs` 本次统计修正通过，可在最终两侧各3次首次编辑/输入对照中共同使用同一新脚本。** 已将其与保留的 `native-editor-before-median-fix.mjs` 逐行diff；变更仅为增加crypto导入与报告元数据、十次输入的正确中位数计算，以及收窄一个check说明。十次输入动作仍逐次insertText后等待两次rAF，次数/顺序、既有等待、首次编辑计时、longtask记录、Tab/选择/undo/redo、正文/完整草稿/导出及退出断言均未改变。

原轮内统计取有序数组[5]（第六值）；新实现准确改为 `(orderedInputs[4]+orderedInputs[5])/2`，即十个样本第五/第六值的均值。既定每侧3轮的聚合仍取三个轮内中位数的中位数，样本未删除或另选。报告增加 `node:process.version`、实际脚本字节SHA256和inputStatistic口径；直接check文字由DOM/model instance改为same editor DOM/selection，与既有直接断言一致，没有新增未经实测的model身份声明。

旧脚本/旧报告及旧数值保持原身份，不事后以新公式重解释或改写旧四组结果。后续新两侧对照都需记录同一个新scriptSha256、各完整3轮及十个原始inputMs，不能将旧第六值统计与新中位数直接混为同一轮次结果。独立node --check退出0，本次只读取/校验这些小脚本，没有执行它们、读取归档大文件或运行负载；完整browser、M05实际结果与最终文档验收继续待证。

## 新版本完整core/browser门禁关闭

**新32MB版本完整core与独占browser结果核对通过，前述浏览器待证项关闭；M05实际结果仍待验。** 本轮轻量读取最终报告/TAP、枚举当前测试文件名并比较报告中的源码摘要映射，没有重测、逐文件重算整个源码树或读取大归档。

- `core-cache-final.json/.tap`：293原文件、2207/2207，Node24.18.0，UTC2026-10-18 16:43:42.094～16:48:57.721，exit0/signal=null、fail/cancelled/skipped/todo均0。
- `browser-cache-final.json/.tap`：完整57原文件、604/604，UTC2026-10-18 16:50:28.515～17:02:34.185，exit0/signal=null、fail/cancelled/skipped/todo均0。该轮在core结束后开始；CES-10a按同一原断言通过，未以单文件结果取代整套。
- 两份实际文件清单分别与当前unit/integration、browser目录全部 `.test.ts` 一致，无漏项/多项。各1279项before/after逐项相等、changedInputs为空，两suite完整摘要映射也相同；生产Workspaces SHA仍 `7b2a77da3b585ef86085f09fd0e6fca9b1710b990ba0552461f4c15ec9a5a2cb`，包含类型修正的数据phase SHA为 `413c175d8832aa6647600976885e949351a5be628424619b0745e96beac22306`。TAP完整汇总与JSON一致，无not ok条目。采样编排还会在开始/结束按既审门禁核对当前源码/包身份。

旧并行失败已无损另存 `browser-cache-concurrent-failed.json/.tap/-run.log`，`browser-cache-stopped.json`仍在。独立核对其exit1、CES-10a失败、未完成counts=null与最终绿轮并存；旧after和最终after摘要映射相同，说明没有通过变更测试/组件源码来取得新绿轮。停止/完整重跑的记录说明执行条件，不能反推已证明并发压力是唯一根因；原失败不改写为通过。

完整回归门禁通过后，允许按预审脚本、主代理已核实的无并行残留负载条件进入固定九对采样。本节不宣称M05内存阈值、最终首次编辑/输入或整体目标完成；仍需实际性能、归档/最终文档与台账证据。只追加本审核文件，未启动任何测试或性能进程。

## M05 九对实际结果：32MB候选仍未达内存目标

**M05执行完整，但内存门禁失败，整体优化目标尚未完成。** `memory-nine-pairs.json/.log` 保留全部18次，报告executionPassed=true、passed=false；主代理记录编排退出1，与脚本门限分支及报告一致。本轮轻量只读独立复算，没有重新执行采样、读取大归档或启动其他负载。

报告UTC2026-10-18 17:03:08.257～17:05:42.568，Node24.18.0；selfSha256=`28f0bb7df9175fe1764c609c687d0af493e06a9b30d928be9e364addeb8385eb`，与已审编排一致。顺序完整为AB/BA交替九对，无缺样/补样；每次样本passed、正常exit0/signal=null、记录errors为空，workingSetKiB均与该次全部进程条目之和相符，对应18份原始报告文件仍在专属batch目录。

| 全部九值中位数 | 原同版基线A | 32MB候选B | 独立重算结论 |
| --- | ---: | ---: | --- |
| 原5秒总WSS（KiB） | 1,151,152 | 1,065,088 | ratio0.9252366325，下降7.47633675%，不满足ratio≤0.9/至少下降10% |
| launch→账号控件attached（ms） | 2,847.404041 | 3,020.501583 | 增加173.097542ms，完整保留，不称本轮启动加速 |
| 解析启动脚本文件字节 | 8,091,673 | 3,763,156 | 启动JS下降，不代替WSS门禁 |
| startup longtasks总时长（ms） | 287 | 168 | 当前样本下降，不代替未完成的首编/输入验收 |
| renderer used heap（bytes） | 29,011,380 | 21,359,792 | renderer收益保留，不能替换总WSS指标 |

独立使用A、B各全部九值排序取第五值，得出上述全部中位数；没有转用配对比值中位数或删去极值。A原始WSS为843072/938592/935616/1094640/1361216/1346848/1588880/1200080/1151152，B为881968/834064/1030400/1128096/1090416/1065088/1139152/1436784/1039072；大幅自然波动仍可诊断，但不得因接近目标而放宽10%、重跑同候选挑结果、改后时点或强GC。旧首次三轮失败与本次32MB九对失败均保留，不将任何功能/体积/库探针通过升级为总目标通过。

32MB改善了该批总体中位数，但目前不足。后续需要真实的新优化与相应方案/用例/实现审核、完整回归和预声明新批次；不通过复用同一候选再抽样来追认本批达标。本轮只追加此失败审核记录，M05门禁保持未通过，最终229与台账不得记“全部目标完成”。

## 候选3 九对编排资源绑定预审

只读diff `memory-nine-pairs-seed.mjs` 与已审旧编排：变更仅为新package/core/browser证据tag、新默认batch名，以及seed manifest/archive的版本绑定。两份资源要求包内字节等于当前构建，记录resourceHashes并在全部采样结束时复核包内/构建SHA；因此两个被gitignore的生成物不会因只比五入口而遗漏。原完整suite/源码/可执行文件/五入口/包清单/脚本自身验证、exclusive create、独立新根/ABBA九对、18次全部保留、原5秒总WSS、两侧九值中位/ratio≤0.9以及失败保存均未改变。

**该增量编排预审通过；尚无候选3新包或最终suite，不得执行或记M05通过。** 独立node --check退出0，没有运行编排；后续必须先满足新tag完整证据和同一新资源/包的门禁，并按独占无并行负载执行。新批次不会覆写候选2的18次失败，也不将构建期/Node诊断RSS并入应用结果。候选3实现及启动恢复反例的独立代码审核记录见225，实际最终产物/原生/完整回归/性能与227/229/台账仍待证。

候选3代码审核的最后待补项现已在225关闭：包根回退拒绝、精确vanilla检查、26项资源回归和真实pointer-written恢复负例/同journal有效seed控制均核对通过。新九对编排SHA为 `5f171ef8006057ef3f338549c762a2a233c8a3e6191803f576375cc2a0b5332d`，增量预审保持通过；可以先执行完整新build/打包/回归，再由实际新tag门禁决定何时开始固定采样。当前没有新包/M05通过结论，候选2九对失败身份不变。

## 候选3最终core、包内业务与原生业务证据复核

**本轮完整core、package及单轮原生业务门禁核对通过；完整browser仍执行中，M05尚未执行，整体目标保持待验。** 本节只读小报告、原始TAP/log、测试文件名与必要四个源文件，并目视新恢复截图；未重测、读取大归档或逐文件重算完整源码树，避免干扰当前独占browser。

`core-seed-final.json/.tap`记录Node24.18.0、darwin arm64，UTC2026-10-18 17:39:12.834～17:44:11.726，完整296文件2240/2240，exit0/signal=null、零fail/cancelled/skipped/todo、failureTitles=[]。报告296文件清单与当前unit/integration全部.test.ts逐项相等；1286项before/after映射完全相同、changedInputs=[]，TAP完整汇总亦2240/2240，无not ok/失败条目。独立轻量核对main、Workspaces、shared validator及新隔离构建helper的当前SHA均等于该报告after；这不是声称已独立重算全部1286文件，后续M05仍须按原编排实际核对当前完整输入。

`core-seed-inputs-after.json`所列五入口、runtime manifest及两seed资源，与先前 `seed-built-inputs-restored.json` 中同一不可变app身份逐项一致。两seed SHA仍为manifest `67d77fc901083950d082b5f8344e3087885230e1beb61c2d8c93dbc71627b952`、archive `af7360706ee594c97ed1fb1acbd0b212e8df1ac3e46d72097d632ff143ed95e7`，说明本轮core不再触发旧完整build的生成副作用；完整包当前目标为stage `adhoc-arm64-0pCEEK`，主service SHA `4cd332d2b50bb13382c78d242452c1a8a09ffa1efd24388a57a700fde55aaf7d`。本次不以这些小型绑定记录替代最终归档SHA或实际签名范围核验。

`package-seed-tests.json/.log`完整50/50、零fail/cancelled/skipped/todo、exitCode0，完成时间UTC17:38:14.123。独立计算原始log SHA为 `311a9a5737cbafeb60ab96df521f068c456bfff3c945e19d1c039221c12e09c9`，与JSON一致；app/executable/directory/ZIP/DMG五项targets与 `final-seed-paths.json`完全相同。OPT-P05仍实际运行包内service/Prisma、提交/重复拒绝保留/关闭及新OS进程重开，不使用包外模块后备。原始diagnostic记录write阶段3个持久化engine中2个loadDataDir=true、另1个为false；reopen阶段2个均false，全部defaultStartParams前缀、32MB与relaxedDurability=false保留、WASM134217728字节。原helper明确断言所有noInitDb=false；此处未将旧候选的内部引导engine跳过记录误当作新seed零引导证明。

`native-seed-final.json`与独立目录 `native-seed-final/report.json`内容完全相同，UTC17:38:16.524～17:38:39.005，verify单轮passed=true；executable准确对应上述新app，同已审native脚本SHA `4221a42534cb5046058d1cb96a62849b8541ef116df2fbbb2ec2ab0893b7359f`。报告errors/httpRequests=[]，真实419目录/快捷键录制、多绑定/原子转移、主题持久、实际编辑/选区/Tab保活、undo/redo/CmdS、TXT/MD/DOCX/PDF，以及两次正常quit exit0/signal=null均通过。恢复检查在源码中先断言正式正文逐字等于公开seed原文，再断言真实恢复textarea逐字等于原文+十个“测”+换行marker；本轮516字符、completeTextMatches/originalProseUnchanged均true。独立目视新恢复截图，保留的草稿弹窗及末尾“优化验证保留段落”可见，没有拿旧截图替代或宣称未批准草稿已自动写回正式正文。

该verify轮的1457.26325ms首次编辑、十次输入中位16.678146ms、editor longtasks164ms仅是本轮观测；十值中位独立重算一致，但没有两侧各3次最终对照，不提前宣称首编/输入优化通过。offline API时序严格为electron.launch返回后、调用firstWindow/UI操作前；它不保证首renderer脚本之前，不证明操作系统或全进程断网。实际CDP输入/受控SaveDialog也不扩大为物理IME、OS文件选择器或付费供应商验收。

已确认元数据失败、挂载别名失败、首core2235/2240失败及旧package47/50日志仍存在；旧失败不因本轮绿色而删除或追认。完整新browser结果、同版输入绑定、M05九对至少10%总WSS、最终两侧各3轮首编/输入、归档指标与227/229/台账一致性仍待独立核对。本节只追加审核记录，不把上述局部关闭升级为整体目标完成或跨平台全部通过。

## 候选3完整browser失败：两个可见帧契约须定位

**候选3浏览器门禁未通过，M05不得启动。** `browser-seed-final.json/.tap`为完整57文件、604项执行，UTC2026-10-18 17:44:25.515～17:56:34.629，exit1/signal=null、602通过/2失败、零cancelled/skipped/todo。1286项before=after、changedInputs=[]，完整映射与本轮core.after相同；不能用旧32MB版本完整604通过替代，不能将602项或后续局部重跑拼成完整通过。本次只读报告/相关已知源文件和既有用例文档，未执行浏览器、数据库、性能或大归档哈希。

CES-10a的原始stage-1几何为listTop77、listBottom535.375、groupTop529.09375、groupBottom750.234375、scrollTop3967，组卡底部确实超出214.859px；与旧并行失败原始数值完全一致，当前已在独占完整browser下复现，不能继续归因为并行core压力。测试先等真实会话恢复、字体/祖先CSS动画及真实消息滚动容器近底，再点击候选并等candidate-action-panel可见，立即读取真实几何；点击后没有等待ResizeObserver/后续rAF。既有批准文档 `docs/reviews/2026-10-16-card-panel-scroll-test-cases.md`明确要求“面板出现即组卡完全在消息视口内”，stage1不是仅等最终选项出现的最终态契约。因此仅给点击后加frames/延时，或移除stage1，都可能掩盖原需求，不能凭有异步RO便判fixture错误。

静态疑点仍需诊断而非当作已证根因：ChatPanel的revealSelectedCard在showCardPanel/candidateId变化的layoutEffect执行一次，后续dock增高只由passive effect建立的RO处理，并仅在nearBottomRef为真时补正delta。候选详情快速到达、scroll事件更新nearBottom或首次选中DOM提交的先后可能使首次补偿缺失。初始fixture的near-bottom<40和祖先getAnimations检查也不直接证明浏览器原生smooth scroll已经停止。建议针对同一公开场景记录点击前后、实际layoutEffect、每次RO、scroll事件和连续rAF的list/dock/组卡矩形、scrollTop/scrollHeight/clientHeight、nearBottom及选中DOM；分别观察首个paint和真正用户上滚。若首可见paint确实遮卡，应按产品时序缺陷修复，并保留可见历史卡零扰动/用户上滚不被拉底/换卡/慢详情二次增高契约。只有证据表明fixture前置未完成且实际业务首可见帧正确，才讨论独立、可观测的前置ready等待；不得以最终几何反向作为ready来消除该断言。

CD-03的899→900重开，`caption.tab:theme:isolated-0`在moving frame0宽28px，而最终参考55px，差27px，原容差0.35px确实失败。`framesDuring`完整采集动作前/后的帧；assertFixedFrames已通过实际visible>0.35px确定比较起点，并保留后续零宽关闭帧，因此错误里的frame0是首个实际可见移动帧，不是应直接剔除的原始closed首样本。原 `docs/reviews/2026-10-13-content-drawer-test-cases.md`要求新动作按最新窗口尺寸准备、运动内W/H和真实控制几何不变，等待最终open再开始比较会绕过该契约。测试虽有80/680/720ms等固定夹具等待，它们不证明这次可见运动中的控制宽度变化属于fixture采样误报。

CD静态候选原因：useSidebarDrawer保持V=0直到captionPreparation返回true；useContentTabStrip.measure却先按旧track.scrollWidth判断overflow、检查现有工具flags得ready，然后才写新的capacity CSS变量。capacity变动可再次改变track宽度、下一轮overflow菜单及工具占宽，ready可能在布局尚未达固定点时为真。该路径能解释28→55式二次变化，但尚无本轮逐帧/工具flags证据，不写成已证根因。建议记录prepare前后真实caption/track/capacity/tools compact与menu、visible、phase和每帧tab/title/control矩形，确认所有可见运动帧；若是该准备竞争，最小方案应在不可见准备期确认完整布局稳定再放行动画，不能通过冻结错误参考、删首帧、放宽容差或延后测试观察来过关。

相关ChatPanel/ContentTabs/DashboardShell及两测试/共享fixture、本次所读两个布局hook均无本轮git diff；受控组件fixture不执行本地Workspaces/PGlite。这限制了因果推断：当前既不证明seed导致UI回归，也不足以排除完整应用负载下的既存时序缺陷。后续先诊断、再按既定方案→独立用例→TDD与实现review处理实际发现；未有证据前不以重新抽一轮绿色归因或关闭。主代理已撤回tail进度的“无fail”误报，最终以本节完整原始失败为准。

## layout新候选完整自动化与package汇总更正复核

**新的layout候选完整core/browser与实际package测试通过，汇总更正可采信；本节不判性能或整体通过。** 两个UI时序修复已依次通过222方案、224用例和225代码审核，新增确定性RED/GREEN及完整相关文件亦保留。本节只读取报告/日志、枚举文件名、核对小型运行入口与两seed，没有执行测试/构建/性能或读取ZIP/DMG大文件哈希。

- `core-layout-final.json/.tap`：Node24.18.0、darwin arm64，UTC2026-10-18 18:10:07.852～18:15:33.587，296文件2240/2240，exit0/signal=null、零fail/cancelled/skipped/todo、failureTitles=[]。
- `browser-layout-final.json/.tap`：UTC18:15:42.214～18:28:00.991，58文件614/614，同样exit0/signal=null、零fail/cancelled/skipped/todo、failureTitles=[]。完整浏览器在core完成之后开始；不是以失败两例局部重跑替代整套。新增U01文件8项与CES新增2项使原604变614，按真实发现清单记录。
- 两份文件清单分别与当前unit/integration和browser全部.test.ts相等；各1287项before=after、changedInputs=[]，两suite摘要映射相同，完整TAP计数亦一致且无not ok。独立轻量复算ChatPanel、CandidateActionPanel、useContentTabStrip和新U01测试四文件当前SHA均匹配after；未声称本节重算全部源码，M05启动前仍须执行编排完整current输入核验。

`package-layout-final.log`记录新的完整生产构建/打包至adhoc-static-verified，主代理报告命令exit0；新唯一stage为 `adhoc-arm64-imI2oy`，目标目录 `adhoc-macos-arm64-589c3f46-cb51-4c98-b202-5d54d8b1c875`。两份layout类型日志分别是实际tsc --noEmit与foundation命令、未见类型诊断，主代理记录两命令exit0；不把打包日志中的构建/签名阶段拆拼到旧失败命令。正式开发者签名/公证边界保持未通过，Electron-builder默认identity=null与后续自定义Ad-hoc路径不能扩称正式发布签名。

### package wrapper解析失败与真实测试结果分离

`run-package-layout.mjs`实际spawn原 `npm run test:package`，通过既定环境传同新app/ZIP；child close捕获code0/signal=null。原npm默认Node spec reporter输出，wrapper却仅按`# tests/pass/...`解析TAP，所得NaN在JSON变null，故wrapper输出passed=false并退出1。`package-layout-parser-failed.json`保存该原汇总（exitCode0、六counts=null），`package-layout-tests-run.log`保存原wrapper失败输出；这一解析执行仍是失败，不改写成wrapper曾正常退出。

独立核对未改动 `package-layout-tests.log`：它含原npm完整命令、六项唯一spec汇总（50 tests/50 pass、fail/cancelled/skipped/todo均0），实际50条✔、零✖；真实包内Worker/Prisma/seed创建、重复拒绝后原文/新OS进程重开及无包外fallback仍通过。write profile有3个持久化engine（两个loadDataDir=true），reopen两个均false，32MB/defaults/relaxedDurability=false/WASM134217728字节照旧。原先47/50资源输入不一致等真实失败不属于本次解析问题，也未追认。

`correct-package-layout-summary.mjs`先要求原child exit0/null及passed=false、原log SHA不变、六计数各只出现一次并准确50/50零非通过、50✔/零✖及targets与final-layout-paths一致，才以exclusive copy保留原汇总并纠正counts/passed、附summaryCorrection。独立复算原始log SHA为 `008451a10b87781448bbb6b4ef79a4ebb77e17648c30a8783b820586ce217750`，原/新JSON均绑定它；除counts/passed及新增correction说明外所有旧字段逐项相同，correction脚本SHA `b47b330a09c455127905102dcaf36d51dc740a35676f03f9552d405f60a1471c`与声明一致。该修正没有重新测试、修改日志或产品包；**实际测试50/50可以采信，wrapper解析失败继续独立保留**，不是将真实业务失败改为通过。

### 新包/构建身份与体积记录

final-layout-paths的app/executable/ZIP/DMG与package.targets、artifact-metrics-layout路径相符。独立小型字节比较确认新包runtime manifest等于currentdist，五入口仍逐字等于当前构建（main SHA `66ec2c2a6e425419addc41dd5fc8d393b3116ab8e5a8f7f71f50b833818677a4`、service SHA `4cd332d2b50bb13382c78d242452c1a8a09ffa1efd24388a57a700fde55aaf7d`）；两seed也逐字相同，本轮manifest SHA `648816ecb9bee9f2fa75c8bc5e309212071fdd3200808d59bc1ab0bcadc82bc9`、archive `10dba40cb72dfffdd0f61481afba8bb2c93e2c700dfd0f86523fee5911b55a6c`。新build的seed字节改变属原每次生成契约，不沿用旧seed SHA冒充本轮。

本轮metrics报告app495,998,124字节、3042文件/14链接，ZIP203,261,789字节、DMG225,788,196字节；两归档实际stat长度匹配，按原baseline复算app下降52.65525366%、ZIP下降43.63154035%，满足35%/25%的体积目标。报告ZIP SHA为 `307abac4625425bfb28aed5455c75e2d2a949b155e4fb0ed27ed734d6ac48cd0`，DMG为 `27911655b8c5dfae6a2207772f3ab7388f95b5d4933fa07af929a49215d7d8c4`，后者与实际打包日志一致；本节未重新读取大归档计算SHA，最终绑定仍须按既定finalizer/交付验收核对。

本节读取时native-layout-final仍执行中，不能用旧seed单轮或旧截图替代；M05/layout报告尚不存在，编排当前SHA仍是225预声明的 `fc98d82e2ac3bba6922d588858b8e59008f23e5e01d6e9a6bc3763f2e032a6a7`。只有本轮原生完整业务及其它前置门禁实际完成、无并行负载后才可执行固定新九对；现阶段不称内存/启动/首编/输入达标，不宣布用户全部目标完成。旧完整602/604、历史包/类型/fixture/诊断错误与两次旧内存失败继续保留。本次只追加228。

### layout原生业务完成与采样前置关闭

**本轮完整原生verify通过，功能前置门禁关闭；允许随后按已审九对编排采样，不表示性能已通过。** `native-layout-final.json`与独立子目录report.json原始字节完全相同，UTC2026-10-18 18:28:59.957～18:29:22.772，Node24.18.0，mode=verify、单轮passed=true；executable准确对应imI2oy新app，scriptSha256仍 `4221a42534cb5046058d1cb96a62849b8541ef116df2fbbb2ec2ab0893b7359f`并等于当前脚本。

报告完整checks通过：首编辑前419命令、真实录制/多绑定/原子转移与主题持久、实际编辑DOM/选区/Tab保活/undo/redo/CmdS草稿、四格式真实导出、正常关后重开、零模型、sandbox、真实菜单与Node servers0；errors/httpRequests=[]，exit及reopenExit均code0/signal=null。恢复仍先逐字核对正式原文未改，再在真实恢复textarea比较完整516字符公开原文+十次输入+换行marker，completeTextMatches/originalProseUnchanged为true。本轮恢复截图已独立目视，草稿弹窗及末尾“优化验证保留段落”清晰可见；未拿历史截图或仅包含marker代替逐字恢复断言。

该verify单轮观测firstEditor1560.825792ms、输入中位16.642375ms、editor longtasks165ms（最大108ms）不充作两侧各3轮最终性能对照。renderer offline时序/CDP输入/受控SaveDialog、OS断网/物理IME/付费供应商/跨平台/正式签名的范围保持前文限制。

目前新完整core2240/2240、browser614/614、真实package50/50（解析更正另记）及本轮原生功能均已核对，原602/604失败不会被追认。主代理确认没有本轮并行负载后，可执行225所审SHA的固定AB/BA九对、18次全部保留、原5秒总WSS及至少10%门禁；编排仍须实际检查完整当前源码/清单与包/seed开始末尾绑定，任何失败留全批。本审核此后不启动其它负载，等待实际性能、最终文档/台账及归档SHA证据再裁定整体结果。

## layout候选M05完整失败复核

**本批18次执行完整，但总WSS门禁失败；本候选不能进入最终验收通过或229完成总结。** `memory-nine-pairs-layout.json/.log`记录UTC2026-10-18 18:30:23.050～18:32:55.202、Node24.18.0，executionPassed=true、passed=false、memoryGate.passed=false，主代理报告命令exit1。固定9对AB/BA顺序与18个实际pair/tag逐项相等；所有样本exit0/signal=null、passed=true、errors=[]，每轮总WSS与其app.getAppMetrics各进程之和一致。每份原始report的实际SHA均与主报告reportSha256相符，18份全部保留；编排自身SHA仍225预声明的fc98d82…、sourceHashes与本轮core.after完全相等，两seed/五入口绑定新imI2oy包，没有混用旧seed候选。

| 全部九值两侧中位 | 基线A | layout候选B | 独立复算 |
| --- | ---: | ---: | --- |
| 原5秒总WSS（KiB） | 861,424 | 888,592 | ratio1.031538475826，增加3.15384758%；未满足ratio≤0.9 |
| launch→账号控件attached（ms） | 2,898.032583 | 2,606.826708 | 本批下降291.205875ms，不能代替内存门禁 |
| 启动JS文件字节 | 8,091,673 | 3,763,613 | 本批下降，不能推断总内存达标 |
| startup longtasks（ms） | 295 | 169 | 本批下降，不代替首编最终对照 |
| renderer used heap（bytes） | 29,014,333 | 21,661,705 | 本批下降，仍不是总WSS |

A九个原始WSS为720784/984832/832720/877520/690672/859072/990272/861424/979504；B为698848/664608/944784/681216/740000/1171472/1152624/1090336/888592。独立分别排序取第五值，按原公式复算一致，没有删除不利轮次、改配对比值/均值或拼接旧批。尤其不能拿候选2较大的旧baseline中位1151152去比较本轮B888592来追认收益；本批自己的baseline861424必须保留。原首次三轮及候选2九对失败继续保留，当前候选不重采挑值。

各进程类型分别求九值中位作为诊断：Browser A476736/B551920KiB，Tab A252496/B263584KiB，GPU A90928/B92208KiB，Utility A41744/B42560KiB。各类型中位不能相加当总中位，Browser亦含服务Worker，未区分main/Worker具体来源；这些分解不构成新的验收口径。下一步应针对真实保留/分配来源诊断，不换5秒时点、强制GC、降低WASM minimum/maximum或改变业务初始化。

本轮原生单verify功能通过保留，但最终editor两侧各3轮不再继续安排，也不执行finalizer来提升完成状态；不得将单轮1560ms等值充作最终首编/输入收益。本次没有运行新的性能/浏览器/数据库，仅轻量读取与复算报告。

### 只读优化线索，尚未批准实现

1. `desktop/shared/database-seed.ts` 的databaseSeedInputs在正式启动校验中逐个regular→readFile完整Buffer，再只保留SHA；本轮manifest有46项、实际总18,229,052字节，其中pglite.wasm10,088,161、pglite.data6,295,316。连续整块读取会制造依赖自然GC/allocator回收的临时外部内存，可调查改为受限流式SHA（package.json保留原小JSON规范化）。这能减少实际分配/触页，不削减任何输入/字节指纹；必须保留普通文件/链接/大小/固定清单、版本/归档和写根前拒绝，考虑同一文件打开/身份校验，不能用只看mtime的缓存或跳过指纹。18.2MB是文件体量，不等于全部同时存活或已测得WSS收益，更不声称足以解释本批26MB/整体波动。
2. readDatabaseSeed当前以archive Buffer→new Uint8Array(bytes)→Blob显式建立多份副本，Workspaces又长期持有只读Blob用于以后真正新库。约4.5MB压缩资源、PGlite导入展开与临时buffer应和主代理隔离机制诊断共同测量，先分清可释放副本/库内持有与必要长寿命资源。不能简单清空seed导致之后建作品失去同路径，亦不能跳过坏资源在recover前失败的契约；其收益尚未测得。
3. main的avatar-assets/image-generation与Worker的workspace-assets仍静态import sharp，虽首次无模型/无图片动作也会加载本地影像库。可评估在原实际图片操作内惰性加载同installed Sharp以降低启动加载成本，保留所有转码/像素限制/动画校验/错误和包闭包，首次图片动作延迟另测。仅凭import位置不能推断libvips缓存已经分配50MB或承诺10%收益；主/Worker同进程还可能共享native映射，需先做有边界的加载/内存机制诊断。

routes.generated本就使用动态import，不建议笼统再做“所有handler延迟”而重复已有机制。上述仅提供真实源代码线索，不是新方案批准或产品改动；任何下一候选仍须220/221追加具体调研/方案→222独立审→223/224用例→行为RED/TDD→225代码审→完整新包/同版回归/原生→新的预声明M05全批。当前总体目标未完成，体积与功能收益不能覆盖内存失败。本次只追加228。
