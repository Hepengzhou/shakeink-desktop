# 规划卡片「…」菜单点击外部无法关闭调研

日期：2026-10-16。范围：世界线「时间线」视图事件卡片、世界线「事件表」视图事件卡片、叙事线（结构编排）卡片右上角「…」弹出的操作菜单，无法通过点击菜单区域以外的地方取消展示。

## 现象（用户报告，附三张截图）

- 世界线·时间线视图：事件卡片「东溪看水与抬高的桥址」的菜单（引用到对话/详情/编辑/展开子事件/复制/删除/从此分叉）弹出后，点其他区域不关闭。
- 世界线·事件表视图：事件卡片「东宫失言案（十六年前）」的同款菜单同样不关闭。
- 叙事线：卡片「序列一·穷县」的菜单（引用到对话/编辑/展开子卡片/复制/移动/调整层级/删除/取消分组）同样不关闭。

## 定位结论：三处菜单同一实现，均在 PlanningWorkspace.tsx

三处场景全部由 `src/components/content/planning/PlanningWorkspace.tsx`（4697 行）渲染，且菜单是**同一结构的两处 JSX**：原生 `<details>/<summary>` + CSS 模块绝对定位菜单层。

| 场景 | 视图入口 | 卡片渲染函数 | 菜单 JSX 位置 |
| --- | --- | --- | --- |
| 世界线·时间线 | `mode="world"`，`table=false`（工具栏切换 2499-2504） | `eventCard(e)` :1909，时间线分支 :3034 调用 | :1938-1989 |
| 世界线·事件表 | `mode="world"`，`table=true` | 同一 `eventCard(e)`，事件表分支 :2695-2702 调用 | :1938-1989（同一份） |
| 叙事线·结构编排 | `mode="narrative"`，`view="cards"` | `renderCard(c, i)` :615，:4305 调用 | :738-789 |

菜单结构（以世界事件为例，:1938-1989；叙事卡 :738-789 完全同构）：

```tsx
<details>
  <summary aria-label={`${e.title}更多操作`}><MoreHorizontal size={18} /></summary>
  <div className={s.menu}>
    <button onClick={() => quotePlanning(...)}>引用到对话</button>
    …详情/编辑/展开子事件/复制/删除/从此分叉
  </div>
</details>
```

## 根因：依赖原生 `<details>` 开合，无任何外部点击/Escape 关闭逻辑

- 显隐完全由浏览器原生 `<details>` 的 `open` 属性驱动：点击 `<summary>` 时浏览器自动切换 `open`；React 代码中**没有** `open` 受控、`onToggle` 或菜单状态 state。
- 关闭样式由浏览器 UA 行为承担（闭合的 `<details>` 隐藏 summary 以外的子节点）；菜单层样式 `planning.module.css:199-211`（`.menu` 绝对定位、right:0、top:25px），`.cardHead details` 相对定位 :176-179；`planning.module.css:1039` `.eventCard:has(details[open])` 抬升打开菜单卡片的 z-index。
- 全文件搜索确认：没有针对这些 `<details>` 菜单的 outside-click / Escape / backdrop 处理。唯一相近的 document 级监听在 :223-243，仅用于点击外部关闭**卡片编辑器**（`setDraft(null)`），与菜单无关；:365 的 keydown 是对话框焦点陷阱。
- 附带缺陷：点击菜单项后菜单也不自动关闭（各按钮 onClick 均不触碰 `open`）；打开「详情/删除/从此分叉」对话框时菜单仍悬在其后。
- 注意区分：:826、:1000、:1369、:3097、:3685、:4350 等处的其他 `<details>` 是「AI 规划建议」「时期」等披露/折叠区块，不是菜单，**不得**被本次修复波及。

## 对照：项目中正常「点击外部关闭」的菜单机制

项目标准下拉菜单是 @base-ui/react 的 `Menu`，封装于 `src/components/ui/dropdown-menu.tsx`（`MenuPrimitive.Portal` + `Positioner`，原生支持外部点击关闭、Escape 关闭、焦点归还）：

- `src/components/layout/SidebarTree.tsx:696-741`、:957-981、:1844-1869 等多处「…」菜单（`DropdownMenuTrigger` + `MoreHorizontal`）。
- `src/components/layout/OutlineTreeMenu.tsx:128-146`、`src/components/content/scenario/trunk/TrunkView.tsx:92-113`、`src/components/content/scenario/beats/BeatsView.tsx:129-150`。

仓内没有自建 `useClickOutside` 类 hook；唯一 backdrop 模式是 `src/components/ui/dialog.tsx:35` 的对话框遮罩。

## 数据与挂载条件（供测试搭建）

- 数据：`PlanningWorkspace` 经 `useQuery(["planning", novelId])` 调 `read(novelId)`（:102-107），GET `/api/novels/${novelId}/planning`，返回 `{version, data, characters, materials, readonly, history, proposals}`，`data` 过 `planningSchema.parse`（`src/lib/planning/domain.ts:197`）补默认值。
- 世界线视图：`activeWorld` 回退到 `data.worlds[0]`（:202）；事件需 `line=worldId`、`time.kind="exact"` 且 `time.value` 落入默认窗口 `windowRange={start:0,span:240}`（:174）即在时间线/事件表渲染。
- 叙事线视图：`activeLine` 回退到 primary 线或 `lines[0]`（:199-201）；无 `refId` 时 `view="cards"`（:144）直接渲染卡片列表；卡片 `tellings` 至少 1 条（`cardSchema` :139-146）。
- 组件依赖：React Query Provider、`useTabsStore`（panelFocus/openTab，:132-135）、`useChatStore`（quotePlanning，:601-614）；`MarkdownEditor` 经 `next/dynamic` 懒加载 Monaco（`src/components/editor/MarkdownEditor.tsx:38-45`），仅在打开卡片编辑器时才渲染。
- 既有浏览器测试范式：`tests/browser/dialog-appearance.test.ts` 用 esbuild 打包真实组件 + playwright-core 无头 Chromium（`SHAKEINK_TEST_CHROMIUM` 可指 executablePath），`loader:{".css":"local-css"}` 注入真实样式；本机已装 chromium-1243。组件级测试不须拉起整页 Next/Electron。

## 修复方向（两条候选，详见方案文档 202）

1. **最小侵入（推荐）**：保留 `<details>/<summary>` 与既有 CSS 像素级不变，给两处菜单 `<details>` 加 `data-card-menu` 标记，组件内新增 document 级 capture 监听（沿用 :223-243 既有挂载模式）：pointerdown 落在菜单外 → 移除 `open`；Escape → 关闭并归还焦点给 summary；菜单项点击经 `<details>` 自身 onClick 冒泡关闭。披露区块无标记，不受影响。
2. 替换为共享 `DropdownMenu`：与 SidebarTree 等一致，天然具备全部关闭语义；但 Portal+Positioner 定位与 `planning.module.css` 菜单样式全部要重做，视觉偏离已批准 UI（v0.13），回归面大，不取。
