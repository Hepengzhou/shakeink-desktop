# 提示词模板库扩充：独立内容审核

日期：2026-10-14（Asia/Shanghai）。审核人：独立子代理 `corpus_audit`。仅新增本文；未修改源码、用例或验收台账，未运行全流测试，未读取真实作者资料或模型凭据。

## 结论与审核对象

内容审核通过。实际最终内置库为500条：471条创作向导（其中160条剧情）与29条服务提示词；74条重点剧情覆盖用户54个明确项，70条为新增ID，4条复用稳定ID。全部74条最终prompt具备输入缺省、专门方法、推进步骤、统一阶段交付、专项交付物和自检。逐条审读重点内容，并与旧90条剧情及其余原库进行任务与机制交叉复核，未发现未解决的实质同义条目。

审核期间额外指出5条旧剧情强同义，以及替死鬼允许三者身份全部相同的问题。实现者修订后已重新读取真实最终prompt并复核；不能用ID或正文字符串唯一代替这些内容修订。

审核读取的是 `WIZARD_TEMPLATES` 导出的最终prompt，不仅是spec片段。源数组保留原文供hash升级识别，运行聚合会替换4个既有重点ID、执行23项定向curation并给其他旧剧情补执行合同；保留源数组中的旧文不等于正式库重复提供这些旧版本。聚合证据：`src/lib/creation-wizard/templates/index.ts:27` 起的 `focusedById` 和 `originalIds`，以及最终导出。

## 实际命令与结果

工作目录：`D:\Projects\xaanink-desktop`。使用本地 `typescript.transpileModule` 在内存中加载真实TS模块，执行其组装函数；没有保存中间脚本或渲染文件。一次tsx读取遇到esbuild子进程 `spawn EPERM` 后改用该纯内存读取方式，不把失败命令标为通过。

```powershell
@'
const fs = require('fs'), ts = require('typescript'), crypto = require('crypto');
require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
const { WIZARD_TEMPLATES: wizard } = require('./src/lib/creation-wizard/templates/index.ts');
const { PROMPT_TEMPLATES: service } = require('./prisma/seed-templates.ts');
const coverage = JSON.parse(fs.readFileSync('./docs/prompt-library-expansion/coverage.json', 'utf8'));
const focused = coverage.groups.flatMap(group => group.templates.map(entry => wizard.find(t => t.id === entry.id)));
const all = [
  ...wizard.map(t => ({ id: t.id, cat: t.cat, title: t.title, prompt: t.prompt })),
  ...service.map(t => ({ id: t.key, cat: 'service', title: t.name, prompt: t.content })),
];
const normalize = text => text.normalize('NFKC').replace(/[\s\p{P}]/gu, '');
const duplicates = (items, key) => Object.values(items.reduce((groups, t) => {
  (groups[key(t)] ??= []).push(t.id);
  return groups;
}, {})).filter(ids => ids.length > 1);
console.log(JSON.stringify({
  combined: all.length, wizard: wizard.length, service: service.length,
  plot: wizard.filter(t => t.cat === 'plot').length, focused: focused.length,
  userExplicit: coverage.groups.reduce((count, group) => count + group.minimum, 0),
  duplicateIds: duplicates(all, t => t.id),
  duplicateTitles: duplicates(all, t => t.cat + ':' + normalize(t.title)),
  duplicateBodies: duplicates(all, t => normalize(t.prompt.replace(/^【[^】]+】[^\n]+\n+/, ''))),
  duplicateMethods: duplicates(focused, t => normalize(t.prompt.match(/【方法】\s*([\s\S]*?)\s*【推进步骤】/)[1])),
  combinedContentSHA256: crypto.createHash('sha256').update(JSON.stringify(all)).digest('hex'),
}, null, 2));
'@ | node
```

最终执行退出码0，结果：combined 500 / wizard 471 / service 29 / plot 160 / focused 74 / userExplicit 54；ID重复组、同类别标准化标题重复组、跨集合标准化正文重复组、74重点方法重复组均为0。

