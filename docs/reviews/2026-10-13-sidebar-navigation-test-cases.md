# 已批准 v8 导航测试用例

日期：2026-10-13。实施依据：design/sidebar-navigation/product-design.md SN-01–16、technical-plan.md 正式段和执行补充。此文是测试计划，未经执行不能标通过。只用隔离合成作品、角色、卷章、会话，无真实用户资料/Key/模型/供应商请求。

## 测试层与判定

- 纯逻辑：单一布局合成的目标投影、每帧总和、并行/换向/取消、终态存储，以及导航滚动意图。测试明确输入和业务边界，不依赖复制实现。
- 真实 React 浏览器：bundle 真实 SidebarTree/UnavailableWorks/ScenarioLibraryDialog/NavigationLabel 及 DashboardShell，真实 React Query/stores/Panel；仅服务接口数据和不相关重面板可使用标明范围的 fixture。检验 DOM、真实事件/查询/操作、状态与帧几何，不以源代码字符串断言代替行为。HTTP 拦截，不启动监听服务。
- 当前 Windows Electron：构建真实静态 UI/desktop，用临时 dataRoot 的实际 PGlite/IPC、零模型、离线 renderer，原组件打开真实卷章/角色/场景/试验场/对话。记录源码与 bundle hash、系统/尺寸/zoom/主题、截图和帧。CDP 合成输入据实标注；原生 caption/hit-test 另用 Windows 系统输入，不能用 HTMLElement.click 或计算样式代替。
- 现有相关及全量回归：unit/integration、全部 browser、typecheck、UI/desktop build。记录实施前独立基线，失败逐个比对/复跑有疑点的组；全量失败不得称全量通过。macOS 不可用即 not-run。

## 验收用例

| ID | 输入/动作 | 必须观察的结果 |
| --- | --- | --- |
| SN-01 | 双主题、200/260/420px、创建入口鼠标/Enter/Space，新对话后打开历史会话/切分类 | 两入口32px/4px，14/20px、图标18px；NotebookPen/MessageCirclePlus；label新对话；原向导/请求会话可用；新对话任何状态无选中背景/文字/ARIA |
| SN-02 | 短/长真实fixture资料、缺邮箱、头像和无头像、打开账户菜单 | footer72/button52/avatar32；完整菜单能力及真实资料；无假邮箱；字号/渐隐不挤压操作 |
| SN-03 | 展开设定，直接恢复已开的attributes Tab | 导航无属性；registry/服务/已有AttributesPanel仍可达 |
| SN-04 | 中英长短标题/同一标题改名、字体加载/字号11–24、栏宽/zoom .75–2、账户与不可用标题 | 仅scrollWidth>clientWidth+1时24px mask，无ellipsis/换行；完整title/ARIA；徽标/图标/操作未mask；卸载/字体事件无过时更新；抽屉中mask状态不变 |
| SN-05 | 多作品试验场空/加载/错误/有记录，行/+/列表创建改名删除，取消/遮罩/Escape/快速换请求 | 导航永远单行；query仅列表开启/shared cache；弹窗互斥；详情同真实ID；focus回正确入口/记录/新建。guard拒绝/throw/延迟期间取消、其它Tab激活、作品撤销、scope变更均不误关闭/提交，finally解除busy；POST成功guard拒绝只创建一次、列表可重试打开 |
| SN-06 | 200/260/420px，500px短窗和679/899/900/1280窗口 | 顶部/底部固定，树滚动，品牌不挤压，不横向溢出；窄屏当前全宽，桌面偏好不被窄屏覆盖 |
| SN-07 | 鼠标/键盘、hover/引用拖拽、编辑器/会话草稿、关闭重开、真实Windows caption | 原业务动作/cache/key保持，无错误/模型调用/HTTP listener；原安全区和窗控操作可用，目录/数据隔离 |
| SN-08 | scenes已有搜索/scope，切分类/fold，然后点击单行场景入口 | 渲染/切分类/fold不清搜索；点击沿用openAllScenes清偏好并通过原guard打开scenes；无左子场景/空态，右管理/引用能力保留 |
| SN-09 | 点击五Tab、ArrowLeft/Right循环/Home/End、返回先前视图 | role/roving正确、焦点留Tab，独立expanded/scroll；右侧tabs数组/activationNonce/编辑器实例/草稿和会话选择不变 |
| SN-10 | 两可用作品+不可用，全部角色含伏笔/卷章/绑定及未绑定会话；一作品两人物query分别失败/延迟 | 分类无混入，跨全部作品不受works展开影响；人物平铺、正文卷章/独立根菜单、真实对话动作；单query失败不掩盖另一列表，仅双success总0为空；卷章/会话错误不能当空 |
| SN-11 | 短名/长名四身份，作品与角色分类 | Tab上16下12；badge姓名后6px intrinsic左对齐；长名渐隐badge完整，行ARIA含身份 |
| SN-12 | 各栏宽/theme/font/zoom，收开/快速换向、sidebar与content/fullscreen同时命令，窗口中途resize/跨断点、restore/卸载/reducedmotion | 每帧完整innerW/布局/样式/行数不变，只有V−W平移；目标约束200–420/sidebar与chat420/content30%；总和100无负值、最新intent不被旧rAF覆盖；保存目标终态，restore取消旧generation；hidden/moving inert，内部focus转当前可见恢复，opening仍可反向，chat全屏空/非空ContentTabs有入口；native离屏drag/no-drag无邻栏遮挡 |
| SN-13 | 未选Tabhover与五分类切换，新对话active/empty，设定六入口所有作品 | 组/未选透明，selected中性亮底细边foreground/radius6，与右侧Tabs相符；六入口真实ID/action、没有新增业务数据源 |
| SN-14 | 所有type与四role、hover/active、真实封面/头像/伏笔字头像、章节各status | FolderClosed/Open灰色、Pointer只左侧；paper/ink不同tone；图标/字头像/badge同色且hover/active保色；照片与章节原status形色未染色；右Tabs金手指原icon保持 |
| SN-15 | 四视图各作品fold，Enter/Space、body focus、空正文菜单、不可用repair并发；滚动高处fold自然clamp再展开/异步加载/主动wheel/定位 | view+id独立默认open；body hidden/inert保留实例，正文menu独立可用；一个UnavailableWorks flight禁止并发；嵌套expanded不丢；自然clamp保存待恢复desired，用户意图接管，scope/deletedIDs清理；临时hover/menu关闭而业务Dialog输入保留 |
| SN-16 | 两主题/所有尺寸/zoom/短窗/抽屉，Logo资产与focus | 原Seal mark、本地资产；logo30/title17/24/600/.06em，brand44+4/8、gap10、至create16；无重复可访问Logo/网络字体/新增交互，原44DIP caption安全区不变 |

