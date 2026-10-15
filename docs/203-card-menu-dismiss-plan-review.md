# 规划卡片「…」菜单修复方案 独立审核记录

日期：2026-10-16。审核对象：`docs/202-card-menu-dismiss-plan.md`（及调研 201）。审核方式：独立子代理逐条对照真实源码，并做了一次只读 esbuild 打包演练（write:false，未产生文件）。

## 审核结论：通过（无 P0/P1）

1. **行号与结构一致**：三场景两 JSX 成立（`renderCard` :738-789 唯一调用 :4305；`eventCard` :1938-1989 被事件表 :2699 与时间线 :3034 共用）；工具栏切换 :2498-2504；CSS 引用 `.cardHead details` :176-179、`.menu` :199-211、`.eventCard:has(details[open])` :1039-1041 全部属实。
2. **React 19 非受控 `<details>` 共存成立**：两处菜单均未声明 `open`/`onToggle`，React 不 diff 未声明的 prop，任何重渲染（setMessage/setDialog 等）不触碰该 DOM 属性；调研记录的「点菜单项触发重渲染菜单仍不关」恰为实证。
3. **capture pointerdown 兼容性成立**：不 preventDefault/stopPropagation 时，不影响 summary 原生 click 切换、dragHandle 拖拽（:664-676）、时间线画布 setPointerCapture（:2730）与既有 :223-243 编辑器监听。
4. **details onClick 冒泡关闭成立**：React 19 root 委托下按钮 onClick 先于 details onClick；`open=false` 等价 removeAttribute；disabled 菜单项不派发 click，菜单保持打开，与共享 DropdownMenu 行为一致。
5. **Escape 共存成立**：对话框焦点陷阱 keydown 在 bubble（:365），capture 先关菜单不拦截传播；菜单+对话框同开在修复后几乎不可达，维持不拦截。
6. **场景遗漏检查通过**：多实例幂等、卸载清理、z-index 联动自动回落；window blur 与共享 DropdownMenu 同样不处理。
7. **测试搭建可行（实测）**：esbuild 打包真实 WorldlinePanel/NarrativePanel + Monaco 抛错边界 + local-css BUILD OK（约 2.67MB）；`window.desktop` 无模块顶层访问；`next/dynamic` 惰性入口未渲染不执行；fetch 打桩点 `read()` :103。
8. **标记穷尽性**：全文件「更多操作」菜单仅 :739、:1939 两处（`character-arc/arc-chain.tsx:200` 的 title「更多操作」属角色弧组件，非本缺陷范围）。

## 修订项（已并入后续产物）

- **P2-1**：调研披露区块清单补全：除 :826/:1000/:1369/:3097/:3685/:4350 外还有 :832（嵌套「作者事实」）、:3112（「时期与连接列表」）、:4373（「查看叙述与披露内容」）。用例「披露区块不受影响」采用叙事卡内嵌套的 :826/:832 实例（每张叙事卡自带，夹具零成本）。
- **P2-2**：世界事件夹具按 `line=worldId + parent:null + time.kind="exact" + value∈[0,240)` 设计（事件表渲染按 parent 过滤当前层，时间线布局才看时间窗口）。
- **P2-3**：菜单+对话框同开时一次 Escape 同关两者，评估为可接受，不引入 stopPropagation。
- **P2-4**：对话框关闭时 prior.focus() 可能指向已关菜单内按钮，focus() 对不可渲染元素为 no-op，无害，不处理。
