# AI 对话标题：渐变淡出与大模型短标题 总结

日期：2026-10-16。链路：调研 209 → 产品 210 → 方案 211（审核 212）→ 用例 213（审核 214）→ TDD 实现 → code review 215 → 验证 216 → 本篇。

## 交付内容

### 目标一：顶栏标题渐变淡出（与侧栏完全一致）

- `src/components/layout/ChatPanel.tsx`：顶栏标题由 `truncate`（省略号）span 换用侧栏同款 `NavigationLabel` 组件（`flex-1 text-[13px] font-medium` 保持不变）。尾部 24px 线性渐变遮罩、仅真实溢出时生效、`text-overflow:clip`、悬停完整标题、宽度变化实时重测，全部来自同一组件与 `.nav-label` 样式（`desktop.css:128-129`），未新增任何 CSS。

### 目标二：大模型后台短标题（类 Codex）

- `src/lib/services/conversation-title.ts`（新）：默认标题重算（与创建逻辑逐字一致）、标题清洗（成对包裹去壳/结尾标点/30 码点硬上限）、提示词构建（≤15 汉字/最好 ≤12、英文 ≤8 词、只输出标题）、编排函数（幂等 + CAS + 静默失败）。
- `desktop/handlers/chat/conversations/[id]/title/route.ts`（新）：`POST /api/chat/conversations/[id]/title`，auth+归属校验，透传 `request.signal`；经 `docs/migration-map.json` 登记 + `node scripts/generate-routes.mjs` 生成路由表（scope conversation，自动获得工作区定位与权威绑定）。
- `src/components/chat/conversation-title.ts`（新）：`createConversationTitleRequester` 工厂 + 单例；每会话每窗口期一次守卫，永久态（not-default）不重试、暂时性原因下轮自愈重试；fetcher 延迟解析全局 fetch（桌面传输层安装时序安全）。
- `src/components/chat/use-agent-chat.ts`：`finish` 收口处在 `succeeded`/`waiting_user` 且会话就绪时 fire-and-forget 触发；`changed:true` 时失效 `["chat-conversations"]`，顶栏与侧栏同步替换新标题。

### 关键性质（均有测试锁定）

- 不影响用户：无模型时连 `model.resolve` 都不发起（catalog 预检 + selection intent 双保险，**永不弹「配置模型」对话框**）；生成失败只记错误类型名、不写库、保留原标题；请求取消信号贯穿到模型出口，不占 LongTask 名额。
- 不覆盖：标题已非默认截断值（AI 产物/历史定制）时 `not-default` 跳过；并发回合由 `updateMany` CAS 兜底。
- 密钥与内容安全：密钥仅主进程出口注入；用量按 `conversation.title` 场景记账且快照无密钥；日志不含用户内容（code review P1 修复）。

## 验证结论（详见 216）

- 单元 19/19、集成 3/3（Electron 内嵌 Node 24，真实 Workspaces+PGlite+真实模型服务链）、浏览器 4/4（真实头部 JSX+真实 CSS）。
- 既有 AST 提取式回归修复后复跑 13/13；typecheck 通过。未跑全量（用户约束）。
- 已知限制：reconcile/follow 路径完成的回合当轮不触发（下一成功回合自愈）；CT-60 真机 tooltip 待有模型环境补验（退路已批准：不出现则与现状持平）。

## 对既有约定的遵循

- 复用真实组件（NavigationLabel），未触碰设计稿示例内容；界面文案全部来自真实状态。
- 无 HTTP 监听、无平台后备；密钥不出主进程；真实数据不入日志。
- 台账：`docs/migration-map.json` 新增路由行；`docs/requirements-traceability.json` 登记 `chatTitleRevision`。
