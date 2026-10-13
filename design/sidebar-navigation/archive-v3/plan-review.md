# 左导航 UI 独立方案审核 v3

日期：2026-10-13（Asia/Shanghai）。审核人：独立子代理 `sidebar_design_review`。当前范围为本次第三轮用户修改：新对话名称/MessageCirclePlus、场景取消导航展开、作品/设定/角色/正文/对话五项分类。生产代码不改，用户 UI 批准尚未给出。完整前轮历史见 [archive-v2/plan-review.md](archive-v2/plan-review.md)。

## 当前结论

v3 产品方向覆盖最新三项要求，并保持创建行 32px/4px 间距/14px 字号、底栏 72px、属性移除、条件渐隐及试验场单行管理入口。五分类覆盖所有可读取作品，作品视图保留完整业务树；四个过滤视图按作品名分组，切换本身只更新左导航。

最终结论：**v3 方案与 HTML 可交用户审核，无未解决 P0/P1/P2**。初审正文根菜单、正文空态、角色双查询及状态保持已明确并在原型范围核验；当前 32 组主代理报告、独立重点运行、最终截图和文档一致性已复核。用户尚未批准本次 UI，生产实现及真实产品/Base UI/Electron/安装包验收均未执行；前轮原型结果不记为 v3 当前执行。

## v3 方案问题及修正要求

### P1-01：正文分类不能移除整书菜单的可达性

- 证据：真实外层正文目录在 `src/components/layout/SidebarTree.tsx:2025` 挂载 `OutlineTreeMenu(novel, kind="content")`。`src/components/layout/OutlineTreeMenu.tsx:131–145` 根菜单提供添加卷、整书正文/大纲导出、删除全部卷章；删除后的重建依赖添加卷。技术原第9条只写去掉外层目录，可能在分类中丢掉这些原操作，尤其无卷章时无重建入口。
- 当前产品修正：`product-design.md:58` 已规定作品分组标题不可点击，但右侧复用独立的正文导航功能菜单，空卷章仍能添加卷。
- 状态：**已解决（方案及原型范围）**。`technical-plan.md:15` 点名复用原根菜单/确认/导出及空态菜单。当前 `viewer.tsx:36–39,108` 的正文分组标题右侧演示独立菜单，空卷章仍有添加卷/导出整书正文/删除全部卷章；独立运行确认两作品各有菜单、空列表也可打开、Escape 回触发器。分组标题不可点击。正式功能必须继续使用原 OutlineTreeMenu，不导入原型菜单。

### P2-01：正文分类空态不得复用大纲跳转

- 证据：`SidebarTree.tsx:1069–1083` 的 OutlineSubtree 即使 kind=content，现有无卷章分支仍显示“暂无大纲，去生成”并打开 type=outline。直接复用会混入正文分类之外的入口。
- 当前产品修正：`product-design.md:58` 已规定“暂无正文”，不显示旧大纲引导、不跳大纲；原根菜单仍可添加卷。
- 状态：**已解决（方案及原型范围）**。`technical-plan.md:15` 明确 content 列表空态覆盖旧引导。`viewer.tsx:99,105,108` 展示“暂无正文”；独立运行在分类空列表确认两条正文空态、原根菜单可达、没有“暂无大纲，去生成”。

### P2-02：角色合并列表需按两项真实查询区分加载/失败/空

- 证据：`SidebarTree.tsx:337–359` 正式角色查询只有 isLoading，错误会被 data??[] 当空；`ForeshadowCharacterSection` 的真实查询为 `:481–487`，`:586–587` 在加载或空时直接不渲染，错误也会消失。正式为空而伏笔还未取到时不能宣布整个作品“暂无角色”。
- 当前产品修正：`product-design.md:60` 规定正式/伏笔分别显示加载与错误，只有二者成功且总数为0才显示“暂无角色”。
- 状态：**已解决（方案及原型范围）**。`technical-plan.md:15,25` 明确两个真实 query 的 loading/error 和成功空态条件。`viewer.tsx:106–108` 新增合成部分失败示意：失败作品保留4位正式人物，另一个作品保留5位正式/伏笔人物；错误和重试可见、不显示整组“暂无角色”。独立运行已确认，重试恢复10位合成人物。真实 query/mutation/缓存仍留待正式实现验证。

