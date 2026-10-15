# 启动写入锁/配置文件自动修复方案与用例独立审核

日期：2026-10-15。审核对象：187 调研、188 产品、189 用例。审核方式：独立子代理只读逐条对照真实源码与测试文件，结论附文件:行号证据。结论：**需修订后批准**——全部修订已落回 187/188/189，可进入 TDD 实现。

## 审核确认成立的事实

- 启动分支顺序（`desktop/main/index.ts:790-820`）、对话框首回合弹出与修复后退出（`inbox-lease-recovery-window.ts:21-29`）、核心恢复安全闸（`desktop/core/work-lease-recovery.ts:135-140/147/196-197`，`cleanup-pending` :256/:265 可重试收敛）、`readDisk` 损坏抛错/缺失默认（`desktop/core/versioned-store.ts:54-67`）、`repository.initialize()` 阻塞启动、型号目录懒读不阻塞启动——全部属实。
- 实现面设计兼容：`recover(true)` 经确认闸（`inbox-lease-recovery.ts:56/77`）与窗口点击完全等价；`startup-recovery-main.test.ts` 的 AST 末语句提取 + `with(bindings)` 机制下，既有 SR-U-104~110 因 `inboxLeaseRecoveryRequired` 恒 false 短路而 trace 零变化；`ModelRepository.initialize` 生产调用点唯一（`index.ts:236`）；单实例锁先于分支持有，无偷活锁路径。
- V01–V12 用例本身可执行，覆盖面完整（3 次上限、全失败才弹窗、自动继续启动、活锁不修复、损坏隔离、有效/缺失不动、真实 worker 端到端、typecheck）。

## 分级发现与处置

| 级别 | 发现 | 处置 |
| --- | --- | --- |
| P0-1 | 189「其余既有文件只增不改」错误：`tests/unit/inbox-lease-startup-116-review.test.ts` 同型 AST 提取，IL116-S02 以真实活锁驱动真实 `inboxLeaseRecoveryRequired` 为 true，新分支会先调 `recoverInboxLeaseAutomatically`，deps 缺符号必红 | 已修订 189「对既有测试的改动」：deps 增加 stub（记录 `inbox-auto`、内联调用 `assertColdHost` 验证复检、返回 false），S02 期望 trace 更新；S01/S03/S04 不变；其余 4 个提取文件逐一排除 |
| P1-1 | 缺 `ModelRepository.initialize()` → `quarantineInvalidStore()` 接线用例，漏接该行时其余用例仍可全绿 | 已新增 V09b（`tests/unit/model-repository.test.ts`） |
| P2-1 | 187 损坏抛错措辞只对形状/版本错误成立，纯语法错误是 SyntaxError | 187 已修订 |
| P2-2 | 187 配置盘点缺 `catalog.json`（worker 根启动失败→恢复窗口） | 187 已补行，归入保留用户决策路径 |
| P2-3 | 「有文件锁」释义宜写明 | 188 R3 已写明：指应用自建写入锁目录；OS 级占用属 I/O 错误维持现有错误框 |
| P2-4 | prepare 抛错无会话可取消，需写明计为失败尝试 | 189 实现面已写明 |
| P2-5 | hook 相位不含 prepare，尝试计数应以 `wait` 次数 + `before-owner-unlink` 次数为代理；V08 共用断言会追加 trace 条目 | V01–V05、V08 预期已修订 |
| P2-6 | lock-absent 残局与异机/不明内容/篡改审计不重复设例的论证；`attempts` 注入需用例锁定 | 189 实现面已注明复用论证；V03 增 `attempts:1` 子例 |

## 总体结论

187 调研事实属实，188 行为规则与安全红线同代码证据一致，189 实现面与用例可执行、TDD 顺序成立；P0/P1 修订完成后**批准进入 TDD 实现**。
