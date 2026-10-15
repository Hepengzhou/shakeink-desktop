# AI 对话标题：渐变淡出与大模型短标题 验证记录

日期：2026-10-16。范围：仅 `docs/213-chat-title-cases.md` 所列用例（**未跑全量**，遵守用户约束）。实现经独立 code review（`docs/215-chat-title-code-review.md`）并修复 P0/P1 后复跑。

## 运行环境说明

- 单元/浏览器测试：系统 Node v20.12.2。
- 集成测试：生产代码 `desktop/service/models.ts:75` 使用 `Promise.withResolvers`（Node ≥22），而 `.nvmrc` 钉死 Node 24；故集成测试经 `ELECTRON_RUN_AS_NODE=1` 用 Electron 44 内嵌 Node **v24.21.0** 运行（与生产运行时同族），命令见下。

## 执行与结果

### 1. 单元测试（19/19 通过）

```
node --import tsx --test tests/unit/conversation-title.test.ts tests/unit/conversation-title-service.test.ts tests/unit/conversation-title-route.test.ts tests/unit/chat-title-static.test.ts
# tests 19 / pass 19 / fail 0
```

覆盖：CT-10/11/12（纯函数）、CT-20/21/22（requester 守卫）、CT-30/31/32/33/34/35/36/36b（编排服务 vm mock）、CT-37/38（路由契约）、CT-50/51/52（静态结构）。

- RED 证据：实现前首跑 14/14 失败（模块不存在/结构未改），实现后全绿。
- CT-34 在 code review 后加强：断言 warn 载荷不含用户消息与提示词标记（防 APICallError 携带请求体入日志）。

### 2. 集成测试（3/3 通过，真实 Workspaces+PGlite+真实 ModelRepository/ModelService/ModelGateway，仅 HTTP 出口打桩）

```
ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/electron.exe --import tsx --test tests/integration/local-conversation-title.test.ts
# tests 3 / pass 3 / fail 0
```

- CT-40：默认标题会话首回合后 → `changed:true`，DB 标题替换为「深海沉船之谜」；`UsageRecord.action="conversation.title"` 落账（9/6 token）；授权头仅在主进程出口注入；用量快照与记录不含密钥。
- CT-41：无默认文本模型 → `changed:false/no-model`，gateway 0 调用，连 `model.resolve` RPC 都未发起（永不弹窗），原标题保留。
- CT-42：定制标题 → `not-default`，0 模型调用，永不覆盖。

### 3. 浏览器测试（4/4 通过，真实头部 JSX + 真实 globals/desktop CSS，无头 Chromium）

```
node --import tsx --test --test-concurrency=1 tests/browser/chat-title-fade.test.ts
# tests 4 / pass 4 / fail 0
```

- CT-01：360px 视口长标题 → `.nav-label[data-overflow="true"]`，computed `text-overflow:clip`、`white-space:nowrap`、`mask-image` 为含 24px 的 linear-gradient，`title` 属性为完整标题，图标在位（与侧栏条目同组件同样式）。
- CT-02：760px 短标题 → 无遮罩（`data-overflow` 缺省、mask none）。
- CT-03：760→360→760 视口变化 → ResizeObserver 重测，遮罩随之出现/消失。
- CT-04：空会话 → 头部 h-11 高度保持、占位 span 空文本、无图标（护栏型，改动前后均应通过）。

### 4. 既有 AST 提取式回归（code review P0 修复后复跑，13/13 通过）

```
node --import tsx --test --test-concurrency=1 tests/browser/chat-title-fade.test.ts tests/browser/ai-caption-message-drag.test.ts tests/browser/chat-caption-safe-area.test.ts
# tests 13 / pass 13 / fail 0
```

两个既有文件（提取真实头部 JSX 但缺 `NavigationLabel` import）修复后全绿；`pane-window-drag.test.ts`（静态断言）与 `workspace-surfaces.test.ts` 经 grep 核实无头部 span/truncate 假设，不受影响。

### 5. typecheck

```
npm run typecheck  # tsc --noEmit，通过无输出
```

### 6. CT-60（真机 tooltip，非自动化）

未执行：本环境无已配置模型与可用密钥，无法在真实应用内产生会话。按方案（211 §四）与审核（212 P2-3）批准的退路接受：拖拽区内原生 tooltip 若不出现，与改动前现状持平（改动前顶栏标题无 tooltip）；渐变淡出本身已由 CT-01/03 的真实 CSS 浏览器断言证明。后续真机验收时可补记。

## 结论

本次目标的全部 scoped 用例（CT-01~04、CT-10~12、CT-20~22、CT-30~38、CT-40~42、CT-50~52）通过，typecheck 通过；未运行全量套件（用户约束）。已知限制：reconcile/follow 路径完成的回合当轮不触发标题请求，由下一成功回合自愈（方案明示语义）；CT-60 真机 tooltip 待有模型环境时补验。
