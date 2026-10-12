# 对话框样式 HTML 审核稿

当前批准状态：用户已于 2026-10-12 明确批准第二版并授权继续，覆盖本文件下方历史“待审核”说明；实现与目标相关产品测试另记，设计预览结果不代替产品验收。

实施状态更新：第二版已在五个产品文件实现，独立方案/用例/code review通过，32项相关浏览器测试及Windows两主题24场景/18交互通过，未跑全量测试。最终总结为 `docs/reviews/2026-10-12-dialog-style-verification.md`；本目录继续作为已批准设计的历史产物，不作为产品运行资源。

打开 `index.html`，切换宣纸/玄墨、对话框场景和当前/拟议效果。默认展示设置框的拟议效果；原尺寸图可单独打开检查背景文字清晰度和阴影。

第二版根据用户“稍暗一点，不要暗太多”的反馈，将首版 8% 黑色遮罩调为 10%，增加 2 个百分点；两层局部叠加从 15.36% 调为 19%。继续无背景虚化；宣纸和玄墨轻阴影数值保持不变，保留原有描边、内容底色、布局和尺寸。通用对话框与手工模态对话层全部纳入。菜单、下拉候选、提示、伏笔浮窗与导航展开层不适用。系统原生对话框的绘制边界随稿审核，尚未批准缩小“所有对话框”的范围。

设置、用户编辑、快捷键确认、创作向导及其模板详情和账户菜单图片来自现有编译版 Windows Electron 的真实 React 组件，数据目录单独初始化、无作品、无模型或 Key。拟议图只在独立预览进程临时注入 CSS。规划表单、规划侧边详情及试验场局部配置为明确标记的样式示意，背景使用同一隔离工作台截图。示意并非实际业务数据、实际组件操作或产品验收。

`capture-preview.mjs` 采集实际组件截图及计算样式，`verify-preview.mjs` 检查本地 HTML 图片加载、场景/主题/对照控制、轻遮罩/阴影参数、菜单图像一致及窄视窗。仅检查审核材料；产品代码、TDD、产品测试和全量测试未执行。

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --import tsx design/dialog-style/capture-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/dialog-style/verify-preview.mjs
```

两条命令均使用本地资源，不启动 HTTP 服务；第二条仅启动独立无界面 Chrome，不操作用户浏览器。预览进程关闭，隔离临时目录保留供故障审阅，不接触用户真实数据。

调研文档：`docs/reviews/2026-10-12-dialog-style-research.md`。独立源码审核：`docs/reviews/2026-10-12-dialog-style-scope-review.md`。本轮目前状态为 **HTML 待用户审核**，审核通过后才进入技术方案/用例独立审核、TDD、专项测试与总结。

首版交付前检查：24 张真实组件场景对照截图，CSS 视窗 1440×900、DPR 1.5、PNG 2160×1350，保持相同比例；HTML 的 36 组主题/场景/对照检查全部通过，页面无错误，菜单当前/拟议两主题各自像素一致，560px 页面无横向溢出。第二版重新采集并检查后覆盖当前记录 `preview-observations.json` 和 `html-checks.json`，以其中 revision 为准。网络记录只观察取得 renderer 窗口之后的预览区间，未声明主进程/worker 启动离线验收。这些均是设计产物检查，不是产品测试。

第二版检查已完成：24 条真实截图记录及 36 组 HTML 设计预览检查通过，记录均标注 `revision:v2`、`overlayOpacity:0.10`；拟议遮罩计算为 10%、虚化为 none，菜单当前/拟议图片继续完全一致，页面无错误。本轮只调整审核稿，产品实现与产品测试尚未进行。
