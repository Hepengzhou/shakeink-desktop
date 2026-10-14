# 右侧内容抽屉正式测试用例

日期：2026-10-13（Asia/Shanghai）。依据已批准 HTML 和通过独立审核的正式方案。此文件定义待执行用例，不能视为通过记录；red/green 命令、结果和真实系统证据由主代理另行记录。

2026-10-14 补审修订：补齐 P2-2/3 的真实控件逐帧几何、caption scale、完整 transform matrix 和有/无 Tab caption app-region 判据；本次仅修改用例/fixture/本文，未修改生产源码或执行行为 red。

2026-10-14 red 采样边界修订：原始记录完整保留初次 Panel 注册时 V=0 的不可见准备帧；形态比较从已识别动作区间内首个 V>0.35 CSS px 的实际可见帧开始。初注册零可见准备允许 repin，不要求该不可见阶段已完成 W/H；首可见帧即要求完整形态。比较开始后，关闭过程中后续 V=0 且动作仍冻结的帧继续比较，不能借此跳过关闭收尾。初次 `red-01` 的 W=0/V=0 失败仅证明断言过早，不能用作可见内容变形根因证据；主代理应以新 label 重跑且保留旧记录。

2026-10-14 TDD 等同语义修订，经独立 reviewer 确认：react-resizable-panels 的真实 ARIA/inert 宿主是外层 `#content[data-panel]`（其源码 dist:3533–3565），故关闭 ARIA 读取该宿主而非只带 className 的内部样式 wrapper；fixture 的 Select 补上真实 API 的 `items` label 映射，保留“第二项”中文结果断言；内容外菜单正常 item-click 允许原本退出动画完成，owned pause 的首 rAF 要求不变；fixture 外部控件移至 bottom=48px，避开 Win32 原有底部 nav；运动中换向先断言恢复按钮可见、非 inert、中心 elementFromPoint 命中，再发送真实 force pointer click，以避免 Playwright stable 等待把操作延迟到动画结束。所有几何、phase、运动时长、反向结果、首帧 pause 和恢复要求保持不变。green-01/02 原失败记录保留，新 label 重验。

补审 sanity（2026-10-14）：bundled Node 24.19.0 与真实 Chrome 下 fixture 编译、两条 caption 分支、控件/scale/matrix 采样及 rAF recorder 正常，无 page errors；独立 CSS initial probe 返回 `none`，两条静止 caption 返回 `drag`、各自工具 button 返回 `no-drag`、实际 caption scale=1、matrix scaleX/Y=1。共享 Select 的固定 1px `aria-hidden=true` form proxy 经实际 DOM 确认排除，它不是可见业务字段；drawer 的 aria-hidden 祖先不被用于排除，动作中真实控件仍逐帧采样。此次不构成行为 red/green 或产品验收。

## 自动化外壳与证据边界

新增 `tests/helpers/content-drawer-fixture.ts`，实际运行 DashboardShell、useSidebarDrawer、react-resizable-panels 的 Group/Panel、SidebarTree、ContentTabs、tabs/desktop stores、workspace adapter、命令注册和共享 UI primitives。只隔离 Chat 的 AI body 和与抽屉无关的业务 body；Chat caption 从当前真实源码提取。ContentTabs proxy 原样渲染真实组件并捕获真实 Shell 回调，供 inert 动画期间模拟用户已发出的全屏命令；不增加任何生产测试后门、不替换动画 hook。

隔离 body 的正文自然换行，不设固定业务宽度或 nowrap。包含两段长中英文、两列字段、React 状态 input、可滚动区域、共享 uncontrolled/controlled DropdownMenu、Select、Tooltip 和真实 Dialog（内部也有 input、Select），另直接导入真实 `src/components/content/ItemLevelPicker.tsx`，不替换其直接 Base UI Popover 实现。Picker 只在真实 QueryClient 的正常 query key 中种隔离 `{settings:[]}`（`settings/novelId/LEVEL_SYSTEM`）和 `{worlds:[]}`（`worlds/novelId`）；UI 仍由真实组件读取缓存并显示实际空状态。其输入实例不等同于真实 Monaco；Monaco 实例/草稿/选区/撤销、29 类真实业务、PGlite/IPC、原生标题栏和离线安装包仍由实际 Windows 验证覆盖。

