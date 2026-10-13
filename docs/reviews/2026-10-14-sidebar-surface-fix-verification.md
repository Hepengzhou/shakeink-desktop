# 左导航滚动条与悬停卡验证

日期：2026-10-14（Asia/Shanghai）。需求：导航滚动条沿用应用样式；条目悬浮信息框完整显示在 AI 对话区域上方。

## 实现和审核

- `src/app/desktop.css` 删除导航独立的 `scrollbar-width:thin`，复用 `globals.css` 的透明轨道、主题滑块与 10px 滚动条；专属悬停浮层使用 no-drag。
- `SidebarHoverCard.tsx` 将原卡片用 React Portal 放到 body，采用 z-40；脱离抽屉的变换和裁切，保留真实查询、上下文、owner 令牌、延迟、滚动/点击/暂停/卸载清理。共享模态弹窗 z-50 仍在上方。未改抽屉、AI 或内容业务。
- 方案、用例与代码分别由独立子代理审核通过；记录为同目录的 `sidebar-surface-fix-plan-review.md`、`test-review.md`、`code-review.md`（完整文件名前缀均为 `2026-10-14-`）。

## 命令结果

证据目录：`docs/evidence/sidebar-surface-fix/`。Node 为项目要求的 24.19.0，浏览器 fixture 使用本机 Chrome，生产构建使用 Next/Electron 实际脚本。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 最终未修复基线 | 14 项：8 通过、6 有效失败；0 取消/跳过 | red-04.tap/json |
| 初次绿色尝试 | 12/14；两项误将底部视口钳制当作未钳制坐标 | green-01.json；生产定位不变，只将测试选行换到上部 |
| 新用例 | 14/14 | green-02.json；后续 SS-06 取证时序修正由完整回归再覆盖 |
| 初次范围回归 | 单元 55/55；浏览器 85/86，SS-06 在驱动往返期间已正常关闭卡片 | regression-01.json/log；未按无卡结果判层级通过 |
| 最终范围回归 | 单元 8 文件 55/55；浏览器 8 文件 86/86，0 失败/取消/跳过 | regression-02.json/log，包含最终全部 14 项新用例 |
| 最终类型检查 | tsc --noEmit 退出 0 | typecheck-03.json/log |
| 构建 | Next 生产构建与桌面构建均退出 0 | build-01.json/log |

最终回归/类型检查/构建的报告均对 1073 个源文件运行前后绑定 SHA，changedSources 为空。类型检查最初的沙箱启动器受 spawn EPERM 阻止，未执行 tsc；后续授权环境执行真实类型检查，不能把启动器失败算作 TypeScript 错误或通过。

SS-06 在实际 renderer 中采集弹窗首个可见帧，要求原卡仍连接且 count=1、弹窗实际可见、elementFromPoint 被弹窗覆盖；不禁用或延长原 200ms 隐藏。行操作另测真实卡清理与菜单可用，不用消失的卡证明层级。

## Windows 真实目标

最终 windows-03：**16/16 检查通过**。每次新建临时数据目录，使用真实 Workspaces/PGlite/IPC、公开合成作品与零模型，正常用户资料不参与测试。

- windows-01：失败记录保留；DPR 1.5 下 CSS 3px 边框的 used value 为 2.66667px，脚本原先误期待字面 3px。
- windows-02：失败记录保留；主题面板存在但隐藏，未进入实际比较或原生命中，不能记为通过。
- 数值前提修正仅用于验证：实际 DPR 换算到整物理像素再严格比较，并保留导航与真实内容滚动容器七项完全相等；生产样式不变。

windows-03 的 `report.json`、`actual-summary.json`、`verification.md` 与 4 张实际截图均在证据目录同名子目录。墨色/宣纸的导航与真实可见、实际溢出的 ThemePanel 七项滚动条样式严格一致；导航最大滚动范围 254px，内容区 361px。角色卡片位于真实 AI 区域上方，中心/右缘实际 DOM 命中，移入保持、滚动清理、抽屉暂停/重开不复活和真实创作向导首个可见帧层级均通过。

两组共六个真实 HWND 测点：卡片四点 HTCLIENT=1，caption 校准两点 HTCAPTION=2；系统 DPI144、DPR1.5。独立审核重新核实 16 个源、180 个 JS/CJS/CSS/HTML bundle、Electron exe 和 4 张截图的 SHA，全部匹配，运行前后稳定。原始报告 SHA256：`f76c183304293b62f52ea01dba5a6eeda2c7cd7a0232bd53be70955e5e07eb73`。

八组实际布局快照保留：墨色右侧主题 Tab 点击后面板尚未挂载，使用正常左导航主题入口并等待后可见，宣纸实际入口同样验证。此结果不解释 windows-02 的隐藏面板原因，也不宣称原 Tab 点击或冷恢复问题已修复。最终核验见 `2026-10-14-sidebar-surface-fix-final-review.md`。

监听后的 renderer HTTP 请求与页面错误均为零，Electron 主进程活跃 Server 监听句柄为零；该观测不扩称所有子进程/整个启动期网络检查。开发 Electron 验证不等于安装包或其它平台验收。

## 正常应用加载

实际验证结束后通过正常窗口关闭流程退出旧进程，随后系统启动器运行本项目 Electron（参数 `.`，项目工作目录）。新主窗口持续存在并响应，标题为「玄印写作」，无启动错误或写入锁修复提示。没有强制结束用户应用、注入数据、读取模型 Key 或将用户界面内容保存为证据。启动状态另存 `docs/evidence/sidebar-surface-fix/normal-launch.json`，只包含进程/窗口状态，不作为业务功能验收。

此文仅记录本轮范围。全仓之前未通过项目、安装包/macOS 和物理鼠标验证不由本次测试替代；原导航验收记录与其它在途修改保持原样。
