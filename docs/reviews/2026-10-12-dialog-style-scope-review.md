# 对话框样式范围独立审核（2026-10-12）

审核范围：`src`、`desktop` 与当前安装的 Base UI 对话框实现。只读源码审核；本文件是唯一写入产物。未修改产品源码，未运行测试，未把静态扫描记为界面验收。当前阶段止于调研和待用户审核的 HTML 设计稿。

## 独立结论

“只修改 `src/components/ui/dialog.tsx`”不能覆盖用户所说的所有弹出对话框：真实源码除 55 个共享 `DialogContent` 使用位置外，还有规划工作区的 4 个模态分支、新建作品向导内的手工详情层、试验场配置覆盖层，以及浏览器/Electron 原生对话框。必须在调研和 HTML 中逐类明确范围。

建议统一应用自己绘制的任务/表单/确认/详情对话层：背景保持清晰，用低透明度的黑色遮罩轻微加深；实体对话面板使用独立的对话框阴影变量。不要改通用 `--shadow-2`，也不要对所有 `[role="dialog"]` 或所有 `.Popup` 加样式；这样会越界影响用户明确排除的弹出框。

HTML 审核应至少出现宣纸/玄墨主题、普通确认、宽设置框、嵌套框、规划侧详情框和一个菜单/选择弹出框的对照。原生系统对话框无法通过 renderer 的 CSS 设置背景虚化或面板阴影，应在设计稿明确这一事实与拟保留的系统范围，不能直接宣称共享样式覆盖了它们。

## 当前样式证据

| 来源 | 实际证据 | 对统一方案的影响 |
| --- | --- | --- |
| `src/components/ui/dialog.tsx:34` | 共享 Backdrop 采用 `bg-black/10`，并有 `supports-backdrop-filter:backdrop-blur-xs` | 当前用户反对的背景虚化来自这里；统一删除/禁用虚化应针对这个模态遮罩 |
| `src/components/ui/dialog.tsx:52–56` | 每个 `DialogContent` 建立 Portal、Backdrop 和 Popup；Popup 有 `ring-1 ring-foreground/10`，没有显式外投影 | 阴影应统一加到实体 Popup，且不移除现有轮廓和行为 |
| `src/app/desktop.css:94` | `.desktop-settings` 另有 `0 30px 100px #0004, 0 4px 20px #0002` 阴影 | 只增加共享阴影仍会被设置专属阴影覆盖；需纳入设计，保留既有两栏尺寸 |
| `src/components/content/planning/planning.module.css:346–367,429–430` | 手工 `.dialog` 原先 `#0006`，后由 `color-mix(in srgb, var(--foreground) 35%, transparent)` 覆盖；普通表单/详情无外投影 | 明显比共享 10% 遮罩更重；玄墨中 foreground 为亮色，效果是提亮而非黑色加深，不能只改第 350 行 |
| `src/components/content/planning/planning.module.css:986–997` | `.eventDrawer` 靠右，详情已有 `-10px 0 35px #0002` 阴影 | 保留侧详情布局，以同一对话阴影原则处理，勿改成居中框 |
| `src/components/layout/CreateNovelDialog.tsx:467–476` | 源码明确称“对话框内第二层覆盖”；内背板 `bg-black/45 dark:bg-black/60`，面板 `shadow-2` | 没有 role 属性仍属于对话框内详情对话层；搜索 `aria-modal` 无法发现 |
| `src/components/content/scenario/ScenarioPanel.tsx:217–232` | 运行态“配置”按钮打开覆盖层，局部 `bg-black/20`，内部 `ConfigForm` | 与锚定候选弹出框不同，建议明确纳入应用绘制的配置对话层；保持业务区覆盖范围 |
| `src/components/content/scenario/ConfigForm.tsx:92`、`src/app/globals.css:1197–1201` | `sc-config` 也用于内联配置，阴影为 `var(--shadow-2)` | 样式必须限定到弹出实例，不能改所有 `sc-config` 或共用阴影变量而连带修改内联版本 |
| `src/app/globals.css:163–165,234–237` | 主题 `shadow-2` 同时供菜单、浮层使用；玄墨 `shadow-1/3` 为 none | 为对话框定义专属 token 比修改全局既有阴影档位更安全；应据本次新要求在两主题都给对话框轻微阴影 |

## 共享 DialogContent 使用清单

以下是 `rg -n '<DialogContent' src/components --glob '*.tsx'` 得到的 55 个位置。一个位置可能服务多个真实状态，此数值是源码使用位置数，不是业务用例数。

