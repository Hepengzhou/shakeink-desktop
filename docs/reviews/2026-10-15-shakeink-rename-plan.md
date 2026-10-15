# ShakeInk 改名计划

2026-10-15。依据 `docs/reviews/2026-10-15-shakeink-rename-research.md`（调研）。目标：英文名 **ShakeInk**、应用名 `shakeink`、默认配置目录 `~/.shakeink/`、仓库内所有 xaanink 字样 → shakeink。约束：不改业务逻辑与流程；仅运行改名相关测试（禁止全量验收）。本计划已经独立子代理审核，阻塞问题 B1-B4 的修正并入下文。

## 1. 替换映射（唯一规则）

| 形态 | 替换为 |
|---|---|
| `XAANINK` | `SHAKEINK` |
| `XaanInk` | `ShakeInk` |
| `Xaanink` | `Shakeink` |
| `xaanink` | `shakeink` |

大小写不敏感正则按命中形态查表替换；实测全部 1868 处命中均为这 4 种形态。xuanxiang / 玄印 / 玄香印 等 legacy 与中文值不在规则内，一律不动。`XAANINK_*` 环境变量全集合（`XAANINK_TEST_ROOT`、`XAANINK_TEST_CHROMIUM`、`XAANINK_REGRESSION_*`、`XAANINK_CATALOG_*` 等，约 20 个）随映射自然两端一致；上一代历史构建变量 `XUANXIANG_TEST_ROOT` 不动。

## 2. 关键决策

1. **CURRENT 家族整体改值，不新增第三家族。** `BrandFamily` 仍是 `legacy|current` 两态，`otherBrandNames` 逻辑不变；CURRENT_NAMES 各字段值换成 shakeink 前缀，`appIdentity` 换 `"ShakeInk"`。LEGACY（xuanxiang）冻结不变。xaanink 时代数据因此不再被新版识别（调研第 4 节已列后果），本机真实 alpha 数据目录 `~/.xaanink` 保持原样、不被触碰。
2. **台账安装路径例外（唯一字段级保留）**：`docs/requirements-traceability.json:48` 与 `docs/migration-map.json:26` 的 `localInstallation.path: "C:/Program Files/xaanink"` 是 2026-10-14 真实安装事件记录，替换将失实。该字段保留原值并增加 `renameNote` 注记；台账其余字段正常替换。
3. **`release/` 本地产物全部改名**：`release/` 未被 git 跟踪，但其中 `XaanInk-0.1.0-alpha-win-x64.exe(.sha256/.blockmap)`、`XaanInk-0.1.0-alpha-win-x64-installer.zip(.sha256)`、`XaanInk-0.1.0-win-x64.exe(.sha256)` 是真实文件，且被台账与 9 处历史文档引用。统一改名为 `ShakeInk-*`（字节不动、sha256 仍成立；`.sha256` sidecar 内文件名同步替换），使替换后的全部引用继续指向真实文件。`release/win-unpacked/` 是构建输出目录，由 `package:dir` 重新生成，不手工改名。
4. **改名系列文档排除替换**：`docs/reviews/2026-10-15-shakeink-rename-*`（调研/计划/测试用例/总结）必须保留旧名字面量（映射表、旧协议名、例外说明），全局替换脚本按路径模式排除之，并列入残留 grep 例外清单。其余日期型历史文档按用户「所有」要求照常替换，总结中统一注记该约定。
5. **仓库根目录与 git remote 不在本会话内改**：`D:\Projects\xaanink-desktop` 是会话工作目录，改名放最后由用户执行（总结给出命令）；GitHub 仓库重命名与 remote 更新由用户操作。代码内仓库 URL 全部改为 `shakeink-desktop`（GitHub 重命名仓库后旧地址自动跳转）。
6. **SVG 字标不手工改**：改 `scripts/generate-brand-assets.mjs` 的 `englishBrand='ShakeInk'` 后运行脚本，重新生成 formal 徽标英文轮廓字标、`data-wordmark-en` 属性与 `public/brand/*.png`。中文「玄印写作」字标不变。

## 3. 实施顺序

1. **TDD 红 —— 先改品牌断言（8 个本机可运行文件）**：
   - `tests/unit/brand-names.test.ts`（families 夹具；新增 **BRN08**：品牌协议值不得含旧名——正则用 `["xaan","ink"].join("")` 间接构造，源码不含旧名字面量，避免被第 2 步全局替换反转语义）；
   - `tests/unit/brand-startup-paths.test.ts`、`tests/unit/brand-product-identity.test.ts`、`tests/unit/brand-chat-session.test.ts`、`tests/integration/brand-data-compatibility.test.ts`、`tests/unit/packaging-config.test.ts`、`tests/unit/repository-license-commands.test.ts`（issues URL 与版权断言）、`tests/unit/version-star.test.ts`（仓库 URL 白名单）。
   - 运行这 8 个文件确认失败（红），输出留存于总结。
   - `tests/packaging/package-archive.test.ts`、`packaged-resources.test.ts` 依赖 `release/mac-arm64/玄印写作.app` 与 `/usr/bin/unzip`，是 macOS 门控的既有环境限制（与改名无关），本机不纳入红/绿运行；其品牌字符串照常由第 2 步替换更新，本地打包断言由 `packaging-config.test.ts` 与 `package:dir` 真实产出覆盖。
2. **全局替换**：临时 Node 脚本遍历 `git ls-files --cached --others --exclude-standard`（含未跟踪新文件），跳过二进制、`.git`、脚本自身及第 2.4 条改名文档；`out/`、`dist/`、`release/`、`node_modules/` 等被忽略目录天然不在其列。脚本用后即删。
3. **例外校正**：恢复两处台账 `localInstallation.path` 原值并加 `renameNote`；执行第 2.3 条 release/ 改名与 sidecar 同步。
4. **品牌资产再生成**：`node scripts/generate-brand-assets.mjs`，核对输出 JSON（englishBrand=ShakeInk）与 SVG 字形路径。
5. **构建刷新**：`npm run generate` → `npm run typecheck` → `npm run build:ui` → `npm run build:desktop`。
6. **独立 code review 子代理**：按本文件与测试用例文档审查全部改动，修复后复验。
7. **执行测试用例文档全部用例**（`docs/reviews/2026-10-15-shakeink-rename-test-cases.md`）。
8. **总结**：`docs/reviews/2026-10-15-shakeink-rename-summary.md`，含实测结果、残留例外清单、用户后续操作（根目录/remote/旧版卸载）。

## 4. 回滚

所有源码改动在 git 工作树内完成；验证失败时 `git checkout -- .` 回滚（新增文档与临时脚本除外）。release/ 改名文件改回原名即可。

## 5. 验收对照

- 英文名 ShakeInk / 应用名 shakeink / `~/.shakeink`：由 BRN01、BSP01、BRAND-P01 断言直接覆盖。
- 字样全替换：残留 grep 检查 —— 替换范围内 0 命中；例外仅：改名系列文档（2.4）、台账 `localInstallation.path` 一处字段值（2.2）。
- 不破坏逻辑：62 个本机改名相关测试文件全绿 + typecheck + 构建 + `package:dir` 真实产出 ShakeInk 命名产物。
- 顺序产出：调研 → 计划 → 测试用例 → 实施 → 测试 → 总结。
