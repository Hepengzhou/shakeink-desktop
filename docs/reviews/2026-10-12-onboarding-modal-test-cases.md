# 新手引导对话框不可关闭 — 测试用例（ONB-12 系列）

日期：2026-10-12
依据：`2026-10-12-onboarding-modal-plan.md`；取代 v3 用例中涉及「Escape/关闭=暂时退出」的断言（`2026-10-11-onboarding-test-cases.md:10,17,25`)

## 单元用例（node --test;rig 驱动真实组件源码）

前置：两个 rig 的 `@/lib/desktop/onboarding-flow` mock 返回真实 `onboardingDialogGuard`（controller `:23`、editors `:34-46` 白名单）。

| ID | 场景 | 步骤 | 预期 |
|----|------|------|------|
| ONB-12a | 否决函数纯逻辑 | 调 `onboardingDialogGuard(false,{cancel})`、`(true,{cancel})`、`(false)` | 仅 `false` 且有 details 时调 `cancel()`；缺省不抛 |
| ONB-12b | Controller 自渲染对话框不可关闭（theme/image-choice/welcome/entry 四步） | controller rig 逐步推进；每步查 `type==='Dialog'` surface | props 含 `disablePointerDismissal:true`、`modal===undefined`（默认 true 生效）；调 `onOpenChange(false)` 后 `closed===0`、仍停留当前步；不存在「暂时退出引导」。entry 步需让挂载即发的 `start-models` 提交挂起/失败以停留该步（沿用 ONB-06/08 的 fail 手法）。profile/text/image 三步编辑器在 controller rig 是 mock primitive，只断言「渲染了对应编辑器组件且全流程无『暂时退出引导』surface」,Dialog props 由 12e/12f 承担 |
| ONB-12c | 缺模型提示不可关闭 | ONB-07 场景（已确认 textModelId 被删） | 无「暂时退出」按钮；`Dialog` props 含 `disablePointerDismissal:true`;`DialogContent` props `showCloseButton===false`;dismiss 不退出；「重新选择或添加」仍可用 |
| ONB-12d | 显式终点保留 | welcome 点「开始创作」;entry 点「暂不配置」 | 均触发 `onExit` 一次 |
| ONB-12e | 引导资料编辑器不可关闭 | editors rig + onboarding props;`dismiss()` | `closed===0`;`Dialog` props `disablePointerDismissal:true`、`modal===undefined`、`onOpenChange===onboardingDialogGuard`；无「暂时退出引导」;confirmationPending 时照旧冻结字段（修订原 `:133`) |
| ONB-12f | 引导模型编辑器不可关闭 | 同上（修订原 `:138`) | 同上；含「选择已有模型」模式 |
| ONB-12g | 嵌套测试结果框（引导模式） | 测试连接出结果后，从 `ui.all()` 过滤出子树含 `DialogTitle`「连接测试结果」的 `Dialog` surface，调其 `props.onOpenChange(false)`（rig `dismiss()` 只打第一个 Dialog，需定向） | 结果框仍可见；嵌套 `DialogContent` props `showCloseButton===false`;「返回配置」点击后结果框消失 |
| ONB-12h | 测试中 dismiss 不取消请求 | 测试连接进行中 `dismiss()`（修订原 `:172-180` 循环收敛为 back/skip) | `canceled` 不含该测试 id;`closed` 不变；resolve 后「连接测试结果」框正常出现；back/skip 仍取消在途请求 |
| ONB-12i | 保存提交中 dismiss 无效（原 `:82`/`:102` 语义扩展） | 提交进行中 dismiss | `closed===0`、提交数不变（任何时刻 dismiss 都无效，不再只是 busy 期间） |
| ONB-12j | 非引导模式零回归 | 无 onboarding prop 的编辑器 | X「关闭编辑用户/关闭配置模型」存在；`dismiss()` 调 `onClose`；保存成功仍 `onClose`（原 `:106-107` 保留） |

## 冒烟用例（scripts/smoke-onboarding.mjs，真实 Electron + 离线守卫）

| ID | 场景 | 预期 |
|----|------|------|
| ONB-12k | theme 步：Escape、点遮罩、查关闭钮 | 对话框仍可见；无 `aria-label="暂时退出引导"`、无内置关闭钮（`getByRole('button',{name:'Close'})` 计数 0);「继续」正常前进。点遮罩写法：`page.mouse.click(8,8)` 或 `locator('[data-slot="dialog-overlay"]').click({position:{x:8,y:8}})`，不用默认中心点（会命中 popup) |
| ONB-12l | profile 步：Escape/点遮罩 | 不关闭；字段保留；恢复对话框 Escape 关闭的既有断言（非引导）不变 |
| ONB-12m | text/image 步：无 X、Escape 不关闭 | 对话框仍可见 |
| ONB-12n | welcome(`:164` 反转）:Escape 不关闭；点「开始创作」 | Escape 后仍可见；点击后进入工作台，焦点回账号菜单 |
| ONB-12o | 短流程 text(`:207` 反转）:Escape 不关闭 | 仍可见；删除 `:208` 冗余再触发；经「继续→跳过→开始创作」离开 |
| ONB-12p | entry「暂不配置」显式终点（`:183` 保留） | 正常退出，当次不再自动提示 |

## 验证门槛

- `npm test` 全绿（含 ONB-12a…12j 与既有 ONB 全部）。
- `npm run typecheck` 通过。
- `npm run build` 后 `node scripts/smoke-onboarding.mjs` 通过（ONB-12k…12p + 既有检查），证据落 `docs/evidence/onboarding/`。
