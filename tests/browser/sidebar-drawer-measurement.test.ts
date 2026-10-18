import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdir, writeFile } from "node:fs/promises"
import { chromium, type Browser, type Page } from "playwright-core"
import { withDrawer } from "../helpers/sidebar-drawer-fixture"
import type { WorkspaceLayout } from "../../src/lib/desktop/workspace-draft-source"

let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })
const initial: WorkspaceLayout = { version: 1, narrowPane: "sidebar", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 20, chat: 30, content: 50 }, lastSidebarSize: 20, lastContentSize: 50, lastChatSize: 30 }

async function armAllFrames(page: Page) {
  await page.evaluate(() => {
    const observation = (window as any).drawerLayoutObservation
    const snap = () => {
      const root = document.querySelector<HTMLElement>(".dashboard-shell")!, inner = document.querySelector<HTMLElement>(".sidebar-drawer-inner")!, viewport = document.querySelector<HTMLElement>("#sidebar")!, caption = inner.querySelector<HTMLElement>(".desktop-sidebar-controls")!
      const i = inner.getBoundingClientRect(), v = viewport.getBoundingClientRect(), c = caption.getBoundingClientRect(), style = getComputedStyle(inner)
      const panels = Object.fromEntries([...document.querySelectorAll<HTMLElement>(".workspace-group > [data-panel]")].map(pane => [pane.id, pane.getBoundingClientRect().width]))
      return { time: performance.now(), phase: root.dataset.sidebarPhase, mode: root.dataset.drawerMode, width: i.width, height: i.height, visible: v.width, offset: new DOMMatrix(style.transform).m41, caption: { left: c.left - i.left, top: c.top - i.top, width: c.width, height: c.height, absoluteTop: c.top }, styles: { font: style.fontSize, lineHeight: style.lineHeight, whiteSpace: style.whiteSpace }, panels, api: structuredClone(observation.api?.getLayout()), configurations: structuredClone(observation.panelConfigs), separators: document.querySelectorAll(".workspace-group > [data-separator]").length, writeCount: observation.writes.length }
    }
    const frames = [snap()]
    let moving = false, budget = 180
    ;(window as any).drawerMeasurement = { before: frames[0], frames, result: new Promise(resolve => {
      const tick = () => {
        const frame = snap(); frames.push(frame)
        if (frame.phase === "closing" || frame.phase === "opening") moving = true
        if (moving && (frame.phase === "closed" || frame.phase === "open")) { resolve({ frames, writes: structuredClone(observation.writes), defaults: structuredClone(observation.groupDefaults), timedOut: false }); return }
        if (--budget <= 0) { resolve({ frames, writes: structuredClone(observation.writes), defaults: structuredClone(observation.groupDefaults), timedOut: true }); return }
        requestAnimationFrame(tick)
      }
      // Registered before the real click. The first moving frame is retained,
      // including a React registration/default-layout change before hook rAF.
      requestAnimationFrame(tick)
    }) }
  })
}

async function saveFrames(result: any, name: string) {
  const directory = "docs/evidence/sidebar-navigation/measurement-" + (process.env.SIDEBAR_MEASUREMENT_STAGE ?? "unspecified")
  await mkdir(directory, { recursive: true }); await writeFile(`${directory}/${name}.json`, JSON.stringify(result, null, 2) + "\n")
}

function assertCompleteMovingShape(result: any) {
  assert.equal(result.timedOut, false)
  const before = result.frames[0], moving = result.frames.filter((frame: any) => frame.phase === "closing" || frame.phase === "opening")
  assert(moving.length > 2)
  for (const frame of moving) {
    assert(Math.abs(frame.width - before.width) <= .1, "Complete W stays fixed including every first frame")
    assert(frame.visible <= before.width + .1, `Actual moving V ${frame.visible} cannot exceed preflight W ${before.width}`)
    assert(Math.abs(frame.offset - (frame.visible - frame.width)) <= .1, `Actual offset ${frame.offset} must equal raw V-W ${frame.visible - frame.width}`)
    assert.equal(frame.separators, before.separators, "Concurrent commands retain existing divider allocation while Sidebar moves")
    assert.equal(frame.height, before.height); assert.deepEqual(frame.caption, before.caption); assert.deepEqual(frame.styles, before.styles)
  }
}

