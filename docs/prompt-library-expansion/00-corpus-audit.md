# 提示词模板库扩充：独立基线审查

日期：2026-10-14（Asia/Shanghai）。审查人：独立子代理 `corpus_audit`。此文记录扩充实施前的真实源文件基线；仅修改本文，未修改产品、用例或其他人的工作，未运行全流测试。

## 1. 范围与判定方法

读取 `src/lib/creation-wizard/templates/*.ts`、`taxonomy.ts`、`filter.ts`、`compose.ts`，补查 `prisma/seed-templates.ts`、`src/lib/prompts/render.ts`、`variables.ts` 及对应调用处。

去重分为四层：稳定标识唯一；完整提示词唯一；NFKC、去向导标题、空白与标点后的正文唯一；实际任务机制和输出目标是否重复。中文二元字符 Dice 相似度仅排序人工复核候选，不能作为语义是否重复的唯一结论。共用题材、提示词格式、JSON字段或写作纪律不等于重复；仅换名字、性别、倒计时或年代而仍要求相同任务链，则需要机制区分。

## 2. 实际命令与结果

工作目录为 `D:\Projects\shakeink-desktop`，审查脚本从 PowerShell stdin 执行，不创建脚本文件，不访问模型、数据库或真实用户资料。环境命令 `node` 当时为 Node.js v20.12.2；本次只做数据加载和文本分析，不据此声明桌面目标运行时通过。

### 2.1 430条模板的数量与标准化重复

```powershell
@'
require('tsx/cjs');
const { WIZARD_TEMPLATES: wizard } = require('./src/lib/creation-wizard/templates/index.ts');
const { PROMPT_TEMPLATES: service } = require('./prisma/seed-templates.ts');
const all = [
  ...wizard.map(t => ({ id: t.id, title: t.title, content: t.prompt })),
  ...service.map(t => ({ id: t.key, title: t.name, content: t.content })),
];
const duplicates = key => Object.entries(all.reduce((groups, t) => {
  (groups[key(t)] ??= []).push(t.id);
  return groups;
}, {})).filter(([, ids]) => ids.length > 1).map(([, ids]) => ids);
const normalize = t => t.content.normalize('NFKC')
  .replace(/^【[^】]+】[^\n]+\n+/, '')
  .replace(/[\s\p{P}]/gu, '');
console.log(JSON.stringify({
  wizard: wizard.length, service: service.length, total: all.length,
  categories: wizard.reduce((result, t) => {
    result[t.cat] = (result[t.cat] ?? 0) + 1;
    return result;
  }, {}),
  ids: duplicates(t => t.id), raw: duplicates(t => t.content),
  normalized: duplicates(normalize), titles: duplicates(t => t.title),
}, null, 2));
'@ | node
```

命令退出码 0，实际结果：创作向导 401 条（theme 120 / world 122 / character 69 / plot 90），服务 29 条，总计 430 条；ID、完整正文、标准化正文的重复组均为 0。标题重复组为以下三组：

- `theme-light-slowlife` / `world-isekai-slow-life`：异世界慢生活。
- `theme-court-princess` / `character-eldest-princess-court`：长公主临朝。
- `plot-three-act-skeleton` / `plot-generic-mainline`：三幕主线骨架。

前两组跨类别目标不同，可以保留；第三组同类别同任务，必须修订。上述字符串唯一结果不代表实质近重复已经消除。

### 2.2 创作向导结构和本地组合

以 `WIZARD_CHANNELS`、`WIZARD_GENRE_UNION`、`WIZARD_LENGTHS`、`WIZARD_TAG_GROUP_VOCABS` 检查现有401条数据，并逐条执行 `composeWizardDraft(DEFAULT_FILTERS, 仅选本条模板)`：频道/题材/标签/篇幅词表违规 0，必填字段缺失 0，prompt丢失或草稿含 `undefined` 的失败 0，命令退出码 0。

