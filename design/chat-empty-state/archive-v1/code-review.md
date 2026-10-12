# AI 对话首屏 · 独立代码与设计审核

日期：2026-10-12（Asia/Shanghai）  
范围：`index.html`、`preview.css`、`preview.js`、`build-assets.mjs`、`assets/manifest.json` 与调研/产品/用例文档。  
方式：静态代码审查、读取资产清单、查看本地 `assets/contact-sheet.png`；未重复运行专人负责的浏览器验证脚本。仅编辑本记录。

## 结论

**静态代码/设计审查通过，最终运行证据复核完成。** 核心布局和资产路线符合原型目标；初审三项问题和运行阶段两项修复均已复核。最终 `preview-checks.json` 记录12组已执行断言通过、0失败，另有1个子项未执行：真实 `document.hidden` 生命周期。`fullCoverage=false`，不能称为全量通过。此结论仅针对 HTML 审核稿的静态审查和已执行验证，不是产品实施批准、真实业务验收或用户 UI 批准。

## 初审修订项（均已关闭）

### P2-01：输入方式切换后不能继续使用旧的 focus-visible 缓存

- 位置：`preview.js:22–23`、`:45–51`。
- 问题：`sprite.focus` 只在 focus 事件中由 `keyboardInput && matches(':focus-visible')` 计算，pointerdown 只改 `keyboardInput`。先 Tab 到对象，再鼠标点击同一个已聚焦对象时没有新的 focus 事件；之后鼠标离开仍可能因旧 `sprite.focus=true` 持续动画，即使该对象已不匹配 `:focus-visible`。这违反 `product-design.md:61` 和 PV05 的触发/复位契约。
- 修订：播放判定应核对当前真实 `:focus-visible`，或在输入方式切换后可靠同步所有焦点状态。保留 hover 与键盘焦点“任一存在即可播放”的合并规则，不能简单 pointerdown 清空全部焦点而破坏有意的叠加场景。
- 验证：键盘 Tab 聚焦 → 鼠标点击同一对象 → 鼠标移出；无 `:focus-visible` 且无 hover 时回0。最清晰的复现目标是不会打开弹窗的 Logo；按钮还应确认弹窗关闭后的状态。
- 静态复核：当前 `preview.js:21–23` 每次检查 `document.activeElement` 与真实 `:focus-visible`；`:47–48` 在输入模态改变后下一帧刷新；`:49–53` 不再保存旧焦点布尔值。修复覆盖原问题；关闭静态问题，交由浏览器验证上述转换。

### P2-02：动画说明与最终帧资产须一致

- 位置：`product-design.md:66`、`:68`；`build-assets.mjs:69–81`、`:94–102`。
- 问题：设计文档承诺“书页轻展、笔尖起落”和“头部微转与身旁星点出现”，而生成器明确固定笔与星点。书页、人物头部确实变化，已经满足各图标独立帧动画的用户要求；问题是交付文档描述了实际不存在的局部运动。
- 修订：可以将文档准确收敛为“书页轻展”和“头部微转”，或实现缺少的动作；不要求为了审查增加不必要的动效。复核以最终资产与文档一致为准。
- 复核：当前 `product-design.md:66` 明确“书页轻展，书脊与笔固定”，`:68` 明确“头部微转，身体与星点固定”，与生成器一致。已关闭。

### P2-03：纯空态顶栏新增控件需回到本轮范围

- 位置：`index.html:37–39`、`preview.js:86`。
- 问题：原型在顶栏新增常驻“AI 对话”标题与“新建对话”按钮；真实纯空态顶栏特意不显示图标/标题，新会话入口在侧栏。依据：`src/components/layout/ChatPanel.tsx:1666–1671`、`src/components/layout/SidebarTree.tsx:1681`。本轮产品设计 `product-design.md:7` 只调整纯空态，动作契约没有增加顶栏新会话控件。未声明的新控件容易被后续实施当作本轮设计要求。
- 修订：建议移除新增顶栏标题/新会话按钮，保留44px空标题栏这一真实结构。若仅为审核标识，应移到已有 `review-header`；不要将审核标识摆在产品面板里。不要求在本轮补齐外围侧栏或原生窗控。
- 复核：当前 `index.html:38` 已改为 aria-hidden 的空 `panel-header`；新增会话说明分支也已移除。已关闭。

