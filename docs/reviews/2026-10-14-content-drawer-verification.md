# 右侧内容抽屉验证记录

日期：2026-10-14。**已按用户确认收尾。** 用户最新确认：“此任务目前已满足要求，可以直接收尾了”。不再追加运行，任务按用户认可的现有范围完成；真实 Windows 完整矩阵未获整轮通过，目录包动画未执行，不将用户验收改写为全部自动化通过。可见根因 red → 专项 TDD → 独立代码审核已完成，完整浏览器559/559及匹配构建通过。原型、隔离业务 body 和真实产品证据分开记录。

## 当前结果

| 检查 | 结果 | 最终证据 |
| --- | --- | --- |
| 抽屉相关组合 | 62/62 通过 | `green-05/run.json` |
| 全量浏览器 | 53文件，559/559通过 | `regression-browser-02/browser.json` |
| 正式构建 | tsc、命令生成、Prisma、Next、desktop 五阶段通过 | `build-02/build.json` |
| 测试迁移后类型检查 | 通过；仅类型检查，没有另行重建 | `final-typecheck-01/build.json` |
| 全 core | 1932/1977通过；39失败、4取消、2跳过 | `regression-core-01/core.json` |
| core 新增超时标题复核 | 原限时三文件23/23通过，无新增残留失败标题；不覆盖全量原计数 | `core-timeout-recheck-01/core.json`、`core-comparison.json` |
| Windows 目录打包 | 打包阶段及340项资源检查通过 | `package-01/package.json` |
| 原整套包装用例 | 13项中8通过、5失败，含本机不可执行的macOS/ZIP加载及已有Windows路径项 | `package-01/package.json` |
| 开发构建实际 Windows 动画 | 已结束；21有44段/80check部分通过，22整轮failed（主动缩放迟到）；冷启恢复修订、空caption余项未执行 | `windows-development-21/report.json`、`windows-development-22/report.json` |
| 目录包实际 Windows 动画 | 未执行；按用户确认不再追加 | 无通过报告 |

上表证据路径相对于 `docs/evidence/content-drawer/`；以下保留基线、失败和修复过程的具体边界。

## 修改前及 TDD

