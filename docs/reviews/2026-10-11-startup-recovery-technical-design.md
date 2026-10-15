# 启动配置目录丢失/损坏修复 · 技术方案

日期：2026-10-11
依据：`docs/reviews/2026-10-11-startup-recovery-research.md`（调研）、`docs/reviews/2026-10-11-startup-recovery-product-design.md`（产品）、`design/startup-recovery/`（UI 设计稿 v1，用户已于 2026-10-11 批准）

## 1. 总体架构

新增一个纯文件系统核心模块 + 复用并扩展现有 relocation 维护窗口：

- **新增 `desktop/main/startup-recovery.ts`**：不依赖 Electron 的冷态核心。导出启动分类器、修复执行器、重置执行器。全部同步/有界文件操作，复用 `desktop/core` 校验原语。
- **扩展 relocation 窗口链路**（`desktop/main/root-relocation-{window,controller}.ts`、`desktop/shared/root-relocation.ts`、`src/components/desktop/RootRelocationScreen.tsx`）：新增「重置」相位与命令，blocked 相位按批准设计改为「无法修复数据目录」恢复对话框；新增 `launchStartupRecovery` 入口供无指针场景与 worker 失败场景直接开窗。
- **接线 `desktop/main/index.ts`**：模块加载期路径选择失败的兜底、start() 内的分类/修复钩子、worker 启动失败路由到恢复对话框。
- **两处小的既有模块修订**（见 §2.7）：`brand-startup-paths.ts` 全部抛出点携带家族感知的 `recoveryPaths`；`data-root.ts` 的 `resolve()` 在无指针时容忍 `phase:"initializing"` 标记以启用既有续跑路径。

正常初始化与 `adopt()` 自愈路径原样复用；迁移/恢复既有流程语义不变。

### 1.1 关键概念：恢复目标根 `recoveryRoot`

分类器的「默认根」比较基准与重置的清空目标统一为 `recoveryRoot`，**绝不硬编码 `join(home,'.shakeink')`**：

```
recoveryRoot = isolatedRoot ? resolve(isolatedRoot)            // 测试隔离模式：startupPaths.defaultRoot 即隔离根
             : join(home, family === 'legacy' ? '.xuanxiang' : '.shakeink')
```

（审核修订：阻断项——隔离模式下分类/重置若指向真实 `~/.shakeink` 会误删开发者数据。）`executeStartupReset` 的防呆校验以该计算值为准。

## 2. 核心模块 `desktop/main/startup-recovery.ts`

### 2.1 类型

```ts
export interface StartupRecoveryPaths { bootstrap: string; recoveryRoot: string }
export type StartupRecoveryRepair = 'pointer' | 'marker' | 'marker-new-id' | 'resume-init'
export type StartupRecoveryReason =
  | 'pointer-invalid'     // 指针损坏且根也不完整
  | 'default-invalid'     // 无指针，默认根损坏且不满足修复条件
  | 'root-mismatch'       // 目录被替换（inode 不同且非空）、符号链接/realpath 异常或 marker id 与指针不一致
  | 'content-damaged'     // catalog/inbox/数据库等内容损坏
export type StartupRecoveryClass =
  | { kind: 'none' }                                        // 不归本功能：健康、既有流程或范围外
  | { kind: 'auto-init' }                                   // F1：摘除悬空指针即可正常初始化
  | { kind: 'repair'; repair: StartupRecoveryRepair }       // F2：冷态修复（resume-init 不写文件，见 §2.4）
  | { kind: 'dialog'; reason: StartupRecoveryReason; sourcePath: string | null }
```

### 2.2 分类器 `classifyStartupRecovery(paths, family): StartupRecoveryClass`

同步、冷态、纯读。`paths.recoveryRoot` 见 §1.1；`family` 为当前品牌家族（决定 marker 文件名与 app 标识）。判定顺序（命中即停）：

