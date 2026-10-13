# 左导航 HTML 设计稿检查

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计检查，正式实现和产品测试未开始。

## 结果

离线 HTML 检查 21 组通过，浏览器运行错误 0，HTTP 请求 0。覆盖双主题、200/260/420px、500/640/900px 高度、普通与长名称、场景/不可用作品/账户名称、创建入口、徽标与操作固定占位、账户菜单键盘导航、情景试验场列表与操作返回焦点、空/加载/错误及重试，以及 480px 审核视口。

几何实测：创建行高 44/44px、间距 6px；图标 NotebookPen/MessageCircle，18px、1.7px 线宽；底栏 72px、按钮 52px、头像 32px。普通名称不遮罩，溢出名称使用 24px 遮罩；扩栏后原溢出名称解除遮罩。短窗里树区独立滚动，创建和账户区域坐标保持。

运行使用本机已安装 Chrome，无监听 HTTP 服务；所有数据为合成 fixture，所有外网请求拦截。6 个涉及生产源文件在检查前后 SHA-256 一致；未改生产组件。

首次运行完成 10 组后，焦点断言在原型 rAF 恢复焦点之前执行而失败；检查脚本改为等待实际焦点后断言。完整重跑 21 组通过，不将第一次失败报告为通过。此调整没有删除焦点用例或改变预期。

## 可复查产物

- [完整原始报告](preview-checks.json)
- [检查脚本](verify-preview.mjs)
- [独立方案及 HTML 审核](plan-review.md)
- [玄墨](preview-ink.png)、[宣纸](preview-paper.png)
- [长名称玄墨](preview-long-ink.png)、[长名称宣纸](preview-long-paper.png)
- [短窗窄栏](preview-short-narrow.png)、[账户菜单](preview-account.png)
- [试验场管理](preview-scenario-library.png)、[小审核视口](preview-small-viewer.png)

主代理已目视玄墨/宣纸、长名称、短窗窄栏、试验场弹窗和小视口截图，未见重叠、横向溢出或被标题遮罩的固定图标/徽标。测试脚本末尾的小视口截图使用之后的合成增删改状态，初始两条合成记录见试验场管理截图。

## 命令

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

打包命令仅生成原型 preview.bundle.js；检查脚本只写本目录截图和报告。独立方案和 HTML 审核结论为可交用户审核，初审两项焦点/返回说明已修正，无未解决 P0/P1/P2。独立审核另验证 18 个主题/宽度/高度组合与短视口列表内部滚动；具体命令结果和焦点边界见 plan-review.md。此结论不替用户批准 UI。

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。HTML 通过不能代表最终“通过所有测试”。
