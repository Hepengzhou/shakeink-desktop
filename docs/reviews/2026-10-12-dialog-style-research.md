# 弹出对话框样式调研

日期：2026-10-12（Asia/Shanghai）。阶段更新：用户已批准第二版 HTML 设计并授权继续；原调研及预览结果保留，实施与产品验收另记。

当前设计第二版：依据用户“对话框的背景可以再稍暗一点，不要暗太多”的反馈，将遮罩从首版 8% 调至 10%，轻阴影数值、无虚化及弹出框排除边界均保持。随后用户明确“UI 设计稿审核通过，可以继续”；原生系统对话框保留系统样式的设计边界一并确认。

## 最新要求

所有应用内弹出对话框取消背景虚化，只对背景轻微加深，框周围有轻阴影。各类弹出框不适用。本轮交付顺序为调研文档 → HTML UI 设计稿并由用户审核 → 实现 → 当前目标相关测试 → 总结。用户明确禁止全量测试，此要求覆盖 AGENTS.md 中原先的全量验证约定；本轮明确要求设计审核，也覆盖旧批准记录的自动推进条款。

仓库已有未提交的 AI 发送选项变更，本轮保留其内容。上游目录不修改、不引用；真实 React 组件和业务内容继续复用，设计产物不进入产品运行链路。

## 源码事实与覆盖边界

| 分类 | 当前实现及证据 | 本轮处理 |
| --- | --- | --- |
| 通用模态对话框 | `src/components/ui/dialog.tsx:26–69` 使用 Base UI Backdrop/Popup；遮罩为 `bg-black/10` 加 `supports-backdrop-filter:backdrop-blur-xs`，内容有细 ring，没有通用外阴影 | 移除虚化，统一轻遮罩与轻阴影 |
| 桌面及业务对话框 | 源码共有 55 个 `<DialogContent>` 使用位置；包括设置、用户/模型编辑、引导、快捷键、恢复、模板、新建作品/试验场、删除/重命名、业务编辑、评分/改进和图片预览 | 由通用组件覆盖，保留尺寸、内容和已有行为 |
| 设置框专属重阴影 | `src/app/desktop.css:94` 的 `.desktop-settings` 使用 `0 30px 100px #0004,0 4px 20px #0002` | 改为统一轻阴影，防止专属规则继续覆盖 |
| 规划自绘模态框 | `PlanningWorkspace.tsx:3410,3458,3485,3548` 的四组渲染分支；`planning.module.css:346–367,429–430` 的 `.dialog` 后一规则混入 foreground 35%；普通表单/详情无统一阴影 | 同步轻黑遮罩及表单/详情阴影；侧边详情是模态对话框，同样适用 |
| 规划侧边详情 | `planning.module.css:986–997` 的 `.eventDrawer > .detail` 有 `-10px 0 35px #0002` 阴影 | 保留侧边布局，统一轻阴影 |
| 创作向导内部模板详情 | `CreateNovelDialog.tsx:468–519`：自绘第二层，当前 `bg-black/45 dark:bg-black/60`，内容 `shadow-2`；不带 `aria-modal` | 纳入对话层，降低局部遮罩和阴影；保留只关闭详情的分层行为 |
| 试验场配置层 | `content/scenario/ScenarioPanel.tsx:217–234`：覆盖业务区的配置表单，遮罩 `bg-black/20`；没有 `role=dialog` | 按阻断背景的配置对话层纳入；保持业务区覆盖范围 |
| 各类弹出框 | `ui/dropdown-menu.tsx`、`ui/select.tsx`、桌面供应商/模型选项，伏笔关联和预览浮窗；`foreshadow/use-editor-references.tsx:71`、`preview-references.tsx:193` 虽可能使用 `role=dialog`，实际为定位弹出框，无模态遮罩 | 排除；不得用全局 `[role=dialog]` 或通用 shadow 令牌修改它们 |
| 非对话层遮罩 | 场景窄屏目录、图片 hover、拖拽预览等 | 排除；不得把全项目 `bg-black/*` 批量替换 |
| 原生系统对话框 | `window.confirm`、`desktop/main/index.ts` 的 `dialog.showMessageBox/showErrorBox`、目录/头像/导入导出选择器 | 由操作系统绘制，renderer CSS 不可控制；设计稿明确列为系统样式边界，待随 UI 稿确认。独立启动恢复窗口内的应用 React 页面不属于系统绘制对话框，不能混为一类。此处不将系统框宣称为已统一样式 |

