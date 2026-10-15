# 剧情提示词模板库定向测试报告

2026-10-14。结论：本轮全部定向测试与Windows Electron模板路径通过。141 tests / 141 pass / 0 fail / 0 cancelled / 0 skipped；构建通过；真实Windows八项验证通过。仅执行本目标相关用例，没有运行全库或全流测试。

## 覆盖与内容验收

最终重点库为74条：通用23、爱情9、推理9、奇幻5、科幻7、仙侠6、都市6、恐怖5、历史4。覆盖用户54个明确项，净新增70条；剧情90→160，创作向导401→471，加29条原服务提示词后完整内置库500条。

全部471向导条目通过schema和taxonomy检查，全部160剧情具备执行合同，74重点逐条验证筛选、单独及四环节完整拼贴。500条跨集合标准化正文无重复；重点方法主体无重复；独立内容审核审读最终74与旧90及其他原库的任务差异，修订发现的强同义条目，结论见 `06-content-review.md`。29服务提示词保持既有变量声明合同。

## 定向执行结果

| 层次 | 实际结果 | 证据 |
| --- | --- | --- |
| 单元 | 89/89，完整内容、元数据、筛选、拼贴、去重及旧库机制回归 | `docs/evidence/plot-template-library/green.log` |
| 集成 | 30/30，真实PGlite/CAS/历史、旧401升级、作者修改停用保护、关闭重开、portable导入导出与原dispatcher | 同上 |
| 浏览器 | 22/22，原React管理与向导；新增路径用真实PGlite→template dispatcher提供数据，受控传输到Chrome | 同上 |
| 构建 | `npm run build` exit0；正式renderer及worker构建，TypeScript阶段通过 | `docs/evidence/plot-template-library/build.log` |
| Windows Electron | 8/8，正式React/IPC/PGlite及进程重启 | `docs/evidence/plot-template-library/windows/report.json` |

正式测试命令使用本机Node24.19.0和现有Chrome：

```text
node --import tsx --test --test-concurrency=1
  tests/unit/plot-template-library.test.ts
  tests/integration/plot-template-library.test.ts
  tests/integration/local-template-library.test.ts
  tests/integration/local-template-library-review.test.ts
  tests/integration/local-template-dispatcher.test.ts
  tests/browser/plot-template-library.test.ts
  tests/browser/local-template-management.test.ts
  tests/browser/local-wizard-templates.test.ts
  tests/browser/local-template-library-review.test.ts
```

以上为一条命令的换行展示；`SHAKEINK_TEST_CHROMIUM` 实际设为 `C:/Program Files/Google/Chrome/Application/chrome.exe`。构建及Native命令同样使用Node24，并将该运行时加入PATH。原47条模板相关回归与本轮94条一起合跑，总计141；没有用启动冒烟冲抵逐项内容与业务测试。

## 真实Windows证据

运行 `node scripts/verify-plot-template-library.mjs`，最终第五轮exit0。隔离空目录，无作品、无模型或Key；预设已完成首次引导，启动和重启只真实点击“暂不配置”关闭原无模型提示。

1. 真实状态文件保持models为空。
2. 全部74重点经实际worker IPC与当前源正文及metadata完全相等，471向导、160剧情。
3. 实际顶栏应用菜单按钮→app.menu IPC→真实临时原生Menu.popup→真实模板菜单callback，原管理窗显示完整新增正文。
4. 原侧栏入口打开原创作向导，160剧情卡片可读；完整十五节拍详情→使用→确定，完整正文进入真实composer，发送按钮因无模型禁用。
5. 原管理窗显式保存作者修改和停用，版本增长为2。
6. 关闭实际Electron进程再离线启动，从实际磁盘恢复471条与已自定义的正文、v2、停用状态及来源。
7. Windows目标进程树监听核查，两个loopback监听均通过Node/Chrome调试器`/json/version`验证，仅为Playwright测试仪器。
8. 目标流程renderer HTTP请求0、pageerror 0；HTTP请求由测试隔离策略阻断。

截图：`windows/manager.png`、`windows/wizard-detail.png`、`windows/composer.png`、`windows/reopened.png`；主代理已视觉检查详情、输入框和重启后的v2停用状态。原生菜单验证通过真实callback而非物理菜单项点击；不是安装包或macOS验收。

## RED与执行问题记录

| 记录 | 实际结果及处理 |
| --- | --- |
| `red-environment.log` | sandbox子进程spawn EPERM，未执行产品测试；获得本地进程执行权限后重跑 |
| `red.log` | 原401下90项数据/领域RED；另2项浏览器初次缺安装路径，不混记为产品RED |
| `red-browser.log` | 指定现有Chrome后2项真实组件RED，缺160卡片及新增正文 |
| `red-curation-review.log` | 旧社会上升/复仇机制未区分，1项RED后改写并回归 |
| `red-curation-review-02.log` | 旧潜伏/幕后/反派机制未区分，1项RED后改写并回归 |
| `windows-attempt-01` | 1项前置完成后被首次主题引导挡住；修隔离fixture，不改产品 |
| `windows-attempt-02` | 已退出无模型提示，旧静态账户标签失配；改用实际动态aria-label |
| `windows-attempt-03` | 3项完成，创建作品双同名入口strict失败；按实际DOM选择原侧栏scope |
| `windows-attempt-04` | 3项已记录，向导已将全部字符送入composer；默认textContent忽略BR导致比较失败，按真实呈现改用innerText完整比较 |
| `windows/report.json` | 最终8项全部通过，先前失败完整保留，未改写成通过 |

数据修订均有独立内容复核；fixture、locator和读取方式修订均经独立代码审核再执行。最终源码与实际Native报告的hash再次匹配，合跑结果、文件范围和源码hash汇总在 `docs/evidence/plot-template-library/run.json`。

## 验收边界

本轮“可跑通”已证明每条重点具备合格输入与输出合同、可真实入库/升级/导出导入/筛选/拼贴，真实Windows消费和离线持久化也通过。没有配置供应商或发送生成请求，不能把以上结果写成所有外部模型的实际生成质量通过。没有运行全库/全流、macOS、安装器或其它业务验收；相关总体台账状态不提升。
