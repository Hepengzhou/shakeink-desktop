# 配置目录任意删除自愈与兜底重建总结

日期：2026-10-15。交付顺序：194 调研（含真实复现）→ 195 产品 → 196 用例 → 197 独立审核（需修订后批准，2 P0/9 P1 已修订）→ TDD 实现 → 198 code review（1 实施期 P0 + 1 P1 已修订）→ 199 验证（全 GREEN + 真实演示）。

## 需求与根因

- 需求：配置目录文件被任意删除都要尝试修复；能修则无感修复直接启动；实在无法修复则进入程序主界面→对话框「清空全部配置并重建后重启 / 直接退出」，清空则删除配置目录所有文件并重启重建。
- 用户报告：删除「index 目录」（= `inbox`）与「draft.json」（= `drafts.json`）后无法正常启动。真实复现确认：该组合启动进入受限恢复窗口（`scripts/repro-config-deletion.mjs`）。
- 根因：标记有效时分类层不检查内容完备性（`startup-recovery.ts:88-91`），`inbox/`、`catalog.json` 等结构缺失/损坏只能落到 worker 失败 → 恢复窗口或错误框；`inboxLeaseRecoveryRequired` 对缺失 inbox 直接抛错；`inboxReady:true` 的真实根数据库缺失时 worker 拒绝自动重建（`workspaces.ts:319-321`）。

## 改动（6 个生产文件 + 9 个测试文件 + 演示脚本/台账/文档）

- `desktop/main/startup-recovery.ts`：`classifyStartupRecovery` 新增 `repair:"content"`；`contentReady` 升级为 `catalogUsable`（存在+形态+信封解析）；`repairContent()`——重建 inbox/、inbox/database/（异常形态隔离后重建），catalog 缺失写空/损坏隔离写空，有效标记 inboxReady:true 且库缺失时隔离原标记并原子改写为 false（保留 id/app/phase）并连带隔离有效指针（防 `rootRelocationPreflight` 阻塞），顺带隔离不可解析指针、按语义重建标记；只增不删、幂等、每步 assertLock+权威断言；`samePath` 导出。
- `desktop/service/workspaces.ts`：`run("inbox")` 闸门放宽为容忍「inbox 内唯一条目为空 database 目录」（content 修复产物），`inboxReady:true` 或其他内容仍拒绝自动重建（198 P0 修订）。
- `desktop/main/config-reset-offer.ts`（新模块，不依赖 electron）：`offerConfigReset` 控制流（launch 失败→fatal；拒绝/关闭→quit；wipe 失败→fatal；成功→wipe→relaunch）。
- `desktop/main/index.ts`：`launchConfigResetOffer` 闭包（临时隔离根降级启动真实主界面 + 模态对话框「退出/清空全部配置并重启」+ `executeStartupReset` + relaunch/退出/fatal）；dialog 分类、修复失败、paths-invalid、failedRootCode 改路由到此（取代受限恢复窗口）；`failedRootPath` 自定义根保护（非默认根失败不进入清空提案，198 P1 修订）；移除 `launchStartupRecovery` 调用（导出保留供根迁移流程）。
- `desktop/main/inbox-lease-recovery.ts`：`inboxLeaseRecoveryRequired` 对 inbox 缺失/结构异常返回 false（结构问题归分类层）。
- 测试：SR-U-71/71b/72（分类+执行+幂等+守卫）、IL42-16（缺失容忍）、IL116-S06（真实链路）、SR-U-14/64 翻转、SR-U-104b~110 路由期望更新、CR-01~04（兜底全分支）、SR-I-07 改写 + SR-I-08 新增（真实 worker 端到端）。
- 演示：`scripts/demo-config-deletion.mjs`（隔离根 + 真实 Electron：删 inbox+drafts、删 catalog、删 database、双品牌冲突清空重启、冲突退出五场景）；证据 `docs/evidence/config-deletion/`。
- 台账：`docs/requirements-traceability.json` 登记 `configDeletionSelfHealRevision`。

## 验证（仅目标范围，未全量）

- TDD RED：未修复代码 14 个目标用例全败，既有 60 例全绿。
- GREEN：unit 6 个目标文件 83/83（Node 24）；workspaces 影响面 143/144（唯一失败为 `root-startup-main.test.ts` win32 路径分隔符**既有**失败，HEAD 对照复现，与本改动无关）；integration 11/11（真实 PGlite worker，含 SR-I-08 翻转端到端：重建→回写 inboxReady:true→同 id→指针同 id 重写）；typecheck exit 0。
- 真实系统演示（`npx -y node@24 --import tsx scripts/demo-config-deletion.mjs`）：**16/16 PASS**——D1（用户报告组合）/D2/D3 无感自愈直进工作台、身份与设置保持；D4 双品牌冲突 → 真实主界面 + 模态对话框 → 选清空后自动重启全新重建并可正常启动；D5 选退出进程退出、现场原样保留。

## 遗留

- 行级 catalog 损坏（信封合法但行数据非法）由 worker 启动失败进入兜底清空提案（信封级自愈不覆盖业务行校验）。
- 受限恢复窗口仍服务根迁移/根维护既有流程（非配置删除场景）；`launchStartupRecovery` 导出保留但 index.ts 不再调用。
- 兜底临时根残留于系统临时目录由 OS 清理；`root-startup-main.test.ts` 的 win32 既有失败如需根治建议另行评审（POSIX 期望与 win32 `path.join` 语义冲突）。
