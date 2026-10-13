import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium, type Browser } from "playwright-core"
import { sampleDrawer, withDrawer } from "../helpers/sidebar-drawer-fixture"
let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.XAANINK_TEST_CHROMIUM ? { executablePath: process.env.XAANINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })
const close = 'button[aria-label="展开或收起左侧导航栏"]'
const restore = '[data-sidebar-restore]'

test("DRAWER-01 real fixed inner geometry, focus and repeated reversal preserve chat drafts", () => withDrawer(browser, {}, async page => {
  await page.getByRole("textbox", { name: "隔离对话草稿" }).fill("保留的输入")
  const instance = await page.locator("[data-chat-instance]").getAttribute("data-chat-instance"), initial = await sampleDrawer(page)
  await page.locator(close).focus(); await page.locator(close).click()
  await page.waitForTimeout(100); const mid = await sampleDrawer(page)
  assert.equal(mid.phase, "closing"); assert.equal(mid.inert, true); assert(Math.abs(mid.width - initial.width) < .1)
  assert.deepEqual(mid.relativeCaption, initial.relativeCaption); assert.deepEqual(mid.relativeButton, initial.relativeButton); assert.deepEqual(mid.style, initial.style)
  assert(Math.abs(mid.translate - (mid.visible - mid.width)) < .1)
  await page.locator(restore).click({ force: true }); await page.waitForTimeout(80); assert.equal((await sampleDrawer(page)).phase, "opening")
  assert.equal(await page.locator(restore).count(), 1); await page.locator(restore).click({ force: true })
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  assert.equal(await page.locator(restore).evaluate(el => el === document.activeElement), true)
  await page.locator(restore).press("Enter"); await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open")
  assert.equal(await page.locator(close).evaluate(el => el === document.activeElement), true)
  assert.equal(await page.locator("[data-chat-instance]").getAttribute("data-chat-instance"), instance); assert.equal(await page.getByRole("textbox", { name: "隔离对话草稿" }).inputValue(), "保留的输入")
}))

test("DRAWER-02 newest axis intent, fullscreen restore and persisted target survive simultaneous motions", () => withDrawer(browser, {}, async page => {
  await page.evaluate(() => (window as any).drawerFixture.open())
  await page.waitForTimeout(90); await page.locator(close).click()
  await page.waitForTimeout(100); const mid = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(mid.sidebarVisible, false); assert.equal(mid.sizes.sidebar, 0); assert.equal(mid.contentVisible, true); assert(mid.sizes.content >= 30)
  await page.getByRole("button", { name: "进入全屏", exact: true }).click()
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  await page.waitForTimeout(450)
  const final = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(final.chatVisible, false); assert.equal(final.sizes.chat, 0); assert.equal(final.sizes.content, 100)
  assert.equal(await page.locator(".workspace-content " + restore).count(), 1)
  await page.locator(".workspace-content " + restore).click(); await page.waitForTimeout(80)
  const opening = await page.evaluate(() => (window as any).drawerFixture.read()); assert.equal(opening.sidebarVisible, true); assert(opening.sizes.sidebar >= 200 / 1280 * 100); assert.equal(opening.sizes.chat, 0)
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open")
}))

for (const width of [600, 899]) test(`DRAWER-03 narrow ${width}px overlay retains width and desktop preference`, () => withDrawer(browser, { width }, async page => {
  const stored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(await page.locator('nav[aria-label="创作工作区"]').evaluate(el => getComputedStyle(el).display), "flex")
  await page.getByRole("button", { name: "作品目录", exact: true }).click(); await page.waitForTimeout(100)
  const mid = await sampleDrawer(page); assert.equal(mid.mode, "narrow"); assert.equal(mid.phase, "opening"); assert(Math.abs(mid.width - width) < .1); assert(mid.visible > 0 && mid.visible < width); assert(Math.abs(mid.translate - (mid.visible - mid.width)) < .1)
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open")
  assert.equal(await page.locator(".workspace-chat").evaluate(el => !!el.closest("[inert]")), true)
  await page.getByRole("button", { name: "返回对话", exact: true }).click(); await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  const settled = await page.evaluate(() => (window as any).drawerFixture.read()); assert.equal(settled.sidebarVisible, stored.sidebarVisible); assert.equal(settled.lastSidebarSize, stored.lastSidebarSize)
}))

test("DRAWER-04 reduced motion and restored layout cancel an older generation", () => withDrawer(browser, { reduced: true }, async page => {
  await page.locator(close).click(); await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  await page.evaluate(() => (window as any).drawerFixture.restore({ version: 1, narrowPane: "chat", sidebarVisible: true, chatVisible: true, contentVisible: false, sizes: { sidebar: 25, chat: 75 }, lastSidebarSize: 25, lastContentSize: null, lastChatSize: null }))
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open")
  await page.waitForTimeout(600)
  const restored = await page.evaluate(() => (window as any).drawerFixture.read()); assert.equal(restored.sizes.sidebar, 25); assert.equal(restored.sidebarVisible, true)
}))

