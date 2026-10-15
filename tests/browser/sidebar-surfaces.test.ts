import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium, type Browser, type Page } from "playwright-core"
import { withSidebar } from "../helpers/sidebar-navigation-fixture"
import { withDrawer } from "../helpers/sidebar-drawer-fixture"

let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })

async function hoverRow(page: Page, name = "伏笔") {
  const row = page.getByRole("button", { name, exact: true }).first()
  await row.hover()
  await page.locator('[role="tooltip"]').waitFor({ state: "attached" })
  return row
}

async function cardHit(page: Page, xFraction = .5) {
  return page.locator('[role="tooltip"]').evaluate((card, fraction) => {
    const r = card.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width * fraction, r.top + r.height / 2)
    return !!hit && card.contains(hit)
  }, xFraction)
}

for (const theme of ["ink", "paper"] as const) {
  test(`SS-01 ${theme} navigation reuses the app scrollbar and remains scrollable`, () => withSidebar(browser, { theme }, async page => {
    const result = await page.locator(".tree-scroll").evaluate(tree => {
      const reference = document.createElement("div")
      reference.style.cssText = "position:fixed;left:800px;top:580px;width:100px;height:80px;overflow:auto"
      const filler = document.createElement("div"); filler.style.height = "300px"; reference.append(filler); document.body.append(reference)
      const sample = (node: Element) => {
        const style = getComputedStyle(node), bar = getComputedStyle(node, "::-webkit-scrollbar"), thumb = getComputedStyle(node, "::-webkit-scrollbar-thumb"), track = getComputedStyle(node, "::-webkit-scrollbar-track")
        return { standardWidth: style.scrollbarWidth, gutter: (node as HTMLElement).offsetWidth - node.clientWidth, width: bar.width, color: thumb.backgroundColor, border: thumb.borderLeftWidth, radius: thumb.borderRadius, clip: thumb.backgroundClip, track: track.backgroundColor }
      }
      const actual = sample(tree), expected = sample(reference)
      const max = tree.scrollHeight - tree.clientHeight; tree.scrollTop = 30
      const scrollTop = tree.scrollTop; reference.remove()
      return { actual, expected, max, scrollTop }
    })
    assert.deepEqual(result.actual, result.expected, "Navigation must not switch Chromium to an OS scrollbar")
    assert.equal(result.actual.width, "10px"); assert.equal(result.actual.border, "3px"); assert.equal(result.actual.radius, "6px")
    assert.equal(result.actual.clip, "content-box"); assert.equal(result.actual.track, "rgba(0, 0, 0, 0)")
    assert(result.max > 30 && result.scrollTop > 0, "Real navigation overflow still scrolls")
  }))

  test(`SS-02 ${theme} hover card stays anchored and visible beyond the clipped transformed navigation`, () => withSidebar(browser, { theme }, async page => {
    await page.evaluate(() => {
      const host = document.getElementById("sidebar-fixture")!
      host.style.transform = "translate(24px, 12px)"; host.style.overflow = "hidden"
      const chat = document.createElement("div"); chat.id = "opaque-chat-fixture"
      chat.style.cssText = "position:fixed;left:300px;top:0;width:700px;height:700px;background:var(--background);z-index:1"
      document.body.append(chat)
    })
    const row = await hoverRow(page, "设定"), rowBox = await row.boundingBox(), card = page.locator('[role="tooltip"]'), cardBox = await card.boundingBox()
    assert(rowBox && cardBox)
    assert(Math.abs(cardBox.x - (rowBox.x + rowBox.width + 8)) < 1, "Viewport coordinates must not be transformed a second time")
    assert(Math.abs(cardBox.y - rowBox.y) < 1)
    assert.equal(await cardHit(page), true, "Card center must paint over adjacent chat")
    assert.equal(await cardHit(page, .95), true, "Card right edge must not be clipped by the drawer")
    assert.equal(await card.evaluate(el => getComputedStyle(el).getPropertyValue("-webkit-app-region")), "no-drag")
  }))
}

test("SS-03 hover intent, owner handoff, card retention and delayed dismissal survive the portal", () => withSidebar(browser, {}, async page => {
  const row = page.getByRole("button", { name: "伏笔", exact: true }).first()
  await row.hover(); await page.waitForTimeout(80)
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
  await page.locator('[role="tooltip"]').waitFor({ state: "attached" })
  await page.getByRole("button", { name: "爽点/泪点", exact: true }).first().hover()
  await page.waitForTimeout(50)
  assert.equal(await page.locator('[role="tooltip"]').count(), 1)
  assert.match(await page.locator('[role="tooltip"]').innerText(), /爽点\/泪点/)
  await page.locator('[role="tooltip"]').hover(); await page.waitForTimeout(300)
  assert.equal(await page.locator('[role="tooltip"]').count(), 1, "Moving from owner into the actual card cancels dismissal")
  await page.mouse.move(900, 680)
  await page.locator('[role="tooltip"]').waitFor({ state: "detached" })
}))

