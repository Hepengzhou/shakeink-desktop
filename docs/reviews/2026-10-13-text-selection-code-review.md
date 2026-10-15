# UI 文字选择独立代码审核

日期：2026-10-13（Asia/Shanghai）。独立审核者：`selection_audit`。

范围：`src/app/desktop.css`、`providers.tsx`、`src/lib/desktop/text-selection.ts`、主代理的 Markdown/评论/ChatPanel 修改、其他实现代理的 chat/layout/sidebar/foreshadow/admin 修改，以及浏览器测试和 Windows Electron 验证脚本。也审核后续其他代理新增的 OutlinePanel、AttributesPanel、arc-chain、Planning 卷 summary、ImproveContentDialog、ChatView 旧记录 fallback 修改。

本人先前实现的 content/score 正文标记不作为本次独立审核结果；那些修改由另一独立审核者负责。本审核只写此文档，不修改上述源码或脚本。

## 初审结论

CSS 与精确正文标记未发现阻断问题。当前新增事件适配器有两项真实交互遗漏，需修复后复审；浏览器测试自身另有两处缺陷，尚不能将初次执行称为全绿。

### P1：临时 false 的 draggable 卡漏过点击隔离

`src/lib/desktop/text-selection.ts:28` 在 mousedown 将 draggable 卡临时设置 false，但 `34` 至 36 的 click/dblclick 检测仍只找 `[draggable="true"]`。真实 `PlanningWorkspace.tsx:619` 的 article 没有 role=button；625 为 draggable，645/649 分别处理点击与双击。原文 mousedown 后，该祖先不再命中判断，正文双击会触发卡片编辑、破坏阅读选区。

独立实证：隔离 Chrome 页面加载真实 `installTextPreviewSelection` 和产品 CSS，使用 `<article draggable="true"><p data-text-preview>…</p></article>` 同结构，给祖先注册 click/dblclick 计数。`locator('#plain-preview').dblclick()` 后输出 `plainClick=2, plainDbl=1`，mouseup 后 draggable 恢复 true。期望祖先两项计数均为 0。可在实际 Planning 卡或同结构组件用例稳定复现。

建议：点击隔离判定应认可当前 suspended 的 draggable 祖先；不能因自己临时修改属性而失去边界。正文外的点击/拖动保持原行为。

### P1：checkbox 等交互角色未纳入正文点击隔离

适配器的祖先判卡列表仅 button/a/role=button/role=menuitem/draggable=true。其他代理新增的 `ImproveContentDialog.tsx:154` 是 role=checkbox 容器，164 点击会切换，177/180/183 是正文预览。原文拖选/双击会冒泡并切换选中状态。

独立实证：同一真实适配器，使用 `<div role="checkbox"><p data-text-preview>…</p></div>`，双击原文后父级 `checkClick=2`。对应实际改善意见行，双击正文会调用两次 toggle；普通拖选产生的 click 也可能切换一次。

建议：祖先交互角色列表与 CSS UI 边界对齐，包含 checkbox/radio/switch/tab 等角色；同时内部控件 bypass 列表也应包含同类真实控件，确保预览内的实际操作、链接和输入仍能工作。

## CSS 和正文标记检查

- `desktop.css:4` 默认变量 none，5 至 12 应用到所有元素；14 至 22 只在边界根重置变量。子节点可继承，按钮内 preview 与 preview 内按钮/输入能按最近边界恢复。
- `data-text-input` 规则在 contenteditable=false UI 边界之后，因此真实 ChatPanel 根在 false 状态仍为 text；其内部独立 false chip 继承自己的 none。文本 input 白名单与 textarea 保留例外，checkbox/button input 不放行。
- `MarkdownPreview.tsx:24` 只放行 HTML 原文；`CommentablePreview.tsx:144` 只放行 PreviewBlock；`CommentBubble.tsx:56/125` 放行正文与 quote。评论作者/时间/徽标/操作外壳没有 preview 属性。
- `ChatPanel.tsx:275/327/446` 分别放行用户原文、助手 HTML block、思考原文；1972 为输入标记。消息外壳、流式 caret、按钮/字段状态保持 UI。JSON 记录的预览只标记 pre，summary 保持 UI。
- `SidebarHoverCard.tsx:45/98` 使用明确 blurbIsPreview 来源，SidebarTree 角色/伏笔角色/世界简介和真正主题简介设置标记；静态帮助、名单、空态不误放行。
- chat 原文标记覆盖队列、候选 excerpt/作者意见、工具正文/quote、评审摘要、草稿片段、搜索命中及实体简介；foreshadow 引用正文和触点摘要与 UI 类目/状态、空态分开；提示词变量预览只标记渲染正文。
- ToolCallCard 的正文字段白名单有语义依据，状态/error/result 字段不因长度而获得 preview。quote 独立放行；数字、结构性数组项数和空值仍为 UI。
- 新增清单外预览的边界合理：OutlinePanel 章节 outline、AttributesPanel 描述、arc-chain 说明值、Planning 卷 summary、改善意见自由正文/建议/quote、旧 scenario 旁白及言行内容。标签、描述前缀、维度行和 fallback 占位保留 UI。

