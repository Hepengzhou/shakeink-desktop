# SN-12 M06：运动中的真实 Group resize 协调增量方案与用例

2026-10-14。实施前 hook SHA-256 `3a486b861a2831ddf677a957948b957ddfa7dd7be01ad843bcb5f1d03fe088c9`，Shell `17484465832de9a76faa90eac4703d639932a821d84c8da7c9e54d71f6cded11`。本文件为待独立审核的增量；未执行新red、不据源码推测声明修复通过。

## 实际阻断与源码核查

`windows-development-10/closing-across-899-breakpoint-frames.json` 全32帧及冻结验证器保持不动：preflight W=267.0833435；index6仍closing/wide，V=83.15625、offset=-183.9270935；index7仍closing/wide，V=285.0833435>W、offset=0，raw V−W差18px；index8恢复V=84.8020859。实际renderer从1800到899，height保持1000，mode冻结wide符合设计；后续帧正常不能覆盖这一帧。Windows10仍failed/67 partial，不能重标passed。

安装库 `react-resizable-panels.js:1912–1996` 的自然ResizeObserver以requestedAxisSize/requestedLayout为起点，经Kn preserve-pixel-size投影再fe更新布局；公共setLayout `:1537–1561` 又以当时已存的axisSize更新requestedAxisSize。库ResizeObserver与owner rAF没有固定先后关系，可能在owner按新DOM宽写入后再进行自然投影。当前hook正常moving首writer已清registrationRepin，根级MutationObserver不执行；`resized`的sidebar分支仅geometry。因此后发生的库布局变更没有运动补偿。是否为该次实际异常的完整原因，以新真实Group/API/自然resize/逐次writer trace决定，不伪造库API或延迟其observer来制造red。

另一个待区分路径：`globals.css:2110–2122` 在899媒体条件下隐藏Sidebar后的Separator，且narrowPane=sidebar时给真实Sidebar outer/nested加flex:1!important；desktop frozenwide规则只覆盖display。新trace同时记录每个直接Panel的computed flexGrow/flexShrink/flexBasis/display/width与Separator真实宽/显示，区分API布局覆写和CSS分配变化；不从媒体规则源码直接断言它解释本次18px。若实际证明需要调整frozen mode对应DOM属性或局部CSS，将先独立补审并由根代理处理CSS。

## 最小候选实现边界

1. 保留原Group/Panel/业务实例、现有单一write与单一rAF。宽Sidebar运动的完整W与像素轨道不变；仅维护最近owner帧的意图像素pose，用真实直接Panel可分配宽换算当前百分比。latest secondary轴和该帧轴值继续由原compositor合成，不以DOM或旧完整map覆盖target/lastSize/secondary意图。
2. 将已有根级补偿的有效期覆盖宽Sidebar整个运动及原注册pending窗口。自然窗口/Group resize在geometry前，经同一writer校正当前pose的新百分比；已有onLayoutChanged和直接Panel根style MutationObserver处理owner之后发生的库布局覆写。仅API完整、实际不匹配、非writing时写；不为同值缓存人为扰动尺寸，不加动画循环或访问库私有状态。
3. 根级Observer范围仍只Group childList/style、直接Panel style，不观察inner transform/Monaco/业务后代。固定W、现有Math.min(V−W,0)、V≤W和raw等式不能改变；geometry必须读真正复钉后的V，不添加可见宽度clamp、跳帧、延迟collector或扩大0.1容差。
4. Sidebar终态继续按最新opening/closing intent进入新mode，释放注册协调后静止手动拖宽/读回保持；窄屏全宽不能覆盖桌面偏好。restore取消旧motion和补偿，卸载disconnect/cancel；独立secondary终态pending释放继续保留。修改只限hook/必要Shell及本专项fixture/新测试，不改CSS、业务服务、正式native验证器。

## 新真实用例与观察

新增 `tests/browser/sidebar-drawer-resize.test.ts`，复用现有真实Shell/Group/Panel/原API观察fixture。只增加fixture可选height和deviceScaleFactor，默认值保持原28组。冷挂载真实WorkspaceDraftSource：sidebar15%、chat30%、content55%，1800×1000，sidebar约270px，匹配本次异常小于原20%全宽的边界。

- M06-01：双主题×DPR1/1.5×两个方向1800→899/899→1800，共8条closing；在真实Sidebar按钮click前注册collector，记录preflight、第一moving及全部rAF。初始899时用同一真实Panel窄overlay且恢复pane=sidebar，实际处于open；closing约70ms且实际phase仍closing时用真实page.setViewportSize改变到另一宽度，height保持1000。记录window resize事件、自然Group/Panel ResizeObserver、公共布局change（只观察/转发）及逐次原setLayout输入输出、真实Panel根宽/配置/Divider/inner/caption；不更改观察对象的布局或调度。
- 每个closing样本必须W/H/内部布局/样式不变，V≤固定W+0.1、offset严格等于raw V−W（误差≤0.1），收起V不反增；目标viewport宽期间仍moving且mode保持初始wide/narrow的样本必须存在，不能等terminal后才resize。终态closed、mode依当前viewport进入narrow/wide、V0且最新关闭intent/桌面历史偏好保持；在1800宽重新打开验证原桌面真实宽度偏好，窄overlay的899px不能作为该偏好。窗口高度保持原1000，不引入本次未发生的高度变化要求。
- M06-02：ink+DPR1.5覆盖两个方向opening1800→899/899→1800，先真closed再arm实际可用restore动作（窄初始则原工作区作品目录按钮）；以及closing+同turnfullscreen1800→899，保持各自全部moving W/raw等式与latest intent，次轴最终S/Q0/C100。这3条加M06-01共11新case。各case独立冷挂载，正常自然resize，不重跑直到随机出现红灯。
- M06-03：原28（drawer9+intent5+measurement10+pure4）、新case全部、typecheck，独立增量code review后才进入新的core/build/browser/Windows唯一attempt。Chrome/DPR fixture仅证明该媒介；旧Windows10 failed及之前28green保留原hash，最终真实目标由根代理重建并验收。

