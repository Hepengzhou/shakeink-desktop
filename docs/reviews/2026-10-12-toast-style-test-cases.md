# 顶部消息框专项测试用例

日期：2026-10-12。第一版 UI 已获用户批准，技术方案已通过独立审核。测试只针对本轮消息框，使用明确文件名执行，禁止全量测试。

## 浏览器组件用例

新增 `tests/browser/toast-appearance.test.ts`，导入实际 Toaster／Sonner／React／next-themes／Lucide，编译实际 globals.css+desktop.css。使用独立浏览器 context、隔离页面和 synthetic 通知输入；没有桌面 IPC、数据库、模型、Key、产品 UI 冒用或 HTTP 监听服务。全程检查页面异常。fixture 对照探针只证明 CSS 作用域，不是其它组件业务验收。

| ID | 参数与实际验证 |
| --- | --- |
| TST-01 | 宣纸／玄墨×info/success/warning/error/loading/normal 共12例：最终 data-sonner-theme 合法；卡片背景严格匹配 alpha1 的批准色、12px圆角、420px宽、14/22正文；图标20px和32px底座、四类形状各异、五类颜色严格匹配且对比度≥3；一般消息不造图标；文字对比度≥4.5，no-drag且不抢焦点 |
| TST-02 | 两主题长消息与description/action：正文及说明不截断；说明严格匹配批准次级颜色，对比度≥4.5；按钮≥32px、实色、完整文案、hover/focus-visible；真实Tab和卡片热键焦点；点击回调恰好一次并沿用Sonner关闭行为 |
| TST-03 | 两主题 loading→success 同ID更新和真实 promise 更新：DOM只保留一条，图标及颜色更新；dismiss确实移除；不重置业务请求或插入样例 |
| TST-04 | 两主题队列：三条保持顺序与每类型实色，悬停展开三条，不覆盖Sonner transform和可见性；按duration自动关闭、悬停跨过duration仍在、移开后关闭 |
| TST-05 | 两主题×320/390/560/600/601px：最大宽420、左右≥16、居中；长文本和按钮在卡片内，没有横向溢出，600临界不二次扣距 |
| TST-06 | 两主题×0.75/1/1.5/2 caption zoom 变量：top-center距离=44/zoom+16；浏览器只验证CSS计算，不冒充原生zoom |
| TST-07 | 现有消息主题切换：真实next-themes setTheme后消息原ID和文案保持，背景/图标随light/dark变化；显式Sonner dark/light/system优先且令牌以最终data-theme匹配，未知应用主题回退light |
| TST-08 | 调用参数兼容：className/style/icons、toastOptions的duration与classNames组合保留；全局样式类仍在；不新增默认关闭按钮；显式action/cancel/closeButton回调与关闭保留；自定义offset/mobileOffset及非top-center位置不被标题区默认值污染 |
| TST-09 | custom/unstyled消息保留自身表面和子节点颜色；普通popovers/正文CSS探针不受消息样式影响；减少动态效果时取消加载装饰旋转，状态文案仍在 |

编写完用例先对旧产品源码运行，确认背景/图标/映射或规格断言造成实质失败；若存在夹具错误先修正夹具再记录有效红灯。实现后重跑同一具名文件，保存 TAP。无需为纯CSS复制内容编写镜像单元测试；真正浏览器DOM和生命周期断言提供本轮所需证据。

## 真实 Windows Electron 用例

新增 `scripts/smoke-toast-style.mjs`（原生专项验证）及 `scripts/seed-toast-style-fixture.ts`（隔离前置）。UI构建后启动本机真实Electron，使用真实main/preload/原React工作台，不注入CSS、不换平台皮肤、不mock IPC或产品接口。

| ID | 实际路径与断言 |
| --- | --- |
| TST-W01 | 两主题分别创建新临时目录，真实VersionedStore写入已完成引导/零模型设置，真实DraftJournal保存一个synthetic未匹配autosave。bootstrap确认当前根为该目录、models0。真实启动显示“已保留1项待核对草稿”，检查实色、蓝图标、按钮和顶部安全距离，并截图 |
| TST-W02 | 真鼠标点击该通知“查看草稿”，原恢复界面打开，包含预期隔离草稿，原消息按Sonner关闭；按钮/消息容器no-drag。点击原“复制内容”经真实剪贴板IPC，成功通知为实色绿图标；原剪贴板ClipboardItems只在main内存保存并在finally完整还原，无原内容进入证据 |
| TST-W03 | 从实际账户菜单打开设置、外观；实际选择界面缩放0.75/1/1.5/2，检查bootstrap/webContents zoomFactor和caption变量一致。经原“查看草稿”入口复制触发成功消息，验证其CSS顶部距离=44/zoom+16，并截图。此路径是原生zoom与IPC，不是浏览器CSS模拟 |
| TST-W04 | 一条正在显示的成功消息保留焦点暂停，真实外观主题选择器切换后其表面/颜色正确，消息ID/文案没有额外变化；若真实UI焦点/计时难以稳定保留，不代造事件，分别检查实际两主题启动与浏览器同ID主题切换，并据实记录范围 |

监测firstWindow返回至结束的renderer异常/HTTP请求；设置renderer离线，确认验证流程仅使用本地协议。保存每条路径、主题、zoom、计算样式、截图、runtime与源文件/构建CSS哈希。实际无法触发的warning/loading/normal业务路径只注明浏览器真实组件已验证，不记Windows通过。macOS、安装包、物理输入法和本轮以外业务均不执行。

## 执行命令与记录

具名组件测试：Node24 `--import tsx --test --test-concurrency=1 tests/browser/toast-appearance.test.ts`，`XAANINK_TEST_CHROMIUM` 指向本地Chrome。保留红灯和绿灯记录，构建用 `node_modules/next/dist/bin/next build`；真实Electron用 Node24 `--import tsx scripts/smoke-toast-style.mjs`。不存在全量测试命令或通配测试路径。

证据位于 `docs/evidence/toast-style/`。用例覆盖完整性以最终具名test和实际JSON为准，不把矩阵引用数、HTML设计检查或单次启动冒烟计作业务通过。完成后做独立代码审核，只更新本轮台账。
