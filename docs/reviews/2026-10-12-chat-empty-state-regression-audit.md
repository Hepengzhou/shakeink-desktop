# AI 首屏完整回归失败归属审计

初稿日期：2026-10-12；审计更新：2026-10-13（Asia/Shanghai）。代理：production_audit。当前结论：最终专项 60/60、Windows 可观察范围 20 组及原标题栏两个串行复验均通过；最新核心完整运行 1946 用例/1903 通过/40 失败/1 取消/2 跳过保留原记录。其 DR65-01 单独审计后仅提高 fixture 的 inode 采样精度，原文件完整 9/9 专项通过，不改写核心总计。浏览器三次整体尝试分别超时、超时、中断；随后两个逐文件运行覆盖全部 38 文件，原组合结果 360 用例/359 通过/1 失败。唯一 LUI23-14 经运行时诊断证实为预置 fixture 未隔离 HEAD 的新手引导，明确授权后仅补一个 child 隔离，原 14 项独立 RED→GREEN 全过；最新 coverage JSON 与当前 38 测试/7 生产 hash 核对，360/360。该浏览器结论是各文件完整证据的组合，没有宣称重新运行了一次完整全量 runner，也不能宣称仓库全部用例通过。

本审计只读核对生产源码、HEAD、运行日志与历史基线。主代理先后明确授权本代理修复两个 AST rig（`tests/browser/ai-caption-message-drag.test.ts`、`tests/unit/pane-window-drag.test.ts`）及一个 legacy child fixture（`tests/browser/work-lease-ui.test.ts`）；没有修改生产代码、其他测试或外部历史日志，也没有新增广泛并发运行。

## 已读取证据与范围

- 当前核心全量：`docs/evidence/chat-empty-state/core-full-portable.tap`。
- 本轮较早核心全量：`docs/evidence/chat-empty-state/core-full.tap`。
- 当前浏览器全量：`docs/evidence/chat-empty-state/browser-full-portable.tap`，截至本审计读取尚无最后的 `# tests/# pass/# fail`。
- 历史基线：`C:/Users/Administrator/AppData/Local/Temp/node24/baseline-tests.log`；SHA-256 `2896128418ad32e4c76f447449bf286b53c8156f4304884376f616087c2b65d2`。
- 引导任务既有结果：同目录 `full-tests-v2.log`；SHA-256 `c39da92b9f134f9a15583a07cc2d03e60d26f32f8e1f4eb1a714c4c71495f707`，以及 `2026-10-12-onboarding-modal-verification.md`。
- HEAD：`4ac44e1`，`fix: redesign desktop toast notifications`。核对 `git diff --name-only -- desktop/service desktop/core desktop/main tests/integration/desktop-worker.test.ts tests/browser/caption-alignment.test.ts` 无文本修改；生成 routes 文件只出现 Git 的 CRLF 提示，不证明业务变更。

历史日志用 spec reporter（`✖`/`ℹ`），当前用 TAP。比对提取完整用例名称并去除重复失败总结，而不是只比失败数字。历史基线 summary 为 1904 条/1856 通过/42 失败/4 取消/2 跳过；引导任务结果为 1908 条/1861 通过/41 失败/4 取消/2 跳过。“已知 41 失败”另外有 4 取消，因此不通过名称集合实际有 45 项。

## 前次便携核心全量结果与归属（历史）

`core-full-portable.tap` 已出现最终 summary：**1946 条，1902 通过，41 失败，1 取消，2 跳过**，650600.9397ms。它包含 42 个 `not ok` 名称，其中 40 个在历史引导结果的 45 项不通过集合内；仅 DRAG-01/DRAG-04 两个不匹配历史集合。39 个既有断言失败与一个既有 timeout 对应当前不通过项，两个新增 rig 失败已在独立修复后通过，原完整日志仍保留失败事实。

较早 `core-full.tap` 为 1946 条/1895 通过/48 失败/1 取消/2 跳过；与历史集合不匹配的 10 项为 7 个 ModelPicker 回调夹具、CMP47-05 一个 composer 命令源码提取夹具、DRAG-01/DRAG-04 两个 pane 源码夹具。主代理已修复模型查询抽取后的依赖注入及 composer 提取，本代理修复 pane 提取。较新便携运行结果中模型和 composer 这 8 个名字已不再失败。不能把全部 10 项起初都归成历史环境失败。

