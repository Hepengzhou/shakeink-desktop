# 顶部消息框样式调研

日期：2026-10-12。顶部消息框应使用随宣纸和玄墨主题切换的不透明表面，通过不同颜色与形状的图标表达消息类型。当前透明背景与单色图标的共同原因是应用主题名称与 Sonner 的主题契约不一致。

## 当前实现与根因

`src/app/providers.tsx:23` 挂载唯一全局 `<Toaster richColors position="top-center" />`。`src/components/ui/sonner.tsx:8–12` 从 next-themes 获取 `paper` 或 `ink`，仅通过 TypeScript 类型断言把值传给 Sonner；断言不会转换运行时字符串。该组件已配置成功圆形勾、提示圆形 i、警告三角、错误八角叉、加载旋转图标，但未设置各类型专用图标颜色。

本地安装版本为 Sonner 2.0.8（`node_modules/sonner/package.json`）；其 `dist/index.d.ts` 限定主题为 `light | dark | system`。`dist/index.mjs` 的 Toaster 按原值生成 `data-sonner-theme`，不会识别或转换 `paper/ink`。`dist/styles.css:467–523` 只为 light/dark 定义 `--info-bg/text/border` 等类型变量；`:548–577` 的 richColors 规则使用这些变量覆盖普通背景与文字。传入 paper/ink 后类型变量缺失，相关 CSS 声明在计算阶段失效，背景回到透明，文字与图标继承上级颜色。普通 `--normal-bg` 仍有值，无法补救已被覆盖的声明。

用户截图中的“已保留 1 项待核对草稿／查看草稿”来自 `src/components/desktop/DesktopApp.tsx:99` 的真实 `toast.info`，不是需要新建的业务流程。按钮点击会打开既有草稿恢复界面，本次只改变外观。

`src/app/globals.css:126–265` 定义两种主题：宣纸浮层 `#fcf8ee`、正文 `#2b251b`，玄墨浮层 `#171312`、正文 `#ece7e1`；现有卡片圆角令牌为 12px。`:302–327` 有全屏纸纹覆盖层，层级 1999/2000；Sonner 自带容器层级高于它们。原消息的透明表面会透出底层纹理，不能通过修改全局纸纹解决。本次应修复组件主题映射，并在消息自身设置明确的实色背景。

## 外部依据

Sonner 的[官方样式源码](https://github.com/emilkowalski/sonner/blob/main/src/styles.css)以 light/dark 主题定义类型颜色，支持通过样式变量与作用域选择器定制。实施仍以仓库锁定的本地 2.0.8 文件为准，保留现有通知库、队列、计时和操作机制。

W3C [颜色使用说明](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)要求信息不只靠颜色区分，因此保留不同图标形状与真实消息文案。[文字对比度说明](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)给出普通文字最低 4.5:1；[非文字对比度说明](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)为承载信息的图形给出 3:1。本设计以这两个阈值检查正文／按钮及图标。[状态消息说明](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)支持无需抢夺焦点的程序化状态通知，本次保留 Sonner 已有 live region 和键盘机制。

## 设计方向

采用统一中性实色卡片，类型色集中在左侧图标与浅色圆角图标底座。正文保持主题主文字色，长错误信息可读；按钮采用中性描边与实色表面。宣纸用暖白、细暖棕边和浅阴影；玄墨用略提亮的暖黑表面、可见细边与现有浮层级阴影。提示蓝、成功绿、警告琥珀、错误红；加载为灰蓝旋转图标，无类型的一般通知使用中性文字。

消息继续位于顶部居中，放到 44 DIP 标题区下方并留 16px 间距。卡片最大宽度 420px，宽窗口左右各留至少 16px；窄窗口文字自然换行，操作按钮允许换到下一行。设计稿展示对应类型、按钮、长文本、加载转成功和多消息堆叠。

## 本次流程与边界

按用户本次顺序交付调研、产品设计和 HTML 审核稿；用户批准 HTML 后才修改产品与执行产品测试。后续技术方案、测试用例和代码均进行独立子代理审核。仅运行顶部消息框直接相关检查，禁止 `npm test` 和全量回归；此条覆盖 AGENTS.md 的全量测试默认要求。

设计预览使用本地 React/Sonner/Lucide，当前效果直接导入仓库现有 Toaster，拟议 Toaster 仅放在 design 目录。预览环境只有示例消息和局部 DOM 交互，无 desktop IPC、真实资料、模型或 Key。示例不进入产品，设计检查不抵作产品验收。最终实现复用现有全局通知组件和所有业务调用，不修改 Web 上游、工作台、模态框、菜单或保存／恢复流程。

## 设计材料验证

实际执行 `node design/toast-style/build-preview.mjs` 和 `node design/toast-style/verify-preview.mjs`，最终 28 条本地 HTML 设计检查通过。现有真实组件在宣纸主题的提示消息计算背景为 `rgba(0, 0, 0, 0)`，图标为普通正文色，支持上述根因；拟议两主题背景 alpha 为 1，各类图标颜色不同。检查覆盖长文、按钮、键盘、主题切换、加载更新、堆叠及窄页布局，详见 [设计检查记录](../../design/toast-style/preview-checks.json) 与 [预览说明](../../design/toast-style/README.md)。

主代理已查看两主题和 390px 页宽截图，确认拟议卡片遮住底层横线，图标颜色与形状清楚，长文完整显示。设计检查期间产品源码哈希未改变；产品实现、产品测试、真实平台验收和全量测试均未执行。当前状态仍为 HTML 待用户审核。
