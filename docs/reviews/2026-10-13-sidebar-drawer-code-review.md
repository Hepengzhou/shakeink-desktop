# 左导航固定抽屉正式代码独立审核

日期：2026-10-13。审核人：独立子代理 `sidebar_design_review`。范围为另一实现者的 DashboardShell、useSidebarDrawer、sidebar-layout、ChatPanel/ContentTabs 的 caption 联动、root drawer CSS 与相关真实 React/纯逻辑用例；本审核未修改这些生产或测试文件。本人负责的导航节点/弹窗不在本报告自审通过范围，由另一子代理独立审核。

## 结论

**当前 `incrementalCodeReview=passed-for-latest-regression-and-target-validation`、code-review blocking=0。** 第十轮真实Windows跨899一帧V超W18px的失败基线保留；M06新增方案/测试源/首次真实red/三项最小修正独审通过，原28＋新11专项39/39及类型检查exit0。其后最新回归/新构建与development-11实际可达矩阵已执行并独审，真实同场景全部帧关闭本次resize P1；Windows01–10原失败不改。全仓core/完整浏览器仍failed/allAcceptance=false，完整事实和未执行边界见 `2026-10-14-sidebar-navigation-final-evidence-review.md`，不能将Chrome专项与原生或安装验收混报。用户 v8 批准依据为 `docs/implementation-boundaries.md:3–5`，不以 HTML 结果代替正式测试。以下早期源码表/行号及通过结论是历史快照，当前门槛以本段和末尾为准。

## 代码核查

| 要求 | 当前真实源及评估 |
| --- | --- |
| 真实分栏与单一 writer | `DashboardShell.tsx:34–56` 仍使用原 Group/Panel、真实 SidebarTree、ChatPanel 和 ContentTabs，ChatPanel 的 user key 保留；内容 Panel 挂载规则由原 Tab 激活/关闭事件驱动。`useSidebarDrawer.ts:88–94` 是本范围唯一 `group.setLayout` 调用；`:95–141` 把 sidebar 和最新 chat/content 轴合成，挂载注册、restore 和卸载 repin 都在同一 frame 提交，无旧三组 rAF writer 遗留。实际 `rg 'setLayout\('` 仅找到第92行。 |
| 固定完整形态 | `useSidebarDrawer.ts:27–29,41,55–69` 实测 Group 和 Sidebar Panel，内层宽 W 独立保留，外层实际可见 V 只决定平移与裁切；`:143–168` 换向沿当前进度，moving 时不重设 W。`DashboardShell.tsx:35–40` 保持导航实例且把 viewport 设 inert/aria-hidden、把 pause 传给真实导航；`desktop.css:465–467` 裁切外层而内层不 flex 压缩。 |
| 正常终态与并行动画 | `sidebar-layout.ts:11–30` 将真实 Group 像素约束投影为合法百分比，保留 sidebar 200–420px、chat 420px、content 30% 和100%总和；`:34–46` 最新轴合成与420/560ms无过冲spring。`useSidebarDrawer.ts:42–54` 在新内容/全屏意图到达时重投影，并重新定向正在打开的 sidebar；`DashboardShell.tsx:35,44,49` 仅动作中放宽对应 min/max，结束后恢复原终态约束。 |
| 目标读取与恢复 | `useSidebarDrawer.ts:219–227` 仅静止宽屏的真实手拖写入偏好，动画 V 不当作 lastSidebar；`:257–271` adapter 在运动/restore时返回目标终态，继续交原 settledWorkspaceLayout，而不是getLayout中间值。apply取消当前 rAF、清两条运动及待写状态，等实际 Panel 注册后通过唯一 writer 应用目标；历史 lastSize 不替代明确restore sizes。卸载第275行取消 rAF。 |
| 断点与窄屏 | `useSidebarDrawer.ts:21–23,128–131,238–246` 在动作期间冻结mode，结束再校正；`:150,210–218` 窄屏只改pane/underlay，不把全宽存进桌面sidebar偏好。`desktop.css:463–464,481–495` 根导航与面板都由同一mode控制，窄屏是实际Group全宽覆盖层，底下真实目标仍挂载但inert。原Group/编辑器没有用HTML替代。 |
| 焦点、减少动态与恢复入口 | `useSidebarDrawer.ts:75–81,147,161,228–235,277` 在收起时移到可见恢复控件，动作/隐藏不可聚焦，展开完成回有效原目标/导航按钮；不从业务Dialog抢焦点。系统reduce把duration变0，经同一终态路径完成。ChatPanel `:1698–1711` 及ContentTabs `:61–99` 保留caption恢复控件，空/非空右Tabs都有入口；Shell在chat隐藏时将恢复入口交内容caption，快速换向仍可达。 |
| 原生边界 | `desktop.css:470–475` 对静止树滚动区仅保留有界no-drag host，后代reset；moving/hidden以!important同时注销host和完整inner的注册。现有Windows44DIP、caption逆zoom、mac88px安全区及右Tabs有界viewport规则保留。CSS computed value不足以证明Electron hit-test，真实鼠标命中仍是后续验收门槛。 |

