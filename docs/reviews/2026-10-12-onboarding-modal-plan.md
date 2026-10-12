# 新手引导对话框不可关闭 — 技术方案

日期：2026-10-12
依据：`docs/reviews/2026-10-12-onboarding-modal-research.md`（调研）；用户指令（目标/约束）
取代：v3 设计中「关闭按钮 + Escape = 暂时退出」条款（见调研文档「冲突及处置依据」）

## 行为契约（验收口径）

引导模式（`OnboardingController` 渲染的全部对话框，含嵌套「连接测试结果」）：

1. 模式对话框：Base UI `modal` 默认 `true` 保持不变（焦点囚禁、锁滚动、外部指针禁用），显式标注不改动。
2. 无关闭按钮：删除全部自绘 X（「暂时退出引导」）与「暂时退出」按钮；补齐遗漏的 `showCloseButton={false}`，内置 X 不再出现。
3. 点外部不关闭：引导模式的每个 `Dialog` Root 传 `disablePointerDismissal`。
4. Escape 不关闭：`onOpenChange` 中对 `open===false` 一律 `details.cancel()`，不调用任何退出逻辑。
5. 退出只剩显式流程动作：前进（继续/开始配置/配置文生图模型/重新选择或添加）、回退（返回）、完成/终止流程的显式选择（跳过、暂不配置、开始创作）。这些按钮语义不变。
6. 挂起（`suspended`→`open=false`）不是关闭，保留不变；忙碌锁（`busy/locked`）语义不变。
7. 非引导复用场景（设置内「编辑用户」「配置模型」，即无 `onboarding` prop / 无 `onSubmit`）保持原有 X、Escape、点外部关闭行为，零回归。

## 实现方案

### 1. 共享否决函数（新增，`src/lib/desktop/onboarding-flow.ts`）

```ts
// Veto every close request on an onboarding dialog: overlay press is already
// blocked by disablePointerDismissal; Escape arrives here and is cancelled.
export function onboardingDialogGuard(open:boolean,details?:{cancel():void}):void{
 if(!open)details?.cancel()
}
```

- 纯函数、可单测；`details` 可选因为单测 rig 以单参调用。
- 该文件已是 Controller 的现有依赖（`onboardingStartup`)，两个编辑器组件新增此 import，无循环依赖（只依赖类型）。

### 2. `src/components/desktop/OnboardingController.tsx`

- 删除 `:59` 的 `close` JSX 与 `:71` 的 `{close}` 渲染；`X` 从 `:3` 的 lucide import 移除。
- 通用步骤对话框 `:70`:`<Dialog key={step} open={open} disablePointerDismissal onOpenChange={onboardingDialogGuard}>`。
- 缺模型提示对话框 `:67`:
  - `<Dialog open={open} disablePointerDismissal onOpenChange={onboardingDialogGuard}>`;
  - `DialogContent` 补 `showCloseButton={false}`;
  - 删除「暂时退出」按钮，仅保留「重新选择或添加」;footer 容器保留单按钮布局。
- `exit()` 保留（welcome「开始创作」、entry「暂不配置」仍调用）;`onExit` 接线不变。
- ProfileEditorDialog/ModelConfigurationDialog 的 `onClose={exit}` prop 保留（接口要求必填；引导模式下不再有任何路径触发它）。

### 3. `src/components/desktop/ProfileSettings.tsx`(`ProfileEditorDialog`)

- `:94` 改为：
  `<Dialog open={open} disablePointerDismissal={onboarding || undefined} onOpenChange={onboarding ? onboardingDialogGuard : value => { if (!value) close() }}>`
- `:98` X 按钮仅在非引导渲染：`{!onboarding && <Button …>关闭编辑用户</Button>}`。
- `:116` 加固：引导模式且未传 `onBack` 时不再渲染「取消」（`onBack ? 返回 : onboarding ? null : 取消`;controller 实际恒传 onBack，此分支纯防御，由 ONB-12e 锁定）。

