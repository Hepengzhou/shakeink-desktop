# UI 文字禁选测试与验收记录

日期：2026-10-13（Asia/Shanghai）。使用缓存 Node **v24.21.0**，本机系统 Node 20 未用于验证。浏览器使用已安装 Chrome；实际桌面为 Windows Electron **44.6.0**。所有数据为临时隔离根中的合成作品/草稿，无模型、无真实用户数据或 Key。

## TDD 与专项结果

| 执行 | 结果 | 证据 |
| --- | --- | --- |
| 初始 UI/输入/预览矩阵 | 0/5，全部按预期失败（auto） | `docs/evidence/text-selection/red.tap` |
| 实际卡片事件红灯 | 19/39，通过；20 失败，正文触发拖动或打开 | `cards-red.tap` |
| 独立 About HTML 红灯 | 0/1，auto !== none | `about-red.tap` |
| 最终 UI/输入/预览/portal 矩阵 | 8/8 | `feature-browser.tap`、最终全量 TAP 中 TS 系列 |
| 实际卡片及事件边界 | 56/56，无跳过 | `cards-green.tap`、最终全量 TAP |
| About HTML + 相关品牌/原生命令回归 | 19/19（HTML 浏览器 1 + 单元 18） | `about-green.tap` |

本次新增的浏览器专项合计 **65/65**。真实 React/CSS 覆盖双主题、普通 UI/portal、文本输入/readonly、composer false 根和原子 chip、NativeEditContext 输入根、Markdown/代码/表格/链接、逐块正文、评论、变量与实体简介。真实候选/场景/角色/物品/等级卡覆盖选区、双击、UI 操作、引用 payload、空态、暂停/恢复拖动、blur/cleanup、内部控件和后挂载节点。

## 全量回归与构建

最终 `Node24 --import tsx --test --test-reporter=tap --test-concurrency=1 --test-timeout=180000 --test-force-exit tests/browser/*.test.ts`：**424/424**，失败/取消/跳过均 0，证据 `browser-full-final.tap`。随后新增的独立 About 用例与相关单元回归另执行 **19/19**；当前浏览器用例总计 **425**，全部已有执行通过证据，不能把混合套件中的 18 个单元用例计入浏览器数量。

`Node24 --import tsx --test --test-reporter=tap --test-concurrency=4 tests/unit/*.test.ts tests/integration/*.test.ts` 的完整执行：

| 范围 | 总数 | 通过 | 失败 | 取消 | 跳过 |
| --- | --- | --- | --- | --- | --- |
| 修改前基线 | 1951 | 1903 | 40 | 6 | 2 |
| 修改后 | 1951 | 1907 | 39 | 3 | 2 |

逐名比对 **新增失败为 0**。剩余失败/取消均在基线出现，性能差异造成的少量超时变化不能归功于 UI 修改。证据 `core-before.tap`、`core-after.tap`、`core-comparison.json` 保留完整名称；**全量核心套件没有全绿**。

最终 `tsc --noEmit` exit 0；完整 `npm run build` exit 0（含 UI TypeScript 和 desktop）；About 补漏后再次 `scripts/build-desktop.mjs` exit 0。证据 `typecheck.txt`、`build.txt`、`build-desktop-final.txt`。`git diff --check` 通过。没有新增 HTTP 监听服务、依赖或模型。

## 真实 Windows 范围验证

`Node24 scripts/verify-text-selection.mjs` 最终 **19 项范围检查通过**，报告状态为 `passed-scoped`，`allAcceptancePassed=false`。源文件/产物哈希、真实 runtime、检查与截图见 `windows-electron.json`。

- 真实通知、恢复对话框标题、双主题设置标签/导航和正文工具 UI 拖选/双击不可选。
- 真实只读保留草稿可键盘选取；零模型 ChatPanel 草稿可选、替换、撤销，发送禁用。
- 通过真实侧栏打开隔离章节；正文及分屏预览可鼠标选取，模式按钮和行号不可选。
- 真实 Monaco NativeEditContext 输入根为 text；**鼠标双击词选区**、键盘选区、编辑和撤销通过，最终真实章节保持原文。
- 经原 `app.about` 命令创建真实独立 data URL 沙箱窗口，h1 与三个 p 全部实际鼠标拖选/双击禁选通过。

截图：`windows-paper-ui.png`、`windows-ink-ui.png`、`windows-split-selection.png`、`windows-about.png`，均为隔离数据。

## 明确保留的限制

1. **Monaco 单次拖选诊断未通过**：CDP 和 Electron 输入事件下范围折叠；关闭新全局禁选规则的诊断也同样失败。该手势不记通过，保留 `windows-monaco-diagnostic.json` 及最终报告 `monacoDragDiagnostic`。现有证据不能归因于本次 CSS，也不能替代物理鼠标复核。通过的是实际双击/键盘选区与编辑撤销。
2. 全量核心的 39 失败、3 取消、2 跳过保留；没有将基线失败改成通过。
3. macOS、物理键盘/输入法、安装包未本轮执行。只验证当前 Windows 开发构建；不宣称全平台/安装版全部验收完成。
4. Renderer 网络观察和 offline 设置从 firstWindow 后开始；观察窗口内 HTTP 请求 0，不替代更早启动或 main/worker 网络审计。
5. 真实零模型 composer 的 canSend 仍为 true；false 输入边界由组件矩阵验证，不把零模型误称真实 false 状态。

实现产物和本次范围检查已经交付；完整仓库/跨平台验收仍未全绿。进入任务前的 creation-context 修改及原有台账状态均保留。