| 当前类别 | 证据与结论 |
| --- | --- |
| IPC-01，原作品列表响应旧断言 | 当前 TAP 在 `tests/integration/desktop-worker.test.ts:30` 报期望 `{novels:[]}`、实际多 `unavailableWorks:[]`。HEAD 的 `desktop/service/dispatcher.ts:89–94` 已返回该字段，HEAD 的测试仍为旧期望。两份历史日志均有同名且相同错误，属于既有契约夹具失配；本轮没有修改 dispatcher 或这个测试。 |
| AR104-C01…04、AC36 系列 | 同名均在两份历史日志中；当前多为 `APPLICATION_COLD_SOURCE_UNREADABLE`，栈进入未改的 `desktop/core/application-cold-source.ts:154/192/343`，另有布尔断言及 AR104-C02 的 10000ms timeout。本次只证实其既有性与未触及模块，未逐项重现物理文件替换或证明所有错误都由 Windows 导致。 |
| AR105-G02，Windows ESM URL | 当前日志明确 `ERR_UNSUPPORTED_ESM_URL_SCHEME`，Windows 的裸 `D:` 路径被当成 URL scheme，测试位于 `application-metadata-flight-105-review.test.ts`；历史同败，实际运行 Node 为 24.21.0。该项有直接平台/工具链证据，不能推广为其他失败的统一原因。 |
| CFG58-04、CFG16 | 当前 `INVALID_SNAPSHOT`，栈在未改的 `configuration-transfer.ts:71/151`；历史同名失败。本审计没有修改设置、快照 schema 或模型凭证。 |
| 其余已知名字 | 当前集合与历史相交包括 DesktopApp rig、持久草稿、只读导出、renderer multipart、运行时检查、原配置模型 rig 等。它们仍是失败，不因历史存在就记为通过；深层原因需要各自对应模块任务核验。 |
| DRAG-01/DRAG-04 | 本轮根 class 从字面量改为 `cn(...)`，旧 `className()` 只识别 StringLiteral，pane 为 undefined 后报 children/openingElement TypeError。属于这次合法结构变化引起的测试提取问题，已按授权修复并通过，详见下一节。 |

历史基线只用于归属对照，不是最新生产功能正确性的替代证据。名称相交加上相关生产文件未改支持“既有同败”；没有同名/同错误支持的失败不能自动塞入已知 41 项。

## 两个本轮 AST 夹具修复

修复前使用便携 Node 24.21.0 真实执行两个目标文件，得到 3 个失败：浏览器文件顶层 JSX 提取断言、DRAG-01 和 DRAG-04。最初沙盒内启动子进程的 `spawn EPERM` 没有算产品/夹具 RED；提权正常启动后保存的真实 RED 才是依据。

- 浏览器 rig 原 `ai-caption-message-drag.test.ts:20–22` 要求根为字面 `className="chatpane ..."`，且消息 host 仍为旧 `messages.length===0 ? hidden` 结构；新根是 `cn(...)`，新 host 为常驻真实业务容器，导致原 `:29` 断言失败。
- 修复从真实 className 的 AST StringLiteral 提取 root 类，并通过直接 `scrollRef` 子节点识别真实 host/viewport；捕获局部 `showWelcome=false` 与已有 20 条合成消息一致。没有硬写替代标题/消息类，原 ThinkingRow、原标题、原 viewport JSX 继续执行。
- 单元 rig 同样识别表达式中的实际 class literals，仍核验标题是第一行、44px、先于真实工作流/恢复/建书通知，拖拽只出现在标题且不包含 editor 或业务通知。
- 原浏览器剪裁、标题首字/图标命中、body controls、恢复按钮、浮层排除断言完整保留，并增加真实消息 viewport 可见断言。

运行命令：

```powershell
$env:XAANINK_TEST_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
& 'C:/Users/Administrator/AppData/Local/Temp/node24/node-v24.21.0-win-x64/node.exe' --import tsx --test --test-reporter=tap --test-concurrency=1 tests/unit/pane-window-drag.test.ts tests/browser/ai-caption-message-drag.test.ts
```

结果：**5/5 通过，0 失败/跳过，退出码 0**，8803.1433ms；AIDRAG-05/06/07 与 DRAG-01/04 全过。证据：[RED](./2026-10-12-chat-empty-state-drag-rig-red.tap)、[GREEN](./2026-10-12-chat-empty-state-drag-rig-green.tap)。

最终 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `tests/browser/ai-caption-message-drag.test.ts` | `166a16e5714b93e029d1f7520b1518fb49f48d6cab8ee693c805459c965e67f2` |
| `tests/unit/pane-window-drag.test.ts` | `878aa3990745464c0fb4b9048a40d57e12e4146a88aa336e3c5f60f5209dbe74` |
| `drag-rig-red.tap` | `8863cb49b2479642497efe0e87d85b0c3521a03aee5722b9a28b4c767e8ad3ea` |
| `drag-rig-green.tap` | `5a7f6371dc623fa274f8d421bcda32125db1db69d8291ba939e9c173da63f8c8` |

