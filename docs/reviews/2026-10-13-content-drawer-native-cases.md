# 右侧内容抽屉真实 Windows 验收用例

日期：2026-10-13（Asia/Shanghai）。状态：**脚本与用例已准备，尚未运行；等待正式用例独立审核、TDD 实现和构建。** 本文不是通过报告。依据已补审通过的 `2026-10-13-content-drawer-plan.md`、`2026-10-13-content-drawer-plan-review.md` 及用户批准的 HTML。

本代理只写 `scripts/verify-content-drawer.mjs` 和本文件，未修改生产组件、种子、既有 native helper 或其他测试。脚本没有复制导航 CRUD 验收；仅使用既有真实隔离工作区建立本专项需要的正文、角色、主题与空 caption。

## 真实数据与执行边界

- 每次新建系统临时目录 `xaanink-sidebar-*`，复用 `scripts/seed-sidebar-navigation.ts`。该 seed 通过真实 Workspaces、PGlite、Prisma、DraftJournal 与正式 schema 建立两部合成作品，全部记录及账号仅在隔离目录。`XAANINK_TEST_ROOT` 指向该根；bootstrap 必须返回同一根、零模型及 `xaanink://app/` 协议。
- 正文、角色、主题通过真实 React UI 和 CDP 键盘/鼠标输入；查询/持久化检查走现有 local fetch→IPC 和 `desktop.readDraft`。不导入或修改 renderer 业务 store，不替换 body，不创建模拟 Monaco，不把 HTML 样稿作为产品证据。
- Monaco 仅通过现有 React hook 的只读实例发现读取真实对象。动作开始前存 actual editor DOM、editor 对象、model 对象/ID、selection、layoutInfo、scroll、version/alternativeVersion 和正文摘要；之后比较对象 identity、连接状态和 dispose 计数。关闭后的 `isVisible=false` 不代表实例丢失，保活断言使用 `isConnected` 与 editor/model identity。
- 开发 Electron和传入 exe 的目录包使用同一专项脚本，分别使用不同 label。证据目录创建不带 `recursive`，重复 label 在写任何旧报告之前因 EEXIST 拒绝。每次运行保存完整源文件、构建资源和 Electron exe SHA-256，结束再次检查，不允许构建中途变更与验收混合。
- 报告和逐帧 JSON 清理隔离根、工作区路径、用户 home 和 Key 形状；只保存合成界面截图，不保存完整 bootstrap、真实用户文件或 Key。临时夹具保留供失败诊断；脚本没有递归删除或移动命令。

## 执行方式

先完成用例独立审核与正式实现/构建。示例命令中的 label 只是待执行命名，不表示存在证据：

```powershell
node scripts/verify-content-drawer.mjs development-green-01
node scripts/verify-content-drawer.mjs package-green-01 'D:\Projects\xaanink-desktop\release\win-unpacked\玄印写作.exe'
```

开发运行读取当前 `dist`、`.next/static`、`out`；目录包读取 exe 同目录 `resources`。必须已有匹配构建。证据写入 `docs/evidence/content-drawer/windows-<label>/report.json`、每段 `<name>-frames.json` 和阶段截图。失败保留原始报告、截图及未完成 capture，改进后必须使用新 label，不能覆盖 red 或失败证据。

## 验收矩阵

