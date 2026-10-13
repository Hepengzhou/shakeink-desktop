# 浏览器用例范围与最终证据独立审核

日期2026-10-13，2026-10-14补审，审核人sidebar_design_review。本轮只读核查另任务的content-drawer方案/用例/fixture与当前真实源；未改生产、测试、其他任务文档，也未重新执行测试。全51/49已归档为Native10 resize修正前历史；最新全52实际535tests/516pass/19fail（全CD）、scope50实际516/516pass，二者1068源稳定，完整事实见 `2026-10-14-sidebar-navigation-final-evidence-review.md`。范围回归不替代全仓失败/allAcceptance=false。

## 新增两文件的范围结论

`tests/browser/content-drawer.test.ts` 与 `content-drawer-popup.test.ts` 属于**另项已批准设计、待实施的右侧内容抽屉新功能用例**，不是左导航v8累计要求的回归契约。它们可以保留在全部51文件的实际执行中，不能因范围不同删除、skip、弱化期待或把未执行算通过。若失败，仅凭新设计期待未实现不能归因本次左导航回归；须逐标题比对实际错误和源码。本报告未审核/批准其正式TDD门禁，也不把普通全量运行称为另任务认可的根因red。

| 范围 | 具体源/文档证据 |
| --- | --- |
| 独立新设计 | `2026-10-13-content-drawer-plan.md:3`引用另一已批准HTML；`:7,9,15,31`新增右锚固定W/H、独立contentPhase/窄屏运动、隐藏后保留Panel和实例；`:33–37`新增data-content-restore、局部Portal暂停、共享primitive和不可见editor命令门控。这些是尚待实现的右抽屉能力。 |
| 左导航边界 | `design/sidebar-navigation/technical-plan.md:9,69`允许ChatPanel/ContentTabs的caption恢复联动，并明确不改业务面板映射/key/编辑器。左抽屉的并行content/chat轨道和单一writer兼容，不等于右侧冻结/保活/Portal生命周期的独立实现。 |
| 另任务阶段 | `content-drawer-plan-review.md:5`只准入用例阶段、不代表实现/测试通过；`content-drawer-test-review.md:5,24–34`尚有P2-2控件几何/scale和P2-3 app-region缺口，修订补审前不准入根因red/TDD。`content-drawer-test-cases.md:3,33`明确待执行定义及先独审再根因red。 |
| 当前产品差异 | `DashboardShell.tsx:48–49`仍直接挂真实ContentTabs，无右固定inner；`useSidebarDrawer.ts:175`原隐藏完成时contentMounted=false；`ChatPanel.tsx:1720–1725`原内容恢复按钮仅按contentHidden展示，未加data-content-restore。只读rg在生产layout/ui/desktop范围未找到ContentDrawerInteractionContext/content-drawer/contentPhase/data-content-restore。当前源未实施上述右抽屉能力。 |
| 真实组件与隔离边界 | `content-drawer-fixture.ts:61–87`保留真实Shell/hook/Group/Panel/SidebarTree/ContentTabs/stores/adapter/命令和共享UI，ContentTabs proxy只捕获真实回调并转发原组件；AI/body和fetch被隔离（`:32–58,76,81–86`）。不能用此证明数据库/IPC/Monaco或29类业务。 |
| 测量及行为期待 | fixture`:117–126`无右wrapper时退回实际ContentTabs/#content；`:150–185`按真实V变化识别连续运动，不只按缺phase过滤。主suite`:14–32`先验证真实宽/文字行框再其他新契约；Popup suite`:29–72`要求owned菜单/Select/Tooltip暂停而`:75–110`保留外部菜单/业务Dialog。缺生产wrapper不是其测量启动失败，但具体失败仍以实际日志为准。 |

## 统计与报告规则

旧首帧修正前48文件495项是历史完整浏览器run。现有51文件比它新增本次sidebar-drawer-measurement和上述另任务两文件。全51应保存完整实际TAP/JSON/哈希及全部失败标题；若2文件出现未实施新功能失败，后续“旧48＋本次measurement”的49文件回归须另存独立命令及准确清单，**只能称该范围回归，不得称仓库全量通过**。专项数量有交集，不相加制造总数。当前全51未读到最终结果，所有数量/原因最终要以实际报告核对。

## 此次只读快照

| 文件 | SHA-256 |
| --- | --- |
| tests/browser/content-drawer.test.ts | 8a0f68a05a3427f28afdf2b9d8882083bd7dd6cf975eaea3335f622eb844f8e5 |
| tests/browser/content-drawer-popup.test.ts | 0b2705e910f47192dcbf8e07ad6e2a65b8a69a3537e2796d204c1ec927ea67d6 |
| tests/helpers/content-drawer-fixture.ts | d389ea349bfde899b74da7e70d6f37826547aceca592c1c82ee98ae8fd67c50d |
| docs/reviews/2026-10-13-content-drawer-plan.md | d4ab331cb9d2daa069cd2f9d782b0cdcb41f7163afbca8373abd51057919ca93 |
| docs/reviews/2026-10-13-content-drawer-test-review.md | 68dc85a906717d41e2333be971fdccaaa875f6d0993cd405b1e63f67a7a73cbe |

