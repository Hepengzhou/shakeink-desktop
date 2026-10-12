# AI 输入框发送方式入口移除：独立审核

日期：2026-10-12（Asia/Shanghai）。本文件仅记录实际执行的独立审核；测试与运行验证结果由对应阶段追加。

## 技术方案审核

结论：通过，无阻塞问题。审核对象为 `2026-10-12-composer-send-options-plan.md`，并定向核对真实 composer、聊天持久化、快捷键提示 helper、共享命令捕获、命令目录及既有 composer 测试。此阶段未修改实现/测试，未运行测试。

- 范围符合用户要求。`src/components/layout/ChatPanel.tsx:2122` 的模式菜单包含标准/计划模式及独立发送方式分组；删除后者及相邻分隔线，继续复用真实 React composer，能直接实现图片标注目标。标准/计划模式及其勾选必须保留。
- 默认语义与完整快捷键设置可以并存。`desktop/shared/commands.json:1004` / `:1014` 两平台默认分别是 Enter / Shift+Enter，命令未锁定；`src/components/desktop/DesktopCommandController.tsx:63` 起按已提交平台设置分发，composer 的 React handler 在桌面环境直接返回（`ChatPanel.tsx:1971`）。用户要求的是默认键位，并未撤销已有完整快捷键设置；保留用户显式绑定及多绑定、保持提示与已提交绑定一致，符合现有批准约束。不要在挂载/升级时重写桌面快捷键覆盖值。
- 旧 preference 清理不应改变模型记忆。`src/stores/chat.ts:198` 使用同一个 `chat-model-effort-memory` 存储名保存 `modelEffortMemory`、`lastModelChoice` 与 `enterToSend`。方案明确只删除旧偏好字段并在 merge 排除它，保留前两项及存储名；不得删除整个存储项。仅删除 partialize 字段而沿用默认浅 merge 仍会将旧字段灌入运行状态，实施时必须落实方案所述显式 merge，并用旧 false + 两项模型记忆的 rehydrate/再次持久化测试证明。
- fallback 的 Shift+Enter 原生换行、引用选择优先级应保持；IME 验证须覆盖 `isComposing` 和 `keyCode === 229` 两种保护。现有桌面捕获已包含两者（`DesktopCommandController.tsx:51`），fallback 当前仅检查 `isComposing`（`ChatPanel.tsx:2006`），此次调整可在既有 handler 内补齐保护。
- 既有 `composer-preset-review.test.ts` 专测即将删除的菜单回调，需替换为新菜单/旧偏好验收；`composer-shortcuts.test.ts` 保留提示与引用上下文测试，并补充两平台默认及已配置绑定保持。原预设实现的成功/失败测试不再是本次功能要求。
- 验证范围正确：仅当前目标相关定向测试与真实 Windows Electron composer 验证；不运行全量测试。构建、无模型门控及合成 IME 证据的能力边界必须按方案据实记录。

实施建议均为方案的具体落地检查项，不构成额外范围或用户批准门。

## 测试设计审核

结论：通过，无阻塞问题。独立审核 `2026-10-12-composer-send-options-tests.md` 的 CSO-01…10，并核对当前 `ChatPanel` handler、store persist 配置、命令默认与既有 `composer-command-review` / `composer-preset-review` 的适用范围。此阶段未修改实现/测试，未运行测试。

- 菜单两种模式分别检查渲染、选中与切换，既能证明删除发送方式入口，也能防止误删标准/计划模式；删除标签、选项与尾分隔线均在预期中。
- fallback 执行真实回调而非复制逻辑，覆盖普通 Enter 恰好一次发送、Shift+Enter 放行原生换行、旧 false 偏好不再反转、两种 IME 标志、引用选择/关闭优先级及桌面避免双重分发，覆盖本次行为和相关保护。
- CSO-05 用真实 Zustand rehydrate 和后续实际持久化读回，覆盖同一旧存储项中的模型强度与最后选择记忆，足以验证迁移不会通过清空存储误删记忆。实施时应分别断言运行状态不含 `enterToSend`、新写入 JSON 不含该字段，以及两项模型记忆深相等；全局 localStorage/模块状态需在用例后恢复，避免污染其它用例。
- 两平台默认和自定义/多绑定/空绑定提示检查是本次“默认”与已批准完整快捷键设置的相邻契约；保留现有 Controller 的 Enter、IME、引用及自定义发送用例，使用明确 name pattern 排除历史/停止生成等无关测试，符合用户禁止全量测试的要求。
- 真实 Windows Electron CSO-08…10补充完整菜单、contenteditable 真实换行、发送尝试及关闭重开。无模型门控仅证明进入发送路径，合成 IME 仅证明标志保护；测试设计已明确不将它们记为供应商请求或物理输入法通过。
- TDD 红灯范围与预期失败原因明确，旧预设专用测试由入口移除验收替代具有合理性。正式记录应使用实际运行数量及退出码，避免把 `--test-name-pattern` 跳过用例计作通过；构建仅列作构建验证。