## 初审问题及修复复核

1. **P1，根分类工作区导航与冻结mode不同步。已关闭。** 最初根nav直接按即时media显隐，而面板按冻结mode：动作中跨900px会先改变Group/inner高度和底栏位置。Windows现有nav `order:1` 放在底部，因此不能泛称其caption必然下移。root已增加 `desktop.css:463–464` 的mode显隐，与面板一致；另加绝对caption top、inner height和switcher显示检查。实际Tailwind生成的是`width < 900px`，900边界本身没有inclusive错误；初查这一推测已撤回，不计产品缺陷。
2. **P2，静止树后代裁切外的native no-drag矩形。已在源层关闭，实际目标待验。** 原reset只在moving/hidden，静止树滚动后代仍继承全局role/button注册。root按既有chatpane做法增加有界tree-scroll host与后代initial，且moving规则优先。正式Windows验证必须包括导航树滚动后的caption命中、open/closed/中间帧与缩放，不能由浏览器计算样式宣布原生通过。

## 实际专项与证据边界

- 本审核独立执行 `node --import tsx --test --test-name-pattern='DRAWER-05|DRAWER-08' tests/browser/sidebar-drawer.test.ts`，使用已安装Chrome隔离fixture：**2 pass / 0 fail / 7 skipped，exit0**。覆盖跨断点固定形态及明确restore优先、900px打开中挂载内容的合法三栏终态；不把7个未选中用例计通过。
- 本审核另做真实fixture的只读断点探针：1280→600、`phase=closing/mode=wide` 时根nav `display=none/height=0`、caption绝对top保持0，修正后的模式源一致。前一次探针因Node20对TS fixture的CommonJS导入形态不匹配而未启动，改默认导入后成功；不计产品失败/通过。
- 已核查主代理/实现者保存的 `docs/evidence/sidebar-navigation/green/drawer-breakpoint-review.tap`：**4 pass / 0 fail / 0 skipped**，包括新增绝对caption top/inner height、600/899/900 switcher与终态检查。`docs/evidence/sidebar-navigation/drawer-specialized.txt` 的较早组合为**24 pass / 0 fail**，含纯逻辑4条、Drawer-01–07、旧SAFE/DRAG；它是专项历史，不声称等于最新全量或原生验收。
- Fixture直接使用正式Shell、导航、Group/Panel、stores、adapter、ContentTabs和当前ChatPanel caption JSX；AI/body业务副作用和右侧业务body在测试中隔离，见 `tests/helpers/sidebar-drawer-fixture.ts:20–50`。草稿/实例断言证明该fixture中的保留，不单独证明真实MarkdownEditor、所有29业务面板或数据库/IPC。

## 首次审核源 SHA-256（历史快照）

以下为本报告完成时的完整文件快照，包含可能的其它已保留工作区修改；审核范围仍限上述drawer差异。后续源变化需重新核对相关结论，不用于承诺未来native结果。