```powershell
@'
require('tsx/cjs');
const { WIZARD_TEMPLATES: templates } = require('./src/lib/creation-wizard/templates/index.ts');
const taxonomy = require('./src/lib/creation-wizard/taxonomy.ts');
const { composeWizardDraft } = require('./src/lib/creation-wizard/compose.ts');
const { DEFAULT_FILTERS } = require('./src/lib/creation-wizard/filter.ts');
const tags = new Set(Object.values(taxonomy.WIZARD_TAG_GROUP_VOCABS).flat());
const invalid = templates.filter(t =>
  t.channels.some(v => !taxonomy.WIZARD_CHANNELS.includes(v)) ||
  t.genres.some(v => !taxonomy.WIZARD_GENRE_UNION.includes(v)) ||
  t.tags.some(v => !tags.has(v)) ||
  (t.lengths ?? []).some(v => !taxonomy.WIZARD_LENGTHS.includes(v)));
const missing = templates.filter(t => !t.id || !t.title || !t.summary || !t.prompt?.trim());
const failures = templates.filter(t => {
  const picks = { theme: null, world: null, character: null, plot: null };
  picks[t.cat] = t;
  const draft = composeWizardDraft(DEFAULT_FILTERS, picks);
  return !draft.includes(t.prompt) || draft.includes('undefined');
});
console.log(JSON.stringify({ invalid: invalid.length, missing: missing.length, failures: failures.length }));
'@ | node
```

这只证明本地数据与组合函数可执行，未执行真实供应商推理，不能标为模型生成成功。

### 2.3 服务变量声明与替换语义

`prisma/seed-templates.ts` 中的 `{{变量}}` 是服务模板声明，尚未绑定为用户输入的完整提示词；不能把声明中的占位符直接判为运行失败。真实生产渲染位于 `src/lib/prompts/render.ts:34`：加载已启用模板，以 `PROMPT_VARIABLE_PATTERN` 替换调用方提供的字符串；缺失变量时收集名称并抛错。公共语法位于 `src/lib/prompts/variables.ts:6`。

审查命令使用生产正则与相同替换语义，对29条模板每个已声明变量填入 `〔隔离值:变量名〕`，结果：正文使用却未声明的变量 0，声明却未使用的变量 0，替换后残留占位符或隔离值未进入结果的失败 0，退出码 0。

```powershell
@'
require('tsx/cjs');
const { PROMPT_TEMPLATES: templates } = require('./prisma/seed-templates.ts');
const { PROMPT_VARIABLE_PATTERN: pattern } = require('./src/lib/prompts/variables.ts');
const declarationIssues = [];
const substitutionIssues = [];
for (const t of templates) {
  const used = [...new Set([...t.content.matchAll(pattern)].map(match => match[1]))];
  const undeclared = used.filter(v => !t.variables.includes(v));
  const unused = t.variables.filter(v => !used.includes(v));
  if (undeclared.length || unused.length) declarationIssues.push({ key: t.key, undeclared, unused });
  const vars = Object.fromEntries(t.variables.map(v => [v, `〔隔离值:${v}〕`]));
  const rendered = t.content.replace(pattern, (_, name) => vars[name]);
  pattern.lastIndex = 0;
  if (pattern.test(rendered) || !t.variables.every(v => rendered.includes(vars[v]))) substitutionIssues.push(t.key);
  pattern.lastIndex = 0;
}
console.log(JSON.stringify({ count: templates.length, declarationIssues, substitutionIssues }, null, 2));
'@ | node
```

上述是生产语法的替换重放，未运行带数据库加载的 `renderPrompt`，也未执行完整服务或外部模型；真实运行通过需要本次相关测试另证。

## 3. 最小机制修订清单

以下行号绑定本次扩充前基线。均建议保留ID，并同步改写标题、摘要、正文，让用户能理解实际差异。

