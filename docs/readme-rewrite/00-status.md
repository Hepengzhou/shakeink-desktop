# README 重写进度

更新：2026-10-16。README 整版审核通过后，又按用户精确指令删除底部指定段落，定向复审已通过；全部修改完成，总结已同步。产品业务文件未改。

| 顺序 | 产物 | 实际状态 |
| --- | --- | --- |
| 1 | [调研](01-research.md) | 已完成 |
| 2 | [素材清单](02-material-checklist.md)与[补充修订](09-layout-revision.md) | [14 增量方案审核](reviews/14-layout-plan-review.md)通过 |
| 3 | [素材制作](03-materials.md) | 原八图已通过；新增三栏、叙事线图[16 独立审核通过](reviews/16-three-column-narrative-material-review.md) |
| 4 | [README 大纲](04-outline.md) | 已获用户批准；新增选图直接落实用户指示，仍只在视觉展示引用五图 |
| 5 | [README 正文](../../README.md) | [17](reviews/17-three-column-narrative-readme-review.md)/[18](reviews/18-apple-silicon-platform-readme-review.md)及用户整版审核通过；后续指定删除由 [19 定向审核](reviews/19-footer-removal-review.md)通过 |
| 6 | [最终总结](10-final-summary.md) | 已完成；[首次批准版本总结](08-summary.md)保留为历史 |


原七图为真实 macOS arm64 Electron 整窗，全部独立看图通过，保留真实三按钮。原始数据读回、构建和类型检查结果见素材记录；不扩大为全量业务、模型供应商、Windows 或最终安装包验收。

用户要求截图只在视觉展示、数量 1–5 张。本版精选五图，功能一览和七项亮点均为纯文字。正文审核反馈进一步明确：文案不用示例小说专有词，原截图内容可保留；增加 1–2 张含 AI 聊天内容的图片。

此前真实聊天素材阶段按授权发送两条 UI 用户消息，第二条获得完整有效回复；本轮三栏和叙事线截图复用该回复，零新增请求。没有继续调用模型，没有改写回复或图片像素，不读取、输出或改写凭据。来源见 [07 聊天素材记录](07-chat-materials.md)。原七图阶段“未调用模型”的说明只适用于当时，不能代表新图。

前版 [09 内容审核](reviews/09-readme-content-review.md)和 [10 排版审核](reviews/10-readme-visual-review.md)仅作历史记录，不自动覆盖本次修改。当前 hash、实际检查和审核门见 [05 正文验证记录](05-readme-verification.md)。实际 GitHub/浏览器/手机交互未验证。

用户于 2026-10-16 对修订版明确回复「通过，完成总结」。批准对应正文 SHA-256 为 `f346f2367b6e9fbb2311a4f8c1df1f421a96768f8120f472cd6a992b5cf0dd2c`，该历史批准不覆盖后来按用户指示修改的当前版本。

整版批准 hash：`caf15d93946c05e3b1cfed6142db9b08b3317d50d118ab712450a8fb2445a824`。用户对该版回复「通过，完成总结」，之后的精确删除见下段。macOS 仅 Apple Silicon（M 系列），不支持 Intel；这是用户明确的支持范围，不能把旧文档的 Intel 待验收项作为当前支持承诺。

之后用户精确要求删除底部 Web 基线说明，已仅删除该段和前置空行。当前 hash 为 `11d5ab014ca46c32e57194f9a68a39e86bc7e6b4ebac741c45454d87edb1b58f`，通过 19 定向审核；这记录用户指定修订，不冒称新 hash 再次获得整版批准。
