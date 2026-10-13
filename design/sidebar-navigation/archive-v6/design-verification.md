# 左导航 HTML 设计稿检查 v6

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计检查，正式实现和产品测试未开始。

## 当前结果

离线HTML检查47组首次完整运行通过，浏览器运行错误0，HTTP请求0。当前完整脚本重验既有创建/账户/渐隐/五分类与六入口/键盘/焦点/滚动/折叠/空错态/抽屉，并新增灰度选中气泡、FolderClosed/Open真实开合、Pointer手形、双主题24种主图标token、10角色四身份同色和选中保色、伏笔字头像。历史v5报告在archive-v5/，不计当前执行。

v6实测：双主题×200/260/420px×五分类共30组合，外组background透明、border0、radius0；选项28px/6px圆角/1px透明占位边。只有当前项显示与右侧设计对照同源token的中性selected-bg/selected-border/foreground（600字重），不使用primary。未选项的背景/边均透明，双主题8次hover仍透明；灰度键盘焦点可见。新对话初始/点击后普通样式一致，历史/分类切换后也无选中态。

无封面项目默认FolderOpen，点击原折叠箭头变FolderClosed、再激活作品恢复FolderOpen和子树；金手指为实际Pointer的5条path。双主题各24种tone均有独立颜色，普通主图标与主题token严格匹配，图标相对于实际行背景的最小计算对比3.735:1。10名人物的图标或伏笔字头像与身份徽标文字一致，主/配/反/伏笔四色；每主题4种身份逐个选中后仍保持tone。徽标底8%身份色合成后，包括选中行，最低计算对比4.648:1。两个伏笔人物保留20px虚线圈与姓名首字，长姓名/徽标6px间隔及渐隐保持。颜色计算仅是此合成HTML的明确token/背景证据，不代表真实产品的头像、章节状态或完整无障碍验收。

设定分类在每个作品原设定项目后追加物品、情景试验场、场景、世界线、叙事线、大纲，检查两作品共12行顺序/实体ID/owner，每行只出现一次。场景和试验场无箭头/子项；其他三种过滤分类没有这些入口。10次物品/场景/世界线/叙事线/大纲点击示意均包含正确作品与原面板目的地，试验场管理弹窗及直达“+”取消返回当前作品实际设定触发器。作品完整树保留同六入口，切分类不重挂载对照内容节点。以上都是合成媒介动作；真实openSimpleTab/openAllScenes/Dialog/cache仍待实施验证。

Tabs组自身外margin实测上16px、下12px，高36px；选项仍28px。10个合成人物的短姓名后均6px跟随身份标记，标记保持左对齐；长姓名单独渐隐，标记不遮罩，按钮可访问名称包含完整姓名及主角/配角/反派/伏笔角色。

本轮重验抽屉17段共776个采样帧通过，包含慢速收放、双主题×200/260/420px的12段正常收放、中途换向和原有多行不可用帮助的收放。每帧检查完整内层宽高、各行/姓名/标记/Tabs/账户相对坐标与尺寸、字体/行高/white-space、文字/节点数量/渐隐状态及分类和滚动位置；仅外层可见宽度与水平位移改变，scale始终为1。几何比较容差0.05px，实测最大差0.001px；文字、样式、节点和渐隐状态严格一致。平移与可见宽满足translateX=V-W（裁切宽含浏览器像素栅格舍入）。关闭后导航从可访问树退出，焦点转到外部切换控件；展开完成恢复导航目标。快速换向边界位置相等；减少动态效果直接落到完整终点。逐帧原始数据见drawer-frames.json。

继承规格实测：创建行32px/间距4px，文字14px/20px、字重500、padding12px、图文gap10px，图文中心误差0；NotebookPen/MessageCirclePlus为18px/1.7px；底栏72px、按钮52px、头像32px。五项分类双主题×三栏宽30个组合无横向溢出。普通名称无遮罩，溢出名称仅末端24px渐隐；短窗顶部/底部固定、树独立滚动。

执行使用本机已安装Chrome 154.0.8037.98，以file URL打开设计稿；不创建监听HTTP服务。所有数据为合成fixture，外网请求拦截；6个检查涉及生产源文件前后SHA-256一致，本阶段未修改生产组件。动画相邻区域是审核示意，不是真实DashboardShell/Group/caption。

## 运行与历史记录

当前v6首次完整运行47组通过，没有失败重跑。v5的44组/776帧见archive-v5/，当前17段776帧是本轮重新采样，且新增主图标/字头像及颜色/边色逐帧严格比较。v4的浮点舍入失败及修正见archive-v4/，保留0.05px几何容差、不弱化文字/样式/渐隐比较。历史结果不计本轮。

v3首次角色数量断言修正与正文菜单立即Escape修复等历史见archive-v3/design-verification.md；本轮最终脚本也再次验证正文菜单Escape及角色10人，未移除既有检查。v1/v2在各自归档。

## 可复查产物

- [完整原始报告](preview-checks.json)、[逐帧数据](drawer-frames.json)、[检查脚本](verify-preview.mjs)
- [独立方案及HTML审核](plan-review.md)
- [v6设定彩色图标/灰度Tabs](preview-v6-settings.png)、[v6角色/徽标](preview-v6-final.png)
- [宣纸身份配色](preview-v6-palette-paper.png)、[玄墨身份配色](preview-v6-palette-ink.png)、[200px短姓名徽标](preview-role-badges.png)
- [动作中途裁切](preview-drawer-mid.png)、[完全收起](preview-drawer-closed.png)
- [作品分类](preview-v6-works.png)、[设定](preview-category-settings.png)、[角色](preview-category-characters.png)、[正文](preview-category-manuscript.png)、[对话](preview-category-conversations.png)
- [玄墨](preview-ink.png)、[宣纸](preview-paper.png)、[长名玄墨](preview-long-ink.png)、[长名宣纸](preview-long-paper.png)
- [短窗窄栏](preview-short-narrow.png)、[账户菜单](preview-account.png)、[试验场管理](preview-scenario-library.png)、[小审核视口](preview-small-viewer.png)

主代理已目视本轮v6设定、最终角色和宣纸身份截图：灰度选中气泡与右侧设计对照一致，24种柔和类型色可辨认；角色图标、字头像与主/配/反/伏笔徽标同色，文字/首字仍清楚。外底板、新对话选中态均未恢复；六入口、姓名后徽标、抽屉完整结构继续保持。所有截图均为合成内容。

## 执行命令与阶段

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

打包仅生成设计preview.bundle.js，检查仅写本目录截图和报告。独立子代理已完成v6新增范围的双主题×200/420px、500px短窗4组合及各组合5视图，核验灰度选中/细边/普通前景、FolderClosed/Open实际SVG与箭头/作品激活、两个Pointer与本地库path一致、10角色四身份主图标/字头像与徽标同色且active/hover保色、主题token变化及完整ARIA；无浏览器错误或HTTP请求。最终47组/776帧报告、6个生产hash、截图及文档一致，passed-for-user-ui-review-only，无未解决方案问题；详细结论见plan-review.md。不把此前v5/4的独立执行写成本轮。当前HTML等待用户批准，结论不替用户批准UI。

真实封面/人物照片、章节CHAPTER_STATUS_ICONS与状态色、共享图标不影响右Tabs，以及Shell协调/窄屏/caption/目标存储/原生命中均只完成方案补充。它们必须在批准后的真实组件、隔离数据及目标系统中测试；合成图标/字头像、相邻占位、DOM换向和headless Chrome不能代替产品/原生验收。

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。
