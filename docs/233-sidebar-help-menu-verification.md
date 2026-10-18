# 侧栏用户菜单「帮助 / 问题反馈」验证（233）

日期：2026-10-19。用例见 `docs/232-sidebar-help-menu-cases.md`。范围：仅本次目的相关用例与相邻回归，未做全量测试。系统 Node v20.12.2。

## 结果总览

| 范围 | 命令 | 结果 |
| --- | --- | --- |
| SH-01～SH-04 + 相邻单测（OL-01～05、command-menu 4 条） | `node --import tsx --test tests/unit/sidebar-help-menu.test.ts tests/unit/official-links.test.ts tests/unit/command-menu.test.ts` | 13/13 通过，0 失败 |
| SH-B-01（真实 Chromium + 真实 SidebarTree） | `node --import tsx --test --test-concurrency=1 tests/browser/sidebar-help-menu.test.ts` | 1/1 通过；连续 3 次运行稳定 |
| 相邻浏览器回归（SN 系列） | `node --import tsx --test --test-concurrency=1 tests/browser/sidebar-navigation.test.ts` | 20/20 通过，0 失败 |
| 命令目录生成物新鲜度 | `node scripts/verify-command-catalogs.mjs` | 退出码 0 |
| 类型检查 | `npx tsc --noEmit` | 本次改动文件 0 错误（见「既有环境问题」） |

## 用例执行要点

- SH-01 `PROJECT_GUIDE_URL === 'https://shake.ink/docs/guide'`；`PROJECT_EXTERNAL_LINKS` 维持四项不变。
- SH-02 `help.guide`（用户指南/应用菜单/global/空绑定/`locked:false`/`platform:null`）已登记；`menus.help` 精确保持 `["help.website","help.docs","help.faq","help.feedback"]`，原生帮助菜单不变。
- SH-03 主进程静态契约：`help.guide` → `shell.openExternal(PROJECT_GUIDE_URL)`，常量已导入；`desktop:command` 可信链路与 preload 通道不变。
- SH-04 `SidebarTree.tsx` 源码顺序 设置 → 帮助子菜单 → 问题反馈；子菜单四项按序接 `help.website`/`help.docs`/`help.guide`/`help.faq`；「问题反馈」接 `help.feedback`。
- SH-B-01 真实浏览器：账号菜单末三项文本精确为 `['设置','帮助','问题反馈']`；悬停「帮助」后二级菜单文本精确为 `['官网','产品介绍','用户指南','常见问题']`；逐项点击记录命令依次为 `help.website` → `help.docs` → `help.guide` → `help.faq`，最后点击「问题反馈」记录 `help.feedback`，每次点击后菜单关闭。
- 调试记录：首跑时顶层/二级菜单的文本断言在弹层动画完成前执行导致空数组，补充 `waitFor` 等待后稳定通过（只动测试等待，不动实现）。

## 既有环境问题（与本次改动无关，如实记录）

- `npx tsc --noEmit` 全量输出含 12 条错误，全部位于 `tests/integration/pglite-adapter.test.ts`（相对 HEAD 未改动）：`tests/generated/adapter` 为 gitignore 的生成物，本环境 `npm run generate:test` 因 `@prisma/dev` 在 Node v20 下 `ERR_REQUIRE_ESM` 无法生成。本次改动触及的全部文件（`project-info.ts`、`commands.json`、`main/index.ts`、`SidebarTree.tsx`、两个新测试文件）0 错误（过滤统计为 0）。
- 官网地址核实：`https://shake.ink/docs/guide` 在真实浏览器中可达，页面标题「用户指南 · 玄印写作」（站点 308 重定向到尾斜杠形式，常量沿用无尾斜杠约定）；`https://shake.ink/docs/introduction` 标题「产品介绍 · 玄印写作」。

## 未做项（范围边界）

- 未跑全量 `npm test` 与全量浏览器套件（按任务约束只跑本次相关用例）。
- 未做安装包/真实系统级验证（改动为常量、命令注册、主进程一行路由与菜单 JSX，无平台原生路径差异）。
