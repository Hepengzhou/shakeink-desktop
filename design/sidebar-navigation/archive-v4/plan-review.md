# 左导航 UI 独立方案审核 v4

日期：2026-10-13（Asia/Shanghai）。审核人：独立子代理 `sidebar_design_review`。本轮新增范围：分类 Tabs 上下留白（上更大）、角色姓名后紧邻身份标记、固定形态的抽屉收放。完整 v3 历史见 [archive-v3/plan-review.md](archive-v3/plan-review.md)。本轮只写当前审核文档，不改生产或台账，不替用户批准 UI。

## 当前结论

上16px/下12px外间距及角色 name/tag 同组 gap6px 的视觉方案明确。固定完整宽度W、外层可见宽V、translateX=V-W 的抽屉几何可以避免导航因逐帧变窄而重排，且保留真实 DashboardShell/Group/SidebarTree 的方向符合仓库边界。

最终结论：**v4可交用户UI审核，无未解决P0/P1/P2；仅通过用户UI审核前的方案/设计媒介复核**。真实Shell完整布局写入、窄屏CSS、恢复控件、持久化与native区域均已补明确实施边界，下列2项P1/4项P2在方案/原型范围已解决。当前v4独立新增运行、40组主代理报告、逐帧记录、截图及验证说明一致性均已复核。用户尚未批准，正式实现和产品验收未开始，不能把HTML动画作为真实Shell或原生系统已通过。

## v4 初审问题与关闭条件

### P1-01：并行布局动画必须协调完整 setLayout 写入

- 源证据：`DashboardShell.tsx:136–149` 的 sidebar rAF 写完整 sidebar/chat/content，并固定起点 content；`:205–214` 的 content rAF 固定起点 sidebar；`:271–280` 的 chat rAF 同样固定 sidebar。三个闭包同时运行会覆盖彼此的当前值；内层即使固定W，实际裁切V仍可能回跳。`:349–361` 的 content 注册和 `:229–245` 的卸载 repin 也会写完整布局。
- 要求：明确一个实际布局提交者，合成各轴当前意图/原spring/当前约束，每帧只向原Group提交一致layout；或明确不丢请求的受控协调策略。库注册/卸载 repin、恢复和快速换向不能再把旧起点写回正在运行的sidebar。保留原Panel和420/560ms曲线，不重写工作台。仅“读实际V”不足以解决多写入者竞争。
- 关闭条件：技术方案写明提交/协调原则及内容/聊天并行路径；正式用例必须验证两个动作同开、不同先后和中途换向，HTML只能验证单独抽屉媒介。
- 状态：**已解决（方案）**。`technical-plan.md:28–29` 明确单一rAF提交者、sidebar主轴和content/chat第二轴意图、剩余轴推导，原曲线/Panel保留、repin归入同一提交者，并先投影正常终态约束后确定W。真实并行协调器未实现/未验证，后续用例仍必须执行。

### P1-02：恢复/换向及焦点目标在全屏和展开期需真实存在

- 源证据：`ChatPanel.tsx:1698–1708` 只在 sidebarHidden 时显示恢复按钮，`DashboardShell.tsx:164–169,501–502` 展开起始即将 sidebarHidden 改false；若导航动画中inert，原内外按钮都会暂时不可用。chatVisible=false时Chat所在Panel为0宽，ContentTabs当前props/工具栏（`:18–29,53–80`）没有sidebar恢复入口。
- 要求：明确始终在可见、非inert区域的恢复/切换控件；chat全屏时有可见caption目标，展开/收起中都能换向。必要时局部增加ChatPanel/ContentTabs caption状态props或DashboardShell的真实控制插槽，范围不得误写为禁止任何标题控件联动。关闭前焦点不能移到0宽Chat按钮；保留原macOS恢复安全间距、Windows caption换算。
- 关闭条件：产品/技术和HTML明示外部入口生命周期、全屏目标与焦点fallback。正式真实目标检查不能用原型邻栏示意按钮代替。
- 状态：**已解决（方案及原型范围）**。`product-design.md:81`、`technical-plan.md:31` 明确Chat/Content两caption的hidden-or-animating恢复/换向控件、只聚焦实际可见caption、空Tab分支及88px/44DIP/zoom安全区，并允许局部caption props联动。HTML外部切换控件始终可用，独立运行已验证换向、hidden/in-motion inert与复焦；真实两caption/全屏不计通过。