1. bootstrap 目录不可读/身份异常 → `{kind:'none'}`（交给既有错误路径）。
2. bootstrap 存在历史记录 → `{kind:'none'}`（在途迁移/恢复走既有窗口）。历史名单 = `root-migration.json`、`root-migration-request.json`、`root-relocation-*`、`application-restore-*`（与 `root-relocation-preflight.ts:27` 同口径；**注意**：`brand-startup-paths.ts:17` 的 `hasHistory` 还含 `data-root.json`，本分类器的历史名单不含它——指针在步骤 3 单独处理，照抄 hasHistory 会让指针场景永远到不了步骤 3）。
3. 读 `data-root.json`（`observeRootAuthority` 严格读）：
   - **指针存在但无法解析** → `rootFullyValid(recoveryRoot, family)`（见 §2.3）→ `{kind:'repair', repair:'pointer'}`，否则 `{kind:'dialog', reason:'pointer-invalid', sourcePath:null}`。
   - **指针不存在** → 依次判 `recoveryRoot`：
     - 缺失 → `{kind:'none'}`（现状即可初始化）。
     - 存在但非目录/符号链接/realpath 不符 → `{kind:'dialog', reason:'root-mismatch', sourcePath:null}`（**禁止穿符号链接做任何修复写入**）。
     - 空目录 → `{kind:'none'}`。
     - 非空 → marker 检查：
       - marker 完全有效（`readApplicationBrandImmediately` 通过、`phase==='ready'`、**`names.family===family`**）→ `{kind:'none'}`（worker `adopt()` 自愈）。
       - marker 完全有效且家族不符 → `{kind:'dialog', reason:'root-mismatch', sourcePath:null}`（健康但属另一家族，保持 `BRAND_DEFAULT_INVALID` 语义，不静默处理）。
       - marker 可解析且 `phase==='initializing'` 且家族相符 → `{kind:'repair', repair:'resume-init'}`（R3：上次初始化中断，无用户数据；不写任何文件，放行正常 launch 由 `Workspaces.initialize` 续跑，依赖 §2.7 的 resolve() 容忍改动）。
       - marker 缺失/无法解析 → 满足 R4 条件（`catalog.json` 为普通文件、`inbox/` 非符号链接目录、`inbox/database/` 非符号链接目录、`backups/application/` 不存在）→ `{kind:'repair', repair:'marker-new-id'}`；否则 `{kind:'dialog', reason:'default-invalid', sourcePath:null}`。
       - 其余（marker 可解析但语义不符且非 initializing）→ `{kind:'dialog', reason:'root-mismatch', sourcePath:null}`。
   - **指针可解析** → `pointer.root.path !== recoveryRoot` → `{kind:'none'}`（自定义目标走 relocation）。目标为默认根时：
     - 默认根缺失（ENOENT）→ `{kind:'auto-init'}`。
     - 存在但为非目录/符号链接/realpath 不符 → `{kind:'dialog', reason:'root-mismatch', sourcePath:pointer.root.path}`。
     - 存在且为空目录 → `{kind:'auto-init'}`（无论 inode 是否匹配，空目录无数据可毁）。
     - 非空且 device/inode 与指针不一致 → `{kind:'dialog', reason:'root-mismatch', sourcePath:pointer.root.path}`（可能是用户放回的外来副本，禁止静默采纳或静默清空）。
     - 非空且身份一致 → marker 检查：
       - marker 完全有效、`id===pointer.rootId`、`phase==='ready'`、`inboxReady===true` → `{kind:'none'}`（健康）。
       - marker 完全有效、`id===pointer.rootId`、`phase==='ready'` 但 `inboxReady===false` → `{kind:'repair', repair:'pointer'}`（摘除指针走 §B6 自愈：worker resolve → initialize → `run('inbox')` 补 `inboxReady` → adopt 重写同 id 指针；`workspaces.ts:326-331`）。
       - marker 缺失/无法解析 → 满足 R2 条件（`catalog.json` 普通文件、`inbox/` 在、`inbox/database/` 在）→ `{kind:'repair', repair:'marker'}`，否则 `{kind:'dialog', reason:'content-damaged', sourcePath:recoveryRoot}`。
       - marker 可解析但语义不符（id 不匹配、phase 非 ready；家族/app 分桶口径见 §2.3）→ `{kind:'dialog', reason:'root-mismatch', sourcePath:recoveryRoot}`。

### 2.3 辅助判定