## 首轮红灯与执行记录

实施前先运行新增 sidebar-layout 纯逻辑及真实SidebarTree专项行为测试，必须看到实际未实现的导航Tabs/单行入口/品牌或固定抽屉失败；接口不存在产生的导入失败仅是补充红灯，不能单独证明业务测试有效。green后独立code review，依据review新增竞争边界用例。验证报告逐条填实际路径、命令、计数与限制，未执行不填passed。
# SN-05 真实试验场事务补充用例（2026-10-13）

Windows第三轮真实PATCH 500后，增加 `tests/integration/sidebar-scenario-management.test.ts`，不修改生产前先跑红灯。临时PGlite使用正式迁移、Prisma/context、正式POST/PATCH/GET/DELETE routes；由原auth/ownership判定，直接调用route且无HTTP listener。

- SN-05-DB01：原POST创建有实际角色/场景配置的lab，原PATCH仅改标题；应200/trim标题持久化，cast/sceneIds/premise/prose/其他作品不变，GET与列表读回一致。现全局client在已开启事务中再次borrow预计500，必须实际观察red。
- SN-05-DB02：PATCH同时改标题和加入另作品角色；应400并事务回滚，原标题/配置不变。PATCH访问属于另一作品的lab应404且原记录保留。
- SN-05-DB03：创建turn/node/card子记录，原DELETE应200且指定lab及其子记录移除，其他lab/作品数据保持。

独立审核需确认生产修正只把 `updateScenarioLab` 第一次existing读取从全局prisma换为tx，保留锁后重读、所有校验/保护和原子事务。red、green、相关服务回归、build和新唯一Windows attempt分别保留，旧失败及旧源测试不合并成当前服务通过证据。

# SN-12 真实初帧连续性增量用例（2026-10-13）

新增 `tests/browser/sidebar-drawer-measurement.test.ts`，使用现有真实Shell/Group/Panel/导航fixture，无HTTP listener。先观察当前真实组件red，再改生产；Windows05原始首帧失败保持不动。

