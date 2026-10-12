// Synthetic prerequisites only, in a newly created test directory.
import assert from "node:assert/strict"
import { mkdir, realpath } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { Workspaces } from "../desktop/service/workspaces"
import { VersionedStore } from "../desktop/core/versioned-store"
import { defaultState, stateSchema } from "../desktop/core/settings"
import { DraftJournal } from "../desktop/main/draft-journal"

async function seed() {
const directory = await realpath(resolve(process.argv[2]))
assert.ok(basename(directory).startsWith("xaanink-toast-style-"))
const theme = process.argv[3]
assert.ok(theme === "paper" || theme === "ink")
const root = join(directory, "data")
await mkdir(root, {recursive:true})
const workspaces = new Workspaces(root, resolve("prisma/migrations"))
try {
  await workspaces.initialize()
  const state = structuredClone(defaultState)
  state.onboarding = {version:1,completed:true,step:"welcome",textModelId:null,imageModelId:null,receipt:null}
  state.settings.general.restoreSession = true
  state.settings.appearance.theme = theme
  await new VersionedStore(join(root,"state.json"),defaultState,stateSchema.parse).update(0,state)
  const journal = new DraftJournal(root), release = journal.activate("toast-seed")
  try {
    const attempt = {revision:1,value:"隔离消息框专项草稿",operationId:randomUUID()}
    await journal.persist("toast-seed",{version:1,revision:1,createdAt:new Date().toISOString(),autosaves:[{id:randomUUID(),draft:{revision:1,status:"pending",paused:false,pending:attempt,failed:null,inFlight:null,latest:attempt}}],sources:{},issues:[]})
  } finally {release()}
  console.log(`Seeded isolated ${theme} draft and zero-model settings.`)
} finally {await workspaces.close()}
}
void seed().catch(error=>{console.error(error);process.exitCode=1})