- `rootFullyValid(root, family)`：`readApplicationBrandImmediately` 通过 + `names.family===family` + `phase==='ready'` + `inboxReady===true` + `catalog.json` 为普通文件 + `inbox/` 为非符号链接目录 + `inbox/database/` 为非符号链接目录。只做存在性/类型检查，不解析内容；更深的损坏由 worker 启动失败兜底（§4.3）。
- 所有判定前后用 `assertRootAuthorityDirectory` 复核目录身份；读文件一律 `observeRootAuthority`（拒绝符号链接、nlink=1、大小上限、读后复核）。
- 路径相等比较 `samePath(a,b)`：双侧 `realpathSync`（存在侧）后比较，win32 忽略大小写——避免 8.3 短名/大小写差异误拒合法默认根（审核修订）。
- **marker 损坏分桶消歧**（审核修订）：「无法解析」= 文件缺失、JSON 非法、或 zod schema 校验失败（含 `app` 字段错误，`brand-names.ts:49`）→ 可按 R2/R4 重建；「可解析但语义不符」= schema 通过但 `id!==pointer.rootId`、`phase` 非预期、或家族不符 → dialog/root-mismatch。即：只有 schema 全过且能对上身份的 marker 才进 dialog，其余损坏一律视为可重建的坏文件（隔离留证后重写）。**补注**（code review 确认的实现口径）：`BRAND_MARKER_CONFLICT`（双家族 marker 并存）、`BRAND_CONTROL_CONFLICT`、目录身份异常属于更保守的 dialog 桶——双家族 marker 意味着可能撞见另一品牌的活数据根，不做「可重建」推断。

### 2.4 修复执行器 `executeStartupRepair(paths, repair, guards): Promise<void>`

异步、冷态（用异步 `atomicWrite`）。`guards = { assertLock(): void; hooks?: { beforeRename?(): void; beforeRemove?(name: string): void } }`——**hooks 是测试注入点**（审核修订）：执行器在每次 `atomicWrite` 的 `beforeRename` 内先调 `hooks.beforeRename?.()` 再做身份复核，使 SR-U-44/45 能确定性注入「执行中文件被替换」。hooks 永不来自渲染端。marker 文件名与 `app` 字段均随家族（current → `shakeink-app.json`/`"ShakeInk"`，legacy → `xuanxiang-app.json`/`"Xuanxiangxiezuo-Desktop"`，见 `desktop/shared/brand-names.ts:8-9` 与 `desktop/core/brand-names.ts:8,49`）。

- `pointer`（R1，及 inboxReady=false 的自愈变体）：把 `data-root.json` 改名隔离为 `data-root.corrupt-<ISO8601 时间戳>.json`（留证；该名字不匹配历史名单与 preflight 名单，后续启动视为无指针 → worker `adopt()`/inbox 自愈）。改名前后复核 bootstrap 目录身份。
- `marker`（R2）：以指针 `rootId` 原子写 `<root>/<家族 marker>`：`{schemaVersion:1, app:<家族 appIdentity>, id:pointer.rootId, phase:'ready', inboxReady:true}`。若存在同名坏文件先改名为 `<marker>.corrupt-<ts>.json` 隔离（不匹配 BRAND_NAMES marker 名单）。写入用 `atomicWrite`（`desktop/core/versioned-store.ts`），`beforeRename` 内复核根目录身份与指针文件未变化。
- `marker-new-id`（R4）：同 R2，但 `id` 为 `randomUUID()`；前置已确认无 `backups/application/`（备份清单绑定旧 rootId，见 `desktop/core/application-backup-inventory.ts`）。
- `resume-init`（R3）：**不写任何文件**。执行器为空操作，效果来自放行正常 `launch()` + §2.7 的 resolve() 容忍改动（worker `Workspaces.initialize` 续跑 initializing → ready，`workspaces.ts:109-115`）。

### 2.5 重置执行器 `executeStartupReset(paths, guards): Promise<void>`

异步、冷态，由恢复对话框在用户二次确认后调用：

