# Release 优化收尾总结

2026-10-19，按用户“优化到目前已经可以了，直接收尾吧”的要求，保留当前实现及已验证安装包，停止后续候选和诊断。**本轮按当前成果收尾；原定内存降低至少10%的验收目标未达到，不标记为全部目标通过。**

产物顺序：[调研](220-release-optimization-research.md) → [技术方案](221-release-optimization-plan.md) → [实施](226-release-optimization-implementation.md) → [测试](227-release-optimization-verification.md) → 本总结。独立方案、用例、代码及证据审核分别见 [222](222-release-optimization-plan-review.md)、[224](224-release-optimization-cases-review.md)、[225](225-release-optimization-code-review.md)、[228](228-release-optimization-final-review.md)。

## 当前成果

| 指标 | 同版基线 | 当前包 | 结果 |
|---|---:|---:|---|
| 应用普通文件字节 | 1,047.6 MB | 496.0 MB | 减少52.7% |
| 同方法ZIP | 360.6 MB | 203.3 MB | 减少43.6% |
| 启动ready中位数 | 2898 ms | 2607 ms | 缩短10.0% |
| 启动长任务累计中位数 | 295 ms | 169 ms | 减少42.7% |
| 启动已解析JS | 8.09 MB | 3.76 MB | 减少53.5% |
| ready后5秒总工作集中位数 | 841.2 MiB | 867.8 MiB | **增加3.2%，内存门禁未通过** |

尺寸为普通文件逻辑字节，同一ditto压缩方法；MB按十进制。启动指标采用固定交替九对共18次独立新数据目录、两侧各9次全部成功样本的中位数，未强制GC、未控制OS磁盘缓存。ready指账号控件attached；工作集按app.getAppMetrics进程相加（main含service Worker、可能重复共享页），不等于独占物理RAM。不是所有作品/机器的通用性能保证。

实际改动：按五入口真实依赖闭包裁剪重复构建依赖并保留完整运行资源/许可证；使用完整命令快照延后Monaco；PGlite保持原严格同步、迁移/事务/锁/连接池，缓存调整为32MiB，仅全新空库使用同版本构建期纯空PG模板；修复离线本地IPC查询暂停，以及选卡异步增高和标签栏准备时序。继续复用真实业务React组件、正文编辑器及全部业务路由。后续流式指纹、磁盘模板、Sharp惰性加载等只有诊断线索，**未实施**。

大数据缓存对照也保留了代价：64MiB公开未压缩载荷的checksum扫描中位增加38.45ms、混合64操作批次增加6.85ms，在实施前声明容差内；不声称数据库查询全面提速。

## 测试与实际应用

- 完整core：296文件，2240/2240；完整browser：58文件，614/614；完整package：50/50。各组均无失败、跳过、取消或todo；包组包含部分重复的unit策略用例，不相加作独立用例总数。
- core/browser的1287项输入前后相同且与当前源码一致；生产构建、两类类型检查通过。原失败/RED、旧候选以及包汇总器误读spec输出的记录完整保留；包50/50由同一未修改原日志及真实退出0重建汇总，并经独立审核，无重跑或替换测试结果。
- 新包真实macOS arm64：419快捷键在首编前可查，真实录制/多绑定/原子冲突转移、主题、首次编辑/同DOM/选区/撤销重做、保存、四格式导出、正常退出和独立进程重开通过；完整516字未批准草稿恢复且原文未改。TXT/MD/DOCX核对内容，PDF核对解析/标题/页数/中文字体，不声称PDF正文逐字提取。
- 默认零模型、原生sandbox及无Node监听检查通过。离线范围是launch返回后的renderer context；未验整机断网、付费供应商、物理中文IME、Windows/Intel、干净目标机下载隔离/安装/Gatekeeper。
- 最终九对M05完整有效但**内存失败**，18次原始报告全部保留。用户要求收尾后停止追加候选；最终首编/输入3+3对照没有执行，单次功能验证耗时不作为其替代。

## 安装包与证据

当前交付目录：`release/adhoc-macos-arm64-589c3f46-cb51-4c98-b202-5d54d8b1c875/`。

- `ShakeInk-0.1.0-alpha-mac-arm64-adhoc-test.dmg`：225,788,196 bytes；SHA256 `27911655b8c5dfae6a2207772f3ab7388f95b5d4933fa07af929a49215d7d8c4`。
- `optimized-mac-arm64.zip`：203,261,789 bytes；SHA256 `307abac4625425bfb28aed5455c75e2d2a949b155e4fb0ed27ed734d6ac48cd0`。
- 原始报告在 `docs/evidence/release-optimization-2026-10-18/`；收尾机器核对为 `closeout-verification.json`。交付目录中的 `optimization-evidence.tar.gz` 保存文档/台账及全部本轮证据，摘要见 `SHA256SUMS.txt`。

应用为Ad-hoc测试签名，DMG容器未签名/未公证，formalReleaseAccepted仍为false；正式签名公证门禁未绕过。既有跨平台业务验收台账未升级。此次状态为**用户认可当前成果后收尾，功能回归通过，原内存目标未完成**。
