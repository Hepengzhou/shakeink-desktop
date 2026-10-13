# AI 对话输入框最大高度翻倍：独立测试设计审核

日期：2026-10-13（Asia/Shanghai）。审核对象：`2026-10-13-composer-height-test-cases.md`；本轮只审核设计，未修改实现或测试脚本，未宣布用例执行通过。

结论：**通过，无阻塞项。** CH-01 至 CH-08 验证真实编译 React 在 Windows Electron 中的计算样式、DOM 尺寸、滚动和交互，不是对源代码常量的镜像断言。同一专项脚本在旧源码和新源码上使用相同预期值，`red`/`green` 仅用于证据标签，可形成有效 TDD 红绿证据。

依据与覆盖判断：

- `src/components/layout/ChatPanel.tsx:1492–1498` 的 effect 同时控制自适应 inline height 与收回；CH-01/02 检查长文、中等长度、短文和清空，避免仅提高 CSS 但 effect 仍截于 140px，也避免错误改为固定 280px。
- `src/components/layout/ChatPanel.tsx:2087–2089` 的最大高度、`overflow-y-auto` 和 48px/52px 两种最小高度分别由 CH-01 至 CH-06 覆盖。`scrollHeight > clientHeight` 加鼠标 wheel 后 `scrollTop` 增大，比直接赋值 `scrollTop` 更能验证可操作的内部滚动。
- `src/components/chat/chat-empty-dock.css:10` 仅在 `max-height:650px` 的空态生效；CH-04 使用真实 `innerHeight ≤650` 检查 192px，CH-06 在相同媒体条件下检查有消息会话仍为 280px，可以发现选择器作用范围扩大等回归。正常场景以 `innerHeight >650` 确认没有误入小窗口分支。
- 欢迎态和会话态共用原 composer，参见 `src/components/layout/ChatPanel.tsx:1815–1823, 1926–1932, 1970–1977`。真实 inbox 无关联会话及消息经 `Workspaces` 写入并关闭后，通过 SidebarTree 切换，足以触发真实会话分支，无须模型、Key 或供应商请求。
- CH-01/03/04/06 既测工具栏位置，又要求模式菜单可打开，能发现翻倍后挤出视口或遮挡按钮。CH-07 的 Shift+Enter 检查换行且没有发送/门控副作用，保护输入区既有键盘行为。
- `scripts/check-chat-empty-regression.mjs:9–12` 枚举当前 `tests/unit`、`tests/integration` 与 `tests/browser` 下的全部 `.test.ts` 文件，适合作为本轮现有回归入口；源码 hash 与执行结果分开记录，保留无关失败、取消和跳过，不能汇总成全绿。

执行时注意：约 280px/192px 的实际矩形应采用小量舍入容差，同时记录原始值；小窗口身份必须依据 renderer `innerHeight`，不能仅凭原生窗口外框尺寸。CH-03 的 wheel 和 CH-07 键盘通过 Playwright/CDP 输入，属于真实 Electron 界面的自动化操作，不能表述为物理鼠标或物理输入法验收。CH-08 的无模型、协议、平台、网络及监听守卫和源码/构建 hash 应在断言失败时也落盘，以区分基础设施故障与有效旧高度红灯。

旧源码 CH-01 因实测 140px 未达到要求而失败才是有效红灯；启动失败、数据初始化失败、元素缺失或自动化故障不能冒充红灯。测试脚本实现仍需后续 code review；macOS、安装包和物理 IME 保持未执行状态，不扩大本轮结论。

## 第二次调整测试设计补审：420/288px

2026-10-13（Asia/Shanghai）。审核对象仅为 `2026-10-13-composer-height-test-cases.md` 最上方“第二次调整：420/288px”小节；首轮280/192设计及审核作为历史保留。未修改产品或验证脚本，未提前宣布第二轮用例通过。

结论：**通过，无阻塞项。** 保留CH-01…08、两主题各CH-01…07及全局CH-08共15组，更新的是实际界面的高度预期与证据标签，没有以源码常量断言替代真实行为。正常空态、正常会话、小窗口会话均需要inline/computed/实际矩形420px；只有innerHeight≤650且空态时computed/矩形为288px、inline仍420px，与原CSS选择器作用域一致。

CH-02改为14短行合理：第一轮7行自然高度实测167px，40行scrollHeight实测880px（首轮green JSON中的paper/ink均相同）；14行足以形成超过旧280但低于新420的中等高度场景，执行时仍以真实矩形断言>280且<420，不将估算当成结果。长文的scrollHeight>clientHeight、wheel起点归零后真实输入滚动、滚动前后框体高度不变、模式菜单点击关闭和按钮完整位于视口内全部保留；可发现三处上限不一致、固定420px、超限不滚动和小窗口工具栏被挤出等回归。48px/52px短文与清空收回、单一composer、真实SidebarTree会话切换、Shift+Enter和无模型隔离守卫继续有效。

红灯依据充分：在主代理已核对旧build资源及两个产品源hash与第一轮green完全一致的前提下，可直接运行旧编译输出；新脚本以相同420/288预期执行v2-red和v2-green，CH-01应因真实旧inline/实际280px未达到420而失败。失败前的初始metrics与失败截图/JSON必须保留；基础设施错误、元素缺失或未知bundle不能算有效红灯。第一轮green记录旧值280/192不替代本轮红灯或绿灯。

证据隔离设计通过：脚本只接受v2-red/v2-green且默认v2-green，名称及输出目录与旧red/green分离；新截图使用420/288，报告保存本轮脚本和产品/构建hash。新脚本完整15组通过才可声明本项第二轮专项完成，尤其650px小窗口会话的420px长文与工具栏操作必须实际执行。Playwright/CDP输入与renderer监听时段、main监听快照的边界仍依第一轮审核限制，不扩大到物理输入、安装包、供应商、macOS或完整网络审计。

本轮新标签composer-height-v2执行启动时全量core/browser文件清单可追溯，core并发2与browser使用已有Chrome仅改变执行配置，不更改原断言或将未执行项计为通过。应记录完整清单、源hash、每个文件实际完成/失败/取消/跳过，以及同期新增或变更文件；与上一轮失败标题对比可以辅助归属，不能仅因标题相同推定为无关，也不修复本任务范围外的模型/恢复业务来消除失败。具体新脚本仍待实现后的独立code review。
