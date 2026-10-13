# 左导航 HTML 设计稿检查 v4

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计检查，正式实现和产品测试未开始。

## 当前结果

离线 HTML 检查40组通过，浏览器运行错误0，HTTP请求0。当前完整脚本重验既有创建入口、账户、渐隐、场景/试验场、五分类跨作品及键盘/滚动/折叠/正文菜单/空与失败状态，并增加Tabs留白、角色标记位置与完整可访问身份、真实时间抽屉收放及换向。历史v3报告在archive-v3/，不计为当前执行。

Tabs组自身外margin实测上16px、下12px，高36px；选项仍28px。10个合成人物的短姓名后均6px跟随身份标记，标记保持左对齐；长姓名单独渐隐，标记不遮罩，按钮可访问名称包含完整姓名及主角/配角/反派/伏笔角色。

抽屉17段共772个采样帧通过，包含慢速收放、双主题×200/260/420px的12段正常收放、中途换向和原有多行不可用帮助的收放。每帧检查完整内层宽高、各行/姓名/标记/Tabs/账户相对坐标与尺寸、字体/行高/white-space、文字/节点数量/渐隐状态及分类和滚动位置；仅外层可见宽度与水平位移改变，scale始终为1。几何比较容差0.05px，实测最大差0.001px；文字、样式、节点和渐隐状态严格一致。平移与可见宽满足translateX=V-W（裁切宽含浏览器像素栅格舍入）。关闭后导航从可访问树退出，焦点转到外部切换控件；展开完成恢复导航目标。快速换向边界位置相等；减少动态效果直接落到完整终点。逐帧原始数据见drawer-frames.json。

继承规格实测：创建行32px/间距4px，文字14px/20px、字重500、padding12px、图文gap10px，图文中心误差0；NotebookPen/MessageCirclePlus为18px/1.7px；底栏72px、按钮52px、头像32px。五项分类双主题×三栏宽30个组合无横向溢出。普通名称无遮罩，溢出名称仅末端24px渐隐；短窗顶部/底部固定、树独立滚动。

执行使用本机已安装Chrome 154.0.8037.98，以file URL打开设计稿；不创建监听HTTP服务。所有数据为合成fixture，外网请求拦截；6个检查涉及生产源文件前后SHA-256一致，本阶段未修改生产组件。动画相邻区域是审核示意，不是真实DashboardShell/Group/caption。

## 本轮修正记录

首次新增逐帧检查完成34组后，严格相等比较遇到相对坐标45.187/45.188px的浮点舍入；第二次完成35组后，浏览器变换后的完整边界宽出现200.00001525878906/200px。统一所有几何检查为0.05px容差，保留字体/文字/行数/渐隐和节点数量的严格比较；最终完整重跑40组通过。两次失败不计为通过，最终报告反映最后一次完整运行。本轮调整的是几何测量口径，没有用容差掩盖重排。

v3首次角色数量断言修正与正文菜单立即Escape修复等历史见archive-v3/design-verification.md；本轮最终脚本也再次验证正文菜单Escape及角色10人，未移除既有检查。v1/v2在各自归档。

## 可复查产物

- [完整原始报告](preview-checks.json)、[逐帧数据](drawer-frames.json)、[检查脚本](verify-preview.mjs)
- [独立方案及HTML审核](plan-review.md)
- [v4角色普通姓名/徽标](preview-v4-final.png)、[200px短姓名徽标](preview-role-badges.png)
- [动作中途裁切](preview-drawer-mid.png)、[完全收起](preview-drawer-closed.png)
- [作品分类](preview-v4-works.png)、[设定](preview-category-settings.png)、[角色](preview-category-characters.png)、[正文](preview-category-manuscript.png)、[对话](preview-category-conversations.png)
- [玄墨](preview-ink.png)、[宣纸](preview-paper.png)、[长名玄墨](preview-long-ink.png)、[长名宣纸](preview-long-paper.png)
- [短窗窄栏](preview-short-narrow.png)、[账户菜单](preview-account.png)、[试验场管理](preview-scenario-library.png)、[小审核视口](preview-small-viewer.png)

主代理已目视v4最终角色、动作中途和完全收起截图：Tabs留白增加，短姓名标记紧随姓名；中途仅裁切侧栏左边部分，右侧标记与长名渐隐维持原样，没有随空间收窄堆叠或换行。既有多行帮助保留原行数，不给所有文字强加nowrap。截图均为合成内容。

## 执行命令与阶段

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

打包仅生成设计preview.bundle.js，检查仅写本目录截图和报告。独立子代理完成本轮新增范围的双主题200px短窗、126帧收放、短长角色名、身份可访问名称、换向/节点保持/焦点/非模态菜单/减少动态效果复核，通过且无浏览器错误或HTTP请求；初审2项P1/4项P2均在方案或原型范围关闭，无未解决P0/P1/P2，可交用户UI审核。实际运行及源证据详见plan-review.md；当前HTML等待用户批准，结论不替用户批准UI。

真实Shell的单一布局合成、内容/聊天并行动作、全屏/窄屏恢复caption、目标终态存储、跨断点和原生drag/no-drag命中路径只完成方案补充。它们必须在批准后的真实组件、隔离数据及目标系统中测试；原型相邻占位/按钮、DOM换向和headless Chrome不能代替原生验收。

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。