1. 每次操作前 `guards.assertLock()` + 复核 bootstrap 身份；每条删除前调 `guards.hooks?.beforeRemove?.(name)`（测试注入点，SR-U-64/68 用其确定性注入崩溃/占用）。
2. **目标根防呆**：`paths.recoveryRoot` 必须 `isAbsolute`、`samePath`（§2.3）校验等于调用方计算的恢复目标根（§1.1，含隔离模式处理）、存在时非符号链接。任何不符 → 抛错，绝不执行删除。
3. 清空默认根内容。**先删有效性标志文件**（家族 marker、`catalog.json`、`inbox/database/PG_VERSION`），再逐条删除其余直接子项（`fs.rm(entry,{recursive:true,force:true})`，rm 不跟随符号链接；符号链接子项只删链接自身）。这样重置中途崩溃的残留必定分类为 dialog/auto-init，而不会被 R2「修复」成半删状态静默启动（审核修订）。目录不存在则 `mkdir(recursive, 0o700)`。完成后同步目录。
4. 清除 bootstrap 控制/历史文件，名单（与 `legacy-recovery-preflight.ts:20` 及 preflight 同口径，审核修订——漏删 legacy 恢复控制文件会让重置后的重启撞 `assertNoLegacyBackupRecovery` 错误框，形成新死局）：
   - `data-root.json`
   - `root-migration.json`、`root-migration-request.json`
   - `root-relocation-*`
   - 匹配 `^(?:\.?application-recovery-|\.?application-restore-|\.?desktop-recovery-layout-)` 的全部条目
   - 匹配项为目录形态时同样递归删除（合法收据恒为文件；目录形态即外部污染，拒绝删除会造成永远重试失败的软死局）。其余内容（`session/`、Chromium `Local State`/`GPUCache*`、`data-root.corrupt-*` 留证等）一律不动。
5. 顺序：先清默认根、后清 bootstrap。崩溃收敛：若清根后崩，指针悬空指向空根 → 下次启动分类为 auto-init 自动完成；若 bootstrap 残留历史 → relocation blocked → 重置出口重试，幂等收敛。
6. 任一步失败抛 `StartupRecoveryError('RESET_FAILED')`；调用方展示重试。不伪造成功。

### 2.6 重新选择

修复/自动初始化成功后，调用方重新执行 `selectBrandStartupPaths`（纯函数）取得干净路径，再走既有闸门。**重选结果的 bootstrap 与 encryptionFamily 必须与原 `startupPaths` 一致**（userData 已在模块加载期固定不可换）；若重选切到另一家族（如摘除 legacy 悬空指针后循环命中健康的 `~/.shakeink`）→ 转恢复对话框而非继续，避免把 current 根的指针写进 legacy bootstrap（审核修订）。重新选择失败或 preflight 仍非 none → 转恢复对话框（不循环修复，单次启动只修一轮）。

### 2.7 既有模块的两处小修订（审核修订）

1. **`desktop/main/brand-startup-paths.ts`：全部抛出点携带家族感知 `recoveryPaths`**。现状 `BRAND_DEFAULT_INVALID`（`:68`）无 recoveryPaths、`:65` 的品牌读取裸错误直接外抛，导致模块加载期兜底只能硬编码 current 家族，legacy 根（`~/.xuanxiang`）损坏会被误分类为 current → 静默弃置 legacy 数据。修订：`:68` 抛出时携带 `{bootstrap: boot, defaultRoot: root, encryptionFamily: names.family}`；`:65` 的读取错误包装为带同样 recoveryPaths 的 `BrandStartupPathError('BRAND_DEFAULT_INVALID')`。`BRAND_BOOTSTRAP_CONFLICT` 维持无 recoveryPaths（致命，不进恢复流程）。
2. **`desktop/core/data-root.ts` `resolve()` 容忍无指针的 initializing 标记**（R3 依赖）。现状 `:181-190` 对非空默认根一律要求 `marker.phase==='ready'`，使 `Workspaces.initialize` 已实现的 initializing 续跑路径（`workspaces.ts:109-115`）永远不可达。修订：仅在 `resolve()` 的无指针分支容忍 `phase==='initializing'`（仍要求品牌观察通过、家族相符），返回 `needs-initialize`；`validatePointer`（`:152-162`，有指针路径）保持严格要求 ready 不变。安全论证：无指针即从未完成 adopt，initializing 标记只可能是上次初始化中断的残留，目录内不可能存在用户数据（ready 之前 worker 不会开放任何写入）。

## 3. relocation 链路扩展

### 3.1 `desktop/shared/root-relocation.ts`

