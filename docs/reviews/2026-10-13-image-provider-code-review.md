# 文生图供应商列表：独立 code review

日期：2026-10-13（Asia/Shanghai）。结论：**本轮代码审核通过，无源码阻断项；最终验收尚未完成。** 审核范围仅为下述本轮供应商变更及其测试、验证脚本、相关文档；未修改其他任务的生产源码或现有修改。

## 实现与兼容

1. `desktop/shared/model-catalog.ts:76,84` 将 bytedance 展示名改为火山引擎，IMAGE 显式只保留 bytedance/openai；保留原数组顺序、TEXT 十二家及 custom，以及 sources 副本隔离。未改变方舟端点、内部 ID、协议及完整目录，菜单要求能够同时覆盖真实设置及引导弹窗。
2. `src/components/chat/provider-logos.tsx:6-14` 保留别名解析，provider 资产族中的 bytedance/volcengine 统一使用本地 volcengine.svg、alt 火山引擎；model 资产族仍使用独立 bytedance.svg。真实供应商下拉由 `ModelChoiceSelect` 显式传 provider variant，没有将模型家族资产误当供应商品牌。
3. `src/components/desktop/ModelChoiceSelect.tsx:7-8` 先匹配允许菜单项，只有当前 value 与 selectedOption.id 相同才回退；items 仍只传 options，multiple=false。旧当前值不会因展示 fallback 而被重新添加到菜单，未知/不匹配值仍显示占位。原搜索、disabled、Escape、键盘与选择回调未改。
4. `src/components/desktop/ModelConfigurationDialog.tsx:131,155` 从完整 `PROVIDER_PRESETS` 读取旧记录名称，custom 可使用真实 providerName；仅供应商 selector 传 selectedOption，菜单仍由过滤后 `presetsFor` 构造。切换供应商仍走原 edit(clearScope=true)，清空 Key、模型 ID、展示名和思考档位；取消与原供应商留空 Key 保存路径保留。`desktop/main/model-repository.ts:73-87` 的加密 Key 保留/授权范围比较没有变化，本轮不需要迁移旧凭据或删除旧记录。

## 品牌资产独立校验

以只读 Node 检查直接读取 `docs/evidence/image-providers/icons-static-svg-1.95.1.tgz`，计算 SHA-512 并与 `design/provider-logo-provenance.json` integrity 比较，通过。使用 gzip/tar 内容定位原包 `/icons/volcengine-color.svg`，与 `public/brands/providers/volcengine.svg` 逐字节比较，通过（858 字节）。SHA-256 为 `84f9e2cd1da7e73dc6c9a0f2521745d39cae96c008752cdb1baf57a8c94393a1`，同时匹配清单 originalSha256 和 sha256。SVG 仅含本地 title、path 和原配色，没有外链/脚本/图片依赖。清单区分 MIT 包资产及品牌归属，没有将官网品牌所有权误称开源许可。

## 测试与验证工具

- `tests/unit/image-provider-menu.test.ts` 有实际共享目录及真实 ProviderLogo 输出断言，`model-settings.test.ts` IP-06 验证 items、selectedOption 优先级与单选。`onboarding-editors.test.ts` 新旧 IMAGE 场景覆盖两家、Key/型号清空、取消、原字段保存；完整目录 require stub 已同步为真实 `PROVIDER_PRESETS`。
- `onboarding-editors.test.ts` 和 `onboarding-retry-integration.test.ts` 仅将新增 IMAGE fixture 从已退役 custom 改为允许的 OpenAI 单选及实际 modelChoices，TEXT 仍 custom；保留重复提交、原子写入不确定状态、冻结字段、retry envelope、一次加密与不重复模型等关键断言，属于用户菜单范围变化所需的合法用例更新。
- `tests/browser/image-provider-menu.test.ts` 补足 Dialog/Combobox fixture 布局样式；真实触发器以 aria-label 定位，菜单项限定在供应商 listbox 中并按精确文本过滤，避开 img alt 与文本重复及隐藏原生协议 option。所有点击仍为正常 Playwright click，未使用 force。保留两家完整列表、浏览器搜索、键盘切换、旧配置保存、切换后取消及原状态比较。fixture CSS 结果只说明交互逻辑，不能代替产品外观验收。
- `scripts/verify-image-providers.mjs` 要求实际 Windows、真实 compiled Electron 和 shakeink:// 本地页面；firstWindow 后持续观测并在初始 IMAGE 弹窗可见后离线 reload，避免导航竞争。两主题真实菜单/本地图片、旧记录合成 safeStorage 凭据、实际取消/保存/重开及密文字节比较、产物/源指纹、受保护隔离目录清理均在脚本中落实。公开 fixture 不是用户 Key，脚本没有点击测试连接/发送或触发模型发现；网络说明明确未覆盖进程启动全程，listener 是实际快照。
- `scripts/smoke-byok.mjs` 仅更新本轮菜单名称/允许范围；`docs/02-product-design.md`、`docs/03-ui-design.md`、`docs/provider-ui-presets.md` 添加最新覆盖说明并保留历史设计边界，没有复活其它已取消需求。台账中其他任务内容不在本次审核修改范围。

