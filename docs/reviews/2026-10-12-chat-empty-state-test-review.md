# AI 对话首屏用例独立审核

日期：2026-10-12（Asia/Shanghai）。审核代理：production_audit。审核文件：`2026-10-12-chat-empty-state-test-cases.md`，SHA-256：`4a53b0dfe1c203d665c8d213adad127c59471462dd77a2ed8647ce8688e9ff0f`。

**结论：用例通过，无阻塞项。可编写新增测试并执行 RED。** 本结论只审核用例范围及判据，不声明测试已执行或正式功能已实现。

CES-01–11 覆盖方案的纯净空态守卫、三题材预选与原向导、延迟建书和关联清除、增量模板追加/引用/撤销、无模型门控与队列防丢、加载错误所有权、动画和暂停、主题/布局、原功能回归与真实 Windows 离线验收。用例明确隔离 browser fixture、实际本地 API、供应商生成和 macOS 的证据边界，符合 AGENTS.md 的分阶段审核与验收要求。

执行时采用以下可观察判据，避免通过夹具绕过真实契约：

- 浏览器直接导入完整 `ChatPanel` 和 `CreateNovelDialog`，使用真实 `useAgentChat`、store、composer helper、React Query、原过滤/拼贴及命令目标；只控制网络响应与合成测试资料。不得提取/重写本轮业务回调、导入原型 JS/HTML 或 stub 掉目标组件。
- 首次 session 恢复产生的 `queuePaused=true` 与空队列单独证明首屏可见；各业务阻断逐项设置且观察原提示/槽位，选择守卫按当前会话/作品归属验证。
- 确认向导后，观察 store 的新会话 ID/草稿/待创建位置与 null 作品关联，同时检查没有 POST 作品或聊天请求；取消、第一次覆盖确认和修改筛选均不能提前改变草稿。
- 无模型和已删除模型证明零 POST、draft/title/requestId/队首保持。有效所选模型允许原发送；夹具响应的 `defaultModelId` 或列表第一项不能替代显式选择。继承快照保持原 explicit 标记，请求体省略继承覆盖。
- 模板追加先保存 editor 与既有 chip 的节点引用，再点击完整卡片；检查节点未换、完整模板只追加一次、文本序列与 store 同步、原生 Ctrl+Z/Ctrl+Y 正确恢复。组合事件夹具只证明 React 组合状态保护，不能称为真实操作系统输入法验收。
- 模型与导航加载用受控延迟响应，检查旧 owner 晚失败/成功、取消、新草稿及重试；不以页面最后只剩一段文案替代状态与归属验证。
- browser 的 `window.desktop` 必须只提供真实测试所需的最小 bridge 方法，意外方法调用抛错并记录；不得通过任意空函数 Proxy 掩盖误调用。
- 未执行的 document hidden、操作系统输入法、macOS 和供应商状态继续独立标明，不能通过 synthetic Event 或 theme 切换冒充真实目标系统通过。

当前只读核对源文件包括 `ChatPanel.tsx`、`CreateNovelDialog.tsx`、`use-agent-chat.ts`、`composer-editor.ts`、`use-command-target.ts`、`command-runtime.ts`、`chat-defaults.ts`、`use-wizard-templates.ts` 与模型/导航/剪贴板现有测试。源码依据详见同日 `chat-empty-state-plan-review.md`。

下一步由本审核代理负责新增完整组件浏览器 fixture，仅修改 `tests/browser/chat-empty-state.test.ts` 和本审核代理记录；主代理负责纯函数单元、生产源码、全量运行与真实目标系统验收。
