# 顶部消息框专项测试用例独立审核

日期：2026-10-12。角色：独立子代理。结论：通过，可编写具名专项测试并开始 TDD。没有用例方案阻断项。当前只有用例文档，尚未执行测试或实现，以下不构成通过结果。

## 审核范围与证据

只读最终实施方案、专项用例以及上一阶段已核对的本地 Sonner、恢复／设置路径。追加读取 `SettingsDialog.tsx:65,69`、`DesktopApp.tsx:163–166` 与本地 Sonner `index.mjs:644–678,1110–1131`，核对原生缩放、重复打开恢复和暂停机制。仅执行文件读取与 `rg`，未修改产品或用例，未运行任何产品、全量或 Windows 测试。

## 覆盖与边界

- TST-01／02／05 覆盖用户核心目标及批准规格：两主题实色背景、各类型图标色和形状、文字层级、长内容、按钮、窄窗和 mobile 临界点。严格匹配批准颜色再计算对比度，能避免“透明但对比度暂时足够”被误判通过。
- TST-03／04／07 使用真实 Sonner 生命周期与 next-themes，覆盖同 ID、promise、dismiss、堆叠、计时暂停和现有消息主题切换。组件 fixture 不复制拟议 CSS，能成为实际产品样式的有效验收。
- TST-08／09 对属性合并、显式主题／偏移、其它位置、custom／unstyled、普通界面样式隔离及减少动态效果有独立断言要求。结合最终方案的子节点 styled 约束与合法主题令牌映射，覆盖技术审核所列兼容性风险。
- 红灯流程有明确标准：先用旧产品源码运行真实 DOM 断言，修正夹具错误后才记录有效失败，再用同一具名文件重跑。不得把构建失败、fixture 导入失败或浏览器启动失败充当 TDD 红灯；最终 TAP 必须显示实际样式／映射等断言失败。旧代码存在 paper／ink 无效映射及 16px 图标，因此这些断言确实能够区分前后行为。
- Windows 用例明确使用真实 main／preload／编译 UI、原恢复与设置控件、独立根、零模型和实际剪贴板 IPC；没有用 CSS zoom 或浏览器 synthetic 通知替代原生。恢复入口可以重复到达：`SettingsDialog.tsx:65` 通用分类的“查看草稿”会触发现有恢复事件，不依赖已经关闭的启动消息再次出现。
- 两主题新根、真实 DraftJournal 前置、bootstrap 根／模型确认、firstWindow 后 renderer 监测区间、离线检查和证据路径已清楚。warning／loading／normal 无可达真实业务时只提供浏览器组件证据，macOS／安装包／输入法及其它业务不执行且不标通过，范围符合用户禁止全量测试的要求。
- W04 允许按真实界面限制诚实记录原生同 ID 切换未执行，并用两主题启动和浏览器同 ID 切换支撑各自结论；这种边界有效，不能将退路列为原生 W04 已通过。

## 编写测试时的具体落实条件

1. 生命周期短计时测试应先等待 `[data-mounted=true]` 和实际可見卡片，再开始交互；通过 DOM 条件轮询等待关闭（包括 Sonner 延迟移除），使用有余量的 duration／超时，不依赖恰好第 N 毫秒。悬停测试先移开鼠标再发通知，随后悬停超过原 duration 并验证仍在，移开后验证移除；每个案例清除旧通知或重建页面，避免队列／hotkey 状态污染。
2. 补足聚焦暂停的真实机制断言：本地 Sonner 计时暂停取决于 expanded／interacting／document hidden，单纯调用 focus 不会保证 expanded。由真实 Alt+T 使消息展开／聚焦后跨过 duration，验证仍在；再按 Escape／移出交互恢复关闭。已有 TST-02 热键／TST-04 暂停可组合落实，不能宣称只做 DOM focus 已证明暂停。
3. TST-08 必须观察合并后的结果：Toaster className／style、局部 icons、toastOptions.classNames 的 toast 和 title 与默认类同时存在；单条消息 classNames／style 仍覆盖原接口允许的字段。对 action／cancel／closeButton 分别检查回调次数及 Sonner 原关闭行为。显式主题要在相反页面主题下测试；显式偏移包含普通和 mobile、top-left 与 bottom 通知。
4. CSS 安全距离断言对照最终 toast／container bounding box 与计算值，不能只断言内联变量文字。Windows 同时记录真实 webContents.getZoomFactor、bootstrap.appearance.zoom 和标题区变量，确认原生 zoom 生效后再截图；320／600／601px 浏览器检查只标组件布局。
5. Windows seed 使用合法 autosave snapshot 和真实 DraftJournal persist，样例应能被原恢复预览显示且“复制内容”可点击。首次启动等待工作台完成 bootstrap 后才能将信息提示作为目标，不能用任意 modal／界面元素冒充 Toaster。
6. 原剪贴板 ClipboardItems 只在主进程内存中保存；成功／断言失败／异常路径都在 finally await 还原，随后再关闭 Electron。证据只能检查与隔离样例相等和还原操作成功，不能输出原 clipboard 数据。先关闭相关进程，再清理已校验位于指定临时父目录内的测试根及 bootstrap 兄弟目录。
7. Windows W03 从设置“通用→查看草稿”重复打开原恢复界面；复制成功通知可用于每个缩放值。启动提示关闭后不得尝试重新调用 toast 来补造原生信息场景。W04 如未完成原生同 ID 主题切换，JSON／总结单独记录未执行与实际替代证明。
8. 红灯／绿灯分别保存实际命令、退出码与 TAP。最终统计按执行断言与 JSON 明细核对，设计预览 28 项、文档矩阵行数和单次启动不合并计作产品用例；构建成功只证明产物生成，不能替代消息 DOM 和真实操作验证。

所有条件均可在既定方案范围实现，不要求新增产品功能或全量测试。测试编写与执行后仍须独立代码审核及真实 Windows 专项验证，再据实总结。
