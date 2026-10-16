# 调研：点击「生成场景」报「创作进度已变化」（story-navigation 刷新死路）

日期：2026-10-16 · 状态：根因已用用户真实数据库副本实证（作品名/物品名/行 id/库路径均已脱敏，取证脚本与数据库副本已清除）

## 1. 现象

依次生成世界线、叙事线、物品后，在物品回合的问答面板上点击「生成场景」，回合建立失败，界面显示「生成中断：创作进度已变化，请重新核对选项后继续」，并提供「查看最新选项」「作为新消息重发」两个按钮。

## 2. 报错来源

报错文案来自 `src/lib/services/story-task.ts:148`（`consumeStoryTask`；`:167` 为旧客户端标签回答分支的同款校验）：

```ts
if (navigation.contextHash !== navigationContextHash(graph)) throw new ContentError("VERSION_CONFLICT", "创作进度已变化，请重新核对选项后继续", 409)
```

`navigationContextHash`（`src/lib/services/story-task.ts:20-22`）哈希三块：`storyWorkflow.brief`、全部产物 `[key, hash]`、全部边 `[sourceKey, targetKey, sourceHash]`；产物图由 `readStoryArtifacts`（`src/lib/services/story-artifacts.ts:32`）从 14 张表读取，产物哈希对整行做 `semantic()` 过滤（transient 字段除外，`story-artifacts.ts:23`）。哈希计算本身确定性良好，**不一致必然意味着面板发出后图谱被真实写入**。

## 3. 取证（用户真实数据库整目录复制后只读分析）

时间线（UTC，同日）：

| 时间 | 事件 |
|---|---|
| T0 | 物品回合 ChatTurn 建立（action=storyTask item） |
| T0+3~4 分钟 | 6 个物品（记作 物品甲~己）经 `createItem` 落库 |
| T0+4 分 16 秒~24 秒 | `completeStoryTask` → `prepareStoryTask(review=true)`：6 个物品结构检查通过（`checkStoryMaterialStructure`），面板写入回合（choices=准备正文抽卡/生成场景，status=waiting_user） |
| **T0+11 分 17 秒** | **物品甲被 PATCH 更新（物品面板 autosave，`updateItem`）** |
| **T0+12 分 10 秒** | **物品乙被 PATCH 更新（同上）** |
| 之后 | 用户点击「生成场景」→ 报错 |

关键事实：

- 面板目标物品哈希与当前行哈希不一致 —— 两次面板编辑改变了产物语义内容，图谱哈希随之改变。编辑本身是合法用户行为。
- 该面板保持 `state=pending`、`revision=1`，说明点击失败后自愈刷新从未成功。
- 回合建立前置预检（`src/lib/services/chat-turn.ts:158-177`）与主事务捕获（`chat-turn.ts:300-311`）都会尝试 `refreshStoryNavigation` 自愈；**用户仍看到原始 VERSION_CONFLICT，说明两次刷新都抛了异常**，最终 `chat-turn.ts:309` 把原始错误抛给用户（预检刷新失败被 `chat-turn.ts:168` 的 `catch {}` 吞掉）。

## 4. 根因（在数据库副本上逐行实证）

`refreshStoryNavigation`（`src/lib/services/story-task.ts:241-266`）的刷新步骤：

```ts
const prepared = await prepareStoryTask(scope, keys, false)          // :252 —— review=false，不重检
if (!prepared.question) throw new ContentError("INTERACTION_STALE", "当前已有唯一下一步，请直接继续", 409)  // :254
```

实证 1 —— 以面板目标 keys 直接调用 `prepareStoryTask(scope, 6个物品key, false)`（副本原样）：返回 `question=undefined`，`autoProceed={task:"outline", label:"整理卷章大纲（主叙事线 · 16 张卡待分章）"}`。即刷新必然命中 `:254` 的 INTERACTION_STALE，两次刷新均失败 → 用户看到原始「创作进度已变化」。

**为什么面板塌缩成 autoProceed**：`prepareStoryTask` 的 `ready`（`story-task.ts:82`）要求每个目标检查点 `checkpoints[key].hash === 当前证据哈希 && passed`。两个物品被编辑后，其结构检查点过期（指纹不变），而 `review=false` 跳过 `story-task.ts:68-71` 的重检循环，`ready` 变为 false。`ready=false` 令 `navigationRecommendations`（`src/lib/story-navigation.ts`）：

- `:112` `pendingChapter` 置空 → 不产生「准备正文抽卡」（`:121-133`）；
- `:186` `if (input.ready || formalFocus)` 不成立 → **「生成场景」分支（`:205-206`）整体跳过**；
- `:168` 进入剧情搭建分支 → 只剩一个「整理卷章大纲」选项。

仅剩一个不涉认可/写作的选项 → `prepareStoryTask` 走 autoProceed 路径（`story-task.ts:117-120`）不返回 question → 刷新抛 INTERACTION_STALE → 死路。出错后界面上的「查看最新选项」按钮（`desktop/handlers/chat/turns/[turnId]/navigation/route.ts`）调用的也是同一个 `refreshStoryNavigation`，同样必败。

实证 2 —— 在副本上对 6 个物品先跑 `checkStoryMaterialStructure`（与 `story-task.ts:68-71` 同款、无 AI、幂等；2 个被编辑物品重写检查点，其余 `reused:true` 零写入），再调 `prepareStoryTask(scope, keys, false)`：`question` 恢复，choices 为 `[prepare-writing:chapter-outline:<章id>:, scene:chapter-outline:<章id>:]`，与原面板选项 id **逐字节一致**。此时 `consumeStoryTask` 用刷新后的面板校验：哈希一致、选项存在 → 正常建回合执行任务，无任何报错。

## 5. 结论

- 触发条件：问答面板挂起期间，面板目标中的**快速资料类产物**（item/scene/world/setting/foreshadow，`FAST_MATERIAL_KINDS`，`src/lib/services/story-workflow.ts:357`）被编辑（面板 autosave 等合法途径），检查点过期。
- 缺陷：`refreshStoryNavigation` 用 `review=false` 准备新面板，从不对快速资料做结构重检，把「检查点过期」误当作「内容未达标」，导致选项菜单塌缩为唯一 autoProceed、刷新自弃（`:254`），原始 VERSION_CONFLICT 穿透到用户界面，且「查看最新选项」同步失效。
- 对比：正常回合收尾（`completeStoryTask` → `prepareStoryTask(review=true)`，`story-task.ts:68-71`）对快速资料每次都用 `checkStoryMaterialStructure` 重检；唯独刷新路径漏了这一步 —— 两条路径的就绪判定不一致是本次 bug 的本质。
- 非根因项（已排除）：哈希计算非确定性、后台/启动任务写产物表、图像回填（物品图标/角色裁剪字段虽不在 transient 集合，但本案相关字段均为 null，与本次无关）、回合内二次写入、并发回合。

## 6. 影响面

- 任何「面板挂起 → 编辑快速资料 → 回答面板」的序列都会 100% 复现本死路（编辑场景/世界/设定/伏笔同理）。
- 编辑非快速资料（角色、章纲、正文、规划）后面板过期：若重备后剩余轻量选项 >1 或仍需作者决策，刷新可成功；若同样塌缩为唯一 autoProceed，则刷新同样自弃 —— 该场景划出本次范围，此处仅作边界说明。
- 内容被清空（结构检查 passed=false）后面板过期：`ready=false` 属实，菜单塌缩是诚实状态，刷新仍失败 —— 属既有设计边界，本次不改变该语义。
