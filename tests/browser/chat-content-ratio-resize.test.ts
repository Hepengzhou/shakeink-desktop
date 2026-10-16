import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium, type Browser, type Page } from "playwright-core"
import { withDrawer } from "../helpers/sidebar-drawer-fixture"
import type { WorkspaceLayout } from "../../src/lib/desktop/workspace-draft-source"

let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })

const settle = (page: Page) => page.waitForTimeout(120)

async function measure(page: Page) {
  return page.evaluate(() => {
    const width = (id: string) => document.querySelector<HTMLElement>(`#${id}`)?.getBoundingClientRect().width ?? null
    const separators = [...document.querySelectorAll<HTMLElement>(".workspace-group > [data-separator]")].map(separator => separator.getBoundingClientRect().width)
    return { sidebar: width("sidebar"), chat: width("chat"), content: width("content"), separators, mode: document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.drawerMode }
  })
}

function assertRatio(actual: { chat: number | null; content: number | null }, expected: number, message: string) {
  assert(actual.chat !== null && actual.content !== null && actual.content > 0, `${message}: chat/content panels must be measurable`)
  assert(Math.abs(actual.chat / actual.content - expected) <= .01, `${message}: ratio ${actual.chat / actual.content} / ${expected}`)
}

const tc1Layout: WorkspaceLayout = { version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 18.056, chat: 40.972, content: 40.972 }, lastSidebarSize: 18.056, lastChatSize: 40.972, lastContentSize: 40.972 }
for (const dpr of [1, 1.5]) test(`RATIO-TC1 out-of-band resize round trip keeps chat:content ratio DPR${dpr}`, () => withDrawer(browser, { width: 1440, height: 1000, deviceScaleFactor: dpr, initialLayout: tc1Layout, observeLayout: true }, async page => {
  const configs = await page.evaluate(() => (window as any).drawerLayoutObservation.panelConfigs)
  assert.equal(configs.chat.resize, "preserve-relative-size", "chat panel splits proportionally on Group resize")
  assert.equal(configs.sidebar.resize, "preserve-pixel-size", "sidebar pixel behavior unchanged")
  const initial = await measure(page)
  assertRatio(initial, 1, "TC1 mount 1440")
  assert(Math.abs(initial.sidebar! - 260) <= 1.1, `TC1 mount sidebar ${initial.sidebar}`)
  const widened = await page.setViewportSize({ width: 2560, height: 1000 }).then(() => settle(page)).then(() => measure(page))
  assertRatio(widened, 1, "TC1 widened 2560")
  assert(Math.abs(widened.sidebar! - 260) <= 1.1, `TC1 widened sidebar ${widened.sidebar}`)
  const restored = await page.setViewportSize({ width: 1440, height: 1000 }).then(() => settle(page)).then(() => measure(page))
  assertRatio(restored, 1, "TC1 restored 1440")
  assert(Math.abs(restored.sidebar! - 260) <= 1.1, `TC1 restored sidebar ${restored.sidebar}`)
  assert(Math.abs(restored.chat! - initial.chat!) <= 2, `TC1 restored chat ${restored.chat} / ${initial.chat}`)
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert(Math.abs(stored.sizes.chat - stored.sizes.content) <= .05, `TC1 persisted ratio ${stored.sizes.chat}/${stored.sizes.content}`)
  assert(Math.abs(stored.sizes.sidebar - 18.056) <= .15, `TC1 persisted sidebar ${stored.sizes.sidebar}`)
}))

