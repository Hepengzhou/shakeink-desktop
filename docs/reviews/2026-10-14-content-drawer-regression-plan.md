# 内容抽屉全量浏览器回归诊断与旧用例迁移准入

日期：2026-10-14。状态：独立审核准入后的最小旧测试迁移已实施并专项通过，生产/测试再次冻结，待根代理全量复验。首次落盘为只读诊断方案，当时未修改生产或测试源、未启动附加浏览器用例。

## 实际结果与同源依据

`docs/evidence/content-drawer/regression-browser-01/browser.tap` / `browser.json`：53 个文件、559 tests、552 pass、7 fail、0 cancelled/skip/todo，退出 1，`stableSources=true`。该组合使用真实 Chrome、bundled Node24、concurrency=2；此前 `green-05/run.json` 的专项使用 concurrency=1、62/62 pass。

将全量记录的 Windows 反斜线 key 与专项记录的正斜线 key 统一后，green-05 所记录的全部 17 个生产/测试源 SHA-256 与本次全量执行前记录一致。没有通过源变化解释失败；不同并发度也只作运行条件记录，不能据此宣称偶发或产品无问题。

## 七项失败的证据分类

| 失败 | 本次日志实际失败位置 | 源码核对与当前结论 |
| --- | --- | --- |
| DRAG-01 | `pane-window-drag.test.ts:73` → `region:67`，`#chat > div:first-child` 缺失，30s timeout | 三条 DRAG 共用初始化在第 37 行向 store 写入 `{platform:'darwin'}`。真实 ContentTabs 第 44 行新增的无条件 caption zoom 读取在 context=null 时访问 `bootstrap.settings.appearance.zoom`。该输入缺少 settings，确定会抛 TypeError；React 同一 root 随后缺失与日志吻合。真实 Bootstrap 的 StateSnapshot 合约要求 settings（`desktop/shared/ipc.ts:33–35`），此夹具输入不符合合约。 |
| DRAG-02 | 同文件第 87 行 `.content-tabs-caption` 缺失，30s timeout | 与上项共用不完整 bootstrap；尚未进入 drag/no-drag 几何断言。 |
| DRAG-03 | 同文件第 116 行 `[role='tablist']` 缺失，30s timeout | 与上项共用不完整 bootstrap；尚未进入 overflow/active reveal 断言。 |
| DRAWER-RESIZE opening first/all 1800-899 ink DPR1.5 | `sidebar-drawer-resize.test.ts:110`，`Resize begins during actual motion` 要求 opening，实读 open | 第 138 行实际 Playwright click 返回后，`resizeWhileMoving` 另等 70ms 才读阶段。失败发生在 `page.setViewportSize` 及 `assertMoving` 之前，没有本次 resize 形变证据。已 arm 的 raw rAF 仍在页面内，错误发生后未保存。需记录真实输入及阶段时钟，区分实际动作时序与 driver 返回时序。 |
| DRAWER-03 narrow 899px overlay retains width and desktop preference | `sidebar-drawer.test.ts:48`，mid.phase 要求 opening，实读 open | 实际 click 返回后另等 100ms；此处 phase 是第一个失败断言，后续 W/V/translate 断言未执行。相同源在 green-05 通过，不能直接归因于 DPR、形变或偶发。 |
| SURF-04 原 Shell hide/restore/fullscreen/empty handlers | `workspace-surfaces.test.ts:280` 等待 `.workspace-content` detached，30s timeout；日志先 5 次 visible，后 57 次 hidden | 批准方案第 35 行明确 contentMounted 只负责首次创建、隐藏保留 Panel/ContentTabs。当前 Shell 第 47–55 行依 contentMounted 保留节点，现旧 detached 预期与批准保活要求冲突。第 287 行关最后 Tab 的第二次 detached 预期也需按同一契约迁移；这次尚未执行到第二处。 |
| SURF-01/04 narrow/workspace | `workspace-surfaces.test.ts:315`：selected surface width 不等于窗口宽 | 日志没有记录 width/pane/phase/V，不能精确认定失败分支或真实终态缺陷。源码第 302–306 行只等 sidebarPhase，第 308 行两帧后就读 geometry。选择 content 时 sidebar 已 closed，右内容独立 contentPhase 仍可 opening；第 325 行 inactive chat 必须 0 还与批准窄屏“chat 全宽保留在右覆盖层下方”冲突。需要先记录具体分支并依据真实右终态判定，不能把此错误直接记为已证明的产品形变。 |

