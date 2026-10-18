# 侧栏用户菜单「帮助 / 问题反馈」调研（230）

日期：2026-10-19。目标：在左侧导航栏底部用户弹出菜单的「设置」下方加入「帮助」（含二级菜单：官网、产品介绍、用户指南、常见问题）与「问题反馈」，全部在浏览器中打开对应链接；「问题反馈」与设置对话框「关于」页的问题反馈按钮行为一致（GitHub 提交 issue 页面）。

## 现状证据

### 账号弹出菜单位置与结构

- `src/components/layout/SidebarTree.tsx:1962` `account-footer` 内是真实 React 账号菜单（`NavigationMenu` + base-ui `Menu`），触发器 `aria-label="账号菜单：…"`（`SidebarTree.tsx:1968`）。
- 弹层 `NavigationMenuContent side="top" align="start"`（`SidebarTree.tsx:1982`）当前内容：用户信息 Label → 分隔线 → 外观主题 Switch → 分隔线 → 「设置」菜单项（`SidebarTree.tsx:2013`，`window.desktop?.command("app.settings")`，带 `Settings` 图标）。「设置」是最后一项，新项追加在其后。
- 二级菜单组件已就绪：`src/components/ui/dropdown-menu.tsx:111` 导出 `DropdownMenuSub` / `DropdownMenuSubTrigger`（自动带右箭头）/ `DropdownMenuSubContent`；既有用例见 `src/components/layout/OutlineTreeMenu.tsx:141`（导出正文/大纲子菜单），浏览器测试交互范式见 `tests/browser/file-export.test.ts:84`（`hover` 子菜单触发器 → 点击子项）。
- lucide-react 已安装（`^1.25.0`），`CircleHelp`、`Globe`、`BookOpen`、`BookOpenText`、`CircleQuestionMark`、`MessageSquareWarning` 均存在；`Globe`、`BookOpen` 已在 SidebarTree 导入（`SidebarTree.tsx:13,24`）。

### 外链统一通道（渲染进程不拼 URL）

- 全部外链经主进程 `shell.openExternal` 打开，渲染进程只发命令 id：`desktop/main/index.ts:702-705` 现有 `help.website` → `PROJECT_WEBSITE_URL`、`help.docs` → `PROJECT_DOCS_URL`、`help.faq` → `PROJECT_FAQ_URL`、`help.feedback` → `https://github.com/mySingleLive/shakeink-desktop/issues/new/choose`（逐字内联）。
- 可信链路：`desktop/preload/index.ts:28` `command: id => ipcRenderer.invoke("desktop:command", id)`；主进程 `ipcMain.handle("desktop:command", … trusted(event) …)`；桥类型 `desktop/shared/ipc.ts:63` `command(id: string): Promise<void>` 接受任意 id 字符串。
- 设置对话框「关于」页的问题反馈按钮即 `command('help.feedback')`（`src/components/desktop/SettingsDialog.tsx:72`）——本次「问题反馈」菜单项复用同一命令，天然与约束一致。

### URL 单一事实源与四个目标地址

- `desktop/shared/project-info.ts` 集中导出 `PROJECT_WEBSITE_URL='https://shake.ink'`、`PROJECT_DOCS_URL='https://shake.ink/docs/introduction'`、`PROJECT_FAQ_URL='https://shake.ink/docs/faq'`、`PROJECT_EXTERNAL_LINKS`（仓库 + 前三者，供 About 窗口白名单）。
- 目标地址与既有常量的对应（2026-10-19 逐一在线核实）：
  - 官网 → `https://shake.ink`（站点在线）。
  - 产品介绍 → `https://shake.ink/docs/introduction`（浏览器实测页面标题为「产品介绍 · 玄印写作」，与 `PROJECT_DOCS_URL` 一致）。
  - 用户指南 → `https://shake.ink/docs/guide`（浏览器实测站点导航「用户指南」落点为 `https://shake.ink/docs/guide/`，标题「用户指南 · 玄印写作」；站点会重定向到带尾斜杠形式，常量沿用无尾斜杠约定）。**仓库中尚不存在该地址，需要新常量与新命令。**
  - 常见问题 → `https://shake.ink/docs/faq`（`PROJECT_FAQ_URL`）。
- `PROJECT_EXTERNAL_LINKS` 是 About 窗口 `will-navigate`/`setWindowOpenHandler` 白名单（OL-04 精确匹配负例覆盖）；About HTML 不含用户指南链接，白名单无需扩充，`PROJECT_EXTERNAL_LINKS` 保持不变，OL-01 不受影响。

### 命令目录与生成物

- `desktop/shared/commands.json`：`help.*` 四条命令形态为 `{id,label,group:"应用菜单",scope:"global",mac:"",win:"",locked:false,platform:null}`（`commands.json:223-262`）；`menus.help = ["help.website","help.docs","help.faq","help.feedback"]`（`commands.json:1415`）。
- 大量命令登记在 `commands` 但不进入任何原生菜单（`menu.*`、`md.*`、`ai.*`、`input.*` 等 90+ 条）——「注册命令但不加入 `menus.help`」有充分先例，可保持原生「帮助」菜单不变（本次需求只涉及侧栏用户菜单）。
- `commands.json` 是 `scripts/command-catalog-sources.mjs` 的源之一，其哈希记录在 `desktop/shared/command-catalogs.generated.json`；修改后必须运行 `npm run generate:commands` 重新生成，否则 `scripts/verify-command-catalogs.mjs` 报 stale。
- 快捷键设置页会枚举全部已注册命令（含无默认绑定项），新增 `help.guide` 会多一行展示项，与 219 总结记录的 `help.website`/`help.faq` 现状一致。

