# 左导航最终执行证据独立事实审核

2026-10-14，审核人 sidebar_design_review。只读审核另一执行者的最新 core/完整浏览器/明确范围浏览器/构建/Windows development-11 的实际报告、TAP、28组原始帧及截图。本人此前实施导航，由另一代理完成生产code review；本报告独审执行者事实与其验证媒介，不替代或自批导航代码。没有修改生产、测试或脚本，没有再次运行 Electron/完整回归，也没有拼接历史失败中的通过项。

**本次可达导航目标矩阵通过，本次 SN-12 真实 resize P1 可关闭，事实审核 blocking=0。全仓测试仍 failed，allAcceptance=false。** 最新开发版 Windows 可达验收不等同 NSIS、macOS、物理拖窗、IME或完整仓库验收；未执行项目和历史01–10失败保留。

## 最新回归与构建

本人核 TAP 最终统计与 JSON 逐项相同，失败标题数组相同，完整范围保持：

| 范围 | 实际结果 | 来源与边界 |
| --- | --- | --- |
| 完整 core，274文件 | 1977 tests，1936pass / 38fail / 1cancel / 2skip，exit1 | `regression/core.json/.tap`；独立时段完成，非budget中止；1358源前后SHA直接比较无差；newResidualFailureTitles=[]仍不是全绿 |
| 完整 Chrome，52文件 | 535 tests，516pass / 19fail / 0cancel / 0skip，exit1 | `regression/browser.json/.tap`；19标题均CD-，两项另一任务的content-drawer suite保留；1068输入源稳定 |
| 旧48＋本次measurement/resize，50文件 | 516/516pass，0fail/cancel/skip，exit0 | `regression/sidebar-scope-browser.json/.tap`；唯一排除恰为content-drawer.test.ts、content-drawer-popup.test.ts；errornull/changedSources=[]；不能代替全52失败 |
| 最新真实静态renderer＋desktop构建 | Next build exit0，desktop build exit0 | `green/build-navigation-resize-final.json`与UI/desktop log；19相关源前后稳定；不是打包/安装结果 |

900000并行预算中止的603顶层/29观察失败及counts={}、comparisonComplete=false四件原始归档保留。新完整独立core TAP中三条BDC06/BDC07和ROOT11-07的4个旧超时标题均实际ok；这只证明当前完整独立执行结果，不能反推旧失败一定由CPU引起。38fail/1cancel均如实保留，无新增残留标题不使全仓结果通过。

最新完整core结束17:40:39Z后，构建17:44:44Z开始、17:46:00Z完成，development-11于17:46:55Z开始，17:48:28Z完成。浏览器/范围回归也在该构建之前结束；不把core内部build-desktop副产物或并行构建中的浏览器旧证据当最终包。当前Source、built dist/.next/static/out 与真实exe另经下述核对。

## 单次真实 Windows development-11

`windows-development-11/report.json` SHA256 **af8261fc4327d68521c1f3c14e63dcc7c3d3cbec329062169565d5afdf13051d**，87 checks均passed；actual-summary.json和verification.md与原始报告一致。本次为开发版Electron，packaged=false，完整生产React＋真实隔离Workspaces/PGlite/IPC；fixture为公开合成2作品、8正式角色＋2伏笔角色、27章节，models0。首窗口后的renderer offline，mainListeningServers0，三次launch均纳观察，HTTP请求0/pageerrors0。实际输入来自CDP点击/键盘/滚轮；native命中另由真实HWND测量，不能称物理鼠标拖窗。

本人用Node24直接读取全部28 raw，独立重新定位每段首W>0且V>0 moving基线并逐帧复核，且逐个SHA匹配summary：

