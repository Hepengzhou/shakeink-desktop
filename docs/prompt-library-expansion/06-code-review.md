# 剧情提示词库独立代码审核

2026-10-14。独立审核者 `plan_review`。只写本记录；未修改产品、作者测试、其它台账或既有未提交文件。

## 结论

**最终通过，可进入主代理定向 GREEN 与 Windows Electron 真实验收。**完整通用23条、题材51条、重点74条已经落入真实语料入口；四个稳定 ID 复用，70条净新增，剧情160条、创作向导471条、加29服务提示词合计500条。首次独立单元自查87/87通过；独立内容审查随后发现的5条旧库强同义修订现已完成原文复核，最新定向自查 **89/89通过**。未发现产品整合、类型合同、升级逻辑或本次5条追加修订的剩余阻断问题。

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

`tests/unit/plot-template-library.test.ts` 读取独立 coverage 清单，检查471/160/74/29/500数量与全部主ID。每种题材都要求与台账 genres 完全相同、所有声明题材实际可达、一个不相关题材实际排除；通用模板遍历频道、题材与篇幅。每条重点验证六段合同、无服务变量、完整单条/四环节拼贴。全471条 schema/词表、29服务变量声明及全库标准化正文检查没有把服务模板的合法变量误判成缺省漏洞。作者追加的两条PLX03回归用例覆盖下面5个旧ID的关键机制，保留原87项断言。

`tests/integration/plot-template-library.test.ts` 从未 curation 的原始八数组建立旧401基线。实际服务升级测试覆盖70新增、旧ID完整、精确默认版本和历史、作者正文/停用保护、用户副本完整正文/版本/来源/enabled，以及重复初始化快照不变。关闭重开测试实际关闭 Workspaces，并新建同目录实例，按内置ID集合核对471。portable测试对完整导出文档检查4MiB/schema，实际预览/导入到隔离空库，逐条比较471条正文；不会只凭导出字符串长度冒称导入通过。

`tests/browser/plot-template-library.test.ts` 使用真实PGlite、LocalTemplateLibrary、template dispatcher和原CreateNovelDialog/useWizardTemplates/chat store，受控fetch只适配传输，没有模拟语料库。实际点击160剧情分类、详情、使用、确定和题材选择，断言完整草稿与autoSend关闭，并检查只出现模板读取路径。此证明是原组件加真实本地消费链，不能写成Electron IPC或物理原生菜单操作通过。

`tests/integration/local-template-library.test.ts` 的修改只把旧401标题和导出长度断言改成当前 WIZARD_TEMPLATES.length，保留原初始化幂等、变量、导入/导出、作者数据保护的其它断言。独立旧401升级用例仍保留硬编码基线，未用动态当前数量掩盖迁移基线。

## Windows验证脚本及已修复发现

`scripts/verify-plot-template-library.mjs` 在隔离 mkdtemp 数据根启动真实Windows开发Electron，读取重建worker的完整74重点正文并与当前源码比较；实际管理界面读取、作者修改及停用、关闭重开落盘、原向导完整拼贴和无模型发送禁用均有具体断言。成功/失败分别写report，截图和sourceHashes仅用于对应真实运行证据；失败不写passed。

1. **已修复的P1：Windows应用菜单取法。**初稿 `Menu.getApplicationMenu()` 与真实 `desktop/main/index.ts:667` 只在darwin设置应用菜单、`:762` 在Windows清除窗口菜单的行为不符，必然无法定位模板入口。最终脚本实际点击“应用程序菜单”，经 `app.menu` IPC创建临时Menu.popup；测试钩子保留原popup调用并捕获真实菜单，关闭popup后调用其中真实“文件/模板与提示词”callback。证据如实标为原生菜单callback，无物理菜单项点击声明。发送按钮名称也已按原ChatPanel修正为“发送”。
2. **已修复的证据缺口：HTTP监听。**只拦截renderer请求不能证明主进程/worker没有监听。最终脚本增加Windows目标进程树及Get-NetTCPConnection检查，先逐行验证监听地址仅loopback，再检查各端口 `/json/version` 确认只属于Playwright必要的Chrome/Node调试器，并记录调试参数。该调试HTTP明确属于测试仪器；不能把它宣称为产品HTTP服务，也不能从本脚本延伸声称安装版监听检查已通过。

