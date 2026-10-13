# SN-05 真实试验场事务增量独立审核

日期2026-10-13，审核人sidebar_design_review。本增量只读审核真实服务、scoped context、正式routes及新增方案/用例；没有修改生产或执行测试。

## 方案与用例结论

**`planReview=passed`、`testPlanReview=passed`、`caseSourceReview=passed`、`codeReview=passed-for-rebuild-and-actual-target-validation`，blocking=0。** 当前增量已按先方案/具体用例审核、真实red、最小修正、green与独立code review完成，证据见下文。旧浏览器/原型/core通过不代替新服务green或新Windows验收；本服务的新真实Windows轮次仍待重建执行。

- `technical-plan.md:78–84` 将范围限制为 `src/lib/services/scenario-lab.ts:359` 在既有交互事务内的第一次existing查询由全局prisma改为传入tx。`:358,362–389` 原事务、未找到错误、scene tree锁、锁后重读、角色/场景整体验证、prose/premise保护及最后原子update都保留。不得另开连接、移出事务或关闭context保护。
- `desktop/service/context.ts:29–31,66–80` 在正式事务回调内设置transactionActive，禁止再次借用全局scoped client；该保护避免同数据库再借连接造成死锁，应保留。改用已经提供的tx遵循该机制，`createScenarioLab:323–343` 和 `replaceScenarioCards:527–536` 也使用同一模式。
- 原正式 `desktop/handlers/novels/[id]/scenarios/[labId]/route.ts` PATCH先按getOwnedNovel/getOwnedScenarioLab校验归属，解析请求后调用服务并走原错误映射；GET/DELETE和列表POST不改。最小修正不引入业务/协议变化。
- `sidebar-navigation-test-cases.md:36–44` 的SN-05-DB01覆盖真实POST→标题PATCH→GET/list持久化且cast/sceneIds/premise/prose/其它作品保持；DB02覆盖非法外作品角色400且无部分改名、非归属lab404保留；DB03覆盖真实DELETE及turn/node/card原级联与其它记录保持。测试通过正式迁移、Prisma/context及routes，无mock响应、HTTP监听或真实资料/模型，能检验本错误及保护边界。

## 已有真实故障证据及执行门槛

`docs/evidence/sidebar-navigation/windows-preparation/development-03-scenario-update-runtime.json` 记录 Node24.19.0、正式updateScenarioLab/scoped Prisma在保留的合成数据库复现 `Use the supplied transaction; borrowing this database again would deadlock`，titleUnchanged=true；这是实际服务诊断，不是Electron验收通过。第三轮Windows真实PATCH500及其失败报告须保留。

具体用例审核需确认：使用独立新建temp数据库并finally清理/关闭；实际导入正式POST/PATCH/GET/DELETE及auth/ownership机制；原服务未改时DB01实际500红灯，DB02期望400也应揭示现有500；断言读实际DB/route结果与完整配置，不使用源码字符串/mocked Prisma。红灯后只改批准的一行，运行3条green及原相关服务回归，保存源hash，重建并按新unique label重跑Windows。

## 当前未修源快照

| 文件 | SHA-256 |
| --- | --- |
| src/lib/services/scenario-lab.ts | 1adbfa704a51677275036d5181535b57995a550f1f6a25a7b8df1fa1c20f53c8 |
| desktop/service/context.ts | b8626b56295b65d5ae1b19eb0e0cf93f204bed60ccbf638aec8b0d92bfaf5951 |

## 具体用例源增量审核

`tests/integration/sidebar-scenario-management.test.ts` 已独立只读审完，**`caseSourceReview=passed`，blocking=0，可执行red**。

- `:6–12,27–38` 使用真实PGlite/正式迁移/LocalPGliteAdapter/Prisma，直接导入正式4种handlers；`:17`建立原trusted context，原 `auth.ts` 依据context识别LOCAL_AUTHOR_ID，不mock auth/响应。Request中的fixture.invalid仅作in-process URL，未启动HTTP服务。两个合成novel放同一隔离数据库专门验证归属；不声称等于真实Workspaces多库/Electron。
- `:39–46`先关闭client/engine，再realpath核查temp内专用prefix、绝对resolved原目标相同，才递归移除本次root。不会删除用户根或路径拼接外部目标。
- DB01 `:49–64`通过原POST创建，正式PATCH仅改标题，实际DB及detail/list读回；完整cast/sceneIds/premise/prose/proseAt/status/createdAt/id/novelId及另一作品lab逐字段保持。既有prose与active状态在真实DB准备，避免只验证默认空配置。
- DB02 `:66–78`标题+外作品角色请求期待400、错误语义及整个记录deepEqual不变；另作品lab请求期待404并完整保留。DB03 `:80–95`两lab各有真实turn/node/card，DELETE后指定记录null且子记录0，另lab完整相同且子记录仍1。

当前测试源SHA-256：**1f4bb9335d95cc101e301369caabe9a5b4d93d89bd10df39d565d0e408c5dcce**。本审核没有运行它，`newServiceTests=not-run`、`newCodeReview=not-run`；需按前述实际red→一行修正→green/相关服务回归→独立代码审核执行。

## TDD 实现与代码独立补审

实现增量 **通过，blocking=0**。实际 `git diff -- src/lib/services/scenario-lab.ts` 只有`:359`一行 `prisma.scenarioLab.findUnique`→`tx.scenarioLab.findUnique`；`:358,360–389` 事务、notfound、lockSceneTree、锁后重读、cast/scenes解析和最后update全部未改。context保护未改。与已批准方案完全一致，没有绕过scoped client保护、另开连接、改变归属/路由/UI或事务原子性。

已独立读取根代理实际执行的完整TAP证据：

- `red/scenario-transaction.tap`：**3 tests / 1 pass / 2 fail / 0 cancelled / 0 skipped**，DB01实际500!=200、DB02实际500!=400，并记录context第31行再次借用错误；DB03原DELETE通过。证明该真实测试能发现现有故障，而非仅导入不存在或mock行为。
- `green/scenario-transaction.tap`：**19 tests / 19 pass / 0 fail / 0 cancelled / 0 skipped**，包含新增DB01–03与原content-service/adapter16条；标题持久化、非法配置原子拒绝、外作品404与级联保留现在均通过。本审核没有重复执行该命令，不把读取TAP称作独立运行。

最新代码审核快照：

| 文件 | SHA-256 |
| --- | --- |
| src/lib/services/scenario-lab.ts | a382f51d49c7db8f4c5c2b11f8e2698949784b3759a447a80c5597652d556e26 |
| desktop/service/context.ts（未改） | b8626b56295b65d5ae1b19eb0e0cf93f204bed60ccbf638aec8b0d92bfaf5951 |
| tests/integration/sidebar-scenario-management.test.ts（未改） | 1f4bb9335d95cc101e301369caabe9a5b4d93d89bd10df39d565d0e408c5dcce |

上一节的not-run为实施前用例审核时状态，由本节实际red/green和代码审核更新。当前可以重建并按已审核冻结harness/新unique label进入Windows；新bundle hash、实际POST/PATCH/DELETE/编辑器/原生命中及未执行平台仍须据实记录，前三轮失败保留，不能先标真实验收通过。
