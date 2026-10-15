# 启动配置目录丢失/损坏修复 · 测试用例

日期：2026-10-11（经独立审核修订）
依据：`docs/reviews/2026-10-11-startup-recovery-technical-design.md`（已审核修订）
编号：SR-<层>-<序号>（U=单测，I=集成，B=浏览器，R=真实系统）

## 0. 测试基础设施约定

- fixture：`mkdtemp` + `realpath` + `directoryIdentity(root)` 构造真实 device/inode（参照 `tests/unit/brand-startup-paths.test.ts:13-23`）；`pointer(root)` 辅助读真实 lstat 生成合法指针；普通 `writeFile` 产出的文件天然满足 `observeRootAuthority` 的 nlink=1/大小上限要求。
- **注入点（审核修订，写死约定）**：执行器 `guards` 含可选 `hooks: { beforeRename?(): void; beforeRemove?(name: string): void }`。`beforeRename` 在 `atomicWrite` 的复核前调用（SR-U-44/45 注入「执行中替换」）；`beforeRemove` 在每条删除前调用（SR-U-64/66/68 注入「崩溃/占用」）。 hooks 永不来自渲染端。
- 执行器均为异步：断言一律 `assert.rejects`（失败路径）/`await` 后断言（成功路径）。
- 浏览器测试复用 `tests/browser/root-relocation-screen.test.ts:14-35` 的 esbuild 内联打包 + 受控 bridge 模式；bridge 为唯一模拟点，组件为真实 React 组件。

## 1. 单测：`classifyStartupRecovery` 分类矩阵（`tests/unit/startup-recovery.test.ts`）

