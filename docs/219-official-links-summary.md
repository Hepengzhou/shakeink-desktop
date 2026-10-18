# 官方网站与文档地址接入总结（219）

日期：2026-10-18。调研见 `docs/218-official-links-research.md`。

## 目标与约束（全部达成）

- 官网 `http://shake.ink`、文档 `http://shake.ink/docs/introduction`、常见问题 `http://shake.ink/docs/faq` 三处地址逐字接入（保留 `http://` 协议），统一集中在 `desktop/shared/project-info.ts` 单一事实源。

## 代码实现

| 文件 | 变更 |
| --- | --- |
| `desktop/shared/project-info.ts` | 新增 `PROJECT_WEBSITE_URL` / `PROJECT_DOCS_URL` / `PROJECT_FAQ_URL` 及 `PROJECT_EXTERNAL_LINKS`（仓库 + 三新地址，供白名单复用） |
| `desktop/shared/commands.json` | 新增 `help.website`（官方网站）、`help.faq`（常见问题）命令；help 菜单顺序 `help.website` → `help.docs` → `help.faq` → `help.feedback` |
| `desktop/shared/command-registry.ts` | 删除 `help.docs` 禁用特例，菜单项按真实可用状态启用 |
| `desktop/main/index.ts` | `help.website` / `help.docs` / `help.faq` 各自 `shell.openExternal` 到对应常量（沿用 `desktop:command` 可信链路）；About 窗口高度 380 → 400 |
| `desktop/main/project-about.ts` | About 窗口新增"官方网站 · 帮助文档 · 常见问题"文字链接行（纯链接样式，区别于 Star 按钮）；白名单扩展为 `PROJECT_EXTERNAL_LINKS` 精确匹配 |
| `src/components/desktop/SettingsDialog.tsx` | 关于页：新增"官方网站""常见问题"行；"查看文档"解除禁用并接 `help.docs`，删除"官网文档上线后启用"占位提示 |
| `README.md` | 顶部新增 官方网站 / 帮助文档 / 常见问题 外链导航行 |
| `docs/requirements-traceability.json` | 追加 `officialLinksRevision` 台账（纯追加 52 行，无格式抖动） |

## 测试（仅本次目的相关）

- 新增 `tests/unit/official-links.test.ts`（OL-01…OL-05）：常量逐字校验；两平台菜单命令与启用状态；主进程路由静态契约；About 链接与白名单正/负例（拒绝 `https://shake.ink`、`shake.ink.evil.invalid`、query/hash 变体等）；设置页接线与 README 链接。
- 改写 `tests/unit/command-menu.test.ts:30`（`help.docs` 禁用→启用）与 `tests/browser/version-star.test.ts:31`（`查看文档` 禁用→启用，新增两个按钮断言）。
- 结果：scoped 单测 14/14；命令目录相邻单测 64/64；真实 Chromium 浏览器用例 3/3；`tsc --noEmit` 通过。

## 边界说明

- 外链全部经主进程 `shell.openExternal` 打开，渲染进程与 About 窗口不加载远程内容，离线启动要求不受影响。
- About 白名单保持精确匹配（未放宽为前缀/域匹配），仿冒域与协议变体均被拦截，负例有 OL-04 覆盖。
- 新命令无默认快捷键，与 `help.feedback` 现状一致；快捷键设置页随之增加两个展示项，行为不变。
- 未做安装包/真实系统级验证（本次改动为常量、菜单与静态 HTML，无平台原生路径差异）；`build/Credits.html` 保持仅 Star 单链接未动。
