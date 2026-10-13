# AI 对话输入框最大高度翻倍：实施与验证

日期：2026-10-13（Asia/Shanghai）。本轮只改原真实 React composer 两处正常上限（140→280px）及空态小窗口 CSS 上限（96→192px），同步注释。自然高度、48/52px 最小高度、超限内部滚动和已有草稿/键盘/引用处理保留。

方案、用例和代码已独立子代理审核通过，见同日期 `composer-height-plan-review.md`、`composer-height-test-review.md`、`composer-height-code-review.md`。原仓库其它任务的模型容量修改及台账内容保留。

## TDD、构建与实际 Windows

- 修复前构建原 UI，实际 Windows Electron 红灯：正常空态 inlineHeight/computed maxHeight/矩形高度均为140px，scrollHeight=880、clientHeight=140；测试要求280px而失败。有效行为红灯证据为 `docs/evidence/composer-height/red/windows-electron.json` 和 `red/failure.png`，非基础设施错误。
- 修复后 Next生产静态构建及其TypeScript检查通过，Electron main/preload/service编译通过。Node为捆绑v24.19.0，Electron实际运行Node v24.21.0。沙箱首次构建子进程被EPERM阻止后，同命令审批执行成功；不把启动限制计作行为红灯。命令结果分别在 `docs/evidence/composer-height-red-build.txt`、`composer-height-green-build.txt`、`composer-height-build-desktop.txt`。
- 最终 Windows专项 `green/windows-electron.json`：15检查组通过，覆盖paper/ink两主题各CH-01…07及共同CH-08环境守卫。实际原React、原SidebarTree和隔离Workspaces inbox真实数据库/消息；无模拟接口或用户数据。
- 正常空态和消息会话输入区均实测280px；视口innerHeight=650px的空态为192px、消息会话仍280px。7行自然增高为167px，短文和清空收回至空态48px/会话52px；长文scrollHeight=880继续使用框内滚动。真实wheel使scrollTop增加且框体高度不变；模式菜单可点击、发送按钮和模式按钮完整位于视口中。Shift+Enter插入第二行，没有触发零模型门控。
- 截图保存双主题正常空态、小窗口空态、消息会话共6张，主代理已查看 `green/ink-conversation-280.png`、`green/paper-welcome-192.png`，输入框与底部工具栏位置正常。截图仅为非敏感隔离测试文本，不进入产品示例。

专项脚本两次前置修正：fill会把长文光标滚到底，code review要求在wheel验收前先scrollTop=0；旧红灯尚未进入该分支，不改变其有效性。首次green已通过12组后，ink小窗口消息态Escape因焦点时序未关闭菜单而失败，保留 `green-attempt-1.json/png`。改为实际点击“标准模式”menuitem关闭，并补审通过；输入高度断言不变，完整重跑15组通过。

运行命令（`<node24>`为Codex捆绑Node路径）：

```text
<node24> node_modules/next/dist/bin/next build
<node24> scripts/build-desktop.mjs
<node24> --import tsx scripts/verify-composer-height.mjs red
<node24> --import tsx scripts/verify-composer-height.mjs green
XAANINK_REGRESSION_CONCURRENCY=1 XAANINK_REGRESSION_FORCE_EXIT=1 <node24> scripts/check-chat-empty-regression.mjs core composer-height
<node24> scripts/check-browser-file-regression.mjs composer-height
```

## 全量回归

启动时全部组件browser回归清单：41/41文件、425/425用例通过，0失败/取消/跳过，完整结束。原38文件全部覆盖，新增3个文字选择文件增加65例（425=360+65）；未改原测试断言。最终报告为 `docs/evidence/chat-empty-state/browser-full-files-composer-height.json`，逐文件JSON/TAP在 `browser-files-composer-height`。测试启动首先被sandbox spawn EPERM阻止，随后缺少默认Playwright Chromium导致完整初次运行5通过/420基础设施失败；该初次报告保存在 `browser-files-composer-height/attempt-1-no-chromium`。使用原测试支持的 `XAANINK_TEST_CHROMIUM` 指向本机已安装Chrome154.0.8037.98后，同一41文件完整重跑全通过；不把初次环境问题算作产品失败或通过。

核心unit/integration清单完整结束（exit1）：1953项中1908通过、41失败、2取消、2跳过，耗时1090179ms。证据 `docs/evidence/chat-empty-state/core-full-composer-height.json/.tap`，没有将失败/取消/跳过计为通过。

将43个失败/取消标题与此前 `chat-empty-state/core-full-final.tap` 和 `creation-context/full-core-output.txt` 比较：40个已出现过，3个不同于历史标题的是IP-06、ONB editor供应商列表、IP-01/IP-05。这三个用例位于本轮运行期间变更的 `tests/unit/model-settings.test.ts` 与 `tests/unit/onboarding-editors.test.ts`，调用共享model-catalog及真实ModelConfigurationDialog的IMAGE供应商/旧配置处理，对应同期另一项 `2026-10-13-image-provider-plan.md`；本轮高度改动未编辑这些源/测试文件。比较仅证明同名既有记录，不宣称所有失败根因相同。比较结果为 `docs/evidence/composer-height/core-baseline-comparison.json`。其余未通过项目涉及迁移恢复超时、冷源读取夹具、Windows路径、配置快照、抽取组件依赖及平台验包等；不在本轮高度范围擅自修复。

回归入口在启动时枚举文件；运行期间另一个任务新增 `tests/unit/image-provider-menu.test.ts` 与 `tests/browser/image-provider-menu.test.ts`，不在本轮入口清单内，不标通过，也不将425项通过扩大为变化后的工作区全部用例通过。本轮完成高度实现、独立审核、构建和实际Windows专项验证；仓库整体验收仍非全绿，既有及同期其它业务失败保持真实状态。

## 验证边界

专项为实际Windows开发Electron、生产静态React界面、Playwright/CDP输入；不代表物理IME、macOS或安装包验收。renderer监听从firstWindow后开始，其观察范围内HTTP请求=0、renderer errors=0；main listening servers为各主题就绪时快照=0。所有测试模型为空，未调用供应商；Shift+Enter验证不覆盖有模型发送流程。证据绑定源码和静态编译资源hash；隔离临时目录已验证身份后清理。全量受控组件测试单列，不能代替真实系统专项或其它整组业务验收。
