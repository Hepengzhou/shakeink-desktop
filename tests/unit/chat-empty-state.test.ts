import test from "node:test"
import assert from "node:assert/strict"
import { canShowChatWelcome, quickPromptSuffix, QUICK_PROMPTS, hasSelectedModel, type ChatWelcomeState } from "../../src/lib/chat-empty-state"
import { freshWizardFilters } from "../../src/lib/creation-wizard/presets"
import { positionFromFilters } from "../../src/lib/creation-wizard/position"

const clean: ChatWelcomeState = { recoveryStatus: "ready", messageCount: 0, loading: false, loadError: false, generating: false, creatingNovel: false, following: false, suspended: false, question: false, plan: false, request: false, selection: false, queueCount: 0, notice: false, activePlan: false, progress: false }
test("CES-01 pure welcome permits an unsent draft and an empty paused queue", () => assert.equal(canShowChatWelcome(clean), true))
for (const field of ["loading", "loadError", "generating", "creatingNovel", "following", "suspended", "question", "plan", "request", "selection", "notice", "activePlan", "progress"] as const) {
  test(`CES-01 ${field} excludes the pure welcome`, () => assert.equal(canShowChatWelcome({ ...clean, [field]: true }), false))
}
test("CES-01 real messages, recovery and queue exclude welcome", () => {
  for (const change of [{messageCount:1},{queueCount:1},{recoveryStatus:"restoring"}]) assert.equal(canShowChatWelcome({...clean,...change}),false)
})
for (const [genre, tags] of [["仙侠",["古典仙侠","修仙界","热血","升级流"]],["历史",["架空历史","古代","正剧","权谋"]],["科幻",["星际文明","星际","烧脑","经营"]]] as const) {
  test(`CES-02 ${genre} supplies editable approved position with independent Sets`, () => {
    const filters=freshWizardFilters(genre), other=freshWizardFilters(genre)
    const position=positionFromFilters(filters)
    assert.equal(filters.channel,"男频");assert.equal(filters.length,"长篇");assert.equal(filters.genre,genre)
    assert.deepEqual(position.tags,[...tags]);assert.notEqual(filters.tags.sub,other.tags.sub)
    ;(filters.tags.sub as Set<string>).clear();assert.equal(other.tags.sub.size,1)
    assert.equal(freshWizardFilters().channel,"不限");assert.equal(freshWizardFilters().genre,"全部")
  })
}
for (const key of ["character","world","scene"] as const) {
  test(`CES-04 ${key} appends without rewriting author content and deduplicates only complete templates`, () => {
    const prompt=QUICK_PROMPTS[key],original="  作者草稿\n@角色:小明  "
    assert.equal(quickPromptSuffix("",key),prompt)
    assert.equal(quickPromptSuffix(original,key),"\n\n"+prompt)
    assert.equal(quickPromptSuffix(original+"\n\n"+prompt,key),"")
    assert.equal(quickPromptSuffix(prompt.slice(0,-1),key),"\n\n"+prompt)
  })
}
test("CES-05 only a real selected catalog ID authorizes a new send; response defaults never select",()=>{
  const catalog={defaultModelId:"configured",models:[{id:"configured"}]}
  assert.equal(hasSelectedModel(null,catalog),false);assert.equal(hasSelectedModel("deleted",catalog),false)
  assert.equal(hasSelectedModel("configured",undefined),false);assert.equal(hasSelectedModel("configured",catalog),true)
  assert.equal(hasSelectedModel("configured",{models:[]}),false)
})
