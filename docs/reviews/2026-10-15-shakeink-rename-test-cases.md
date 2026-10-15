# ShakeInk 改名测试用例

2026-10-15。依据调研与计划（`2026-10-15-shakeink-rename-research.md`、`2026-10-15-shakeink-rename-plan.md`）。按用户约束：**禁止全量测试，仅覆盖改名目标相关用例**。范围界定：凡直接引用被改名标识（协议 scheme、marker 文件名、`~/.shakeink`、`XAANINK_*` 变量、格式枚举、npm/appId/artifactName、SVG 字标）的自动化测试均为改名相关；共 62 个本机可运行测试文件（47 unit + 15 integration），逐文件列于文末。

明确排除（非改名目标、或本机不可运行）：
- `tests/browser/`（53 文件，Playwright GUI 夹具）、`scripts/smoke-*`、`scripts/verify-*`、`scripts/acceptance-packaged-macos.mjs`（真机/macOS 验收）——属全量验收范畴，本次不运行；其字符串由全局替换更新，不留旧名。

**运行环境**：本机 PATH 上的 Node 现为 v20.12.2，与 `engines`/`.nvmrc` 要求的 24 不符（2026-10-13 上次 core 运行使用 v24.19.0）。本次全部测试与构建统一使用便携 Node v24.19.0（`D:\Projects\tools\node24`，用后可删），不改动系统 Node。

**基线与判定**：实施前以同一命令跑 62 文件作基线（G00）。Node 20.12.2 下实测 433 用例 293 通过 / 103 失败 / 37 取消——失败为改名前既有环境问题（Node 版本偏离），最终以 Node 24 基线为准。**G02 通过标准 = 与 Node 24 基线逐项对比无新增失败（失败集合不扩大），且红名单 8 个文件（R01-R08）必须全部全绿。**
- `tests/packaging/package-archive.test.ts`、`packaged-resources.test.ts`——依赖 `release/mac-arm64/玄印写作.app` 与 `/usr/bin/unzip`，macOS 门控，本机（Windows）不可运行（既有环境限制，与改名无关）；品牌字符串已更新，打包断言由 R06 与 G06 在本机覆盖。后续可给这两个文件加 `{skip: process.platform !== 'darwin'}` 门控使 `npm run test:package` 在 Windows 可绿（既有环境债，不属本次改名）。
- `tests/retired/` 已退役测试不运行（字符串照常替换）。

## 一、红阶段（实施前执行，确认断言确实卡住旧名）

| ID | 用例 | 命令 | 通过标准（红=失败为预期） |
|---|---|---|---|
| R01 | 品牌协议值 | `node --import tsx --test tests/unit/brand-names.test.ts` | BRN01/BRN08 失败：CURRENT 夹具期待 shakeink 值，代码仍为 xaanink |
| R02 | 启动路径 | `node --import tsx --test tests/unit/brand-startup-paths.test.ts` | BSP01 等失败：期待 `~/.shakeink`/`ShakeInk` bootstrap |
| R03 | 产品身份静态断言 | `node --import tsx --test tests/unit/brand-product-identity.test.ts` | BRAND-P01/P02 失败：npm 名、appId、artifactName、scheme、response-port |
| R04 | 会话存储键 | `node --import tsx --test tests/unit/brand-chat-session.test.ts` | BRAND-S01/S02 失败：期待 `shakeink-chat-session:v1:` |
| R05 | 数据兼容集成 | `node --import tsx --test tests/integration/brand-data-compatibility.test.ts` | BDC 系列失败：期待 shakeink manifest/storage/lock/audit |
| R06 | 打包配置 | `node --import tsx --test tests/unit/packaging-config.test.ts` | 失败：期待 `ink.shakeink.desktop`、`.shakeink` 排除规则 |
| R07 | 仓库/版权断言 | `node --import tsx --test tests/unit/repository-license-commands.test.ts` | 失败：期待 shakeink-desktop issues URL、`GPL-3.0 · ShakeInk` |
| R08 | 仓库 URL 白名单 | `node --import tsx --test tests/unit/version-star.test.ts` | 失败：VS-06 增补正向断言 `PROJECT_REPOSITORY_URL === 'https://github.com/mySingleLive/shakeink-desktop'`（原有负例字面量永被拒、不构成红；正向断言红→绿闭环） |

红阶段记录：8 个文件的失败输出摘入总结文档（证明断言有效）。R01 中夹具更新后不仅 BRN01/BRN08 失败，BRN02/BRN03 等 current 家族迭代用例一并失败（代码找不到新 marker），均属预期。

## 二、绿阶段（实施改名后执行，全部必须通过）

| ID | 用例 | 命令 | 通过标准 |
|---|---|---|---|
| G00 | 基线（实施前执行） | 文末同一命令跑 62 文件（改名前代码） | 全部通过；记录结果作基线，G02 失败时据此区分新旧问题 |
| G01 | 残留检查 | `grep -ri xaanink` 于替换范围（git 跟踪文件 + 未跟踪非忽略文件） | 0 命中；例外仅：①`docs/reviews/2026-10-15-shakeink-rename-*` 改名系列文档；②两份台账 `localInstallation.path` 字段值；③`.git/`。`release/` 文件名不含旧名，其内容为历史构建字节与本地日志，不在检查范围 |
| G02 | 62 个改名相关测试文件 | `node --import tsx --test <文末清单>` | 全部通过，0 失败 |
| G03 | 类型检查 | `npm run typecheck` | 无错误 |
| G04 | 生产构建 | 先 `rm -rf dist out`（清除改名前残留的测试编译目录），再 `npm run generate && npm run build:ui && npm run build:desktop` | 成功；随后 `grep -ri xaanink dist/ out/` 0 命中（证明产物无旧名） |
| G05 | 品牌资产再生成 | `node scripts/generate-brand-assets.mjs` | 输出 JSON `englishBrand:"ShakeInk"`；`public/brand/logo-formal-*.svg` 的 `data-wordmark-en="ShakeInk"` 且字形路径重排（无 `<text>` 元素，BRAND-P03 覆盖） |
| G06 | 打包目录真实验证 | `npm run package:dir` | 成功产出 `release/win-unpacked/`；`resources/app/package.json` 的 `name` 为 `shakeink`；`grep -ri xaanink release/win-unpacked/resources/app/{dist,out,package.json}` 0 命中 |
| G07 | 台账一致性 | 核对 `docs/requirements-traceability.json`、`docs/migration-map.json` | 品牌字段为 ShakeInk/shakeink；`localInstallation.path` 保留 `C:/Program Files/xaanink` 原值且带 `renameNote`；`release/ShakeInk-*` 引用与磁盘真实文件一致，`.sha256` 校验通过 |

