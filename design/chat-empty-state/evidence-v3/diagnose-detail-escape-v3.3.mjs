import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 1100 } });
const page = await context.newPage();
page.setDefaultTimeout(5000);
const observations = [];
console.log('created');
await page.goto(new URL('../index.html', import.meta.url).href, { waitUntil: 'load', timeout: 15000 });
console.log('loaded');
await page.locator('[data-action=book]').click();
console.log('opened');
await page.evaluate(() => {
  window.escapeEvents = [];
  for (const type of ['keydown', 'keyup', 'cancel', 'close']) document.querySelector('#wizard-dialog').addEventListener(type, event => {
    if (type.startsWith('key') && event.key !== 'Escape') return;
    window.escapeEvents.push({ type, time: performance.now(), cancelable: event.cancelable, prevented: event.defaultPrevented, open: document.querySelector('#wizard-dialog').open, hidden: document.querySelector('#wizard-detail').hidden, focus: document.activeElement.id || document.activeElement.dataset.templateId });
  });
});
for (const category of ['theme', 'world', 'character', 'plot']) {
  console.log(category);
  await page.locator(`[data-wizard-category=${category}]`).click();
  const item = page.locator('[data-template-id]:not([data-template-id=blank])').first();
  const id = await item.getAttribute('data-template-id');
  await item.dblclick();
  await page.locator('#wizard-detail-use').focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Escape');
  const state = () => page.evaluate(() => ({ open: document.querySelector('#wizard-dialog').open, hidden: document.querySelector('#wizard-detail').hidden, focus: document.activeElement.id || document.activeElement.dataset.templateId, events: window.escapeEvents }));
  const immediate = await state();
  await page.waitForTimeout(100);
  const settled = await state();
  observations.push({ category, id, immediate, settled });
  console.log(JSON.stringify(observations.at(-1)));
  await fs.writeFile(fileURLToPath(new URL('diagnose-detail-escape-v3.3.json', import.meta.url)), JSON.stringify(observations, null, 2));
  if (!settled.open) break;
}
await browser.close();
await fs.writeFile(fileURLToPath(new URL('diagnose-detail-escape-v3.3.json', import.meta.url)), JSON.stringify(observations, null, 2));
console.log(JSON.stringify(observations));