另以六段合同标记检查所有160条剧情，失败0；重点占位符、`undefined`、TODO检查失败0。74重点正文的JavaScript UTF-16长度范围877–1001，不是仅有一句方法名称。以生产变量正则复核29服务模板，未声明变量、未使用声明及隔离值替换后残留变量均为0。服务占位符属于合法声明；替换重放不等于执行带数据库加载的 `renderPrompt`，也不等于供应商推理通过。

最终审核内容指纹：`353ceafc3fc17df74fa2b2a186459bb87d2345024effdc48e5ca73d22f629a7f`。该指纹来自上面按当前导出顺序和字段排列序列化的500条正文与标题；后续正文修改需重新复核。

## 逐项方法与交付物审读

下表的S、G分别指 `src/lib/creation-wizard/templates/plot-structures.ts`、`src/lib/creation-wizard/templates/plot-genres.ts`；数字为本次审读的实际源行。每行均已检查最终prompt的四步推进与专项输出。公共合同来自 `plot-prompt.ts:16`，包含读取当前对话、作者事实优先、最多三个决定性问题及标注待确认候选、事件/动机/行动/代价/信息的阶段表、修正后自检。没有要求作者另填服务变量。

### 通用结构：23条，用户明确19项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 起承转合 | `plot-structure-qi-cheng-zhuan-he` S:5 | 四段事件因果；四段承接、转折前两处铺垫、首尾目标对照 |
| 四段式 | `plot-structure-four-parts` S:11 | 中点由反应转为反击；前后各两场主动权对照、四段出段条件 |
| 五幕式 | `plot-structure-five-acts` S:17 | 入局、复杂化、中点、低谷、第五幕终局；每幕目标/出口危机/不可逆变化 |
| 英雄之旅 | `plot-structure-heros-journey` S:23 | Campbell离开、启蒙、归返；身份边界、所得与共同体变化 |
| 作家之旅 | `plot-structure-writers-journey` S:29 | Vogler十二阶段及角色功能；完整十二行场景表、角色功能矩阵 |
| 七点式 | `plot-structure-seven-points` S:35 | 钩子、双转折、双压力、中点、解决；恰好七点及六条连接原因 |
| 救猫咪 | `plot-structure-save-the-cat` S:41 | 完整十五节拍；十五行表、B故事主题学习、首尾画面与类型兑现 |
| 人物弧光 | `plot-structure-character-arc` S:47 | 欲望/需要/信念及正负平弧；信念证据链与三场价值抉择 |
| 菲希特曲线 | `plot-structure-fichtean` S:53 | 开局危机、暂解副作用、累积损耗、晚段高潮；危机升级曲线 |
| 基肖滕弧 | `plot-structure-kishotenketsu` S:59 | 第三段新视角、第四段意义联结；初始/最终理解、两处重解释细节 |
| 悬念循环 | `plot-structure-suspense-cycle` S:65 | 提问、线索、局部答案、派生问题；悬念账本及读者/主角信息差 |
| 潮汐结构 | `plot-structure-tidal` S:71 | 宏观压力波次与有代价的修复；三轮峰谷资源/关系净变化 |
| 环形 | `plot-structure-ring` S:77 | 时间向前、首尾场景意义回环；首尾意象与中段两次变体 |
| 非线性 | `plot-structure-nonlinear` S:83 | 真实因果不变、呈现次序重排；双时间线编号及跳转释放信息 |
| 多线并行 | `plot-structure-parallel` S:89 | 两到四条独立目标互相传递后果；线索矩阵、共同时间轴、三处交叉 |
| 框架叙事 | `plot-structure-frame` S:95 | 外层讲述目的与内层材料改变外层决定；双层表及材料可靠性 |
| 书信体 | `plot-structure-epistolary` S:101 | 写作/寄送/阅读时间及载体知情边界；至少五份目录、双声口摘录 |
| 逆时序 | `plot-structure-reverse` S:107 | 主要事件严格晚到早、逐段重解结果；逆序目录与顺向因果链 |
| 循环叙事 | `plot-structure-cyclical` S:113 | 行为/历史/代际模式三轮复现；传递机制与变体矩阵 |
| 三幕式（额外） | `plot-three-act-skeleton` S:119 | 建立/对抗/解决及两幕间门槛；三幕图、两个转折与中点 |
| 八序列（额外） | `plot-structure-eight-sequences` S:125 | 每序列局部目标/高潮/出口；八行序列表及下一序列输入 |
| 场景与余波（额外） | `plot-generic-mainline` S:131 | 单场景目标/阻力/后果接反应/两难/决定；至少三组细粒度因果链 |
| Freytag（额外） | `plot-structure-freytag` S:137 | 中央高潮是枢纽，后半反作用；五部分张力、作用力及最后悬念 |

