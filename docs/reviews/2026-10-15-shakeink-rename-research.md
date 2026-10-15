# ShakeInk 改名调研

2026-10-15。目标：项目英文名 XaanInk → **ShakeInk**，应用名 → `shakeink`，默认配置目录 → `~/.shakeink/`，仓库内所有 `xaanink` 前缀/字样 → `shakeink`。约束：不破坏正常软件逻辑与流程；改名相关测试全部通过。本文是改名的全面调研。

## 1. 现状：双家族品牌架构

上一次改名（2026-10-08，`docs/reviews/121-brand-rename-plan.md`）已把品牌值集中到少量协议常量，并形成「legacy=xuanxiang / current=xaanink」双家族兼容架构：

- `desktop/shared/brand-names.ts` — `LEGACY_NAMES`（xuanxiang，冻结的历史文件协议）与 `CURRENT_NAMES`（xaanink，现行协议）：应用 marker、作品 manifest/storage/lock/audit、迁移与恢复前缀等 13 个字段；`otherBrandNames` 在两家族间切换。
- `desktop/core/brand-names.ts:8` — `appSchema` 枚举 `["Xuanxiangxiezuo-Desktop","XaanInk"]` 校验应用 marker；`desktop/core/root-ownership.ts:9` 同枚举。
- `desktop/main/brand-startup-paths.ts` — 启动路径选择：bootstrap 目录 `appData/<appIdentity>`、默认根 `~/.xuanxiang` 或 `~/.xaanink`（44、61、80 行）；`legacyEncryptionName="玄香印"`（15 行）保留旧加密身份。
- 本次改名只动 CURRENT 家族与产品文案；LEGACY（xuanxiang）家族值一律不变，双家族结构、marker 校验、启动选择逻辑不变。

## 2. 字样分布（git 跟踪文件）

实测（`git ls-files` + 大小写不敏感扫描）：**411 个文件、1868 处**。大小写形态仅 4 种：

| 形态 | 数量 | 替换为 |
|---|---|---|
| `xaanink` | 1452 | `shakeink` |
| `XAANINK` | 326 | `SHAKEINK` |
| `XaanInk` | 89 | `ShakeInk` |
| `Xaanink` | 1（`scripts/verify-ai-caption-drag.mjs:39` 窗口标题夹具） | `Shakeink` |

按区域：

| 区域 | 文件 | 命中 | 性质 |
|---|---|---|---|
| `docs/`（含 reviews、台账 JSON） | ~110 | ~960 | 文档/台账，文本替换 |
| `tests/unit`、`tests/integration` | 61 | 234 | 断言/夹具，替换后即为改名回归测试 |
| `tests/browser`、`tests/helpers`、`tests/retired` | 74 | 164 | 浏览器夹具/退役测试，文本替换 |
| `desktop/`（main/core/shared/service/preload） | 21 | 59 | **运行时代码，见第 3 节契约点** |
| `scripts/`（smoke/verify/seed/打包） | ~70 | ~200 | 验证脚本与夹具，文本替换 |
| `src/`（lib/components） | 8 | 10 | 渲染层协议地址、存储键等 |
| `design/`（预览、SVG、检查记录） | 52 | 138 | 设计稿文本替换；SVG 字标由生成脚本重建 |
| `public/brand/` | 4 | 6 | SVG 字标，由 `generate-brand-assets.mjs` 重新生成 |
| `tests/packaging/` | 2 | 2 | macOS 门控打包测试，文本替换 |
| `package.json` / `package-lock.json` | 2 | 4 | npm 名与仓库地址 |
| `electron-builder.config.cjs` | 1 | 4 | appId、artifactName、排除规则 |
| `README.md`、`build/Credits.html` | 2 | 6 | 文档/关于页链接 |

未被跟踪（`.gitignore`）目录中的字样：`out/`、`dist/`、`.next/`（构建产物，重新构建即刷新）、`release/`（本地安装包产物）、`runtime-licenses/`（打包时再生成）、`docs/evidence/`（本机原始验收日志）、`startup-backup/`。替换脚本以 `git ls-files --cached --others --exclude-standard` 收集文件，未跟踪的新文件（如 design/ 下新增）一并覆盖。仓库内**没有**文件名/目录名含 xaanink；仓库根目录本身名为 `xaanink-desktop`。

## 3. 运行时契约点（逐条核实）

### 3.1 数据根与启动

- 默认配置目录：`brand-startup-paths.ts` 的 `~/.xaanink`（44/61/80 行）、`desktop/main/index.ts:75,779`、`desktop/main/startup-recovery.ts:175`（恢复流程的默认根校验）→ `~/.shakeink`。
- bootstrap：`%APPDATA%/XaanInk`（CURRENT_NAMES.appIdentity）→ `%APPDATA%/ShakeInk`；`app.setName("玄印写作")` 中文名不变，现行家族加密身份不变。
- 隔离测试环境变量：`desktop/main/index.ts:69` `XAANINK_TEST_ROOT` → `SHAKEINK_TEST_ROOT`；全部 `XAANINK_*` 变量（`XAANINK_TEST_CHROMIUM`、`XAANINK_REGRESSION_*`、`XAANINK_CATALOG_*` 等约 20 个，遍布 scripts/ 与 tests/）随映射同步替换。`XUANXIANG_TEST_ROOT` 是上一代历史构建的兼容变量（`scripts/smoke-brand.mjs`），不动。

