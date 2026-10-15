# 启动写入锁/配置文件自动修复验证报告

日期：2026-10-15。范围：仅 docs/189 的 V01–V12，未执行全量套件（用户约束）。运行环境：Windows，系统 Node v20.12.2 不满足项目 `engines: >=24 <25` 与 `.nvmrc: 24`，集成套件经 `npx -y node@24`（v24.21.0）运行；unit 套件在两个版本各跑一次均通过。

## TDD RED（未修复代码，系统 Node v20.12.2）

命令：`node --import tsx --test tests/unit/versioned-store.test.ts tests/unit/model-repository.test.ts tests/unit/inbox-lease-recovery.test.ts tests/unit/startup-recovery-main.test.ts tests/unit/inbox-lease-startup-116-review.test.ts`

结果：`# pass 41 / # fail 12`——失败恰为 12 个目标用例，既有用例全绿：

| 用例 | RED 失败原因（实测输出） |
| --- | --- |
| IL42-11~15（V01–V05） | `(0 , import_inbox_lease_recovery.recoverInboxLeaseAutomatically) is not a function` |
| SR-U-111/112/113（V06–V08） | trace 断言失败：旧分支直接 `inbox-window`，无 `inbox-auto-repair` |
| IL116-S02（P0-1 更新） | trace 断言失败：旧分支无 `inbox-auto` 及自动修复复检段 |
| initialize 接线（V09b） | `initialize()` 未隔离损坏文件，`repo.initialize()` 抛 SyntaxError |
| DESK-G04 ×2（V09/V10） | `store.quarantineInvalidStore is not a function` |

## GREEN（修复后）

| 验证 | 命令 | 结果 |
| --- | --- | --- |
| V01–V05（IL42-11~15）、V06–V08（SR-U-111~113）、V09/V09b/V10（DESK-G04 ×2 + initialize 接线）、IL116-S01~S04、既有 IL42-01~10/SR-U-104~110/DESK-S08/G03 等回归 | `node --import tsx --test tests/unit/versioned-store.test.ts tests/unit/model-repository.test.ts tests/unit/inbox-lease-recovery.test.ts tests/unit/startup-recovery-main.test.ts tests/unit/inbox-lease-startup-116-review.test.ts`（系统 Node v20.12.2） | 53/53 通过，0 失败 |
| 同上（项目要求版本） | `npx -y node@24 --import tsx --test <同上 5 个文件>`（v24.21.0） | 53/53 通过，0 失败 |
| V11（IL42-PG03）+ IL42-PG01/PG02 回归 | `npx -y node@24 --import tsx --test tests/integration/inbox-lease-startup.test.ts` | 3/3 通过（PG01 5.5s、PG02 6.3s、PG03 6.4s）：真实 esbuild 打包 worker、真实 PGlite、修复前后数据库文件 sha256 逐项一致、原中文模板逐字保留、worker 正常关锁 |
| V12 | `npm run typecheck`（tsc --noEmit） | exit 0，无错误 |

## 追加：真实 Electron 演示抓出的指针损坏缺口（V13/V14，TDD 修复）

首轮演示 S2b（损坏 `data-root.json` 后启动真实应用）抓出：`assertNoLegacyBackupRecovery`（`desktop/main/legacy-recovery-preflight.ts:45-47`）对不可解析指针原样 `JSON.parse` 抛错 → `LEGACY_BACKUP_RECOVERY_UNCONFIRMED` → 纯错误框 + `exit(1)`，抢先于 `classifyStartupRecovery` 的 repair:pointer——187 初稿「指针损坏已自动修复」论断对不可解析指针不成立。

