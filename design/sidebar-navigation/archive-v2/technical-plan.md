# 左侧导航技术方案（HTML 审核阶段）

日期：2026-10-13。本方案为后续实施准备；生产文件尚未修改。

v2 当前创建入口规格为 32px 行高、4px 间距、14px/20px 文字、500 字重、18px 图标，保持图文居中、左右 padding 12px 和 gap 10px。覆盖 v1 的 44px/6px/13px；其他业务和账户规格保持。

1. 保留 `SidebarTree.tsx` 的真实 React、状态、查询、mutation、原向导、头像、悬停卡、引用拖拽、所有其他树分组和账号菜单；以局部样式调整创建与账户区域，使用已安装 Lucide 新图标。不得引入 HTML fixtures。
2. 新增轻量 `NavigationLabel`（拟定 `src/components/layout/NavigationLabel.tsx`），保留完整 React 文本、title 和传入类名；ResizeObserver 测量文字容器，`scrollWidth > clientWidth + 1` 写入局部溢出状态；挂载、文字变化、字体 loadingdone、容器 resize 均经 rAF 合并测量，卸载取消并断开。mask 只用于标题，右侧 action/tag shrink-0。本地样式落 `src/app/desktop.css`，不改 ContentTabs 专用 zoom。
3. 主树标签、创建入口、账户触发器/菜单头部、UnavailableWorks 标题使用上述组件；`SceneTree.tsx` 的 `instance="global"` 才采用导航标签，其他目录树外观/行为不变。保留拖拽帮助 title，完整名称提示挂在文本元素。SceneTree 不改 key、prefs、焦点/键盘或引用逻辑。
4. 删除设定下属性 TreeNode 和唯一闲置图标 import；不删除 registry、tabs 类型、服务、schema、既有面板。
5. 情景试验场导航不保留 expandable/onToggle/scenarioKey 或树内 ScenarioSubtree。入口 active 按当前 Tab 的 type 和 novelId 判定，不能仅按 tab id 猜测。移除创建成功后自动展开逻辑。
6. 将既有列表查询和列表打开/菜单行为移入管理 Dialog，可抽为 `src/components/layout/ScenarioLibraryDialog.tsx`；只在打开时加载，保留 `['scenarios', novel.id]` 缓存键和原详情 Tab ID。清晰处理 pending/error/empty/列表。创建、改名、删除调用原 mutation/原弹窗，管理与操作弹窗互斥。显式保存导航行/“+”与列表操作启动 ref（不能假设 TreeNode 是 DialogTrigger）；用 Base UI 的 initialFocus/finalFocus 或等价受控焦点恢复实现产品返回规则。弹窗切换时抑制旧弹窗 finalFocus 返回导航的抢焦，待新弹窗挂载后聚焦对应按钮/记录；记录已删或 ref 已卸载时回列表“新建”或仍存在的导航入口。直达创建 cancel 回“+”，列表操作 cancel 回原记录/新建。打开详情使用原 openTab/activateTab 的场景离开 guard；实际激活成功才关闭列表，不绕开 guard、不误显示成功。create success 同样尊重现有门控。无需新增列表 Tab 类型或改 29 面板 registry。
7. UI 审核通过后先完成独立技术方案审核（必要时更新本方案）→编写行为测试用例并独立审核→实际红灯证据→TDD 实现→独立 code review→相关用例及全量回归→真实 Windows Electron（隔离目录）验证。macOS 或安装包未实测时不标通过。更新两个台账，保留其他任务修改。

## 文件范围

拟修改：`src/components/layout/SidebarTree.tsx`、`src/app/desktop.css`、`src/components/desktop/UnavailableWorks.tsx`、`src/components/content/scene/SceneTree.tsx`；拟新增 NavigationLabel 与 ScenarioLibraryDialog、专项测试/验证脚本。若 code review 发现必须调整 SceneWorkspace 传参，仅限 GlobalSceneTree 的实例区别。

此阶段只新增 `design/sidebar-navigation/` 和台账 pending 记录。设计验证脚本使用 file URL/本地已安装浏览器、合成数据、HTTP 拦截；对涉及的生产源文件比对 SHA-256，验证未修改。报告明确 `productTests=not-run`、`nativeAcceptance=not-run`。正式“全部通过”结论不能依据原型报告。
