# 配置目录任意删除自愈与兜底重建调研

日期：2026-10-15（经 197 独立审核修订）。范围：配置目录（数据根，如 `~/.shakeink`）中文件/目录被任意删除或破坏后的启动行为。本轮要求（2026-10-15，与 187/188 冲突处以后者为准）：

1. 无论配置目录中的文件被删除多少，启动时都应尝试修复。
2. 能修复的直接无感修复并正常启动。
3. 一切办法都无法修复时：进入程序主界面 → 弹出对话框询问「清空全部配置数据并重建后重启」或「直接退出」；选清空则删除无法修复的配置目录中的所有文件并重启重建，选退出则退出应用。

用户报告：删除配置目录中的「index 目录」与「draft.json」后无法正常启动。

## 名词核对（用户表述 → 实际文件）

配置根目录实际内容：`shakeink-app.json`（应用标记）、`catalog.json`（作品目录）、`state.json`（设置/模型库）、`model-catalogs.json`、`drafts.json`（草稿恢复日志，`desktop/main/draft-journal.ts:55`）、`inbox/`（全局数据库，`inbox/database` 为 PGlite 数据目录）、`session/`（Chromium 会话缓存，其下有 `GPUCache/index` 等缓存索引）、`backups/`（按需）。「draft.json」即 `drafts.json`；「index 目录」按报告组合与真实根现状（`inbox` 与 `drafts.json` 同时缺失）核对为 **`inbox` 目录**（形近误写；`session/*/index` 为缓存索引，删除不阻塞启动）。

## 现行行为（修复前）：代码分析 + 真实复现双重确认

启动顺序（`desktop/main/index.ts:790-822`）：`assertNoLegacyBackupRecovery` → `classifyStartupRecovery` → `rootRelocationPreflight` → `rootMaintenanceRequired` → `inboxLeaseRecoveryRequired`（+自动修锁）→ `launch()`。标记有效时分类层**不检查内容完备性**（`startup-recovery.ts:88-91` 直接返回 none；`contentReady` :36 = catalog.json 普通文件 ∧ inbox 普通目录 ∧ inbox/database 普通目录）。

真实复现（`scripts/repro-config-deletion.mjs`，隔离根 + 开发版 Electron，2026-10-15 运行通过，exit 0）：

| 删除/破坏 | 复现结果 | 机制 |
| --- | --- | --- |
| `drafts.json` | 正常进工作台 | 懒读 ENOENT→null（`draft-journal.ts:64`），无需修复 |
| `inbox/database`（seed 根 inboxReady:false） | 正常进工作台（worker 自建库） | 见下方 inboxReady 门 |
| **`inbox/` 整个目录** | **受限恢复窗口（blocked）** | worker `Workspaces.initialize()` `lstat(inbox)` 抛错（`workspaces.ts:117-118`）→ `failedRootCode` → 恢复窗口（`index.ts:826-834`） |
| `catalog.json` | **受限恢复窗口（blocked）** | worker `regularFile(catalog)` 抛错（`workspaces.ts:116`）→ 同上 |
| **`inbox/` + `drafts.json`（用户报告组合）** | **受限恢复窗口（blocked）** | 同 inbox 行 |
| `state.json` | 缺失→默认值；损坏→隔离+默认（187 轮已修） | 已覆盖 |
| `shakeink-app.json`（标记） | repair:marker 自动重建（187 轮已验证） | 已覆盖 |
| `data-root.json`（指针） | 不可解析→preflight 放行→repair:pointer 自动隔离重建（188 轮已修） | 已覆盖 |
| `model-catalogs.json` / `session/` / 缓存索引 | 懒读/自动重建，不阻塞 | 无需修复 |

补充两条路径差异（审核 P1/P2 修订）：真实使用过的根有 bootstrap 指针且标记 `inboxReady:true`，此时删 `inbox/` 会更早在主进程 `inboxLeaseRecoveryRequired` 的 `directoryImmediately`（`inbox-lease-recovery.ts:9-13`）抛 ENOENT → `failed()`（`index.ts:824-839`）纯错误框退出；仅删 `inbox/database` 时主进程闸门通过，但 worker 启动期 `run("inbox")` 校验数据库失败且 `marker.inboxReady===true` → 抛「全局收件箱数据库缺失，不能自动重建」（`workspaces.ts:319-321`，`service/index.ts:44` 启动屏障内）→ `failedRootCode` → 恢复窗口。

### inboxReady 门（审核 P0-1，决定 R1 设计）

worker 首次连全局库（`workspaces.ts:314-333`）：`validateDatabase(inbox)` 失败时，若 `marker.inboxReady` 为 true **或 inbox 目录非空** → 抛错拒绝自动重建；否则走 create 路径初始化空库并回写 `inboxReady:true`（:324-328）。**因此 content 修复不能只重建目录：对 `inboxReady:true` 的真实根，必须把标记的 `inboxReady` 原子改写为 false（保留 id/app/phase），worker 才能自建新库并回写 true**；原标记字节按 repairMarker 先例（`startup-recovery.ts:145-152`）隔离保留。注意 `repairMarker` 写死 `inboxReady:true`（:152），不可直接复用于此场景。

### 实施期 code review 追加修订（198，已并入实现）

