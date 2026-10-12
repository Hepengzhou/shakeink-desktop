# AI 对话首屏 · 独立方案审核

> 历史记录：本文件对应v1。当前v2审核见 review-v2.md。

日期：2026-10-12（Asia/Shanghai）  
审核范围：`research.md`、`product-design.md`；核对当前真实 React 源码和品牌 SVG。  
审核方式：独立只读核对；仅写本审核记录，未改正式产品、调研或设计文档。

## 结论

**通过（仅设计原型方案阶段）。** 方案的局部范围、双主题、底部 composer、中央主次动作、使用真实 Logo 的离散帧动画均可行。初审两项动作/状态文案已经修正并复核；没有阻止后续 HTML 原型的方案问题。这里不要求业务实现，也不表示已批准正式产品实施。

## 初审修订项（均已关闭）

### P2-01：纯净空态排除条件必须包含创建作品中及全部待发队列

- 文档位置：`product-design.md:9`。当前列出“生成/运行、暂停队列”等抽象条件，但没有明确排除 `creatingNovel`，且只排除暂停队列。欢迎入口一旦显示在首次建书请求或非暂停待发队列期间，就不是本稿 `research.md:7` 所称的“没有待处理对话状态”。
- 源码依据：`src/components/layout/ChatPanel.tsx:926` 读取 `creatingNovel`；`:930` 明确将其纳入编辑/发送门控；`:1231` 在建书请求前设置该状态；`:1691` 有专门建书提示。`:1269–1277` 的生成期间发送会加入队列，`:1825–1832` 单独维护暂停提示与 `QueueRows`。不能用“暂停队列”代表所有待发队列。
- 修订要求：在纯净空态判定中明确加入“没有创建作品请求进行中、没有任何待发队列项”。待创建书名/普通编辑草稿本身可以保留在空消息页，不能误把 `pendingNovelTitle` 当成已落库作品。后续验证用例分别覆盖 `creatingNovel=true`、待发队列存在但未暂停、恢复中；本轮 HTML 可用明确标注的审核状态说明这些边界，无须实现后台状态机。
- 复核：当前 `product-design.md:9` 已明确排除 `creatingNovel` 和任何待发队列；`:55` 明确待创建作品不算有效实体归属。已关闭。正式状态守卫测试留待 UI 审核后的产品实施阶段。

### P2-02：“新场景”不能被写成现有流程必须额外确认所属位置

- 文档位置：`product-design.md:51` 的“还需确认场景所属位置”。该表将此描述为“现有场景新增流程”，但当前创建根场景没有必经的所属位置选择，只有显式从某场景创建子场景时才带父级。
- 源码依据：`src/components/content/scene/SceneWorkspace.tsx:45` 的 `startCreate(parentId)`；`:51` 提交 `{name,parentId}`；`:62` 的“创建根场景”调用 `startCreate(null)`；`:69` 对根场景只要求名称，对子场景展示已知上级。
- 修订要求：改为“所选作品内默认创建根场景；只有从现有场景上下文新增时继承/选择父场景，沿用现有名称对话框”。如果确需在中央入口新增位置选择，必须明确列为本次待审新增行为，不能称作现有流程。当前小范围首屏设计建议直接采用根场景入口。
- 复核：当前 `product-design.md:51` 改为“默认根节点”，`:55` 明确名称对话框与 `parentId:null`。已关闭。

## 非阻断澄清与后续核验要求

1. 当前 `product-design.md:57` 已明确图片/附件与会话引用“即将支持”。源码 `src/components/layout/ChatPanel.tsx:2024–2030`、`:2079–2081` 与此一致。HTML 的交互说明须据实执行，不显示上传完成、已附加文件或假引用。
2. `product-design.md:48` 复用创建作品向导是正确方向。真实向导是单页模板选择，不是 SidebarTree 旧注释里的两步向导：`src/components/layout/CreateNovelDialog.tsx:4–9`、`:299–317`。确认只挂起草稿/书名，第一次发送才建书，且已有草稿需确认替换。HTML 不得把示意弹窗表现为已创建作品。
3. 副入口的关联作品应与 composer 的已解析关联一致，尤其保留草稿显式选择；不能只看活动 Tab。源码优先级见 `src/components/layout/ChatPanel.tsx:950–956`，已加载空会话的新建书守卫见 `:2192–2195`。`product-design.md:53` 防止旧 conversationId 错绑的方向正确。
4. 单一 Logo 路径可通过生成阶段局部采样位移烘焙精灵，运行时仅换离散帧，技术上可行。源 `public/brand/logo-icon-paper.svg`、`logo-icon-ink.svg` 均为 128×128、一个 path、无现成动画。必须验证首帧与源图同轮廓、香炉区域逐像素不变、各帧透明边缘不裁切、最后一帧回第一帧没有突跳；不能仅以“生成了 64 帧”代替视觉核验。
5. `product-design.md:61`、`:71` 的 hover/focus 与减少动态兼容方案可行。运行时应以“hover 或 focus-visible 任一仍成立”为播放条件，避免鼠标移出后误停仍有键盘焦点的图标。页面隐藏、减少动态启用时应停止计时任务并复位，不是只隐藏动画。
6. `file://` 本地预览路线可行；`preview.js` 避免依赖被浏览器本地文件策略阻止的 fetch/import，HTML/CSS/传统脚本与 PNG 可直接相对路径加载。烘焙脚本可在生成阶段读取仓库真实品牌文件，但最终 HTML 所需资产必须全部在本目录，且不引用父项目运行服务。
7. `product-design.md:29` 的 320px/短窗目标应实测：三次入口不截字，composer 工具栏能收缩，中央滚动区确有 `min-height:0`，动态不引发布局变化。当前 ChatPanel 最小常规宽度 420px，见 `src/components/layout/DashboardShell.tsx:45`、`:492`；320px 是本稿的额外窄栏设计目标，不能当作正式组件已有验证结果。

## 证据与阶段边界

- 已核对 `AGENTS.md`、`docs/implementation-boundaries.md`；当前仅设计目录文档与之后的 HTML 审核稿，不应更新正式业务台账为通过。
- 已重新读取官方 [Seedance 2.5 文档](https://docs.volcengine.com/docs/ark/seedance-2-5?lang=zh)，其能力表支持调研中关于 Model ID、首帧/首尾帧与视频任务的公开能力描述；未调用模型、未验证账户权限、未接触凭据。
- W3C [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) 对应 WCAG 2.3.3（AAA），本稿的减少动态方案符合该方向；本次没有进行完整 WCAG 合规审核。
- 本记录为方案审核，不是 HTML 实现审查、实际 Electron 验收、真实业务成功或用户 UI 批准。
