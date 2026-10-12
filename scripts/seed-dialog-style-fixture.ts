// Only synthetic preconditions in a freshly created native-test directory.
import assert from "node:assert/strict"
import { mkdir, realpath, stat, writeFile } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { Workspaces } from "../desktop/service/workspaces"
import { VersionedStore } from "../desktop/core/versioned-store"
import { defaultState, stateSchema } from "../desktop/core/settings"
import { prisma } from "../src/lib/db"
import { planningSchema } from "../src/lib/planning/domain"

async function seed() {
  const directory = await realpath(resolve(process.argv[2]))
  assert.ok(basename(directory).startsWith("xaanink-dialog-style-"), "Fresh isolated test directory required")
  const root = join(directory, "data"), path = join(directory, "work")
  await mkdir(path, { recursive: true })
  const info = await stat(path, { bigint: true })
  const works = new Workspaces(root, resolve("prisma/migrations"))
  try {
    await works.initialize()
    const state = structuredClone(defaultState)
    state.onboarding = { version: 1, completed: true, step: "welcome", textModelId: null, imageModelId: null, receipt: null }
    state.settings.general.restoreSession = false
    await new VersionedStore(join(root, "state.json"), defaultState, stateSchema.parse).update(0, state)
    const work = await works.create(
      { path, device: String(info.dev), inode: String(info.ino) },
      { title: "对话框专项夹具", requestId: randomUUID() },
    )
    const ids = await works.run(work.id, async () => {
      const novelId = work.novelId
      const worldId = randomUUID(), periodId = randomUUID(), eventId = randomUUID()
      const data = planningSchema.parse({
        worlds: [{ id: worldId, name: "专项世界线" }],
        periods: [{ id: periodId, line: worldId, title: "专项时期", start: 0, end: 24 }],
        events: [{ id: eventId, line: worldId, title: "专项待定位事件", fact: "隔离目录中的样式验证事实。", time: { kind: "unknown" } }],
      })
      await prisma.planningDocument.upsert({ where: { novelId }, create: { novelId, data }, update: { data } })
      const character = await prisma.character.create({ data: {
        novelId, name: "专项角色", roleType: "PROTAGONIST", age: "成年", occupation: "写作者",
        personality: "沉静", appearance: "独立测试角色", clothing: "便服", catchphrase: "", growthArc: "",
        relationships: [], extra: {},
      } })
      const scene = await prisma.scene.create({ data: { novelId, name: "专项场景", description: "独立测试场景。" } })
      const cast = [{ characterId: character.id, name: character.name, control: "ai" }]
      const active = await prisma.scenarioLab.create({ data: { novelId, title: "专项活动试验场", status: "active", cast, sceneIds: [scene.id], premise: "隔离配置验证。" } })
      const draft = await prisma.scenarioLab.create({ data: { novelId, title: "专项草稿试验场", status: "draft", cast, sceneIds: [scene.id], premise: "隔离内联验证。" } })
      return { novelId, worldId, periodId, eventId, activeScenarioId: active.id, draftScenarioId: draft.id }
    })
    await writeFile(join(directory, "fixture.json"), JSON.stringify(ids, null, 2) + "\n")
    console.log("Isolated real local DB fixture: one work, world/period/event, active/draft scenarios; no models or provider credentials.")
  } finally { await works.close() }
}

void seed().catch(error => { console.error(error); process.exitCode = 1 })
