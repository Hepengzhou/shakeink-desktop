# 总结：已配置可用模型却弹「当前任务没有可用模型」修复

日期：2026-10-15
状态：已修复并通过目标验证（未跑全量，按用户约束）

## 根因

模型标识生命周期错配。任务执行解析的是**会话创建时冻结快照里的模型记录 UUID**（`state.json` 主键）；模型删除后重新添加会得到**新 UUID**（`model-repository.ts:90`），而 `Conversation.reviewModelId` 与各 `defaultsSnapshot` 从不被清理。于是快照里的旧 UUID 必然找不到记录 → `MODEL_NOT_FOUND`（`model-service.ts` 原 `:38`）。连通性测试验证的是草稿 Key + 供应商型号串，与快照 UUID 正交，所以「测试通过」与报错并存。文本模型因 composer 每回合用当前选择显式覆盖（`chat-turn.ts:202`）而不报错，审核模型完全依赖快照，故只有审核报错。

## 修复

`desktop/main/model-service.ts` `resolve()` 单点改动（+9/-2）：显式 id 找不到记录且 `intent !== "selection"` 时，回退到**当前配置的该角色默认模型**（`settings.agent.{text,review,image}ModelId`）再查一次；仍无则 `MODEL_NOT_FOUND` 照旧。enabled/kind/密钥/并发复查对最终记录照常执行。

保留语义（均有守卫用例钉住）：

- 显式 null（用户明确不选）继续 `MODEL_NOT_SELECTED` 阻断；
- 审核绝不落回文本默认（HEAL-02②、DEFAULT-14）；
- 失效 id 绝不挑未配置为默认的剩余记录（HEAL-04、DEFAULT-11）；
- `intent: "selection"` 的显式选择校验严格不自愈（HEAL-05、RMS-05）；
- 网络边界不可能用错模型发请求（真兜底：`gateway.begin(旧 UUID)` → `MODEL_UNAVAILABLE`）。

连带效果：原「受害会话永久报错、只能新建会话」的修复闭环断裂（`ReviewModelSelection.tsx:22` 仅对 `MODEL_NOT_SELECTED` 开放 + `chat-turn.ts:49` 守卫）随自愈成为不可达路径；配置导入、state.json 重置后重加、会话目录跨机拷贝等同类受害路径一并修复。

## 产物

- `01-research.md` 调研 → `02-technical-plan.md` 技术方案（独立审核通过）→ `03-test-cases.md` 测试用例（独立审核通过）→ `04-implementation.md` TDD 实现（独立 code review 通过）→ `05-reviews.md` 三轮审核记录 → `06-verification.md` 验证记录 → 本总结。
- 测试：HEAL-01..08（单元）+ DEFAULT-27（集成，端到端复现用户场景）+ DEFAULT-04 语义收窄；目标回归 7 文件 46/46，typecheck 通过；`docs/requirements-traceability.json` 已入账。
- 未跑全量（用户禁止）；未做安装包/真实供应商验证（改动位于主进程解析层，集成用例已覆盖真实存储与网关）。
