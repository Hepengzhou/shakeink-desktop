# 规划卡片「…」菜单外部点击关闭 测试用例

日期：2026-10-16。依据方案 `docs/202-card-menu-dismiss-plan.md`（审核 203 通过）。**仅覆盖本次修复，不跑全量**。用例编号 CM-xx（Card Menu）。

## 测试形态

- 新增 `tests/browser/planning-card-menu.test.ts`，node:test + playwright-core 无头 Chromium（本机 chromium-1243；`SHAKEINK_TEST_CHROMIUM` 可覆盖 executablePath）。
- esbuild 打包**真实** `WorldlinePanel`/`NarrativePanel`（`src/components/content/planning/PlanningWorkspace.tsx` 真实导出），`loader:{".css":"local-css"}` 注入真实 `planning.module.css` + globals/desktop 样式；Monaco 动态入口按 dialog-appearance 先例替换为抛错边界（本组用例不打开编辑器，渲染即失败属正确护栏）。
- 隔离夹具：fetch 打桩 GET `/api/novels/:novelId/planning`，返回内存数据（非本地数据库/非真实业务）：
  - `worlds: [{id:"world-a", name:"大靖主线"}]`
  - `events: [{id:"ev-a", line:"world-a", parent:null, title:"东溪看水与抬高的桥址", time:{kind:"exact",value:24}}, {id:"ev-b", line:"world-a", parent:null, title:"东宫失言案", time:{kind:"exact",value:48}}]`（审核 P2-2：parent:null + exact + value∈[0,240) 落在默认窗口）
  - `lines: [{id:"line-a", name:"主叙事线", primary:true}]`
  - `cards: [{id:"card-a", line:"line-a", title:"序列一·穷县", tellings:[{id:"t-a", narrator:"萧砚"}]}, {id:"card-b", line:"line-a", title:"渡口的水", tellings:[{id:"t-b", narrator:"萧砚"}]}]`
  - `chapters/volumes/periods/connections: []`，`characters:[]`，`materials:[]`，`readonly:false`，`history:[]`，`proposals:[]`
- React Query Provider + 真实 `useTabsStore`/`useChatStore` 状态重置；`window.desktop={}`（组件本路径不访问）。
- 菜单显隐断言：原生 `<details>` 的 `open` 属性 + `.menu` 层可见性双重断言（`details:not([open])` 时菜单层被 UA 隐藏）。
- 运行命令（只跑本文件）：`node --import tsx --test --test-concurrency=1 tests/browser/planning-card-menu.test.ts`

## 用例

| 编号 | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| CM-01 | 叙事线·卡片视图（结构编排） | 挂载 NarrativePanel；点「序列一·穷县更多操作」打开菜单；点击菜单外（另一张卡片标题区域） | 菜单打开后可见；外部点击后菜单关闭（details 无 open） |
| CM-02 | 世界线·时间线视图 | 挂载 WorldlinePanel（默认时间线）；点「东溪看水与抬高的桥址更多操作」打开菜单；点击菜单外（时间线空白/另一事件卡） | 同上：外部点击后菜单关闭 |
| CM-03 | 世界线·事件表视图 | 挂载 WorldlinePanel；点工具栏「事件表」切换；点「东宫失言案更多操作」打开菜单；点击菜单外 | 同上：外部点击后菜单关闭 |
| CM-04 | 菜单互斥 | 叙事线视图打开卡 A 菜单；点击卡 B 的「…」summary | A 菜单关闭，B 菜单打开，任意时刻仅一个菜单打开 |
| CM-05 | 菜单项点击后关闭且业务回调先执行 | 叙事线视图打开卡 A 菜单；点击「引用到对话」 | 菜单关闭；`useChatStore` draft 含【叙事卡片：序列一·穷县…】（证明按钮 onClick 先于关闭执行） |
| CM-06 | Escape 关闭 | 世界线时间线视图打开事件菜单（焦点入菜单）；按 Escape | 菜单关闭；焦点归还该卡 summary（aria-label「…更多操作」） |
| CM-07 | summary 原生切换不被破坏 | 叙事线视图点 summary 打开菜单；再次点击同一 summary | 第一次打开、第二次关闭（capture 监听不拦截原生行为） |
| CM-08 | 披露区块豁免（205 审核修订：收窄为纯豁免断言） | 叙事线视图展开卡 A 内「本次披露与事实参照」`<details>`（:826，与菜单同卡）；点击页面空白 | 该披露区保持展开（无 data-card-menu 标记不被波及） |
| CM-09 | 菜单层内非按钮空白点击不关闭 | 打开菜单；点击菜单层 padding 空白（按 bounding box 计算两按钮间隙或 6px padding 中点，避免误命中按钮） | 菜单保持打开（与共享 DropdownMenu 行为一致） |
| CM-10 | 打开对话框的菜单项：菜单先关、对话框照常弹出（205 审核新增） | 世界线事件表视图打开事件菜单；点击「详情」 | 菜单关闭；`[role="dialog"]` 事件详情抽屉出现且对话框内按钮获得焦点 |

## RED/GREEN 要求

- RED：未修改 `PlanningWorkspace.tsx` 时先跑本文件，CM-01/02/03/04/06 必须失败（外部点击/Escape 后菜单仍开）；CM-05 整体判失败（菜单不关；draft 断言通过）；CM-10 的菜单关闭子断言失败；CM-07/08/09 应通过（既有行为）。
- GREEN：修复后全部通过。
- 页面级护栏：每个用例结束断言无 pageerror/控制台 error（沿用既有 browser 测试惯例）。
- 顺带断言（CM-02 内）：时间线视图打开菜单后卡片因 `.eventCard:has(details[open])` z-index 抬升、关闭后回落。
