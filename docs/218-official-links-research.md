# 官方网站与文档地址接入调研（218）

日期：2026-10-18。目标：为产品补充官方网站与文档地址。

## 约束地址（用户给定，逐字采用）

| 用途 | 地址 |
| --- | --- |
| 官网 | `https://shake.ink` |
| 文档 | `https://shake.ink/docs/introduction` |
| 常见问题 | `https://shake.ink/docs/faq` |

注意：三处地址 2026-10-19 起按用户新约束统一为 `https://` 协议（同一要求历次修改以后者为准）。

## 现状证据

### 已有的链接中枢

- `desktop/shared/project-info.ts:1` 集中固定 `PROJECT_REPOSITORY_URL`（GitHub 仓库）与 Star 文案，是项目外链的唯一常量来源。官网/文档/常见问题地址应在此并列导出，保持单一事实源。
- `desktop/main/index.ts:579` 通过 `desktop:open-project-repository` IPC（`trusted(event)` + `shell.openExternal`）打开仓库；`desktop/main/index.ts:701` 的 `help.feedback` 直接 `shell.openExternal` 打开 issues 页面。外链统一走主进程 `shell.openExternal`，渲染进程不直接拼 URL。

### 已为本次预留的占位

- `desktop/shared/commands.json:224` 存在 `help.docs`（帮助文档）命令，菜单 `help` 组为 `["help.docs","help.feedback"]`（`commands.json:1395`）。
- `desktop/shared/command-registry.ts:27` 以 `enabled:id!=="help.docs"` 特例把帮助文档菜单项禁用（等待官网上线）。
- `desktop/main/index.ts:700` 的 `if (id === "help.docs") return` 是空实现占位。
- `src/components/desktop/SettingsDialog.tsx:72` 关于页有"帮助文档"行，按钮禁用并标注"官网文档上线后启用"。

### 可顺带承载链接的界面

- `desktop/main/project-about.ts` 独立 About 窗口（Windows）：当前只有 Star 链接，且 `installProjectAboutLinks` 白名单仅放行 `PROJECT_REPOSITORY_URL`（精确匹配，拒绝 query/hash/仿冒域，VS-06 有单测）。新增链接必须同步扩展白名单。
- `README.md:13-17` 顶部居中导航行目前只有页内锚点，适合并列官网/文档/常见问题。

### 需要同步更新的既有断言

- `tests/unit/command-menu.test.ts:30` 断言 `help.docs` 禁用——启用后必须改写。
- `tests/browser/version-star.test.ts:31` 断言"查看文档"按钮禁用——启用后必须改写。

## 实施方案

1. **常量**：`project-info.ts` 新增 `PROJECT_WEBSITE_URL` / `PROJECT_DOCS_URL` / `PROJECT_FAQ_URL`，并导出 `PROJECT_EXTERNAL_LINKS`（仓库 + 三个新地址）供 About 白名单复用。
2. **命令目录**：`commands.json` 新增 `help.website`（官方网站）、`help.faq`（常见问题），形态与 `help.docs` 一致（无默认快捷键、global 作用域）；help 菜单顺序调整为 `help.website` → `help.docs` → `help.faq` → `help.feedback`。
3. **菜单启用**：`command-registry.ts` 删除 `help.docs` 禁用特例，全部菜单项按真实可用状态启用。
4. **主进程分发**：`index.ts` 将 `help.website` / `help.docs` / `help.faq` 分别 `shell.openExternal` 到三个常量地址（沿用 `help.feedback` 的写法与 `trusted` 链路：渲染进程经 `desktop:command` 触发，与现有 `help.feedback` 同路径）。
5. **设置·关于页**：`SettingsDialog.tsx` 关于组依次提供 当前版本、官方网站（访问官网）、帮助文档（查看文档，去掉禁用与"上线后启用"提示）、常见问题（查看常见问题）、问题反馈（原有）、Star 行（原有）。
6. **About 窗口**：`project-about.ts` 在许可行下加一行文字链接"官方网站 · 帮助文档 · 常见问题"（区别于 Star 的按钮式样式，新增纯文字链接样式）；白名单扩展为 `PROJECT_EXTERNAL_LINKS` 精确匹配，其余行为（deny 弹窗、拦截导航、失败回调）不变；窗口高度 380 → 400 容纳新增行。
7. **README**：顶部导航行加入 官方网站 / 帮助文档 / 常见问题 三个外链。
8. **台账**：`docs/requirements-traceability.json` 增加 `officialLinksRevision` 记录来源、测试 ID 与结果。

## 测试范围（仅本次目的相关）

- 新增 `tests/unit/official-links.test.ts`：
  - OL-01 三个常量逐字等于约束地址（含 `https://` 协议）。
  - OL-02 `commands.json` help 组含三条命令且标签正确；`desktopMenu` 两个平台全部启用、顺序正确。
  - OL-03 主进程静态契约：三条命令各自路由到对应常量（沿用 version-star 的源码正则模式）。
  - OL-04 About HTML 含三个链接且无脚本/内联事件；白名单精确放行四个地址，拒绝仿冒域、query/hash、scheme 变体（`http://shake.ink` 不在白名单内，因为常量是 `https://`）。
  - OL-05 设置页源码接线：`command('help.website'|'help.docs'|'help.faq')` 存在，"查看文档"不再禁用；README 含三个地址。
- 改写 `tests/unit/command-menu.test.ts:30` 的禁用断言为启用断言。
- 改写 `tests/browser/version-star.test.ts:31`：`查看文档` 变为可用，并断言新增按钮可见。
- 复跑 `tests/unit/version-star.test.ts`（About/外链白名单相邻逻辑）确认无回归。

## 风险与边界

- 外链仅经主进程 `shell.openExternal` 打开，渲染进程与 About 窗口不加载远程内容，离线启动要求不受影响。
- About 白名单保持精确匹配，不放宽为前缀匹配，避免 `shake.ink.evil` 类仿冒。（2026-10-19 补充：仅容忍 Chromium 对裸域地址序列化产生的末尾 `/`，统一打开规范地址。）
- 新命令无默认快捷键，快捷键设置页仅多两行不可绑定为空的展示项，与 `help.feedback` 现状一致。