### P2-01：沿用 settledWorkspaceLayout 本身不能保证展开中保存终态

- 源证据：`src/lib/desktop/workspace-layout.ts:7–10` 只在sidebarVisible=false时把sidebar变0；sidebarVisible=true仍使用 `sizes.sidebar`。`DashboardShell.tsx:411–415` 当前adapter读取实际中间layout。仅保留helper调用会在展开中写入中途宽度。`:177–178` 的快速关闭也直接记录当前小宽度，可能覆盖完整恢复目标。
- 要求：adapter读取应先合成目标 settled layout/完整恢复目标，再沿用原helper规范化；不能把opening裁切V或reverse中间宽度当用户分栏偏好。区分手动分栏尺寸、动画起点、完整目标、实际约束后终态；恢复/卸载必须取消旧回调。
- 关闭条件：技术写清具体snapshot口径，正式用例覆盖opening/closing/reverse中捕获及重开恢复。HTML不证明真实WorkspaceLayout存储通过。
- 状态：**已解决（方案）**。`technical-plan.md:30` 明确read返回协调器预计最终sizes/visibility再交原helper，lastSidebarSize保存正常目标，restore取消并替换旧意图，注册后一次落位。真实adapter、保存/重开未验证。

### P2-02：<900px 单视图 CSS 不能直接沿用桌面百分比动画

- 源证据：`src/app/globals.css:2108–2141` 按data-narrow-pane强制sidebar外包装display/flex全宽并隐藏邻栏；`DashboardShell.tsx:486` 的窄屏收起直接setNarrowPane(chat)，原分栏setLayout被该CSS覆盖。`.workspace-sidebar`处于Panel的nested div，本地库 `react-resizable-panels.d.ts:776,820–822` 说明className落内层，elementRef指外层。
- 要求：明确窄屏收放仍保留完整实际宽W的裁切/平移阶段，以及何时才切原窄屏display终态；不把默认260或200–420范围强加给既有全宽单视图。测量用Group/Panel elementRef的真实尺寸，避免把固定W当外层V。min/default/max数值为CSS px，getLayout/setLayout为百分比；受约束时按实际V同步位移。
- 关闭条件：产品/技术明确窄屏和跨899px边界行为；HTML示意不计为真实Group CSS验收。
- 状态：**已解决（方案）**。`technical-plan.md:29,32` 明确Panel/Group.elementRef、窄屏实际全宽W、保留实例的覆盖层/underlay分支、phase结束才进display终态、跨679/900断点完成后校正，不污染桌面偏好。此分支未实施，原型宽度夹限不冒称真实窄屏Group通过。

### P2-03：native drag/no-drag 区域不能由 inert/overflow 推导通过

- 源证据：`src/components/desktop/WindowControls.tsx:9–14` 的侧栏caption为.desktop-drag；`desktop.css:101–102` 全局按钮/角色注册no-drag。`:139–143` 已记录Electron会注册被裁切后代的no-drag布局矩形，并要求对不可见后代重置到initial。`ChatPanel.tsx:1704` 的macOS88px恢复间距与 `desktop.css:117–128` 的Windows44DIP/zoom契约继续有效。
- 要求：明确隐藏/动作期撤销或限制固定内层的原生区域注册，使其只覆盖真实可见有界caption/host；不能只设置inert、pointer-events或overflow就声称native命中正确。具体CSS/元素注册联动保持原控件安全区，减少动态效果仍做状态/区域更新。
- 关闭条件：方案记录有界原生区域处理及真实Electron专项验证，未具备目标系统的项目据实待验收。
- 状态：**已解决（方案边界）**。`technical-plan.md:33,35` 写明moving/hidden撤销平移内层显式app-region注册、静止再恢复；若reset仍注册矩形则改有界host，直到真实鼠标hit-test确认。源代码/计算样式/HTML均不作为native通过，正式两平台/zoom验证仍待执行。

