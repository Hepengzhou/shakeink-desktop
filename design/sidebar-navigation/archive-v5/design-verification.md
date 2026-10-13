# 左导航 HTML 设计稿检查 v5

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计检查，正式实现和产品测试未开始。

## 当前结果

离线HTML检查44组首次完整运行通过，浏览器运行错误0，HTTP请求0。当前完整脚本重验既有创建入口、账户、渐隐、场景/试验场、五分类跨作品、键盘/滚动/折叠/正文菜单/空与失败状态、角色标记及真实时间抽屉收放，并新增透明Tabs组/未选hover、仅选中高亮、新对话普通动作样式和设定六入口的双作品归属与焦点检查。历史v4报告在archive-v4/，不计为当前执行。

v5新增实测：双主题×200/260/420px×五分类共30组合，外组background透明、border0、radius0；五个选项28px/6px圆角，无边框，只有当前项有active-wash背景/primary文字/600字重。双主题四个未选项的8次hover全部透明，键盘焦点轮廓仍可见。新对话初始/点击后样式严格一致，背景透明，无active类、aria-selected或aria-pressed；切换主题/分类、打开历史会话再点新对话仍保持普通动作样式。

设定分类在每个作品原设定项目后追加物品、情景试验场、场景、世界线、叙事线、大纲，检查两作品共12行顺序/实体ID/owner，每行只出现一次。场景和试验场无箭头/子项；其他三种过滤分类没有这些入口。10次物品/场景/世界线/叙事线/大纲点击示意均包含正确作品与原面板目的地，试验场管理弹窗及直达“+”取消返回当前作品实际设定触发器。作品完整树保留同六入口，切分类不重挂载对照内容节点。以上都是合成媒介动作；真实openSimpleTab/openAllScenes/Dialog/cache仍待实施验证。

Tabs组自身外margin实测上16px、下12px，高36px；选项仍28px。10个合成人物的短姓名后均6px跟随身份标记，标记保持左对齐；长姓名单独渐隐，标记不遮罩，按钮可访问名称包含完整姓名及主角/配角/反派/伏笔角色。

本轮重验抽屉17段共776个采样帧通过，包含慢速收放、双主题×200/260/420px的12段正常收放、中途换向和原有多行不可用帮助的收放。每帧检查完整内层宽高、各行/姓名/标记/Tabs/账户相对坐标与尺寸、字体/行高/white-space、文字/节点数量/渐隐状态及分类和滚动位置；仅外层可见宽度与水平位移改变，scale始终为1。几何比较容差0.05px，实测最大差0.001px；文字、样式、节点和渐隐状态严格一致。平移与可见宽满足translateX=V-W（裁切宽含浏览器像素栅格舍入）。关闭后导航从可访问树退出，焦点转到外部切换控件；展开完成恢复导航目标。快速换向边界位置相等；减少动态效果直接落到完整终点。逐帧原始数据见drawer-frames.json。

继承规格实测：创建行32px/间距4px，文字14px/20px、字重500、padding12px、图文gap10px，图文中心误差0；NotebookPen/MessageCirclePlus为18px/1.7px；底栏72px、按钮52px、头像32px。五项分类双主题×三栏宽30个组合无横向溢出。普通名称无遮罩，溢出名称仅末端24px渐隐；短窗顶部/底部固定、树独立滚动。

执行使用本机已安装Chrome 154.0.8037.98，以file URL打开设计稿；不创建监听HTTP服务。所有数据为合成fixture，外网请求拦截；6个检查涉及生产源文件前后SHA-256一致，本阶段未修改生产组件。动画相邻区域是审核示意，不是真实DashboardShell/Group/caption。

## 运行与历史记录

当前v5首次完整运行44组通过，没有失败重跑。v4曾在34组与35组分别遇到45.187/45.188px相对坐标和200.00001525878906/200px边界宽的浮点舍入，统一几何容差为0.05px后重跑40组通过；字体/文字/行数/渐隐严格比较仍保留。历史失败和v4报告见archive-v4/，不计为当前执行，也不把旧772帧写成本轮776帧。

v3首次角色数量断言修正与正文菜单立即Escape修复等历史见archive-v3/design-verification.md；本轮最终脚本也再次验证正文菜单Escape及角色10人，未移除既有检查。v1/v2在各自归档。

## 可复查产物

- [完整原始报告](preview-checks.json)、[逐帧数据](drawer-frames.json)、[检查脚本](verify-preview.mjs)
- [独立方案及HTML审核](plan-review.md)
- [v5设定六入口与Tabs](preview-v5-settings.png)、[v5角色/徽标](preview-v5-final.png)、[200px短姓名徽标](preview-role-badges.png)
- [动作中途裁切](preview-drawer-mid.png)、[完全收起](preview-drawer-closed.png)
- [作品分类](preview-v5-works.png)、[设定](preview-category-settings.png)、[角色](preview-category-characters.png)、[正文](preview-category-manuscript.png)、[对话](preview-category-conversations.png)
- [玄墨](preview-ink.png)、[宣纸](preview-paper.png)、[长名玄墨](preview-long-ink.png)、[长名宣纸](preview-long-paper.png)
- [短窗窄栏](preview-short-narrow.png)、[账户菜单](preview-account.png)、[试验场管理](preview-scenario-library.png)、[小审核视口](preview-small-viewer.png)

主代理已目视本轮v5设定、最终角色和宣纸截图：外组底板已消失，仅当前Tab高亮；新对话普通文字/图标，新增六入口排列在同作品设定项目后，跨作品归属清楚，短姓名徽标紧随姓名。抽屉没有因本次样式改变而挤压布局，既有多行帮助仍保留原行数。所有截图均为合成内容。

## 执行命令与阶段

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

打包仅生成设计preview.bundle.js，检查仅写本目录截图和报告。独立子代理已完成v5新增范围的双主题×200/420px、500px短窗4组合，核验透明外组/未选hover、选中高亮、双作品六入口与其他分类范围、新对话初始/点击/历史/分类切换后无active，场景归属及试验场取消焦点返回；无浏览器错误或HTTP请求。最终文档与44组/776帧报告及6个生产hash复核一致，无未解决方案问题，passed-for-user-ui-review-only。实际运行和源证据详见plan-review.md；此前v4独立126帧仅为历史。当前HTML等待用户批准，结论不替用户批准UI。

真实Shell的单一布局合成、内容/聊天并行动作、全屏/窄屏恢复caption、目标终态存储、跨断点和原生drag/no-drag命中路径只完成方案补充。它们必须在批准后的真实组件、隔离数据及目标系统中测试；原型相邻占位/按钮、DOM换向和headless Chrome不能代替原生验收。

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。