| ID | 场景构造 | 期望 |
|---|---|---|
| SR-U-01 | bootstrap 不存在 | none |
| SR-U-02 | bootstrap 空 | none |
| SR-U-02b | bootstrap 为符号链接/realpath 不符 | none（交既有错误路径，不修复） |
| SR-U-03 | 指针完好 + 根完好（marker ready+inboxReady+id 一致） | none |
| SR-U-04 | bootstrap 含 `root-migration.json` + 指针悬空指向默认根（根缺失） | none（历史优先，走既有流程） |
| SR-U-05 | bootstrap 含 `root-relocation-<uuid>.json` + 根缺失 | none |
| SR-U-05b | bootstrap 含 `root-migration-request.json` / `application-restore-<uuid>.json`（两个子场景） | none |
| SR-U-06 | 指针指向自定义路径（非 recoveryRoot） | none |
| SR-U-07 | 指针完好指向默认根 + 根缺失 | auto-init |
| SR-U-08 | 指针完好指向默认根 + 根为空目录（inode 匹配） | auto-init |
| SR-U-09 | 指针完好指向默认根 + 根为空目录（inode 不匹配，即被重建的空目录） | auto-init |
| SR-U-10 | 指针完好 + 根非空 + inode 不匹配（外来副本） | dialog/root-mismatch |
| SR-U-11 | 指针完好 + 根为符号链接/realpath 不符 | dialog/root-mismatch，且不产生任何写入 |
| SR-U-12 | 指针完好 + 身份一致 + marker 缺失 + catalog/inbox/database 齐全 | repair/marker |
| SR-U-13 | 指针完好 + 身份一致 + marker 非法 JSON + 内容齐全 | repair/marker |
| SR-U-13b | 指针完好 + 身份一致 + marker 为合法 JSON 但 schema 不符（缺 inboxReady/多字段/app 值错） | repair/marker（钉死分桶：schema 失败=无法解析，方案 §2.3） |
| SR-U-14 | 指针完好 + 身份一致 + marker 缺失 + catalog.json 缺失 | dialog/content-damaged |
| SR-U-14b | 指针完好 + 身份一致 + marker 缺失 + catalog.json 为目录/符号链接 | dialog/content-damaged |
| SR-U-15 | 指针完好 + 身份一致 + marker 缺失 + inbox/database 缺失 | dialog/content-damaged |
| SR-U-15b | 指针完好 + 身份一致 + marker 缺失 + inbox 缺失或为符号链接 | dialog/content-damaged |
| SR-U-16 | 指针完好 + 身份一致 + marker schema 通过但 id 不符 | dialog/root-mismatch |
| SR-U-17 | 指针完好 + 身份一致 + marker phase=initializing | dialog/root-mismatch（有指针不可能合法 initializing） |
| SR-U-18 | 指针完好 + 身份一致 + marker ready 但 inboxReady=false | repair/pointer（摘除指针走自愈） |
| SR-U-19 | 指针损坏（非法 JSON）+ 根完整有效 | repair/pointer |
| SR-U-20 | 指针损坏 + 根也损坏（marker 缺失） | dialog/pointer-invalid |
| SR-U-21 | 无指针 + 根缺失 | none |
| SR-U-22 | 无指针 + 根为空 | none |
| SR-U-22b | 无指针 + 根为普通文件（非目录） | dialog/root-mismatch |
| SR-U-23 | 无指针 + 根非空 + marker 完全有效（ready，家族相符） | none（adopt 自愈） |
| SR-U-24 | 无指针 + marker 为另一家族（`~/.shakeink` 内 `xuanxiang-app.json` ready） | dialog/root-mismatch |
| SR-U-25 | 无指针 + marker phase=initializing 且家族相符 | repair/resume-init |
| SR-U-26 | 无指针 + marker 缺失 + catalog/inbox/database 齐全 + 无 backups/application | repair/marker-new-id |
| SR-U-27 | 无指针 + marker 缺失 + 存在 `backups/application/` | dialog/default-invalid |
| SR-U-27b | 无指针 + marker 缺失 + `backups/application` 为文件形态 | dialog/default-invalid |
| SR-U-28 | 无指针 + marker 缺失 + catalog 缺失 | dialog/default-invalid |
| SR-U-29 | 无指针 + 根为符号链接 | dialog/root-mismatch，不写入 |
| SR-U-30 | legacy 家族（family='legacy'，recoveryRoot=`~/.xuanxiang`）指针悬空 + 根缺失 | auto-init（legacy 文件名/路径口径） |
| SR-U-31 | 纯读性：auto-init/dialog/none 各分支执行后 readdir+字节比对 fixture 不变 | 分类全程不写 |
| SR-U-33 | （win32 门控）指针 root.path 为 recoveryRoot 的大写变体 | 判定为默认根继续检查（samePath 忽略大小写），不误判 none；POSIX 语义相反，用例内注明 |

## 2. 单测：`executeStartupRepair`

| ID | 场景 | 期望 |
|---|---|---|
| SR-U-40 | R1：损坏指针 → 执行 | `data-root.json` 消失，`data-root.corrupt-*.json` 留证字节等于原损坏内容；重跑 classify → none |
| SR-U-41 | R2：marker 缺失 + 指针完好 → 执行 | marker 写入 `{id=pointer.rootId, phase:'ready', inboxReady:true, app 随家族}`；`readApplicationBrandImmediately` 通过；重跑 classify → none |
| SR-U-42 | R2：存在同名坏 marker → 执行 | 坏文件被隔离为 `<marker>.corrupt-*`；新 marker 有效 |
| SR-U-43 | R4：无指针 + marker-new-id | marker 为新 uuid 且有效 |
| SR-U-43b | R4 反例：先建 `backups/application/` 再直接调执行器 | `assert.rejects`，无写入（执行器独立复核，不依赖分类器前置） |
| SR-U-44 | R2 执行中指针被替换（`hooks.beforeRename` 内改写 data-root.json） | `assert.rejects`；marker 不生效（原子写回滚） |
| SR-U-45 | 修复中根目录被替换（`hooks.beforeRename` 内换目录） | `assert.rejects` |
| SR-U-46 | resume-init | 不写任何文件（fixture 前后 readdir+字节一致） |
| SR-U-47 | legacy 家族 R2 | 写 `xuanxiang-app.json`，app 字段 `Xuanxiangxiezuo-Desktop` |
| SR-U-48 | 守卫：assertLock 抛错 | `assert.rejects`，无任何写入 |