### 浪漫爱情：9条，用户明确7项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 欢喜冤家 | `plot-romance-rivals` G:16 | 目标相斥、协作改变偏见；四次合作证据、边界修复、承诺 |
| 假戏真做 | `plot-romance-fake-relationship` G:28 | 自愿表演契约失效后再次选择；契约、知情人、解除旧约和真关系条件 |
| 三角恋 | `plot-romance-triangle` G:40 | 双关系代表长期生活道路；三方价值/未来路线及三人独立结局 |
| 霸道总裁 | `plot-romance-ceo` G:52 | 权力与资源差异影响拒绝能力；退出路径、越界因果、撤权修复 |
| 父母反对 | `plot-romance-family-opposition` G:64 | 家庭顾虑验证和恋人共同生活承诺；立场矩阵、现实方案、边界 |
| 误会循环 | `plot-romance-misunderstanding` G:76 | 合理误读、主动核实、旧误会兑现；六列纠偏账及沟通规则 |
| 破镜重圆 | `plot-romance-reunion` G:88 | 分开期间双线改变，同类压力复测；断裂账、新旧行为、复合条件 |
| 青梅竹马（额外） | `plot-romance-childhood-friends` G:100 | 旧身份遮蔽新需要；共同记忆、旧习惯失效、关系再命名 |
| 跨阵营（额外） | `plot-romance-cross-faction` G:112 | 私人亲密与真实群体责任；阵营利益、共同底线、公开选择代价 |

### 悬疑推理：9条，用户明确7项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 密室杀人 | `plot-mystery-locked-room` G:124 | 先可行真相后不可能错觉；平面/时刻条件、可见线索、反证与完整解答 |
| 倒叙推理 | `plot-mystery-inverted` G:136 | 读者先知凶手、侦探逐步证明；双知情表、补救失败链、证明清单 |
| 找锅型 | `plot-mystery-blame-chain` G:148 | 表面归责后分解决策/执行/获益/掩盖；权限责任矩阵与逐环证据 |
| 嫁祸型 | `plot-mystery-frame-up` G:160 | 主动污染证据指向无辜者；真伪对照、来源链、双时间线复原 |
| 替死鬼 | `plot-mystery-substitute-victim` G:172 | 目标或身份至少一处错位；三列表、知情时间、身份反证与攻击链 |
| 蠢助手 | `plot-mystery-naive-assistant` G:184 | 朴素提问暴露专业隐含前提；搭档分工、三次查证、双方误判修正 |
| 知情者必死 | `plot-mystery-silenced-witness` G:196 | 阻止真相传播与保护主动对抗；知情分布、信息接力和保护方案 |
| 不可靠叙述（额外） | `plot-mystery-unreliable-narrator` G:208 | 真相底稿与稳定的叙述偏差；双轨表、裂缝索引、可信范围 |
| 暴风雪山庄（额外） | `plot-mystery-isolated-suspects` G:220 | 固定成员、可信求援隔绝及联盟变化；边界、机会/证词矩阵、案情时序 |

所有推理条目都先约束真实事件或事实底稿，要求解答前可见材料、来源核验、人物知情边界及前置线索；密室禁止临时密道，替死鬼禁止突然新增孪生者，封闭嫌疑网禁止最后新增外来凶手。知情者必死落实类型压力而不机械要求全员死亡；蠢助手落实提问功能而非凭偶然取得答案。

