# 文生图供应商列表：独立技术方案审核

日期：2026-10-13（Asia/Shanghai）。审核范围仅为 `2026-10-13-image-provider-plan.md` 及其引用源码和批准边界。结论：**通过，无方案阻断项**。本结论不代表实现、测试或真实界面验收已通过。

1. 两家菜单的入口定位正确。`desktop/shared/model-catalog.ts:68-84` 定义共享供应商目录，`presetsFor` 当前按端点与 custom 过滤；`src/components/desktop/ModelConfigurationDialog.tsx:30,155` 同时用它确定默认供应商和菜单项，`src/components/desktop/OnboardingController.tsx:67` 复用同一真实弹窗。因此显式令 IMAGE 只返回 bytedance/openai，可同时覆盖设置新增与首次引导，不必复制 UI。TEXT 保留现有供应商范围符合本次窄范围修改；名称同步没有改变协议行为。
2. 保留内部 bytedance ID 是合理兼容路径。`desktop/shared/model-catalog.ts:74` 现有端点已经是火山方舟；`desktop/main/model-configuration.ts:277,345` 和 `desktop/main/image-provider-protocols.ts:108` 按 bytedance ID 分派协议。`desktop/main/model-repository.ts:73-87` 用 provider/protocol/endpoint/kind 判断授权范围并保留原加密 Key。仅替换展示名称和供应商品牌资产，不改这些契约，避免为旧配置无故撤销授权。方案明确保留已保存的其他 IMAGE 记录，菜单限制不应变成数据删除。
3. selectedOption 方案解决真实兼容问题，且守住两家限制。`src/components/desktop/ModelChoiceSelect.tsx:8` 当前只从 options 查当前值；过滤后旧供应商会退化为“请选择”。可选的 selectedOption 仅当 id 等于 value 时用于当前展示，选项 items 仍只传两家，是合适的修复。实现时必须让菜单选项优先，并验证传入旧值不会被 Base UI 加回列表；`ModelChoiceSelect.tsx:20-25` 菜单和键盘选择都从实际选项渲染。须覆盖旧预设以及 custom 当前配置、切换至两家、取消及保存，并覆盖通用控件原有 disabled、搜索与单选行为。
4. 供应商品牌与模型家族品牌区分正确。`src/components/chat/provider-logos.tsx:6-13` 已有 provider/model 两种资产族和 volcengine 别名；供应商下拉明确传 provider variant（`ModelChoiceSelect.tsx:19,25`）。方案让 bytedance 与 volcengine 的 provider 资产指向本地 volcengine.svg，并同步替代文字；保留独立模型家族资产符合现有语义。`design/provider-logo-provenance.json` 当前只登记字节跳动资产；新资产的真实来源、许可证说明和指纹仍需在实施及 code review 阶段落实，不能据本方案声明已取得或已验证图标。
5. 连接结果应从完整预设读取。`ModelConfigurationDialog.tsx:131` 当前从菜单目录查名称，过滤后旧 IMAGE 记录会显示内部 ID；方案对应修复完整预设查询，不应把旧供应商重新放入菜单。自定义记录可沿用其用户填写名称，避免丢失真实状态文案。
6. 验证范围与批准边界相符。`AGENTS.md` 和 `docs/implementation-boundaries.md` 要求方案/用例独立审核、TDD、code review、全量用例以及真实 Electron 验证；方案遵循次序并明确 Windows 双主题、离线本地资产和旧记录。浏览器/开发 Electron 结果不能标作安装包或 macOS 真实通过；真实供应商未调用也不能标作供应商调用通过。台账仅记本项真实结果，保留此前修改及未通过证据。

审核方法：读取上述源文件；使用 rg 确认 `presetsFor` 的所有生产消费点及 bytedance 协议分派；读取批准边界和品牌资产清单。本次没有执行产品测试、改生产源码或查看真实 UI。
