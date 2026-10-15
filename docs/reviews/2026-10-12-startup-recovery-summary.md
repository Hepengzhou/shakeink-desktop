# 启动配置目录丢失/损坏修复 · 交付总结

日期：2026-10-12
范围：修复配置目录（`[用户目录]/.shakeink/`）丢失或文件损坏后应用无法正常启动的问题。

## 1. 交付产物（按约定顺序）

| 顺序 | 产物 | 位置 |
|---|---|---|
| 调研文档 | 死局根源定位（三重叠加：preflight blocked + 硬编码 notice + canChoose=false）、14 场景现状矩阵、可修复性分析 | `docs/reviews/2026-10-11-startup-recovery-research.md` |
| 产品文档 | 场景决策矩阵 P0–P6、F1–F5 功能规约、文案表、安全约束、验收映射 | `docs/reviews/2026-10-11-startup-recovery-product-design.md` |
| UI 设计稿 | 7 场景审核壳 + 可交互对话框稿；截图断言 9/9；**用户已于 2026-10-11 批准**（`approval-v1.json`） | `design/startup-recovery/` |
| 技术方案 | 经独立子代理审核（修改后通过：阻断 1 + 重要 8 全部修订） | `docs/reviews/2026-10-11-startup-recovery-technical-design.md` |
| 测试用例 | 经独立子代理审核（修改后通过：阻断 1 + 重要 9 全部修订） | `docs/reviews/2026-10-11-startup-recovery-test-cases.md` |
| 代码实现 | 见 §2 | git 工作区（未提交） |
| 测试与验证 | 见 §3 | `docs/evidence/startup-recovery/` 等 |
| 台账 | startupRecovery 条目 | `docs/requirements-traceability.json` |

## 2. 实现要点

- **新增 `desktop/main/startup-recovery.ts`**（纯 fs 冷态核心，不依赖 Electron）：
  - `classifyStartupRecovery`：启动分类器。指针悬空指向默认根且根缺失/为空 → auto-init；链接级损坏 → repair（pointer 隔离重建 / marker 按指针 rootId 重建 / 无指针 marker-new-id / resume-init 续跑）；其余 → dialog。历史记录在途、自定义目标、外来副本（inode 不符）、家族不符一律不碰。
  - `executeStartupRepair`：R1/R2/R4 修复，atomicWrite + 全程身份复核 + hooks 测试注入点。
  - `executeStartupReset`：用户二次确认后的重置。先删有效性标志文件（崩溃收敛到 dialog/auto-init，绝不半删伪装成功）再清根内容，然后清 bootstrap 控制/历史文件（含 legacy 恢复控制名，防重置后死局循环）；防呆校验目标必须等于家族默认根（隔离测试根模式只作用于隔离根）；自定义目标目录与作品目录永不删除。
- **relocation 窗口链路扩展**：相位 `reset-confirm/resetting/reset-failed`，命令 `reset/reset-confirm/reset-back`，状态 `canReset/defaultPath`；controller 重置状态机带 ticket/flight 排空纪律（wipe 不与在途 choose 并发）、resetting 中 quit 延迟、resetFlight 在途 cancel 拒绝；blocked 相位按批准设计变为「无法修复数据目录」对话框（`history-needs-recovery` 保留原文案标题）；窗口标题随相位切换；新增 `launchStartupRecovery` 入口。
- **主进程接线**：模块加载期失败兜底保留家族感知 recoveryPaths（brand-startup-paths.ts 抛出点全部携带）；start() 在 relocation 闸门前分类，auto-init/repair 成功后重跑选择并校验家族一致，单轮不循环；worker 启动失败（rootStartup 错误码，显式 failedRootCode 变量路由）统一先 terminate worker 确认退出再开恢复对话框，开窗失败才退回错误框。
- **`data-root.ts`**：resolve() 无指针分支容忍 `phase:"initializing"`（启用既有续跑路径）；有指针校验保持严格。
- **界面**：`RootRelocationScreen.tsx` 按批准设计稿实现全部视图与文案（产品文档 §5 逐字核对一致）。

## 3. 测试与验证结果