### 奇幻冒险：5条，用户明确3项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 寻宝 | `plot-fantasy-treasure` G:232 | 线索依赖逐层缩小位置/重解宝物；路线、用途、获取代价及归属选择 |
| 任务 | `plot-fantasy-quest` G:244 | 委托验收条件受行动后果挑战；委托书、依赖表、修约和验收争议 |
| 预言 | `plot-fantasy-prophecy` G:256 | 固定文本与多方解释竞争；原文信息、解释受益者、自我实现链 |
| 护送（额外） | `plot-fantasy-escort` G:268 | 移动风险、对象自主意愿与交接责任；分支路线、追踪/补给、交接标准 |
| 失落王国（额外） | `plot-fantasy-lost-kingdom` G:280 | 覆亡原因、居民授权与旧制度取舍；利益地图、公共成果及授权方式 |

### 科幻：7条，用户明确5项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 时间循环 | `plot-scifi-time-loop` G:292 | 物理时间复位，固定记忆/物质/触发规则；逐轮变量实验与退出证明 |
| 末日求生 | `plot-scifi-apocalypse` G:304 | 灾后生态与生产消耗反馈；生态图、资源账、试验和下一生存周期 |
| 赛博朋克 | `plot-scifi-cyberpunk` G:316 | 身体/数据权限接入生活支配；依赖图、行动痕迹、控制权变化 |
| 反乌托邦 | `plot-scifi-dystopia` G:328 | 制度收益与排除同时存在；承诺裂缝、反抗取舍、替代秩序功能 |
| 外星接触 | `plot-scifi-first-contact` G:340 | 感官/语言/价值不能预设共享；观测与假设、协议迭代、可执行约定 |
| 星际迁徙（额外） | `plot-scifi-generation-ship` G:352 | 超个人寿命航程及代际授权；航程资源、各代权责、不可逆决策 |
| AI觉醒（额外） | `plot-scifi-ai-awakening` G:364 | 自主意愿与故障/优化分辨；替代解释、权限链、主体资格和共存条款 |

### 仙侠：6条，用户明确4项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 退婚流 | `plot-jilted-groom-rise` G:376 | 婚约资源/责任解除后建立独立修行；资源账、自立台阶、公开资格 |
| 废柴逆袭 | `plot-trash-awakening-rise` G:388 | 缺陷诊断与替代修行实验；来源证据、突破成本、适用边界 |
| 被选中者 | `plot-xianxia-chosen-one` G:400 | 天命身份的认定授权与责任；资格链、候选者立场、接受/拒绝条件 |
| 睿智老爷爷 | `plot-xianxia-old-mentor` G:412 | 导师不能代打/全知，传授判断方法；知识限制、三次自主行动、独立完成 |
| 渡劫问道（额外） | `plot-xianxia-tribulation` G:424 | 规则化劫难检验原则与实际行为；准备账、差距、考验因果和劫后实践 |
| 宗门博弈（额外） | `plot-xianxia-sect-politics` G:436 | 资源/传承/任命程序与联盟；权力图、分配、承诺及表决记录 |

导师限制写入方法、每次主角行动及终局专项检查，不会通过“导师出手”绕过考验；觉醒亦不允许立即无敌。

### 都市：6条，用户明确4项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 重生创业 | `plot-urban-rebirth-business` G:448 | 记忆折旧与商业假设验证；客户/成本/现金流、市场变化和经营能力 |
| 都市异能 | `plot-urban-superpower` G:460 | 有限制的能力影响普通生活与权益；成本、痕迹、公开选择和责任 |
| 都市职场 | `plot-urban-workplace` G:472 | 项目验收及权责协作；里程碑、绩效冲突、证据与职业选择 |
| 恋爱修罗场 | `plot-urban-romantic-crossfire` G:484 | 同场多方承诺/知情差发生碰撞；义务矩阵、现场升级、称谓重订 |
| 行业救援（额外） | `plot-urban-professional-rescue` G:496 | 现场信息和权限内的团队方案；风险取舍、决策变化、交接和复盘 |
| 社区更新（额外） | `plot-urban-neighborhood-renewal` G:508 | 同一空间多方需求、预算和安置协商；试点反馈、维护及利益地图 |

