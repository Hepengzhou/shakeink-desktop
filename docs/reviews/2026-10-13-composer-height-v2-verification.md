# AI 输入框再次增加50%：实施与验证

日期：2026-10-13（Asia/Shanghai）。用户在上一轮280/192px基础上要求再增加一半，本轮正常上限420px、小窗口空态288px。仅改原React ChatPanel的effect/CSS上限及注释、空态CSS小窗口上限；自然增长/收缩、48/52px最小高度、滚动、草稿及键盘事件保留。第一轮记录与red/green证据保持历史，最新要求以后者为准。

## 本轮TDD、构建和实际Windows

- 独立方案/用例补审通过，追加在原plan-review/test-review中。复用上轮构建前逐一检查旧green记录的out/main资源hash和两个产品源hash，全部一致；没有用不匹配构建代替旧值验证。
- 本轮v2-red实际Windows输出：inline/computed/矩形高度均280px，scrollHeight880px、clientHeight280px；420px断言失败（exit1），证据 `docs/evidence/composer-height/v2-red/windows-electron.json` 与failure.png。基础设施未失败，属于有效行为红灯。
- 改为420/288后，Node24.19.0 UI生产构建及TypeScript通过、Electron main/preload/service编译通过；日志 `docs/evidence/composer-height-v2-build-ui.txt`、`composer-height-v2-build-desktop.txt`。
- 同脚本v2-green真实Windows15/15检查组通过，覆盖paper/ink两主题CH-01…07及CH-08守卫。正常空态/会话及innerHeight650的小窗口会话实测420px；仅小窗口空态288px（inline420、computed288）。14短行自然高度318px，短文和清空收回48/52px；scrollHeight880，真实wheel从准备的顶部滚动，框体不增高。模式菜单实际打开并选择、模式/发送按钮完整在视口内，Shift+Enter插入第二行。
- 原React+原SidebarTree+隔离Workspaces inbox真实数据库/消息，无用户数据、无模型/Key/供应商接口。运行观察期renderer HTTP和errors为0，两主题main就绪监听快照为0；隔离测试总目录身份核对后已清理。源及所有静态资源hash在JSON中，主代理查看ink-conversation-420与paper-welcome-288实际截图，输入区/底部栏正常。

运行 `<node24> --import tsx scripts/verify-composer-height.mjs v2-red` / `v2-green`；新版脚本默认v2-green且只接受v2标签，防止覆盖旧证据。物理IME、macOS和安装包未执行，Playwright/CDP输入及开发Electron不扩展为这些验收。

## 回归

代码补审通过（原code-review追加第二轮和green补审）。本轮使用标签composer-height-v2保留旧结果；核心并发2、force-exit，浏览器原逐文件入口使用本机Chrome；不修改或跳过原断言。构建、真实15组和受控组件/核心用例分别统计；旧轮失败不计为本轮通过，同期其它任务改动保留。

浏览器启动清单42/42文件完整结束：431项中428通过、3失败，0取消/跳过，39文件通过。新增image-provider-menu 6/6通过；ChatPanel空态20/20和输入框clipboard24/24通过。三失败原样保留：dialog-appearance DIA-01 paper fixture导航超过3500ms；root-maintenance-screen RUI12-06“退出应用”点击超过1500ms；root-relocation-screen SR-B-08“重试”等待visible/enabled/stable点击超过1500ms。这些都没有进入高度断言，恢复界面fixture不引用ChatPanel；尚不以此推断或宣布根因已修复。

原全量报告 `docs/evidence/chat-empty-state/browser-full-files-composer-height-v2.json` 状态failed，各失败文件exit1；外层PowerShell环境恢复包装返回0不是测试通过。逐文件JSON/TAP在browser-files-composer-height-v2。核心结束后对三原文件一次完整隔离复跑诊断，原全量没有被复跑覆盖或重新标绿。

隔离复跑原dialog-appearance、root-maintenance-screen、root-relocation-screen文件，保持原源码/断言/Playwright超时，按文件顺序运行：25/25、14/14、23/23，共62/62通过，各真实Node exit0、显式合并exit0，0取消/跳过。三个原失败均未重现；测试文件及ChatPanel/CSS前后hash一致。证据 `docs/evidence/composer-height/v2-browser-isolated-summary.json` / `v2-browser-isolated.tap`，独立review已补充。支持时序条件可能相关，但不据此证明全量资源压力是唯一原因、不将一次全量431项重新汇总成全绿，也不把62重复执行加进用例总数。

核心启动清单完整结束（exit1）：1951项中1881通过、67失败、1取消、2跳过，耗时916037ms；原始证据 `docs/evidence/chat-empty-state/core-full-composer-height-v2.json/.tap`。对比本轮68个失败/取消标题与前轮及历史基线：39已出现过，29不同于历史标题，涉及供应商发现、原生图像SDK及旧预设菜单断言。同期其它任务变更model-catalog、ModelConfigurationDialog等，不由本轮高度任务编辑。比如 `model-configuration-providers.test.ts:14` 的draft夹具通过IMAGE菜单寻找Google后得到undefined(protocol)，与同期菜单范围变化有关；不把所有新增失败都当同一根因，也不在高度任务擅自改供应商源/测试。比较结果 `docs/evidence/composer-height/v2-core-baseline-comparison.json` 保存完整不同标题和基线路径。仓库整体验收非全绿，不把失败/取消/跳过计为通过。

回归范围按各入口启动时枚举的文件清单；本轮期间其它任务继续改源/测试和台账，本轮保留其全部变更。当前高度源码hash与Windows证据一致，不将其它业务变化或后续文件代入已记录的构建/运行结果。
