# 模型目录修复独立代码审核

日期：2026-10-15（Asia/Shanghai）。审核者：独立子代理 `catalog_research_review`。

## 结论

当前审查版本通过；未发现尚未修复的阻断问题。此结论限于本轮候选目录真实性、刷新替换与持久化范围，不代替主代理 Windows Electron 验收，也不证明真实供应商 Key 的调用成功。

已只读审查本次 shared 契约与种子、目录仓库、发现服务/adapters、main/preload IPC、真实 ModelConfigurationDialog、根所有权/迁移/冷态清单，以及 `model-catalog-refresh.test.ts`、`model-settings.test.ts` 的 MC 用例；补充阅读根迁移 MC-13 和种子契约 MC 用例。仅写本审核记录，没有修改生产代码、测试或台账。

## 已反馈并关闭的问题

首次审查发现同一 Dialog 保持挂载时 `open=false → true` 仍优先旧 live catalog；重新读取新快照仅更新 cached，旧 live 仍覆盖它。实际产品入口 `OnboardingController.tsx:59,68` 使用 suspended 控制 open，同一步骤 key 保持不变，故该路径真实存在。

主代理修复后复查 `ModelConfigurationDialog.tsx:60,66`：关闭和新读取开始均清空 live catalog，关闭设 cacheChecking；`52` 在读取期间隐藏候选，`71,76` 在读取完成后解除，成功刷新 `130,132` 使旧读取 generation 失效并解除等待。`model-settings.test.ts:230` 的 MC-10 回归明确覆盖保持挂载重开、隐藏旧候选及新快照替换。该问题已关闭。

## 关键代码检查

| 边界 | 源码证据 | 结果 |
| --- | --- | --- |
| 保守官方预设 | `verified-model-seeds.json` 与独立 `official-seeds-research.json` 按 ID/来源/日期比对；BigModel 未核实种子为空 | 通过 |
| 不补静态候选、完整空目录 | `builtin-model-catalog.ts:29` 的 modelChoices 权威分支从空 Map 开始；main discover 和 Ark 静态回补循环已删除 | 通过 |
| 分类未知与分页完整分离 | CatalogResult 新 authoritative；官方分页/数量边界完成后置 true，complete 仍标分类是否完整；快照保存 complete/unknownCapabilityIds | 通过 |
| 生命周期与不可用项 | excludedBuiltinModel 过滤腾讯已下线及未来日边界、Anthropic/OpenAI/OTHER 与编辑专用类别；main discover 过滤 available=false；同样函数覆盖 live/UI/cache | 通过 |
| 串行原子提交、取消与反序 | 仓库 begin ticket 按 scope 标识，replace 在排队执行、读盘后及 VersionedStore beforeCommit 复查 guard；服务 execute await commit 后返回 | 通过 |
| scope 与凭据边界 | 仓库按 provider/kind/protocol/去尾斜线端点隔离，仅允许当前/既有官方端点；custom 不写；schema 严格白名单；offline permission=unknown、订阅 grant 不恢复 | 通过 |
| 缓存失败与选择门控 | read 失败固定返回 CATALOG_READ_FAILED；组件 cacheFailed 隐藏候选，无种子回退；失效选择清空能力，savedDraft 同时保护保存/测试，旧记录不回插 | 通过 |
| IPC 与根迁移 | main trusted businessHandle 解析严格 scope，preload 只暴露读目录；metadataWrites 复用应用元数据门；所有权、盘点、data-root、cold-source 清单包含 model-catalogs.json | 通过 |

读写错误文案使用“持久化未完成，请重试后确认最新目录”，未承诺发生 rename 后同步错误时旧字节一定未变。损坏目录据实失败并阻断种子回退。

## 独立执行结果

执行命令（bundled Node 24）：

```powershell
& 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --import tsx --test tests/unit/model-catalog-refresh.test.ts
```

最终命令 exit=0：tests 11、pass 11、fail 0、cancelled 0、skipped 0，duration 497.3411ms。覆盖完整替换、有效空目录、不可用/已下线排除、四供应商无回补、真实文件系统重开、scope/无 Key、取消/反序/分页与失败不覆盖，以及损坏缓存。

默认沙箱尝试因 Node/esbuild 子进程 `spawn EPERM` 未能执行用例；`--test-isolation=none` 仍被 esbuild spawn 阻止。随后同一单文件命令通过自动审查允许 require_escalated 并执行成功。环境失败与最终真实用例结果已分开，没有以导入/进程错误作为行为红灯。