每个运动段从动作前启动 requestAnimationFrame，连续采集完整 420/560ms 动作及终态，而非只取 100ms 单帧。每帧记录实际裁切 V、真实内层 W/H、transform、正文 Range.getClientRects 文字行框、字段/body 相对内层几何、真实 caption Tab/close-button/工具 button 以及活动业务 panel 的每个 input/button 各自相对矩形，排除 hidden Tab。caption scale 从真实 caption（或真实 .content-tabs）读取，不能从新增父 wrapper 读取；真实标题文字另记录 Range 行框。矩阵逐帧要求 scaleX=scaleY=1、skewX=skewY=0、translateY=0（容差 0.00001），只允许 translateX。动作区间由 phase 首次 moving 或真实 V 首次变化识别，形态比较从该区间的首个 V>0.35 实际可见帧开始，覆盖至最后非终态 V 或最后 moving phase，并保留其后关闭到 V=0 的冻结帧；不可见初注册准备帧完整保留 raw。不得只按产品 phase 过滤，提前把 phase 改 open 的真实移动帧仍需受检，V 尚未到终态时必须保持 opening/closing。动作前 preflight 和已到终态且 phase settled 的合法最终 reflow 排除。移动段必须有至少 8 个帧样本（reduced 除外），所有移动帧与动作完整形态比较，容差 0.35 CSS px，右向平移必须满足 max(W−V,0)，并验证实际屏幕右锚。首次打开在注册后首个可见帧即要求完整 W/H，无零宽或默认宽闪现；反向沿用该次动作基准。

旧实现尚无 content-drawer-inner 时，采样真实 .content-tabs，仍运行完整外壳及正文。因此根因 red 必须由实际宽度/文字行框变化触发；fixture 编译错误、缺 wrapper、环境启动失败不可视为 red。调试辅助属性只在隔离 body，生产定位采用方案里的 .content-drawer-inner、.content-drawer-viewport 和 data-content-phase。

## CD-01–07

| 编号 | 操作与覆盖 | 自动化判据 |
| --- | --- | --- |
| CD-01 | 首次 Tab 激活打开；正常关闭；重复打开；收起中反向及展开中反向；ink/paper | 首个实际可见帧起 W/H、文字行数/每行框、两列字段及 caption 相对几何不变，右移公式逐帧成立；不可见注册准备帧保留 raw，但不当作变形根因；首开无默认宽闪现；动作中 inert/aria-hidden；终态 open/closed；保留 mounted 内容，隐藏可见宽 0，无内容 separator 占位；恢复入口可以反向当前 intent。 |
| CD-02 | 左右同动；opening 中 fullscreen 替换；全屏退出；hidden 和 closing fullscreen 忽略 | 整个相关动作段保持同一 W/H 与行框；左右最新命令及合法百分比终态一致；full 不提前解冻；隐藏/closing 无幽灵占位、chat 不被误隐藏；workspace read 保存终态目标和完整宽偏好，不保存中间动画尺寸。 |
| CD-03 | 900→899 和 899→900，动作期间同时改宽高；600/899 窄屏打开、返回对话、再打开、真正隐藏 | 完成前仍为动作开始 mode、W/H/行框不变，完成后落实最新模式/命令；窄屏内容为全宽右覆盖、chat 保留；普通返回 chat 只关闭覆盖，contentVisible=true、桌面宽偏好保留；真正隐藏置 false/pane=chat；新动作按最新窗口尺寸重新测量。 |
| CD-04 | opening/closing/并行动作中 restore hidden/open；reduced motion | restore 立即替换旧 generation、清除冻结和延迟焦点，超过旧动作时长后仍保持输入新布局；既有 mounted 实例在 hidden restore 后保留；减动直接终态、无中间 V、焦点策略仍正确。 |
| CD-05 | 关闭/反向/重开后业务实例、React 草稿/选区、scroll；内容焦点关闭→恢复；用户主动外移焦点；自动 Tab 激活 | 同一实例 ID、input 值/selectionStart/End/scrollTop 保留；从内容退出焦点移到恢复入口；仅恢复流程仍拥有焦点时回原目标；外部主动焦点和 Dialog 焦点不被抢；Tab 激活只展开。真实 Monaco 另验。 |
| CD-06 | 内容 owned uncontrolled 和 controlled DropdownMenu/Select/Tooltip；真实 ItemLevelPicker 直接 Popover；外部 popup；业务 Dialog | owned popup 在首次动作帧暂停/隐藏/inert，退出动画也不留下可操作层；重开不自动复活 controlled/open 状态，新的用户操作可再开；Picker 点击真实“选择等级”打开后调用既有实际 Shell.hide 回调，期间不外点击、不移动指针、不发 Escape，直接证明 pause 的关闭因果，展开不复活、再次主动点击可打开；内容外 popup 保持；业务 Dialog 挂载/input/其内部 Select/保存保持可用；不通过全局 Escape 清除所有浮层。 |
| CD-07 | 内容编辑 command target 记录后隐藏/动作/恢复；隐藏保活 editor 候选；有 Tab/空 Tab 真实 caption app-region | inert/hidden 祖先内 useDesktopCommands 目标不得 enabled/execute，desktopEditorTarget 返回 null；恢复后重新可用。逐帧及 hidden 状态的真实 caption 与控件 app-region 必须等于独立 probe 的 CSS initial computed value（Chromium 通常为 none，不误要求字符串 initial），open 后 caption=drag、独立工具 button=no-drag。Tab 内 close-button 原本由 bounded viewport 保留 initial，不误把它要求为单独 no-drag 区域。空 caption 通过真实 store 清空 Tabs，再调用实际 Shell 注册命令展开，测同一真实 ContentTabs 的空分支（Browser 只验 CSS；实际 HWND 另验）。 |