不执行完整 `npm run package`（NSIS 安装包）：版本号未升，新构建会覆盖改名后的同名历史 alpha 产物并使其 sha256 失配；artifactName 正确性由 R03/G02 静态断言与 G06 真实目录打包覆盖，NSIS 流程本身已在 2026-10-14 alpha 验收。

## 三、62 个改名相关测试文件清单（G02 执行集）

**tests/unit（47）**：avatar-assets、backup-removal-service、bootstrap-close、bootstrap-main-review、brand-chat-session、brand-names、brand-product-identity、brand-startup-paths、clipboard-ipc、close-ipc-review、configuration-files-review、configuration-files、configuration-transfer、conversation-window-navigation、desktop-export-review、desktop-transport、directory-sync、draft-ipc-review、draft-ipc、file-export-directory-sync、file-export-main-review、local-image-transport-review、model-catalog-refresh、onboarding-ipc、onboarding-repository、onboarding-retry-integration、onboarding-service、packaging-config、profile-ipc、recovery-export-main、recovery-export-review、repository-license-commands、root-maintenance-main-review、root-maintenance-window-review、root-migration-ipc-review、root-relocation-100-review、root-relocation-navigation-100-review、root-relocation-window、startup-recovery-controller、startup-recovery-main、startup-recovery-window、startup-recovery、text-context-menu、version-star、window-appearance、work-lease-main（间接引用品牌模块）、work-lease-main-review。

**tests/integration（15）**：brand-data-compatibility、conversation-transfer-101-review、conversation-transfer、desktop-worker、inbox-lease-startup、local-template-dispatcher、local-work-images-review、local-work-images、plot-template-library、review-model-selection、root-startup、sidebar-scenario-management、startup-recovery、works-loading、workspaces。

（`tests/helpers/sidebar-drawer-fixture.ts` 为浏览器测试夹具，字符串随全局替换更新，不单独运行。）

执行命令（一行）：

```sh
node --import tsx --test tests/unit/avatar-assets.test.ts tests/unit/backup-removal-service.test.ts tests/unit/bootstrap-close.test.ts tests/unit/bootstrap-main-review.test.ts tests/unit/brand-chat-session.test.ts tests/unit/brand-names.test.ts tests/unit/brand-product-identity.test.ts tests/unit/brand-startup-paths.test.ts tests/unit/clipboard-ipc.test.ts tests/unit/close-ipc-review.test.ts tests/unit/configuration-files-review.test.ts tests/unit/configuration-files.test.ts tests/unit/configuration-transfer.test.ts tests/unit/conversation-window-navigation.test.ts tests/unit/desktop-export-review.test.ts tests/unit/desktop-transport.test.ts tests/unit/directory-sync.test.ts tests/unit/draft-ipc-review.test.ts tests/unit/draft-ipc.test.ts tests/unit/file-export-directory-sync.test.ts tests/unit/file-export-main-review.test.ts tests/unit/local-image-transport-review.test.ts tests/unit/model-catalog-refresh.test.ts tests/unit/onboarding-ipc.test.ts tests/unit/onboarding-repository.test.ts tests/unit/onboarding-retry-integration.test.ts tests/unit/onboarding-service.test.ts tests/unit/packaging-config.test.ts tests/unit/profile-ipc.test.ts tests/unit/recovery-export-main.test.ts tests/unit/recovery-export-review.test.ts tests/unit/repository-license-commands.test.ts tests/unit/root-maintenance-main-review.test.ts tests/unit/root-maintenance-window-review.test.ts tests/unit/root-migration-ipc-review.test.ts tests/unit/root-relocation-100-review.test.ts tests/unit/root-relocation-navigation-100-review.test.ts tests/unit/root-relocation-window.test.ts tests/unit/startup-recovery-controller.test.ts tests/unit/startup-recovery-main.test.ts tests/unit/startup-recovery-window.test.ts tests/unit/startup-recovery.test.ts tests/unit/text-context-menu.test.ts tests/unit/version-star.test.ts tests/unit/window-appearance.test.ts tests/unit/work-lease-main.test.ts tests/unit/work-lease-main-review.test.ts tests/integration/brand-data-compatibility.test.ts tests/integration/conversation-transfer-101-review.test.ts tests/integration/conversation-transfer.test.ts tests/integration/desktop-worker.test.ts tests/integration/inbox-lease-startup.test.ts tests/integration/local-template-dispatcher.test.ts tests/integration/local-work-images-review.test.ts tests/integration/local-work-images.test.ts tests/integration/plot-template-library.test.ts tests/integration/review-model-selection.test.ts tests/integration/root-startup.test.ts tests/integration/sidebar-scenario-management.test.ts tests/integration/startup-recovery.test.ts tests/integration/works-loading.test.ts tests/integration/workspaces.test.ts
```