## 2026-10-13 最终专项与原生证据独立核对

| 已读取原始记录 | 可确认结果与范围 |
| --- | --- |
| `final-scoped-budgeted.tap` | 完整 summary 为 60 tests/60 pass/0 fail/0 cancelled/0 skipped，55370.4519ms；实际 Subtest 名称包含完整真实 ChatPanel 的 20 项（新增 CES-06b）及空态/动画/原导航 40 项。没有把早期 58 通过/2 超时的文件名当成通过。 |
| `caption-alignment-serial.tap` | 5/5 通过，33951.881ms；包括 ALIGN-01 的 5 zoom×3 font×3 tab count 共 45 组合，所有原标题栏几何断言保留。较早的 120 秒超时不能继续作为该目标当前失败结论。 |
| `chat-caption-safe-area-serial.tap` | 6/6 通过，182288.9749ms，0 失败/取消/跳过；原 WCO-S01/02/03 的安全区断言保留。 |
| `windows-electron.json` | status=passed，20 checks 全 passed，errors=0，rendererHttpRequests=0，两个运行时 listeningServers 均为 0；Electron 44.6.0、Chromium 152.0.7977.130、Windows。报告的 8 个源文件/资产清单/主进程编译入口/导出 HTML/执行脚本 SHA-256 与当前文件逐个比对，全部一致。 |

Windows 执行脚本 `smoke-chat-empty-state.mjs` 直接要求 win32，启动真实编译应用、隔离临时目录、本地 API/PGlite并离线；`check()` 在 action 的真实 assert 全部完成后才写 passed。记录时间 `2026-10-12T16:02:18.698Z` 至 `16:02:42.223Z` 对应北京时间 2026-10-13 00:02 的本次最终运行，不是较早失败尝试。

原生记录确有第二真实窗口获焦（mainFocused=false、helperFocused=true）、实际隐藏时 nativeHidden=true/focused=false/frame=0；同时两主题的 `document.hidden` 都为 false。因此只证明实际 blur/native hide 可观察子项，不能把未观察到的 true visibilitychange 分支、物理输入法、macOS、供应商或安装包验收也标通过。

这些通过项证明各自范围。首屏较早的 19/19 完整组件结果与本次 20 项已做版本区分，最终新增 CES-06b 的有效发送清理旧导航错误行为以本次 60 项原始 TAP 为依据。

## 完整浏览器两次超时与 force-exit 复验

已独立读取两份完整运行 JSON，二者均为 **failed / exitCode=null / Whole suite exceeded 30 minutes / counts 全部 null**，没有最终 TAP 总 summary，不能算完整通过：

| 运行 | 实际命令预算 | 原始失败记录 |
| --- | --- | --- |
| `browser-full-portable` | Node 24.21.0，38 文件，concurrency=2，test-timeout=120000；UTC 14:40:03–15:10:03 | ai-caption-message 旧提取 rig、ALIGN-01 120 秒超时、caption-alignment 文件失败、WCO-S01 超时；具体目标后来已各自复验，初始完整记录仍保留。 |
| `browser-full-serial` | 同版本和 38 文件，concurrency=1，test-timeout=300000；UTC 14:55:22–15:25:22 | chat-caption-safe-area 与 content-tabs 文件失败；整体 30 分钟终止，无可用总计。不能仅因为串行或没有业务断言错误就标通过。 |

`scripts/check-chat-empty-regression.mjs:10–16` 从测试目录枚举全部 `.test.ts`，按实际 env 生成 Node 参数；`17–29` 保存流式 TAP，并在整体 1800000ms 后终止；`32–40` 仅从真实最终 summary 取 counts。JSON 的 null 来自没有 summary，含义是不可用，不能视作零失败。

最新 `browser-full-force-exit` 使用同一枚举、并发 1、`--test-timeout=300000` 与 Node 24.21.0 的 `--test-force-exit`，不修改或删除断言。已用该实际 Node 的 `--help` 核对 flag 存在且说明为“force test runner to exit upon completion”。此 flag 使测试完成后能退出，结果即使通过也不证明无遗留句柄、动画监听器或资源泄漏；生命周期清理需由原有实际断言单独证明。

