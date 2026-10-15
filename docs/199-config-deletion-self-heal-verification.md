# 配置目录删除自愈与兜底重建验证报告

日期：2026-10-15。范围：仅 docs/196 的 C01–C08，未执行全量套件（用户约束）。运行环境：Windows，Node 24（`npx -y node@24` v24.21.0，项目 `engines`/`.nvmrc` 要求）。

## TDD RED（未修复代码，系统 Node v20.12.2）

命令：`node --import tsx --test tests/unit/startup-recovery.test.ts tests/unit/inbox-lease-recovery.test.ts tests/unit/inbox-lease-startup-116-review.test.ts tests/unit/startup-recovery-main.test.ts tests/unit/config-reset-offer.test.ts`

结果：`# pass 60 / # fail 14`——失败恰为目标用例：SR-U-71（无 content 分类）、SR-U-72（executeStartupRepair 不支持 content）、SR-U-14/64（分类仍为 dialog）、IL42-16（inbox 缺失抛错）、IL116-S06（真实链路无 repair:content）、SR-U-104b/105/106/106b/108/109/110（旧分支仍 recovery-window，且 bindings 已撤 launchStartupRecovery）、CR 全文件（模块不存在）。SR-U-71b 红线守护用例首轮即通过（既有 dialog 行为），SR-U-104 等既有用例全绿。

## GREEN（修复后）

| 验证 | 命令 | 结果 |
| --- | --- | --- |
| C01/C01b/C02（SR-U-71/71b/72 + 翻转的 SR-U-14/64）、C03（IL42-16）、C04（IL116-S06）、C05（SR-U-104b~110）、C06（CR-01~04） | `npx -y node@24 --import tsx --test tests/unit/startup-recovery.test.ts tests/unit/inbox-lease-recovery.test.ts tests/unit/inbox-lease-startup-116-review.test.ts tests/unit/startup-recovery-main.test.ts tests/unit/config-reset-offer.test.ts tests/unit/backup-removal-preflight.test.ts` | 83/83 通过 |
| workspaces 闸门放宽影响面回归 | 同上 6 个文件 + backup-removal-service / brand-startup-paths / conversation-create-guard / conversation-dispatcher / conversation-transfer-101-review / work-creation-reservations / root-startup*3 | 143/144；唯一失败 `root-startup-main.test.ts`「canonical root before sessionData」为 **win32 路径分隔符既有失败**（git stash 对照 HEAD 复现同样失败，与本改动无关，不在本轮范围） |
| 集成（含 C04 真实 worker 层） | `npx -y node@24 --import tsx --test tests/integration/startup-recovery.test.ts tests/integration/inbox-lease-startup.test.ts` | 11/11：SR-I-01~08 + IL42-PG01~03；SR-I-07 catalog 损坏→content 修复→真实 worker ready；**SR-I-08 删 inbox/database→content 修复（inboxReady 翻转+指针隔离）→真实 worker 重建数据库→回写 inboxReady:true→同 id→指针同 id 重写**（198 审核 P0 修订的端到端证据） |
| C08 | `npm run typecheck` | exit 0 |

## 实施期 code review 修订记录（198）

- P0：worker 闸门 `workspaces.ts:319-321` 对「inbox 非空（含重建的空 database 目录）」拒绝，翻转场景在 worker 屏障断裂 → 放宽为容忍「唯一条目为空 database 目录」；补 SR-I-08 真实 worker 端到端用例。
- P1：自定义根 worker 启动失败时兜底对话框会误列家庭默认根为清空目标 → `failedRootPath` 记录实际失败根，非默认根保持普通错误框，不进入清空提案。
- 另修正：contentReady 升级为 `catalogUsable`（存在+形态+信封解析），翻转时连带隔离有效指针（防 `rootRelocationPreflight` 的 ROOT_MARKER_INVALID 阻塞）。

## 真实目标系统演示（C07，`scripts/demo-config-deletion.mjs`，Node 24 + 开发版真实 Electron + 隔离数据根；每个场景先完整启动完成 adopt 与 inboxReady:true 再破坏）

命令：`npx -y node@24 --import tsx scripts/demo-config-deletion.mjs`（构建：Node 24 全量 `npm run build` 后）。最终结果 **13/13 PASS**（report.json `passed:13, failed:0, errors:[]`），证据 `docs/evidence/config-deletion/`（5 张截图 + report.json）：

| 场景 | 操作 | 实测结果 |
| --- | --- | --- |
| D1（用户报告组合） | 删 `inbox/` + `drafts.json` → 启动 | 无对话框直进工作台；inbox 重建、标记 id 不变、inboxReady 回写 true、PG_VERSION 存在；设置保持 |
| D2 | 删 `catalog.json` → 启动 | 无对话框直进工作台；catalog 重建为空目录 |
| D3 | 删 `inbox/database` → 启动 | 无对话框直进工作台；数据库重建、id 不变、inboxReady 回写 true |
| D4 | 双品牌冲突 → 主界面+模态对话框 → 按键选「清空全部配置并重启」 | 降级主界面打开；清空后自动重启并全新重建配置目录（PG_VERSION 复现）；再次启动进入全新工作台 |
| D5 | 同现场选「退出」 | 进程退出；配置目录双品牌现场原样保留 |

（演示过程记录：① D4 收尾脚本因进程清理只匹配子进程命令行（`--user-data-dir`）漏杀 relaunch 主进程，最终验证启动撞单实例锁——修正为向上遍历 electron 祖先进程后整树清理；② 原生对话框按钮自动化多轮收敛：SendKeys 时序不稳 → UIA 名称匹配（TaskDialog 窗口名与按钮名在 UIA 树中暴露不稳定，且精确匹配不到带后缀的对话框标题）→ 最终定为 **Win32 `EnumWindows` 前缀匹配对话框标题 + `EnumChildWindows` + `BM_CLICK`**，D4/D5 均稳定 INVOKED；③ 增加 `DEMO_ONLY` 场景过滤便于单场景复跑。修正后 D1–D5 全部通过。）
