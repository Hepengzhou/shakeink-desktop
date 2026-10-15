# AI 对话标题：渐变淡出与大模型短标题 技术方案

日期：2026-10-16。依据调研 `docs/209-chat-title-research.md`、产品 `docs/210-chat-title-product.md`。

## 方案总览

| 目标 | 方案 | 改动面 |
| --- | --- | --- |
| G1 顶栏渐变淡出 | 顶栏标题 `<span truncate>` 换用侧栏同款 `NavigationLabel` 组件 | `ChatPanel.tsx` 1 处 + import |
| G2 大模型短标题 | 新增幂等端点 `POST /api/chat/conversations/[id]/title`；前端在回合成功收口处 fire-and-forget 触发；响应 changed 时失效 `["chat-conversations"]` | 新服务模块 + 新 handler + 路由登记 + `use-agent-chat.ts` 1 处 |

备选「worker 回合钩子 + 新增 desktop:event 推送」不取：需跨 worker/main/renderer 三进程新增 RPC 方法与事件类型，复杂度和测试面更大，而窗口重载后推送同样丢失；端点方案完全落在既有 fetch→dispatcher→handler 与 react-query 失效惯例内。

## 一、G1：顶栏标题渐变淡出

`src/components/layout/ChatPanel.tsx`：

1. 顶部 import 区新增 `import { NavigationLabel } from "./NavigationLabel"`。
2. :1715-1717 的 span 替换为：

```tsx
<NavigationLabel className="flex-1 text-[13px] font-medium">
  {messages.length > 0 ? (currentConversation?.title ?? "新会话") : ""}
</NavigationLabel>
```

- `NavigationLabel` 自带 `nav-label min-w-0 overflow-hidden whitespace-nowrap` 类、`title` 完整文字悬停提示、ResizeObserver + 字体加载重测溢出；`.nav-label[data-overflow="true"]` 的 24px 渐变遮罩样式（`src/app/desktop.css:128-129`）原样生效。与侧栏条目同组件同样式类，做到「完全一致」。
- `className="flex-1"` 与侧栏用法一致（`SidebarTree.tsx:332`）；`.nav-label` 自带 `min-width:0` 与 `flex:1 1 auto`，原 span 的 `min-w-0 flex-1` 布局行为保持。
- 空会话时 children 为空串，占位 span 常驻（原注释语义不变，注释同步补一句说明）。
- 不改 `NavigationLabel.tsx`、不改 `desktop.css`、不改头部其余结构（图标、拖拽区、Windows 窗控安全区均不变）。

## 二、G2：大模型后台短标题

### 2.1 新服务模块 `src/lib/services/conversation-title.ts`

纯函数（不依赖 worker/db，可直接单测）：

- `defaultConversationTitle(firstUserMessageContent: string): string` —— 与创建逻辑逐字一致：`stripMentionPayloads(content).slice(0, 50)`（`chat-turn.ts:194` 同款，用户消息原文逐字落库见 :287，故可由首条 USER 消息精确重算默认标题）。
- `CONVERSATION_TITLE_MAX_LENGTH = 30`（硬上限，产品兜底）。
- `sanitizeGeneratedTitle(raw: string): string | null` —— 取首个非空行；去行首 markdown 标记（`#`、`-`、`*`、`>`）；**成对包裹才剥离**引号/书名号（首字符为开符号且末字符为其对应闭符号时去壳，`""''「」『』《》`，可循环剥离；`《活着》读后感` 这类非整体包裹不剥，避免不对称误伤）；去结尾标点（`。！？；…，,;!?~` 等）；Unicode 码点安全地截断到 30；结果为空返回 `null`。
- `TITLE_PROMPT_INPUT_LIMIT = 1200`；`buildTitlePrompt({ userMessage, assistantReply? })` —— 用户消息先 `stripMentionPayloads` 再截断 1200，助手回复截断 1200；段落标签字面约定为 `【作者】` / `【参谋】`（无助手回复时省略【参谋】段）；指令明确要求：一句话概括、中文 ≤15 字（最好 ≤12）、英文等 ≤8 词、不要引号书名号、结尾不要标点、只输出标题。

编排函数（handler 与集成测试共用）：

```ts
export type ConversationTitleResult =
  | { changed: true; title: string }
  | { changed: false; reason: "no-content" | "not-default" | "no-model" | "empty" | "stale" | "failed" }

export async function summarizeConversationTitle(userId: string, conversationId: string, options?: { abortSignal?: AbortSignal }): Promise<ConversationTitleResult>
```

流程（全部在该会话所在工作区库上下文内运行）：

