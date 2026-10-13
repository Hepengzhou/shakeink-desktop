# 左导航 UI 独立方案审核 v2

日期：2026-10-13（Asia/Shanghai）。审核人：独立子代理 `sidebar_design_review`。本次只审核方案与设计媒介，不替用户批准 UI，不修改生产代码。当前审核版本为 **v2**，按用户补充的 Codex“新聊天 / 你的 dot”参考截图改为紧凑创建入口；已完成最终文档、HTML/样式/打包入口、v2 离线报告和截图审核。v1 完整历史见 [archive-v1/plan-review.md](archive-v1/plan-review.md)。

## 当前结论

方案覆盖本次五项要求，沿用真实 Web React 组件、既有业务服务和原详情 Tab 的方向可行。**当前创建入口每行 32px、间距 4px、文字 14px/20px、字重 500；图标 18px/1.7，左右 padding 12px、图文 gap 10px，图文垂直居中**。底栏仍为 72px/52px 按钮/32px 头像；导航专用文字渐隐范围覆盖主树之外的场景树、不可用作品和账户名称。删除属性入口与删除属性业务功能已明确区分。

最终结论：**v2 方案与 HTML 可以交用户审核**。无未解决的 P0/P1/P2 方案问题；初审两项 P2 及此次 v2 检查报告的旧尺寸文字已解决。此结论仅表示设计产物完整、可供审核，**用户尚未批准本次 UI**。正式实施、业务测试、Base UI 真实组件及 Electron/安装包/目标系统验收均未执行。

## 初审问题及解决记录

### P2-01：区分直接创建和列表内操作的取消返回路径

- 状态：**已解决且 v2 保持**。当前 `product-design.md:40`、`technical-plan.md:12` 明确直达取消回“+”、列表创建取消回“新建”、改名/删除取消回原记录、删除成功回列表“新建”。`viewer.tsx:29,54–62` 保留来源并实现对应原型返回路径；此前独立 v1 浏览器检查及当前 v2 主代理报告验证相关焦点，未重复记为 v2 独立执行。
- 初审依据（历史）：原 v1 `product-design.md:34,38` 的直接创建与统一返回文字存在歧义，见归档。真实直接入口是 `src/components/layout/SidebarTree.tsx:1965–1972`，现有创建关闭仅 `setDialog(null)`（`:2240–2242`）。统一回列表会给直接创建增加意外的中间页面。
- 初审建议（历史）：明确保存操作来源。由导航“+”直接创建时，取消回到该“+”；由管理列表的新建、重命名、删除启动时，取消返回管理列表，并恢复启动按钮或对应记录。删除后可选择稳定的剩余操作目标；**当前产品最终规则为删除成功回列表“新建”按钮**，不再采用初审建议中的相邻记录目标。创建成功沿用详情 Tab，重命名成功回对应记录。

### P2-02：程序控制 Dialog 的焦点恢复不能只依赖组件默认值

- 状态：**已解决且 v2 保持（方案及原型范围）**。当前 `technical-plan.md:12` 明确保存 ref、Base UI initialFocus/finalFocus、互斥切换时抑制旧 finalFocus、卸载 fallback，并保持场景离开 guard，只有实际激活成功才关闭管理列表。`viewer.tsx:37,43–56` 的原型使用一个 native dialog 节点及显式启动元素/目标 ID 恢复，避免切换时退回导航。正式 Base UI 焦点闭环仍须实施后单独验证，不能拿 native HTML dialog 结果替代。
- 依据：真实 `TreeNode` 是 `role="button"` 的 div，未使用 `DialogTrigger`（`SidebarTree.tsx:218–235`）；现有 Dialog wrapper 仅透传 Popup props（`src/components/ui/dialog.tsx:42–59`）。本地 Base UI `node_modules/@base-ui/react/dialog/popup/DialogPopup.d.ts:24,34` 支持 `initialFocus`/`finalFocus`，但不会凭方案文字自动把程序打开的管理弹窗绑定回 TreeNode。
- 可执行修正：技术方案明确保存导航行/“+”启动元素 ref，以及列表记录/按钮的语义 ID；管理弹窗初次打开聚焦明确的可操作元素，正常关闭回启动入口。列表与操作弹窗互斥切换时阻止旧弹窗把焦点退回导航，待目标弹窗/列表挂载后聚焦目标。删除或作品卸载后使用仍存在的新建按钮/导航焦点 fallback。后续用例必须检查 Enter/空格启动、Tab 限定在弹窗、Escape/遮罩/关闭以及创建/重命名/删除取消的焦点闭环；HTML 应展示可审核的行为结构。

### P2-03：v2 检查说明需要同步新尺寸并区分历史执行

- 状态：**已解决**。本轮初查 `design-verification.md` 仍写 v1 创建高度和间距；主代理已将 `:1,9` 改为 v2 和 32/4/14/20/500，`:13,34` 明确历史 18 组合、首次焦点失败及列表压力检查归档，不计为 v2 执行。当前 `preview-checks.json` 带 `revision:"v2"`，21 组通过且第一组实测值与当前 CSS 一致。

