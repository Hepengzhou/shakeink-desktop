# 正文抽卡卡片点击修复测试用例

日期：2026-10-16（Asia/Shanghai）。前置产物：`2026-10-16-candidate-card-click-research.md`、`2026-10-16-candidate-card-click-plan.md`（已通过独立方案审核并修订）。

范围遵守用户本次明确批准：禁止全量测试，仅针对本次修复。唯一执行套件 `tests/browser/text-selection-cards.test.ts`（真实 React 组件+真实产品 CSS+真实 `installTextPreviewSelection`，隔离合成数据，Node 24 + `SHAKEINK_TEST_CHROMIUM` 真实 Chrome）。`tests/browser/text-selection.test.ts` 已核实不加载该适配器，不受影响，不执行。

## 夹具改动（非产品代码）

1. bundle 增 import `useCardSelection`，`cardsFixture` 增 `selection: () => useCardSelection.getState().selection`（断言抽卡选中态）。
2. 测试内新增辅助 `countCardClicks(page, cardSelector)`：在卡片元素上挂**冒泡** click 计数器（`window.__cardClicks`）。捕获阶段被 stopPropagation 的点击永远到不了卡片冒泡监听器，故该计数器精确等于「放行并触发卡片动作的点击次数」。

## 新增用例

### CC-N1（5 类卡片 × paper/ink 共 10 例）：普通单击 preview 立即触发卡片动作

步骤：`countCardClicks` 挂到 `selectors[kind].card` → `clearSelection` → 对 `selectors[kind].content` 第一行文字坐标单次 `mouse.click`。

断言：
- `__cardClicks === 1`（恰好一次，无延迟）。
- 动作结果：candidate → `active()` 含 `chapter-candidate`，`selection().candidateId === 'isolated-candidate'` 且 `chapterId === 'isolated-chapter'`，`waitForFunction` 等待卡片 `aria-pressed === 'true'`；scene/character/item → `active()` 真值（沿用既有 UI 铬区用例的动作断言口径）；level → 卡片 count 为 0（点击开详情为既有行为）。
- `getSelection().toString() === ''`（普通单击不产生文本选区）。
- 页面无 pageerror、无网络请求（scenario 既有断言）。

### CC-N2（candidate，paper）：Shift+单击 preview 保持隔离

步骤：挂计数器 → `dragText` 先拖选建立选区（断言 `active === null`、`__cardClicks === 0`；选区锚点在行首 `box.x + 1`）→ `keyboard.down('Shift')` + `mouse.click` + `keyboard.up('Shift')`，**落点锁定为 `box.x + min(60, box.width / 2)` 行中点**（远离锚点，避免落点与锚点重合导致选区折叠的歧义）。

断言：`__cardClicks === 0`；`active() === null`；`getSelection().toString()` 匹配 `/Candidate/`（选区自锚点延伸至落点，手势未被破坏）。

### CC-N3（candidate，paper）：≤4px 微动的单击放行（阈值语义）

步骤：挂计数器 → `clearSelection` → 第一行文字坐标 `mouse.down` → `mouse.move(+3,+2)`（2 步）→ `mouse.up`。

断言：`__cardClicks === 1`；`active()` 含 `chapter-candidate`；`selection().candidateId === 'isolated-candidate'`；选区长度 ≤1（实测 12px 字号下 +3px 微动原生选中 1 个字形 `'n'`，无害、下一次单击即折叠；非跨字符选区，单击语义完整）。

### CC-N4（candidate，paper）：拖选释放（吞）后紧接普通单击（放行）——`downAt` 逐次刷新

步骤：挂计数器 → `dragText`（180px，断言选到原文、`active === null`、计数 0）→ 同区域普通单击。

断言：单击后 `__cardClicks === 1`；`active()` 含 `chapter-candidate`；`selection().candidateId === 'isolated-candidate'`；单击后 `getSelection().toString() === ''`（拖选选区被普通单击折叠）。

### CC-N5（candidate，paper）：`detail === 0` 合成 click 恒放行

步骤：挂计数器 → `clearSelection` → `page.evaluate` 对摘录 `<p>` 执行 `element.click()`（程序化合成 click，`detail=0`、坐标 0/0，无前置 mousedown）。

