# 新手引导对话框不可关闭 — 验证与总结

日期：2026-10-12
链路：`2026-10-12-onboarding-modal-research.md` → `2026-10-12-onboarding-modal-plan.md`（独立审核通过，2 阻断项已修）→ `2026-10-12-onboarding-modal-test-cases.md`（独立审核通过，2 可执行性修订）→ TDD 实现 → 独立 code review 通过（3 项次要已修）→ 本文档。

## 实现清单（代码）

- `src/lib/desktop/onboarding-flow.ts`：新增 `onboardingDialogGuard(open, details?)`——`open===false` 时 `details?.cancel()` 否决 Base UI 内部关闭（源码依据：`DialogStore.js:39-52` 仅 `isCanceled` 时中止）。
- `src/components/desktop/OnboardingController.tsx`：删除自绘 X「暂时退出引导」与缺模型提示的「暂时退出」按钮；通用步与缺模型提示两个 Dialog 传 `disablePointerDismissal` + `onOpenChange={onboardingDialogGuard}`；缺模型提示补齐 `showCloseButton={false}`（修复内置 X 默认渲染的现存漏洞）。「开始创作」「暂不配置」「重新选择或添加」「返回/继续/跳过」等显式动作不变。
- `src/components/desktop/ProfileSettings.tsx`：引导模式（`!!onSubmit`)Dialog 传 guard + `disablePointerDismissal`;X 仅非引导渲染；引导无 `onBack` 时不再渲染「取消」（防御性加固）。
- `src/components/desktop/ModelConfigurationDialog.tsx`：主框与嵌套「连接测试结果」框同上；嵌套框引导模式 `showCloseButton={false}`，「返回配置」保留。
- `src/app/desktop.css`：删除失引用的 `.desktop-onboarding-close`。
- 非引导复用（设置内编辑用户/配置模型）行为零变更，由 ONB-12j 锁定。

## 验证结果（真实执行）

### 单元 + 集成（Node 24.21.0 便携运行时，符合 .nvmrc=24)

- 目标文件：onboarding-flow/controller/editors + retry-integration + profile-settings + model-settings 共 84 用例，82 过；2 败（`approved close button`、`catalog choices`）为**基线同败**的预置 rig 问题，与本次改动无关。
- 全量 1908 用例：1861 过 / 41 败 / 4 取消；失败集合是改动前基线（42 败）的**严格子集**——零新增失败。基线失败均为本机环境预置项（Windows 路径分隔符断言、PGlite/备份类深用例、时序敏感用例），不接触 onboarding/editor 路径。
- ONB-12a…12j 全部通过；TDD 红灯证据：实现前 8 个目标用例精确失败、其余全绿。
- `tsc --noEmit` 通过。
- 环境说明：本机系统 Node 20 不满足 `.nvmrc`(24),`npm test` 字面 glob 及 `Promise.withResolvers` 在其下不可用（预置现象）；验证使用便携 Node 24.21.0，不改系统环境。

### 真实 Electron 冒烟（编译版应用 + 离线守卫）

`node scripts/smoke-onboarding.mjs`:12 组检查全过，证据 `docs/evidence/onboarding/windows-electron.json`(0 渲染错误、0 网络请求、离线守卫 6 项预检拒绝 + 运行期 0 尝试）。其中本次新增/反转：

- ONB-12k：主题步 Escape 与点遮罩（`mouse.click(8,8)`）均不关闭；无「暂时退出引导」与内置 Close 按钮。
- ONB-12l：资料步同上（恢复对话框 Escape 关闭的非引导行为保持不变）。
- ONB-12m：文本/文生图模型步无 X、Escape 不关闭。
- ONB-12n：欢迎页 Escape 不关闭；「开始创作」显式完成并回焦点账号菜单。
- ONB-12o：短流程文本步 Escape 不关闭；删除冗余再触发步骤。
- 既有 ONB-01…11 组（含原生关窗重启恢复、暂不配置终点、焦点陷阱、缩放可达性、Key 不落盘）全部保持。

## 文档同步

- v3 旧条款就地标注取代：product-design `:29/:33/:45`、research `:28/:30/:36`、ui-design `:35/:56`、technical-design `:31/:67/:69`、test-cases `:10/:17/:25`。
- `design/onboarding/README.md` 附 2026-10-12 修订说明；approval-v3.json 哈希绑定的预览稿不改（归档资产）。
- `docs/requirements-traceability.json` onboarding 块追加 revisions 条目，状态 `implemented-validated`。

## 行为契约（验收对照）

| 约束 | 落实 |
|------|------|
| 全部是模式对话框 | Base UI `modal` 默认 true 保持（焦点囚禁/锁滚动/外部指针禁用），单测断言 `modal===undefined` 锁定 |
| 都没有关闭按钮 | 自绘 X 全删、内置 X 全部 `showCloseButton={false}`、缺模型提示「暂时退出」删除；单测 + 冒烟双重断言 |
| 点对话框外不关闭 | 引导模式全部 `disablePointerDismissal`；冒烟真实鼠标点遮罩验证 |
| 只能前进/回退/完成 | 退出仅剩显式动作：继续/返回/跳过/重新选择或添加/开始创作/暂不配置；Escape 任何时刻被 `cancel()` 否决 |
| 通过所有测试 | 见上：目标 82/84（2 败为基线预置）、全量零新增失败、真实冒烟 12 组全过 |

## 范围外观察（不属本任务）

- `startup-backup/`（本机注册表启动项真实备份）未纳入 `.gitignore`，存在误提交风险，建议另案处理。
- 本机 Node 版本与 `.nvmrc` 不符（20 vs 24），建议统一工具链。
