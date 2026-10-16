# 调研:AI 区域与右侧内容面板按比例分割

日期:2026-10-17(独立方案审核后修订)。范围:工作台宽屏模式下 AI 对话区(chat)与右侧内容面板(content)之间分割线的空间分配方式。

## 需求复述

- chat 与 content 之间的分割线按百分比分配两侧空间。
- 窗口任意放大缩小、最大化/还原,chat:content 宽度比例维持不变。

## 现状定位

工作台三栏由真实 `DashboardShell` + `react-resizable-panels` 的 `Group/Panel/Separator` 组成(`src/components/layout/DashboardShell.tsx:35-59`):

| Panel | defaultSize | minSize | groupResizeBehavior | 证据 |
|---|---|---|---|---|
| sidebar | 260px | 200px / 最大 420px | `preserve-pixel-size` | `DashboardShell.tsx:36` |
| chat | 560px | 420px | `preserve-pixel-size` | `DashboardShell.tsx:44` |
| content | 0 | 30% | 未设置(默认 `preserve-relative-size`) | `DashboardShell.tsx:49` |

`defaultSize={560}` 仅用于无持久布局的首次挂载;`useSidebarDrawer.ts:472` 的 560 是全屏恢复时按当时宽度折算的默认值,均不参与缩放期行为(已全局排查,无其他强制 chat 像素宽度的代码;CSS 仅显示/隐藏与主题变量,`src/app/desktop.css:479-525`、`globals.css:2120-2143`)。

## 库机制(react-resizable-panels v4.14.2,已安装;独立审核逐行核对无误)

- `groupResizeBehavior` 默认 `preserve-relative-size`("Retain the current relative size (as a percentage of the Group)");`preserve-pixel-size` 为像素保持。约束:Group 内至少一个 Panel 为 relative(`dist/react-resizable-panels.d.ts:824-834`)。
- Group 尺寸变化重分配算法 `Kn`(`dist/react-resizable-panels.js:1899-1945`):
  1. `preserve-pixel-size` 面板:新百分比 = 旧百分比 × prevAxis / nextAxis(像素不变),合计记 r。
  2. 剩余 `c = 100 − r` 由全部 `preserve-relative-size` 面板**按各自旧百分比等比瓜分**:`u[d] = old% / Σrel% × c`——输入布局的 chat:content 比例被精确保持(仅 3 位小数舍入,`:751-753`)。
  3. `!s || a.length === 0` 时直接返回旧布局(`:1927-1928`)。
- 约束投影 `ge()`(`:1317-1364`):先按比例归一化(保比例),再逐面板钳制 min/max 并按面板顺序再分配(不保比例)——这是"约束优先于比例"的机制来源。
- `setLayout` 以陈旧轴尺寸提交 `requestedAxisSize/requestedLayout`(`:1551-1558`);库自身 RO 提交记录新鲜轴尺寸(`:1953-1981`)。
- Separator 支持键盘方向键调整(`:1611-1615`,role="separator" `:2255`),测试可用键盘真实改变比例。

## 布局协调器交互(useSidebarDrawer;独立审核修正后的真实时序)

`useSidebarDrawer.ts` 是 Group.setLayout 的唯一属主(`:202-211`);`r.current`/`r.target`/持久化 `WorkspaceLayout.sizes`/恢复 `restorePin` 均为 0–100 百分比。静止 wide→wide 缩放的实际帧序(window resize 事件 → rAF → ResizeObserver 交付;有 2026-10-14 trace 佐证,见 `docs/reviews/2026-10-14-sidebar-drawer-resize-plan.md`):

1. hook 的 `resized()`(window resize,`:579-602`)先跑:空闲且宽度变化 → `r.current = target(); r.needsWrite = true; kick()`(`:593`)。
2. 下一 rAF 由唯一 writer `write()`(`:203-211`)`setLayout` 提交 hook 投影,`requestedAxisSize` 记录为陈旧值(上一宽度 W1)。
3. 库 RO 交付:`Kn(prev=W1, prevLayout=hook 写入布局, next=W2)` → sidebar 像素换算 + **精确保持写入布局的 chat:content 比例** → `ge()` 约束钳制。
4. `onLayoutChanged`(isUserInteraction=false)→ hook 空闲采纳 `r.target = current`(`:508-513`)并持久化(`:608-609`)。

