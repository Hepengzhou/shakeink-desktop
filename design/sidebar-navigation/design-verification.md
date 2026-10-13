# 左导航 HTML 设计稿检查 v8

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计媒介验证，保留审核前检查结果。

后续状态：用户已批准v8「UI 设计审核通过，可以继续」，真实React实现已经开展。本文末尾未批准/未实施状态属于历史设计检查时点；当前结果以 [正式验证记录](../../docs/reviews/2026-10-13-sidebar-navigation-verification.md) 为准，HTML检查不计产品测试。

## 当前结果

完整离线HTML脚本最终53组通过，0浏览器错误、0HTTP请求。复用此前47组创建/账户/渐隐/五分类/六入口/身份配色/键盘/空错态/抽屉检查，新增应用品牌与四分类作品fold、隐藏焦点排除、每视图/嵌套状态、正文菜单与空错态、不可用作品、滚动自然夹限和主动接管。历史v7产物在archive-v7/，不计本轮。

品牌采用现有public/brand/seal-mark-{paper,ink}.svg，真实加载、仅当前主题图可见。实测Logo30×30px、图文gap10px；玄印写作标题17px/24px、600、本地衬线fallback、1.02px字距。品牌行44px、上4px/下8pxmargin，与第一创建按钮边缘16px；Logo与创建图标左边缘一致，原caption仍44px。品牌不增加Tab焦点；标题完整无换行/横溢出。创建行仍32px、间距4px、14/20px；底栏72px/按钮52px/头像32px。品牌、创建、账户在500px短窗树滚动时固定。

四过滤视图×两作品的8组默认展开；点击/Space/Enter改变aria-expanded，aria-controls绑定实际body，箭头/Folder同步。收起body为hidden+inert，保留body与首个子节点身份，隐藏内容不能聚焦；不触发业务动作，也不重挂载对照内容节点。折叠状态按view独立、作品树状态不变，世界子fold保留。正文菜单在header独立sibling，body收起/正文为空时仍可由Tab进入并添加卷；错误/空态展开后仍正确可见。四视图的不可用作品同样可fold，错误和重试不变成空态；未绑定会话仍可达。

滚动边界以同步DOM点击隔离自动scrollIntoView：展开150→全收起自然夹限0→重新展开恢复150；真实wheel意图到达后接管0，重新展开保持0。原有各view精确位置/世界展开回归仍通过。该同步DOM边界是合成HTML检查，不代表真实系统鼠标验收。

双主题×三栏宽×五分类30组合、长标题/空与错误/小审核视口继续通过。作品石板灰、24种类型tone和10人物四色保持；对比3.735是标准脚本当时采样最小，v7独立作品选中3.591的口径见archive-v7/，本轮未冒充重测所有选中背景。品牌Logo直接使用既有资源颜色。

抽屉本轮17段787帧通过，包含两主题三栏宽的12段、慢速收放、中途换向和多行帮助。新品牌、当前可见主题img、作品分组标题/箭头/图标加入逐帧几何与样式比较；display:none的备选img/收起body不作为可见布局测量，离屏裁切但仍有盒的抽屉内容继续逐帧测量。完整内层宽高、相对坐标/字号/行高/颜色/边色/文字/渐隐不变；最大几何差0.001px（容差0.05px），scale恒1、translateX=V-W，焦点与减少动态效果终态保持。

## 运行记录

首轮28组后，脚本发wheel后未等事件到达就再次展开，最后位置断言超时；修正为等实际wheel事件后两帧再展开。第二轮36组后发现旧待恢复值覆盖主动设置的210px，返回760px；原型captureScroll现在区分自然夹限与主动偏离，切view前先捕获实际意图。第三次完整53组通过，两份失败报告保留，不计通过。

最终逐帧文件的revision初始漏改v7，实际baseline已含v8品牌/分组、787帧；仅将脚本和JSON标签修正为v8，未改变采样数据/断言/界面，不额外重跑。最终报告preview-checks本来已是v8。

执行使用已安装Chrome154.0.8037.98、file URL、合成数据与HTTP拦截，没有监听服务。最终9个生产组件/样式/Seal及品牌SVG在检查窗口前后SHA-256一致，本任务未改生产。v7并行样式变更导致的失败及历史均留在对应归档，不冒充本轮。

## 独立复核与阶段

独立子代理仅新增范围：双主题200×500，Logo/标题/间距/实际SVG/独立caption均通过；四分类两作品Enter/Space、ARIA/focus、每view/完整作品树、world/volume子fold、折叠正文菜单/空错态/四分类不可用与未绑定会话通过。独立scroll298→折叠夹252→展开298，主动wheel接管后展开228，不恢复旧298；0错误/HTTP。最终53组/9hash/787帧、失败/元数据修正记录、文档与截图一致，passed-for-user-ui-review-only，无未解P0/P1/P2；详见plan-review.md。

真实Seal/SidebarTree复用、索引workId与统一锁修复生命周期、数据删除/改名/异步列表后的focus/scroll、caption/zoom/原生命中、29面板/编辑器草稿仍待批准后真实组件测试。原型加载Logo或保持节点不能替代产品/原生验收。

## 可复查产物

- [完整报告](preview-checks.json)、[逐帧数据](drawer-frames.json)、[脚本](verify-preview.mjs)、[独立审核](plan-review.md)
- [首轮时序失败](preview-checks-v8-first-run.json)、[第二轮滚动失败](preview-checks-v8-second-run.json)
- [v8品牌与角色分组](preview-v8-final.png)、[宣纸品牌](preview-paper.png)、[作品](preview-v8-works.png)、[设定](preview-v8-settings.png)
- [正文](preview-category-manuscript.png)、[对话](preview-category-conversations.png)、[窄栏短窗](preview-short-narrow.png)、[抽屉中途](preview-drawer-mid.png)

主代理已目视最终玄墨角色与宣纸作品：Logo/标题书卷风格清楚、留白合适，作品标题箭头/文件夹与内容层级易辨认，顶部/底部未挤压，身份配色及灰度Tabs保持。

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。品牌和fold检查通过不替用户批准UI。
