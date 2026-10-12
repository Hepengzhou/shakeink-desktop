# AI 对话首屏正式接入验证

批准日期：2026-10-12；最终验证更新：2026-10-13（Asia/Shanghai）。正式接入与专项、Windows可观察范围已验证；仓库全量未全绿，未执行边界单列。

批准源为 v3.4 HTML，用户“UI 审核通过，可以继续”。依次完成技术方案/独立审核、测试用例/独立审核，之后才实现。独立实现仅新视觉/动画/资产范围，主代理接原业务组件；代码独立审核问题逐项修复。

TDD：新增 `chat-empty-state.test.ts` 在 Node 24.19.0 实施前因生产模块缺失 MODULE_NOT_FOUND 为 RED（0 pass，1 file fail）；动画单测同样先缺模块 RED，再8/8 GREEN。系统 Node20和沙箱spawn EPERM属于工具链尝试，不算有效红灯。专项纯函数、原hook导航共40/40 GREEN（含2个新导航错误所有权用例）。后续完整组件 CES-06b 先复现有效发送后旧导航错误仍在，再复现过早清理会把待确认请求拒发时的错误抹掉；最终清理位置在全部本地发送前置检查之后，两条路径同时通过。无模型不预选目录默认，门控早于建书/queue pop；外部候选动作意图入待确认队列，原问题和选卡保持；确认后焦点由原 BaseUI finalFocus 返回同一编辑器。

生产静态UI最终构建成功（Next16.2.10，包含完整TypeScript检查）；Electron主进程/preload/service构建成功。21公共PNG共7,254,059 bytes，与批准源逐字节一致；资源清单含尺寸/哈希。最终构建使用 Node24.21.0，Next16.2.10；构建发生在最终生产修复之后，实际运行 Electron44.6.0/Chromium152.0.7977.130。Windows记录绑定真实源文件与编译HTML哈希。

浏览器夹具直接运行完整真实 ChatPanel/useAgentChat/CreateNovelDialog/编辑器，受控合成API与目录仅用于组件契约；不证明供应商生成。Windows脚本运行真实编译后的Electron、本地API/PGlite与独立临时根，网络offline，截图检查双主题与窗口生命周期；不接触作者数据/Key。

## 已执行结果

| 范围 | 真实结果 | 证据 |
| --- | --- | --- |
| 新空态/动画与原导航 | 40/40通过 | 本轮专项命令与独立code-review复跑 |
| 最终专项（完整真实组件20项+空态/动画/导航40项） | 60/60通过，0失败/取消/跳过，55.37秒 | docs/evidence/chat-empty-state/final-scoped-budgeted.tap、code-review.md |
| 较早完整真实组件浏览器 | 19/19通过，最终新增CES-06b另包含于上行20项 | browser-results.md、browser-green.tap |
| 旧模型/快捷键夹具适配 | 17/17通过，所有原断言保留，真实shared query源码参与 | code-review.md 独立复跑 |
| 本轮受影响的标题/消息AST夹具 | 实施后旧rig 3失败，适配后5/5通过，原拖拽/消息/浮层断言保留 | drag-rig-red/green.tap |
| 原标题栏对齐串行复验 | 5/5通过，45组合原断言保留 | docs/evidence/chat-empty-state/caption-alignment-serial.tap |
| 原AI标题栏安全区串行复验 | 6/6通过，原断言保留 | docs/evidence/chat-empty-state/chat-caption-safe-area-serial.tap |
| Windows真实Electron | 双主题20组可观察检查通过，0渲染错误、0渲染HTTP请求、2次main listener快照均0 | windows-electron.json、paper/ink-welcome与short.png |
| 最终完整单元+集成 | 1946 tests：1903通过、40失败、1取消、2跳过；完整执行、退出1，509.28秒 | core-full-final.json/tap |
| DR65 inode精度夹具修复 | 原文件独立9/9；stat改bigint后保留全部原断言再9/9，0失败/取消/跳过，48.94秒 | data-root-directories-retry.tap、data-root-directories-bigint-green.tap |
| 完整浏览器文件覆盖 | 全部38文件的当前完整证据共360/360，0失败/取消/跳过；来源为前14文件+续跑24文件，其中仅用独立14项GREEN替换已修复的引导隔离夹具结果，并非新一次整组命令 | browser-final-file-coverage.json；原browser-full-combined.json的359/1保留 |