第三轮 TAP 记录 43 个 `ok`，涵盖前段标题/剪贴板/安全区及首屏组件 20 项；最后追加时间 UTC 16:05:28，此后截至 UTC 16:13:41 约 8 分 13 秒无追加。执行者于约 UTC 16:14（北京时间 2026-10-13 00:14）通过工具 Ctrl+C 中断原 session 69884，报告退出码 1。本代理读取证据确认没有最终 JSON 或 TAP summary，因此记录为**中断、未完成**，43 个 ok 不能作为全部 38 文件通过，也不能用未出现 not ok 推定零失败。

这个实际运行并未在 `--test-timeout=300000` 后完成当前文件，因此不能称该参数已经提供严格的外部每文件五分钟边界。挂起具体原因未由本审计确证；不把它自动归为生产泄漏或忽略为环境噪声。

主代理随后新增 `scripts/check-browser-file-regression.mjs`：每文件新进程、外部五分钟文件预算及产生用例输出后两分钟无输出 watchdog，不完整/被终止记录失败，清理限制为本次 spawn 的 child.pid 树。此执行器由另一独立代理审核，原生产断言不删减。

## 首轮逐文件结果核验（保留不完整记录）

已读取 `browser-full-files.json`，实际运行 UTC `2026-10-12T16:20:19.378Z`–`16:28:50.263Z`，即北京时间 2026-10-13 00:20–00:28；Node 24.21.0、win32。**status=failed，expectedFiles=38，files=15，passedFiles=14，complete=false，counts=null，23 个 unattemptedFiles。** 不能把该报告称为完整 38 文件已执行或通过。

本代理做了以下独立数据核对，未再运行测试：

- 实际 `tests/browser` 的 38 个 `.test.ts` 排序列表，与报告的 15 个 attempted 加 23 个 unattempted 列表完全相同，无漏报或把未执行文件算入通过。
- 15 个分文件 JSON 的 testHash 均与实际测试源码 SHA-256 一致；报告 7 个生产源 hash 均与当前文件一致。
- 14 个完整通过文件的 TAP summary 与各自 JSON 的 tests/pass/fail/cancelled/skipped 逐项一致，均退出码 0、watchdogError=null、cleanupFailure=null，合计 **115 个已完成用例通过**；这是该完整子集的合计，不是全仓库浏览器总计。
- 失败文件的 TAP 确实没有总 summary；没有把中间 ok 行填入 counts。

| 完整通过的文件 | 实际用例 |
| --- | ---: |
| ai-caption-drag | 3/3 |
| ai-caption-message-drag | 3/3 |
| api-key-clipboard | 6/6 |
| caption-alignment | 5/5 |
| chat-caption-safe-area | 6/6 |
| chat-empty-state（含 CES-06b） | 20/20 |
| command-catalog-generation-review | 6/6 |
| composer-clipboard-review | 2/2 |
| composer-clipboard | 24/24 |
| configuration-transfer-ui-review | 12/12 |
| content-tabs | 14/14 |
| desktop-draft-view-after-backup-removal | 3/3 |
| desktop-modal-commands-review | 7/7 |
| desktop-recovery-integration-review | 4/4 |

`browser-files/dialog-appearance.json` 为唯一已尝试而失败的文件：exitCode=null、complete=false、counts=null、failureTitles=[]，watchdog 原因是“产生用例后两分钟无输出，文件 teardown 或下一用例不完整”，cleanupFailure 为“Owned child exit was not confirmed; stop before launching another file”。实际 TAP 有 25 个 ok 行（包含双主题真实原向导、嵌套 Base UI、onboarding guard/场景配置/菜单等原断言），没有 not ok 断言错误行，也没有最终 summary。**这只证明已观察到这些用例输出，不能称该文件 25/25 通过。**

源码 `dialog-appearance.test.ts:115–141` 仍运行原场景并在 finally dispose/page.close，after hook 仍 await browser.close；该测试与通用 `src/components/ui/dialog.tsx` 本轮未改，而真实 `CreateNovelDialog` 接入本轮预选/finalFocus。没有直接证据确定挂起来自哪一层，因此归属为**文件生命周期/清理未完成，原因未确证**，不硬归历史 41 失败、生产 UI 回归或确定泄漏。停止继续启动新文件符合执行器的清理失败约束。

后 23 文件从 `empty-content-hide` 到 `workspace-surfaces` 未执行；完整名单以 JSON 的 unattemptedFiles 为准，不能用其它专项或旧运行补成此次全量结果。本轮首屏、原输入/引用/撤销、标题安全区及内容 Tabs 的对应子集已有实际通过，仓库完整浏览器验收仍不完整。

首轮不完整事实与中间 25 个 ok 保留，不能将后续完整复验反写为首轮通过。