- `RootRelocationPhase` 增加：`'reset-confirm' | 'resetting' | 'reset-failed'`。
- `RootRelocationNotice` 增加：`'reset-complete' | 'reset-failed'`。
- `RootRelocationCommand` 增加：`'reset' | 'reset-confirm' | 'reset-back'`。
- `RootRelocationState` 增加：`canReset: boolean`、`defaultPath: string | null`（重置警示中展示的清空目标=家族默认根）。

### 3.2 `desktop/main/root-relocation-controller.ts`

- options 增加：`wipe?(): Promise<void>`（由窗口注入 `executeStartupReset`）；`defaultPath?: string`。构造时 `canReset=!!options.wipe`，初始状态带 `canReset` 与 `defaultPath`。
- `canReset` 在 `unavailable` / `cancelled` / `blocked` 相位为 true（publish 处统一维护）；`checking/picking/confirming/writing/complete/resetting` 为 false。
- **ticket/flight 纪律（审核修订，防与在途 choose 并发）**：`reset(owner)` 与 `resetConfirm(owner)` 必须像 `cancel()`（现有 `:110-114`）一样先 `++this.ticket` 使在途 choose/confirm 失效，并 `await Promise.allSettled([this.workFlight, this.choiceFlight])` + `this.core.flush()` 排空（`core.cancel` 会写 bootstrap 日志，wipe 不得与其并发）；新增 `resetFlight` 去重，wipe 全程 `guard(owner, ticket)` 贯穿。渲染端伪造命令绕过按钮禁用也必须被相位+flight 校验拒绝。
- `reset(owner)`：守卫 + 当前相位可重置校验 + 排空在途；记录 `returnView={phase,notice,canChoose}`；发布 `{phase:'reset-confirm', notice:null, canChoose:false, canCancel:false, canReset:false}`。
- `resetBack(owner)`：仅从 `reset-confirm` 返回 `returnView`。
- `resetConfirm(owner)`：仅从 `reset-confirm`/`reset-failed` 进入；发布 `{phase:'resetting'}` → `await options.wipe()`（失败 → `{phase:'reset-failed', notice:'reset-failed'}` 并抛 `RESET_FAILED`）→ 成功发布 `{phase:'complete', notice:'reset-complete', canChoose:false, canCancel:false, canRestart:true}` → 随即自动执行重启退出（见下）。
- `restart(owner)`：若当前为 `complete + notice==='reset-complete'`（无 relocation outcome），直接走可信重启闭包（跳过 `inspectRootRelocation` 收据校验——重置没有迁移收据，新进程启动自我验证）；否则保持现有逻辑。自动重启失败时停留在 complete 相位，用户可点「重新打开应用」重试。
- **resetting 相位的关闭语义（审核修订）**：用户在 wipe 进行中点关闭时，`quit` 不得立即 `app.quit()` 截断 `fs.rm`；登记 pendingQuit，待 wipe flight 落定（成功走自动重启；失败落 `reset-failed`）后再执行退出。崩溃收敛由 §2.5-5 兜底。
- 所有新路径同样过 `host()/guard()` 锁与冷态断言；wipe 执行期间 `exiting/leaving` 语义与现有退出路径一致。

### 3.3 `desktop/main/root-relocation-window.ts`

- 构造 controller 时注入 `wipe: () => executeStartupReset({bootstrap, recoveryRoot}, {assertLock})` 与 `defaultPath: recoveryRoot`。`recoveryRoot` 由调用方按 §1.1 计算并传入（index.ts 已知家族与隔离模式）。
- IPC 命令白名单增加 `reset/reset-confirm/reset-back`。
- **notice 按 preflight code 分派**（审核修订，替代 `:51` 的硬编码 `pointer-invalid`）：`POINTER_REQUIRED` → `history-needs-recovery`（无指针但有迁移/恢复历史，重置将永久删除迁移日志与回滚能力，警示需区分）；`ROOT_MARKER_INVALID`/`POINTER_INVALID`/`CONTROL_UNSAFE` → `pointer-invalid`（新文案）；其余 → `pointer-invalid`。
- 窗口标题随相位/notice 切换：reset 组相位、或 blocked 且 notice 非 `history-needs-recovery` → `数据目录恢复 · 玄印写作`；其余 → `定位原数据目录 · 玄印写作`（`BrowserWindow.setTitle`）。
- **新增导出 `launchStartupRecovery(bootstrap, input:{recoveryRoot:string; sourcePath:string|null; notice?:RootRelocationNotice})`**：与 `launchRootRelocation` 共用开窗脚手架（隔离 session、可信 IPC、菜单、窗控），差异：不要求 preflight `mode!=='none'`，controller 以 `mode:'blocked'` 构造并注入 wipe/defaultPath。用于：分类器 dialog 分支（P3）与 worker 启动失败（P5）。

