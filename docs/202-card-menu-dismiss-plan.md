# 规划卡片「…」菜单外部点击关闭 技术修复方案

日期：2026-10-16。依据调研 `docs/201-card-menu-dismiss-research.md`。目标：世界线时间线/事件表事件卡片、叙事线卡片的「…」菜单支持点击菜单区域外任意处关闭；不改变已批准 UI 的视觉与既有交互。

## 方案选型

| 候选 | 内容 | 结论 |
| --- | --- | --- |
| A. 最小侵入（采用） | 保留 `<details>/<summary>` + `planning.module.css` 菜单样式，仅补关闭语义 | 视觉零变化；改动集中在 1 个文件；披露区块可精确排除 |
| B. 换用共享 DropdownMenu | 用 `src/components/ui/dropdown-menu.tsx` 重写三处菜单 | 自带外部点击/Escape 关闭，但 Portal+Positioner 定位与菜单样式需重做，视觉偏离已批准 UI v0.13，回归面大，不取 |

## 设计

三处场景只对应两处 JSX（`eventCard` 被时间线/事件表共用），修复落在同一文件 `src/components/content/planning/PlanningWorkspace.tsx`：

### 1. 标记菜单容器（2 处）

给两个菜单 `<details>` 加 `data-card-menu` 属性：

- 叙事线卡片菜单 :738（`renderCard` 内）
- 世界事件卡片菜单 :1938（`eventCard` 内）

作用：与文件内其他披露/折叠用 `<details>`（:826、:1000、:1369、:3097、:3685、:4350 等）明确区分，关闭逻辑只命中菜单。

### 2. 菜单项点击后关闭（2 处）

在两个菜单 `<details>` 上加 React `onClick`：

```tsx
onClick={(e) => {
  if ((e.target as Element).closest("button")) e.currentTarget.open = false;
}}
```

- React 冒泡顺序：菜单项 `<button>` 自身 onClick 先执行（引用/详情/编辑/展开/复制/删除/分叉等原逻辑不变），随后 `<details>` 的 onClick 关闭菜单。
- `<summary>` 不是 `<button>`，`closest("button")` 为 null，summary 的原生开合切换不受影响。
- 菜单层 padding 空白处点击不命中 button，菜单保持打开（与共享 DropdownMenu 行为一致）。

### 3. 外部点击 + Escape 关闭（1 处 effect）

在组件内新增一个 `useEffect`（挂载模式沿用既有 :223-243 的 document capture 监听）：

```tsx
useEffect(() => {
  const menus = () =>
    document.querySelectorAll<HTMLElement>("details[data-card-menu][open]");
  const onPointerDown = (e: PointerEvent) => {
    for (const menu of menus())
      if (!menu.contains(e.target as Node)) menu.removeAttribute("open");
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    for (const menu of menus()) {
      menu.removeAttribute("open");
      if (menu.contains(document.activeElement))
        menu.querySelector<HTMLElement>("summary")?.focus();
    }
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
  };
}, []);
```

行为推导：

- **外部点击关闭**：pointerdown capture 先于任何目标 handler 与原生 click 切换；目标不在已开菜单内 → 关闭。落在其他卡片、时间线画布、拖拽把手（`setPointerCapture`/`stopPropagation` 不影响 document capture 阶段）均生效。
- **summary 二次点击仍切换**：目标在菜单内 → 不干预 → 浏览器原生 toggle 关闭。
- **菜单互斥**：菜单 A 开着时点菜单 B 的 summary → pointerdown 先关 A，原生 click 再开 B，任意时刻最多一个菜单打开。
- **Escape**：关闭所有已开卡片菜单；焦点在菜单内时归还 summary，焦点在别处（如编辑器）时不抢焦点。
- **披露区块豁免**：无 `data-card-menu` 标记，查询不命中，「AI 规划建议」等折叠区不受外部点击影响。
- **z-index 联动**：`.eventCard:has(details[open])`（planning.module.css:1039）随 `open` 移除自动回落，无需额外处理。
- **卸载清理**：组件卸载移除监听；多个 PlanningWorkspace 实例并存时各挂一份幂等监听，效果一致。

## 明确不做

- 不替换菜单组件、不动 `planning.module.css` 任何规则、不动菜单项文案与顺序。
- 不给披露/折叠区块加外部点击关闭。
- 不改菜单项业务行为（引用、详情、编辑、展开、复制、删除、分叉、移动等回调原样）。

## 影响面与回归风险

- 改动文件仅 `src/components/content/planning/PlanningWorkspace.tsx`（+2 属性、+2 onClick、+1 effect）。
- 既有 :223-243 编辑器外部关闭监听与本监听独立，互不干扰；点菜单项打开对话框时，菜单先关、对话框照常弹出。
- 原生 `<details>` 开合语义、summary 键盘操作（Enter/Space）不受影响。
- 风险点：capture 监听必须不 `preventDefault`/`stopPropagation`，否则会阻断 summary 原生切换与拖拽起手——实现与测试中均加护栏。

## 测试策略（详见用例文档 204）

新增 `tests/browser/planning-card-menu.test.ts`：esbuild 打包**真实** `PlanningWorkspace`（Monaco 动态入口按 dialog-appearance 先例替换为抛错边界，本修复不触及编辑器），fetch 打桩 `/api/novels/:novelId/planning` 返回隔离夹具数据（1 世界线+2 事件、1 叙事线+2 卡片、1 条 AI 规划建议作披露区块对照），playwright-core 无头 Chromium 驱动真实点击。先 RED（未修复时外部点击不关闭）后 GREEN。运行命令：`node --import tsx --test --test-concurrency=1 tests/browser/planning-card-menu.test.ts`，不跑全量。
