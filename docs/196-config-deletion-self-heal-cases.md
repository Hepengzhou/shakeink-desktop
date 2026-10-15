# 配置目录任意删除自愈与兜底重建测试用例

依据：194 调研、195 产品（均经 197 独立审核修订）；执行前须完成 197 审核签署。本轮**只覆盖本次修复目标，禁止全量测试**；每项都在 199 报告绑定实际命令与结果。

需求（2026-10-15，对应 195）：R1 归属明确时结构缺失/损坏静默修复并正常启动（含 `inboxReady` 翻转）；R2 无法安全修复时主界面 + 对话框「清空全部配置并重启 / 退出」；安全红线只增不删、无指针不铸新 id、清空必须用户明示。

## 实现面（用例锚点，含 197 审核修订）

- `desktop/main/startup-recovery.ts`：`classifyStartupRecovery` 增加 `{kind:"repair",repair:"content"}`；`executeStartupRepair("content")`：重建 inbox/、inbox/database/（异常形态隔离后重建）；catalog.json 缺失写 `{schemaVersion:1,revision:0,value:[]}`、损坏隔离写空；标记 `inboxReady:true` → 隔离并按原 id/app/phase 原子改写 false；并发指针不可解析顺带隔离、标记可重建且指针有效以 pointer.rootId 重建；只增不删、幂等、全程 assertLock + 权威断言。
- `desktop/main/config-reset-offer.ts`（**新模块，不依赖 electron**，197 审核 P1 接缝决策）：`offerConfigReset({reason,rootPath,host})`，host 注入 `launchDegradedWorkbench/confirm/wipe/relaunch/quit/fatal`，可纯 node 直测。
- `desktop/main/index.ts`：else 块内闭包 `launchConfigResetOffer(reason)` 实现 host（临时根改写 `startupPaths`/`bootstrapPath`/`startupSelectionError=null` + `launch()`；`executeStartupReset`；`app.relaunch()+app.exit(0)`；`app.exit(0)`；错误框+exit(1)；`dialog.showMessageBox` 文案与按钮）；dialog 分类、修复执行失败、`failedRootCode` 改路由到此，移除 `openStartupRecovery`。
- `desktop/main/inbox-lease-recovery.ts`：`inboxLeaseRecoveryRequired` 在 inbox 缺失时返回 false。

## 用例

