# 右侧内容抽屉实施方案

日期：2026-10-13。用户已批准 `design/content-drawer/index.html` 的 UI 交互。目标是右侧收起/展开全过程不因尺寸动画重新换行、不挤压，镜像左导航向右平移裁切；正式工作区继续使用原 React 组件。

## 布局与动画

保留 `useSidebarDrawer` 唯一 Group.setLayout writer 和百分比终态投影。Shell 为 content Panel 增加 elementRef、裁切视口与右锚固定内层，ContentTabs 放入该内层。每次收起捕获实际内容宽 W 和高度 H；展开在 Panel 注册后、任何可见动画帧之前，按实际可用 Panel 宽及投影目标确定 W/H。Group 的 separator 不计入 Panel 排版宽。每帧读取实际 content 可见宽 V，内层 `right:0; width:W; translateX(max(W−V,0))`，其相对控件、文字行框和编辑器宽度不随 V 改变。H 在动作内固定，窗口高度变化只改变裁切，动作外恢复真实尺寸。

右侧有独立 contentPhase、冻结几何和窄屏像素运动，不将是否冻结直接等同于 secondary.axis=content。宽屏仍由原 secondary content/chat 轨道合成占位；全屏命令替换 secondary 时，右侧冻结保留到最新轨道终态，动作中不改内层宽度。V超过冻结W时不缩放，完成后才落到新全屏排版。收起420ms、展开560ms、原springProgress无过冲；反向从当前可见宽续行，沿用未完成动作W/H。减动模式直接到终态。

左右同时收放仍在同一rAF中合成，不能引入第二Group writer。窗口宽/高变化期间冻结完整形态和模式，双方动作结束后再处理断点与合法终态。主动zoom由既有main立即应用，这是用户要求的整窗物理缩放；本次保证CSS排版几何不因抽屉收放重排，不承诺物理像素不变。内层W/H仍冻结，并记录动作开始captionZoom；ContentTabs用该值冻结--content-tab-scale与平台caption安全padding，动作结束再接受当前zoom。窗口OS scale和主动主题/字号变更另属显式用户样式请求，不把相关帧冒充相同样式抽屉通过。restore明确取消旧轨道、冻结与延迟焦点，按新布局立即重建几何，不让旧命令覆盖新状态。保存协调器目标和last完整宽偏好，排除中间尺寸。

## 窄窗口

900px阈值与左导航保持一致。右内容为绝对定位在工作区右缘的全宽覆盖层，对话保留在下层；窄屏V采用独立像素轨道，既有桌面百分比偏好不因覆盖层写入。左导航仍可在内容之上覆盖。

“查看内容”/Tab激活打开右抽屉并选择内容；首次显示必须置contentVisible=true，这是原有显示命令语义。“返回对话”仅关闭覆盖层，保留已开启的contentVisible及桌面比例；真正“隐藏内容面板”命令置contentVisible=false。宽↔窄动作中不立即切CSS分支，完成时落实最新命令的pane与显隐。content初次挂载等待库注册，隐藏后保留Panel，不能默认宽或零宽闪现。

| 命令 | 宽屏 | 窄屏呈现 | 保存规则 |
| --- | --- | --- | --- |
| showContent / Tab激活 | 显示content并置visible=true | visible=true，打开右覆盖层，pane=content；关闭左覆盖层 | 目标三栏比例，不保存窄屏V/W |
| selectPane(chat) | 沿原showChat | 关闭右覆盖层，pane=chat；visible不变 | contentVisible=true可配pane=chat，现有schema与settled规则支持 |
| toggleContent | 按visible显隐 | 按当前phase/最新呈现意图开关；打开置visible=true，真正隐藏置false | visible=false时pane=chat，避免归一化吞掉pane |
| fullscreen | visible=true的open/opening可替换secondary，保留冻结到最新终态 | 覆盖层已全宽，忽略全屏几何命令 | visible=false或closing时忽略，无可见操作入口，不产生幽灵content占位 |
| restore | 取消所有旧运动，按输入落位 | 依据visible/pane构建覆盖层终态 | 不另改schema；apply隐藏状态保留已存在的挂载实例 |

contentPhase只在所有影响本次几何的相关运动完成且最终目标已写入时解冻；左右并发时允许阶段保持opening/closing直到共同合法终态，不能在一次secondary结束时无条件清空冻结。

2026-10-14 TDD 补充：跨断点后隐藏保活的 ContentTabs 可能仍持有旧 viewport capacity/compact/overflow metrics。新展开先让完整 W/H 落到真实 DOM，通过局部 context 注册的 strip.prepare 同步测量；若真实已提交的 tools compact/overflow 与新计算不一致，正常请求 React 状态提交，owner 保持实际 V=0、未启动运动时钟，并在后续 rAF 再测到 ready 才启动。不是硬等固定帧数，不使用 flushSync，不排除首个可见帧断言。既有冻结的 closing/反向/fullscreen 替换无须重新准备；prepare 只测量 caption，不排序、回焦或替换业务实例。

