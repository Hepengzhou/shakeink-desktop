# AI 对话标题：顶栏截断方式与大模型短标题 调研

日期：2026-10-16。范围：AI 对话区域顶部标题栏的标题文字截断方式（目标一）；通过大模型后台总结生成会话短标题并替换正式标题（目标二）。

## 目标一：顶栏标题截断现状与侧栏渐变样式

### 顶栏现状（省略号截断）

`src/components/layout/ChatPanel.tsx:1714-1717`：

```tsx
{messages.length > 0 && <MessageSquare className="size-3.5 shrink-0 text-primary" />}
<span className="min-w-0 flex-1 truncate text-[13px] font-medium">
  {messages.length > 0 ? (currentConversation?.title ?? "新会话") : ""}
</span>
```

- `truncate` = `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`，过长时尾部显示「…」。
- 标题来源：`currentConversation = conversations?.find(c => c.id === conversationId)`（:1607）；`conversations` 来自 react-query 缓存 `["chat-conversations"]`（:1040-1043，`fetchConversations` GET `/api/chat/conversations`，:155-160）。
- 空会话（`messages.length === 0`）时 span 渲染空串但常驻占位，保住右侧「显示内容面板」恢复钮位置（:1711-1713 注释明确要求）。
- 头部容器带 `desktop-drag`（窗口拖动区）与 `h-11`，Windows 下按 `env(titlebar-area-width)` 预留窗控安全区（:1692-1695）。

### 侧栏渐变淡出实现（目标样式）

组件 `src/components/layout/NavigationLabel.tsx`（全文 25 行）：

- 渲染 `<span className={cn("nav-label min-w-0 overflow-hidden whitespace-nowrap", className)} title={children} data-overflow={overflow || undefined}>`。
- `useLayoutEffect` + `ResizeObserver` + `document.fonts` 加载事件测量：`scrollWidth > clientWidth + 1` 时置 `data-overflow="true"`，**只有真正溢出才加遮罩**。
- `title={children}` 原生悬停提示完整文字。

样式 `src/app/desktop.css:128-129`：

```css
.nav-label { display:block; min-width:0; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:clip; flex:1 1 auto; }
.nav-label[data-overflow="true"] { mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent); -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent); }
```

即：尾部 24px 线性透明遮罩渐变，`text-overflow:clip` 不出省略号。侧栏内所有条目（作品、会话、页签、按钮、账户名）统一使用该组件，如 `SidebarTree.tsx:294`、`:332`（`<NavigationLabel className="flex-1">{title}</NavigationLabel>`）。

**结论**：目标一的最小且「完全一致」实现 = 顶栏标题 span 直接换用 `NavigationLabel` 组件（同目录），保留 `flex-1 text-[13px] font-medium` 类与空态占位行为。不改 CSS、不改组件本身即天然与侧栏一致。已有浏览器测试先例可断言该样式：`tests/browser/sidebar-navigation.test.ts:40-42`（`data-overflow` + computed `maskImage` 含 24px + `text-overflow:clip`）；真实头部 JSX 提取挂载先例：`tests/browser/chat-caption-safe-area.test.ts`（从 ChatPanel.tsx 源中提取 `desktop-drag h-11` 头部 JSX 打包包真实样式运行）。

## 目标二：会话标题生命周期与大模型基础设施

### 标题创建与展示链路

```
首条消息发送 → POST /api/chat（desktop/handlers/chat/route.ts）
  → beginChatRequest（src/lib/services/chat-turn.ts:194）
  → tx.conversation.create({ title: stripMentionPayloads(input.message!).slice(0, 50), ... })
  ※ title 必填无默认值（prisma/schema.prisma:997）
  ※ 用户消息原文 content = input.message! 逐字落库（chat-turn.ts:287），故可由首条 USER 消息精确重算该默认标题
响应头 X-Conversation-Id → use-agent-chat.ts:586 写入 chat store
展示：react-query ["chat-conversations"] 列表项 title
  → ChatPanel 顶栏（:1607, :1716，兜底文案「新会话」）
  → SidebarTree（:1239、:1314，兜底文案「未命名会话」）
```