### 3.4 `src/components/desktop/RootRelocationScreen.tsx`

按批准设计稿（`design/startup-recovery/flow.html` 场景 02–07）实现：

- `blocked` 相位：h1 按 notice 分派——`history-needs-recovery` 保持「定位原数据目录」（其文案为迁移记录检查，与「无法修复」语义不同，审核修订）；其余 notice → 「无法修复数据目录」。`pointer-invalid` 文案更新为「数据目录中的文件丢失或损坏，无法自动修复。可以退出应用保留现状，或重置配置数据后重新开始。」；`history-needs-recovery` 保留原文案。按钮 `[重置配置数据][退出应用]`。
- `unavailable`/`cancelled`：保留定位按钮与文案，notice 追加「若原目录已无法找回，可以重置配置数据，从默认目录重新开始。」；按钮 `[定位原数据目录][重置配置数据][退出应用]`。
- `reset-confirm`：红色警示区（文案见产品文档 §5，路径取 `state.defaultPath`），按钮 `[确认清空并重置(destructive)][返回]`。两个补充文案（审核修订）：
  - `state.sourcePath` 存在且 ≠ `defaultPath`（自定义目标场景）：追加「原数据目录（sourcePath）的内容不会被删除或改动。」
  - 进入重置前 notice 为 `history-needs-recovery`（在途迁移/恢复记录）：追加「迁移与恢复历史记录也将一并清除。」
- `resetting`：「正在重置数据目录…」，按钮禁用。
- `reset-failed`：「重置未完成，请关闭可能占用文件的程序后重试。」，按钮 `[重试][退出应用]`。
- `complete + reset-complete`：「重置完成，正在重新打开应用…」（保留「重新打开应用」兜底按钮）。
- `validState` 同步扩展新相位/命令/canReset/defaultPath 校验（canReset 耦合规则：仅 `unavailable/cancelled/blocked` 可为 true；defaultPath 走 pathValid 同款校验）。

## 4. 主进程接线 `desktop/main/index.ts`

### 4.1 模块加载期（64-74 行区域）

`selectBrandStartupPaths` 抛出时：
- `BrandStartupPathError` 且 `code==='BRAND_BOOTSTRAP_CONFLICT'` → 维持现状（`startupPaths=null` → 错误框）。
- 其它 → 经 §2.7-1 的修订后所有抛出点都带家族感知的 `recoveryPaths`，`startupPaths = error.recoveryPaths`；防御性兜底（非 BrandStartupPathError 的意外错误）才用 `{bootstrap: join(appData, CURRENT_NAMES.appIdentity), defaultRoot: join(home, '.shakeink'), encryptionFamily: 'current'}`。错误留存待 start() 分类。这样 legacy 根损坏不会被误分类到 current 家族（审核修订）。

### 4.2 start() 分类钩子（746-756 行区域，`assertNoLegacyBackupRecovery` 之后、relocation 闸门之前）

```
const recoveryRoot = isolatedRoot ? resolve(isolatedRoot) : join(homedir(), startupPaths.encryptionFamily === 'legacy' ? '.xuanxiang' : '.shakeink')   // §1.1
const classification = classifyStartupRecovery({bootstrap: bootstrapPath, recoveryRoot}, startupPaths.encryptionFamily)
```