## 续跑最终结果与全部 38 文件覆盖核验

原生清理 helper 的独立隔离合成证据 `owned-test-cleanup.json` 为 status=passed、3 checks：仅所拥有进程树被终止、无关进程保留、错误创建时间窗口被拒绝。本代理只读核对该记录及执行器；这些是清理设施用例，不能计入浏览器业务用例。执行器继续保留五分钟外部预算、两分钟无输出 watchdog、不完整即失败的规则。

`node scripts/check-browser-file-regression.mjs resume 14` 选择全部排序文件的第 15 项开始，共 24 文件，原断言与每文件新进程不变。最终 `browser-full-files-resume.json` 运行 UTC `2026-10-12T16:43:25.614Z`–`16:47:48.882Z`（北京时间 2026-10-13 00:43–00:47），Node 24.21.0、win32，**complete=true、status=failed、24/24 文件完成、23 文件通过、245 tests/244 pass/1 fail/0 cancelled/0 skipped/0 todo**，没有 unattempted 文件。

本代理用只读数据核验脚本逐项比较，结果如下：

- 续跑 24 个分文件 JSON 均与总报告的 reports 对象完全相同；实际原 TAP 的全部 7 个 counts 与各分文件 JSON 完全一致，失败名称也一致。
- 每个分文件均有最终 summary、整数退出码，watchdogError 与 cleanupFailure 均为 null。没有把中间 ok 行、被终止文件或清理合成用例算作最终 counts。
- 修正 lease fixture 之前独立核验时，首轮 15 与续跑 24 个 testHash 均与实际测试文件一致；两个报告的 7 个生产 sourceHash 完全一致且匹配当前源码。因此两个有效切片是在相同记录生产源码版本上的覆盖证据。其后唯一授权的 lease 测试 hash 变化与专项复验在下一节单列，原报告不覆写。
- 只选首轮前 14 个完整通过文件，再加续跑的 24 个完整文件，实际列表与当前 `tests/browser` 全部 38 个 `.test.ts` 的排序列表严格相同，distinct=38。首轮失败的 dialog-appearance 不重复计入。
- 两切片合计 **360 tests/359 pass/1 fail/0 cancelled/0 skipped/0 todo，37/38 文件通过**。这是按全部完整分文件记录组合的全目录覆盖计数，不能伪称一次未中断的全量 runner summary。

| 续跑文件 | 最终用例结果 |
| --- | ---: |
| dialog-appearance | 25/25 |
| empty-content-hide | 10/10 |
| file-export | 7/7 |
| local-template-library-review | 2/2 |
| local-template-management | 10/10 |
| local-wizard-templates | 8/8 |
| pane-window-drag | 3/3 |
| preview-text-commands | 16/16 |
| recovery-preview-review | 3/3 |
| recovery-preview | 3/3 |
| review-model-selection | 6/6 |
| root-maintenance-pending-review | 4/4 |
| root-maintenance-pending | 3/3 |
| root-maintenance-screen | 14/14 |
| root-maintenance-ui-review | 10/10 |
| root-relocation-history | 4/4 |
| root-relocation-routing | 2/2 |
| root-relocation-screen | 23/23 |
| sidebar-restore-safe-area | 9/9 |
| toast-appearance | 47/47 |
| work-lease-ui-review | 4/4 |
| work-lease-ui | **13 通过/1 失败，共 14** |
| works-loading | 11/11 |
| workspace-surfaces | 7/7 |

dialog-appearance 此次有真实最终 25/25 summary、exitCode=0 且无 watchdog/cleanup 失败，可确认此次完整文件通过。此前挂起原因依旧未确证；新 helper 在无 watchdog 的正常续跑文件没有触发，不能凭先后顺序称 helper 修好了该文件挂起。`--test-force-exit` 的通过结果仍不证明没有资源泄漏。

## LUI23-14 独立失败归属

`browser-files-resume/work-lease-ui.tap` 明确记录 LUI23-14 的 testCodeFailure：`tests/browser/work-lease-ui.test.ts:107:476` 在旧实例卸载、重挂新工作台并发送旧拒绝/旧事件以后，断言全局 `getByRole('dialog').count()===0` 实际得到 **1**。该文件有最终 14 tests/13 pass/1 fail、exitCode=1，watchdog/cleanup 均为 null；这是可用的真实断言失败，不是挂起、缺 Chrome 或无 summary。后续主代理定向运行的 `work-lease-ui-retry.tap` 也出现同一 `1 !== 0`，未因一次重复执行变为通过。