1. `prisma.conversation.findUnique`；不存在或非本人 → 由路由层先行 404（见 2.2），此处信任调用方。
2. 首条 USER 消息 `findFirst(orderBy createdAt asc)`；无 → `{changed:false, reason:"no-content"}`。
3. `expected = defaultConversationTitle(firstUser.content)`；`conversation.title !== expected` → `{changed:false, reason:"not-default"}`（幂等核心：已生成过/已定制的标题永不覆盖）。
4. `listLocalModels(userId, "TEXT")`（只读 catalog，永不触发弹窗）；无默认文本模型 → `{changed:false, reason:"no-model"}` 静默跳过。
5. 生成（try/catch 包裹，任何异常 → `console.warn("[conversation-title] …")` + `{changed:false, reason:"failed"}`，绝不向用户抛出）：
   - `resolveLocalModel(userId, "text", undefined, "selection")` —— `intent:"selection"` 失败只抛 ContentError 不弹「model-required」对话框（`model-guidance.ts:8`）；
   - `instantiateModel(localModelRecord(model))` 构造 `ResolvedModel`，经 `generateText({ userId, action: "conversation.title", resolvedModel, prompt, abortSignal: options?.abortSignal })` 调用（自动获得 LongTask 并发名额、网络重试、UsageRecord 记账；显式 resolvedModel 使 generateText 不再以 invoke intent 二次解析；`abortSignal` 透传请求取消信号，窗口关闭/渲染端中止即中止，不长期独占共享 LongTask 名额——审核 P1-1 修订）；
   - `sanitizeGeneratedTitle(result.text)`；空 → `{changed:false, reason:"empty"}`；与现标题相同 → `{changed:false, reason:"not-default"}`（不写字，避免等于默认标题时下轮无谓重复生成之外的其他副作用）；
   - CAS 写入 `prisma.conversation.updateMany({ where: { id: conversationId, title: expected }, data: { title } })`；`count === 0` → `{changed:false, reason:"stale"}`（并发回合竞态安全），否则 `{changed:true, title}`。

### 2.2 新路由 `desktop/handlers/chat/conversations/[id]/title/route.ts`

```ts
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> })
```

- `auth()` 无会话 → 401；`prisma.conversation.findUnique(select:{id,userId})` 不存在或非本人 → 404（与 `[id]/route.ts` 的 `getOwnedConversation` 同规）。
- 调 `summarizeConversationTitle(session.user.id, id, { abortSignal: _request.signal })`（请求取消即中止生成，不占共享 LongTask 名额），`NextResponse.json(result)` 返回（`{changed, title?}` 或 `{changed:false, reason}`）。服务层已自捕生成异常，路由不再 try/catch。
- dispatcher 链自动获得：会话工作区定位（scope `conversation`）、`transfers.bind` 权威绑定。历史归档工作区会话在 `workspaceFor` 即按既有规则 410/404，不会到达 handler。

路由登记（生成器惯例）：

1. `docs/migration-map.json` `routes` 数组在 `/api/chat/conversations/[id]/sop-plan` 行后插入（沿用文件既有的 2 空格多行排版）：

   ```json
   {
     "path": "src/app/api/chat/conversations/[id]/title/route.ts",
     "methods": ["POST"],
     "disposition": "migrate-handler",
     "reason": "桌面新增：后台大模型总结会话短标题（无上游 Web 对应）",
     "local": "desktop/handlers/chat/conversations/[id]/title/route.ts",
     "testIds": ["CT-30", "CT-31", "CT-32", "CT-33", "CT-34", "CT-35", "CT-36", "CT-36b", "CT-37", "CT-38"],
     "status": "planned"
   }
   ```

   （status 与全表现状一致保持 `"planned"`；testIds 明细见 `docs/213-chat-title-cases.md`。）
2. 运行 `node scripts/generate-routes.mjs` 重新生成 `desktop/service/routes.generated.ts`（自动归入 scope `"conversation"`，无需手改）。

### 2.3 前端触发 `src/components/chat/conversation-title.ts`（新）

```ts
export interface ConversationTitleRequester {
  /** fire-and-forget；返回内部 promise 仅供测试确定性 await，调用方忽略 */
  request(conversationId: string, invalidate: () => void): Promise<void>
}
export function createConversationTitleRequester(fetcher: typeof fetch = fetch): ConversationTitleRequester
export const conversationTitleRequester = createConversationTitleRequester()
```

- 模块内 `Set<string>` 守卫：同一会话每窗口期只发起一次（fire-and-forget，不阻塞任何 UI）。
- 响应处理：`!res.ok` 或 fetch 异常 → 移出守卫（后续回合允许重试）；`changed:true` → 调 `invalidate()`；`changed:false` 且 `reason !== "not-default"`（no-model/failed/empty/stale/no-content 等暂时性原因）→ 移出守卫允许下轮重试；`reason === "not-default"` → 保留守卫（永久态，不再问）。
- 工厂化便于单测注入 mock fetch；`conversationTitleRequester` 单例供生产使用。