- **新增/更新测试**：SR-U 单测（分类矩阵/修复/重置/相位机/窗口接线，含 SR-U-91/92 审核建议项）、SR-I-01~07 集成（真实 esbuild worker 冷启动两段式）、SR-B-01~12 浏览器（真实 React 组件 + 受控 bridge）；按清单更新 10 个既有测试文件。
- **typecheck**：`tsc --noEmit` 通过。
- **全量 unit+integration**（node 24）：1904 测试 / 1857 通过 / 41 失败。**41 个失败与 HEAD 基线逐名一致**（git stash 对照复跑验证），全部是 Windows 平台/环境既有问题（路径分隔符正则、darwin 语义、ESM URL scheme、whoami 参数、安全存储依赖等）；满载下另有 3 个超时用例（DESK-D04×2、PGlite 迁移、BDC02），单独复跑全绿。本功能新增/修改的测试文件零失败，无回归。
- **浏览器测试**：25/25 通过（真实组件、真实 CSS）。
- **设计稿回归**：`capture-preview.mjs` 9/9。
- **真实系统验证**（`scripts/smoke-startup-recovery.mjs`，5 次真实 Electron 启动 + 1 次真实 relaunch + CDP 重连，证据 `docs/evidence/startup-recovery/`）：
  - SR-R-01 目录整体缺失 → 自动初始化进工作台 + 「选择主题」引导 ✓
  - SR-R-02 marker 删除 → 静默修复进工作台，rootId/指针字节不变 ✓
  - SR-R-05 无法修复 → 对话框恰好 [重置配置数据][退出应用]；退出后文件字节不变 ✓
  - SR-R-03 重置 → 二次确认红色警示 → 正在重置 → 自动重启 → 全新初始化 + 引导，rootId 更新 ✓
  - SR-R-04 重置后二次启动正常 ✓
- **打包验证**：`npm run package:dir` 重新打包 win-unpacked 成功；`scripts/verify-packaged-startup-recovery.mjs` 真实启动打包产物：缺失根自动初始化 + 引导出现（`packaged-fresh.json` + 截图）。
- **证据落盘**：`docs/evidence/startup-recovery/`（6 截图 + 2 JSON）、`docs/evidence/implementation-01/core-latest.{tap,json}`（诚实记录 Windows 环境失败，状态 failed 与 HEAD 基线一致）；`scripts/test-core.mjs` 总超时从 120s 调至 900s（原额度在本机 HEAD 已不可能完成）。

## 4. 边界与已知限制（书面决定）

- `BRAND_BOOTSTRAP_CONFLICT`（双品牌权威记录）与 `LEGACY_BACKUP_RECOVERY*`（旧版恢复证据在途）维持错误框人工处理——重置会永久销毁恢复证据，这是「消灭死局」的唯一保留例外。
- 不恢复已被删除的用户数据；重置影响已在确认页如实告知（收件箱/设置/模型配置/作品索引/应用备份丢失；作品文件在独立目录不受影响）。
- 本机系统 Node 20.12.2 不满足仓库 `engines>=24`，全部验证经 npx node@24 执行；`smoke-root-relocation.mjs`（darwin 限定）与 `inspect-packaged-app.mjs`（macOS .app）不适用 Windows，分别以新冒烟脚本与 win-unpacked 真实启动代替；NSIS 安装包未本轮重打。

## 5. 验收标准核对

| 标准 | 结论 |
|---|---|
| 目录/文件不存在 → 自动创建初始化 → 新人引导 | ✓ SR-U-07/08/09、SR-I-01、SR-R-01、打包件验证 |
| 目录在文件丢 → 先尝试修复 | ✓ SR-U-12~19/25/26、SR-U-40~48、SR-I-02~05、SR-R-02 |
| 无法修复 → 对话框 [退出]/[重置配置数据] → 清空重建 → 引导 | ✓ SR-U-60~70、SR-U-80~92、SR-B-01~08、SR-R-03/04/05 |
| 消灭只能退出的死局 | ✓ 截图场景（blocked）现有重置出口；worker 失败路由对话框；自定义根丢失有重置出口；仅书面声明的两个例外保留 |
| 按输出顺序产出全部产物 | ✓ §1 |
| 通过所有测试 | ✓ 新增全部通过；存量无回归（失败集与 HEAD 逐名一致且为既有环境问题） |
