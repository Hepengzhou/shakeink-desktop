# 启动写入锁/配置文件自动修复调研

日期：2026-10-15。范围：应用启动时遇到「上次程序没正常关闭」/「写入锁」类问题，以及配置文件被修改/破坏/缺失导致的启动阻塞。本轮要求（2026-10-15）：此类问题启动时直接自行修复，不先弹错误对话框；最多尝试 3 次修复，全部失败后才弹对话框；确保用户每次都能正常启动。

## 问题现象

启动时弹出「修复本地写入锁」原生对话框（标题「上次应用未正常关闭」，按钮「退出 / 修复并退出」），用户必须手动点击才能修复；点击「修复并退出」后再次弹结果框并**退出进程**，用户还要再启动一次应用。对应截图所示场景。

## 现状启动链与阻塞点

启动分支位于 `desktop/main/index.ts:774-838`（`start()` :790-820），依次经过：

1. `classifyStartupRecovery`（`desktop/main/startup-recovery.ts:64-109`）——bootstrap 指针 / 应用标记的分类：
   - `auto-init`（根目录缺失或为空）、`repair:pointer`（指针损坏但根完整）、`repair:marker` / `marker-new-id`（标记可重建）、`resume-init`：**已自动修复**，无对话框（`index.ts:796-806`）。
   - `dialog`（`root-mismatch` / `content-damaged` / `default-invalid` / 无有效根时的 `pointer-invalid`）：归属不明或可能涉及两份数据，走恢复窗口由用户决策（含破坏性 reset 能力）。这类**不能**自动修复——自动选择有误清用户数据的风险。
2. `rootRelocationPreflight`（`index.ts:811-812`）——根迁移交接，属用户显式发起流程，保留窗口。
3. `rootMaintenanceRequired`（`index.ts:813`）——根维护，保留窗口。
4. **`inboxLeaseRecoveryRequired`（`index.ts:814-818`）→ `launchInboxLeaseRecovery`——本次目标阻塞点**：检测到收件箱写入锁残留（上次进程异常退出）即进入 `desktop/main/inbox-lease-recovery-window.ts`，首回合直接弹「修复本地写入锁」对话框等待用户点击。
5. `launch()` 正常启动。

### 写入锁检测与修复机制（可安全自动化的依据）

- `inboxLeaseRecoveryRequired`（`desktop/main/inbox-lease-recovery.ts:15-26`）：同步首回合纯读检测——inbox 目录下锁目录存在，或恢复审计记录处于 `observed` 相位（上次修复中断）。
- `prepareInboxLeaseRecovery`（`inbox-lease-recovery.ts:35-85`）：固定 inbox 能力的恢复会话；`recover(confirmed)` 要求显式确认（当前确认来源就是对话框点击）。
- 核心 `WorkLeaseRecovery`（`desktop/core/work-lease-recovery.ts`）自带完备安全闸，与「谁发起确认」无关：
  - `dead()`（:135-140）：锁属主进程必须已死（`process.kill(pid,0)` 得 `ESRCH`），活锁 `OWNER_ALIVE`、异机锁 `OWNER_FOREIGN` 一律拒绝——**自动修复绝不会偷取存活进程的锁**。
  - 锁目录内容必须恰为 `owner.json` 一项（`LOCK_CONTENTS_UNKNOWN` 拒绝）；审计记录逐字节校验（`AUDIT_CHANGED` 拒绝）；每一步前后重验目录权威与主机冷态。
  - `recover` 结果：`recovered`（锁已移除、审计 `recovered`）或 `cleanup-pending`（属主记录已删、空锁目录或收尾未完成——**可重试**，IL42-08 已验证重试收敛）。