## 已读取证据与剩余验收

`unit-red.tap` 有真实九家旧列表、字节名称、旧供应商图标的有效行为红灯。两个现有 model-settings 失败（approved close button、catalog choices retry）已在该红灯阶段出现。读取时的 `unit-green.tap` 仍为 IMAGE fixture 调整前结果（62 项：58 通过、4 失败），其中两项 IMAGE fixture 已在源码修正，须重跑确认；`browser-green.tap` 仍为精确菜单定位修正前失败结果，不能声明当前 browser 全绿。新 IP-01/02/03/05/06 在已读取 unit 输出中通过，但不代替剩余断言或全量验收。

本审核的只读命令还包括 `node --check scripts/verify-image-providers.mjs`，返回 0。没有执行全量测试或本轮真实 Windows GUI。主代理须继续执行修正后的专项、全量当前 unit/integration/browser、构建/类型检查和真实 Windows 双主题脚本，保留基线失败及基础设施错误，不将未运行、macOS、安装包或供应商调用标作通过。源码审核通过不等于这些验证已通过。


## 最终测试工具补审与证据核对（2026-10-13）

**源码审核结论仍通过；当前 native/full 验收未完成。** 本次仅追加补审记录，未改其它文件。

- 新 `scripts/verify-image-providers.mjs` 在空隔离 root 中先调用真实 `Workspaces.initialize()` 并 finally close，再写 state.json。`desktop/service/workspaces.ts:100-128` 显式要求无标记新根为空，并创建品牌标记、catalog 与 inbox，此顺序正确；先写 state 到无标记目录会触发真实目录恢复边界。已实际查看 `windows-uninitialized-root-failure.png`，内容确为“无法修复数据目录”，该次失败属于测试目录初始化问题，没有证明正常产品菜单失败。
- `legacyEdit` 的 OS safeStorage 加密、关闭应用后注入公开合成记录、真实菜单、切换取消、完整落盘保留 encryptedKey/authRevision、关闭重开及最终隔离目录清理逻辑保持正确。新增旧菜单可见等待与两项计数后读取 allTextContents，避免动画/Portal尚未渲染时读到空数组；没有移除严格两家断言，也没有 force 点击。所有注入仍局限于 mkdtemp 得到的当前主题根。
- 已读取 `browser-green-final.tap`：6 项全部通过，失败/取消/跳过均 0，包含真实 React 两家菜单、旧 Google/custom 保存和取消。已读取 `unit-green-final.tap`：62 项、60 通过、2 失败；两个失败仍为 red 阶段已存在的 approved close button 和 catalog choices retry。原 IMAGE custom 新增 fixture 修正后的两个 IMAGE retry 用例已通过，不能把这两个既有失败计入通过。
- 主代理报告生产 UI/desktop 构建及 typecheck 命令均返回成功；`build-ui.txt` 末尾确有静态页面生成完成。`build-desktop.txt` 与 `typecheck.txt` 无文本输出，单靠空文件不能再推导成功；使用主代理实际命令返回码作为通过依据。此次只读 `node --check scripts/verify-image-providers.mjs` 返回 0。
- 已查看真实 `green/paper-settings-menu.png`，确显示火山引擎的蓝色品牌图形及 OpenAI 图形，仅两项可选。历史 `windows-initialized-attempt-1.json` 为 failed，记录 paper 新增/引导/TEXT及 Google取消/保存通过，后续 custom 读取菜单[]导致失败；该局部检查有证据，不能声明整轮 Windows 通过。

补审时读取的 `green/windows-electron.json` 仍为 failed：paper 新增/引导已通过，但 TEXT 菜单读取到 []，尚未完成该轮旧记录及 ink 验证。TEXT 路径目前仍在 click 后直接 allTextContents，须同样先等 listbox 可见及13项计数；新增 IMAGE 的 verifyMenu 也可统一等待2项后再读取。此为同一异步读取竞争，不应削弱完整数组断言。主代理已收到该具体结果并在继续修正/重跑。最终 native 与 full 回归的完整输出尚未取得，以上历史失败必须保留，不把前次失败或当前局部成功标成全轮通过。

## Windows 最终完整结果核对（2026-10-13）

**本轮真实 Windows 菜单与旧记录专项已通过；full core 仍待完成，不能声明全部回归通过。** 此最新结果替代前文“当前 Windows 未完成”的运行状态，保留前述失败历史及其原因。

