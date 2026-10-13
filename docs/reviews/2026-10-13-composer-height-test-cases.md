# AI 对话输入框最大高度翻倍：测试用例

## 第二次调整：420/288px

方案第二次补审通过。复用CH-01…08及同一真实Electron验证机制，正常空态/会话（含小窗口会话）的inline/computed/矩形预期为420px；仅innerHeight≤650空态computed/矩形为288px，inline仍420px。CH-02改为14短行，应自然高度>280且<420，短文与清空仍48/52px；CH-03/04/05/06保留wheel起点归零后真实输入滚动、框体不再增高、模式菜单实际选择及按钮完整位于视口中的断言。保留零模型、隔离本地数据库、双主题、Shift+Enter和环境守卫。

脚本本轮只接受v2-red/v2-green标签，默认v2-green，保存到独立目录，旧red/green截图与JSON不覆盖；截图名称使用420/288。已核对上一轮编译资源及两个产品源hash完全一致，直接用旧编译输出跑v2-red，CH-01应实测280px而因420预期失败；不把基础设施失败算红灯。随后三处产品数值/注释修改、UI/desktop构建，用同一脚本跑v2-green，15组都需通过，尤其小窗口会话420px工具栏可用。新脚本hash与实測完整记录，旧hash仅用于旧轮历史。

通过独立code review后，以本轮新标签composer-height-v2执行启动时全量core/browser清单；core并发2、browser逐文件运行且直接选本机Chrome，所有原断言保留。与前轮真实失败标题对比，记录同期新增/变更文件，不将其它任务用例或尚未执行项目计为通过，不修复不属于高度任务的模型/恢复业务。

日期：2026-10-13（Asia/Shanghai）。技术方案已独立审核通过。

专项可执行用例为 `scripts/verify-composer-height.mjs`：实际 Windows Electron、编译后的原 React composer、隔离临时 Workspaces inbox 创建一条无模型会话和非敏感测试消息，随后关闭数据库并通过原 SidebarTree 点击会话。无 HTTP 监听、无 Key、无模拟接口。键盘使用 Playwright/CDP，不代表物理输入法。

| ID | 场景（paper/ink 都执行） | 验收 |
| --- | --- | --- |
| CH-01 | 正常窗口、空态，填入足够多的短行 | innerHeight >650；inline height=280px，computed maxHeight=280px，实际 editor 高度约280px，scrollHeight>clientHeight；单一 composer，工具栏/模式按钮在视口中 |
| CH-02 | 同状态输入中等长度、再填短文、清空 | 中等长度自然高度>140且<280；短文/清空自然收回；原空态最小高度48保留；无强制280固定高度 |
| CH-03 | 长文超过上限 | 通过真实鼠标 wheel 滚动，editor.scrollTop 增大，外层 composer 不再增高；工具栏仍可见并可打开模式菜单 |
| CH-04 | 小窗口空态 | 确认实际 innerHeight ≤650；computed maxHeight=192px，inline height仍280px，实际 editor 高度约192px；scrollHeight>clientHeight，工具栏可见、模式菜单可操作 |
| CH-05 | 实际本地会话、正常窗口 | 原侧栏点击后真实消息可见，空态消失；长文正常上限280px，继续内部滚动；短文和清空收回、最小高度52保留 |
| CH-06 | 同一会话小窗口 | 实际 innerHeight ≤650，computed maxHeight/实际高度仍280px，单一 composer；工具栏在视口中并可打开模式菜单 |
| CH-07 | 短文键盘输入 | Shift+Enter 实际插入第二行；未触发发送/模型门控；缩短/清空后布局收回 |
| CH-08 | 运行环境守卫 | xaanink://app/、win32、无配置模型，renderer errors=0，renderer HTTP=0，main listening servers=0；临时目录身份确认后清理；源码/构建 hash 绑定 |

TDD：先以旧源码执行 UI/desktop 构建，运行同一脚本 `red`，CH-01 预期因原140px与280px要求不同而失败（记录实际尺寸和截图；基础设施失败不算有效红灯）。再只改产品三处上限及注释，构建后运行同一脚本 `green`，全部专项场景应通过。脚本标签只改变证据目录，不改变断言。

独立 code review 后执行全部现有核心 unit/integration 和组件 browser 文件（现有 `check-chat-empty-regression.mjs`，标签 composer-height），保留原断言和实际失败；构建、全量回归和真实专项分别统计。旧测试若约束被本次要求明确取代，依据真实语义最小更新并再次审核。其它业务既有失败不擅自修复、不计通过。macOS、安装包和物理 IME 未执行，不能标记完成。
