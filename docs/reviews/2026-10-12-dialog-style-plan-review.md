# 对话框第二版技术方案独立审核

日期：2026-10-12。审核对象：`2026-10-12-dialog-style-plan.md` 与方案涉及的真实样式/组件入口。用户已批准第二版 10% 遮罩设计并授权继续；本审核不重新请求 UI 批准。本代理只读源码及现有编译 CSS，未实施产品、未运行测试或构建；唯一写入为本文件。

## 阶段结论

**无阻断问题，可进入目标测试用例编写及独立审核阶段。** 五文件范围足以覆盖共享 Dialog、自制规划模态、向导内详情和试验场配置覆盖层。方案明确处理设置重阴影、规划后置 foreground 规则、侧详情旧阴影与内联配置隔离；共享 ring 保留方式与仓库实际 Tailwind 输出一致。原生边界已随第二版设计获批，保持原生流程合理。

该结论只确认技术方案可实施，不代表样式已修改或任何测试通过。下一阶段仍应先审核用例、运行会失败的新增目标用例，再进行实现和 code review。

## 五文件范围核对

| 文件 | 现有源码证据 | 方案判断 |
| --- | --- | --- |
| `src/components/ui/dialog.tsx` | `:34` 共享背板含 `bg-black/10` 与 `supports-backdrop-filter:backdrop-blur-xs`；`:52–56` 每个 DialogContent 生成 Portal/Backdrop/Popup，内容已有 `ring-1 ring-foreground/10` | 去掉虚化类、加入专属遮罩/面板类可统一 55 个使用位置；不需改调用方的尺寸或关闭属性 |
| `src/app/desktop.css` | `:94` 设置框重阴影会覆盖同级专属类；现有通用阴影还供 popup/卡片使用。`src/app/layout.tsx:3–4` 按 globals→desktop 导入 | 新专属 token/class、删除设置重阴影并定向覆盖弹出 sc-config 可行；不要更改全局 shadow token |
| `src/components/content/planning/planning.module.css` | `:346–367` 为固定模态罩和表单/详情实体；`:429–430` 后置 foreground 35% 覆盖；`:986–997` 为靠右详情布局和旧侧影 | 方案已覆盖真实最终背景规则及旧侧影；只改样式，不必重写 `PlanningWorkspace` 四个分支 |
| `src/components/layout/CreateNovelDialog.tsx` | `:471` 局部背板 45%/60%，`:475` 实体 shadow-2；`:289–296` 有 Escape 分层处理；`:468` 注释明确对话框内第二层 | 替换这两个样式类即可；保留局部 absolute 范围、事件和父 Dialog 逻辑，满足不新增全屏遮罩 |
| `src/components/content/scenario/ScenarioPanel.tsx` | `:217–233` 仅 active 配置覆盖层使用局部 20% 背板，当前 wrapper 直接包 ConfigForm；`ConfigForm.tsx:92` 根为 `.sc-config`，同组件也有内联用途 | 只在弹出 wrapper 加 `.desktop-scenario-dialog`，通过直接子选择器赋阴影可隔离内联配置；不需要改 ConfigForm |

## ring 与 CSS 层级

现有编译结果 `out/_next/static/chunks/3k6zn05ueu889.css` 的 `.ring-1` 实际 box-shadow 顺序为 `--tw-inset-shadow`、`--tw-inset-ring-shadow`、`--tw-ring-offset-shadow`、`--tw-ring-shadow`、`--tw-shadow`。相应 `@property` 均为 `inherits:false`，初值 `0 0 #0000`。

方案保留前四层，并以 `--desktop-dialog-shadow` 替换末尾普通外投影，符合统一轻阴影且保留既有细 ring 的目标。实现时各保留层应使用透明零影 fallback，避免无 Tailwind 初始化的独立 CSS probe 因变量缺失而使整个 box-shadow 失效。规划和试验场已有 border，应仅使用专属外投影，不复制共享 ring。

桌面普通样式与共享 Tailwind utilities 的级联需由专项计算样式用例确认；计划删除 `.desktop-settings` 的独立 box-shadow、清除规划后置背景及 eventDrawer 的旧 box-shadow，已经消除已知覆盖源。不能仅在文件前部加一条新规则后保留这些覆盖源。

## 局部覆盖与交互边界

`globals.css:1197–1201` 的 `.scpane .sc-config` 仍应保留原 `var(--shadow-2)`；只让 `.desktop-scenario-dialog > .sc-config` 取得专属对话阴影。该选择器与现有 `.scpane .sc-config` 都为两个 class 的 specificity，且桌面样式在 globals 后导入，范围与级联方式可实施；专项用例应同时读取弹出与内联实例的计算阴影。

`PlanningWorkspace.tsx:3410/3458/3485/3548` 的四组 `role="dialog" aria-modal="true"` 由同一 `.dialog` 与 form/detail 子样式覆盖；本次不改其焦点/Escape 管理。`node_modules/@base-ui/react/dialog/backdrop/DialogBackdrop.js:24,29,48` 明确 `forceRender=false`、读取 nested、`enabled: forceRender || !nested`，方案不新增 Base UI 背板，保留嵌套语义。手工向导内背板仍存在于原局部区域，两层 10% 合成 19%，不应为了统一样式修改 DOM 层级或关闭规则。

方案没有使用全局 `[role=dialog]` 或所有 Popup，故不会因为伏笔浮窗的 dialog role 而误纳入；菜单、选择候选、tooltip、搜索/导航展开和内联卡片的排除范围合理。第二版原生系统确认、启动错误、文件/目录选择器保留系统绘制边界已获批，不需要转换确认流程；应用 React 恢复页面不可被误归为原生系统框。

## 后续验证约束

后续目标用例至少需证明：两主题共享遮罩 10% 且两种 backdrop-filter 为 none；共享 ring 与新投影同时保留；设置重影已移除；规划最终背景和侧详情阴影正确；向导局部第二层仍能分层关闭；试验场弹出配置取得专属阴影而内联保持原影；菜单/选择/伏笔等排除项不变。焦点、Escape、引导不可关闭与背景阻断只检查受这次改动影响的场景，不扩大为全业务回归。

方案将数据接口夹具/抽取 JSX/CSS probe 与真实 Electron 证据明确分开，符合台账要求。浏览器 CSS 用例不能抵作完整业务验证，真实 Windows 场景不能抵作 macOS、物理输入或安装包验收。允许构建生成真实运行产物，但禁止 `npm test`、通配全部用例或全量回归；这与用户最新“只测当前目标相关测试”一致。

本审核已读取方案、五文件相关片段、规划四分支、布局样式导入、ConfigForm 根与原 sc-config 样式、Base UI 本地 Backdrop 实现，并用 `rg -o` 读取现有编译 CSS 的 ring/property 定义。未执行任何测试命令，未修改这些来源。
