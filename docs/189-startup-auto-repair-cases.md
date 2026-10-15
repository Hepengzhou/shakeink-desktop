# 启动写入锁/配置文件自动修复测试用例

依据：187 调研、188 产品文档；执行前须完成 190 独立审核。本轮**只覆盖本次修复目标，禁止全量测试**；每项都须在 192 报告绑定实际命令与结果。测试层次：`node --import tsx --test` 驱动 unit/integration 真实文件系统与真实 PGlite worker，无任何模拟接口算作真实验证。

需求（2026-10-15，对应 188）：
- R1 写入锁/上次未正常关闭：启动直接自动修复，最多 3 次，全失败才弹对话框；成功则同进程继续启动。
- R2 配置文件损坏/缺失自愈；`state.json` 损坏隔离保留 + 默认设置启动。
- 安全红线：活锁/异机锁/不明锁内容/篡改审计绝不修复。

## 实现面（用例锚点，含 190 审核修订）

- `desktop/main/inbox-lease-recovery.ts` 新增 `recoverInboxLeaseAutomatically(bootstrap, {assertColdHost, hook?, attempts?, wait?})`：循环 `prepareInboxLeaseRecovery → recover(true)`，`recovered` 且 `assertRecovered` 通过返回 `true`；`recover` 失败或 `cleanup-pending` 取消会话、`wait` 后重试；**`prepare` 抛错（如活锁 OWNER_ALIVE 拒绝）无会话可取消，直接计为一次失败尝试并 `wait` 重试**；`attempts`（默认 3）次用尽返回 `false`。
- `desktop/main/index.ts` 启动分支：`inboxLeaseRecoveryRequired(...)` 为真时先 `await recoverInboxLeaseAutomatically(...)`，false 才 `launchInboxLeaseRecovery(...)`；冷态断言提取共用。
- `desktop/core/versioned-store.ts` 新增 `quarantineInvalidStore()`：文件缺失→false；可解析且校验通过→false；否则重命名为 `<原名去 .json>.corrupt-<ISO 时间戳>.json` 隔离名（与 `desktop/main/startup-recovery.ts:111` 风格一致）→true。`desktop/main/model-repository.ts` `initialize()` 起始调用（生产调用点唯一：`index.ts:236`）。
- 安全闸复用论证：自动路径与对话框路径共用同一 `WorkLeaseRecovery.recover`，异机锁/不明锁内容/篡改审计由既有 IL42-04/05/09 在同一闸上锁定，自动路径不重复设例；lock-absent 残局（审计 observed 且锁目录已消失）与 V04 的 empty-lock 同为可重试收敛 stage，由 V04 代表。`attempts` 注入参数由 V03 第二子例（`attempts:1`）锁定语义。

## 用例

