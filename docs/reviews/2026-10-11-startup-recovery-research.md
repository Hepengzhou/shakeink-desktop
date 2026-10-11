# 启动配置目录丢失/损坏修复 · 调研

日期：2026-10-11
问题来源：用户截图 —— 启动后只显示「定位原数据目录」窗口，提示「数据目录记录无法验证，请保留原文件并联系维护者」，唯一按钮是「退出应用」，应用永远无法使用。

## 1. 截图死局的代码根源

三重叠加导致只剩「退出应用」：

1. `desktop/main/brand-startup-paths.ts:45-59`：bootstrap 目录存在权威记录（`data-root.json`），但指针校验失败（数据根标记缺失/损坏）→ 抛 `BrandStartupPathError("BRAND_POINTER_INVALID", recoveryPaths)`，启动以恢复路径继续。
2. `desktop/main/index.ts:748-749` → `desktop/main/root-relocation-preflight.ts:31-38`：指针可解析、数据根目录仍存在但 marker 校验失败 → `mode='blocked'`（code `ROOT_MARKER_INVALID`）→ `launchRootRelocation`。
3. `desktop/main/root-relocation-window.ts:51` + `desktop/main/root-relocation-controller.ts:40,61,69`：窗口硬编码 `notice:'pointer-invalid'`；blocked 模式 `recoverable=false` → `canChoose=false`。
4. `src/components/desktop/RootRelocationScreen.tsx:87-90`：只在 `canChoose` 时渲染「定位原数据目录」按钮，`canRestart=false` 时渲染「退出应用」→ 界面上只剩退出。

截图中 `sourcePath` 显示为 `C:\Users\Administrator\.xaanink`，说明指针本身可解析、目录存在但标记文件无效 —— 即「目录在、文件丢」场景。

## 2. 两个目录与启动链路

### 2.1 目录职责

| 目录 | 位置 | 内容 |
|---|---|---|
| bootstrap（控制目录） | `%APPDATA%\XaanInk`（即 Electron userData，`desktop/main/brand-startup-paths.ts:38`、`desktop/main/index.ts:68-73`） | `data-root.json` 指针、`root-migration.json`、`root-migration-request.json`、`root-relocation-*`、`application-restore-*` 历史记录 |
| 数据根（用户所称「配置文件目录」） | `C:\Users\<用户>\.xaanink`（`brand-startup-paths.ts:44,72`） | `xaanink-app.json` 应用标记、`catalog.json` 作品索引、`state.json` 设置/模型/引导进度、`drafts.json` 草稿日志、`inbox/`（含 PGlite 数据库 `inbox/database/`）、`session/`、`assets/global/`、`backups/application/` |

注意：**作品本体不存放在数据根内**，每部作品是用户指定的独立外部目录，数据根只用 `catalog.json` 记录其绝对路径与身份（`desktop/service/workspaces.ts:27-29,335-339`）。

### 2.2 启动链路（现状）

1. 模块加载期同步执行 `selectBrandStartupPaths({appData, home, isolatedRoot})`（`desktop/main/index.ts:64-65`）：
   - bootstrap 有权威记录 → 校验指针与数据根标记；失败抛 `BRAND_POINTER_INVALID`（带恢复路径）。
   - 无权威记录 → 依次看 `~/.xuanxiang`、`~/.xaanink`：存在且非空但标记非法（含 `phase!=="ready"`）→ 抛 `BRAND_DEFAULT_INVALID`，**无恢复路径** → `index.ts:741-743` 弹错误框退出（死局之二）。
   - 空目录被跳过（`brand-startup-paths.ts:64`），视为可初始化。
2. `start()` 三道闸门（`index.ts:746-756`）：`rootRelocationPreflight` → `rootMaintenanceRequired` → `inboxLeaseRecoveryRequired` → `launch()`。
3. `launch()`（`index.ts:208-216`）：创建 service worker，`waitRootStartup` 45s 屏障等待 `desktop/service/index.ts:40` 的 `startOwnedRoot`：
   - `DataRootManager.resolve()`（`desktop/core/data-root.ts:168-193`）：有指针 → 校验标记 → `existing`；无指针无历史 → 数据根缺失/为空 → `needs-initialize`；数据根非空 → 标记必须 ready。
   - `needs-initialize` → `Workspaces.initialize()`（`desktop/service/workspaces.ts:94-119`）：建目录 → 独占写 marker（`initializing`）→ 建 `catalog.json` 与 `inbox/` → marker 原子改写 `ready`；随后首次打开 inbox 时建 PGlite 库并把 `inboxReady` 置 true（`workspaces.ts:314-333`）→ `manager.adopt()` 写指针（`data-root.ts:194-222`）。
