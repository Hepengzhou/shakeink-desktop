# ShakeInk 改名总结

2026-10-15。改名目标与约束全部完成。调研/计划/测试用例见同目录 `2026-10-15-shakeink-rename-research.md`、`2026-10-15-shakeink-rename-plan.md`、`2026-10-15-shakeink-rename-test-cases.md`（均经独立子代理审核，阻塞项已修正后执行）。

## 1. 目标达成

| 目标 | 结果 |
|---|---|
| 英文名 ShakeInk | `CURRENT_NAMES.appIdentity="ShakeInk"`、marker 枚举、artifactName、SVG 英文轮廓字标、关于面板版权、OpenRouter 标题头全部就位 |
| 应用名 shakeink | `package.json`/`package-lock.json` name=`shakeink`，npm 脚本日志已显示 `shakeink@0.1.0-alpha` |
| 默认配置目录 `~/.shakeink` | `brand-startup-paths.ts`（44/61/80）、`index.ts:75,779`、`startup-recovery.ts:175` 全部改为 `.shakeink`，BSP01 断言通过 |
| 所有 xaanink 字样替换 | 403 文件 1793 处替换；残留检查仅剩声明的例外（见第 4 节） |

## 2. 实施要点

- 沿用既有双家族架构：LEGACY（xuanxiang）冻结不动，CURRENT 家族改值；不新增第三家族，不改控制流。替换映射仅 4 种大小写形态（实测全仓无其他变体）。
- TDD：先更新 8 个品牌断言文件（含新增 BRN08「品牌协议值无旧名残留」，间接构造正则防止被自身替换反转；version-star VS-06 增补仓库 URL 正向断言），红阶段 54 用例 36 失败（`docs/evidence/shakeink-rename/red-phase.tap`）；全局替换后同一集合全绿（除 1 个既有环境失败，见第 3 节）。
- 品牌资产：`generate-brand-assets.mjs`（englishBrand=ShakeInk）重新生成 18 个 SVG + 4 个 PNG；formal 徽标英文轮廓字标字形路径实测重排（glyph 序列 S-h-a-k-e-I-n-k），中文字标「玄印写作」原样，无 `<text>` 元素。
- 台账：`docs/requirements-traceability.json`、`docs/migration-map.json` 品牌字段更新为 ShakeInk/shakeink；`localInstallation.path` 保留 `C:/Program Files/xaanink` 原值（2026-10-14 真实安装事实）并加 `renameNote`。
- `release/` 本地产物 7 个 `XaanInk-*` 文件改名 `ShakeInk-*`，两个 `.sha256` sidecar 内文件名同步，`sha256sum -c` 校验通过。

## 3. 测试结果（Node v24.19.0 便携版，与 2026-10-13 本机 core 运行同版本）

- **G00 基线（改名前）**：62 文件 441 用例，432 通过 / 9 失败（`baseline-node24.tap`）。9 个既有失败：CFG16、DESK-D01、IL42-PG02、IPC-01、M71-10、ONB-08、RW33-01、RW33-04、打包预检（Windows 路径正则不匹配，既有环境问题）。
- **G02 绿阶段（改名后）**：442 用例（+BRN08），433 通过 / 8 失败 / 1 取消（`green-phase.tap`）。失败集合与基线对账：7 个稳定既有失败不变；IL42-PG02、ONB-08 转绿；ROOT11-01、cover/scene 两个「built worker」超时型用例在本次并发运行中失败——二者在 2026-10-13 全量运行中同样超时失败，属本机慢盘抖动；**串行隔离复跑 9/9 全绿**（`flaky-recheck.tap`），确认非改名回归。
- **红名单 8 文件品牌断言全部转绿**：BRN01-08、BSP01-09、BRAND-P01-03、BRAND-S01-02、BDC 全部、repository-license-commands 3 项、VS-06 均通过；`packaging-config.test.ts` 品牌断言（appId/排除规则）通过，其「本地 Electron 预检」用例为基线既有失败（Windows 路径分隔符正则），与改名无关。
- **G03 类型检查 + G04 构建**：`rm -rf dist out .next` 后 `npm run generate && npm run typecheck && npm run build:ui && npm run build:desktop` 全部成功（`build.log`）；`dist/`、`out/` 产物 0 旧名命中。
- **G01 残留检查**：替换范围 0 命中，例外仅第 4 节所列。
- **G05 品牌资产**：脚本输出 `englishBrand:"ShakeInk"`，18 矢量 + 4 位图，无旧字标属性。
- **G06 打包目录**：`npm run package:dir` 成功（`package-dir.log`，afterPack 资源核验 340 项、PGlite 闭合）；`release/win-unpacked/resources/app/package.json` 的 `name` 为 `shakeink`；包内 `dist/`、`out/`、`package.json` 0 旧名命中；`runtime-licenses/provenance.json` 已随打包以 `shakeink-packaged-resource-provenance` 格式重生成。
- **G07 台账一致性**：artifact 引用指向真实 `release/ShakeInk-0.1.0-alpha-win-x64.exe`；sha256 校验通过；例外字段如计划。