| 层级 | 已执行结果 | 证据与边界 |
| --- | --- | --- |
| HTML 设计验证 | 16 段运动，514 个采样帧通过 | `design/content-drawer/preview-checks.json`；只验证设计稿 |
| 原相关用例基线 | 18/18 通过 | `docs/evidence/content-drawer/baseline-related.tap`；并非 TAP reporter 格式 |
| 全 core 基线 | 1977 tests，1935 pass，39 fail，1 cancelled，2 skipped | `docs/evidence/content-drawer/baseline-core-01/core.json`；274 个活动文件，Node v24.19.0，源 hash 稳定；不得把 fail/cancelled/skipped 计为通过 |
| 可见根因 red | 双主题 0/2 pass，2 fail | `docs/evidence/content-drawer/red-02/root-cause.tap`；可见内容随 V 缩至 7.421875/26.125px，预期 W=436.40625px；无 pageerror |
| 初轮完整专项 | 55 tests，46 pass，9 fail | `docs/evidence/content-drawer/green-02/drawer-suite.tap`；其中 33 个旧相关通过，新 22 个为 13 pass / 9 fail；保留失败，不作最终 green |
| 共享浮层补充 red | 3 tests，0 pass，3 fail | `docs/evidence/content-drawer/red-03/popup-review.tap`；真实取消及 defaultOpen / controlled 子菜单，不替代动画根因 red |
| 静止鼠标 Tooltip red | 1 test，0 pass，1 fail | `docs/evidence/content-drawer/red-04/tooltip-stationary.tap`；不发新 pointer/keyboard 输入，内容移回旧指针下时旧提示实际复活 |
| 浮层收敛检查 | 11/11 通过 | `docs/evidence/content-drawer/green-03/popup.tap`；实际为 Node spec reporter，不能按 TAP 格式解析；未替代最终组合回归 |
| 主代理几何检查 | 15 tests，13 pass，2 fail | `docs/evidence/content-drawer/geometry-01/geometry.json`；测量源 hash 稳定，跨断点标签 27→55px、恢复比例 24.941≠25 继续修复 |
| 跨断点准备复验 | 2/2 通过 | `docs/evidence/content-drawer/geometry-02/geometry.tap`；首可见前真实标签测量准备，不放宽原 controls 断言 |
| 首次创建补充检查 | 2 tests，1 pass，1 fail | `docs/evidence/content-drawer/red-05/caption-preparation.tap`；长标题实际收敛通过；未挂载前连续三次真实命令的首可见 W749.609375≠最终749.234375，仍需修未完成准备事实 |
| 准备状态修复复验 | 4/4 通过 | `docs/evidence/content-drawer/geometry-03/caption-preparation.tap`；长标题、首次创建快切及跨断点两个方向均通过 |
| 实际恢复后手动拖动 | 1/1 通过 | `restore-green-04/restore.tap`；原比例恢复、真实 active pointer 起点移交、40px 拖动及 240ms 不回滚 |
| 有效按下后移动按钮 red | 1 test，0 pass，1 fail | `red-07/held-pointer.tap`；closing 中真实 button down，固定坐标 80ms 后 up 丢失按钮，没有 click；red-06 仅为 setup 诊断 |
| 指针捕获复验 | 2/2 通过 | `pointer-green-01/held-pointer.tap`；原瞬时点击与新增真实 held 路径。不能认定 green-04 单次最终意图失败已证明同根因 |
| 最终相关组合 | 62/62 通过，0 fail/cancelled/skipped/todo | `green-05/drawer-suite.tap` 与 `run.json`；新增 29 + 旧相关 33，Node 24.19.0、真实 Chrome、17 份被测生产/测试 hash 前后一致 |

正式独立代码审核为 `docs/reviews/2026-10-14-content-drawer-code-review.md`，七项 P2 已闭环，准入组合验证，无未解决的范围内代码阻断。它不替代真实产品验收。

`red-01` 针对零宽注册准备帧产生 oracle 诊断，不能代替真实可见挤压 red。`green-01/02` 的 ARIA 定位、Select label、外部菜单退出等待、外部焦点遮挡和运动按钮 pointer action 修订均经独立审核；owned popup 首 rAF 暂停及逐帧几何断言不因此放宽。899→900 的一次重开缺帧失败保留；独立连续复现获得完整帧不等于已证明其根因。

## 专项测量方法

隔离浏览器用例使用真实 Shell、Group/Panel、布局 hook、SidebarTree、ContentTabs、共享 primitives、命令和工作区 adapter，仅隔离无关业务 body。正文自然换行并含两列字段；逐 rAF 测量实际可见 V、完整 W/H、文字 Range 行框、真实标签/标题栏/按钮/输入框尺寸、相对坐标、caption zoom/padding、矩阵和右锚平移。实际 V 与 phase 联合界定连续运动，不能提前结束 phase 漏验仍在变化的 V。

首次注册的不可见 V=0 样本保留；形态比较从首个真正可见帧开始。随后收起的 V=0 冻结帧继续比较。快速换向的按钮需实际可见、非 inert 并命中有效点，再发真实 pointer，不等待按钮因动画稳定而错失换向时序。隐藏实例、草稿、选区、滚动、焦点所有权、编辑目标门控、浮层、Dialog 边界、标签取消和 app-region CSS 分别验证。

共享 popup 的取消语义、子菜单旧 open 意图和静止鼠标 Tooltip 为独立 code review 发现的问题；对应附加 TDD 均已进入最终 green-05。真实 Chromium 的布局 enter 为 trusted、坐标不变、movementX/Y=0，期间无 pointermove/mousemove；仅检查 isTrusted 不能认定新的用户操作。恢复后同一 trigger 内真实移动 2px 仍应能打开新提示，不能靠永久禁用浮层消除旧意图。最终 TypeScript 正式检查记录在 build-02，退出 0。

