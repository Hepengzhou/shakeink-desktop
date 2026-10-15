# 启动写入锁/配置文件自动修复 code review

日期：2026-10-15。审核对象：本次改动的 4 个生产文件（`desktop/core/versioned-store.ts`、`desktop/main/model-repository.ts`、`desktop/main/inbox-lease-recovery.ts`、`desktop/main/index.ts`）与 6 个测试文件。审核方式：独立子代理只读逐文件审读，以 docs/189/190 记载的旧行为为基线交叉验证。结论：**无 P0、无代码级 P1，需修订后批准**；唯一 P1（192 执行报告）与 P2-1（台账登记）随本批文档补齐，代码零返工。

## 核验要点（全部成立）

- `recoverInboxLeaseAutomatically`（`desktop/main/inbox-lease-recovery.ts:36-49`）：循环/预算/wait 语义与 docs/189 实现面逐条对应——prepare 抛错经外层 catch 计为失败尝试；`recover` 失败或 `cleanup-pending` 经 `finally{session.cancel()}` 取消会话后重试；`recovered` 先 `assertRecovered()` 再返回 true，复检抛错走重试不误判成功；`attempts` 默认 3 且下限钳制；`wait` 恰在相邻尝试间调用（3 次预算 2 次 wait，`attempts:1` 时 0 次）。
- `index.ts:814-822`：自动修复与对话框以同一标识符接收共用冷态断言 `assertInboxColdHost`，对象同一性无分歧；`&&` 短路使无锁启动零开销（SR-U-104~110 trace 零回归实证）；末语句仍是含 `app.requestSingleInstanceLock()` 的 if 语句，两个 AST 提取测试前提保持。
- `quarantineInvalidStore`（`desktop/core/versioned-store.ts:68-88`）：形状谓词与 `readDisk`（:61-66）逐字镜像；ENOENT→false、非 ENOENT 读错误上抛；rename 失败（OS 级占用）穿出 `initialize()`→`launch()`→`failed()` 错误框，不静默；与 `read`/`update` 共用 `enqueue` 串行队列；隔离命名与批准先例 `startup-recovery.ts:111` 同款。
- 安全闸无旁路：自动路径仅把 `confirmation` 置真后进入与窗口点击完全相同的 `WorkLeaseRecovery.recover`；OWNER_ALIVE/OWNER_FOREIGN/LOCK_CONTENTS_UNKNOWN/AUDIT_CHANGED/确认闸全部生效；每次尝试重新 prepare，冷态断言在每一闸点生效（worker/window 已启动则计失败尝试）。
- 测试质量：IL42-11~15 尝试次数/ wait 次序/字节保留/活锁零审计文件均落现场断言；SR-U-111~113、DESK-G04 ×2、initialize 接线用例、IL116-S02 期望更新、IL42-PG03 与 docs/189 预期一致；无 timing/平台脆弱点（wait 全部注入桩，次序断言由逻辑计数驱动）。

## 分级发现与处置

| 级别 | 发现 | 处置 |
| --- | --- | --- |
| P0 | 无 | — |
| P1 | docs/192 执行报告缺失（V01–V12 实际命令与结果、RED 记录） | 已补齐，见 192 |
| P2-1 | `docs/requirements-traceability.json` 未登记本轮台账 | 已登记 `startupAutoRepairRevision` |
| P2-2 | SR-U-112 未断言对话框与自动修复收到同一断言对象（同标识符传参可检视确认，IL116-S02 经真实调用链覆盖） | 可不改 |
| P2-3 | DESK-G04 缺失子例未在 quarantine 后再 `read()`（缺失→默认值已由 DESK-S08/第一例覆盖） | 可不改 |
| P2-4 | 记录项：注入 `wait` 抛错会冒泡为启动错误框（默认 wait 不可能抛，仅测试注入可达）；隔离撞名理论风险与批准先例同款 | 记录在案 |