- `auto-init` → 冷态摘除指针文件（复用 startup-recovery 模块内部的指针单项移除）→ 重跑 `selectBrandStartupPaths` 成功且 bootstrap/family 与现值一致（§2.6）→ 更新 `startupPaths` 并清空 `startupSelectionError` → 继续既有闸门（此时 preflight 为 none，正常 launch → 空根初始化 → 引导）。
- `repair` → `executeStartupRepair`（`resume-init` 为空操作）→ 重跑选择与 preflight，全净且家族一致 → 更新 `startupPaths`/清空 `startupSelectionError` → 继续；任何失败 → `launchStartupRecovery`。
- `dialog` → `return launchStartupRecovery(bootstrapPath, {recoveryRoot, sourcePath, notice:'pointer-invalid'})`（reason→notice 映射统一为 pointer-invalid 新文案；`history-needs-recovery` 场景由 relocation 闸门的 preflight code 分派，不经此分支）。
- `none` → **若 `startupSelectionError` 留存**（模块加载期失败但分类器判 none，如内容损坏已超出本功能范围之外的健康场景）：重跑 `selectBrandStartupPaths`，成功则更新 `startupPaths` 并清空错误、继续；失败则 `return launchStartupRecovery(...)`。否则既有闸门原样（relocation → maintenance → lease → launch）。（审核修订：原方案 none 分支未处理留存错误，会在 `launch():211` 的 `startupSelectionError` 检查处撞死局。）

家族默认根：`startupPaths.encryptionFamily==='legacy' ? join(home,'.xuanxiang') : join(home,'.shakeink')`。

### 4.3 worker 启动失败路由（758-766 行 `failed()`）

- **路由用显式变量而非消息匹配**（审核修订）：`launch()` 内 `waitRootStartup` 非 ready 时把 code 记入模块变量 `failedRootCode` 再抛错；`failed()` 仅当 `failedRootCode` 非空时走恢复对话框，避免名单内消息（如 `SOURCE_NOT_CLOSED` 也可能来自窗口冷态断言）误吸。
- **开窗前统一终止 worker**（审核修订）：现状仅 `ROOT_INITIALIZATION_FAILED` 分支终止 worker；`ROOT_STARTUP_TIMEOUT` 时 worker 可能仍在真实写盘（PGlite 初始化），不终止就允许重置 = 删除活跃写入中的数据库。修订：凡 `failedRootCode` 路由，若 `worker` 存在且未退出，一律 `await worker.terminate()` 并确认 `ordinaryWorkerExited`（复用 759-761 行纪律），确认失败 → 错误框退回。
- 终止后 `launchStartupRecovery(bootstrapPath, {recoveryRoot, sourcePath: startupPaths.defaultRoot})` 替代 `showErrorBox`；开窗本身失败才退回错误框 + `app.exit(1)`。
- 冷态断言兼容性已核对：worker 失败抛于 `index.ts:216`，先于 `:218` 的 `app.setPath('sessionData', …)`，sessionData 仍为 bootstrap 下默认值，恢复窗口脚手架的 `assertCold`（`root-relocation-window.ts:27-31`）等值比较通过。
- `LEGACY_BACKUP_RECOVERY*`、锁错误、窗口自身错误等维持错误框，不形成开窗循环。**书面决定**：legacy 备份恢复记录 pending 的场景维持错误框 + 人工处理（保护可恢复证据），这是约束 3 的唯一保留例外，理由是重置会永久销毁恢复证据链；该场景在重置名单中已覆盖（§2.5-4），保证经重置出口重启后不会绕回此错误框。

## 5. 安全不变量核对

1. 分类/修复/重置全部发生在：单实例锁持有后、worker 未启动、未建业务 session（恢复窗口用隔离 session）。
2. 写入范围白名单：`recoveryRoot`（§1.1）内容、bootstrap 控制/历史文件（§2.5-4 名单）、（修复时）marker 文件与指针隔离改名。自定义目标目录、作品目录永不写入；隔离测试模式下目标为隔离根，绝不触碰真实 `~/.shakeink`。
3. 所有路径 lstat+realpath 复核、拒符号链接；写用 atomicWrite；读用 observeRootAuthority。
4. 重置必须先清空默认根（且先删有效性标志文件）再清 bootstrap，保证崩溃后收敛（§2.5-5）。
5. R2 仅在目录 device/inode 与指针一致时重写 marker——等价于「同一物理目录补发标记」，不采纳外来副本。
6. 界面状态全部走既有可信 IPC 模式；命令为枚举，渲染端不传路径；重置命令经 ticket/flight 排空在途操作。
7. 日志不记录真实用户数据；测试全部用隔离临时目录。
8. R3（resolve 容忍 initializing）仅限无指针分支；有指针路径的 marker 校验保持严格。

## 6. 文件变更清单

