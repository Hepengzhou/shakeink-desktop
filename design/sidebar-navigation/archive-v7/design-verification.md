# 左导航 HTML 设计稿检查 v7

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计检查，正式实现和产品测试未开始。

## 当前结果

v7仅将作品图标改为中性石板灰：宣纸#657077、玄墨#a6b0b8。CSS与archive-v6对比仅两处--icon-work值改变，作品开合与分类FolderOpen共用该值，其他23种tone和布局不变。复用现有离线HTML脚本最终47组通过，浏览器运行错误0，HTTP请求0；当前重新执行的证据包括作品配色与既有分类、身份/渐隐/抽屉。历史v6报告在archive-v6/，不计本轮。

独立仅针对作品色核验双主题260×900、FolderOpen/Closed/分类标题及选中状态：两作品全部形态使用当前主题色；宣纸普通/分组对比4.082:1、hover关闭3.743:1、选中3.591:1；玄墨分组8.778:1、选中7.362:1。实际本轮补充采样的最低图标对比为作品选中3.591:1。下方现有24-tone脚本的3.735仅指其采样状态，不能当成所有选中状态的最低值。主代理已目视v7作品截图，文件夹不再与金手指/主角同为金棕。

继承v6规格本轮重验：双主题×200/260/420px×五分类共30组合，外组background透明、border0、radius0；选项28px/6px圆角/1px透明占位边。只有当前项显示与右侧设计对照同源token的中性selected-bg/selected-border/foreground（600字重），不使用primary。未选项的背景/边均透明，双主题8次hover仍透明；灰度键盘焦点可见。新对话初始/点击后普通样式一致，历史/分类切换后也无选中态。

无封面项目默认FolderOpen，点击原折叠箭头变FolderClosed、再激活作品恢复FolderOpen和子树；金手指为实际Pointer的5条path。双主题各24种tone均有独立颜色，普通主图标与主题token严格匹配，图标相对于实际行背景的最小计算对比3.735:1。10名人物的图标或伏笔字头像与身份徽标文字一致，主/配/反/伏笔四色；每主题4种身份逐个选中后仍保持tone。徽标底8%身份色合成后，包括选中行，最低计算对比4.648:1。两个伏笔人物保留20px虚线圈与姓名首字，长姓名/徽标6px间隔及渐隐保持。颜色计算仅是此合成HTML的明确token/背景证据，不代表真实产品的头像、章节状态或完整无障碍验收。

设定分类在每个作品原设定项目后追加物品、情景试验场、场景、世界线、叙事线、大纲，检查两作品共12行顺序/实体ID/owner，每行只出现一次。场景和试验场无箭头/子项；其他三种过滤分类没有这些入口。10次物品/场景/世界线/叙事线/大纲点击示意均包含正确作品与原面板目的地，试验场管理弹窗及直达“+”取消返回当前作品实际设定触发器。作品完整树保留同六入口，切分类不重挂载对照内容节点。以上都是合成媒介动作；真实openSimpleTab/openAllScenes/Dialog/cache仍待实施验证。

Tabs组自身外margin实测上16px、下12px，高36px；选项仍28px。10个合成人物的短姓名后均6px跟随身份标记，标记保持左对齐；长姓名单独渐隐，标记不遮罩，按钮可访问名称包含完整姓名及主角/配角/反派/伏笔角色。

本轮重验抽屉17段共773个采样帧通过，包含慢速收放、双主题×200/260/420px的12段正常收放、中途换向和原有多行不可用帮助的收放。每帧检查完整内层宽高、各行/姓名/标记/Tabs/账户相对坐标与尺寸、字体/行高/white-space、文字/节点数量/渐隐状态及分类和滚动位置；仅外层可见宽度与水平位移改变，scale始终为1。几何比较容差0.05px，实测最大差0.001px；文字、样式、节点和渐隐状态严格一致。平移与可见宽满足translateX=V-W（裁切宽含浏览器像素栅格舍入）。关闭后导航从可访问树退出，焦点转到外部切换控件；展开完成恢复导航目标。快速换向边界位置相等；减少动态效果直接落到完整终点。逐帧原始数据见drawer-frames.json。