DRAG 的 TypeError 是只读源表达式验证，不伪称本次浏览器已输出该 pageerror：原夹具第 64 行将 errors 断言放在 run 之后，提前 locator timeout 会跳过它。ChatPanel header 的 AST 在基线与当前源均只有一个 `h-11` 节点、同一真实 desktop-drag caption，不是提取错 JSX 的证据。

本次失败的 resize raw 文件未落盘；`docs/evidence/sidebar-navigation/resize-measurement-unspecified/ink-DPR1.5-opening-1800-899.json` 时间为此前 03:29，不能作为本次全量失败的逐帧证据引用。

## 最小迁移范围及不变判据

生产保持冻结。仅计划修改以下旧测试/夹具；仍须独立审核准入后实施，并保存新 label，保留本次完整失败证据。

1. `tests/browser/pane-window-drag.test.ts`：将已为真实 Chat header 定义的完整 appearance zoom bootstrap 同样传入真实 store；保留真实 ContentTabs 和所有 caption 对齐、drag/no-drag、overflow、active reveal 断言。初始化后立即检查 rendering errors，使 React 渲染异常不会被缺元素 timeout 遮住。没有理由放宽生产 Bootstrap 合约或 mock ContentTabs/context。
2. `tests/browser/workspace-surfaces.test.ts`：先补诊断输出，失败必须携带实际 width/pane、左右 phase、outer Panel/viewport 的 V、固定 inner W、两侧 rect、inert/aria-hidden 与 divider。SURF04 等右 closed 与 V≈0、右 separator 无占位，并验证已挂载身份与颜色保留，替代 detached；真正关闭最后 Tab 仍验证 Tab/body 生命周期及 empty caption 恢复入口。SURF narrow 等对应左右动作的实际终态（不能仅等 sidebar closed），再测 selected viewport 全窗跨度、drawer 零占位、真实 underlay 全宽且 inert。content 选中时 chat underlay 应保留全宽并 inert；chat 选中时右 viewport V=0 且 inert，而右 inner 可保留完整 W。保留原 .1px/.03px 边缘、无 divider/亮缝、双主题颜色判据，不以隐藏 DOM 的完整 W 当可见占位。
3. `tests/browser/sidebar-drawer.test.ts` / `sidebar-drawer-resize.test.ts`：先保存原 driver 的真实 pointerdown/up/click target/trusted/timestamp、Node action 起止时间及全部 prearmed rAF（phase、V/W/H/transform/viewport）。即使前置失败也保存 trace，不把缺帧静默跳过或降低精度。确认时序后可将 mid 采样安排在预先注册的浏览器 rAF、以实际 moving 开始为时钟；实际 resize 则在真实输入已触发 opening 时发出真实 Playwright viewport resize，避免等待 click 返回后再固定延迟错过动作。resize 的 actual moving/V 门槛、首个可见/resize 首帧及全部连续 W/H/caption/item/实例/偏好判据保持；没有 moving 帧或 viewport 未在运动期间真实变化仍失败。此项具体 driver 变更待 trace 证明后补审，不能只删 phase 前置检查。

如果完整终态和上述正确边界下仍发现差异，应保存独立产品 red、补充方案并修正式源；不能把所有旧用例失败预先归为测试迁移。SURF narrow 的当前具体分支以及两个 sidebar phase 的真实时序仍是未解决的证据缺口。

## 执行顺序

独立审核本诊断及迁移范围 → 根代理完成当前 core/native 同源组合 → 获准后先保存旧 driver 的具名诊断与 DRAG 浏览器渲染异常证据 → 测试夹具最小迁移 → 对涉及文件以同 Node24/Chrome 执行并保存新 evidence label → 独立核对 oracle 与源 hash → 根代理全 browser 组合复验。不开额外业务数据/模型/网络服务，不将隔离夹具当真实 Windows/Monaco 业务验收。

## 已批准执行的实际诊断

根代理完成 core 串行复核并明确释放测试冻结后，先只加观察/失败落盘，保持所有原判据和 driver。`regression-diagnostic-01/diagnostic.tap` / `run.json` 为具名六项、2 pass / 4 fail、0 cancel/skip/todo，生产及测试执行前后 hash 稳定。三个 DRAG 的 `raw/drag-0.json`、`drag-3.json`、`drag-14.json` 均实测 pageerror `Cannot read properties of undefined (reading 'appearance')` 且 root 为空，补齐了原日志遮住的渲染异常证据。