| 文件 | 变更 |
|---|---|
| `desktop/main/startup-recovery.ts` | 新增：分类器、修复执行器、重置执行器 |
| `desktop/main/brand-startup-paths.ts` | §2.7-1：抛出点携带家族感知 recoveryPaths |
| `desktop/core/data-root.ts` | §2.7-2：resolve() 无指针分支容忍 initializing |
| `desktop/shared/root-relocation.ts` | 相位/通知/命令/状态扩展 |
| `desktop/main/root-relocation-controller.ts` | 重置状态机 + wipe 注入 + ticket/flight 纪律 |
| `desktop/main/root-relocation-window.ts` | wipe/defaultPath 注入、notice 分派、标题切换、命令白名单、`launchStartupRecovery` |
| `desktop/main/index.ts` | 加载期兜底、start() 分类钩子、failed() 路由（failedRootCode + 统一 worker 终止） |
| `src/components/desktop/RootRelocationScreen.tsx` | 新相位视图与文案（按批准设计稿） |
| 测试 | 见 §7 全量清单 |
| 文档/台账 | 本方案、测试用例文档、`docs/requirements-traceability.json`、`design/startup-recovery/approval-v1.json` |

## 7. 测试策略与既有测试冲击清单（审核修订后全量）

详见测试用例文档。新增/更新：

- 新增单测 `tests/unit/startup-recovery.test.ts`：分类器全分支矩阵（临时目录构造 bootstrap/根组合）、修复执行成功与守卫拒绝、重置执行（只清名单内、先删标志文件的崩溃收敛、幂等、防呆拒绝非默认路径/符号链接、目录形态污染项递归删除）。
- 新增 controller 重置相位机单测：reset 相位流转、ticket 排空在途 choose、resetting 中关闭延迟、reset-complete 重启分支。
- 扩展 `tests/browser/root-relocation-screen.test.ts`：新相位视图、按钮集合、命令序列、二次确认、重试；更新旧文案断言（`:47`）与按钮计数断言（`:91`）。
- 更新 `tests/browser/root-relocation-routing.test.ts`（`:11` state 字面量新字段、`:16` blocked h1 断言）。
- 更新 `tests/unit/root-relocation-entry.test.ts`（RE33-04/13 语义）、`tests/unit/root-relocation-100-review.test.ts` 与 `tests/unit/root-relocation-window.test.ts`（Window mock 补 `setTitle`）。
- 更新 index.ts 末语句源码抽取 harness：`tests/unit/root-relocation-main.test.ts`、`tests/unit/backup-removal-root-independent-review.test.ts`、`tests/unit/inbox-lease-startup-116-review.test.ts`、`tests/unit/root-maintenance-window-review.test.ts`（补新依赖标识符与 trace 期望）。
- 集成 `tests/integration/root-startup.test.ts` 模式扩展：隔离根冷启动验证 auto-init/R1/R2/R4/重置后全新初始化。
- 确认不受影响：`tests/unit/brand-startup-paths.test.ts`（selector 主逻辑不改，仅抛出点字段）、`tests/packaging/*`、`scripts/smoke-root-relocation.mjs`（lost 相位标题/按钮不变）。
- 真实验证：`npm test`、`npm run test:core:evidence`、`npm run typecheck`、浏览器测试、`scripts/smoke-root-relocation.mjs` 冒烟、隔离根真实 Electron 启动（缺失/损坏/重置三场景）、打包检查。

## 8. 审核记录

- 2026-10-11 独立子代理审核（plan 类）：结论「修改后通过」。阻断项 1（隔离测试根下分类/重置目标误指真实用户目录 → §1.1 recoveryRoot）；重要项 8（legacy 误分类 → §2.7-1/§4.1；none 分支留存错误死局 → §4.2；R3 缺失 → resume-init + §2.7-2；none 缺家族一致性 → §2.2；无指针分支符号链接枚举 → §2.2；reset 与在途 flight 并发 → §3.2 ticket/flight 纪律；TIMEOUT worker 未终止即重置 → §4.3 统一终止；legacy 恢复文件名漏删 → §2.5-4）；建议项全部吸收（samePath、marker app 随家族、h1 按 notice 分派、自定义目标警示补充、重置中关闭延迟、§6/§7 测试清单全量化等）。
