import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium, type Browser, type Page } from "playwright-core"
import { openContent, withContentDrawer } from "../helpers/content-drawer-fixture"

let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.XAANINK_TEST_CHROMIUM ? { executablePath: process.env.XAANINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })

async function activePopup(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(elements => elements.some(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && !el.closest('[inert],[hidden],[aria-hidden="true"]') && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
  }))
}
async function waitPopupOpen(page: Page, selector: string) {
  await page.waitForFunction(selector => Array.from(document.querySelectorAll(selector)).some(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && !el.closest('[inert],[hidden],[aria-hidden="true"]') && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
  }), selector)
}
async function hideFirstFrame(page: Page) {
  await page.evaluate(async () => {
    ;(window as any).contentFixture.hide()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  })
}

for (const controlled of [false, true]) test(`CD-06 owned ${controlled ? "controlled" : "uncontrolled"} menu closes on pause and cannot revive on reopening`, () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const triggerName = controlled ? "受控内容菜单" : "内容菜单", label = controlled ? "受控内容菜单浮层" : "内容菜单浮层", popup = `[aria-label="${label}"]`
  await page.getByRole("button", { name: triggerName, exact: true }).click()
  await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true, "Real shared DropdownMenu portal opens")
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, popup), false, "Owned portal cannot remain visible/interactive on first closing frame")
  assert.equal(await page.getByRole("button", { name: triggerName, exact: true, includeHidden: true }).evaluate(el => el === document.activeElement), false, "Popup finalFocus cannot target inert trigger")
  await page.waitForTimeout(540)
  await page.evaluate(() => (window as any).contentFixture.toggle()); await page.waitForTimeout(680)
  assert.equal(await activePopup(page, popup), false, "Old open state cannot automatically revive")
  await page.getByRole("button", { name: triggerName, exact: true }).click()
  await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true, "Fresh user operation can reopen the menu")
}))

test("CD-06 shared Select portal closes for drawer motion and opens again only on new input", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const trigger = page.getByRole("combobox", { name: "内容选项", exact: true }), popup = '[aria-label="内容选项列表"]'
  await trigger.click()
  await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true)
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, popup), false)
  await page.waitForTimeout(540)
  await page.evaluate(() => (window as any).contentFixture.toggle()); await page.waitForTimeout(680)
  assert.equal(await activePopup(page, popup), false)
  await trigger.click(); await page.getByRole("option", { name: "第二项", exact: true }).click()
  assert.match(await trigger.innerText(), /第二项/)
}))

test("CD-06 shared Tooltip pauses its owned portal without stale hover revival", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  await page.getByRole("button", { name: "内容提示", exact: true }).hover(); await page.waitForTimeout(120)
  const popup = '[data-slot="tooltip-content"]'
  assert.equal(await activePopup(page, popup), true)
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, popup), false)
  await page.mouse.move(4, 4); await page.waitForTimeout(540)
  await page.evaluate(() => (window as any).contentFixture.toggle()); await page.waitForTimeout(680)
  assert.equal(await activePopup(page, popup), false)
  await page.getByRole("button", { name: "内容提示", exact: true }).hover(); await page.waitForTimeout(120)
  assert.equal(await activePopup(page, popup), true)
}))

test("CD-06 content pause leaves shared menus outside the content owner usable", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  await page.getByRole("button", { name: "内容外菜单", exact: true }).click()
  const popup = '[aria-label="内容外菜单浮层"]'
  await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true)
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, popup), true, "Content-specific pause does not issue global Escape or close unrelated menus")
  await page.waitForTimeout(540)
  assert.equal(await activePopup(page, popup), true)
  await page.getByRole("menuitem", { name: "内容外菜单选项", exact: true }).click()
  assert.equal(await activePopup(page, popup), false)
}))

test("CD-06 business Dialog remains mounted, editable and its internal Select works while content closes", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  await page.getByRole("button", { name: "业务弹窗", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "隔离业务弹窗", exact: true }), input = page.getByRole("textbox", { name: "弹窗文字", exact: true })
  await dialog.waitFor({ state: "visible" })
  assert.equal(await dialog.count(), 1)
  await input.fill("关闭前弹窗草稿"); await input.focus()
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, '[data-slot="dialog-content"]'), true)
  assert.equal(await input.evaluate(el => el === document.activeElement), true, "Drawer close cannot steal Dialog focus")
  await input.fill("动画期间仍能输入")
  const select = page.getByRole("combobox", { name: "弹窗选项", exact: true })
  await select.click(); await page.getByRole("option", { name: "第二项", exact: true }).click()
  assert.match(await select.innerText(), /第二项/)
  await page.waitForTimeout(540)
  assert.equal(await input.inputValue(), "动画期间仍能输入")
  assert.equal(await dialog.count(), 1)
  await page.evaluate(() => (window as any).contentFixture.toggle()); await input.focus(); await page.waitForTimeout(680)
  assert.equal(await input.evaluate(el => el === document.activeElement), true, "Opening cannot steal Dialog input focus")
  await page.getByRole("button", { name: "保存弹窗", exact: true }).click()
  await page.waitForTimeout(150)
  assert.equal(await activePopup(page, '[data-slot="dialog-content"]'), false)
}))
