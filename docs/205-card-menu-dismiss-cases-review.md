# 规划卡片「…」菜单测试用例 独立审核记录

日期：2026-10-16。审核对象：`docs/204-card-menu-dismiss-cases.md`。审核方式：独立子代理对照真实源码/schema 逐条核实（与方案审核同一审核员，延续上下文）。

## 审核结论：修订后通过（P1 已修订并入 204）

逐项核实结果：

1. **场景覆盖与范围通过**：CM-01/02/03 对应用户报告三场景；只跑本测试文件，符合「禁止全量测试」约束。
2. **断言点真实性通过**：summary aria-label `${title}更多操作`（:739/:1939）、工具栏「事件表」:2502-2504、卡内披露区「本次披露与事实参照」:826-838、`quotePlanning` 行为 :601-614、Escape 焦点归还目标均可断言。
3. **夹具数据通过**：cards/events/lines/worlds 最小字段均满足 schema 默认值与渲染条件（`children()` 过滤、默认窗口覆盖 24/48 小时、`activeLine`/`activeWorld` 回退、NarrativePanel 默认 `view="cards"`、WorldlinePanel 默认 `table=false`）；fetch 只需打桩 `/api/novels/:id/planning` 一个端点。
4. **CM-05 引用格式通过**：与 :607 模板一致（`【叙事卡片：序列一·穷县；ID=card-a；作品=…】…`），实现时需从打包 fixture 暴露 `useChatStore`（有先例）。
5. **RED 预期（原 P1）**：CM-08 原稿「菜单关闭+披露豁免」复合断言与「RED 应通过」矛盾。已按审核建议 (a) 收窄为纯豁免断言并修订 RED 声明；CM-05 补明「整体判失败（draft 断言通过）」。
6. **打包/断言可靠性通过**：esbuild 打包已实测可行；`details[open]` 属性 + 菜单层可见性双重断言可靠；菜单层定位建议用 CSS module 导出类名或 `details > div` 结构选择器；CM-06 焦点断言可行。
7. **用例增补（已并入）**：
   - 新增 CM-10：对话框类菜单项（「详情」）点击后菜单关闭 + `[role="dialog"]` 出现 + 焦点入对话框，覆盖方案声明的「setDialog 与关菜单同事件分发」回归点。
   - CM-09 补 bounding box 坐标提示（菜单 padding 仅 6px，防误命中按钮抖动）。
   - CM-02 顺带 z-index 抬升/回落断言（`.eventCard:has(details[open])` 联动）。

## 问题清单处理

- P1-1（CM-08 自相矛盾）：已修订，CM-08 收窄为纯披露豁免断言。
- P2 建议项：全部并入 204 修订版。

最终用例集：CM-01～CM-10，RED 失败集 {CM-01,02,03,04,05,06,10}，RED 通过集 {CM-07,08,09}。