| ID | 实际动作和对象 | 必须断言与证据 |
| --- | --- | --- |
| CD-N01 | 从真实正文导航打开 seed 的长标题章，真实 MarkdownEditor→编辑模式；输入 100 行中英长行，开启 wordWrap；打开 ChapterContentPanel 的“正文功能菜单”确认真实工具。两主题各收起/展开。 | 包含 caption/Tab、工具条、帮助段落、Monaco 实际 `.view-line`/span 行框的全部 rAF；完整 W/H、控件相对坐标/大小及行框数和尺寸固定，无新增折行、无 scale。wordWrap 在动作前允许既有排版，动画不得增加折行。 |
| CD-N02 | 动作前真实选择两个字符并用 CDP wheel 建立非零 Monaco scroll；在动作前建立独立撤销历史标记。收起不可见、展开、换向、全屏、主题/宽高/窄屏动作后继续编辑。 | actual DOM、editor/model 对象/ID、dispose=0、正文、selection、scroll 及 model version/alternativeVersion。逐帧读实际 layoutInfo；动画后真实 Ctrl+Z 撤销**动画之前**的标记，Ctrl+Y 恢复；隐藏时真实 IPC editor.focus + Ctrl+Z 不能改变保留的不可见模型。跨终态窗口重排后允许合理 scroll 重定位，但动作期间 scroll 不变；冷启为新实例，不冒充同实例保活。 |
| CD-N01/03 | 真实角色“身份·外在”长姓名及简介；真实主题长书名及简介、频道 Select。 | 角色容器响应式卡片、标签、字段、工具和主题表单逐帧比较；输入值/textarea scrollHeight/scrollWidth 固定。真实 Select Portal 打开时键盘收起，暂停立即关闭，展开后不自动复活。此专项仅证明两种代表性表单，不声称已验收全部 29 面板。 |
| CD-N03 物品/拖拽 | 在隔离作品中通过真实物品管理 UI 创建一个物品，打开 ItemLevelPicker 直接 Popover，再点击可见 caption 收起并重开；真实 Tab 按住鼠标移动超过 6 px，出现 ghost 后键盘收起，再 mouseup。 | 原生产品实际 Popover 关闭且不自动复活；该可操作真实路径的 outside-click 和 pause 共存，不能把它单独宣称为隔离 pause 因果证明，后者由专门 browser 用例承担。Tab ghost/source 清除、mouseup 不提交新顺序、取消后的焦点不落入 inert 区域，超过终态无旧 focus rAF 抢焦。 |
| CD-N04 | 收起→80 ms 展开→65 ms 再收起；左右同时收起和同时展开；内容工作区全屏（chat 实际 Panel 宽度为 0）后右抽屉收放。 | 最新意图终态、全部阶段完整固定形态；right independent phase 在左右共同落位前保持冻结。真实正文 instance 仍保活。内容全屏指真实 ContentTabs 全屏按钮；不将该项描述为 OS 物理全屏操作。 |
| CD-N05 | 静止时真实鼠标拖拽 content separator；899×680、780×680 实际 Electron 窗口；窄屏“查看内容”→收放→“返回对话”；收起中 1800×1000→899×680，展开中 899×680→1700×980。 | 手动分栏实际改变静止 W，再收放恢复该完整宽；窄屏为右覆盖层。**跨断点和宽高 resize 动作期继续采样真实业务字段、工具、文字行框、Monaco layoutInfo，相对布局及 W/H 全固定**；动作期 CSS mode 不变，终态落实新 mode 和最新 pane。返回对话持久化 `contentVisible=true/pane=chat`，真正隐藏为 false。 |
| CD-N05 zoom | .75、1.25、1.5 稳态 zoom 后收放；普通正文展开中从 1→1.25；真实零 Tab empty caption 展开中 1.25→1.5。 | 冻结完整 W/H、`--content-tab-scale`、真实 caption 控件与内联安全 padding（逐帧 computed padding），empty caption 同样比较；动作结束才接收新排版。用户主动 zoom 由 main 立即应用，物理像素会变化，只断言 CSS 完整排版几何固定，不声称整窗物理像素不变。 |
| CD-N06 | reduced-motion 收放；正常收起时每 45 ms 真实 readDraft IPC 读取磁盘 journal；关闭并冷启同一隔离根，再恢复。 | 减动直接终态，没有 moving rAF；journal 样本只能为旧完整偏好或新合法目标，lastContentSize 不能保存中间宽。冷启是 closed，正文合成数据仍在；新开实例重新建立 baseline。 |
| CD-N07 | 在每次 initial/cold/empty launch 查看真实 bootstrap 和 main 活动监听；整个可观察会话保持 renderer offline、0 模型、无页面错误/外部 HTTP。 | 保存每个 launch 的 protocol、runtime、bounds、zoom、listener 数；所有已观察 HTTP/pageerror 必须为零。Playwright 调试通道是验收工具，不是产品 HTTP 监听。请求与页面错误观察从 firstWindow 开始，不能将此称作 pre-entry/service-worker 网络拦截；正式离线启动的额外已有 guard 验证仍由主代理组合。 |
| CD-N07 HWND | 开放/隐藏/动作期间，真实释放出来的 chat caption 空白点；固定 app-menu button；native 右端三个窗控，包含常态、maximized、不同 zoom、empty caption。 | 不改 `sidebar-native-hit-test.ps1`，调用真实 HWND WM_NCHITTEST，caption=HTCAPTION(2)、固定菜单/按钮=HTCLIENT(1)、native minimize/maximize/close=8/9/20。移动探针前后须同一阶段、同一实际元素且固定坐标仍位于 released zone；漂移只能是 inconclusive→失败，不能拿 settled 结果计 motion 通过。检查 clipping 后越界子控件 app-region/no-drag 不覆盖 chatcaption；检查 renderer 内容控件未进入右端固定 138 DIP 窗控安全区。 |

## 逐帧判定协议

定位使用真实 `.content-drawer-viewport`、`.content-drawer-inner`、`.content-tabs` 和 Shell `data-content-phase`。每次开始前取 preflight，rAF 每帧重新 query 元素并由 WeakMap 分配 identity，不引用已脱离文档的缓存子节点。首次 `opening/closing` 且 W/H/V 均大于 0 的样本是可见 moving baseline；初始注册/零宽预备帧和最终 V=0 帧仍全部保存，不删去不利样本。普通动作要求至少 4 帧真实 motion；减动单独判为零 moving 帧。

每段 motion 比较 W/H（0.08 CSS px）、完整相对几何与 DOM Range 每个行框（0.25 CSS px）、transform matrix 的 scale=1/skew=0/ty=0。右锚检查 `tx=max(W−V,0)` 以及 `inner.right−viewport.right=max(W−V,0)`（0.2 CSS px）；不能误写为左栏 `V−W`，也不能只验证 transform 字符串而遗漏 actual bounds。V>W 时位移为 0、无缩放。内容 motion 中 inert=true，完成后按终态恢复；固定 caption scale/padding 和新 CSS mode 只在所有相关动作完成后变化。

文本测量覆盖真实活动业务 panel、caption/Tab及直接文本节点的 DOM Range rects；textarea 另比较内容 scrollWidth/scrollHeight。Monaco 读取实际 layoutInfo 与每帧 selection/scroll/model version；不以外壳 W 不变代替正文排版。人工截图用于查看具体形态，自动原始行框证据用于验证全过程，不能只用终态两张截图证明没有挤压。

## 结果边界

目前只完成脚本语法检查，未启动产品、未创建测试数据库、未产生通过证据。开发和目录包必须分别执行后再写实测结果。本专项不承担全仓回归、所有业务操作、macOS、物理鼠标拖窗、Windows 真实 IME、NSIS 安装或系统显示比例变化；这些未执行项目不得计通过。
