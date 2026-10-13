# AI 对话输入框最大高度翻倍：独立技术方案审核

日期：2026-10-13（Asia/Shanghai）。审核范围仅为 `2026-10-13-composer-height-plan.md` 的技术方案，尚未审核测试实现、产品变更或目标系统结果。

结论：**通过，无阻塞项。** 正常输入区域上限从 140px 改为 280px，空态且视口高度 ≤650px 时从 96px 改为 192px，均与本次用户允许翻倍的最新要求一致。三处现有高度限制需要同步修改；仅改 CSS 或仅改 effect 都不能完整达到目标。

源码依据：

- `src/components/layout/ChatPanel.tsx:1492–1498`：真实草稿 effect 在 DOM 草稿重建后先设 `height = auto`，随后以 `Math.min(el.scrollHeight, 140)` 收拢至上限，依赖仍为 `draft`。替换数值保留增长、缩短和清空时的既有机制。
- `src/components/layout/ChatPanel.tsx:2087–2089`：同一真实 `contenteditable` 当前为 `max-h-[140px]`、`overflow-y-auto`，空态/会话态最小高度分别为 48px/52px。替换最大高度不要求改动最低高度、草稿同步、引用 chip 或键盘逻辑。
- `src/components/chat/chat-empty-dock.css:10`：小窗口限制仅匹配 `.chat-empty-composer .chat-composer-editable`，媒体条件为 `max-height:650px`。192px 继续作为该状态的 CSS 上限，正常 effect 的 280px 不会取消此约束；需用计算样式和实际矩形验证最终效果。
- `src/components/layout/ChatPanel.tsx:1815–1823, 1926–1932, 1970–1977, 2092`：欢迎态和会话态复用一个底部 composer，欢迎态仅增加容器类名；工具栏位于输入区域之后。`src/components/chat/ChatEmptyState.tsx:31` 明确由原 `ChatPanel` 持有业务动作和 composer。
- `docs/implementation-boundaries.md` 的“实现的两个来源”和“逐条执行与验证”要求使用原真实组件、保留引用/草稿/队列等，并遵守方案→用例→TDD→审核→真实目标验证顺序。方案遵守该顺序，不引入设计 HTML、模拟数据、上游引用或新的服务。

验证范围适合本次局部改动：专项红灯必须来自旧值下的真实 effect 和真实 DOM 尺寸；正常/小窗口、空态/本地实际会话、双主题、增长/超限滚动/缩短/清空、Shift+Enter 与工具栏可见覆盖受影响的行为。小窗口尤其需要确认底部工具栏在视口内并可操作。全量核心与组件浏览器用例及 UI/desktop 构建可发现共享组件回归；隔离数据、无模型、无供应商请求的真实 Windows Electron 验证符合本次范围。

最终验收应据实记录 fixture 与真实 Electron 的差别，以及未执行的 macOS、安装包和物理 IME 项目，不以本轮局部通过替代整组业务验收。现有无关失败需保留具体命令结果和归属；本方案审核不提前宣布任何测试或产品验收通过。

补充方案亦通过：允许直接新增真实 Windows Electron 尺寸脚本作为专项 TDD 用例，旧源码构建红灯后，仅改三处高度限制，再构建并执行同一脚本取绿灯。隔离数据可以通过 `Workspaces.initialize()` 与 `Workspaces.run('inbox')` 建立并写入无关联本地会话/消息；`desktop/service/workspaces.ts:94–98, 307–356` 提供真实初始化与数据库上下文。写入完成后必须关闭 Workspaces 再启动 Electron，避免同一目录同时持有写租约。会话态通过真实 SidebarTree 条目切换，不直接伪造 React 状态。脚本以实际 `window.innerHeight` 判断媒体条件并验证 inline height、computed maxHeight、clientHeight/scrollHeight。192px 仅用于小窗口空态，有消息小窗口仍应验证正常 280px 上限。具体用例脚本仍待独立测试设计审核。

## 第二次调整技术方案补审：在上一轮基础上再增加50%

2026-10-13（Asia/Shanghai）。审核对象仅为 `2026-10-13-composer-height-plan.md` 最上方“第二次调整：再增加50%”小节；上面的首轮280/192记录作为历史保留。

结论：**通过，无阻塞项。** 新增要求以已经验收的280px/192px为基数，再增加50%，得到正常420px、小窗口空态288px。仅更新同一真实React composer的effect上限、max-h上限、小窗口CSS上限及注释，正确覆盖三个实际约束，不需要改业务事件或引入替代组件。源码当前仍为 `ChatPanel.tsx:1492–1498` 的280px与`:2087–2089` 的280px、`chat-empty-dock.css:10` 的192px；48px/52px最小高度与内部滚动保留。小窗口媒体条件和空态选择器保持不变，有消息的小窗口应继续使用新的正常420px上限。

本次独立读取的两个源hash与上一轮真实green证据一致：ChatPanel `d28a3133914b77e0ebf323f92fbb1b72edfc0aec7f930e95f2ac5028e4e70507`、CSS `99bd8051f2b6b7ccdf8eb376a90ccdc8048918343592da281fdc68905a8ebdf1`。主代理已逐项核对上一轮out/main编译资源hash一致；在此证据前提下可复用旧build执行420px要求下的真实红灯，无须为同一已验证构建重做构建。若实际资源hash发生变化或尺寸不是旧280/192，则必须先恢复可追溯的旧源构建，不能以基础设施故障或来源不明的bundle代替红灯。

验证设计方向适当：新的v2-red/v2-green标签隔离本轮证据且保留首轮全部失败/通过记录；同一脚本继续读取实际inline/computed/矩形/scrollHeight，而非镜像源常量。中等草稿改为14短行，可验证自然高度越过旧280但低于新420，防止仅增加CSS或错误固定420px。40行长文仍应超过两种上限，继续wheel验证内部滚动；短文/清空收回、双主题、真实无模型本地会话、模式菜单操作均保留。新的420px占用更多会话高度，650px小窗口中工具栏完整可见并可点击尤其需要实测，不以第一轮280px结果推定本轮通过。

方案→用例分别独立补审→真实旧值红灯→TDD修改→构建绿灯→独立code review→本轮核心/组件全量及真实target结果，符合AGENTS顺序。复用脚本与旧build不替代新值的实际绿灯；核心并发2是执行配置调整，不改变测试断言或降低文件覆盖，若出现资源或时序失败仍应保留原始结果和归属。不得修改其它任务源码以换取全绿；台账更新最新值，原轮次证据继续按历史保留。本轮尚未审测试脚本或实现，未提前声明任何新值测试通过。
