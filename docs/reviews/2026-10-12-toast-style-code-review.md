# 顶部消息框独立代码审核

日期：2026-10-12。角色：独立子代理。最终结论：产品代码、47项浏览器专项及成功重跑的真实Windows专项证据审核通过，无产品代码阻断项。Windows重跑包含14个状态、14条交互，实色卡片、彩色图标、原草稿操作、四档原生zoom及现有消息主题切换均有实际证据。真实Windows首轮发生剪贴板还原失败，测试前内容至今未恢复；重跑还原成功仅对应重跑起始状态，不消除这次事故。禁止将首轮或任务整体剪贴板保护称为全部通过。

## 范围与方法

只读本轮 `sonner.tsx`／`desktop.css` diff、批准稿／方案／用例、`toast-appearance.test.ts`、seed／Windows 专项脚本和本轮证据，必要时核对本地 Sonner、Electron 类型及原恢复路径。只写本审核文档，没有修改产品、测试或其他人的文件，没有运行全量测试。

审核中尝试一个只读、无输出文件的合成 Sonner DOM／真实 CSS 窄窗探针；Chrome 启动被当前 sandbox 以 `spawn EPERM` 阻止，探针未执行成功，未作为产品失败／通过证据。长按钮问题随后由主代理的真实组件具名用例复现并修正；本审核核对其实际 TAP，不冒称独立执行了该测试。

## 产品代码复核

- 包装组件将 paper／ink 映射为 light／dark，system 使用 resolvedTheme，未知应用主题回退 light，合法显式 theme 优先。专属颜色令牌按最终 `data-sonner-theme` 绑定，显式 dark 在 paper 页面也获得正确暖黑卡片。没有改 Providers／业务调用或引入设计页示例。
- 纸色／墨色卡片背景为批准的 alpha 1 色；四类通知以不同颜色和原 Lucide 形状表达类型。描述规则与所有子节点外观选择器带专属类和 `[data-styled=true]`，优先级高于 Sonner 后注入的 richColors inherit。custom／unstyled 未被卡片规则强制覆盖。
- 全局容器类、调用方类、icons、style 和 toastOptions.classNames 按接口合并；toast 默认类与调用方 toast 类同时保留。单条消息类及内联 style 由原 Sonner 合并，实际测试包含 caller／single toast/title、局部图标、内联边宽和调用方 token。duration、action、cancel、closeButton 继续经原接口工作，默认未新增关闭按钮。
- 标题区位置使用独立 `--desktop-toast-*` 变量及 top-center 属性选择器，不改 Sonner 公共 offset 变量。显式普通／mobile 偏移与单条 top-left 均有实际浏览器验证；宽度与600px临界规则没有 Sonner mobile 二次扣距。
- 卡片没有覆盖 Sonner 的 transform、opacity、堆叠或 mounted 状态，也未添加固定高度和业务计时。focus-visible、no-drag 与减少动态效果规则只服务消息外观；正常消息弹出不抢编辑输入焦点。

## 审核发现与关闭证据

### R1：长操作文案在窄窗越出卡片（P2，已关闭）

初始 `desktop.css` 按钮规则使用 flex-shrink:0，但没有最大宽度。原窄窗测试只有“查看草稿”短标签，不能覆盖产品设计承诺的长操作文案。主代理补充320px长标签的真实组件用例；`long-action-red.tap` 明确失败于 `actual.button.rect.right <= actual.rect.right`，确认实际溢出。

当前按钮增加 `max-width:100%`，保留自然换行与完整文字。最终 `green.tap` 中该用例通过，严格检查按钮左右边界、高度增加、完整标签和页面无横向溢出；同一具名文件47项全部通过。无需修改已批准设计视觉方向。

### R2：seed 未匹配编辑副本的前置状态不准确（验证脚本，已关闭）

初版 seed 关闭 restoreSession，且 autosave 内缺少 status／paused／failed／inFlight／latest；实际会进入关闭自动恢复的保留路径，不能按方案称为合法未匹配编辑副本。当前 seed 使用 restoreSession=true 和完整 autosave 快照、UUID、有效时间，并经真实 DraftJournal.persist 写入。Windows 脚本还检查恢复界面“保留的编辑副本”，源代码路径与拟记录证据一致。这里只确认脚本前置正确，实际 Windows 结果待执行。