### P2-04：姓名/标记合组后需在按钮可访问名称中保留身份

- 初查原型证据：当时 `viewer.tsx:113` 的row-main aria-label只有姓名，`:116` 将身份标记放入该button内。标记自身aria-label不会覆盖父button显式aria-label，按钮可访问名称仍会只有姓名，未体现产品“完整身份可访问信息”要求。
- 要求：只对角色按钮将可访问名称写为完整姓名及主角/配角/反派/伏笔角色，或用aria-describedby明确关联身份标签；保留真实全文及原操作。非角色名称语义不变。
- 关闭条件：最终HTML/技术方案明确该关联，独立DOM可访问名称核验与标签6px布局一起检查。
- 状态：**已解决（原型及产品要求）**。当前 `viewer.tsx:115,118` 用完整姓名和roleCaption组成父按钮aria-label，主/配/反/伏笔分别提供完整身份；独立检查10个短名角色及长姓名，名称/身份均在button可访问名称中，标记在姓名后6px且不受mask。

## 已核对的真实来源与可行边界

| 检查项 | 源证据与当前结论 |
| --- | --- |
| 原分栏来源 | `DashboardShell.tsx:477–522` 保留Group和三个原Panel；sidebar数值default260/min200/max420，chat min420，content min30%，动作中原最小尺寸临时放开。不得把HTML工作台引入安装版。 |
| 单位和测量 | 库d.ts `:455–457,739–746,807–814,845–850` 明确Panel数字为px、Panel.getSize有inPixels/asPercentage；Group `:540–546` 提供elementRef/getLayout/setLayout。当前Shell `:125,197` 用window.innerWidth换算，v4应测真实Group可用宽并处理边界/zoom，而不是用展示W替代实际V。 |
| 原曲线 | `DashboardShell.tsx:27–43` 临界阻尼springEase、OPEN560/CLOSE420。固定内层只增加裁切/平移，不改变原批准的时长或用scale压缩。 |
| 角色徽标 | `SidebarTree.tsx:272–282` 当前标签flex-1、tag行级sibling、action固定；`:413–418,640–644` 为正式主角/伏笔标记。角色name/tag组允许姓名缩窄与条件渐隐，徽标shrink-0；其他非角色tag与操作位置保持。 |
| Tabs留白 | 产品明确16/12为Tabs自身外margin，加创建区原8px底padding和树区2px顶padding；不能把组高度或按钮高度改高来冒充留白。 |
| 保持实例 | 原 `SidebarTree` 在Shell中未条件卸载（`:486`），ChatPanel保留user.id key（`:497`），ContentTabs仅由既有contentMounted控制。抽屉不得改业务面板key/导航分类/滚动状态或drafts。 |
| Modal/非模态 | `DesktopCommandController.tsx:19–21,50,65–72` 将dialog当应用命令屏障。不得用广播Escape关掉业务Dialog或丢输入；抽屉只关闭所属悬停/非模态菜单，并显式处理portal finalFocus目标。 |
| 继承v3范围 | 新对话MessageCirclePlus、五分类跨所有作品、角色含伏笔、正文原根菜单/空态、未绑定对话、属性仅去入口、场景/试验场单行、24px条件渐隐都保留；真实缓存/动作/29面板不改。该范围源代码与前轮检查在archive-v3，历史结果不计当前v4执行。 |
| 持久化/恢复 | `DashboardShell.tsx:407–439` 原adapter与恢复rAF，以及卸载 `:460–466` 清理沿用；新增抽屉目标/惯性不能留旧回调或使临时裁切宽度写入偏好。 |

## v4独立新增小范围核验

当前 `viewer.tsx:47–66` 的原型使用真实rAF与原临界阻尼420/560ms、generation取消、固定bodyWidth和progress，`:159–172` 仅改变裁切宽度和translate3d。`preview.css:12,14` 为16/12px外间距与name/tag gap6布局。原型相邻区/控件不是原Group/原生caption；慢速预览是审核工具，不进入产品。

