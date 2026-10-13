# UI 文字禁选实现方案

前置产物：`2026-10-13-text-selection-research.md`。

## 实现

1. 在 `src/app/desktop.css` 增加统一策略：`:root` 变量默认 none，所有元素的标准和 WebKit user-select 使用变量。规则在 Tailwind 层外，覆盖局部 utility；保留 Monaco 自带更具体的编辑规则。
2. 用 `data-text-preview` 精确标记原文根，变量设为 text。覆盖 Markdown HTML、逐块正文、评论 Markdown、用户/助手/思考消息及非 Markdown 内容预览，不把整个业务面板或 `.markdown-body` 当成正文。
3. button、summary、label、select/option、tab/menuitem/checkbox/radio/switch 等 UI 控件及 `data-text-ui` 边界设为 none；文本类型 input/textarea、contenteditable true/plaintext-only、`data-text-input` 输入区设为 text。composer 根即使因无模型/忙碌变 false 仍是输入组件，显式标记；其 contenteditable=false 原子引用保持 none。变量按 DOM 最近边界继承，允许 button 内摘录恢复 text、摘录内操作再次恢复 none。
4. 纯文本差异的增加/移除符号、预览标题、帮助空态和作者时间保留 none；标记真正 part.text，不能扩大例外到整块带说明的容器。
5. 更新 `requirements-traceability.json` 和 `migration-map.json` 新增本次范围记录，保持已有字段和用户修改。

明确优先级：内容/输入标记规则在 UI 边界规则之后，确保同一 composer 根的 `data-text-input` 覆盖自身 false 属性；后代原子 chip 仍建立独立 none 边界。input 仅放行无 type 及 text/search/url/tel/email/password/number/date/datetime-local/month/week/time 等含可编辑文字的类型。混合节点拆分正文 span，SidebarHoverCard 以明确来源属性区分真实简介与静态帮助，空态不标记预览。`.foreshadow-mark[role="link"]` 的选择属性遵循当前变量；Monaco 的原生编辑行为保留，更多具体的 hover/工具 CSS 需审计并确保工具 UI none。

范围实施清单以独立方案审核文档的完整节点表为准，并补入 `chat/SearchPalette.tsx` 消息命中 snippet 与 `content/scene/SceneWorkspace.tsx` 场景简介。若既有 draggable 卡片阻断原文拖选，允许仅在内容节点按下期间让卡片退出拖动模式、松开后恢复，从卡片非正文区域发起的引用拖动仍保持原交互；需真实组件测试证实，无此问题则不改事件逻辑。

## 范围及风险

独立 Windows About HTML 补漏：只在 `desktop/main/index.ts` 的原文档 body 样式增加标准/WebKit user-select:none；该窗口没有输入或预览。新增 `tests/browser/about-text-selection.test.ts` 读取真实模板，先红后绿验证全部文字拖选/双击，并从实际菜单打开 About 验证。不改菜单/版本文案或结构。

不新增服务、依赖、模型或示例内容；不改布局、业务逻辑、原生窗控拖拽、快捷键或持久化。预览节点标记是 Web 真实组件的最小属性修改。

行为红灯补充：真实候选按钮在选取摘录时触发开 Tab，Scene/Characters/Items/Level 卡的 draggable 阻断拖选。因此新增 `installTextPreviewSelection` 并由真实 Providers 挂载：仅正文在可点击/可拖卡片内时隔离其 click/dblclick，正文起点按下期间暂停祖先卡片的 draggable，松开或窗口失焦恢复；不阻止 mousedown 的原生选区默认动作。正文内真正控件和链接保留事件，独立 Markdown 的评论选区处理保持。专项真实组件测试包括取消/恢复与卡片 UI 区域原行为。

主要风险：遗漏非 Markdown 预览、预览中混入 UI、按钮内摘录被父控件禁选、contenteditable 原子引用行为及 Monaco 自定义选区。独立审核必须检查这些边界，并在行为测试和真实 Electron 中验证。

## 顺序与验收

独立方案审核 → 用例文档和独立审核 → 先执行新增测试记录失败 → CSS/组件实现 → 通过专项测试 → 独立代码审核并修复 → 全量单元/集成、浏览器、类型检查、构建和 Windows 实际 Electron 离线验证 → 验证文档/总结。

调研、方案、测试和总结均保存于 `docs/reviews/2026-10-13-text-selection-*`；结果证据保存于 `docs/evidence/text-selection/`。测试只使用隔离合成数据。任何基线失败、未执行平台或安装包检查均据实记录，不能声明通过。
