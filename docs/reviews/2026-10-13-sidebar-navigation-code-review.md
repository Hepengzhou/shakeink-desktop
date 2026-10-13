# 已批准 v8 导航实现独立 code review

日期：2026-10-13。审核者：sidebar_drawer 子代理；未实施下列导航生产文件。结论：导航范围通过，当前阻断项 0。此结论允许进入构建及真实 Windows 验证，不代替全量回归或原生验收。

## 审核范围与方法

逐项对照 product-design.md SN-01–16、正式技术方案、测试用例，检查 SidebarTree、NavigationLabel、sidebar-navigation-state、ScenarioLibraryDialog、ScenarioCreateDialog、OutlineTreeMenu、SidebarHoverCard、UnavailableWorks、tabs store 的新增 guard，以及 desktop.css 的导航 token、品牌、创建入口、分类、身份和账户样式。检查真实源与 Git diff、缓存键、实际 ID/回调、ARIA、生命周期及测试 fixture 的隔离边界。DashboardShell/useSidebarDrawer 属本审核者实施范围，交另一独立子代理审核，未自行批准。

## 已修复的审核发现

1. **SN-10 未绑定指引会话读取失败被吞掉。** 初版 UnboundConversations 只取 data，零真实作品时 query 失败返回 null，导航缺少会话失败与重试。审核通知后已改为同一 `['chat-conversations']` 查询的 pending/error/retry 分支，保留真实未绑定请求和 `@unbound` 展开状态。真实浏览器零作品+会话失败用例已通过，见 `docs/evidence/sidebar-navigation/green/unbound-query.tap`（1/1）。修后代码不再以空指引掩盖错误。
2. **SN-05 改名完成的焦点被 Dialog 的恢复行为覆盖。** 主代理真实测试在初版异步 rAF 聚焦时失败：返回列表后焦点停在 Dialog 根。修后在布局 effect 同步聚焦替换目标，早于 Base UI 的 focusout 恢复；删除回“新建”，改名/取消回原记录。核验修后源及 `navigation-focus-final.tap`（4/4），原失败保留在 `navigation-edit-focus*.tap`。

## 源码结论

- 分类只改变导航渲染。作品和四类过滤视图调用同一真实设定/角色/卷章/对话组件及原动作，不改右侧面板数组、编辑器 key、对话草稿或 registry。场景点击保持原 openAllScenes；分类/fold 不调用它。属性仅移除左入口，业务类型和面板保留。
- 过滤作品组用原生 disclosure button、稳定 body id、hidden+inert；正文根 OutlineTreeMenu 是 header sibling，空态和折叠后仍可达。世界/卷展开键含 novelId/类别；清理只作用于对应真实实体。菜单/hover 使用瞬态边界，业务 Dialog 保持独立 portal 生命周期。
- UnavailableWorks 始终是一个实例，其可选 renderWork 只包装各 workId 的 UI；统一 flight/busy/repair 仍由原控制器持有，视图切换不增加维修并发。scope 校验阻止旧结果改变新目录显示。
- 场景试验场为单行入口和单 Dialog Root，管理/创建/改名/删除互斥；cast form 复用既有组件。query 只在管理列表开启，缓存及详情 ID 保留。POST 成功后退到已创建列表，再等待 guard，拒绝不会重复 POST。取消、scope/session/作品失效会 abort 调用等待。tabs 扩展在 guard 后核对源 activationNonce、AbortSignal 和目标对象，旧 void 异步调用也不能覆盖后来导航。
- 实际溢出才启用 24px mask；完整字符串/title/ARIA 保留，操作与徽标不纳入 mask。角色 badge 贴姓名后 6px；四身份 token 同时供应 fallback icon/伏笔字头像和徽标。照片不染色；章节 status 主图标不加类型 tone。FolderClosed/Open 和左侧 Pointer 只改变左导航，不改共享右 Tabs 图标解析。
- 创建入口、账户区、品牌及五分类尺寸与批准 v8 对应。主题 token 使用已批准的纸/墨配色；未选项/组透明，选中使用中性底及细边。原 Seal 本地双主题资产复用，无新远程字体/Logo。导航 scroll hook 区分自然夹限与显式用户意图，观察内容高度后恢复；scope 更换清理局部状态。

