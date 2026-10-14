# 剧情提示词库独立代码审核

2026-10-14。独立审核者 `plan_review`。只写本记录；未修改产品、作者测试、其它台账或既有未提交文件。

## 结论

**产品整合逻辑通过；新增旧库内容修订待独立复验，尚未冻结最终通过。**完整通用23条、题材51条、重点74条已经落入真实语料入口；四个稳定 ID 复用，70条净新增，剧情160条、创作向导471条、加29服务提示词合计500条。首次独立单元自查87/87通过，未发现产品整合、类型合同或升级逻辑的阻断问题。其后独立内容审查新增“小人物登高路”“她回来讨债了”的强同义发现，作者增加定向用例；相应资格/信用与联合恢复性追偿机制须在当前源码及新增用例复验后冻结。

审核中发现的 Windows 脚本应用菜单假设与监听证据缺口已经修复并复核。这个结论是代码审核及定向自查结论，不替代后续真实数据库、浏览器、Electron 的正式执行结果；未执行供应商生成，也没有安装包或 macOS 验收声明。

## 产品代码及边界

已读 `templates/plot-prompt.ts`、`plot-structures.ts`、`plot-genres.ts`、`plot-library.ts`、`index.ts`、`curation.ts`，包括最后写入的仙侠、都市、恐怖、历史条目。

- `plot-prompt.ts:16` 使用类型化 spec 生成现有 WizardTemplate，channels 固定为空，genres/tags 拷贝为新数组，正文提供输入与缺省、方法、步骤、输出和自检。缺信息时问题与标注假设的候选方案并行，不需要 `{{变量}}`、模型预设、网络查询或自动保存。没有向 portable template 写入新的分组字段。
- `plot-structures.ts` 的23条方法分别给出机制及专项交付物；十五节拍、十二阶段、七点、八序列完整，五幕以幕目标及幕末不可逆变化推进，Freytag以中央高潮及下行后果推进。起承转合与起承转结、宏观潮汐与场景余波、环形与代际循环及真实时间重置有明确用途差异。
- `plot-genres.ts` 的51条均使用既有 taxonomy。爱情条目分别处理对立策略、表演关系、长期路线选择、权力差距、家庭压力、信息误判、旧关系修复、成长差异和阵营责任；都市修罗场专门处理同场承诺碰撞。推理条目先建真相及证据可见性，找锅、嫁祸、替死鬼分别按责任链、证据污染、目标/身份错位运行。奇幻预言与仙侠被选中者、科幻灾后生态与旧庇护治理、历史复现与穿越/架空改写分别规定不同边界。没有仅换名字后复用同一方法正文的新增条目。
- `index.ts:24` 建立重点ID映射，逐条替换原数组中的四个相同ID，再追加不在原 ID 集合中的条目。`curation.ts` 的 `curateTemplate()` 创建新对象/正文，未原地修改旧数组；非剧情且不在定向修订清单的条目直接保留。剧情补合同保留原指导问题，定向同义条目保留原 ID 及既有筛选元数据。
- 对八个原始语料数组以及 `desktop/shared/template-library.ts`、`desktop/service/template-library.ts` 执行 `git diff --exit-code -- <这些路径>`，实际无差异。旧401基线、schema及本地服务没有被本轮改写。增量正文由既有 `initialize()` 的精确旧 hash 分支更新；customized、停用及用户副本保护沿用真实逻辑。没有新增默认模型、平台后备、数据库字段、HTTP服务或替换原React界面。

标准化正文/ID/同类标题全500条去重由真实单元检查通过；方法主体剥离公共合同后仍唯一。机器检查不能独立证明所有旧语料的语义差异，全库强同义条目的内容审查仍以独立内容审核记录及具体修订 ID 为依据。

## 定向测试代码审核

`tests/unit/plot-template-library.test.ts` 读取独立 coverage 清单，检查471/160/74/29/500数量与全部主ID。每种题材都要求与台账 genres 完全相同、所有声明题材实际可达、一个不相关题材实际排除；通用模板遍历频道、题材与篇幅。每条重点验证六段合同、无服务变量、完整单条/四环节拼贴。全471条 schema/词表、29服务变量声明及全库标准化正文检查没有把服务模板的合法变量误判成缺省漏洞。