## 3. 单测：`executeStartupReset`

| ID | 场景 | 期望 |
|---|---|---|
| SR-U-60 | 完整重置：根含 marker/catalog/state.json/inbox/database/assets，bootstrap 含指针+迁移日志+root-relocation-*+application-restore-*+session/+其它文件 | 根清空（目录保留）；bootstrap 仅剩 session/ 与非控制文件 |
| SR-U-61 | 根缺失 | 自动创建空目录；bootstrap 清理成功 |
| SR-U-62 | 幂等：重复执行第二次 | 成功；目录清单与字节逐项相等（不止「不抛错」） |
| SR-U-63 | 防呆：recoveryRoot 为相对路径/符号链接/与计算值不符 | `assert.rejects`，无任何删除 |
| SR-U-64 | 崩溃收敛：`hooks.beforeRemove` 在三个标志文件（marker、catalog.json、inbox/database/PG_VERSION）删除完成后、清余项前抛错 | 残留（无 marker/catalog/PG_VERSION，inbox/database 壳尚在）重跑 classify → dialog/content-damaged（不命中 repair/marker）；再次执行 reset 成功 |
| SR-U-65 | bootstrap 控制名为目录形态（外部污染 `root-relocation-x/`） | 递归删除成功，不误删相邻文件 |
| SR-U-66 | legacy 恢复控制名（`application-recovery-*`、`.application-restore-*`、`.desktop-recovery-layout-*`） | 一并清除 |
| SR-U-67 | 根内符号链接子项 | 只删链接不追目标（目标目录内容字节不变） |
| SR-U-68 | `hooks.beforeRemove` 注入删除失败（模拟 Windows 占用 EPERM） | `assert.rejects` RESET_FAILED；已删不回滚、未删保留（不伪造成功） |
| SR-U-69 | 每步前 assertLock；守卫抛错即失败 | 无部分写入 |
| SR-U-70 | **自定义目标存活**：bootstrap 指针指向存在的自定义目录（内有字节证据） | reset 后自定义目录字节不变、默认根被清空、bootstrap 控制文件清除 |

## 4. 单测：controller 重置相位机

| ID | 场景 | 期望 |
|---|---|---|
| SR-U-80 | blocked（注入 wipe）初始态 | canReset=true；reset 命令 → phase reset-confirm，canChoose/canCancel/canReset=false |
| SR-U-81 | reset-confirm → reset-back | 回到 blocked 原 notice/canChoose |
| SR-U-82 | reset-confirm → reset-confirm 命令 → wipe 成功 | phase resetting → complete + notice reset-complete + canRestart=true；随后自动调 restart 闭包 |
| SR-U-83 | wipe 失败 | phase reset-failed + notice reset-failed；再次 reset-confirm（重试）成功 → complete |
| SR-U-84 | 无 wipe 注入（纯 relocation 旧场景） | canReset=false，reset 命令 reject |
| SR-U-85 | unavailable/cancelled 相位 reset → reset-back | 返回原相位且 canChoose 恢复 true |
| SR-U-86 | picking 相位中伪造 reset 命令 | reject（相位校验），在途 choose 不受影响 |
| SR-U-86b | complete（非 reset-complete）相位伪造 reset；非 reset-confirm 相位伪造 reset-back | 均 reject |
| SR-U-87 | choose 在途（workFlight 未排空）时 reset | reset 先 ++ticket 使 choose 失效并排空后才执行 wipe（断言 wipe 调用晚于 core.cancel/flush） |
| SR-U-88 | resetting 中 quit | 不立即退出；wipe 落定后执行退出/自动重启 |
| SR-U-89 | complete+reset-complete 时 restart 命令 | 跳过 relocation 收据校验直接调 restart 闭包 |
| SR-U-90 | 非 reset-complete 的 complete 保持旧收据校验 | 既有行为不变 |

## 5. 单测：窗口与主进程接线（harness 更新 + 新增断言）

