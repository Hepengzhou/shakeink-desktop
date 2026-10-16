# 正文抽卡卡片点击修复技术方案

日期：2026-10-16（Asia/Shanghai）。前置产物：`2026-10-16-candidate-card-click-research.md`。

## 目标行为（新规则，以后者为准）

对「`[data-text-preview]` 位于可交互/可拖卡片内」的命中场景（`installTextPreviewSelection` 现有门控不变）：

| 手势 | 旧行为 | 新行为 |
| --- | --- | --- |
| 普通单击 preview（无位移、非 Shift、单击序列第一击） | 吞掉，无任何效果 | **放行**，触发卡片自然动作（抽卡=选中+开 Tab，立即无延迟） |
| 拖选后释放（mousedown→click 位移超阈值） | 吞掉 | 吞掉（不变） |
| 双击/三击选取词/段落 | 两次 click 与 dblclick 全吞 | **第一次 click 放行**（卡片动作一次）；第二/三击 click（`detail>=2`）与 dblclick 事件仍吞；原生词/段选区保持 |
| Shift+单击（扩展选区手势） | 吞掉 | 吞掉（不变；但建立锚点的上一次普通单击会按上行放行触发一次动作，见折衷） |
| 单击落在既有选区上 | 吞掉（仅折叠选区） | 放行：选区折叠且触发卡片动作（新规则自然推论，非回归） |
| 卡片非 preview 区域（徽标/字数/留白） | 正常触发 | 不变 |
| preview 内真实控件/链接/输入 | 放行（现有 bypass） | 不变 |
| 独立 preview（不在可交互卡片内，如 Markdown 评论选区） | 不拦截 | 不变 |

已知且接受的折衷（调研文档 §新约束与旧规则的冲突点；禁止延迟 ⇒ 无法把双击/Shift+单击的第一击与单击区分开）：

- 双击摘录将必然触发一次卡片动作（由序列中第一次 click 触发），旧规则「双击 preview 不开 Tab」的断言作废。
- 词选区在双击下能否建立因卡而异，如实记录：只有**抽卡卡片**（对话区，点击后卡片保持可见，Tab 开在内容区）双击词选区保持可用。**Scene/Character/Item** 卡位于内容区 tab 内，真实产品中点击即切换 activeTabId、非激活 tabpanel 被 `ContentTabs` 隐藏，第二击落在切换后的新 tab 上，词选区无法建立；**Level** 卡点击即卸载为编辑器，同理。后四类卡的双击词选能力较旧规则丧失，拖选建立选区不受影响。对应测试断言不得用夹具行为冒充真实：fixture 直挂组件无 tab 切换隐藏，scene/character/item 的双击用例只锁定适配器机制（动作恰好一次），词选区断言仅 candidate 卡代表真实产品行为。
- Shift+单击建立选区前用于设锚点的上一次普通单击会触发一次卡片动作，与双击首击同类。

## 实现（`src/lib/desktop/text-selection.ts`，唯一改动文件）

1. 新增模块内常量与状态：
   - `DRAG_THRESHOLD_PX = 4`（对齐 Windows `SM_CXDRAG/SM_CYDRAG` 默认拖动迟滞；手抖级位移 ≤3px 仍视为单击，保持「点击必中」的宽容性）。
   - `let downAt: { x: number; y: number } | null = null`。
