# 文本右键菜单测试用例独立审核

审核日期：2026-10-13（Asia/Shanghai）。审核对象：`2026-10-13-text-context-menu-test-cases.md` 的 TCM01–TCM15、最新正式实施方案、原 composer/mention/scene/消息渲染源码。仅新增本审核文件，未改生产实现或其他人的文件。

结论：**十五组用例独立审核通过，可进入 TDD 编写失败回归与实现。** 以下精确断言是 TCM11 及相关组的执行补充，必须随用例落实；本结论不把宽泛分组名称、旧 HTML 二十一项或方案描述当作生产测试已通过。用户已批准本次 HTML，无须再次批准。

## 覆盖核对

| 分组 | 核对结果 |
| --- | --- |
| TCM01–TCM03 | 固定 schema、requestId/result/cancel 对应、未知文本/Key/命令拒绝、来源决定历史组、editor 专属入口、当前平台/自定义/移除/多绑定提示、分隔线、原生 pending 生命周期、跨窗口/frame、迟到取消和缩放边缘均已列出。原生模板单元测试仍不能代替看见并选择 native popup。 |
| TCM04–TCM05 | 用户消息/AI 回复部分、双击、三击和父边界回归，跨来源/空交集/反向选择，Markdown/正文/表格/代码/链接/评论/卡片，精确复制/可见换行及排除 UI 的区域全选分别覆盖。要对链接内已有选择的右键实际执行，不只测试普通 p。 |
| TCM06–TCM09 | 控制 React 状态与真实历史、普通/特殊 input 全类型、generic contenteditable/plaintext-only、只读/可选 disabled、Dialog/Portal、password/API Key 和旧协议兼容已分开。TCM07 明确不把整个 value 当部分选择，并要求 Electron 再验证，符合 capability 研究的范围。 |
| TCM10–TCM11 | 无模型准备、原组件展开/聚焦/末尾新行、旧草稿/chip payload 保留、不发送/不建会话/无供应商、一次原生撤销/重做、源是 composer、复制序列与引用可见标签区分、重建/重开及旧引用行 chip 兼容均已列出。新增引用转义需要采用下文的具体源文本断言。 |
| TCM12–TCM13 | IME、recovery/creating/request/newConversation/loading/error、source/目标 ABA、卸载/模型换绑/DOM 属性/同值输入/选择/窗口/重新菜单/dispose、menu 和 clipboard 分别延迟与报错、执行副作用前复核和资源释放都有要求。需区分内部 selection 规范化不取消新请求与真实 selection A→B→A 必须取消。 |
| TCM14–TCM15 | Monaco 多光标及次要范围、真实模型 undo/redo/paste/delete/自动保存、find/ViewZone、scrollbar/装饰、明确专属入口及互斥，Windows 原生操作与真实 clipboard/离线包、键盘/主题/Dialog/zoom、macOS/物理 IME 分别验收均覆盖。Web 默认 Monaco 行为也必须作为 TCM14 保留案例。 |

执行阶段为每个组建立明确的测试 ID、实际命令和场景证据；一组覆盖多个来源时逐类执行，不能凭一个文件名或一次冒烟标记整组通过。全量基线失败与新失败须分别记录，未执行或已有失败仍不能宣称“所有测试通过”。

## 新引用兼容决策复核

最新正式方案已经撤销“全局引用行不水合/修改全局实体解析器”的设计，改为只转义**本次新增 quote** 的 `@[` 起始符为 `@\[`，随后逐行添加 `> ` 并以原生纯文本插入。这个范围更窄，与旧 chip 保留约束一致：

- `src/lib/mention-token.ts:4` 的 MENTION_TOKEN_RE 匹配连续 `@[`，不会匹配 `@\[`；`src/lib/scene-context.ts` 的 sceneIdentities 同样匹配连续 `@[`。新增引用中的转义源文本不被这两条既有识别路径当成稳定实体身份。
- `composer-editor.ts:382-389` 的原有水合不修改，旧草稿 `> @[角色/名](id)` 仍按既有规则恢复真正 chip；普通行中的原 chip 及 copy/cut/paste 身份序列也保持。旧草稿不能被 formatter 扫描或重写。
- append 的新文字必须走纯文本原生插入，不能再次交给 insertDraftAtCaret 的水合路径。原有 chip DOM 与 store 的单向同步、原生 undo/redo 仍由真实 ChatPanel 验证，不能通过直接赋值整框来伪造。

