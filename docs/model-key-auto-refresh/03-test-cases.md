# 测试用例：Key 输入自动刷新与失效选择自动替换

实现文件：`src/components/desktop/ModelConfigurationDialog.tsx`（引导与设置共用真实组件）。
单元底座：`tests/unit/model-settings.test.ts`、`tests/unit/onboarding-editors.test.ts`（真实组件 + 受控 hooks/IPC，不替代真实 Electron 验证）。

| ID | 场景 | 期望 | 层级 |
| --- | --- | --- | --- |
| KR-01 | 填入 Key 后不点任何按钮 | 防抖后自动发起一次目录刷新，携带最新输入的 Key；连续快速输入只产生最后一次请求 | 单元（真实组件） |
| KR-02 | 自定义供应商填 Key；空 Key；已保存模型回填揭示；对话框刚打开 | 均不触发自动刷新（discovered 保持 0） | 单元 |
| KR-03 | 填入 Key 后防抖窗口内切换供应商/协议/端点、切换已有模型模式、导航离开 | 挂起的自动刷新被取消，不发出请求 | 单元 |
| KR-04 | 已选内置型号，刷新（自动或手动）后目录缺失该型号但存在其他可用项 | 已选自动替换为下一个可用型号（名称/上下文/思维档同步），出现"已替换为下一个可用模型"提示；引导场景触发 onDraftChanged；可直接保存 | 单元 |
| KR-05 | 刷新后目录为空或可用项均已按同供应商+端点+类别添加过 | 无替代：清空选择与能力参数，提示重新选择，保存/测试阻止，不写库 | 单元 |
| KR-06 | 编辑已保存旧记录，仅读取缓存目录（未刷新）时型号缺失 | 仍清空并要求重选（MC-09/MC-10 缓存路径语义不变） | 单元 |
| KR-07 | Windows Electron 隔离根：选择内置种子后填入 Key 不点按钮 | 自动刷新一次（以 `expect.poll` 轮询夹具调用计数到 1 为确定性完成信号）；已选种子被 live 目录剔除后自动替换为下一个可用型号并提示；快照落盘且不含 Key；空目录刷新用例同样以夹具计数轮询等待（缓存快照的"目录获取于"文案与无选择场景使文案信号不可靠）；离线重启后快照可见 | 真实 Windows Electron（`scripts/verify-model-catalog-refresh.mjs`，官方接口为夹具） |

## 受影响旧用例改写

- `tests/unit/model-settings.test.ts` "MC-09: live replacement clears missing draft selection…" → 刷新路径改为自动替换语义（KR-04/KR-05）。
- `scripts/verify-model-catalog-refresh.mjs` MC-12-seeds-and-live-prune / MC-12-empty-refresh → 去掉手动点击刷新按钮，等待自动刷新完成信号（替换文案/目录获取时间），夹具调用次数保持 1。
- MC-12-old-record-cannot-reinsert-or-save（缓存读取、未刷新）保持旧断言不变。
