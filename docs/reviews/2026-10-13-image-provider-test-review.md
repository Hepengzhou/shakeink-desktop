# 文生图供应商列表：独立测试用例审核

日期：2026-10-13（Asia/Shanghai）。审核范围为本轮测试用例文档、专项 unit/browser 用例、onboarding-editors 新增部分、model-settings 的 IP-06、Windows 验证脚本。结论：**暂不通过，需修复以下 3 项后复审**。没有修改产品源码或用例，没有执行全量测试。

## 阻断项

1. **IP-05 的旧 IMAGE 取消未落实。** `docs/reviews/2026-10-13-image-provider-test-cases.md` 明确要求取消不提交；`tests/unit/onboarding-editors.test.ts` 新增旧 google/custom 循环直接保存；`tests/browser/image-provider-menu.test.ts:64` 起旧记录场景仅以 onboarding Continue 提交后再切换。现有 `tests/unit/model-settings.test.ts` 的“keys are never refilled and scope edits remain uncommitted drafts”使用普通 TEXT sample，不能证明本轮 filtered-out 旧 IMAGE 当前值取消。请补旧 Google/custom 的设置编辑取消场景：输入或切换产生草稿后取消，捕获真实 settings 调用为 0，并断言原 bootstrap 记录未变；同时断言浏览器手动保存保留 id/endpoint，不只保留 provider/modelId。此补充可使用公开合成 fixture，不使用真实 Key。
2. **缺少技术方案承诺的旧配置真实 Windows 验证。** `2026-10-13-image-provider-plan.md` 规定 Windows 专项覆盖旧配置编辑；`scripts/verify-image-providers.mjs` 当前仅构造 defaultState，始终检查 models.length===0。旧记录测试目前全部是 controlled IPC/hook fixture，不能据此宣称真实落盘兼容已验证。请在隔离目录加入合成旧 Google/custom 配置专项，通过实际设置弹窗验证菜单两家、取消不落盘、原供应商留空 Key 保存仍保留配置/授权字段，并核对重开或落盘状态；不得写入真实用户数据或调用供应商。也需把用例文档 IP-07 由“始终无模型”改为分别记录空目录菜单与合成旧记录场景。
3. **Windows 启动网络/错误观测范围不完整。** `scripts/verify-image-providers.mjs` 在 `_electron.launch`、`app.firstWindow` 完成后才注册 pageerror/request listener 并调用 setOffline，首轮导航早期事件可能已经发生。当前 rendererHttpRequests===0 仅证明之后观察到 0，无法支持未限定的启动全程断言。请离线后 reload 并等待真正 UI 重载，再在持续监听期间完成菜单检查，报告明确该离线重载及观测范围；或在首导航前安装真实 session/CDP 监测。启动前未观测部分须如实保留，不能将其算通过。

## 已具备的有效覆盖

- IP-01/02 直接执行共享 `presetsFor`，完整数组、显示名称、方舟端点/协议和 sources 隔离副本断言可产生明确行为红灯。更新旧 ONB 菜单数量预期符合最新用户要求。
- IP-03 使用真实 ProviderLogo 输出，覆盖 bytedance、volcengine、大写别名、本地 provider 资产、替代文字及独立模型家族资产；SVG 无 script/image/url 外部依赖断言适合离线产品。资产文件不存在的 ENOENT 不能单独算行为红灯，应由名称/列表/真实 src 行为断言证明旧实现不符合要求。
- IP-04 使用真实 React/Base UI 控件、浏览器鼠标与键盘，严格比较菜单两项、搜索旧供应商空结果、切换清空草稿；此结果应标作 browser fixture，文档已区分其与原生验收。
- IP-06 覆盖 matching fallback、不匹配 fallback、菜单值优先、items 不加入旧值和 multiple=false；已有通用搜索/disabled 用例保留。浏览器旧记录打开实际 Base UI 的 exactMenu 有必要，可防止控件把旧值重新加入 items。
- Windows 脚本确实要求 process.platform===win32、真实 `_electron.launch`、编译产物及源文件指纹、两主题、shakeink:// 页面、图片自然尺寸、真实本地主进程无 HTTP listener，以及受保护的隔离目录清理；scope 说明也明确未覆盖 macOS、安装包、供应商调用。

## 非阻断注意事项及检查

新 `PROVIDER_PRESETS` 导入若用于 selectedOption/连接结果查名称，`tests/unit/onboarding-editors.test.ts` 当前 require stub 只返回 `{ presetsFor }`，应在实现时同步 stub 为完整真实目录，避免制造 TypeError 假红灯。本次 `node --check scripts/verify-image-providers.mjs` 返回 0。固定版本 SVG 的当前测试只证明 asset 与清单写入的 sha256 一致；“来自固定版本包”仍须由实际 tarball完整性、提取文件原始指纹或读取原包比对的实施证据支持。

主代理补充：专项初次启动因沙箱子进程 EPERM 被阻止，将其另存基础设施失败而非行为红灯。该处理正确。待复审通过后，在未改生产源码前执行相同专项的有效行为红灯，修复后使用同一断言证明绿灯。以上审核不宣称任何未执行用例或目标系统已通过。