`restore-diagnostic-01` 的单次逐帧 read 诊断未复现偏差，不能反证原失败。随后 `restore-diagnostic-02/report.json` 在恢复后的 900ms 内不读取 adapter、不强制 DOM layout，仅用 MutationObserver 记录 style；六次第六次复现：20.3–24.6ms 已正确写入 25/75/0，32ms 后库迟写为 24.941/75.059/0，最终实际 sidebar=319px、chat=960px、可用宽=1279px，target 与 lastSidebarSize 也被污染为 24.941。该诊断源 hash 稳定；这是需要修复的恢复目标覆写，不能放宽比例容差消除。

修复后的 `restore-diagnostic-03/report.json` 在相同无 read / 无强制 layout 条件下连续八次保持精确 25，源 hash 稳定。新手动拖动检查先在 `restore-green-01/02` 发现 1px separator 的 DOM contains 定位不符合库的扩展命中区域，保留为定位诊断；独立审核库实际全局 hitRegion 后，`restore-green-03` 按同 Group、非 inert / 无外部遮挡、真实 separator hover、pointer down / move40px / up 执行，实际偏好未增加。恢复保护在末尾 meta.user 才释放会在拖动中钳回旧值，必须移交到真实 active 起点。修订后的 `restore-green-04` 以相同实际输入通过，并已进入最终 green-05；前八次只读检查不替代此手动拖动结果。

## 全量与真实目标系统

全 core `regression-core-01` 已执行 274 个活动文件：1977 tests / 1932 pass / 39 fail / 4 cancelled / 2 skipped，Node24、记录源前后一致。相对原基线新增四个 not-ok 标题，均为超时或启动未唤醒：BDC06、BDC07、closed PGlite migration、ROOT11-07。随后相同原限时的三文件串行 `core-timeout-recheck-01` 为 23/23 pass，0 fail/cancelled/skipped/todo；四个标题均实际通过，`core-comparison.json` 记录无新增残留标题。独立复核不覆盖全量原计数，也不能推断四个失败的具体根因或宣称全仓 green。原基线的 authorization 标题本轮通过，其余残留标题原基线已有。

全 browser 首轮 `regression-browser-01` 已执行 53 文件：559 tests / 552 pass / 7 fail / 0 cancelled/skipped/todo，源前后一致，green-05 的 17 份源 hash 与本轮一致。3 DRAG 旧夹具向真实 store 提供不含 settings 的 partial bootstrap；SURF04 的 detached 要求与批准保持挂载冲突。该轮没有 SURF narrow 的具体失败分支记录；两个 sidebar 用例失败在 actual phase 前置，未执行本轮 resize / 形变比较，不冒称 DPR 形变或偶发。后续经独立审核的具名诊断与最小迁移保留几何精度和运动门槛，最终组合结果见下文。

后续 `regression-diagnostic-01` 6 tests / 2 pass / 4 fail，记录源一致：3 DRAG 实际 pageerror / 空 root 证明不完整 bootstrap；SURF 760px 的第三“查看内容”分支实际 left=closed / right=opening，W760.000061 / V12.625，chat760且inert。正确等待右终态后再比较选中 viewport，不能在opening中要求满宽。SURF 的几何原本测 `.workspace-content` 外层V，颜色 selector才指内层；不将两者混淆。两项旧 left 原 driver 在具名诊断正常得到真实 trusted 输入与partial V，本轮未复现原 full phase失败，不能声称其原始根因已确认。

