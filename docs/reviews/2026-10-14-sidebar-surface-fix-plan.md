# 左导航滚动条与悬停卡修复方案

日期：2026-10-14（Asia/Shanghai）。来源：用户本轮截图与两个缺陷说明；延续已批准的左导航 v8，自动推进实施，不新增设计审核门。

## 问题与依据

- `src/app/desktop.css` 的 `.sidebar-navigation .tree-scroll` 单独指定 `scrollbar-width:thin`。当前 Electron Chromium 支持标准滚动条属性，非 `auto` 值会覆盖应用在 `src/app/globals.css` 定义的 `::-webkit-scrollbar` 外观，因此出现系统轨道、箭头与粗浅色滑块。全局样式已有 10px 轨道、透明背景、3px 透明边距和主题色滑块。
- `src/components/layout/SidebarHoverCard.tsx` 的浮层仍是导航内部的 `position:fixed; z-index:3000`。真实 `DashboardShell` 将导航放入 `overflow:hidden` 的抽屉视口，内层还保留 transform；fixed 定位因变换祖先而改变包含块，大 z-index 无法突破祖先裁切与堆叠上下文。

## 实施

1. 去掉导航独立的 `scrollbar-width:thin`，直接复用全局滚动条，不另复制一套颜色、尺寸或滚动行为。
2. 将现有 `SidebarHoverProvider` 中唯一浮层用 React `createPortal` 挂到 `document.body`；真实卡片、惰性查询、Provider 上下文、owner 令牌、400ms 展示/200ms 隐藏、滚动/点击/卸载及导航瞬态暂停逻辑继续复用。
3. 浮层采用根级 z-40：高于普通工作区及窄窗口导航 z-20，低于共享业务弹窗/菜单 z-50。为该浮层添加专属 data 属性及原生 no-drag 样式，避免移动到窗口标题区时出现拖拽命中。
4. 保留既有视口定位钳制与抽屉完整宽度/平移动画。仅修改上述组件与局部 CSS；不改 AI 业务、右内容抽屉、正式数据、主题全局基准与其它在途修改。

## 顺序与验证范围

独立子代理审核本方案 → 测试用例及独立审核 → 新用例在当前代码上复现失败 → 最小修复 → 新用例与导航/抽屉相关回归、TypeScript、构建 → 独立 code review → Windows 真 Electron 隔离合成作品验收 → 更新本轮记录和实施台账。

浏览器用例验证真实导航 React、实际主题 CSS 与实际 DOM 命中、抽屉和浮层生命周期；隔离 API fixture 不作为真实 IPC/数据库证明。Windows 验收使用新的临时数据目录、真实 Workspaces/PGlite 与 IPC，无模型与 Key，检查两个主题下真实滚动条和 AI 区域上方悬停卡；正常应用与用户数据不用于截图或测试。

本轮全量执行是新用例及所有与该修复相关的导航/抽屉用例。全仓已知未通过结果保持原记录，不将本轮局部修复宣称为整个项目验收通过。安装包和 macOS 未执行时据实注明。
