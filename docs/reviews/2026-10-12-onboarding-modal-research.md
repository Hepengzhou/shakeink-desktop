# 新手引导对话框不可关闭 — 调研

日期：2026-10-12
状态：调研完成，待技术方案

## 目标与约束（用户指令原文）

- 目标：新手引导流程中的所有对话框都是模式对话框，不能关闭，只能前进、回退、或者完成整个流程，中间过程的对话框不能被关闭。
- 约束：全部是模式对话框；都没有关闭按钮；点击对话框外其他区域不能关闭对话框。

## 现状：引导流程涉及的全部对话框与关闭路径

新手引导由 `src/components/desktop/OnboardingController.tsx` 统一渲染，步骤状态机：`theme → profile → text → image-choice → image → welcome`（完整流程）与 `entry → text → …`（仅模型短流程），路由来自 `src/lib/desktop/onboarding-flow.ts:4-8` 与磁盘持久化的 `onboarding.step`（`desktop/core/settings.ts:28-33`）。

流程内对话框共 5 个 Root，当前每一处都可被关闭：

| # | 对话框 | 关闭按钮 | Escape / 点外部 |
|---|--------|----------|------------------|
| 1 | 通用步骤（theme/image-choice/welcome/entry）`OnboardingController.tsx:70` | 自绘 X「暂时退出引导」`:59` 渲染于 `:71` | `onOpenChange={value=>{if(!value)exit()}}` `:70` |
| 2 | 已确认模型被删除的提示 `OnboardingController.tsx:67` | 「暂时退出」按钮 + **DialogContent 未传 `showCloseButton={false}`，默认内置 X 会渲染**（`src/components/ui/dialog.tsx:45,62-77`） | 同上的 `onOpenChange→exit` |
| 3 | `ProfileEditorDialog`（onboarding 模式）`ProfileSettings.tsx:94-98` | 自绘 X「暂时退出引导」`:98` | `onOpenChange→close()` `:94` |
| 4 | `ModelConfigurationDialog`（onboarding 模式）`ModelConfigurationDialog.tsx:144-148` | 自绘 X「暂时退出引导」`:148` | `onOpenChange→close()` `:144` |
| 5 | 嵌套「连接测试结果」`ModelConfigurationDialog.tsx:172` | 默认内置 X（未传 showCloseButton） | `onOpenChange→setResult(null)` |

辅助事实：

