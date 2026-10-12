# AI 输入框发送方式入口移除：专项测试设计

仅当前目标相关测试，禁止 `npm test` 和全量业务回归。

| ID | 层次 | 输入/前置 | 预期 |
| --- | --- | --- | --- |
| CSO-01/02 | 实际 ChatPanel JSX 片段 | standard / plan 各渲染一次 | 只有标准/计划模式两项；没有发送方式标签/预设项/尾分隔线；两项仍可切换且当前项勾选 |
| CSO-03 | 实际 React keydown callback | 无桌面 bootstrap，传入旧偏好 false，普通 Enter / Shift+Enter | Enter 恰好调用一次 handleSend 并阻止默认；Shift+Enter 不发送且允许原生换行 |
| CSO-04 | 同一 callback | IME isComposing / keyCode=229 Enter；有引用候选的 Enter / Escape；有桌面 bootstrap | 两种合成标志均不发送；引用 Enter 仅选中，Escape 仅关闭；桌面回调不重复分发 |
| CSO-05 | 实际 store 持久化 | 内存 localStorage 中旧 enterToSend=false，与已有模型强度/最后选择记忆同时 rehydrate，随后更新草稿再写 | 旧字段忽略；记忆保留；再写不再包含已取消偏好 |
| CSO-06 | 实际命令表与提示 helper | darwin/win32 无覆盖；已有额外/自定义/空发送绑定 | 两平台默认 Enter / Shift+Enter；提示符合已提交绑定；不修改 overrides |
| CSO-07 | 已有 Controller fixture | composer-command-review.test.ts 相关 Enter、多绑定、IME、引用优先级 | 统一分发/取消旧绑定/引用上下文保持；不复跑 unrelated history / stop 测试 |
| CSO-08 | 真实 Windows Electron | 隔离目录，完成引导状态、无模型，无快捷键覆盖 | 菜单恰为两项，可切换两种模式；截图实际产品菜单 |
| CSO-09 | 同一真实 Electron | 输入两行，Shift+Enter；普通 Enter | Shift+Enter 插入换行而不触发模型门控；Enter 触发真实无模型门控，证明发送尝试；不声称供应商请求成功 |
| CSO-10 | 同一真实 Electron | 旧 localStorage=false，重启；合成标志 Enter | 重启仍为默认提示/键盘，菜单无发送方式；合成标志 Enter 不触发门控。物理 IME 不计为执行 |

JSX/callback 提取执行使用 TypeScript AST 与真实源代码；受控 UI wrappers/事件不是完整界面验收，完整菜单与 contenteditable 由真实 Electron 补充。store 验证通过真实 Zustand persist rehydrate / 再写，只隔离 localStorage，不用源码子串作为模型记忆保持的唯一证据。

TDD：新增 CSO-01…05 应在旧实现上因目标行为失败；CSO-06 证明已有默认正确。红灯仅运行这些目标用例；实现后运行上述相关文件/明确 name pattern。移除仅为旧菜单提供的 `composer-preset-review.test.ts`，其 CMP47-11…13 由本方案中“入口移除、不发生 preset 写入”验收取代；历史 47 报告保持历史状态。

生产构建（Next 自带类型检查）及 desktop 打包编译用于加载当前源码；不执行安装包/跨平台验收。独立审核后才写可执行测试，独立 code review 后才最终验收。台账写入真实执行数量、命令与限制。