## 独立执行证据

执行环境：Node v24.21.0，已安装的 `C:/Program Files/Google/Chrome/Application/chrome.exe`，隔离合成文字，所有浏览器网络路由 abort。

首次直接运行被沙箱阻止子进程（spawn EPERM），升级运行后默认 Playwright 浏览器缓存不存在；随后显式设置 SHAKEINK_TEST_CHROMIUM 使用现有 Chrome，未安装新浏览器。

命令：

```powershell
$env:SHAKEINK_TEST_CHROMIUM='C:\Program Files\Google\Chrome\Application\chrome.exe'
& 'C:/Users/Administrator/AppData/Local/npm-cache/_npx/387698761821791d/node_modules/node/bin/node.exe' --import tsx --test tests/browser/text-selection.test.ts
```

初次完成结果：8 用例，5 通过、3 失败，exit 1。通过：paper/ink Markdown/评论/变量/实体预览、输入及嵌套边界、真实 toast、真实 dialog。失败来自测试实现：

- TS-01 两主题：`#comment .font-medium` 实际匹配作者和 5 个按钮；style 的 evaluateAll 通过，但 selection.boundingBox/dblclick 仍单元素 strict violation。应用精准作者 selector 或遍历每个元素。
- TS-08 menu：拖选辅助的 down/up 已可能激活 menuitem 并关闭菜单，随后再次 click 等待已 detached 节点，30 秒超时。应检查第一次动作的结果，或重新打开后独立验证点击。

附加独立 Chrome 探针：产品 CSS 与实际 Monaco `editor.main.css` 同页加载，渲染真实 ToolCallCard、实际 `createChipElement` 生成的原子引用，并建立 false 输入根及伏笔 mark。所有断言通过，exit 0：

| 节点 | 实际 computed user-select |
| --- | --- |
| false + data-text-input 根、Monaco textarea、伏笔原文 mark、ToolCallCard content/quote | text |
| composer-chip 与其名称后代 | none |
| monaco-hover、marker description、tokens inspector、action-list submenu help | none |
| 内嵌 reference 按钮、ToolCallCard status/error/result | none |

实际 ToolCallCard 正文双击得到原文选区。Monaco 项在此仅证明真实第三方 CSS 的优先级覆盖；不是实际 Monaco 编辑业务通过。false 输入根的此探针是组件矩阵，不冒充真实 ChatPanel false 状态。

## Windows 脚本能证明的范围

`seed-text-selection-fixture.ts` 只接受真实路径 basename 以 shakeink-text-selection- 开头的测试目录；在该目录内使用真实 Workspaces/Prisma/VersionedStore/DraftJournal 创建合成作品、章节和保留草稿。未配置模型或真实 Key，未使用用户工作目录。

`verify-text-selection.mjs` 运行实际编译的 Windows 开发态 Electron，隔离 root、真实恢复 dialog、零模型 ChatPanel、双主题设置、实际章节及 Monaco/Markdown；scope 已区分开发态/安装包/macOS/物理 IME。审查脚本不等于实际执行通过。

初审提醒三项证据限制：

1. `ChatPanel.tsx:912` 的 canSend 取决于 recoveryStatus 与 creatingNovel；零模型只是禁用发送，不使 composer 变 false。因此脚本零模型输入验证不能称为真实 false composer 验收。
2. request/pageerror 观察和 setOffline 在 firstWindow 后才开始，可能漏掉初始导航请求/错误；HTTP 空列表只证明观察窗口内无 HTTP，不能独立证明启动全程网络情况。
3. 初审脚本仅以键盘建立 Monaco 选区，尚缺实际鼠标拖选断言。TS-W03 若覆盖 pointer，应补入真实 view-line 拖选后选区可见证据。