## 测试证据与限度

已检查真实导航测试、guard 单元测试和实际 green 日志：`navigation-first.tap`、`navigation-style-flight.tap`、`navigation-icons-scenes.tap`、`navigation-focus-final.tap`、`unbound-query.tap`。这些用例执行真实 React 导航、React Query、stores、Dialog 及实际 DOM 事件；接口返回隔离合成数据。浏览器 fixture 不证明 PGlite/IPC、真实本地 Logo 加载或原生拖拽命中；最终仍需主代理的全量回归、构建、离线 Windows Electron 及 native hit-test。macOS 未实际执行，不能标真实通过。

本审核未发现其它必须修改的导航代码或测试阻断项。若下面哈希对应的审核范围继续修改，新增改动需要补充审核。

## 审核快照 SHA-256

- src/components/layout/SidebarTree.tsx: 6B61E3074ED75EDEFDEF7F85F59B0DE481EBC865CD3D93FB6D3CDFB2320F826F
- src/components/layout/NavigationLabel.tsx: F39AE6A910FE4C834D9E7059BD737A66E400F71F727AB7AA3DFB2631E5C595D4
- src/components/layout/sidebar-navigation-state.tsx: 48AF5F886885905A6415CC185A98B9FAFEF3D7BA710E23050FEC2B814F41621E
- src/components/layout/ScenarioLibraryDialog.tsx: 1623DFA871D69ABFE43A8A53DD2934054EA2263E860E36D6B8950CC90F68AABD
- src/components/layout/ScenarioCreateDialog.tsx: CA551C34117B25DF72795C9DF8EF8120246FF572422E68799698586E8D191DB5
- src/components/layout/OutlineTreeMenu.tsx: 143670760B33D55C839C6B5B57594DF0958608B2AEF31B24B72834F60ED184B4
- src/components/layout/SidebarHoverCard.tsx: C3FF1E958A17A92B8FFC180A184CB8ED20A310E96EFCA95F2F89190662EDFA88
- src/components/desktop/UnavailableWorks.tsx: 57108BB4DB196C22B2F01A23D501BEB7A1E62489D0600AEE91A18354F31098B6
- src/stores/tabs.ts: B8D20476B85AEBE0F851A9016730E9C30F92C304E474B6645D979C3A6B8EA680
- src/app/desktop.css: A086D9A7147B5DE08F6CF9557E85BC115D5F494BACBC949AB315CA2253911258
- tests/browser/sidebar-navigation.test.ts: B48FEA3A9A4525EDA08B4D1BA7825786C23DE0150BDF82B0139CF9878407F6D3
- tests/unit/sidebar-navigation-guard.test.ts: 2AFD36E9765EC1B782481D2F0867BDA0F48163F24C2A355A89EAD87232AC3B62

## 同日补充审核

在上面的快照后，主代理对 desktop.css 补充 `.sidebar-navigation .tree-scroll` 单个 bounded `no-drag` 区域及所有滚动后代的 `app-region:initial`。源码接受：仅稳定、可见、裁切的滚动 viewport 注册排除，滚动到标题栏外的行不再各自注册；moving/hidden 的更高优先级规则仍撤销包括该 viewport 在内的内层注册。此处只接受源码策略，不把 Chromium 计算样式或本报告当作 Windows native hit-test 通过。

root nav 的显示改由冻结的 data-drawer-mode 控制；该项属另一独立 Drawer 审核范围。实际跨断点补充测试 `green/drawer-breakpoint-review.tap` 为 4/4：closing 中宽模式仍隐藏 root nav，inner.height 与 caption 绝对 top 不变，终态才切窄模式；899px nav 可见、900px不可见。该验证仍不是原生命中证据。本导航范围结论继续为阻断 0。
补充源码 SHA-256，src/app/desktop.css: EEFE6871B031127DB755FB36769D39029789781E496887FCCC326BFC4038BCAC