| ID | 场景 | 期望 |
|---|---|---|
| SR-U-100 | `launchStartupRecovery` 开窗（preflight mode 为 none 也允许） | controller 以 blocked+canReset 启动，标题「数据目录恢复 · 玄印写作」 |
| SR-U-101 | relocation 窗口 notice 分派：preflight code=POINTER_REQUIRED | controller notice=history-needs-recovery（h1 不变） |
| SR-U-102 | code=ROOT_MARKER_INVALID | notice=pointer-invalid，标题切换「数据目录恢复 · 玄印写作」 |
| SR-U-103 | IPC 白名单接受 reset/reset-confirm/reset-back，拒绝其它 | 非法命令 reject |
| SR-U-104 | start() 钩子：auto-init 分支摘除指针后重跑选择成功 | trace 含 classify→摘除→reselect→ordinary launch（index.ts 抽取 harness 更新） |
| SR-U-104b | start() 钩子：auto-init/修复执行失败 → 降级 | trace 到 launchStartupRecovery，不写半成品 |
| SR-U-105 | start() 钩子：dialog 分支 | trace 到 launchStartupRecovery，不开普通窗口 |
| SR-U-106 | failed()：failedRootCode=ROOT_STARTUP_TIMEOUT 且 worker 未退出 | 先 terminate + 等 exit，再开恢复窗；断言 sessionData 未被设为数据根；不开窗循环 |
| SR-U-106b | failed() 兜底：worker 已退出（无需 terminate）；terminate 失败；开窗本身失败 | 分别：直接开窗 / 退回错误框 / 错误框 + exit(1) |
| SR-U-107 | failed()：LEGACY_BACKUP_RECOVERY* / 锁错误；BRAND_BOOTSTRAP_CONFLICT（双权威 bootstrap） | 维持错误框，不开恢复窗 |
| SR-U-108 | 模块加载兜底：BRAND_DEFAULT_INVALID 携带 legacy recoveryPaths | start() 分类使用 legacy 家族根 |
| SR-U-109 | 重选家族切换拒绝：legacy bootstrap + 悬空指针 → 摘除 → 重选返回 current 家族 | 转 launchStartupRecovery，不写任何指针（§2.6） |
| SR-U-110 | none 分支 + 留存 startupSelectionError：模块加载期失败但分类判 none（外部已修复）→ 重跑成功 | 更新路径并清空错误，继续 ordinary launch；重跑失败 → launchStartupRecovery |

## 6. 集成测试（`tests/integration/` 扩展 root-startup 模式，esbuild 打包真实 worker，隔离临时根）

**两段式约定（审核修订）**：摘除/修复发生在主进程侧，worker 永不自愈悬空指针（证据：`tests/integration/root-startup.test.ts:118-131` ROOT11-03）。SR-I 用例统一两步：① 测试直接 import 并调用真实 `classifyStartupRecovery` / `executeStartupRepair` / `executeStartupReset`（`desktop/main/startup-recovery.ts` 不依赖 Electron）；② 再以 root-startup.test.ts 的 launch 辅助冷启动 esbuild worker 断言 ready。

| ID | 场景 | 期望 |
|---|---|---|
| SR-I-01 | ① bootstrap 含悬空指针（指向缺失的隔离根）→ classify=auto-init → 摘除指针；② 冷启动 worker | worker ready；根被初始化（marker/catalog/inbox/DB）；adopt 写回新指针；rootId=marker.id |
| SR-I-02 | ① 损坏指针 + 完好根 → classify=repair/pointer → 执行；② 冷启动 | worker ready；adopt 指针 rootId 与原 marker id 一致 |
| SR-I-03 | ① marker 缺失 + 指针完好 + 内容齐全 → repair/marker → 执行；② 冷启动 | worker ready；marker id 保持指针 rootId；inbox 可用（模板库查询成功） |
| SR-I-04 | ① 无指针 + marker 缺失 + 无 backups → repair/marker-new-id → 执行；② 冷启动 | worker ready；adopt 指针 rootId=新 marker id |
| SR-I-05 | ① initializing marker + catalog 缺失 → classify=repair/resume-init（不写文件）；② 冷启动 | worker ready；initialize 续跑建 catalog/inbox 并置 ready/inboxReady（依赖 §2.7-2 resolve 容忍） |
| SR-I-06 | ① 损坏场景 → executeStartupReset；② 冷启动 | 全新初始化成功；`state.json` 无 onboarding 进度（引导判定由 SR-B-10 覆盖） |
| SR-I-07 | catalog 损坏（marker/指针完好）不经修复直接冷启动 | worker 失败码 ROOT_STARTUP_FAILED 或 ROOT_INITIALIZATION_FAILED（证明该场景由 §4.3 对话框兜底） |

