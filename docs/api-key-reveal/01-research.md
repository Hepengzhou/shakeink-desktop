# API Key 回填与明文/密文切换调研

日期：2026-10-15。范围：配置模型对话框的 API Key 字段——回填已保存密钥、睁眼/闭眼切换明文/密文、两种形态下的复制能力与右键菜单。

## 1. 需求理解

- 编辑已保存模型时，API Key 输入框不应为空：打开即显示已保存的真实 Key，默认以密文（`type="password"` 掩码）呈现。
- 输入框右侧有眼睛图标按钮：密文形态显示闭眼图标，点击后切换为明文形态并变为睁眼图标，再点还原。
- 明文形态下文本可复制；密文形态下文本不可复制；右键菜单的【复制】在两种形态下分别可点击/不可点击。

当前界面（用户截图）：编辑已配置模型时 API Key 输入框为空，占位文案为"已配置，留空保留原密钥"。

## 2. 现状事实（含源文件）

### 2.1 密钥存储与渲染进程隔离

- 密钥只存于主进程：`ModelRepository.prepareModel` 用 Electron safeStorage 加密后落盘为 `encryptedKey`，公开状态固定输出 `keyMask: "••••••••"`（`desktop/main/model-repository.ts:79-81`、`desktop/core/settings.ts:51-52`）。渲染进程拿到的 `PublicModel` 不含 `encryptedKey`。
- 现有解密入口 `ModelRepository.keyFor(id, revision)` 仅供主进程内部授权使用（`desktop/main/model-repository.ts:60-67`），且要求模型 `enabled` 且 `authRevision` 匹配；没有任何 IPC 把明文 Key 送回渲染进程。
- 结论：回填真实 Key 必须新增一条受限 IPC，由主进程解密后返回。这是本功能的核心新增面。

### 2.2 配置模型对话框

- `src/components/desktop/ModelConfigurationDialog.tsx:31`：编辑已保存模型时 `apiKey` 初始化为 `""`，靠占位符"已配置，留空保留原密钥"提示。
- `ModelConfigurationDialog.tsx:193`：输入框恒为 `type="password"`，带 `data-desktop-clipboard="api-key"` 标记。
- 保存语义：空 Key + 范围未变 → 主进程保留原 `encryptedKey` 且不提升 `authRevision`；非空 Key → 重新加密并提升 `authRevision`（`desktop/main/model-repository.ts:74-81`）。回填后若按原样保存真实 Key，会无谓地吊销授权版本；因此提交时需把"未修改的回填 Key"映射回空串，保持原有保留语义。
- 测试/发现（`desktop/main/model-configuration.ts:194-206` `prepareAuthorization`）：草稿 `apiKey` 为空且带 `id` 时回退到已存凭据（gateway 租约 + `keyFor`），非空则直接使用草稿 Key。两条路径都成熟，回填后无须改动主流程。
- 对话框在设置面板以 `key={editing.model?.id}` 重挂载（`src/components/desktop/ModelSettings.tsx:40`），也在引导流程复用（同一组件 `onboarding` 分支）。

### 2.3 复制/剪切/右键菜单链路

- 键盘快捷键：`installInputCommands.enabled`（`src/lib/desktop/input-commands.ts:123`）禁止密码框 copy/cut，**但对带 `data-desktop-clipboard="api-key"` 的密码框开了例外**（`isAPIKeyControl`，同文件 :25-27）。`DesktopCommandController.tsx:84` 的 `keyClipboardMatch` 因此拦截 API Key 密码框的默认复制/剪切/粘贴快捷键，走本地剪贴板桥。
- 剪贴板执行：`native-text-edits.ts:45` 的 `available()` 同样对 API Key 密码框放行 copy/cut；:75 把 API Key 的 copy/cut 路由到"先 `writeClipboardText` 成功再原生 delete"的受校验异步路径。
- 右键菜单：实际服役的是 `installTextContextMenu`（`src/lib/desktop/text-context-menu.ts`，由 `DesktopCommandController.tsx:36` 安装），菜单能力在 `captureDOMTextContext`（`src/lib/desktop/text-context-selection.ts:36-48`）计算：`sensitive = type==='password'`，`canCopy = !!copyText && (!sensitive || apiKey)` —— 同样对 API Key 密码框放行复制/剪切。菜单经 IPC 到主进程用 Electron Menu 弹出（`desktop/main/text-context-menu.ts`），【复制】可点击与否完全由 renderer 计算的布尔能力决定。
- 引用保护：`text-context-selection.ts:47,63` 对 `sensitive` 字段禁止"引用到对话"且不外发文本负载；若明文形态把 `type` 换成 `text`，`sensitive` 变 false，引用命令会对真实 Key 开放——这是必须堵住的泄露面。
- 历史设计：`docs/173-model-dialog-repair-plan.md` 第 3 条明确"API Key 保持 type=password，仅添加明确的剪贴板授权标记"，即现行"掩码态仍可复制"是当时的批准行为；本次需求将其反转为"密文不可复制、明文可复制"。

