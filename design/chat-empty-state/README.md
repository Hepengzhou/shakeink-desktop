# AI 对话首屏 v3.4 · 灵感展开

本轮交付顺序：

1. [调研与修订依据](./revision-v3.md)（[原始源码调研](./research.md)）
2. [产品设计文档](./product-design.md)
3. [交互式HTML设计稿](./index.html)

v3更新：更暗且融入主题的Logo、局部上行烟形、四种颜色的单色图标、与输入框等宽的四张创作卡，以及仙侠/历史/科幻三张全幅题材卡。创建作品与新角色同尺寸且较大；图标文案左对齐、右侧插画悬停展开。v1/v2及对应证据分别存于archive-v1/archive-v2。

v3.1修订：四张创作卡右侧插画改为偏暗灰度、50%不透明度，记录见 [v3.1修订](./revision-v3.1.md)。

v3.2覆盖此前的卡片主次尺寸与单次末帧规则：四功能卡统一大小并均有副标题；右图悬停由0展开到中间12帧、移开从当前帧倒放回0，快速移入移出连续换向。方案、用例和独立审核见 [本轮修订记录](./revision-v3.2.md)。

v3.3：小图标改为固定PNG；创建作品打开可操作的创作向导，三个题材自动预选对应定位；新角色/世界观/场景直接填入可编辑提示词。向导使用应用现有分类及401条预置模板，确定后填入输入框，已有草稿先确认替换。详见 [本轮修订与审核](./revision-v3.3.md)。

v3.4：宣纸主题前四卡的右侧动图改为柔和暖灰黄，保持半透明与低亮度。见 [颜色修订与独立审核](./revision-v3.4.md)。

直接用本机浏览器打开index.html，不需要服务。顶部切换宣纸/玄墨、宽度、短窗和减少动态。鼠标悬停Logo或创作卡、键盘聚焦可看动画。点击入口体验向导或模板填入，底部草稿可编辑，无模型时发送禁用。

Logo来自public/brand/logo-icon-{paper,ink}.svg，图标/装饰图为原生SVG；三张主题背景通过内置imagegen独立生成。最终图片与完整提示词见 [生成记录](./image-prompts-v3.md)。未使用或保存用户提供的供应商凭据。

## 检查与边界

- `node design/chat-empty-state/build-assets.mjs`：生成双主题精灵和品牌不变量检查。
- `node design/chat-empty-state/build-wizard-data.mjs`：从真实固定分类/模板源码生成离线向导数据，源文件及SHA记录在wizard-data.js中。
- `node design/chat-empty-state/verify-preview.mjs`：本机隔离Chrome检查，结果preview-checks.json，当前截图evidence-v3/。
- [独立审核](./review-v3.md)、[验证用例](./test-cases-v3.md)、[验证记录](./verification.md)。

仅HTML审核稿，不是正式产品实施；没有假业务数据、真实模型调用、持久化创建或安装包验收。后续仍复用真实ChatPanel/composer。
