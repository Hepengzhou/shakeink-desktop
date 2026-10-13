# 右侧内容抽屉正式方案：独立审核

日期：2026-10-13（Asia/Shanghai）。用户已批准 HTML 交互；本轮审核 `2026-10-13-content-drawer-plan.md` 与当前真实 hook/Shell/ContentTabs/CSS，并只读核对共享浮层、Tab 拖拽、workspace 序列化和 zoom 调用。本代理只写本审核文件，未改生产源、用例或其他工作区修改。

补审结论：**修订后的正式方案通过独立审核，四项 P2 方案阻断均已关闭，可进入正式测试用例编写及独立审核阶段。** 无需重新请求 UI 批准；用户已批准的 UI 和自动推进授权继续有效。此结论只准入用例阶段，不代表实现、专项测试、全量回归或产品验收通过。本轮没有运行修改后产品。

## 修订补审

重新核对本方案修订版及当前实际共享 DropdownMenu、Tooltip、Select、Dialog 和直接 Popover 源码，确认以下修订足以执行：

| 原问题 | 修订依据 | 补审结果 |
| --- | --- | --- |
| P2-1 浮层 owner/范围缺口 | 方案第 35、45 行：内容局部 context，共享根与 ItemLevelPicker 直接 Popover 接入，paused 时关闭并防止 controlled open 复活；Dialog 子树 reset 为 null；strip 取消列入范围 | 关闭。可以局部暂停外层非模态 Portal，同时保留业务 Dialog 和其中的 Select；不依赖全局 Escape、不改变业务数据/渲染结构。 |
| P2-2 窄屏序列化冲突 | 第 17、19–25 行：首次显示/Tab 激活置 visible=true，返回 chat 保留 true，真正隐藏置 false 且 pane=chat；覆盖层像素不保存，不另改 schema | 关闭。所定义状态组合可由现有 strict schema 和 settledWorkspaceLayout 表达，已避免 visible=false/pane=content 被归一化吞掉。 |
| P2-3 全屏/phase/restore 未定义 | 第 24–27、31 行：hidden/closing full 忽略，open/opening 可承接；右 phase 等所有相关运动与最终写入后解冻；restore hidden 保留现有挂载实例 | 关闭。不再以仅 mounted 作为 full 许可，也不再把一次 secondary 完成作为解除冻结条件。 |
| P2-4 中途 zoom 过度承诺 | 第 11 行：明确主动 zoom 的立即整窗物理缩放边界，冻结动作 captionZoom 与 CSS 排版几何，不宣称物理像素不变；显式样式变更不计为同样式帧 | 关闭。保证抽屉引起的排版变化与用户独立样式请求有明确边界，可编写有意义的固定 zoom 和 CSS 几何用例。 |

实现和用例阶段继续核对以下细节，作为上述已明确要求的落实检查，不增加新的方案阻断：暂停时 strip 的 cancel 不提交、不抢焦并取消待执行 focus rAF；owned Portal 的关闭 finalFocus 不落回 inert trigger；Dialog reset context 后其内部 Select 和文字输入仍可用；冻结 captionZoom 应覆盖有/无 Tab 两个 caption 分支，尤其 empty caption 使用的 `--desktop-caption-zoom` 规则及内联安全 padding，不能只冻结 Tab 专用 scale；窄屏 sidebar 覆盖、chat focus 与跨断点继续符合最新 intent 和命令表。

下面保留初稿问题、源码依据与最小修订建议作为审核历史。它们在本次补审已关闭，不应再据此把方案标记为阻断。

## 已明确且合理的部分

- 方案第 7 行的右锚公式正确：内层屏幕左边为 `R−W+(W−V)=R−V`，W/H 固定且无 scale。实际 Panel 可用宽需排除 separator，首帧注册完成再确定完整几何，避免零宽/默认宽闪现。
- 第 9–11 行保留唯一 Group writer，明确右独立 phase 和 secondary 轴替换后的冻结，不再把右动画定义为 `secondary.axis === content`。源码 `useSidebarDrawer.ts:87–120` 的唯一写入机制应继续复用。
- 第 15–17 行提出窄屏右覆盖层/独立像素轨道、动作中延迟 CSS 模式切换；第 21 行明确隐藏目标和 minSize 均为 0、保留 Panel 与实例、去掉隐藏 separator。方向符合批准设计。
- 第 25 行要求焦点恢复具有 ownership，自动 Tab 展开不抢焦，业务 Dialog 保留。第 27 行明确动作/隐藏时重置内部 app-region，Windows HWND 另验、macOS 未执行不计通过，证据边界正确。
- 第 37–42 行按基线、用例审核、red/green、code review、全量和真实系统验证顺序执行；原型和替换 body 的证据不替代真实编辑器/原生系统。

## 初稿 P2-1（已关闭）：业务浮层关闭承诺缺少实现范围和 owner 协议

方案第 23 行要求关闭所有所属业务非模态浮层，生产范围第 31 行却只有 Shell、hook、ContentTabs、ChatPanel、CSS 和纯几何 helper。Shell 内层的 inert 不会覆盖挂到 body 的 Portal。

源码证据：`src/components/ui/dropdown-menu.tsx:9–10、34–48` 目前原样转发 Root，Popup 在 Portal；真实业务 `src/components/content/character-arc/arc-chain.tsx:194–240`、`LevelSystemEditor.tsx:277–310` 使用它。`ItemLevelPicker.tsx:254–307` 则直接使用 Base UI Popover/Portal，不能只改公共 DropdownMenu 就声称全部浮层关闭。`src/components/ui/tooltip.tsx:20–21、46–49` 的 Tooltip 亦独立 Portal。

