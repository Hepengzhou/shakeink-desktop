# 左导航展示缺陷：独立最终事实审核

日期：2026-10-14（Asia/Shanghai）。本次只读取当前实现、范围测试/构建报告、Windows 原始报告及四张合成界面截图，并写本审核文件；没有修改生产/测试/harness 或启动/操作应用。

结论：**本轮两个缺陷的实施与范围验收通过，独立阻断项 0**。全仓既有未通过结果及未执行目标仍保留，不声明整个项目验收通过。主代理尚待更新交付文档/台账并交本审核校对；正常应用重启也不属于本文件已有的执行证据。

## 核实结果

| 证据 | 实际终态 |
| --- | --- |
| regression-02 | 8 unit 文件 55/55、8 browser 文件 86/86；0 失败/取消/跳过；新增 14 项包含在 86 中，不重复累计 |
| typecheck-03 | tsc --noEmit 退出 0 |
| build-01 | Next UI / desktop build 均退出 0 |
| windows-03 | 16/16 检查通过，两个主题分别执行完整流程；2 组共 6 个实际 HWND 测点通过 |

三个范围执行报告的 changedSources 均为空，监测 1073 个源文件。该文件集是本轮导航/抽屉相关范围，不能用这些数字替代此前全仓测试结果。

Windows 原始报告为 passed，运行时间 2026-10-14 03:51:40.376–03:52:32.292（Asia/Shanghai），独立 fresh attempt 51.916 秒；未拼接 windows-01/02 的部分成功项。实际 Windows Electron 44.6.0、Chromium 152.0.7977.130、zoom 1、DPI 144、renderer DPR 1.5，开发构建 packaged=false。

- 左导航与实际可见且溢出的生产 ThemePanel 的七属性完全相等。两个主题均为 auto、10px、border used value 2.66667px、6px radius、content-box、透明 track；墨色 thumb `rgba(255, 248, 240, 0.13)`、宣纸 `rgb(207, 194, 155)`，两处各自一致。导航 max scroll=254、实际 scrollTop=80，ThemePanel max=361。
- 两主题真实角色条目 rect 为 x=6、y=458、width=275.75，卡片 x=289.75、y=458、width=256，恰为条目右侧 8px。真实 Chat 从 x≈288.417 开始，卡片完整位于其区域内；脚本对中心/右侧实际命中、no-drag 和原生命中均保留严格断言。
- 原生记录是每主题两个 card 点 HTCLIENT=1、一个真实空白 caption 点 HTCAPTION=2，共四个 card 点、两个 caption 点，helper 已测 PER_MONITOR_AWARE_V2、DPI 与实际 ClientToScreen 坐标。这些是 HWND 测量，不能混称实体鼠标输入。
- 两主题各自通过移入卡片保持、真实滚动关闭、抽屉 closing 清理/重开不复活。创作向导首个可见帧记录 sameCard=true、count=1、covered=true，证明仍连接的同一原卡被业务模态层覆盖，没有把缺卡记作层级通过。
- 使用两个真实 Workspaces/PGlite 临时作品库和真实 IPC，bootstrap models=0、renderer offline；pageerror=0、监听注册后的 renderer HTTP=0、Electron 主进程当前活跃监听 Server 句柄=0。没有把这些局部网络观察扩称整个启动期/所有进程的网络证明。

## 截图和版本核验

已独立查看 ink/paper 的 scrollbar、hover-card 四张截图：两侧实际滚动条均为相同主题的细圆滑块和透明轨道，无原系统箭头/粗浅色轨道；悬停卡完整绘制在真实 AI 区域上方。截图使用合成作品/角色，与原始报告中的隔离数据一致。

已重新计算全部 16 个报告 source、180 个实际 dist/out js/cjs/css/html 文件、四张截图和 Electron executable 的当前 SHA，均与报告相同；报告 source/bundle/exe 前后 SHA 也逐项相同。实际 bundle 文件数仍为 180，无遗漏新增文件。前序生产 code review 的两个文件 hash 和当前浏览器测试/helper/runner hash 未变。

| 绑定 | SHA-256 |
| --- | --- |
| windows-03/report.json | f76c183304293b62f52ea01dba5a6eeda2c7cd7a0232bd53be70955e5e07eb73 |
| scripts/verify-sidebar-surfaces.mjs | 51e44ed3b0d1d208f54fcec2734c66cd3741bff83a644e5ddfb4454affa66545 |
| src/app/desktop.css | 6c0e3ab1a4cbe02701a88f47be40171d46646d523ef19652604da27544d51a2d |
| src/components/layout/SidebarHoverCard.tsx | d02909c537f72ecb74c2d6e435236c48121e681d928692efcc72b74251ae0801 |
| regression-02.json | 629933acea3420df4902ed60b40d844160495ec49e47a8c266c361399ceccbef |
| typecheck-03.json | a30f47a4f9dba1350abc24393fe52f36a04754dc2b8eb05c678b63ca6ed8abad |
| build-01.json | 7c539a293c82bc6001061e2d5c825d2632bf62586728214bab1e58bc4feabacb |

