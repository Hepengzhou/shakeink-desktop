# README 正文与验证记录

更新：2026-10-16。根 [README.md](../../README.md) 的三栏、叙事线及 Apple 芯片范围整版已获用户批准；之后按用户精确指令仅删除底部指定段落，当前定向修订通过独立审核。

## 当前正文

Logo、项目名与「让灵感成章，让故事生长」后，依次为简介、视觉展示、纯文字功能一览、七项纯文字亮点、macOS（Apple Silicon）/ Windows、源码运行和 License。只在视觉展示嵌入五张截图：三栏工作台、人物心理、世界线、叙事线、伏笔。已按用户明确指示删除视觉展示开头的拍摄/数据说明段，来源留在过程文档。全部文案、图注和替代文本使用通用功能说明，不出现示例小说的作品、人物、地点或设定词；原图内演示内容按用户确认保留。

首图聊天是用户授权后通过已配置模型取得的实际回复，作品正文仍为预先准备的原创演示文本。首图只证明通用写作讨论与正文同屏，不声称模型引用、分析或生成了右侧章节。其余三张引用未改像素。两张新图均复用既有回复，本轮零新模型请求；两条演示会话只整理标题，所有原消息字段 hash 前后一致。

整版批准 SHA-256：`caf15d93946c05e3b1cfed6142db9b08b3317d50d118ab712450a8fb2445a824`。后续用户指定删除后的当前 SHA-256 为 `11d5ab014ca46c32e57194f9a68a39e86bc7e6b4ebac741c45454d87edb1b58f`。

[19 定向复审](reviews/19-footer-removal-review.md)独立核对全文，确认精确等于批准版仅删除用户指定段落和前置空行。License 版权行、许可/第三方声明链接、五图、七项亮点和 Apple 芯片范围均未变，`git diff --check` 通过。本次依据用户精确删除指令，不冒称新 hash 经过再次整版批准。

## 修订版实际检查

主代理使用 Node 24、marked AST、Sharp 元数据及完整 SHA-256 对当前文件执行只读检查，命令退出 0：

| 检查 | 实际结果与范围 |
| --- | --- |
| 截图数量与位置 | 恰好 5 张，全部属于「视觉展示」，首图为 `ai-workspace-three-column-paper.png`，叙事线为 `narrative-ink.png`，每张链接自身原图 |
| 功能与亮点 | 功能一览纯文字，核心亮点恰好 7 项，无重复插图 |
| 文案 | 21 项已知作品/人物/地点/设定词扫描零命中，并通读检查通用表达 |
| 本地文件与入口 | 12 个文件/资源目标均存在，3 个页内入口对应实际标题 |
| 图片文件 | 五图完整 SHA-256、字节数、尺寸均与 manifest 相同，全部 2880 × 1778；三栏新图 7,452,569 字节、叙事线新图 2,604,978 字节 |
| HTML | 标签平衡；无 script、style 或 iframe，Logo 的 picture 深色资源与 details 结构保留 |
| 脚本和差异 | `node --check scripts/readme/capture-native.mjs`、`git diff --check` 通过；已跟踪变更只有 README |
| macOS 支持范围 | 按用户明确要求仅支持 Apple 芯片（M 系列）；删除 Intel 待验收表行，明确不支持 Intel，构建说明限定 Apple 芯片 Mac |

新两图已通过 [16 独立素材审核](reviews/16-three-column-narrative-material-review.md)，均与系统原图逐字节相同；原八图保留 06/12 审核记录。标题准备脚本通过 [15 静态审核](reviews/15-chat-title-preparation-review.md)，并实际退出 0、消息 hash 前后相同。[17 三栏版复审](reviews/17-three-column-narrative-readme-review.md)通过后，用户新增 Apple 芯片支持政策；当前 hash 又通过 [18 平台范围增量复审](reviews/18-apple-silicon-platform-readme-review.md)，无阻断或 P2。五图和七项亮点逐字未变，manifest 保留十图通过。支持政策与 arm64 实际运行、完整业务待验收的范围分开，不声称打包脚本已技术阻止 Intel。旧批准不自动覆盖当前正文。

本次是文档和素材修订，没有重复产品全量测试。素材阶段构建、生成器读回和类型检查见 [03-materials.md](03-materials.md)，不等于业务全量、供应商、Windows 或最终安装包验收。公开 Release 状态已在本日由主代理与前版内容审核者独立读取官方仓库，仍无公开 Release；本次没有新增下载或版本承诺。

## 前版记录及视觉方法局限

此前用户批准 hash `f346f2367b6e9fbb2311a4f8c1df1f421a96768f8120f472cd6a992b5cf0dd2c`，对应 12/13 审核。用户后续提出本轮三项修改，因此该批准不自动覆盖当前 hash。

前版 hash：`dc31550e3349e02cc598f4d452fd8c418c6eef6e328fd99560c4b6de25bc5fd8`。前版已通过 [09 内容审核](reviews/09-readme-content-review.md)与 [10 排版审核](reviews/10-readme-visual-review.md)，用户未批准，并提出本次修改。

前版曾用 ReportLab 对真实 Markdown AST 进行纯离线文档排版，再由 Poppler 输出六个桌面浅色/深色与 390px 窄版检查区域。它们只辅助判断当时图片比例、中文可读性、段落及表格密度，不能证明当前修订版已渲染，也不是 GitHub 或真实手机验证。相邻 HTML、字体、换行和折叠内容均可能与 GitHub 不同，未把该辅助预览作为 README 新图片。

Chrome provider 不可用，应用内浏览器拒绝本地 file URL 并要求不得绕过，ComputerUse 不允许控制 Codex 应用。没有通过其他浏览器、HTTP 服务、Playwright 或外部自动化绕过。内置打开请求仅返回 queued，不能作为已看过实际渲染的证据。当前验证范围为 Markdown/HTML 源码结构、链接目标、真实图片与独立审核；真实 GitHub/浏览器/手机交互仍未验证。

## 当前审核门

素材及整版正文审核均通过，用户对 `caf15d939…` 明确回复「通过，完成总结」。后续精确删除按用户新指令完成，并通过 19 定向审核；[最终总结](10-final-summary.md)已同步。真实 GitHub/浏览器/手机交互未验证的范围保持不变。
