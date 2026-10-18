# 侧栏用户菜单「帮助 / 问题反馈」测试用例（232）

日期：2026-10-19。需求见 `docs/231-sidebar-help-menu-product.md`，调研见 `docs/230-sidebar-help-menu-research.md`。

范围约定：禁止全量测试，只覆盖本次目标相关用例（SH-01～SH-04、SH-B-01）及受触点波及的相邻既有文件回归。

## 单元用例（新增 `tests/unit/sidebar-help-menu.test.ts`）

| ID | 名称 | 前置 | 步骤 | 预期 |
| --- | --- | --- | --- | --- |
| SH-01 | 用户指南地址常量逐字准确，About 白名单集合不变 | 仓库源码 | 导入 `desktop/shared/project-info.ts` | `PROJECT_GUIDE_URL === 'https://shake.ink/docs/guide'`；`PROJECT_EXTERNAL_LINKS` 仍为 `[PROJECT_REPOSITORY_URL, PROJECT_WEBSITE_URL, PROJECT_DOCS_URL, PROJECT_FAQ_URL]` 四项（不并入用户指南） |
| SH-02 | 命令目录登记 `help.guide` 且原生帮助菜单不变 | 仓库源码 | 读取 `desktop/shared/commands.json` | `commands` 含 `help.guide`：label「用户指南」、group「应用菜单」、scope `global`、mac/win 均为 `""`、`locked:false`、`platform:null`；`menus.help` 精确等于 `["help.website","help.docs","help.faq","help.feedback"]`（`help.guide` 不进入原生菜单） |
| SH-03 | 主进程把 `help.guide` 路由到指南地址（可信链路静态契约） | 仓库源码 | 读取 `desktop/main/index.ts`、`desktop/preload/index.ts` | 主进程导入 `PROJECT_GUIDE_URL`；存在 `id === "help.guide"` 分支且 `await shell.openExternal(PROJECT_GUIDE_URL)`；preload 仍经 `ipcRenderer.invoke("desktop:command", id)`，主进程 `desktop:command` 处理器带 `trusted(event)` |
| SH-04 | 侧栏账号菜单源码接线：顺序、子菜单与命令一一对应 | 仓库源码 | 读取 `src/components/layout/SidebarTree.tsx` | ① 账号弹层内源码顺序为 `app.settings` → 帮助子菜单 → `help.feedback`；② 存在 `DropdownMenuSub`（帮助）与 `DropdownMenuSubTrigger`；③ 子菜单四项按序分别 `command("help.website")`（官网）、`command("help.docs")`（产品介绍）、`command("help.guide")`（用户指南）、`command("help.faq")`（常见问题）；④「问题反馈」项 `command("help.feedback")`；⑤ 菜单文案 帮助/官网/产品介绍/用户指南/常见问题/问题反馈 均出现 |

## 浏览器用例（新增 `tests/browser/sidebar-help-menu.test.ts`，真实 Chromium + 真实 SidebarTree）

夹具：`tests/helpers/sidebar-navigation-fixture.ts`（合成用户「隔离用户」，挂载真实组件）；测试注入 `window.desktop={command:id=>记录}` 后再操作。运行：`node --import tsx --test --test-concurrency=1 tests/browser/sidebar-help-menu.test.ts`。

| ID | 名称 | 步骤 | 预期 |
| --- | --- | --- | --- |
| SH-B-01 | 账号菜单展开帮助二级菜单并逐项打开链接 | ① 点击「账号菜单：隔离用户 …」按钮；② 断言一级菜单项顺序与可见性；③ 悬停「帮助」；④ 断言二级菜单项；⑤ 依次点击 官网/产品介绍/用户指南/常见问题（每次重新打开菜单）；⑥ 点击「问题反馈」 | ② 一级菜单末三项依次为 设置、帮助、问题反馈；④ 二级菜单依次为 官网、产品介绍、用户指南、常见问题；⑤ 记录的命令依次为 `help.website`、`help.docs`、`help.guide`、`help.faq`，每次点击后菜单关闭；⑥ 记录到 `help.feedback` 且菜单关闭 |

## 相邻既有回归（受触点波及，非全量）

| 文件 | 原因 | 预期 |
| --- | --- | --- |
| `tests/unit/official-links.test.ts` | 共享 `project-info.ts` 常量与 `commands.json` 菜单断言（OL-01～OL-05） | 全部通过（`PROJECT_EXTERNAL_LINKS` 与 `menus.help` 未变） |
| `tests/unit/command-menu.test.ts` | 共享 `commands.json` 与 `command-registry.ts` | 全部通过 |
| `tests/browser/sidebar-navigation.test.ts` | 共享侧栏夹具与 `SidebarTree.tsx` | 全部通过 |

## 类型检查

- `npx tsc --noEmit` 通过（新增图标导入与 JSX 均纳入类型检查）。

## 通过标准

- SH-01～SH-04、SH-B-01 全部通过；上表相邻回归全部通过；`tsc --noEmit` 通过。任何一项失败即不通过，不得缩减用例凑绿。
