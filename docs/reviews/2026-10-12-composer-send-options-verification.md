# AI 输入框发送方式入口移除：实施与验证

日期：2026-10-12（Asia/Shanghai）。范围：真实 Web React `ChatPanel` 的模式菜单及发送键默认、对应旧偏好清理。最新用户禁止全量测试，执行仅与目标相关的测试。

## 实施

- 模式菜单仅保留标准模式、计划模式及原选中状态；删除发送方式分组、两个预设及分隔线，清除专用回调、图标、预设 helper。
- 继续使用两平台既有 Enter / Shift+Enter 默认命令和共享 dispatcher；保留完整设置中已提交的自定义/多绑定，不在挂载时覆写。非桌面 fallback 固定默认键位，并补齐 keyCode 229 合成保护。
- store 仅取消 `enterToSend` 状态/操作/持久化，merge 单独忽略旧字段；沿用原存储名并保留模型强度与最后选择记忆。
- `composer-preset-review.test.ts` 只测试已取消菜单 callback，故由新的菜单/默认键/旧偏好验收替代。47 审核报告保留历史事实，本次结论以后者为准。

## TDD 与定向验证

Node 使用 Codex 捆绑 v24.19.0，符合项目 Node 24 要求。系统 Node 20 未用于验证。沙箱阻止子进程时使用审批执行专项命令；未把基础设施启动失败记为功能红灯。

| 阶段 | 实际结果 | 证据 |
| --- | --- | --- |
| TDD RED：两个专项文件 | 12 项，7 PASS / 5 FAIL，exit 1；菜单两模式、旧 false、keyCode229、旧字段恢复五项行为失败 | `docs/evidence/composer-send-options/red-target.tap` |
| TDD GREEN：相同两个专项文件 | 12/12 PASS，0 FAIL / SKIP，exit 0 | `docs/evidence/composer-send-options/green.tap` |
| 既有 dispatcher 相邻回归 | CMP47-04/05/06/17，4/4 PASS，0 FAIL / SKIP，exit 0 | `docs/evidence/composer-send-options/dispatcher-green.tap` |
| Next 生产构建（含 TypeScript） | exit 0，静态导出成功；单列构建，不计为测试用例 | `docs/evidence/composer-send-options/build-ui.txt` |
| Electron main/preload/service 编译 | exit 0；单列构建 | `docs/evidence/composer-send-options/build-desktop.txt` |

运行命令（`<node24>` 为上述捆绑执行文件）：

```text
<node24> --import tsx --test --test-reporter=tap tests/unit/composer-send-options.test.ts tests/unit/composer-shortcuts.test.ts
<node24> --import tsx --test --test-reporter=tap --test-name-pattern=CMP47-0[456]|CMP47-17 tests/unit/composer-command-review.test.ts
<node24> node_modules/next/dist/bin/next build
<node24> scripts/build-desktop.mjs
```

独立技术方案、测试设计和代码审核均通过，见 `2026-10-12-composer-send-options-review.md`。独立子代理复跑同一限定范围亦为 12/12 + 4/4；重复执行不另计用例数量。

## 真实 Windows Electron 验收

执行 `<node24> --import tsx scripts/smoke-composer-send-options.mjs`，exit 0；2026-10-12 13:50（Asia/Shanghai），6/6 检查组通过。证据 `docs/evidence/composer-send-options/windows-electron.json`，菜单截图 `standard-menu.png`、`plan-menu.png`、`restart-menu.png`。主代理已查看实际菜单截图，只有标准/计划模式两项与当前勾选，未见发送方式标签/选项。

- CSO-08：真实 Windows / `shakeink://app/` / 原 React workbench 菜单仅两项；两种模式均可切换。
- CSO-09a/b：Shift+Enter 在真实 contenteditable 插入换行且不发送；普通 Enter 触发实际“尚未配置模型”发送门控。
- CSO-10a/b：合成 isComposing / keyCode229 Enter 不发送；真实关窗重启后旧 false 偏好不生效，默认提示/键盘保持，两项模型记忆保持且旧字段已从后续写入中移除。
- 隔离目录通过真实 Workspaces 初始化；全程无配置模型，0 renderer HTTP 请求、0 main 监听服务、0 renderer error。测试结束清理本次 mkdtemp 目录。

完成本次目标：专项单元/回归 16/16、真实 Windows 检查组 6/6、独立审核与构建通过。未执行全量测试；构建与检查组不混算为单元用例。运行证据按源码 hash 绑定，不代表其它业务已验收。

## 证据能力边界

单元测试执行实际 JSX、keydown callback、Zustand persist；仅 UI wrappers / localStorage / 事件为隔离 fixture。完整界面验收由真实 Electron 补充。无模型门控仅证明发送尝试，合成 IME 仅证明标志保护。不覆盖供应商请求、物理输入法、安装包、macOS 或全量业务回归。
