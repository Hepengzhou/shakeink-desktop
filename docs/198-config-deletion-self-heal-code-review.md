# 配置目录删除自愈 code review

日期：2026-10-15。审核对象：本次改动的 5 个生产文件（`desktop/main/startup-recovery.ts`、`desktop/main/config-reset-offer.ts`、`desktop/main/index.ts`、`desktop/main/inbox-lease-recovery.ts`、`desktop/service/workspaces.ts`）与 8 个测试文件。审核方式：独立子代理只读逐文件核验。结论：**无骨架性 P0；1 个实施期 P0 与 1 个 P1 已修订**，代码零返工遗留。

## 审核确认成立（骨架与守卫）

- `repairContent` 幂等、只增不删（隔离=重命名保字节）、每个写步骤有 assertLock+权威断言，与 repairPointer/repairMarker 先例一致；probeMarker unsafe→fail 消除分类→修复 TOCTOU。
- 分类红线保持：品牌冲突/根身份不符/symlink 根/无指针+标记可重建+内容损坏 → dialog；`catalogUsable` 解析校验只使归类更保守（不会把可启动状态误判为不可启动）。
- 翻转与指针连带隔离的分支覆盖正确（catalog-only 不动标记不动指针；db 缺失→翻转+隔离指针；标记重建→false+有指针必隔离；无指针不隔离）；隔离后 `data-root.corrupt-*` 不命中 relocation 历史名清单 → mode none。
- 兜底控制流（launch 失败→fatal；confirm false/抛错→quit；wipe 失败→fatal 不 relaunch；成功→wipe→relaunch）与 host 注入接缝正确；临时根不触碰原配置目录；清空仅经用户 confirm=true 单一路径。
- `inboxLeaseRecoveryRequired` 吞错降级可接受（后续 worker 同点失败→reset-offer 显式化）。

## 实施期发现与处置

| 级别 | 发现 | 处置 |
| --- | --- | --- |
| P0（实施期） | **翻转场景端到端断裂**：worker 闸门 `workspaces.ts:319-321` 对「inbox 非空（含重建的 database 目录）」同样拒绝，所有需翻转场景（删 inbox、删 inbox/database、reset 残留）修复后仍落兜底；且兜底文案会误导用户清空本可保留的 state.json/drafts.json；测试因 launch stub + SR-I-07 只覆盖 catalog 未捕获 | 已修订：`workspaces.ts:319-330` 闸门放宽为容忍「inbox 内唯一条目为空 database 目录」（与 connect create 路径 :289-294 语义一致；inboxReady:true 或其他内容仍拒绝）；**新增 SR-I-08 真实 worker 端到端**（删 inbox/database→content repair→worker ready→回写 inboxReady:true→同 id→指针同 id 重写），11/11 通过 |
| P1 | **自定义根 reset 目标错配**：failedRootCode 路由在自定义根（分类恒 none 的自定义指针）失败时，对话框会误列家庭默认根为清空目标 | 已修订：`index.ts` 以 `failedRootPath` 记录实际失败根（relocation.pointer），非默认根时保持普通错误框+exit(1)，不进入清空提案；`samePath` 自 startup-recovery.ts 导出复用 |
| P2 组 | `catalogUsable` 只校验信封不校验行（行级损坏→worker 失败→兜底，可接受）；翻转与指针隔离间微秒级崩溃窗口（极端边缘，兜底可接受）；SR-U-72 幂等可加全量 snapshot；可重建标记的 content 执行路径用例可选补强；`?? randomUUID()` 防御性死代码 | 记录在案，不阻塞 |

## 验证锚点（本文件签署时）

- unit：6 个目标文件 83/83（Node 24）；workspaces 影响面 9 文件连同目标文件 143/144（唯一失败为 `root-startup-main.test.ts` 的 win32 路径分隔符**既有**失败，HEAD 上对照复现，与本改动无关，不在本轮范围）。
- integration：`tests/integration/startup-recovery.test.ts` + `inbox-lease-startup.test.ts` 11/11（真实 PGlite worker，含 SR-I-07 catalog 自愈、SR-I-08 翻转端到端）。
- typecheck：exit 0。
- 真实系统演示：docs/199 与 `docs/evidence/config-deletion/`。