- 修复只移除锁目录与写审计记录，不触碰作品/设置/草稿字节：集成用例 IL42-PG02（`tests/integration/inbox-lease-startup.test.ts:60-67`）实测修复前后 `inbox/database` 全部文件 sha256 不变。
- 单实例锁（`app.requestSingleInstanceLock()`，`index.ts:777`）在进入该分支前已持有，故残留锁只能来自已退出的前一进程；对话框的「确认」本质是人工过场，自动化不降低安全性。
- 现有对话框流程在修复成功后仍 `exit(0)` 要求用户重开应用（`inbox-lease-recovery-window.ts:24-29`）——自动化后可直接在同进程继续 `launch()`，该退出环节一并消除。

### 配置文件类启动阻塞盘点（对应约束「配置文件被修改/破坏/缺失」）

| 文件 | 缺失 | 损坏/被修改 | 现状 |
| --- | --- | --- | --- |
| `data-root.json`（bootstrap 指针） | auto-init | **可解析但语义失效的指针**：`assertNoLegacyBackupRecovery`（`desktop/main/legacy-recovery-preflight.ts:45-53`）放行后由 `classifyStartupRecovery` 自动 repair:pointer；**不可解析（JSON 语法/结构损坏）的指针**：preflight 原样 `JSON.parse` 抛错包成 `LEGACY_BACKUP_RECOVERY_UNCONFIRMED`（:61）→ 纯错误框 + `exit(1)`，**启动被阻塞**（187 初稿「已自动修复」论断对此不成立，真实 Electron 演示 S2b 抓出） | 本次补修：preflight 对不可解析指针放行（:47-50），交回分类层 repair:pointer 自动隔离重建；归属不明仍走 dialog |
| `shakeink-app.json`（根标记） | auto-init | 可重建时 repair:marker；冲突时 dialog | 可自动部分已自动 |
| `state.json`（设置/模型库，`launch()` :235-236 `repository.initialize()`） | `VersionedStore.readDisk` 返回默认值（`desktop/core/versioned-store.ts:58`），正常启动 | **抛错（:61-65：形状/版本错误为「设置格式或版本不可识别，原文件已保留」，纯语法错误为 `JSON.parse` 的 SyntaxError）→ `failed()` 纯错误框 + `exit(1)`（`index.ts:834-835`），启动被阻塞** | 本次需自动修复 |
| `catalog.json`（作品目录，`desktop/service/workspaces.ts:91` 同为 `VersionedStore`） | 按缺失初始化 | 损坏 → worker 根启动失败 → `failedRootCode` → 恢复窗口（`index.ts:823-831`） | 归属/数据取舍，保留用户决策（R2 不变） |
| `model-catalogs.json`（型号目录缓存） | 懒读返回 null | 懒读抛 `CATALOG_READ_FAILED`，不阻塞启动（`desktop/main/model-catalog-repository.ts:32`） | 无需处理 |

## 结论

1. **主修复**：`index.ts` 启动链的 inbox 锁分支改为「先自动修复（`recover(true)` 自动确认），最多 3 次尝试；任一尝试成功且复检通过即继续 `launch()`；3 次全部失败才回落到现有 `launchInboxLeaseRecovery` 对话框」。重试覆盖两类瞬态：前一进程尚未完全退出（`OWNER_ALIVE`）与中断修复留下的 `cleanup-pending`（IL42-08 已证明重试可收敛）。尝试间加入短等待以提高瞬态收敛概率。
2. **次修复（配置损坏约束）**：`state.json` 存在但不可解析/校验失败时，启动前将其隔离重命名（`state.corrupt-<时间戳>.json`，原字节保留），随后按默认值正常启动；文件有效或缺失时行为不变。
3. **次修复二（演示抓出的指针损坏缺口）**：`assertNoLegacyBackupRecovery` 对不可解析的 `data-root.json` 原样抛错，抢先于分类层把启动阻断在纯错误框；改为与「指针缺失」同语义放行（guard 后返回），由 `classifyStartupRecovery` 的 repair:pointer 自动隔离重建（根完整时）或 dialog（归属不明时）接管。合法指针的全部遗留恢复检查不受影响。
4. **保持不变**：归属不明的 `dialog` 分类、根迁移、根维护窗口——这些涉及数据取舍，必须保留用户决策，不属于「能自己解决」的范畴。