经独立审核的最小旧 fixture 迁移保持身份、颜色、.1/.03px、inert、divider及全部左右几何/phase/partial V判据。`regression-migration-04` 在默认环境（DIAG明确为空）concurrency2为30/30 pass、源一致，14生产源仍与green-05匹配。01 的观察器误装empty-caption setup、03 的环境替换未生效均保留，不伪称默认环境通过。最终全 browser `regression-browser-02` **53文件559/559 pass，0 fail/cancelled/skipped/todo、退出0、源前后一致**，同一14生产源与green-05及当前源逐项匹配。无需改变两项旧 left 的原 driver 或放宽形态断言。最终 `final-typecheck-01` 为明确typecheck-only模式，tsc退出0、记录源一致，不另称新构建。

当前 HEAD 已有另一导航提交，SidebarHoverCard 和 sidebar-drawer-fixture 相比最初 core hash 有差异；不把这些源差异算成本次抽屉生产范围。正式生产审核使用 13 个精确原文件快照及新 context。

真实 Windows harness 使用新建隔离根、真实 Workspaces/PGlite/IPC/DraftJournal、0 模型和 `shakeink://app/` 工作区，观察实际 Monaco editor/model/DOM identity、草稿、选区、滚动、撤销历史，验证正文/代表性表单/长标签、窄屏、缩放、工作区持久化冷启动及实际 HWND WM_NCHITTEST。开发构建和目录包分别执行，证据 label 不可覆盖，源/bundle/exe hash 前后核对。

Native harness 独立准备审核及终态 mode / 隐藏冷启动兼容补审通过。首次 `windows-development-01` 已真实启动合成工作区、0 模型、离线、无 main listening Server，但窗口预置要求 outer=1800，而 Windows 返回 outer=1801，未进入动画验收。失败报告/截图保留；窗口预置层修订将记录 outer/content/renderer，不用外框容差代替精确 CSS 断点。

`windows-development-02` 按严格实际 CSS 尺寸预置成功，真实初始 HWND 命中及 Monaco/长文输入已执行，但正文准备等待旧“已保存”标签超时，尚无动画验收通过。真实 `SaveStatusIndicator` 在存在 staged 修改时将 saved/saving/pending 统一显示“待保存”，截图修改计数为1；不得靠强制确认修改或修改保存机制掩盖夹具错误。N-P2-6 独立补审后的 helper 在输入前绑定真实当前 panel/controller 的 revision/time，核对自然 autosave 完成、唯一同 op/revision 的真实磁盘 journal、精确 staged target/PATCH/字段及稳定 UI，错误不得忽略。GET 的真实状态、字段 hash 和是否匹配待编辑字段单列，不把未确认 staged 值宣称已落 DB。

`development-03` 真实准备通过，随后首次close因测量脚本误取 `getLayoutInfo().contentHeight` 失败：原42帧均无此API字段，不能将NaN比较失败重计pass。独立审核安装Monaco0.56公共接口后，另取真实 `getContentWidth/Height`，全文与可视高度分开记录、全部finite且.25px不变。`development-04` 完整原始数据中仅Monaco固定2^24虚拟canvas的全局矩形w三帧减1，正文行框/普通控件/公共API未变化；原记录无class/local证据，仍failed。只加actual-owned-canvas身份/CSS/offset/client原始诊断后，05的原严格close **37帧、8个actual V中间帧通过，maxDelta=.000122px**；本轮未复现矩形减1，未改sentinel oracle，不能据此重解释04。

05随后hidden caption探针选x1788/y16，实际命中系统关闭按钮HT20：DOM hit-test看不到原生138DIP窗控区，不能记为右抽屉泄漏或HTCAPTION通过。独立审核后的选点仅取actual native/WCO/renderer安全交集，HT2/1期望不变。06的moving probe实际HT2/1正确，但before选择移动的content restore按钮，after.sameButton=false，记inconclusive而不计pass；下一修订仅用真实fixed app-menu控件并继续前后同DOM/point/phase检查。整体目标矩阵仍待完成，以上partial checks不等于整轮通过。

