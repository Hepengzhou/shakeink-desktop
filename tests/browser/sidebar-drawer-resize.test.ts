import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { test } from "node:test"
import { chromium, type Browser, type Page } from "playwright-core"
import { recordDrawerDriverAction, withDrawer } from "../helpers/sidebar-drawer-fixture"
import type { WorkspaceLayout } from "../../src/lib/desktop/workspace-draft-source"

let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.XAANINK_TEST_CHROMIUM ? { executablePath: process.env.XAANINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })
const initial: WorkspaceLayout = { version: 1, narrowPane: "sidebar", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 15, chat: 30, content: 55 }, lastSidebarSize: 15, lastChatSize: 30, lastContentSize: 55 }

async function armResizeFrames(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".dashboard-shell")!, group = document.querySelector<HTMLElement>(".workspace-group")!, observation = (window as any).drawerLayoutObservation
    const identities = new WeakMap<Element, number>(); let serial = 0
    const identity = (element: Element) => { if (!identities.has(element)) identities.set(element, ++serial); return identities.get(element) }
    const snapshot = () => {
      const inner = document.querySelector<HTMLElement>(".sidebar-drawer-inner")!, sidebar = document.querySelector<HTMLElement>("#sidebar")!, caption = inner.querySelector<HTMLElement>(".desktop-sidebar-controls")!
      const i = inner.getBoundingClientRect(), v = sidebar.getBoundingClientRect(), c = caption.getBoundingClientRect()
      const panels = Object.fromEntries([...group.querySelectorAll<HTMLElement>(":scope > [data-panel]")].map(panel => { const r = panel.getBoundingClientRect(), s = getComputedStyle(panel); return [panel.id, { width: r.width, height: r.height, flexGrow: s.flexGrow, flexShrink: s.flexShrink, flexBasis: s.flexBasis, display: s.display }] }))
      const separators = [...group.querySelectorAll<HTMLElement>(":scope > [data-separator]")].map(separator => ({ width: separator.getBoundingClientRect().width, display: getComputedStyle(separator).display }))
      const items = [...inner.querySelectorAll<HTMLElement>(".sidebar-brand,.brand-title,.create-action,.nav-tabs,.nav-tab,.account-button")].map(item => { const r = item.getBoundingClientRect(), s = getComputedStyle(item); return { x: r.x - i.x, y: r.y - i.y, width: r.width, height: r.height, fontSize: s.fontSize, lineHeight: s.lineHeight, whiteSpace: s.whiteSpace } })
      return { time: performance.now(), phase: root.dataset.sidebarPhase, mode: root.dataset.drawerMode, pane: root.dataset.narrowPane, innerId: identity(inner), navigationId: identity(inner.querySelector(".sidebar-navigation")!), viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, group: { width: group.getBoundingClientRect().width, height: group.getBoundingClientRect().height }, width: i.width, height: i.height, visible: v.width, offset: new DOMMatrix(getComputedStyle(inner).transform).m41, caption: { x: c.x - i.x, y: c.y - i.y, width: c.width, height: c.height, top: c.top }, panels, separators, items, api: structuredClone(observation.api.getLayout()), configurations: structuredClone(observation.panelConfigs), writeCount: observation.writes.length, changeCount: observation.changes.length }
    }
    const frames = [snapshot()], events: any[] = [], initialStored = structuredClone((window as any).drawerFixture.read())
    const windowResized = () => events.push({ kind: "window-resize", ...snapshot() })
    // This is an additional observer of real native browser notifications. It
    // records only; it never changes the library observer, scheduling or layout.
    const observer = new ResizeObserver(entries => { for (const entry of entries) events.push({ kind: "resize-observer", target: (entry.target as HTMLElement).id || "group", ...snapshot() }) })
    observer.observe(group); for (const panel of group.querySelectorAll(":scope > [data-panel]")) observer.observe(panel)
    window.addEventListener("resize", windowResized)
    let moving = false, budget = 180
    ;(window as any).drawerResizeFrames = new Promise(resolve => {
      const finish = (timedOut: boolean) => { observer.disconnect(); window.removeEventListener("resize", windowResized); resolve({ frames, events, initialStored, writes: structuredClone(observation.writes), changes: structuredClone(observation.changes), timedOut }) }
      const tick = () => {
        const frame = snapshot(); frames.push(frame)
        if (frame.phase === "closing" || frame.phase === "opening") moving = true
        if (moving && (frame.phase === "closed" || frame.phase === "open")) { finish(false); return }
        if (--budget <= 0) { finish(true); return }
        requestAnimationFrame(tick)
      }
      // Installed before the real action; no first/all moving sample is skipped.
      requestAnimationFrame(tick)
    })
  })
}