执行顺序：本方案/用例原则独审 → 新测试源独审 → 当前生产真实red与完整trace → 依据实际根因最小实现 → 当前全部专项及typecheck → 独立代码补审 → 根代理全量与新Windows。若新fixture不能复现，不声称red或产品已修，继续以真实数据定位并独审调整用例。

## 实际首红后的最小实施增量（待独立审核）

首轮 `red/drawer-resize-m06-initial.tap` 为11条中2通过、9失败、0取消，完整raw保留在 `resize-measurement-red-m06/`。宽起点closing的5条在899跨断点后V反增；4条窄起点closing全部moving几何通过，但后续1800重新打开的15%偏好断言失败；2条opening通过。本次Chrome证据证明下面两个运动路径同时存在，不声称已证明它们与Windows10的18px异常数值完全同因。

`ink-DPR1.5-closing-1800-899.json` 中首次899宽样本fixed W=269.703125、V=9.546875，API为6.793/38.207/55，而实际Sidebar flexGrow为1、flexBasis为0%，两个Separator为display:none/width0；这是legacy媒体CSS越过冻结wide模式。随后owner write#11为11.417/33.583/55，之后公共change为22.834/67.166/10，Sidebar/Chat恰为两倍，这是库自然preserve-pixel-size在owner新宽写入后再次投影。新raw保留window/RO事件、公共change、直接Panel样式和每次API输入/结果，不能以只有后续正常帧覆盖上述变化。

只读 `red/drawer-resize-reopen-diagnostic.json` 还显示反向关闭后重开：closed宽1800仅Content divider，可分配Panel总宽1799，lastSidebar=15；首次open terminal及100ms settled均有两个1px divider、Panel总宽1798、API Sidebar=15.008、lastSidebar=15.0083426028921、真实Sidebar269.84375，而15%应为269.7。稳定误差0.14375超过原0.1。源码startSidebar在结构提交前用1799×15%=269.85生成像素goal，新增divider后将该goal除1798投影，吻合此漂移；不是窄overlay写入lastSidebar，也不是提前读取terminal。正式用例新增首次原断言位置的同步读回与后5个rAF诊断，仍只对首次actual/available执行原15%和0.1断言。

获独立增量审核后实施以下三个局部改动：

1. Shell仅在`drawer.mode === "narrow"`时输出DOM `data-narrow-pane`。state、adapter和持久化narrowPane不变，冻结wide越过899/679时不匹配legacy pane-specific `flex:1!important`。根代理在desktop.css已有冻结mode规则旁增加 `.dashboard-shell[data-drawer-mode="wide"] .workspace-group > [data-separator] { display:block!important; }`，只显示本来由原条件挂载的分隔条，保持真实可分配宽。不得给Panel硬编码flex比例、不删除globals媒体规则、不新增面板。
2. hook保存最近owner motion的Sidebar意图像素pose（从真实动作起点开始，以后只由原rAF轨道更新）。已有window/Group resize、public onLayoutChanged及限定Group/直接Panel style的MutationObserver在整个wide Sidebar运动与原registration pending期间调用同一补偿函数：以当前真实Panel总宽把该pose换算Sidebar百分比，使用当前compositor拥有的secondary轴及当前轴值合成完整current；只有原API完整、不同值、非writing时经唯一write修正。不得用异常DOM Sidebar宽或库旧layout覆盖目标/lastprefs/secondary，不加rAF，不访问库cache。自然库晚写或公共callback去重时，原MO负责在paint前复钉并更新geometry；自身同值style回调不再次write。narrow overlay不走桌面补偿，idle手动拖宽不被此分支接管。
3. 为首次wide opening单独保留已投影的目标百分比，直到本次真实DOM结构提交后、原第一moving writer开始前，以已挂载Separator的实际可分配宽初始化完整W和像素goal。这时V仍为0，不能让完整形态在首positive或以后的任何moving帧改变。反向换向保留原W；同turn secondary动作按最终共同目标投影；已运行的运动遇resize仍保像素W和goal，不重新按历史百分比变大。终态继续由原target投影/约束流程保存，restore取消该初始化记录与motion，卸载清理原observer。禁止猜测divider恒为1px、把误差放宽、以额外5诊断帧替换首次断言。

实施验收仍为原28+新11全部实际通过、typecheck与独立code review，随后根代理重新执行core/build/browser和冻结验证器Windows验收。旧首红及Windows10 failed证据不改。