### R3：原生主题切换与复制可能采样旧通知（验证脚本，已关闭）

初版复制只等待任意 success，主题切换只检查原节点 isConnected，随后采样另一个 first success，可能误将旧通知或其它节点作为目标。当前 copyDraft 保存前一 success 节点，等待新 success 节点出现；主题切换保存当前原节点与文本，检查未removed、opacity=1、文本保持且它就是采样目标。脚本新增实际合法主题、20／32px 图标、420px／窄窗宽度断言，原生截图记录与断言对应。

### R4：剪贴板关闭流程与只读 ClipboardItem 限制（验证脚本，修正后重跑通过；首轮损失未解决）

初审仅核对 finally 流程与 Electron 类型声明，未验证 `clipboard.read()` 返回项能否直接 `write()`，此前将该项关闭只表示静态退出路径复核。主代理在真实 Electron44 首轮运行时发现返回的 ClipboardItem 是只读对象，第一次复制后直接回写失败；finally 随后关闭应用，使只存在于主进程内存的原项无法继续取回。主代理已向用户明确报告：系统剪贴板历史未启用，测试前内容未恢复。首轮不得记录 clipboardRestored 或该测试全部通过，后续重跑还原当前内容也不能消除这次未恢复事实。

当前脚本在任何测试复制之前 await 每个 item.types／getType，按本地 `electron.d.ts:7077–7100` 支持的完整 MIME payload 创建新的 `ClipboardItem` 可写副本，再仅在主进程内存保存。所有读取与副本准备完成后才设置 clipboardCaptured 和调用真实复制。未知格式读取或构造失败会在修改系统剪贴板前停止；空剪贴板用 clear 还原，嵌套 finally 保证还原抛错时仍关闭应用。没有原内容进入 renderer、日志或证据。

当前脚本已在副本准备后、首次测试复制前对非空副本执行原子 `clipboard.write(copies)` 预检；失败时还没有写入测试内容，避免把构造成功误当成可恢复性的运行验证。已独立读取 `windows-clipboard-incident.txt`，实际错误明确为 `clipboard.write cannot accept a ClipboardItem returned from clipboard.read() — construct a new ClipboardItem to write.`，不含原内容。成功重跑日志分别记录paper与ink的还原成功，最终JSON的clipboardRestorationScope明确仅对应该次重跑开始时的当前剪贴板，并保留首轮测试前内容未恢复事实。修正后的当前状态还原流程有运行证明，首轮丢失的内容仍未找回。

### R5：原生2倍缩放的设置入口与截图范围（验证脚本，修正后重跑通过）

首轮 paper 已执行启动信息、真实恢复／复制及四个zoom外观检查，但随后 W04 在2倍缩放的真实窄窗工作台找不到“账号菜单”。已读取 `windows-failure.json`：Electron44.6.0、win32、sandbox=true，失败为账号菜单点击超时；W04及整轮不能记通过。

当前 settings 在必要时点击真实 `DashboardShell.tsx:473` 的“作品目录”按钮切回sidebar，再从原账号菜单打开设置。这是产品已有控件路径，没有注入事件或模拟平台。截图改为原生 `webContents.capturePage()`，写入PNG后检查像素尺寸等于实际 innerWidth／innerHeight×devicePixelRatio；样式断言同步验证居中与窗口边距，避免Playwright在原生zoom2下截取范围不完整仍提交证据。W04在采样之后再次核对原节点与文案身份，覆盖等待／截图期间的计时移除间隙。重跑两主题W04均执行通过，完整截图与JSON已独立复核；首轮失败仍留作过程记录，不能以最终结果改写。

## 测试可信度

