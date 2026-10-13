# 左导航 v8 正式测试用例独立审核

日期：2026-10-13。审核人：独立子代理 `sidebar_baseline`。范围：`2026-10-13-sidebar-navigation-test-cases.md`、`tests/browser/sidebar-navigation.test.ts`、`tests/helpers/sidebar-navigation-fixture.ts`、`tests/unit/sidebar-layout.test.ts`、`tests/unit/sidebar-navigation-guard.test.ts`，并对照真实 `SidebarTree`、tabs/scene-ui store、Prisma enum 与正式技术方案。本轮只写本审核文件，没有改生产或测试。

## 结论

**通过，可进入实际红灯与 TDD；当前测试计划无阻断项。** `blocking=0`，`testCaseReview=passed-for-red-and-tdd`。这不是用例已经执行或导航验收通过，也不把当前起步套件视为完整 SN-01–16 覆盖。

用例矩阵分别列出了单一布局写入者、终态目标/像素约束、换向/取消、guard 竞争、创建成功但拒绝离开、统一不可用作品 flight、每视图异步 fold/scroll、窄屏和真实原生命中。它没有把 HTML、浏览器 Fixture 或一个启动冒烟替代整组业务和目标系统验证。正式方案独立审核已经通过，用户批准 v8；此阶段没有重新引入 UI 审批门槛。

## 核查结果

1. **起步 UI 红灯会针对真实缺失行为。** Fixture 直接 bundle 正式 `SidebarTree`，没有复制 HTML 导航，实际 QueryClient/stores、React 事件和生产 CSS。品牌、32px 创建入口、新对话、属性移除、单行场景/试验场及五分类在当前组件未实现时应产生行为断言失败。第二条通过类别切换观察全部作品与真实 tabs/chat store 快照，能发现切分类误激活右侧内容。必须先记录这些实际断言红灯；仅缺少新模块/API 的导入错误不满足矩阵写明的红灯门槛。
2. **服务 Fixture 边界清楚。** API 仅返回 public synthetic records，body 路由 abort，没有 HTTP listener、模型或 Key。两个作品、三种正式角色及伏笔角色、卷章和绑定/未绑定会话与真实 queryKey/响应字段相符。`prisma/schema.prisma:74–80` 有 `WRITTEN`，当前正文 Fixture 使用该合法 enum；不是 `DRAFT`。其固定成功响应与短等待不能证明真实异步失败、数据库或 IPC，矩阵已另列专项。
3. **终态约束是可实现的验收输入。** 900px Group 下 200px sidebar + 420px chat + 30% content = 890px，第一条约束没有制造不可能的终态。合成器测试明确 content 轴或 chat fullscreen 轴、关闭 content 的余量与总和；spring 单调/精确/不越界。此纯逻辑套件不单独证明实际 Shell 已只剩一个 `setLayout` 写入者、真实 Panel 像素测量或目标存储；需执行矩阵中的完整 Shell 帧测试。
4. **Signal 与 store 竞争用例使用原生 store/guard。** 挂起的真实 registerSceneLeaveGuard、AbortController、业务错误身份、activationNonce 改变和新目标被另一请求替换均有具体断言。取消测试在 guard 保持未完成时要求 Promise 立即返回 false，再释放旧 guard 验证无迟到提交；没有通过先释放 guard 隐藏 busy 不解除。旧 void open 的迟到 guard 覆盖新导航用例已补入，源 Tab 的 subTabs 草稿保留也有断言。
5. **状态与证据边界合理。** 浏览器起步测试保留 tabs 数组、activeTabId、activationNonce 和 conversationId；正式矩阵另要求编辑器实例/草稿、每 view 的 fold/scroll、自然夹限恢复、用户意图接管及 scope/ID 清理。Windows 实际 Electron、缩放/主题、离线真实业务与原生 caption/hit-test 分层，macOS 无机器时明确 not-run。基线全量失败不能被改名为通过。

## 后续执行必须落实的覆盖

现有起步代码仅有 2 个 Sidebar 浏览器用例、4 个布局逻辑用例、4 个 guard 用例，适合起步红灯，不能覆盖完整批准设计。TDD 每条实现前/过程中依据矩阵补可执行测试，独立代码审核前至少完成：真实 Shell 并行 axis/换向/restore/目标存储、完整抽屉内层几何及焦点/窄屏/空非空 caption；Scenario Dialog 互斥/取消/创建已成功重试与 query 错误；UnavailableWorks 跨 view/折叠的一个 flight；每 view fold/scroll 与异步自然夹限恢复；角色双色/徽标/真实头像/章状态、条件渐隐和键盘 Tabs。

这些覆盖是已审核矩阵的执行要求，不是新的需求或 UI 审批。没有执行的条目保持 `not-run`，完整 suite/真实目标失败按证据处理；不可只依靠上述起步用例 green 宣称整个 SN 范围通过。

## 相关独立基线

`docs/evidence/sidebar-navigation/baseline/summary.json` 记录实施前稳定源快照、Node v24.19.0、271 个 core 文件：1966 tests / 1911 pass / 41 fail / 12 cancelled / 2 skipped；typecheck 通过。`failures.json` 含全部 53 个 not-ok 名称/诊断，分类只是启发式。后续全量回归需逐项对照，不把已有失败归咎本轮导航，也不隐瞒失败。