`raw/surface-760-1.json` 定位了原判据失败的准确分支：760px 窗口第三次“查看内容”，sidebarPhase=closed、contentPhase=opening，实际 content V=12.625px、固定 W=760.000061px，chat 全宽 760px 且 inert。前两次 sidebar/chat 的终态全宽断言通过。它支持补等真实右终态；测量 selector 原本就是 `.workspace-content` 的实际 V，不需要换成 fixed ContentTabs（后者只作颜色探针）。

两个左抽屉原 driver 本轮通过，不能说原全量阶段失败已重现或原因已证明。`raw/sidebar-899-new.json` 中实际 trusted down/up/click 分别为 browser 1577.9/1579.3/1579.6ms；首 opening=1617.6ms/V0，首 partial=1634.3ms/V53.515625/W899，记录 30 个 opening 帧。Node click 返回的 epoch 为 1791965986246，约在首 opening 后 4ms。`raw/sidebar-1800-saved.json` 中 restore trusted down/up/click 为 2047/2047.2/2047.3ms，Node 返回约在 click 后 13ms；首 opening=2059ms/V0，首 partial=2088.9ms/V4.578125/W269.6875，35 个 opening 帧，并在实际 moving 期间观察到 viewport=899。真实输入、Node 起止及全部 rAF 原记录保留。

独立 reviewer 实读这些材料后准入 DRAG 与 SURF 的既有最小迁移；两个左用例暂保留原 driver、原 phase/partialV/几何判据，只保留可选观察及具名 raw 落盘。新 driver 若要实施仍须提交具体采样协议补审。迁移后的四旧文件专项使用新 label `regression-migration-01`，结果以实际日志为准。

## 最小迁移实际结果及再次冻结

修改范围只有四个旧 browser 文件和 `tests/helpers/sidebar-drawer-fixture.ts`。生产 14 文件没有变化。DRAG reuse 已存在的完整 appearance zoom bootstrap，初始化时即检查错误并在失败附带 pageerrors；SURF 改为批准的保活/真实双侧终态和窄屏 overlay/underlay 判据，仍使用实际 `.workspace-content` V、原 .1px/.03px、颜色及 separator 精度。新增隐藏身份/真实最后 Tab body 退出检查，未减少原视觉或交互覆盖。

`regression-migration-01` 为四文件 30 tests / 29 pass / 1 fail，stableSources=true；唯一新失败是新增 diagnostic snapshot 误装到 emptyCaption-only 夹具（没有 Shell/sidebar，querySelector 返回 null），不是产品/几何失败。按独立 reviewer 准入，将安装 guard 与采集 guard 同样限制为非 emptyCaption，保留原 keyboard/geometry oracle；该失败完整保留。

`regression-migration-02` 为四文件 30/30 pass、退出 0、stableSources=true；启用可选 observer。`regression-migration-03` 原计划关闭 observer，但启动后核对 runner 发现 PowerShell 字符串替换没有生效，因此诚实记为仍启用 observer 的同源 30/30 复核，不能作为默认环境结果。

`regression-migration-04/migration.tap` / `run.json` 才是最终默认环境：runner 明确设置 `XAANINK_REGRESSION_DIAGNOSTIC:""`，没有新增逐帧观察器；bundled Node v24.19.0、真实 Chrome、concurrency=2、同四文件 30 tests / 30 pass / 0 fail / 0 cancelled/skipped/todo、退出 0。22 个 tracked 生产/测试路径在执行前后 SHA-256 一致；当前 14 份生产 SHA-256 也全部仍与 green-05 相同。没有继续修改 tests/src 或启动更多用例，后续仅文档与独立审查，根代理负责全 browser 第二轮。

两个原 left phase preflight 在具名诊断和迁移后的正常环境专项都通过；未删 phase/actual partialV 门槛、未放宽首帧/全帧形态、未改变原 driver。首次全量失败的时序原因仍未重现，不称偶发或已证实修复。若全量再次失败，须保留实际阶段/输入时钟证据，再补审具体 driver 或真实产品修订。可选 surface 失败证据目前按 width/count 命名；根代理默认全量不启该 observer。将来若开启全文件诊断且需要多次同参数失败落盘，应先审批为每 fixture 加 serial，避免覆盖，再启动，而不能在运行中改源。
