import { randomUUID } from "node:crypto"
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs"
import { mkdir, readdir, readFile, rename, rm } from "node:fs/promises"
import { isAbsolute, join, resolve } from "node:path"
import { DataRootManager, type RootIdentity, type RootPointer } from "../core/data-root"
import { brandRootIdentity, readApplicationBrandImmediately, type ApplicationMarker } from "../core/brand-names"
import { assertRootAuthorityDirectory, assertRootAuthorityFile, observeRootAuthority, type RootAuthorityFile } from "../core/root-authority"
import { directoryIdentity, syncDirectory } from "../core/root-ownership"
import { atomicWrite } from "../core/versioned-store"
import { BRAND_NAMES, CURRENT_NAMES, LEGACY_NAMES, type BrandFamily, type BrandNames } from "../shared/brand-names"

export interface StartupRecoveryPaths { bootstrap: string; recoveryRoot: string }
export type StartupRecoveryRepair = "pointer" | "marker" | "marker-new-id" | "resume-init" | "content"
export type StartupRecoveryReason = "pointer-invalid" | "default-invalid" | "root-mismatch" | "content-damaged"
export type StartupRecoveryClass =
  | { kind: "none" }
  | { kind: "auto-init" }
  | { kind: "repair"; repair: StartupRecoveryRepair }
  | { kind: "dialog"; reason: StartupRecoveryReason; sourcePath: string | null }
export interface StartupRecoveryGuards { assertLock(): void; hooks?: { beforeRename?(): void; beforeRemove?(name: string): void } }
export interface StartupResetContext { home: string; isolatedRoot: string | null; family: BrandFamily }
export class StartupRecoveryError extends Error { constructor(readonly code: string, options?: ErrorOptions) { super(code, options); this.name = "StartupRecoveryError" } }
function fail(code: string): never { throw new StartupRecoveryError(code) }

/** Existence sides are canonicalized before comparison; win32 ignores case so
 * an 8.3/case variant of the family default root is not mistaken for custom. */
export function samePath(a: string, b: string) {
  const real = (path: string) => { try { return realpathSync(path) } catch { return path } }
  const ra = real(a), rb = real(b)
  return process.platform === "win32" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb
}
const lstatOrNull = (path: string) => { try { return lstatSync(path, { bigint: true }) } catch { return null } }
const regularFileAt = (root: string, name: string) => { const stat = lstatOrNull(join(root, name)); return !!stat && stat.isFile() && !stat.isSymbolicLink() }
const plainDirectoryAt = (root: string, name: string) => { const stat = lstatOrNull(join(root, name)); return !!stat && stat.isDirectory() && !stat.isSymbolicLink() }
/** Existence, plain-file form and a parseable empty-or-populated envelope. */
const catalogUsable = (root: string) => {
  if (!regularFileAt(root, "catalog.json")) return false
  try {
    const row: unknown = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"))
    return !!row && typeof row === "object" && "schemaVersion" in row && row.schemaVersion === 1 && "revision" in row && Number.isSafeInteger(row.revision) && (row.revision as number) >= 0 && "value" in row && Array.isArray(row.value)
  } catch { return false }
}
const listDir = (root: RootIdentity) => { try { const entries = readdirSync(root.path); assertRootAuthorityDirectory(root); return entries } catch { return null } }
const contentReady = (root: RootIdentity) => catalogUsable(root.path) && plainDirectoryAt(root.path, "inbox") && plainDirectoryAt(root.path, join("inbox", "database"))
const isHistoryName = (name: string) => name === "root-migration.json" || name === "root-migration-request.json" || name.startsWith("root-relocation-") || name.startsWith("application-restore-")

type MarkerProbe = { kind: "valid"; names: Readonly<BrandNames>; value: ApplicationMarker } | { kind: "rebuildable" } | { kind: "unsafe" }
/** Missing files, invalid JSON and schema failures (including a wrong app
 * field) are rebuildable corruption; conflicts or directory-level changes
 * mean ambiguous ownership and must reach the dialog instead of a rewrite. */
