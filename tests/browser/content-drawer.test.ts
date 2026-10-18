import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium, type Browser, type Page } from "playwright-core"
import { assertFixedFrames, framesDuring, openContent, sampleContent, withContentDrawer, type ContentSample } from "../helpers/content-drawer-fixture"

let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })
const restore = '.workspace-chat [data-content-restore]'
const command = (page: Page, name: "toggle" | "sidebar" | "fullscreen" | "hide" | "activate") => page.evaluate(name => (window as any).contentFixture[name](), name)
const read = (page: Page) => page.evaluate(() => (window as any).contentFixture.read())
const near = (actual: number, expected: number) => assert(Math.abs(actual - expected) < .05, `${actual} should equal ${expected}`)

async function initialAppRegion(page: Page) {
  const value = await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.setProperty("-webkit-app-region", "initial")
    document.body.append(probe)
    const value = getComputedStyle(probe).getPropertyValue("-webkit-app-region")
    probe.remove()
    return value
  })
  assert(value && value !== "drag" && value !== "no-drag", `Chromium exposes an independently probed initial app-region value, got ${value}`)
  return value
}
function assertPausedRegions(samples: ContentSample[], initial: string, label: string) {
  assert(samples.length, `${label}: real sampled content is present`)
  for (const [index, sample] of samples.entries()) {
    assert.equal(sample.region, initial, `${label} frame ${index}: caption app-region is initial`)
    for (const [key, region] of Object.entries(sample.controlRegions)) assert.equal(region, initial, `${label} frame ${index}: ${key} app-region is initial`)
  }
}
function assertOpenRegions(sample: ContentSample, label: string) {
  assert.equal(sample.region, "drag", `${label}: open real caption restores drag`)
  const tools = Object.entries(sample.controlRegions).filter(([key]) => key.startsWith("caption.tool:"))
  assert(tools.length, `${label}: real caption tools were sampled`)
  for (const [key, region] of tools) assert.equal(region, "no-drag", `${label}: ${key} restores no-drag`)
}

for (const theme of ["ink", "paper"] as const) test(`CD-01 ${theme} first open and close preserve every rAF width and text line`, () => withContentDrawer(browser, { theme }, async page => {
  const opening = await framesDuring(page, () => page.evaluate(() => (window as any).contentFixture.open()))
  const complete = await sampleContent(page)
  assert(complete.width > 300 && complete.height > 500, "Real content body has meaningful complete geometry")
  assert(complete.lines.first.length >= 2, "Natural body text wraps at its complete width")
  // First assertion on the unfixed shell is measured width/line geometry, not a
  // missing production wrapper, data attribute or fixture compilation problem.
  const firstFrames = assertFixedFrames(opening, complete, `${theme} first open`)
  assert(firstFrames.every(frame => frame.inert), "Every opening frame pauses content interaction")
  assert.equal(complete.phase, "open")
  const closing = await framesDuring(page, () => command(page, "hide"))
  const closeFrames = assertFixedFrames(closing, complete, `${theme} close`)
  assert(closeFrames.every(frame => frame.inert), "Every closing frame is inert")
  const hidden = await sampleContent(page)
  assert.equal(hidden.phase, "closed"); near(hidden.visible, 0)
  assert.equal(await page.locator('[data-content-instance]').count(), 1, "Hidden content instance stays mounted")
  assert.equal(await page.locator('#content').getAttribute("aria-hidden"), "true")
  const layout = await read(page)
  assert.equal(layout.contentVisible, false); assert.equal(layout.chatVisible, true); assert.equal(layout.sizes.content, undefined)
  assert.equal(await page.locator('.workspace-group [data-separator]').count(), 1, "Hidden content leaves only the sidebar/chat separator")
  const reopening = await framesDuring(page, () => page.locator(restore).click())
  assertFixedFrames(reopening, await sampleContent(page), `${theme} reopen`)
}))