### 状态保持检查点

`UnboundConversations` 当前在 `SidebarTree.tsx:1237` 自持 groupExpanded。`technical-plan.md:25` 已明确提升到 per-view 受控 expanded，以及异步正文数据到达后再次恢复 scrollTop，不把加载占位那一帧夹到0当作最终值。当前原型 `viewer.tsx:49–51,73–75,138` 保存每分类折叠与滚动；独立运行确认 works=180px、settings=70px 的位置可分别恢复，设定世界折叠与作品展开互不影响。真实异步恢复、账户/目录变更清理须后续实现用例验证。

## 源代码与产品范围核验

| 检查项 | 源文件及结论 |
| --- | --- |
| 新对话动作/图标 | `SidebarTree.tsx:1684` 原 requestNewConversation 与 `:1376–1378` 新对话选中判断保留。已目视本次用户附图 `codex-clipboard-d6e341b7-305f-4e6b-a85b-e93af2188c18.png`，其圆形气泡内加号与本地 MessageCirclePlus 对应；产品 `:16,34` 明确新名称。 |
| 创建与账户尺寸 | 产品 `:14–20` 延续 32px/4px、14px/20px/500、图标18px/1.7、padding12/gap10、底栏72px/按钮52px/头像32px。右侧 Tabs、业务树字号及原生安全区不因分类改变。 |
| 场景单行 | `SidebarTree.tsx:1991–2007` 当前箭头/sceneKey/GlobalSceneTree 将移除。`src/components/content/scene/SceneWorkspace.tsx:23` 的 openAllScenes 使用真实 scenes Tab、作品 ID 和原 tabs store；`registry.tsx:67–69` 的 scenes/scene/scene-image 原面板仍在。仅入口选中范围扩大到同作品这三类，右侧 SceneTree/目录偏好/引用逻辑不改。 |
| 完整作品树 | `SidebarTree.tsx:1744–2055` 含作品、设定、角色、物品、试验场、场景、世界线、叙事线、大纲、正文、创作进度、创作评审、级联修订、对话。产品五分类表规定 works 保留全部原操作，按最新要求只撤属性入口及场景/试验场子项。 |
| 分类作品集合 | `src/lib/novel-list.ts:18–19` 的 useNovelList 共享 ["novels"] 和 NovelList envelope。`SidebarTree.tsx:1395–1397` 的可读/不可用作品为真实集合。分类不依赖作品树展开，不以标题作为 key，不限当前 active novel。 |
| 设定分类 | `SidebarTree.tsx:1827–1918` 的主题、文风、世界观、其他 NOVEL_SETTING_TYPE_ORDER、伏笔、爽点/泪点均由原动作打开；WorldSubtree 与原增删改 callback 保留。只改变 baseDepth/目录包装；不出现属性或其他分类业务节点。 |
| 角色分类 | `SidebarTree.tsx:337–344` 保留 ["characters", novel.id]；`:393–442` 保留真实 ID、头像裁切、引用 chip、悬停、角色 Tab。`:481–505,618–695` 的伏笔查询/双键失效、标记及重命名/转正/揭示/删除菜单继续复用。平铺不是一份新角色列表业务实现。 |
| 正文分类 | `SidebarTree.tsx:1052–1058` 保留 ["novels", novel.id] 真实卷章详情；`:1094–1155` 保留卷展开键、章节状态、kind=content 的 chapter-content/refId、卷菜单。分组标题右侧另保留原根级 OutlineTreeMenu，避免空卷章失去动作。 |
| 对话分类 | `SidebarTree.tsx:1238,1305–1312` 两处共享 ["chat-conversations"]，`:1239` 以 novelId===null 保留未绑定会话，`:1310–1312` 按真实 novelId 归属作品。`:1281,1352` 继续 requestConversation(c.id)，分类切换不请求切换会话；无作品时未绑定会话仍可读、可达。 |
| 每视图状态 | 技术局部 NavigationView、per-view expanded/scrollTop、账户/目录 scope 重置、移除作品清理和仅挂载所选导航内容符合隔离。右侧面板不处于该条件分支，也不改其 key、tabs 或 drafts。 |
| Tabs 可访问语义 | 产品规定 tablist/tab/tabpanel，roving tabIndex、方向键循环、Home/End、Enter/空格，选中互斥，焦点留选项，Tab 再进入操作节点。200px 五项等宽、无横向滚动需以 v3 实际 DOM 几何确认。 |
| 条件渐隐 | `src/app/desktop.css:149–150` 与 `useContentTabStrip.ts:134,151,159–163` 仍为条件24px遮罩依据。当前覆盖主树、分类作品标题、创建、不可用作品、底部及菜单账户名/邮箱；场景子树已撤销，故不再改共享 SceneTree，避免把旧 v1/v2 需求带入右侧目录。 |
| 属性边界 | `SidebarTree.tsx:1919–1925` 仅撤导航 TreeNode；原 AttributesPanel/registry/schema/服务和已打开属性 Tab 保留。 |
| 试验场边界 | `SidebarTree.tsx:830–835,1535–1613` 原 ["scenarios", novel.id] 与增删改、renameScenarioTab、closeTab 保留；registry 的 scenario 仍需 refId，不新增无 refId 列表 Tab。管理弹窗与操作互斥、明确启动/返回 ref，直达创建取消回+、列表内取消回记录/新建、删除成功回新建，真实场景离开 guard 通过后才关闭列表。 |
| 草稿与离开门控 | `src/stores/tabs.ts:258–285` 的 openTab/closeTab/activateTab 已包装 afterSceneLeave。导航分类只改局部状态，不绕过 store，不重挂载 MarkdownEditor/ChatPanel，不发送模型请求。真实门控与草稿保留需正式用例证明。 |
| 真实组件/隔离 | `AGENTS.md` 与 `docs/implementation-boundaries.md` 要求原真实组件/29面板、不导入示例或 HTML。技术拟只改真实 SidebarTree/导航标签/局部 CSS/UnavailableWorks，必要时提取同一节点渲染，没有第二套数据/动作、父目录或安装版原型引用。 |