| 文件 | 行号 | 真实用途 |
| --- | --- | --- |
| `src/components/admin/PromptsClient.tsx` | 318、389 | 新建、删除提示词模板 |
| `src/components/layout/SidebarTree.tsx` | 704、747、2139、2192、2258、2304 | 伏笔角色重命名/转正式角色/揭示/删除；小说、世界与试验场的新建、重命名、删除 |
| `src/components/layout/CreateNovelDialog.tsx` | 324 | 新建作品向导 |
| `src/components/layout/ScenarioCreateDialog.tsx` | 103 | 创建情景试验场 |
| `src/components/layout/OutlineTreeMenu.tsx` | 149 | 大纲树业务操作 |
| `src/components/foreshadow/references.tsx` | 160 | 选择触点关联 |
| `src/components/score/ScoreIndicator.tsx` | 169 | 评分详情 |
| `src/components/score/ImproveContentDialog.tsx` | 203 | AI 内容优化 |
| `src/components/desktop/SettingsDialog.tsx` | 61 | 设置 |
| `src/components/desktop/ProfileSettings.tsx` | 96 | 用户资料编辑/引导 |
| `src/components/desktop/ModelConfigurationDialog.tsx` | 145、173 | 模型编辑/引导、连接测试结果 |
| `src/components/desktop/ModelSettings.tsx` | 41、42 | 停用、删除模型 |
| `src/components/desktop/ModelRequiredDialog.tsx` | 23 | 模型缺失与应用结果 |
| `src/components/desktop/OnboardingController.tsx` | 66、69 | 新手引导各步骤、已删除模型提示 |
| `src/components/desktop/ShortcutSettings.tsx` | 123、137、151 | 快捷键录制、嵌套冲突、恢复默认 |
| `src/components/desktop/ConfigurationTransfer.tsx` | 60 | 配置导入预览 |
| `src/components/desktop/TemplateManagementDialog.tsx` | 45、50 | 模板与提示词管理、导入模板预览 |
| `src/components/desktop/WizardTemplatesClient.tsx` | 41 | 删除创作模板 |
| `src/components/desktop/RecoveryDialog.tsx` | 26 | 异常草稿恢复 |
| `src/components/desktop/WorkLeasePendingDialog.tsx` | 26 | 作品锁交接待处理 |
| `src/components/desktop/DesktopApp.tsx` | 185 | 关闭/迁移期间提示 |
| `src/components/content/AttributesPanel.tsx` | 270、374 | 属性创建/编辑、删除 |
| `src/components/content/EntityAttributesEditor.tsx` | 262 | 给实体添加属性 |
| `src/components/content/CharacterPanel.tsx` | 869、902 | 删除角色、AI 生成草稿 |
| `src/components/content/SettingPanel.tsx` | 302、335 | 删除设定、AI 生成设定 |
| `src/components/content/ForeshadowPanel.tsx` | 113、439 | 新增触点、删除伏笔 |
| `src/components/content/ItemPanel.tsx` | 366 | 删除物品 |
| `src/components/content/TropePanel.tsx` | 237 | 创建套路 |
| `src/components/content/LevelSystemEditor.tsx` | 980 | 重命名途径/等级 |
| `src/components/content/CreateLevelSystemDialog.tsx` | 98 | 创建等级体系 |
| `src/components/content/OutlinePanel.tsx` | 346 | 重新生成大纲 |
| `src/components/content/ChapterConflictDialog.tsx` | 41 | 正文版本冲突比较 |
| `src/components/content/DraftConflictTools.tsx` | 42 | 业务草稿冲突比较 |
| `src/components/content/ChapterFinalizationDialog.tsx` | 28 | 正文定稿 |
| `src/components/content/ChapterHistory.tsx` | 179 | 正文历史版本 |
| `src/components/content/scenario/ScenarioPanel.tsx` | 238 | 重置试验场 |
| `src/components/content/scene/SceneWorkspace.tsx` | 69 | 创建根/子场景 |
| `src/components/content/scene/SceneEditor.tsx` | 105 | 场景移动、删除 |
| `src/components/content/scene/SceneImagePanel.tsx` | 47 | 场景原图预览 |

## 自制对话层与嵌套风险

`src/components/content/planning/PlanningWorkspace.tsx:3409–3412` 的时期详情、`:3457–3460` 的冻结时期详情、`:3481–3487` 的事件详情和 `:3547–3550` 的动态业务表单均带 `role="dialog" aria-modal="true"`，共同使用 `planning.module.css` 的 `.dialog`。动态表单标题清单在 `:3521–3535`，覆盖叙事线、世界线、卷、章节、归组、分配、移动、引入、删除、历史分支、时期与跨世界连接。

标准嵌套实例包括设置内用户/模型/快捷键编辑与确认，以及 `ModelConfigurationDialog.tsx:173` 的测试结果、`ShortcutSettings.tsx:136–137` 的冲突确认。当前安装的 Base UI `node_modules/@base-ui/react/dialog/backdrop/DialogBackdrop.js:25,29,48` 默认 `forceRender=false`，读取 `nested` 并仅在 `forceRender || !nested` 时渲染 Backdrop。因此不能把标准嵌套框的遮罩直接描述成“每层都叠 10%”；真实结果须通过目标界面验证。`TemplateManagementDialog.tsx:45,50` 为同级两个 Root，向导详情又是手工背板，这些情况有额外叠暗风险，应设计明确上限并验证最上层关闭后的恢复。

以上结论是源码推断，不是当前 Electron 截图结果。样式变更不可顺便改关闭规则、焦点返回、快捷键录制、冲突原子转移或现有层级。

## 必须排除的弹出框