- SN-12-M01：1440px真实viewport，显式restore sidebar20%（三栏/正常secondary），静止resize到1800px并等待库保持pixel-size；记preflight每个实际Panel宽度、Separator占位、getLayout/保存sizes与完整innerW。通过真实Sidebar收放事件启动close，每个rAF都记录 phase、外层V、innerW、offset、内部相对rect、样式及绝对caption top/inner height；从第一个moving帧开始全部检查，不丢首帧。所有closing W/内部几何/样式不变，首帧V不能超过preflightW+0.1px、收起V不反增，offset与V−W误差≤0.1px。最终V=0、phaseclosed；用保存的当前实际Sidebar像素偏好重新打开，宽度符合实际分栏可分配宽度。
- SN-12-M02：反向静止resize（1800→1440）及双主题，另覆盖content mounted/fullscreen、首帧关闭中快速反向。只允许真实百分比/可分配宽转换，没有Row/font/layout压缩；动画first frame仍全部检查。新用例检查初帧Divider占位未先变化，不用固定睡眠避开第一帧，也不放宽阈值。
- SN-12-M03：原drawer9、cross-mode intent5及纯逻辑4回归；新的测量路径不得破坏restore明确sizes优先、独立secondary轨道、200–420/420/30%终态、窄overlay偏好或focus/inert。

方案/用例增量独立审核、red、green、独立source review及新Windows attempt分别记录源hash。Chrome fixture通过只证明该媒介；仍需新生产静态bundle在实际Windows同restore/idle-resize场景中的全帧与native命中通过，05不能重标passed。

M01初始20/30/50必须在首次Shell挂载前用真实WorkspaceDraftSource恢复，并建立真实已挂载content Tab。collector在触发真实事件之前先注册rAF，保留preflight/第一moving帧/API布局/真实Panel配置/Divider占位/逐次公共setLayout输入输出；不能等hook写完才开始收集。公共API观察包装只转发安装的原Group/Panel，不模拟其重分配、约束或像素保持行为。若red出现结构提交重施initial百分比，要保留这一帧及其写入时序证明；不能把未复现的getLayout候选当根因。

SN-12-M04补充窗口放大边界：真实cold1440px、20/30/50，先关闭至closed，再于真实恢复按钮click前arm同一collector；opening约70ms把viewport放大1800px。first moving是本次打开所捕获的完整W，全部opening样本（含放大前/后首帧）必须保持W/H/caption，V≤W+既定0.1px且offset严格等于raw V−W；样本中真实Panel总宽>1700证明放大动作在moving期间发生，最终open。关闭终态至下一动作允许按保存尺寸建立本次打开形态，因此不将旧closed内层宽度代替first-moving W。先独立源审核再执行，只在实际失败后依据同一冻结形态scope修复；不从百分比推测直接改产品。

SN-12-M05注册补偿生命周期：真实cold1440三栏，closing70ms时经原WorkspaceDraftSource显式restore25/35/40（历史last尺寸18/55/48），650ms后原adapter尺寸仍明确25/35/40；再次close70ms后真实React unmount，650ms后app无组件且已观察原API writeCount不增加，fixture检查没有pageerror。该项只验证取消/cleanup与已settled目标，不用它替代M01–04全部moving几何。M04全部帧结果已取回后再做真实鼠标Divider35px和原adapter读回，验证pending释放后正常静止手动拖宽。

SN-12-M06覆盖Windows10后续实际resize阻断，独立方案/源审见 `2026-10-14-sidebar-drawer-resize-plan.md`、同名plan-review。新增 `tests/browser/sidebar-drawer-resize.test.ts` 的11组为双主题×DPR1/1.5×1800↔899八条closing、两方向opening及同turnfullscreen一条，实际高度始终1000。首/all raw保留；窗口在真实moving时改变，W/H/内部几何、V≤W/rawV−W/0.1px、关闭单调、模式冻结与终态意图均核。额外只读公开Group callback/原writer/自然RO/Panel flex/Separator观察区分CSS和库路径，不修改被观察的结果或调度。反向reopen原断言位置同步记录首次actual/available/API/目标偏好，后5帧只诊断且不能替代首次15%/0.1px断言。原28和所有历史red保留；此Chrome媒介不替代新构建的Windows正式验证器。

