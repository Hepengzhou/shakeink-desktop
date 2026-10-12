# 顶部消息框实施方案

日期：2026-10-12。用户已明确批准第一版 `design/toast-style/index.html` 并授权继续。实现目标为顶部消息的实色卡片与不同类型彩色图标，保留原 Sonner 生命周期及全部业务调用。

## 产品修改范围

只修改 `src/components/ui/sonner.tsx` 与 `src/app/desktop.css`。Providers 已使用 `richColors position="top-center"`，无需修改。保留工作台真实 React 组件、所有通知文案／回调／ID／duration／promise、正常恢复与保存流程，不修改父目录和上游。设计 HTML、示例或工具条不进入产品。

Toaster 将 next-themes 的纸色／墨色映射为 Sonner light／dark；兼容已有合法显式 theme 参数，默认未知主题按 light 处理，resolvedTheme 为 dark 时可用 dark。为全局容器添加专属 `desktop-toaster` 类，保留 `toaster group` 与 `cn-toast` 类。使用现有 Lucide 图标，调整为 20px，加载图标保留旋转并响应减少动态效果。

按已批准稿给 Toaster 设置 420px 宽度，左右至少 16px。top-center 容器通过专属CSS上边距 `calc(44px / var(--desktop-caption-zoom, 1) + 16px)` 保持 44 DIP 标题区安全距离；不改变窗口尺寸或标题区。标题区默认值不写入所有位置共用的Sonner offset；非顶部定位和单条position覆盖保持 Sonner 原有默认 offset，显式 offset／mobileOffset 仍优先。移动断点明确容器居中、最大宽度为窗口减默认32px（显式左右offset按调用方值），子消息取容器宽度，避免 Sonner mobile 二次扣距。只对 top-center 容器改定位，其他 position 保留原语义。

组件合并显式 className、style、icons、toastOptions/classNames，确保业务提供的 duration、action、cancel、closeButton 及其它属性继续传递。专属 toast 类与调用方 toast 类同时保留，避免自定义 toastOptions 把作用域类覆盖掉。单条消息的样式仍按 Sonner 原接口传递，本轮不新增关闭按钮或任何计时覆盖。

desktop.css 添加消息专用纸色／墨色令牌，不改现有全局主题、纸纹、菜单或模态令牌。令牌直接绑定最终合法 `data-sonner-theme=light/dark`，保证显式 theme 覆盖也正确。仅 `.desktop-toaster[data-sonner-toaster] .cn-toast[data-sonner-toast][data-styled=true]` 命中普通通知；所有子节点外观规则同样要求 data-styled=true，custom/unstyled 消息不强加卡片。表面、边框、阴影、文字、图标底座和操作按钮精确复用批准规格。按 data-type 设置蓝／绿／琥珀／红／灰蓝图标，普通消息无图标时不制造类型；调用方自定义图标保留。描述选择器优先级高于 Sonner runtime 后加载的 richColors inherit 规则。

卡片保留 Sonner transform、opacity、堆叠、拖滑和状态动画，不强制固定高度；内容 min-width 0、可换行，按钮可另起行。给卡片和按钮保留可见 focus-visible，设置卡片 no-drag，避免原生标题区拖拽吞掉操作。减少动态效果仅关闭本通知的装饰旋转／过渡，保留加载文案。

## 顺序与测试边界

本方案先经独立子代理审核；通过后形成测试用例并独立审核，再编写会失败的目标测试、实施和重跑；之后做独立 code review。只运行顶部消息框相关的具名测试文件，禁止 `npm test`、通配全部用例、全量回归。构建生成真实运行产物不是全量测试；仅执行所需 UI 构建及集成 TypeScript 检查，desktop 逻辑无修改则复用已有本地运行产物。

浏览器专项测试导入真实 Toaster、React、next-themes、Sonner、Lucide 和产品 globals/desktop CSS，使用隔离页面和纯通知输入，不注入拟议 CSS；其他页面组件只作为作用域排除探针。验证两主题全部类型、实际 alpha／颜色／图标形状、按钮与描述、加载／promise 同 ID、计时／悬停暂停、队列、键盘／focus、主题切换、窄窗与 zoom 相关安全距离。浏览器 CSS zoom 只作为布局近似，不冒充 Electron 原生验证。

Windows Electron 使用真实本地编译 UI、main/preload 与独立临时数据根，无模型、Key 或供应商调用。通过真实 DraftJournal 生成一个不存在匹配编辑器的隔离草稿前置状态，触发真实启动提示；点击“查看草稿”，检查原恢复界面与内容；点击“复制内容”触发真实成功通知和剪贴板 IPC。两个主题各启动一次，以真实原生 zoom 检查标题区距离，并记录计算样式、截图、按钮/卡片 no-drag 与实际点击。没有可达警告调用或加载业务前置时，其证明限于真实组件浏览器测试，不虚构 Windows 场景通过。对剪贴板仅写隔离示例，保存并还原原剪贴板且不记录原内容。

监测区间从 firstWindow 返回开始，仅 renderer 页面错误与 HTTP 请求；不把空列表视为 main/worker 全启动网络验收。可将 renderer 切离线检查本地流程，不启动 HTTP 服务。macOS、安装包、物理键盘／输入法及本目标以外业务不执行、不标记通过。

## 证据和交付

审核记录、专项用例、TDD 失败／通过 TAP、构建输出、Windows Electron JSON／截图和总结分别保存在 `docs/reviews/2026-10-12-toast-style-*` 与 `docs/evidence/toast-style/`。只更新本轮台账条目，保留其它任务的未提交修改及结果。批准稿冻结：不重新构建设计 bundle，因为“当前组件”导入会随产品变化而丢失历史对照。