test("CD-01 repeated command reversal keeps fixed geometry and never exposes the restore control in motion", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const complete = await sampleContent(page), instance = await page.locator('[data-content-instance]').getAttribute('data-content-instance')
  // 2026-10-15: the caption restore control exists only at the settled closed
  // phase. Mid-flight reversal stays available through the real command path.
  const samples = await framesDuring(page, async () => {
    await command(page, "hide"); await page.waitForTimeout(110)
    await command(page, "toggle"); await page.waitForTimeout(100)
    await command(page, "toggle")
  }, 900)
  assertFixedFrames(samples, complete, "repeated reversal")
  const moving = samples.filter(frame => frame.phase === "opening" || frame.phase === "closing")
  assert(moving.some(frame => frame.phase === "opening") && moving.some(frame => frame.phase === "closing"))
  assert(moving.every(frame => !frame.restore), "No opening/closing frame exposes the restore control")
  const firstRestore = samples.find(frame => frame.restore)
  assert(firstRestore, "Restore control reappears after the final settle")
  assert.equal(firstRestore.phase, "closed", "Restore control reappears only at the settled closed phase")
  assert.equal(await page.locator('[data-content-instance]').getAttribute('data-content-instance'), instance)
  const shown = await framesDuring(page, () => page.locator(restore).press("Enter"))
  assertFixedFrames(shown, complete, "keyboard re-open")
  assert(shown.filter(frame => frame.phase === "opening").every(frame => !frame.restore), "Keyboard re-open hides the control before the opening motion")
  assert.equal((await sampleContent(page)).phase, "open")
}))

test("CD-08 restore click hides the control before the opening animation's first frame", () => withContentDrawer(browser, {}, async page => {
  assert.equal(await page.locator(restore).count(), 1, "Closed drawer exposes the restore control")
  const immediate = await page.evaluate(async () => {
    document.querySelector<HTMLElement>('.workspace-chat [data-content-restore]')!.click()
    await Promise.resolve() // The click commits the new phase by the next microtask, before any paint.
    const shell = document.querySelector<HTMLElement>('.dashboard-shell')!, viewport = document.querySelector<HTMLElement>('.content-drawer-viewport') ?? document.querySelector<HTMLElement>('#content')
    return { phase: shell.dataset.contentPhase, restore: !!document.querySelector('.workspace-chat [data-content-restore]'), visible: viewport?.getBoundingClientRect().width ?? 0 }
  })
  assert.equal(immediate.phase, "opening", "Click commits the opening phase before the first paint")
  assert.equal(immediate.restore, false, "Restore control is removed before any animation frame paints")
  assert(immediate.visible < 1, `Opening animation has not played yet, visible=${immediate.visible}`)
  const frames = await framesDuring(page, () => page.waitForTimeout(700), 700)
  const moving = frames.filter(frame => frame.phase === "opening")
  assert(moving.length >= 8, `Opening motion is actually sampled, got ${moving.length} frames`)
  assert(moving.every(frame => !frame.restore), "No opening frame contains the restore control")
  assert.equal((await sampleContent(page)).phase, "open")
  assert.equal(await page.locator(restore).count(), 0, "Open drawer keeps the restore control hidden")
}))

test("CD-08 restore control appears only after the closing animation completes", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const immediate = await page.evaluate(async () => {
    document.querySelector<HTMLElement>('button[aria-label="显示 / 隐藏内容面板"]')!.click()
    await Promise.resolve() // The click commits the new phase by the next microtask, before any paint.
    const shell = document.querySelector<HTMLElement>('.dashboard-shell')!
    return { phase: shell.dataset.contentPhase, restore: !!document.querySelector('.workspace-chat [data-content-restore]') }
  })
  assert.equal(immediate.phase, "closing", "Hide click commits the closing phase before the first paint")
  assert.equal(immediate.restore, false, "Restore control does not appear when the closing animation starts")
  const frames = await framesDuring(page, () => page.waitForTimeout(700), 700)
  const moving = frames.filter(frame => frame.phase === "closing")
  assert(moving.length >= 8, `Closing motion is actually sampled, got ${moving.length} frames`)
  assert(moving.every(frame => !frame.restore), "No closing frame contains the restore control")
  const firstRestore = frames.find(frame => frame.restore)
  assert(firstRestore, "Restore control reappears")
  assert.equal(firstRestore.phase, "closed", "Restore control appears only after the closing animation completes")
  assert(firstRestore.visible < 1, `Restore control reappears at the fully closed width, visible=${firstRestore.visible}`)
  const hidden = await sampleContent(page)
  assert.equal(hidden.phase, "closed")
  const control = page.locator(restore)
  assert.equal(await control.count(), 1, "Restore control is mounted after the settle")
  assert.equal(await control.evaluate(el => !!el.closest("[inert]")), false, "Settled restore control is interactive")
}))

