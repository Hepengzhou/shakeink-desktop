// Arrange synthetic prerequisites through real local repositories only.
import assert from "node:assert/strict"
import { mkdir, realpath, stat, writeFile } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { Workspaces } from "../desktop/service/workspaces"
import { prisma } from "../src/lib/db"
import { VersionedStore } from "../desktop/core/versioned-store"
import { defaultState, stateSchema } from "../desktop/core/settings"
import { DraftJournal } from "../desktop/main/draft-journal"

async function seed() {
const directory = await realpath(resolve(process.argv[2]))
assert.ok(basename(directory).startsWith("xaanink-text-selection-"))
const root = join(directory, "data"), workPath = join(directory, "work")
await mkdir(workPath, { recursive: true })
const works = new Workspaces(root, resolve("prisma/migrations"))
try {
  await works.initialize()
  const state = structuredClone(defaultState)
  state.settings.appearance.lineNumbers = true
  state.onboarding = { version: 1, completed: true, step: "welcome", textModelId: null, imageModelId: null, receipt: null }
  await new VersionedStore(join(root, "state.json"), defaultState, stateSchema.parse).update(0, state)
  const info = await stat(workPath, { bigint: true })
  const work = await works.create({ path: workPath, device: String(info.dev), inode: String(info.ino) }, { title: "隔离文字选取作品", requestId: "text-selection-fixture" })
  await works.run(work.id, async () => {
    const volume = await prisma.volume.create({ data: { novelId: work.novelId, title: "隔离卷", index: 1, summary: "" } })
    const chapter = await prisma.chapter.create({ data: { volumeId: volume.id, index: 1, title: "选区验收章", outline: "", content: "第一行隔离正文，可选取与编辑。\n\n第二段 **强调正文** 与普通原文。", status: "WRITTEN" } })
    await writeFile(join(directory, "fixture.json"), JSON.stringify({ novelId: work.novelId, chapterId: chapter.id }))
  })
  const journal = new DraftJournal(root), release = journal.activate("selection-seed")
  try {
    const attempt = { revision: 1, value: "隔离保留草稿原文", operationId: randomUUID() }
    await journal.persist("selection-seed", { version: 1, revision: 1, createdAt: new Date().toISOString(), autosaves: [{ id: randomUUID(), draft: { revision: 1, status: "pending", paused: false, pending: attempt, failed: null, inFlight: null, latest: attempt } }], sources: {}, issues: [] })
  } finally { release() }
} finally { await works.close() }
}
void seed().catch(error => { console.error(error); process.exitCode = 1 })
