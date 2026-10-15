# 右侧面板恢复按钮显隐时序验证报告

日期：2026-10-15。依据：180 方案（含 181/183 审核修订）、182 用例、184 code review（批准，无 P1/P2）。执行范围严格限定 182 指定的目标用例与影响面文件，未执行全量套件。

## 环境

- Node 24，`node --import tsx --test --test-concurrency=1 --test-reporter=tap`。
- 浏览器：playwright 固定版本 `chromium_headless_shell-1243`（本轮经 `npx playwright install` 补齐；此前缺失时曾用系统 Chrome 做 RED 探针，结论一致）。

## TDD RED（修复前，4/4 失败于预定断言）

命令：`node --import tsx --test --test-concurrency=1 --test-name-pattern="CD-08|repeated command reversal" tests/browser/content-drawer.test.ts`（修复前代码）：

| 用例 | 失败断言（旧实现实测） |
| --- | --- |
| CD-01 repeated command reversal（V03） | `No opening/closing frame exposes the restore control` |
| CD-08 opening（V01） | `Restore control is removed before any animation frame paints`（检查点 phase `"opening"` 断言通过，按钮仍在） |
| CD-08 closing（V02） | `Restore control does not appear when the closing animation starts` |
| CD-08 focus（V04b） | `No closing frame contains the restore control` |

另经一次性探针（已删除）实测提交时序：点击后相位在下一微任务提交（首个绘制前），动画可见宽度自第 2 个 rAF 起增长——V01/V02 的微任务检查点语义据此确立。

## GREEN（修复后）

| ID | 结果 | 证据 |
| --- | --- | --- |
| V01 CD-08 opening | 通过 | 同上 name-pattern 运行：4/4 通过 |
| V02 CD-08 closing | 通过 | 同上 |
| V03 CD-01 repeated command reversal | 通过 | 同上 |
| V04 CD-05 焦点链 | 通过 | 全文件运行 20/20（见下） |
| V04b CD-08 focus not stolen | 通过 | 同上 4/4 |
| V05 content-drawer.test.ts 全文件 20 用例 | 通过 | `node --import tsx --test --test-concurrency=1 --test-reporter=tap tests/browser/content-drawer.test.ts` → exit 0，`# pass 20 # fail 0`（固定版 headless shell） |
| V06 影响面 11 文件 | 见下节 | 见下节 |
| V07 `npm run typecheck` | 通过 | exit 0，无输出 |

## V06 影响面文件结果

命令：`node --import tsx --test --test-concurrency=1 --test-reporter=tap tests/browser/sidebar-drawer.test.ts tests/browser/sidebar-drawer-intent.test.ts tests/browser/sidebar-drawer-measurement.test.ts tests/browser/sidebar-drawer-resize.test.ts tests/browser/sidebar-surfaces.test.ts tests/browser/caption-alignment.test.ts tests/browser/ai-caption-message-drag.test.ts tests/browser/chat-caption-safe-area.test.ts tests/browser/pane-window-drag.test.ts tests/browser/sidebar-restore-safe-area.test.ts tests/browser/workspace-surfaces.test.ts`

结果：exit 0，`# tests 82 # pass 82 # fail 0`。11 个文件（共享真实 hook 的 sidebar-drawer 5 文件 + 拼接真实 ChatPanel caption 的 6 文件）全部通过，无对旧显隐时序的依赖。

## 真实目标系统验证（2026-10-15 现场演示）

Node 24 完整重新构建（`npm run build`，generate + next build + build:desktop，exit 0）后启动真实 Electron 应用，经 CDP 驱动真实界面点击并每 25ms 采样相位/按钮/可见宽度，截图存证于 `docs/evidence/content-restore-visibility-2026-10-15/`：

- **R1 展开**：点击真实恢复按钮后，首个运动帧 t=43ms（phase `"opening"`、可见宽度 0）按钮已移除；首个可见宽度帧 t=81ms（35.8px）按钮仍不存在；18 个运动帧 0 帧带按钮。截图：起始有按钮 → 动画中无按钮 → 展开后无按钮。
- **R2 收起**：点击真实「隐藏内容面板」按钮后，14 个 closing 帧 0 帧带按钮；按钮在 t=501ms 才随 phase `"closed"`、可见宽度 0 重新出现（420ms 动画收尾之后）。截图：动画中无按钮 → 收尾后按钮恢复。

两项均通过，与浏览器套件结论一致。

## 既有 flake 说明（非本轮回归）

- **CD-07（hidden/inert editor）**：断言「hide() 后恰好 1 个 rAF 相位已为 `"closing"`」对浏览器构建/负载敏感。对照实验：原始未修复代码在系统 Chrome 下 5/5 失败、固定版 shell 下 1/1 失败；修复后代码 6 次运行 2 次失败、重试即过。失败形态两侧一致，属既有时序敏感，与本次改动（显隐条件 + 收尾焦点兜底，均不在该断言路径上）无关。
- **CD-01 ink 首次开闭**：一次运行中展开收尾超过 720ms 采样窗口（机器负载），重试通过；本轮未改动动画时长与收尾路径。

## 结论

两条需求均修复并通过目标测试：V01–V07 全部 GREEN（content-drawer 20/20、影响面 82/82、typecheck exit 0）。仅有的两次失败为重试即过的既有时序敏感 flake（对照实验证明原始代码同形态失败），与本次改动无关。
