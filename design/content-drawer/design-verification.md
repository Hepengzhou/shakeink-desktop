# 右侧内容抽屉 HTML 设计核验

日期：2026-10-13（Asia/Shanghai）。结论：离线 HTML 设计核验通过，可交用户审核。正式修复、产品回归和目标系统验收将在 HTML 批准后执行。

## 结果

以 Node 24.19.0 执行 `node design/content-drawer/verify-preview.mjs`，退出码 0。最终结果记录于 [preview-checks.json](preview-checks.json)：16 段收放动作、514 个动画采样帧。帧数取决于实际浏览器调度，验收基于逐帧几何断言。

双主题 × 正文/表单 × 两个请求宽度 × 收起/展开的全部动作中，固定内层宽度不变，文字行数、行框和表单/标题/按钮/输入控件的相对几何保持不变，右位移满足 W−V，变换没有缩放。尺寸比较容差为 0.05px，覆盖浏览器亚像素量化。

额外检查通过：快速多次换向保留合成草稿和滚动；慢速换向保持相对布局；50% 定格保持 500px 完整宽度、250px 可见占位且不可交互；全屏态收起锁定开始时完整宽度；700px 窗口使用698px完整覆盖抽屉；动作中跨900px断点保持宽度和模式，完成后校正；减少动态效果立即落终态。

浏览器没有页面错误或 HTTP 请求。正式 Shell、布局 hook、ContentTabs 和 desktop.css 的核验前后 SHA-256 相同。独立审核另验证 900px 终态合法投影，详见 [plan-review.md](plan-review.md)。

## 可查看的画面

- [玄墨展开](preview-ink.png)
- [宣纸展开](preview-paper.png)
- [宣纸50%中间帧](preview-mid-paper.png)
- [宣纸表单](preview-form-paper.png)
- [700px窄窗口](preview-narrow.png)

已目视核对展开、中间帧和表单画面。中间帧正文向右离开，被工作区边界裁切，保留原来的每一行；审核工具和规格说明位于工作区外。

## 执行范围

此结果对应合成离线 HTML。原生窗控、实际 ContentTabs 业务生命周期、Monaco、业务 Portal、全屏中途命令替换、29 类面板和安装包离线启动属于正式阶段，不能以本次媒介结果计为产品通过。问题基线的真实 Shell 隔离复现见 [research.md](research.md) 和 [baseline.json](baseline.json)。
