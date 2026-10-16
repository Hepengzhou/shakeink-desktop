# README 宣传重写调研

日期：2026-10-15。范围：根目录 `README.md` 及其专用展示素材；不改产品业务、默认数据、既有设计与正式验收台账。

## 目标与交付门

让第一次接触项目的小说作者在首屏看懂「玄印是什么、为什么值得试」，再通过真实应用截图理解创作体验，最后找到可执行的运行方式。

严格顺序：本调研 → 素材准备清单及独立子代理审核 → 素材制作及独立子代理审核 → README 大纲及独立子代理审核、用户审核 → README 正文及独立子代理审核、用户审核 → 总结。大纲未经用户批准不撰写或替换根 README；正文未经用户批准不宣告最终完成。审核意见、修订和结论分别留档。

## 读者与表达

- 主要读者：需要组织长篇设定、角色、剧情和正文的中文小说作者，以及希望自主选择 AI 模型的创作者。
- 次要读者：寻找可扩展、本地运行的开源写作工具的开发者。
- 核心定位：**面向长篇小说的本地 AI 创作工作台**。
- 推荐 slogan：**让灵感成章，让故事生长。** 短句负责记忆；简介说明本地、小说与 AI 的实际含义。
- 叙述顺序固定为用户要求的八部分：Logo + 项目名 → slogan → 简介 → 功能列表 → 核心亮点 → macOS / Windows → 安装运行 → License。
- 亮点介绍占正文主要篇幅；每项采用「作者面临的事 → 产品如何帮助 → 一张对应真实截图」，约 70–130 个中文字。功能列表只做索引，不重复长篇说明。
- 首屏使用既有 Logo、短 slogan、定位、少量导航和一张有内容的应用总览。保持中文、留白和统一图片宽度，不堆技术栈徽章、测试数字或营销口号。

## 真实能力与可宣传边界

以下是源码中的能力入口，不等于全量业务或供应商已经验收。

| 宣传主题 | 读者价值 | 本地依据 | 写作边界 |
| --- | --- | --- | --- |
| 小说创作工作区 | 在同一窗口查资料、看章节、写正文 | `src/components/content/registry.tsx`、`src/components/layout/DashboardShell.tsx` | 使用真实 React 工作台，不用设计预览冒充 |
| 人物与世界设定 | 保存人物身份、心理、弧线，以及世界、场景、物品等资料 | `src/components/content/CharacterPanel.tsx`、`WorldPanel.tsx` 及注册表 | 照实际字段介绍，不称自动解决所有一致性问题 |
| 世界线与叙事规划 | 分开组织故事发生顺序、讲述顺序与卷章结构 | `src/components/content/planning/PlanningWorkspace.tsx` | 规划截图需要合法、可渲染的数据结构 |
| 伏笔与触点 | 记录埋设、提及、回收，关联到章节 | `src/components/content/ForeshadowPanel.tsx` | 不称系统保证没有遗漏 |
| 正文编辑与稿件掌控 | Markdown 编辑、预览、分屏、保存、版本和候选稿 | `src/components/content/ChapterContentPanel.tsx`、`src/components/editor/MarkdownEditor.tsx`、注册表 | 不称永不丢稿；不恢复已撤销的备份宣传 |
| 自选模型的 AI 辅助 | 使用作者配置的文本与图像模型，辅助构思、评审与写作 | `package.json`、`desktop/core/settings.ts`、`docs/implementation-boundaries.md` | AI 需要作者配置接口和密钥；不宣传免费额度、内置赠送模型或完全离线 AI |
| 本地工作区 | 无需部署网站或外部数据库，作品位于作者选择的本地目录 | `README.md`、`desktop/service/workspaces.ts`、`electron-builder.config.cjs` | 调用远程 AI 时相关请求会发往所配置服务；不称所有数据永不联网 |
| 主题与桌面体验 | 宣纸/墨色、原生窗控、快捷键和多面板 | `desktop/core/settings.ts`、`docs/implementation-boundaries.md` | macOS 原生截图不能作为 Windows 验收证据 |
| 导出 | TXT、Markdown、DOCX、PDF | `src/lib/manuscript-export.ts`、`src/lib/manuscript-export-docx.ts`、`src/lib/manuscript-export-pdf.ts` | 以格式能力介绍，不伪造本次导出验证结果 |

## 平台、发行和运行事实

