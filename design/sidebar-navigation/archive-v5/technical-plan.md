# 左侧导航技术方案（HTML 审核阶段）

日期：2026-10-13。本方案为后续实施准备；生产文件尚未修改。

v5当前范围：导航Tablist外组和未选Tab（含hover）透明无边框，选中Tab使用6px圆角active-wash与primary文字；仍36px组高/28px选项高，上16px/下12px留白，间隔4px。保留ARIA/roving/focus-visible，不把纯视觉移除理解为取消键盘焦点轮廓。新对话删除isNewConversation对背景/文字/图标的全部active分支及仅供该样式使用的局部binding，继续原requestNewConversation，不写新chat状态。旧v4设计在archive-v4/。

设定视图复用原设定目录节点后，追加物品/情景试验场/场景/世界线/叙事线/大纲的真实入口渲染函数；与作品视图共享同一函数、原type/novelId和回调，不重复query/mutation。物品、世界线、叙事线、大纲走原openSimpleTab；场景仅用户激活入口时调用openAllScenes，分类渲染/切换不得触发scope/search重置；试验场沿用ScenarioLibraryDialog和原缓存/refId、管理/“+”焦点返回当前分类实例。作品完整树不删除六入口，其他过滤分类不增加六入口。分类切换只变导航，右侧业务实例/草稿/历史会话选中不变。

v4当前创建入口仍为32px/4px/14px/20px/500，图标18px。“新对话”、五分类和单行场景/试验场保持；Tabs外margin改上16px/下12px，角色标記放姓名后6px，侧栏收放用固定内层宽度的水平抽屉动作。v3历史在archive-v3/，生产文件尚未改。

