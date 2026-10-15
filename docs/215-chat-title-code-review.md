# AI 对话标题改动 独立 code review 报告与修订记录

日期：2026-10-16。审核对象：本次全部代码改动（`git diff`）。审核方式：独立子代理逐项核查正确性/一致性/安全/性能/测试质量/遗漏。

## 审核结论

实现与方案（211）、用例（213）一致，幂等与静默降级设计正确落地。发现 **1 项 P0、1 项 P1、3 项 P2**，P0/P1 已修复并复跑通过。

### 核查要点（审核已逐项取证）

- 默认标题重算与创建语义精确相等（`chat-turn.ts:194/:287` ↔ `conversation-title.ts:13-15`）；定制标题受「前置等值比较 + updateMany CAS」双保险（`conversation-title.ts:69/:89`）。
- requester 守卫语义正确，无未处理 rejection 漏路径（`res.json()` reject 被吸收；then 内异常由外层 catch 兜底，误删守卫可由下轮 `not-default` 自愈）。
- 首回合触发无时序缺口：`conversationId` 闭包在 SSE 流前由响应头赋值（`use-agent-chat.ts:591`），finish 读现值。
- 密钥不出主进程（`model-authorization.ts:123-132` 注入点），错误对象不含 Key。
- 取消链路完整：窗口关闭 → port cancel → service abort → `request.signal` → `generateText` → `streamText` → `localModelFetch`（排队等名额时亦可中止）。
- CT-40 非空洞断言（标题确来自打桩模型链路、用量落账、快照无密钥）；`.nav-label` 选择器在夹具内唯一。

## 发现的问题与处置

| 编号 | 级别 | 问题 | 处置 |
| --- | --- | --- | --- |
| CR-1 | **P0** | 既有浏览器测试 `ai-caption-message-drag.test.ts`（3 例）与 `chat-caption-safe-area.test.ts`（6 例）AST 提取真实头部 JSX 但打包 import 未含 `NavigationLabel`，改动后全部 ReferenceError 失败（实跑 0/3、0/6 确认） | **已修复**：两文件 esbuild stdin 各补一行 `import {NavigationLabel} from './src/components/layout/NavigationLabel'`；复跑 13/13 全绿（含本组新文件 4 例），纳入验收证据 |
| CR-2 | **P1** | `console.warn(..., error)` 会展开 AI SDK `APICallError.requestBodyValues`（含用户消息/助手回复截断原文）入日志，违反「真实数据不进日志」边界 | **已修复**：只记录错误类型名（`conversation-title.ts`，对齐 `context-compression.ts:281` 先例）；CT-34 新增断言锁定 warn 载荷不含提示词/用户内容，复跑通过 |
| CR-3 | P2 | 标题生成与聊天回合共用 LongTask 名额（默认 2），多会话连续收口可能短暂推迟新回合 | 接受：生成量小且可随请求中止；方案 §三错误矩阵已声明该语义 |
| CR-4 | P2 | 服务层自身不校验会话归属（依赖路由层 401/404） | 接受：唯一调用方是路由；集成测试直连服务属既定测试形态（同 `chat-turn.ts` 先例） |
| CR-5 | P2 | 路由层与服务层各查一次会话（findUnique × 2） | 接受：无害冗余，保持两层各自自洽 |

## 流程改进（审核建议，已采纳进验证）

凡改动被 AST 提取式测试消费的组件（ChatPanel 头部一族：`chat-caption-safe-area` / `ai-caption-message-drag` / `pane-window-drag` / `workspace-surfaces` 等），scoped 验证必须包含这些既有文件的回归运行。本次 216 验证已执行（pane-window-drag 为静态断言无头部 span 假设，grep 核实无恙；另两文件实跑复绿）。

## 复审结论

P0/P1 修复落地、测试全绿后，代码可进入验证与总结阶段。