for (const action of ["scroll", "click", "category", "unmount"] as const) test(`SS-04 ${action} cleans the active body card without revival`, () => withSidebar(browser, {}, async page => {
  const row = await hoverRow(page)
  if (action === "scroll") await page.locator(".tree-scroll").evaluate(el => { el.scrollTop += 30 })
  else if (action === "click") await row.click()
  else if (action === "category") await page.getByRole("tab", { name: "角色", exact: true }).click()
  else await page.evaluate(() => (window as any).sidebarFixture.unmount())
  await page.locator('[role="tooltip"]').waitFor({ state: "detached" })
  await page.waitForTimeout(450)
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
}))

for (const action of ["category", "unmount"] as const) test(`SS-04 pending hover is cancelled by ${action}`, () => withSidebar(browser, {}, async page => {
  await page.getByRole("button", { name: "伏笔", exact: true }).first().hover()
  await page.waitForTimeout(80); assert.equal(await page.locator('[role="tooltip"]').count(), 0)
  if (action === "category") await page.getByRole("tab", { name: "角色", exact: true }).click()
  else await page.evaluate(() => (window as any).sidebarFixture.unmount())
  await page.waitForTimeout(450)
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
}))

test("SS-05 real sidebar drawer pause removes the floating card and reopening requires a fresh hover", () => withDrawer(browser, {}, async page => {
  await page.evaluate(() => (window as any).drawerSeedNavigation())
  await hoverRow(page, "设定")
  assert.equal(await cardHit(page), true, "Real drawer and adjacent panel must not clip the card")
  await page.getByRole("button", { name: "展开或收起左侧导航栏", exact: true }).click()
  await page.waitForFunction(() => document.querySelector(".dashboard-shell")?.getAttribute("data-sidebar-phase") === "closing")
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
  await page.waitForFunction(() => document.querySelector(".dashboard-shell")?.getAttribute("data-sidebar-phase") === "closed")
  await page.locator("[data-sidebar-restore]").filter({ visible: true }).first().click()
  await page.waitForFunction(() => document.querySelector(".dashboard-shell")?.getAttribute("data-sidebar-phase") === "open")
  await page.waitForTimeout(450)
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
  await hoverRow(page, "设定"); assert.equal(await cardHit(page), true)
}))

test("SS-06 real business Dialog stays above a still-existing hover card", () => withSidebar(browser, {}, async page => {
  await hoverRow(page)
  assert.equal(await cardHit(page), true, "Card must paint before testing its modal occlusion")
  const overlap = await page.evaluate(async () => {
    const card = document.querySelector('[role="tooltip"]')!
    // Collect in the renderer before the legitimate 200ms pointer-leave hide.
    // Several driver round trips can otherwise outlive the card under load.
    const observed = new Promise<{ sameCard: boolean; count: number; covered: boolean }>((resolve, reject) => {
      const deadline = performance.now() + 3000
      const inspect = () => {
        const modal = document.querySelector('[data-slot="dialog-content"]')
        if (modal) {
          const style = getComputedStyle(modal), rect = modal.getBoundingClientRect()
          if (style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0 && rect.width > 0) {
            const r = card.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
            resolve({ sameCard: card.isConnected, count: document.querySelectorAll('[role="tooltip"]').length, covered: !!hit && !card.contains(hit) }); return
          }
        }
        if (performance.now() > deadline) { reject(Error("Visible real Dialog frame not observed")); return }
        requestAnimationFrame(inspect)
      }
      requestAnimationFrame(inspect)
    })
    ;(document.querySelector('.create-action') as HTMLElement).click()
    return observed
  })
  assert.equal(overlap.sameCard, true); assert.equal(overlap.count, 1, "An absent card cannot prove stacking")
  assert.equal(overlap.covered, true, "Modal surface/backdrop must cover the card")
  await page.getByRole("dialog", { name: "创作向导", exact: true }).waitFor()
}))

test("SS-07 entering real row actions clears the card and leaves the menu usable", () => withSidebar(browser, {}, async page => {
  await page.evaluate(() => {
    const fixture = (window as any).sidebarFixture, detail = fixture.data['/api/novels/isolated-a']
    detail.novel.characters = []
    fixture.query.setQueryData(['novels', 'isolated-a'], detail)
  })
  await hoverRow(page, "隔离作品甲")
  await page.getByRole("button", { name: "小说操作", exact: true }).first().click()
  await page.getByRole("menuitem", { name: "重命名", exact: true }).waitFor()
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
  await page.waitForTimeout(450)
  assert.equal(await page.locator('[role="tooltip"]').count(), 0)
  await page.getByRole("menuitem", { name: "重命名", exact: true }).click()
  await page.getByRole("dialog", { name: "重命名小说", exact: true }).waitFor()
}))