4. worker 启动失败（`ROOT_STARTUP_FAILED` / `ROOT_INITIALIZATION_FAILED` 等）→ `index.ts:758-766` `failed()`：弹「玄印写作无法启动」错误框 + `app.exit(1)`（死局之三）。

### 2.3 新人引导触发

`state.json` 的 `onboarding` 字段默认为 `null`（`desktop/core/settings.ts:28-34,49`）；渲染端每次启动挂 `OnboardingController`（`src/components/desktop/DesktopApp.tsx:48,183`），`mode:'auto'` 时 `onboardingStartup` 判定 `!progress?.completed` → 进入完整引导（`src/lib/desktop/onboarding-flow.ts:4-8`）。**因此只要能让初始化走到 `launch()` 并成功打开工作台，新人引导会自动出现**，无需额外触发逻辑。

## 3. 现状行为矩阵（死局清单）

| # | 场景 | 现状行为 | 死局？ |
|---|---|---|---|
| A1 | `~/.xaanink` 不存在，bootstrap 无记录 | 正常初始化，进引导 | 否 |
| A2 | `~/.xaanink` 不存在，指针悬空指向它 | relocation `lost` 模式：可「定位原数据目录」，但数据已丢、无目录可定位 | **事实死局** |
| A3 | `~/.xaanink` 为空目录，无指针 | 正常初始化（空目录被跳过） | 否 |
| A4 | `~/.xaanink` 为空，指针悬空 | `ROOT_MARKER_INVALID` → blocked | **死局** |
| B1 | marker 丢失/损坏，指针完好、其余文件完好（截图场景） | blocked + pointer-invalid | **死局** |
| B2 | marker `phase=initializing`（上次初始化中断），id 与指针一致 | 有指针 → blocked；无指针 → `BRAND_DEFAULT_INVALID` 错误框。其实 worker 的 `Workspaces.initialize` 本就支持续跑（`workspaces.ts:109-115`） | **死局** |
| B3 | `catalog.json` 丢失/损坏，marker 完好 | preflight 不查 catalog → worker 初始化失败 → 错误框 | **死局** |
| B4 | `inbox/database` 丢失（`inboxReady=true`） | 「全局收件箱数据库缺失，不能自动重建」（`workspaces.ts:319-321`）→ worker 失败 → 错误框 | **死局** |
| B5 | `state.json` 丢失 | `VersionedStore.readDisk` 对 ENOENT 返回默认值，正常启动（设置回顾默认，引导重新出现） | 否 |
| B6 | bootstrap 整体丢失（如漫游配置被清），数据根完好 | resolve 无指针 → 数据根标记 ready → `adopt()` 重写指针自愈 | 否 |
| B7 | `data-root.json` 指针损坏，数据根完好 | `POINTER_INVALID` → blocked | **死局** |
| B8 | 指针与 marker 都丢失/损坏 | blocked | **死局** |
| C1 | 自定义数据根丢失/被替换（inode 变化且非空） | relocation `lost`：只接受原物理目录，恢复副本不被接受 | **事实死局** |
| C2 | 双品牌 bootstrap 冲突（`BRAND_BOOTSTRAP_CONFLICT`） | 错误框退出 | **死局**（本任务外，见 §6） |
| C3 | 迁移日志/请求残留 | maintenance / worker `recover()` 流程 | 否（已有专用窗口） |

## 4. 可修复性分析

「修复」的定义边界：只重建**丢失的链接/标记**，不改动幸存的用户数据；修复后必须能通过现有全部启动校验（`selectBrandStartupPaths` + `rootRelocationPreflight` + worker resolve）。

| 修复项 | 条件 | 动作 | 依据 |
|---|---|---|---|
| R1 指针重建 | `data-root.json` 损坏/无法解析，且数据根完整有效（marker ready + inboxReady、catalog 可读、inbox DB 在） | 隔离损坏指针（改名留证），正常启动时 worker `adopt()` 自愈 | B6 已证明 adopt 路径可靠 |
| R2 标记重建 | marker 缺失/无法解析，指针完好，且 `catalog.json` 可读、`inbox/` 与 `inbox/database` 存在 | 以 `pointer.rootId` 重写 `xaanink-app.json`（`phase:ready, inboxReady:true`） | 指针 schema `data-root.ts:77` 携带 rootId |
| R3 中断续跑 | marker `phase=initializing` 且 id 与指针一致 | 不放行 relocation，直接进入普通 `launch()`，由 `Workspaces.initialize` 续跑 | `workspaces.ts:109-115` |

以下一律**不可自动修复**，必须交给用户决策（对话框）：