| 文件 | SHA-256 |
| --- | --- |
| src/components/layout/DashboardShell.tsx | d23173d087417a1f55d7c85d431b7f9cf8c3e03d436475b244e8f757730d8519 |
| src/components/layout/useSidebarDrawer.ts | b3d08abb44d2897a5db8d3771ce713a9df86cddaa31aa1201253b38f0f54e207 |
| src/lib/desktop/sidebar-layout.ts | 4e64467c331085af6e431f6dead3656e4b55714e8c39ed9efa21d35899f1779c |
| src/components/layout/ChatPanel.tsx | 598abedcdb0c367b857880b39831d8d78365b0749a3abc8e2bd9bf30e8c5720d |
| src/components/layout/ContentTabs.tsx | 0c9b2619f39abd184f38778d4e994d1cba06288ceb5ea74b05989f6ac7980dae |
| src/app/desktop.css | eefe6871b031127db755fb36769d39029789781e496887fccc326bfc4038bcac |
| tests/helpers/sidebar-drawer-fixture.ts | 339f9011541df1e1b23f8b8937474b805a0c50bd94fda4a98f565880360cd2d2 |
| tests/browser/sidebar-drawer.test.ts | 6d642dbc2913c9518f71c18e446a1c587e33d18224ae13e36b27d87824b66400 |
| tests/unit/sidebar-layout.test.ts | 501d3ae5c40e2c75169f713ebd5b1ae33abcb2a42955dd68597aa8cf8c611bb1 |

完整unit/integration、最新全套浏览器、构建、实际Windows Electron/离线业务/原生命中尚不在本审核通过声明内，后续按正式矩阵执行并保留原失败基线。

## 跨断点最新意图补审

结论仍为 **`passed-for-regression-and-target-validation`，blocking=0**。以上源表是前一次审核快照；本段对应最新补丁，未替代真实 Windows 验收。

- `useSidebarDrawer.ts:122–144` 在完整形态冻结期间跨断点，完成时以该次命令的 `opening` 决定新模式的 phase/sidebarVisible/narrowPane，而非旧 pane 或桌面显隐偏好。`:134–135` 在对话已隐藏且真实内容挂载时选择 content underlay；原来指向已卸载内容的 underlay 回 chat。
- `:138–141` 从窄屏展开转宽屏，恢复 lastSidebar 或260px的桌面目标，不把窄屏 overlay 宽度存成桌面偏好；与 `:163–170,231–237` 的窄屏动作/静止宽屏写偏好边界一致。目标继续经真实像素约束投影。
- `:140` 若 secondary 尚在进行，使用其当前轴值合成新 sidebar 终态，不跳到旧 secondary 目标；`:118,141–142` 在宽屏完成帧已有写入时只预约下一帧，窄→宽的完成帧此前未写才调用同一 writer。因此每帧单一 Group 写入约束仍成立。
- 新 `tests/browser/sidebar-drawer-intent.test.ts` 五条分别检查宽关→窄、宽开→窄、窄关→宽、窄开→宽恢复25%偏好、全屏关→窄真实内容 underlay 与可交互性；保留原9个drawer及4个纯逻辑用例。已检查实现者 `green/drawer-cross-intent-final.tap` 的18/18通过结果。
- 本审核另用 Node **24.19.0**、已安装 Chrome 实际执行 `--import tsx --test tests/browser/sidebar-drawer-intent.test.ts`，**5 pass / 0 fail / 0 skipped，exit0**；证据 `docs/evidence/sidebar-navigation/green/drawer-intent-independent.tap`。这5条是隔离真实 React fixture，不是 Electron、真实 Monaco/数据库或 native hit-test。

最新补审 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| src/components/layout/useSidebarDrawer.ts | 60644f7deeb8e81b0728d2e08bf93126b3c5029e5c0ce441de29047030bedca4 |
| tests/browser/sidebar-drawer-intent.test.ts | da70280ae7181d356dc1d0cfb1a314974500f8999edf82deeb9350fafa11f5ce |

## 第五轮实际首帧异常（保留的失败基线）

`windows-development-05/report.json`为failed/14 checks passed，源/包/exe稳定，hook仍是上方60644f7d快照。真实moving WM命中已在该次部分检查通过，但整段wide-close帧失败，不能合并成整体通过。原 `wide-close-frames.json` 全部保留：preflight V=W=287.75/offset0；首moving V359.8645935058594、W287.75、offset0，偏离V−W **72.11459350585938**；第二moving偏离0.10418701171875，也超过原0.1容差。后续正常不抵消首帧。