for (const theme of ["ink", "paper"] as const) for (const direction of [[1440, 1800], [1800, 1440]] as const) test(`DRAWER-MEASURE real first frame after idle resize ${direction.join("-")} ${theme}`, () => withDrawer(browser, { width: direction[0], theme, initialLayout: initial, observeLayout: true }, async page => {
  await page.setViewportSize({ width: direction[1], height: 700 }); await page.waitForTimeout(150)
  await armAllFrames(page)
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  const result = await page.evaluate(() => (window as any).drawerMeasurement.result)
  await saveFrames(result, `${theme}-${direction.join("-")}`)
  assert.equal(result.timedOut, false)
  const before = result.frames[0], moving = result.frames.filter((frame: any) => frame.phase === "closing")
  assert(moving.length > 2)
  let previous = before.visible
  for (const frame of moving) {
    assert(Math.abs(frame.width - before.width) <= .1, "Complete W stays fixed including the first frame")
    assert(frame.visible <= before.width + .1, `First/all closing V ${frame.visible} cannot exceed preflight W ${before.width}`)
    assert(frame.visible <= previous + .1, "Closing V cannot grow after the real command")
    assert(Math.abs(frame.offset - (frame.visible - frame.width)) <= .1, `Actual offset ${frame.offset} must equal raw V-W ${frame.visible - frame.width}`)
    assert.equal(frame.separators, before.separators, "Closing starts with the same divider allocation")
    assert.equal(frame.height, before.height); assert.deepEqual(frame.caption, before.caption); assert.deepEqual(frame.styles, before.styles)
    previous = frame.visible
  }
  const final = result.frames.at(-1); assert.equal(final.phase, "closed"); assert(final.visible <= .1)
  await page.locator("[data-sidebar-restore]").click(); await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open")
  const reopened = await page.locator("#sidebar").evaluate(el => el.getBoundingClientRect().width)
  assert(Math.abs(reopened - before.visible) <= 1, "Idle resize keeps the actual Sidebar pixel preference when reopening")
}))

for (const theme of ["ink", "paper"] as const) test(`DRAWER-MEASURE same-turn fullscreen keeps first/all closing allocation ${theme}`, () => withDrawer(browser, { width: 1440, theme, initialLayout: initial, observeLayout: true }, async page => {
  await page.setViewportSize({ width: 1800, height: 700 }); await page.waitForTimeout(150)
  await armAllFrames(page)
  // Both real React handlers run in one browser turn. These are synthetic DOM
  // clicks, explicitly not Windows native input; Group/Panel remain real.
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('button[aria-label="展开或收起左侧导航栏"]')!.click()
    document.querySelector<HTMLButtonElement>('.workspace-content button[aria-label="进入全屏"]')!.click()
  })
  const result = await page.evaluate(() => (window as any).drawerMeasurement.result)
  await saveFrames(result, `${theme}-concurrent-fullscreen`)
  assertCompleteMovingShape(result)
  assert.equal(result.frames.at(-1).phase, "closed")
  await page.waitForTimeout(500)
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(stored.chatVisible, false); assert.equal(stored.sizes.chat, 0); assert.equal(stored.sizes.sidebar, 0); assert.equal(stored.sizes.content, 100)
  assert.equal(await page.locator(".workspace-group > [data-separator]").count(), 0, "Dividers are removed only after both tracks settle")
}))

for (const theme of ["ink", "paper"] as const) test(`DRAWER-MEASURE first/all frames survive early reversal ${theme}`, () => withDrawer(browser, { width: 1440, theme, initialLayout: initial, observeLayout: true }, async page => {
  await page.setViewportSize({ width: 1800, height: 700 }); await page.waitForTimeout(150)
  await armAllFrames(page)
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForFunction(() => (window as any).drawerMeasurement.frames.some((frame: any) => frame.phase === "closing"))
  const reversal = await page.evaluate(() => {
    const measurement = (window as any).drawerMeasurement, phase = document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase
    const closing = measurement.frames.filter((frame: any) => frame.phase === "closing")
    if (phase !== "closing" || !closing.length) throw Error("Early reversal requires a collected closing frame while the drawer is still closing")
    const observation = { time: performance.now(), phase, firstClosingTime: closing[0].time, frameCount: measurement.frames.length, closingSamples: closing.length }
    document.querySelector<HTMLButtonElement>(".workspace-chat [data-sidebar-restore]")!.click()
    return observation
  })
  const result = await page.evaluate(() => (window as any).drawerMeasurement.result)
  await saveFrames({ ...result, reversal }, `${theme}-early-reversal`)
  assert.equal(reversal.phase, "closing"); assert(reversal.firstClosingTime <= reversal.time)
  assertCompleteMovingShape(result)
  assert(result.frames.some((frame: any) => frame.phase === "closing"), "Collector retains the first closing frame before reversal")
  assert(result.frames.some((frame: any) => frame.phase === "opening"), "Collector retains the reversing opening frames")
  assert.equal(result.frames.at(-1).phase, "open")
  assert(Math.abs(result.frames.at(-1).visible - result.frames[0].visible) <= .1, "Reversal restores the actual resized width")
}))