| 保留并修订的ID | 重叠对象与基线源路径 | 修订后的独立任务机制 |
| --- | --- | --- |
| `plot-generic-mainline` | `plot-three-act-skeleton`；`templates/plot-b.ts:49` / `plot-a.ts:39`，同名同三幕任务 | 因果链主线：目标→决定→后果→后果引发的新决定 |
| `plot-her-masks-drop` | `plot-identities-falling-off`；`plot-b.ts:20` / `plot-a.ts:35`，多个身份逐层曝光 | 多个身份的义务冲突、泄露源与保密代价 |
| `plot-hidden-big-shot` | `plot-big-shot-pretends-nobody`、`plot-invincible-quiet-life`；`plot-b.ts:21` / `plot-a.ts:34`、`:7`，隐藏强者被迫露手 | 旧身份追责、暴露证据、主动承担责任 |
| `plot-invincible-quiet-life` | 同上三条组 | 武力无法解决的日常关系难题；撤去三次出手和身份曝光主链 |
| `plot-hoard-apocalypse` | `plot-stockpile-before-apocalypse`；`plot-b.ts:38` / `plot-a.ts:36`，预警→筹钱囤货→安全屋→人心 | 满仓之后的物资分配、准入规则与庇护治理 |
| `plot-hoard-cold-warning` | 同上囤货组；`plot-b.ts:39` | 证据预警、公众不信、集体准备失败的因果 |
| `plot-chase-wife-1980s-military` | `plot-chase-wife-too-late`；`plot-b.ts:47` / `:22`，心死离开→追悔→复合/分离 | 军职安排与共同生活的双时间表、信任修复、边界协商 |
| `plot-lord-ledger` | `plot-build-city-from-waste`；`plot-b.ts:36` / `:14`，穷领地盘点、建设顺序、外部压力 | 财政赤字、预算取舍、债务期限和税负反馈 |
| `theme-general-spark` | `theme-free-brainstorm`；`theme-b.ts:50` / `theme-a.ts:48`，灵感、受众、题材、作品口味 | 主题价值抉择：两种合理价值的冲突与结局表达 |
| `world-from-a-scene` | `world-free-brainstorm`；`world-b.ts:56` / `world-a.ts:60`，画面、特别规则、氛围 | 从画面推导空间地图、感官细节、动线、可见信息 |
| `world-steam-cthulhu` | `world-steampunk-cthulhu`；`world-b.ts:52` / `world-a.ts:47`，蒸汽工业、旧神信仰、理智腐蚀、雾都质感 | 管网与能源规则、污染传播、城市供给、治理制度 |
| `world-rebirth-80s-business` | `world-reborn-1980s`；`world-b.ts:55` / `world-a.ts:48`，票证经济、政策机遇、市井年代感 | 地方市场网络、跨区运输、配额、票据规则 |
| `theme-fusion-rules-infinite` | `theme-infinite-rules`；`theme-b.ts:54` / `theme-a.ts:46`，怪谈×无限流、规则智斗 | 观众参与、押注或传播如何共同改变游戏 |
| `theme-fusion-apocalypse-hoard` | `theme-apocalypse-stockpile`；`theme-b.ts:56` / `theme-a.ts:33`，先知囤货、安全感 | 囤积安全与分配公平的主题矛盾 |
| `theme-fusion-80s-business` | `theme-era-business`；`theme-b.ts:55` / `theme-a.ts:45`，八零经商、时代红利、白手起家 | 重生信息优势的伦理代价与时代改变后的失效 |

本表中的 `templates/` 路径均从 `src/lib/creation-wizard/` 解析，其余模板文件简写均位于 `src/lib/creation-wizard/templates/`。不是删除整个套路家族，而是让每条现有模板提供独立任务。

两组已有区分雏形，宜进一步强化：`theme-fusion-urban-martial` 的身份/资源制度，与 `theme-urban-high-martial` 的战斗成长；`theme-fusion-multiverse-extra` 的龙套视角，与 `theme-multiverse-roam` 的改写名场面。字面相似度不能决定这些条目的去留。

## 4. 跨类别同名与29条服务模板

`theme-light-slowlife` 用于确定主题、读者与情绪；`world-isekai-slow-life` 用于搭建小镇、药铺与公会规则。`theme-court-princess` 用于定位女频权谋题材；`character-eldest-princess-court` 用于构建主角权力、对手与保护对象。这两组跨类别同名不是同义模板。

对430条联合语料，未发现服务正文与创作向导正文完全/标准化重复。向导模板是作者对话中的创意引导，服务模板承担生成、评审、修订、图片提示词或情景推演并约定输出协议，不能仅因都谈角色/世界观就合并。

服务内部较高字面相似度候选经人工核对后，存在具体目标或协议差异，本次不判为需删除的同义模板：