### 恐怖惊悚：5条，用户明确3项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 禁忌区域 | `plot-horror-forbidden-zone` G:520 | 空间边界/禁止行为/违禁反馈；禁忌证据、后果链和出口方案 |
| 被诅咒群体 | `plot-horror-cursed-group` G:532 | 共同关联、触发传播与责任；知情/关联表、验证链、共同责任 |
| 封闭空间穿越 | `plot-horror-sealed-space-transfer` G:544 | 有限空间整体单次离开原坐标；内外图、资源、返回条件证明 |
| 附身（额外） | `plot-horror-possession` G:556 | 控制权、记忆差和驱离规则；异常验证、扩张链、恢复程度 |
| 心理惊悚（额外） | `plot-horror-psychological` G:568 | 有限感知与可核实事实互相校验；真实/感知/证据三轨及解释排除 |

### 历史：4条，用户明确2项

| 项目 | 实际ID与源行 | 独立方法及专项交付 |
| --- | --- | --- |
| 穿越救亡/逆袭 | `plot-history-transmigration-reform` G:580 | 知识落地须受材料/工艺/财政/组织约束；史实/待核/虚构及分歧线 |
| 复现历史 | `plot-history-reconstruction` G:592 | 真实事件结果固定、当时人物有限知情；事实时序、来源和补写清单 |
| 小人物见证（额外） | `plot-history-ordinary-witness` G:604 | 消息/物资/制度经可追溯渠道影响日常；可见范围、家庭资源和见证场景 |
| 架空变革（额外） | `plot-history-alternate-institutions` G:616 | 明确虚构分歧后试点改革与反馈；参考/待核/架空、执行及监督 |

历史四条都分列史实、待核实和原创/架空补充；复现不改既定历史结果，穿越和架空明确分歧点，小人物不突然左右全部宏观历史。阅读和输出过程中不会把模型建议冒充史料。

## 易混结构与题材交叉边界

| 候选组 | 实际区别与审读结论 |
| --- | --- |
| 环形 / 循环叙事 / 时间循环 | 首尾意义映照 / 行为或代际模式持续向前复现 / 世界内物理时间重置。三条专项输出分别为意象对照、复现矩阵、重置实验；通过。 |
| 起承转合 / Kishōtenketsu | 同属关联四段家族，前者检查事件结果成为后段原因；后者检查两组材料如何通过第三段新视角、第四段联结重新解释。没有把Kishōtenketsu误写成必须无冲突；通过。 |
| 三幕 / 四段 / 五幕 / Freytag / 菲希特 | 三幕检查两幕间门槛；四段细查中点主动权；五幕逐幕出口及第五幕终局；Freytag中央枢纽后的反作用；菲希特连续危机累积晚高潮。理论重叠被承认，操作交付不同；通过。 |
| 英雄 / 作家之旅 | 三大运动与共同体归返意义 / 完整十二阶段及原型场景功能，不重复写同十二点；通过。 |
| 潮汐 / 场景与余波 | 前者宏观多场景峰谷与资源重组，后者一个场景后反应/两难/决定接下一场目标，粒度与交付不同；通过。 |
| 非线性 / 逆时序 / 倒叙推理 | 任意有意义错序 / 主要事件严格晚到早 / 先展示凶手、之后侦探正向证明。各自时间与信息策略不同；通过。 |
| 悬念循环 / 推理 / 恋爱误会循环 | 悬念循环管理读者问题的承诺支付；推理各条恢复并证明事件事实；爱情误会循环管理双方核实行动、信任损害和沟通规则，不能仅反复不说清；通过。 |
| 三角恋 / 同场修罗场 | 两段关系代表长期未来路线 / 同一活动的义务、知情与公开称谓冲突；长期选择表与现场时序表不同；通过。 |
| 找锅 / 嫁祸 / 替死鬼 | 责任链分层 / 有人主动污染证据 / 死亡目标或认定身份错位。替死鬼修改后强制至少一处错位；通过。 |
| 预言 / 被选中者 | 固定预言文本的多方解释 / 授权机构认定身份并分配特权责任；文本矩阵与授权链不同；通过。 |
| 任务 / 旧系统强制任务及快穿圆梦 | 新任务条目以委托验收受影响群体反馈而修约；系统任务以奖惩强迫行动；快穿以跨世界、积分或多个心愿委托的连贯性为核心；通过。 |
| 寻宝 / 旧诸天夺机缘 | 单一目标物的位置线索、历史解释和归属选择 / 跨世界能力与机缘叠加；通过。 |
| 末日求生 / 囤货 / 庇护治理 / 预警 | 灾后生态生产试验 / 灾前储备筹措 / 已有储备的准入分配与申诉 / 证据转为公众共识和行动；起点、因果和交付不同；通过。 |
| 都市重生创业 / 旧年代练摊 / 旧一般重生 | 创业产品试点、记忆折旧和现金流验证 / 年代政策风口、倒货办厂牌照 / 前世记忆使用范围、改命与蝴蝶效应；通过。 |
| 都市异能 / 旧灵气复苏 | 个体能力成本和普通生活权益 / 全民觉醒后官方、财阀、民间秩序洗牌；通过。 |
| 都市职场 / 旧基层升迁 | 项目验收、同事权责及职业取舍 / 公共实事、行政岗位与站队考验；通过。 |
| 禁忌区域 / 旧禁地直播 | 区域边界与违禁反馈 / 镜头传播、观众、平台和场外势力；通过。 |
| 封闭空间穿越 / 旧无限副本 | 单次整体转移、有限资源及返回坐标 / 多世界副本连续通关或积分兑换；通过。 |
| 附身 / 旧驭鬼者 | 外来控制侵入导致自主权争夺 / 主动借鬼之力并承受反噬；谁发起使用、控制条件与终局目标不同；通过。 |
| 心理惊悚 / 不可靠叙述 | 主角主动校验所处威胁、恢复安全与自主 / 叙述文本有稳定偏差，外部证据重建版本；三轨事实表与叙述修订表不同；通过。 |