const tc2Layout: WorkspaceLayout = { version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 15, chat: 40, content: 45 }, lastSidebarSize: 15, lastChatSize: 40, lastContentSize: 45 }
test("RATIO-TC2 keyboard-adjusted ratio becomes the resize baseline", () => withDrawer(browser, { width: 1800, height: 1000, initialLayout: tc2Layout, observeLayout: true }, async page => {
  const initial = await measure(page)
  assertRatio(initial, 40 / 45, "TC2 mount 1800")
  const separator = page.locator(".workspace-group > [data-separator]").nth(1)
  await separator.press("ArrowRight")
  await separator.press("ArrowRight")
  await settle(page)
  const adjusted = await measure(page)
  assert(adjusted.chat! > initial.chat!, `TC2 ArrowRight grows chat ${initial.chat} -> ${adjusted.chat}`)
  assertRatio(adjusted, 50 / 35, "TC2 adjusted 1800")
  const r2 = adjusted.chat! / adjusted.content!
  const storedAdjusted = await page.evaluate(() => (window as any).drawerFixture.read())
  assert(Math.abs(storedAdjusted.sizes.chat - 50) <= .5, `TC2 persisted adjusted chat ${storedAdjusted.sizes.chat}`)
  assert(Math.abs(storedAdjusted.sizes.content - 35) <= .5, `TC2 persisted adjusted content ${storedAdjusted.sizes.content}`)
  const shrunk = await page.setViewportSize({ width: 1280, height: 1000 }).then(() => settle(page)).then(() => measure(page))
  assertRatio(shrunk, r2, "TC2 shrunk 1280")
  assert(Math.abs(shrunk.sidebar! - 270) <= 1.1, `TC2 shrunk sidebar ${shrunk.sidebar}`)
  const widened = await page.setViewportSize({ width: 2400, height: 1000 }).then(() => settle(page)).then(() => measure(page))
  assertRatio(widened, r2, "TC2 widened 2400")
  assert(Math.abs(widened.sidebar! - 270) <= 1.1, `TC2 widened sidebar ${widened.sidebar}`)
}))

const tc3Layout: WorkspaceLayout = { version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: false, sizes: { sidebar: 20, chat: 80 }, lastSidebarSize: 20, lastChatSize: 80, lastContentSize: null }
test("RATIO-TC3 two-pane state keeps sidebar pixels and chat absorbs", () => withDrawer(browser, { width: 1500, height: 1000, initialLayout: tc3Layout, observeLayout: true }, async page => {
  const initial = await measure(page)
  assert.equal(initial.content, null, "TC3 content panel not mounted")
  assert(Math.abs(initial.sidebar! - 300) <= 1.1, `TC3 mount sidebar ${initial.sidebar}`)
  const shrunk = await page.setViewportSize({ width: 1100, height: 1000 }).then(() => settle(page)).then(() => measure(page))
  assert(Math.abs(shrunk.sidebar! - 300) <= 1.1, `TC3 shrunk sidebar ${shrunk.sidebar}`)
  assert(Math.abs(initial.chat! - shrunk.chat! - 400) <= 1.1, `TC3 chat shrinks by viewport delta ${initial.chat} -> ${shrunk.chat}`)
  const widened = await page.setViewportSize({ width: 2000, height: 1000 }).then(() => settle(page)).then(() => measure(page))
  assert(Math.abs(widened.sidebar! - 300) <= 1.1, `TC3 widened sidebar ${widened.sidebar}`)
  assert(Math.abs(widened.chat! - shrunk.chat! - 900) <= 1.1, `TC3 chat grows by viewport delta ${shrunk.chat} -> ${widened.chat}`)
}))

const tc45Layout: WorkspaceLayout = { version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 16.25, chat: 41.875, content: 41.875 }, lastSidebarSize: 16.25, lastChatSize: 41.875, lastContentSize: 41.875 }
test("RATIO-TC4 minimum constraints take priority at the wide floor", () => withDrawer(browser, { width: 1600, height: 1000, initialLayout: tc45Layout, observeLayout: true }, async page => {
  await page.setViewportSize({ width: 900, height: 1000 })
  await settle(page)
  const floor = await measure(page)
  assert(floor.chat! >= 419.5, `TC4 chat minimum ${floor.chat}`)
  assert(floor.content! >= 269, `TC4 content minimum ${floor.content}`)
  assert(floor.sidebar! >= 199.5 && floor.sidebar! <= 210, `TC4 sidebar yields ${floor.sidebar}`)
  const total = floor.sidebar! + floor.chat! + floor.content! + floor.separators.reduce((sum, width) => sum + width, 0)
  assert(total <= 900.5, `TC4 no overflow ${total}`)
}))

test("RATIO-TC5 breakpoint round trip restores the wide ratio", () => withDrawer(browser, { width: 1600, height: 1000, initialLayout: tc45Layout, observeLayout: true }, async page => {
  await page.setViewportSize({ width: 800, height: 1000 })
  await settle(page)
  assert.equal((await measure(page)).mode, "narrow", "TC5 crosses into narrow")
  await page.setViewportSize({ width: 1600, height: 1000 })
  await settle(page)
  const restored = await measure(page)
  assert.equal(restored.mode, "wide", "TC5 returns to wide")
  assertRatio(restored, 1, "TC5 restored 1600")
  assert(restored.sidebar! >= 199.5 && restored.sidebar! <= 420.5, `TC5 sidebar in pixel band ${restored.sidebar}`)
}))
