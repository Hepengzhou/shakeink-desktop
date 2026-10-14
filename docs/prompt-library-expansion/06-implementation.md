# 剧情提示词模板库实现记录

实现以原创作向导和既有本地模板管理为入口。净新增70条、升级四个稳定ID为重点模板；重点库74条、剧情160条、向导471条，29条服务提示词保持原样，完整内置库500条。

## 实现与原因

| 文件 | 实际变更 |
| --- | --- |
| `src/lib/creation-wizard/templates/plot-prompt.ts` | 类型化提示词工厂；从作者对话读取输入，统一六段合同、缺省方案、阶段表与自检，无未绑定服务变量 |
| `src/lib/creation-wizard/templates/plot-structures.ts` | 23种通用方法，含用户19项、三幕、八序列、场景与余波、Freytag；完整十五节拍、十二阶段和七点 |
| `src/lib/creation-wizard/templates/plot-genres.ts` | 八类51条专门套路；每条独立方法、因果步骤、交付物，题材使用原taxonomy，两个仙侠ID复用 |
| `src/lib/creation-wizard/templates/curation.ts` | 23个旧ID内容或标题修订；全部旧剧情补执行合同，保留原metadata和原始输入数组 |
| `src/lib/creation-wizard/templates/plot-library.ts` | 汇总74重点模板 |
| `src/lib/creation-wizard/templates/index.ts` | 原位置按ID替换四条，再追加70新ID；其余旧条目经curation，消费者不变 |
| `tests/integration/local-template-library.test.ts` | 原401导出常量改为当前内置集合长度；保持既有行为断言 |

原始八个语料数组未改；真实旧401升级测试直接从这些数组建立旧默认。`LocalTemplateLibrary.initialize()` 仍通过原defaultHash判断升级资格：精确旧默认升级，作者修改与停用保留，升级保留历史。没有改schema、数据库迁移、dispatcher或向导UI。

## 独立审核修订

初版内容审核识别旧囤货、掉马、归隐、主题融合与世界观语料的同义任务，先定向改写18个ID。进一步完整旧90审读又发现五组重叠，分别修成资格信用、联合恢复追偿、潜伏任务声誉掩护、无公职信息中介、反派旧伤害修复；两个新增回归用例实际RED后修订，独立复验89项单元全通过。

题材“替死鬼”原指令允许三种身份全部相同，独立审核将其收紧为至少一处可验证错位。Windows验证脚本原先假定macOS应用菜单，改为实际顶栏按钮→app.menu IPC→临时原生菜单→真实callback；发送按钮名与当前组件一致。监听检查验证目标进程树，并区分Playwright必需的Node/Chrome调试端口；隔离目录清理前核对真实路径与前缀。

## 验证证据归属

初始RED共90条数据/领域失败；浏览器首次缺安装路径，使用现有Chrome后两条真实组件用例也RED。环境失败与产品RED分别保存，不混计。独立方案、用例、代码、内容审核分别保存在本目录的04、05、06文件。

正式定向合跑、构建与实际Windows结果见 `07-verification.md`。未运行全库或全流测试；供应商实际生成、macOS和安装包不计入本轮执行证据。