### 2.4 受影响测试

- `tests/unit/input-commands.test.ts:125-134`（K01/K04：掩码态允许复制/剪切）
- `tests/unit/native-text-edits.test.ts:32-61`（K01/K04/K06/K08：掩码态复制/剪切成功、失败保护、迟到保护）
- `tests/browser/api-key-clipboard.test.ts`（整文件基于"掩码态可复制"：K01/K02/K04/K05/K06）
- `tests/unit/model-settings.test.ts:260-272`（"keys are never refilled"——语义随本功能反转，需更新为回填行为）
- `tests/unit/model-repository.test.ts`（`protection` 夹具可直接复用来测 `revealKey`）
- `tests/unit/input-context-menu.test.ts` 使用自 mock 的 `commands.enabled`，不受真实 `enabled()` 变更影响；`desktop-command-controller.test.ts` 无 API Key 断言。

### 2.5 可行实现路线

1. 主进程 `ModelRepository` 新增 `revealKey(id)`：按 id 找模型（不要求 enabled，编辑停用模型也应可见原 Key），断言系统加密可用后解密返回；失败抛"系统密钥解密失败，请重新配置此模型"。
2. IPC：`desktop:model-reveal-key`（`businessHandle` + `trusted(event)` + `z.uuid()` 校验），preload 暴露 `revealModelKey(id)`，`DesktopBridge` 增加类型。密钥仅此一条通道进渲染进程，不进日志、不进事件负载。
3. 对话框：打开且带 `model` 时异步回填（竞态防护：alive/visible/未输入/范围未变才落值）；`showKey` 状态切换 `type="password"/"text"`；右侧闭眼/睁眼图标按钮（lucide `EyeOff`/`Eye`，已确认可用）；提交/测试/发现时若值等于回填值则映射为空串，保持"留空保留原密钥"与不提升 `authRevision` 的既有语义。
4. 复制语义反转：`input-commands.enabled` 与 `native-text-edits.available` 移除 API Key 例外（密码框一律禁止 copy/cut）；`text-context-selection` 的 `canCopy` 去掉 `||apiKey`，同时按 `data-desktop-clipboard` 属性（而非仅 password 类型）继续禁止"引用"和不外发文本负载，堵住明文形态下的泄露面。明文形态下控件是普通文本框，复制/剪切走 Chromium 原生能力，右键菜单【复制】自然可点。
5. 快捷键链路无需改：`keyClipboardMatch` 只匹配密码态（拦截后命令 disabled → dispatcher 判 `blocked` → preventDefault，静默不复制）；明文态不拦截，原生复制生效。

## 3. 风险与边界

- 明文 Key 进入渲染进程是本功能的批准目标；范围限于该输入框的值，不写入日志/遥测/对话引用。
- 回填失败（系统密钥保护不可用等）时保持旧行为：空值 + "已配置，留空保留原密钥"占位，保存仍保留原凭据。
- 切换供应商/协议/端点（范围变更）会清空 Key（既有 `edit(..., true)` 行为），迟到回填不得覆盖用户已输入内容或错配到新范围。
- 不动 `installInputContextMenu`/`showInputContextMenu`（现役实现为 text-context-menu 链路；该旧桥仅测试引用，语义不变）。
- 全量测试不在本次范围；只跑本功能相关的 unit/browser 用例与 typecheck。