`development-07` 保留原严格矩形断言并再次失败，获得同帧证据：56个完整样本、26个运动区间样本中，唯一真实 Monaco 所属的 `.lines-content.monaco-editor-background` 内部画布在11帧的全局矩形宽为16777215，前置为16777216；其局部 offset/client 宽高始终精确2^24，inline/computed宽高和自身transform不变。11336个正文行框比较的最大差为0.000244px，其他元素、公共编辑器布局/内容尺寸均不变。安装的 Monaco view 源明确将该内部画布设置为2^24，CSSOM的科学计数序列化不是精确尺寸证明。独立审核只准入该唯一真实结构节点的宽高局部交叉判据；其x/y、其他元素、文字和公共API仍保留原0.25px断言，原全局矩形差单独逐帧记录。该修订需源码补审及新label实跑，07不重计为通过。

局部判据的最终脚本 A545506B… 经独立源码补审及 Node24 语法检查，`development-08` 的实际启动hash与其一致、源/bundle/exe前后稳定。首次真实长正文收起57个总帧、26个运动区间帧、23个实际中间V帧通过；局部布局maxDelta=0.000122px，原画布全局矩形宽差max=1px独立保留。随后展开的native probe前后都为opening、安全区/zoom/固定菜单同点均有效、HWND实际HT2/1，但选择的caption点在releasedZone右边缘内12px，展开的移动边缘随后覆盖此点，使sameCaption/leakPointStillValid为false。此sample为inconclusive，08整轮failed；不把瞬时HT2/1或首次close部分通过当成整轮通过。下一选点修订仍须保持前后同caption/真实released zone/safe area/phase及HT2/1严格校验。

独立补审后的5043CB65…脚本在 `development-09` 源/bundle/exe前后稳定，真实正文及角色close/open共4段、19个check通过，包括前后有效的实际HWND命中、编辑器实例/选区/滚动和撤销重做；错误及HTTP请求均0。主题准备的当前controller与唯一同op/revision磁盘autosave均为saved、最新两个字段精确一致、UI待保存且无错误，但helper过滤出的stagedChanges为空而超时；本段尚未开始动画，09整体failed。只读保留的合成日志核实：真实THEME modify targetId为完整请求URL，并非helper传入的novelId；`staged-changes.ts`常规modify实际采用 `Object.values(params)[0] ?? url`，Theme端点无参数。下一修订只校正测试的真实目标身份，所有自然保存/日志/字段/稳定UI要求保留，不修改产品保存机制。

`development-10` 以已补审9F34558C…执行，三个真实保存准备均通过、4段正文/角色动画通过，Select暂停时fresh selector少一个preflight的空SPAN而整体failed。原id42的宽高、offset/client均为0、无文字及行框；该轮尚未采集aria-owns关联，不能反推具体节点身份或改计通过。实际浮层首motion仍可见时为inert，0错误/HTTP、源/包/可执行文件稳定。

经限定runtime-qualified utility方案补审后的 `development-11`（7062E227…）保留全部raw，实际确认新运行中的id45为BaseUI Portal owner：单一aria-owns关联到真实BaseUI DIV Portal，Portal实际包含显式绑定的listbox；节点无role/class/内容/子元素/交互，所有占用尺寸为0，inline/computed样式精确为fixed、top/left0、clipPath inset(50%)。但测试把data-slot=select-content错误要求在listbox本身，实际该slot位于Popup祖先，而List才渲染listbox，资格不符使11整体failed。直接slot=null保持真实，下一限定修订读取并记录实际祖先及同Portal关系，未放宽普通身份/几何/文字、Popup首motion inert或编辑器API。11仍为4段/20check部分通过、0错误/HTTP、版本稳定；旧10/11不重计通过。

