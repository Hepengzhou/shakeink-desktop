# macOS 发布流程独立 Code Review

日期：2026-10-16。依据已通过的实施方案与测试用例，审核主集成文件及 freeze 后的发布模块和测试。仅审阅、运行隔离单元/静态检查；没有访问钥匙串、认证资料或真实用户数据，没有运行应用、签名/公证或修改原安装包。唯一写入文件为本审核记录。

## 最终代码审核结论

**复审通过，当前无未关闭的代码审核阻断意见。** 首轮提出的两项 P2 测试证据问题均已修正并实际复跑通过，以下保留问题和关闭记录。代码审核通过只覆盖本次构建发布改动，不能仅以测试名称或受控端口成功认定真实发布验证完成。

真实 Developer ID 身份、公证与干净目标系统仍未具备/执行，MACREL-14/15 不通过的现状是后续真实验收依赖，不是可以用 code review 或单元测试消除的缺口。本文件不声明发布包已经修复验收通过。

## 审核范围与确认项

已审阅 `electron-builder.config.cjs`、`build/entitlements.mac.plist`、`scripts/package-desktop.mjs`、`scripts/verify-macos-release.mjs`、`scripts/macos-release.mjs`、`package.json`，以及配置、归档、发布模块和原坏包信任测试。对照已安装 v26 相关签名、公证、归档和 blockmap 源码。复审另纳入 `tests/packaging/packaging-113-review.test.ts` 的 Windows 模拟器窄修正，`04-implementation-plan.md` 精确文件范围已同步补入。

| 核查项 | 源码审核结果 |
| --- | --- |
| 默认发布与平台保护 | 默认 npm 在 build 前调用预检，打包入口在 staging/资源写入前预检；mac dir 明确禁签名公证且只产目录，Windows 的配置生成强制恢复原有不签名条件，保留 NSIS/资源编辑与手动发布。 |
| v26 签名接口 | 将选定身份指纹写入 mac.identity，避免完整证书类型名称触发 v26 前缀拒绝；app 内置公证/stapling 返回后执行 afterSign，之后才归档。 |
| 完整原生签名 | 验证器扫描实际 Mach-O 魔数、嵌套 bundle 与应用内部链接，对 Resources 内模块/动态库/无扩展名二进制逐个执行 Apple requirement 和独立 Team 检查；顶层 deep 检查不能单独替代子项验证。 |
| 权限与架构 | 只允许最小 JIT entitlement，要求签名时间戳、相关可执行对象的 hardened runtime、原生目标架构；未修改 renderer sandbox 或业务代码。真实加载兼容性仍待签名后的业务验收。 |
| 认证和命令错误 | 使用参数数组，不把认证命令输出或原始错误 cause 放入失败消息；Keychain profile 会作只读认证检查，拒绝 builder 优先级更高的其它公证认证环境项；预检检查 Gatekeeper 状态。 |
| ZIP 安全 | 从原始中央目录读取条目，拒绝重复/路径冲突/Unicode别名、本地头不一致和不安全链接，先验证再 CRC/解压；解压后还检查应用根和实际链接。 |
| DMG 和元数据 | DMG 公证要求 Accepted，staple/validate 后实际验包，再生成最终 blockmap、SHA-512/SHA-256/大小；按实际字节逐块核对。staging 中间 updateInfo 不进入最终闭集目录。 |
| 独立 CLI | 外部 --team-id 必须明确提供；manifest 的字段、版本、目标、文件闭集、散列和块数据重新验证后，再运行 Apple 工具，不能信任 passed 或自报 Team。 |
| 失败推广 | 信任/元数据全部检查完成才创建最终闭集并原子推广；工具失败不回退为未签名成功。DMG 清理在 detach 成功后才移除临时目录，避免递归删除仍挂载路径。 |

## 按严重程度排列的问题

### P2-CR1（已关闭）：原坏包负例不能只靠错误的 Team requirement 得到拒绝

位置：首轮 `tests/packaging/macos-trust.test.ts:8–22`。

两个测试都传入占位 `ABC1234567`，而新验证器第一步把独立 Team requirement 加入 codesign。即使样本被替换成签名完整、但属于另一个 Team 的应用，该测试也会通过“必须拒绝”的断言。DMG 只比较检查前后散列，没有绑定调查的固定样本；应用也没有绑定调查样本指纹。因此测试不能独立证明“原样本本身的签名完整性失败”，其标题和 MACREL-11 的证据范围偏强。

修正要求：绑定调查记录中的原 DMG 固定 SHA-256；应用至少绑定调查中主程序/Info.plist 的指纹；另用不带 Team requirement 的原生 codesign 严格完整性检查，明确断言本身失败及对应完整性/未签名错误。新门的错误 Team 拒绝可另作身份负例，不能替代原坏包负例。继续检查原文件检查前后不变。

### P2-CR2（已关闭）：已承诺的归档验包及部分最终化失败路径没有实际测试体

位置：首轮 `tests/unit/macos-release.test.ts` 的 MACREL-09 与 MACREL-06/10；对应 `scripts/macos-release.mjs:247–284,333–360`。

MACREL-09 的现有测试只直接调用 `validateZipArchive`，没有进入 `verifyMacArtifact`，因而未验证独立 CRC、ditto 解压和解压后的信任校验必须执行。原生 DMG 负例在外层 codesign 就停止，也没有覆盖已挂载后内层失败的 detach、detach 失败时保留临时目录。最终化失败测试直接触发公证状态/响应/命令错误和 trust 错误，未直接触发 staple、validate 与 metadata 失败后断言无成功清单/推广。

