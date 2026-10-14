import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { Workspaces } from "../../desktop/service/workspaces"
import { LocalTemplateLibrary } from "../../desktop/service/template-library"
import { globalPrisma } from "../../src/lib/db"
import { WIZARD_TEMPLATES } from "../../src/lib/creation-wizard/templates"
import { THEME_A_TEMPLATES } from "../../src/lib/creation-wizard/templates/theme-a"
import { THEME_B_TEMPLATES } from "../../src/lib/creation-wizard/templates/theme-b"
import { WORLD_A_TEMPLATES } from "../../src/lib/creation-wizard/templates/world-a"
import { WORLD_B_TEMPLATES } from "../../src/lib/creation-wizard/templates/world-b"
import { CHAR_A_TEMPLATES } from "../../src/lib/creation-wizard/templates/char-a"
import { CHAR_B_TEMPLATES } from "../../src/lib/creation-wizard/templates/char-b"
import { PLOT_A_TEMPLATES } from "../../src/lib/creation-wizard/templates/plot-a"
import { PLOT_B_TEMPLATES } from "../../src/lib/creation-wizard/templates/plot-b"
import { MAX_TEMPLATE_FILE_BYTES, templateDocumentSchema } from "../../desktop/shared/template-library"
import { invalidatePromptCache } from "../../src/lib/prompts/render"

const original = [...THEME_A_TEMPLATES, ...THEME_B_TEMPLATES, ...WORLD_A_TEMPLATES, ...WORLD_B_TEMPLATES, ...CHAR_A_TEMPLATES, ...CHAR_B_TEMPLATES, ...PLOT_A_TEMPLATES, ...PLOT_B_TEMPLATES]
async function fixture(run: (works: Workspaces, root: string) => Promise<void>) {
  const base = await mkdtemp(join(tmpdir(), "xaanink-plot-library-")), root = join(base, "data"), works = new Workspaces(root, resolve("prisma/migrations"))
  try { await works.initialize(); await run(works, root) }
  finally { invalidatePromptCache(); await works.close(); await rm(base, { recursive: true, force: true }) }
}
test("PLX07 original 401 catalog upgrades exactly once while customized, disabled and copied old templates survive", async () => fixture(async works => works.runWithGlobal("inbox", async () => {
  assert.equal(original.length, 401)
  const old = new LocalTemplateLibrary({ wizardTemplates: original }); await old.initialize()
  const first = await old.list(), modified = first.wizardTemplates.find(t => t.template.id === "plot-generic-mainline")!, disabled = first.wizardTemplates.find(t => t.template.id === "plot-hoard-apocalypse")!
  await old.saveWizard({ template: { ...modified.template, prompt: modified.template.prompt + "\n作者保留的方向" }, enabled: true }, modified.version)
  await old.saveWizard({ template: disabled.template, enabled: false }, disabled.version)
  await old.saveWizard({ template: { ...modified.template, id: "user.plot-copy" }, enabled: true })
  const library = new LocalTemplateLibrary(); await library.initialize(); const next = await library.list()
  assert.equal(next.wizardTemplates.length, 472)
  for (const t of original) assert.ok(next.wizardTemplates.some(row => row.template.id === t.id), t.id)
  assert.equal(next.wizardTemplates.filter(t => !original.some(o => o.id === t.template.id) && t.source === "builtin").length, 70)
  const kept = next.wizardTemplates.find(t => t.template.id === modified.template.id)!
  assert.equal(kept.template.prompt, modified.template.prompt + "\n作者保留的方向"); assert.equal(kept.version, 2); assert.equal(kept.source, "customized")
  const off = next.wizardTemplates.find(t => t.template.id === disabled.template.id)!
  assert.deepEqual(off.template, disabled.template); assert.equal(off.enabled, false); assert.equal(off.version, 2)
  const upgraded = next.wizardTemplates.find(t => t.template.id === "plot-three-act-skeleton")!
  assert.match(upgraded.template.prompt, /【输入与缺省】/); assert.equal(upgraded.version, 2)
  const history = await globalPrisma.contentVersion.findFirstOrThrow({ where: { targetType: "WizardTemplate", targetId: upgraded.template.id, version: 1 } })
  assert.equal((history.snapshot as any).template.prompt, original.find(t => t.id === upgraded.template.id)!.prompt)
  const copy = next.wizardTemplates.find(t => t.template.id === "user.plot-copy")!
  assert.equal(copy.source, "user"); assert.equal(copy.version, 1); assert.equal(copy.enabled, true)
  assert.deepEqual(copy.template, { ...modified.template, id: "user.plot-copy" })
  await library.initialize(); assert.deepEqual(await library.list(), next)
})))
test("PLX08 real local database retains all expanded defaults and a disabled author revision after closing and reopening", async () => fixture(async (works, root) => {
  await works.runWithGlobal("inbox", async () => {
    const library = new LocalTemplateLibrary(); await library.initialize()
    assert.equal((await library.list()).wizardTemplates.length, 471)
    const t = (await library.list()).wizardTemplates.find(t => t.template.id === "plot-scifi-time-loop")!
    await library.saveWizard({ template: { ...t.template, prompt: t.template.prompt + "\n作者设定：仅主角保留记忆" }, enabled: false }, t.version)
  })
  await works.close()
  const reopened = new Workspaces(root, resolve("prisma/migrations"))
  try { await reopened.initialize(); await reopened.runWithGlobal("inbox", async () => {
    const library = new LocalTemplateLibrary(); await library.initialize(); const state = await library.list()
    assert.equal(state.wizardTemplates.filter(t => WIZARD_TEMPLATES.some(builtin => builtin.id === t.template.id)).length, 471)
    const t = state.wizardTemplates.find(t => t.template.id === "plot-scifi-time-loop")!
    assert.equal(t.enabled, false); assert.equal(t.version, 2); assert.match(t.template.prompt, /作者设定：仅主角保留记忆$/)
    assert.ok(state.wizardTemplates.some(t => t.template.id === "plot-history-reconstruction"))
  }) } finally { await reopened.close() }
}))
test("PLX08 portable export and real fresh-library import preserve every full expanded prompt within the file limit", async () => fixture(async works => works.runWithGlobal("inbox", async () => {
  const library = new LocalTemplateLibrary(); await library.initialize(); const document = await library.export()
  templateDocumentSchema.parse(document)
  assert.equal(document.wizardTemplates.length, 471)
  assert.ok(Buffer.byteLength(JSON.stringify(document)) <= MAX_TEMPLATE_FILE_BYTES)
  await globalPrisma.systemConfig.delete({ where: { key: "desktop.template-library.v1" } })
  await globalPrisma.promptTemplate.deleteMany()
  const empty = new LocalTemplateLibrary({ prompts: [], wizardTemplates: [] }); await empty.initialize()
  const preview = await empty.preview(document)
  assert.ok(preview.entries.every(e => !e.conflict))
  const state = await empty.apply(preview, preview.entries.map(e => ({ kind: e.kind, id: e.id, action: "add" as const })))
  assert.equal(state.wizardTemplates.length, 471)
  for (const template of WIZARD_TEMPLATES) assert.deepEqual(state.wizardTemplates.find(t => t.template.id === template.id)!.template, template)
})))
