# 顶部消息框调研、产品设计及 HTML 设计稿独立审核

日期：2026-10-12。审核角色：独立子代理。最终结论：通过，可提交用户审核 HTML；R1–R4 已修正且复核关闭，无待修正项。本审核不代表用户批准，也不代表产品已经实现或通过验收。

## 审核范围与方法

只读调研文档、产品设计、`design/toast-style/**`、现有 Toaster／Providers／DesktopApp、主题及桌面样式、批准边界，以及本地 Sonner 类型／DOM／CSS 源码。未修改产品或设计稿，未运行产品测试或全量测试。执行的命令仅为文件读取、`rg` 源码检索、SHA256 核对与独立静态色彩对比度计算。已读取主代理最终生成的 `preview-checks.json`、设计检查脚本及宣纸／玄墨／窄窗口截图；独立查看三个图像，未把主代理的材料检查声明为产品测试。

## 已确认的正确部分

- 根因符合实际源码：`src/components/ui/sonner.tsx:8–12` 将 `paper/ink` 强制断言后直接传入 Sonner；`src/app/providers.tsx:23` 开启 `richColors`；本地 Sonner `index.d.ts:100` 只接受 `light/dark/system`，`index.mjs:1005,1057–1060,1161` 把原运行时名称输出到 `data-sonner-theme`。`styles.css:467–523,548–577` 对 light/dark 声明并使用类型变量；无效变量让覆盖背景声明在计算阶段失效，故普通背景值无法回退恢复。图标继承文本颜色，也解释单色现象。
- 截图场景确实来自 `src/components/desktop/DesktopApp.tsx:99` 的 `toast.info`，原按钮回调打开既有草稿界面。拟议设计未新建业务恢复流程。
- 拟议主题背景分别为 `#fcf8ee` 与 `#211c19`，均为 alpha 1；`preview.css:65–68` 明确覆盖背景且关闭背景图片、模糊。四类通知图标分别使用蓝／绿／琥珀／红，并保留各自形状；加载另用灰蓝色，符合用户约束。
- 调研和产品文档明确规定 HTML 待用户审核，批准后才能实现；设计数据和拟议组件仅在 design 目录。HTML 只引用同目录 CSS／bundle，按钮只更新本页反馈，源码未访问 desktop IPC、真实数据、模型或 Key。
- 文档限定本目标专项测试，明确设计检查不能替代产品验收、未执行平台不记为通过，遵循用户最新测试范围。
- 依据指定颜色进行 WCAG sRGB 对比度静态计算：正文、描述、按钮及 hover 文字最低 5.27:1；五类图标对底座最低 3.70:1。均满足产品文档的 4.5:1／3:1 目标。此为设计颜色核算，未声称实际产品测试通过。

## 审核发现及修正复核（均已关闭）

### R1：场景切换会沿用上一场景的按钮与描述（P2）

位置：`design/toast-style/viewer.tsx:51–75`。每次切换场景先 dismiss 主消息，然后同步用同一 ID 再次 emit。当前本地 Sonner `index.mjs:178–211` 会取消尚未广播的 dismiss，并合并旧 toast 参数。新 options 在短消息场景没有显式清空 `action/description`，从「带操作按钮」切到「简短消息」可能保留旧操作，从「长消息与说明」切回短消息可能保留旧说明和按钮。设计页因此不能忠实显示用户选择的场景。

建议：普通场景切换使用新 ID，单独保留加载转成功所需的同 ID 更新；或在每次 emit 中显式清空所有不再适用的字段，并确保旧队列被正确清理。主代理应实际点击上述两条切换路径再复核。

修正复核：当前 `viewer.tsx` 使用递增 generation 为场景切换和重播生成新 ID，收集并关闭前轮消息；只在「加载转成功」中沿用当前 main ID。每次 options 和加载完成均显式清空不适用的 `action/description`。这一处理也避免按钮点击后的 Sonner 延迟删除误删重播消息。已读检查脚本包含短场景按钮／描述 count=0、点击后重播及加载同 ID 更新断言，生成报告说明这些路径实际执行通过，R1 关闭。

### R2：消息卡本身的键盘焦点环被新阴影覆盖（P2）

位置：`design/toast-style/preview.css:65–68,85`。高优先级卡片 `box-shadow` 覆盖 Sonner `styles.css:118` 的 `[data-sonner-toast]:focus-visible` 阴影环；Sonner `index.mjs:706–707` 使卡片 `tabIndex=0`，基础样式又设 `outline:none`。设计只为操作按钮提供 focus-visible，聚焦消息卡本体时缺少明确提示，削弱文档承诺保留的已有键盘机制。