## 旧90条剧情的强同义复核与修订关闭

本轮逐条输出旧90的最终正文；对共用方法工厂的条目实际读取其保留下来的问题与新增交付物，没有把公共合同视作专门方法。以下追加5项是内容审核发现，不是字面重复测试发现。

| 必修ID及原重叠对象 | 修订后真实机制与源证据 | 复核 |
| --- | --- | --- |
| `plot-underdog-climb` / `plot-step-ladder-ascension` | `curation.ts:57`：资格审查、信用证据、担保条件、排他准入；七步链和三次准入决策。旧条仍为战力等级/强敌/大地图。 | 已关闭 |
| `plot-revenge-she-returns` / `plot-revenge-long-game` | `curation.ts:73`：被剥夺权利、证据、自愿受害者联盟、公布与返还验收；旧条为蛰伏后按仇人名单清算。 | 已关闭 |
| `plot-mocked-waste-hidden-edge` / `plot-big-shot-pretends-nobody` | `curation.ts:9`：秘密实力服务潜伏任务，掩护可信证据、暴露预算、同伴保护、撤离条件；旧条为藏身份亮实力后态度反转。 | 已关闭 |
| `plot-power-broker-behind` / `plot-court-grand-game` | `curation.ts:25`：无公职中介、信息分发、承诺互锁、代理人独立诉求及履约反噬；旧条为朝堂差事、权力中心和派系倒戈。 | 已关闭 |
| `plot-book-villain-self-rescue` / `plot-book-cannon-fodder-live` | `curation.ts:41`：接管反派位置后停止持续损害、撤命令、返还补偿、受损者边界和旧阵营阻力；旧条为躲死亡旗、剧情修正力和炮灰逃生。 | 已关闭 |

新增修订亦与重点库交叉：潜伏任务没有复制废柴逆袭的缺陷诊断/替代修行；恢复性追偿由受害者推动，隐退者追责由历史责任方承担；反派返还处理仍生效命令和正在控制的资源，隐退者追责核验旧伤害/旧证据后公开承担。这些机制没有再退化为同一模板换称谓。

