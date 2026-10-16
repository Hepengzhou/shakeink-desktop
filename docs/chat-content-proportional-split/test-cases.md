# 测试用例:AI 区域与右侧内容面板按比例分割

日期:2026-10-17(独立用例审核后修订)。依据:`docs/chat-content-proportional-split/research.md`、`product-design.md`。范围自律:仅本目标相关用例与既有回归,不做全量测试。

## 新增测试文件

`tests/browser/chat-content-ratio-resize.test.ts`——真实 `DashboardShell`/`Group`/`Panel`/stores/adapter 经 `tests/helpers/sidebar-drawer-fixture.ts` 的 `withDrawer` 挂载(仅 AI 业务体与无关面板体隔离);Chromium headless。主题 ink(比例数学与主题无关);DPR 维度见 TC-1。

公共约定:
- 比例 = chat 面板实际像素宽 / content 面板实际像素宽(`getBoundingClientRect`);容差 ±0.01。库轴尺寸 = 各 Panel 宽之和(不含分隔条,`dist/react-resizable-panels.js:535-540`),故像素断言以实测面板宽两两比较,不预设分隔条宽度。
- sidebar 像素容差 ±1.1px;持久化百分比容差 ±0.15pt;持久化比例容差 ±0.05pt。
- 每次 `setViewportSize`/键盘调整后等待 ≥120ms(resize 事件 → rAF → RO → `onLayoutChanged` 采纳全链路)。
- `observeLayout: true` 时断言 `drawerLayoutObservation.panelConfigs`:chat.resize === "preserve-relative-size",sidebar.resize === "preserve-pixel-size"(配置回归护栏,并入 TC-1)。
- initialLayout 完整字面量(schema `.strict()`,`lastContentSize/lastSidebarSize/lastChatSize` 必填 nullable,`workspace-draft-source.ts:11-14`;sizes 求和 = 100),形如既有测试 `sidebar-drawer-resize.test.ts:11`。

### TC-1 出带缩放往返:比例与持久化保持(DPR 1 与 1.5,各跑一次)

- 前置:1440×1000;`{ version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 18.056, chat: 40.972, content: 40.972 }, lastSidebarSize: 18.056, lastChatSize: 40.972, lastContentSize: 40.972 }`(sidebar=260px,chat:content=1:1)。
- 步骤与断言:
  1. 挂载后:比例 ≈ 1;sidebar ≈ 260px;panelConfigs 断言(见公共约定)。
  2. → 2560×1000(1.78×,超出 S=260 的 [0.77,1.62] 像素带;无约束触界):比例 ≈ 1;sidebar ≈ 260px。
  3. → 1440×1000(还原):比例 ≈ 1;sidebar ≈ 260px;chat 像素宽 ≈ 步骤 1 值 ±2px。
  4. 持久化 `drawerFixture.read().layout.sizes`:chat ≈ content(±0.05pt),sidebar ≈ 18.056(±0.15pt)。
- 红测试依据(机制性,精确终态以首跑记录为准):旧行为 chat 像素保持,2560 下比例 ≈0.36(chat ≈614px/content ≈1709px,hook 先写机制,调研 §布局协调器交互);仅 A1 无 A2 时出带漂移,比例 ≈1.04(Δ>0.01)且 sidebar ≈236px,双断言红。

### TC-2 键盘调整分割线后:新比例成为缩放基准

- 前置:1800×1000;`{ version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 15, chat: 40, content: 45 }, lastSidebarSize: 15, lastChatSize: 40, lastContentSize: 45 }`(sidebar=270px,比例 ≈0.889)。
- 步骤与断言:
  1. 聚焦 chat|content 分隔条(Group 内第二个 `[data-separator]`,tabIndex=0 可聚焦,keydown 挂于其上),按 **2 次** ArrowRight(每次 5pt,`dist/react-resizable-panels.js:1611-1617`),等待稳定。
  2. 先确认方向:chat 像素宽较初始真实增大(ArrowRight 使 pivot 前者 chat 增长);新比例 r2 ≈ 50/35 ≈ 1.4286(|r2 − 0.889| > 0.01);持久化 sizes 同步为新比例(chat ≈ 50 ±0.5,content ≈ 35 ±0.5)。
  3. → 1280×1000(0.71×,出带;r2=50:35 时 chat ≈593px ≥420、content ≈32.5% ≥30,无约束触界):比例 ≈ r2(±0.01);sidebar ≈ 270px。
  4. → 2400×1000(带内):比例 ≈ r2(±0.01);sidebar ≈ 270px。
- 按键次数依据:3 次会使 content 降至 30% 下限,1280 下保比例与 content min 30% 不可兼得(正确实现也必败),2 次为最大可行步数(用例审核验算)。
- 红测试依据(机制性):旧行为/仅 A1 在 →1280 的终态经"hook 先写钳 sidebar 至像素带边 + 库按陈旧锚换算",sidebar ≈281px(≠270)、比例 ≈1.39–1.6(≠1.4286),均越容差;精确值以首跑记录为准。

