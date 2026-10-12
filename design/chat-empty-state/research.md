# AI 对话首屏 · 调研文档

日期：2026-10-12（Asia/Shanghai）｜阶段：设计调研，待用户审核 UI。

**当前v3：** 最新真实烟气、Manus公开卡片观察与新布局研究见 [v3调研与修订](./revision-v3.md)，产品与HTML均以v3为准。以下v1/v2内容仅作来源历史。

**v2更新：** 下文记录首次调研来源。用户最新要求已将彩色卡片改为统一背景与单色面性图标，将朱砂Logo改为亮灰并扩大烟幅。当前设计依据以[Manus参考与v2修订方案](./revision-v2.md)、[产品设计v2](./product-design.md)为准；旧色彩方向仅作为历史调研保留。

## 1. 任务与证据范围

重设计没有消息、没有待处理对话状态的 AI 面板：Logo、标题和创建入口居中，原 AI composer 移到底部。交付顺序为本调研 → 产品设计 → 可交互 HTML。只在 `design/chat-empty-state/` 保存设计资产，不修改正式 React 组件，不更新正式业务验收为通过。

仓库基线：`AGENTS.md`、`docs/implementation-boundaries.md`。本次用户明确授权空态重新排版，覆盖旧边界中该局部的“保留原排版”；对真实 ChatPanel/composer 的复用、29 类面板与桌面其他设计约束继续有效。

## 2. 现有产品

| 观察 | 来源 | 设计影响 |
| --- | --- | --- |
| 当前标题、输入框、作品关联条和四张提示词模板卡一起垂直居中 | `src/components/layout/ChatPanel.tsx:1798`、`:2230` | 拆开欢迎区与 composer；避免发出首条消息时输入框突然移动 |
| 标题会跟随已有作品或待创建作品 | `ChatPanel.tsx:1811` | 无作品采用通用标题，有作品仍使用真实名称；不能加入示例书名 |
| 原卡片点击仅 `setDraft(card.prompt)` | `ChatPanel.tsx:2238` | 新“创建”入口必须进入明确创建流程，不能把填提示词伪装为创建成功 |
| 空态 composer 720px、有消息 960px；引用、问答/选卡占槽、排队和恢复状态均在同一组件 | `ChatPanel.tsx:1820–2153` | 原组件与状态机保留，欢迎内容不能遮住操作中的面板 |
| 独立对话表面 token 和两套暖色主题已有定义 | `src/app/globals.css:132`、`:204`、`:274` | 沿用 paper/ink，避免引入冷白/冷黑、玻璃质感和跨主题硬编码 |
| Logo 是128×128 SVG，烟与香炉在同一真实路径 | `public/brand/logo-icon-paper.svg`、`logo-icon-ink.svg` | 保留源图；只对上部烟形进行可控逐帧位移，香炉底部完全固定 |

上述为代码观察，不是实际业务流程验收。后续实现必须覆盖无消息但存在运行、问答、选卡、恢复等状态的排除条件。

创建行为补充核对：`SidebarTree.tsx:1673` 打开现有 `CreateNovelDialog`；`CreateNovelDialog.tsx:299` 挂起新会话草稿，非空草稿需确认替换，不自动发送。世界观根节点创建见 `SidebarTree.tsx:1435`；角色直接新增默认名“新角色”见 `CharactersPanel.tsx:42`；场景根节点创建见 `content/scene/SceneWorkspace.tsx:45`。待创建书名尚无 `novelId`，不能创建子实体。`DashboardShell.tsx:478` 的 AI 区默认560px、最小420px，设计要以面板宽度响应。

## 3. 外部设计依据

- 空态需要解释下一步并给出可执行入口，而不是堆放说明。这与本次“1 个主动作＋3 个次动作”相符。[Stack Overflow Design System / Empty states](https://stackoverflow.design/system/components/empty-states)
- Fluent 强调动作有目的、保持一致、局限于当前交互对象，并提供关闭动态效果的方式。本设计据此采用静止首帧、悬停局部播放，不让所有图标持续动。[Microsoft Fluent 2 / Motion](https://fluent2.microsoft.design/motion)
- WCAG 对交互触发动画提供可关闭要求；本稿响应系统减少动态效果，并在审核工具中提供相同效果的演示开关。[W3C / Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- 按钮通过主次样式和 hover/active 状态区分功能，禁用状态必须同时约束实际操作。[USWDS / Button](https://designsystem.digital.gov/components/buttons/)

设计判断：这些原则支持以留白、文字层级、温暖主题底色和彩色实心图标建立现代桌面质感；不需要全屏插画、立体玻璃卡片或持续光效。

## 4. 素材与动画方案比较

| 路线 | 优点 | 本任务取舍 |
| --- | --- | --- |
| 现有 SVG＋本地逐帧精灵图 | 品牌一致、透明底、可锁定炉身、不需要远端调用、离线可用 | 本次采用；按钮图标以原生 SVG 绘制，再烘焙离散帧 |
| GPT Image 系列生成位图 | 可探索复杂插画 | 用户允许使用，但本次面性小图标与既有矢量品牌用原生绘制更可控，不调用图片模型 |
| Seedance 2.5 图生视频→抽帧 | 可探索自然烟雾运动 | 官方文档确认提供首帧/首尾帧视频生成；视频生成还需处理形状漂移、背景清理和循环接缝。本稿不调用供应商、不声称素材由其生成 |

火山引擎官方模型列表与入门文档列出 `doubao-seedance-2-5-260628`，使用异步视频任务。这里只记录公开文档能力，未验证账户权限或执行生成。[官方模型列表](https://docs.volcengine.com/docs/ark/model-list?lang=en)、[Seedance 2.5 文档](https://docs.volcengine.com/docs/ark/seedance-2-5?lang=zh)

选择本地帧动画是针对本次品牌保真与扁平化要求的设计决定。用户提供的凭据不使用、不落盘、不转交子代理，不进入任何请求、日志、截图或产物。

## 5. 收敛方向

名称：**一缕灵感**。真实朱砂香炉 Logo 是视觉记忆点，烟缓缓流动；作品入口独占一行，三种创作素材入口同排。输入框在面板底部稳定停靠。宽、窄、短窗与双主题均需实测 HTML；这不能替代将来的 Electron、真实模型或 Windows/macOS 业务验收。

下一份产物：[产品设计文档](./product-design.md)。
