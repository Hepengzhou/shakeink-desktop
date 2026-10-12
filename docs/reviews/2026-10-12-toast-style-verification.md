# 顶部消息框实现与测试总结

日期：2026-10-12。用户已批准第一版 HTML 并授权继续。本轮顶部消息框修改已实现，47 项具名浏览器专项测试、UI构建及构建内TypeScript检查通过；真实 Windows Electron 最终完成14个截图状态和14条交互检查。没有执行全量测试。验证过程中首次剪贴板还原失败，原内容未恢复；该事故不因后续成功重跑而撤销。

## 按要求交付的产物

| 顺序 | 产物与状态 |
| --- | --- |
| 1 调研 | [调研文档](2026-10-12-toast-style-research.md)，确认paper/ink误传Sonner造成类型背景变量失效 |
| 2 产品设计 | [产品设计](2026-10-12-toast-style-product-design.md)，两主题实色卡片与不同类型的彩色图标 |
| 3 UI审核稿 | [HTML第一版](../../design/toast-style/index.html)，用户明确批准；bundle和原预览图冻结保存 |
| 4 代码实现 | [Toaster组件](../../src/components/ui/sonner.tsx)与[桌面样式](../../src/app/desktop.css)；[技术方案](2026-10-12-toast-style-plan.md)、[方案审核](2026-10-12-toast-style-plan-review.md)、[代码审核](2026-10-12-toast-style-code-review.md) |
| 5 测试 | [专项用例](2026-10-12-toast-style-test-cases.md)、[用例审核](2026-10-12-toast-style-test-review.md)、[浏览器测试源码](../../tests/browser/toast-appearance.test.ts)、[Windows脚本](../../scripts/smoke-toast-style.mjs) |
| 6 总结 | 本文与两份实施台账的toastAppearanceRevision条目 |

## 实现结果

只修改两个产品文件。组件把paper/ink映射为light/dark，保留合法显式theme；颜色令牌直接绑定最终data-sonner-theme，避免主题覆盖不一致。卡片为宣纸`#fcf8ee`／玄墨`#211c19`实色背景，12px圆角、420px标准宽度、细描边与轻投影。提示蓝、成功绿、警告琥珀、错误红，加载灰蓝；不同类型保留原Lucide形状。正文和说明分层、长文自然换行，长按钮最大宽度受卡片限制。

专属CSS只命中普通styled通知，custom/unstyled按真实原Sonner基线保留。默认top-center离44 DIP标题区底部16px；单条其它position以及调用方offset/mobileOffset不被标题区默认值污染。保留class/style/icons/toastOptions合并、action/cancel/closeButton、单条样式、真实计时、加载/promise同ID更新、队列和键盘热键；卡片与按钮均有可见焦点和no-drag。

Providers、DesktopApp、恢复界面、业务通知调用、工作台原React组件和上游没有修改。设计示例、测试脚本及本地探针没有进入正式工作台。

## 专项测试与构建

最终执行Node24 `--import tsx --test --test-reporter=tap --test-concurrency=1 tests/browser/toast-appearance.test.ts`，[green.tap](../evidence/toast-style/green.tap)记录47/47通过，0失败、跳过和取消。夹具按真实Providers启用richColors，并在对齐后重跑同一具名文件通过。覆盖两主题六类消息的真实DOM/CSS、图标颜色与形状、文字和图标对比度、长文和长按钮、320/390/560/600/601px、caption zoom计算、主题覆盖/切换、属性/自定义通知兼容、计时及悬停/热键暂停、加载/promise和堆叠。浏览器纯通知输入是隔离夹具，不冒充真实数据库或平台业务。

TDD记录：[red.tap](../evidence/toast-style/red.tap)为旧产品45例中39失败、6通过；其中两条热键焦点断言误把Sonner的ol焦点当成li，另一条非居中默认offset误记32px而本地版本为24px，这三条夹具问题已按实际Sonner源码修正，不算产品红灯。其余失败为旧映射和样式差异。首轮更早的动画等待失败也不作为产品证明。独立审核发现长操作文案风险后，额外[long-action-red.tap](../evidence/toast-style/long-action-red.tap)在真实组件320px窗口复现溢出；增加`max-width:100%`后，最终47例全部通过。加载旋转尺寸采用计算宽度而非旋转后的外接矩形；custom描述颜色与真实原Sonner暗色基线比较，没有为通过测试修改既有库行为。

