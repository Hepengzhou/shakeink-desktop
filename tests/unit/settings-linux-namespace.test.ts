import test from "node:test"
import assert from "node:assert/strict"
import { defaultState, settingsSchema, stateSchema, type AppState } from "../../desktop/core/settings"

// Linux is a supported host on this project, but the renderer's own
// darwin|win32 contract is normalized in the main process (see
// tests/unit/platform-normalization.test.ts). The persisted settings schema
// still carries a `linux` namespace so a Linux install never has to reach into
// a missing shortcuts bucket. Legacy state.json files were written before that
// namespace existed, and desktop/core/versioned-store.ts quarantines any file
// that fails validation, so adding the key must never invalidate old data.

/** Exactly the shape a pre-Linux release wrote: darwin and win32 only. */
const legacyState = () => {
  const state = structuredClone(defaultState)
  delete (state.settings.shortcuts as Record<string, unknown>).linux
  return state
}

test("SET-LINUX-01: a legacy state file with no linux namespace still validates", () => {
  const state = legacyState()
  assert.deepEqual(Object.keys(state.settings.shortcuts), ["darwin", "win32"])
  assert.equal(stateSchema.safeParse(state).success, true, "旧 state.json 必须继续通过，否则会被 quarantine 移走")
})

test("SET-LINUX-02: parsing a legacy file materializes an own linux namespace", () => {
  const parsed = stateSchema.parse(legacyState())
  // 必须是自有键：若只是 .optional()，这里会拿到 undefined，
  // 于是 settings.shortcuts[platform] 又变成 undefined，重现白屏根因。
  assert.ok(Object.hasOwn(parsed.settings.shortcuts, "linux"), "linux 必须是自有键，不能只是可选")
  assert.deepEqual(parsed.settings.shortcuts.linux, {})
})

test("SET-LINUX-03: the three namespaces coexist and round-trip independently", () => {
  const state = legacyState() as AppState
  state.settings.shortcuts.linux = { "ai.send": ["Ctrl+Enter"] }
  state.settings.shortcuts.win32 = { "ai.send": ["Enter"] }
  const parsed = stateSchema.parse(state)
  assert.deepEqual(parsed.settings.shortcuts.linux, { "ai.send": ["Ctrl+Enter"] })
  assert.deepEqual(parsed.settings.shortcuts.win32, { "ai.send": ["Enter"] })
  assert.deepEqual(parsed.settings.shortcuts.darwin, {})
})

test("SET-LINUX-04: a corrupt linux namespace is rejected instead of silently rewritten", () => {
  // .catch({}) 会把损坏值静默替换为空对象，掩盖数据损坏；这里要求 fail-closed，
  // 与 versioned-store 的 quarantineInvalidStore 设计一致。
  const broken = { ...legacyState().settings, shortcuts: { darwin: {}, win32: {}, linux: "not-an-object" } }
  assert.equal(settingsSchema.safeParse(broken).success, false, "损坏的 linux 命名空间必须被拒绝")
})

test("SET-LINUX-05: unknown platform namespaces are still rejected by strict()", () => {
  const extra = { ...legacyState().settings, shortcuts: { darwin: {}, win32: {}, linux: {}, freebsd: {} } }
  assert.equal(settingsSchema.safeParse(extra).success, false, ".strict() 必须继续拒绝未知平台键")
})

test("SET-LINUX-06: the shipped default state already carries the linux namespace", () => {
  assert.deepEqual(defaultState.settings.shortcuts.linux, {})
  assert.equal(stateSchema.safeParse(structuredClone(defaultState)).success, true)
})

test("SET-LINUX-07: shape access used by configuration transfer keeps working", () => {
  // desktop/core/configuration-transfer.ts:40 取 shape.darwin.superRefine(...)，
  // :49 用 .shape.shortcuts.extend({darwin,win32})。加 linux 后两者都不得失效。
  const shortcuts = settingsSchema.shape.shortcuts
  assert.equal(typeof shortcuts.shape.darwin.superRefine, "function", "shape.darwin.superRefine 必须仍可用")
  assert.equal(typeof shortcuts.extend, "function", "shortcuts.extend 必须仍可用")
  const extended = shortcuts.extend({ darwin: shortcuts.shape.darwin, win32: shortcuts.shape.win32 })
  assert.equal(extended.safeParse({ darwin: {}, win32: {} }).success, true, "旧导入文件仍须通过 portable 校验")
  assert.equal(extended.safeParse({ darwin: {}, win32: {}, freebsd: {} }).success, false, "portable 校验仍须拒绝未知平台")
})