主代理已收到上述问题并安排修复；本记录等待修复后复审。没有将未执行的 Electron、安装包或 macOS 标为通过。

## 修复复审与当前结论

2026-10-13 复读修正源码并独立复跑：**本审核范围代码复审通过，未发现剩余阻断问题。** 全量测试和 Windows 目标系统验收仍由主代理组合执行，不以本结论代替。

- `text-selection.ts:7` 将交互角色集中为同一列表，含 label/checkbox/radio/switch/tab/menuitem 等，内部实际控件 bypass 与祖先边界对齐；34 的 `[draggable]` 仍识别临时 false 的卡片。两项 P1 已关闭。
- 相同隔离 Chrome/真实适配器探针复跑 exit 0：plain draggable 正文原生双击选到 `Original `，父级 click=0、dblclick=0；role=checkbox 正文父级 click=0；内部实际 role=checkbox 控件 click=1；独立正文 handler click=1。mouseup、window blur、dispose 三项均恢复 draggable=true。此证明覆盖控制器行为，未冒充实际 Planning 业务流程验收。
- 对修复后的 `tests/browser/text-selection.test.ts` 使用前述相同命令独立复跑：8 用例、8 通过、0 失败，exit 0，17,434.6251 ms。精准作者 selector 与菜单交互处理已消除初审测试自身缺陷。
- `verify-text-selection.mjs:15` 的 networkScope/composerScope 已准确区分 firstWindow 后网络观察、真实零模型可编辑 composer、组件矩阵 false 输入；53/54 增加真实 Monaco view-line 鼠标拖选及自身选区断言。三项脚本覆盖/表述提醒已解决。

审核时最新 Windows 报告仍为 failed：真实 toast、恢复 dialog、双主题设置及 composer 检查已推进，最新失败为 UI 导航时未找到种子章节 `选区验收章`。因此当前不能声明 TS-W03 或 Windows 整套通过；需修复验证导航并完整执行。该运行状态已与主代理同步。

复审未修改产品源码、测试脚本或本人原先 content/score 实现，仍只更新此审核文档。

## 最终证据复核

2026-10-13：复核最终补漏、脚本及保存证据，**按下面明确范围通过**。本节更新前一节当时 Windows 尚失败的运行状态。

`desktop.css:18` 将 `.monaco-editor .native-edit-context` 加入精确输入边界；没有扩大到整个 Monaco 根或工具 UI。源依据：本地 Monaco `nativeEditContext.js:60/61` 创建普通 div，`screenReaderSupport.js:90` 设置 role=textbox，但没有 contenteditable=true。该实际输入层应与 textarea 同样保留例外。

独立针对新增边界执行（同 Node 24 / 已安装 Chrome / 隔离合成数据）：

```powershell
& 'C:/Users/Administrator/AppData/Local/npm-cache/_npx/387698761821791d/node_modules/node/bin/node.exe' --import tsx --test --test-name-pattern 'nearest content/UI/input' tests/browser/text-selection.test.ts
```

结果：1 用例、1 通过、0 失败，exit 0，2,529.3436 ms。测试明确验证 native-context=text、相邻 editor-ui=none，同时既有输入/预览/UI/原子 chip 边界保持正确。主代理保存的最终 `browser-full.tap` 末尾为 424/424、0 失败；`build.txt` 显示静态 UI 与 desktop 构建完成，typecheck 由主代理统一执行并记录。

最终 `windows-electron.json` 为 status=passed，15 个实际检查。有效范围为：开发态 Windows Electron 的真实 toast/UI、恢复 dialog 和 readonly 草稿、双主题设置与零模型 ChatPanel 输入/选取/单次输入撤销、真实章节/分屏预览、Monaco 鼠标双击词选区、键盘选区/编辑/撤销及行号 UI 禁选。Monaco 实际 pointer 证据是 `method="Actual pointer double-click word selection"`、EditContext start=0/end=15、overlays=1。

以下限制保持明确，未转记为通过：