匹配构建 `build-01` 的 tsc / Prisma / Next 已通过，desktop 正规校验因命令目录缓存中的 command-runtime source hash 陈旧拒绝。`build-02` 依次重新 tsc → generate:commands → Prisma → Next → desktop，五阶段退出 0，记录的输入列表前后一致，四个必要产物 hash 非空并与实际文件一致。生成目录只更新 command-runtime source hash，Win32 401 / Darwin 417 条命令内容及其 hash 不变，独立补审与真实 verifyCommandCatalogs 均通过；平台注册枚举不能视为 macOS native。构建输入清单边界在 `build.json` 记录，不扩称全部传递构建输入证明。

`package-01` 目录打包阶段退出0，afterPack 实际检查340项资源，真实包内 PGlite query42 / closed=true、Sharp2×3及依赖校验通过，记录源前后一致和当前 exe hash。它不替代目录包的实际 Electron 动画。随后原 `test:package` 整套实际为13 tests / 8 pass / 5 fail：package-archive 文件先因 tsx/CJS top-level-await 加载失败，尚未运行 ZIP 用例；packaged-resources 的3项硬依赖 macOS app，分别因本机静态 guard / mac-arm64 app缺失 / app依赖路径缺失失败；packaging-config 的 Windows路径斜杠正则失败为已有基线项。原退出1与 passed=false 保留，不计整套包装用例通过，也不据此声明 macOS已测。

## 后续 Windows 原始证据

`development-12`（C455…）按实际 Select Popup 祖先读取 slot，真实 Select 暂停及新输入重开通过，6段/22check；随后 Escape 清理等待超时。12仍failed，未证明产品 Escape 根因。13（CEA…）尝试用普通 heading 定位器清理，但真实 BaseUI InternalBackdrop 阻挡，click 未发出，仍failed。独立审核限定的真实坐标清理只用于新输入重开验证之后：点属于同一实际 Portal 的最高层 backdrop、位于实际 Content/Listbox 外，原始 preflight 保存后才发真实 mouse.click 并等待 listbox 隐藏；原暂停动作仍为真实 `desktop.command(view.content)` IPC。

`development-14`（6AA…）完成上述清理、真实 ItemLevelPicker 生命周期、快速换向及双侧收起，共13段/35check、0error/HTTP；双侧展开按普通最终W比较失败。原始数据证明从首可见到两侧运动结束，右内层保持1079.6875px左右，而双侧结束后才因第二条separator加入合法reflow至1079.291748px。实测separator为0.6666666865 CSSpx，原1px后备不适合当前DPR/zoom。所有可见运动的普通节点/文字行数稳定；不重计14通过。

`development-15`（F921…）只在具名双侧展开使用紧接前一双侧收起采到的两条真实separator校准，要求同环境、无后备值；首动作独立目标1079.6899667px。实际右侧partial V后才发送左侧原快捷键，两侧真实partial V重叠已记录；连续运动区间取两侧实际V和phase并集，只有两侧均结束才允许终态拓扑reflow。该轮在左命令尚未启动的旧closed/V0帧上过早要求moving而failed。独立补审只修订首次左phase/physical change之前维持原.001px旧端点及旧phase、启动后距最终端点>.2px必须moving，全部raw、区间、W/H、普通节点、文字、API及inert检查保留。

`development-16` 以补审冻结58B9BA23…执行，双侧展开完整通过，随后全屏close通过、open的真实Monaco scrollTop不一致而failed。最终37check/15段已通过，0error/HTTP；源/bundle/exe前后稳定，原始失败帧及报告保留。独立诊断确认 `hideContent` 恢复chatVisible、`showContent` 使用普通分栏目标，打开前不可见W1512.03125需准备为独立合法目标1091.22709px。idx3的V仍0时scroll10941→13667；首可见idx4至final的scroll及完整编辑器尺寸均稳定。安装Monaco的StableViewport按原模型位置恢复视口，宽度重wrap时绝对像素scroll可改变；原raw没有语义anchor，不改计通过。下一限定补审只允许具名fullopen、对应前fullclose且独立不同完整目标的零V准备，并新增真实公共API读取固定原模型anchor的视口偏移交叉校验；全部首可见及运动像素scroll仍原.1px，普通同宽仍用原preflight，几何/文字/API精度不变。