基线已发现的修订逐项关闭：多身份义务冲突/层层掉马（`curation.ts:89`）、旧身份追责/隐藏大佬（`:104`）、非武力日常协商/归隐后露手（`:119`）、灾后分配治理/灾前扫货（`:134`）、公众证据预警/个人囤货（`:149`）、军职家庭双时间表/一般追悔（`:164`）、领地财政/新城工程建设（`:179`）。一般三幕旧重复由重点库中的 `plot-generic-mainline` 改为场景与余波。

其余重点旧候选具有可解释差异，保留：

- `plot-second-life-foresight` 问记忆可用期限和蝴蝶效应；`plot-rebirth-her-new-path` 问拒绝旧关系、旧人纠缠及事业/家庭/良配重新排序，分别为预测优势和关系选择。
- `plot-linked-cases-truth` 组织跨案连接和误导；`plot-cold-case-taskforce` 组织旧案重启、证人改口/物证缺失及翻案阻力；`plot-case-files-anthology` 保证各案独立人情主题再埋总线。
- `plot-rebuild-fallen-house` 接管坏摊子并清人还债立规矩；`plot-merchant-mistress-rise` 从新买卖挣钱，在家族/婚姻约束下扩张；`plot-small-shop-to-top` 通过招牌产品、经营危机及连锁/上下游组织经营。
- `plot-face-slapping-banquet` 是一次聚会的忍/证/反击；`plot-face-slapping-ladder` 是不同层级对手的累进亮牌；空间与时间粒度及推进检查不同。
- `plot-palace-step-by-step` 初入宫晋升；`plot-cold-palace-comeback` 旧案构陷后的翻案复位；`plot-palace-slacker-consort` 回避争宠却弄巧成拙，不能只按共享宫廷母题判重复。
- `plot-quick-transmigration-tasks` 以系统积分和回家条件组织跨世界；`plot-cannon-fodder-counterattack` 以受托炮灰执念、原剧情翻盘和各世界感情取舍组织；`plot-quick-transmigration-wishmaker` 以自愿委托、报价与订单翻车组织。共享跨世界场景而目标约束不同。
- `plot-stranger-in-new-world` 以外来技能在陌生社会变现、进入时代事件；`plot-transmigrate-survive-first` 以承接原身债务麻烦、先求生再安排事业/感情组织。接管责任与外来技能分别是关键输入。
- 静地签到的拘束与外界多年变化、游历签到的空间风险、都市签到的财富暴露分别造成不同主线；规则怪谈的真假辨认、主动破规、绑定国运、母亲保护守则也分别有规则验证、追捕、公共代价和亲情信息目标。

## 主题、世界观、角色与29条服务

11项非剧情curation已审读最终正文：两种价值抉择（`:205`）、观众怪谈主题（`:218`）、囤积/公平主题（`:231`）、重生信息伦理（`:244`）、武道资格公平主题（`:257`）、诸天龙套叙述权（`:270`）、空间动线（`:283`）、雾都管网污染（`:296`）、八零地方流通（`:309`）、慢生活生活规则（`:322`）、长公主权力人物档案（`:335`）。主题输出价值/受众/情绪，世界观输出运行规则，角色输出人物驱动和关系限制；即使共享母题，与剧情事件表也不重复。

原库仍可保留相同母题的多类别入口。慢生活主题与生活规则、长公主题材与权力人物档案现在连标题也分别表明任务，但内容合格的理由是任务差异，而非只改标题。

29服务的标准化正文与471向导联合检查重复为0，变量声明与隔离替换检查为0。人工复核服务高相似候选的结论沿用并确认基线证据：世界观评审/单条设定评审对象不同；角色和设定快速辅助/SOP简报反馈迭代输入与输出不同；整书volumes大纲/单卷带index大纲不同；评论直接改写/先判动作并回复不同；正文评审/试验场一致性门控不同。详细键、源行与调用路径见 `00-corpus-audit.md` 第4节。

## 审核边界

本文证明本轮提示词的内容、结构、覆盖和语义区分已独立审读，记录了实际最终正文以及问题修订。数量、唯一性和合同检查均为本目标定向数据检查。真实本地入库、升级、筛选、拼贴、React点击、Electron离线重启和相关用例结果由对应测试/目标验证报告另证；没有据本文声称真实供应商生成或所有模型创作质量通过。
