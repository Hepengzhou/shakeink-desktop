# 顶部消息框技术方案独立审核

日期：2026-10-12。角色：独立子代理。结论：通过，可进入专项测试用例编写与独立审核。没有技术方案阻断项。本结论不代表产品代码已经修改，也不代表产品或真实 Windows 验收通过。

## 范围与方法

只读本轮实施方案、产品设计、设计审核、已批准 HTML／CSS／viewer，以及 `src/components/ui/sonner.tsx`、Providers、globals／desktop CSS、本地 Sonner 类型与实现。为核对真实验证可执行性，读取 DraftJournal、草稿快照与恢复入口、主进程隔离根与 zoom 路径、设置缩放控件及本地 Electron 剪贴板类型。命令只包含文件读取和 `rg` 检索；未运行产品测试、全量测试或真实系统验证，未修改产品与测试用例。

## 确认项

- 修改限制为 Toaster 包装组件与 desktop CSS 合理。`providers.tsx:23` 已提供 `richColors position="top-center"`；`DesktopApp.tsx:99` 的信息提示与 `RecoveryDialog.tsx:34` 的成功提示继续使用原业务文案／回调，无需复制设计示例或修改恢复流程。
- 主题映射有实际根因与类型依据：Sonner 的 `ToasterProps.theme` 仅接受 light／dark／system；现包装组件直接传 paper／ink。方案改为合法主题并保留显式参数，能恢复 Sonner 的主题属性及内置类型变量。专用实色卡片与类型图标覆盖不能依赖无效主题的 CSS 回退。
- 容器与消息类合并、icons／style／toastOptions 深一层合并符合原接口。Sonner `index.mjs:709,730–739,1214–1221` 自行组合包装类与单条消息类，且单条 style 在全局 style 后合并；继续透传这些属性可以保留原样式与操作接口。
- 高优先级、专用且带 `[data-styled=true]` 的卡片选择器可以覆盖运行时插入的 richColors 卡片规则。描述规则需要相同 styled 约束与额外作用域；Sonner `styles.css:143–145` 的 richColors inherit 不能再次压掉批准的次级描述色。
- 保留 transform／opacity／堆叠变量、拖滑状态和生命周期，避免固定高度；focus-visible 与 no-drag 的补充直接服务真实卡片交互，未引入新的关闭、计时或业务机制。
- 顶部安全距离与现有 `desktop.css:32` 的 `44px / --desktop-caption-zoom` 标题区一致。移动端重设容器居中、消息宽度取容器，可解决 Sonner `styles.css:430–464` 的二次扣边距与 center transform 清除问题。
- 真实 Windows 路径可执行：`desktop/main/index.ts:63–79` 支持 `SHAKEINK_TEST_ROOT` 并分离 bootstrap；`brand-startup-paths.ts:28–29` 将两者指向隔离目录。DraftJournal 可以写入合法 autosave 快照，`draft-recovery.ts:116` 会保留未匹配编辑副本，随后真实启动信息通知、原“查看草稿”操作及复制成功通知均有真实源代码入口。
- 原生 zoom 可由 `SettingsDialog.tsx:69` 的“界面缩放”选择器触发，主进程 `index.ts:405` 调用 webContents.setZoomFactor，`DesktopApp.tsx:166` 更新标题区变量。测试应记录两者实际一致性，浏览器 CSS zoom 不能替代此证据。
- 本地 Electron 类型 `electron.d.ts:7030,7040` 提供异步 `clipboard.read(): Promise<ClipboardItem[]>` 和 `clipboard.write(ClipboardItem[]): Promise<void>`，允许在主进程内存保留完整原剪贴板并还原；不要把原内容发送到 renderer、输出或证据。仅写隔离样例内容符合边界。
- 按具名文件执行顶部消息专项用例、区分浏览器组件证明与真实 Electron 证明、明确首窗后 renderer 的监测区间，符合本轮用户“禁止全量测试”的最新约束。未执行的警告／加载原生业务场景、macOS 与安装包明确不标为通过。

## 实施与用例阶段需保留的约束

这些是通过方案的落实条件，未发现需要重做设计的阻断项。

1. `offset` 与 `mobileOffset` 由 Sonner 对所有位置共用（`index.mjs:901–938,1164–1170`），不能因默认 top-center 就把标题区值作为整个 Toaster 的公共 top offset。通过 top-center 属性选择器落实默认安全距离，并在显式 offset／mobileOffset 传入时使用对应变量；用例同时发出单条 `position="top-left"` 或 bottom 通知，确认原定位语义保留。至少测 600／601px 临界点和两种显式偏移。
2. 专用令牌应以 Toaster 最终合法 `data-sonner-theme` 为准，或用等效规则保证显式 `theme="dark"` 在 paper 页面、`theme="light"` 在 ink 页面也匹配。否则属性虽合法，外观仍可能继承全局主题。测试需要覆盖 theme 优先级、未知主题回退及主题切换后现有消息更新。
3. 外观子节点规则继续带普通通知作用域和 `[data-styled=true]`，避免自定义／unstyled 内容碰巧带 data-title／data-button 等属性而被普通卡片设计影响。普通无图标消息及调用方自定义图标也应分别验证。
4. 属性合并用例至少含显式 className／style、局部 icons、toastOptions.classNames.toast 与 title，以及单条消息 classNames／style；同时验证原 action／cancel、duration、closeButton 参数仍发挥作用。只检查新样式存在不能证明兼容性。
5. 真实 Windows 准备合法且可读的 synthetic autosave（UUID、有效时间、pending／failed 等快照字段），使用真实 DraftJournal persist；不能直接拼造失校验的 drafts.json 或通过 stub 通知冒充恢复。复制与所有异常退出路径必须在 finally 中 await 完整剪贴板还原。
6. 不重新生成批准设计 bundle；当前组件源码改变后重新打包会改写原对照材料。相关测试从真实产品组件和 CSS 新建隔离 fixture；失败／通过结果与设计预览检查分别记录。

下一阶段提交专项测试用例文档审核；只有用例审核通过后开始 TDD 和产品实现。