未运行 `npm test`、全量组件、全量业务用例或真实供应商付费调用。组件 MC-10 修订与种子/迁移 MC 用例已审读，其执行结果由主代理另记，不冒充本子代理独立执行。

## 审查时源码 SHA-256

| 文件 | SHA-256 |
| --- | --- |
| desktop/shared/builtin-model-catalog.ts | 909004373120AAC12BD2F86BE4115757745607EA671AFD15855D037BE19CD7D4 |
| desktop/shared/verified-model-seeds.json | 90F49F8F87AA6BAB3ABB0CE7FC9F33E16C10A95E65560D5267C37DF6F9F02637 |
| desktop/shared/model-catalog.ts | 991BEAAF3C1265CD29058123C22792644D3A21C83E04DE102D7D618AA7E1210F |
| desktop/shared/ipc.ts | 02BD8CA4B0A9141C53A9BDE4E62B455FF64D0AC81A79492FC2E8F6F93DEE784F |
| desktop/main/model-catalog-repository.ts | 79280405A7A80F1D35D3608DE5E0445B81C506F45C7D7631007F8ECBA7F01EAB |
| desktop/main/model-configuration.ts | F46835FA77FBC329535F4A120A0D4AC4FED2D8643EA31FBEBCAC22E8B4720C44 |
| desktop/main/model-provider-adapters.ts | 0BC70DB04520A74BC60C428DDA84840F5FE32BE274DC7E77A41454646050976C |
| desktop/main/index.ts | EBF0ECC4D9BEC060850ABF785A507F3E1EBCA2001762666759AE64480A6B9F80 |
| desktop/preload/index.ts | F662D42361A8182844DBD1464F4981CFD5E1F8F33E723FAEA5037BE11F8119E9 |
| src/components/desktop/ModelConfigurationDialog.tsx | 9091F26720F52A93BF9EDF5CC71E43F72D6DE8647EC81FCF60FD8370334BD4AE |
| desktop/core/root-ownership.ts | F3AC457DBE2F0F20362E4CC2126A0AE536D64D8E08CA405DAA383F25483F4E88 |
| desktop/core/root-inventory-paths.ts | 9D2D6000E8C61FD0EBFFF0D8125FBF20A59F548147721D03ED9AFFF968963586 |
| desktop/core/data-root.ts | F0E5EDEC9958A2C02683AEAF98184A1228C3DF3987BB98D0360747C93BDA3635 |
| desktop/core/application-cold-source.ts | E41F1330C8712E65F01B92F655EDE89FDDD6C725EAF90A997C40CA767BDDA2AB |
| tests/unit/model-catalog-refresh.test.ts | 0E53F599C712A635C7FFB97A006875775333E9713EB09B82CEA4E0896056A275 |
| tests/unit/model-settings.test.ts | DF435709616D29A5EAF7EBDA198C1AFB6B85B87F0DC94F15E84D3AB36068790F |

## 最终增量复核

同日主代理完成验收脚本后再次只读复核。上表 16 个文件的当前 SHA-256 与首次记录一致；原审核结论保持通过。

重新确认组件效应在局部捕获 `readCatalog = window.desktop?.readModelCatalog`，保护无 window/无桥环境并完成 TypeScript 的可选成员缩窄。实际 preload 暴露的是箭头函数，不依赖调用接收者；读取 generation、cacheChecking、scope、失效选择及权限处理没有改变。

新增 `scripts/verify-model-catalog-refresh.mjs` 已逐段审查，通过脚本设计审核：

- Windows Electron 加载编译 `dist/main`、真实 preload 和 `out` 中 React，走实际设置与目录 IPC；DeepSeek `GET /models` 仅由主进程协议夹具回答，报告明确不当作供应商授权/付费调用实测。
- 隔离临时根使用公开夹具 Key；落盘检查确保目录字节不含该 Key，离线重启恢复 permission=unknown，无模型草稿或凭据自动保存。
- 对有条目及空目录分别关闭 Electron 后重启读取；失效旧记录经实际编辑表单保存被拒绝，并逐字验证原 state.json 不变。
- 主进程/worker 的 fetch 与 TCP/HTTP 受控，renderer session 阻断 HTTP 且 Playwright context offline；预先自检网络阻断，最终报告检查没有意外 renderer 请求、监听服务和网络调用。
- 报告区分源码/编译 bundle 哈希、截图、运行错误和每个 MC-12 步骤；执行后再次校验源码未变。清理前验证临时目录的绝对父目录和预定名称前缀，清理范围限本轮隔离根。