Node24执行 `node_modules/next/dist/bin/next build`，[构建日志](../evidence/toast-style/build-ui.txt)确认编译、TypeScript和静态导出成功。未执行`npm test`、全部单元/集成/浏览器通配用例、全量回归或打包测试。产品实现没有新增测试专用API或HTTP服务。

## 真实 Windows Electron 结果

[windows-electron.json](../evidence/toast-style/windows-electron.json)和[执行日志](../evidence/toast-style/windows-electron.txt)记录本机win32、Electron44.6.0、sandbox=true；每主题独立临时目录，真实VersionedStore/DraftJournal准备完整未匹配autosave、零模型。首次零模型引导用原“暂不配置”入口关闭，真实Alt+T暂存通知供审核，没有伪造通知事件或CSS。

两主题均执行：真实启动“已保留1项待核对草稿”；点击原“查看草稿”打开原恢复界面，并确认“保留的编辑副本”及隔离正文；点击原“复制内容”经真实IPC产生绿色成功通知；通过原设置选择0.75/1/1.5/2原生zoom；通过原主题选择器切换正在显示的成功消息，前后DOM身份和文案一致。zoom2进入真实窄窗布局后通过原“作品目录”按钮回到账号入口。最终14个状态与14条交互通过，renderer页面错误和观察区间HTTP请求均为0。

| 原生zoom | CSS viewport | DPR | 消息CSS top | PNG尺寸 |
| --- | --- | --- | --- | --- |
| 0.75 | 1920×1200 | 1.125 | 74.6667px | 2160×1350 |
| 1 | 1440×900 | 1.5 | 60px | 2160×1350 |
| 1.5 | 960×600 | 2.25 | 45.3333px | 2160×1350 |
| 2 | 720×450 | 3 | 38px | 2160×1350 |

图像用Electron原生capturePage采集，实际尺寸核对viewport×DPR；没有把缩放后的Playwright裁切当完整截图。每个状态核对合法Sonner主题、背景精确实色、图标20px／底座32px、420px卡片／窗口上限、居中、边距和no-drag。主代理查看[宣纸启动](../evidence/toast-style/windows-paper-startup.png)、[玄墨启动](../evidence/toast-style/windows-ink-startup.png)、[原生200%](../evidence/toast-style/windows-paper-zoom-2.png)，表面不透底、类型色清楚、卡片及原操作可见。

真实Windows业务仅覆盖有正常入口的info和success。warning/loading/normal等类型由实际组件浏览器矩阵证明，不称其原生业务路径已执行。网络观察仅firstWindow返回至关闭的renderer；不证明main/worker启动全过程。macOS、安装包、物理输入法及其它业务未执行，不标记通过。

## 剪贴板事故与修正

首次真实复制验证后，脚本尝试把`clipboard.read()`返回的只读ClipboardItem直接交给write，运行时拒绝；关闭测试进程后内存中的旧快照失去，测试前内容未还原。执行系统`Clipboard.IsHistoryEnabled()`结果False，没有历史可用于自动恢复。该次复制将系统剪贴板替换为隔离草稿，已向用户说明。原内容未写入源码、日志、截图或证据；无法借此恢复它。

后续脚本按[Electron剪贴板API](https://www.electronjs.org/docs/latest/api/clipboard)的构造接口，在main内存逐项await types/getType并new ClipboardItem(payload)，复制前先原子回写预检可写性，再进行测试；finally还原并确保关闭进程。最终成功重跑的两主题都记录“Restored clipboard snapshot for current … run”。这只证明各重跑起始状态已还原，**不表示首次丢失的旧内容已经恢复**。最终JSON明确该scope，台账保留事故字段。

隔离准备脚本的CJS top-level-await错误、零模型引导／窄窗／关闭动画等待和首轮剪贴板还原异常属于验证脚本问题，均按真实运行修正；相关初始日志保留，不把它们计作产品通过或悄悄替代失败历史。
