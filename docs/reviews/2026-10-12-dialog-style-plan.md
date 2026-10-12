# 对话框样式第二版实施方案

日期：2026-10-12。用户已明确批准 `design/dialog-style/index.html` 第二版并授权继续。实施范围为应用自己绘制的模态对话层：10% 黑色遮罩、无背景虚化、两主题轻阴影。设计稿列出的原生系统对话框保留系统绘制边界随稿获批；不改原生确认/文件选择流程。

## 修改范围

| 文件 | 最小修改 |
| --- | --- |
| `src/app/desktop.css` | 新增对话专属 `--desktop-dialog-overlay` 与 `--desktop-dialog-shadow`；通用 `.desktop-dialog-overlay` 明确背景及两种 backdrop-filter none；`.desktop-dialog-surface` 组合轻阴影与原 Tailwind ring/inset 层；移除设置框专属重阴影；仅弹出试验场的 `.desktop-scenario-dialog > .sc-config` 使用对话阴影 |
| `src/components/ui/dialog.tsx` | 从共享 Backdrop 去掉 `supports-backdrop-filter:backdrop-blur-xs`，加入专属 overlay 类；Popup 加入专属 surface 类；保留 Portal、Base UI、全部尺寸、动画、ring 与关闭属性 |
| `src/components/content/planning/planning.module.css` | `.dialog` 统一专属黑色遮罩并明确无虚化，清除后置 foreground 35% 覆盖；`.dialog > form/.detail` 使用对话阴影，侧边详情移除旧阴影覆盖；保留原居中/侧边布局与四组真实渲染分支 |
| `src/components/layout/CreateNovelDialog.tsx` | 模板详情的局部第二层用专属 overlay/surface 类替代 45%/60% 遮罩及 shadow-2；点背板/Escape 只关详情行为保持 |
| `src/components/content/scenario/ScenarioPanel.tsx` | 仅 active 配置弹出层使用专属 overlay 类，内容 wrapper 加 `.desktop-scenario-dialog` 供 CSS 定向命中其 sc-config；内联 ConfigForm 不受影响 |

其余源码只读。保留已有未提交的 composer 变更，不修改父目录，不将设计 HTML、截图、示例或预览脚本并入产品。

## 样式契约

主遮罩 `rgba(0,0,0,.10)`，所有自绘对话层同值。宣纸投影 `0 12px 32px rgba(96,74,38,.14),0 2px 8px rgba(96,74,38,.08)`；玄墨 `0 12px 32px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.18)`。令牌定义在桌面样式，root 默认宣纸，`.ink` 覆盖阴影，跟随系统由既有主题类选择。

实体面板阴影不能丢失原 ring：使用 Tailwind 现有 `--tw-inset-shadow/--tw-inset-ring-shadow/--tw-ring-offset-shadow/--tw-ring-shadow` 与新增外阴影组合，各缺省为透明零影。规划和试验场自身已有 border、不使用 ring，仅用专属外阴影。不得更改全局 `--shadow-1/2/3` 或全局 `[role=dialog]`；菜单、Select/Combobox、工具提示、伏笔浮窗、搜索/导航展开及内联卡片完全排除。

Base UI 嵌套 Backdrop 默认不重复渲染，维持现有嵌套；手工向导第二层局部叠加最多 `1-(1-.10)^2=19%`。不新增背板，不改尺寸/圆角/定位/动画，不改保存/焦点/关闭规则。所需源码范围已由独立范围审核列出 55 个共享使用位置、4 个规划模态分支、2 个手工覆盖层；这些是覆盖台账，不抵作业务验收用例。

## 执行阶段与验证边界

先独立子代理审核本方案；通过后写目标测试用例并独立审核，先运行新增样式用例确认失败，再实施上述五文件，重跑相关用例并独立 code review。只运行本目标直接相关的单元/浏览器检查及 Windows Electron 场景。允许生成真实运行产物所需 UI/desktop 构建；构建不是全量测试。不运行 `npm test`、通配全部测试或全量回归。

浏览器验证使用当前产品 CSS、实际共享 Base UI 组件、原业务对话层的源码及 CSS；任何数据接口夹具/抽取 JSX/CSS probe 都明确标注，不能记为完整业务或真实平台验收。Electron 阶段使用全量真实原组件、独立工作区与零模型目录，检查设置/嵌套确认/向导详情/规划表单与侧详情/试验场配置/账户菜单，记录主题、计算样式和截图；无临时拟议 CSS，不使用个人数据/Key，不进行供应商调用。

若实际自绘业务场景需创建数据，仅在隔离夹具目录创建，并记录经过的真实 UI 路径。验证焦点、Escape/外点关闭或拦截与背景阻断；引导不可关闭的既有契约保持。Windows 的结果不冒充 macOS、物理输入或安装包验收。任何不具备条件的检查如实记录，不能用一个启动冒烟替代所有对话层。

## 台账与交付

技术/用例/代码审核文档、失败及通过记录、真实 Electron 场景清单写入本轮独立文件和 `docs/evidence/dialog-style/`。更新 `requirements-traceability.json` 和 `migration-map.json` 的批准、五文件实现路径、目标用例与结果，保留其他任务条目。完成后提供实施/相关测试总结和实际限制。