独立范围审核及完整路径清单：[dialog-style-scope-review](2026-10-12-dialog-style-scope-review.md)。源码位置是调研快照，正式实施与验收按最终路径重新核对。

## 嵌套与主题

本机 Base UI 的 `node_modules/@base-ui/react/dialog/backdrop/DialogBackdrop.mjs:17–47` 默认 `forceRender=false`，`enabled: forceRender || !nested`；真正嵌套的 Dialog 默认不额外渲染 Backdrop。不能声称所有嵌套对话框的遮罩必然逐层叠加。设置/编辑框等同级独立 Dialog 及手工详情遮罩需另测。

第二版主遮罩拟统一 `rgba(0,0,0,.10)`，比首版增加 2 个百分点。独立第二层若遮罩叠加两次，局部背景加深为 `1-(1-.10)^2=19%`（首版为 15.36%）；标准单层为 10%。不新增全屏第二层遮罩来修改现有交互。

宣纸轻阴影拟为 `0 12px 32px rgba(96,74,38,.14), 0 2px 8px rgba(96,74,38,.08)`；玄墨拟为 `0 12px 32px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.18)`。保留原有细描边帮助深色主题分层。`globals.css:163–165,235–237` 的通用 `--shadow-1/2/3` 同时用于菜单和卡片，不能为此次需求全局更改；应新增仅对话框使用的令牌。

隔离的现有编译版 Windows Electron 采集到当前通用遮罩 `backdrop-filter: blur(4px)`，拟议样式计算值为 `none`，并非依据 `xs` 名称估算；实际值记录在 `design/dialog-style/preview-observations.json`。

`backdrop-filter`、`-webkit-backdrop-filter`、对背景的 `filter:blur()` 均应为 none。阴影自身的扩散不属于背景虚化。保留原有动画、焦点、Escape/外部点击、引导不可关闭、按钮状态及手动/即时保存语义。

## 审核稿与后续实施

HTML 设计稿位于 `design/dialog-style/index.html`，展示真实隔离 Electron 组件的当前/拟议截图，以及自绘模态样式示意。预览仅临时覆盖其独立进程的 CSS，不改产品源码，不创建真实模型，不使用用户资料或 Key。预览结果只证明审核材料成功渲染。

用户确认后再形成并独立审核技术方案与测试用例；先写会失败的目标用例，再实施通用样式及自绘对话层，完成独立 code review。届时更新 `requirements-traceability.json` 和 `migration-map.json` 的本轮范围与真实结果。

本阶段已采集 24 张真实组件对照图、检查 HTML 的 36 组主题/场景/对照状态，均通过设计材料检查；两主题账户菜单当前/拟议图像各自完全一致。没有实现产品样式或运行产品测试。两份台账仅新增 `design-awaiting-user-review` 状态，不改变其他任务结果。独立设计复核见 [dialog-style-design-review](2026-10-12-dialog-style-design-review.md)。

第二版完成相同范围的重新采集与设计预览检查（24 条截图记录、36 组 HTML 状态），结果通过。当前证据标注 `v2`、遮罩透明度 `0.10`；无产品或全量测试。阴影参数未调整，菜单两主题对照仍完全一致。

仅运行本目标相关测试：通用遮罩/阴影、各对话层覆盖清单、宣纸/玄墨、嵌套、规划侧边详情、向导内部详情、试验场配置，以及菜单/下拉/伏笔浮窗不受影响；真实 Windows Electron 验证使用隔离目录。按相关交互检查焦点、Escape、背景阻断及引导不可关闭，禁止全量单元/集成/浏览器测试与全量回归。未执行的原生平台、安装包和业务验收据实保留，不以设计预览替代产品通过。