## 观察边界与保留项

原始八组 layoutSnapshots 与说明一致：ink 右侧主题 Tab 已 selected 后，ThemePanel 在即时快照里尚未挂载，三个面板均可见且非 inert；正常左导航“设定 → 作品 → 主题”后及等待，5212.4ms 时生产 ThemePanel 可见，width≈1079.292、height=956，八层记录祖先均可见且非 inert。paper 阶段该面板已可见。本次原有可达 UI 作为比较准备路径，未强改 DOM/CSS/store；这不能解释 windows-02 的 hidden 根因，也不证明原 Tab 点击/冷恢复行为已修复。

red-01/02 fixture 异常、red-04 有效缺陷、green-01 y 钳制前提错误、regression-01 缺卡前提失败及 windows-01/02 失败均仍保留。本轮未执行 NSIS 安装、macOS、实体鼠标；没有重跑或取代此前全仓失败结论。后续交付应准确使用“本轮两项修复与范围/Windows 开发验收通过”。

## 交付文档、台账和正常启动元信息校对

已读更新后的主 `verification.md`、`summary.md`、Windows 证据说明及两份实施台账。本轮 55/55、86/86、16/16、6 HWND 点、16 source/180 bundle、四截图和八布局快照数值一致；记录准确保留所有失败尝试、原主题入口/冷恢复未解释边界和未执行目标。短文件名均明确说明完整日期/任务前缀，引用的产物存在。

两个台账的 `sidebarSurfaceFixRevision.status=implemented-scoped-and-Windows-verified`、`allRevisionAcceptancePassed=true`、`allRepositoryAcceptancePassed=false` 与本轮证据一致；production 仅指向两文件。原 `sidebarNavigationRevision.allAcceptancePassed=false` 和 full-repository-not-green 状态保留，migration 顶级 planned 未被本次改为全仓完成。

正常启动元证据 `normal-launch.json` 只含启动方式、时间、PID 和窗口状态布尔值，未保存用户界面/作品/模型/Key。该文件记录主代理通过正常关闭及 System ShellExecute 重启的 Sky/UIA 窗口观测；独立只读 `Get-Process` 另确认旧 PID 1032268 不再存在、新 electron PID 1161684 存在并 Responding=true。本审核没有重新抓取正常用户 UI。当前 exec 环境 MainWindowHandle 返回 0，不能用它重复确认窗口标题/错误/锁提示，也不能由该工具读值推断窗口实际不存在；这些窗口字段的来源仍为主代理元观测。正常启动不计作业务测试。

校对发现一项过时文字待主代理修正：`windows-03/verification.md` 最后一行仍为“尚待独立子代理复核本次报告、脚本与截图。”，本文件已完成该审核，应改为已完成并链接本记录。该文字不改变已经核实的原始结果和生产结论。

本次读取绑定：主 verification SHA-256 `e96a2c399b2ab24b79fc7e70940b092a7237424d40414337e2e6697f26ed39ca`；summary `e5025512600d5c7eeb6f6cf342494f1b1833a68bef32d09946261bd74fd9299f`；normal-launch `0f29b61640f1069336108ccd1736d4df2d65d24f7881a619839e290b78be04bf`；requirements-traceability `1178a265a0f98dc090c91276168ba24a0e614b6d6ad6bdb6fdb09b072fcccd22`；migration-map `a3fb831f90d5065a6344d0e3d687215b6855672d41f6a8b3e217873dbaa1305f`。

## 终态校对

已重新读取 Windows 说明末尾，过时“尚待审核”句已改为完成并正确链接本最终审核，SHA-256 `04c694277a3b400792f74de7f45e8ca3df6de436142d29e20e79a5ccac485ba8`。主 verification、summary、两台账及 normal-launch 与前节绑定相同。主代理确认窗口字段源自 Windows Sky/UIA 启动窗口元观测，私有 UI 状态没有输出；独立进程核实与窗口元观测边界已在前节说明，不作为业务验收。

**交付文档与台账终态校对通过，未解决的本轮事实/实施阻断项 0。** 两项修复、范围测试及 Windows 开发目标通过的结论可交付；全仓旧失败、原 Tab/冷恢复未解释观察和未执行平台继续保留。此终态追加没有再次操作应用或改动任何其它文件。
