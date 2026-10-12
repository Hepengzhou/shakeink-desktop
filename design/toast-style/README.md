# 顶部消息框 HTML 审核稿

第一版，2026-10-12，用户已明确批准并授权继续。打开 [index.html](index.html) 查看宣纸／玄墨、当前／拟议效果、消息类型及不同内容场景。批准后的bundle与截图保持当时对照，不随产品源码重新打包；页内“待审核”是原稿的历史标记。所有资源位于本仓库，预览无需网络或 HTTP 服务。

前序产物：[调研文档](../../docs/reviews/2026-10-12-toast-style-research.md)、[产品设计文档](../../docs/reviews/2026-10-12-toast-style-product-design.md)。[独立设计审核](../../docs/reviews/2026-10-12-toast-style-design-review.md)不替代用户审核。

## 预览来源

当前效果直接导入 `src/components/ui/sonner.tsx`，两种应用主题由独立 next-themes Provider 提供。拟议组件与 CSS 仅存在 design 目录。通知内容均为本地设计示例；点击操作只更新本页说明并沿用 Sonner 默认关闭，重新显示会生成新 ID，只有加载转成功示例保留同一 ID。背景是位置／透底检查示意，不是产品工作台截图。

设计页没有 desktop IPC、真实资料、模型、Key 或外部资源。主题控件只更改本页状态；Provider 以 forcedTheme 挂载，不调用 setTheme，不写产品设置。所有示例使用 Infinity 便于审核，产品计时契约不受影响。

## 生成与检查

在仓库根目录执行：

```powershell
node design/toast-style/build-preview.mjs
node design/toast-style/verify-preview.mjs
```

第二条仅启动本地无头 Chrome 检查设计产物。2026-10-12 的最终执行结果为 28 条设计检查通过，记录见 [preview-checks.json](preview-checks.json)。范围包括现有透明问题复现、两主题六类通知、图标／文字对比度、按钮 hover／键盘焦点／点击／重播、加载同 ID 更新、三条消息堆叠、601／600／560／320／390px 页宽的居中／最大 420px 宽度／长文本显示、减少动态效果和键盘主题切换。检查期间未发现页面错误、失败请求或 HTTP 请求；五个关联产品源码 SHA256 前后相同。

预览图：[宣纸](preview-paper.png)、[玄墨](preview-ink.png)、[390px 长消息](preview-narrow.png)。本轮检查与图片只属于 HTML 审核材料，不是产品功能、Windows Electron、macOS、安装包或全量测试结果。产品实施和专项产品测试等用户批准 HTML 后再开始。