只读 `git diff HEAD --name-only` 核对本测试、DesktopApp、WorkLeasePendingDialog、OnboardingController、onboarding-flow、desktop store、settings 及通用 Dialog/Button 均没有本轮相对 HEAD 修改。DesktopApp 最近相关提交为 `cb26ea3`（2026-10-11，desktop onboarding），lease 测试最近提交为 `c22efdf`（2026-10-10）。这支持“这些源码不是本轮新增改动”，不单凭这一点将断言判成环境问题。

源码有明确的夹具隔离疑点：

- `work-lease-ui.test.ts:33,40,47–49` 隔离其他工作台子组件，但没有隔离真实 OnboardingController；每次 mount 使用 `defaultState`，其中 `desktop/core/settings.ts:48–49` 为 `models:[]`、`onboarding:null`。
- `DesktopApp.tsx:48,178–183` 新实例默认请求 startup/auto 引导，bootstrap 后无 lease 屏障时正常显示真实 controller。`onboarding-flow.ts:4–7` 对 onboarding=null 必然返回 full/theme，`OnboardingController.tsx:19,65–68` 对应真实“选择主题”Dialog。这种合法新实例引导也会使全局所有 dialog 的数量为 1。
- 旧 lease 的拒绝保护仍在 `WorkLeasePendingDialog.tsx:12,20,23–24`；旧 DesktopApp 事件回调在 `:116` 检查 alive，`:149` 将其置 false 并 unsubscribe。源码未显示需要为本轮首屏修改这些屏障。

这首先支持“旧 lease 夹具未隔离已存在于 HEAD 的自动新手引导”的推断；本代理在后续明确授权后，按下节诊断运行时确认了实际 dialog 标题，而没有直接改产品屏障或放宽全局 dialog 数量断言。

已只读检索历史浏览器日志并比较具体错误：`ai-caption-drag/browser-full-final.log:1423`、`workspace-surfaces/browser-fixtures-final.log:1334` 等有同名通过；较旧 `window-controls-theme/browser.tap:1790`、`workspace-surfaces/browser-final.log:1857` 等同名失败是 esbuild 的 15 个 mock 导出错误，另一次为缺 Chromium。检索到的当前以前记录没有同名 `1 !== 0`。历史成功不覆盖当前新实例行为，历史同名 build 错误也不能冒充当前相同失败；**本项不属于核心既有 41 失败集合的已证实同败**。

## 仅 lease fixture 的诊断、授权修正与 RED→GREEN

主代理另明确授权先生成临时 diagnostic variant，只在确认无关引导以后补充本测试的 `controlled-workspace` child 隔离。本代理先从未修改的原文件生成 `work-lease-ui-diagnostic.test.ts`：仅在 LUI23-14 的原全局 dialog 数量断言前输出合成 DOM 的标题/文本，没有修改或删除任何断言。目标实测输出如下，原断言仍失败、exitCode=1：

```json
[{"title":"选择主题","text":"选择主题欢迎使用玄印写作。选择适合你的主题。宣纸温润明亮玄墨沉静深色跟随系统随系统切换继续","hidden":null,"slot":"dialog-content"}]
```

这是唯一残留 dialog，运行时来源与真实 OnboardingController 的 theme 步一致，而不是作品锁或 ChatPanel。随后独立运行未改原测试全 14 项，得到 **13 通过/1 失败、0 取消/跳过、exitCode=1**（9794.6774ms），保存 `work-lease-ui-rig-red.tap`。诊断单目标的 0/1 不冒充原文件完整 RED 总计。

只在 `work-lease-ui.test.ts:33–36` 的既有 emptyChildren 增加 `"./OnboardingController":"OnboardingController"` 并添加三行原因注释；resolver 继续仅在真实 DesktopApp importer 中产生原有 `()=>null` 子组件。选择 generic null 与其它工作台 child 的隔离方式一致：去除无关 startup 引导 UI，不调用 onExit、不伪造引导完成/模型配置/修复成功，也不添加会改变真实 DesktopApp guideRequest/ref 的新生命周期作用。真实 DesktopApp、WorkLeasePendingDialog、原 bootstrap/subscribe/dispose/reply/晚回复逻辑以及全 14 条原断言保持。这个 fixture 的覆盖仍是作品锁屏障，不能据此宣称引导/其它命令行为已验收。

修正后的原文件全 14 项实际 **14/14 通过、0 失败/取消/跳过、exitCode=0**，9176.1159ms，保存 `work-lease-ui-rig-green.tap`。未放宽 `dialog.count()===0`、file.save enabled 或原草稿不变断言。去掉新增注释与这一 map entry 后与 HEAD 内容逐字一致（仅统一换行），独立比较 `OnlyAddedBoundaryAndComment=true`。

