# 右侧内容抽屉：独立调研与 HTML 设计审核

日期：2026-10-13（Asia/Shanghai）。审核范围为本目录 `research.md`、`product-design.md`、`index.html`、`preview.css`、`preview.js`；对照当前真实 Shell、布局协调器、ContentTabs、CSS 和已有隔离测试。审核代理只写本文件，未修改生产代码或其他设计文件。

结论：**修订后的调研和 HTML 可交用户 UI 审核，未发现当前设计媒介仍存在的 P0/P1/P2 阻断问题。此结论不是正式实施技术方案批准、用户 UI 批准或产品验收。** 用户审核 HTML 后，仍需依 AGENTS.md 完成正式技术方案及独立审核、用例及独立审核、TDD、code review、全量回归和实际目标系统验证。

## 源码与根因

- `src/components/layout/DashboardShell.tsx:35–39` 给左侧真实 SidebarTree 设置裁切视口和固定内层；`:46–50` 的右侧 ContentTabs 直接位于 content Panel，没有相同包装。
- `src/components/layout/useSidebarDrawer.ts:87–120` 是唯一 Group 布局写入者；`:184–208` 的内容收放逐帧改变 content 占位。`:55–69` 只锁定左侧像素宽并平移，右内容因此继续按变化宽度重排。
- `src/components/layout/useContentTabStrip.ts:115–136、146–151` 会根据真实 caption 宽度计算容量和紧凑模式。只加文本 nowrap 不能保持全部业务布局与工具条几何。
- `useSidebarDrawer.ts:149–150` 和 `DashboardShell.tsx:46` 证明当前完整收起后会卸载 ContentTabs；`ContentTabs.tsx:207–211` 的实例保活只涵盖已挂载容器内的 Tab 切换。设计提出收起后保留实例，是待实现和验证的要求，并非当前产品已有能力。
- `baseline.json` 与 `capture-baseline.mjs:11–23` 的主代理隔离探针提供根因复现：真实 Shell/ContentTabs 内注入合成段落，内层宽由 436.40625px 降至 4.71875px，行数从 3 增至 53，收起末卸载。探针替换业务 body，不能据此声明真实 Monaco、数据库、Electron 或 29 类业务通过。

## 几何与示意准确性

`preview.css:23` 将固定内层置于右裁切视口的 `right:0`；`preview.js:20–21` 设置视口宽 V、内层宽 W 和 `translateX(W−V)`。若视口右边界为 R，则内层屏幕左边为 `R−W+(W−V)=R−V`：收起时整块向右移动，完整宽度保持不变，屏幕边缘只裁切内容。没有 scale 或逐帧收窄业务内层。左侧 `preview.js:22–23` 使用 V−W，方向镜像。

动画曲线和 420/560ms 时长与真实 `sidebar-layout.ts:37–41`、`useSidebarDrawer.ts:174、187` 一致。`preview.js:45–59` 从当前可见位置换向并保留 W，减少动态效果直接落终态；`:37–43` 在任一抽屉动作中延迟模式和完整宽度重算。设计中正常窗口/分栏调整与抽屉动作的区别清楚，不强行取消业务正文原有多行。

目视 `preview-mid-paper.png`、`preview-form-paper.png`、`preview-narrow.png`：右侧中途呈现被边缘遮挡的完整正文，表单列和卡片尺寸合理，窄屏以工作区全宽显示。示意内容和审核工具均标注设计用途，没有被描述为安装版业务或真实原生窗控。

## 本轮问题与修订复核

1. 初稿 `research.md:9` 的左内层行号未涵盖 inner；已改成真实 `DashboardShell.tsx:35–39`。
2. 初稿 900px 示意保留左 260px、右 270px，对话仅 368px，不符合原 420px 终态。修订后的 `preview.js:9–14` 加入像素投影并扣除工作区边框。独立实测 900px 下左约 208.6px、右约 269.39px、对话约 420.016px，符合可用宽度和原约束。
3. 动作中全屏按钮禁用，HTML 不能证明全屏命令替换 content 轴。`product-design.md:35` 已明确媒介只展示静止全屏和全屏态收起，中途全屏/真实 Tab/Portal/编辑器生命周期留待正式组件验证。该限制没有被写成已通过。

## 独立运行核验

使用本地 `file:` URL、隔离 headless Chrome 154、阻断 HTTP 的内联 Playwright 采样命令（Node v20.12.2，仅用于 HTML 媒介采样）。几何比较使用 0.1px 容差，避免浏览器子像素量化被误当成变形。最终补审命令退出 0，结果为：

- 玄墨/宣纸 × 正文/表单四组，收起中与换向中完整宽高、相对控件几何和文字行框均保持不变；右内层左边与裁切视口左边在容差内相同。
- 合成 textarea 草稿和内容区滚动在收起/重开后保持。
- 700px 窄屏收起中固定形态和右锚公式保持；减少动态效果即时结束。
- 静止全屏后收起保持开始时完整宽度，并恢复可见对话区。
- 900px 正常终态投影已复测，原初稿的对话不足宽问题消除。

首次诊断采样使用严格浮点相等出现假阴性，后以 0.1px 容差修正；另一次草稿检查误在表单模式操作隐藏的正文 textarea 超时，切回正文后重跑通过。两次均为审核脚本问题，不计为产品失败或产品通过。

主代理 `verify-preview.mjs` 和最终 `preview-checks.json` 另记录 `passed-design-only`：16 段动作/514 个采样帧，逐帧比较正文行框、表单/标题/按钮/textarea 相对几何及无缩放；另覆盖换向、慢放、定格、全屏态收起、窄屏、跨断点及减少动态效果，并对四个生产源文件前后 hash 比较。本代理核对了增强后的采样及断言代码和最终报告。初轮 618 帧报告已被增强后重跑的 514 帧报告替换，不混用统计。此结果作为主代理设计媒介证据，未冒充本代理独立全量运行或真实产品验证。

本轮核心媒介 SHA-256：`index.html` 为 `673ae26379b75c29a88160c08c16a05a9cdf775ff5d57ff97ec03d701b34eb20`；`preview.css` 为 `6320e65c8dce70fedc2de5ade708b9ede668054c509655a2d3115126a8d62004`；`preview.js` 为 `740f6643478b4a818370837fa66888a37f3b965feeb98a49930d8814ecff6e09`。

## 正式实施审核仍需解决的边界

保留唯一布局写入协调器；右固定宽度/phase 不得因 secondary 被全屏或内容命令替换而提前解冻。首次挂载需等待 Panel 注册，W 应考虑实际可用 Panel 宽及 separator，V 必须读真实 DOM。动作中跨断点和同时左右收放按最新 intent 完成，终态保存不能污染原桌面偏好。

隐藏实例须 inert 且不可留下不可见焦点，自动 Tab 展开不能抢占用户主动转移的焦点或业务 Dialog。非模态 portal 菜单/Tooltip/拖拽需明确结束联动，业务 Dialog 和保存门控保留。移动控件产生的原生 no-drag 命中矩形必须在实际 Electron 验证；HTML 窗控轮廓没有证明 Windows/macOS 原生行为。

现有 `sidebar-drawer-fixture.ts:42–43` 替换真实业务 body，原侧栏测试主要覆盖左导航与对话草稿。正式右抽屉用例应覆盖逐帧几何、真实 Monaco 草稿/选区/撤销、代表性业务布局、Portal、保存/恢复/重开、双向断点及 native caption，依台账记录执行范围和未执行项。此次只交付用户可审核的调研与 HTML，不更新产品验收为通过。