1. `scripts/verify-image-providers.mjs` 当前已对所有 IMAGE listbox 等可见及2项，对 TEXT 等可见及13项，再读取并严格比较完整名称数组。修正同步时机没有改变菜单或品牌验收断言。
2. `docs/evidence/image-providers/green/windows-electron.json` 最新 status 为 passed，checks 共16条，其中12组 status=passed，另4条为实际菜单观察记录。paper/ink 各自通过引导、设置新增、TEXT范围、Google取消/原配置保存、custom取消/原配置保存与关闭重开。实际运行平台均 win32、Electron 44.6.0；renderer errors=[]、firstWindow 后观测 HTTP 请求=0、两个主进程 listener 快照均0、cleanedIsolatedData=true。scope 明确开发 Electron/CDP输入、公开合成凭据、非进程启动全程网络审计，未宣称 macOS、安装包或真实供应商调用验收。
3. 使用只读 Node 对报告5个 sourceHashes逐个重算，全部与当前共享目录、ProviderLogo、弹窗、selector及验证脚本匹配；对215个 bundleHashes重算，全部与当前 out和dist/main/index.cjs匹配，包含本地火山 SVG。故报告与当前审核代码/产物一致。
4. green目录现有8张双主题截图。此次实际查看 paper-onboarding、paper-legacy-google、ink-settings、ink-legacy-custom，均清楚显示菜单只有火山引擎/OpenAI及其彩色图标；Google旧值和旧自定义名称仍显示在当前触发器，但未加入菜单。旧custom截图是明确 fixture.invalid 地址及空 Key 占位，没有真实用户凭据。此前已查看paper-settings，其结果同样一致。
5. `docs/evidence/chat-empty-state/browser-full-image-providers.json` 和同名tap均为431项通过、0失败/取消/跳过、exitCode=0。独立比较该命令显式42个测试文件与当前tests/browser目录，清单完全匹配，包含本轮image-provider-menu。因此可声明完整当前browser组件用例431/431通过；scope仍是controlled fixture组件浏览器，不能换称全部业务真实系统验收。
6. build/UI、desktop与typecheck使用主代理命令结果作为通过依据；专项unit最新仍62项中60通过，2项red时已有失败。full core还在运行，此核对不将其预判为通过。无新增本轮源码或已完成专项阻断；主代理须在最终总结/台账中保留full core最终真实结果及既有失败边界。

## 全量回归后的后端 fixture 修正补审（2026-10-13）

结论：**本轮4个测试文件修正合理，审核通过；不将原始full core失败改写为通过。** 仅追加本记录，没有修改其它文件。

- `tests/unit/byok-catalog.test.ts`、`model-configuration-providers.test.ts`、`model-configuration.test.ts` 的 draft helper 从 UI 菜单 `presetsFor(kind)` 改用完整 `PROVIDER_PRESETS` 查协议/端点，是正确修复。主进程 `desktop/main/model-configuration.ts:127-130,190,275-277,345-347` 本来就按完整预设验证草稿与协议适配，Google/Alibaba/Tencent 等旧 IMAGE 配置仍需要兼容测试。UI 菜单只有两家不代表后端删除已有提供者；原helper错误耦合菜单导致 TypeError，改完整目录保留原调用、请求体、错误、授权及旧提供者断言，并未跳过失败用例。
- `model-configuration.test.ts:33-38` 仅将已覆盖的最新 IMAGE 菜单数量9改为2、更新标题，保留TEXT13、IMAGE不含Anthropic、Tencent文本端点及其图像端点隔离断言。完整两家名称/顺序仍由IP-01的专项数组断言验证，没有缩减用户约束。
- `builtin-model-catalog.test.ts:6-12` 改为遍历完整目录中有该kind端点的提供者加custom，与修改菜单前的目录覆盖范围相同。它恢复Google/Alibaba等全部旧图像提供者的离线候选、唯一ID、kind、permission/source/name验证，custom仍须为空；没有只测可选两家而掩盖旧记录的后端兼容回归。
- 已读取 `docs/evidence/image-providers/backend-fixtures-green.tap`：上述4文件76项全部通过，失败/取消/跳过为0。该结果证明修正后的完整后端fixture与目录用例通过，不能代替重新执行或组合核算整个core回归。

已读取原始 `docs/evidence/chat-empty-state/core-full-image-providers.json`：status=failed、exitCode=1、1951项，其中1877通过、67失败、5取消、2跳过。此原始记录保留。本轮新增菜单影响的helper TypeError与旧菜单数量断言应明确记为本轮fixture修正后76项重跑通过，不冒充“原有业务失败”。用于比较的先前composer基线包含当时本轮TDD尚未实现的IP-06/ONB菜单等失败，不能机械把重名失败全部归为既有产品缺陷。BDC06 legacy/current、BDC07 legacy 的超时尚待独立重测/归因，此补审不先标为通过。生产源码、真实Windows证据指纹与已通过的全browser范围未因这些纯测试修正变化。
