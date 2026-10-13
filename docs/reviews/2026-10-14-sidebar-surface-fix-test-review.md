# 左导航展示缺陷：独立测试用例审核

日期：2026-10-14（Asia/Shanghai）。审核对象：`2026-10-14-sidebar-surface-fix-test-cases.md`，SHA-256 `3da7613f1e6a5201f1d8a21ebf6217e67d77be9445d3edb04edf4b33c790c62c`。本阶段没有新增测试或生产实现，审核不代表用例已执行。

结论：**通过，阻断项 0，可以进入 TDD**。

- SS-01 不仅查局部样式，还比较真实 SidebarTree 与普通滚动区的标准属性、实际滚动槽、伪元素和双主题滑块变量，并保护实际滚动行为，能够揭示当前局部 `thin` 与全局基准的差异。
- SS-02 保留真实 SidebarTree、实际 CSS 和行视口坐标，使用有 transform/裁切的容器及不透明邻区复现当前 fixed 浮层问题；导航外部的中心/右侧 `elementFromPoint` 命中比检查 z-index 字符串更能证明缺陷修复。浏览器邻区替身只证明裁切/堆叠，真实 AI 区域交由 Windows 阶段补足。
- SS-03/04/05 覆盖展示/隐藏延迟、换 owner、卡片移入、滚动/点击/行卸载、Tabs 和导航暂停/重开，保护 body Portal 的 React 归属与清理。应在清理动作后等待超过 400ms，证明待定计时器不能重新打开卡片；抽屉用例需在首个暂停帧、运动中和关闭后均检查无可交互残留。
- SS-06 要求打开真实共享 Dialog 并在与卡片重叠的位置读取命中，能够证明 z-40 不会盖住模态操作。实施时应在真实卡片尚在 DOM 的条件下测试弹窗层级，不能用已消失卡片得出层级通过；也不能用测试 CSS 提升弹窗或注入替身浮层。
- 回归覆盖导航和抽屉范围、文字选择、相关 unit、类型检查与生产构建，与两个局部修复相称；不重做总体业务迁移验收。此前全仓失败和未执行项目继续如实保留。

## Helper 与 Windows 边界

`tests/helpers/sidebar-navigation-fixture.ts` 已编译真实 SidebarTree、全局和桌面 CSS，提供两个公开合成作品及隔离 API；可用于 SS-01/02/03/04/06，不证明真实数据库和 IPC。`tests/helpers/sidebar-drawer-fixture.ts` 复用真实 DashboardShell/SidebarTree/Group/Panel，但默认作品查询为空，未向测试暴露 QueryClient。SS-05 实施需在 helper 中增加合成记录选项/注入能力建立真实可悬停条目；只改测试数据，不替换 hover 或布局算法。其隔离聊天 body 不作为真实 ChatPanel 外观证明。

Windows 计划补足真实组件、Workspaces/PGlite、IPC、两个主题和 AI 区域命中/移动保持/滚动关闭，并留源与 bundle SHA。no-drag 的计算样式不能替代真实 HWND 命中；若原生命中实际无法执行，应记录具体阻碍和未执行状态，不记为通过。隔离合成数据、无模型和离线 renderer 约束适当，正常用户应用无需操作。开发 Electron、安装包、macOS 与物理鼠标验证边界已清楚区分。

## 执行修正版复核

修正版用例文档 SHA-256：`186a7dc4ad87544e829498f46b214ce95d4ec997c25895f96672fbe29222c522`。本次读取的新测试脚本 SHA-256：`c600abcfdf9b523fbd39b002ebed8af162e7eb81e9b52d4ca15692e280276e0d`。

**认可 SS-06/07 拆分及 fixture 修正，用例矩阵无新增阻断项。** `SidebarTree.tsx:299`–`302` 的真实行操作区域在 mouseenter 时清展示计时器并调用 `hideNow(owner)`，因此正常点行操作后的卡片消失是预期行为；不应人为阻止该清理以构造菜单遮挡。修正版 SS-07 用正常鼠标点击菜单/重命名弹窗检验可操作性，SS-06 则点击真实创建作品按钮打开创作向导，保持原指针位置并先要求卡片仍在 DOM，覆盖不同交互路径。

`drawerSeedNavigation` 仅向现有 QueryClient 写入合成作品和空 worlds/characters 列表，复用真实 SidebarTree 中的设定行；布局、浮层与 Shell 没有被替换。SS-07 的 detail.characters 合成补全避免 NovelHoverCard 读缺字段；这类 fixture 异常不能当作用户缺陷证据。原 red-01/02 保留符合证据要求。已见 red-03 最终为 12 项、7 通过/5 失败，无取消/跳过；该结果仅记当前未修复基线，不宣称新实现验收通过。

测试脚本还应落实原用例的两项前提：SS-06 打开弹窗前先证明 `cardHit(page) === true`，排除“卡在 DOM 但本就未绘制”的层级假通过；SS-04 增加悬停不足 400ms 即切换分类/卸载并等待超过 400ms 的路径，当前循环只证明已经展示的卡片被清理，不能单凭该循环声明待定展示计时器已验证。这两项是现有矩阵的断言补足，不扩展业务范围。修复后的测试及 code review 应核实补足情况。