| ID | 测试位置与名称 | 输入与操作 | 预期 | 层 |
| --- | --- | --- | --- | --- |
| C01（R1 分类） | `tests/unit/startup-recovery.test.ts` 新增系列 | 有效指针+有效标记，分别：缺 inbox；缺 inbox/database；缺 catalog；三者全缺；catalog 损坏；指针不可解析+inbox 缺失；有效指针+标记缺失+内容损坏 | 均 `{kind:"repair",repair:"content"}` | unit |
| C01b（红线坚守） | 同文件新增 + 既有断言 | 品牌冲突、根身份不符、symlink 根、**无指针+标记缺失+内容损坏** | 均 dialog（无指针内容损坏坚守 dialog，不铸新 id） | unit |
| C02（R1 修复执行） | 同文件新增「content repair rebuilds structure」 | 按 C01 各场景执行 + **标记 inboxReady:true + database 缺失**子例 | inbox/、inbox/database/ 空目录重建；catalog 为空 `{schemaVersion:1,revision:0,value:[]}`；损坏 catalog/指针/原标记隔离为 `*.corrupt-<时间戳>.json` 且字节一致；inboxReady 翻转为 false 且 id/app/phase 不变；既有文件字节不动；再分类为 none/auto-init；二次执行幂等 | unit |
| C03（R1 inbox 闸门容忍） | `tests/unit/inbox-lease-recovery.test.ts`「IL42-16 a missing inbox is not a lease matter」 | fixture 删除整个 inbox | `inboxLeaseRecoveryRequired(f.pointer)` 返回 false 不抛错；`prepareInboxLeaseRecovery` 依旧拒绝 | unit |
| C04（R1 真实链路） | `tests/unit/inbox-lease-startup-116-review.test.ts`「IL116-S06 missing inbox/database/catalog is rebuilt by real content repair and launch continues」 | AST 真实分支 + 真实 classify/executeStartupRepair；fixture 分别：缺 inbox（标记 inboxReady:true）；缺 inbox/database+catalog | trace `legacy→classify→repair:content→reselect→relocation→relocation→maintenance→inbox→ordinary`；结构重建、inboxReady 已翻转；exits 空 | unit |
| C05（R2 路由） | `tests/unit/startup-recovery-main.test.ts` bindings 增 `offerConfigReset` stub + 改写 SR-U-104b/105/106/106b/108/109/110 | dialog 分类、修复执行失败、failedRootCode 等原 recovery-window 场景 | trace 尾段为 `reset-offer`（含 reason、rootPath=defaultRoot 记录）；error-box/exit 路径（legacy、terminate 失败等）不变 | unit |
| C06（R2 兜底流程） | `tests/unit/config-reset-offer.test.ts`（新文件，纯 node 直测 `offerConfigReset`） | stub host：①临时 launch 成功→confirm true；②confirm false；③confirm 抛错；④launch 抛错；⑤wipe 抛错 | ①wipe 收到调用后 relaunch、无 quit/fatal；②quit、无 wipe/relaunch；③quit（关闭视同退出）；④fatal 收到错误、无 confirm；⑤fatal、无 relaunch；confirm 收到 rootPath 与 reason | unit |
| C07（真实系统演示） | `scripts/demo-config-deletion.mjs`（隔离根 + 真实 Electron，**先完整启动一次完成 adopt + inboxReady:true 再破坏**，197 审核 P1） | D1 删 inbox+drafts.json→启动；D2 删 catalog.json→启动；D3 删 inbox/database→启动；D4 双品牌冲突→主界面+对话框→选「清空全部配置并重启」→等重启；D5 同现场选「退出」 | D1–D3：无窗无感直进工作台、结构已重建、设置保持；D4：主界面打开+模态对话框，选清空后自动重启进全新工作台（配置目录全新重建）；D5：选退出后进程退出、配置目录原样。证据 `docs/evidence/config-deletion/` | 真实系统 |
| C08 | `npm run typecheck` | — | exit 0 | 静态 |

## 对既有测试的改动（197 审核 P0-2/P1 修订后清单）

- `tests/unit/startup-recovery.test.ts`：SR-U-14/14b/15/15b 由 dialog:content-damaged 翻转为 `repair:"content"`（有效指针+可重建标记+内容损坏自愈；symlink/目录形内容视为损坏隔离重建）；SR-U-64 reset 崩溃残留由 dialog 翻转为 `repair:"content"`（195 R1 决策，同步修订 `startup-recovery.ts:170-172` 注释）；SR-U-28（无指针+内容损坏）保持 dialog 断言并注明红线。
- `tests/unit/startup-recovery-main.test.ts`：bindings 以 `offerConfigReset` stub 取代 `launchStartupRecovery`；SR-U-104b/105/106/106b/108/109/110 期望 `recovery-window` 改 `reset-offer`。
- `tests/unit/inbox-lease-startup-116-review.test.ts`：deps 增 `offerConfigReset` stub；S01–S05 预期不变（不触发）。
- `tests/integration/startup-recovery.test.ts` SR-I-07（损坏 catalog → 恢复窗口的旧行为断言）改写为 content 自愈后普通启动（197 审核 P1；本轮 scoped 执行该文件验证）。
- `desktop/main/root-relocation-window.ts` 的 `launchStartupRecovery` 导出保留（`startup-recovery-window.test.ts` 直测、根迁移流程仍用），`index.ts` 移除调用。
- 其余既有文件只增不改。

## TDD 顺序

1. 先写 C01–C06 测试并对未修复代码运行确认 RED（无 content 分类/修复；C03 抛错；C04 trace 无 repair:content；C05 旧分支仍 recovery-window；C06 模块不存在），记录到 199。
2. 实现：① `startup-recovery.ts` content 分类+修复；② `inbox-lease-recovery.ts` 容忍缺失；③ `config-reset-offer.ts` + `index.ts` 路由。
3. 逐项运行 C01–C08 确认 GREEN，结果记入 199。明确豁免：其余 unit/integration/browser/packaging 套件本轮不执行（用户约束：禁止全量测试）；`tests/integration/startup-recovery.test.ts` 因 SR-I-07 改写属本次范围，单独执行。