1. 保留 `SidebarTree.tsx` 的真实 React、状态、查询、mutation、原向导、头像、悬停卡、引用拖拽、所有其他树分组和账号菜单；以局部样式调整创建与账户区域，使用已安装 Lucide 新图标。不得引入 HTML fixtures。
2. 新增轻量 `NavigationLabel`（拟定 `src/components/layout/NavigationLabel.tsx`），保留完整React文本、title和类名；ResizeObserver按实际完整内容容器测量溢出，挂载/文本/字体/尺寸变化经rAF合并，卸载清理。文字末端24px条件mask；角色姓名与标记同组，组flex:0 1 auto/min-width:0，姓名可缩、身份标记shrink:0，gap6px；只对角色启用，其他tag/操作位置沿用。短姓名用内在宽度，长姓名只缩文字不缩标记。样式落desktop.css，不改ContentTabs专用zoom。
3. 主树标签、分类作品分组标题、创建入口、账户触发器/菜单头部、UnavailableWorks 标题使用上述组件。v3 已取消 GlobalSceneTree 的导航挂载，因此不再改 SceneTree/SceneWorkspace 内的目录样式、key、prefs、焦点/键盘或引用逻辑。保留拖拽帮助 title，完整名称提示挂在文本元素。
4. 删除设定下属性 TreeNode 和唯一闲置图标 import；不删除 registry、tabs 类型、服务、schema、既有面板。
5. 情景试验场导航不保留 expandable/onToggle/scenarioKey 或树内 ScenarioSubtree。入口 active 按当前 Tab 的 type 和 novelId 判定，不能仅按 tab id 猜测。移除创建成功后自动展开逻辑。
6. 将既有列表查询和列表打开/菜单行为移入管理 Dialog，可抽为 `src/components/layout/ScenarioLibraryDialog.tsx`；只在打开时加载，保留 `['scenarios', novel.id]` 缓存键和原详情 Tab ID。清晰处理 pending/error/empty/列表。创建、改名、删除调用原 mutation/原弹窗，管理与操作弹窗互斥。显式保存导航行/“+”与列表操作启动 ref（不能假设 TreeNode 是 DialogTrigger）；用 Base UI 的 initialFocus/finalFocus 或等价受控焦点恢复实现产品返回规则。弹窗切换时抑制旧弹窗 finalFocus 返回导航的抢焦，待新弹窗挂载后聚焦对应按钮/记录；记录已删或 ref 已卸载时回列表“新建”或仍存在的导航入口。直达创建 cancel 回“+”，列表操作 cancel 回原记录/新建。打开详情使用原 openTab/activateTab 的场景离开 guard；实际激活成功才关闭列表，不绕开 guard、不误显示成功。create success 同样尊重现有门控。无需新增列表 Tab 类型或改 29 面板 registry。
7. 场景入口移除 expandable、sceneKey/toggle 和 GlobalSceneTree 挂载；点击复用 openAllScenes，按当前 Tab 的 type/novelId 判断关联选中。右侧 scenes/scene/scene-image registry、场景目录及能力保持。
8. 在 SidebarTree 中增加局部 NavigationView（works/settings/characters/manuscript/conversations）和受控分类 Tablist，替换作品阁文字。仅改变导航渲染，绝不修改 useTabsStore 的 tabs 数组、ChatPanel 当前对话、编辑器 key 或 drafts。默认 works；键盘 roving tabIndex，方向键自动激活，稳定 panel id/aria-labelledby，焦点留在选项。
9. 提取同一个真实节点/列表的渲染分支供完整树与分类复用，不维护第二套业务逻辑。设定复用当前固定节点、WorldSubtree（支持 baseDepth）和物品/试验场/场景/世界线/叙事线/大纲六个原入口；角色给 CharacterSubtree/ForeshadowCharacterSection 增加列表布局分支并保留真实角色数据/引用/头像/菜单，两个真实 query 各自显示 loading/error，只有都成功且总数0才显示暂无角色，不沿用失败返回null的歧义。正文用 OutlineSubtree(kind=content, baseDepth) 去掉外层正文目录，在不可点击的作品分组标题右侧保留原 OutlineTreeMenu(kind=content) 的添加卷/整书导出/删除全部卷章（空列表也可达）；content 列表空态单独渲染“暂无正文”，不复用旧“暂无大纲，去生成”或打开 outline。对话复用 ConversationsNode/UnboundConversations 的 list-only 分支，继续共享 ['chat-conversations'] 缓存和原 chat store 切换动作。分类内每个真实作品独立处理 pending/error/empty，可按指定范围提取 SidebarNavigationViews.tsx，但必须引用同一真实函数/查询/mutation。
10. 复用 useNovelList 的可用和不可用作品清单，所有分类跨全部作品，不依赖 works 下某个作品是否展开。entity key/cache key 继续用真实 novelId/refId，不能用标题做 key；分类状态仅存本轮会话的每视图 expanded/scrollTop，账户或目录 scope 变动重置，作品移除清理。首次视图从顶部开始，之后恢复先前 scrollTop，ResizeObserver/rAF 重新测量渐隐。仅挂载所选分类的导航内容，让已有 React Query 承担缓存/去重/失效，不用 hidden 模拟“已加载成功”；过滤页卸载导航子树不得卸载右侧原业务面板。
11. DashboardShell真实原Panel中加裁切视口/固定内层，不重写Group和SidebarTree。关闭前从sidebar DOM测量完整px宽W；打开前把保存百分比与当前Group可用尺寸换算/夹到实际目标W，复用springEase及420/560ms。原setLayout只驱动可见占位V，固定内层width:W/不flex-shrink/translateX(V-W)，不是设置SidebarTree宽度=V。读实际Panel裁切宽度同步位移，避免库minSize/邻栏补偿导致计算值与实际宽度不同。动作中额外resize保留W，只更新裁切；完成后才校正真实可用宽度。
12. 取消/换向延续当前可见V，保存完整打开目标而非中途宽度；反复点击/恢复布局/卸载都取消旧rAF和过时回调，最终transform清理且hidden占位0；布局持久化沿用settledWorkspaceLayout，不把中间裁切值当新分栏偏好。保持SidebarTree相同挂载key，原query、分类、滚动和草稿不重建。只有手动拖宽或动作外resize触发正常内层宽度更新。捕获refs只在当前账户/目录有效。
13. 隐藏/动作期用inert和正确ARIA移出导航焦点序；关闭前将内部焦点转可见恢复入口，并关闭hover/非模态菜单，保留业务Dialog输入。动画中的导航内部非模态弹层不应跟随transform产生错位；真实BaseUI portal焦点/关闭联动与native drag/no-drag区域需专项验。打开结束恢复有效原焦点，否则回收放按钮；减少动态效果跳终态但保持裁切规则。HTML只验证设计媒介，后续真实Windows至少覆盖200/260/420px、zoom/字体、长标题/错误说明/身份标记、双主题、多次换向、隐藏重开/状态持久化和与内容区同时动画。
14. UI审核通过后依次独立方案复核→测试用例及独立审核→实际红灯→TDD实现→独立code review→相关/全量回归→真实目标验证。macOS/安装包未实测不标通过。台账保留其它任务修改。

## 文件范围

拟修改：SidebarTree、DashboardShell（原Group内局部抽屉包装/动画联动）、desktop.css、UnavailableWorks；拟新增NavigationLabel、ScenarioLibraryDialog，必要时提取SidebarNavigationViews及useSidebarDrawer（均真实组件局部复用），以及专项测试/验证脚本。无需改SceneTree/SceneWorkspace或原MarkdownEditor/ContentTabs/ChatPanel/registry业务渲染。

## v4独立初审的执行边界补充