- RED（未修复代码）：新增 preflight 用例抛 `LEGACY_BACKUP_RECOVERY_UNCONFIRMED`；IL116-S05 trace 止于 `legacy→blocked-error`、exit 1。
- 修复：`legacy-recovery-preflight.ts:47-50` 不可解析指针与「缺失」同语义放行（guard 后返回），交回分类层 repair:pointer 自动隔离重建 / dialog triage；合法指针的全部遗留恢复检查不变。
- GREEN：`node --import tsx --test tests/unit/backup-removal-preflight.test.ts tests/unit/inbox-lease-startup-116-review.test.ts tests/unit/startup-recovery-main.test.ts tests/unit/startup-recovery.test.ts` → 59/59，连续 3 次运行稳定（IL116 辅助函数顺带把固定 tick 等待改为终态轮询，消除时序脆弱）。

## 真实目标系统演示（V15，`scripts/demo-startup-auto-repair.mjs`，Node 24 + 开发版真实 Electron 窗口 + 隔离数据根）

命令：`npx -y node@24 --import tsx scripts/demo-startup-auto-repair.mjs`（构建：`npm run build` 全量经 Node 24 完成，`dist/main/index.cjs` 含全部修复）。最终结果 **16/16 PASS**，证据 `docs/evidence/startup-auto-repair/`（5 张截图 + report.json）：

| 场景 | 操作 | 实测结果 |
| --- | --- | --- |
| S1 上次没正常关闭 | 启动进工作台后 `taskkill /T /F` 强杀进程树，确认 `.shakeink-lock/owner.json` 残留且无审计，再启动 | 无对话框直接进工作台；修复审计落盘 `phase=recovered`；当前锁为新进程存活租约（pid/token 均不同于强杀前且属主存活）；设置保持；正常退出后锁释放 |
| S2a 标记被删 | 删除根目录 `shakeink-app.json` 再启动 | 标记自动重建且根 id 不变、phase ready/inboxReady；工作台直入，设置保持 |
| S2b 指针被破坏 | `data-root.json` 写入垃圾字节再启动 | 无错误框直入工作台；`data-root.corrupt-<时间戳>.json` 隔离字节一致；新指针重建；设置保持 |
| S3 设置被破坏 | `state.json` 写入垃圾字节再启动 | `state.corrupt-<时间戳>.json` 隔离字节一致；默认设置正常启动（onboarding 重置 null，截图为主题选择引导页） |

截图核验：S1/S2a/S2b 三张工作台截图像素一致（同一健康工作台，证明每次自愈后落点相同）；S3 为默认设置引导页。

## 最终汇总（全部 scoped，未全量）

- unit（Node 24）：7 个目标文件 96/96 通过、0 失败。
- integration（Node 24）：`tests/integration/inbox-lease-startup.test.ts` 3/3（真实 PGlite worker）。
- typecheck：`npm run typecheck` exit 0。
- 真实系统演示：16/16，证据齐备。
- 演示过程价值：除验证修复外，真实演示抓出 1 个生产缺陷（preflight 指针损坏阻塞）与 2 个演示脚本断言缺陷（运行期锁=新租约语义、默认 onboarding=null），均已修复并回归。

## 行为验收对照

| 约束 | 证据 |
| --- | --- |
| 遇写入锁直接自行修复，不先弹对话框 | SR-U-111：trace `inbox-preflight→inbox-auto-repair→ordinary`，无 `inbox-window`；IL42-PG03 真实 worker 无对话框启动 |
| 最多 3 次尝试，全失败才弹窗 | IL42-13（3 次/2 次 wait/`attempts:1` 子例）、SR-U-112（false→`inbox-window`）、IL42-12（第 3 次成功收敛）、IL42-14（cleanup-pending 重试收敛） |
| 不等用户点「修复并退出」 | `recover(true)` 自动确认（IL42-11）；成功后同进程 `launch()`（SR-U-111、PG03） |
| 活锁/不安全绝不修复 | IL42-15（活 pid 3 次全拒、字节不变、零审计文件）；SR-U-113（冷态断言拒绝已启动宿主） |
| 配置损坏/缺失不阻塞启动 | DESK-G04（损坏隔离字节一致 + 默认值读取；有效/缺失不动）、initialize 接线用例（损坏 state.json → 默认设置启动，原文件保留为 `state.corrupt-<时间戳>.json`） |
