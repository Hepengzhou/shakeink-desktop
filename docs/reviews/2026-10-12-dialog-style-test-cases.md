# 对话框样式专项测试用例

日期：2026-10-12。依据用户批准的第二版与 `dialog-style-plan.md`。技术方案与本用例已依次独立审核通过，进入目标 TDD；审核结果见 `dialog-style-plan-review.md` 与 `dialog-style-test-review.md`。

## 本轮目标用例

| ID | 验证内容 | 证据层 |
| --- | --- | --- |
| DIA-01 | 两主题共享 Dialog 的遮罩计算为 rgba(0,0,0,.10)，标准/prefixed backdrop-filter 无虚化，背景元素 filter 不被改；实体框有主题轻阴影且原 ring 保留 | 实际 Base UI/React + 当前产品 CSS，Windows Electron |
| DIA-02 | 宽设置框轻阴影与共享框一致，不出现旧 30px/100px 重影，880px布局/原两栏保持 | 浏览器设置类与共享框、真实 SettingsDialog Electron |
| DIA-03 | 嵌套 Dialog 保留 Base UI 单层遮罩；顶层 Escape 后父层保留、焦点返回；普通框外点关闭、焦点回触发器，Tab 不进入背景 | 实际共享组件，真实设置/快捷键嵌套确认 |
| DIA-04 | 不可关闭引导保持 Escape/外点阻挡、无关闭按钮；此次遮罩样式不改变 guard/disablePointerDismissal | 实际 guard+共享组件；真实 OnboardingController Electron |
| DIA-05 | 规划居中 form/detail 与右侧详情均使用10%黑色遮罩、两主题轻阴影，删除后置foreground 35%和侧边旧阴影；居中/420px右侧布局保持 | 产品 CSS probe 明确标记；源码4分支覆盖检查；真实规划表单及侧详情 Electron |
| DIA-06 | 原创作向导内部详情为局部10%无遮罩虚化/轻阴影；关闭详情只关闭内层，主向导继续显示，局部两层加深19% | 实际 CreateNovelDialog 配本地目录响应夹具；真实向导 Electron |
| DIA-07 | 试验场 active 配置弹出层10%+无虚化，sc-config采用对话阴影；draft内联ConfigForm保持既有shadow-2，无全屏/局部对话遮罩 | 原 ScenarioPanel/ConfigForm 或明确CSS probe；真实试验场配置 Electron |
| DIA-08 | 菜单、Select/Combobox、Tooltip、伏笔dialog-role浮窗及内联卡片不被专属样式命中，不产生对话遮罩；保留既有主题shadow-2 | 实际定位UI组件+明确阴影probe，源码排除项差异审核；真实账户菜单 |
| DIA-09 | 完整覆盖清单仍包含55共享使用位置、4规划模态分支、向导第二层和试验场配置层；全部绑定真实公共样式入口，未引入设计资源或全局role选择器 | 源码范围台账/独立code review，不计55个业务用例 |
| DIA-10 | 真实Windows Electron编译产物、隔离本地作品/目录、无模型与Key；两主题现场组件/计算样式/截图，无拟议CSS注入，无HTTP服务与供应商请求 | 实际目标进程记录；未执行的平台/安装包/物理输入不标为通过 |

## TDD 与运行顺序

新增 `tests/browser/dialog-appearance.test.ts`，仅验证此次视觉及必要交互。先在未修改的产品上运行，确认共享blur、缺少轻阴影、规划旧遮罩/阴影、向导和试验场旧遮罩等目标断言失败；不要用接口错误、截图缺失或环境错误作为红灯证据。红灯记录写 `docs/evidence/dialog-style/red.tap`。

完成五文件修改后重跑同一文件，绿色记录写 `green.tap`。只额外运行与关闭契约直接相关的现有 `tests/browser/desktop-modal-commands-review.test.ts`，按实际结果记录；不运行全量测试或通配其它目录。必要 UI 构建用当前 Node24，为真实 Electron 使用新编译CSS/TSX，不将构建记为测试通过。

`scripts/smoke-dialog-style.mjs` 只验证本轮目标：普通/宽框、设置嵌套确认、向导与内部详情、规划表单/时期侧详情、试验场active弹出和draft内联、引导、账户菜单。每类逐条记录成功，不能仅启动后截一张图。可在本地真实数据库预先建立最小夹具；禁止把浏览器API夹具当本地业务成功。真实原组件的键鼠交互使用Playwright/CDP，明确不等同物理OS输入。

## 隔离与判断标准

所有夹具不含个人资料或Key；模型始终零配置，测试不触发生成。浏览器测试编译真实当前CSS；若抽取原JSX/重命名CSS module selector或stub无关组件，明确记录probe/夹具范围，Electron另行覆盖真实自绘组件。阴影验证需同时检查外投影两段与ring/原border，不能只看box-shadow非none；阴影中的paper `.08` 不应被误改成遮罩 `.10`。

颜色应按浏览器归一化值比较；Tailwind当前bg-black/10可能为oklab同色，缺少专属CSS时应规范颜色后判断，再以虚化/阴影产生真实红灯。支持前缀属性时验证none，不支持时记录不适用，不以undefined当失败。动画需先稳定后读取，屏幕/DPR比例据实核对；自绘第二层覆蓋范围和侧边位置不能改变。

最终结论仅覆盖本轮样式及列明的相关交互，不承诺29业务面板/供应商/macOS/安装包全部验收。未执行或失败项保留真实状态；产品相关用例及实际Windows检查全部通过后再给本轮完成总结。