2. 现有捕获 `down` 处理器开头记录左键按下坐标：`downAt = event.button === 0 ? { x: event.clientX, y: event.clientY } : null`（在 `button!==0` 早退之前赋值；右键/中键按下清空，避免陈旧坐标）。原 draggable 暂停/恢复逻辑不变。
3. 现有捕获 `click` 处理器在门控（preview 且祖先可交互/可拖）之后、拦截之前插入放行判定：

   ```ts
   if (event.type === 'click') {
     const moved = downAt !== null &&
       (Math.abs(event.clientX - downAt.x) > DRAG_THRESHOLD_PX || Math.abs(event.clientY - downAt.y) > DRAG_THRESHOLD_PX)
     // 普通单击不是选取手势：保留卡片的自然动作；选取手势继续隔离。
     if (event.detail === 0 || (event.detail === 1 && !event.shiftKey && !moved)) return
     event.preventDefault()
   }
   event.stopPropagation()
   ```

   - `event.detail === 0`：键盘/程序化合成 click 恒放行，且不依赖 `downAt`（合成 click 坐标为 0/0，陈旧 `downAt` 不得误吞）。
   - `event.detail === 1`：放行单击序列第一击；吞第二/三击（`detail >= 2`），保证双击只触发一次卡片动作（对 role=checkbox 等避免一次双击切换两次）。快速连点（间隔小于系统双击时间）第二击被吞：抽卡卡 openTab/selectCard 幂等无感；checkbox 净切换一次为期望语义。
   - `event.shiftKey`：Shift+单击是扩展选区手势，继续隔离。
   - `moved`：拖选释放产生的 click 继续隔离；阈值内微动视为单击放行。
   - dblclick 事件维持原状（stopPropagation，不 preventDefault）。
4. 更新文件头与 `click` 处注释，说明「仅隔离选取手势，普通单击放行」的新契约。

不采用选区状态（`getSelection().isCollapsed`）作为判定依据：单击落在既有选区上时浏览器折叠时机属于实现细节，一旦时机不同会重新吞掉普通单击，违背「点击必中、无延迟」；位移+修饰键+detail 是确定性判定。

不改 `CandidateDrawCard.tsx`（卡片 onClick 本就同步选中+开 Tab）、不改 CSS、不改挂载点、不引入依赖。

## 测试基线更新（`tests/browser/text-selection-cards.test.ts`）

按新规则改写旧断言并新增用例，详见测试用例文档：

- 新增：5 类卡片 × 2 主题——普通单击 preview 第一行文字 → 卡片动作立即触发（抽卡断言候选 Tab 激活+`useCardSelection` 选中该卡+`aria-pressed=true`（zustand 重渲染经 `waitForFunction` 等待，避免时序闪烁）；其余卡断言各自既有动作），卡片级冒泡计数器（捕获被吞的点击到不了卡片冒泡监听器）计数恰好 1 次。
- 新增：抽卡卡 Shift+单击隔离（落点锁定行中点，避免与拖选锚点重合）；≤4px 微动单击放行（阈值语义）；拖选释放（吞）后紧接普通单击（放行）的序列用例，锁定 `downAt` 每次 mousedown 刷新、无跨手势污染；`detail===0` 程序化合成 click 恒放行（不被陈旧 `downAt` 误吞）。
- 改写：双击 preview → 卡片动作恰好一次（旧断言 active===null 作废）；词选区断言仅 candidate 卡代表真实产品行为，scene/character/item 处注明 fixture 直挂组件无 tab 切换隐藏、只锁适配器机制，Level 卡点击即卸载不断言词选区。
- 改写：无位移按下+松开 → 视为普通单击触发动作（旧断言 active===null 作废）；拖选系列断言不变。
- 改写：planning/checkbox/label 边界用例按「普通单击触发一次、双击净触发一次」更新计数。

执行范围遵守用户 2026-10-16 本次任务的明确批准：「禁止全量测试，仅针对本次修复的问题进行测试」（输出与验收标准两处重申）。故只跑 `tests/browser/text-selection-cards.test.ts`（唯一直接锁定被改适配器行为的套件）；AGENTS.md 的全量回归门槛本轮由该明确指令缩减。`tests/browser/text-selection.test.ts` 已核实不受影响（2026-10-16 复读其 bundle stdin 第 16-38 行：未 import/挂载 `installTextPreviewSelection`，纯 CSS/user-select 策略套件；L76 的 `#card > #excerpt` 夹具仅用于拖选与样式断言，无点击行为依赖），不作为本次必跑。

## 顺序与验收

TDD：先改测试并运行确认新用例红灯 → 实现 → 同一套件转绿 → 独立代码审核 → 更新 `docs/requirements-traceability.json` 台账与证据 → 总结。测试沿用既有隔离合成数据与 `SHAKEINK_TEST_CHROMIUM` 真实 Chrome、Node 24 运行方式，证据保存至 `docs/evidence/text-selection/`。
