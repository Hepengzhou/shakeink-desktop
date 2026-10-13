# 左侧导航技术方案（HTML 审核阶段）

日期：2026-10-13。本方案为后续实施准备；生产文件尚未修改。

v3 当前创建入口规格为 32px 行高、4px 间距、14px/20px 文字、500 字重、18px 图标，保持图文居中、左右 padding 12px 和 gap 10px。“新对话”使用 MessageCirclePlus；新增五项分类 Tabs；场景和试验场都不在导航展开。覆盖 v1/v2 旧规格，其他已批准业务和账户范围保持。

1. 保留 `SidebarTree.tsx` 的真实 React、状态、查询、mutation、原向导、头像、悬停卡、引用拖拽、所有其他树分组和账号菜单；以局部样式调整创建与账户区域，使用已安装 Lucide 新图标。不得引入 HTML fixtures。
2. 新增轻量 `NavigationLabel`（拟定 `src/components/layout/NavigationLabel.tsx`），保留完整 React 文本、title 和传入类名；ResizeObserver 测量文字容器，`scrollWidth > clientWidth + 1` 写入局部溢出状态；挂载、文字变化、字体 loadingdone、容器 resize 均经 rAF 合并测量，卸载取消并断开。mask 只用于标题，右侧 action/tag shrink-0。本地样式落 `src/app/desktop.css`，不改 ContentTabs 专用 zoom。
3. 主树标签、分类作品分组标题、创建入口、账户触发器/菜单头部、UnavailableWorks 标题使用上述组件。v3 已取消 GlobalSceneTree 的导航挂载，因此不再改 SceneTree/SceneWorkspace 内的目录样式、key、prefs、焦点/键盘或引用逻辑。保留拖拽帮助 title，完整名称提示挂在文本元素。
4. 删除设定下属性 TreeNode 和唯一闲置图标 import；不删除 registry、tabs 类型、服务、schema、既有面板。
5. 情景试验场导航不保留 expandable/onToggle/scenarioKey 或树内 ScenarioSubtree。入口 active 按当前 Tab 的 type 和 novelId 判定，不能仅按 tab id 猜测。移除创建成功后自动展开逻辑。
6. 将既有列表查询和列表打开/菜单行为移入管理 Dialog，可抽为 `src/components/layout/ScenarioLibraryDialog.tsx`；只在打开时加载，保留 `['scenarios', novel.id]` 缓存键和原详情 Tab ID。清晰处理 pending/error/empty/列表。创建、改名、删除调用原 mutation/原弹窗，管理与操作弹窗互斥。显式保存导航行/“+”与列表操作启动 ref（不能假设 TreeNode 是 DialogTrigger）；用 Base UI 的 initialFocus/finalFocus 或等价受控焦点恢复实现产品返回规则。弹窗切换时抑制旧弹窗 finalFocus 返回导航的抢焦，待新弹窗挂载后聚焦对应按钮/记录；记录已删或 ref 已卸载时回列表“新建”或仍存在的导航入口。直达创建 cancel 回“+”，列表操作 cancel 回原记录/新建。打开详情使用原 openTab/activateTab 的场景离开 guard；实际激活成功才关闭列表，不绕开 guard、不误显示成功。create success 同样尊重现有门控。无需新增列表 Tab 类型或改 29 面板 registry。
7. 场景入口移除 expandable、sceneKey/toggle 和 GlobalSceneTree 挂载；点击复用 openAllScenes，按当前 Tab 的 type/novelId 判断关联选中。右侧 scenes/scene/scene-image registry、场景目录及能力保持。
8. 在 SidebarTree 中增加局部 NavigationView（works/settings/characters/manuscript/conversations）和受控分类 Tablist，替换作品阁文字。仅改变导航渲染，绝不修改 useTabsStore 的 tabs 数组、ChatPanel 当前对话、编辑器 key 或 drafts。默认 works；键盘 roving tabIndex，方向键自动激活，稳定 panel id/aria-labelledby，焦点留在选项。
9. 提取同一个真实节点/列表的渲染分支供完整树与分类复用，不维护第二套业务逻辑。设定复用当前固定节点与 WorldSubtree（支持 baseDepth）；角色给 CharacterSubtree/ForeshadowCharacterSection 增加列表布局分支并保留真实角色数据/引用/头像/菜单，两个真实 query 各自显示 loading/error，只有都成功且总数0才显示暂无角色，不沿用失败返回null的歧义。正文用 OutlineSubtree(kind=content, baseDepth) 去掉外层正文目录，在不可点击的作品分组标题右侧保留原 OutlineTreeMenu(kind=content) 的添加卷/整书导出/删除全部卷章（空列表也可达）；content 列表空态单独渲染“暂无正文”，不复用旧“暂无大纲，去生成”或打开 outline。对话复用 ConversationsNode/UnboundConversations 的 list-only 分支，继续共享 ['chat-conversations'] 缓存和原 chat store 切换动作。分类内每个真实作品独立处理 pending/error/empty，可按指定范围提取 SidebarNavigationViews.tsx，但必须引用同一真实函数/查询/mutation。
10. 复用 useNovelList 的可用和不可用作品清单，所有分类跨全部作品，不依赖 works 下某个作品是否展开。entity key/cache key 继续用真实 novelId/refId，不能用标题做 key；分类状态仅存本轮会话的每视图 expanded/scrollTop，账户或目录 scope 变动重置，作品移除清理。首次视图从顶部开始，之后恢复先前 scrollTop，ResizeObserver/rAF 重新测量渐隐。仅挂载所选分类的导航内容，让已有 React Query 承担缓存/去重/失效，不用 hidden 模拟“已加载成功”；过滤页卸载导航子树不得卸载右侧原业务面板。
11. UI 审核通过后先完成独立技术方案审核（必要时更新本方案）→编写行为测试用例并独立审核→实际红灯证据→TDD 实现→独立 code review→相关用例及全量回归→真实 Windows Electron（隔离目录）验证。macOS 或安装包未实测时不标通过。更新两个台账，保留其他任务修改。

## 文件范围

拟修改：`src/components/layout/SidebarTree.tsx`、`src/app/desktop.css`、`src/components/desktop/UnavailableWorks.tsx`；拟新增 NavigationLabel、ScenarioLibraryDialog，必要时提取 SidebarNavigationViews（真实已有节点布局复用），以及专项测试/验证脚本。v3 无需改 SceneTree/SceneWorkspace；原 MarkdownEditor/ContentTabs/ChatPanel/registry 业务渲染不改。

此阶段只新增 `design/sidebar-navigation/` 和台账 pending 记录。设计验证脚本使用 file URL/本地已安装浏览器、合成数据、HTTP 拦截；对涉及的生产源文件比对 SHA-256，验证未修改。报告明确 `productTests=not-run`、`nativeAcceptance=not-run`。正式“全部通过”结论不能依据原型报告。

独立初审补充：UnboundConversations 当前内部 groupExpanded 需提升/传入每视图受控 expanded，避免仅挂载当前分类导致切回作品重置折叠。正文分类卷章异步到达时再次尝试恢复该分类 scrollTop（夹到实际 scrollHeight），不能只在切换那一帧对加载占位设置后永久丢失位置；重命名/删除列表更新后仍测量标题并清理无效实体焦点。正文根菜单和角色两个 query 的失败条件按第9条单独验证。