- 具名测试导入真实产品 Toaster、Sonner、React、next-themes、Lucide 和 globals／desktop CSS，独立浏览器页面隔离输入；没有把拟议 CSS 注入产品证明。最终fixture的 JSX Component 已显式传 `richColors`，与真实 `providers.tsx:23` 相同，原Sonner基线也使用该配置。背景颜色、字体、图标尺寸／颜色／类、描述色、按钮焦点与回调等有严格 DOM 断言，因此最终结果覆盖真实richColors的卡片、描述inherit及类型样式竞争，而非只在默认false下通过。
- 同 ID loading／promise、dismiss、堆叠及真实 Alt+T／Escape 暂停通过原 Sonner 执行。稳定等待消息 mounted 与有限动画后交互；悬停／热键跨越原duration，恢复交互后实际等待移除，不只验证配置字段。
- 初始 `red.tap` 是45项、6通过／39失败的原始记录。其中两项 TST-04 错将热键实际焦点 ol 当成 li，是夹具错误，不能算产品红灯。其余映射／外观等实质失败仍构成有效 TDD 红灯；主代理修正 ol 焦点断言，新增全局duration及长按钮案例后得到最终47项全通过。
- 减少动态效果断言观察实际加载SVG animation；custom／unstyled描述与同版本原Sonner合法dark基线对照，避免错误地要求不存在的原继承行为。加载SVG尺寸用 computed width，避免旋转后的bounding box造成假失败。
- 浏览器caption变量矩阵只证明CSS布局；脚本真实Windows通过设置控件改zoom、核对bootstrap／webContents.getZoomFactor／caption变量后才采样。没有用fixture或平台皮肤切换宣称真实平台通过。

## 最终真实证据独立复核

本阶段只读最终JSON、日志、源码与截图，执行SHA256与PNG元数据核对，没有再运行或扩大测试。

- 最终 `green.tap`：fixture显式richColors对齐真实Providers后，同一具名文件再次得到47项、47通过、0失败／跳过／取消（完整TAP duration 60164.9327ms）。独立核对仅该fixture配置变化和最终TAP，没有新增或执行测试。`build-ui.txt`：Next UI编译成功、集成TypeScript完成、离线静态页面生成完成；产品源码未因fixture对齐而变化。构建与类型检查分别作为构建证据，不增加产品测试统计。
- `windows-electron.txt` 与JSON对应：两次独立主题根、真实Electron44.6.0／win32／sandbox=true／零模型；每主题启动、原草稿查看与复制、0.75／1／1.5／2原生zoom、既有通知主题切换，共14个状态和14条交互。每档zoom经真实设置选择器触发，bootstrap值、webContents.getZoomFactor及caption变量实际检查一致。
- 独立重新计算JSON所列全部13个源文件／main／preload／out HTML／构建CSS的SHA256，13/13匹配当前文件。14/14截图实际PNG元数据与JSON匹配；所有截图为2160×1350，均对应真实viewport×dpr，而非原生zoom2下裁切的720px范围。
- 独立核算14条记录全部居中、顶部距离符合44/zoom+16。两主题启动top=60、width=420、蓝图标32px底座／20pxSVG且按钮no-drag；成功消息为对应绿图标。zoom2时viewport=720×450、dpr=3、top=38、left=150、right=570，具有完整原生截图证据。
- 实际查看paper／ink启动及paper／ink zoom2四张截图：启动卡片有不透明暖白／暖黑表面、蓝色圆形提示、完整“查看草稿”按钮；zoom2原恢复界面显示隔离样例与“保留的编辑副本”，通知绿色圆形勾与实色表面保持居中且不裁切。截图没有把设计示例页面冒作真实工作台。
- 最新脚本的同节点／同文案主题切换断言在截图前后均执行，两个主题方向均有成功记录。renderer page errors与监测期HTTP请求均为空；监测期明确仅从firstWindow返回开始，不扩张为main／worker全启动网络验收。
- ClipboardItem副本预检与finally还原在成功重跑中完成；JSON及事故日志明确保留首轮原内容未恢复事实。只认定成功重跑开始时的当前剪贴板还原成功。

结论可以进入本目标总结与台账更新，无需再跑或扩大测试。原生warning／loading／normal业务、macOS、安装包、物理键盘／输入法及全量回归均未执行，不记为通过。首轮剪贴板内容损失需继续保留在最终总结，不被任何通过计数覆盖。