test("DRAWER-MEASURE opening retains fixed shape during a growing viewport", () => withDrawer(browser, { width: 1440, theme: "ink", initialLayout: initial, observeLayout: true }, async page => {
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  await armAllFrames(page)
  await page.locator(".workspace-chat [data-sidebar-restore]").click()
  await page.waitForTimeout(70); await page.setViewportSize({ width: 1800, height: 700 })
  const result = await page.evaluate(() => (window as any).drawerMeasurement.result)
  await saveFrames(result, "ink-growing-opening")
  assert.equal(result.timedOut, false)
  const moving = result.frames.filter((frame: any) => frame.phase === "opening"), first = moving[0]
  assert(moving.length > 2)
  assert(moving.some((frame: any) => frame.panels.sidebar + frame.panels.chat + frame.panels.content > 1700), "Collector includes the larger real Group during motion")
  for (const frame of moving) {
    assert(Math.abs(frame.width - first.width) <= .1, "Opening complete W remains fixed across the growing viewport")
    assert(frame.visible <= first.width + .1, `Growing opening V ${frame.visible} cannot exceed fixed W ${first.width}`)
    assert(Math.abs(frame.offset - (frame.visible - frame.width)) <= .1, `Growing opening offset ${frame.offset} must equal raw V-W ${frame.visible - frame.width}`)
    assert.equal(frame.height, first.height); assert.deepEqual(frame.caption, first.caption); assert.deepEqual(frame.styles, first.styles)
  }
  assert.equal(result.frames.at(-1).phase, "open")
  await page.waitForTimeout(80)
  const settled = await page.locator("#sidebar").evaluate(el => el.getBoundingClientRect().width)
  const divider = await page.locator(".workspace-group > [data-separator]").first().boundingBox(); assert(divider)
  await page.mouse.move(divider.x + divider.width / 2, divider.y + divider.height / 2); await page.mouse.down()
  await page.mouse.move(divider.x + divider.width / 2 + 35, divider.y + divider.height / 2, { steps: 5 }); await page.mouse.up()
  const dragged = await page.locator("#sidebar").evaluate(el => el.getBoundingClientRect().width)
  assert(dragged > settled + 20, "Settled registration coordination releases ordinary manual resize")
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  const available = await page.locator(".workspace-group > [data-panel]").evaluateAll(panes => panes.reduce((sum, pane) => sum + pane.getBoundingClientRect().width, 0))
  assert(Math.abs(stored.sizes.sidebar / 100 * available - dragged) <= .1, "Idle drag updates the real stored width instead of being repinned")
}))

test("DRAWER-MEASURE explicit restore and unmount cancel registration compensation", () => withDrawer(browser, { width: 1440, initialLayout: initial, observeLayout: true }, async page => {
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click(); await page.waitForTimeout(70)
  assert.equal(await page.locator(".dashboard-shell").getAttribute("data-sidebar-phase"), "closing", "Restore cancels an actual in-progress motion")
  await page.evaluate(() => (window as any).drawerFixture.restore({ version: 1, narrowPane: "content", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 25, chat: 35, content: 40 }, lastSidebarSize: 18, lastChatSize: 55, lastContentSize: 48 }))
  await page.waitForTimeout(650)
  const restored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.deepEqual(restored.sizes, { sidebar: 25, chat: 35, content: 40 }, "Explicit restore beats both motion and historical size preferences")
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click(); await page.waitForTimeout(70)
  assert.equal(await page.locator(".dashboard-shell").getAttribute("data-sidebar-phase"), "closing", "Unmount cancels an actual in-progress motion")
  const afterUnmount = await page.evaluate(() => { (window as any).drawerFixture.unmount(); return (window as any).drawerLayoutObservation.writes.length })
  await page.waitForTimeout(650)
  assert.equal(await page.locator("#app").evaluate(el => el.childElementCount), 0)
  assert.equal(await page.evaluate(() => (window as any).drawerLayoutObservation.writes.length), afterUnmount, "Unmount disconnects scoped Observer and cancels the owner frame")
}))