本次完整 RED/GREEN 命令如下；诊断另外带 `--test-name-pattern=LUI23-14` 并指向 diagnostic 副本。未启动全量或并发测试，force-exit 的资源证明边界保持不变。

```powershell
$env:XAANINK_TEST_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
& 'C:/Users/Administrator/AppData/Local/Temp/node24/node-v24.21.0-win-x64/node.exe' --import tsx --test --test-reporter=tap --test-force-exit --test-concurrency=1 --test-timeout=90000 tests/browser/work-lease-ui.test.ts
```

| 文件 | SHA-256 |
| --- | --- |
| 修正前 lease 测试（原 resume JSON） | `b41afda91f57ca3001162156c5e0a5cda2b5ae7a71c5dff4b4aaa6193e4b3fb3` |
| 修正后 `tests/browser/work-lease-ui.test.ts` | `6a4b961562d9db78139fe76466cf776a35606d65907231baaaac967778acda61` |
| `work-lease-ui-diagnostic.test.ts` | `11afb696243f20ee3724e6c59df3932f278fa90031cee1d6fe93c852feeb93a9` |
| `work-lease-ui-diagnostic.tap` | `89fdd18749d205a6700af3dcd95e8c36f0cdcfc0a973e6273115d14780ca55ba` |
| `work-lease-ui-rig-red.tap` | `430c955be48e5a912eb171be2619f34904ebed6b7db18ca5be76da5d78b19f8f` |
| `work-lease-ui-rig-green.tap` | `3f20da55465b1c034d6182d27aec5b6628bab071b4e7934665f2d6b6c7b2b7a2` |

因此以原两切片中的其余 37 个完整文件记录，加这个 hash 绑定的修正后完整 14 项 GREEN，按每文件最新记录覆盖全部 38 文件、合计 **360/360 通过**；原 resume 的 359/1、RED 及历史 timeout/挂起报告保持原样。这是分段覆盖加明确 fixture 修正后的专项替换，未伪称新一次完整全量运行。主代理将交另一独立代理复审这份最小测试 diff；生产源码未修改。

上述 lease 修正时核心仍为旧便携结果；其后主代理完成新的全量核心运行，下面单独记录，不覆写历史。

## 最新核心完整运行与 DR65-01 新增名称审计

`core-full-final.json/tap` 运行 UTC `2026-10-12T16:55:20.609Z`–`17:03:51.201Z`，对应北京时间 2026-10-13 00:55–01:03，Node 24.21.0、win32。真实命令保留 `--test-force-exit --test-concurrency=2 --test-timeout=120000`，覆盖当前 unit/integration 的全部 **266** 个 `.test.ts` 文件；本代理核对命令文件列表与实际目录列表严格相同。最终 TAP counts 与 JSON 完全一致：**1946 tests/1903 pass/40 fail/1 cancelled/2 skipped/0 todo，exitCode=1、status=failed**。TAP duration 为 509277.3085ms；JSON 起止墙钟为 510.592 秒，二者口径有区别。JSON 的 7 个生产 hash 全部匹配当前文件；该 flag 的资源证明边界仍保留。

实际不通过名称比对：便携运行中 DRAG-01/DRAG-04 两个本轮 AST rig 名称已消失；新增名称只有 **DR65-01**；其它共同的 40 个不通过项是 39 个失败加 1 个取消。故不能说本次仅减少两个失败、零新增，也不能把 DR65-01 合入这 39 个共同失败。

`core-full-final.tap:4221–4247` 的 DR65-01 有直接深相等错误，来源 `data-root-directories-review.test.ts:29`：保留外部空目录的 inode 实际 `39406496740159527`，预期 `39406496740159530`，device 相同。断言没有删除目录或丢失正文的直接日志；当前证据是 inode 字符串不一致，应保留失败而不夸大为已证实的数据丢失。

在采样修正之前只读 `git diff HEAD --name-only` 对测试、`desktop/core/data-root.ts`、`root-ownership.ts`、`directory-sync.ts` 和 `desktop/main/owned-root-files.ts` 为空。测试最后相关提交为 `00a1705`（2026-10-08 初始快照），data-root 为 `8854c85`（2026-10-12 已有 root recovery），本轮首屏实现没有修改这些生产模块；其后唯一测试差异如下单列。