继承规格实测：创建行32px/间距4px，文字14px/20px、字重500、padding12px、图文gap10px，图文中心误差0；NotebookPen/MessageCirclePlus为18px/1.7px；底栏72px、按钮52px、头像32px。五项分类双主题×三栏宽30个组合无横向溢出。普通名称无遮罩，溢出名称仅末端24px渐隐；短窗顶部/底部固定、树独立滚动。

执行使用本机已安装Chrome 154.0.8037.98，以file URL打开设计稿；不创建监听HTTP服务。所有数据为合成fixture，外网请求拦截；最终这次6个涉及生产源文件前后SHA-256一致，本任务未修改生产组件。首次运行期间工作区有无关样式并行修改，详见下节。动画相邻区域是审核示意，不是真实DashboardShell/Group/caption。

## 运行与历史记录

v7首次运行46组原型检查通过，但末尾source hash断言失败：src/app/desktop.css在执行期间出现无关.desktop-project-star设置/欢迎样式修改。保留该并行工作，不回滚、不放宽断言；首次失败报告见preview-checks-v7-first-run.json。源状态稳定后原脚本重跑47组通过，当前报告/773帧来自最终这次执行。v6的首次47组/776帧在archive-v6/，不计本轮；此前浮点容差修正见archive-v4/。

v3首次角色数量断言修正与正文菜单立即Escape修复等历史见archive-v3/design-verification.md；本轮最终脚本也再次验证正文菜单Escape及角色10人，未移除既有检查。v1/v2在各自归档。

## 可复查产物

- [完整原始报告](preview-checks.json)、[逐帧数据](drawer-frames.json)、[检查脚本](verify-preview.mjs)、[首次源文件检查失败报告](preview-checks-v7-first-run.json)
- [独立方案及HTML审核](plan-review.md)
- [v7设定文件夹配色](preview-v7-settings.png)、[v7角色/作品分组图标](preview-v7-final.png)
- [宣纸配色](preview-v7-palette-paper.png)、[玄墨配色](preview-v7-palette-ink.png)、[200px短姓名徽标](preview-role-badges.png)
- [动作中途裁切](preview-drawer-mid.png)、[完全收起](preview-drawer-closed.png)
- [作品分类](preview-v7-works.png)、[设定](preview-category-settings.png)、[角色](preview-category-characters.png)、[正文](preview-category-manuscript.png)、[对话](preview-category-conversations.png)
- [玄墨](preview-ink.png)、[宣纸](preview-paper.png)、[长名玄墨](preview-long-ink.png)、[长名宣纸](preview-long-paper.png)
- [短窗窄栏](preview-short-narrow.png)、[账户菜单](preview-account.png)、[试验场管理](preview-scenario-library.png)、[小审核视口](preview-small-viewer.png)

本轮作品图标采用中性石板灰，完整树与各分类标题一致；其余v6样式按相同原脚本重验。所有截图均为合成内容。

## 执行命令与阶段

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

打包仅生成设计preview.bundle.js，检查仅写本目录截图和报告。独立子代理本轮仅检查作品新色的双主题260×900、开合/分类标题/选中/hover背景对比及CSS与归档v6只有两处颜色差异；无浏览器错误或HTTP请求。最终47组/773帧、6hash检查窗口稳定、失败记录和颜色对比口径均一致，passed-for-user-ui-review-only；详细结论见plan-review.md。此前v6独立4组合与其他历史测试不计本轮独立执行。当前HTML等待用户批准，结论不替用户批准UI。

真实封面/人物照片、章节CHAPTER_STATUS_ICONS与状态色、共享图标不影响右Tabs，以及Shell协调/窄屏/caption/目标存储/原生命中均只完成方案补充。它们必须在批准后的真实组件、隔离数据及目标系统中测试；合成图标/字头像、相邻占位、DOM换向和headless Chrome不能代替产品/原生验收。

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。
