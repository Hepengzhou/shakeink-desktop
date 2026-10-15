# AI 对话标题技术方案 独立审核报告与修订记录

日期：2026-10-16。审核对象：`docs/211-chat-title-plan.md`（依据 `docs/209-chat-title-research.md`、`docs/210-chat-title-product.md`）。审核方式：独立子代理逐条核对代码事实（a–h 八项断言），全部给出文件:行号证据。

## 审核结论

**通过（无 P0）**。方案中的代码事实断言经逐条核查全部属实：

- NavigationLabel / `.nav-label` 行为与方案描述逐字一致（`NavigationLabel.tsx:24`、`desktop.css:128-129`）；Tailwind v4 下 `desktop.css` 非分层样式恒胜于 `@layer utilities`，`.nav-label` 的 `flex:1 1 auto` 覆盖 `flex-1` 的 `1 1 0%`，且 `SidebarTree.tsx:332` 已有同组合生产用法，顶栏布局无冲突风险。
- 默认标题可由首条 USER 消息精确重算：`chat-turn.ts:194`（创建）与 `:287`（消息逐字落库同一 `input.message`）共享同一来源串；stagedBatches 前缀同样进入两者，不破坏不变量；全库唯一建会话入口即 :194。
- `intent:"selection"` 抑制弹窗属实（`model-guidance.ts:8`、`main/index.ts:198-201`）；`listLocalModels` 只读 catalog 不触发 guidance（`models.ts:17-29`）；`generateText` 传 `resolvedModel` 完全跳过内部解析（`generate.ts:74`）。
- 普通 handler 内运行 generateText 安全：请求级数据库上下文与双重 retainTask 具备（`service/index.ts:77-78`、`workspaces.ts:380-396`）；无 chat execution 时写围栏直透（`chat-execution.ts:122/153`），CAS updateMany 与 recordUsage 不受阻。
- finish 触发点时序成立（`:586` 头写入先于 `:664/:680` finish）；recovery 路径会触发；`queryClient` 闭包可用。
- dispatcher/生成器惯例属实（`generate-routes.mjs:12` scope 推导、`dispatcher.ts:126-133` bind、`routes.generated.ts:1` 生成物勿手改）。
- react-query 失效同步属实（`providers.tsx:11` staleTime 缺省 0，三处活跃 observer 共享缓存）。

## 发现的问题与处置

| 编号 | 级别 | 问题 | 处置 |
| --- | --- | --- | --- |
| P1-1 | P1 | 标题生成与正文共享 LongTask 名额且原方案不接受取消信号，病态网络下可长期占位 | **已修订**：`summarizeConversationTitle` 增加 `options.abortSignal`，handler 透传 `request.signal` 至 `generateText`；错误矩阵补名额占用语义（211 §2.1/§2.2/§三） |
| P2-1 | P2 | follow/reconcile 路径观察到的回合完成不经 finish，该回合不触发标题请求 | **已修订**：211 §2.4 明示该盲区语义——守卫未消耗、标题仍默认，下一成功回合自愈补发 |
| P2-2 | P2 | migration-map 单行 JSON 排版与文件不符；testIds 引用文档当时不存在 | **已修订**：211 §2.2 改为多行排版示例，status 保持 `"planned"` 与全表一致，cases 文档随即落地 |
| P2-3 | P2 | 窗口拖拽区内原生 title tooltip 无法静态确证 | **已修订**：211 §四测试策略补真机悬停核对项；不出现则接受与现状持平 |
| P2-4 | P2 | sanitize 两端字符级剥离会误伤《活着》读后感类标题（不对称） | **已修订**：211 §2.1 改为「成对包裹才剥离」规则，用例 CT-11 覆盖 |
| P2-5 | P2 | 调研文档 `localModelRecord` 行号误标为 provider.ts:48-55 | **已修订**：209 更正为 `desktop/service/models.ts:48-56` |
| P2-6 | P2 | 默认模型被禁用时归因为 "failed" 而非 "no-model"；用量页新增 conversation.title 条目；首条消息查询无 id 次序兜底 | 接受：行为正确（不弹窗、可下轮重试）；用量记账为方案明示预期；查询与既有 `[id]/route.ts:36` 同规 |

## 审核后状态

`docs/211-chat-title-plan.md` 已按上表完成全部 P1/P2 修订，可进入测试用例编写阶段（`docs/213-chat-title-cases.md`）。