## v3 HTML 与报告独立核验

当前 `index.html:3–4` 标题为 v3，引用本目录 CSS 和 bundle；`viewer.tsx:1` 明确合成审核用途。真实图标包仍只在原型本地打包；没有生产组件、业务 API 或父目录引用。`viewer.tsx:31,137–138` 五项 tablist/tab/tabpanel 采用同一稳定 panel id、aria-selected、roving tabIndex 和动态 aria-labelledby，方向键循环/Home/End 保持焦点；Enter/空格通过真实 button 激活。`preview.css:12` 为36px容器、28px等宽选项、12px/18px标题，200px也无省略/横向滚动。

主代理当前 `preview-checks.json` 为 `revision=v3,status=passed`，32组设计检查、0 pageErrors/HTTP、6生产源文件hash前后一致；新增双主题×3栏宽×5分类的30个组合均符合完整标题/28px选项/无横向溢出。独立使用 Get-FileHash 再核对这6个生产文件，全部匹配报告。`design-verification.md` 已同步 v3、32组、MessageCirclePlus、新分类截图和当前失败修复历史，旧v2文字一致性问题已关闭。

本轮独立运行只使用已安装 Chrome、临时隔离 profile、file URL、HTTP拦截，没有 HTTP监听服务；操作仅修改浏览器内合成状态。执行双主题200×500px及下列新增项，不重复全量旧范围，实际命令结果：