环境说明：本机 PATH 的 Node 为 v20.12.2，与 `engines`/`.nvmrc`（24）不符；本次验证统一使用便携 Node v24.19.0（`D:\Projects\tools\node24`，可删除）。Node 20 下预跑基线曾出现 103 失败（环境偏离），未作判定依据。

## 4. 残留例外清单（有意保留，全部列出）

1. `docs/reviews/2026-10-15-shakeink-rename-*.md`（本系列 4 份文档）——记录映射与旧名分析，必须保留旧字面量。
2. 两份台账 `localInstallation.path: "C:/Program Files/xaanink"` ——2026-10-14 真实安装事实记录，附 `renameNote`。
3. 日期型历史文档（docs/reviews、design 检查记录等）中的字样已按「所有」要求替换；其中记录的实测命令/产物名成为改名后语境，特此统一注记。
4. 未跟踪本机内容不在仓库源范围：`docs/evidence/` 原始日志、`release/win-unpacked/` 已由 G06 重建、旧安装目录 `C:\Program Files\xaanink` 与本机 `~/.xaanink` 数据目录（见第 5 节）。

## 5. 数据兼容后果（用户须知）

- xaanink 时代数据（`~/.xaanink`、`xaanink-work.json`/`.xaanink-lock` 等）新版不再识别，按全新安装创建 `~/.shakeink`；旧目录原样保留在磁盘，不会被改动或删除。0.1.0-alpha 仅发布一天，如需保留旧数据请手工迁移或继续使用旧版。
- xuanxiang legacy 兼容链不变（BDC  legacy 用例全绿）。
- 旧版导出的 `xaanink-settings`/`xaanink-local-templates`/`xaanink-recovery` 文件新版不再接受导入。
- 渲染层协议源改为 `shakeink://app`，旧源 sessionStorage/localStorage 随旧版卸载清理。
- 本机已装的 0.1.0-alpha（`C:\Program Files\xaanink`）为改名前版本，可独立卸载。

## 6. 用户后续操作（会话外执行）

1. 仓库根目录改名（本会话占用该目录，未代为执行）：关闭本会话后执行 `mv D:\Projects\xaanink-desktop D:\Projects\shakeink-desktop`（Git Bash）或在资源管理器重命名。
2. GitHub 仓库重命名为 `shakeink-desktop` 后更新 remote：`git remote set-url origin https://github.com/mySingleLive/shakeink-desktop.git`（GitHub 会为旧地址保留跳转）。
3. 下次打包将产出 `ShakeInk-<version>-win-x64.exe`，安装目录为新名。

## 7. 审核与证据

- 计划审核、测试用例审核、code review 均由同一独立子代理（plan 型）完成；三轮共提出 6 个阻塞问题（B1-B4、T1-T2、C1），全部修正后执行/验证。
- 证据文件（`docs/evidence/shakeink-rename/`）：`baseline-node24.tap`、`baseline-node24-failures.txt`、`red-phase.tap`、`green-phase.tap`、`green-phase-failures.txt`、`flaky-recheck.tap`、`build.log`、`package-dir.log`。
