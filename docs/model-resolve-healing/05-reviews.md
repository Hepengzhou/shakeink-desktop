# 独立审核记录

日期：2026-10-15
按 `AGENTS.md` 流程，技术方案、测试用例、实现各经一次独立子代理审核；本文件汇总三轮结论与处置。

## 1. 技术方案审核（对 `02-technical-plan.md`，plan 子代理，逐行核对源码）

总体结论：**方案可执行，需修改后实施**。逐项审核（现存测试推演、网络边界、intent 门禁、闭环声称、并发、覆盖路径、引用抽查 24 处）后提出 4 项必须修改，全部已吸收进 02 现行版：

1. 漏审 `tests/unit/model-defaults.test.ts:49`（DEFAULT-04：失效随机 id + 有效默认 → 新语义下自愈成功，原断言必败）→ 02 §5 补审计结论与改法（断言前置空默认），§4 改动清单与 §6 回归清单补该文件。
2. 原 §3 要点 4「自愈后 authRevision 必不等」为事实错误（新记录从 1 起可判等）→ 已更正：真正兜底是 `gateway.begin(旧 UUID)` 失败（`MODEL_UNAVAILABLE`，`model-authorization.ts:62`），并注明该并发窗口错误码变化。
3. 原 §5 对 `review-model-selection.test.ts` 的描述不实（该文件无失效 id 的 NOT_FOUND 断言；`:157` 走 selection 门禁）→ 已更正为「无需改动」。
4. 小修：`model-service.test.ts:34` 论证、`configuration-transfer.ts` 引用区间（→`:193-202`）、§3 补显式声明 text 角色显式选择（composer `input.modelId`）同样被自愈覆盖 → 均已落实。

## 2. 测试用例审核（对 `03-test-cases.md`，plan 子代理，核实夹具/API 可执行性）

总体结论：**方向正确，需修正后放行实现**。3 项必须修正 + 4 项补强，全部已吸收进 03 现行版：

1. HEAL-02②/HEAL-04 的「悬空默认」无法经 `updateSettings` 设置（`model-repository.ts:118-123` 校验存在且启用）→ 03 §2 改为直写 state.json（格式 `{schemaVersion:1, revision, value}`，revision 不变；已核实 `versioned-store.ts:68` 读路径无缓存、`settings.ts:24` 不校验引用完整性）。
2. DEFAULT-15 编号与 `local-chat-defaults.test.ts:17` 冲突 → 改名 DEFAULT-27（现存最大 DEFAULT-26，已 grep 核实）。
3. §6 红集漏列 HEAL-06（修复前报 NOT_FOUND 而非预期 DISABLED）→ 已更正红集为 HEAL-01/02①/06/08 + DEFAULT-27 前半，其余标注为守卫用例。
4. 补强（已落实）：HEAL-01 写明 B 须用不同型号串（`:95` 四元组唯一约束）；DEFAULT-27 补前提断言 `scope.taskDefaults.reviewModelId === A` 与 A/B 区分依据说明（`UsageRecord.modelId` + gateway 成员身份，B 换不同 Key 断言 authorization 头切换）；新增 HEAL-08 闭合 image 分支；§1 补书面豁免（自愈后 KEY_MISSING/并发复查由 DEFAULT-05/23、RMS-04/05 覆盖；notice 不产生由「resolve 不抛错」隐含）；§5 补记 `model-error-classification.test.ts:13` 已审计排除。

## 3. 代码审核（对实现 diff，plan 子代理静态审查）

总体结论：**静态审查全部通过，实现与 02/03 契约逐项一致，无返工项**。要点：

- 改动边界恰为 4 文件（主代理 `git status` 终验确认）；`resolve()` 与方案 §3 逐点吻合（roleKey 提取、intent 门禁、`fallback !== id` 短路、null/省略 id 分支不可达自愈）。
- 安全性推演：resolve 返回不含 Key（`publicModel` 剥离）；`model.start` 路径三道防线中真兜底为 `gateway.begin(旧 UUID)` 抛 `MODEL_UNAVAILABLE`，错误模型请求与凭据错配不可能。
- 测试质量：HEAL-01..08 逐一核对有区分力（非路过式断言）；state.json 直写格式与 revision 保持正确；DEFAULT-27 前提/区分/后半阻断断言完整；DEFAULT-04 修改与 03 §3 逐字对应。
- 风格：缩进/无分号/英文注释与既有文件一致，无新依赖。
- 「显式不做的事」全部遵守。
- 遗留待办 2 项：补 `docs/requirements-traceability.json` 台账条目（主代理在总结阶段补齐）；实际运行验证由主代理执行（见 `06-verification.md`）。
