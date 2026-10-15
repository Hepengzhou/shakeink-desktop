# 实现记录：失效模型引用的解析期自愈

日期：2026-10-15
依据：`02-technical-plan.md`、`03-test-cases.md`（均经独立子代理审核后修订）
方式：严格 TDD（先红后绿），coder 子代理实现，plan 子代理独立 code review。

## 1. 改动清单（`git diff --stat` 实测）

| 文件 | 行数 | 内容 |
| --- | --- | --- |
| `desktop/main/model-service.ts` | +9/-2 | `resolve()`：提取 `roleKey`（`:35`）；`const model` → `let`（`:38`）；`:39-43` 插入自愈分支——`!model && intent !== "selection"` 时以 `settings.agent[roleKey]` 为唯一回退目标再查一次（`fallback && fallback !== id` 短路）；`:44` `MODEL_NOT_FOUND` 及其后全部校验不变 |
| `tests/unit/model-service.test.ts` | +104 | `healingFixture()`（真实 ModelRepository/Gateway/临时目录；`rewriteDefault` 直写 state.json 构造悬空默认，格式 `{schemaVersion:1, revision, value}`、revision 不变）；HEAL-01..08 共 8 个 test 块 |
| `tests/unit/model-defaults.test.ts` | +2/-1 | DEFAULT-04：`:49` 断言前置 `textModelId = null`；测试名收窄为 "absent and disabled explicit records are accurately blocked when no configured default remains" |
| `tests/integration/local-review-model.test.ts` | +48 | DEFAULT-27：端到端复现用户场景（删 A 重加 B 后，冻结快照里的旧 id 自愈到当前默认 B） |

核心 diff（`desktop/main/model-service.ts`）：

```ts
const roleKey = selection.role === "image" ? "imageModelId" : selection.role === "review" ? "reviewModelId" : "textModelId"
const id = selection.id === undefined ? state.settings.agent[roleKey] : selection.id
if (!id) throw new ModelAuthorizationError(state.models.some(model => model.kind === kind) ? "MODEL_NOT_SELECTED" : "MODEL_NOT_CONFIGURED")
let model = state.models.find(model => model.id === id)
if (!model && selection.intent !== "selection") {
  // Stale frozen references recover only to the role's currently configured default.
  const fallback = state.settings.agent[roleKey]
  if (fallback && fallback !== id) model = state.models.find(model => model.id === fallback)
}
if (!model) throw new ModelAuthorizationError("MODEL_NOT_FOUND")
```

## 2. TDD 红绿记录（coder 实跑，主代理复跑见 `06-verification.md`）

- **红（修复前）**：HEAL-01、HEAL-02①、HEAL-06、HEAL-08、DEFAULT-27 前半，共 5 项如 03 §6 红集预期失败（前四项 `MODEL_NOT_FOUND`；HEAL-06 报错码不对）。
- **守卫（修复前后均绿）**：HEAL-02②、HEAL-03、HEAL-04、HEAL-05、HEAL-07、修改后的 DEFAULT-04。
- **绿（修复后）**：新增/修改 3 文件 20/20；03 §5 回归 7 文件 46/46；`npm run typecheck` 通过。
- **grep 复核**：`grep -rn "MODEL_NOT_FOUND" tests/` 命中与 02 §5 / 03 §5 审计清单一一对应，无漏网断言。

## 3. 环境事实（coder 记录，主代理复核确认）

- 系统 Node 为 v20.12.2，`.nvmrc` 要求 24；字面 `node --import tsx --test` 下 5 个**既有**用例因 `Promise.withResolvers`（Node 22+ API）失败，修复前后失败集合相同、与本次改动无关。
- 权威验证使用项目自带 Electron 内嵌 Node v24（`ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/electron --import tsx --test …`），即桌面版真实运行时：全部通过。

## 4. 未做事项（按方案「显式不做的事」核对）

- 未改 `ReviewModelSelection.tsx`、`chat-turn.ts`、快照/会话存储、IPC/schema、前端组件；未新增依赖；未新增日志设施。
- 旧闭环缺陷（内联修复仅对 `MODEL_NOT_SELECTED` 开放、`REVIEW_ALREADY_SELECTED` 守卫）随自愈成为不可达路径，保持原样。