独立内容审查追加的5条旧库问题均按主代理保留的定向RED后修改，最终源码逐条复核如下：

| 稳定ID | 实质机制变化与专项交付 | 与原同型条目的区别 |
| --- | --- | --- |
| `plot-underdog-climb` | 资格门槛、信用证据、担保责任、利益交换、准入规则变化 | 上升由获认可的资格与社会关系推动，不能用逐级战斗/等级突破作结果。 |
| `plot-revenge-she-returns` | 姓名/财产/名誉剥夺、证据重建、自愿受害者联盟、联合追偿、返还兑现 | 主目标为权利恢复与共同诉求，不是逐个摧毁仇人的长期复仇名单。 |
| `plot-mocked-waste-hidden-edge` | 掩护可信证据、潜伏任务、同伴保护、暴露预算及撤离 | 隐藏实力服务有期限和完成条件的任务，不是连续曝光强大身份或旧身份追责。 |
| `plot-power-broker-behind` | 无公职中介、信息分发、承诺互锁、代理人自主偏离/反噬、履约 | 无正式命令权，结果依赖各方自主行动与信用，不等同朝堂任职、联盟夺权或全知操控。 |
| `plot-book-villain-self-rescue` | 既有伤害/持续命令、停止损害、资源返还/补偿、受损者同意边界、旧阵营阻力 | 当前接手的权力和伤害构成修复责任，不能只使用原著知识避开炮灰死亡节点。 |

五条均有7项专门步骤及独立交付物，保留旧ID和筛选metadata；source数组仍无差异。后两种恢复性责任故事与隐退者追责共享责任母题，但分别处理现任控制权的持续伤害、受害者联合取回权利、旧身份/旧决定的证据回返，触发主体、行动权限及交付范围不同，未发现仅换人物后重复相同操作合同。

脚本没有配置模型或供应商Key；初始隔离state的models为空，renderer HTTP请求被阻断并要求请求列表为空。创建的作品与正文仅是隔离测试夹具。新增integration/browser测试和Windows脚本在递归清理前检查realpath后的目标是tmpdir直属、名称符合本用例mkdtemp前缀；不会对未确认的计算路径执行递归删除。未发现引用真实作者目录、改写父Web目录或更改应用schema/UI的行为。真实执行仍须在本轮正式renderer/worker重建后进行。

## 本审核实际执行的命令与结果

```powershell
node --check scripts/verify-plot-template-library.mjs
node --import tsx --test --test-reporter=spec tests/unit/plot-template-library.test.ts
```

最终脚本语法检查通过。第一次定向unit自查87/87通过；5条旧库修订及2条作者回归用例完成后的复验实际为 **89 tests / 89 pass / 0 fail / 0 skipped**，退出码0。初次沙箱执行因本地子进程spawn EPERM未能启动测试；重跑获得本地子进程执行权限后通过，这是执行环境限制，未将未执行写成产品通过。最后再次执行原始语料及schema/service路径的 `git diff --exit-code` 无差异。没有新增镜像实现的测试、运行npm test、全浏览器、全业务或全流测试。

本审核未执行integration/browser/Windows脚本；对应正式GREEN、真实运行截图与报告由主代理后续验收记录，本文件不自评这些项目已通过。

## Windows启动fixture最小修订复核

2026-10-14追加，**通过，可重跑本轮Native验收**。仅复核 `scripts/verify-plot-template-library.mjs` 的隔离启动前置，产品语料/服务/schema/UI不在此次修订范围；没有运行引导全流或重复业务测试。

第一轮真实报告保留在 `docs/evidence/plot-template-library/windows-attempt-01/report.json`，status为failed、仅“空模型”1项检查完成，等待账号菜单超时，尚未执行模板操作；不能将它计作模板或Windows验收通过。

