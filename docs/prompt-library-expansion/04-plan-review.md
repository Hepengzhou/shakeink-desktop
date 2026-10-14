# 剧情提示词模板扩充独立技术方案审核

2026-10-14。审核者为独立子代理 `plan_review`。审核范围为 `01-research.md`、`02-product-design.md`，以及真实创作向导语料、筛选、拼贴、本地模板服务与 portable schema。本轮只写本记录，未修改产品代码、既有未提交文件，未运行全库或全流测试。

## 结论

**通过。**技术方案可实施，可进入定向测试 RED。最终复核时 `02-product-design.md`、`03-test-cases.md` 和 `coverage.json` 已补充 Freytag 金字塔独立主条目，并一致采用下述 **500 条**全内置去重范围。数量、内容与真实运行结果仍须由后续实现和验收证明，本审核不代表模板已添加或测试已通过。

## 覆盖与数量核对

用户明确列举通用 19、爱情 7、推理 7、奇幻 3、科幻 5、仙侠 4、都市 4、恐怖 3、历史 2，共 54 项。设计表逐项列全，最终规划分别为 23、9、9、5、7、6、6、5、4，合计 74 条，各组均超过明确项数。新增 Freytag 金字塔作为独立经典结构，原计划的五幕以幕目标推进，Freytag 以中央高潮及下行后果推进，须保持两条不同的交付物。英雄之旅与作家之旅、环形与循环叙事、循环叙事与科幻时间循环、找锅与嫁祸与替死鬼已经规定不同方法目标，后续正文须保持这些差异，不能仅以名称证明不重复。

源语料实际读取命令：

```powershell
node --import tsx -e "const { WIZARD_TEMPLATES } = require('./src/lib/creation-wizard/templates'); const { PROMPT_TEMPLATES } = require('./prisma/seed-templates'); console.log(JSON.stringify({ count: WIZARD_TEMPLATES.length, counts: Object.fromEntries(['theme','world','character','plot'].map(cat => [cat, WIZARD_TEMPLATES.filter(x => x.cat === cat).length])), seedCount: PROMPT_TEMPLATES.length }));"
```

实际读取为创作向导 401 条，其中主题 120、世界观 122、角色 69、剧情 90；另有服务提示词 29 条。聚合来源为 `src/lib/creation-wizard/templates/index.ts:11`，服务提示词来源为 `prisma/seed-templates.ts:12`。

四个旧稳定 ID 存在：`plot-three-act-skeleton`（`plot-a.ts:39`）、`plot-generic-mainline`（`plot-b.ts:49`）、`plot-trash-awakening-rise`（`plot-a.ts:8`）、`plot-jilted-groom-rise`（`plot-b.ts:26`）。故 74 − 4 = 70 净新增，90 + 70 = 160 剧情，401 + 70 = 471 创作向导模板，计算成立。只读解析最终 `coverage.json` 得到 74 个唯一 ID、恰好四个原 ID、70 个新 ID，九组数量与设计一致且无未知题材。`plot-generic-mainline` 改为场景与余波，是保留 ID、变更方法的精确默认升级；需在用例中同时断言新方法存在及原三幕只留一条主条目。

**已落实的范围说明：**471 只指创作向导模板；内置提示词与创作模板合计为 471 + 29 = **500**。同类标题、标准化正文及正文去重涵盖整个内置集合，并跨创作向导/服务提示词集合比较。服务提示词的 `{{变量}}` 属于已有运行时绑定合同，不能按新增剧情“无未绑定变量”的规则一概判为错误；需验证其声明与提取变量一致。用户副本、作者修改与停用状态属于受保护数据，不纳入自动内容重写或删除。

## 真实产品接入与升级保护

`filter.ts:52` 的频道与题材条件只在模板数组非空时限制匹配，标签组无本组标签也兜底通过；通用重点模板使用空 channels/genres/tags 可真实跨题材显示。题材条目必须逐一使用 `taxonomy.ts` 中已存在词表，并验证用户从对应题材能找到它们，不能只验证空筛选。

`compose.ts:12` 原样拼接定位与所选提示词；真实 `CreateNovelDialog.tsx:317` 使用该函数。该方案不引入新的占位符渲染或自动发送流程，六段执行合同可直接进入现有可编辑草稿。`desktop/shared/template-library.ts:10` 为严格 WizardTemplate schema，类型/题材分组应留在独立覆盖台账或源码定义中，不能把 `group` 等新字段写进 portable template。

`desktop/service/index.ts:45` 在真实服务启动时调用 `initialize()`。`template-library.ts:63` 仅更新来源为 builtin、当前正文与旧 hash 精确一致且默认 hash 已变化的条目；`saveWizard()` 路径在 `:109` 将编辑过的内置条目标为 customized。正文或 enabled 状态参与 hash，因此作者修改、停用条目不会被新默认覆盖。稳定 ID 的复用/新增不需要改数据库 schema。需使用实际 PGlite 证明精确旧默认更新、版本/历史增长、修改保护、停用保护、用户副本保护以及二次 initialize 不重复新增，并重开同一隔离数据目录复验。

## 内容、去重与可运行证据

已有两个同类同名条目 `plot-three-act-skeleton`、`plot-generic-mainline` 经源读取确认；囤货、掉马、追悔相似条目的明确重写方向合理。相同母题出现在主题、世界观、人物、剧情不自动等于重复，审核应比对目标、触发条件、推进机制、交付物。精确文本测试不能证明语义去重，后续独立内容审查须覆盖新增与旧库的交叉比较，保留可核查 ID 和结论。

每条重点正文包含输入、缺省、方法、步骤、输出、自检，并对缺关键信息提供标明假设的方案，能够形成完整模型输入。十五节拍、十二阶段等方法按自身节点数输出，避免统一节点合同破坏其定义。史实、待核实项与虚构拆开是必要的输出合同。

“可跑通”分为内容合同、真实持久化/读取/导入导出/拼贴、真实组件/Windows Electron 入口三个证据层次，设计 `02-product-design.md:47` 已如实声明没有供应商生成证据。`desktop/core/settings.ts:44` 和 `:48` 的默认模型 ID 为 null、models 为空；本次不得为验收添加默认模型或平台后备，也不得把受控输出、静态审查写成真实供应商生成通过。最终总结应保留这个证据界限。

## 用例审核门槛

后续定向用例必须逐项覆盖独立 `coverage.json` 的 54 明确要求和 74 重点 ID；分别断言 70 新 ID、4 旧 ID、160 剧情、471 创作模板和 500 全内置集合，检查 schema、词表、输入/输出合同、正文去重及机制差异。筛选/拼贴要对全部重点条目执行，而真实组件与 Electron 的入口交互可按实际功能路径代表性验证，不能以一次启动代替全部条目的数据验证。

只运行本轮目标的明确测试文件/命令，禁止 `npm test` 或全工作台全流验证。遵守调研 → 设计与独立审核 → 测试用例与独立审核 → RED → 实现 → 独立代码/内容审核 → 定向 GREEN 与真实目标验证 → 测试报告和总结的顺序；只追加本轮实施台账，不覆盖其他任务正在编辑的内容。