本节的最新窄决策覆盖正式方案初审记录里针对全局引用行规则的旧描述；不需更改全局 entity-refs/mention/scene parser 来满足本次新 quote。

## TCM11 精确与可见格式断言

必须分别断言“格式化草稿/落盘原文”与“Markdown 可见文字”，不能把有必要 Markdown 转义的源字符串与原选择做无条件 byte-for-byte 比较。具体期望：

```text
源选中文字：@[场景/名称](scene:其他作品:标识)
新增草稿行：> @\[场景/名称](scene:其他作品:标识)
旧真实 chip 行：> @[角色/名](id)   （原序列及身份保持）
```

引用前后的源原文、原草稿和原 chip 序列必须相等；只对新 quote 做必要转义。普通文字的所有选中空格、空行、Unicode 与渲染后的段落换行保留，CRLF 归一为 LF 的规则明确；不得用 trim 整个 quote 掩盖损失。补充多个 token、已有 `@\[`、连续引用、自身引用、反斜杠邻近起始符及空行案例，确保既有内容不二次转义，且取消没有追加。

`ChatPanel.tsx:231-233` 的真实 UserMessage 使用 escapeHtml 后 linkifyHtml，并不先跑 Markdown。因而自己的新发送消息和 composer 会显示该必要反斜杠源格式；用例需对此明确期望，不能假定自己的消息会自动隐藏 Markdown 转义。`MarkdownPreview`/`renderMarkdown` 的可见文本会反转义，普通预览文本应仍显示原 `@[场景/名称](...)`。

独立本地 marked 命令实测：输入 `> @\[场景/名称](scene:other:id)` 得到 `<blockquote><p>@[场景/名称](scene:other:id)</p></blockquote>`。因此不能把“新增草稿和自己消息的转义源文本不生 chip”扩大成“任何之后的 Markdown 后处理都永不实体化”：`entity-refs.ts:304-318` 会在已经渲染的 HTML 文本中再次扫描连续 `@[`，AssistantBlock 则先 renderMarkdownBlocks 再 linkifyHtml，这是原有 AI 回复展示行为。当前窄决策验证新 quote 的实际持久化/发送准备/自己的 UserMessage 链，以及普通 MarkdownPreview 的可见文本；不宣称修改模型之后自主回复中的旧实体展示语义。若将来扩大该目标，需另行明确来源 provenance 合同与对应真实渲染链测试。

在 TCM11 真正渲染原组件时断言：新 quote 不增加 composer chip 数、自己的 UserMessage 不因新 escaped token 增加显式 entity chip、raw sceneIdentities 不增加跨作品稳定身份；旧 quote 行 chip 的 label、payload 和恢复后身份正确。场景按名字匹配仍是既有检索行为，不能把“无稳定身份迁移”误写成“普通文字绝不匹配任何实体名”。

## TDD 与验收门

先保存能在原代码上失败的生产菜单入口/用户消息父边界/引用与生命周期回归，再做最小实现。单位测试、真实 React 浏览器测试、隔离 Electron 原生操作各自记录，审阅者不因本用例通过而确认实现或实际系统能力。原生加速器只展示标签/不重复注册执行、实际 popup 焦点和内部 Selection 恢复必须用对应测试落实。

实现后独立 code review、专项与全量 unit/integration/browser、typecheck/build、逐类 Windows 原生菜单/系统 clipboard、离线包启动按顺序完成。缺 macOS/物理 IME 时保留待验收，不把 Chrome 或平台样式切换当真实通过。敏感字段与用户数据不进入证据；合成 API Key 行为也不以明文打印占位 Key 证明操作。

本审核仅核对文档与既有源码，并执行一个本地合成 Markdown 解析检查；没有写生产实现、没有调用真实供应商或重跑产品测试。十五组用例可进入 TDD。