### 2.4 触发点接入 `src/components/chat/use-agent-chat.ts`

`send` 内 `finish`（:510-518）回合收口处，`useChatStore.setState(...)` 之后追加：

```ts
if ((status === "succeeded" || status === "waiting_user") && conversationId) {
  conversationTitleRequester.request(conversationId, () => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }))
}
```

- `succeeded` / `waiting_user` 均表示助手已产出实质内容；`failed` / `interrupted` 不触发。
- `finish` 内 `conversationId` 闭包已就绪（新建会话经 `X-Conversation-Id` 头于 :586 写入）。
- 失效 `["chat-conversations"]` 同时刷新 ChatPanel 顶栏与 SidebarTree 两处（共享缓存，调研 §二）。
- 恢复/重试发送（recovery）成功后同样允许触发：标题仍为默认值的历史会话因此获得短标题（产品 G2 第三行场景）。
- 已知盲区（审核 P2-1，接受语义）：连接中断/窗口重载后经 `reconcile`/`reconcilePending` 观察到的回合完成不经 `finish`，该回合不触发标题请求；因守卫未消耗且标题仍为默认值，**下一次成功回合自愈补发**，不另行加钩子。

### 2.5 展示同步

顶栏与侧栏均读 `["chat-conversations"]` 缓存，`invalidate` 后活跃 observer 立即 refetch（staleTime=0，providers.tsx:11）。标题替换对用户的可见效果 = 顶栏与侧栏标题静默变为新短标题；长时由 G1 的渐变淡出承接。不新增 IPC 事件、不新增 zustand 状态。

## 三、错误与边界矩阵

| 情况 | 行为 |
| --- | --- |
| 未配置/未默认文本模型 | catalog 预检跳过；解析兜底用 selection intent，双保险不弹窗 |
| 模型调用失败/超时/网络断开 | catch → warn → `{changed:false, reason:"failed"}`；前端允许下轮重试 |
| 标题生成占用共享 LongTask 名额 | 与正文共用 FIFO 队列（缺省 limit 2）；请求 `abortSignal` 透传，渲染端中止/窗口关闭即释放（审核 P1-1）；额度占用语义接受 |
| 模型输出空/纯标点/多行 | sanitize 取首个非空行清洗；仍空 → `empty` 不写字 |
| 模型输出超长 | 提示词约束为主，30 码点硬截断兜底 |
| 并发回合同时触发 | 前端 Set 守卫 + 服务端 `updateMany` CAS（where 含旧标题），至多一次生效 |
| 标题已是 AI 产物/定制值 | `not-default` 跳过，永不覆盖 |
| 会话被删后请求到达 | dispatcher/handler 404 |
| 历史归档工作区会话 | workspaceFor 既有规则拒绝，不生成 |

## 四、测试策略（仅本次范围，不跑全量）

详见 `docs/213-chat-title-cases.md`。形态：

- 纯函数单测（sanitize/default/prompt/requester）：`tests/unit/conversation-title.test.ts`。
- 编排逻辑 vm mock 单测（conversation-detail.test.ts 先例）：`tests/unit/conversation-title-service.test.ts`。
- 路由契约 vm mock 单测：`tests/unit/conversation-title-route.test.ts`。
- 静态结构断言（pane-window-drag.test.ts 的 AST 先例）：`tests/unit/chat-title-static.test.ts`。
- 真实头部 JSX + 真实 CSS 浏览器断言（chat-caption-safe-area.test.ts / sidebar-navigation.test.ts 先例）：`tests/browser/chat-title-fade.test.ts`。
- 真实 Workspaces + PGlite + ModelGateway 打桩集成（local-model-generation.test.ts 先例）：`tests/integration/local-conversation-title.test.ts`。
- `npm run typecheck`。
- 真机核对（审核 P2-3）：Electron 窗口拖拽区（app-region:drag）内原生 `title` tooltip 是否出现需真机悬停确认；不出现则接受该差异（与现状持平，视觉淡出不受影响）。

## 五、实现顺序（TDD）

1. 登记 migration-map + 生成 routes.generated.ts（新端点空壳前先让静态用例可红）。
2. 写测试文件（红）。
3. 实现 G1（ChatPanel）与 G2（服务/handler/前端触发）。
4. 跑 scoped 用例至全绿 + typecheck。
5. 子代理 code review，修订后复跑 scoped 用例。
