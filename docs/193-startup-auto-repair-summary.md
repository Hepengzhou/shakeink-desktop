# 启动写入锁/配置文件自动修复总结

日期：2026-10-15。交付顺序：187 调研 → 188 产品 → 189 用例 → 190 独立审核（需修订后批准，P0/P1 已修订）→ TDD 实现 → 191 code review（无 P0/代码级 P1）→ 192 验证（全 GREEN + 台账登记）。

## 需求与根因

- 需求：启动遇「上次程序没正常关闭」/「写入锁」时自动修复写入锁并重试启动，最多 3 次，全失败才弹对话框；配置文件被修改/破坏/缺失/有文件锁/上次没正常关闭都不得阻塞启动；不等用户点「修复并退出」。
- 根因一：启动分支 `desktop/main/index.ts` 检测到收件箱残留写入锁后直接进入 `launchInboxLeaseRecovery`，首回合弹「修复本地写入锁」对话框等待用户点击，修复后还退出进程要求重开。
- 根因二：`state.json` 损坏时 `VersionedStore.readDisk` 抛错 → `repository.initialize()` 失败 → 纯错误框 + `exit(1)`。

## 改动（5 个生产文件 + 8 个测试文件 + 演示脚本/台账/文档）

- `desktop/main/inbox-lease-recovery.ts`：新增 `recoverInboxLeaseAutomatically(bootstrap, {assertColdHost, hook?, attempts?, wait?})`——循环「prepare → `recover(true)`（等价用户点击确认）」，`recovered` 且复检通过返回 true；失败/`cleanup-pending` 取消会话后 wait 重试；prepare 抛错计为失败尝试；默认 3 次、尝试间默认 500ms；预算用尽返回 false。
- `desktop/main/index.ts:814-822`：提取共用冷态断言 `assertInboxColdHost`；检测到残留锁后**先自动修复**，成功则同进程继续 `launch()`（用户无感知），3 次全失败才回落现有修复对话框（文案/按钮/结果提示不变）。无锁启动 `&&` 短路零开销。
- `desktop/core/versioned-store.ts`：新增 `quarantineInvalidStore()`——文件缺失或可解析且校验通过不动；损坏（语法错误/形状版本不符/校验失败）rename 为 `<原名>.corrupt-<ISO 时间戳>.json` 隔离保留（原字节可人工找回），rename 失败上抛维持错误框。
- `desktop/main/model-repository.ts`：`initialize()` 起始调用隔离，损坏设置不再阻塞启动，按默认设置进入工作台。
- `desktop/main/legacy-recovery-preflight.ts:47-50`（真实演示抓出的追加缺陷）：不可解析 `data-root.json` 不再包成 `LEGACY_BACKUP_RECOVERY_UNCONFIRMED` 阻断启动，与「指针缺失」同语义放行，交回分类层 repair:pointer 自动隔离重建 / dialog triage；合法指针的遗留恢复检查不变。
- 安全红线不变：自动路径与对话框共用同一 `WorkLeaseRecovery.recover`，活锁（OWNER_ALIVE）/异机锁/不明锁内容/篡改审计一律拒绝（IL42-15 实证）；归属不明的根冲突、根迁移、根维护窗口保留用户决策。
- 测试：新增 IL42-11~15、SR-U-111~113、DESK-G04 ×2、initialize 接线用例、IL42-PG03、preflight 放行用例、IL116-S05（真实启动链路指针隔离）；更新 IL116-S02（190 审核 P0-1）；`startup-recovery-main.test.ts` bindings 增加自动修复 stub（既有用例短路零改动）；IL116 辅助函数改终态轮询消时序脆弱。
- 演示：`scripts/demo-startup-auto-repair.mjs`（隔离数据根 + 真实 Electron：强杀进程树、删标记、毁指针、毁设置四连击），证据 `docs/evidence/startup-auto-repair/`。
- 台账：`docs/requirements-traceability.json` 登记 `startupAutoRepairRevision`。

## 验证（仅目标范围，未全量）

- TDD RED：未修复代码上 12 个目标用例全败于预定断言（符号缺失 / 旧分支直接弹窗 / 未隔离），既有 41 例全绿；preflight 缺口同样先 RED（`LEGACY_BACKUP_RECOVERY_UNCONFIRMED` / trace 止于 blocked-error）。
- GREEN：unit 7 个目标文件 96/96（Node 24；首跑 53/53 亦在系统 Node 20 通过）；集成 `tests/integration/inbox-lease-startup.test.ts` 3/3（真实打包 worker + 真实 PGlite，修复前后数据库 sha256 逐项一致、原中文模板逐字保留）；`npm run typecheck` exit 0。
- 真实系统演示（`npx -y node@24 --import tsx scripts/demo-startup-auto-repair.mjs`，全量 `npm run build` 后）：**16/16 PASS**——S1 强杀后自动修锁直进工作台（审计 recovered、新租约存活、退出释放）；S2a 标记同 id 重建；S2b 指针隔离 + 重建；S3 `state.corrupt-*.json` 字节一致 + 默认设置启动。演示同时抓出 1 个生产缺陷（preflight 指针损坏阻塞，已 TDD 修复）与 2 个脚本断言缺陷（已修正）。
- 环境说明：项目 `engines`/`​.nvmrc` 要求 Node 24；系统 Node v20.12.2 下集成套件与 `npm run build` 环境性失败（`Promise.withResolvers` / prisma ESM），统一经 `npx -y node@24`（v24.21.0）运行。

## 遗留

- 自动修复全失败后的对话框体验本身未改动（按需求保留为用户兜底）；`recoverInboxLeaseAutomatically` 注入 `wait` 抛错会冒泡为启动错误框（默认 wait 不可能抛，仅测试注入可达）。
- OS 级文件占用导致 `state.json` 隔离 rename 失败时维持现有错误框路径（188 R3 已注明）。
- 归属不明的 `dialog` 分类（如无有效根时的 pointer-invalid、root-mismatch、content-damaged）涉及数据取舍，保留用户决策窗口，不属于可自行解决范畴。
