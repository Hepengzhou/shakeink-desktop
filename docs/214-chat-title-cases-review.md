# AI 对话标题测试用例 独立审核报告与修订记录

日期：2026-10-16。审核对象：`docs/213-chat-title-cases.md`（对照 `docs/211-chat-title-plan.md`）。审核方式：独立子代理对照真实代码与既有测试先例逐项验证可行性与覆盖度。

## 审核结论

**修订后通过**。六种测试形态全部有真实先例支撑（`chat-caption-safe-area.test.ts`、`pane-window-drag.test.ts`、`conversation-detail.test.ts`、`local-model-generation.test.ts`、`sidebar-navigation.test.ts`），方案引用行号逐一核对无误。

## 发现的问题与处置

| 编号 | 级别 | 问题 | 处置 |
| --- | --- | --- | --- |
| P1-1 | P1 | CT-04 预期含 `.nav-label` 与 RED 清单「改前即通过」自相矛盾 | **已修订**：CT-04 改为「标题占位 span 存在且文本为空」（不断言 `.nav-label`），护栏型定位成立 |
| P1-2 | P1 | 缺「sanitize 后等于现标题 → not-default 不写库」分支用例 | **已修订**：新增 CT-36b，并注明该路径模型解析已被调、断言勿与 CT-31 混淆 |
| P2-1 | P2 | CT-02 按原写法改前即通过，不在 RED 内 | **已修订**：CT-02 增加「标题节点带 `.nav-label`」断言，改前红、改后绿 |
| P2-2 | P2 | `【参谋】` 段标签在用例先于方案锁死 | **已修订**：211 §2.1 补钉 `【作者】`/`【参谋】` 字面约定 |
| P2-3 | P2 | requester 用例缺异步 flush 约定 | **已修订**：211 §2.3 令 `request` 返回内部 promise（fire-and-forget 语义不变）；CT-20~22 步骤注明 await 后断言 |
| P2-4 | P2 | vm sandbox 未列 globals，CT-34 的 `console.warn` 会抛 ReferenceError 逸出 | **已修订**：213 形态 §3 注入 `{ exports, require, Error, console }` |
| P2-5 | P2 | 路由用例 mock 清单漏 `next/server` | **已修订**：213 形态 §4 补 `{ NextResponse: { json: Response.json } }` |
| P2-6 | P2 | CT-03 未写明 ResizeObserver 异步等待，直接断言会 flaky | **已修订**：CT-03 步骤补 `waitForFunction` 等待后再断言 |
| P2-7 | P2 | CT-10 未钉死 `slice(0,50)` 的 UTF-16 码元语义 | **已修订**：CT-10 补 emoji 代理对 50 码元边界输入，并注明硬编码输入→输出对、不 import 私有代码 |
| P2-8 | P2 | 「历史归档工作区会话」无用例无豁免说明 | **已修订**：213 RED/GREEN 段补豁免说明（dispatcher 既有规则承载，无新代码） |
| — | P2 | CT-51 静态断法未指明 | **已修订**：写明 AST 断法（CallExpression → 祖先 finish → enclosing if 条件字符串字面量集合 === {succeeded, waiting_user}）+ import 断言 |

## 审核后状态

`docs/213-chat-title-cases.md` 与 `docs/211-chat-title-plan.md` 已按上表完成全部修订，RED/GREEN 清单与用例断言一致，可进入 TDD 实现阶段。