### 3.2 文件协议（CURRENT_NAMES 字段值）

`xaanink-app.json`、`xaanink-work.json`、`xaanink-storage.json`、`xaanink-storage-required.json`、`.xaanink-lock`、`.xaanink-lease-recovery.json`、`xaanink-work-lease-recovery`、`.xaanink-lease-recovery-`、`.xaanink-restores`、`.xaanink-preserved`、`.xaanink-migration-`、`.xaanink-root-recovery-` → 全部改 `shakeink` 前缀。marker 的 `app` 值 `"XaanInk"` → `"ShakeInk"`（`brand-names.ts` 类型联合 + `appSchema`/`rootMarkerSchema` 枚举同步）。

### 3.3 自定义协议与渲染层

- 协议 scheme `xaanink://` → `shakeink://`：`desktop/main/index.ts`（注册 67、信任校验 128、处理 253、权限 276、CSP 放行 280、导航 764、加载 771）、`static-ui.ts`（CSP）、`root-maintenance-window.ts`、`root-relocation-window.ts`（partition 名 `xaanink-maintenance`/`xaanink-root-relocation` 一并替换）、`avatar-assets.ts:221`、`src/lib/manuscript-export.ts:98`、`ProfileSettings.tsx:15`、`DesktopApp.tsx:181`。
- IPC 端口消息名 `xaanink-response-port`：`desktop/preload/index.ts:42` 与 `src/lib/desktop/transport.ts:13` 两端必须同时替换。
- `BroadcastChannel("xaanink-chat-account")`：`src/lib/chat-session.ts:76` 与 `src/components/chat/use-agent-chat.ts:433` 两端同时替换。
- 会话存储键 `xaanink-chat-session:v1:*` → `shakeink-chat-session:v1:*`；旧键 `xuanxiang-chat-session:v1:*` 保留不动（`chat-session.ts:21-23`）。
- 拖拽 MIME `application/x-xaanink-chip` → `application/x-shakeink-chip`（`chip-drag.ts:15`）。
- OpenRouter 标题头 `X-OpenRouter-Title: XaanInk` → `ShakeInk`（`src/lib/ai/openrouter.ts:86`）。
- PGlite 适配器名 `xaanink-pglite`（`pglite-adapter.ts:20`）。

### 3.4 导入/导出文件格式枚举

- 配置：`desktop/core/configuration-transfer.ts:53,143` —— 导入接受 `["xuanxiang-settings","xaanink-settings"]`、导出写 `xaanink-settings` → 改为 `shakeink-settings`。
- 模板库：`desktop/shared/template-library.ts:14` 导入枚举、`desktop/service/template-library.ts:115` 导出写 `xaanink-local-templates`。
- 恢复草稿信封：`desktop/main/file-export.ts:44`（`xaanink-recovery`）、`desktop/main/index.ts:143`（写入）。
- 租约恢复审计类型：`desktop/core/work-lease-recovery.ts:20`。
- 导出目标防护正则：`desktop/main/file-export-target.ts:5`、`desktop/core/root-inventory-paths.ts:9`（`(?:xuanxiang|xaanink)` → `(?:xuanxiang|shakeink)`）。
- 打包资源出处格式：`scripts/prepare-package-resources.mjs:62` 的 `xaanink-packaged-resource-provenance`（写入被 gitignore 的 `runtime-licenses/provenance.json`，下次打包自动刷新）。

### 3.5 打包与项目元数据

- `package.json`：`name: "xaanink"` → `"shakeink"`；repository URL → `.../shakeink-desktop.git`（GitHub 重命名后旧地址自动跳转；本地 git remote 不改，见第 5 节）。
- `package-lock.json`：两处 `name` 同步。
- `electron-builder.config.cjs`：`appId: ink.xaanink.desktop` → `ink.shakeink.desktop`；`artifactName: XaanInk-...` → `ShakeInk-...`；files 排除项 `.xaanink` → `.shakeink`（29 行）。`productName: 玄印写作` 不变。Windows 安装目录随包名变化（上次实测为 `C:\Program Files\xaanink`）。
- `desktop/shared/project-info.ts`：仓库 URL。`desktop/main/index.ts:699` 反馈 issue 链接、`build/Credits.html` Star 链接同步。
- 关于面板版权 `GPL-3.0 · XaanInk` → `GPL-3.0 · ShakeInk`（`desktop/main/index.ts:701`、`desktop/main/project-about.ts:9`）。

### 3.6 品牌矢量字标

