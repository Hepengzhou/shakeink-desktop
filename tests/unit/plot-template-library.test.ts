import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { WIZARD_TEMPLATES } from "../../src/lib/creation-wizard/templates"
import { PROMPT_TEMPLATES } from "../../prisma/seed-templates"
import { wizardTemplateSchema } from "../../desktop/shared/template-library"
import { DEFAULT_FILTERS, isTemplateVisible, visibleTemplates } from "../../src/lib/creation-wizard/filter"
import { composeWizardDraft } from "../../src/lib/creation-wizard/compose"
import { WIZARD_GENRE_UNION, WIZARD_LENGTHS, WIZARD_CHANNELS, WIZARD_TAG_GROUP_VOCABS } from "../../src/lib/creation-wizard/taxonomy"
import { extractPromptVariables } from "../../src/lib/prompts/variables"

const coverage = JSON.parse(readFileSync("docs/prompt-library-expansion/coverage.json", "utf8")) as {
  expected: { all: number; plot: number; focused: number; servicePrompts: number; combined: number }
  groups: { name: string; minimum: number; count: number; genres: string[]; templates: { id: string; requirement: string }[] }[]
}
const normalize = (text: string) => text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "").toLowerCase()
function unique(values: string[], label: string) { assert.equal(new Set(values).size, values.length, label) }
const focused = coverage.groups.flatMap(group => group.templates)

