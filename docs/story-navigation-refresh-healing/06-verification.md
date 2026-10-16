# 验证记录：story-navigation 刷新前重检快速资料结构检查点

日期：2026-10-16 · 执行约束：仅目标测试文件，禁止全量测试（用户本次明确要求）

## 1. 执行命令

```
node --import tsx --test tests/integration/story-navigation-refresh.test.ts
```

## 2. 结果（主代理独立复跑）

```
# tests 6
# pass 6
# fail 0
# duration_ms 7039.813
```

| 用例 | 锁定行为 | 结果 |
|---|---|---|
| STALE-01 回归 | 编辑物品后 `refreshStoryNavigation` 恢复面板，revision+1、choices 含原 `sceneChoiceId`、contextHash 与当前图一致 | pass |
| STALE-02 端到端（storySelection） | 点击过期面板「生成场景」不再报错，正常建回合、action=storyTask scene、原面板 answered | pass |
| STALE-03 幂等 | 无编辑刷新：物品行 updatedAt 与 StoryWorkflow.version 均不变 | pass |
| STALE-04 边界 | 非快速资料（角色）目标编辑后刷新不触发 AI 评审、checkpoints 无 character:* | pass |
| STALE-05 端到端（标签回答） | 纯文本「我的回答：生成场景」分支同样自愈 | pass |
| STALE-06 反向边界 | 内容清空（passed=false）刷新仍诚实抛 INTERACTION_STALE | pass |

反向控制（种子有效性）：编辑物品后直接 `prepareStoryTask(review=false)` 返回 `question===undefined` 且 `autoProceed.task==="outline"` —— 成立（否则用例组无效）。

## 3. TDD/变异证据

- 修复前基线：STALE-01 抛 INTERACTION_STALE、STALE-02/05 抛 VERSION_CONFLICT「创作进度已变化，请重新核对选项后继续」—— 与用户报错文案逐字一致，复现成立；
- 变异验证：重检循环失效后 STALE-01/02/05 复败、STALE-06 仍过；已恢复并复跑全绿。

## 4. 未执行项（按约束）

- 未跑全量测试套件（用户明确禁止，仅跑目标文件）；
- 未做安装包/真实目标系统验证（本次为服务端逻辑修复，用户场景链路已由 STALE-02/05 端到端覆盖：预检刷新 → 主事务消费 → 建回合）。