function probeMarker(root: RootIdentity): MarkerProbe {
  try { const brand = readApplicationBrandImmediately(root); return { kind: "valid", names: brand.names, value: brand.value } }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : ""
    if (message === "BRAND_MARKER_CONFLICT" || message === "BRAND_CONTROL_CONFLICT" || message === "BRAND_DIRECTORY_INVALID" || message === "BRAND_DIRECTORY_CHANGED") return { kind: "unsafe" }
    return { kind: "rebuildable" }
  }
}
function rootFullyValid(root: string, family: BrandFamily): boolean {
  try {
    const identity = brandRootIdentity(root)
    const brand = readApplicationBrandImmediately(identity)
    if (brand.names.family !== family || brand.value.phase !== "ready" || !brand.value.inboxReady) return false
    if (!contentReady(identity)) return false
    assertRootAuthorityDirectory(identity)
    return true
  } catch { return false }
}
/** Ownership proof for content repair when no pointer can be parsed: a real
 * directory with a single-brand valid ready marker of the same family. */
function probeOwnedReadyRoot(root: string, family: BrandFamily): RootIdentity | null {
  try {
    const identity = brandRootIdentity(root)
    const children = listDir(identity)
    if (children === null || !children.length) return null
    const marker = probeMarker(identity)
    if (marker.kind !== "valid" || marker.names.family !== family || marker.value.phase !== "ready") return null
    assertRootAuthorityDirectory(identity)
    return identity
  } catch { return null }
}

/** Synchronous cold classification. Pure reads only; every directory judgment
 * is rechecked against its authority identity before it is acted on. */
export function classifyStartupRecovery(paths: StartupRecoveryPaths, family: BrandFamily): StartupRecoveryClass {
  let boot: RootIdentity
  try { boot = brandRootIdentity(paths.bootstrap) } catch { return { kind: "none" } }
  const entries = listDir(boot)
  if (entries === null) return { kind: "none" }
  if (entries.some(isHistoryName)) return { kind: "none" }
  let observedText: string | null = null, pointerPresent = false
  try {
    const observed = observeRootAuthority(boot, "data-root.json", 16 * 1024, true)
    if (observed) { pointerPresent = true; observedText = observed.text }
  } catch { pointerPresent = true }
  if (pointerPresent) {
    let pointer: RootPointer | null = null
    if (observedText !== null) { try { pointer = DataRootManager.parsePointer(JSON.parse(observedText)) } catch { pointer = null } }
    if (!pointer) {
      if (rootFullyValid(paths.recoveryRoot, family)) return { kind: "repair", repair: "pointer" }
      // An unparseable pointer with a still-valid ready marker and damaged content
      // heals as one content repair; a missing/rebuildable marker has no identity proof.
      const root = probeOwnedReadyRoot(paths.recoveryRoot, family)
      return root ? { kind: "repair", repair: "content" } : { kind: "dialog", reason: "pointer-invalid", sourcePath: null }
    }
    if (!samePath(pointer.root.path, paths.recoveryRoot)) return { kind: "none" }
    if (!lstatOrNull(pointer.root.path)) return { kind: "auto-init" }
    let root: RootIdentity
    try { root = brandRootIdentity(pointer.root.path) } catch { return { kind: "dialog", reason: "root-mismatch", sourcePath: pointer.root.path } }
    const children = listDir(root)
    if (children === null) return { kind: "dialog", reason: "root-mismatch", sourcePath: pointer.root.path }
    if (!children.length) return { kind: "auto-init" }
    if (root.device !== pointer.root.device || root.inode !== pointer.root.inode) return { kind: "dialog", reason: "root-mismatch", sourcePath: pointer.root.path }
    const marker = probeMarker(root)
    if (marker.kind === "valid") {
      if (marker.names.family !== family || marker.value.id !== pointer.rootId || marker.value.phase !== "ready") return { kind: "dialog", reason: "root-mismatch", sourcePath: paths.recoveryRoot }
      if (!marker.value.inboxReady) return { kind: "repair", repair: "pointer" }
      return contentReady(root) ? { kind: "none" } : { kind: "repair", repair: "content" }
    }
    if (marker.kind === "unsafe") return { kind: "dialog", reason: "root-mismatch", sourcePath: paths.recoveryRoot }
    return { kind: "repair", repair: contentReady(root) ? "marker" : "content" }
  }
  if (!lstatOrNull(paths.recoveryRoot)) return { kind: "none" }
  let root: RootIdentity
  try { root = brandRootIdentity(paths.recoveryRoot) } catch { return { kind: "dialog", reason: "root-mismatch", sourcePath: null } }
  const children = listDir(root)
  if (children === null) return { kind: "dialog", reason: "root-mismatch", sourcePath: null }
  if (!children.length) return { kind: "none" }
  const marker = probeMarker(root)
  if (marker.kind === "valid") {
    if (marker.names.family !== family) return { kind: "dialog", reason: "root-mismatch", sourcePath: null }
    if (marker.value.phase !== "ready") return { kind: "repair", repair: "resume-init" }
    return contentReady(root) ? { kind: "none" } : { kind: "repair", repair: "content" }
  }
  if (marker.kind === "unsafe") return { kind: "dialog", reason: "root-mismatch", sourcePath: null }
  if (contentReady(root) && !lstatOrNull(join(root.path, "backups", "application"))) return { kind: "repair", repair: "marker-new-id" }
  return { kind: "dialog", reason: "default-invalid", sourcePath: null }
}