`development-17` 以补审冻结55DB5D4B…执行，全屏恢复新增实际公共anchor通过：固定原模型位置95:1，准备前/首可见/final相对视口偏移均精确−15px；像素scroll在零V准备时10941→13667，首可见起保持13667。真实Tab拖动取消、双主题、手动分栏及zoom0.75/1.25抽屉收放通过；共28段/55check、0error/HTTP、源/bundle/exe稳定。随后1.25 nativeControls原raw布局框检查把“物品/关闭物品/新物品”列为unsafe而failed；该项在assert前没有保存自己的完整controls诊断。最后open采样及真实CSS显示bounded Tab viewport右缘1228.0001、overflow:hidden，三个末尾Tab的raw框在其右侧之外；caption工具右缘1295.2001，真实安全边界1329.6。原生测试需交叉验证实际裁切和app-region登记，不能以保留离屏布局框直接推断已侵入窗控，也不能重计17通过。下一修订仍保留138/32 DIP安全区及8/9/20真实HWND要求，不改生产。

`development-18` 以补审冻结D1358B96…执行。真实1.25标签viewport/track/source-reset/computed none/危险交集非命中及no-drag ancestor资格通过，独立viewport/tools均安全，实际HWND窗控8/9/20通过；28段/56check、0error/HTTP、源/bundle/exe稳定。随后1.5窗口准备失败：native1800×1000→content1800×1000/renderer1200×666/真实H666.666687，补偿height1001→content1002/renderer668，在四次有界请求中666/668交替，预设Math.round目标667未达。outer仅差1DIP、min760×580、工作区足够，未见clamp。独立准入仅将稳态zoom1.5夹具nativeheight改1002、精确CSS目标668；其余尺寸、原helper精确判据、断点及运动采样全部保留。18仍failed，19需新label实际验证，不能补算旧667通过。

`development-19` 以补审冻结14845377…执行，其字节复原可精确回到18版本，唯一变化为稳态zoom1.5的height1002。实际renderer1200×668达到精确目标；随后该档close因Monaco内部画布的硬编码local2^24要求而failed。唯一真实owned sentinel id48在54个raw帧、26个区间帧中，offset/client宽高均精确14913079，真实TypedComputed numeric px同值，inline科学字符串保持源意图，matrix恒定；raw全局矩形宽差max2px独立记录。独立遍历普通布局max0.000122px、6448项行框坐标比较max0.000122px，IDs/行数/公共API/scroll无差异。不能把科学字符串解析当作精确inline数值，也不凭DPR近似猜测浏览器clamp公式。下一修订仅增加真实attributeStyleMap精确inline2^24意图验证，以独立真实Computed numeric/local交叉确认该唯一结构节点的canonical尺寸；缺资格即fail，原local.25、x/y及全部普通/文字/API断言保持。19无新增inline证据，仍failed；20须新label实际执行。

`development-20` 以补审冻结8C30ABA5…执行，三档稳态zoom动画及native窗控均通过，1.5唯一真实canvas的numeric inline意图2^24与实际computed/local14913079交叉通过。31段/60check、0error/HTTP、源/bundle/exe稳定；随后主动mainzoom1→1.25时普通track宽变化0.53955px、最大普通节点变化0.79999px、10712项文字坐标比较max0.80417px，超过原跨zoom.25断言而failed。IDs/文字行数/字体、padding参数不变，完整W959.75/H1000及editor959×741/content904固定。用户抽屉要求不禁止主动整窗zoom导致像素网格改变，但20未记录逐帧DPR/used border等新资格，不能回计通过。独立准入仅两个具名live-zoom项目的真实mainzoom/DPR边界：补每帧真实DPR及CSS边框意图/used数值，核实际缩放时序和非端点运动重叠；相同DPR连续区间仍与该区间最后moving/frozen独立样本按原.25比较，不能取终态reflow后样本。跨网格保留raw delta，仅在资格成立时允许最多两真实网格步长和(1/DPR旧+1/DPR新)，semantic/style/身份/行数和全区间W/H/transform/API/scroll仍原判据；普通收放及断点不适用此边界。21需要新actual证据，20仍failed。

