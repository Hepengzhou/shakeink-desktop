# 左导航表层修复：独立技术方案审核

日期：2026-10-14（Asia/Shanghai）。审核范围：`2026-10-14-sidebar-surface-fix-plan.md` 和其中涉及的真实生产组件/CSS；本轮仅审核，不修改生产或测试文件，不操作正常用户应用。

方案 SHA-256：`8a4c9fa524b8795cd68e745c71c919a25b76d4ea75e7da9bc0442915967dedc7`。

结论：**通过，阻断项 0**。方案限定在用户指出的两个缺陷，沿用真实 SidebarTree 和共享浮层内容/上下文，没有引入原型或演示数据。

## 源码核实

- 滚动条局部差异确实存在：`src/app/desktop.css:143` 的 `.sidebar-navigation .tree-scroll` 独立设置 `scrollbar-width:thin`；`src/app/globals.css:349` 起全局 WebKit 滚动条已有 10px 尺寸、透明轨道、主题变量滑块、3px 透明边距及 hover 状态。去掉局部标准属性可让该滚动容器复用应用基准，避免再复制一套主题规则。实际 Chromium 绘制是否符合截图要求仍需后续真实目标验证，源码审核不替代该项。
- 浮层位置问题有完整祖先链依据：`src/components/layout/DashboardShell.tsx:36` 将 SidebarTree 放在 `sidebar-drawer-viewport` / `sidebar-drawer-inner` 内；`src/app/desktop.css:465`–`467` 设置外层/视口 `overflow:hidden`；`src/components/layout/useSidebarDrawer.ts:75` 每次几何更新对内层写入 `translateX(...)`，打开完成时也保留 transform。`SidebarHoverCard.tsx:218` 目前将 fixed 浮层渲染在这条链内，单纯提高局部 z-index 不能突破祖先裁切。将唯一浮层 Portal 到 body 与现有以行 `getBoundingClientRect()` 取得视口坐标的定位方式匹配。
- Portal 不改变 React Provider 归属。`SidebarTree.tsx:1756` 的 `NavigationTransientBoundary` / `SidebarHoverProvider` 仍需保留；`SidebarHoverCard.tsx:195` 的 paused/epoch 清理，以及 TreeNode 的 owner、展示/隐藏计时、卸载清理不能删减。因此抽屉运动/切换视图/折叠时，浮层不会因为移到 body 而绕过暂停规则。
- 根级 z-40 与已见共享层级协调：窄窗口导航在 `desktop.css:483` 是 z-20；共享 `ui/dialog.tsx:34,56` 和 `ui/dropdown-menu.tsx:36,44` 的 portal 层是 z-50。ChatPanel 普通控件主要为 z-10/30，尾部按钮是 z-40；body 内新 Portal 的后置绘制顺序可盖住普通工作区同层控件。现有聊天提示/业务候选浮层可能使用更高层级，它们属于其他瞬态浮层，不宜在本次修复中统一改写。
- body 作为目标不会丢失本卡的颜色上下文：卡片使用 `bg-popover`、`border-border`、`text-foreground` 等全局主题变量；文件注释已明确不使用仅 chatpane 范围内的 `--chat-line`。根级新增专属 no-drag 属性/规则是必要的，因为此前该卡受导航滚动视口的 no-drag 区约束，Portal 后应明确提供自己的原生命中边界。

## 后续验证要求

用例需读取实际滚动条伪元素和主题变量、验证真实 `elementFromPoint` 命中浮层，不能只查类名或截图存在。应覆盖延迟与移动到卡片的宽限、owner 切换、滚动/点击/行卸载、Tabs 切换与抽屉暂停/收起后的 body 残留清理；同时验证共享菜单/业务弹窗仍位于卡片上方。

Windows 验收使用隔离合成数据和真实组件/IPC，保留两个主题绘制证据；新增 no-drag 若可能覆盖 caption，应检查卡片可交互及标题栏可拖拽命中。浏览器 fixture 不能标为真实数据库/原生验证。已有全仓失败、未执行安装包/macOS 项目保持原记录，本审核不声明实现或整仓验收通过。