`builtin-model-catalog.test.ts` 当前 4 项 MC 契约已复核：逐个 seed 比对独立官方证据、live metadata 与移除行为、订阅 grant 不缓存、已下线/OTHER/编辑专用及类别过滤。`data-root.test.ts` 的 MC-13 使用真实目录仓库、真实目录盘点与 DataRootManager 文件系统迁移，验证迁移后空快照仍无种子复活。`03-test-cases.md` 命令已限定 MC- 命名过滤，仅覆盖本轮组件、种子和迁移范围。

本增量未启动 Electron、未重复执行测试或类型检查、未运行全量用例。Windows 真实执行、组件/种子/迁移的实际通过计数由主代理结果记录承担；脚本审读结论不冒充运行通过。

新增审查文件 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| scripts/verify-model-catalog-refresh.mjs | 01E659335F0F3FC354B92863D5362C977355E244A498276603C68CB30A289211 |
| tests/unit/builtin-model-catalog.test.ts | E7C93272C47BACA8F57B852D385D97ECD27FC3FF1DDD9DDCE64962D734E600D4 |
| tests/unit/data-root.test.ts | 09B7FA79F4269EB286F86AE83933F4DFB0E63B07BBC9EE4BFCE92F44F822C241 |

## MC-07 与既有目录回归增量复核

主代理随后补齐受限订阅型号的实际服务状态，读取新增差异后审核仍通过。`model-configuration.ts:272` 仅对官方 metadata.subscriptionOnly 项赋 available：当前结果必须是 listed-unverified 且当前操作 subscription=true；普通 Key 不启用。该值来自现有操作的凭据类别状态，不跨操作延续；主进程响应仍只标“目录列出、调用待验证”。`offlineCatalog` 和仓库白名单仍将 grant 去除，恢复 permission=unknown，受限项不会因目录重启获得授权。

新增目录 MC-07 协议测试实际遍历普通/订阅公开夹具：普通 Key 的受限项不可选，订阅 Key 当前 live 可选，二者重建仓库读盘均无受限可选项。组件原 D07 已纳入批准 MC-07，明确验证更换 Key 后旧受限项从可选列表消失且不能保存。测试 sample 改为已核验种子 `gpt-6.1-sol`，让原正常配置交互继续使用有效候选；没有把已退役测试改成有效型号。

`byok-catalog.test.ts` 的两项旧静态回补预期调整为 MC-02：仅用官方接口夹具实际返回的精确 ID，空/无匹配类别的结果为空；仍保留官方能力、类型和受限 Key 调用门控断言。03 的命名 MC- 命令已包含该文件，未扩展到全量测试。

Windows 脚本修改为真实账号菜单 aria 前缀匹配，避免固定字符串无法定位实际“账号菜单：作者”；每轮使用受限名称的新证据目录，mkdir 已存在即失败，保留旧失败证据。该增量仍仅审脚本，不声称本子代理已运行 Windows。

生产代码新增后再次独立执行相同 bundled Node 24 单文件命令：`model-catalog-refresh.test.ts` exit=0，tests 12、pass 12、fail 0、skipped 0，duration 420.7808ms；新增 MC-07 实际通过。该 12/12 是当前服务增量后的独立结果，前面的 11/11 保留为先前审查记录。未执行其他文件或全量用例。

本次更新哈希（相应行替代前序版本用于当前验收）：

| 文件 | SHA-256 |
| --- | --- |
| desktop/main/model-configuration.ts | A9DCA2767273BE484D2F1526526BD99B6A2B30E6995F17585369686F91FEE3C7 |
| tests/unit/model-catalog-refresh.test.ts | 1C214E0E0944A826ECF1FC52D985C34749FF34C5EF4C932A700453CB8631F617 |
| tests/unit/model-settings.test.ts | FF6999316F85FFB9C88327EB8A666F4AED35034A664AD4539BCB56B159050060 |
| tests/unit/byok-catalog.test.ts | AA8210000BC40F0BD86DA788BBB4F1579FFF613410714632301D291900B0CCA8 |
| scripts/verify-model-catalog-refresh.mjs | 57524E9AB62E694969A526D21A0FB1D4D1329E2EDBA211C6C07D6A0432BB6677 |