## 补齐后的复审（2026-10-13）

**最新结论：测试用例审核通过，原 3 项阻断已解除。** 上述“暂不通过”为首轮历史结论；本次仅确认用例与验证脚本设计可进入有效 TDD 红灯阶段，不代表用例已执行通过。

1. 旧 IMAGE 取消覆盖已补齐。`tests/unit/onboarding-editors.test.ts` 对 Google/custom 新增输入公开 fixture、切换 OpenAI 后取消，断言 close=1、saves=0、原 models 未变。`tests/browser/image-provider-menu.test.ts` 新增真实 React 设置编辑取消场景，对两种旧记录核对 closed、原状态，并重新挂载原模型查看当前名称。原保存用例仍保留；id/endpoint 由 unit 原字段断言及新增真实 Windows 完整落盘比较补证。
2. `scripts/verify-image-providers.mjs` 的 `legacyEdit(root)` 使用实际 Electron safeStorage 加密明确公开的合成凭据，关闭应用后仅写入指定隔离 root 下的 state.json；无真实 Key、无供应商调用。随后真实 UI 分别打开 Google/custom：菜单严格两家、切换 OpenAI 后取消、排序按 id 比较原完整模型；重开原供应商空 Key 保存后将落盘完整记录与 fixture 比较，包含 encryptedKey/authRevision；再次关闭重开核对模型数及当前名称。记录顺序变化用 id 排序处理，避免将正常保存重排当作数据丢失。`src/lib/desktop/onboarding-flow.ts` 的 onboardingStartup 确认 completed 且仅 IMAGE 的目录会出现模型引导 entry，脚本的“暂不配置”入口与真实逻辑一致。
3. `launch(root)` 已持续注册错误和请求监测、设置离线并 reload，再执行 UI 验证。report.scope 和 IP-07 文档明确观测自 firstWindow 后开始，覆盖离线 reload，未声称完整进程启动网络审计；主进程监听只声明实际快照。这与可取得证据一致。

重新执行 `node --check scripts/verify-image-providers.mjs` 返回 0。生产源码在复审读取时仍为原 bytedance 名称及原多家 IMAGE 列表，尚可执行有效行为红灯。首次 EPERM 仍仅算基础设施失败。完整目录 require stub 和新 SVG 包来源证据应在实现阶段落实；无新增测试阶段阻断。最终须执行实际专项、全量当前用例和真实 Windows 脚本，失败时据实处理，不能用本复审替代运行结果。

## 测试运行工具修正复审（2026-10-13）

最新结论仍为**测试用例设计通过**。本轮 fixture/定位/导航修正没有改变验收行为或降低断言强度：

- `tests/browser/image-provider-menu.test.ts` 使用自有 `globalThis.closeCount` 替代浏览器内置 Window.closed，正确消除保留属性冲突；取消后计数仍要求为 1。
- 供应商与可用模型触发器改为 getByLabel 是正确定位。`src/components/desktop/ModelChoiceSelect.tsx` 明确 aria-label；本地 `node_modules/@base-ui/react/combobox/trigger/ComboboxTrigger.js` 对 popup 内输入的触发器赋 role=combobox，而非 button。新的 `browser-red.tap` 的 IP-04 call log 确已找到真实控件并收到“阿里巴巴”而预期“火山引擎”，这是有效行为红灯。
- `scripts/verify-image-providers.mjs` 先 waitForURL，再等待首次真实 IMAGE 弹窗可见，之后执行离线 reload 并再次等弹窗，消除了在首次导航完成前 reload 的竞争。没有据此标记任何未完成 Windows 检查通过；`node --check` 再次返回 0。
- `docs/evidence/image-providers/unit-red.tap` 的 IP-01 显示原九家及字节名称；IP-02 显示“字节跳动”而非“火山引擎”；IP-03 输出原 bytedance.svg。上述断言是有效红灯；新 SVG 不存在的 ENOENT 单独记录，不能拿文件缺失替代行为证明。基础设施 EPERM、旧 Window.closed 错误、旧定位超时、未完成 Windows 导航均应保留真实类型，不算有效产品红灯。

新增运行限制：读取中的 browser-red.tap 的旧 Google IP-05 点击被 `data-base-ui-inert` 层拦截。此测试 fixture 尚未加载产品样式，真实 `src/components/ui/dialog.tsx` 依赖 fixed/z-50 布局；现有 `tests/browser/review-model-selection.test.ts` 同样为真实 Dialog 注入过所需布局样式。需在运行绿灯前为本轮 browser fixture 加载对应布局 CSS 或真实 stylesheet，并继续正常鼠标 click；不得用 force 绕过真实遮挡后宣称交互通过。此问题仅影响浏览器执行完备性，已获得的 IP-04/unit 行为红灯仍有效。生产源码在读取时尚未改；本复审不声明全量、原生或旧配置用例已通过。