首次挂载之前同 task 开/关/开时，隐藏命令停止旧 ready 等待，但保留“完整注册 W 尚未准备”的事实和原投影比例；新的展开须完成注册/metrics 准备，已可见且准备完成的反向沿用原 W。Restore 在首写后保留局部合法 target pin，真实 Group.onLayoutChanged 的非用户注册完成回调在新 separator 拓扑中经唯一 writer 确认/重写精确 target 后移交；自身 API 写不能充当注册 ack。库仅在 pointer-up 才报告用户 meta，因此在任何 restore/repin 写入前还检查本 Group 的真实 direct separator active 状态，真实手势开始即移交，避免中途 observer 覆盖拖动；结束/键盘用户 meta、新显隐/全屏命令、窗口真实宽高变更、新 restore 或 unmount 亦清旧保护。常规窗口 resize/preserve-pixel 偏好与手动分栏行为保持，不通过任意计时帧释放，也不永久钳制库回调。

## 实例及交互

contentMounted只负责首次创建，收放不置false。隐藏Panel目标为0、minSize为0，无separator占位；ContentTabs和业务实例保留，实际关闭Tab/账户/目录的原生命周期继续。原内容Tab保活逻辑和业务registry不改。

右动画/隐藏状态为inert和aria-hidden，保留对话caption中的可见恢复/换向入口；`contentHidden`在动画中也为true。增加可稳定定位的data-content-restore；恢复按钮切换最新意图，不只能单向show。内容caption临时菜单受interactionPaused关闭，useContentTabStrip取消拖拽而不提交排序，业务Dialog的输入及保存门控保留。

新增内容局部ContentDrawerInteractionContext包住真实ContentTabs，传paused与动作captionZoom，React Portal继续继承此context。实际共享DropdownMenu/Tooltip/Select根节点，以及`ItemLevelPicker.tsx`直接使用的Popover，仅在此context内受暂停约束；局部封装open状态，暂停强制关闭并阻止恢复时自动复活（含controlled root），新的用户主动打开才恢复。Portal暂停立即inert/隐藏，退出动画也不能留下no-drag注册。Context默认null，内容区外共享primitive走原逻辑。共享Dialog根在其子树重置context为null，业务Dialog保持挂载、输入以及Dialog内的Select等正常可用；不得因外部抽屉隐藏而禁用弹窗。原native文本菜单和Monaco弹出控件依自身可用目标检查/blur取消，不模拟全局Escape。

保留实例后的不可见编辑器不再能接收全局编辑命令：必要时在use-command-target与command-runtime的editor候选判断排除inert/hidden祖先。只增加可见性门控，不改命令来源和历史。

开始隐藏若焦点在内容（或其非模态浮层），先记录目标并在可见恢复入口出现后移焦；完成打开只在焦点仍由恢复流程持有时回原目标，用户已主动转移或有Dialog时不抢焦点。自动Tab激活只展开，不将原外部焦点挪入内容。失效目标回内容caption按钮。

2026-10-14 实际手势补充：对话 caption 的右恢复按钮随 chat 边缘移动，真实主鼠标键按住 80ms 时可在原点松开而失去 pointer-up/click。只在始于该按钮的实际主鼠标键 pointer-down 保留 pointer capture，浏览器按正常 up/cancel 释放；仍由既有 onClick 发出最新 toggle 意图，键盘与 no-drag/外观不变，不固定位置或调用测试回调。

原生标题栏：右内层动作/隐藏时所有内部app-region重置为initial，防止越界no-drag矩形覆盖邻栏caption；原窗控固定在原生区域。动作结束恢复真实caption拖拽/控件排除，真实Windows HWND命中另验，macOS未执行不得计通过。

## 文件范围与职责

生产范围：`src/components/layout/useSidebarDrawer.ts`、`DashboardShell.tsx`、`ContentTabs.tsx`的交互暂停、`ChatPanel.tsx`的caption、`src/app/desktop.css`；新局部context/helper、`useContentTabStrip.ts`取消边界与首可见之前的 caption 测量/ready API（2026-10-14 基于真实逐帧失败扩准，不改排序逻辑）；共享`ui/dropdown-menu.tsx`、`tooltip.tsx`、`select.tsx`、`dialog.tsx`局部暂停/Modal边界，`content/ItemLevelPicker.tsx`直接Popover暂停；必要时`src/lib/desktop/use-command-target.ts`、`command-runtime.ts`不可见目标门控。不改变29类业务数据或渲染结构、AI/composer，不移植HTML示意。保留全部已有未提交修改。

主代理负责测试、组合、真实验证和台账；实现子代理限定上述生产文件；独立审核子代理只写对应方案、用例及代码审核报告。native验证脚本必须用新建隔离根、真实PGlite/IPC/原组件，0模型，无HTTP监听，不记录真实用户数据/Key。原型与隔离业务body结果独立于真实产品证据。

## 验证次序

1. 保存完整core基线及相关浏览器旧用例基线，完成本方案独立审核。
2. 编写CD-01–07正式用例并独立审核，运行未修复版本产生真实red。
3. TDD实现，专项逐帧/竞态/实例/焦点用例green，独立code review并修复阻断。
4. TypeScript、全部活动unit/integration及browser、UI/desktop构建和包检查。已有失败逐标题与本次基线比对，不将既有失败/未执行计通过；构建和读取历史chunks的浏览器回归顺序执行。
5. 实际Windows Electron及目录包：正文/表单/长标题逐帧、Monaco草稿/选区/撤销/实例、双主题、手动分栏、窄屏/跨断点/减动、目标持久化冷启、实际原生caption命中、离线启动。
6. 据实更新requirements-traceability及migration-map。用户目标的专项通过不代表全仓或macOS全部通过，残留差异明确记录。
