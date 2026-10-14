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

test("CD-06 real ItemLevelPicker direct Popover closes from Shell pause without outside click and cannot revive", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  // This is the actual business component, including its direct Base UI
  // Popover.Root. Only its normal query cache contains isolated empty data.
  const trigger = page.getByRole("button", { name: "选择等级", exact: true }), popup = '[role="dialog"]'
  await trigger.click(); await waitPopupOpen(page, popup)
  await page.getByText("暂无物品类等级体系，先在世界观设定中创建", { exact: true }).waitFor({ state: "visible" })
  assert.equal(await activePopup(page, popup), true)
  // Invoke the real captured Shell callback: no pointer move, click, keyboard
  // Escape or outside interaction can independently dismiss the Popover here.
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, popup), false, "Direct business Popover pauses on the first closing frame without outside click")
  assert.equal(await page.getByRole("button", { name: "选择等级", exact: true, includeHidden: true }).evaluate(el => el === document.activeElement), false, "Popover finalFocus cannot restore an inert trigger")
  await page.waitForTimeout(540)
  await page.evaluate(() => (window as any).contentFixture.toggle()); await page.waitForTimeout(680)
  assert.equal(await activePopup(page, popup), false, "Direct Popover cannot revive after drawer reopening")
  await trigger.click(); await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true, "A new explicit click reopens the actual ItemLevelPicker")
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

test("CD-06 stationary pointer cannot revive owned Tooltip from drawer layout alone", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const trigger = page.getByRole("button", { name: "内容提示", exact: true }), popup = '[data-slot="tooltip-content"]'
  await trigger.hover(); await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true)
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, popup), false)
  await page.waitForTimeout(540)
  // Keep the actual pointer stationary. Shell callbacks do not dispatch new
  // pointer/keyboard input, but Chromium sends layout-induced mouseenter when
  // the restored trigger returns beneath the existing client coordinates.
  await page.evaluate(() => (window as any).contentFixture.toggle()); await page.waitForTimeout(1200)
  assert.equal(await activePopup(page, popup), false, "Layout-induced enter with no new input cannot reopen the old tooltip")
  // A real new movement inside the same trigger must still work even when Base
  // UI's hover implementation only listens for enter/leave (move:false).
  const box = await trigger.boundingBox(); assert(box)
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2)
  await waitPopupOpen(page, popup)
  assert.equal(await activePopup(page, popup), true, "Actual new pointer movement can open a fresh tooltip")
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
  await page.waitForFunction(selector => Array.from(document.querySelectorAll(selector)).every(el => { const style = getComputedStyle(el); return !el.getBoundingClientRect().width || !!el.closest('[inert],[hidden],[aria-hidden="true"]') || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 }), popup)
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

test("CD-06 real shared popup honors caller Base UI cancellation before changing local open state", () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  await page.getByRole("button", { name: "取消打开菜单", exact: true }).click()
  await page.waitForTimeout(180)
  assert.equal(await page.evaluate(() => (window as any).contentFixture.cancelEvents), 1, "A genuine Base UI open event reached the enabled caller")
  assert.equal(await activePopup(page, '[aria-label="取消打开菜单浮层"]'), false, "Actual details.cancel() prevents the popup opening")
}))

for (const controlled of [true, false]) test(`CD-06 real ${controlled ? "controlled" : "defaultOpen"} submenu loses old intent across parent remount after pause`, () => withContentDrawer(browser, {}, async page => {
  await openContent(page)
  const name = controlled ? "受控子菜单" : "默认子菜单", parent = page.getByRole("button", { name: name + "宿主", exact: true }), submenu = page.getByRole("menuitem", { name: name + "入口", exact: true }), parentPopup = `[aria-label="${name}宿主浮层"]`, subPopup = `[aria-label="${name}浮层"]`
  await parent.click(); await waitPopupOpen(page, parentPopup)
  await submenu.hover(); await waitPopupOpen(page, subPopup)
  assert.equal(await activePopup(page, subPopup), true, "Actual shared SubmenuRoot is initially open")
  await hideFirstFrame(page)
  assert.equal(await activePopup(page, parentPopup), false); assert.equal(await activePopup(page, subPopup), false)
  await page.waitForTimeout(540)
  await page.evaluate(() => (window as any).contentFixture.toggle()); await page.waitForTimeout(680)
  await parent.click(); await waitPopupOpen(page, parentPopup); await page.waitForTimeout(180)
  assert.equal(await activePopup(page, subPopup), false, "New parent open cannot revive an old controlled/defaultOpen child intent")
  await submenu.hover(); await waitPopupOpen(page, subPopup)
  assert.equal(await activePopup(page, subPopup), true, "New child trigger interaction can open the submenu")
}))