## 已核对的具体证据

| 检查项 | 证据及结论 |
| --- | --- |
| 复用与隔离边界 | `technical-plan.md:7,17,19` 限定真实组件局部修改、合成设计数据及生产源文件 hash；与 `AGENTS.md:6–12`、`docs/implementation-boundaries.md` 的真实组件/29 面板/不导入示例要求一致。工作区存在其他任务修改，审核未更改这些文件。 |
| 创建入口现状及 v2 | `SidebarTree.tsx:1677,1686` 为 h-7，图标 `:1679,1692` 为 Plus/MessageSquarePlus；产品 `:5,12–14,52` 给出当前 32px/4px/14px 字体、新图标和一致线宽。`preview.css:7` 完全对应。 |
| 账户现状 | `SidebarTree.tsx:2064–2085` 为较低纵向 padding、24px 头像和 truncate 双行；产品 `:17–20` 给出固定底区、52px 按钮、32px 头像与仅树区滚动。 |
| 渐隐依据 | `src/app/desktop.css:149–150` 仅 data-overflow=true 时给 Tabs 标题遮罩；`src/components/layout/useContentTabStrip.ts:134,151,159–163` 测量真实溢出、观察尺寸和字体并清理。产品 `:24–28` 与技术 `:8–9` 使用同方向、同 24px 条件渐隐，只遮罩文字。Tabs 原本具有专用缩放变量，导航保留业务 CSS px 的设计说明合理。 |
| 共享场景树范围 | `src/components/content/scene/SceneWorkspace.tsx:62,72` 分别传 instance=internal/global；`SceneTree.tsx:15–27,33–48` 已有独立偏好键、焦点/键盘、路径提示、拖拽和操作菜单。技术 `:9` 限定仅 global 标签外观、保留行为与 key，避免右侧目录被改。 |
| 不可用作品 | `src/components/desktop/UnavailableWorks.tsx:28` 独立标题存在 truncate，已由产品 `:24`、技术 `:9` 纳入范围；修复锁和错误状态应保留。 |
| 属性移除 | `SidebarTree.tsx:1919–1925` 的入口与原 AttributesPanel 注册分离。技术 `:10` 只删除导航节点和唯一闲置图标；`SlidersHorizontal` 在该文件除 import 仅此入口使用（rg 输出）。 |
| 试验场查询与缓存 | 现有 `SidebarTree.tsx:830–835` 为 ["scenarios", novel.id] 查询键；`:1535–1536` 和三项 mutation 成功回调沿用该键 invalidation。技术 `:12` 保留键、仅打开管理列表时取数，并区分 pending/error/empty，可避免导航展开即加载的行为。 |
| 原详情保留 | `src/components/content/registry.tsx:79` 仅注册 scenario 详情；`src/components/content/scenario/ScenarioPanel.tsx:4` 明确 refId=labId。`SidebarTree.tsx:871–878,1560–1566` 和 `src/stores/tabs.ts:114,258–268` 确定原 ID、作品 ID、refId 与重复打开复用。产品 `:40` 不新增无 refId 的列表 Tab，符合原实现。 |
| 增删改保留 | `SidebarTree.tsx:1538–1613` 原 create/rename/delete mutation、renameScenarioTab、closeTab 全部存在；技术 `:12` 明确复用。`ScenarioCreateDialog.tsx:57–64,105–118` 继续保留角色查询、选角与原创建 payload。 |
| 情景试验场视觉 | `SidebarTree.tsx:1955–1990` 当前箭头、折叠键与子树；产品 `:34`、技术 `:11` 明确全部移除，保留单行入口及同作品 scenario 选中态。 |
| 面板宽度与尺寸 | `DashboardShell.tsx:480–482` 的实际默认/最小/最大值为 260/200/420；产品 `:20,44,57` 均一致。原 Dialog 默认 sm:max-w-sm（`dialog.tsx:56`），新的 448px 管理弹窗需通过局部 class 覆盖实现，不应改全局 Dialog。 |
| 业务防护 | `src/stores/tabs.ts:258–285` 通过 afterSceneLeave 包装打开/关闭/激活；技术沿用原 store 即保留草稿离开门控。测试阶段应包含有未完成场景编辑时从管理列表打开详情的回归，不能直接 set tabs 绕开。 |
| 审核门 | `research.md:45`、`product-design.md:3,60` 明确本次新用户请求“HTML，需要我审核”优先于通用历史批准；目前不启动 TDD/代码实施，也不将原型验证写成产品或目标系统通过。 |

## 本次执行边界

执行源文件/文档检查、`rg` 搜索、`git status --short`、源文件 hash 复核、截图目视及隔离无界面 Chrome 内的离线合成原型检查。原型操作只修改浏览器内合成状态；没有调用真实作品数据、模型或 Key，没有运行全量测试、创建 HTTP 服务、改验收台账或生产文件。仓库写入范围只有本审核文档。

`productTests=not-run`；`nativeAcceptance=not-run`；`uiApproval=awaiting-user`。

## v2 HTML 独立审核

