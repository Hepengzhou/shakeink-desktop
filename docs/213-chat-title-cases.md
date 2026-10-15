# AI 对话标题：渐变淡出与大模型短标题 测试用例

日期：2026-10-16。依据方案 `docs/211-chat-title-plan.md`（审核 212 通过并修订）。**仅覆盖本次目标，不跑全量**。用例编号 CT-xx（Chat Title）。

## 测试形态

1. **浏览器断言**（真实头部 JSX + 真实 CSS）：新增 `tests/browser/chat-title-fade.test.ts`，沿用 `chat-caption-safe-area.test.ts` 先例——AST 提取 `ChatPanel.tsx` 真实 `desktop-drag h-11` 头部 JSX，postcss 编译真实 `globals.css` + 拼接 `desktop.css`，playwright-core 无头 Chromium（`SHAKEINK_TEST_CHROMIUM` 可覆盖 executablePath）。夹具变量 `messages`/`currentConversation`/`desktopBootstrap`/`sidebarHidden`/`contentHidden` 注入，新增 `import { NavigationLabel }`。
2. **纯函数单测**：`tests/unit/conversation-title.test.ts`（node:test，直接 import 服务模块纯函数与 requester 工厂）。
3. **编排逻辑 vm mock 单测**：`tests/unit/conversation-title-service.test.ts`，沿用 `conversation-detail.test.ts` 的 `ts.transpileModule + runInNewContext` 模块打桩先例（mock `@/lib/db`、`@desktop/service/models`、`@/lib/ai/provider`、`@/lib/ai/generate`；`@/lib/mention-token` 零依赖纯函数用真实实现）。vm sandbox globals 至少注入 `{ exports, require, Error, console }`（CT-34 的 `console.warn` 路径必需，缺 `console` 会在 catch 内抛 ReferenceError 逸出）。
4. **路由契约 vm mock 单测**：`tests/unit/conversation-title-route.test.ts`（mock `@/lib/auth`、`@/lib/db`、`@/lib/services/conversation-title`、`next/server`——按 `conversation-detail.test.ts:15` 先例 `{ NextResponse: { json: Response.json } }`）。
5. **静态结构断言**：`tests/unit/chat-title-static.test.ts`，沿用 `pane-window-drag.test.ts` 的 `ts.createSourceFile` AST 先例。
6. **集成测试**：`tests/integration/local-conversation-title.test.ts`，沿用 `local-model-generation.test.ts` 先例——真实 `Workspaces`（PGlite + 真实 migrations）、真实 `ModelRepository`/`ModelService`/`ModelGateway`，gateway fetch 打桩返回 SSE 分帧；`configureModelTransport` 增补 `model.catalog` 接线。

## 用例

### A. 顶栏渐变淡出（浏览器，真实 JSX+CSS）

| 编号 | 场景 | 步骤 | 预期 |
| --- | --- | --- | --- |
| CT-01 | 长标题渐变淡出 | 视口宽 360，`messages=[1条]`，`currentConversation.title=40字长标题` | 标题节点带 `.nav-label` 且 `data-overflow="true"`；computed `text-overflow:clip`、`white-space:nowrap`；`mask-image` 为含 `24px` 的 `linear-gradient`；`title` 属性等于完整标题 |
| CT-02 | 短标题不遮罩 | 视口宽 760，标题「短标题」 | 标题节点带 `.nav-label`；无 `data-overflow` 属性；computed `mask-image` 为 `none` |
| CT-03 | 宽度变化实时重测 | 760 渲染不溢出 → `setViewportSize` 收窄到 360 → 再放宽；每次变化后 `waitForFunction` 等待 `data-overflow` 出现/消失再断言（ResizeObserver 回调异步） | 收窄后 `data-overflow="true"`；放宽后恢复无遮罩（ResizeObserver 生效） |
| CT-04 | 空态占位护栏 | `messages=[]` | 头部 h-11 仍在；标题占位 span 存在且文本为空；无 MessageSquare 图标（既有行为不回归） |

护栏：每个用例结束断言无 pageerror/控制台 error（既有 browser 测试惯例）。

### B. 纯函数（unit，conversation-title.test.ts）

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| CT-10 | `defaultConversationTitle` 与创建语义一致 | 硬编码输入→输出对：`@[组/名](标识)` 负载剥离为 `@[组/名]`；60 字输入截为前 50 字；含 emoji 的 50 码元边界输入按 UTF-16 码元截断（代理对可劈开，钉死与 `chat-turn.ts:194` 逐字一致的语义；不 import 其私有代码，非循环论证） |
| CT-11 | `sanitizeGeneratedTitle` | 成对包裹去壳（`"标题"`、`《标题》`、循环 `""标题""`）；非整体包裹不误伤（`《活着》读后感` 原样保留）；多行取首个非空行；去行首 markdown 标记；去结尾标点；>30 码点截断且代理对不碎；空串/纯标点/纯引号 → `null` |
| CT-12 | `buildTitlePrompt` | 含「不超过15个汉字（最好不超过12个）」「不超过8个单词」「只输出标题」指令；用户消息剥离 mention 负载并截断 1200；有助手回复时含 `【参谋】` 段且截断 1200（段标签字面约定见 211 §2.1）；无助手回复时省略 `【参谋】` 段 |
| CT-20 | requester 守卫与生效 | 同会话连续两次 `request` 只发一次 fetch；`changed:true` 响应 → `invalidate` 被调一次且守卫保留（第三次仍不发）；每条断言前 `await` `request` 返回的内部 promise 排空异步链 |
| CT-21 | requester 重试语义 | fetch reject / `res.ok=false` → 守卫移除（下次重发）；`changed:false, reason:"not-default"` → 守卫保留不重发；`reason:"no-model"` → 守卫移除；均 await 返回 promise 后断言 |
| CT-22 | requester 不变更不刷新 | `changed:false` 时 `invalidate` 不被调用（await 返回 promise 后断言） |