建议：为作用域内消息卡本体补充 `:focus-visible`，使用两主题均可见的轮廓或焦点环，并保留原投影；验证消息快捷键和无按钮消息的焦点可见性。

修正复核：当前 `preview.css:87` 已为 `.proposal-toaster .proposal-toast[data-sonner-toast]:focus-visible` 增加 2px 主题提示色 outline 和 3px offset。该选择器优先级高于 Sonner 的基础 outline 规则，并保留卡片阴影。已读检查脚本在每类短消息中启用键盘模态再聚焦卡片断言 outline=solid；操作场景从卡片真实按 Tab 后确认焦点进入按钮且 outline=solid，生成报告说明两主题路径实际执行通过，R2 关闭。

### R3：窄窗口可能受 Sonner mobile width 二次扣边距影响（待实际确认）

位置：`design/toast-style/preview.css:52–53,60–61` 与本地 Sonner `styles.css:430–464`。Sonner 在 viewport ≤600px 时把 ol 改为左／右 mobile offset 和 width 100%，又让子 toast 宽度减去两倍 mobile offset；设计额外对 ol 做容器宽度减 32/36px 的 max-width。两者可能使卡片在审核框内偏左、左右留白不一致，并超出产品「420px 标准宽度」或再次压窄文字。

建议：在设计容器内明确统一 ol 定位与 `width:min(420px, calc(100% - 32px))` 的规则，并让其 toast 取容器宽度；验证 320px、600px、601px 等临界宽度。不将静态推测记作已执行失败。

最终修正复核：`preview.css:52,60,62,68` 明确 ol 的 absolute 居中定位、`width:var(--width)`、容器 max-width 和拟议卡片 `width:100%`，同时阻断 mobile 二次扣距与 ol 在 mobile 中超过 420px 的情况。`preview-checks.json` 的 601/600/560px 结果均为 420px，320px 结果 262px，390px 结果 332px；各项中心与容器一致、左右至少 16px，未发生横向溢出，按钮在卡片范围内。独立查看窄窗口截图也确认长正文、说明与操作完整显示，R3 关闭。

### R4：描述文字计算颜色仍为正文色，与规格不一致（P2）

位置：`design/toast-style/preview.css:73` 与 `preview-checks.json` 的四个 long 场景。设计描述色规格为宣纸 `#74664f`／玄墨 `#b5a99f`，实际计算值分别是正文的 `rgb(43,37,27)`／`rgb(236,231,225)`。拟议 description selector 与 Sonner richColors description selector 都为 specificity 4，Sonner runtime 后注入 CSS 的 `color:inherit` 获胜，未表达所设计的主／次文字层级。检查脚本仅验证对比度，未验证该颜色等于规格。

建议：给拟议 description selector 补足作用域属性提升优先级，并在两主题长消息中断言实际颜色等于指定描述色，再生成证据。

最终修正复核：`preview.css:73` 为 description selector 增加 `[data-styled=true]`，优先级高于 Sonner 的 inherit 规则；检查脚本严格验证两主题描述色等于对应设计值。最新 JSON 长消息结果为宣纸 `rgb(116,102,79)`（`#74664f`）、玄墨 `rgb(181,169,159)`（`#b5a99f`），颜色与设计文档一致。独立查看更新的窄窗口图也确认说明文案呈现次级文字层级，R4 关闭。长文示例现按所选消息类型提供相符内容，审核不会把失败文案显示为成功类型。

## 最终证据与后续边界

主代理实际执行 `node design/toast-style/verify-preview.mjs`，最终输出 `HTML design checks passed: 28; product source hashes unchanged; no HTTP requests.`。独立核对最终报告：28 项本地 HTML 检查，含两主题六类消息、操作和长文、加载同 ID 更新、堆叠、601/600/560/320/390px 宽度、减少动态效果与键盘主题切换；JS 错误／失败请求／HTTP 请求均为 0，`productImplementation/productTestsExecuted/fullTestsExecuted` 均为 false。独立计算五个关联产品源码 SHA256 均与报告记录一致。

独立查看最终 `preview-paper.png`、`preview-ink.png`、`preview-narrow.png`：拟议实色背景遮住底层横线，两主题卡片与按钮协调，彩色图标保留不同形状，390px 图中的长正文、次级说明与操作均完整可见。JSON 在 320px 和 390px 的 card bottom 均位于示意区域内；这些证据不等于原生窗体或安装包验收。

可提交用户审核 `design/toast-style/index.html`。获得用户明确批准后才进入技术方案、测试用例、TDD、代码审核和真实 Windows Electron 专项验收；继续只执行本目标相关测试。不得把本地 HTML 的 28 项检查改称产品测试、全量测试或平台验收，未执行平台仍须据实记录。