## 额外专项和全量验收

真实 Windows Electron /目录包验收需覆盖：正文、表单和长标题连续逐帧；实际 MarkdownEditor Monaco model/editor 实例、草稿、选区、撤销及滚动；两主题；固定 zoom 0.75/1/1.5 caption 安全区；动作中主动 zoom 的 CSS 几何/冻结 caption 值与整窗物理缩放边界；有 Tab/无 Tab 两条 caption；Tab 拖拽暂停无提交、取消旧 focus rAF；真实 ItemLevelPicker 直接 Popover；手动拖动分栏；目标持久化冷启动；真实 Windows HWND caption/no-drag 命中；无模型、无 HTTP 监听、离线冷启。未执行项不能标通过，平台外观切换不能代替 macOS 真机。

实际 Windows 的用例矩阵另见 `docs/reviews/2026-10-13-content-drawer-native-cases.md`；该矩阵亦属待执行定义，其逐帧/IPC/持久化/安装包结果由主代理据实记录。

Popover 证据精确分层（2026-10-14 补充）：Browser 上述 Picker 用例通过真实 Shell 回调收起，排除了 outside-click 的自行关闭原因，承担直接 Popover 暂停因果。实际 Windows 中 Picker 使用真实业务数据和真实点击 caption 收起路径，承担实际组件生命周期/IPC/重新打开验证；outside-click 与 pause 在该路径共存，不单独称作暂停因果证据。现有 DesktopCommandController 对 `role=dialog`（包括 Popover）及 Select `listbox` 的键盘屏障会阻止该场景的非外点击原生快捷键收起；本专项不扩改这项无关命令行为，亦不把受屏障阻止的未执行动作计为通过。

Picker fixture sanity（2026-10-14）：bundled Node 24.19.0 /真实 Chrome 下实际组件编译并挂载，“选择等级”触发器 1 个、实际 Popover dialog 1 个、正文显示源码的空等级体系提示，cache 命中后 requests=[]、page errors=[]。仅确认实际组件、数据形状和定位可运行；暂停因果用例等待独立补审后由主代理运行，不冒充行为 red/green。

Code review 追加 TDD（2026-10-14）：新增真实共享 Menu 的 caller `details.cancel()` 用例，确认真正 open 事件到达 caller 且取消后 Popup 不打开；增加真实 DropdownMenuSub 的 controlled 与 defaultOpen 两分支，controlled caller 保留旧 true、不接受自动 false，而 defaultOpen 始终为 true，均在父 Popup 卸载/重新挂载后验证旧子层 intent 不复活，新 Subtrigger hover 才可打开。直接调用 Shell.hide，无 outside-click/Escape 清场；首 rAF 父/子 Portal 均不可交互。追加三用例在生产取消/Sub修复前独立准入并保存真实 red，新 label 保留先后证据；不把已修后重跑虚构为 red。

Tooltip 实证追加 TDD（2026-10-14）：独立 reviewer 已用真实 Chrome 证明，pointer/client点不变时 drawer 重返原位置仍会发 trusted pointerenter/mouseenter（movement=0），并让旧 Tooltip 复活。新增 stationary pointer 用例保留原 mouse-away/new-hover 用例：真实 hover→Shell callback hide→不移动/点击/按键→callback toggle→1200ms 后旧提示仍关闭；随后在同一 trigger 内真正移动 2 CSS px，必须可打开新提示，防止只因 Base UI move:false 丢失下一次实际 hover 能力。此用例在 Tooltip 专属输入 gate 修改前准入并保存新 red；`isTrusted` 或 enter 时间戳本身不能证明新用户输入。

