# 左导航 UI 独立方案审核

日期：2026-10-13（Asia/Shanghai）。审核人：独立子代理 `sidebar_design_review`。本次只审核方案与设计媒介，不替用户批准 UI，不修改生产代码。已完成最终文档、HTML/样式/打包入口、离线浏览器报告和截图审核。

## 当前结论

方案覆盖本次五项要求，沿用真实 Web React 组件、既有业务服务和原详情 Tab 的方向可行。创建入口 44px/6px 间距、底栏 72px/52px 按钮、18px Lucide 图标均有明确规格；导航专用文字渐隐范围覆盖主树之外的场景树、不可用作品和账户名称。删除属性入口与删除属性业务功能已明确区分。

最终结论：**方案与 HTML 可以交用户审核**。无未解决的 P0/P1/P2 方案问题；下列初审两项 P2 已由产品/技术文档及 HTML 的明确返回路径解决。此结论仅表示设计产物完整、可供审核，**用户尚未批准本次 UI**。正式实施、业务测试、Base UI 真实组件及 Electron/安装包/目标系统验收均未执行。

## 初审问题及解决记录

### P2-01：区分直接创建和列表内操作的取消返回路径

- 状态：**已解决**。最终 `product-design.md:38`、`technical-plan.md:10` 明确直达取消回“+”、列表创建取消回“新建”、改名/删除取消回原记录、删除成功回列表“新建”。`viewer.tsx:29,54–62` 保留来源并实现对应原型返回路径；独立浏览器检查验证直达创建不会在取消后意外打开列表，列表内创建/改名取消和删除成功焦点均回到规定目标。
- 依据：`product-design.md:34` 保留导航右侧“+”直接创建；`:38` 统一写“取消回到列表并恢复焦点”。真实直接入口是 `src/components/layout/SidebarTree.tsx:1965–1972`，现有创建关闭仅 `setDialog(null)`（`:2240–2242`）。统一回列表会给直接创建增加意外的中间页面。
- 可执行修正：明确保存操作来源。由导航“+”直接创建时，取消回到该“+”；由管理列表的新建、重命名、删除启动时，取消返回管理列表，并恢复启动按钮或对应记录的操作按钮。创建成功关闭弹窗并沿用详情 Tab；重命名成功返回对应记录；删除成功返回相邻记录，列表为空时返回新建按钮。若产品决定直接创建也回列表，需明确写成此次行为变更，并在 HTML 中展示给用户审核。

### P2-02：程序控制 Dialog 的焦点恢复不能只依赖组件默认值

- 状态：**已解决（方案及原型范围）**。最终 `technical-plan.md:10` 明确保存 ref、Base UI initialFocus/finalFocus、互斥切换时抑制旧 finalFocus、卸载 fallback，并保持场景离开 guard，只有实际激活成功才关闭管理列表。`viewer.tsx:37,43–56` 的原型使用一个 native dialog 节点及显式启动元素/目标 ID 恢复，避免切换时退回导航。正式 Base UI 焦点闭环仍须实施后单独验证，不能拿 native HTML dialog 结果替代。
- 依据：真实 `TreeNode` 是 `role="button"` 的 div，未使用 `DialogTrigger`（`SidebarTree.tsx:218–235`）；现有 Dialog wrapper 仅透传 Popup props（`src/components/ui/dialog.tsx:42–59`）。本地 Base UI `node_modules/@base-ui/react/dialog/popup/DialogPopup.d.ts:24,34` 支持 `initialFocus`/`finalFocus`，但不会凭方案文字自动把程序打开的管理弹窗绑定回 TreeNode。
- 可执行修正：技术方案明确保存导航行/“+”启动元素 ref，以及列表记录/按钮的语义 ID；管理弹窗初次打开聚焦明确的可操作元素，正常关闭回启动入口。列表与操作弹窗互斥切换时阻止旧弹窗把焦点退回导航，待目标弹窗/列表挂载后聚焦目标。删除或作品卸载后使用仍存在的新建按钮/导航焦点 fallback。后续用例必须检查 Enter/空格启动、Tab 限定在弹窗、Escape/遮罩/关闭以及创建/重命名/删除取消的焦点闭环；HTML 应展示可审核的行为结构。

## 已核对的具体证据

