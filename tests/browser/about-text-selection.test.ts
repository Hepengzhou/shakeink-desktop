import test from "node:test"
import assert from "node:assert/strict"
import {projectAboutHtml} from '../../desktop/main/project-about'
import { chromium } from "playwright-core"

test("TS-ABOUT standalone production About document prevents selecting all UI text", async () => {
  const template = projectAboutHtml('0.synthetic','paper')
  const browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) })
  try {
    const page = await browser.newPage({ viewport: { width: 440, height: 380 } })
    await page.route("**/*", route => route.abort())
    await page.setContent(template)
    assert.equal(await page.locator("body").evaluate(el => getComputedStyle(el).userSelect), "none")
    for (const node of await page.locator("h1,p").all()) {
      await page.evaluate(() => window.getSelection()?.removeAllRanges())
      const box = await node.boundingBox(); assert.ok(box)
      await page.mouse.move(box.x + 3, box.y + box.height / 2); await page.mouse.down()
      await page.mouse.move(box.x + Math.min(box.width - 3, 170), box.y + box.height / 2, { steps: 10 }); await page.mouse.up()
      assert.equal(await page.evaluate(() => window.getSelection()?.toString()), "")
      await node.dblclick(); assert.equal(await page.evaluate(() => window.getSelection()?.toString()), "")
    }
  } finally { await browser.close() }
})