`public/brand/` 的 formal 徽标（`logo-formal-*.svg`）内含英文 "XaanInk" 轮廓字标（`data-wordmark-en` + 字形路径）；`public/brand/logo-horizontal-*.svg` 与 `design/assets/` 的 horizontal/seal 徽标仅属性含旧名。由 `scripts/generate-brand-assets.mjs` 改 `englishBrand='ShakeInk'` 后重新生成（字形路径 + `public/brand/*.png` 位图），字体沿用仓库内 NotoSansSC。中文「玄印写作」字标不变。

## 4. 数据兼容影响（必须明示的后果）

上次改名用户批准了「兼容旧版数据」；本次目标明确要求**所有** xaanink 字样替换为 shakeink，且双家族架构只支持一个 legacy 家族。因此：

1. **xaanink 时代数据不再被识别**：已有的 `~/.xaanink`、作品内 `xaanink-work.json`、`.xaanink-lock` 等在新版启动中既非 legacy 亦非 current，应用按全新安装处理（创建 `~/.shakeink`），旧目录原样保留在磁盘上、不会被改动或删除。0.1.0-alpha（2026-10-14 发布）仅发布一天，影响面可控；需在使用文档中告知用户手工迁移或重新配置。
2. xuanxiang legacy 兼容链保持不变（BRN/BDC 系列测试的 legacy 半部分不动）。
3. 自定义协议源由 `xaanink://app` 变为 `shakeink://app`，渲染层 sessionStorage/localStorage 按源隔离，旧源下的会话草稿自然不可见（本机数据，随旧版卸载清理）。
4. 旧版导出的 `xaanink-settings` / `xaanink-local-templates` / `xaanink-recovery` 文件新版不再接受导入（xuanxiang 旧格式仍接受）。这是「全部替换」目标的直接结果。
5. macOS Keychain 加密身份由应用显示名（玄印写作）生成，中文名不变，故现行家族加密语义不变；旧 `~/.xaanink` 中的加密设置随目录孤立而不再被读取，不存在误解密风险。

## 5. 边界（不改）

- 中文产品名「玄印写作」/「玄印」、`legacyEncryptionName="玄香印"`、全部 xuanxiang legacy 协议值与 `XUANXIANG_*` 历史引用。
- 业务逻辑、目录迁移/恢复/锁流程、UI 布局、模型配置 —— 纯标识符/字符串值替换，不改控制流。
- 本机 git remote 与 GitHub 仓库重命名（用户操作）；`release/` 历史产物内容的字节（只按需改文件名，见计划）。
- 仓库根目录 `D:\Projects\xaanink-desktop` 改名放在会话结束后由用户执行（会话内改工作目录根会破坏进行中的进程与监听）。
- `node_modules/`、`.git/` 不触碰；`out/`、`dist/` 由构建重新生成。

## 6. 测试与环境事实

- 测试入口：`npm test`（node --test 跑 `tests/unit` + `tests/integration`）、`npm run test:package`（打包配置+包内资源）、`npm run typecheck`、`npm run build`（generate + next build + build-desktop）。浏览器测试与 smoke/verify 脚本需 GUI/Electron 真机，属全量验收范畴，本次按用户约束不纳入。
- 改名相关断言已存在于：BRN01-07（`tests/unit/brand-names.test.ts`）、BSP01-09（`brand-startup-paths.test.ts`）、BRAND-P01-03（`brand-product-identity.test.ts`，直接断言 npm 名/appId/artifactName/协议 scheme/SVG 字标）、BRAND-S01-02（`brand-chat-session.test.ts`）、BDC01-09（`tests/integration/brand-data-compatibility.test.ts`）、`packaging-config.test.ts`、`tests/packaging/*`。更新这些断言即形成改名 TDD 的红/绿循环。
- 本机 PATH 上的 Node 为 v20.12.2，与 `engines`/`.nvmrc` 要求的 24 不符；2026-10-13 上次 core 运行记录（`docs/evidence/implementation-01/core-latest.json`）使用 v24.19.0。改名验证统一使用便携 Node v24.19.0（`D:\Projects\tools\node24`，不入库、用后可删），不改动系统 Node。Node 20 下预跑基线 433 用例 103 失败（环境偏离所致，仅作记录不作判定）。
- `docs/requirements-traceability.json` 与 `docs/migration-map.json` 台账含 7+3 处字样：品牌字段、仓库地址、2026-10-14 实际安装记录（`release/XaanInk-0.1.0-alpha-win-x64.exe`、`C:/Program Files/xaanink`）。安装路径是已发生的真实记录，处理方案在计划中单列。

## 7. 风险

- **替换映射遗漏大小写形态** → 用脚本按精确 4 形态映射替换，跑完后以 grep 残留检查兜底（0 容忍，除计划明示例外）。
- **双端字符串只改一端**（协议 scheme、response-port、BroadcastChannel、MIME）→ 测试用例文档列配对检查项，BRAND-P02 已断言两端一致。
- **SVG 字标未再生成** → 生成脚本输出 JSON 摘要 + BRAND-P03 断言 + PNG 同步重渲染。
- **台账/历史文档中的字样** → 按用户「所有」要求全部替换；其中 2026-10-14 真实安装路径一条保留原值并加改名注记（计划中详述理由），`release/` 本地产物文件改名将同步处理使台账引用保持真实。