## 7. 浏览器测试（`tests/browser/root-relocation-screen.test.ts` 扩展 + 新增场景）

| ID | 场景 | 期望 |
|---|---|---|
| SR-B-01 | blocked + canReset | h1「无法修复数据目录」；新文案「数据目录中的文件丢失或损坏…」；按钮恰好 [重置配置数据][退出应用] |
| SR-B-02 | blocked + notice=history-needs-recovery | h1 保持「定位原数据目录」；旧文案；仍出现 [重置配置数据] |
| SR-B-03 | 重置二次确认：点「重置配置数据」 | 红色警示可见，含 defaultPath 与「不可撤销」；按钮 [确认清空并重置][返回] |
| SR-B-04 | 自定义目标（sourcePath≠defaultPath）确认页 | 警示追加「原数据目录…不会被删除或改动」 |
| SR-B-05 | history-needs-recovery 进确认页 | 警示追加「迁移与恢复历史记录也将一并清除」 |
| SR-B-06 | 确认 → wipe 挂起 | resetting：按钮禁用；退出/关闭命令被拒或延迟（controller 侧 SR-U-88 已覆盖，此处断言 UI 禁用态） |
| SR-B-07 | wipe 成功 | 「重置完成，正在重新打开应用…」；命令序列含 reset→reset-confirm |
| SR-B-08 | wipe 失败 | 「重置未完成…」；按钮 [重试][退出应用]；重试命令=reset-confirm |
| SR-B-09 | unavailable/cancelled 相位三按钮与返回流 | [定位原数据目录][重置配置数据][退出应用]；notice 追加「若原目录已无法找回…」文案断言；reset→back→回到原相位 |
| SR-B-10 | 引导判定回归：`onboardingStartup` 纯函数直测（`src/lib/desktop/onboarding-flow.ts`）——onboarding 进度 null | 返回 `{flow:'full'}` |
| SR-B-11 | validState 拒绝非法新字段（canReset 与相位不符、defaultPath 非法） | 渲染错误提示而非崩溃 |

## 8. 真实系统验证（Windows 为主目标）

复用 `scripts/smoke-root-relocation.mjs:21` 的 `_electron.launch` + `SHAKEINK_TEST_ROOT` 模式，新建 `scripts/smoke-startup-recovery.mjs`；证据（截图 + JSON 结果）按 AGENTS.md 落盘 `docs/evidence/startup-recovery/`。

| ID | 场景 | 步骤与期望 |
|---|---|---|
| SR-R-01 | 目录整体缺失 | 隔离根启动真实 Electron：正常进工作台并自动出现新人引导（截图）；隔离根下生成完整初始化文件 |
| SR-R-02 | marker 删除（指针完好） | 启动后自动修复进工作台；marker 复原且 id 不变（JSON 断言） |
| SR-R-03 | catalog 损坏（不可修复） | 出现恢复对话框（截图）；点「重置配置数据」→ 二次确认 → 自动重启 → 新人引导；原目录内容已清空 |
| SR-R-04 | 承接 SR-R-03 完成后二次启动 | 正常启动进工作台（引导状态按首次选择持久化） |
| SR-R-05 | 退出选项 | 对话框点「退出应用」→ 进程退出，目录内容字节不变 |
| SR-R-06 | 既有冒烟 `scripts/smoke-root-relocation.mjs` | 通过（lost 流程回归）。**注意该脚本 `:38` 硬断言 darwin，仅 macOS 开发机可跑；Windows 上不执行，以 SR-R-01~05 为真实验证主体** |
| SR-R-07 | 打包检查 `npm run package:check`（环境允许时） | 通过 |