| 来源 | 分类证据 | 本次处理 |
| --- | --- | --- |
| `src/components/ui/dropdown-menu.tsx:42–44,141` | Menu Popup/子菜单，锚定触发器，无对话背板 | 排除 |
| `src/components/ui/select.tsx:83–86` | Select Popup，锚定选项选择 | 排除 |
| `src/components/ui/tooltip.tsx:42–62` | Tooltip Popup | 排除 |
| `src/components/desktop/ModelChoiceSelect.tsx:23`、`src/app/desktop.css:147` | Combobox 模型选择候选 popup | 排除；勿因为 `data-desktop-settings-surface` 而误套对话样式 |
| `src/components/foreshadow/use-editor-references.tsx:71–76` | 虽有 `role="dialog"`，但按鼠标坐标锚定、外部点击关闭、无遮罩和 aria-modal | 排除；不能使用通用 `[role="dialog"]` 阴影/遮罩选择器 |
| `src/components/foreshadow/preview-references.tsx:193–201` | 悬停/固定伏笔浮层，仅固定态赋 dialog role，无遮罩 | 排除 |
| `src/components/chat/TaskReferenceInput.tsx:34`、`src/components/chat/MentionPopup.tsx:101` | 列表候选 `role="listbox"` | 排除 |
| `src/components/chat/SearchPalette.tsx:58–59` | 局部搜索浮层与透明点击捕获层 | 排除；勿用所有 inset-0 选择器 |
| `src/components/chat/ProgressPanel.tsx:272`、`src/components/chat/EntityHoverCard.tsx:140–141`、`src/components/chat/ComposerChipHoverCard.tsx:198–199`、`src/components/layout/SidebarHoverCard.tsx:209` | 进度/实体信息/悬停浮层 | 排除 |
| `src/components/content/scene/SceneWorkspace.tsx:61–62`、`src/components/content/scene/scene.css:4–5` | 窄布局的场景目录展开层，导航树而非业务任务对话框 | 排除；其 12% 导航遮罩保持既有行为 |

## 原生/浏览器对话框边界

这部分属于真实存在的“对话框”，不是菜单或候选 popup。它们无应用 CSS 可控制的 DOM；若本次需要改成应用绘制的对话框，涉及异步确认、启动异常与关闭/锁交接流程，已超过单纯共享样式修订。HTML 应明确原生系统外观边界后交用户审核，禁止默默漏计。

| 来源 | 行号 | 对话框用途 |
| --- | --- | --- |
| `desktop/main/index.ts` | 279、301、302、355、359、383 | `showMessageBox`：停止任务后关闭、交接未完成、保存未完成、修复作品锁、恢复结果、迁移确认 |
| `desktop/main/root-relocation-window.ts` | 69、118 | `showMessageBox`：确认原数据目录、关于应用 |
| `desktop/main/inbox-lease-recovery-window.ts` | 21、27、33 | `showMessageBox`：收件箱锁修复确认/结果/失败 |
| `desktop/main/index.ts` | 635、748、801、804、807 | `showErrorBox`：操作失败、启动数据错误 |
| `desktop/main/index.ts` | 130、160、169、237、238、242、498 | `showOpenDialog/showSaveDialog`：草稿导出、目录、作品目录、配置导入/导出、模板/稿件导出、头像 |
| `desktop/main/root-relocation-window.ts` | 61 | 系统目录选择器 |
| `src/components/comments/CommentBubble.tsx` | 92 | `window.confirm`：评论及回复删除 |
| `src/components/content/character-arc/arc-chain.tsx` | 389 | `window.confirm`：阶段删除 |
| `src/components/content/character-arc/arc-stage-editor.tsx` | 185 | `window.confirm`：阶段删除 |
| `src/components/content/LevelSystemEditor.tsx` | 888、932 | `window.confirm`：途径/等级删除 |
| `src/components/content/scenario/prose/ProseView.tsx` | 96 | `window.confirm`：重生成样文 |
| `src/components/content/scenario/beats/BeatsView.tsx` | 102 | `window.confirm`：重生成分镜 |
| `src/components/content/scene/SceneEditor.tsx` | 94 | `window.confirm`：放弃本地草稿 |
| `src/components/content/scene/SceneImagePanel.tsx` | 47 | `window.confirm`：结束原生成请求跟随 |

## 本阶段命令与审核范围

已执行的均为只读命令：`Get-Content AGENTS.md`、`Get-Content docs/implementation-boundaries.md`、`rg --files -g AGENTS.md`、`rg -n '<DialogContent' src/components --glob '*.tsx'`、对 `DialogPrimitive/aria-modal/role/createPortal/backdrop/filter/blur` 的定向扫描、对 `showMessageBox/showErrorBox/showOpenDialog/showSaveDialog/window.confirm` 的定向扫描，以及表中相关源码片段读取。

审核结果：范围清单已完成；共享 Dialog 统一入口可用，但实施方案必须包含手工对话层、设置阴影覆盖、局部内联样式隔离、标准与同级嵌套差异及原生边界。未执行任何单测、全量测试、应用构建或真实系统界面验收，也未评价尚未产生的 HTML 是否通过用户审核。