| 检查项 | 证据及结论 |
| --- | --- |
| 复用与隔离边界 | `technical-plan.md:5,15,17` 限定真实组件局部修改、合成设计数据及生产源文件 hash；与 `AGENTS.md:6–12`、`docs/implementation-boundaries.md` 的真实组件/29 面板/不导入示例要求一致。当前 `git status --short` 显示工作区存在其他任务修改，审核未更改这些文件。 |
| 创建入口现状 | `SidebarTree.tsx:1677,1686` 为 h-7，图标 `:1679,1692` 为 Plus/MessageSquarePlus；产品 `:10–12` 给出更高按钮、间距、新图标和一致线宽。 |
| 账户现状 | `SidebarTree.tsx:2064–2085` 为较低纵向 padding、24px 头像和 truncate 双行；产品 `:15–18` 给出固定底区、52px 按钮、32px 头像与仅树区滚动。 |
| 渐隐依据 | `src/app/desktop.css:149–150` 仅 data-overflow=true 时给 Tabs 标题遮罩；`src/components/layout/useContentTabStrip.ts:134,151,159–163` 测量真实溢出、观察尺寸和字体并清理。产品 `:22–26` 与技术 `:6–7` 使用同方向、同 24px 条件渐隐，只遮罩文字。Tabs 原本具有专用缩放变量，导航保留业务 CSS px 的设计说明合理。 |
| 共享场景树范围 | `src/components/content/scene/SceneWorkspace.tsx:62,72` 分别传 instance=internal/global；`SceneTree.tsx:15–27,33–48` 已有独立偏好键、焦点/键盘、路径提示、拖拽和操作菜单。技术 `:7` 限定仅 global 标签外观、保留行为与 key，避免右侧目录被改。 |
| 不可用作品 | `src/components/desktop/UnavailableWorks.tsx:28` 独立标题存在 truncate，已由产品 `:22`、技术 `:7` 纳入范围；修复锁和错误状态应保留。 |
| 属性移除 | `SidebarTree.tsx:1919–1925` 的入口与原 AttributesPanel 注册分离。技术 `:8` 只删除导航节点和唯一闲置图标；`SlidersHorizontal` 在该文件除 import 仅此入口使用（rg 输出）。 |
| 试验场查询与缓存 | 现有 `SidebarTree.tsx:830–835` 为 ["scenarios", novel.id] 查询键；`:1535–1536` 和三项 mutation 成功回调沿用该键 invalidation。技术 `:10` 保留键、仅打开管理列表时取数，并区分 pending/error/empty，可避免导航展开即加载的行为。 |
| 原详情保留 | `src/components/content/registry.tsx:79` 仅注册 scenario 详情；`src/components/content/scenario/ScenarioPanel.tsx:4` 明确 refId=labId。`SidebarTree.tsx:871–878,1560–1566` 和 `src/stores/tabs.ts:114,258–268` 确定原 ID、作品 ID、refId 与重复打开复用。产品 `:38` 不新增无 refId 的列表 Tab，符合原实现。 |
| 增删改保留 | `SidebarTree.tsx:1538–1613` 原 create/rename/delete mutation、renameScenarioTab、closeTab 全部存在；技术 `:10` 明确复用。`ScenarioCreateDialog.tsx:57–64,105–118` 继续保留角色查询、选角与原创建 payload。 |
| 情景试验场视觉 | `SidebarTree.tsx:1955–1990` 当前箭头、折叠键与子树；产品 `:32`、技术 `:9` 明确全部移除，保留单行入口及同作品 scenario 选中态。 |
| 面板宽度与尺寸 | `DashboardShell.tsx:480–482` 的实际默认/最小/最大值为 260/200/420；产品 `:18,42,55` 均一致。原 Dialog 默认 sm:max-w-sm（`dialog.tsx:56`），新的 448px 管理弹窗需通过局部 class 覆盖实现，不应改全局 Dialog。 |
| 业务防护 | `src/stores/tabs.ts:258–285` 通过 afterSceneLeave 包装打开/关闭/激活；技术沿用原 store 即保留草稿离开门控。测试阶段应包含有未完成场景编辑时从管理列表打开详情的回归，不能直接 set tabs 绕开。 |
| 审核门 | `research.md:39`、`product-design.md:3,58` 明确本次新用户请求“HTML，需要我审核”优先于通用历史批准；目前不启动 TDD/代码实施，也不将原型验证写成产品或目标系统通过。 |

## 本次执行边界

执行源文件/文档检查、`rg` 搜索、`git status --short`、源文件 hash 复核、截图目视及隔离无界面 Chrome 内的离线合成原型检查。原型操作只修改浏览器内合成状态；没有调用真实作品数据、模型或 Key，没有运行全量测试、创建 HTTP 服务、改验收台账或生产文件。仓库写入范围只有本审核文档。

`productTests=not-run`；`nativeAcceptance=not-run`；`uiApproval=awaiting-user`。