### 既有测试与影响面

- `tests/unit/official-links.test.ts`：OL-01 断言常量与 `PROJECT_EXTERNAL_LINKS`（不动它则不受影响）；OL-02 断言 `menus.help` 精确内容（不加 `help.guide` 进菜单则不受影响）；OL-03 断言主进程三条路由（新增第四条不影响）；OL-05 断言设置页接线（不动）。
- `tests/unit/command-menu.test.ts:30` 断言 `help.docs` 启用——不受影响。
- 侧栏浏览器夹具 `tests/helpers/sidebar-navigation-fixture.ts` 挂载真实 `SidebarTree`（合成用户「隔离用户」），未定义 `window.desktop`，测试可自行 `page.evaluate` 注入 `window.desktop={command:…}` 记录调用（既有范式：`tests/browser/caption-alignment.test.ts:45`）。无任何既有用例断言账号弹层完整内容；SN-02 仅测量 footer 几何（72px 高，不含弹层），不受影响。
- 运行方式：单测 `node --import tsx --test tests/unit/<file>`；浏览器 `node --import tsx --test --test-concurrency=1 tests/browser/<file>`（Chromium 经 playwright-core，可用 `SHAKEINK_TEST_CHROMIUM` 指定）。

## 实施方案

1. **常量**：`project-info.ts` 新增 `PROJECT_GUIDE_URL='https://shake.ink/docs/guide'`，单独导出，不并入 `PROJECT_EXTERNAL_LINKS`（About 白名单不扩充）。
2. **命令目录**：`commands.json` 的 `commands` 追加 `help.guide`（label「用户指南」，group「应用菜单」，scope global，无双平台默认键，`locked:false,platform:null`，插在 `help.faq` 与 `help.feedback` 之间保持 help.* 聚簇）；`menus.help` 不变，原生帮助菜单不动。
3. **主进程**：`desktop/main/index.ts` 导入 `PROJECT_GUIDE_URL`，在 `help.faq` 路由后追加 `if (id === "help.guide") { await shell.openExternal(PROJECT_GUIDE_URL); return }`。
4. **侧栏菜单**：`SidebarTree.tsx` 账号弹层「设置」之后依次加入：
   - `DropdownMenuSub`：触发器「帮助」（`CircleHelp` 图标）；子内容四个 `DropdownMenuItem`——官网（`Globe`，`help.website`）、产品介绍（`BookOpen`，`help.docs`）、用户指南（`BookOpenText`，`help.guide`）、常见问题（`CircleQuestionMark`，`help.faq`），点击均 `void window.desktop?.command(id)`。
   - `DropdownMenuItem`「问题反馈」（`MessageSquareWarning` 图标，`help.feedback`）。
   - 新图标并入既有 lucide 导入块；不新增分隔线（与约束「在[设置]下方加入」逐字一致）。
5. **生成物**：`npm run generate:commands` 重新生成 `command-catalogs.generated.json`。
6. **台账**：`docs/requirements-traceability.json` 追加 `sidebarHelpMenuRevision`（纯追加，无格式抖动）。

## 测试范围（仅本次目的相关）

- 新增 `tests/unit/sidebar-help-menu.test.ts`：
  - SH-01 `PROJECT_GUIDE_URL` 逐字等于 `https://shake.ink/docs/guide`；`PROJECT_EXTERNAL_LINKS` 维持原四项。
  - SH-02 `commands.json` 含 `help.guide`（用户指南/应用菜单/global/空绑定）且 `menus.help` 保持原四条。
  - SH-03 主进程静态契约：`help.guide` 路由到 `PROJECT_GUIDE_URL` 且常量已导入（沿用 OL-03 正则模式）。
  - SH-04 `SidebarTree.tsx` 源码接线：顺序 设置→帮助→问题反馈；四个子项各自 `command("help.*")`；「问题反馈」`command("help.feedback")`。
- 新增 `tests/browser/sidebar-help-menu.test.ts`：
  - SH-B-01 真实 Chromium + 真实 SidebarTree：打开账号菜单，断言 设置/帮助/问题反馈 顺序与可见性；悬停「帮助」展开二级菜单，断言 官网/产品介绍/用户指南/常见问题 顺序；逐项点击断言记录到对应命令 id（官网→help.website、产品介绍→help.docs、用户指南→help.guide、常见问题→help.faq、问题反馈→help.feedback），点击后菜单关闭。
- 相邻回归（受触点波及的既有文件）：`tests/unit/official-links.test.ts`、`tests/unit/command-menu.test.ts`、`tests/browser/sidebar-navigation.test.ts`。
- `tsc --noEmit` 类型检查。

## 风险与边界

- 外链仅经主进程 `shell.openExternal`，渲染进程不加载远程内容，离线启动要求不受影响。
- 「用户指南」地址已在真实浏览器核实可达（站点 308 重定向到尾斜杠形式）；常量沿用无尾斜杠约定，与既有三地址一致。
- 原生「帮助」菜单、设置「关于」页、About 窗口均不在本次范围，保持逐字不变；「问题反馈」复用 `help.feedback`，与「关于」页按钮同一路由，行为自然一致。
- `help.guide` 无默认快捷键，快捷键设置页多一行展示项，行为与既有 help.* 一致。