## 已确认的实现依据

- **真实离散帧**：`preview.js:31` 每50ms取整数帧索引；`preview.css:4` 按水平精灵宽度定位；`build-assets.mjs:147–159` 生成每主题 Logo 64帧、四图标24帧。不是整体 CSS 浮动冒充帧动画。
- **单独触发与减少动态**：`preview.js:8` 的 target 为所属按钮/Logo，`:49–53` 分别监听；`:23` 同时限制系统 reduce、审核开关、document hidden、页面焦点、模态弹窗。`:38–43` 仅活跃时继续 requestAnimationFrame。P2-01 修复后其触发模型符合设计方向。
- **品牌保真路径**：`build-assets.mjs:34–62` 原样保留第0帧，对路径上部 x 坐标按周期形变；原 SVG 的 transforms 保留。`:157` 断言首帧 SVG 字节等同源文件，`:165–169` 检查 y≥91 的192px栅格区域逐帧不变、烟部非零帧变化，`:185–201` 校验写出的 PNG 所有 RGBA 像素。`assets/manifest.json` 报告两主题对应检查通过；审查没有把该生成器自报结果当作真实浏览器播放验证。联系表肉眼显示底部炉身稳定、彩色实心小图标与双主题一致。
- **中央与底部布局**：`preview.css:4–5` 用可滚动 `flex:1/min-height:0` 欢迎区及 `flex-shrink:0` 输入区；主作品入口全行、三次入口等分，`:8–10` 处理窄/短窗口。具体320×420、200%缩放与截图结果仍以浏览器验证记录为准。
- **纯空态与无假成功**：`index.html:65–76` 只有无作品/无模型的空输入；发送 disabled。`preview.js:77–87` 的动作全部打开明确的“交互示意”，提示真实流程和所属作品前置条件；不创建实体、不发送消息、不清空草稿、不展示假模型或假作品。
- **本地运行与数据边界**：`index.html:6` CSP 禁止 connect，代码没有 fetch、WebSocket、IPC、localStorage、模型接口或 Key 字段。运行时脚本/CSS/PNG均为目录内相对资源。生成器仅读取 `public/brand/logo-icon-{theme}.svg` 并写本目录资产（`build-assets.mjs:9–11`、`:152–153`、`:172–236`），未读取用户数据或凭据；没有监听服务。
- **模态与可访问性**：原生 `dialog.showModal()` 负责背景 inert/焦点圈定，`preview.js:92`、`:116` 记录并恢复入口焦点；标题/描述使用 `textContent`。动态效果在模态打开时停止。最终 Enter/Space/Escape、焦点圈定及两主题文字对比度仍需真实浏览器验证。

## 非阻断建议

- `preview.js:19` 当前每个 RAF 为五个图标读取 computed width，即使只有一个活跃；对这个小型原型影响有限。将来正式组件可只在尺寸变化时缓存尺寸，并仅重绘变帧对象。此处不要求扩展性能工程。
- 后续实现必须沿用真实 contenteditable composer 和原状态机；本页的 textarea 仅为已声明的设计示意，不得复制入正式工作台。当前未编辑任何产品 React 文件。

## 运行阶段修复的静态复核

两处修复均已重新读取当前 `preview.js`，静态复核通过；最终重跑记录的证据已在下一节复核。

1. **非负帧索引**：`preview.js:31–33` 在除以50和取模之前使用 `Math.max(0, now - sprite.start)`。同步 `performance.now()` 建立起点后，即使下一次 rAF 的采样时间略早，也只能取第0帧，不会出现 `Math.floor(负的小数)=-1`。帧数为固定正整数64/24，故计算结果保持在 `0..frameCount-1`。无需调整帧周期或重新生成资产。最终 PV05 应实际记录所有采样索引均为整数且在范围内。
2. **模态首尾 Tab 循环**：`preview.js:120–129` 只拦截 dialog 内的 Tab，以当前可见、未禁用按钮和链接重新构建焦点顺序；首项 Shift+Tab 跳到末项，末项 Tab 跳到首项。说明弹窗当前只有这些控件，设计说明动态插入的文档链接也在查询范围内。中间项继续由浏览器按自然顺序处理；Escape 原生关闭与 `:119` 的入口焦点恢复不受影响。最终 PV07 需分别记录正向和反向循环。

