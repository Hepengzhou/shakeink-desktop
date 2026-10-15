# 验证记录

日期：2026-10-15
范围约束：按用户要求**禁止全量测试**，只运行 `03-test-cases.md` §5 列出的目标文件与 typecheck。
运行环境：Windows，项目自带 Electron 内嵌 Node v24（`ELECTRON_RUN_AS_NODE=1`，即桌面版真实运行时，符合 `.nvmrc`）。系统 Node v20.12.2 下 5 个既有用例因 `Promise.withResolvers`（Node 22+ API）失败，修复前后失败集合相同，与本次改动无关（`04-implementation.md` §3）。

## 1. TDD 红（修复前，coder 实跑）

红集 5/5 如 03 §6 预期失败：HEAL-01、HEAL-02①、HEAL-06（报 `MODEL_NOT_FOUND` 而非预期 `MODEL_DISABLED`）、HEAL-08、DEFAULT-27 前半。守卫集（HEAL-02②/03/04/05/07、改后 DEFAULT-04）修复前已绿。

## 2. 修复后目标回归（主代理复跑）

命令：

```
ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/electron --import tsx --test \
  tests/unit/model-service.test.ts tests/unit/model-defaults.test.ts \
  tests/unit/model-guidance.test.ts tests/integration/local-review-model.test.ts \
  tests/integration/local-task-defaults.test.ts tests/integration/local-model-generation.test.ts \
  tests/integration/review-model-selection.test.ts
```

结果：**tests 46 / pass 46 / fail 0**（duration ≈ 11.4s）。输出含全部 HEAL-01..08、修改后的 DEFAULT-04、DEFAULT-14、RMS 系列、DEFAULT-01..06/23 等。

单文件复跑（直接证据）：`tests/integration/local-review-model.test.ts` →

```
✔ DEFAULT-14: real SDK generation selects frozen review defaults, saves review usage and blocks missing review without a text fallback
✔ DEFAULT-27: removed-then-readded model heals frozen review snapshots to the configured default
pass 2 / fail 0
```

## 3. 类型检查

`npm run typecheck`（`tsc --noEmit`）：通过，无输出。

## 4. 改动边界（`git status` / `git diff --stat`）

```
 M desktop/main/model-service.ts                 |  10 ++-
 M tests/integration/local-review-model.test.ts  |  48 +++++++++++++
 M tests/unit/model-defaults.test.ts             |   3 +-
 M tests/unit/model-service.test.ts              | 104 ++++++++++++++++++++++++++-
?? docs/model-resolve-healing/
```

恰为方案审定的 4 个代码/测试文件 + 本次文档目录；无其他改动。

## 5. 通过标准对照（03 §6）

| 标准 | 结果 |
| --- | --- |
| 红集修复前失败、修复后全绿 | ✔（§1、§2） |
| DEFAULT-04 修改后通过、回归文件全绿 | ✔ 46/46 |
| `npm run typecheck` 通过 | ✔ |
| 不接触真实网络/真实 Key | ✔（夹具均为 `fixture` 假值，gateway fetch 为测试桩） |

## 6. 未执行项（如实声明）

- 未跑全量测试套件（用户明确禁止；`fullSuiteExecuted: false`）。
- 未做真实 Electron 安装包/真实供应商验证；本次改动位于主进程解析层，已由真实 `ModelRepository`/`ModelGateway`/PGlite 集成用例（DEFAULT-27 端到端复现用户场景）覆盖。
