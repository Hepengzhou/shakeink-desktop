# 原生菜单剪贴板补充方案及用例独立审核

日期：2026-10-13。范围：`2026-10-13-text-context-menu-native-clipboard-plan.md`、`2026-10-13-text-context-menu-native-clipboard-tests.md`，以及现有 adapter/controller、Electron bridge 与安装版 Monaco 0.56.0 调用路径。仅写本审核文档，未修改生产代码或测试，未运行真实作品、Key 或供应商。

## 一、方案审核

**初审结论：主要路径可行；下列 S1、S2 必须明确后才能进入补充 TDD。** 本结论不是 R8 已修复或真实 Windows 验收通过。

安装版本由 `node_modules/monaco-editor/package.json:3` 确认为 0.56.0。真实 helper `esm/vs/editor/browser/controller/editContext/clipboardUtils.js:6–9,17–53` 从当前 view model 生成原复制纯文和元数据；`viewModelImpl.js:770–813` 保留排序、Windows 范围 CRLF、空光标配置和多范围算法。采用这一算法，而不是当前 quote 的 `\n\n` 连接，符合原复制行为。纯文本 bridge 合同不承诺新增富 HTML 格式。

`codeEditorWidget.js:812–813,886–891` 的 `trigger('cut')` 直接进入真实 view model 的删除 handler，不再执行 ClipboardCutAction 的第二次复制。等待 bridge 成功再复核来源、选区 epoch、模型版本和只读状态，最后进入原 cut handler，能够处理 R8 的复制静默失败却删正文问题。当前 `src/lib/desktop/monaco-text-context.ts:32–33` 仍为原 Copy/CutAction，尚未落实本补充方案；此前独立自然 6.5 秒重现证据见 `2026-10-13-text-context-menu-code-review.md:112–141`。

统一菜单的 transaction guard 位于 `src/lib/desktop/text-context-menu.ts:61–72`；Monaco 的模型/选区/只读 epoch 和 fingerprint 位于 `monaco-text-context.ts:7–10,19,27`。新增异步写入必须在生成前及确认后的副作用前同时检查这些 guard。仅比较最终选区形状不能拒绝 A→B→A。不得修改默认键盘和原 Monaco 专属菜单，不得通过预授权所有 clipboard 权限、重新制造 transient activation 或伪造 DOM 输入来绕过问题。

### S1 / P1：预登记元数据的失败和并发恢复规则尚不完整

helper 不只是读取：`clipboardUtils.js:8,12–15` 先替换全局 `InMemoryClipboardMetadataManager.INSTANCE`，`:64–75` 的 singleton 只有一个 `_lastState`，粘贴时按纯文相等取得元数据。若原 OS clipboard 的纯文是 T、旧元数据表示整行或多光标，新复制仍为 T 但新元数据不同，然后 OS 写入失败，原 clipboard 未改变而下一次 paste 会误用新元数据。模型不变不足以保证原 paste 行为不变。

方案需要写明元数据事务：记录旧状态、本次预登记状态的身份，并在失败时仅当仍是本次状态才恢复；或者明确受控的确认后登记方案。恢复不能清除或覆盖其后成功复制 B 的状态。只说“不得覆盖另一成功复制”没有定义同文不同元数据、旧状态为空、helper/容量验证失败和并发失败的处理。内部 singleton 的读取/恢复也须窄类型、版本限定和缺失时 fail closed；不能使用有失配清空副作用的 `get(arbitraryText)` 猜测旧状态。

任何写入拒绝都必须禁止 cut 删除。但“IPC 返回失败”不普遍等价于“OS clipboard 完全未变”：`desktop/main/index.ts:454–458` 已执行同步 `clipboard.writeText` 后才返回 IPC ack，写后窗口关闭或 ack 丢失存在结果未知的边界。仅写前拒绝的测试可断言旧 OS clipboard 保持；写后确认丢失应断言无正文删除、无主动回滚覆盖系统 clipboard，并明确 OS 结果不能保证回滚。

### S2 / P2：bridge 与业务 gate 的实际保护边界需纠正