断言：`__cardClicks === 1`；`active()` 含 `chapter-candidate`；`selection().candidateId === 'isolated-candidate'`。锁定键盘/辅助技术/程序化激活不被陈旧 `downAt` 误吞。

## 改写用例（旧规则断言作废，按新规则重写）

### CC-R1（5 类卡片 × 2 主题，原 L163-169 双击用例）：双击 preview 恰好触发一次卡片动作

步骤：挂计数器 → `doubleClickText`。

断言：`__cardClicks === 1`（第一击放行，第二击 detail=2 与 dblclick 事件被吞）；level → 卡片 count 0，其余 → `active()` 真值。
词选区断言：**仅 candidate** 断言 `text` 匹配原文单词（真实产品中对话区卡片保持可见，双击词选区可用）；scene/character/item 不断言词选区并注明原因（真实产品点击即切换 tab 隐藏卡片，fixture 直挂组件无此隐藏，词选区不可作为真实行为断言）；level 点击即卸载，不断言词选区。

### CC-R2（scene/character/item/level 4 例，原 L222-227）：按下暂停 draggable，无位移松开视为普通单击

保留：`mousedown` 后卡片 `draggable === 'false'`（四例均断言，卸载前可观察）。
改写：无位移松开即普通单击放行——scene/character/item 卡片不卸载，断言 `waitForFunction` 恢复 `draggable === 'true'` 且 `active()` 真值；**level 点击即卸载，不断言恢复**（`release()` 的 `setTimeout(restore, 0)` 在 click 派发完毕后运行，恢复写在已卸载的游离节点上，`document.querySelector` 永远查不到，断言必超时），且 level 卡点击为就地展开详情、不开 Tab，故仅断言卡片 count 0（原四例 `active === null` 断言全部作废）。

### CC-R3（planning 边界，原 L278-294）

- 无位移按下+松开：`actions.planning === 1`（原 0 作废），期间 `draggable` 暂停断言保留。
- 随后 `doubleClickText`：`/Planning/` 词选区保持（合成 article 不卸载，锁适配器不阻断原生选区）；`actions.planning === 2`（双击净触发一次）。注：真实 Planning 卡在 preview 上的 dblclick 编辑动作新旧规则下均不可达（旧规则全吞、新规则吞 `detail>=2` 与 dblclick 事件），「净触发一次」仅指 click 计数，不得误读为 dblclick 编辑被触发。
- 内嵌真实控件点击：`planningControl === 1` 且 `planning` 仍为 2（bypass 不变）。
- 铬区点击：`planning === 3`。

### CC-R4（checkbox 边界，原 L296-306）

- 拖选：`actions.checkbox === 0`（不变）。
- 双击：`actions.checkbox === 1`（净切换一次；原 0 作废）。
- 内嵌真实控件：`checkboxControl === 1` 且外层仍为 1。
- 铬区点击：`checkbox === 2`。

### CC-R5（label 边界，原 L308-321）

- 拖选：input 未勾选、`actions.label === 0`（不变）。
- 双击：input 勾选一次、`actions.label === 1`（第一击放行触发 label 原生关联激活，第二击 preventDefault 阻止二次激活；原 0 作废）。
- 直接点击真实 input：勾选翻转、`label === 2`。
- 铬区点击：再次翻转、`label === 3`。

## 保持不变的用例（回归护栏）

- 拖选系列（原 L153-161，5 类 × 2 主题）：拖选选中原文、不开 Tab、不换卡、不触发引用拖动。
- UI 铬区系列（原 L171-178）：名称/徽标禁选、铬区双击动作不变。
- 非 preview 头部引用拖动（L182-194）、空描述帮助（L196-200）、scene footer 引用按钮（L203-211）、blur 恢复（L229-236）、provider 清理（L238-247）、preview 内嵌真实控件（L250-264）、后挂载卡片（L266-276）。

## TDD 红灯预期

对未修复的 `text-selection.ts` 先跑本套件：CC-N1/N3/N4/N5 因点击被吞（计数 0、`active` null）失败；CC-R1/R2/R3/R4/R5 的新计数断言失败；CC-N2 与全部拖选用例应通过（证明隔离能力未破坏）。修复后整套转绿。证据 TAP 保存 `docs/evidence/text-selection/candidate-card-click-2026-10-16-red.tap` 与 `-green.tap`。
