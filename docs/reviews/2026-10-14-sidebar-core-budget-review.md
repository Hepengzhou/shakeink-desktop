# Sidebar 最新完整 core 执行预算独立增量审核

2026-10-14，审核人 sidebar_design_review。本审核只读 runner、归档及实际报告，没有修改生产/测试/脚本，没有运行完整 core、构建或 Electron。

**runner 源增量通过，blocking=0，允许全浏览器结束后以独立时段执行完整 core。** 这是既有验证的整轮执行预算调整，不是生产/测试期待变更。源码/TDD/code-review 已通过的门禁不需重新 UI 批准；新的完整执行结果仍需据实核验。

当前 `docs/evidence/sidebar-navigation/regression/run-core.mjs` SHA256 **92f12e53d5e55a2095932342438508789f20d1fb9ab0595bd83b26c8d845afc2**。本人 Node24 `--check` exit0，并在内存去掉新增 `const budgetMs=1800000`、将三处引用逆换原900000后，逐字节文本精确等于 `run-core-before-sequential-budget.mjs`（SHA **8e0c7f19117b949405d75ed11c94baad318475fee07911dafbd906e9d5dc99b0**）。未写回脚本。

- 只有整轮30分钟 deadline 及运行/报告元数据改为同一 budgetMs；递归 unit/integration 清单、归档目录排除规则、`--test-concurrency=2`、测试内部 timeout、断言、公共进程/网络/数据库行为不变。
- deadline 仍只结束 runner 自己启动的测试进程树；正常结束清理 interval/deadline，保存完整 TAP、前后源SHA与具体 exit/count/failure titles。未改变 passed/failed/budget-exhausted 分类或完整比较要求。
- runner 原来会写固定 core 输出；根代理已先保留四件 `core-m06-parallel-budget-exhausted.json/.tap` 与 `sources-before/after-m06-parallel-budget-exhausted.json`。本次没有添加独占输出机制，不冒称脚本自动拒绝覆盖；此轮须继续保留这些归档和新run全部结果。
- core 内既有用例可能执行 build-desktop 更新 dist；最新UI/desktop构建和真实Windows必须等core结束，不能将该测试副作用生成的包当最终验收包。

已只读核并行900000中止归档：status=budget-exhausted、counts={}、comparisonComplete=false；603个已完成顶层、29个观察到的失败，不是完整 counts。1358项源前后稳定、changedSources=[]；归档 TAP SHA与report.outputSha256一致。4个新观察失败为三条 BDC06/BDC07 迁移超时和 ROOT11-07 startup 超时，不能先归因为CPU，也不能把尚未执行到的旧失败称已解决。扩大整轮预算不得改这些既有测试的60s内部限制、以剔除标题完成回归或删失败再称通过。

当前实际浏览器结果另有明确范围：完整52文件535 tests/516pass/19fail、0cancel/skip；scope50为516/516pass、0fail/cancel/skip、exit0/errornull/changedSources=[]。两份原报告保持，不用scope通过替代全仓失败。预算审核时新独立core尚在执行，没有提前passed；其后实际完整1977tests/1936pass/38fail/1cancel/2skip、newResidual=[]、1358源前后稳定，4个原超时标题在本次完整core均实际ok。最新构建/Windows与全仓仍failed的独立事实另见 `2026-10-14-sidebar-navigation-final-evidence-review.md`，不反推旧失败原因、不称全仓通过。