### C. 编排服务（unit vm mock，conversation-title-service.test.ts）

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| CT-30 | 无 USER 消息 | `{changed:false, reason:"no-content"}`；不调模型 |
| CT-31 | 标题 ≠ 默认重算值（已定制/已生成） | `{changed:false, reason:"not-default"}`；`listLocalModels`/`generateText` 均不被调，永不覆盖 |
| CT-32 | 无默认文本模型 | `{changed:false, reason:"no-model"}`；`listLocalModels` 被调、`resolveLocalModel`/`generateText` 未被调（无弹窗源头） |
| CT-33 | 成功链路 | `resolveLocalModel` 以 `("local-author","text",undefined,"selection")` 调用；`generateText` 收到注入的 `resolvedModel`、`action:"conversation.title"`、透传的 `abortSignal`；`updateMany` where 为 `{id, title: 默认标题}`（CAS）；返回 `{changed:true, title}` |
| CT-34 | 生成抛错 | `{changed:false, reason:"failed"}`；不向调用方抛出；不写库 |
| CT-35 | CAS 竞态（count=0） | `{changed:false, reason:"stale"}` |
| CT-36 | 脏输出 | 引号/多行/超长输出经 sanitize 后写入清洗值；空输出 → `{changed:false, reason:"empty"}` 不写字 |
| CT-36b | 清洗后等于现标题 | `generateText` 返回值 sanitize 后恰等于现标题 → `{changed:false, reason:"not-default"}`、`updateMany` 不被调（此路径 `listLocalModels`/`resolveLocalModel` 已被调，断言勿与 CT-31 混淆） |

### D. 路由契约（unit vm mock，conversation-title-route.test.ts）

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| CT-37 | 未登录 / 会话不存在 / 非本人 | 401 / 404 / 404 |
| CT-38 | 正常调用 | 以 `(userId, id, {abortSignal: request.signal})` 调 `summarizeConversationTitle`；200 透传服务结果 JSON |

### E. 静态结构（unit，chat-title-static.test.ts）

| 编号 | 断言 |
| --- | --- |
| CT-50 | ChatPanel.tsx 头部标题节点为 `<NavigationLabel>`（className 含 `flex-1`、`text-[13px]`、`font-medium`，不含 `truncate`）；文件 import NavigationLabel；空态占位与 `messages.length > 0` 条件保留 |
| CT-51 | use-agent-chat.ts 中 `conversationTitleRequester.request` 调用点的 AST 断言：`ts.createSourceFile` 定位该 CallExpression → 祖先为名为 `finish` 的箭头函数 → 最近 enclosing IfStatement 条件的字符串字面量集合恰为 `{succeeded, waiting_user}` 且引用 `status`；失效键字面量含 `["chat-conversations"]`；文件 import `conversationTitleRequester` |
| CT-52 | `desktop/service/routes.generated.ts` 含 `{ scope: "conversation", path: "/api/chat/conversations/[id]/title", methods: ["POST"] }`；`desktop/handlers/chat/conversations/[id]/title/route.ts` 存在；`docs/migration-map.json` 含对应行 |

### F. 集成（真实 Workspaces + PGlite + ModelGateway 打桩）

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| CT-40 | 端到端生成 | 预置默认标题会话 + 首 USER/ASSISTANT 消息；gateway 打桩 SSE 返回「深海沉船之谜」→ `changed:true`；DB 标题更新；`UsageRecord.action="conversation.title"` 落账；gateway 请求 URL/授权头正确；库中无 API Key 泄露 |
| CT-41 | 无默认模型 | `changed:false, reason:"no-model"`；gateway 0 调用；标题保持原值 |
| CT-42 | 标题已定制 | `changed:false, reason:"not-default"`；gateway 0 调用 |

### G. 真机核对（非自动化，记入验证文档）

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| CT-60 | Electron 真机窗口顶栏长标题悬停 | tooltip 出现则记录；不出现（app-region:drag 原生限制）则接受为与现状持平，视觉淡出不受影响 |

## RED/GREEN 要求

- RED：未实现时，CT-01/02/03（无 `.nav-label`/`data-overflow`）、CT-10~CT-12（模块不存在）、CT-20~CT-22（requester 不存在）、CT-30~CT-38（服务/路由不存在）、CT-50~CT-52（结构未改）、CT-40~CT-42（服务不存在）必须失败；CT-04 改前即通过（护栏型，断言不含 `.nav-label`，改后仍须通过）。
- GREEN：实现后上述全部通过；`npm run typecheck` 通过。
- 豁免说明：方案 §三「历史归档工作区会话」一行由 dispatcher 既有规则（`dispatcher.ts:44-48`）承载，本次无新代码，不单设用例。
- **禁止全量**：只运行下列命令，不跑 `npm test` 全量：
  - `node --import tsx --test tests/unit/conversation-title.test.ts tests/unit/conversation-title-service.test.ts tests/unit/conversation-title-route.test.ts tests/unit/chat-title-static.test.ts`
  - `node --import tsx --test tests/integration/local-conversation-title.test.ts`
  - `node --import tsx --test --test-concurrency=1 tests/browser/chat-title-fade.test.ts`
  - `npm run typecheck`