- **当前没有任何更新会话标题的入口**：`PATCH /api/chat/conversations/[id]`（desktop/handlers/chat/conversations/[id]/route.ts:48-53）zod `.strict()` 仅支持 review-selection / targetNovelId / {modelId, thinkingEffort} 三种载荷；全部 `conversation.update*` 调用点均不写 title。
- 缓存同步机制现成：标题变更后 `queryClient.invalidateQueries({queryKey:["chat-conversations"]})` 即可同时刷新顶栏与侧栏两处（失效先例：`ChatPanel.tsx:1235`、`use-score-report.ts:346`）。普通首条消息路径当前并不失效该 key，顶栏落到「新会话」兜底即因此。
- `/api/*` 传输链：renderer `fetch` → `src/lib/desktop/transport.ts` 拦截 → preload IPC `desktop:request` → 主进程 `desktop/main/index.ts:581` → service worker `desktop/service/dispatcher.ts` 匹配 `routes.generated.ts` 路由表 → Next 风格 handler。scope=`conversation` 的路由由 dispatcher 按会话定位工作区库并以 `transfers.bind(conversationId, invoke)` 绑定权威上下文（dispatcher.ts:127-133）。
- 新路由登记方式：在 `docs/migration-map.json` `routes` 数组加一行（path 为 `src/app/api/...` 形式、local 指向 `desktop/handlers/...`），运行 `node scripts/generate-routes.mjs` 重新生成 `desktop/service/routes.generated.ts`；`/api/chat/conversations/[id]/title` 自动归入 scope `"conversation"`。

### 大模型调用基础设施（后台任务可复用）

- 统一设施 `src/lib/ai/generate.ts`：`generateText(opts)`（:64）= checkQuota（桌面恒足够，quota.ts:29-34）→ getModelForUser → streamText 收集 → 网络重试 → recordUsage（UsageRecord 记账，action 为自由字符串场景标识），外层 `withLongTask` 占并发名额（limit 2）。
- `opts.resolvedModel?: ResolvedModel` 可注入预先解析的模型，跳过内部解析（generate.ts:74）。
- **无模型弹窗风险与规避**：worker 解析模型走 RPC `model.resolve`（desktop/service/models.ts:36-47）；主进程在失败时按 `modelFailureNotice`（desktop/main/model-guidance.ts:5-12）弹「model-required」对话框——**仅当 `intent` 缺省或为 `"invoke"`**；`intent: "selection"` 失败只抛 `ContentError`（428）不弹窗。后台任务既定静默先例：`listLocalModels`（models.ts:17-28，只读 `model.catalog` 注释明确永不触发 guidance）先查默认模型，再决定是否发起调用。
- 手动构造 ResolvedModel 路径现成：`resolveLocalModel(userId, "text", undefined, "selection")`（id=undefined → 当前角色默认）→ `localModelRecord()`（desktop/service/models.ts:48-56）→ `instantiateModel()`（provider.ts:63-92，含 `bindModelFetch` 授权出口、思考档默认取模型快照 defaultThinking；构造入口先例 provider.ts:52-55 `getModelByIdForUser`）。
- 失败静默降级先例：`src/lib/ai/context-compression.ts:278-283`（会话摘要失败 → console.warn + 保留原文，不阻断主链路）。
- 会话消息读取先例：`desktop/handlers/chat/conversations/[id]/route.ts:36` `prisma.message.findMany({where:{conversationId}, orderBy:{createdAt:"asc"}})`。
- 没有 worker→renderer 的通用推送通道（worker 只能 RPC 到 main）；现有功能均靠 HTTP 响应 + renderer 端 react-query 失效呈现结果。

### 前端触发点

`src/components/chat/use-agent-chat.ts` 的 `send` 内 `finish(status,...)`（:510-518）是回合结束唯一收口：`"succeeded"` / `"waiting_user"` 表示助手产出已完成（等待用户回答也算已有实质对话内容），此时 `conversationId` 已在闭包内就绪。在此以 fire-and-forget 方式发起标题请求不阻塞任何 UI。

## 方案方向（供产品/技术文档决策）

- 目标一：顶栏换用 `NavigationLabel`，一行级改动。
- 目标二：新增 `POST /api/chat/conversations/[id]/title` 端点（scope conversation），handler 幂等（标题仍等于由首条 USER 消息重算的默认标题才生成），模型解析用 `intent:"selection"` + catalog 预检实现无模型静默跳过，`generateText` 总结 → 清洗 → `updateMany` 条件写（CAS 防竞态）；前端在 `finish` 成功路径经「每会话每窗口期一次」守卫发起请求，响应 `changed:true` 时失效 `["chat-conversations"]`。备选（worker 回合钩子 + 新增 desktop:event 推送）需跨三进程新增 RPC 与事件类型，复杂度与测试面更大，且窗口重载后事件同样丢失，不取。
