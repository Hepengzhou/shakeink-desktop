# AI 对话首屏 · 一缕灵感

本轮交付顺序：

1. [调研文档](./research.md)
2. [产品设计文档](./product-design.md)
3. [交互式 HTML 设计稿](./index.html)

直接用本机浏览器打开 `index.html`，不需要构建或启动服务。顶部可切换宣纸/玄墨、宽屏/分栏/窄栏、短窗与减少动态效果。鼠标悬停 Logo 或四个入口可播放各自离散帧动画；键盘聚焦具有同等效果。四个入口点击展示流程说明；底部可输入草稿，设计稿未配置模型，因此发送禁用。

本稿仅供用户审核 AI 对话首屏。没有消息、示例作品、模型、假回复、模拟成功状态或供应商网络调用。外围审核工具与交互说明不属于产品。正式实施继续复用真实 ChatPanel/composer；本目录不被产品构建引用。

Logo 取自 `public/brand/logo-icon-{paper,ink}.svg`。其他图标为原生 SVG 绘制；本地生成透明 PNG 精灵图。未调用图片/视频模型，也没有使用或保存任何 API Key。

## 可复现检查

- `node design/chat-empty-state/build-assets.mjs`：生成双主题素材并检查 Logo 首帧/炉身不变量。
- `node design/chat-empty-state/verify-preview.mjs`：使用本机 Chrome 与仓库 Playwright 验证 HTML，结果写入 `preview-checks.json`，截图写入 `evidence/`。
- [方案审核](./plan-review.md)、[用例与审核](./test-cases.md)、[用例审核结论](./test-review.md)、[代码审核](./code-review.md)。

最终运行：12组已执行断言通过、0失败；真实 `document.hidden` 触发子项未执行，真实失焦复位已验证。详细边界见 [验证记录](./verification.md)。静态预览：[玄墨](./preview-ink.png) / [宣纸](./preview-paper.png)。

验证结论只覆盖本地 HTML 和素材，不等于 Electron、Windows/macOS 产品业务、持久化或真实模型验收。当前 UI 仍待用户审核，未进入正式产品实施。
