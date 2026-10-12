# AI 对话首屏 v2 · 灰阶与呼吸

本轮交付顺序：

1. [调研文档](./research.md)
2. [产品设计文档](./product-design.md)
3. [交互式 HTML 设计稿](./index.html)

最新修订：亮灰Logo与更舒展的烟气、四按钮统一底色、单色面性图标、轻量横排入口。参考经过实际浏览的Manus官方公开首页的留白与克制质感，保留玄印自身品牌及底部输入布局；[修订依据](./revision-v2.md)。v1及其证据保存在 `archive-v1/`。

直接用本机浏览器打开 `index.html`，不需要构建或启动服务。顶部可切换宣纸/玄墨、宽屏/分栏/窄栏、短窗与减少动态效果。鼠标悬停 Logo 或四个入口可播放各自离散帧动画；键盘聚焦具有同等效果。四个入口点击展示流程说明；底部可输入草稿，设计稿未配置模型，因此发送禁用。

本稿仅供用户审核 AI 对话首屏。没有消息、示例作品、模型、假回复、模拟成功状态或供应商网络调用。外围审核工具与交互说明不属于产品。正式实施继续复用真实 ChatPanel/composer；本目录不被产品构建引用。

Logo 取自 `public/brand/logo-icon-{paper,ink}.svg`。其他图标为原生 SVG 绘制；本地生成透明 PNG 精灵图。未调用图片/视频模型，也没有使用或保存任何 API Key。

## 可复现检查

- `node design/chat-empty-state/build-assets.mjs`：生成双主题素材并检查 Logo 首帧/炉身不变量。
- `node design/chat-empty-state/verify-preview.mjs`：使用本机 Chrome 与仓库 Playwright 验证 HTML，结果写入 `preview-checks.json`，截图写入 `evidence/`。
- [v2方案/用例/代码审核](./review-v2.md)、[验证用例](./test-cases.md)。

本轮验证结果及未执行边界见 [验证记录](./verification.md)。静态预览：[玄墨](./preview-ink.png) / [宣纸](./preview-paper.png)。

验证结论只覆盖本地 HTML 和素材，不等于 Electron、Windows/macOS 产品业务、持久化或真实模型验收。当前 UI 仍待用户审核，未进入正式产品实施。
