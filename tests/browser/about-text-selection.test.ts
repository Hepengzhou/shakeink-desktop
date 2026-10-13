import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { chromium } from "playwright-core"

test("TS-ABOUT standalone production About document prevents selecting all UI text", async () => {
  const source = await readFile("desktop/main/index.ts", "utf8")
  const template = source.match(/encodeURIComponent\(`(<html lang="zh-CN"><meta[^`]*<\/html>)`\)/)?.[1]
  assert.ok(template, "test must use the actual standalone About document")
  const browser = await chromium.launch({ headless: true, ...(process.env.XAANINK_TEST_CHROMIUM ? { executablePath: process.env.XAANINK_TEST_CHROMIUM } : {}) })
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 260 } })
    await page.route("**/*", route => route.abort())
    await page.setContent(template.replace("${app.getVersion()}", "0.synthetic"))
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