最小修订：在方案列出内容局部暂停 context/owner 注册或等价的所属触发器协议，纳入必要共享 primitive 与直接使用 Base UI 的最小接入文件，只改暂停/关闭联动，不改业务渲染或服务。明确 controlled/uncontrolled open、Dialog 不被误关、关闭 finalFocus 不送回 inert 触发器。禁止全局 Escape；业务 Dialog 内的菜单也不能因其 React ancestor 属于内容而被无差别暂停。

同属范围缺口：`useContentTabStrip.ts:73–84` 的普通 cancel 会将焦点送回源 Tab，`:34–41` 有独立待执行 focus rAF。需要明确暂停时取消拖拽且不提交、抑制抢焦并清理待执行 focus；若需改此 hook，应将它列入职责范围，而不是仅写 ContentTabs 暂停。

## 初稿 P2-2（已关闭）：窄屏 pane 与桌面显隐偏好的序列化定义冲突

方案第 17 行说普通窄屏切 pane 保留桌面显隐偏好、真正隐藏命令更新偏好；尚未定义当桌面 `contentVisible=false` 时“查看内容”/Tab 激活/返回对话分别改变哪些状态和保存什么。

源码证据：`useSidebarDrawer.ts:190–208、223–229` 当前 `selectPane(content)` 直接调用改变偏好的 showContent；`src/lib/desktop/workspace-layout.ts:5` 又将 `contentVisible=false` 的 `narrowPane=content` 归成 chat。`workspace-draft-source.ts:8–14` 是 strict schema，`:37–48、56–58` 会按这个表示读取/恢复。所以仅新增独立窄屏像素轨道并不自动解决偏好与当前 pane 的冲突。

最小修订：增加命令状态表，分别列出真正 show/hide/toggle、普通窄屏 content/chat/sidebar、Tab 激活、chat focus、restore、跨断点的 render pane、桌面 visibility、目标比例、保存/恢复结果。选定如何分离本地展示状态与偏好；若 schema 保持不变，写明可表达的序列化/归一化规则和重新启动行为，不能保存后再被现有归一化吞掉最新 pane。若需要改 workspace helper/source，应加入范围及迁移兼容约束。

## 初稿 P2-3（已关闭）：保活后的全屏入口与 phase 终止条件仍不确定

方案第 9 行要求全屏替换保留冻结到最新轨道终态，第 21 行让 contentMounted 保留；但没有明确隐藏/closing 内容收到 full 命令的行为，也没有定义独立 phase 何时结束。

源码证据：`useSidebarDrawer.ts:211–220` 只以 contentMounted 决定是否可切全屏。保活后隐藏内容也满足此条件。`projectSidebarLayout():15–22` 将内容隐藏的合法终态强制为 chat 可见；但 `composeSidebarLayout():30–34` 的 chat 轴仍按 `100−S−Q` 推导 content。直接沿用当前 full 入口可能在 contentVisible=false 时令内容占满。`useSidebarDrawer.ts:146–150` 又在任一 secondary 结束时统一取消 contentAnimating，不能作为新独立 phase 的结束条件。

最小修订：在命令表选定 full 在 hidden/closing 时为忽略或显式重新打开等确定行为，保持 visibility 与合成终态一致；chat focus 请求不得意外复活已隐藏内容。明确右 phase/geometry lock 的终止谓词：相关 content 像素轨道、承接 full 的 secondary、左右断点冻结和注册 repin 均已落到当前 generation 的最新 intent，再终态投影/解除冻结。restore 必须取消所有轨道、待注册写入和焦点 ownership，已挂载内容恢复 hidden 布局时仍遵循实例保活；非收放 lifecycle 才允许卸载。

## 初稿 P2-4（已关闭）：W/H 固定无法单独履行动作中 zoom 形态冻结

方案第 11 行明确把 zoom 变化纳入动作内完整形态冻结，但第 31 行没有覆盖实际 zoom 应用路径或 caption 的动态几何。

源码证据：`desktop/main/index.ts:410` 立即调用 webContents.setZoomFactor；`src/components/desktop/DesktopApp.tsx:165–166` 立即更新 `--desktop-caption-zoom`；`desktop.css:205–234` 按该值重算 Tab 字体、caption 高、图标和按钮尺寸；`ContentTabs.tsx:88–89` 的平台安全 padding 同步依赖新的 appearance.zoom。即使 W/H 未变，内部相对几何仍可能变动。

最小修订：明确用户主动 zoom/字体配置这种独立外观变更与收放造成的尺寸变化的处理规则。若保留“动作中 zoom 完整冻结”的承诺，须给出实际应用排队或完整几何冻结机制并扩大必要范围，保留设置即时持久化和原生窗控安全区；若此处只是固定 zoom 档位下 resize 验证，应修正文案和用例，不能用固定 .75/1/1.5 档位测试宣称已覆盖中途 zoom。不能把 OS/DPI 或主动字体变化混同为抽屉自身挤压。

## 补审后用例审核重点

首个可见帧的 W/H 和注册 repin，真实 V 而非名义百分比；完整段逐帧比较文字行框和布局几何；收放↔全屏替换/同时左右/窄屏命令与恢复 generation；关闭后真实编辑器实例、草稿、选区、撤销和滚动；owned Portal 暂停及 finalFocus、业务 Dialog 保持和主动移焦；900/899 双向和宽高 resize；隐藏仍挂载 Panel 的 minSize/separator/保存冷启；真实 Windows HWND 和固定 zoom 档位的caption安全区。

上述修改为正式实现和测试可以据以执行的最小边界补齐，不要求改变用户已批准的抽屉视觉。