已复核 `index.html:1–5`、`build-preview.mjs:1–5`、`viewer.tsx:1–133`、`preview.css:1–13` 及 bundle 的实际离线运行。只打包设计目录的 React/Lucide 原型，HTML 未引用生产组件、实际接口或父目录。原型明确合成示意，审核工具与尺寸说明位于导航之外（`viewer.tsx:87–95,112–117`），试验场示意状态控件有明确审核说明，不是生产实现。

主代理当前 `verify-preview.mjs:30–115` 与 `preview-checks.json` 记录 **revision=v2、21 组设计检查通过**，0 pageerror/HTTP 请求、6 个生产源文件 hash 不变；第一组实测两行 32px、间距 4px、14px/20px/500、padding 12px、gap 10px，两个图标和文字中心误差均为 0。报告明确 `productTests` 和 `nativeAcceptance` 都为 `not-run`。独立浏览器命令启动前使用 Node createHash 复核这 6 个生产文件与 v2 报告 hash 全部一致，未将此视作正式产品行为证据。

`git diff --no-index` 对比归档 v1 与当前 `viewer.tsx`，差异只有 v2 标题和创建入口规格说明；`preview.css` 差异只有创建区 gap、按钮高度、字号和普通状态字重。账户、树行、标签渐隐和弹窗行为不变。当前生产源文件未改，其他范围的方案结论完整保留。

独立浏览器命令使用已安装 Chrome，file URL、临时隔离浏览器 profile、HTTP 请求拦截，没有 HTTP 监听服务。按此次改动范围，仅执行 **双主题 200px 窄栏/500px 短窗的两个案例**，没有重跑历史 18 组合或全量测试。实际命令结果摘录如下：

```json
{"revision":"v2","independentCases":2,"pageErrors":0,"httpRequests":0,"productionHashesMatch":6,"productTests":"not-run","nativeAcceptance":"not-run"}
```

| 本次 v2 独立实测 | 玄墨 | 宣纸 |
| --- | --- | --- |
| 导航尺寸 | 200×500px | 200×500px |
| 创建区总高 / 每行 / 行距 | 84px / 32px / 4px | 84px / 32px / 4px |
| 字号 / 行高 / 字重 | 14px / 20px / 500 | 14px / 20px / 500 |
| 左右 padding / 图文 gap | 12px / 10px | 12px / 10px |
| 图标尺寸 / 线宽 | 18px / 1.7px | 18px / 1.7px |
| 两按钮图标中心误差 | 0px / 0px | 0px / 0px |
| 两按钮文字中心误差 | 0px / 0px | 0px / 0px |
| 树区高度 / 内容滚动高度 | 262px / 1000px | 262px / 1000px |
| 底栏高度 | 72px | 72px |
| 横向溢出 / 渐隐判定差异 | 无 / 0 | 无 / 0 |

两个案例均实际滚动树区并比较创建区与底栏坐标，坐标未改变。创建区总高由原 v1 110px 减到当前 84px，减少 26px；当前 32px 行高为 20px 文本行框留下上下各 6px，18px 图标留下上下各 7px，中心误差实测为 0，既紧凑又有间隔。

独立目视用户新参考原图 `codex-clipboard-f8d7a5e1-6e6a-43ce-8c08-c62674c9759b.png` 及当前 v2 `preview-ink.png`、`preview-paper.png`、`preview-short-narrow.png`：参考图强调单行入口、文字清楚、左图标与文字同行居中。v2 与该布局方向一致，未把截图物理像素当作 Codex 实际 CSS；`research.md:17–19` 和 `product-design.md:5` 已明确这一解释。窄栏短窗下当前创建文字/图标无遮挡，底部用户区域保持。

此前其他范围结论保持：主角徽标及操作固定占位；导航、场景、不可用作品和账户标题都按真实溢出渐隐；无属性入口；情景试验场没有树内展开内容，但原详情/增删改仍由管理弹窗可达；直达创建和列表操作取消路径清楚；管理弹窗列表单独滚动（`viewer.tsx:124`、`preview.css:11`），标题/工具区固定，末项菜单不被裁切；实际业务缓存、mutation、Tab guard 和正式焦点闭环留待产品实施后的真实用例。当前 21 组主代理 v2 原型检查已复核这些设计行为，独立 v1 18 组合、列表压力检查及 native dialog 焦点边界完整记录位于归档，不计为本次 v2 独立执行。

隔离 Chrome 检查经工具自动批准执行；没有浏览器下载、HTTP 服务或系统配置变更。历史环境启动失败及 native dialog 的浏览器界面/BODY 焦点边界见归档，**仍不声称已验证 Base UI/Electron 的正式焦点锁定**。

### 最终阶段状态

- `planReview=passed-for-ui-review`
- `htmlDesignReview=passed`
- `uiRevision=v2`
- `uiApproval=awaiting-user`
- `implementation=not-started`
- `productTests=not-run`
- `nativeAcceptance=not-run`

收到本次 UI 批准后，仍需依 AGENTS.md 完成独立方案复核、专项测试用例及独立审核、TDD、独立代码审查、全量回归与真实目标验证；本报告不解除这些阶段要求。
