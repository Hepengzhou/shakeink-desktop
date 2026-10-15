# 右侧面板恢复按钮显隐时序回归用例

依据：180 方案（含 181 审核修订）；执行前须完成 183 独立审核。本轮只覆盖本次修复目标，禁止全量测试；每项都须在 185 报告绑定实际结果，不能把组件替身算作真实验证。全部行为用例运行于 `tests/browser/content-drawer.test.ts`：esbuild 现场打包真实 DashboardShell、useSidebarDrawer、ContentTabs 与经 AST 提取的真实 ChatPanel caption（含真实 `[data-content-restore]` 按钮及其 `contentHidden && onShowContent` 渲染条件），playwright-core 无头 Chromium 驱动。

需求（2026-10-15）：
- R1 点击「显示内容面板」后，按钮在展开动画播放**前**隐藏。
- R2 点击「显示 / 隐藏内容面板」收起后，「显示内容面板」按钮在收起动画播放**完成后**才出现。

| ID | 输入与操作 | 预期及验证层 |
| --- | --- | --- |
| V01（R1） | 内容面板全闭（fixture 初始无 Tab，phase `"closed"`），确认恢复按钮存在；在页面内 `button.click()` 真实恢复按钮，点击提交在下一个微任务（首个绘制前，经探针实测）落地，随后继续 rAF 逐帧采样至收尾 | 首个绘制前的微任务检查点：`data-content-phase` 已为 `"opening"`、`[data-content-restore]` 已从 DOM 移除、内容可见宽度 < 1px（动画尚未播放）；全部 `"opening"` 帧均无恢复按钮；收尾 phase `"open"`，按钮仍不存在。旧实现 RED：检查点按钮仍在、opening 帧有按钮。browser |
| V02（R2） | `openContent()` 打开面板后，点击真实 ContentTabs「显示 / 隐藏内容面板」按钮，同样在下一个微任务检查点断言，随后 rAF 逐帧采样覆盖整个 420ms 收起动画至收尾 | 检查点：phase 已为 `"closing"`、恢复按钮不存在；全部 `"closing"` 帧均无恢复按钮；首个含恢复按钮的采样帧其 phase 必为 `"closed"` 且可见宽度 ≈0；收尾后按钮重新可见且不在 inert 子树内。旧实现 RED：closing 首帧按钮已出现。browser |
| V03（改写既有 CD-01 repeated reversal） | 打开面板后命令驱动 `hide` → 运动中 `toggle` → 再 `toggle` 反复反转（命令路径，不依赖可见按钮） | 逐帧断言所有运动相位帧（`"opening"/"closing"`）均无恢复按钮；`assertFixedFrames` 固定几何不回归；内容实例保留；终态 `"closed"` 后恢复按钮出现且可键盘 Enter 重开至 `"open"`。旧实现 RED：运动帧存在恢复按钮。browser |
| V04（既有 CD-05 焦点链，content-drawer.test.ts:281-303 原样保留） | 焦点在内容正文输入框时 `hide` 收起，等 520ms | 收尾后焦点落在恢复按钮上（新兜底路径：420ms 动画 + 收尾提交后 layout effect，< 520ms 窗口）；Enter 重开后焦点回到原输入框，草稿/选区/滚动位置保留。browser |
| V04b（183 审核 P1：动画中用户转移焦点不抢占，新增 CD-08 用例） | 焦点在内容正文输入框时 `hide`；在收起动画进行中将焦点移到「外部焦点」按钮；等至收尾 | 收尾后焦点仍在「外部焦点」按钮上，兜底不抢占用户焦点（`activeElement` 非 body 且不在内容 inner 内时跳过聚焦）；恢复按钮在收尾时出现且可用。旧实现 RED 等价说明：旧代码焦点在动画早期帧即被移至恢复按钮，运动中转移焦点的场景本不存在；本用例锁定新兜底不引入抢焦点回归。browser |
| V05（既有回归面） | content-drawer.test.ts 其余全部用例（CD-01 首次开闭/长 caption/same-task、CD-02、CD-03 窄屏与 resize、CD-04 restore 与 reduced motion、CD-07） | 全部通过；其中终态使用恢复按钮的断言（CD-01 首次开闭 :69 重开、CD-04 reduced motion :277、CD-05 :289 焦点）不受影响；CD-01 same-task :169-177 与 CD-02 :123-134 继续锁定命令路径运动中反转。browser |
| V06（拼接真实 caption / 共享真实 hook 的编译与行为安全，181 审核 P1） | `tests/browser/sidebar-drawer.test.ts`、`sidebar-drawer-intent.test.ts`、`sidebar-drawer-measurement.test.ts`、`sidebar-drawer-resize.test.ts`、`sidebar-surfaces.test.ts`、`caption-alignment.test.ts`、`ai-caption-message-drag.test.ts`、`chat-caption-safe-area.test.ts`、`pane-window-drag.test.ts`、`sidebar-restore-safe-area.test.ts`、`workspace-surfaces.test.ts` | 全部通过（这些文件的 bundle 因 ChatPanel.tsx/useSidebarDrawer.ts 被编辑而重建；无任何对旧显隐时序的依赖）。browser |
| V07 | `npm run typecheck` | exit 0。 |

## 用例变更（对既有测试的增删改）

- 新增 V01、V02（命名 CD-08 前缀，置于 content-drawer.test.ts）。
- 改写：content-drawer.test.ts:73-88「CD-01 repeated close/open reversal follows the visible restore control」→ V03（命令驱动 + 逐帧无按钮断言）。
- 删除：content-drawer.test.ts:90-118「CD-01 held actual pointer recovery survives the restore button moving beneath it」——其前提（收起动画中可见且移动的恢复按钮 + pointer capture 按住跟随）即本次需求禁止的旧行为；生产代码 `ChatPanel.tsx` 的 pointer capture 同步移除。
- 删除随之不再使用的 `clickMovingRestore` 辅助函数（content-drawer.test.ts:13-21）。
- fixture `tests/helpers/content-drawer-fixture.ts`：`ContentSample`/`captureSample` 增加 `restore: boolean`（`.workspace-chat [data-content-restore]` 是否存在）；实现要点（183 审核 P3）：该字段必须在 `:123` 的 `if (!inner || !viewport) return empty` 早退**之前**计算并同时放入 `empty` 兜底与完整返回，否则初始未挂载样本失真。
- 实现要点（183 审核 P1 门控）：layout effect 消费一次性标记时，若 `document.activeElement` 既非 `document.body` 也不在内容 inner 内，跳过聚焦并清 `contentClosingFocus`。

## TDD 顺序

1. 先实现 fixture `restore` 字段与 V01/V02/V03 测试，对**未修复**代码运行确认 RED：V01 失败于同步任务内按钮仍在/opening 帧有按钮；V02 失败于 closing 首帧按钮已出现；V03 失败于运动帧有按钮。记录失败数量与断言原文。
2. 实现 180 方案（`contentHidden === "closed"` + 焦点兜底 + ChatPanel 清理）。
3. 确认 V01–V07 全 GREEN，记录实际命令与结果到 185。明确豁免：其余 unit/integration/browser 套件本轮不执行（用户约束：禁止全量测试）。