| ID | 测试位置与名称 | 输入与操作 | 预期 | 层 |
| --- | --- | --- | --- | --- |
| V01（R1 成功路径） | `tests/unit/inbox-lease-recovery.test.ts`「IL42-11 automatic startup repair recovers a dead lease on the first attempt」 | 既有 fixture（死进程锁 + 保留文件哈希基线），调 `recoverInboxLeaseAutomatically(f.boot, {...f.options, wait})`（wait 记录调用） | 返回 `true`；恰好 1 次尝试（`wait` 0 次；`before-owner-unlink` hook 恰 1 次，hook 相位不含 prepare，以此为尝试计数代理）；锁目录已删；`f.preserved()` 哈希逐项不变；`inboxLeaseRecoveryRequired(f.pointer)` 为 `false`。旧代码 RED：函数不存在，import/调用失败 | unit |
| V02（R1 瞬态重试） | 同文件「IL42-12 transient failures retry until recovery succeeds within the attempt budget」 | fixture；`hook` 在前 2 次 `before-owner-unlink` 抛错（第 3 次放行） | 返回 `true`；恰好 3 次尝试（`wait` 恰 2 次且按序在尝试之间；hook 恰 3 次）；最终锁删除、数据哈希不变、`inboxLeaseRecoveryRequired` 为 `false` | unit |
| V03（R1 全失败回落 + 预算注入） | 同文件「IL42-13 persistent failure stops after the configured attempts and preserves the observed lease」 | 子例一：`hook` 恒在 `before-owner-unlink` 抛错（默认预算）；子例二：同注入但 `attempts:1` | 子例一：返回 `false`；恰好 3 次尝试（`wait` 恰 2 次）；`owner.json` 字节与 fixture 一致；锁仍在；`inboxLeaseRecoveryRequired` 仍为 `true`（交回对话框路径）。子例二：返回 `false`；恰好 1 次尝试（`wait` 0 次） | unit |
| V04（R1 中断收敛） | 同文件「IL42-14 an interrupted cleanup converges on a later automatic attempt」 | fixture；`hook` 仅第 1 次在 `after-owner-unlink` 抛错（造 `cleanup-pending`：owner 已删、空锁目录残留，IL42-08 同型） | 返回 `true`；恰好 2 次尝试（`wait` 恰 1 次）；最终锁目录删除、审计 `recovered`、`inboxLeaseRecoveryRequired` 为 `false`、数据哈希不变 | unit |
| V05（安全红线） | 同文件「IL42-15 a live owner is never repaired and exhausts the budget untouched」 | fixture；`owner.json` 改写为 `pid: process.pid`（活进程） | 返回 `false`；恰好 3 次尝试（prepare 阶段即拒、无 hook 相位，以 `wait` 恰 2 次计数）；`owner.json` 字节不变；锁仍在；无审计文件产生 | unit |
| V06（R1 启动分支成功） | `tests/unit/startup-recovery-main.test.ts`「SR-U-111 a stale inbox lease is auto-repaired inline and startup continues to ordinary launch」 | AST 提取启动分支运行；stub：`inboxLeaseRecoveryRequired` 为 `true`，`recoverInboxLeaseAutomatically` 记录参数并 resolve `true` | trace 为 `legacy→classify→relocation-preflight→maintenance-preflight→inbox-preflight→inbox-auto-repair→ordinary`；自动修复收到 `bootstrapPath` 与可调用 `assertColdHost`；无 `inbox-window`。旧代码 RED：无 `inbox-auto-repair` 调用，trace 直接 `inbox-window` | unit |
| V07（R1 启动分支回落） | 同文件「SR-U-112 three failed automatic attempts degrade to the repair dialog」 | stub：`inboxLeaseRecoveryRequired` 为 `true`，`recoverInboxLeaseAutomatically` resolve `false` | trace 尾段 `inbox-preflight→inbox-auto-repair→inbox-window`；无 `ordinary`；对话框回调与自动修复共用同一冷态断言 | unit |
| V08（R1 冷态断言） | 同文件「SR-U-113 the shared inbox cold-host assertion rejects an already-started ordinary host」 | stub `recoverInboxLeaseAutomatically` 内联调用收到的 `assertColdHost`：分别在 `worker` 已存在、正常空态两种绑定下求值 | `worker` 存在时断言抛 `ORDINARY_HOST_ALREADY_STARTED`（修复不得进行，按失败处理）；空态通过并继续启动，且共用断言经 stub 向 trace 追加 `legacy/relocation-preflight/maintenance-preflight`（期望须包含这些条目） | unit |
| V09（R2 损坏隔离） | `tests/unit/versioned-store.test.ts`新增用例：损坏 JSON / 合法 JSON 但 value 校验失败 两子例 | 真实临时目录构造 `VersionedStore`（沿用该文件既有 fixture 与校验器），先写坏文件，调 `quarantineInvalidStore()` | 返回 `true`；原路径不存在；同目录出现 `<原名>.corrupt-<时间戳>.json` 隔离文件且字节与坏文件一致；随后 `read()` 返回 revision 0 默认值 | unit |
| V09b（R2 启动接线，190 审核 P1-1） | `tests/unit/model-repository.test.ts`新增用例 | 真实临时目录写入损坏 `state.json`，构造真实 `ModelRepository`（沿用该文件既有 fixture）调 `initialize()` | 正常返回且读到默认设置；同目录隔离文件字节与坏文件一致；原路径缺失；有效文件时 `initialize()` 不隔离 | unit |
| V10（R2 不动有效/缺失） | 同文件新增用例：有效文件、文件缺失 两子例 | 分别预置有效存储文件、不预置文件，调 `quarantineInvalidStore()` 后 `read()` | 均返回 `false`；有效文件字节不变、`read()` 返回原 revision/值；缺失时 `read()` 落默认值且不产生新文件 | unit |
| V11（R1 真实 worker 端到端） | `tests/integration/inbox-lease-startup.test.ts`「IL42-PG03 automatic repair recovers the stale lease with the default budget and the real built worker starts retained data intact」 | 既有真实 fixture（真实打包 worker 写入模板后留死锁）；不调对话框，直接 `recoverInboxLeaseAutomatically(f.bootstrap, {...f.options, wait:async()=>{}})`（默认 3 次预算） | 返回 `true`；`databaseHashes()` 与修复前逐项一致；随后真实 worker `launch()` `result().status==='ready'`；`/api/admin/prompts` 200 且原中文模板逐字保留；worker 正常关闭后锁目录不存在。旧代码 RED：函数不存在 | integration |
| V13（R2 指针损坏放行，演示 S2b 抓出的缺口） | `tests/unit/backup-removal-preflight.test.ts`「an unparseable root pointer defers to startup classification instead of blocking startup」 | 既有 fixture；把 `data-root.json` 分别写为 `{broken pointer`、合法 JSON 但结构不符两子例，调真实 `assertNoLegacyBackupRecovery` | 不抛错；文件字节不变（交回分类层 triage，合法指针的遗留恢复检查不受影响——该文件既有用例继续锁定）。旧代码 RED：抛 `LEGACY_BACKUP_RECOVERY_UNCONFIRMED` | unit |
| V14（R2 指针损坏真实链路） | `tests/unit/inbox-lease-startup-116-review.test.ts`「IL116-S05 an unparseable root pointer is quarantined by real startup repair and launch continues」 | AST 提取真实启动分支 + 真实 preflight/classify/executeStartupRepair/relocation/inbox 函数（隔离根 fixture：健康 current 根 + 损坏指针） | trace 为 `legacy→classify→repair:pointer→reselect→relocation→relocation→maintenance→inbox→ordinary`；bootstrap 内出现 `data-root.corrupt-<时间戳>.json` 且字节与损坏指针一致；原指针已移开；exits 为空。旧代码 RED：trace 止于 `legacy→blocked-error`、exit 1 | unit |
| V15（真实目标系统演示） | `scripts/demo-startup-auto-repair.mjs`（隔离数据根 + 开发版真实 Electron 窗口） | S1 启动后 `taskkill /T /F` 强杀进程树→重启；S2a 删除 `shakeink-app.json`→重启；S2b 损坏 `data-root.json`→重启；S3 损坏 `state.json`→重启 | S1：无对话框直接工作台、审计 recovered、当前锁为新进程存活租约、正常退出后锁释放；S2a：标记同 id 重建、设置保持；S2b：指针隔离 + 新指针重建、设置保持；S3：`state.corrupt-*.json` 字节一致、默认设置启动（onboarding 重置 null）。证据写入 `docs/evidence/startup-auto-repair/`（截图 + report.json） | 真实系统 |
| V12 | `npm run typecheck` | — | exit 0 | 静态 |