- **worker 闸门放宽（198 实施期 P0）**：上述闸门同时把「inbox 非空」拒之门外，而 content 修复重建的空 `inbox/database/` 使 inbox 恰为非空——翻转场景仍会在 worker 屏障断裂。最终实现把闸门放宽为容忍「inbox 内唯一条目为空 `database` 目录」（与 connect create 路径 :289-294 语义一致；`inboxReady:true` 或任何其他内容仍拒绝），翻转链路端到端闭合（SR-I-08 真实 worker 验证）。
- **翻转连带指针隔离**：标记翻转为 `inboxReady:false` 后，仍有效的指针会触发 `rootRelocationPreflight` 的 `ROOT_MARKER_INVALID` 阻塞（`root-relocation-preflight.ts:35`），故 content 修复在翻转（或重建 false 标记）且指针存在时将其一并隔离（沿用 repair:pointer 语义；隔离名不命中历史名清单，preflight 归 none）。
- **自定义根保护（198 P1）**：自定义根（分类恒 none 的自定义指针）worker 启动失败时，兜底对话框不得把家庭默认根列为清空目标——`index.ts` 以 `failedRootPath` 记录实际失败根，非默认根保持普通错误框退出。
- **catalogUsable 升级**：`contentReady` 的 catalog 检查由「存在+普通文件」升级为「存在+形态+信封可解析」（schemaVersion/revision/value 形状），行级校验仍归 worker。

## 修复设计要点（含 197 审核 P0/P1 修订）

1. **结构自愈（无感）**：`classifyStartupRecovery` 增加 `repair:"content"`，`executeStartupRepair` 对应实现，只增不删（隔离重命名保留原字节除外）：
   - 重建 `inbox/`、`inbox/database/`（缺失时；形态异常如 symlink/普通文件 → 隔离后重建）。
   - `catalog.json` 缺失 → 写空目录（`{schemaVersion:1,revision:0,value:[]}`）；损坏/形态异常 → 隔离后写空。
   - 标记 `inboxReady:true` → 隔离原标记并按原 id/app/phase 原子改写为 `inboxReady:false`（worker 随后自建库并回写 true）。
   - 并发的指针不可解析 → 顺带隔离（repair:pointer 语义）；标记可重建损坏 → 顺带重建（有效指针取 pointer.rootId；无指针时按 marker-new-id 语义取新 id）。
2. **分类红线与归类决策（审核 P0-2）**：
   - 有效指针 + 标记缺失/可重建损坏 + 内容损坏 → `repair:"content"`（归属由指针+设备/inode 校验保证）。**既有 SR-U-14/14b/15/15b 的 dialog:content-damaged 预期翻转为 content**，symlink/目录形内容视为损坏 → 隔离重建（行为放松，明示）。
   - **无指针 + 内容损坏（标记缺失/可重建）→ 坚守 dialog**（无 id 来源，铸新 id 覆盖不明内容属红线放松；SR-U-28 保持）。
   - **reset 崩溃残留（SR-U-64）**：按本轮「能修则修」优先原则更新既有不变量——标记已删、指针尚在、内容已删的半清空根分类为 `repair:"content"`，自愈为一致的空结构根（用户仍可在兜底对话框再次清空）；同步修订 `startup-recovery.ts:170-172` 注释与 SR-U-64 预期。
   - 品牌冲突（BRAND_MARKER_CONFLICT/BRAND_CONTROL_CONFLICT）、根身份不符（设备/inode 不一致）、根为 symlink/非目录 → 坚守 dialog，进 R2。
3. **兜底清空重建（用户决策）**：dialog 分类、修复执行失败、worker 根启动失败 → `launchConfigResetOffer`：
   - 以 `os.tmpdir()` 下临时隔离根改写 `startupPaths`/`bootstrapPath` 并清空 `startupSelectionError`（审核 P1：`index.ts:223` 会抛出留存错误），复用 `launch()` 启动真实主界面（空设置，可能呈现引导页，属正常）；**不重设 `app.setPath("userData")`**（保持单实例锁目录稳定，`index.ts:68-69`）；原配置目录保持不动。
   - 主窗口上弹原生模态对话框：「退出」（默认/取消）/「清空全部配置并重启」；对话框或窗口被关闭视同退出。
   - 选清空：`executeStartupReset`（既有，含目标校验）清原配置目录全部文件 + bootstrap 控制文件 → `app.relaunch()` + `app.exit(0)`（有意跳过 before-quit 排干：临时根数据可弃）；清空后 auto-init 全新重建（SR-I-06 已实证）。
   - 清空执行失败（RESET_FAILED 等）→ 错误对话框（原文件保留说明）+ `app.exit(1)`（审核 P1）。
   - 临时根残留：Windows 下运行期句柄不可删，留在系统临时目录由 OS 清理（审核 P1，明示）。
   - 此路径取代 188 R2 中「dialog 分类保留受限恢复窗口」的旧约定（以后者为准）；`launchStartupRecovery` 导出保留（受限窗口模块仍服务根迁移流程），`index.ts` 移除对其调用。
4. **`inboxLeaseRecoveryRequired`**：inbox 缺失返回 false（结构问题归分类层），锁/审计语义不变。