### TC-3 content 关闭(两栏态):sidebar 像素固定,chat 吸收剩余

- 前置:1500×1000;`{ version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: false, sizes: { sidebar: 20, chat: 80 }, lastSidebarSize: 20, lastChatSize: 80, lastContentSize: null }`(sidebar=300px,无 content 面板)。
- 步骤与断言:
  1. 挂载后:sidebar ≈ 300px;无 `#content` 面板。
  2. → 1100×1000:sidebar ≈ 300px;chat 较步骤 1 减少 ≈400px(±1.1px),记录 chat1。
  3. → 2000×1000:sidebar ≈ 300px;chat − chat1 ≈ 900px(±1.1px)。
- 红测试依据:现行为双像素保持时库 `Kn` 提前返回(`dist/react-resizable-panels.js:1927-1928`),sidebar 随百分比伸缩(1500→2000 时 300→400px)。本用例缩放因子在像素带内,只证伪旧行为,不区分 A1 与 A1+A2(口径诚实,不声称区分)。

### TC-4 约束优先边界(900px)

- 前置:1600×1000;`{ version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 16.25, chat: 41.875, content: 41.875 }, lastSidebarSize: 16.25, lastChatSize: 41.875, lastContentSize: 41.875 }`(sidebar=260px,1:1)。
- 步骤与断言:
  1. → 900×1000(宽屏下限,轴 898px):chat ≥ 419.5px,content ≥ 269px,sidebar ∈ [199.5, 210]px;三面板实际宽加实测分隔条总宽 ≤ 900.5px(不溢出)。本用例不断言比例(约束优先,产品规格第 3 条;参考值 chat=420、sidebar=200、content=278)。

### TC-5 跨断点往返:narrow 覆盖后回 wide,比例恢复

- 前置:1600×1000;initialLayout 同 TC-4。
- 步骤与断言:
  1. → 800×1000:`data-drawer-mode` === "narrow"。
  2. → 1600×1000:`data-drawer-mode` === "wide";比例 ≈ 1(±0.01);sidebar ∈ [199.5, 420.5]px(模式切换走既有写入路径,sidebar 像素精确值不在本目标范围)。
- 护栏价值:覆盖 A2 中保留的 narrow→wide 写入分支(`previousMode !== "wide"`),防止 A2 过度删除。首跑若红,优先排查"Panel 约束 props 变化 → 全量重注册 → 库在新轴刷新"与 hook rAF 写入的提交时序(用例审核静态推断),而非直接断定实现错误。

## 既有测试回归(本目标直接相关,必须实际执行)

| 文件 | 理由 |
|---|---|
| `tests/browser/sidebar-drawer-measurement.test.ts` | **A2 分支唯一既有静止 wide→wide 缩放断言**(:57-80 idle resize 1440↔1800 首帧与 sidebar 像素偏好) |
| `tests/browser/sidebar-drawer-resize.test.ts` | 窗口 resize 叠加 sidebar 动画;共享 `resized()`/`onLayoutChanged` 路径 |
| `tests/browser/sidebar-drawer-intent.test.ts` | INTENT-03/04 窄→宽跨界写入与 sidebar 像素偏好(A2 保留的分支) |
| `tests/browser/sidebar-drawer.test.ts` | DRAWER-05 静止 narrow→wide + 恢复(A2 保留的分支) |
| `tests/unit/sidebar-layout.test.ts` | 投影纯函数(确认未被误改) |
| `tests/unit/workspace-layout.test.ts` | 持久化纯函数(确认未被误改) |

排除说明:`tests/browser/content-drawer.test.ts`(CD-03 运动中 900↔899)走动画 `repinCurrent` 分支,不经 `resized()` 写入分支,与本目标无关,不纳入;其余 grep 到的 setViewportSize 用例不挂载真实 DashboardShell 分割或不断言面板宽。

## 执行命令(目标测试,非全量)

```bash
node --import tsx --test tests/browser/chat-content-ratio-resize.test.ts
node --import tsx --test tests/browser/sidebar-drawer-measurement.test.ts
node --import tsx --test tests/browser/sidebar-drawer-resize.test.ts
node --import tsx --test tests/browser/sidebar-drawer-intent.test.ts
node --import tsx --test tests/browser/sidebar-drawer.test.ts
node --import tsx --test tests/unit/sidebar-layout.test.ts tests/unit/workspace-layout.test.ts
```

## 明确不做

- 不跑 `npm test` 全量及其他 browser 套件(用户约束:禁止全量测试)。
- 不验证 macOS/真实安装包窗口最大化按钮(渲染进程 resize 路径一致;本仓库验收以目标测试为准)。