现有可确认P1是phase开始后实际outer V增大而固定inner W不变。idle getLayout的百分比、原preserve-pixel resize和解除min/max/卸载Separator后的Group注册归一化都是需要实际trace区分的候选；不能仅凭旧20%猜测根因。新增真实Group用例须记录冷启动defaultLayout、DOM各Panel尺寸/API布局、constraints/Separator与首writer顺序；若React注册在首writer前跳宽，方案必须覆盖此同步边界，而不是仅从DOM算下一rAF起点。

不得放宽几何容差、去除Math.min平移限制或跳过首帧。下一方案应保留单一writer、全部Panel的实测换算（排除divider）、moving/restore/narrow内部意图与终态偏好保护；具体计划/用例/代码尚未到本审核者，待收到后立即审。第五轮及先前四轮均仍失败，下一轮not-run。

## SN-12 首帧、增长窗口与注册生命周期最终补审

**独立代码补审通过，blocking=0。** 本次完整只读复核最新hook/Shell、安装的真实Group、10条测量源及fixture，读取实现者实际TAP和原始帧；本审核未改生产、fixture、验证器或执行Electron。增量方案与用例源审核详见 `2026-10-13-sidebar-drawer-measurement-plan-review.md`。

1. **根因以真实trace定案。** `measurement-red/ink-1440-1800.json` 的before公共API为15.996/23.993/60.011、V=W287.609375、sep2、writeCount2；首closing公共API重新20/30/50、V359.796875、sep1、writeCount仍2。因此getLayout本来准确，真实注册先恢复旧requested/default，随后才到owner writer。安装库resize重算actual layout而注册优先requested缓存（`react-resizable-panels.js:1856–1857,1912–1932,2007–2030`）与该trace一致，未实施未经证实的额外DOM比例重基。初次动态default及父effect两版4fail保持。
2. **结构快照和唯一writer。** `useSidebarDrawer.ts:78–90,105–113,360–361` 从真实公共API捕获current，Group defaultLayout使用当前已测快照/明确pending restore；`DashboardShell.tsx:34,42,47`传该来源，并在任一轨道移动期间保持既有Divider。`rg setLayout`在hook/Shell只有`:110`一个调用；注册补偿和常规rAF都经过带finally重入保护的同一write。注册microtask可在正常动画帧之外复钉，未增第二动画loop或修改库私有缓存。
3. **像素目标和形态。** hook`:43–61,132–139,182–214`将wide Sidebar轨道改为真实像素，逐帧按全部直接Panel外层宽之和（排除divider）换成百分比给原compositor；secondary保留原最新百分比轴。完整W/goal沿动作冻结，窗口增长只投影合法目标，目标与瞬时V分开。`:63–76`保留 `Math.min(V−W,0)`，pending注册期间也不从异常DOM重新校准W；没有新增clamp、放宽任何测量容差或跳过第一moving帧。
4. **所有终态释放。** `:141–180` sidebar完成、窄→宽完成以及独立secondary完成都设置注册pending并预约后续成功writer释放；content卸载继续在该writer协调。观察版旧原18有1条窄开→宽失败（固定W仍899），其TAP保留，`:163–164`最小修正为当帧wide落位后仍预约最终writer；最新原18全通过。holding Divider在两轨完成后释放，静止手拖不被补偿回写。
5. **Observer边界与清理。** `:294–317`只观察Group根childList/style和直接Panel根style，无subtree、业务后代、inner transform或Monaco监听；childList刷新观察根。仅pending、wide、非writing且完整公共API与保存current差大于0.001（兼容库3位百分比舍入）才调用原write；API一致不写。cleanup先禁用再disconnect，避免排队回调卸载后继续写。该选择补齐安装库onLayoutChanged的同map去重缺口，而非用样式伪造V。
6. **恢复、偏好及焦点边界。** `:267–279,338–358`只在静止宽屏采样真实drag偏好，adapter运动时返回目标终态；apply取消rAF和两轨/goal/pending/held Divider，明确sizes优先历史lastSize，待实际注册后落位。Observer不接管窄屏overlay偏好；原冻结mode/latest-intent、inert、caption恢复/有效原焦点及reduced-motion路径保持。卸载取消owner帧和观察器；M05实际closing断言证明测试发生在运动中。