`tests/integration/plot-template-library.test.ts` 从未 curation 的原始八数组建立旧401基线。实际服务升级测试覆盖70新增、旧ID完整、精确默认版本和历史、作者正文/停用保护、用户副本完整正文/版本/来源/enabled，以及重复初始化快照不变。关闭重开测试实际关闭 Workspaces，并新建同目录实例，按内置ID集合核对471。portable测试对完整导出文档检查4MiB/schema，实际预览/导入到隔离空库，逐条比较471条正文；不会只凭导出字符串长度冒称导入通过。

`tests/browser/plot-template-library.test.ts` 使用真实PGlite、LocalTemplateLibrary、template dispatcher和原CreateNovelDialog/useWizardTemplates/chat store，受控fetch只适配传输，没有模拟语料库。实际点击160剧情分类、详情、使用、确定和题材选择，断言完整草稿与autoSend关闭，并检查只出现模板读取路径。此证明是原组件加真实本地消费链，不能写成Electron IPC或物理原生菜单操作通过。

`tests/integration/local-template-library.test.ts` 的修改只把旧401标题和导出长度断言改成当前 WIZARD_TEMPLATES.length，保留原初始化幂等、变量、导入/导出、作者数据保护的其它断言。独立旧401升级用例仍保留硬编码基线，未用动态当前数量掩盖迁移基线。

## Windows验证脚本及已修复发现

`scripts/verify-plot-template-library.mjs` 在隔离 mkdtemp 数据根启动真实Windows开发Electron，读取重建worker的完整74重点正文并与当前源码比较；实际管理界面读取、作者修改及停用、关闭重开落盘、原向导完整拼贴和无模型发送禁用均有具体断言。成功/失败分别写report，截图和sourceHashes仅用于对应真实运行证据；失败不写passed。

1. **已修复的P1：Windows应用菜单取法。**初稿 `Menu.getApplicationMenu()` 与真实 `desktop/main/index.ts:667` 只在darwin设置应用菜单、`:762` 在Windows清除窗口菜单的行为不符，必然无法定位模板入口。最终脚本实际点击“应用程序菜单”，经 `app.menu` IPC创建临时Menu.popup；测试钩子保留原popup调用并捕获真实菜单，关闭popup后调用其中真实“文件/模板与提示词”callback。证据如实标为原生菜单callback，无物理菜单项点击声明。发送按钮名称也已按原ChatPanel修正为“发送”。
2. **已修复的证据缺口：HTTP监听。**只拦截renderer请求不能证明主进程/worker没有监听。最终脚本增加Windows目标进程树及Get-NetTCPConnection检查，先逐行验证监听地址仅loopback，再检查各端口 `/json/version` 确认只属于Playwright必要的Chrome/Node调试器，并记录调试参数。该调试HTTP明确属于测试仪器；不能把它宣称为产品HTTP服务，也不能从本脚本延伸声称安装版监听检查已通过。

脚本没有配置模型或供应商Key；初始隔离state的models为空，renderer HTTP请求被阻断并要求请求列表为空。创建的作品与正文仅是隔离测试夹具。未发现引用真实作者目录、改写父Web目录或更改应用schema/UI的行为。真实执行仍须在本轮正式renderer/worker重建后进行。

## 本审核实际执行的命令与结果

```powershell
node --check scripts/verify-plot-template-library.mjs
node --import tsx --test --test-reporter=spec tests/unit/plot-template-library.test.ts
```

最终脚本语法检查通过。定向unit自查实际为 **87 tests / 87 pass / 0 fail / 0 skipped**，退出码0。初次沙箱执行因本地子进程spawn EPERM未能启动测试；重跑获得本地子进程执行权限后通过，这是执行环境限制，未将未执行写成产品通过。没有新增镜像实现的测试、运行npm test、全浏览器、全业务或全流测试。

本审核未执行integration/browser/Windows脚本；对应正式GREEN、真实运行截图与报告由主代理后续验收记录，本文件不自评这些项目已通过。
