import { chromium } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Isolated, offline design-preview checks. No application profile or user data is read.
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const evidence = path.join(directory, 'evidence');
await fs.mkdir(evidence, { recursive: true });
const results = [];
const browserErrors = [];
const requests = [];
const failedRequests = [];
const runtime = { browser: 'Installed Google Chrome', platform: process.platform, protocol: 'file:', isolatedContext: true };
const selection = process.argv.find(argument => argument.startsWith('--only='))?.slice(7).split(',');
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };
async function currentFiles(parent = directory) {
  const found = [];
  for (const entry of await fs.readdir(parent, { withFileTypes: true })) {
    if (entry.name === 'archive-v1') continue;
    const file = path.join(parent, entry.name);
    if (entry.isDirectory()) found.push(...await currentFiles(file));
    else if (entry.isFile()) found.push(file);
  }
  return found;
}
async function run(id, name, operation) {
  if (selection && !selection.includes(id)) return;
  const started = Date.now();
  try { const details = await operation(); results.push({ id, name, status: 'passed', durationMs: Date.now() - started, details }); console.log(`${id} PASS ${name}`); }
  catch (error) { results.push({ id, name, status: 'failed', durationMs: Date.now() - started, error: error.message }); console.log(`${id} FAIL ${name}: ${error.message}`); }
}
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
runtime.version = browser.version();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'no-preference', offline: true });
const page = await context.newPage();
page.setDefaultTimeout(5000);
page.on('pageerror', error => browserErrors.push(error.message));
page.on('request', request => requests.push({ protocol: new URL(request.url()).protocol, resourceType: request.resourceType() }));
page.on('requestfailed', request => failedRequests.push({ protocol: new URL(request.url()).protocol, failure: request.failure()?.errorText }));
const url = pathToFileURL(path.join(directory, 'index.html')).href;
const frames = () => page.locator('[data-sprite]').evaluateAll(items => Object.fromEntries(items.map(item => [item.dataset.sprite, Number(item.dataset.frame)])));
const neutral = async () => { await page.mouse.move(1, 1); await page.locator('#draft').click(); await page.waitForTimeout(80); };
async function configure(theme = 'ink', width = 560, height = 760, zoom = 1) {
  if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
  await page.locator(`button[data-theme="${theme}"]`).click();
  await page.locator('#short-window').setChecked(height < 600);
  const widthButton = page.locator(`button[data-width="${width}"]`);
  if (await widthButton.count()) await widthButton.click();
  await page.locator('#panel').evaluate((element, options) => {
    element.style.setProperty('--panel-width', `${options.width}px`);
    element.style.height = `${options.height}px`;
    element.style.zoom = String(options.zoom);
  }, { width, height, zoom });
  await page.locator('.welcome-scroll').evaluate(element => { element.scrollTop = 0; });
  await neutral();
}
async function geometry() {
  return page.evaluate(() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const get = selector => rect(document.querySelector(selector));
    const panel = document.querySelector('#panel');
    const scroll = document.querySelector('.welcome-scroll');
    const labels = [...document.querySelectorAll('.secondary-label,.book-copy')].map(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, text: element.textContent.trim(), rect: rect(element) }));
    return { panel: get('#panel'), welcome: get('.welcome'), scroll: get('.welcome-scroll'), dock: get('.composer-dock'), book: get('.create-book'), group: get('.creation-actions'), title: get('h1'), secondary: [...document.querySelectorAll('.secondary-actions button')].map(rect), labels, panelOverflow: panel.scrollWidth - panel.clientWidth, scrollOverflow: scroll.scrollWidth - scroll.clientWidth, scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight, tools: [...document.querySelectorAll('.composer-toolbar button,.context-row button')].map(element => ({ rect: rect(element), name: element.getAttribute('aria-label') || element.textContent.trim() })) };
  });
}
function assertLayout(g, width, height, zoom = 1) {
  check(Math.abs(g.panel.width - width * zoom) < 2, `Panel width ${g.panel.width} != ${width * zoom}`);
  check(Math.abs(g.panel.height - height * zoom) < 2, `Panel height ${g.panel.height} != ${height * zoom}`);
  check(g.panelOverflow <= 1 && g.scrollOverflow <= 1, `Horizontal overflow: panel ${g.panelOverflow}, welcome ${g.scrollOverflow}`);
  check(Math.abs(g.book.width - g.group.width) < 1, 'Create book does not fill its row');
  check(g.secondary.every(item => Math.abs(item.y - g.secondary[0].y) < 1 && Math.abs(item.width - g.secondary[0].width) < 1), 'Secondary buttons are not equal-width in one row');
  check(g.labels.every(item => item.scrollWidth <= item.width + 1), 'Creation label clips horizontally');
  check(Math.abs((g.welcome.x + g.welcome.width / 2) - (g.panel.x + g.panel.width / 2)) < 10 * zoom, 'Welcome is not horizontally centered');
  check(g.scroll.bottom <= g.dock.y + 1, 'Welcome scroll area overlaps composer');
  check(Math.abs(g.dock.bottom - (g.panel.bottom - zoom)) < 2, 'Composer dock does not touch panel bottom');
  check(g.tools.every(tool => tool.rect.x >= g.panel.x && tool.rect.right <= g.panel.right && tool.rect.bottom <= g.panel.bottom), 'Composer control outside panel');
}
async function reachableActions() {
  const observations = [];
  for (const action of ['book', 'world', 'character', 'scene']) {
    const locator = page.locator(`.creation-actions [data-action="${action}"]`);
    await locator.scrollIntoViewIfNeeded();
    const observed = await locator.evaluate(element => {
      const r = element.getBoundingClientRect(), s = element.closest('.welcome-scroll').getBoundingClientRect();
      const center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { action: element.dataset.action, fullyVisible: r.y >= s.y - 1 && r.bottom <= s.bottom + 1, receivesPointer: element === center || element.contains(center) };
    });
    check(observed.fullyVisible && observed.receivesPointer, `${action} cannot be fully reached in scroll area`);
    observations.push(observed);
  }
  return observations;
}
async function keyboardTo(selector) {
  await page.mouse.move(1, 1);
  // A real mouse click establishes a predictable tab starting point; all focus movement is keyboard input.
  await page.locator('#design-notes').click();
  await page.keyboard.press('Escape');
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press('Tab');
    if (await page.locator(selector).evaluate(element => document.activeElement === element)) return;
  }
  throw new Error(`Keyboard did not reach ${selector}`);
}
try {
  await page.goto(url);
  await page.waitForLoadState('load');
  await run('PV01', 'Offline file preview and all local assets load', async () => {
    const loaded = await page.locator('[data-sprite]').evaluateAll(async elements => Promise.all(elements.map(async element => {
      const src = getComputedStyle(element).backgroundImage.slice(5, -2);
      const image = new Image(); image.src = src; await image.decode();
      return { name: element.dataset.sprite, width: image.naturalWidth, height: image.naturalHeight };
    })));
    check(loaded.every(asset => asset.width > 0), 'An image is empty');
    check(browserErrors.length === 0 && failedRequests.length === 0, 'Browser or resource failure');
    check(requests.every(request => request.protocol === 'file:' || request.protocol === 'data:'), 'Non-local request');
    return { loaded, pageErrors: browserErrors.length, failedRequests: failedRequests.length, networkRequests: requests.filter(request => /^https?:$/.test(request.protocol)).length };
  });
  await run('PV02', 'Both themes and measured text contrast', async () => {
    const themes = [];
    for (const theme of ['paper', 'ink']) {
      await configure(theme, 1000);
      const samples = await page.evaluate(() => {
        const parse = color => color.match(/[\d.]+/g).map(Number);
        const over = (front, back) => { const alpha = front[3] ?? 1; return front.slice(0, 3).map((v, i) => v * alpha + back[i] * (1 - alpha)); };
        const background = element => { const chain = []; for (let current = element; current; current = current.parentElement) chain.unshift(current); return chain.reduce((color, current) => over(parse(getComputedStyle(current).backgroundColor), color), [255, 255, 255]); };
        const luminance = color => color.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        return ['h1', '.welcome-subtitle', '.book-copy strong', '.book-copy>span', '.create-world .secondary-label', '.create-character .secondary-label', '.create-scene .secondary-label', '.composer-hint', '.context-row .quiet-button', '.mode-button', '.model-button', 'textarea'].map(selector => {
          const element = document.querySelector(selector), style = getComputedStyle(element, selector === 'textarea' ? '::placeholder' : null);
          const bg = background(element), fg = over(parse(style.color), bg), values = [luminance(bg), luminance(fg)].sort((a, b) => b - a);
          return { selector, foreground: style.color, background: bg, ratio: Number(((values[0] + .05) / (values[1] + .05)).toFixed(3)) };
        });
      });
      check(samples.every(sample => sample.ratio >= 4.5), `${theme} contrast below 4.5: ${samples.filter(sample => sample.ratio < 4.5).map(sample => `${sample.selector}=${sample.ratio}`).join(', ')}`);
      const screenshot = `${theme}-1000x760.png`;
      await page.locator('#panel').screenshot({ path: path.join(evidence, screenshot) });
      themes.push({ theme, samples, screenshot });
    }
    return themes;
  });
  await run('PV03', 'Two-theme width matrix: 1000, 560, 420, 320', async () => {
    const matrix = [];
    for (const theme of ['paper', 'ink']) for (const width of [1000, 560, 420, 320]) {
      await configure(theme, width);
      const observed = await geometry(); assertLayout(observed, width, 760);
      const screenshot = `${theme}-${width}x760.png`;
      await page.locator('#panel').screenshot({ path: path.join(evidence, screenshot) });
      matrix.push({ theme, width, observed, screenshot });
    }
    return matrix;
  });
  await run('PV04', 'Short panels keep composer docked and all actions reachable', async () => {
    const matrix = [];
    for (const theme of ['paper', 'ink']) for (const [width, height] of [[560, 520], [320, 420]]) {
      await configure(theme, width, height);
      const observed = await geometry(); assertLayout(observed, width, height);
      const topScreenshot = `${theme}-${width}x${height}-top.png`;
      await page.locator('#panel').screenshot({ path: path.join(evidence, topScreenshot) });
      const reachable = await reachableActions();
      const screenshot = `${theme}-${width}x${height}-actions.png`;
      await page.locator('#panel').screenshot({ path: path.join(evidence, screenshot) });
      matrix.push({ theme, width, height, observed, reachable, screenshots: [topScreenshot, screenshot] });
    }
    return matrix;
  });
  await run('PV05', 'Real hover, independent sprites, full cycles, and focus overlap', async () => {
    await configure('ink', 560);
    check(Object.values(await frames()).every(frame => frame === 0), 'Initial frame is not zero');
    const triggers = [];
    for (const name of ['logo', 'book', 'world', 'character', 'scene']) {
      await neutral();
      await page.locator(`[data-sprite="${name}"]`).hover();
      await page.waitForTimeout(230);
      const icon = await frames();
      check(icon[name] > 0 && Object.entries(icon).filter(([key]) => key !== name).every(([, frame]) => frame === 0), `${name} icon hover not independent`);
      await neutral();
      if (name !== 'logo') {
        await page.locator(`[data-action="${name}"]`).hover({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(230);
        const whole = await frames(); check(whole[name] > 0, `${name} button blank area does not animate`);
        await page.locator(`[data-action="${name}"] ${name === 'book' ? '.book-copy' : '.secondary-label'}`).hover();
        await page.waitForTimeout(110); check((await frames())[name] > 0, `${name} label does not animate`);
      }
      triggers.push({ name, icon });
    }
    const cycles = [];
    for (const [name, duration, count] of [['logo', 4000, 64], ['book', 1200, 24]]) {
      await neutral();
      await page.evaluate(name => {
        window.previewObservedFrames = [];
        window.previewFrameObserver?.disconnect();
        window.previewFrameObserver = new MutationObserver(() => { const element = document.querySelector(`[data-sprite="${name}"]`); const frame = Number(element.dataset.frame); if (window.previewObservedFrames.at(-1)?.frame !== frame) window.previewObservedFrames.push({ frame, time: performance.now(), backgroundPosition: element.style.backgroundPosition }); });
        window.previewFrameObserver.observe(document.querySelector(`[data-sprite="${name}"]`), { attributes: true, attributeFilter: ['data-frame'] });
      }, name);
      await page.locator(`[data-sprite="${name}"]`).hover();
      await page.waitForTimeout(duration + 250);
      const sequence = await page.evaluate(() => { window.previewFrameObserver.disconnect(); return window.previewObservedFrames; });
      check(sequence.every(item => item.frame >= 0 && item.frame < count), `${name} displayed a frame index outside [0, ${count - 1}]`);
      check(sequence.some((item, i) => i && sequence[i - 1].frame === count - 1 && item.frame === 0), `${name} did not observe last-to-first transition`);
      const cycleStarts = sequence.filter(item => item.frame === 0);
      check(cycleStarts.length >= 2, `${name} does not include two cycle starts`);
      const observedCycleMs = cycleStarts[1].time - cycleStarts[0].time;
      check(Math.abs(observedCycleMs - duration) <= 200, `${name} cycle ${observedCycleMs.toFixed(1)}ms differs from required ${duration}ms`);
      const screenshot = `hover-${name}-cycle.png`;
      await page.locator('#panel').screenshot({ path: path.join(evidence, screenshot) });
      cycles.push({ name, sequence, expectedDurationMs: duration, observedCycleMs, distinctObservedFrames: new Set(sequence.map(item => item.frame)).size, availableFrames: count, frameSamplingNote: 'Real requestAnimationFrame can skip intermediate frames under scheduling load; completed last-to-first transition is required.', screenshot, screenshotFrameAfterCapture: (await frames())[name] });
    }
    await neutral();
    await keyboardTo('.create-book');
    await page.locator('.create-book').hover(); await page.waitForTimeout(180);
    await page.mouse.move(1, 1); await page.waitForTimeout(180);
    const focusOnly = (await frames()).book; check(focusOnly > 0, 'Leaving mouse cancels keyboard animation');
    await page.locator('.create-book').hover();
    await page.keyboard.press('Tab'); await page.waitForTimeout(180);
    const hoverOnly = (await frames()).book; check(hoverOnly > 0, 'Leaving focus cancels hover animation');
    await neutral(); check(Object.values(await frames()).every(frame => frame === 0), 'Sprites do not reset after both triggers leave');
    await keyboardTo('.brand-motion'); await page.waitForTimeout(130);
    await page.locator('.brand-motion').click(); await page.mouse.move(1, 1); await page.waitForTimeout(150);
    const logoFocusVisible = await page.locator('.brand-motion').evaluate(element => element.matches(':focus-visible'));
    const logoAfterMouse = (await frames()).logo;
    check(logoFocusVisible || logoAfterMouse === 0, 'Mouse click on keyboard-focused Logo leaves stale animation');
    await neutral();
    return { triggers, cycles, overlap: { focusOnly, hoverOnly, reset: true }, inputModalitySwitch: { logoFocusVisible, logoAfterMouse } };
  });
  await run('PV06', 'Independent v2 normalized Logo contour and fixed-region pixel checks', async () => {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'assets/manifest.json'), 'utf8'));
    const checked = [];
    for (const asset of manifest.assets) {
      const png = await fs.readFile(path.join(directory, 'assets', asset.sprite));
      check(hash(png) === asset.spriteSha256, `${asset.sprite} hash differs from manifest`);
      const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      check(decoded.info.width === asset.frameWidth * asset.frameCount && decoded.info.height === asset.frameHeight, `${asset.sprite} dimensions invalid`);
      const sequence = [];
      for (let frame = 0; frame < asset.frameCount; frame++) sequence.push(await sharp(png).extract({ left: frame * asset.frameWidth, top: 0, width: asset.frameWidth, height: asset.frameHeight }).ensureAlpha().raw().toBuffer());
      const delta = (left, right) => { let sum = 0; for (let i = 0; i < left.length; i++) sum += Math.abs(left[i] - right[i]); return sum / left.length; };
      const adjacent = sequence.slice(1).map((frame, i) => delta(frame, sequence[i]));
      const seam = delta(sequence.at(-1), sequence[0]);
      check(seam <= Math.max(...adjacent) * 1.35 + .01, `${asset.sprite} seam exceeds ordinary adjacent-frame motion`);
      const record = { sprite: asset.sprite, hashMatches: true, decodedDimensions: [decoded.info.width, decoded.info.height], maxAdjacentDelta: Math.max(...adjacent), seamDelta: seam };
      if (asset.name === 'logo') {
        const original = await fs.readFile(path.join(repository, asset.source));
        const normalization = manifest.logoNormalization;
        check(normalization?.viewBox && normalization.transforms === 'preserved', 'Missing or unsupported v2 Logo normalization');
        const color = normalization.colors[asset.theme];
        check(/^#([a-f\d]{2})\1\1$/i.test(color), 'Logo normalization color is not grayscale');
        const normalizedSource = original.toString('utf8').replace(/viewBox="[^"]+"/, `viewBox="${normalization.viewBox}"`).replace(/fill="#[a-f\d]+"/gi, `fill="${color}"`);
        const sourceRaster = await sharp(Buffer.from(normalizedSource)).resize(asset.frameWidth, asset.frameHeight).ensureAlpha().raw().toBuffer();
        check(sourceRaster.equals(sequence[0]), `${asset.sprite} first frame differs from grayscale/canvas-normalized original source`);
        const fixed = manifest.logoMotion.fixedRasterRegion;
        let fixedChangedBytes = 0, smokeChangedBytes = 0;
        for (const frame of sequence.slice(1)) for (let y = 0; y < asset.frameHeight; y++) for (let x = 0; x < asset.frameWidth; x++) for (let channel = 0; channel < 4; channel++) {
          const i = (y * asset.frameWidth + x) * 4 + channel;
          if (frame[i] !== sequence[0][i]) { if (x >= fixed.x && x < fixed.x + fixed.width && y >= fixed.y && y < fixed.y + fixed.height) fixedChangedBytes++; else smokeChangedBytes++; }
        }
        check(fixedChangedBytes === 0 && smokeChangedBytes > 0, `${asset.sprite} fixed burner or moving smoke invariant failed`);
        check(hash(original) === asset.sourceSha256, `${asset.sprite} original source hash differs`);
        Object.assign(record, { originalHashMatches: true, normalization, normalizedFirstFramePixelIdentical: true, fixedRegion: fixed, fixedChangedBytes, smokeChangedBytes });
      }
      const seamFile = `seam-${asset.name}-${asset.theme}.png`;
      await sharp({ create: { width: asset.frameWidth * 2, height: asset.frameHeight, channels: 4, background: asset.theme === 'ink' ? '#0d0b0a' : '#f0e7d1' } }).composite([{ input: sequence.at(-1), raw: { width: asset.frameWidth, height: asset.frameHeight, channels: 4 }, left: 0, top: 0 }, { input: sequence[0], raw: { width: asset.frameWidth, height: asset.frameHeight, channels: 4 }, left: asset.frameWidth, top: 0 }]).png().toFile(path.join(evidence, seamFile));
      checked.push({ ...record, seamFile });
    }
    return { method: 'V2: independently decoded PNGs and rebuilt original brand SVG using only the declared grayscale fill and viewBox expansion, preserving all path data and transforms. Seam left = last frame, right = first frame.', assets: checked };
  });
  await run('PV07', 'Real keyboard focus, Enter/Space, modal Tab and Escape return', async () => {
    await configure();
    const observations = [];
    for (const [action, key] of [['book', 'Enter'], ['world', 'Space'], ['character', 'Enter'], ['scene', 'Space']]) {
      await keyboardTo(`[data-action="${action}"]`);
      await page.waitForTimeout(180);
      const focus = await page.locator(`[data-action="${action}"]`).evaluate(element => ({ visible: element.matches(':focus-visible'), outline: getComputedStyle(element).outlineStyle, outlineWidth: getComputedStyle(element).outlineWidth }));
      check(focus.visible && focus.outline !== 'none' && parseFloat(focus.outlineWidth) > 0, `${action} keyboard focus invisible`);
      check((await frames())[action] > 0, `${action} keyboard focus does not animate`);
      await page.keyboard.press(key);
      check(await page.locator('dialog').evaluate(element => element.open && element.dataset.flow === document.querySelector('dialog').dataset.flow), `${action} key did not open modal`);
      check(await page.locator('dialog').getAttribute('data-flow') === action, 'Wrong modal flow');
      const tabStops = [];
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press(i > 4 ? 'Shift+Tab' : 'Tab');
        const stop = await page.evaluate(() => ({ inside: document.querySelector('dialog').contains(document.activeElement), tag: document.activeElement.tagName, id: document.activeElement.id, action: document.activeElement.dataset.action || null }));
        tabStops.push(stop);
        check(stop.inside, `Keyboard focus escaped modal after ${i + 1} Tab presses: ${JSON.stringify(tabStops)}`);
      }
      await page.keyboard.press('Escape'); await page.waitForTimeout(50);
      check(await page.locator(`[data-action="${action}"]`).evaluate(element => document.activeElement === element), 'Escape did not restore trigger focus');
      observations.push({ action, key, focus, tabStops, focusReturned: true });
    }
    return observations;
  });
  await run('PV08', 'System and manual reduce-motion priority, real blur/hidden lifecycle', async () => {
    await configure();
    await page.locator('#reduce-motion').check();
    await page.locator('.create-book').hover(); await page.waitForTimeout(250);
    check(Object.values(await frames()).every(frame => frame === 0), 'Manual reduce permits motion');
    await keyboardTo('.create-world'); await page.waitForTimeout(160);
    check(Object.values(await frames()).every(frame => frame === 0), 'Manual reduce permits keyboard motion');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#reduce-motion').uncheck();
    await page.locator('.create-book').hover(); await page.waitForTimeout(250);
    check(Object.values(await frames()).every(frame => frame === 0), 'Manual off overrides system reduce');
    await keyboardTo('.create-world'); await page.waitForTimeout(160);
    check(Object.values(await frames()).every(frame => frame === 0), 'System reduce permits keyboard motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await neutral(); await page.locator('.create-book').hover(); await page.waitForTimeout(180);
    check((await frames()).book > 0, 'Animation does not resume after reduce is cleared');
    await page.evaluate(() => { window.previewLifecycleEvents = []; for (const event of ['blur', 'focus']) window.addEventListener(event, () => window.previewLifecycleEvents.push({ event, hidden: document.hidden, focused: document.hasFocus() })); document.addEventListener('visibilitychange', () => window.previewLifecycleEvents.push({ event: 'visibilitychange', hidden: document.hidden, focused: document.hasFocus() })); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    const other = await context.newPage(); await other.goto('about:blank');
    const otherCdp = await context.newCDPSession(other);
    await otherCdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
    await other.bringToFront(); await page.waitForTimeout(300);
    const lifecycle = await page.evaluate(() => ({ hidden: document.hidden, focused: document.hasFocus(), events: window.previewLifecycleEvents }));
    const first = await frames(); await page.waitForTimeout(250); const later = await frames();
    await other.close(); await page.bringToFront();
    const observed = lifecycle.hidden || !lifecycle.focused;
    if (observed) check(Object.values(first).every(frame => frame === 0) && Object.values(later).every(frame => frame === 0), 'Real background page does not stay at frame zero');
    const hiddenObserved = lifecycle.hidden;
    const unexecuted = [];
    if (lifecycle.focused) unexecuted.push('Real window blur was not exposed by installed headless Chrome. No synthetic event used.');
    if (!hiddenObserved) unexecuted.push('Real document.hidden was not exposed by tab switching in installed headless Chrome. Actual window blur was verified separately; no synthetic visibility event used.');
    return { manual: 'passed', systemPriority: 'passed', keyboard: 'passed', lifecycle, backgroundFrames: { first, later }, lifecycleCoverage: { blurObserved: !lifecycle.focused, hiddenObserved }, unexecuted };
  });
  await run('PV09', 'Four creation flows disclose prerequisites and do not fake creation', async () => {
    await configure(); const flows = [];
    for (const action of ['book', 'world', 'character', 'scene']) {
      await page.locator(`[data-action="${action}"]`).click();
      const text = await page.locator('dialog').innerText();
      check(text.includes('交互示意'), 'Missing prototype disclosure');
      check(action === 'book' ? text.includes('创作向导') && text.includes('不创建作品') : text.includes('先选择一部作品') && text.includes('待创建'), `${action} prerequisite missing`);
      check(!/创建成功|已成功|成功创建/.test(text), 'Fake success text');
      if (action !== 'book') { await page.locator('#dialog-primary').click(); check(await page.locator('dialog').getAttribute('data-flow') === 'book', 'Create prerequisite link not wired'); }
      await page.keyboard.press('Escape');
      check(await page.locator(`[data-action="${action}"]`).evaluate(element => document.activeElement === element), 'Nested modal lost original trigger');
      flows.push({ action, prerequisiteDisclosed: true, noFakeSuccess: true });
    }
    return flows;
  });
  await run('PV10', 'Draft editing/preservation, composer explanations, disabled send', async () => {
    await configure();
    const draft = '审核稿验证文字：一缕灵感\n保留输入，不发送。';
    await page.locator('#draft').fill(draft);
    check(await page.locator('#send').isDisabled(), 'No-model send is enabled');
    const flows = [];
    for (const action of ['model', 'mode', 'association', 'add']) {
      await page.locator(`[data-action="${action}"]`).click();
      check(await page.locator('dialog').getAttribute('data-flow') === action, `${action} explanation missing`);
      if (action === 'add') check((await page.locator('dialog').innerText()).includes('即将支持'), 'Unsupported upload is represented as available');
      await page.keyboard.press('Escape');
      check(await page.locator('#draft').inputValue() === draft, `${action} loses draft`); flows.push(action);
    }
    await configure('paper', 420, 520); await configure('ink', 560, 760);
    check(await page.locator('#draft').inputValue() === draft, 'Theme/size loses draft');
    await page.locator('#draft').click(); await page.keyboard.press('Control+Enter');
    check(await page.locator('#send').isDisabled() && await page.locator('#draft').inputValue() === draft, 'Keyboard sends or clears draft');
    await page.locator('#draft').fill('');
    return { flows, preservedAfterThemesAndSizes: true, sendDisabled: true, typedOnlySyntheticTestText: true };
  });
  await run('PV11', '200% browser-layout-equivalent scaling at narrow short width', async () => {
    const observations = [];
    for (const theme of ['paper', 'ink']) {
      await configure(theme, 320, 420, 2);
      const observed = await geometry(); assertLayout(observed, 320, 420, 2);
      const reachable = await reachableActions();
      check(await page.locator('#panel .review-header,#panel .review-footer,#panel .review-controls').count() === 0, 'Review chrome mixed into product panel');
      const screenshot = `${theme}-320x420-zoom200.png`;
      await page.locator('#panel').screenshot({ path: path.join(evidence, screenshot) });
      observations.push({ theme, observed, reachable, screenshot });
    }
    await configure();
    return { method: 'CSS zoom:2 on the product region, preserving a 320×420 CSS-pixel panel and doubling rendered text/control sizes. This verifies zoom-equivalent narrow layout, not OS font-only scaling.', observations };
  });
  await run('PV13', 'V2 unified button surfaces, solid monochrome symbols and expanded smoke', async () => {
    const surfaceThemes = [];
    const actions = ['book', 'world', 'character', 'scene'];
    const surface = locator => locator.evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: [style.borderTop, style.borderRight, style.borderBottom, style.borderLeft] };
    });
    for (const theme of ['paper', 'ink']) {
      await configure(theme, 560);
      const normal = [], hover = [];
      for (const action of actions) normal.push({ action, style: await surface(page.locator(`[data-action="${action}"]`)) });
      check(normal.every(item => JSON.stringify(item.style) === JSON.stringify(normal[0].style)), `${theme} normal button backgrounds or borders differ`);
      for (const action of actions) {
        await page.locator(`[data-action="${action}"]`).hover();
        await page.waitForTimeout(250);
        hover.push({ action, style: await surface(page.locator(`[data-action="${action}"]`)) });
      }
      check(hover.every(item => JSON.stringify(item.style) === JSON.stringify(hover[0].style)), `${theme} hover button backgrounds or borders differ`);
      surfaceThemes.push({ theme, normal, hover });
    }
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'assets/manifest.json'), 'utf8'));
    const monochromeAssets = [];
    for (const asset of manifest.assets) {
      const svgSource = await fs.readFile(path.join(directory, 'assets', asset.staticSvg), 'utf8');
      const fills = [...new Set([...svgSource.matchAll(/\bfill\s*=\s*["']([^"']+)["']/g)].map(match => match[1].toLowerCase()).filter(fill => fill !== 'none'))];
      check(fills.length === 1 && /^#[a-f\d]{6}$/i.test(fills[0]), `${asset.sprite} SVG does not use exactly one solid fill`);
      check(!/\bstroke\s*=\s*["'](?!none["'])/i.test(svgSource), `${asset.sprite} uses a stroke instead of a solid silhouette`);
      if (asset.name !== 'logo') check(!/\b(?:fill-)?opacity\s*=\s*["']0?\./i.test(svgSource), `${asset.sprite} icon has translucent interior fills`);
      const png = await fs.readFile(path.join(directory, 'assets', asset.sprite));
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const opaqueColors = new Set();
      const frameCoverage = [];
      let edgeAlphaPixels = 0, coloredLogoPixels = 0, maxChangedSmokePixels = 0, baselineSmokePixels = 0;
      for (let frame = 0; frame < asset.frameCount; frame++) {
        let minX = asset.frameWidth, minY = asset.frameHeight, maxX = -1, maxY = -1, visiblePixels = 0, transparentPixels = 0, smokePixels = 0, changedSmokePixels = 0;
        const smokeBounds = { minX: asset.frameWidth, minY: asset.frameHeight, maxX: -1, maxY: -1 };
        for (let y = 0; y < asset.frameHeight; y++) for (let x = 0; x < asset.frameWidth; x++) {
          const offset = (y * info.width + frame * asset.frameWidth + x) * 4;
          const alpha = data[offset + 3];
          if (!alpha) transparentPixels++;
          else {
            visiblePixels++;
            minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            if (x === 0 || y === 0 || x === asset.frameWidth - 1 || y === asset.frameHeight - 1) edgeAlphaPixels++;
            if (alpha === 255) opaqueColors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
            if (asset.name === 'logo' && (data[offset] !== data[offset + 1] || data[offset + 1] !== data[offset + 2])) coloredLogoPixels++;
          }
          if (asset.name === 'logo' && y < manifest.logoMotion.fixedRasterRegion.y) {
            if (alpha) { smokePixels++; smokeBounds.minX = Math.min(smokeBounds.minX, x); smokeBounds.minY = Math.min(smokeBounds.minY, y); smokeBounds.maxX = Math.max(smokeBounds.maxX, x); smokeBounds.maxY = Math.max(smokeBounds.maxY, y); }
            const originalOffset = (y * info.width + x) * 4;
            if ([0, 1, 2, 3].some(channel => data[offset + channel] !== data[originalOffset + channel])) changedSmokePixels++;
          }
        }
        let transparentInsideBounds = 0;
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (data[(y * info.width + frame * asset.frameWidth + x) * 4 + 3] === 0) transparentInsideBounds++;
        check(visiblePixels > 0 && transparentPixels > 0 && transparentInsideBounds > 0, `${asset.sprite} frame ${frame} lacks a transparent negative shape`);
        if (frame === 0) baselineSmokePixels = smokePixels;
        maxChangedSmokePixels = Math.max(maxChangedSmokePixels, changedSmokePixels);
        frameCoverage.push({ frame, bounds: { minX, minY, maxX, maxY }, visiblePixels, transparentPixels, transparentInsideBounds, ...(asset.name === 'logo' ? { smokeBounds, smokePixels, changedSmokePixels } : {}) });
      }
      check(edgeAlphaPixels === 0, `${asset.sprite} contains visible pixels touching a frame edge`);
      check(opaqueColors.size === 1, `${asset.sprite} has ${opaqueColors.size} opaque RGB colors`);
      const record = { sprite: asset.sprite, svgFills: fills, opaqueColors: [...opaqueColors], edgeAlphaPixels, frameCoverage };
      if (asset.name === 'logo') {
        check(coloredLogoPixels === 0, `${asset.sprite} is not grayscale`);
        check(asset.frameCount === 64 && asset.fps === 16 && asset.durationMs === 4000, 'V2 Logo timing is not 64 frames / 16 fps / 4 seconds');
        const amplitude = manifest.logoMotion.horizontalAmplitudeSource;
        const previousAmplitude = manifest.logoMotion.previousHorizontalAmplitudeSource;
        check(Number.isFinite(amplitude) && Number.isFinite(previousAmplitude) && previousAmplitude > 0 && amplitude / previousAmplitude >= 5, 'V2 smoke source amplitude is not at least 5 times the documented v1 baseline');
        check(maxChangedSmokePixels > baselineSmokePixels * .35, `${asset.sprite} does not materially change the smoke coverage`);
        Object.assign(record, { grayscale: true, sourceHorizontalAmplitude: amplitude, previousHorizontalAmplitude: previousAmplitude, sourceAmplitudeRatio: amplitude / previousAmplitude, baselineSmokePixels, maxChangedSmokePixels, maxChangedSmokeRatio: maxChangedSmokePixels / baselineSmokePixels });
      }
      monochromeAssets.push(record);
    }
    await neutral();
    return { revision: 2, surfaceThemes, monochromeAssets, methods: 'Button surfaces come from actual computed normal and hover styles. All decoded sprite frames are checked for solid opaque RGB, transparent negative space and untouched transparent outer edges; Logo coverage and declared source amplitudes are recorded independently of archive-v1.' };
  });
  await run('PV12', 'Design-only scope, local dependencies, credential count and hashes', async () => {
    const files = await currentFiles();
    let credentialMatchCount = 0, scannedFiles = 0;
    const patterns = [/\bsk-[A-Za-z0-9_-]{20,}\b/g, /\bark-[A-Za-z0-9-]{20,}\b/g, /\bAKIA[A-Z0-9]{16}\b/g, /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, /\bBearer\s+[A-Za-z0-9._-]{24,}/g];
    for (const file of files.filter(file => /\.(?:html|css|js|mjs|md|json|svg)$/i.test(file))) {
      const source = await fs.readFile(file, 'utf8'); scannedFiles++;
      for (const pattern of patterns) credentialMatchCount += [...source.matchAll(pattern)].length;
    }
    check(credentialMatchCount === 0, `Credential-format match count: ${credentialMatchCount}`);
    const dependencies = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href],img[src]')].map(element => ({ tag: element.tagName, protocol: new URL(element.src || element.href).protocol })));
    check(dependencies.every(item => item.protocol === 'file:' || item.protocol === 'data:'), 'Remote embedded dependency');
    const changedPaths = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repository, encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(line => line.slice(3).replace(/^"|"$/g, '').replaceAll('\\', '/'));
    const hashes = [];
    for (const file of files.filter(file => !file.includes(`${path.sep}evidence${path.sep}`) && path.basename(file) !== 'preview-checks.json')) hashes.push({ path: path.relative(directory, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) });
    return { credentialMatchCount, scannedFiles, scanScope: 'Only current design/chat-empty-state files; archive-v1 is excluded from traversal, scans and hashes. Matched strings are never output.', dependencies, changedPathsInDesignDirectory: changedPaths.filter(file => file.startsWith('design/chat-empty-state/') && !file.startsWith('design/chat-empty-state/archive-v1/')).length, preexistingOrConcurrentPathsOutsideDesignDirectory: changedPaths.filter(file => !file.startsWith('design/chat-empty-state/')).length, mutationScope: 'This verifier writes only itself, preview-checks.json and evidence/**. Existing or concurrent repository changes are not attributed to this task.', hashes };
  });
} finally {
  await browser.close();
  const unexecuted = results.flatMap(result => result.details?.unexecuted || []);
  const failed = results.filter(result => result.status === 'failed');
  const report = { designRevision: 2, generatedAt: new Date().toISOString(), scope: 'V2 HTML design preview only. Not product React, business behavior, Electron, Windows installer, macOS, persistence, live model, or user UI approval. No v1 evidence is reused.', runtime, selectedCases: selection || 'all PV01–PV13', summary: { passed: results.filter(result => result.status === 'passed').length, failed: failed.length, unexecuted: unexecuted.length, allExecutedAssertionsPassed: failed.length === 0, fullCoverage: unexecuted.length === 0 && results.length === 13 }, results, unexecuted, browserErrors, failedRequests, networkRequestCount: requests.filter(request => /^https?:$/.test(request.protocol)).length };
  await fs.writeFile(path.join(directory, 'preview-checks.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary));
  if (failed.length) process.exitCode = 1;
}
