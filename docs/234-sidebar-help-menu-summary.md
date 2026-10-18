# 侧栏用户菜单「帮助 / 问题反馈」总结（234）

日期：2026-10-19。调研 `docs/230-sidebar-help-menu-research.md`，产品 `docs/231-sidebar-help-menu-product.md`，用例 `docs/232-sidebar-help-menu-cases.md`，验证 `docs/233-sidebar-help-menu-verification.md`。

## 目标与约束（全部达成）

- 在左侧导航栏底部用户弹出菜单的「设置」下方加入「帮助」与「问题反馈」。
- 「帮助」展开二级菜单：官网、产品介绍、用户指南、常见问题，均为链接按钮，点击在浏览器打开对应地址（官网 `https://shake.ink`、产品介绍 `https://shake.ink/docs/introduction`、用户指南 `https://shake.ink/docs/guide`、常见问题 `https://shake.ink/docs/faq`；前三地址 2026-10-19 在线核实，用户指南页面标题即「用户指南」）。
- 「问题反馈」复用 `help.feedback` 命令，与设置对话框「关于」页按钮同一路由，打开 GitHub 新建 issue 页 `https://github.com/mySingleLive/shakeink-desktop/issues/new/choose`。

## 代码实现

| 文件 | 变更 |
| --- | --- |
| `desktop/shared/project-info.ts` | 新增 `PROJECT_GUIDE_URL='https://shake.ink/docs/guide'`；`PROJECT_EXTERNAL_LINKS` 保持四项不变 |
| `desktop/shared/commands.json` | `commands` 登记 `help.guide`（用户指南，应用菜单，global，无默认键）；`menus.help` 不变，原生帮助菜单不动 |
| `desktop/main/index.ts` | 导入 `PROJECT_GUIDE_URL`；新增 `help.guide` → `shell.openExternal(PROJECT_GUIDE_URL)` 路由（沿用 `desktop:command` 可信链路） |
| `src/components/layout/SidebarTree.tsx` | 账号弹层「设置」后依次加入：「帮助」`DropdownMenuSub`（四个链接子项：官网 `help.website`、产品介绍 `help.docs`、用户指南 `help.guide`、常见问题 `help.faq`）与「问题反馈」`help.feedback`；新增 `CircleHelp`/`BookOpenText`/`CircleQuestionMark`/`MessageSquareWarning` 图标导入 |
| `desktop/shared/command-catalogs.generated.json` | `npm run generate:commands` 重新生成（commands.json 为其哈希源） |
| `docs/requirements-traceability.json` | 追加 `sidebarHelpMenuRevision` 台账（纯追加 51 行，无格式抖动） |

## 测试（仅本次目的相关）

- 新增 `tests/unit/sidebar-help-menu.test.ts`（SH-01～SH-04）：常量逐字；命令登记与原生菜单不变；主进程路由静态契约；侧栏源码顺序与接线。
- 新增 `tests/browser/sidebar-help-menu.test.ts`（SH-B-01）：真实 Chromium + 真实 SidebarTree，断言一/二级菜单顺序、逐项点击的命令序列与菜单关闭。
- 相邻回归：`tests/unit/official-links.test.ts`、`tests/unit/command-menu.test.ts`、`tests/browser/sidebar-navigation.test.ts`。
- 结果：scoped 单测 13/13；浏览器 1/1（连续 3 次稳定）+ 20/20；`verify-command-catalogs` 退出码 0；`tsc --noEmit` 本次改动文件 0 错误。

## 边界说明

- 外链全部经主进程 `shell.openExternal`，渲染进程不拼 URL、不加载远程内容，离线启动要求不受影响；应用窗口自身不跳转。
- 原生「帮助」菜单、设置「关于」页、独立 About 窗口及其白名单均逐字未动；`help.guide` 无默认快捷键，快捷键设置页多一行展示项，与既有 help.* 一致。
- 未做全量测试（按任务约束）；既有 `tests/integration/pglite-adapter.test.ts` 的 12 条 tsc 错误为本机生成物缺失的既有环境问题（相对 HEAD 未改动），与本次无关。
- 未做安装包/真实系统级验证（无平台原生路径差异）。