### 实际记录与可声明范围

- 已读 `green/drawer-expanded-measurement-final-10.tap`：**10/10 pass，0 fail/cancel/skip**。含双主题×两个idle resize方向4条、同turn真实React全屏2条、早换向2条、实际opening中扩大窗口+随后真实鼠标Divider35px/原adapter读回1条、运动中明确restore与真实React unmount1条。新M05独审要求的两处实际closing断言已补，原9条/collector/阈值保持。
- 已读 `green/drawer-pixel-observer-original-18-final.tap`：**18/18 pass，0 fail/cancel/skip**，包含原drawer9、cross-mode intent5、纯逻辑4。实现者Node24 typecheck exit0，输出空文件 `green/drawer-first-frame-typecheck.txt`；空日志本身不额外声称全量构建通过。
- 当前raw在 `measurement-green-final/*.json`，保存preflight/first/all moving/terminal与真实API/constraints/Divider/写入序列。此前 `measurement-red`、`red/drawer-expanded-measurement-before-growing-fix.tap`（6pass/3fail）、`green/drawer-expanded-measurement-pixel-first.tap`（7pass/2fail）、`green/drawer-pixel-observer-original-18.tap`（17pass/1fail）均保留，文件目录名green不使内部失败变成通过。9条Observer阶段历史绿亦保留，最新结论基于完整10和18。
- 已核 `drawer-first-frame-final-sources-before.json` 与after的12项完全一致，并核当前实际文件hash对应同一快照；本次无生产/测试/脚本改动，源保持冻结。
- Fixture仍用真实Shell、Group/Panel、导航、stores/adapter与ContentTabs，AI/body业务副作用隔离；同turnDOM.click明确为合成事件。上述不证明真实数据库/Monaco/原生WM命中，Windows05部分命中成功也不抵消原始全帧失败。**最新全量回归、重新构建、Windows06实际同场景全帧及native验证仍为后续门槛。**

### 本次最终源 SHA-256

| 文件 | SHA-256 |
| --- | --- |
| src/components/layout/useSidebarDrawer.ts | 3a486b861a2831ddf677a957948b957ddfa7dd7be01ad843bcb5f1d03fe088c9 |
| src/components/layout/DashboardShell.tsx | 17484465832de9a76faa90eac4703d639932a821d84c8da7c9e54d71f6cded11 |
| src/lib/desktop/sidebar-layout.ts | 4e64467c331085af6e431f6dead3656e4b55714e8c39ed9efa21d35899f1779c |
| src/components/layout/ChatPanel.tsx | 598abedcdb0c367b857880b39831d8d78365b0749a3abc8e2bd9bf30e8c5720d |
| src/components/layout/ContentTabs.tsx | 0c9b2619f39abd184f38778d4e994d1cba06288ceb5ea74b05989f6ac7980dae |
| src/app/desktop.css | eefe6871b031127db755fb36769d39029789781e496887fccc326bfc4038bcac |
| tests/browser/sidebar-drawer-measurement.test.ts | 804e287211e914dc5c3e1000687a58cdf0be29e0c7a97ba4dd543cb113699971 |
| tests/helpers/sidebar-drawer-fixture.ts | 95bafe3fb8b3395061a936adb43d9d3b3fc067f2b90d341f0bb548218b97ee5e |
| tests/browser/sidebar-drawer.test.ts | 6d642dbc2913c9518f71c18e446a1c587e33d18224ae13e36b27d87824b66400 |
| tests/browser/sidebar-drawer-intent.test.ts | da70280ae7181d356dc1d0cfb1a314974500f8999edf82deeb9350fafa11f5ce |
| tests/unit/sidebar-layout.test.ts | 501d3ae5c40e2c75169f713ebd5b1ae33abcb2a42955dd68597aa8cf8c611bb1 |

## Windows10 原生 resize 一帧P1（2026-10-14，待增量修正）

独立只读核 `windows-development-10/report.json` failed/67partial、源/包/exe稳定、errors/HTTP空；`closing-across-899-breakpoint-frames.json`保存全部32帧。index6 closing/wide V83.15625、W267.083343506、offset−183.927093506；index7仍closing/wide、W不变，但V285.083343506/offset0，raw V−W应18；index8 V84.802085877/offset−182.28125恢复正常。count52、caption内部几何/字体未变，因此具体P1是实际viewport回跳，后续正常不能抵消。