## 全51实际结果补审

已读 `regression/browser.json`、完整TAP尾统计及全部19个not ok源定位：**51文件、524测试、505通过、19失败、0取消/跳过，exit1**；changedSourcesDuringRun为空。19失败标题均为CD-01–07，定位仅上述2文件，当前measurement和旧48未出现not ok。完整run仍为failed，不重写成passed或将失败漏出汇总。

失败具体包含首次/closing宽度变化、窄屏无右motion、contentPhase未定义、缺data-content-restore及owned Portal未暂停等，符合尚未实施右抽屉契约。但不能将19项全部断言为正确产品根因：CD-06业务Dialog失败是共享Select显示`two`与fixture期待`/第二项/`不一致，属于须由该任务作者复核的用例/显示协议边界；其他细因亦需各任务的独立red门禁与实现审核。当前只审范围和报告真实性。

## 49文件范围 runner 只读核查

`regression/run-scoped-browser.mjs`当前SHA-256 **863543fb77521067a3f1b9030fd7317fdef6490625b6ba51d2a14118e6c444e6**。选择只从保存的旧48文件报告加本次measurement，Set去重排序，严格49总数、所有文件存在且当前全部suite差集恰为上述2个CD文件；不静默排除其他测试。命令仍Node24/Chrome/concurrency2/原timeout，统计完整TAP、逐失败标题和src/desktop/tests前后hash（含新增/删除）。输出另名sidebar-scope-browser.*，原全51失败保持，scope/exclusionReason明确不等于全仓或native/数据库验收。

两点媒介边界应如实保留：存在性检查拒绝已有输出，但不构成跨进程原子占位；当前唯一运行不得再启动同名runner。status由进程exit/error决定，源变化另外记录，最终读回必须单独确认changedSources为空；若非空应拒绝通过，不仅依据status=passed。当前49尚未读最终结果，未提前计通过。以上均不要求修改/停止当前被冻结源或弱化断言。

## 49文件范围实际结果补审

已只读核 `regression/sidebar-scope-browser.json/tap`：**49文件、505测试、505通过、0失败/取消/跳过，exit0**；failureNames为空、changedSourcesDuringRun为空，1067项src/desktop/tests源hash读回保存。suiteFiles与旧48加measurement准确一致，excludedSuites恰为上述2项，完整命令和范围说明保存。本次独立执行结果可称“左导航及实施前既有49文件范围回归通过”；原全51的524/505/19、exit1报告保持，不能称仓库浏览器全量通过。两次505数量相同不使run互相替代，也不将专项加总。

**范围、选择来源及实际结果事实审核通过，报告阻断0。** 本轮不改变任何产品或用例期待，不推进另一任务实施；Windows06失败的选点诊断、最新构建及最终验收结果另审。全仓core及全51的既有/另任务失败仍须在最终总结准确披露。

## 新 resize 用例加入后的范围 runner 补审（2026-10-14）

新增sidebar-drawer-resize后全部browser为52文件；范围选择明确为**旧48＋measurement＋resize=50文件**，仍仅排除原两个CD文件，所有CD生产/用例不改。当前生产另有Native10真实resize P1，方案/用例/red/修正/代码审与新构建后才执行新结果，不能以旧49绿代替修正后的回归。

已核runner旧归档SHA **863543fb77521067a3f1b9030fd7317fdef6490625b6ba51d2a14118e6c444e6**与当前SHA **08683cd533c4571664bc0599caa21141fb5e7f6af1312cb317697ae0a1cc49c1**：只有第11行新增resize选择、第15行49→50、第21/33行相应范围/保留说明变化。原去重/来源旧48、存在性、恰两个expectedExclusions、旧输出拒覆写、命令/超时/TAP统计/前后源hash都保留；本审核实际Node24 `--check` exit0。**最小runner源审核通过，blocking=0，仅允许满足产品门槛后执行，不提前计通过。** 既有原子占位/源稳定人工复核边界仍见上节。

已核归档文件实际存在：`sidebar-scope-browser-before-native-resize-fix.json` SHA **eeaad9cd6e083b1788aec45912a0ce8945444464b9a90550412cff739a95eea5**，`browser-before-native-resize-fix.json` SHA **964c0553a637bad4c98e39503585dc2c8d83ab7aab26e07fc6d5b867e2724474**。旧49/505通过和全51/524中19失败及core现状保留；新50范围和完整52各自保存真实命令/统计/全部失败/稳定hash，并明确范围。不能以新范围报告覆盖全仓失败或把未执行native、不可达empty full分支计通过。