test("CD-08 focus moved during closing is not stolen by the settled restore focus", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  await page.getByRole("textbox", { name: "隔离正文草稿" }).focus()
  const external = page.getByRole("button", { name: "外部焦点", exact: true })
  const frames = await framesDuring(page, async () => {
    await command(page, "hide"); await page.waitForTimeout(120)
    await external.focus()
  }, 700)
  assert(frames.some(frame => frame.phase === "closing"), "Focus transfer happens inside the closing motion")
  assert(frames.filter(frame => frame.phase === "closing").every(frame => !frame.restore), "No closing frame contains the restore control")
  await page.waitForTimeout(200)
  assert.equal(await external.evaluate(el => el === document.activeElement), true, "User focus moved during the motion is not stolen at the settle")
  assert.equal((await sampleContent(page)).phase, "closed")
  assert.equal(await page.locator(restore).count(), 1, "Restore control still appears after the closing animation completes")
}))

test("CD-02 simultaneous left/right movement and fullscreen replacement retain the original shape to latest terminal intent", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const complete = await sampleContent(page)
  const closing = await framesDuring(page, async () => { await command(page, "hide"); await command(page, "sidebar") })
  assertFixedFrames(closing, complete, "both closing")
  assert(closing.some(frame => frame.phase === "closing" && frame.sidebarPhase === "closing"), "Both real motions overlap")
  const hidden = await read(page)
  assert.equal(hidden.sidebarVisible, false); assert.equal(hidden.contentVisible, false)
  const opening = await framesDuring(page, async () => {
    await command(page, "toggle"); await command(page, "sidebar"); await page.waitForTimeout(90)
    const saved = await read(page)
    assert.equal(saved.contentVisible, true); assert.equal(saved.sidebarVisible, true)
    assert(saved.sizes.content >= 30, "Read exposes a complete target during motion")
    await command(page, "fullscreen")
  }, 950)
  // Measure the first visible moving shape before replacement. Final fullscreen
  // reflow is allowed only after contentPhase settles.
  const reference = opening.find(frame => frame.phase === "opening" && frame.visible > 1)!
  assert(reference, "Opening captured before fullscreen replacement")
  assertFixedFrames(opening, reference, "opening then fullscreen")
  assert(opening.some(frame => frame.phase === "opening" && frame.visible > reference.width + 1), "Right phase remains frozen while chat-axis replacement grows its viewport")
  const fullscreen = await read(page)
  assert.equal(fullscreen.chatVisible, false); near(fullscreen.sizes.chat, 0)
  near(fullscreen.sizes.sidebar + fullscreen.sizes.content, 100)
  assert.equal((await sampleContent(page)).phase, "open")
  await command(page, "fullscreen"); await page.waitForTimeout(680)
  assert.equal((await read(page)).chatVisible, true)
}))

test("CD-02 fullscreen commands while hidden or closing cannot revive content or hide chat", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const complete = await sampleContent(page)
  const samples = await framesDuring(page, async () => { await command(page, "hide"); await page.waitForTimeout(65); await command(page, "fullscreen") })
  assertFixedFrames(samples, complete, "closing fullscreen ignored")
  assert.equal((await sampleContent(page)).phase, "closed")
  await command(page, "fullscreen"); await page.waitForTimeout(680)
  const hidden = await read(page)
  assert.equal(hidden.contentVisible, false); assert.equal(hidden.chatVisible, true)
  near((await sampleContent(page)).visible, 0)
  assert.equal(await page.locator('[data-content-instance]').count(), 1)
}))

test("CD-01 long real caption completes preparation without capacity and overflow oscillation", () => withContentDrawer(browser, {}, async page => {
  const frames = await framesDuring(page, () => page.evaluate(() => (window as any).contentFixture.open(1, "这是足够长而达到真实标签最大宽度的作品内容标题".repeat(8))))
  const complete = await sampleContent(page)
  assert.equal(complete.phase, "open", "Long caption must converge and allow the drawer to open")
  assertFixedFrames(frames, complete, "long caption first opening")
}))

