import assert from "node:assert/strict"
import { test, after } from "node:test"
import { Worker } from "node:worker_threads"
import { randomUUID } from "node:crypto"
import { mkdtemp, mkdir, readFile, writeFile, readdir, realpath, rm, lstat } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { build } from "esbuild"
import { RpcPeer } from "../../desktop/service/rpc"
import { classifyStartupRecovery, executeStartupRepair, executeStartupReset } from "../../desktop/main/startup-recovery"
import { defaultState } from "../../desktop/core/settings"
import { freezeTaskDefaults } from "../../desktop/shared/task-defaults"

// Two-step convention: classification/repair/reset run on the main side with the
// real module (no Electron import); the real bundled worker then cold-starts on
// the result. The worker never self-heals a dangling pointer (ROOT11-03).
const output = join(process.cwd(), "dist", `startup-recovery-test-${randomUUID()}`)
const built = build({ bundle: true, platform: "node", target: "node24", format: "cjs", packages: "external", entryPoints: ["desktop/service/index.ts"], outfile: join(output, "index.cjs"), define: { "import.meta.url": "__desktopImportMetaUrl" }, banner: { js: 'var __desktopImportMetaUrl = require("node:url").pathToFileURL(__filename).href;' } })
after(async () => { await built; await rm(output, { recursive: true, force: true }) })
const noopGuards = { assertLock() {} }
async function fixture() {
  const base = await realpath(await mkdtemp(join(tmpdir(), "shakeink-startup-recovery-it-")))
  const bootstrap = join(base, "bootstrap"), root = join(base, "默认作者目录")
  await mkdir(bootstrap)
  return { base, bootstrap, root, paths: () => ({ bootstrap, recoveryRoot: root }), async close() { await rm(base, { recursive: true, force: true }) } }
}
type Result = { version: 1; status: "ready"; root: string } | { version: 1; status: "failed"; code: string }
async function launch(root: string, bootstrap: string) {
  await built
  const startup = new SharedArrayBuffer(64 * 1024), header = new Int32Array(startup, 0, 4)
  const worker = new Worker(join(output, "index.cjs"), { workerData: { root, bootstrap, migrations: join(process.cwd(), "prisma/migrations"), startup, databaseSeed:join(process.cwd(),'prisma/empty-database.json') } })
  const rpc = new RpcPeer(worker, async method => { if (method === "model.defaults") return freezeTaskDefaults(defaultState.settings.agent, 0); throw Error("Startup must not request models or main services") })
  worker.on("error", () => rpc.dispose()); worker.on("exit", () => rpc.dispose())
  let closed = false
  function result(): Result {
    // Loaded dev/CI machines can delay PGlite initialization well past the
    // 25s unit barrier; this file's own barrier waits twice the production one.
    assert.notEqual(Atomics.wait(header, 0, 0, 60_000), "timed-out", "startup must wake the blocked main thread")
    assert.equal(Atomics.load(header, 1), 1)
    const length = Atomics.load(header, 2)
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(startup, 16, length))) as Result
    assert.equal(Atomics.load(header, 0), value.status === "ready" ? 1 : 2)
    return value
  }
  return { rpc, result, async close() { if (closed) return; closed = true; await rpc.call("close").catch(() => undefined); rpc.dispose(); await worker.terminate() } }
}
async function request(rpc: RpcPeer, path: string) {
  const id = randomUUID()
  const reply = await rpc.call<{ status: number }>("start", { version: 1, id, path, method: "GET", headers: {} })
  const chunks: Uint8Array[] = []
  for (;;) { const part = await rpc.call<{ done: boolean; bytes?: Uint8Array }>("read", id); if (part.done) break; chunks.push(part.bytes!) }
  return { status: reply.status, data: JSON.parse(Buffer.concat(chunks).toString("utf8")) }
}
async function exists(path: string) { try { await lstat(path); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error } }
async function readMarker(root: string) { return JSON.parse(await readFile(join(root, "shakeink-app.json"), "utf8")) }
async function readPointer(bootstrap: string) { return JSON.parse(await readFile(join(bootstrap, "data-root.json"), "utf8")) }
/** A genuine initialized root produced by the real worker, then shut down. */
async function initialized(f: Awaited<ReturnType<typeof fixture>>) {
  const running = await launch(f.root, f.bootstrap)
  try { assert.equal(running.result().status, "ready"); await running.rpc.call("ready") }
  finally { await running.close() }
  return readMarker(f.root)
}