test("PLX01 catalog totals and independent requirement manifest cover every requested family", () => {
  assert.equal(WIZARD_TEMPLATES.length, coverage.expected.all)
  assert.equal(WIZARD_TEMPLATES.filter(t => t.cat === "plot").length, coverage.expected.plot)
  assert.equal(PROMPT_TEMPLATES.length, coverage.expected.servicePrompts)
  assert.equal(WIZARD_TEMPLATES.length + PROMPT_TEMPLATES.length, coverage.expected.combined)
  assert.equal(focused.length, coverage.expected.focused)
  unique(focused.map(t => t.id), "one primary template per requirement")
})
for (const group of coverage.groups) {
  test(`PLX01/04 ${group.name} meets its count and every template is reachable through real genre filters`, () => {
    assert.ok(group.count >= group.minimum)
    assert.equal(group.templates.length, group.count)
    for (const { id } of group.templates) {
      const template = WIZARD_TEMPLATES.find(t => t.id === id)
      assert.ok(template, id)
      assert.equal(template.cat, "plot")
      assert.deepEqual(template.channels, [], "genre templates available to either channel")
      assert.deepEqual(template.genres, group.genres, `${id}: declared genre family`)
      for (const genre of group.genres) assert.ok(visibleTemplates("plot", { ...DEFAULT_FILTERS, genre }).some(t => t.id === id), `${id}: ${genre}`)
      if (group.genres.length) {
        const unrelated = WIZARD_GENRE_UNION.find(genre => !group.genres.includes(genre))!
        assert.ok(!visibleTemplates("plot", { ...DEFAULT_FILTERS, genre: unrelated }).some(t => t.id === id), `${id}: unrelated genre excluded`)
      }
      if (!group.genres.length) for (const channel of WIZARD_CHANNELS) for (const genre of WIZARD_GENRE_UNION) for (const length of WIZARD_LENGTHS) {
        assert.ok(isTemplateVisible(template, { ...DEFAULT_FILTERS, channel, genre, length }), `${id}: universal visibility`)
      }
    }
  })
}
for (const { id, requirement } of focused) {
  test(`PLX02/05 ${requirement} has executable content and survives the real four-section draft composer`, () => {
    const template = WIZARD_TEMPLATES.find(t => t.id === id)
    assert.ok(template, id)
    wizardTemplateSchema.parse(template)
    for (const section of ["【剧情】", "【输入与缺省】", "【方法】", "【推进步骤】", "【输出】", "【自检】"]) assert.ok(template.prompt.includes(section), `${id}: ${section}`)
    assert.ok(template.prompt.length >= 550, `${id}: actionable detail`)
    assert.deepEqual(extractPromptVariables(template.prompt), [], "wizard drafts need no service variables")
    assert.doesNotMatch(template.prompt, /undefined|\bTODO\b|\bTBD\b|待补充|示例作品|示例模型|占位符/)
    const theme = WIZARD_TEMPLATES.find(t => t.cat === "theme")!, world = WIZARD_TEMPLATES.find(t => t.cat === "world")!, character = WIZARD_TEMPLATES.find(t => t.cat === "character")!
    const draft = composeWizardDraft(DEFAULT_FILTERS, { theme, world, character, plot: template })
    assert.ok(draft.endsWith(template.prompt))
    assert.ok(draft.indexOf(theme.prompt) < draft.indexOf(world.prompt))
    assert.ok(draft.indexOf(world.prompt) < draft.indexOf(character.prompt))
    assert.ok(draft.indexOf(character.prompt) < draft.indexOf(template.prompt))
    assert.equal(draft.split(template.prompt).length, 2)
    const single = composeWizardDraft(DEFAULT_FILTERS, { theme: null, world: null, character: null, plot: template })
    assert.ok(single.endsWith(template.prompt))
  })
}
test("PLX02/03 complete builtin library has valid metadata, unique identities, titles and normalized content across both collections", () => {
  unique(WIZARD_TEMPLATES.map(t => t.id), "wizard IDs")
  unique(PROMPT_TEMPLATES.map(t => t.key), "service keys")
  unique(WIZARD_TEMPLATES.map(t => `${t.cat}:${normalize(t.title)}`), "same-category titles")
  unique([...WIZARD_TEMPLATES.map(t => normalize(t.prompt)), ...PROMPT_TEMPLATES.map(t => normalize(t.content))], "all builtin bodies")
  const tags = Object.values(WIZARD_TAG_GROUP_VOCABS).flat()
  for (const t of WIZARD_TEMPLATES) {
    wizardTemplateSchema.parse(t)
    assert.ok(t.channels.every(x => WIZARD_CHANNELS.includes(x as never)), t.id)
    assert.ok(t.genres.every(x => WIZARD_GENRE_UNION.includes(x)), t.id)
    assert.ok(t.tags.every(x => tags.includes(x)), t.id)
    assert.ok(!t.lengths || t.lengths.every(x => WIZARD_LENGTHS.includes(x as never)), t.id)
    if (t.cat === "plot") for (const section of ["【输入与缺省】", "【推进步骤】", "【输出】", "【自检】"]) assert.ok(t.prompt.includes(section), `${t.id}: ${section}`)
  }
  for (const p of PROMPT_TEMPLATES) assert.deepEqual([...extractPromptVariables(p.content)].sort(), [...p.variables].sort(), p.key)
})
test("PLX03 focused mechanism bodies stay unique after removing the common execution contract", () => {
  const bodies = focused.map(({ id }) => {
    const t = WIZARD_TEMPLATES.find(row => row.id === id)
    assert.ok(t, id)
    const match = t.prompt.match(/【方法】([\s\S]*?)【输出】/)
    assert.ok(match, id)
    return normalize(match[1])
  })
  unique(bodies, "different mechanism bodies")
})
test("PLX06 related structures require distinct observable deliverables", () => {
  const prompt = (id: string) => { const row = WIZARD_TEMPLATES.find(t => t.id === id); assert.ok(row, id); return row.prompt }
  for (const beat of ["开场画面", "主题点题", "铺垫", "催化事件", "犹豫", "进入第二幕", "B故事", "游戏与乐趣", "中点", "坏人逼近", "一无所有", "灵魂黑夜", "进入第三幕", "终局", "终场画面"]) assert.ok(prompt("plot-structure-save-the-cat").includes(beat), beat)
  for (const stage of ["日常世界", "冒险召唤", "拒绝召唤", "遇见导师", "跨越第一门槛", "试炼盟友敌人", "逼近核心洞穴", "重大考验", "奖赏", "归途", "复活", "携药归来"]) assert.ok(prompt("plot-structure-writers-journey").includes(stage), stage)
  for (const point of ["钩子", "第一次转折", "第一次压力", "中点", "第二次压力", "第二次转折", "解决"]) assert.ok(prompt("plot-structure-seven-points").includes(point), point)
  assert.match(prompt("plot-structure-heros-journey"), /离开.*启蒙.*归返/)
  assert.match(prompt("plot-structure-kishotenketsu"), /新视角/)
  assert.match(prompt("plot-structure-ring"), /首尾.*意象/)
  assert.match(prompt("plot-structure-cyclical"), /代际|代代|历史重复/)
  assert.match(prompt("plot-scifi-time-loop"), /重置.*记忆/)
  assert.match(prompt("plot-structure-fichtean"), /危机.*危机/)
  assert.match(prompt("plot-structure-freytag"), /中央高潮/)
  assert.match(prompt("plot-structure-five-acts"), /幕目标|每幕目标/)
  assert.match(prompt("plot-history-reconstruction"), /史料|史实/)
  assert.match(prompt("plot-mystery-locked-room"), /线索.*可见|可见.*线索/)
})
test("PLX03 legacy ascent and revenge variants require different decision mechanisms", () => {
  const social = WIZARD_TEMPLATES.find(t => t.id === "plot-underdog-climb")!.prompt
  assert.match(social, /资格/); assert.match(social, /信用|担保/)
  const restitution = WIZARD_TEMPLATES.find(t => t.id === "plot-revenge-she-returns")!.prompt
  assert.match(restitution, /名誉|姓名/); assert.match(restitution, /联合追偿|联合.*追偿/)
})