async function saveFrames(result: any, label: string) {
  const directory = "docs/evidence/sidebar-navigation/resize-measurement-" + (process.env.SIDEBAR_RESIZE_STAGE ?? "unspecified")
  await mkdir(directory, { recursive: true }); await writeFile(`${directory}/${label}.json`, JSON.stringify(result, null, 2) + "\n")
}

async function captureReopenDiagnostics(page: Page) {
  return page.evaluate(async () => {
    const observation = (window as any).drawerLayoutObservation
    const snapshot = () => {
      const group = document.querySelector<HTMLElement>(".workspace-group")!, root = document.querySelector<HTMLElement>(".dashboard-shell")!
      const panels = [...group.querySelectorAll<HTMLElement>(":scope > [data-panel]")].map(panel => { const r = panel.getBoundingClientRect(), s = getComputedStyle(panel); return { id: panel.id, width: r.width, flexGrow: s.flexGrow, flexShrink: s.flexShrink, flexBasis: s.flexBasis, display: s.display } })
      return { time: performance.now(), phase: root.dataset.sidebarPhase, mode: root.dataset.drawerMode, actual: document.querySelector("#sidebar")!.getBoundingClientRect().width, available: panels.reduce((sum, panel) => sum + panel.width, 0), panels, separators: [...group.querySelectorAll<HTMLElement>(":scope > [data-separator]")].map(separator => ({ width: separator.getBoundingClientRect().width, display: getComputedStyle(separator).display })), api: structuredClone(observation.api.getLayout()), stored: structuredClone((window as any).drawerFixture.read()), configurations: structuredClone(observation.panelConfigs) }
    }
    // Capture the original assertion point synchronously. Later samples explain
    // stability only; assertions must continue to use this first measurement.
    const first = snapshot(), settled = []
    for (let i = 0; i < 5; i++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); settled.push(snapshot()) }
    return { first, settled, writes: structuredClone(observation.writes), changes: structuredClone(observation.changes) }
  })
}

function sameGeometry(actual: Record<string, any>, expected: Record<string, any>, message: string) {
  for (const key of Object.keys(expected)) {
    if (typeof expected[key] === "number") assert(Math.abs(actual[key] - expected[key]) <= .1, `${message} ${key}: ${actual[key]} / ${expected[key]}`)
    else assert.equal(actual[key], expected[key], `${message} ${key}`)
  }
}

function assertMoving(result: any, phase: "closing" | "opening", destination: number) {
  assert.equal(result.timedOut, false)
  const moving = result.frames.filter((frame: any) => frame.phase === phase), firstPositive = moving.findIndex((frame: any) => frame.width > 0 && frame.visible > 0), baseline = phase === "closing" ? result.frames[0] : moving[firstPositive]
  assert(moving.length > 2)
  assert(baseline, "An actual visible moving shape is sampled")
  assert(moving.some((frame: any) => frame.viewport.width === destination), "Viewport really changes while the motion is active")
  let previous = baseline.visible
  for (let index = 0; index < moving.length; index++) {
    const frame = moving[index]
    assert.equal(frame.mode, baseline.mode, "Mode remains frozen through every moving frame")
    assert.equal(frame.innerId, baseline.innerId); assert.equal(frame.navigationId, baseline.navigationId)
    if (phase === "opening" && index < firstPositive) {
      assert.equal(frame.visible, 0, "Only fully invisible zero setup precedes the first positive opening shape")
      continue // Raw setup remains recorded; mode and instance are still checked.
    }
    assert(Math.abs(frame.width - baseline.width) <= .1, "Complete W remains fixed including resize's first frame")
    assert(frame.visible <= baseline.width + .1, `Real V ${frame.visible} must not exceed fixed W ${baseline.width}`)
    assert(Math.abs(frame.offset - (frame.visible - frame.width)) <= .1, `Real offset ${frame.offset} must equal raw V-W ${frame.visible - frame.width}`)
    assert(Math.abs(frame.height - baseline.height) <= .1)
    sameGeometry(frame.caption, baseline.caption, "Caption")
    assert.equal(frame.items.length, baseline.items.length)
    for (let i = 0; i < baseline.items.length; i++) sameGeometry(frame.items[i], baseline.items[i], `Item ${i}`)
    if (phase === "closing") assert(frame.visible <= previous + .1, `Closing V cannot grow ${previous} -> ${frame.visible}`)
    previous = frame.visible
  }
  const terminal = result.frames.at(-1)
  assert.equal(terminal.phase, phase === "closing" ? "closed" : "open")
  assert.equal(terminal.mode, destination < 900 ? "narrow" : "wide")
  if (phase === "closing") assert(terminal.visible <= .1)
}