- Monaco **单次按下后拖选**：CDP 与 Electron sendInputEvent 均得到 start=end=15、overlays=0；关闭全局策略的独立 `windows-monaco-diagnostic.json` 同样 failed。最终报告将该项保留在 `monacoDragDiagnostic`，说明 Not marked passed。只能说明当前诊断未证明此项通过；不是该动作的真实验收成功。
- 当前网络观察从 firstWindow 后开始，只覆盖该观察窗口；不是启动全程/main/worker 的网络审计或最终安装包离线启动证明。
- 真实零模型 composer 在此为 contenteditable=true；false 输入根由独立 Chromium 边界用例验证，未冒充真实 ChatPanel false 状态流程。
- 物理输入法、macOS、安装包验证均未由此脚本完成。

脚本把失败的单次拖选与实际成功的双击词选择分开记录，未把关闭策略的诊断当成验收。主代理总结和台账应按上述 scope 使用此审核通过结论，不能泛称所有 Monaco 鼠标动作或所有目标平台全部通过。

本次只更新此 code-review 文件，未修改产品或验证脚本。

## 独立 About 窗口补漏：方案与用例审核

2026-10-13：只读复核 `desktop/main/index.ts:675` 至 679 和新增 `tests/browser/about-text-selection.test.ts`，**本次补漏方案与用例通过，可以实施**；此时未确认代码或实际 About 窗口验收通过。

Windows 分支以 data URL 加载独立 HTML，未经过 React Providers/desktop.css。模板只有 h1 与三个 p，全部是标题/版本/帮助/许可 UI 文字，没有输入或内容预览，因此仅在原 body style 增加 `user-select:none;-webkit-user-select:none` 符合需求，不需要建立输入/预览例外。保留 CSP、原窗口选项、HTML 结构、动态真实版本文案和菜单行为即可；不扩大到 macOS 的原生 app.showAboutPanel。

用例读取实际源模板，只替换版本占位为隔离合成版本，不注入选择策略或另造产品 UI；断言 body computed policy 并对全部 h1/p 实际鼠标拖选、双击检验空选区。网络 route 全部 abort，页面尺寸与该窗口一致。保存的 `about-red.tap` 为 1 用例、0 通过、1 失败、actual=auto/expected=none，红灯来源是现有未禁选模板而非测试无法运行。

后续必须复核实际代码仅增两项选择样式，并在真实 Electron 从菜单打开 About、确认 h1/p 不可选，不能仅用组件测试替代目标窗口证据。复核后的 About 通过范围仍仅限当前 Windows 实际执行，不改变前述单次 Monaco 拖选/物理输入法/macOS/安装包的保留限制。

本次仅追加此审核文档，未修改 main 或测试文件。

## About 补漏最终代码与证据复审

2026-10-13：**About 补漏在实际执行范围内通过。** `desktop/main/index.ts:679` 的 diff 仅在原 body style 尾部增加 `-webkit-user-select:none;user-select:none`。CSP、HTML 结构、文案、真实版本值、BrowserWindow 安全选项和菜单分支保持原实现；没有输入/预览例外需要放行。

已复核 `about-green.tap`：真实模板 Chromium 用例通过，连同相关品牌/原生菜单单元检查共 19/19、0 失败。已读取最终 `browser-full-final.tap` 末尾的 424/424、0 失败；desktop 最终构建与 typecheck 的成功结果由主代理统一记录。

实际 Windows runner `91` 至 `96` 通过既有 `window.desktop.command('app.about')` 分发创建真正 data URL 沙箱 About 窗口，逐个 h1/三个 p 执行既有 ui() 的 computed none、鼠标拖选空选区、双击空选区断言。最新 `windows-electron.json` 含四条 About 检查，连同原工作台检查共 19 条，status=`passed-scoped`、allAcceptancePassed=false。此证据证明原 app.about 命令对应的实际窗口行为；不额外称为原生菜单的物理点击测试。已视觉查看 `windows-about.png`，标题、动态版本、说明、许可内容和布局保持原样。

截至本次复审，本审核范围没有待修代码问题。通过结论仍按已验证的 Windows 开发态/Chromium scope 使用；Monaco 单次拖选的失败诊断、物理输入法、macOS、安装包和启动全程网络边界继续保留，未转记为已完成验收。

本次只修改此审核文档。