最终fixture由 Workspaces 初始化并关闭空隔离root，使用 `structuredClone(defaultState)` 构造本次状态，经原 `stateSchema.parse()` 验证后以真实 VersionedStore 接受的 `{schemaVersion:1,revision:0,value}` 格式只写这个root的state.json。completed=true、step=welcome、引导文本/图片ID及receipt均为null，原agent模型ID也为null、models=[]；没有修改共享defaultState、造作品/章节或配置供应商凭据。

独立复核还发现，原 `onboarding-flow.ts:5` 对“已完成且空模型”仍返回models/entry，所以单纯标completed不能消除启动提示。最终launch每次（包括离线重启）在等待账号菜单之前实际点击原 `OnboardingController.tsx:90` 的“暂不配置”退出按钮；不开始配置、提交模型或测试主题/资料/模型引导流程。这个动作只建立本轮无模型工作台的真实前置，保留models=[]，没有伪造一个模型来绕过门控。

最终脚本再次 `node --check scripts/verify-plot-template-library.mjs` 通过、退出码0。真实Native成功与否仍由下一轮实际报告证明；本追加不声明目标运行已通过。

## Native第二轮就绪定位器复核

2026-10-14追加，**单行修订通过**。真实 `SidebarTree.tsx:1968` 的账号按钮aria-label为 `账号菜单：${user.name} ${user.email}`，固定“账号菜单”exact匹配不能命中。脚本launch改用 `getByRole('button', {name:/^账号菜单：/}).waitFor(...)`，仍等待真实账号按钮可见，只避免绑定动态姓名与邮箱；没有跳过就绪或后续模板断言。单行外的流程保持原审核范围，`node --check`再次通过。第二轮failed报告保留在 `windows-attempt-02`，不计为模板操作通过；可进入第三轮实际Native验收。

## Native第三轮入口消歧复核

2026-10-14追加，**单行消歧及当前完整脚本复核通过，可进入第四轮**。第三轮 `windows-attempt-03/report.json` 如实记录failed，已完成空模型、真实worker IPC的74条重点原文对照（471向导/160剧情）与Manager完整新正文显示，共3项；后续向导、作者保存、重启及监听尚未执行，不能计作通过。

真实报错明确列出两个“创建作品”入口：sidebar中的原按钮与ChatEmptyState中已批准的同名卡片。最终脚本 `getByTestId('sidebar').getByRole('button',{name:'创建作品',exact:true}).click()` 使用报错实际DOM给出的侧栏scope，选择本轮原定入口，未用first/nth忽略冲突，也未跳过点击或削弱结果断言。SidebarTree原按钮仍调用setCreateOpen(true)，后续仍要求原创作向导可见、160剧情、完整详情/草稿、无模型发送禁用、作者显式保存与停用、实际关闭重开后正文/版本/来源/状态持久及目标进程监听检查。当前完整脚本无产品或验证范围变更，`node --check`再次通过、退出码0。

## Native第四轮composer文本读取复核

2026-10-14追加，**读取方式修订及当前完整脚本复核通过，可进入第五轮**。第四轮failed报告保留在 `windows-attempt-04`，运行已到真实composer正文核对；仍只把报告中已完成的3项计为已完成，完整草稿/无模型发送禁用组合检查及保存、重启、监听尚未完成。

原 `src/components/chat/composer-editor.ts:394` 将草稿换行渲染成BR，再逐行插入文本节点。textContent连接文本节点会忽略BR的换行，而innerText读取实际排版文本；第四轮报错的单行Received字符串与这一路径一致。安装的Playwright `types/test.d.ts:9490` 明确支持 `toContainText` 的useInnerText选项。脚本改为 `toContainText(saveCat.template.prompt,{useInnerText:true})`，仍以完整提示词原文作expected，只更换DOM读取属性；没有删字、缩短expected或自行剥离文本绕过内容核对。发送禁用、保存版本/停用、重启原文/来源与监听断言全部保留，`node --check`再次通过、退出码0；本记录不把下一轮预期通过写成已执行。