追加 TDD 实际结果（2026-10-14）：`red-03/popup-review.tap` 为共享 caller cancel 与 controlled/defaultOpen Submenu 的 3 tests / 0 pass / 3 fail；`red-04/tooltip-stationary.tap` 为真实静止指针复活的 1 test / 0 pass / 1 fail，均在对应生产修订前运行，page errors 均空。修订后 `green-03/popup.tap` 全部 11 popup tests / 11 pass / 0 fail（该次 Node 默认 spec reporter，文件扩展名不表示 TAP 格式），覆盖新增取消、子层重挂载及静止→同 trigger 实际 2px 新移动。Tooltip 对暂停后 layout enter 的真实 Base UI hover details 延后提交；只有实际变化坐标的 pointermove 命中同一仍 connected/可见/non-inert 的 trigger 才提交原对象一次，保留其真实 event 与 isCanceled getter，caller 取消后不更新打开状态。不把真实输入事件伪装成新的 Base UI details；pointer press/click 不重放旧 hover，键盘只在当前输入 task 内的实际 trigger focus 路径授权。此结果仅为浮层专项，逐帧/完整组合、独立 code review 与实际 Windows 尚按主代理证据验收。

首可见准备补充（2026-10-14）：`geometry-01` 真实跨断点原用例首可见 Tab 宽为 27、完整终态为 55，推动 caption ready 握手；修订后 `geometry-02` 原双向断点用例 2/2 pass。独立审核追加真实长 title seed 与初始未挂载同 task 三次已注册 view.content 开/关/开两用例，`red-05/caption-preparation.tap` 真实 1 pass / 1 fail：长标题当前场景收敛通过，不把猜测振荡写作已证明根因，不更改 overflow 公式；初始快速反向在 1920px 首可见 V=12.59375、W=749.609375，而完整终态 W=749.234375，原 0.35px 断言真实失败。保留未完成首次注册准备事实后 `geometry-03` 上述两用例及原双向断点 4/4 pass，所有首可见/控件几何判据不变。

Restore 补充（2026-10-14）：`geometry-01` 原 CD-04 的真实 25% 目标被改成 24.941%；主代理 `restore-diagnostic-02/report.json` 不在期间调用 read 或强制 layout，仅被动记录 style，六次中第六次复现 owner 先写 25/75/0、库随后晚写 24.941/75.059/0。不放宽 25% oracle。独立准入 scoped restore pin/meta 握手后，CD-04 末尾追加实际 pointer 命中 separator 并拖动 40px、等待确认新偏好保留，证明注册保护移交真正用户 resize；此 manual 追加为修订后的回归，不冒充先修前 red。

Restore 手动分栏结果（2026-10-14）：`restore-green-01/02` 是新增 1px border DOM contains 定位失败，原精确比例阶段通过；独立核 vendor 的 global expanded hitRegion 后，维持实际 client 中心、同 Group/non-inert 命中、真实 hover/active 状态，再发送实际 down/move40/up。`restore-green-03` 及强化实际 DOM 的 `restore-pointer-red-01` 均证明手势真正执行但 Group 仍为 25、319.5px，因结束时才报告 user meta 的 guard 过晚移交。已准入在所有 restore/repin 写入前检查本 Group direct separator 的真实 active 状态，`restore-green-04` 精确比例、实际 Group 增量、新偏好及 240ms 不回滚全通过。定位失败与真实产品失败分别保留，不改原比例精度。

实际恢复手势结果（2026-10-14）：`green-04/drawer-suite.tap` 完整 61 tests / 60 pass / 1 fail，全部旧 33 通过，唯一原快速换向终态偏差的根因未被六次 `reversal-diagnostic-01/report.json` 正常双 click/closed 轨迹复现，不能称已确认或忽略原用例。独立追加实际 held pointer：保持原首可见/逐帧几何断言，记录真实 trusted down/up/click 的 target、client 点、DOM rect、moving phase、non-inert；实际按住 80ms 不动，按钮移动超过半宽，手势仍应由该按钮接收并展开。`red-06` 初稿坐标跨多次 RPC 后 down 已未命中，只作 setup 诊断；独立准入真实 driver `locator.click(force:true,delay:80)` 在 closing 后段采新鲜中心避免 stable 等待，`red-07` 则 down 真正命中、同点和位移均成立，up 失去按钮，是真实 capture 根因。仅 caption 增加 primary mouse/button0 pointer capture 后 `pointer-green-01` 原 instant 与新 held 两用例 2/2 pass，原 instant 用例没有删除/弱化。正式新增数量为 29（main 18＋popup 11），最终组合 62（旧相关 33＋新 29）；全仓与 native 另验。

独立用例审核后先在未修复生产代码执行 CD-01 的完整逐帧测量以确认根因 red，再执行其余用例收集行为基线。实现后专项全过、独立 code review、TypeScript、活动 unit/integration/browser、UI/desktop 构建与包检查按主方案顺序运行。既有 39 fail/1 cancel/2 skip core 基线与本轮新增失败逐标题比对，不将已有失败或未执行计为通过。浏览器隔离证据、实际 Windows 证据、原型证据分别记账。