| 服务候选 | 实际差异和证据 |
| --- | --- |
| `agent.judge.world` / `agent.judge.setting`（二元字符Dice 0.700） | 前者评世界观自洽、可写性与主题咬合，后者评单条设定的等级/代价/边界和类型完整性。`prisma/seed-templates.ts:608`、`:661`；同JSON壳不等于同审查对象。 |
| `character.assist` / `agent.playwright.character`（0.610） | 前者是角色辅助入口，输入roleType/userHint并可输出阶段弧线arcStages；后者接世界观/完整阵容/创作简报/上一轮反馈，返回问题列表供作者拍板，服务于SOP迭代。`seed-templates.ts:258`、`:457`；调用证据 `desktop/handlers/novels/[id]/characters/assist/route.ts:46`、`src/lib/sop/agents.ts:240`。 |
| `outline.generate` / `agent.playwright.outline`（0.435） | 前者按明确卷数、每卷章数生成整书volumes数组；后者按brief生成单卷，含卷内index、反馈修订及questions。`seed-templates.ts:14`、`:565`；调用证据 `src/lib/services/outline.ts:82`、`src/lib/sop/agents.ts:252`。 |
| `setting.assist` / `agent.playwright.setting`（0.412） | 前者按选定settingType辅助生成；后者根据brief/feedback生成带type/name/content的条目、世界和地图归属及questions。`seed-templates.ts:234`、`:520`；调用证据 `desktop/handlers/novels/[id]/settings/assist/route.ts:65`、`src/lib/sop/agents.ts:246`。 |
| `comment.apply` / `comment.improve`（0.404） | 前者接受已决定执行的评论改写，后者先判MODIFY/AGREE/REJECT并给reply；工作流动作不同。`seed-templates.ts:184`、`:207`。 |
| `review.chapter` / `scenario.check`（0.307） | 前者是正文多维评分、摘录评论及伏笔触点评估；后者是情景试验场内容与作者既定事实的一致性门控，输出ok/score/issues。`seed-templates.ts:125`、`:836`。 |

字符图像与封面图像模板的输出对象不同；world/character/cast/whole四类评审各有对象与检查层级；scenario actor/director/organize/prose分别执行单角扮演、结果裁定、分镜整理、样文写作。其共同纪律是业务契约复用，不能用高相似度阈值一律判重复。

## 5. 新结构的语义区分边界

起承转合与“基肖滕弧”属于关联的四段结构家族；Kishōtenketsu宜标作起承转结。前者模板可输出事件推进，后者模板必须突出第三段看似脱节的新视角、第四段重新联结意义，不声称必须没有冲突。[Richard Anatone的一手研究](https://online.ucpress.edu/jsmg/article/4/4/15/197773/Kishotenketsu-as-LeitmotifStorytelling-and-Musical)的Kishōtenketsu节支持此区分。

英雄之旅可按Campbell的离开、启蒙、归返组织整体转变；作家之旅针对Vogler的阶段与角色原型映射场景功能，避免两条使用同一套十二阶段。[Campbell基金会](https://www.jcf.org/product-page/copy-of-on-bliss-ebook)支持三阶段总弧；Vogler官网指定页面在本次工具中不可达，十二阶段的准确名称由研究文档其他可核实来源提供，不将不可达标为已读取。

五幕式与Freytag存在关联，不能编造为互不相关的理论。五幕模板输出每幕目标、危机与不可逆转承接；Freytag模板输出中央高潮、下降与灾变的张力变化。[Freytag原著译文](https://www.briantriber.com/WritingSamples/Freytag_Drama/Freytag_11_Ch2_P2.html)支持五部分与高潮的结构位置。

环形模板检查首尾意象与意义映照；循环叙事检查行为、历史或代际重复及变体，不必发生物理重置；科幻时间循环检查时段复位、记忆保留、重置触发和退出条件。这是本产品为防重复而设置的操作边界，不声称所有理论文献统一使用此术语分法。

基线未发现上述争议结构的对应剧情模板。`world-rule-hospital` 仅在世界观字段出现“医院的空间禁区与时间循环”，不足以计入本次科幻时间循环剧情覆盖。

## 6. 实施建议与证据限制

保持稳定ID，修订重复条目的实际机制，新增剧情模板使用现有题材与标签词表。现有 `taxonomy.ts`、`filter.ts`、`compose.ts` 不需要为模板扩充重写；增加未登记的题材/标签会破坏分类覆盖。

实施后必须重新执行本次相关数量、ID、标题、标准化正文、变量、筛选和草稿组合检查，并独立复核每条机制。本文记录的是基线发现与修订建议，不能替代新增模板的最终审核、相关测试或真实模型结果；不据字符串唯一声称消除了全部语义近重复。