## 9. 全量回归

- `npm test`（unit+integration 全绿）
- `npm run test:core:evidence`（TAP 证据落盘 `docs/evidence/`）。**注意 `scripts/test-core.mjs:12` 总超时 120s**：新增集成用例后若超时，同步调额或拆分，不得静默标绿。
- `npm run typecheck`
- 浏览器测试文件逐个运行全绿
- `node design/startup-recovery/capture-preview.mjs`：设计稿查看器自身回归（仅证明设计稿完好；实现与设计的一致性证据由 SR-B/SR-R 截图承担）
- `docs/requirements-traceability.json` 台账更新纳入回归检查项

## 10. 既有测试更新清单（审核核对后全量）

| 文件 | 更新点 |
|---|---|
| `tests/browser/root-relocation-screen.test.ts` | `:47` 旧文案断言、`:91` blocked 按钮计数、`:11-36` state 字面量新字段；新增 SR-B 场景 |
| `tests/browser/root-relocation-routing.test.ts` | `:11` state 字面量补 `canReset`/`defaultPath`；`:16` blocked h1 断言更新 |
| `tests/unit/root-relocation-entry.test.ts` | RE33-04（`:30`）/RE33-13（`:57`）语义更新（blocked 不再「只能退出」） |
| `tests/unit/root-relocation-window.test.ts`、 `tests/unit/root-relocation-100-review.test.ts`、 `tests/unit/root-relocation-navigation-100-review.test.ts` | Window mock 补 `setTitle`（后者条件性安全，防御性补齐） |
| `tests/unit/root-relocation-main.test.ts`、 `tests/unit/backup-removal-root-independent-review.test.ts`、 `tests/unit/inbox-lease-startup-116-review.test.ts`、 `tests/unit/root-maintenance-window-review.test.ts` | index.ts 末语句抽取 harness 补新标识符（classifyStartupRecovery/launchStartupRecovery/failedRootCode 等）与 trace 期望；其中 BR-IR01（`backup-removal-root-independent-review.test.ts:35-37`）fixture 恰为「无指针+非空根+无 marker」，新分类器判 dialog/default-invalid，**期望行为本身变化**，单独评审更新 |
| `docs/requirements-traceability.json` | 新增本功能需求-实现-用例映射 |

确认不受影响：`tests/unit/brand-startup-paths.test.ts`（只断言 throws 不断言字段）、`tests/packaging/*`、`scripts/smoke-root-relocation.mjs`（darwin 限定 + lost 相位断言不变）、`desktop/preload/root-relocation.ts`（命令透传无白名单）。

## 11. 验收映射

| 验收标准 | 覆盖用例 |
|---|---|
| 目录/文件不存在 → 自动创建初始化 → 引导 | SR-U-07/08/09/21/22、SR-I-01、SR-R-01、SR-B-10 |
| 目录在文件丢 → 先修复 | SR-U-12/13/13b/18/19/25/26、SR-U-40~48、SR-I-02~05、SR-R-02 |
| 无法修复 → 对话框两选项 → 重置 → 引导 | SR-U-14~17/20/27/28、SR-U-60~70、SR-U-80~90、SR-B-01~08、SR-R-03/04/05 |
| 消灭只能退出的死局 | SR-U-84（无 wipe 才无按钮）、SR-B-01/02/09、SR-U-104~110、SR-I-07；例外边界：BRAND_BOOTSTRAP_CONFLICT 与 LEGACY_BACKUP_RECOVERY* 维持错误框（SR-U-107 钉死） |
| 绝不删除自定义目标目录 | SR-U-70（执行器级）、SR-B-04（文案） |
| 通过所有测试 | §9 全量回归 |