较早core为1902/41/1/2，包含本轮旧结构rig（DRAG-01/04）两失败；最终全量这两项均通过，仍有39个既有断言失败与1个既有取消，另出现DR65-01。DR65-01原fixture用Number stat读取超过安全整数范围的inode，期望39406496740159530恰是生产BigInt实际39406496740159527的舍入结果；两个历史同名失败也符合相同舍入。数据目录生产模块本轮无修改，原文件单独9/9通过说明该夹具问题随inode取值出现，不能当成这次全量已通过。只将该fixture stat改为bigint后完整原9项再次通过，最终全量失败记录仍保留。不能把专项修复算成又一次1946项全过。归属审计见同目录 regression-audit.md；没有弱化原断言或改无关业务源码。初次Node24.19全量为1895/48/1/2，包含已修复的真实query/捕获依赖rig；它最终完成，不能认定为启动器故障。

两次较早专项各58通过/2超时（失败位置漂移），保留 `final-component-navigation-green.tap` 和 `final-scoped-force-exit.tap` 原始记录；文件名不能作为通过依据。最终仅提高浏览器夹具启动/操作预算，未删除或弱化业务、几何、帧和草稿断言。`--test-force-exit` 在所有测试与 after hooks 完成后退出；通过结果不能据此证明无遗留句柄或动画监听器。清理验收以实际生命周期断言为准。

完整浏览器的前两次整组命令均30分钟超时且无总计，第三次43个ok后超过8分钟停滞，主代理中断后保存记录。逐文件第一轮在dialog-appearance的25个ok后收尾停滞且清理未确认，后23文件按保护规则未执行；该失败记录未覆写。经独立审核的原生清理helper只定位刚spawn的测试根：核对创建窗口与真实父PID，每层父子关系按持有句柄及创建时间验证，不安全时拒绝终止。合成进程实测3项通过（指定树清理、无关进程保留、错误创建窗口拒绝）。续跑从第15文件开始保留全部原断言，dialog-appearance实际25/25完整通过。上述不同进程的完整结果按相同生产指纹及每个当前测试指纹组合，不能称一次整组命令全绿。

续跑唯一LUI23-14真实断言失败在单独重跑仍复现。诊断副本保留原断言并实测残留对话框标题“选择主题”：旧lease夹具没有隔离HEAD已存在的自动引导。仅在其既有emptyChildren边界加入OnboardingController→null，保留真实DesktopApp/WorkLeasePendingDialog、原14条断言和旧事件/拒绝生命周期；不调用onExit，不伪造引导完成、模型或修复回复。原14项RED为13/1，GREEN为14/14，已通过独立增量复审；此fixture不证明引导业务。最终汇总逐文件核对全部当前测试指纹、相同生产指纹与真实TAP，旧359/1组合、诊断及独立RED均保留。

## 原生动画与未执行范围

关闭Playwright默认focus emulation后，第二真实BrowserWindow获焦：mainFocused=false、helperFocused=true，原页面document.hasFocus=false，右图frame归0；恢复焦点后可重新展开并保持12。真实hide时BrowserWindow.isVisible=false、focused=false，frame0；这证明隐藏时经实际blur停止动画。

受控Chromium在实际hide后仍报告document.hidden=false（windows-electron.json的nativeObservations/limitations），因此true document.hidden/visibilitychange分支没有被观察，CES-08只标原生blur/hide及浏览器reduce/modal子项已执行，不把该分支标通过。失败的focus-emulation/hidden-polling验收尝试保留供复现；它们不是用合成事件替代真实验证。

Windows所有入口走真实本地API/原向导；确认仅形成待创建草稿，真实作品库仍为空；无模型发送disabled。浏览器里的合法模型与流是合成组件数据，不宣称供应商生成。物理输入法、macOS、供应商端点和已安装包未验收。本轮未重建或安装安装包，未提交/发布。

主代理已检查两主题实际截图，卡片/输入框边缘对齐，纸右图暖黄、墨右图低亮灰，七入口无审核工具或示例作品。