- 项目名：玄印写作 / ShakeInk；仓库：`mySingleLive/shakeink-desktop`；默认分支 `master`。
- `package.json` 当前版本 `0.1.0-alpha`，许可证 `GPL-3.0-only`，Node 范围 `>=24 <25`；`.nvmrc` 为 24。
- 运行入口来自实际 scripts：`npm ci` → `npm run build` → `npm start`；`build` 依次执行生成 Prisma、构建 UI、构建 Electron。安装依赖和构建需要网络，已有构建的本地工作台与模型请求需分别说明。**本次 macOS 实测补充**：已提交的命令目录保存了 CRLF 源文件哈希，LF 检出会在桌面构建阶段报 `Stale installed command catalog`；需要先安装 Playwright Chromium 并执行 `npm run generate:commands`，再构建。正式运行说明须包含这一已发现的首次构建步骤或明确的排障，不假设原三步已完整通过。
- 打包命令：`npm run package:dir`、`npm run package`；输出 `release/`。`electron-builder.config.cjs` 配置 macOS DMG/ZIP 和 Windows NSIS。
- macOS arm64 曾有开发检查记录，不能将旧文档当作当前安装包发布；macOS x64 和 Windows 的原生验收不齐，需在平台表中如实标注。
- 2026-10-15 查阅 [本仓库 Releases](https://github.com/mySingleLive/shakeink-desktop/releases)，页面显示暂无 Release。因此 README 不设置「立即下载」或虚构最新安装包链接，主要引导源码运行和本机构建。
- 保留一句简短 Alpha 状态说明及开发记录链接，避免把工程台账搬到宣传首页；不得删除或篡改原有验收记录来支撑宣传。
- License 直接链接根 `LICENSE`，第三方资源链接 `THIRD_PARTY_NOTICES.md`，不改许可证文本。

## 视觉调研与结论

查看 [novelWriter 官方网站](https://novelwriter.io/) 的简明定位、平台入口和安装事实分层，以及 [AppFlowy 官方网站](https://appflowy.com/) 的标题、产品画面和逐项价值说明。这里只借鉴信息层级，不引用其宣传文案、截图、数据或平台承诺。

本项目适合「克制的中文书房」风格：现有墨色 Logo、宣纸工作台作主视觉，少量墨色截图形成节奏。GitHub README 使用可移植的 Markdown 与有限 HTML（居中、`picture`、图片宽度、`details`），不依赖自定义 CSS、外链字体、JS 或第三方图片 CDN。截图以整窗为主，不排多列小图，保证读者放大后能读到内容。

### 原创展示作品

1. **《照夜渡》· 仙侠**：渡口抄灯人陆照微、巡河剑修沈砚、负责灯籍的裴慎。沿江城镇靠魂灯辨认归舟，旧灯籍中一盏不该存在的灯牵出渡口旧案。围绕「守住一个人的名字」展开，不设无代价万能能力。
2. **《汴河来信》· 历史穿越**：修复古籍的青年陈知远来到北宋汴京，从脚店账簿与运河货单进入市井。现代知识受材料、制度、信用和资金限制；赵青禾经营纸铺、许仲平为河务书吏。主线从一封误投的家书和一笔被改写的运费开始。史实与原创情节分开，截图不作历史考证宣称。

原创虚构内容真实落入隔离作品库，人物、地点、章节与伏笔相互照应；不使用原设计稿测试文案，不复制网络小说，不触碰作者已有作品。准备展示用数据是本次素材制作，不成为软件首次启动的默认内容。

### 拍摄要求

- 当前源码构建的真实 macOS Electron 应用；必须拍到系统的红黄绿按钮，不能后期绘制或粘贴。
- 独立临时数据根与作品目录，无真实 Key、账户、私有路径、系统通知、报错、警告、调试工具或加载骨架。
- 统一窗口尺寸与字体，完整窗口四边；图片保留原生比例，只有无损格式处理或一致缩放可用，不修改产品界面、不擦除提示。
- 使用用户动作收起无关面板；不能通过 DOM/CSS 注入隐藏错误或制造不存在的功能。
- 暂不调用模型，不把预写对话、评分或候选稿冒充真实 AI 生成。若某项 AI 流程没有真实可公开展示的结果，改拍配置入口或可用的业务界面并准确说明。
- 每图登记路径、主题、作品、操作入口、采集方式、尺寸、SHA-256 和人工视觉检查结果。审核子代理必须实际看图。

## 当前环境与后续验证

开始时 Git 工作区干净；仓库没有 `node_modules`、`dist` 和 `release`。系统默认 Node 20，不符合引擎要求；已找到桌面运行时随附 Node 24.19.0，后续以 Node 24 安装与构建。

当前会话未暴露 CodeGraph 工具；本次以明确文件路径、清单和源码阅读建立事实依据。未声称调用 CodeGraph 或建立索引。素材拍摄以实际启动结果为准，构建或权限问题如实记录，不能用设计稿替代。

待执行：清单独立审核 → 安装/构建 → 隔离数据制作 → 原生截图与图像检查 → 素材审核 → 依据已通过的素材编排大纲并提交用户。

## 后续排版决策

用户在大纲审核时明确要求：仅在视觉展示放 1–5 张截图，功能一览不插图。修订大纲已选定五张集中展示，七项亮点也改为纯文字；本文早先“逐项配图”的调研建议不再采用，最终以 [修订大纲](04-outline.md)及[布局复审](reviews/08-outline-layout-rereview.md)为准。七张素材制作与审核仍完整保留。
