import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { mkdtemp, realpath, rm } from "node:fs/promises"
import { basename, isAbsolute, join, relative, resolve } from "node:path"
import { tmpdir } from "node:os"
import { PGlite } from "@electric-sql/pglite"
import { PrismaClient } from "../../src/generated/prisma/client"
import { LocalPGliteAdapter } from "../../desktop/service/database/pglite-adapter"
import { loadMigrations, migrateDatabase } from "../../desktop/service/database/migrations"
import { LOCAL_AUTHOR_ID, runInDatabaseContext } from "../../desktop/service/context"
import { GET as list, POST as create } from "../../desktop/handlers/novels/[id]/scenarios/route"
import { DELETE as remove, GET as detail, PATCH as patch } from "../../desktop/handlers/novels/[id]/scenarios/[labId]/route"

// Real service, migrations, Prisma/PGlite, trusted context and original handlers.
// Requests are in-process values: no HTTP listener, mocked DB or real user root.
let root: string, engine: PGlite, db: PrismaClient
const scoped = <T>(run: () => T) => runInDatabaseContext({ workspaceId: "sidebar-scenario-fixture", database: db }, run)
const context = (labId: string, novelId = "scenario-novel-a") => ({ params: Promise.resolve({ id: novelId, labId }) })
const request = (method: string, body?: unknown) => new Request("http://sidebar-fixture.invalid/scenarios", {
  method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
})
async function createLab(title: string, novelId = "scenario-novel-a") {
  const response = await create(request("POST", { title, premise: "公开合成开场", cast: [{ characterId: novelId === "scenario-novel-a" ? "scenario-character-a" : "scenario-character-b", control: "user" }], sceneIds: [novelId === "scenario-novel-a" ? "scenario-scene-a" : "scenario-scene-b"] }), context("", novelId))
  assert.equal(response.status, 200, "Original create handler succeeds")
  return (await response.json()).scenario as { id: string; title: string }
}
before(async () => {
  root = await mkdtemp(join(tmpdir(), "shakeink-sidebar-scenario-"))
  engine = await PGlite.create({ dataDir: join(root, "database"), relaxedDurability: false })
  await migrateDatabase(engine, await loadMigrations(join(process.cwd(), "prisma/migrations")))
  db = new PrismaClient({ adapter: new LocalPGliteAdapter(engine) })
  await db.user.create({ data: { id: LOCAL_AUTHOR_ID, email: "sidebar@example.invalid", name: "隔离导航作者", passwordHash: "" } })
  for (const suffix of ["a", "b"]) {
    await db.novel.create({ data: { id: "scenario-novel-" + suffix, userId: LOCAL_AUTHOR_ID, title: "隔离作品" + suffix } })
    await db.character.create({ data: { id: "scenario-character-" + suffix, novelId: "scenario-novel-" + suffix, name: "合成角色" + suffix, roleType: "PROTAGONIST", age: "20", occupation: "合成职业", personality: "谨慎", appearance: "合成外貌", clothing: "日常衣着", catchphrase: "", growthArc: "合成成长", relationships: [], extra: {} } })
    await db.scene.create({ data: { id: "scenario-scene-" + suffix, novelId: "scenario-novel-" + suffix, name: "合成场景" + suffix } })
  }
})
after(async () => {
  await db?.$disconnect(); await engine?.close()
  if (root) {
    const owned = await realpath(root), parent = await realpath(tmpdir()), inside = relative(parent, owned)
    assert(inside && !inside.startsWith("..") && !isAbsolute(inside) && basename(owned).startsWith("shakeink-sidebar-scenario-"), "Remove only this owned isolated fixture")
    assert.equal(resolve(root), owned)
    await rm(owned, { recursive: true, force: true })
  }
})

test("SN-05-DB01 real PATCH renames within the supplied transaction and preserves configuration", () => scoped(async () => {
  const lab = await createLab("原试验场")
  await db.scenarioLab.update({ where: { id: lab.id }, data: { prose: "已有合成样文", status: "active" } })
  const before = await db.scenarioLab.findUniqueOrThrow({ where: { id: lab.id } })
  const foreign = await createLab("另一作品保留", "scenario-novel-b")
  const foreignBefore = await db.scenarioLab.findUniqueOrThrow({ where: { id: foreign.id } })
  const response = await patch(request("PATCH", { title: "  改名后的试验场  " }), context(lab.id))
  assert.equal(response.status, 200, "Actual title PATCH must not reborrow a transaction-active DB")
  assert.equal((await response.json()).scenario.title, "改名后的试验场")
  const after = await db.scenarioLab.findUniqueOrThrow({ where: { id: lab.id } })
  assert.equal(after.title, "改名后的试验场")
  for (const field of ["id", "novelId", "cast", "sceneIds", "premise", "prose", "proseAt", "status", "createdAt"] as const) assert.deepEqual(after[field], before[field], field + " stays intact")
  assert.deepEqual(await db.scenarioLab.findUniqueOrThrow({ where: { id: foreign.id } }), foreignBefore)
  assert.equal((await (await detail(request("GET"), context(lab.id))).json()).scenario.title, after.title)
  assert.equal((await (await list(request("GET"), context(""))).json()).scenarios.find((row: { id: string }) => row.id === lab.id).title, after.title)
}))

test("SN-05-DB02 real PATCH rolls back invalid cast and rejects a different work's lab", () => scoped(async () => {
  const lab = await createLab("不可部分改名")
  const before = await db.scenarioLab.findUniqueOrThrow({ where: { id: lab.id } })
  const invalid = await patch(request("PATCH", { title: "不能残留", cast: [{ characterId: "scenario-character-b", control: "ai" }] }), context(lab.id))
  assert.equal(invalid.status, 400)
  assert.match((await invalid.json()).error, /不属于|不存在/)
  assert.deepEqual(await db.scenarioLab.findUniqueOrThrow({ where: { id: lab.id } }), before)
  const foreign = await createLab("另作品原名", "scenario-novel-b")
  const foreignBefore = await db.scenarioLab.findUniqueOrThrow({ where: { id: foreign.id } })
  const denied = await patch(request("PATCH", { title: "越作品改名" }), context(foreign.id))
  assert.equal(denied.status, 404)
  assert.deepEqual(await db.scenarioLab.findUniqueOrThrow({ where: { id: foreign.id } }), foreignBefore)
}))

test("SN-05-DB03 real DELETE cascades only the selected lab and preserves unrelated records", () => scoped(async () => {
  const selected = await createLab("待删除试验场"), other = await createLab("仍保留试验场")
  for (const lab of [selected, other]) {
    await db.scenarioTurn.create({ data: { labId: lab.id, index: 1, narrative: "合成回合" } })
    await db.scenarioNode.create({ data: { labId: lab.id, index: 1, text: "合成节点" } })
    await db.scenarioCard.create({ data: { labId: lab.id, index: 1, text: "合成分镜" } })
  }
  const otherBefore = await db.scenarioLab.findUniqueOrThrow({ where: { id: other.id } })
  const response = await remove(request("DELETE"), context(selected.id))
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true })
  assert.equal(await db.scenarioLab.findUnique({ where: { id: selected.id } }), null)
  const counts = (labId: string) => Promise.all([db.scenarioTurn.count({ where: { labId } }), db.scenarioNode.count({ where: { labId } }), db.scenarioCard.count({ where: { labId } })])
  assert.deepEqual(await counts(selected.id), [0, 0, 0])
  assert.deepEqual(await counts(other.id), [1, 1, 1])
  assert.deepEqual(await db.scenarioLab.findUniqueOrThrow({ where: { id: other.id } }), otherBefore)
}))