async function resizeWhileMoving(page: Page, width: number, phase: "closing" | "opening") {
  await page.waitForTimeout(70)
  assert.equal(await page.locator(".dashboard-shell").getAttribute("data-sidebar-phase"), phase, "Resize begins during actual motion")
  await page.setViewportSize({ width, height: 1000 })
  return page.evaluate(() => (window as any).drawerResizeFrames)
}

for (const theme of ["ink", "paper"] as const) for (const dpr of [1, 1.5]) for (const direction of [[1800, 899], [899, 1800]] as const) test(`DRAWER-RESIZE closing first/all ${direction.join("-")} ${theme} DPR${dpr}`, () => withDrawer(browser, { width: direction[0], height: 1000, deviceScaleFactor: dpr, theme, initialLayout: initial, observeLayout: true }, async page => {
  assert.equal(await page.locator(".dashboard-shell").getAttribute("data-sidebar-phase"), "open")
  await armResizeFrames(page)
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  const result = await resizeWhileMoving(page, direction[1], "closing")
  await saveFrames(result, `${theme}-DPR${dpr}-closing-${direction.join("-")}`)
  assertMoving(result, "closing", direction[1])
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(stored.sidebarVisible, false); assert.equal(stored.lastSidebarSize, 15)
  await page.setViewportSize({ width: 1800, height: 1000 }); await page.waitForTimeout(100)
  await page.locator(".workspace-chat [data-sidebar-restore]").click()
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open")
  const reopen = await captureReopenDiagnostics(page)
  await saveFrames(reopen, `${theme}-DPR${dpr}-reopen-${direction.join("-")}`)
  const { actual, available } = reopen.first
  assert(Math.abs(actual - available * .15) <= .1, "Reopen uses the desktop preference, not narrow overlay width")
}))

for (const direction of [[1800, 899], [899, 1800]] as const) test(`DRAWER-RESIZE opening first/all ${direction.join("-")} ink DPR1.5`, () => withDrawer(browser, { width: direction[0], height: 1000, deviceScaleFactor: 1.5, initialLayout: initial, observeLayout: true }, async page => {
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  await armResizeFrames(page)
  if (direction[0] < 900) await recordDrawerDriverAction(page, "resize-opening", () => page.getByRole("button", { name: "作品目录", exact: true }).click())
  else await recordDrawerDriverAction(page, "resize-opening", () => page.locator(".workspace-chat [data-sidebar-restore]").click())
  const result = await resizeWhileMoving(page, direction[1], "opening")
  await saveFrames(result, `ink-DPR1.5-opening-${direction.join("-")}`)
  assertMoving(result, "opening", direction[1])
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(stored.sidebarVisible, true); assert.equal(stored.narrowPane, "sidebar")
  assert.equal(stored.lastSidebarSize, 15)
}))

test("DRAWER-RESIZE concurrent fullscreen closing first/all 1800-899 ink DPR1.5", () => withDrawer(browser, { width: 1800, height: 1000, deviceScaleFactor: 1.5, initialLayout: initial, observeLayout: true }, async page => {
  await armResizeFrames(page)
  // Same-turn synthetic DOM clicks invoke the real handlers; this does not
  // claim Windows native input or change Group/ResizeObserver scheduling.
  await page.evaluate(() => { document.querySelector<HTMLButtonElement>('button[aria-label="展开或收起左侧导航栏"]')!.click(); document.querySelector<HTMLButtonElement>('.workspace-content button[aria-label="进入全屏"]')!.click() })
  const result = await resizeWhileMoving(page, 899, "closing")
  await saveFrames(result, "ink-DPR1.5-fullscreen-closing-1800-899")
  assertMoving(result, "closing", 899)
  await page.waitForTimeout(500)
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(stored.chatVisible, false); assert.equal(stored.sizes.sidebar, 0); assert.equal(stored.sizes.chat, 0); assert.equal(stored.sizes.content, 100); assert.equal(stored.narrowPane, "content")
}))