**终态比例 = hook 写入时刻的比例。** 而 `target()`→`projectSidebarLayout`(`sidebar-layout.ts:21-25`)把 sidebar 存储百分比钳到 [200px,420px] 像素带、content 钉死存储百分比、chat 吸收剩余。缩放因子 W2/W1 超出 [200/S, 420/S](S=260px 时约 [0.77, 1.62])时,sidebar 百分比被钳,chat 单独吸收差值,chat:content 比例永久漂移,且漂移值被采纳持久化。数值反例(无任何约束触界):W1=1200、S=260、chat 38.33%、content 40%(比例 0.958)→ 2400:hook 写 {17.5, 42.5, 40},Kn 后 sidebar 210px、chat 1128px、content 1062px,**比例 0.958→1.063**;缩回 1200 不还原。默认窗 1440 最大化到 2560(1.78×)即出带——落在需求 headline 场景内。

**结论:仅改 Panel 属性不完备。** 需两处改动:

- **A1**:`DashboardShell.tsx:44` chat Panel 显式 `groupResizeBehavior="preserve-relative-size"`。使库 `Kn` 在任何 Group 尺寸下把 chat+content 作为同组等比瓜分;同时保证 content 未挂载时 Group 仍有 relative 面板(修复 `a.length===0` 提前返回分支)。
- **A2**:`useSidebarDrawer.ts` 的 `resized()`:纯 wide→wide 静止缩放不再重写布局(删除 `r.current = target(); r.needsWrite = true; kick()` 对该场景的执行),仅更新 `r.width` 与 mode 簿记;**模式切换(narrow↔wide)保留现有写入**。库 `Kn` 从一致的 `requestedAxisSize/requestedLayout` 出发单路径处理:sidebar 像素精确、chat:content 比例精确;hook 经 `onLayoutChanged` 采纳持久化。动画/恢复/冻结期间的 `repinCurrent` 分支(`:586`)与窄屏覆盖层逻辑不经过此路径,不受影响。

A2 下 `r.current`/`r.target` 在 resize 与 RO 交付之间短暂保持旧百分比,随后由采纳刷新;`geometry()` 读真实 DOM 矩形,不受影响。

## 约束边界

- chat min 420px、content min 30%、sidebar 200–420px(`DashboardShell.tsx:36,44,49`;投影 `sidebar-layout.ts:17-20`)。
- 主窗口 `minWidth: 760, minHeight: 580`(`desktop/main/index.ts:737`);<900px 为 narrow 覆盖模式,无 chat/content 分割。
- 900px 下三者最小值加 2px 分隔条合计 892 ≤ 900,约束恒可满足;**极端缩窄触发最小宽度时约束优先于比例**(库 `ge()` 与投影均如此),产品文档明确该边界。
- 窗口最大化/还原对渲染进程是同一组 resize 通知,走相同代码路径。

## 候选方案

- **A1+A2(选定)**:见上。改动最小、落入库既有算法、保持 hook 唯一属主架构;fixture 观测点 `panelConfigs[id].resize`(`tests/helpers/sidebar-drawer-fixture.ts:72`)可断言配置。
- B(否决):hook 在 `resized` 中手动按比例重算 chat/content。与 `Kn` 重复;且 sidebar 像素精确性需配合 `Kn` 的陈旧轴换算,实为"写入旧布局"≈不写,复杂度高于 A2 无额外收益。

content 未挂载场景的行为变化:A1 后 chat 为 relative,`Kn` 恒运行——sidebar 像素固定、chat 吸收剩余(现状为双像素保持时 `a.length===0` 返回旧布局、双栏按百分比伸缩至约束边界)。新行为与 sidebar 的 `preserve-pixel-size` 设计意图一致,且与 content 可见时统一。

## 影响面与既有测试盘点

- 生产代码改动:`DashboardShell.tsx:44` 一处属性;`useSidebarDrawer.ts` `resized()` 纯 wide 缩放分支。
- 本目标相关既有测试:
  - `tests/browser/sidebar-drawer-resize.test.ts`:断言集中于 sidebar V/W、caption/items 几何、mode/phase、持久化偏好,无 chat 宽度断言;运动中 resize 走 `repinCurrent` 分支不经 `resized()` 写入。静态推断预期全绿,必须实际回归。
  - `tests/unit/sidebar-layout.test.ts`、`tests/unit/workspace-layout.test.ts`:纯函数,不受影响,一并跑通确认。
- 新增测试:`tests/browser/chat-content-ratio-resize.test.ts`,必须覆盖(审核 P3-1):出带缩放因子(如 1440↔2560、1800→1280)、最大化→还原往返后的 DOM 比例与持久化 `sizes`、键盘改比例后的新基准保持、S 边界与约束优先边界(900px)、DPR 1/1.5。