独立运行使用已安装无界面Chrome、临时隔离profile、本地file URL、全部HTTP拦截。仅检查本轮新增范围，没有重跑旧业务/全量测试。实际结果：

```json
{"revision":"v4","scope":"independent-offline-synthetic-prototype","results":[{"theme":"玄墨","width":200,"closeFrames":27,"openFrames":37,"shortNameGap":6,"longNameFade":true,"badgeMask":"none","geometryTolerance":0.05},{"theme":"宣纸","width":200,"closeFrames":27,"openFrames":35,"shortNameGap":6,"longNameFade":true,"badgeMask":"none","geometryTolerance":0.05}],"reversalSynchronousJump":0,"nodeIdentityRetained":true,"hiddenFocusBlocked":true,"focusRestored":true,"nonmodalMenuClosed":true,"reducedMotionTerminals":true,"pageErrors":0,"httpRequests":0,"productTests":"not-run","nativeAcceptance":"not-run"}
```

- 双主题200px/500px短窗，Tabs自身外margin实测上16px/下12px，未加高原28px选项。10个短名角色姓名后6px就是标记，长姓名只渐隐姓名、徽标mask为none，完整姓名/身份在可访问名称中。
- close/open合计126个独立采样帧，完整W、创建/选项/树行/name组/徽标/账户的宽高与相对Y在0.05px几何容差内；字体、行高、文字、段落行框数量、mask和overflow状态严格一致。每帧translateX=V-W，scaleX/Y恒1；closed V=0、opened V=W。相同sidebar与tabpanel节点保留。
- 中途反向的同步位置跳变实测0；隐藏/动作期inert与aria-hidden有效，尝试聚焦导航不能进入；完整展开后返回原收起控件。正文非模态菜单在动作开始关闭；减少动态效果直接闭合/展开，inert终态随之更新。

主代理当前 `preview-checks.json` 为revision=v4、passed/40组、0 pageErrors/HTTP；`drawer-frames.json`为17段/772采样帧，记录最大几何差约0.001px（0.05px容差），样式/文字/行数/渐隐仍严格比较。其脚本 `verify-preview.mjs:199–204` 明确逐帧比较、记录容差和精确文本/样式，不是只检查终态。独立复核6个生产源文件hash，全部与报告匹配。主代理先前严格浮点几何断言失败需在验证文档据实保留，不将失败或归档v3结果记为当前通过。

最终 `design-verification.md` 已同步v4/40组/17段772帧，并据实保留两次浮点测量失败和0.05px口径调整；字体/文字/行数/渐隐仍严格一致。独立读取逐帧case数量及最大值，确认为17段、最大0.00100000000000477px。该差值是几何测量舍入范围，实际固定形态由各帧尺寸/相对坐标、样式、文本及行框共同证明，不以宽松容差替代重排检查。

独立目视最终 `preview-v4-final.png`、`preview-drawer-mid.png`、`preview-paper.png`：新增Tabs上下留白及姓名后标记与规格一致；中途只看到被裁切的固定内层，文字、标记与底栏没有挤压/堆叠。截图是合成设计内容，不证明真实caption或业务通过。

没有读真实作品或Key、运行产品或全量测试、修改生产/台账、开HTTP监听服务。原型节点身份及焦点只证明HTML媒介；单一真实Group协调器、caption安全区、业务Dialog/草稿、存储重开、窄屏CSS和native鼠标命中均仍待正式实施验证。

- `uiRevision=v4`
- `planReview=passed-for-user-ui-review-only`
- `htmlDesignReview=passed`
- `uiApproval=awaiting-user`
- `implementation=not-started`
- `productTests=not-run`
- `nativeAcceptance=not-run`

收到用户本次UI批准后仍需按AGENTS.md完成独立方案复核、测试用例及独立审核、TDD、代码审查、全量回归与真实目标验收。本报告不解除这些阶段要求。