1. **唯一布局写入者**：原sidebar/content/chat三个rAF均写完整layout，不能继续并发写旧快照。在原DashboardShell内部增加单一rAF协调器，现有show/hide/fullscreen函数只更新intent，不再各自setLayout。主轴为sidebar S(t)；第二轴按最新命令保留content C(t)或chat Q(t)，剩余轴由100-S-第二轴推导。普通侧栏收放保留当前content，chat吸收变化；chat全屏时保留Q=0，content吸收；content/chat命令切换第二轴意图时从当前合成值开始。统一投影正常终态约束（sidebar 200–420px、chat420px、可见content原30%），再确定打开目标W；动作期0宽只是临时许可，不能以小于200的临时目标结束再被库强行扩回。保留原420/560ms spring、content挂载后的preservedSidebar repin和Panel集合，但repin也由同一写入者执行。后续用例必须覆盖sidebar与content/fullscreen同时切换而不互相覆盖。
2. **实际DOM测量**：Panel.className在nested div，本地类型定义提供Panel.elementRef和Group.elementRef；用两者测真实外层V和Group换算基准，不用固定内层宽或window宽猜百分比。统一协调器目标计算与DOM测量需要容差、rAF合并和动画generation清理。
3. **终态持久化**：workspace draft read显式返回协调器的预计最终sizes/visibility，而不是lastMeasuredSizes中途值，再交settledWorkspaceLayout做总和/隐藏归一化。lastSidebarSize保存正常终态打开目标；隐藏或中途反向不把中间值覆盖目标。layout restore取消协调器、替换intent和完整尺寸，待Panel注册后只一次落位；不能声称现有settledWorkspaceLayout能自动修正展开中的中间尺寸。
4. **恢复与换向入口**：ChatPanel头部现有恢复按钮只在sidebarHidden时出现；改为“hidden或drawerAnimating”保持显示，并让callback切换当前目标方向。chatVisible=false全屏时，在ContentTabs现有caption（有/无业务Tab两分支）增加同一恢复/换向控件；只改caption props/工具，不改面板映射、key或编辑器。仅当前实际可见caption作为focus恢复目标，动画结束打开后再隐藏外部恢复控件。WindowControls、ChatPanel、ContentTabs保留Windows44DIP/zoom安全padding与macOS原生窗控88px安全起点。正式可修改范围因此包含ChatPanel/ContentTabs的局部caption联动；业务渲染保持。
5. **窄屏独立分支**：<900的CSS当前强制sidebar全宽并按narrowPane隐藏Panel，不由百分比动画控制。窄屏W取实际Group全宽；保留同一个SidebarTree/Panel，在Group内用受控absolute覆盖层加裁切/translate，动作中保留原目标chat/content面板实例作为underlay。通过drawer phase/underlay data属性只覆盖sidebar宿主display/position，处理原max-width/全宽规则；打开后underlay不可聚焦，关闭完成再按原narrowPane显示目标。根部可见的工作区导航提供动作中换向入口，不把全宽W写进桌面200–420px偏好。跨679/900断点时维持已捕获W至动作结束，再进入新模式并校正尺寸，不在中途重排侧栏。
6. **原生拖拽区域专项验证**：真实Electron已有“裁切后代no-drag仍注册矩形”的源代码记录，inert/overflow不证明原生命中安全。预案在moving/hidden时对平移内层及其所有显式drag/no-drag后代撤销注册（局部CSS reset app-region，而非把整层换成no-drag继续注册）；只在静止且可见时恢复，窗口其余可见caption继续负责拖拽。实现时需检查Electron实际CSS初始值和实际命中，若reset仍产生注册矩形，改由有界可见caption host承担注册并移除内层显式区域，直到真实鼠标hit-test证明不遮挡邻栏/窗控。隐藏离屏后代同样清理；不改变动画视觉内容，不把HTML或计算样式当native通过。两平台/zoom和减少动态效果分别据实验收，未实测不通过。

以上是后续真实实施方案，当前仅设计原型；HTML的相邻区域占位只演示恢复入口和空间变化，不证明真实布局协调器或原生系统已实现。

此阶段只新增 `design/sidebar-navigation/` 和台账 pending 记录。设计验证脚本使用 file URL/本地已安装浏览器、合成数据、HTTP 拦截；对涉及的生产源文件比对 SHA-256，验证未修改。报告明确 `productTests=not-run`、`nativeAcceptance=not-run`。正式“全部通过”结论不能依据原型报告。

独立初审补充：UnboundConversations 当前内部 groupExpanded 需提升/传入每视图受控 expanded，避免仅挂载当前分类导致切回作品重置折叠。正文分类卷章异步到达时再次尝试恢复该分类 scrollTop（夹到实际 scrollHeight），不能只在切换那一帧对加载占位设置后永久丢失位置；重命名/删除列表更新后仍测量标题并清理无效实体焦点。正文根菜单和角色两个 query 的失败条件按第9条单独验证。
