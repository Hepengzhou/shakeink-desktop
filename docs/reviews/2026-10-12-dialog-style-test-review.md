# 对话框样式专项用例独立审核

日期：2026-10-12。审核对象：`2026-10-12-dialog-style-test-cases.md`。依据已获批的第二版 UI 与已通过的五文件技术方案。本代理只读用例和相关现有源码/测试，未运行测试、构建或产品；唯一写入为本文件。

## 阶段结论

**无阻断问题，可进入目标 TDD。** DIA-01 至 DIA-10 覆盖此次全部样式入口、两主题、ring、已知后置覆盖、局部/嵌套遮罩及排除项。新增文件明确只测本目标；额外的现有 modal commands 文件直接检查 Escape 与背景命令阻断，属于必要相关回归，不是全量测试。

本结论批准用例设计进入红灯阶段，未宣称新用例已经存在、执行或通过。新增测试与真实 Electron 记录应按下面的证据层和四分支台账执行，保持拟议 CSS 注入、probe、浏览器接口夹具与真实平台业务证据之间的区分。

## 10 个目标组核对

| 目标 | 审核判断 |
| --- | --- |
| DIA-01 共享框 | 10% 两主题遮罩、标准/prefixed filter、原背景 filter、两段外影及原 ring 都有明确断言，不能只检查 shadow 非 none |
| DIA-02 设置框 | 检查已知 30px/100px 专属重影、共享轻影和原两栏/880px布局，直接对应 desktop.css 修改 |
| DIA-03 嵌套与普通关闭 | 单层 Base UI 背板、关闭顶层保留父框、焦点返回、外点和 Tab 阻断涵盖样式变动的相关交互 |
| DIA-04 不可关闭引导 | guard、disablePointerDismissal、无关闭按钮、Escape/外点拦截明确；使用真实控制器补充浏览器 guard 夹具证据 |
| DIA-05 规划 | 居中 form、居中 detail、右侧 detail 三种 CSS 形态都包含；后置 foreground 背景与侧影覆盖均有对应目标 |
| DIA-06 向导内详情 | 局部第二层 10%、无虚化、轻影、19% 合成及只关详情明确；浏览器目录响应夹具不冒充真实本地数据业务 |
| DIA-07 试验场 | active 弹出与 draft 内联共同检查，避免给复用 sc-config 全局换影；已有 shadow-2 和无对话罩的内联实例应保持 |
| DIA-08 排除弹出框 | Menu、Select/Combobox、Tooltip、伏笔 dialog-role 浮窗、内联卡片列明；实际定位组件与 probe/源码检查各自标注 |
| DIA-09 范围台账 | 55 使用位置和四分支仅是源码覆盖台账，不当作 55 业务通过；检查真实样式入口、不引入设计资源及全局 role 选择器 |
| DIA-10 真实 Windows | 新编译产物、隔离目录/本地作品、零模型与 Key、无拟议 CSS、逐类组件证据明确；不宣称其他平台/安装包/物理输入通过 |

## 红灯与专项命令边界

红灯应来自共享 blur 仍为 4px、缺少规定投影、规划旧 foreground 背景/侧影、向导和试验场旧遮罩等样式差异，而不能来自 Chromium 路径、数据夹具、组件编译、网络请求、截图资产或环境失败。现有共享 `bg-black/10` 与新 10% 在颜色上本来同值，用例说明正确要求归一化 oklab/rgb 后比较，避免把颜色序列化差异当失败。

测试应先确认预期对话实体/遮罩确实存在，再读样式，避免对空列表 `.every()` 产生误通过；前缀不支持时记录不适用，支持时断言 none。动画稳定后读取样式/DPR，不改变对话定位或交互来迎合断言。

允许的新测试入口为 `tests/browser/dialog-appearance.test.ts`；复跑同一文件并记录 red/green。额外允许的 `tests/browser/desktop-modal-commands-review.test.ts` 当前源码包含真实 Base UI Dialog/AlertDialog、原命令控制器、Escape 与背景命令/剪贴板阻断；它的 native clipboard/main IPC 是内存观察边界，不是 Electron 验收。运行前使用当前编译 CSS，避免旧 `.next` 结果掩盖产品改动。

`scripts/smoke-dialog-style.mjs` 应按本目标逐场景记录，允许真实数据库预置最小隔离夹具，不触发模型调用。Playwright/CDP 键鼠不是物理 OS 输入。构建用于生成新 CSS/TSX，不算测试通过。不得执行 package.json 的全量 `npm test` 或通配测试目录。

## 规划四分支的覆盖台账

源码四分支不是四种独立业务验收的替代物，也不应仅写“四分支已通过”而省略证据层。DIA-05/09 的实施记录应按以下真实标签逐项列出来源、CSS 断言和实际执行状态：

| 分支与源码 | 样式形态 | 已计划的证据与记录要求 |
| --- | --- | --- |
| `period-detail`，`PlanningWorkspace.tsx:3398–3412`，时期详情 | `.dialog.eventDrawer > .detail` | 右侧 CSS probe；真实时期侧详情 Electron 已列为目标 |
| frozen `period`，`:3452–3462`，冻结时期详情 | `.dialog > .detail` | 居中 detail CSS probe、源码绑定检查；没有实际打开时不可标为真实平台通过 |
| `event-detail`，`:3475–3489`，事件详情 | `.dialog.eventDrawer > .detail` | 同右侧 CSS 入口与源码绑定；是否实际打开须逐项据实记录，不能用时期详情截图假称事件详情已执行 |
| 通用动态业务表单，`:3546–3552` | `.dialog > form` | 居中 form CSS probe；真实规划表单 Electron 已列为目标 |

这里要求明确证据层，不要求把本次纯样式任务扩成全部规划业务操作或 29 面板回归。源分支共用 CSS 的覆盖证明可记为样式入口覆盖；完整业务/实际目标组件操作仅依据实际执行记录判断。若后续真实检查扩到冻结/事件分支，应仍保持同一目标范围和隔离目录。

## 审核依据与状态

已读取用例文档、现有 modal commands 测试及 package.json 指定测试入口，并核对规划四个真实分支的 label、className 与 form/detail 根。技术审核已确认五文件真实样式入口、ring 组合、规划后置规则、试验场直接子隔离和 Base UI 嵌套行为，本轮不重复进行产品执行。

原生确认/文件选择系统边界随第二版 UI 获批，本组用例无需转换原生流程，也不得把原生样式宣称为 renderer 已统一。后续仅在列明目标用例和实际 Windows 检查完成后总结，通过/失败/未执行均须真实记录。