test("CD-01 same-task initial open close open prepares registered width before any visible frame", () => withContentDrawer(browser, { width: 1920 }, async page => {
  const frames = await framesDuring(page, () => page.evaluate(() => {
    const fixture = (window as any).contentFixture
    return [fixture.toggle(), fixture.toggle(), fixture.toggle()]
  }))
  const complete = await sampleContent(page)
  assert.equal(complete.phase, "open")
  assertFixedFrames(frames, complete, "initial same-task open close open")
}))

for (const width of [600, 899]) test(`CD-03 narrow ${width}px drawer return to chat retains desktop preference`, () => withContentDrawer(browser, { width }, async page => {
  const opening = await framesDuring(page, () => page.evaluate(() => (window as any).contentFixture.open()))
  const complete = await sampleContent(page)
  assertFixedFrames(opening, complete, `narrow ${width} first open`)
  near(complete.width, width); assert.equal(complete.mode, "narrow"); assert.equal(complete.pane, "content")
  assert.equal(await page.locator('.workspace-chat').count(), 1)
  const preference = await read(page)
  assert.equal(preference.contentVisible, true)
  await command(page, "fullscreen"); await page.waitForTimeout(60)
  assert.deepEqual(await read(page), preference, "Narrow fullscreen command is an ignored geometry request")
  const closing = await framesDuring(page, () => page.getByRole("button", { name: "返回对话", exact: true }).click())
  assertFixedFrames(closing, complete, `narrow ${width} return chat`)
  assert.equal((await sampleContent(page)).phase, "closed")
  const returned = await read(page)
  assert.equal(returned.contentVisible, true); assert.equal(returned.narrowPane, "chat")
  assert.deepEqual(returned.sizes, preference.sizes); assert.equal(returned.lastContentSize, preference.lastContentSize)
  const reopening = await framesDuring(page, () => page.getByRole("button", { name: "查看内容", exact: true }).click())
  assertFixedFrames(reopening, complete, `narrow ${width} reopen`)
  await command(page, "hide"); await page.waitForTimeout(520)
  const hidden = await read(page)
  assert.equal(hidden.contentVisible, false); assert.equal(hidden.narrowPane, "chat")
}))

for (const [from, to] of [[900, 899], [899, 900]] as const) test(`CD-03 resize ${from} to ${to} freezes width height and mode until motion completes`, () => withContentDrawer(browser, { width: from, height: 760 }, async page => {
  await openContent(page)
  const complete = await sampleContent(page), originalMode = complete.mode
  const samples = await framesDuring(page, async () => {
    await command(page, "hide"); await page.waitForTimeout(65)
    await page.setViewportSize({ width: to, height: 610 }); await page.waitForTimeout(65)
    const mid = await sampleContent(page)
    assert.equal(mid.mode, originalMode, "CSS mode does not change during drawer movement")
    assert.equal(mid.phase, "closing")
  })
  assertFixedFrames(samples, complete, `${from} to ${to} width and height resize`)
  const closed = await sampleContent(page)
  assert.equal(closed.phase, "closed"); assert.equal(closed.mode, to < 900 ? "narrow" : "wide")
  const reopening = await framesDuring(page, () => command(page, "toggle"))
  const latest = await sampleContent(page)
  assertFixedFrames(reopening, latest, `${to} resized reopening`)
  assert(latest.height < complete.height, "Next motion uses the new window height")
  if (to < 900) near(latest.width, to)
}))

