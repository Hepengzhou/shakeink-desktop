import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium, type Browser } from "playwright-core"
import { sampleDrawer, withDrawer } from "../helpers/sidebar-drawer-fixture"
let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })

async function restoreOpenSidebar(page: import("playwright-core").Page) {
  await page.evaluate(() => (window as any).drawerFixture.restore({ version: 1, narrowPane: "sidebar", contentVisible: false, sidebarVisible: true, chatVisible: true, sizes: { sidebar: 20, chat: 80 }, lastSidebarSize: 20, lastContentSize: null, lastChatSize: null }))
  await page.waitForTimeout(70)
}

test("DRAWER-INTENT-01 wide closing crosses into narrow despite an old sidebar pane preference", () => withDrawer(browser, {}, async page => {
  await restoreOpenSidebar(page)
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForTimeout(70); await page.setViewportSize({ width: 899, height: 700 }); await page.waitForTimeout(600)
  const shape = await sampleDrawer(page), stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(shape.mode, "narrow"); assert.equal(shape.phase, "closed"); assert.equal(stored.narrowPane, "chat"); assert.equal(stored.sidebarVisible, false)
}))

test("DRAWER-INTENT-02 wide opening crosses into narrow despite an old chat pane preference", () => withDrawer(browser, {}, async page => {
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  await page.locator("[data-sidebar-restore]").click(); await page.waitForTimeout(70); await page.setViewportSize({ width: 899, height: 700 }); await page.waitForTimeout(700)
  const shape = await sampleDrawer(page), stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(shape.mode, "narrow"); assert.equal(shape.phase, "open"); assert.equal(stored.narrowPane, "sidebar"); assert.equal(stored.sidebarVisible, true)
}))

test("DRAWER-INTENT-03 narrow closing crosses into wide despite an old visible sidebar preference", () => withDrawer(browser, { width: 899 }, async page => {
  await restoreOpenSidebar(page)
  await page.getByRole("button", { name: "返回对话", exact: true }).click()
  await page.waitForTimeout(70); await page.setViewportSize({ width: 1280, height: 700 }); await page.waitForTimeout(600)
  const shape = await sampleDrawer(page), stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(shape.mode, "wide"); assert.equal(shape.phase, "closed"); assert.equal(stored.sidebarVisible, false); assert.equal(stored.sizes.sidebar, 0); assert(shape.visible < .1)
}))

test("DRAWER-INTENT-04 narrow opening crosses into wide and restores the desktop width despite an old hidden preference", () => withDrawer(browser, { width: 899 }, async page => {
  await page.evaluate(() => (window as any).drawerFixture.restore({ version: 1, narrowPane: "chat", contentVisible: false, sidebarVisible: false, chatVisible: true, sizes: { sidebar: 0, chat: 100 }, lastSidebarSize: 25, lastContentSize: null, lastChatSize: null }))
  await page.waitForTimeout(70); await page.getByRole("button", { name: "作品目录", exact: true }).click()
  await page.waitForTimeout(70); await page.setViewportSize({ width: 1280, height: 700 }); await page.waitForTimeout(700)
  const shape = await sampleDrawer(page), stored = await page.evaluate(() => (window as any).drawerFixture.read())
  const available = await page.locator("#sidebar,#chat").evaluateAll(panes => panes.reduce((sum, pane) => sum + pane.getBoundingClientRect().width, 0))
  assert.equal(shape.mode, "wide"); assert.equal(shape.phase, "open"); assert.equal(stored.sidebarVisible, true); assert.equal(stored.sizes.sidebar, 25); assert.equal(stored.lastSidebarSize, 25); assert(Math.abs(shape.width - available * .25) < .1)
}))

test("DRAWER-INTENT-05 fullscreen wide closing selects the real content underlay when crossing into narrow", () => withDrawer(browser, {}, async page => {
  await page.evaluate(() => (window as any).drawerFixture.restore({ version: 1, narrowPane: "sidebar", contentVisible: true, sidebarVisible: true, chatVisible: false, sizes: { sidebar: 20, chat: 0, content: 80 }, lastSidebarSize: 20, lastContentSize: 40, lastChatSize: 40 }))
  await page.waitForTimeout(80); await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForTimeout(70); await page.setViewportSize({ width: 899, height: 700 }); await page.waitForTimeout(600)
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal((await sampleDrawer(page)).phase, "closed"); assert.equal(stored.narrowPane, "content")
  assert.equal(await page.locator(".dashboard-shell").getAttribute("data-sidebar-underlay"), "content"); assert.equal(await page.locator(".workspace-content").evaluate(el => !!el.closest("[inert]")), false)
}))