## 对既有测试的改动（190 审核 P0-1 修订）

- `tests/unit/startup-recovery-main.test.ts` 的 bindings 增加 `recoverInboxLeaseAutomatically` stub（默认不触发：既有用例 `inboxLeaseRecoveryRequired` 恒 false，`&&` 短路不求值右侧，SR-U-104~110 预期零改动）。
- **`tests/unit/inbox-lease-startup-116-review.test.ts`（与 startup-recovery-main 同型 AST 末语句提取，且 IL116-S02 用真实活锁驱动真实 `inboxLeaseRecoveryRequired` 为 true，旧分支直接进对话框；新分支会先调 `recoverInboxLeaseAutomatically`，deps 缺符号即 ReferenceError）**：deps 增加 `recoverInboxLeaseAutomatically` stub——记录 `inbox-auto`、内联调用收到的 `assertColdHost`（验证自动修复同样经过冷态/迁移/维护复检）、返回 `false`；IL116-S02 期望 trace 由 `['legacy','classify','relocation','maintenance','inbox','inbox-cold','legacy','relocation','maintenance']` 更新为 `['legacy','classify','relocation','maintenance','inbox','inbox-auto','legacy','relocation','maintenance','inbox-cold','legacy','relocation','maintenance']`，活锁字节不变断言保留（真实函数的活锁拒绝由 V05 覆盖）。S01（无锁，`inbox` false 短路）、S03（维护优先，不进 inbox 分支）、S04（`inboxLeaseRecoveryRequired` 先抛错，走 blocked-error）预期 trace 均不变。已逐一排除其余末语句提取文件：`root-maintenance-window-review.test.ts`、`root-relocation-main.test.ts`、`backup-removal-root-independent-review.test.ts`、`root-startup-review.test.ts` 均不到达该分支或恒 false 短路。
- 其余既有文件只增不改。

## TDD 顺序

1. 先写 V01–V05、V09、V09b、V10、V11 测试（引用尚未存在的 `recoverInboxLeaseAutomatically` / `quarantineInvalidStore`）与 V06–V08 启动分支用例，并同步完成「对既有测试的改动」中两个既有文件的 stub/期望更新，对**未修复**代码运行确认 RED：unit/integration 因符号缺失失败；SR-U-111/112 因旧分支直接弹窗失败；IL116-S02 因 deps 符号缺失失败。记录失败输出到 192。
2. 实现：① `versioned-store.ts` `quarantineInvalidStore` + `model-repository.ts` 接入；② `inbox-lease-recovery.ts` `recoverInboxLeaseAutomatically`；③ `index.ts` 分支改接。
3. 按上表命令逐项运行 V01–V12 确认 GREEN，结果记入 192。明确豁免：其余 unit/integration/browser/packaging 套件本轮不执行（用户约束：禁止全量测试）。