test("CD-04 restore cancels older motion, preserves mounted body and does not dispatch stale focus", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const instance = await page.locator('[data-content-instance]').getAttribute('data-content-instance')
  await page.getByRole("textbox", { name: "隔离正文草稿" }).fill("restore 保留草稿")
  await page.getByRole("textbox", { name: "隔离正文草稿" }).focus()
  await command(page, "hide"); await page.waitForTimeout(70); await command(page, "sidebar")
  await page.getByRole("button", { name: "外部焦点", exact: true }).focus()
  const hiddenLayout = { version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: false, sizes: { sidebar: 25, chat: 75 }, lastSidebarSize: 25, lastContentSize: 35, lastChatSize: 40 }
  await page.evaluate(layout => (window as any).contentFixture.restore(layout), hiddenLayout)
  await page.waitForTimeout(900)
  const restored = await read(page)
  assert.equal(restored.contentVisible, false); assert.equal(restored.sidebarVisible, true); near(restored.sizes.sidebar, 25)
  assert.equal((await sampleContent(page)).phase, "closed")
  assert.equal(await page.locator('[data-content-instance]').getAttribute('data-content-instance'), instance)
  assert.equal(await page.getByRole("textbox", { name: "隔离正文草稿", includeHidden: true }).inputValue(), "restore 保留草稿")
  assert.equal(await page.getByRole("button", { name: "外部焦点", exact: true }).evaluate(el => el === document.activeElement), true)
  await command(page, "toggle"); await page.waitForTimeout(80)
  const openLayout = { ...hiddenLayout, narrowPane: "content", contentVisible: true, sizes: { sidebar: 25, chat: 40, content: 35 }, lastSidebarSize: 18, lastContentSize: 48 }
  await page.evaluate(layout => (window as any).contentFixture.restore(layout), openLayout)
  await page.waitForTimeout(900)
  const final = await read(page)
  near(final.sizes.sidebar, 25); near(final.sizes.chat, 40); near(final.sizes.content, 35)
  assert.equal((await sampleContent(page)).phase, "open")
  // Actual separator pointer input takes ownership after restoration. A restore
  // registration guard cannot keep forcing the old 25% over a new user resize.
  const separator = page.locator('.workspace-group > [data-separator]').first(), box = await separator.boundingBox()
  assert(box)
  const x = box.x + box.width / 2, y = box.y + Math.min(100, box.height / 2)
  const hit = await separator.evaluate((el, point) => { const hit = document.elementFromPoint(point.x, point.y); return { inGroup: !!hit && !!el.closest('[data-group]')?.contains(hit), inert: !!hit?.closest('[inert],[hidden],[aria-hidden="true"]'), tag: hit?.tagName, className: hit?.getAttribute("class"), panel: hit?.closest("[data-panel]")?.id, separator: el.getBoundingClientRect().toJSON() } }, { x, y })
  assert.equal(hit.inGroup && !hit.inert, true, `Actual pointer hits the restored Group without an unrelated overlay: ${JSON.stringify(hit)}`)
  // The library expands the 1px line's pointer hit region into adjacent panels.
  // Verify its real hover state instead of requiring that border's DOM contains
  // the pixel-rounded elementFromPoint result.
  await page.mouse.move(x, y)
  await page.waitForFunction(() => document.querySelector('.workspace-group > [data-separator]')?.getAttribute('data-separator') === 'hover')
  await page.mouse.down()
  await page.waitForFunction(() => document.querySelector('.workspace-group > [data-separator]')?.getAttribute('data-separator') === 'active')
  await page.mouse.move(x + 40, y, { steps: 8 }); await page.mouse.up()
  await page.waitForTimeout(180)
  const manualGeometry = await page.locator('#sidebar').evaluate(el => ({ width: el.getBoundingClientRect().width, percentage: Number(getComputedStyle(el).flexGrow) }))
  const manual = await read(page)
  assert(manualGeometry.percentage > final.sizes.sidebar + .5, `Real separator drag changes Group geometry: ${JSON.stringify(manualGeometry)}`)
  assert(manual.sizes.sidebar > final.sizes.sidebar + .5, `Real separator drag changes the restored sidebar preference: ${JSON.stringify(manual.sizes)}`)
  await page.waitForTimeout(240)
  near((await read(page)).sizes.sidebar, manual.sizes.sidebar)
}))

test("CD-04 reduced motion reaches the final geometry without intermediate visible widths", () => withContentDrawer(browser, { reduced: true }, async page => {
  const opening = await framesDuring(page, () => page.evaluate(() => (window as any).contentFixture.open()), 120)
  const complete = await sampleContent(page)
  assert.equal(complete.phase, "open")
  assert(!opening.some(s => s.exists && s.visible > 1 && s.visible < complete.width - 1), "Reduced opening has no partial width")
  const closing = await framesDuring(page, () => command(page, "hide"), 120)
  assert.equal((await sampleContent(page)).phase, "closed")
  assert(!closing.some(s => s.exists && s.visible > 1 && s.visible < complete.width - 1), "Reduced closing has no partial width")
  await page.locator(restore).press("Enter"); await page.waitForTimeout(60)
  assert.equal((await sampleContent(page)).phase, "open")
}))