以上为可执行用例与证据记录的落实建议，无新增验收范围。

## 代码审核

首次结论：产品实现及专项单元测试通过；真实 Electron 验收脚本有一项启动前置阻塞，修复复核后才可执行最终验收。审核范围为本次 `ChatPanel.tsx`、`chat.ts`、`composer-shortcuts.ts`、新增/修改的 composer 专项测试、删除的旧 preset 测试及 `smoke-composer-send-options.mjs`，未修改实现或测试。

- 真实 React `ChatPanel` 内仅删除发送方式菜单分组、相关状态/回调及导入，标准/计划模式、原 composer 与命令注册均保留；没有以预览稿或复制示例工作台替换真实组件。
- 默认行为由现有命令目录和固定 fallback 共同提供；桌面 handler 继续交给共享捕获，提示读取已提交设置，未增加覆盖已有自定义/多绑定的写入。fallback 先保护 `isComposing` / `keyCode === 229`，随后处理引用导航/选择/关闭，再处理 Enter 发送；Shift+Enter 原生换行继续放行。
- persist 存储名未变，partialize 保留模型强度和最后选择两项记忆；显式 merge 仅剔除 `enterToSend`，其余既有 merge 语义保持。真实 rehydrate/再写用例深比较两项记忆且恢复隔离 localStorage，能证明退役旧字段没有清空模型记忆。
- 单元测试执行真实 JSX/handler 和真实 Zustand，不以源码关键词检查代替行为；旧 preset 测试删除对应已取消入口，菜单两项/无尾分隔线验收及提示/多绑定覆盖取代其现役功能要求。红灯证据 `red-target.tap` 为 12 项中 5 项目标失败，绿灯为 12/12。
- 独立复跑：Node 24 `--import tsx --test tests/unit/composer-send-options.test.ts tests/unit/composer-shortcuts.test.ts` 为 12/12，退出 0；`--test-name-pattern=CMP47-(04|05|06|17): tests/unit/composer-command-review.test.ts` 为 4/4，退出 0。首次沙箱调用被 Node `spawn EPERM` 阻止，允许子进程后同命令通过；未运行全量测试。`node --check` 验收脚本和定向 `git diff --check` 亦退出 0。
- 验收脚本隔离 root 及 bootstrap 均位于 `mkdtemp` 目录内，使用无模型合成测试状态；清理前检查 `dirname(resolve(temporary)) === resolve(tmpdir())` 和固定前缀，递归删除范围正确；实际 close/reopen 后检查旧 false 偏好无效及两项模型记忆保持。
- **阻塞项（验收脚本）：** 首次启动前只向空 root 写 `state.json` 会使其变为无 application marker 的非空目录。`desktop/main/brand-startup-paths.ts:31` 对非空 isolatedRoot 调用 `readApplicationBrandImmediately`，而 `desktop/core/brand-names.ts:44` 要求恰有一个 marker；此路径会报 `BRAND_MARKER_MISSING`，无法进入 composer。应先通过真实 `Workspaces.initialize()` 等现有初始化接口建立 root/marker，再写状态并释放连接；不得伪造 root 已就绪成功。该问题仅影响新验收脚本，产品变更未发现阻塞问题。

修复复核结论：**代码审核通过，无未解决阻塞项。** 主代理已在验收脚本主 try/finally 内先创建真实 `Workspaces`，执行 `initialize()` 并于嵌套 finally `close()`，之后才写入隔离状态。定向核对 `desktop/service/workspaces.ts:94` 的真实初始化会为安全空目录创建 application marker、空 catalog 与 inbox，并验证它们；脚本无需手写成功标记。初始化失败也进入失败记录和临时目录清理。修复后 `node --check scripts/smoke-composer-send-options.mjs` 退出 0；产品代码及 16 项已复跑专项测试未变。本段仅批准进入真实 Windows 专项验收，不宣称尚未执行的 Electron 用例已通过。