同时actual native899×1000、outer900×1001满足原1DIP，冻结modewide是设计行为，不可据此放宽或去掉Math.min。当前hook SHA仍 **3a486b861a2831ddf677a957948b957ddfa7dd7be01ad843bcb5f1d03fe088c9**、Shell **17484465832de9a76faa90eac4703d639932a821d84c8da7c9e54d71f6cded11**。`:137`常规成功writer释放registrationRepin，`:310`Observer仅补pending注册，`:321`运动中的resize只更新geometry；这支持存在待观察的库resize回写窗口，但现有native raw没有public API/callback时序，**不得先将候选定成根因**。

新增实际Group用例应在动作前arm collector，从首至全部moving记录DOM/API/directPanel合计、完整W/offset、原公共writer及resize/callback时序，覆盖wide1600→899以及反向/secondary/restore/终态偏好/cleanup。只观察转发实际库，不fake API/布局、删帧、移baseline、改容差或重复重跑绕过。harness **928aaff2cba4649709937c3bb4496ccb7475a0b57d054e003d688c561354fd0b**冻结暂停；生产本轮未改，等待作者增量方案/用例审核→实际red→修正→独立代码审/新构建/新unique目标验收。

## M06 运动跨断点、late resize 与首次展开目标最终代码补审（2026-10-14）

**独立源审核通过，code-review blocking=0，可进入最新回归/构建/真实目标验证。** 本审核完整只读另一作者的最新hook/Shell和root局部CSS、共享fixture及11条用例，读取实际TAP/全部raw/稳定reopen诊断；未改生产/测试/脚本、未启动Electron。方案与测试源门禁详见 `2026-10-14-sidebar-drawer-resize-plan-review.md`。此为源码与Chrome专项通过，不关闭Windows10原始失败证据，也不声称新Windows已验收。

- **按真实trace修正两条运动路径。** red11为2pass/9fail；wide→899中实际API6.793/38.207/55却Sidebar computed flexGrow1，双Separator displaynone/width0；owner新宽11.417/33.583/55后库自然change22.834/67.166/10而requested保持原map。Shell`:28`只在实际mode=narrow输出data-narrow-pane，state/adapter仍保原pane，frozen-wide不匹配legacy pane-specific flex。CSS`:481`只让已挂载直接Separator在frozen-wide显示，原挂载条件/约束/Group实例保留，不猜宽、不固定比例或删除globals媒体布局。实际green resize时双Separator宽仍1/1，CSS与API匹配。
- **整个wide motion仅有一个writer。** hook`:105–113`仍为唯一Group.setLayout，finally维护writing；实际rg只找到`:110`。`:124–137`的repinCurrent仅wide、moving或注册pending、非writing，使用最近owner Sidebar像素pose按真实直接Panel总宽换算，沿当前secondary轴和当前owner轴值合成current；API完整且差大于0.001才调用同一write，保库3位比例舍入。`:153–165`原rAF先更新pose与current，后write，避免同步callback拿旧current；没有第二rAF、库私有cache写入或异常DOMV冒充轨道。原Math.min(V−W,0)和真实geometry读回保留。
- **首次展开在首positive前初始化完整形态。** `:114–123,153,217–236`仅非换向wide opening设置openingPercentage，sidebar.started=-1且该记录存在时，在结构提交后的layout effect/首writer之前按已挂载Separator的实际可分配宽初始化W/goal。记录随后清空，首positive以后的帧及reversal不重置W。目标仍经原合法约束投影；latest同turn次轴沿共同target，resize保持像素形态。原red读回1799×15%goal在1798重投影导致15.008%、差0.14375；green首次reopen已为API15/last15、actual269.703125/available1798，5个后续诊断帧保持；原assert仍使用首次值/15%/0.1。
- **bounded Observer、重入与cleanup。** `:296–308`公共callback先协调再geometry；`:323–344`MO仍只Group根childList/style和直接Panel根style，childList刷新根，无subtree/inner transform/业务/Monaco观察。moving或注册pending才补，API同值不写；自身style回调不形成写循环。`:345–361`自然window/Group/Sidebar resize在wide motion先走同一repin再geometry，narrow不写桌面轨道；非motion普通模式切换/手拖保原流程。两个Observer cleanup禁用/disconnect并移除事件，无新增timer/loop。原M05实际unmount后写入数不增和M04普通鼠标Divider拖宽在28回归中通过。
- **终态、恢复和偏好没有改成瞬时布局。** `:167–208`保最新opening/closing intent、断点终态、次轴完成/content卸载及needsWrite释放注册pending；只静止宽屏且无motion/restore/needsWrite/pending的callback才更新prefs（`:301–305`新增pending排除）。adapter`:364–384`仍读目标终态；explicit restore取消rAF、两轨、Sidebar goal与openingPercentage、pending/held Divider，明确sizes优先历史偏好，新pose只有后续真正wide动作才使用。窄overlay不写lastSidebar；inert/焦点/reduced-motion/native caption现有路径保留。未改变账户/场景/右内容抽屉业务。