test("CD-05 instance draft selection scroll and focus ownership survive repeated hiding", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const input = page.getByRole("textbox", { name: "隔离正文草稿" }), instance = await page.locator('[data-content-instance]').getAttribute('data-content-instance')
  await input.fill("保留正文草稿与选区")
  await input.evaluate(el => { (el as HTMLInputElement).setSelectionRange(2, 6) })
  await page.locator('[data-geometry="body"]').evaluate(el => { el.scrollTop = 210 })
  const scroll = await page.locator('[data-geometry="body"]').evaluate(el => el.scrollTop)
  await input.focus(); await command(page, "hide"); await page.waitForTimeout(520)
  assert.equal(await page.locator(restore).evaluate(el => el === document.activeElement), true, "Close owns visible restore focus")
  await page.locator(restore).press("Enter"); await page.waitForTimeout(680)
  assert.equal(await input.evaluate(el => el === document.activeElement), true, "Owned restore returns to previous content input")
  assert.equal(await input.inputValue(), "保留正文草稿与选区")
  assert.deepEqual(await input.evaluate(el => [(el as HTMLInputElement).selectionStart, (el as HTMLInputElement).selectionEnd]), [2, 6])
  assert.equal(await page.locator('[data-geometry="body"]').evaluate(el => el.scrollTop), scroll)
  assert.equal(await page.locator('[data-content-instance]').getAttribute('data-content-instance'), instance)
  await command(page, "hide"); await page.waitForTimeout(80)
  const external = page.getByRole("button", { name: "外部焦点", exact: true })
  await external.focus(); await command(page, "toggle"); await page.waitForTimeout(680)
  assert.equal(await external.evaluate(el => el === document.activeElement), true, "Active user focus transfer supersedes restoration")
  await command(page, "hide"); await page.waitForTimeout(520)
  await external.focus(); await command(page, "activate"); await page.waitForTimeout(680)
  assert.equal(await external.evaluate(el => el === document.activeElement), true, "Automatic Tab activation opens without stealing focus")
}))

test("CD-07 hidden or inert content editor is excluded from commands and fallback candidates", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  await page.evaluate(() => (window as any).contentFixture.remember())
  assert.equal(await page.evaluate(() => (window as any).contentFixture.editorEnabled()), true)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.editorTarget()), "隔离正文草稿")
  const captured = await page.evaluate(async () => {
    const fixture = (window as any).contentFixture, shell = document.querySelector<HTMLElement>('.dashboard-shell')!, viewport = document.querySelector<HTMLElement>('.content-drawer-viewport')!
    const input = document.querySelector('[aria-label="隔离正文草稿"]')!
    const sample = () => ({ time: performance.now(), phase: shell.dataset.contentPhase, visible: viewport.getBoundingClientRect().width, inert: !!input.closest('[inert]'), enabled: fixture.editorEnabled() as boolean })
    type Snapshot = ReturnType<typeof sample>
    const before = sample(), frames: Snapshot[] = []
    return new Promise<Snapshot & { before: Snapshot; commit: Snapshot; firstVisible: Snapshot; frames: Snapshot[] }>((resolve, reject) => {
      let commit: Snapshot | null = null, firstFrame: Snapshot | null = null, firstVisible: Snapshot | null = null, raf = 0, commitRaf = 0, finished = false
      const cleanup = () => { finished = true; observer.disconnect(); clearTimeout(deadline); cancelAnimationFrame(raf); cancelAnimationFrame(commitRaf) }
      const finish = () => { if (commit && firstFrame && firstVisible) { cleanup(); resolve({ ...firstFrame, before, commit, firstVisible, frames }) } }
      // A normal Shell callback can commit after the action's first rAF. Observe
      // that commit while retaining every earlier frame and its real geometry.
      const observer = new MutationObserver(() => {
        if (!commit && shell.dataset.contentPhase === "closing") {
          commit = sample()
          commitRaf = requestAnimationFrame(() => { firstFrame = sample(); finish() })
        }
      })
      const deadline = setTimeout(() => { cleanup(); reject(Error("Closing commit and first visible content motion were not observed within 5s")) }, 5000)
      observer.observe(shell, { attributes: true, attributeFilter: ["data-content-phase"] })
      fixture.hide()
      const track = () => {
        if (finished) return
        const frame = sample(); frames.push(frame)
        if (!firstVisible && Math.abs(frame.visible - before.visible) > .35) firstVisible = frame
        finish()
        if (!finished) raf = requestAnimationFrame(track)
      }
      raf = requestAnimationFrame(track)
    })
  })
  assert.equal(captured.phase, "closing"); assert.equal(captured.inert, true)
  assert.equal(captured.enabled, false, "First visible motion frame gates editor command registration")
  assert(Math.abs(captured.commit.visible - captured.before.visible) <= .35, "Closing commit gates commands before any visible movement")
  for (const frame of captured.frames.filter(frame => frame.time < captured.commit.time)) assert(Math.abs(frame.visible - captured.before.visible) <= .35, "A pre-commit rAF cannot expose visible movement")
  for (const [stage, frame] of [["closing commit", captured.commit], ["first visible motion", captured.firstVisible]] as const) {
    assert.equal(frame.phase, "closing", `${stage}: real phase is closing`)
    assert.equal(frame.inert, true, `${stage}: content is inert`)
    assert.equal(frame.enabled, false, `${stage}: editor commands are gated`)
  }
  for (const frame of captured.frames.filter(frame => Math.abs(frame.visible - captured.before.visible) > .35)) {
    assert.equal(frame.phase, "closing"); assert.equal(frame.inert, true); assert.equal(frame.enabled, false)
  }
  await page.waitForTimeout(520)
  assert.equal(await page.locator('[data-content-instance]').count(), 1)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.editorTarget()), null)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.edit()), false)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.editorCalls), 0)
  await command(page, "toggle"); await page.waitForTimeout(680)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.editorEnabled()), true)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.edit()), true)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.editorCalls), 1)
}))

