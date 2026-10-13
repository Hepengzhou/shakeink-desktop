# 左导航 HTML 设计稿检查 v3

日期：2026-10-13（Asia/Shanghai）。第三项产物的设计检查，正式实现和产品测试未开始。

## 结果

离线 HTML 检查 32 组通过，浏览器运行错误 0，HTTP 请求 0。覆盖此前双主题、200/260/420px、500/640/900px、长名称、创建入口/账户/试验场交互，并增加五项分类的跨作品内容、单行场景、新对话图标、键盘切换、各自滚动/折叠、正文根菜单及空态、角色部分加载失败与未绑定对话。五项分类在双主题×三栏宽的30个组合中均完整显示，无横向溢出。

v3 几何实测：创建行高 32/32px、间距 4px；文字 14px/20px、字重 500；左右 padding 12px、图文 gap 10px；两个按钮的图标和文字中心误差均为 0px。图标 NotebookPen/MessageCirclePlus，18px、1.7px 线宽，第二行名为新对话；底栏 72px、按钮 52px、头像 32px。分类选项高28px，五项在最窄200px也无文字溢出。普通名称不遮罩，溢出名称使用24px遮罩，包含分类作品标题；场景已无导航子项。短窗里树区独立滚动，创建、分类Tabs和账户区域固定。

运行使用本机已安装 Chrome，无监听 HTTP 服务；所有数据为合成 fixture，所有外网请求拦截。6 个涉及生产源文件在检查前后 SHA-256 一致；未改生产组件。

v3 首次检查完成22组后，测试将合成每作品1主+2配+1反+1伏笔误写为6人，实际为5人；按fixture修正总数为10，角色数据未删减。第二次完成24组后发现正文菜单打开后立即按Escape、焦点尚未移入菜单时未关闭；将Escape处理同时放在菜单触发器所属wrapper，修正原型。最终完整重跑32组通过，未把此前失败计为通过。v1/v2设计和各自报告分别在archive-v1/与archive-v2/，不冒充当前v3执行结果。

## 可复查产物

- [完整原始报告](preview-checks.json)
- [检查脚本](verify-preview.mjs)
- [独立方案及 HTML 审核](plan-review.md)
- [玄墨](preview-ink.png)、[宣纸](preview-paper.png)
- [长名称玄墨](preview-long-ink.png)、[长名称宣纸](preview-long-paper.png)
- [短窗窄栏](preview-short-narrow.png)、[账户菜单](preview-account.png)
- [试验场管理](preview-scenario-library.png)、[小审核视口](preview-small-viewer.png)
- [作品分类](preview-v3-works.png)、[设定分类](preview-category-settings.png)、[角色分类](preview-category-characters.png)
- [正文分类](preview-category-manuscript.png)、[对话分类](preview-category-conversations.png)
- [正文空列表](preview-category-empty.png)、[角色长名称](preview-category-long-characters.png)

主代理已目视 v3 作品、设定、角色、正文、对话和角色长名称截图：五项分类选中清晰，分组标题能辨认归属，人物徽标/正文菜单无相互遮挡，长分组名称正确渐隐。测试中的小视口与最后作品分类截图使用合成增删改后的状态，初始试验场记录见管理截图。侧栏所有示意记录均不会写入生产。

## 命令

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/build-preview.mjs
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' design/sidebar-navigation/verify-preview.mjs
```

打包命令仅生成原型preview.bundle.js；检查脚本只写本目录截图和报告。v3独立方案及HTML审核通过，可交用户审核，无未解决P0/P1/P2；独立11项重点、双主题200px/500px与正文菜单立即Escape的3次检查通过，详见plan-review.md。正文根菜单/正文空态/角色双查询条件已纳入当前产品和技术方案，正式组件中的真实行为仍待后续实施验证。此前v1/v2独立结果均留在对应归档，不计为v3独立执行。此结论不替用户批准UI。

`uiApproval=awaiting-user`，`implementation=not-started`，`productTests=not-run`，`WindowsElectron=not-run`，`macOS=not-run`，`installedPackage=not-run`，`allAcceptancePassed=false`。HTML 通过不能代表最终“通过所有测试”。