这项不是引导任务 v2 的 41 失败同败：`full-tests-v2.log:650`、本轮前次 portable `:4221` 以及更早 Chat 首屏 `core-full.tap:4349` 均记录同名通过。但原改动前 `baseline-tests.log:2414–2432` 与早期 `caption-alignment/core-full.tap:3885–3911` 曾出现相同深相等断言、同一 `:29` 栈，且仅 inode 不同。因此它是**相对本轮上一完整结果重新出现、另有更早同错误历史的项**，不是凭名称塞入当前 39 既有失败，也不能因历史失败就改记通过。

修正前源码提供可核验的数值精度疑点：测试 `:25` 用 `stat(p)` 默认的 Number Stats 生成预期；真实 `root-ownership.ts:15–19` 用 `lstat(path,{bigint:true})` 生成精确身份。本代理仅运行无文件操作的 JS 数值比对，三个真实日志数字都大于 `Number.MAX_SAFE_INTEGER=9007199254740991`，且逐个满足：

| 原始日志 | bigint actual | 默认 Number 转回字符串 | 记录 expected |
| --- | --- | --- | --- |
| core-full-final | `39406496740159527` | `39406496740159530` | `39406496740159530` |
| 改动前 baseline | `10696049115875129` | `10696049115875128` | `10696049115875128` |
| 较早 caption-alignment | `11258999069653581` | `11258999069653580` | `11258999069653580` |

这些值直接符合默认 stat 的 Number 舍入失真，而不是两个不同 inode 已被证明。主代理独立运行未改原整个 unit 文件，`data-root-directories-retry.tap` 实际 9/9、0 失败/取消/跳过，58111.061ms，说明原 fixture 的失败随采样值变化；没有把这个偶发通过改记为全量通过。

最终最小修正只将 DR65-01 hook 的 `stat(p)` 改为 `stat(p,{bigint:true})`，inode/dev 仍按原结构转换字符串、foreign 空目录不得被认领删除的深等价断言、迁移回滚与真实 PGlite 冷开等全部原 9 项保持。生产源码没有改动。本代理只读实际 diff，确认只有该调用增加选项；`2026-10-12-chat-empty-state-code-review.md:57–61` 已由 implementation_review 独立复审通过。

修正后主代理实际原文件完整运行退出码 0，`data-root-directories-bigint-green.tap` 原始 summary 为 **9 tests/9 pass/0 fail/0 cancelled/0 skipped/0 todo**，48937.7778ms（48.94 秒）。本代理只读核对 summary 与当前 hash，没有启动新测试或修改该文件：

| 文件 | SHA-256 |
| --- | --- |
| `tests/unit/data-root-directories-review.test.ts` | `73f283a8dacd392d198a691961dde69d9f16c7ce1bd2eca8e47ca2635d19c65f` |
| `data-root-directories-bigint-green.tap` | `c6208b3e87ff8f2d1e1c34683e1febfa488be093b101d6b03552d8c6cd086860` |

该修正提高预期身份精度以匹配既有生产契约，没有放宽断言。它只证明修正后该文件的 9 项通过；原 `core-full-final.json/tap` 的 **1903 pass/40 fail/1 cancelled/2 skipped** 完整结果保持，不减为 39、不推算或宣称 1946 全绿。本轮最终审计只更新本文件。

## 最终浏览器 coverage JSON 复核

`browser-final-file-coverage.json` 明确 scope 为“首轮前 14 + 续跑 24，仅替换已审核 lease fixture 的独立 14 项 GREEN；非新一次整组运行”。本代理逐个核对其原始报告来源、TAP 和当前文件：

- 38 个 reports 文件名与当前目录排序严格相同，distinct=38，无漏项或重复；38 个 testHash 均匹配当前测试，包括修正后 lease hash。
- 原其余 37 文件的 counts/exitCode/status/complete/watchdogError/cleanupFailure/failureTitles 与两个 sourceReports 相同，其实际 TAP 都有对应最终 summary。
- lease 单文件引用独立 GREEN 的 TAP hash 匹配，最终 summary 是 14/14、exitCode=0；没有用中间 ok 或诊断 0/1 替换。
- 每个文件 complete=true、status=passed、exitCode=0，失败名称、watchdog、cleanup 均无异常；7 个生产 sourceHash 全部匹配当前文件，与核心最终版本一致。
- 实际相加得到 **360 tests/360 pass/0 fail/0 cancelled/0 skipped/0 todo**，与 coverage JSON counts 完全一致，核验 errors=[]。

因此可确认全部当前浏览器文件有上述版本绑定的完整通过证据；这份 JSON 是分段覆盖汇总，不能称一次整体运行、不能抹去旧 359/1 和三次整体不完整记录，也不证明资源零泄漏、原生/供应商或完整核心全部通过。
