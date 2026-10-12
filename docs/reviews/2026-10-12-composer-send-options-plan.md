# AI 输入框发送方式入口移除：技术方案

日期：2026-10-12（Asia/Shanghai）。依据本次用户要求，模式菜单不显示任何发送方式相关选项；默认 Enter 发送、Shift+Enter 换行。用户明确禁止全量测试，本次只做相关验证，此要求覆盖 AGENTS.md 的全量回归阶段。

## 源码依据与实现范围

- `src/components/layout/ChatPanel.tsx` 的真实 React composer 当前包含发送方式分组、两项预设、`saveSendPreset`，非桌面分支读 `enterToSend`；保留标准/计划模式两项及勾选状态，删除该分组与紧邻分隔线、回调和专用导入。非桌面 fallback 固定为 Enter 发送、Shift+Enter 原生换行；仍保护 IME 和引用候选选择。
- `desktop/shared/commands.json` 的 `ai.send` / `ai.newline` 两平台默认已经分别是 Enter / Shift+Enter；继续使用原共享捕获监听和已提交快捷键设置，不绕过统一分发、不重写用户在完整快捷键设置中显式配置的绑定。输入提示继续根据已提交快捷键显示，fallback 使用固定默认提示。
- `src/lib/desktop/composer-shortcuts.ts` 删除仅服务于菜单的预设切换/识别 helper，保留 `composerBindingHint`；对应旧预设测试改为默认绑定、提示、已配置绑定保持的验收。
- `src/stores/chat.ts` 删除无人再使用的 `enterToSend` 状态/操作及其持久化字段；持久化 merge 忽略旧 `enterToSend` 字段，保留原模型强度和最后选择记忆。旧 false 值不再反转 fallback。
- 更新实施台账 `docs/requirements-traceability.json`、`docs/migration-map.json`，记录限定范围与实际证据，不改变其它业务验收结论。新增测试/脚本仅处理 composer 本次目标。

## 验证顺序与限制

先由独立子代理审核技术方案，再写专项测试设计并独立审核；新增/调整相关测试并证明菜单/旧偏好验收在修改前失败，再实现并定向复测；独立子代理 code review；构建后运行真实 Windows Electron composer 专项验证，隔离测试数据，不调用模型或真实供应商。菜单、默认键盘、IME/引用优先级、保存与重启为相关场景。构建不计为测试通过，不运行 `npm test`、全量回归或无关业务测试。

真实 Electron 的发送尝试以无模型门控为可观察结果，不声称真实 AI 请求已成功。CDP 合成输入法事件只证明合成标志保护，物理输入法未执行应据实记录。安装包、macOS、全量业务不在本次验收范围。