const quarantine = (base: string) => `${base}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
async function repairPointer(paths: StartupRecoveryPaths, guards: StartupRecoveryGuards) {
  guards.assertLock()
  const boot = brandRootIdentity(paths.bootstrap)
  const observed = observeRootAuthority(boot, "data-root.json", 16 * 1024)
  if (!observed) fail("REPAIR_POINTER_MISSING")
  guards.assertLock()
  assertRootAuthorityFile(boot, "data-root.json", observed.proof)
  await rename(join(boot.path, "data-root.json"), join(boot.path, quarantine("data-root")))
  assertRootAuthorityDirectory(boot)
  await syncDirectory(boot.path)
  guards.assertLock()
}
async function repairMarker(paths: StartupRecoveryPaths, repair: "marker" | "marker-new-id", family: BrandFamily, guards: StartupRecoveryGuards) {
  guards.assertLock()
  const boot = brandRootIdentity(paths.bootstrap)
  const names = family === "legacy" ? LEGACY_NAMES : CURRENT_NAMES
  let rootId: string, root: RootIdentity, pointerProof: RootAuthorityFile | null = null
  if (repair === "marker") {
    const observed = observeRootAuthority(boot, "data-root.json", 16 * 1024)
    if (!observed) fail("REPAIR_POINTER_MISSING")
    let pointer: RootPointer | null = null
    try { pointer = DataRootManager.parsePointer(JSON.parse(observed.text)) } catch { /* refused below */ }
    if (!pointer) fail("REPAIR_POINTER_INVALID")
    root = await directoryIdentity(pointer.root.path)
    if (root.device !== pointer.root.device || root.inode !== pointer.root.inode || !samePath(paths.recoveryRoot, pointer.root.path)) fail("REPAIR_ROOT_CHANGED")
    rootId = pointer.rootId
    pointerProof = observed.proof
  } else {
    if (observeRootAuthority(boot, "data-root.json", 16 * 1024, true)) fail("REPAIR_POINTER_PRESENT")
    root = await directoryIdentity(paths.recoveryRoot)
    if (lstatOrNull(join(root.path, "backups", "application"))) fail("REPAIR_BACKUPS_PRESENT")
    rootId = randomUUID()
  }
  if (lstatOrNull(join(root.path, names.appMarker))) {
    guards.assertLock()
    assertRootAuthorityDirectory(root)
    await rename(join(root.path, names.appMarker), join(root.path, quarantine(names.appMarker)))
    assertRootAuthorityDirectory(root)
    await syncDirectory(root.path)
  }
  await atomicWrite(join(root.path, names.appMarker), JSON.stringify({ schemaVersion: 1, app: names.appIdentity, id: rootId, phase: "ready", inboxReady: true }) + "\n", { beforeRename: async () => {
    guards.hooks?.beforeRename?.()
    guards.assertLock()
    assertRootAuthorityDirectory(root)
    if (pointerProof) assertRootAuthorityFile(boot, "data-root.json", pointerProof)
    else {
      if (observeRootAuthority(boot, "data-root.json", 16 * 1024, true)) fail("REPAIR_POINTER_PRESENT")
      if (lstatOrNull(join(root.path, "backups", "application"))) fail("REPAIR_BACKUPS_PRESENT")
    }
  } })
  guards.assertLock()
}
/** Structural self-heal for an owned default root: rebuilds inbox/ and
 * inbox/database/, repairs catalog.json (quarantine-then-empty), flips a valid
 * marker's inboxReady only when the database is gone, and quarantines an
 * unparseable pointer on the way. Only ever adds; originals are quarantined. */
async function repairContent(paths: StartupRecoveryPaths, family: BrandFamily, guards: StartupRecoveryGuards) {
  guards.assertLock()
  const boot = brandRootIdentity(paths.bootstrap)
  const root = await directoryIdentity(paths.recoveryRoot).catch(() => fail("REPAIR_ROOT_CHANGED"))
  const names = family === "legacy" ? LEGACY_NAMES : CURRENT_NAMES
  const syncRoot = async () => { guards.assertLock(); assertRootAuthorityDirectory(root); await syncDirectory(root.path) }
  let pointerRootId: string | null = null
  const quarantinePointer = async () => {
    const withProof = observeRootAuthority(boot, "data-root.json", 16 * 1024)
    if (!withProof) return
    guards.assertLock()
    assertRootAuthorityFile(boot, "data-root.json", withProof.proof)
    await rename(join(boot.path, "data-root.json"), join(boot.path, quarantine("data-root")))
    assertRootAuthorityDirectory(boot)
    await syncDirectory(boot.path)
  }
  const observedPointer = observeRootAuthority(boot, "data-root.json", 16 * 1024, true)
  if (observedPointer) {
    try { pointerRootId = DataRootManager.parsePointer(JSON.parse(observedPointer.text)).rootId } catch { await quarantinePointer() }
  }
  const marker = probeMarker(root)
  if (marker.kind === "unsafe") fail("REPAIR_ROOT_CHANGED")
  let validMarker: ApplicationMarker | null = null, rootId: string
  if (marker.kind === "valid") {
    if (marker.names.family !== family || marker.value.phase !== "ready") fail("REPAIR_ROOT_CHANGED")
    validMarker = marker.value; rootId = marker.value.id
  } else {
    rootId = pointerRootId ?? randomUUID()
    if (lstatOrNull(join(root.path, names.appMarker))) {
      guards.assertLock()
      assertRootAuthorityDirectory(root)
      await rename(join(root.path, names.appMarker), join(root.path, quarantine(names.appMarker)))
      await syncRoot()
    }
    await atomicWrite(join(root.path, names.appMarker), JSON.stringify({ schemaVersion: 1, app: names.appIdentity, id: rootId, phase: "ready", inboxReady: false }) + "\n", { beforeRename: async () => { guards.assertLock(); assertRootAuthorityDirectory(root) } })
  }
  for (const dir of [join(root.path, "inbox"), join(root.path, "inbox", "database")]) {
    const stat = lstatOrNull(dir)
    if (stat && stat.isDirectory() && !stat.isSymbolicLink()) continue
    if (stat) {
      guards.assertLock()
      assertRootAuthorityDirectory(root)
      await rename(dir, join(root.path, quarantine(dir === join(root.path, "inbox") ? "inbox" : "database")))
      await syncRoot()
    }
    guards.assertLock()
    assertRootAuthorityDirectory(root)
    await mkdir(dir)
    await syncRoot()
  }
  // The worker re-creates and flips back only when the database starts empty.
  // With inboxReady now false a still-valid pointer would block the relocation
  // preflight, so it is quarantined too (same semantics as repair:pointer).
  let inboxReadyNow = validMarker?.inboxReady ?? false
  if (validMarker?.inboxReady && !(await readdir(join(root.path, "inbox", "database"))).length) {
    guards.assertLock()
    assertRootAuthorityDirectory(root)
    await rename(join(root.path, names.appMarker), join(root.path, quarantine(names.appMarker)))
    await syncRoot()
    await atomicWrite(join(root.path, names.appMarker), JSON.stringify({ schemaVersion: 1, app: names.appIdentity, id: rootId, phase: "ready", inboxReady: false }) + "\n", { beforeRename: async () => { guards.assertLock(); assertRootAuthorityDirectory(root) } })
    inboxReadyNow = false
  }
  if (!inboxReadyNow && observeRootAuthority(boot, "data-root.json", 16 * 1024, true)) await quarantinePointer()
  const catalogPath = join(root.path, "catalog.json"), catalogStat = lstatOrNull(catalogPath)
  let catalogValid = false
  if (catalogStat?.isFile() && !catalogStat.isSymbolicLink()) {
    try {
      const row: unknown = JSON.parse(await readFile(catalogPath, "utf8"))
      catalogValid = !!row && typeof row === "object" && "schemaVersion" in row && row.schemaVersion === 1 && "revision" in row && Number.isSafeInteger(row.revision) && (row.revision as number) >= 0 && "value" in row && Array.isArray(row.value)
    } catch { catalogValid = false }
  }
  if (!catalogValid) {
    if (catalogStat) {
      guards.assertLock()
      assertRootAuthorityDirectory(root)
      await rename(catalogPath, join(root.path, quarantine("catalog")))
      await syncRoot()
    }
    await atomicWrite(catalogPath, JSON.stringify({ schemaVersion: 1, revision: 0, value: [] }) + "\n", { beforeRename: async () => { guards.assertLock(); assertRootAuthorityDirectory(root) } })
  }
  await syncRoot()
}
export async function executeStartupRepair(paths: StartupRecoveryPaths, repair: StartupRecoveryRepair, family: BrandFamily, guards: StartupRecoveryGuards): Promise<void> {
  if (repair === "resume-init") { guards.assertLock(); return }
  if (repair === "pointer") return repairPointer(paths, guards)
  if (repair === "content") return repairContent(paths, family, guards)
  return repairMarker(paths, repair, family, guards)
}

/** User-confirmed destructive reset. The root is cleared (validity flags
 * first) before the bootstrap control/history files, converging to auto-init
 * on restart. A crash mid-way leaves a half-cleared root that startup now
 * self-heals via repair:"content" to a consistent empty structure (195 R1,
 * 197 审核 P0-2：「能修则修」优先，旧「永不归类为可修复」不变量随之更新)。 */
export async function executeStartupReset(paths: StartupRecoveryPaths, context: StartupResetContext, guards: StartupRecoveryGuards): Promise<void> {
  guards.assertLock()
  const expected = context.isolatedRoot ? resolve(context.isolatedRoot) : join(context.home, context.family === "legacy" ? ".xuanxiang" : ".shakeink")
  if (!isAbsolute(paths.recoveryRoot) || !samePath(paths.recoveryRoot, expected)) fail("RESET_TARGET_INVALID")
  const boot = brandRootIdentity(paths.bootstrap)
  let root: RootIdentity | null = null
  if (lstatOrNull(paths.recoveryRoot)) {
    try { root = brandRootIdentity(paths.recoveryRoot) } catch { fail("RESET_TARGET_INVALID") }
  }
  try {
    if (!root) {
      await mkdir(paths.recoveryRoot, { recursive: true, mode: 0o700 })
      root = brandRootIdentity(paths.recoveryRoot)
    }
    const rootPath = root.path
    const removeFromRoot = async (relative: string) => {
      guards.assertLock()
      assertRootAuthorityDirectory(root!)
      guards.hooks?.beforeRemove?.(relative)
      await rm(join(rootPath, ...relative.split("/")), { recursive: true, force: true })
    }
    const flags: string[] = []
    for (const names of BRAND_NAMES) if (lstatOrNull(join(rootPath, names.appMarker))) flags.push(names.appMarker)
    if (lstatOrNull(join(rootPath, "catalog.json"))) flags.push("catalog.json")
    if (plainDirectoryAt(rootPath, "inbox") && plainDirectoryAt(rootPath, join("inbox", "database")) && lstatOrNull(join(rootPath, "inbox", "database", "PG_VERSION"))) flags.push("inbox/database/PG_VERSION")
    for (const flag of flags) await removeFromRoot(flag)
    for (const entry of await readdir(rootPath)) await removeFromRoot(entry)
    await syncDirectory(rootPath)
    const controls = (await readdir(boot.path)).filter(name => name === "data-root.json" || name === "root-migration.json" || name === "root-migration-request.json" || name.startsWith("root-relocation-") || /^(?:\.?application-recovery-|\.?application-restore-|\.?desktop-recovery-layout-)/.test(name))
    for (const name of controls) {
      guards.assertLock()
      assertRootAuthorityDirectory(boot)
      guards.hooks?.beforeRemove?.(name)
      await rm(join(boot.path, name), { recursive: true, force: true })
    }
    await syncDirectory(boot.path)
    guards.assertLock()
    assertRootAuthorityDirectory(boot)
  } catch (cause) {
    if (cause instanceof StartupRecoveryError) throw cause
    throw new StartupRecoveryError("RESET_FAILED", { cause })
  }
}