```json
{"revision":"v3","scope":"independent-offline-synthetic-prototype","narrowThemes":2,"checks":["new-dialog-label-icon","five-tabs-fit-and-ARIA","all-work-filtering","flat-10-characters-including-foreshadows","partial-character-error","manuscript-volumes-chapters-empty-root-menu","unbound-conversation-without-works","single-scenes","per-view-collapse-scroll","category-does-not-change-business-selection","keyboard-cycle-home-end-enter-space"],"workScroll":180,"settingsScroll":70,"pageErrors":0,"httpRequests":0,"productTests":"not-run","nativeAcceptance":"not-run"}
```

| 独立检查 | 实际原型结果 |
| --- | --- |
| 新对话及场景 | 第二创建按钮名称新对话、data-icon=MessageCirclePlus；场景无箭头/子项，点击提示原场景面板，未新增模拟业务类型。 |
| 五项 Tabs | 双主题200×500px均完整、等宽，36px容器无溢出；每次切换只有一个selected和一个tabIndex=0，tabpanel由当前Tab标注。 |
| 跨作品过滤 | 收起作品视图中的第一个作品后，设定仍展示两个作品；仅设定/世界节点，没有角色/正文/对话/场景混项。 |
| 角色 | 两作品各5人，总10人，含2位伏笔人物；平铺无角色类型折叠目录，身份标签保留。部分失败保留成功人物和另一作品，错误/重试独立。 |
| 正文 | 两卷四章、无其他分类节点；两个独立整书菜单，空列表两条“暂无正文”，菜单继续可达且不跳大纲。 |
| 对话 | 两作品各一条及未绑定一条，共3条；空作品状态下未绑定会话仍可达。 |
| 折叠/滚动/选中 | works180px、settings70px各自恢复，设定世界折叠独立保存；切换分类后当前示意动作文本不变、切回作品仍选中原场景行。该结果不代替真实右侧编辑器/草稿验收。 |
| 键盘 | ArrowRight/Left循环、Home/End、Enter/Space均选中并聚焦目标Tab；正文菜单Escape关闭后回原独立触发器。 |

主代理第二次运行发现正文菜单打开后立即Escape未关闭，`viewer.tsx:39` 已把Escape处理加入wrapper，兼容焦点尚未进入菜单。独立补查该具体修正3次，结果：

```json
{"revision":"v3","independentMenuEscapeChecks":3,"menuClosed":true,"focusRestored":true,"productTests":"not-run","nativeAcceptance":"not-run"}
```

此补查首次浏览器默认load等待超时，尚未进入断言；随后以 DOMContentLoaded 并等待 `.nav-tabs` 实际存在再执行，3次全部通过，不把该未开始断言的运行计通过。主代理首次角色数误写6人、第二次菜单边界失败与最终32组重跑结果已在 design-verification.md 据实记录，未删除失败条件或将历史结果冒充当前结果。

独立目视本次图标附图以及当前 `preview-category-settings.png`、`preview-category-characters.png`、`preview-category-manuscript.png`、`preview-short-narrow.png`：五分类选中清楚，两作品分组有归属，人物标签和正文菜单完整；最窄栏标题仍完整，短窗固定区与树区不重叠。角色名单为平铺，正文卷章层级清楚，场景单行设计与最新要求一致。

本轮写入仅当前 plan-review.md。未运行正式产品/全量测试、读取真实作品或 Key、创建 HTTP服务、修改生产或台账。前轮独立运行留在归档，不冒称本轮结果；HTML不能证明真实React缓存、IPC、草稿、BaseUI或原生系统通过。

## 最终阶段状态

- `uiRevision=v3`
- `planReview=passed-for-user-ui-review-only`
- `htmlDesignReview=passed`
- `uiApproval=awaiting-user`
- `implementation=not-started`
- `productTests=not-run`
- `nativeAcceptance=not-run`

收到本次用户 UI 批准后仍需按 AGENTS.md 完成独立方案复核、用例及独立审核、TDD、代码审查、全量回归和真实目标验证；本报告不解除任何阶段要求。