### 4. `src/components/desktop/ModelConfigurationDialog.tsx`

- 主对话框 `:144`:
  `<Dialog open={open} disablePointerDismissal={!!onboarding || undefined} onOpenChange={onboarding ? onboardingDialogGuard : value => { if (!value) close() }}>`
- `:148` X 按钮仅在非引导渲染。
- 嵌套「连接测试结果」`:172`:
  `<Dialog open={open && result !== null} disablePointerDismissal={!!onboarding || undefined} onOpenChange={onboarding ? onboardingDialogGuard : value => { if (!value) setResult(null) }}>`;
  其 `DialogContent` 传 `showCloseButton={!onboarding}`。
  「返回配置」按钮是回退动作，保留。

### 5. 清理

- `src/app/desktop.css:168` `.desktop-onboarding-close` 规则随两个自绘 X 一并删除。

### 明确不做

- 不改 `desktop/main`、`desktop/shared`、IPC、状态机、持久化（退出本就无持久化）。
- 不改 `design/onboarding/flow.js` 预览稿（approval-v3.json sha256 绑定的归档资产）；在 `design/onboarding/README.md` 注明产品行为已变更。
- 不动 `ModelRequiredDialog`、`RecoveryDialog`、设置对话框等非引导对话框。

## 测试用例（先写/改测试，再实现）

### 单元（node --test,rig 驱动真实组件）

前置（独立审核发现，阻断项）：两个 rig 的模块 mock 是白名单制，必须同步，否则全部编辑器用例加载即红——

- `tests/unit/onboarding-controller.test.ts:23` 的 `@/lib/desktop/onboarding-flow` mock 改为返回 `{onboardingStartup, onboardingDialogGuard}`（真实函数，文件顶部新增 import，与 `onboardingStartup` 现有做法一致）。
- `tests/unit/onboarding-editors.test.ts:34-46` 的 require mock 增加 `@/lib/desktop/onboarding-flow` → `{onboardingDialogGuard}`（真实函数，文件顶部新增 import）。

新增 ONB-12 系列：

1. `onboarding-flow.test.ts`:`onboardingDialogGuard(false, details)` 调 `cancel()`;`(true)` 不调；`details` 缺省不抛。
2. `onboarding-controller.test.ts`（扩展 rig，增加按 `type==='Dialog'` 查 surface 并调其 `onOpenChange` 的能力；profile/text/image 三步编辑器是 mock primitive，Dialog props 断言放 editors rig):
   - theme/image-choice/welcome/entry 四步：`Dialog` props 含 `disablePointerDismissal: true`、`modal===undefined`；调 `onOpenChange(false)` 后 `closed===0` 且仍停留当前步；surface 中不存在「暂时退出引导」「暂时退出」。entry 步需让 `start-models` 提交挂起/失败以停留该步。
   - 缺模型提示（ONB-07 场景）：无「暂时退出」按钮；`DialogContent` 的 `showCloseButton===false`、`Dialog` 的 `disablePointerDismissal===true`;dismiss 不退出。
   - welcome「开始创作」、entry「暂不配置」仍触发 `onExit`（显式完成路径回归）。
3. `onboarding-editors.test.ts`:
   - 修订 `:133`/`:138`：断言「暂时退出引导」不存在（其余冻结断言不变）;`Dialog` props 另断言 `modal===undefined`。
   - 修订 `:172-180`：循环收敛为 `back`/`skip` 两种可取消测试的原因；新增独立用例——测试进行中 `dismiss()` 不退出、`canceled` 不含该测试 id、resolve 后「连接测试结果」框正常出现，且不存在「暂时退出引导」。
   - 新增：引导模式 `ProfileEditorDialog` 的 `Dialog` props 含 `disablePointerDismissal:true` 且 `onOpenChange===onboardingDialogGuard`;`dismiss()` 后 `closed===0`;X 不存在。非引导模式保持：X 存在、`dismiss()` 调 `onClose`。
   - 新增：引导模式嵌套测试结果对话框——从 `ui.all()` 过滤子树含 `DialogTitle`「连接测试结果」的 `Dialog` surface 定向调 `onOpenChange(false)`(rig `dismiss()` 只打第一个 Dialog)，结果框仍可见、`DialogContent` 的 `showCloseButton===false`;「返回配置」点击后消失。
   - 既有 `:82`/`:102`「保存提交中 dismiss 不退出」保留（语义扩展为任何时候都不退出）。