for (const empty of [false, true]) test(`CD-07 ${empty ? "empty" : "with Tab"} real caption resets app-region during motion and hidden state, then restores tools`, () => withContentDrawer(browser, {}, async page => {
  const initial = await initialAppRegion(page)
  await openContent(page)
  if (empty) {
    // Close the real store's Tabs so ContentTabs switches to its actual empty
    // caption branch. The real Shell subscriber closes the drawer; reopening
    // uses the registered Shell callback, never a production testing branch.
    await page.evaluate(() => (window as any).contentFixture.empty())
    await page.waitForTimeout(540)
    const opening = await framesDuring(page, () => command(page, "toggle"))
    const complete = await sampleContent(page)
    assert.equal(await page.locator('.content-tabs [role="tab"]').count(), 0)
    assert.equal(await page.locator('[data-content-instance]').count(), 0)
    assert(Object.keys(complete.controls).some(key => key === "caption.tool:隐藏内容面板"), "Actual empty-caption hide control has its own sampled geometry")
    assertPausedRegions(assertFixedFrames(opening, complete, "empty caption opening"), initial, "empty caption opening")
  }
  const complete = await sampleContent(page)
  assertOpenRegions(complete, `${empty ? "empty" : "with Tab"} open`)
  if (!empty) {
    assert(Object.keys(complete.controls).some(key => key.startsWith("caption.tab:")), "Real Tab rectangle is individually sampled")
    assert(Object.hasOwn(complete.controls, "body.input:隔离正文草稿") && Object.hasOwn(complete.controls, "body.input:隔离第二字段"), "Both real business inputs are individually sampled")
    assert(Object.keys(complete.controls).some(key => key.startsWith("body.button:")), "Business buttons are individually sampled")
  }
  const closing = await framesDuring(page, () => empty ? page.getByRole("button", { name: "隐藏内容面板", exact: true }).click() : command(page, "hide"))
  assertPausedRegions(assertFixedFrames(closing, complete, `${empty ? "empty" : "with Tab"} caption closing`), initial, "closing caption")
  const hidden = await sampleContent(page)
  assert.equal(hidden.exists, true, "Hidden real caption stays mounted so its registered regions remain testable")
  assert.equal(hidden.phase, "closed")
  assertPausedRegions([hidden], initial, "hidden caption")
  const reopening = await framesDuring(page, () => command(page, "toggle"))
  const restored = await sampleContent(page)
  assertPausedRegions(assertFixedFrames(reopening, restored, `${empty ? "empty" : "with Tab"} caption reopen`), initial, "reopening caption")
  assertOpenRegions(restored, "restored caption")
}))