- `exit()`（`OnboardingController.tsx:30`）只在 `locked/suspended` 时拒绝，其余时候调 `onExit`；`onExit` 在 `DesktopApp.tsx:56` 仅卸载组件（`setGuideRequest(null)`），**无 IPC 持久化**；步骤恢复完全依赖每次提交落盘的 `onboarding.step`。
- 流程内的显式动作按钮（继续/返回/跳过/开始配置/暂不配置/开始创作/重新选择或添加）是导航语义，不属于「关闭」。
- 短流程 `entry` 步的「暂不配置」(`OnboardingController.tsx:91`）与完整流程 `welcome` 步的「开始创作」(`:89`）是流程终点的显式选择，保留。
- `suspended`(`DesktopApp.tsx:178,183`）在关闭保存/迁移/租约/草稿恢复等高优先级对话框出现时让引导 `open=false` 挂起，组件不卸载、字段保留——不是用户关闭，保留不变。
- 原生窗口关闭（标题栏 X / 退出应用）不属于「对话框关闭」：引导期间仍走 prepare-close→挂起→退出，重启按磁盘进度恢复（冒烟 `smoke-onboarding.mjs:121-122` 依赖此行为），本任务不改变它。
- 全局键盘与事件层无遗漏关闭路径：`DesktopCommandController` 在存在 `[role="dialog"]` 时把 Escape 归还 DOM；`desktop:settings`/`desktop:command`/`desktop:onboarding` 事件在 `guideRef.current` 时全部被拒（`DesktopApp.tsx:58,135,143`);Electron 菜单 accelerator 只发 command 事件，同样被屏蔽。
- 非引导场景复用同一组件：设置里的「编辑用户」「配置模型」(`ProfileSettings.tsx:122-130`、`ModelConfigurationDialog` 无 onboarding prop）必须保持原有可关闭行为。
- 已有的阻塞式对话框先例：`DesktopApp.tsx:185` 的「正在保存并关闭」用 `showCloseButton={false}` + 空 `onOpenChange`。

## Base UI 关闭机制（@base-ui/react 声明 ^1.6，实装 1.8.0，源码实证）

- `Dialog.Root` props(`node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts`)：`modal` 默认 `true`（焦点囚禁+锁滚动+禁外部指针，`:27-36`）；`disablePointerDismissal` 默认 `false`，置真可阻止外部点击关闭（`:46-50`）；`onOpenChange(open, eventDetails)`，`eventDetails.reason` 可为 `'escape-key'|'outside-press'|'close-press'|…`，`eventDetails.cancel()` 取消 Base UI 内部处理（`internals/createBaseUIEventDetails.d.ts:51-63`）。
- **必须显式 `cancel()`，不能只忽略回调**:`DialogStore.setOpen`(`dialog/store/DialogStore.js:39-52`）先调 `onOpenChange`，仅当 `eventDetails.isCanceled` 才 return；否则继续 `dispatchOpenChange` + `store.update` 内部置关。受控模式下 prop 同步是 effect(`@base-ui/utils/store/ReactStore.js:108-121`)，内部已被置关会造成闪烁/状态撕裂。
- 外部点击在 `useDismiss` 层被 `disablePointerDismissal` 拦截，不产生关闭请求（`dialog/root/useDialogRoot.js:40-77`);Escape 在 `escapeKey: isTopmost` 时产生 `reason='escape-key'` 的关闭请求，需 `cancel()` 否决。嵌套对话框（测试结果）打开时父框非 topmost，Escape 只作用于嵌套框——嵌套框在引导模式同样需否决。
- 本地封装 `src/components/ui/dialog.tsx` 的 `Dialog` 透传所有 props 给 `DialogPrimitive.Root`(`:10-12`)，因此 `disablePointerDismissal` 可直接在调用处使用，无需改封装。

## 与已批准设计的冲突及处置依据

v3 已批准设计（2026-10-11,`design/onboarding/approval-v3.json`）明确要求「关闭按钮 + Escape = 暂时退出」:`docs/reviews/2026-10-11-onboarding-product-design.md:45`、`docs/reviews/2026-10-11-onboarding-research.md:30,36`、`docs/reviews/2026-10-11-onboarding-ui-design.md:56`、`docs/reviews/2026-10-11-onboarding-technical-design.md:31,67`、`design/onboarding/README.md:7,13`。

按 `AGENTS.md`「同一要求历次修改以后者为准」，用户 2026-10-12 指令是最新约束，覆盖 v3 的「暂时退出」交互：删除全部关闭按钮、Escape/点外部不再退出；显式导航（前进/回退/跳过/完成）保留。旧文档相关条款随实现同步修订并注明被本次方案取代。`design/onboarding/flow.js` 预览稿被 approval-v3.json 的 sha256 绑定，属归档设计资产，本次不改；在 README 注明产品行为已变更。

## 受影响测试现状

- `tests/unit/onboarding-controller.test.ts`：自造 React hook rig 驱动真实 Controller，目前**无关闭行为断言**;rig 的 `onExit(){closed++}`(`:10`）可复用。
- `tests/unit/onboarding-editors.test.ts`：三处断言将失效——`:133`、`:138` 断言 confirmationPending 时「暂时退出引导」按钮可用；`:172-180` 断言测试进行中 exit/dismiss/back/skip 可取消请求。`:82`、`:102` 的「保存提交中 dismiss 被阻挡（closed=0)」语义变为「任何时候 dismiss 都无效」。rig 的 `dismiss()`(`:75`）直接调 `props.onOpenChange(false)`，绕过真实封装——**组件自身的 onOpenChange 必须在引导模式自带否决逻辑**，单测才能验到契约。
- `tests/unit/onboarding-flow.test.ts`：纯函数测试，可新增否决函数用例。
- `scripts/smoke-onboarding.mjs`（真实 Electron + 离线守卫）:`:164` 欢迎页 Escape 关闭且焦点回账号菜单、`:207` 短流程文本页 Escape 关闭——两处需反转为「Escape 不关闭」;`:111` 的 Escape 关的是恢复对话框（非引导），不变；`:183`「暂不配置」是显式动作，不变。
- 服务/仓储层用例（`onboarding-ipc/service/repository/retry-integration`）不涉及 UI 关闭，不受影响。

## 结论

- 改动集中在渲染层 3 个文件（OnboardingController/ProfileSettings/ModelConfigurationDialog)+ 1 个纯函数（onboarding-flow.ts)，主进程 IPC、状态机、持久化零改动。
- 技术手段确定：引导模式传 `disablePointerDismissal` + `onOpenChange` 中对 `!open` 调 `details.cancel()`；删除全部 X/「暂时退出」；补上缺失的 `showCloseButton={false}`（路径 2、5）。
- 退出只剩显式导航与流程终点，满足「只能前进、回退、或者完成整个流程」。