### 冒烟（`scripts/smoke-onboarding.mjs`，真实 Electron + 离线守卫）

- theme 步（约 :94 后）新增：Escape、点击遮罩均不关闭「选择主题」；对话框内无 `button[aria-label="暂时退出引导"]`、无内置关闭钮；随后仍经「继续」前进。
- profile 步：Escape/点遮罩不关闭、无 X；恢复对话框 Escape 关闭的既有断言（`:111`，非引导对话框）不变。
- text/image 步：无 X;Escape 不关闭。
- `:164` 反转：Escape 后 welcome 仍可见；改为点「开始创作」关闭，焦点回账号菜单的断言（`:165`）保留。
- `:207` 反转：Escape 后「配置文本模型」仍可见；随后 `:208` 的再次 `desktop:onboarding` 触发会被 `startGuide` 的 `guideRef.current` 守卫吞掉（`DesktopApp.tsx:58`)，已成冗余——删除 `:208` 一行，直接保留 `:209` 的「继续→跳过→开始创作」主线。
- 检查结果文案同步更新（ONB-05/ONB-07 条目中「Escape enters real workbench」「short text Escape」改写为「Escape 不关闭」)。

### 验证命令

- `npm test`（单元+集成）、`npm run typecheck`。
- `npm run build` 后 `node scripts/smoke-onboarding.mjs`（真实 Electron 离线验证）；如环境允许再 `--packaged`。

## 文档同步（实现后）

- `docs/reviews/2026-10-11-onboarding-product-design.md:29,33,45`：步骤 2「右上可暂时退出」、欢迎页「关闭或 Escape 均回到真实工作区」、`:45`「暂时退出」段，标注被本方案取代并改写为现行行为。
- `docs/reviews/2026-10-11-onboarding-research.md:30,36`、`docs/reviews/2026-10-11-onboarding-ui-design.md:35,56`、`docs/reviews/2026-10-11-onboarding-technical-design.md:31,67`：同上。
- `docs/reviews/2026-10-11-onboarding-test-cases.md:10,17,25`:ONB-02b「Escape 无第二次调用」、ONB-05c「关闭/Escape 进工作区」、ONB-10「Escape 关闭与 busy 阻挡」三条用例描述按现行行为改写并指向 ONB-12。
- `design/onboarding/README.md`：注明 2026-10-12 起产品无「暂时退出」，预览稿保留原已批准交互作历史参照。
- `docs/requirements-traceability.json`:onboarding 块追加本次修订（日期、文档、测试 ONB-12、行为差异）。

## 风险

- Base UI 受控对话框不 `cancel()` 会内部置关闪烁——方案以 `cancel()` 为准，源码实证（DialogStore.js:39-52）。
- 嵌套测试结果框打开时 Escape 只作用于嵌套框；两层都装守卫，无遗漏。
- 短流程 entry 是首步而非「中间过程」,「暂不配置」作为显式终点选择保留，符合约束字面与产品可用性。
- Base UI 文档建议 modal 对话框内置 `Dialog.Close` 供触屏读屏器退出；本方案删除后每步仍有显式动作按钮（继续/返回/跳过/开始创作等）兜底，读屏用户可经这些按钮离开流程——已权衡，可接受。
- 原生窗口关闭不属于对话框关闭，行为不变（调研「辅助事实」已述）。