- 1107总采样、856moving；其中832从首positive起比较W、raw V−W、全部节点几何/样式/文本/渐隐；24个V0 setup保留，仍核导航/inner与全部节点identity/count，没有忽略首positive或迁移基线。
- 当前原容差geometry0.15/W0.05/translation0.1不变。独立最大子项几何差0.00006103515625px、W差0、translation差0.0102081298828125px、V超过W最大0；font/line/weight/nowrap/color/background/mask/text/overflow等非几何字段逐帧严格相同，issues=[]。
- `closing-across-899-breakpoint`原始34帧、26moving全部复核通过，完整W不跳且V≤W/raw等式成立，冻结wide到terminal按实际899切narrow。另实际opening中1800→1600及cross-back-wide、新28＋11 Chrome反向/倍数DPR首全帧证据分别保留，不能互称其他媒介通过。本次原Windows10一帧18px的P1因此有实际同场景严格通过证据可关闭；旧32帧失败不改。
- 35次native记录中33passed、2inconclusive明确不计。本人逐个核33条真实WM_NCHITTEST caption2/button1、PER_MONITOR_AWARE_V2/144DPI、before/after同phase、sameCaption/sameButton/clipPoint有效；原CSS点×真实zoom后client DIP及origin＋DPI后的screen point逐项一致。2次不稳定测量保留，随后限定moving重采成功，没有以settled命中替代moving。
- 真实窄窗899/760×600的renderer正为899/760×600，outer900/761×601；产品minimum760×580不变，符合原1DIP读回边界。580请求的历史夹紧失败不改，不能称Windows580短窗已通过。

真实空内容路径使用普通合法2Tab seed，经原UI关闭Sidebar/两Tab到0、等待Content卸载，再从Chat显示空Content。native-empty-Content-own-caption-and-hide明确captionOwner/buttonOwner均content、HT2/1；hidden泄漏测试caption/button均chat，键盘恢复入口实际归chat；open/close moving的泄漏caption为chat、固定右端native工具为content，前后保持同phase且HT2/1、全帧通过。正常UI的stable cold-empty-fullscreen分支不可达/未执行，DRAWER-07只有真实React/API浏览器分支证据；不能归入本次Windows成功。

10张截图的SHA均独立匹配summary。本人另目视ink-roles与empty-content-Chat-caption-hidden：真实角色跨作品分组、姓名后同色徽标、长名渐隐和空Content/Chat caption结果对应实际状态；其余8张仅核文件SHA/报告，不虚称本人全看。

## 源、构建物与冻结边界

本人再次读取31个相关源、351个built文件及真实 `node_modules/electron/dist/electron.exe` SHA，全部与本run记录相同；sourceHashes/sourceHashesAfter及bundleHashes/bundleHashesAfter逐键比较无差，exe前后与当前相同，versionStability与实际核对一致。核心修正源码如下：

| 源 | 当前SHA256 |
| --- | --- |
| useSidebarDrawer.ts | 0669ad294a2af055f14779c7806f9228fe90b04483673c90609f5f89bc790a7e |
| DashboardShell.tsx | d87086b5fc6f95a408f09b118559a82af701d2ff52b3796bf39cf8bc411acea8 |
| desktop.css | fad7ee11ec2668d22648af8f35f67e77aceada39e9362fb99cf86e1ce64b58f4 |
| scenario-lab.ts | a382f51d49c7db8f4c5c2b11f8e2698949784b3759a447a80c5597652d556e26 |
| verify-sidebar-navigation.mjs | 928aaff2cba4649709937c3bb4496ccb7475a0b57d054e003d688c561354fd0b |
| seed-sidebar-navigation.ts | 6e3bd32b5d11baf78ee63578009c2e245273b910e4e8d07603c5b567a4c5c30f |
| sidebar-native-hit-test.ps1 | 4daacb2a82c44d1b98df7abd13be769a87351ce1d64d563f081055dbae2cc08e |
| Electron exe | c61802364a1e34a5c39335a97c5cf2a8ab2ea04937e4d83378a65508a34cb826 |

原01–10失败、诊断与首red均保留，development-11整体结果不由旧partial拼接。事实门禁可支持本次导航/抽屉目标矩阵总结，但全仓core/browser失败和macOS、NSIS安装、物理鼠标拖窗、Windows IME、正常UI不可达empty-fullscreen仍须明确未达成/未执行；不得将allAcceptance改为true或宣称“全部测试通过”。
