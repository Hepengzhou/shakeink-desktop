# 右侧内容抽屉正式测试用例

日期：2026-10-13（Asia/Shanghai）。依据已批准 HTML 和通过独立审核的正式方案。此文件定义待执行用例，不能视为通过记录；red/green 命令、结果和真实系统证据由主代理另行记录。

## 自动化外壳与证据边界

新增 `tests/helpers/content-drawer-fixture.ts`，实际运行 DashboardShell、useSidebarDrawer、react-resizable-panels 的 Group/Panel、SidebarTree、ContentTabs、tabs/desktop stores、workspace adapter、命令注册和共享 UI primitives。只隔离 Chat 的 AI body 和与抽屉无关的业务 body；Chat caption 从当前真实源码提取。ContentTabs proxy 原样渲染真实组件并捕获真实 Shell 回调，供 inert 动画期间模拟用户已发出的全屏命令；不增加任何生产测试后门、不替换动画 hook。

隔离 body 的正文自然换行，不设固定业务宽度或 nowrap。包含两段长中英文、两列字段、React 状态 input、可滚动区域、共享 uncontrolled/controlled DropdownMenu、Select、Tooltip 和真实 Dialog（内部也有 input、Select）。其输入实例不等同于真实 Monaco；Monaco 实例/草稿/选区/撤销、29 类真实业务、PGlite/IPC、原生标题栏和离线安装包仍由实际 Windows 验证覆盖。

每个运动段从动作前启动 requestAnimationFrame，连续采集完整 420/560ms 动作及终态，而非只取 100ms 单帧。每帧记录实际裁切 V、真实内层 W/H、transform、正文 Range.getClientRects 文字行框、字段/按钮/body 相对内层几何、真实 ContentTabs caption 几何/padding/scale、phase/mode/pane/inert。移动段从 phase 首次 moving 或真实 V 首次变化开始，覆盖至最后非终态 V 或最后 moving phase；不得只按产品 phase 过滤，提前把 phase 改 open 的真实移动帧仍需受检，V 尚未到终态时必须保持 opening/closing。动作前 preflight 和已到终态且 phase settled 的合法最终 reflow 排除。移动段必须有至少 8 个帧样本（reduced 除外），所有移动帧与动作完整形态比较，容差 0.35 CSS px，右向平移必须满足 max(W−V,0)，并验证实际屏幕右锚。首次打开在注册后首个可见帧即要求完整 W/H，无零宽或默认宽闪现；反向沿用该次动作基准。

旧实现尚无 content-drawer-inner 时，采样真实 .content-tabs，仍运行完整外壳及正文。因此根因 red 必须由实际宽度/文字行框变化触发；fixture 编译错误、缺 wrapper、环境启动失败不可视为 red。调试辅助属性只在隔离 body，生产定位采用方案里的 .content-drawer-inner、.content-drawer-viewport 和 data-content-phase。

## CD-01–07

| 编号 | 操作与覆盖 | 自动化判据 |
| --- | --- | --- |
| CD-01 | 首次 Tab 激活打开；正常关闭；重复打开；收起中反向及展开中反向；ink/paper | 首帧起 W/H、文字行数/每行框、两列字段及 caption 相对几何不变，右移公式逐帧成立；首开无默认宽闪现；动作中 inert/aria-hidden；终态 open/closed；保留 mounted 内容，隐藏可见宽 0，无内容 separator 占位；恢复入口可以反向当前 intent。 |
| CD-02 | 左右同动；opening 中 fullscreen 替换；全屏退出；hidden 和 closing fullscreen 忽略 | 整个相关动作段保持同一 W/H 与行框；左右最新命令及合法百分比终态一致；full 不提前解冻；隐藏/closing 无幽灵占位、chat 不被误隐藏；workspace read 保存终态目标和完整宽偏好，不保存中间动画尺寸。 |
| CD-03 | 900→899 和 899→900，动作期间同时改宽高；600/899 窄屏打开、返回对话、再打开、真正隐藏 | 完成前仍为动作开始 mode、W/H/行框不变，完成后落实最新模式/命令；窄屏内容为全宽右覆盖、chat 保留；普通返回 chat 只关闭覆盖，contentVisible=true、桌面宽偏好保留；真正隐藏置 false/pane=chat；新动作按最新窗口尺寸重新测量。 |
| CD-04 | opening/closing/并行动作中 restore hidden/open；reduced motion | restore 立即替换旧 generation、清除冻结和延迟焦点，超过旧动作时长后仍保持输入新布局；既有 mounted 实例在 hidden restore 后保留；减动直接终态、无中间 V、焦点策略仍正确。 |
| CD-05 | 关闭/反向/重开后业务实例、React 草稿/选区、scroll；内容焦点关闭→恢复；用户主动外移焦点；自动 Tab 激活 | 同一实例 ID、input 值/selectionStart/End/scrollTop 保留；从内容退出焦点移到恢复入口；仅恢复流程仍拥有焦点时回原目标；外部主动焦点和 Dialog 焦点不被抢；Tab 激活只展开。真实 Monaco 另验。 |
| CD-06 | 内容 owned uncontrolled 和 controlled DropdownMenu/Select/Tooltip；外部 popup；业务 Dialog | owned popup 在首次动作帧暂停/隐藏/inert，退出动画也不留下可操作层；重开不自动复活 controlled/open 状态，新的用户操作可再开；内容外 popup 保持；业务 Dialog 挂载/input/其内部 Select/保存保持可用；不通过全局 Escape 清除所有浮层。 |
| CD-07 | 内容编辑 command target 记录后隐藏/动作/恢复；隐藏保活 editor 候选；真实 caption app-region | inert/hidden 祖先内 useDesktopCommands 目标不得 enabled/execute，desktopEditorTarget 返回 null；恢复后重新可用。动画 caption app-region 必须 initial，终态恢复 drag/no-drag（Browser 只验 CSS；实际 HWND 另验）。 |

## 额外专项和全量验收

真实 Windows Electron /目录包验收需覆盖：正文、表单和长标题连续逐帧；实际 MarkdownEditor Monaco model/editor 实例、草稿、选区、撤销及滚动；两主题；固定 zoom 0.75/1/1.5 caption 安全区；动作中主动 zoom 的 CSS 几何/冻结 caption 值与整窗物理缩放边界；有 Tab/无 Tab 两条 caption；Tab 拖拽暂停无提交、取消旧 focus rAF；真实 ItemLevelPicker 直接 Popover；手动拖动分栏；目标持久化冷启动；真实 Windows HWND caption/no-drag 命中；无模型、无 HTTP 监听、离线冷启。未执行项不能标通过，平台外观切换不能代替 macOS 真机。

实际 Windows 的用例矩阵另见 `docs/reviews/2026-10-13-content-drawer-native-cases.md`；该矩阵亦属待执行定义，其逐帧/IPC/持久化/安装包结果由主代理据实记录。

独立用例审核后先在未修复生产代码执行 CD-01 的完整逐帧测量以确认根因 red，再执行其余用例收集行为基线。实现后专项全过、独立 code review、TypeScript、活动 unit/integration/browser、UI/desktop 构建与包检查按主方案顺序运行。既有 39 fail/1 cancel/2 skip core 基线与本轮新增失败逐标题比对，不将已有失败或未执行计为通过。浏览器隔离证据、实际 Windows 证据、原型证据分别记账。