- 指针与 marker 同时失效（B8）；
- `catalog.json` 损坏（B3）—— 作品索引是用户数据，重建空索引意味着静默丢失关联；
- `inbox/database` 缺失而 `inboxReady=true`（B4）—— 收件箱数据真实丢失；
- marker id 与指针 rootId 不一致、目录被替换（inode 变化且目录非空）—— 可能是外来副本，完整性模型明确禁止静默采纳；
- bootstrap 存在迁移/恢复记录（`root-migration*.json`、`root-relocation-*`、`application-restore-*`）—— 有在途迁移，数据可能在迁移目标侧；
- 指针目标为自定义目录（非默认 `~/.xaanink`）。

修复执行位置：主进程、冷态（单实例锁持有、worker 未启动、未建 session），复用 `desktop/core/brand-names.ts` 与 `desktop/core/root-ownership.ts` 的同步校验原语（lstat/realpath/符号链接拒绝/原子写）。

## 5. 重置语义分析

用户约束：选「重置配置数据」→ 清空原目录 → 重建并初始化 → 自动进入应用（从新人引导开始）。

实现要点：

1. **只清空默认数据根 `~/.xaanink` 的内容**（逐条删除目录内条目，保留目录壳或整体重建均可）；指针目标为自定义目录时，**绝不删除该自定义目录**，仅解除绑定。
2. **外科手术式清除 bootstrap 控制/历史文件**：`data-root.json`、`root-migration.json`、`root-migration-request.json`、`root-relocation-*`、`application-restore-*`。bootstrap 同时是 Electron userData，含浏览器运行文件，不能整目录删除。若只删指针而留历史记录，`hasHistory`（`brand-startup-paths.ts:17`）与 preflight（`root-relocation-preflight.ts:25-29`）会把启动判定为 blocked，因此历史记录必须一并清除。
3. 重置后 `app.relaunch()` + `app.quit()` 走全新进程（复用 relocation 的成熟模式，`root-relocation-window.ts:67`），新进程：无记录 → 数据根空 → 正常初始化 → `adopt` 写指针 → 工作台 → 引导自动出现。
4. 数据影响（对话框文案必须如实告知）：收件箱内容、设置与模型配置、草稿恢复日志、头像资产、应用备份包将丢失；作品文件在各自独立目录不受影响，但作品索引丢失，重置后需在应用内重新打开作品目录关联。
5. 重置操作的执行环境与 relocation 窗口相同：独立隔离 session、不启动业务 worker、不打开任何数据库（`root-relocation-window.ts:13-14,34-42`），全程冷态文件操作。

## 6. 范围边界

- `BRAND_BOOTSTRAP_CONFLICT`（legacy 玄香印 与 current 玄印 双权威记录）：涉及两个品牌的真实数据归属，重置会误伤 legacy 家族，保持现有错误框 + 人工处理，不在本任务范围。
- `XAANINK_TEST_ROOT` 隔离测试根：仅测试使用，不改变其行为。
- 本任务不恢复已被删除的用户数据，只保证「应用永远可以启动」。

## 7. 测试与证据约定（沿用）

- `npm test` = `node --import tsx --test tests/unit/*.test.ts tests/integration/*.test.ts`；证据落盘用 `npm run test:core:evidence`（TAP → `docs/evidence/implementation-01/core-latest.tap`）。
- 相关现有测试：`tests/unit/brand-startup-paths.test.ts`、`tests/unit/root-startup*.test.ts`、`tests/unit/root-relocation*.test.ts`、`tests/browser/root-relocation-screen.test.ts` 等；浏览器测试用 playwright-core + 系统 Chromium + esbuild 内联打包真实组件。
- 设计稿约定：`design/<专题>/index.html`（审核壳）+ `flow.html`（界面稿）+ `preview.css` + `capture-preview.mjs`（截图与断言，只查 HTML 不启动应用），参考 `design/onboarding/`。
- 文档约定：特性级调研/产品/评审文档放 `docs/reviews/YYYY-MM-DD-<主题>-<类型>.md`。

## 8. 结论

死局的本质是：启动链路把「数据根损坏」全部路由到「定位原物理目录」这一个出口，而该出口在数据已真实丢失时无解。修复方向（详见产品文档）：

1. 指针悬空指向**默认**数据根且目录缺失/为空 → 静默解除绑定，走正常初始化（自动进引导）；
2. 默认根「链接级」损坏（R1/R2/R3）→ 主进程冷态自动修复后直接启动；
3. 其余一切不可启动状态（含 worker 启动失败、自定义根丢失的既有窗口）→ 统一提供「退出 / 重置配置数据」出口，重置 = 清默认根 + 清 bootstrap 控制文件 + 自动重启到全新初始化。