## HTML 独立审核

已复核 `index.html:1–5`、`build-preview.mjs:1–5`、`viewer.tsx:1–133`、`preview.css:1–13` 及 bundle 的实际离线运行。只打包设计目录的 React/Lucide 原型，HTML 未引用生产组件、实际接口或父目录。原型明确合成示意，审核工具与尺寸说明位于导航之外（`viewer.tsx:87–95,112–117`），试验场示意状态控件有明确审核说明，不是生产实现。

主代理 `verify-preview.mjs:30–113` 与 `preview-checks.json` 记录 21 组设计检查通过，0 pageerror/HTTP 请求、6 个生产源文件 hash 不变；报告明确 `productTests` 和 `nativeAcceptance` 都为 `not-run`。独立执行 `Get-FileHash` 复核这 6 个生产文件与报告 hash 全部一致，未将此视作正式产品行为证据。

独立浏览器命令使用已安装 Chrome（与报告同一 154.0.8037.98 版本），file URL、临时隔离浏览器 profile、HTTP 请求拦截，没有 HTTP 监听服务。独立命令结果如下：

```json
{"stage":"independent-offline-prototype-review","matrix":18,"checks":"geometry/fade/no-attributes/single-scenario/focus/direct-create/library-create/rename/delete/list-states/account-menu","pageErrors":0,"httpRequests":0,"productTests":"not-run","nativeAcceptance":"not-run"}
```

- 18 个组合为双主题 × 200/260/420px × 500/640/900px。每个组合确认实际创建高度 44px/间距 6px、账户底区 72px/按钮 52px/头像 32px、树区仍有高度且位于固定底区上方、真实溢出测量与 data-overflow 完全对应。短名称无遮罩与长名称只遮罩文字也由主代理报告及独立目视交叉核验。
- 无属性按钮；情景试验场只有一行且无展开按钮。直接创建 Escape 回“+”；列表创建 Escape 回新建；改名取消回记录；删除成功回新建；列表关闭回原导航入口；账户菜单 Escape 回触发器。空/加载/错误状态不出现记录，重试恢复记录。原型缓存、真实 mutation、Tab guard 不由这些合成操作证明，仍按技术方案留待正式用例。
- native HTML dialog 的 Tab 周期可能在浏览器界面边界令 activeElement 短暂为 BODY，随后回 dialog；初次“每一次 Tab 都必须是 dialog 后代”的严格断言因此未通过。后续独立核验 18 次 Tab 未落到后台可操作元素，并实际尝试聚焦后台创建按钮，焦点仍留在弹窗。这证明原型后台隔离，**不声称已验证 Base UI/Electron 的正式焦点锁定**。

针对最终 `viewer.tsx:124` 的独立列表区和 `preview.css:11`，另在 480×500px 浏览器中以克隆合成列表行做纯布局压力检查（不作为创建业务测试），结果：

```json
{"scope":"independent-offline-synthetic-design","libraryScroll":{"height":230,"scrollHeight":900,"scrollTop":670,"headingStable":true,"toolbarStable":true},"backgroundFocusBlocked":true,"tabChecks":18,"productTests":"not-run","nativeAcceptance":"not-run"}
```

弹窗上下均保持至少 16px 视口边距；列表内部滚动时标题和工具区位置不变；末项菜单采用内部展开避免被滚动边界裁掉（`preview.css:11`）。操作表单必要时仍可由 dialog 整体滚动。

独立目视 `preview-long-paper.png`、`preview-short-narrow.png`、`preview-scenario-library.png`、`preview-account.png`、`preview-small-viewer.png`：创建图标、44px 留白、主角标记、导航/账户/右 Tabs 渐隐、短窗固定顶部/底部和单行情景试验场与设计规格一致；弹窗文字/按钮无相互遮挡。宽窄示意均明确是设计原型。

环境启动说明：默认 Playwright Chromium/headless shell 未安装，后改用已安装 Chrome；沙箱直接启动被 EPERM 限制，隔离离线浏览器检查经工具自动批准后执行。上述环境失败未计为通过用例，也未新增下载或系统配置变更。

### 最终阶段状态

- `planReview=passed-for-ui-review`
- `htmlDesignReview=passed`
- `uiApproval=awaiting-user`
- `implementation=not-started`
- `productTests=not-run`
- `nativeAcceptance=not-run`

收到本次 UI 批准后，仍需依 AGENTS.md 完成独立方案复核、专项测试用例及独立审核、TDD、独立代码审查、全量回归与真实目标验证；本报告不解除这些阶段要求。