test("SR-I-01 a dangling pointer auto-initializes after quarantine and the fresh root adopts a new pointer", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    await writeFile(join(f.bootstrap, "data-root.json"), JSON.stringify({ schemaVersion: 1, revision: 1, rootId: randomUUID(), migrationId: null, root: { path: f.root, device: "1", inode: "1" } }))
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "auto-init" })
    await executeStartupRepair(f.paths(), "pointer", "current", noopGuards)
    assert.equal(await exists(join(f.bootstrap, "data-root.json")), false)
    assert.equal((await readdir(f.bootstrap)).filter(name => name.startsWith("data-root.corrupt-")).length, 1)
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      const marker = await readMarker(f.root), pointer = await readPointer(f.bootstrap)
      assert.equal(pointer.rootId, marker.id)
      assert.ok(await exists(join(f.root, "catalog.json"))); assert.ok(await exists(join(f.root, "inbox", "database", "PG_VERSION")))
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-02 a corrupt pointer with an intact root is quarantined and adoption keeps the original root id", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    const marker = await initialized(f)
    await writeFile(join(f.bootstrap, "data-root.json"), "{损坏指针")
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "repair", repair: "pointer" })
    await executeStartupRepair(f.paths(), "pointer", "current", noopGuards)
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      assert.equal((await readPointer(f.bootstrap)).rootId, marker.id)
      assert.equal((await readMarker(f.root)).id, marker.id)
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-03 a missing marker with an intact pointer is rebuilt with the pointer id and the inbox stays usable", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    const original = await initialized(f)
    const pointer = await readPointer(f.bootstrap)
    await rm(join(f.root, "shakeink-app.json"))
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "repair", repair: "marker" })
    await executeStartupRepair(f.paths(), "marker", "current", noopGuards)
    assert.equal((await readMarker(f.root)).id, pointer.rootId)
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      assert.equal((await readMarker(f.root)).id, original.id)
      assert.ok((await request(running.rpc, "/api/admin/prompts")).data.prompts.length > 0)
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-04 a pointerless root without marker or backups gets a fresh id that adoption then publishes", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    await initialized(f)
    await rm(join(f.bootstrap, "data-root.json")); await rm(join(f.root, "shakeink-app.json"))
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "repair", repair: "marker-new-id" })
    await executeStartupRepair(f.paths(), "marker-new-id", "current", noopGuards)
    const marker = await readMarker(f.root)
    assert.ok(marker.id && marker.phase === "ready" && marker.inboxReady)
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      assert.equal((await readPointer(f.bootstrap)).rootId, marker.id)
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-05 an interrupted initialization resumes without any repair write and finishes ready with the same id", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    const id = randomUUID()
    await mkdir(f.root)
    await writeFile(join(f.root, "shakeink-app.json"), JSON.stringify({ schemaVersion: 1, app: "ShakeInk", id, phase: "initializing", inboxReady: false }))
    const before = await readdir(f.root)
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "repair", repair: "resume-init" })
    await executeStartupRepair(f.paths(), "resume-init", "current", noopGuards)
    assert.deepEqual(await readdir(f.root), before, "resume-init never writes")
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      const marker = await readMarker(f.root)
      assert.equal(marker.id, id); assert.equal(marker.phase, "ready"); assert.equal(marker.inboxReady, true)
      assert.ok(await exists(join(f.root, "catalog.json")))
      assert.equal((await readPointer(f.bootstrap)).rootId, id)
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-06 a reset root cold-starts into a completely fresh initialization", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    const original = await initialized(f)
    await writeFile(join(f.root, "state.json"), "损坏残留")
    await writeFile(join(f.bootstrap, "root-migration-request.json"), "{}")
    await executeStartupReset(f.paths(), { home: join(f.base, "unused-home"), isolatedRoot: f.root, family: "current" }, noopGuards)
    assert.deepEqual(await readdir(f.root), []); assert.deepEqual(await readdir(f.bootstrap), [])
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      const marker = await readMarker(f.root)
      assert.notEqual(marker.id, original.id)
      assert.equal(await exists(join(f.root, "state.json")), false, "no settings state survives or is fabricated by the worker")
      assert.deepEqual(JSON.parse(await readFile(join(f.root, "catalog.json"), "utf8")).value, [])
      assert.equal((await readPointer(f.bootstrap)).rootId, marker.id)
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-07 a damaged catalog self-heals via content repair and the real worker starts", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    await initialized(f)
    await writeFile(join(f.root, "catalog.json"), "{损坏目录索引")
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "repair", repair: "content" }, "unparseable catalog classifies as content repair (196 C01)")
    await executeStartupRepair(f.paths(), "content", "current", noopGuards)
    const quarantined = (await readdir(f.root)).filter(name => /^catalog\.corrupt-.+\.json$/.test(name))
    assert.equal(quarantined.length, 1)
    assert.equal(await readFile(join(f.root, quarantined[0]), "utf8"), "{损坏目录索引")
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      assert.deepEqual(JSON.parse(await readFile(join(f.root, "catalog.json"), "utf8")).value, [])
    } finally { await running.close() }
  } finally { await f.close() }
})

test("SR-I-08 a deleted inbox/database self-heals via content repair and the real worker rebuilds it with the same identity", { timeout: 180_000 }, async () => {
  const f = await fixture()
  try {
    const original = await initialized(f)
    await rm(join(f.root, "inbox", "database"), { recursive: true, force: true })
    assert.deepEqual(classifyStartupRecovery(f.paths(), "current"), { kind: "repair", repair: "content" })
    await executeStartupRepair(f.paths(), "content", "current", noopGuards)
    const marker = await readMarker(f.root)
    assert.equal(marker.id, original.id); assert.equal(marker.inboxReady, false, "repair flips inboxReady for the worker create path")
    const quarantinedPointer = (await readdir(f.bootstrap)).filter(name => /^data-root\.corrupt-.+\.json$/.test(name))
    assert.equal(quarantinedPointer.length, 1, "the still-valid pointer is quarantined so the relocation preflight cannot block")
    const running = await launch(f.root, f.bootstrap)
    try {
      assert.deepEqual(running.result(), { version: 1, status: "ready", root: f.root })
      await running.rpc.call("ready")
      const reopened = await readMarker(f.root)
      assert.equal(reopened.id, original.id); assert.equal(reopened.inboxReady, true, "worker rebuilds the database and flips back")
      assert.ok(await exists(join(f.root, "inbox", "database", "PG_VERSION")))
      assert.equal((await readPointer(f.bootstrap)).rootId, original.id, "pointer is rewritten with the same root id")
    } finally { await running.close() }
  } finally { await f.close() }
})
