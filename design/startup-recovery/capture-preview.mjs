// Checks the HTML design viewer only. This never launches the application or calls providers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1380, height: 1040 }, deviceScaleFactor: 1 });
const pageErrors = [], failedRequests = [], externalRequests = [], checks = [], captures = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('requestfailed', request => failedRequests.push({ url: request.url().replace(/^.*\/design\//, 'design/'), error: request.failure()?.errorText }));
page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
let frame;
function check(name, details = {}) { checks.push({ name, passed: true, ...details }); }
async function heading(expected) { await frame.getByRole('heading', { name: expected, exact: true }).first().waitFor(); }
async function scene(value) { await page.locator('#scene').selectOption(value); }
async function screenshot(name) {
  await frame.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.fonts.ready);
  const geometry = await frame.locator('.card').evaluate(el => {
    const rect = el.getBoundingClientRect(), actions = el.querySelector('.actions');
    return { width: rect.width, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewport: { width: innerWidth, height: innerHeight }, actionsVisible: !!actions && !actions.hidden, look: document.documentElement.className, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  assert(geometry.left >= 0 && geometry.right <= geometry.viewport.width + 1, `${name}: card contained horizontally`);
  assert.equal(geometry.horizontalOverflow, false, `${name}: no horizontal overflow`);
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
  captures.push({ name, geometry });
}
try {
  await page.goto(pathToFileURL(path.join(directory, 'index.html')).href);
  frame = page.frames().find(item => item.url().includes('/flow.html'));
  assert(frame);
  await heading('无法修复数据目录');
  await screenshot('preview-repair-failed-paper');
  check('Repair-failed dialog shows reset and exit options');
  assert.deepEqual(await frame.locator('.actions .btn').evaluateAll(els => els.map(el => el.textContent)), ['重置配置数据', '退出应用']);

  await frame.getByRole('button', { name: '重置配置数据', exact: true }).click();
  await heading('确认重置配置数据');
  assert(await frame.locator('.warning').isVisible());
  assert.match(await frame.locator('.warning').textContent(), /不可撤销/);
  assert.match(await frame.locator('.warning').textContent(), /作品文件保存在各自的独立目录中，不会被删除/);
  await screenshot('preview-reset-confirm-paper');
  check('Reset requires inline second confirmation with honest consequences');

  await frame.getByRole('button', { name: '返回', exact: true }).click();
  await heading('自动修复未完成');
  await frame.getByRole('button', { name: '重置配置数据', exact: true }).click();
  await frame.getByRole('button', { name: '确认清空并重置', exact: true }).click();
  await heading('正在重置数据目录…');
  assert.equal(await frame.locator('.actions .btn:disabled').count(), 2);
  await screenshot('preview-resetting-paper');
  await heading('重置完成，正在重新打开应用…');
  assert.equal(await frame.locator('.actions .btn').count(), 0);
  await screenshot('preview-reset-complete-paper');
  check('Reset flow: confirm -> progress (disabled) -> auto relaunch notice');

  await scene('checking'); await heading('正在检查数据目录…');
  assert.equal(await frame.locator('.actions .btn').count(), 0);
  check('Automatic init/repair scene has no buttons');

  await scene('reset-failed'); await heading('重置未完成');
  assert.deepEqual(await frame.locator('.actions .btn').evaluateAll(els => els.map(el => el.textContent)), ['重试', '退出应用']);
  await screenshot('preview-reset-failed-paper');
  await frame.getByRole('button', { name: '重试', exact: true }).click(); await heading('正在重置数据目录…'); await heading('重置完成，正在重新打开应用…');
  check('Reset failure offers retry which resumes the flow');

  await scene('lost-custom'); await heading('原数据目录无法访问');
  assert.deepEqual(await frame.locator('.actions .btn').evaluateAll(els => els.map(el => el.textContent)), ['定位原数据目录', '重置配置数据', '退出应用']);
  await screenshot('preview-lost-custom-paper');
  await frame.getByRole('button', { name: '重置配置数据', exact: true }).click(); await heading('确认重置配置数据');
  await frame.getByRole('button', { name: '返回', exact: true }).click(); await heading('原数据目录无法访问');
  check('Custom-root loss keeps locate flow and gains reset escape');

  await page.getByRole('button', { name: '玄墨', exact: true }).click();
  await scene('repair-failed'); await heading('自动修复未完成');
  await frame.waitForFunction(() => document.documentElement.className === 'ink');
  await screenshot('preview-repair-failed-ink');
  await frame.getByRole('button', { name: '重置配置数据', exact: true }).click();
  await screenshot('preview-reset-confirm-ink');
  check('Ink theme renders dialog and confirmation');

  await page.getByRole('button', { name: '宣纸', exact: true }).click();
  await page.getByRole('button', { name: '窄窗', exact: true }).click();
  await scene('reset-confirm');
  await screenshot('preview-reset-confirm-narrow');
  assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  check('Narrow window keeps dialog usable without overflow');

  assert.deepEqual(pageErrors, []); assert.deepEqual(failedRequests, []); assert.deepEqual(externalRequests, []);
  check('No script errors, failed assets or HTTP requests');
  await fs.writeFile(path.join(directory, 'preview-checks.json'), JSON.stringify({ date: '2026-10-11', version: 'v1', scope: 'HTML design viewer only, not product tests', command: 'node design/startup-recovery/capture-preview.mjs', status: 'passed', checks, captures, pageErrors, failedRequests, externalRequests }, null, 2) + '\n');
  console.log(JSON.stringify({ scope: 'HTML design viewer only', checks: checks.length, captures: captures.length, errors: pageErrors.length, externalRequests: externalRequests.length }));
} finally { await browser.close(); }