### 实际检查与媒体边界

已核 `green/drawer-resize-m06-01.tap`：11/11pass，0fail/cancel/skip，28320.6101ms；`green/drawer-resize-m06-original-28.tap`：28/28pass，0fail/cancel/skip，68661.395ms。合计39含pure4，不能称39真实Windows用例。实现者类型检查 `green/drawer-resize-m06-typecheck.txt` exit0；空日志只对应该检查，不代表构建/目标系统通过。

本审核另以Node24只读汇总 `resize-measurement-green-m06-01` 全11段raw，共365采样、312moving（opening前4个完全不可见setup保留）。每段frozen mode及inner/nav身份一致，首positive/全部closing检查W/H最大差0；max rawoffset误差0.0155px≤原0.1，V无超W，closing最大反增0；实际两viewport均在moving出现，终态校正。8个reopen诊断首次actual均269.703125/available1798、API Sidebar15/lastSidebar15，各5后帧仅诊断。原collector、节点/字体/几何要求与全部raw/native规则未放宽；当前test321176/helperf834与已审快照一致。

首红11、只读reopen失败、Windows01–10failed原文件保持；新11及原28的业务体隔离/原真实React与Group、合成DOM同turn事件等fixture媒介边界不变，不能代表真实IPC/PGlite/Monaco/WM命中。现有原生hit-test脚本928aaff保持冻结；最新core/全52浏览器与明确scope50、新UI/desktop构建、真实Windows唯一attempt仍为后续门槛。全仓另两项content-drawer待实施用例必须保留完整失败事实，范围回归不得冒称全仓通过。

### 当前冻结源 SHA256

| 文件 | SHA256 |
| --- | --- |
| src/components/layout/useSidebarDrawer.ts | 0669ad294a2af055f14779c7806f9228fe90b04483673c90609f5f89bc790a7e |
| src/components/layout/DashboardShell.tsx | d87086b5fc6f95a408f09b118559a82af701d2ff52b3796bf39cf8bc411acea8 |
| src/app/desktop.css | fad7ee11ec2668d22648af8f35f67e77aceada39e9362fb99cf86e1ce64b58f4 |
| tests/browser/sidebar-drawer-resize.test.ts | 321176d7f2b04a9e30a42b2e4103a87ea474ebd6e26e58a20c7c44ce08c4ca6f |
| tests/helpers/sidebar-drawer-fixture.ts | f834354494f0c672abf9eba208fd7b6aa1b4807caf02018d1e21a7ee8f74a345 |
| scripts/verify-sidebar-navigation.mjs | 928aaff2cba4649709937c3bb4496ccb7475a0b57d054e003d688c561354fd0b |

上述生产/测试hash在本审核开始及结束读回一致。另已读实现者 `green/drawer-resize-m06-report.json`：14项当前源SHA、本次10项已知执行前expected比对mismatches=[]/stable=true、两TAP计数/typecheck exit0及native not-run。本人用Node24重新逐一读14个文件SHA，全部匹配报告；10项expected也全匹配。其余4项expected为null，仅确认当前快照，不能称14项全部运行前后稳定。以上不等同包重建或原生全部通过。