test("DRAWER-05 resize freezes the shape until settling, and explicit restore beats historical preferences", () => withDrawer(browser, {}, async page => {
  const initial = await sampleDrawer(page)
  await page.locator(close).click(); await page.waitForTimeout(70)
  await page.setViewportSize({ width: 600, height: 700 }); await page.waitForTimeout(60)
  const crossed = await sampleDrawer(page)
  assert.equal(crossed.mode, "wide"); assert.equal(crossed.phase, "closing"); assert(Math.abs(crossed.width - initial.width) < .1)
  assert.equal(crossed.height, initial.height); assert.equal(crossed.captionTop, initial.captionTop)
  assert.equal(await page.locator('nav[aria-label="创作工作区"]').evaluate(el => getComputedStyle(el).display), "none")
  assert.deepEqual(crossed.relativeButton, initial.relativeButton)
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  assert.equal((await sampleDrawer(page)).mode, "narrow")
  assert.equal(await page.locator('nav[aria-label="创作工作区"]').evaluate(el => getComputedStyle(el).display), "flex")
  await page.setViewportSize({ width: 1280, height: 700 }); await page.waitForTimeout(80)
  await page.locator(restore).click(); await page.waitForTimeout(90)
  await page.evaluate(() => (window as any).drawerFixture.restore({ version: 1, narrowPane: "content", sidebarVisible: true, chatVisible: true, contentVisible: true, sizes: { sidebar: 25, chat: 40, content: 35 }, lastSidebarSize: 18, lastContentSize: 48, lastChatSize: 55 }))
  await page.waitForTimeout(650)
  const restored = await page.evaluate(() => (window as any).drawerFixture.read())
  assert.equal(restored.sizes.sidebar, 25); assert.equal(restored.sizes.chat, 40); assert.equal(restored.sizes.content, 35)
}))

test("DRAWER-06 fullscreen reversal restores the real previous chat width", () => withDrawer(browser, {}, async page => {
  await page.evaluate(() => (window as any).drawerFixture.open()); await page.waitForTimeout(650)
  const original = await page.evaluate(() => (window as any).drawerFixture.read())
  await page.getByRole("button", { name: "进入全屏", exact: true }).click(); await page.waitForTimeout(500)
  await page.getByRole("button", { name: "退出全屏", exact: true }).click(); await page.waitForTimeout(650)
  const recovered = await page.evaluate(() => (window as any).drawerFixture.read())
  assert(Math.abs(recovered.sizes.chat - original.sizes.chat) < .01); assert(Math.abs(recovered.sizes.sidebar - original.sizes.sidebar) < .01)
}))

test("DRAWER-07 empty real ContentTabs caption retains a correctly sized, keyboard usable restore", () => withDrawer(browser, { emptyCaption: true }, async page => {
  const control = page.locator(restore), bounds = await control.boundingBox(); assert(bounds); assert.equal(bounds.width, 24); assert(bounds.x < 20)
  await control.press("Enter"); assert.deepEqual(await page.evaluate(() => (window as any).drawerFixture.calls), ["sidebar"])
  await page.evaluate(() => (window as any).drawerFixture.appearance("darwin", .75))
  const mac = await control.boundingBox(); assert(mac); assert(Math.abs(mac.x * .75 - 88) < 1)
  assert.equal(await control.evaluate(el => getComputedStyle(el).getPropertyValue("-webkit-app-region")), "no-drag")
}))

test("DRAWER-08 content mounting during sidebar opening projects a valid 900px terminal target", () => withDrawer(browser, { width: 900 }, async page => {
  assert.equal(await page.locator('nav[aria-label="创作工作区"]').evaluate(el => getComputedStyle(el).display), "none")
  await page.locator(close).click(); await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "closed")
  await page.locator(restore).click(); await page.waitForTimeout(70)
  const started = await sampleDrawer(page)
  await page.evaluate(() => (window as any).drawerFixture.open()); await page.waitForTimeout(80)
  const concurrent = await sampleDrawer(page)
  assert.equal(concurrent.phase, "opening"); assert(Math.abs(concurrent.width - started.width) < .1)
  await page.waitForFunction(() => document.querySelector<HTMLElement>(".dashboard-shell")!.dataset.sidebarPhase === "open"); await page.waitForTimeout(600)
  const sizes = await page.evaluate(() => (window as any).drawerFixture.read())
  assert(sizes.sizes.sidebar >= 200 / 900 * 100 - .001); assert(sizes.sizes.chat >= 420 / 900 * 100 - .001); assert(sizes.sizes.content >= 30 - .001)
  assert(Math.abs(sizes.sizes.sidebar + sizes.sizes.chat + sizes.sizes.content - 100) < .001)
}))