## 最终运行证据复核

已读取并分析最终 [preview-checks.json](./preview-checks.json) 与 [verification.md](./verification.md)，未重新执行浏览器测试。记录生成时间为 `2026-10-12T11:07:24.683Z`；运行环境为 Windows 的已安装 Google Chrome `154.0.8037.98`，隔离上下文、`file:` 协议。以下为该记录支持的结论：

- **汇总边界**：PV01–PV12 共12组记录为 passed，failed=0；`allExecutedAssertionsPassed=true`，`unexecuted=1`，`fullCoverage=false`。PV08 只证明其已执行的减少动态/真实 window blur 断言，不证明未执行的 hidden 子项。
- **离线与错误**：PV01 和全局记录均为 page/browser errors=0、failed requests=0、HTTP(S) network requests=0；五类精灵实际载入。PV12 只扫描设计目录，凭据格式命中计数0，不输出匹配字符串；记录中无目录外修改归属。
- **双主题与布局**：PV02 的实际采样文字最低对比值为4.692；PV03 包含两主题1000/560/420/320px；PV04 包含短窗与320×420组合；PV11 记录两主题200%等效布局缩放及四个动作可见可点击。这里只复核记录和坐标断言，不把其扩大为产品布局/完整WCAG验收。
- **帧循环与负帧修复**：PV05 的 Logo 序列70次变帧采样、覆盖64/64帧，最小0最大63；书册序列29次采样、覆盖24/24帧，最小0最大23；两条序列越界计数均0，并都有末帧→第0帧回环。各图标单独 hover 不带动其他图标；hover/focus 叠加记录最终正常归零。模态切换记录中 Chrome 保留了 Logo 的真实 `:focus-visible=true`，此时继续动画符合“任一触发仍成立”的契约，不能把它误报为缓存残留。
- **品牌与写出资产**：PV06 独立解码10套精灵并核对哈希与尺寸；两主题 Logo 首帧与原 SVG 栅格逐像素相同，固定区域改变字节数0，烟部存在变化；10套循环接缝差值均未超过其正常相邻帧最大差值。记录包含接缝图文件名；本次最终复核未再次打开图像。
- **键盘与草稿**：PV07 的四个入口均记录可见2px焦点、Enter/Space、正向/反向 Tab 均留在模态内及关闭后焦点返回。PV09 的四创建入口只显示前置条件/流程说明；PV10 的模型/模式/关联作品/引用说明可达，主题/尺寸切换后合成测试草稿保留，发送仍禁用。
- **明确未执行的子项**：PV08 的 `lifecycleCoverage.blurObserved=true`、`hiddenObserved=false`。真实 window blur 后所有帧立即与稍后都为0；系统 reduce 与审核开关优先级已执行。该已安装无头 Chrome 在切标签和浏览器生命周期冻结尝试中未暴露真实 `document.hidden=true`，验证器没有合成 visibility 事件补充通过。本稿继续保留真实 hidden 生命周期未执行，不能用 blur 或静态守卫替代它。

最终实现输入在 PV12 中的哈希已留存，例如 `preview.js` 为 `4313fb832e1be80a3569b6c8704bdccb26421b29963a75e09b15ade8fd49fec6`。本审核记录在测试之后追加证据说明，故它自身的最新哈希自然不再等于测试运行时快照；本次仅文档更新，不宣称重新运行了实现测试。

最终交付说明复核：`verification.md:9–19` 与 JSON 的12组已执行通过、0失败、1子项未执行以及真实 blur/未触发 hidden 的区分一致；`:27` 保留产品源代码、真实模型、安装包与持久化业务均未验收、UI仍待用户审核的范围声明。主代理另行反馈已将当前 `index.html`、`preview.css`、`preview.js`、`build-assets.mjs` 的 SHA 与 PV12 逐项核对一致；本独立审核本轮只读取最终验证记录，不重复执行其命令。运行证据复核至此完成，真实 `document.hidden` 子项继续保留为未执行。