`development-21` 以补审冻结7554B313…执行，真实mainzoom/DPR1.5→1.875资格与前后非端点运动、跨网格样式/声明固定通过。同网格max0.000244px，跨网格max0.804169px独立记录，小于由两实际DPR得出的1.2px预算；不称跨DPR原始几何完全不变。两档窄屏、实际收起/展开中跨断点、减动端点、每45ms磁盘journal、冷启closed目标及首次open均通过，44段/80check、0error/HTTP、源/bundle/exe稳定。随后新建Monaco的正文是DBseed原文，而测试要求未确认长正文直接自动出现，整轮failed。实际21合成磁盘中旧saved autosave rev48307及CHAPTER_CONTENT editing/PATCH均保留完整48305字符，issues为空；`draft-recovery.ts` 将旧autosave保留为AUTOSAVE_UNMATCHED，`RecoveryDialog`提供查看/复制/导出；ChapterContentEditor新实例按真实GET初始化。不能将未确认staged误称DB保存，也不删除冷启正文验收。下一限定真实恢复路径将核对原同id/op/rev/disk副本及staged，再通过Settings的“查看草稿”选原完整副本、复制并在真实编辑器粘贴，仍断言原全文；剪贴板原内容只保留在内存并finally恢复，不进入报告。21仍failed，需要新label复验。

`development-22` 以补审冻结DF404B6E…执行，恢复helper已通过源码审核，但本轮尚未到cold阶段：31段/60check后，主动缩放的实际前后运动重叠失败。before为opening/V446.9167/W959.75，2.193秒后after为open/V=W599.8917；首次新DPR1.875在idx106已为open/V=W767.8000，因此是真正迟到，不能靠放宽after或DPR边界要求计livezoom通过。source/bundle/exe稳定、0error/HTTP。原critical调用串行读取main窗口、bootstrap，再提交settings和读回；正式 `view.zoomIn` 使用当前真实renderer设置，每次增加0.1，通过同一真实配置持久化和main setZoomFactor。下一最小driver提案是在动作前准备合法zoom1.15/1.4并读native基线，首实际partial V立即发原正式command，分别到1.25/1.5，免去关键运动中的bootstrap及任意75ms等待；全部actual main/DPR/非端点资格与量化边界仍保持。需独立源码准入及23新实跑，不重计22或宣称cold恢复已通过。

## 用户确认收尾

2026-10-14 用户确认“此任务目前已满足要求，可以直接收尾了”，其最新指令取代继续扩大原生验证的推进安排。已停止子代理后续工作；23命令driver只完成方向审核，未实现、未执行。实际脚本保留已独立审核且22执行过的DF404B6E9BA4FC0EBE3C10806D3AD7278387050487BE53E776FE8A34A7E7D730版本。原21/22失败和所有未执行项保留，不补算通过，不重建或追加测试。

任务总结为 `docs/reviews/2026-10-14-content-drawer-summary.md`。台账将本需求标为用户确认完成，同时继续保留全仓未全绿、原生完整矩阵未通过及目录包动画未执行的独立状态。

## 验收边界

窗口主动 zoom 的物理像素变化不属于固定 CSS 排版承诺。macOS、物理鼠标拖窗、物理 Windows IME、系统 DPI 切换和 NSIS 安装未执行则明确留空；平台样式模拟不能计为 native。代表性正文/表单形态不能计为全部 29 类业务验收。Renderer 网络观察及离线设置从 firstWindow 开始，main 的 listening Server 另验，不能扩充为 pre-entry/service-worker 网络审计。

最终目标专项、仓库全套状态和未执行平台分别记录；现有 39 个 core 基线失败不会被改写为全部通过。