这些路径的当前代码顺序与清理策略看起来合理；问题是不能把它们记录为已经实际覆盖。请补隔离归档/命令端口测试，分别触发相应阶段并断言后续阶段未执行、临时资源按策略清理且不产生成功发布目录。CRC 失败和解压后信任失败须能按触发阶段区分，不能使用任意后续拒绝来满足断言。受控 Apple 端口结果仍不计真实信任正例。

## 本轮独立执行的检查

- 配置的两项 MACREL-01 断言实际执行通过；其它三项因名称过滤跳过，未计入本次独立执行数量。
- `node --import tsx --test tests/unit/macos-release.test.ts`：13 项通过，均按测试体的受控端口/隔离文件范围理解。
- 对既有原 ZIP 只读执行新 `validateZipArchive`：30,780 条目、14 个符号链接通过，证明预解压策略接受真实旧归档的正常路径/Framework 链接；这不是签名、公证或解压后信任正例。
- 已审阅配置 RED 2 项失败、GREEN 2 项通过的记录及归档加载修复；测试修复只把顶层版本读取改为同步，不改变原 CRC/文件表/关键散列断言。

## 修正复审及独立复跑

修订 freeze 后已重读模块生产差异和新增测试体，并独立执行：

```sh
node --import tsx --test tests/unit/macos-release.test.ts tests/packaging/macos-trust.test.ts
node --import tsx --test --test-name-pattern='PK113-R03' tests/packaging/packaging-113-review.test.ts
```

第一条命令退出码 0，18/18 通过，无跳过/取消；其中 16 项隔离文件与受控端口测试、2 项真实原样本拒绝负例。第二条退出码 0，Windows 用例 1/1 通过，其它三项因名称过滤跳过，没有计入独立复跑数量。

| 修正项 | 复审核查与关闭依据 |
| --- | --- |
| P2-CR1 | 真实坏包测试固定绑定调查 DMG、主程序和 Info.plist SHA-256；先不带 `-R` 执行原生严格完整性检查，应用断言真实资源签名错误、DMG 断言未签名错误及退出码 1，再断言新门在 codesign 阶段拒绝。DMG 检查前后散列相同。实际独立复跑通过，已排除“仅因占位 Team 不同而拒绝”的假证明。 |
| P2-CR2：ZIP | 实际小 ZIP 执行 unzip CRC、ditto 解压，确认解压文件存在后才触发受控内层 codesign 拒绝；精确断言顺序和临时目录清理。改变真实 ZIP 内容而保留 CRC 后精确停于 unzip，没有解压或后续调用。 |
| P2-CR2：DMG | 受控挂载端口只在自有临时目录创建 fixture；内层签名失败后最后调用 detach。detach 成功则删除临时目录；detach 失败则证明目录被保留，再由测试清理未实际挂载的 fixture。未用真实 DMG 挂载制造正例。 |
| P2-CR2：最终化 | 分别触发 staple、validate 及真实 sidecar 符号链接导致的 metadata 异常，断言准确阶段序列、无成功清单/推广目录，外部哨兵文件不被覆盖。 |
| Windows 模拟器窄补充 | 既有测试原来在 macOS 直接取主机基础配置的 forceCodeSigning，不能代表实际 Windows 入口。修订后通过真实 `createPackagingConfiguration(...,{platform:'win32'})` 构造 host 并明确断言 false；保留 `WinPackager.prototype.signApp` 的真实分支和资源编辑断言，没有修改生产 Windows 策略。独立局部复跑通过。 |
| 类型与错误处理差异 | 生产模块新增 JSDoc 类型边界并强制 UTF-8 工具输出；错误只保留工具名称和安全数字退出码，不携带参数、stdout/stderr、环境值或原始 cause。二次包装保留数字退出码，使原生负例能准确绑定 codesign(1)，没有增加验证绕过端口。 |

模块作者提供的 `evidence/module-validation.json`、`module-green.tap` 和类型检查输出与上述范围相符；本审核的独立执行结果也支持两项问题关闭。

## 全量及真实验收限定

主代理的完整 package/type/core 回归由对应原始记录承载。已获知首轮 core 存在失败/取消且将重跑，不能因本代码审核通过就将其标为全量通过；应按最终真实命令结果保留失败、区分与本次改动的关系，必要时继续处理。

MACREL-14/15 仍须使用真实 Developer ID 和公证认证，对最终 DMG/ZIP 全部系统信任门重验，并在干净目标系统完成保留隔离的安装和离线首启/业务回归。它们尚未执行通过，不能由受控端口、原坏包负例或本审核替代；用户“全部校验通过”的最终验收目前仍未达成。

## 最后测试注册窄补充审核

已核查 `package.json` 的 `test:package` 在原有配置测试与 `tests/packaging/*.test.ts` 之间加入 `tests/unit/macos-release.test.ts`；并发、超时和其它命令参数保持原状。该补充属于已批准的 package.json 测试注册范围，使专用打包测试命令持续覆盖发布控制流的 16 项单元测试，没有修改产品脚本或测试断言。**本项通过，不改变原代码复审通过的结论。**

该注册发生在最终 core 运行之后。已核对 `core-final.json` 的实际固定 inventory 包含 `tests/unit/macos-release.test.ts`，本次注册不改变该轮实际执行的用例集合；当前发布模块、打包入口、独立 CLI、builder 配置及 entitlement 的 SHA-256 与该记录中的 sourceHashes 均一致。记录的 `inputsUnchanged:true` 仅代表其运行期间，不能写成 package.json 在运行结束后也未改变。

最终 core 原始记录为 284 个文件、2,165 个测试，2,147 通过、17 失败、1 取消，退出码 1；因此仍不是全量通过。本轮没有重跑 heavy core。新注册后的专用打包命令正在由主代理实际执行，其结果须以该命令的最终原始输出为准，本补充不提前声明通过。真实签名、公证及目标系统验收仍待完成。