`desktop/main/index.ts:454–458` 的 clipboard-write 检查 trusted 来源/frame、窗口焦点和 1 MiB 文本容量，**没有** `businessGate` 或 `closingFlow` 判断。原生文本菜单打开/返回才在 `:471–474` 检查关闭/业务 gate；renderer transaction 则检查其上下文与来源。当前方案称 clipboard bridge 已受业务 gate 保护，超出了源码。

应准确区分这两个边界，说明本次公共菜单的局部 transaction 授权如何失效。若需要增加局部 gate，须相应补用例并独立审核；不因本修复擅自改变恢复等流程已有的通用 clipboard 权限。

## 二、测试用例审核

**初审结论：NC-01 至 NC-06 覆盖主问题；必须补齐以下断言后才能进入补充 TDD。** 测试文档尚不是已执行结果。

自然 timer 的设计正确：最后一次 evaluate 仅安排定时器，在 6.5 秒回调内确认激活为 false、编辑器焦点与原 capture 仍有效，再选择原 pending menu，效果完成后才读取结果。即时 `page.evaluate(choose)` 会重新产生 userGesture，现有 `tests/browser/monaco-text-context.test.ts:57,78–80` 的预授权及即时选择不能代表 R8。新 fixture 的 bridge 允许模拟授权原生 IPC，但应保持没有全局预授 clipboard permissions，并单独标记这一模拟写入边界。

| 用例 | 必须保持或补充的可验断言 |
| --- | --- |
| NC-01/02 | 记录自然延迟执行点的 activation=false、focus/current=true；真实 clipboard 精确值、bridge 次数与写入完成先于删除；cut 走原 handler，真实 undo/redo 及非选区保持。 |
| NC-03 | 明确“写前拒绝”与“OS 已写但 ack 丢失”两种失败；二者均不进入 cut 删除。添加同纯文但旧/新元数据不同的恢复用例、旧状态为空、失败 A 不覆盖后续成功 B 的用例，并观察真实 paste 结果与 undo。 |
| NC-03 防御分支 | `_getViewModel` 缺失、helper 异常、bridge 未就绪、生成纯文为空、超过 1 MiB，均无删除；未发起合法写入的分支不调用 bridge，并检查预登记元数据没有残留错误。 |
| NC-04 | 每种 selection/model/readonly ABA、取消、上下文变化分别等待 late ack 并验证无删除；还应覆盖 editor dispose/模型替换，不能用同一最终 fingerprint 恢复授权。OS 已写的迟到 ack 不意味着应自动回滚 OS clipboard。 |
| NC-05 | 逐项比较原 Monaco 单/多范围、Unicode、跨行 EOL、混合空/非空光标的精确 clipboard 纯文及元数据 paste 行为；不能用换行归一化掩盖 Windows EOL 差异。纯空选区仍按已批准公共菜单能力禁用 copy/cut（当前 adapter `:23`），配置不应被解释为本次新增整行菜单复制。 |
| NC-06 | 实际 Windows popup 停留超过 5 秒后选择 copy/cut，验证 OS clipboard 与原模型/撤销；同时保留非文本原 Monaco 菜单与默认键盘。没有执行、或证据只覆盖浏览器，不标为 Windows 原生通过。 |

顺序必须保留：补充方案及用例复核 → 自然延迟失败 red → 实现 → 新旧回归 → Windows 原生验收 → 独立代码复核 → 构建/离线包验收。自然延迟测试通过只能解除相应代码行为问题，不能代替真实安装包；此前包的 `windows-package-monaco-copy-red.json` 只能证明该次 menu-editor-copy 验收失败，不能单独证明其全部因果链。

## 三、本次审核证据及限制

只读核对上述文件及安装依赖调用路径；没有重复运行已确认的自然延迟重现，也没有运行未实现的 NC 用例。源码仍保留原 Monaco Copy/CutAction 路线。本次初审不能声称生产已完成、R8 已解除或全部测试通过；待主代理补充 S1/S2 与用例后可在本文追加复核结论。
