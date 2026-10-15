import { chromium } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tsImport } from 'tsx/esm/api';
import { isDeepStrictEqual } from 'node:util';

// V3.4 design only: paper-theme warm muted art; existing interactions retained.
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const evidence = path.join(directory, 'evidence-v3');
await fs.mkdir(evidence, { recursive: true });
const selection = process.argv.find(value => value.startsWith('--only='))?.slice(7).split(',');
const results = [], browserErrors = [], requests = [], failedRequests = [];
const actions = ['book', 'character', 'world', 'scene'];
const genres = { 'genre-xianxia': '仙侠', 'genre-history': '历史', 'genre-scifi': '科幻' };
const allActions = [...actions, ...Object.keys(genres)];
const wizardActions = ['book', ...Object.keys(genres)], quickActions = ['character', 'world', 'scene'];
const referenceModules = await Promise.all(['taxonomy', 'filter', 'compose', 'position', 'templates/index'].map(name => tsImport(pathToFileURL(path.join(repository, `src/lib/creation-wizard/${name}.ts`)).href, import.meta.url)));
const reference = Object.assign({}, ...referenceModules);
const presetFilters = {
  book: { channel: '不限', length: '不限', genre: '全部', tags: { sub: [], bg: [], style: [], flow: [] } },
  'genre-xianxia': { channel: '男频', length: '长篇', genre: '仙侠', tags: { sub: ['古典仙侠'], bg: ['修仙界'], style: ['热血'], flow: ['升级流'] } },
  'genre-history': { channel: '男频', length: '长篇', genre: '历史', tags: { sub: ['架空历史'], bg: ['古代'], style: ['正剧'], flow: ['权谋'] } },
  'genre-scifi': { channel: '男频', length: '长篇', genre: '科幻', tags: { sub: ['星际文明'], bg: ['星际'], style: ['烧脑'], flow: ['经营'] } },
};
const asFilters = value => ({ ...value, tags: Object.fromEntries(Object.entries(value.tags).map(([group, tags]) => [group, new Set(tags)])) });
const filtersView = value => ({ ...value, tags: Object.fromEntries(Object.entries(value.tags).map(([group, tags]) => [group, [...tags]])) });
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };
const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;
const localAsset = name => { const result = path.resolve(directory, 'assets', name); check(result.startsWith(path.join(directory, 'assets') + path.sep), 'Asset path escapes design assets'); return result; };
const manifest = JSON.parse(await fs.readFile(localAsset('manifest.json'), 'utf8'));
const decodedAssets = new Map();
async function decode(asset) {
  if (!decodedAssets.has(asset.sprite)) {
    const png = await fs.readFile(localAsset(asset.sprite));
    check(hash(png) === asset.spriteSha256, `${asset.sprite} hash mismatch`);
    const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    check(decoded.info.width === asset.frameWidth * asset.frameCount && decoded.info.height === asset.frameHeight, `${asset.sprite} dimensions mismatch`);
    const sequence = [];
    for (let frame = 0; frame < asset.frameCount; frame++) sequence.push(await sharp(png).extract({ left: frame * asset.frameWidth, top: 0, width: asset.frameWidth, height: asset.frameHeight }).ensureAlpha().raw().toBuffer());
    decodedAssets.set(asset.sprite, { png, ...decoded, sequence });
  }
  return decodedAssets.get(asset.sprite);
}
async function currentFiles(parent = directory) {
  const found = [];
  for (const entry of await fs.readdir(parent, { withFileTypes: true })) {
    if (/^archive-/i.test(entry.name) || /^evidence(?:-|$)/i.test(entry.name) || /^layout-review-/i.test(entry.name)) continue;
    const file = path.join(parent, entry.name);
    if (entry.isDirectory()) found.push(...await currentFiles(file)); else if (entry.isFile()) found.push(file);
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
const runtime = { browser: 'Installed Google Chrome', version: browser.version(), platform: process.platform, protocol: 'file:', isolatedContext: true };
const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, reducedMotion: 'no-preference', offline: true });
const page = await context.newPage();
page.setDefaultTimeout(5000);
page.setDefaultNavigationTimeout(30000);
page.on('pageerror', error => browserErrors.push(error.message));
page.on('request', request => requests.push({ protocol: new URL(request.url()).protocol, resourceType: request.resourceType() }));
page.on('requestfailed', request => failedRequests.push({ protocol: new URL(request.url()).protocol, failure: request.failure()?.errorText }));
const frames = () => page.locator('[data-sprite]').evaluateAll(elements => Object.fromEntries(elements.map(el => [el.dataset.sprite, Number(el.dataset.frame)])));
const spriteContract = () => page.locator('[data-sprite]').evaluateAll(elements => elements.map(el => ({ name: el.dataset.sprite, role: el.dataset.role, count: Number(el.dataset.frames), fps: Number(el.dataset.fps), action: el.closest('[data-action]')?.dataset.action || null })));
const neutral = async () => { await page.mouse.move(1, 1); await page.locator('#draft').click(); await page.waitForFunction(() => [...document.querySelectorAll('[data-sprite]')].every(el => Number(el.dataset.frame) === 0)); await page.waitForTimeout(50); };
async function configure(theme = 'ink', width = 560, height = 760, zoom = 1) {
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('#reduce-motion').uncheck();
  await page.locator(`button[data-theme="${theme}"]`).click(); await page.locator('#short-window').setChecked(height < 600);
  await page.locator('#panel').evaluate((el, options) => { el.style.setProperty('--panel-width', `${options.width}px`); el.style.height = `${options.height}px`; el.style.zoom = String(options.zoom); }, { width, height, zoom });
  await neutral(); await page.locator('.welcome-scroll').evaluate(el => { el.scrollTop = 0; }); await page.waitForTimeout(400);
}
async function geometry() {
  return page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const get = selector => rect(document.querySelector(selector));
    const panel = document.querySelector('#panel'), scroll = document.querySelector('.welcome-scroll');
    return { panel: get('#panel'), scroll: get('.welcome-scroll'), dock: get('.composer-dock'), composer: get('.composer'), group: get('.creation-actions'), cards: Object.fromEntries([...document.querySelectorAll('.creation-actions [data-action]')].map(el => [el.dataset.action, rect(el)])), labels: [...document.querySelectorAll('.card-copy strong,.card-copy small,.genre-copy strong,.genre-copy small')].map(el => ({ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth, rect: rect(el) })), panelOverflow: panel.scrollWidth - panel.clientWidth, scrollOverflow: scroll.scrollWidth - scroll.clientWidth, scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight, tools: [...document.querySelectorAll('.composer-toolbar button,.context-row button')].map(rect) };
  });
}
function assertLayout(g, width, height, zoom = 1) {
  const tolerance = zoom + .1, { book, character, world, scene } = g.cards, themes = Object.keys(genres).map(key => g.cards[key]);
  check(near(g.panel.width, width * zoom, 2) && near(g.panel.height, height * zoom, 2), 'Panel dimensions differ from scenario');
  check(g.panelOverflow <= 1 && g.scrollOverflow <= 1, 'Horizontal overflow');
  check(near(g.group.x, g.composer.x, tolerance) && near(g.group.right, g.composer.right, tolerance), 'Creation group and composer edges do not align within 1 CSS pixel');
  check([book, character, world, scene].every(card => near(card.width, book.width, tolerance) && near(card.height, 114 * zoom, tolerance)), 'Four creation cards do not share the same 114px dimensions');
  check(g.labels.some(label => label.text === '构建故事中的天地') && g.labels.some(label => label.text === '让每一幕跃然眼前'), 'World or scene subtitle is missing');
  if (width >= 480) { check(near(book.y, character.y, tolerance) && near(world.y, scene.y, tolerance) && world.y >= book.bottom, 'Desktop two-by-two card rows fail'); check(themes.every(r => near(r.y, themes[0].y, tolerance) && near(r.width, themes[0].width, tolerance)), 'Desktop themes do not form three equal columns'); }
  else for (let i = 1; i < allActions.length; i++) { const a = g.cards[allActions[i - 1]], b = g.cards[allActions[i]]; check(b.y >= a.bottom && near(a.x, b.x, tolerance) && near(a.width, b.width, tolerance), 'Narrow cards are not a single ordered column'); }
  check(themes[0].y >= Math.max(world.bottom, scene.bottom), 'Genre cards are not below creation cards');
  check(g.labels.every(label => label.scrollWidth <= label.width + 1), 'Card label horizontal clipping');
  check(g.scroll.bottom <= g.dock.y + tolerance && near(g.dock.bottom, g.panel.bottom - zoom, 2 * zoom), 'Composer docking or scroll separation failed');
  check(g.tools.every(r => r.x >= g.panel.x && r.right <= g.panel.right && r.bottom <= g.panel.bottom), 'Composer controls escape panel');
}
async function visibleAction(action) {
  return page.locator(`[data-action="${action}"]`).evaluate(el => { const r = el.getBoundingClientRect(), scroll = el.closest('.welcome-scroll'), s = scroll.getBoundingClientRect(), center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { action: el.dataset.action, fullyVisible: r.y >= s.y - 1 && r.bottom <= s.bottom + 1, receivesPointer: center === el || el.contains(center), focused: document.activeElement === el, rect: { top: r.y, bottom: r.bottom, height: r.height }, viewport: { top: s.y, bottom: s.bottom, height: s.height }, scrollTop: scroll.scrollTop }; });
}
async function keyboardTo(selector) {
  await page.mouse.move(1, 1); await page.locator('#design-notes').click(); await closeDialog();
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); if (await page.locator(selector).evaluate(el => document.activeElement === el)) { await page.waitForTimeout(60); return; } }
  throw new Error(`Keyboard failed to reach ${selector}`);
}
async function closeDialog() {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  // Native dialog close is queued; let its close event restore focus before reading it.
  await page.waitForTimeout(60);
}
async function scrollAction(action) {
  await page.locator(`[data-action="${action}"]`).scrollIntoViewIfNeeded(); await page.waitForTimeout(60);
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await visibleAction(action); if (state.fullyVisible) return;
    const scroll = await page.locator('.welcome-scroll').boundingBox();
    await page.mouse.move(scroll.x + scroll.width - 8, scroll.y + scroll.height / 2);
    await page.mouse.wheel(0, (state.rect.top + state.rect.bottom - state.viewport.top - state.viewport.bottom) / 2);
    await page.waitForTimeout(120);
  }
}
async function screenshot(name) { await page.locator('#panel').screenshot({ path: path.join(evidence, name) }); return name; }
const transform = action => page.locator(`[data-action="${action}"] .genre-image`).evaluate(el => getComputedStyle(el).transform);
const identity = value => value === 'none' || value === 'matrix(1, 0, 0, 1, 0, 0)';
const luminance = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
const contrast = (fg, bg) => { const front = fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1))); const a = luminance(front), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
const wizardState = () => page.locator('#wizard-dialog').evaluate(el => ({
  ...Object.fromEntries(['channel', 'length', 'genre'].map(field => [field, el.querySelector(`[data-wizard-filter="${field}"][aria-pressed="true"]`)?.dataset.value])),
  tags: Object.fromEntries(['sub', 'bg', 'style', 'flow'].map(group => [group, [...el.querySelectorAll(`[data-wizard-tag="${group}"][aria-pressed="true"]`)].map(button => button.dataset.value)])),
}));
const wizardFilter = (field, value) => page.locator(`#wizard-dialog [data-wizard-filter="${field}"][data-value="${value}"]`).click();
async function wizardPicks() {
  const picks = {};
  for (const category of reference.WIZARD_CATEGORIES) { await page.locator(`[data-wizard-category="${category}"]`).click(); const selected = await page.locator('[data-template-id][aria-pressed=true]').evaluateAll(items => items.map(el => el.dataset.templateId)); check(selected.length === 1, `${category} does not have exactly one selected template/blank`); picks[category] = selected[0]; }
  return picks;
}
async function wizardLists(filters) {
  const lists = [];
  for (const category of reference.WIZARD_CATEGORIES) { await page.locator(`[data-wizard-category="${category}"]`).click(); const actual = await page.locator('[data-template-id]').evaluateAll(items => items.map(el => el.dataset.templateId)), expected = ['blank', ...reference.visibleTemplates(category, asFilters(filters)).map(template => template.id)]; check(isDeepStrictEqual(actual, expected), `${category} visible template filter/order differs from real production functions`); lists.push({ category, count: actual.length - 1, idsSha256: hash(Buffer.from(JSON.stringify(actual))) }); }
  return lists;
}
const expectedDraft = (filters, picks) => reference.composeWizardDraft(asFilters(filters), Object.fromEntries(reference.WIZARD_CATEGORIES.map(category => [category, picks[category] === 'blank' ? null : reference.WIZARD_TEMPLATES.find(template => template.id === picks[category])])));
async function waitWizardClosed() { await page.waitForFunction(() => !document.querySelector('#wizard-dialog').open); await page.waitForTimeout(60); }
async function assertComposerFocused(label) {
  const state = await page.locator('#draft').evaluate(el => ({ focused: document.activeElement === el, height: parseFloat(getComputedStyle(el).height), renderedHeight: el.getBoundingClientRect().height, valueLength: el.value.length }));
  check(state.focused && state.height >= 48 && state.height <= 140.1 && await page.locator('#send').isDisabled(), `${label} composer focus/height/no-model state wrong: ${JSON.stringify(state)}`); return state;
}
async function checkTabBoundary(selector) {
  const boundary = await page.locator(selector).evaluate(el => { const controls = [...el.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(item => item.getClientRects().length); window.v33Boundary = { first: controls[0], last: controls.at(-1), container: el }; controls.at(-1).focus(); return { first: controls[0].id || controls[0].getAttribute('data-template-id'), last: controls.at(-1).id || controls.at(-1).getAttribute('data-template-id'), count: controls.length }; });
  await page.keyboard.press('Tab'); check(await page.evaluate(() => document.activeElement === window.v33Boundary.first), `${selector} forward Tab escapes/wrong wrap`);
  await page.keyboard.press('Shift+Tab'); check(await page.evaluate(() => document.activeElement === window.v33Boundary.last), `${selector} reverse Tab escapes/wrong wrap`);
  return { ...boundary, method: 'Place focus at boundary, then real Tab/Shift+Tab; entrance activation is tested separately with real keyboard traversal.' };
}

let executionError = null;
try {
  await page.goto(pathToFileURL(path.join(directory, 'index.html')).href); await page.waitForLoadState('load');
  await run('V3-01', 'Offline local assets and generation metadata', async () => {
    check(manifest.version === 3, 'Asset manifest is not v3');
    const contracts = await spriteContract(), loaded = [];
    check(contracts.length === 5 && contracts.filter(a => a.role === 'logo').length === 1 && contracts.filter(a => a.role === 'icon').length === 0 && contracts.filter(a => a.role === 'card-art').length === 4, 'Animation scheduler must contain only Logo and four card-art sprites');
    const staticIcons = [];
    for (const theme of ['paper', 'ink']) {
      await configure(theme);
      for (const contract of contracts) { const asset = manifest.assets.find(a => a.name === contract.name && a.theme === theme); check(asset && asset.role === contract.role && asset.frameCount === contract.count && asset.fps === contract.fps, `${theme}/${contract.name} DOM and manifest contract mismatch`); await decode(asset); }
      const icons = await page.locator('img.action-symbol[data-role=icon]').evaluateAll(async elements => Promise.all(elements.map(async el => { await el.decode(); return { name: el.dataset.icon, file: new URL(el.currentSrc).pathname.split('/').at(-1), width: el.naturalWidth, height: el.naturalHeight, inScheduler: el.hasAttribute('data-sprite') }; })));
      check(icons.length === 4 && icons.every(icon => !icon.inScheduler), 'Four static img icons required outside scheduler');
      for (const icon of icons) { const asset = manifest.assets.find(a => a.role === 'icon' && a.name === icon.name && a.theme === theme); check(asset && icon.file === asset.firstFrame && icon.width === asset.frameWidth && icon.height === asset.frameHeight, `${theme}/${icon.name} does not use theme first-frame PNG`); const first = await sharp(await fs.readFile(localAsset(icon.file))).ensureAlpha().raw().toBuffer(), { sequence } = await decode(asset); check(first.equals(sequence[0]), `${icon.file} not identical to original frame 0`); staticIcons.push({ theme, ...icon, sourcePixelsMatchFirstFrame: true }); }
      loaded.push(...await page.locator('[data-sprite]').evaluateAll(async elements => Promise.all(elements.map(async el => { const value = getComputedStyle(el).backgroundImage, match = value.match(/^url\(["']?(.*?)["']?\)$/); if (!match) throw new Error(`No background for ${el.dataset.sprite}`); const image = new Image(); image.src = match[1]; await image.decode(); return { name: el.dataset.sprite, width: image.naturalWidth, height: image.naturalHeight }; }))));
    }
    const themeImages = await page.locator('.genre-image').evaluateAll(async elements => Promise.all(elements.map(async el => { await el.decode(); return { file: decodeURIComponent(new URL(el.src).pathname.split('/').at(-1)), width: el.naturalWidth, height: el.naturalHeight }; })));
    const metadata = JSON.parse(await fs.readFile(localAsset('theme-images-v3.json'), 'utf8'));
    for (const image of themeImages) { const record = metadata.images.find(item => item.file === image.file); check(record && record.prompt && record.source, `${image.file} lacks generation provenance`); const bytes = await fs.readFile(localAsset(image.file)); check(record.sha256 === hash(bytes) && record.width === image.width && record.height === image.height && image.width >= 600 && image.height >= 300, `${image.file} metadata/dimensions mismatch`); }
    const wizardData = await page.evaluate(() => window.SHAKEINK_WIZARD_DATA);
    check(wizardData && isDeepStrictEqual(wizardData.templates, reference.WIZARD_TEMPLATES) && isDeepStrictEqual(wizardData.categories, [...reference.WIZARD_CATEGORIES]) && isDeepStrictEqual(wizardData.defaultFilters, filtersView(reference.DEFAULT_FILTERS)), 'Local wizard corpus/defaults differ from real repository exports');
    const taxonomyMap = { WIZARD_CHANNELS: 'channels', WIZARD_LENGTHS: 'lengths', WIZARD_LENGTH_META: 'lengthMeta', WIZARD_GENRES_BY_CHANNEL: 'genresByChannel', WIZARD_SUBGENRES: 'subgenres', WIZARD_BACKGROUNDS: 'backgrounds', WIZARD_STYLES_BY_CHANNEL: 'stylesByChannel', WIZARD_FLOWS: 'flows', WIZARD_ARCHETYPES: 'archetypes', WIZARD_GENRE_UNION: 'genreUnion', WIZARD_TAG_GROUP_VOCABS: 'tagGroupVocabs' };
    for (const [source, field] of Object.entries(taxonomyMap)) check(isDeepStrictEqual(wizardData.taxonomy[field], reference[source]), `Wizard taxonomy ${field} differs from production`);
    const wizardSources = [];
    for (const source of wizardData.metadata.sources) { check(/^src\/lib\/creation-wizard\/[\w/-]+\.ts$/.test(source.path) && !source.path.includes('..'), 'Wizard metadata source path escapes fixed source directory'); const bytes = await fs.readFile(path.join(repository, source.path)); check(bytes.length === source.bytes && hash(bytes) === source.sha256, `${source.path} provenance mismatch`); wizardSources.push(source); }
    for (const relative of ['src/lib/creation-wizard/compose.ts', 'src/lib/creation-wizard/position.ts', 'src/components/layout/CreateNovelDialog.tsx']) { const bytes = await fs.readFile(path.join(repository, relative)); wizardSources.push({ path: relative, sha256: hash(bytes), bytes: bytes.length }); }
    check(themeImages.length === 3 && browserErrors.length === 0 && failedRequests.length === 0 && requests.every(item => ['file:', 'data:'].includes(item.protocol)), 'Offline resources or errors failed');
    return { contracts, staticIcons, loaded, themeImages, metadata: 'assets/theme-images-v3.json', wizard: { templateCount: wizardData.templates.length, categoryCounts: Object.fromEntries(reference.WIZARD_CATEGORIES.map(category => [category, wizardData.templates.filter(template => template.cat === category).length])), taxonomyFields: Object.values(taxonomyMap), matchedActualSourceExports: true, sources: wizardSources }, noNetworkRequests: true };
  });
  await run('V3-02', 'Composer alignment, equal creation cards and responsive card order', async () => {
    const matrix = [];
    for (const theme of ['paper', 'ink']) for (const width of [1000, 560, 480, 420, 320]) { await configure(theme, width); const observed = await geometry(); assertLayout(observed, width, 760); matrix.push({ theme, width, observed, screenshot: await screenshot(`${theme}-${width}x760.png`) }); }
    return matrix;
  });
  await run('V3-03', 'Large card composition and shared creation-card surfaces', async () => {
    const observations = [], tintFrames = [];
    for (const theme of ['paper', 'ink']) for (const width of [1000, 560, 480, 320]) {
      const expectedFilter = theme === 'paper' ? 'grayscale(1) sepia(0.5) brightness(0.62)' : 'grayscale(1) brightness(0.62)';
      await configure(theme, width); const normal = [], hover = [];
      for (const action of actions) {
        const locator = page.locator(`[data-action="${action}"]`); await locator.scrollIntoViewIfNeeded(); await neutral();
        const composition = await locator.evaluate(el => { const r = selector => { const v = el.querySelector(selector).getBoundingClientRect(); return { x: v.x, right: v.right, y: v.y, bottom: v.bottom }; }; const style = getComputedStyle(el), appearance = element => { const s = getComputedStyle(element); return { filter: s.filter, opacity: Number(s.opacity) }; }; return { action: el.dataset.action, card: { y: el.getBoundingClientRect().y, bottom: el.getBoundingClientRect().bottom }, icon: r('[data-role=icon]'), copy: r('.card-copy'), art: r('[data-role=card-art]'), subtitle: el.querySelector('.card-copy small')?.textContent, titleSize: getComputedStyle(el.querySelector('.card-copy strong')).fontSize, artAppearance: appearance(el.querySelector('[data-role=card-art]')), iconAppearance: appearance(el.querySelector('[data-role=icon]')), cardAppearance: appearance(el), surface: [style.backgroundColor, style.borderTop, style.borderRight, style.borderBottom, style.borderLeft], arrowCount: el.querySelectorAll('.action-arrow,[data-arrow],use[href*=arrow]').length }; });
        check(composition.artAppearance.filter === expectedFilter && composition.artAppearance.opacity === .5, `${theme}/${action} right art theme tint/brightness/opacity mismatch: ${JSON.stringify(composition.artAppearance)}`);
        check([composition.iconAppearance, composition.cardAppearance].every(style => style.filter === 'none' && style.opacity === 1), `${action} muting leaked to icon or whole card`);
        check(near(composition.icon.x, composition.copy.x), `${action} icon/copy left edges differ`);
        check(near(composition.icon.right - composition.icon.x, 26) && composition.titleSize === '15px' && composition.subtitle, `${action} icon/title/subtitle hierarchy differs`);
        check(composition.icon.y >= composition.card.y && composition.copy.bottom <= composition.card.bottom, `${theme}/${width}/${action} icon or subtitle vertically clipped`);
        if (action === 'book') check(composition.arrowCount === 0, 'Book still has an arrow');
        // Use visible PNG alpha bounds, not just its larger transparent canvas.
        const asset = manifest.assets.find(a => a.theme === theme && a.name === `card-${action}`), { sequence } = await decode(asset);
        let occupiedLeft = asset.frameWidth;
        for (const pixels of sequence) for (let y = 0; y < asset.frameHeight; y++) for (let x = 0; x < asset.frameWidth; x++) if (pixels[(y * asset.frameWidth + x) * 4 + 3] > 10) occupiedLeft = Math.min(occupiedLeft, x);
        composition.visibleArtLeft = composition.art.x + occupiedLeft / asset.frameWidth * (composition.art.right - composition.art.x);
        check(composition.visibleArtLeft >= composition.copy.right - 1, `${theme}/${width}/${action} art overlaps text: ${composition.visibleArtLeft} < ${composition.copy.right}`);
        normal.push(composition);
        let sampledFrames;
        if (width === 1000) {
          await locator.screenshot({ path: path.join(evidence, `v3.4-art-${theme}-${action}-0.png`) });
          await locator.evaluate(el => {
            const art = el.querySelector('[data-role=card-art]'), icon = el.querySelector('[data-role=icon]'), logo = document.querySelector('[data-role=logo]');
            const trace = { active: true, samples: [] }; window.artTintTrace = trace;
            const appearance = element => { const style = getComputedStyle(element); return { filter: style.filter, opacity: Number(style.opacity) }; };
            const sample = () => { if (!trace.active) return; const frame = Number(art.dataset.frame); if (trace.samples.at(-1)?.frame !== frame) trace.samples.push({ frame, art: appearance(art), icon: appearance(icon), card: appearance(el), logo: appearance(logo) }); requestAnimationFrame(sample); }; sample();
          });
        }
        try { await locator.hover(); await page.waitForTimeout(width === 1000 ? 720 : 220); }
        finally { if (width === 1000) sampledFrames = await page.evaluate(() => { window.artTintTrace.active = false; return window.artTintTrace.samples; }); }
        const hovered = await locator.evaluate(el => { const appearance = element => { const s = getComputedStyle(element); return { filter: s.filter, opacity: Number(s.opacity) }; }, s = getComputedStyle(el); return { surface: [s.backgroundColor, s.borderTop, s.borderRight, s.borderBottom, s.borderLeft], art: appearance(el.querySelector('[data-role=card-art]')), icon: appearance(el.querySelector('[data-role=icon]')), card: appearance(el) }; });
        check(hovered.art.filter === expectedFilter && hovered.art.opacity === .5 && [hovered.icon, hovered.card].every(style => style.filter === 'none' && style.opacity === 1), `${theme}/${width}/${action} hover tint leaks or loses mute settings`);
        hover.push(hovered.surface);
        if (width === 1000) {
          check(sampledFrames.length === 13 && sampledFrames.every((sample, index) => sample.frame === index && sample.art.filter === expectedFilter && sample.art.opacity === .5 && [sample.icon, sample.card, sample.logo].every(style => style.filter === 'none' && style.opacity === 1)), `${theme}/${action} tint is not stable across actual frames 0..12 or leaks to other layers`);
          await locator.screenshot({ path: path.join(evidence, `v3.4-art-${theme}-${action}-12.png`) });
          tintFrames.push({ theme, action, expectedFilter, samples: sampledFrames, screenshots: [`v3.4-art-${theme}-${action}-0.png`, `v3.4-art-${theme}-${action}-12.png`] });
        }
      }
      check(normal.every(item => JSON.stringify(item.surface) === JSON.stringify(normal[0].surface)) && hover.every(item => JSON.stringify(item) === JSON.stringify(hover[0])), 'Four creation surfaces differ');
      check(normal.every(item => near(item.art.right - item.art.x, normal[0].art.right - normal[0].art.x)), 'Four creation art sizes differ');
      const coverage = await page.locator('.genre-card').evaluateAll(items => items.map(el => { const a = el.getBoundingClientRect(), b = el.querySelector('img').getBoundingClientRect(); return { action: el.dataset.action, fits: getComputedStyle(el.querySelector('img')).objectFit, covers: b.width >= a.width - 2 && b.height >= a.height - 2 }; }));
      check(coverage.every(item => item.fits === 'cover' && item.covers), 'A genre image does not fill its card'); observations.push({ theme, width, normal, hover, coverage });
    }
    const logoAppearance = await page.locator('[data-role=logo]').evaluate(el => ({ filter: getComputedStyle(el).filter, opacity: Number(getComputedStyle(el).opacity) }));
    check(logoAppearance.filter === 'none' && logoAppearance.opacity === 1, 'Muting leaked to Logo');
    return { observations, logoAppearance, tintFrames, visualMeaningReview: 'V3.4 changes only paper card-art to warm grayscale/sepia while retaining brightness .62 and opacity .5. Actual frames 0..12 are sampled in both themes; screenshots cover endpoints. Other layout and interaction expectations are retained.' };
  });
  await run('V3-04', 'Role-scoped single-color icons and warmer/darker Logo', async () => {
    const checked = [], themeColors = { paper: [], ink: [] };
    for (const asset of manifest.assets.filter(item => ['logo', 'icon'].includes(item.role))) {
      const { sequence } = await decode(asset), svg = await fs.readFile(localAsset(asset.staticSvg), 'utf8'), fills = [...new Set(svg.match(/#[\da-f]{6}/gi))]; check(fills.length === 1, `${asset.sprite} SVG has multiple fills`);
      const opaque = new Set(); let edgePixels = 0, minimumNegativePixels = Infinity;
      for (const frame of sequence) {
        let minX = asset.frameWidth, minY = asset.frameHeight, maxX = -1, maxY = -1, negative = 0;
        for (let y = 0; y < asset.frameHeight; y++) for (let x = 0; x < asset.frameWidth; x++) { const i = (y * asset.frameWidth + x) * 4; if (frame[i + 3]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); if (x === 0 || y === 0 || x === asset.frameWidth - 1 || y === asset.frameHeight - 1) edgePixels++; } if (frame[i + 3] === 255) opaque.add(frame.subarray(i, i + 3).join(',')); }
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (frame[(y * asset.frameWidth + x) * 4 + 3] === 0) negative++; minimumNegativePixels = Math.min(minimumNegativePixels, negative);
      }
      check(opaque.size === 1 && edgePixels === 0 && minimumNegativePixels > 0, `${asset.sprite} color/edge/negative-space invariant fails`); const rgb = [...opaque][0].split(',').map(Number);
      if (asset.role === 'icon') { check(!/\bstroke\s*=/.test(svg), `${asset.sprite} is stroke-based`); themeColors[asset.theme].push(rgb.join(',')); }
      else if (asset.theme === 'ink') check(luminance(rgb) < luminance([208, 208, 208]), 'Ink Logo not darker than v2'); else check(rgb[0] > rgb[1] && rgb[1] > rgb[2], 'Paper Logo not warm yellow-gray');
      checked.push({ sprite: asset.sprite, role: asset.role, svgFill: fills[0], opaqueRgb: rgb, edgePixels, minimumNegativePixels, frames: sequence.length });
    }
    check(Object.values(themeColors).every(colors => colors.length === 4 && new Set(colors).size === 4), 'Four icon colors are not distinct per theme');
    return { checked, excludedRoles: ['card-art', 'theme-image'], negativeSpaceNote: 'Bounding-box transparency is supplementary; internal cutouts and icon semantics are reviewed visually.' };
  });
  await run('V3-05', 'Original brand, fixed burner, ascending packets and seams', async () => {
    const records = [], motion = manifest.logoMotion; check(motion.packetTrajectories?.length >= 2, 'Missing smoke packet trajectories');
    for (const packet of motion.packetTrajectories) { const active = packet.samples.filter(item => item.active); check(active.length > 2 && active.every((item, i) => !i || item.centerY < active[i - 1].centerY), `Packet ${packet.id} not upward`); check(packet.samples[0].strength === 0 && packet.samples.at(-1).strength === 0, `Packet ${packet.id} envelope not closed`); }
    const delta = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
    for (const asset of manifest.assets) {
      const { sequence } = await decode(asset), adjacent = sequence.slice(1).map((frame, i) => delta(frame, sequence[i])), seam = delta(sequence.at(-1), sequence[0]); check(Math.max(...adjacent) > 0 && seam <= Math.max(...adjacent) * 1.35 + .01, `${asset.sprite} static animation/discontinuous seam`);
      const record = { sprite: asset.sprite, maxAdjacentDelta: Math.max(...adjacent), seamDelta: seam };
      if (asset.role === 'logo') {
        const source = await fs.readFile(path.join(repository, asset.source)); check(hash(source) === asset.sourceSha256, 'Original brand hash mismatch'); const normalization = manifest.logoNormalization; check(normalization?.transforms === 'preserved', 'Brand transforms not preserved');
        const normalized = source.toString().replace(/viewBox="[^"]+"/, `viewBox="${normalization.viewBox}"`).replace(/fill="#[a-f\d]+"/gi, `fill="${normalization.colors[asset.theme]}"`), raster = await sharp(Buffer.from(normalized)).resize(asset.frameWidth, asset.frameHeight).ensureAlpha().raw().toBuffer(); check(raster.equals(sequence[0]), 'First frame differs from normalized brand');
        const fixed = motion.fixedRasterRegion; let fixedChangedBytes = 0, smokeChangedBytes = 0, edgePixels = 0;
        for (const frame of sequence) for (let y = 0; y < asset.frameHeight; y++) for (let x = 0; x < asset.frameWidth; x++) { const offset = (y * asset.frameWidth + x) * 4; if ((x === 0 || y === 0 || x === asset.frameWidth - 1 || y === asset.frameHeight - 1) && frame[offset + 3]) edgePixels++; for (let c = 0; c < 4; c++) if (frame[offset + c] !== sequence[0][offset + c]) { if (x >= fixed.x && x < fixed.x + fixed.width && y >= fixed.y && y < fixed.y + fixed.height) fixedChangedBytes++; else smokeChangedBytes++; } }
        check(fixedChangedBytes === 0 && smokeChangedBytes > 0 && edgePixels === 0, 'Fixed burner/smoke/edge invariant fails'); Object.assign(record, { normalizedFirstFramePixelIdentical: true, fixedRegion: fixed, fixedChangedBytes, smokeChangedBytes, edgePixels });
        const samples = Array.from({ length: 8 }, (_, i) => Math.floor(i * asset.frameCount / 8)), file = `smoke-cycle-${asset.theme}.png`;
        await sharp({ create: { width: 88 * 8, height: 88, channels: 4, background: asset.theme === 'ink' ? '#0d0b0a' : '#f0e7d1' } }).composite(await Promise.all(samples.map(async (frame, i) => ({ input: await sharp(sequence[frame], { raw: { width: asset.frameWidth, height: asset.frameHeight, channels: 4 } }).resize(88, 88).png().toBuffer(), left: i * 88, top: 0 })))).png().toFile(path.join(evidence, file)); record.contactSheet = file;
        const completeSheet = `smoke-all-frames-${asset.theme}.png`;
        await sharp({ create: { width: 88 * 8, height: 88 * Math.ceil(sequence.length / 8), channels: 4, background: asset.theme === 'ink' ? '#0d0b0a' : '#f0e7d1' } }).composite(await Promise.all(sequence.map(async (pixels, i) => ({ input: await sharp(pixels, { raw: { width: asset.frameWidth, height: asset.frameHeight, channels: 4 } }).resize(88, 88).png().toBuffer(), left: i % 8 * 88, top: Math.floor(i / 8) * 88 })))).png().toFile(path.join(evidence, completeSheet));
        record.completeFrameSheet = { file: completeSheet, order: 'row-major, frames 0..N-1, 8 columns, actual 88px display size; source-frame evidence, not a screen recording' };
      }
      records.push(record);
    }
    return { records, packetTrajectories: motion.packetTrajectories, visualReviewRequired: 'Naturalness at 88px and fixed mouth identification require source/visual review; numeric checks alone do not approve aesthetics.' };
  });
  await run('V3-06', 'Static icons, reversible peak card art, looping Logo and theme zoom', async () => {
    const staticIcons = [];
    for (const theme of ['paper', 'ink']) {
      await configure(theme);
      for (const action of actions) {
        const target = page.locator(`[data-action="${action}"]`), icon = target.locator('img[data-role=icon]'); await target.scrollIntoViewIfNeeded(); await neutral();
        // Freeze only the card background while comparing transparent icon pixels.
        // V3-03 independently verifies actual normal/hover card surfaces.
        const savedStyle = await target.getAttribute('style'); await target.evaluate(el => el.style.setProperty('background-color', getComputedStyle(el).backgroundColor, 'important'));
        const state = () => icon.evaluate(el => ({ src: el.currentSrc, inScheduler: el.hasAttribute('data-sprite'), transform: getComputedStyle(el).transform, animation: getComputedStyle(el).animationName }));
        try {
          const normal = await state(), normalPixels = await icon.screenshot(); await target.hover(); await page.waitForTimeout(240); const hover = await state(), hoverPixels = await icon.screenshot();
          await keyboardTo(`[data-action="${action}"]`); await page.waitForTimeout(240); const focus = await state(), focusPixels = await icon.screenshot();
          check(!normal.inScheduler && normal.src === hover.src && normal.src === focus.src && [normal, hover, focus].every(item => item.transform === 'none' && item.animation === 'none'), `${theme}/${action} static icon acquired animation or changed src`);
          check(normalPixels.equals(hoverPixels) && normalPixels.equals(focusPixels), `${theme}/${action} static icon pixels changed on hover/focus`);
          staticIcons.push({ theme, action, normal, hover, focus, pngSha256: hash(normalPixels), pixelsUnchanged: true });
        } finally { await target.evaluate((el, saved) => saved === null ? el.removeAttribute('style') : el.setAttribute('style', saved), savedStyle); }
      }
    }
    await configure(); const contracts = await spriteContract(); check(Object.values(await frames()).every(value => value === 0), 'Initial frames not zero'); const triggers = [], cycles = [], reversals = [];
    const traceMotion = async (member, event, trigger, wait, direction, terminal = null) => {
      await page.evaluate(({ name, event }) => {
        const el = document.querySelector(`[data-sprite="${name}"]`), target = el.closest('button'), records = [];
        const record = kind => records.push({ frame: Number(el.dataset.frame), time: performance.now(), event: kind });
        record('initial'); const listener = () => record(event); target.addEventListener(event, listener);
        const observer = new MutationObserver(() => { if (records.at(-1).frame !== Number(el.dataset.frame)) record('frame'); }); observer.observe(el, { attributes: true, attributeFilter: ['data-frame'] });
        window.v32Trace = { stop() { observer.disconnect(); target.removeEventListener(event, listener); record('end'); return records; } };
      }, { name: member.name, event });
      await trigger(); await page.waitForTimeout(wait); const sequence = await page.evaluate(() => window.v32Trace.stop()), marker = sequence.findIndex(item => item.event === event), peak = Math.floor(member.count / 2);
      check(marker >= 0, `${member.name} missing real ${event}`); const phase = sequence.slice(marker);
      check(phase.every(item => Number.isInteger(item.frame) && item.frame >= 0 && item.frame <= peak), `${member.name} reversible frame outside 0..${peak}`);
      check(phase.every((item, i) => !i || (item.frame - phase[i - 1].frame) * direction >= 0), `${member.name} ${event} reversed the requested direction`);
      check(phase.every((item, i) => !i || Math.abs(item.frame - phase[i - 1].frame) <= Math.ceil((item.time - phase[i - 1].time + 5) * member.fps / 1000) + 1), `${member.name} discontinuous jump during ${event}`);
      if (terminal !== null) check(phase.at(-1).frame === terminal, `${member.name} ${event} did not settle at ${terminal}`);
      return { event, direction, from: phase[0].frame, to: phase.at(-1).frame, waitMs: wait, sequence: phase };
    };
    for (const group of [null, ...actions]) {
      await neutral(); const members = contracts.filter(item => item.action === group), target = group ? `[data-action="${group}"]` : '.brand-motion';
      for (const position of group ? ['icon', 'blank', 'label', 'art'] : ['logo']) {
        const locator = page.locator(position === 'icon' ? `${target} [data-role=icon]` : position === 'label' ? `${target} .card-copy` : position === 'art' ? `${target} [data-role=card-art]` : target);
        if (position === 'art') { await page.locator(target).scrollIntoViewIfNeeded(); const bounds = await page.locator(target).boundingBox(); await page.locator(target).hover({ position: { x: bounds.width - 25, y: bounds.height / 2 } }); }
        else await locator.hover(position === 'blank' ? { position: { x: 5, y: 5 } } : {});
        await page.waitForTimeout(180); const observed = await frames(); check(members.every(member => observed[member.name] > 0) && contracts.filter(item => item.action !== group).every(item => observed[item.name] === 0), `${group || 'logo'} ${position} hover not grouped/independent`); triggers.push({ group, position, observed }); await neutral();
      }
      await page.evaluate(names => { window.v3Sequences = Object.fromEntries(names.map(name => [name, []])); window.v3Observer?.disconnect(); window.v3Observer = new MutationObserver(() => { for (const name of names) { const el = document.querySelector(`[data-sprite="${name}"]`), sequence = window.v3Sequences[name], frame = Number(el.dataset.frame); if (sequence.at(-1)?.frame !== frame) sequence.push({ frame, time: performance.now(), backgroundPosition: el.style.backgroundPosition }); } }); for (const name of names) window.v3Observer.observe(document.querySelector(`[data-sprite="${name}"]`), { attributes: true, attributeFilter: ['data-frame'] }); }, members.map(item => item.name));
      const observationMs = Math.max(...members.map(item => item.count / item.fps * 1000)) * (group ? 2 : 1) + 300;
      await page.locator(target).hover(); await page.waitForTimeout(observationMs); const sequences = await page.evaluate(() => { window.v3Observer.disconnect(); return window.v3Sequences; });
      for (const member of members) {
        const sequence = sequences[member.name], starts = sequence.filter(item => item.frame === 0), expected = member.count / member.fps * 1000;
        check(sequence.every(item => Number.isInteger(item.frame) && item.frame >= 0 && item.frame < member.count), `${member.name} illegal frame index`);
        if (member.role === 'card-art') {
          const peak = Math.floor(member.count / 2);
          check(starts.length === 1 && sequence.at(-1)?.frame === peak && sequence.every((item, i) => item.frame <= peak && (!i || item.frame >= sequence[i - 1].frame)), `${member.name} must expand once and hold peak ${peak}; observed reset/wrap or wrong endpoint over ${observationMs}ms`);
          const terminalMs = sequence.at(-1).time - sequence[0].time;
          check(Math.abs(terminalMs - peak / member.fps * 1000) <= 200, `${member.name} expansion timing differs`);
          cycles.push({ name: member.name, role: member.role, playback: 'reversible-peak', observationMs, expectedDurationMs: peak / member.fps * 1000, terminalReachedMs: terminalMs, terminalFrame: sequence.at(-1).frame, observedFrames: new Set(sequence.map(item => item.frame)).size, sourceFrameCount: member.count, playbackRange: [0, peak], sequence });
        } else {
          check(sequence.some((item, i) => i && sequence[i - 1].frame === member.count - 1 && item.frame === 0), `${member.name} lost looping behavior`);
          check(starts.length >= 2 && Math.abs(starts[1].time - starts[0].time - expected) <= 200, `${member.name} wrong loop duration`);
          cycles.push({ name: member.name, role: member.role, playback: 'loop', observationMs, expectedDurationMs: expected, observedCycleMs: starts[1].time - starts[0].time, observedFrames: new Set(sequence.map(item => item.frame)).size, frameCount: member.count, sequence });
        }
      }
      if (group) {
        const member = members.find(item => item.role === 'card-art'), peak = Math.floor(member.count / 2);
        const reverse = await traceMotion(member, 'pointerleave', () => page.mouse.move(1, 1), 850, -1, 0);
        check(reverse.from === peak && reverse.sequence.some(item => item.frame > 0 && item.frame < peak), `${member.name} leave snapped instead of reverse playback`);
        const arrival = reverse.sequence.find(item => item.frame === 0).time - reverse.sequence[0].time;
        check(Math.abs(arrival - peak / member.fps * 1000) <= 200, `${member.name} return timing differs`);
        reversals.push({ action: group, ...reverse, arrivalMs: arrival });
      }
    }
    await neutral(); await keyboardTo('.create-book'); await page.locator('.create-book').hover(); await page.waitForTimeout(180); await page.mouse.move(1, 1); await page.waitForTimeout(180); const focusOnly = await frames(); check(focusOnly['card-book'] > 0, 'Hover leaving cancels focused card');
    await page.locator('.create-book').hover(); await page.keyboard.press('Tab'); await page.waitForTimeout(180); const hoverOnly = await frames(); check(hoverOnly['card-book'] > 0, 'Focus leaving cancels hovered card'); await neutral(); check(Object.values(await frames()).every(value => value === 0), 'Cleared triggers without reset');
    const peakFocus = [], interrupted = [];
    for (const action of actions) {
      const target = `[data-action="${action}"]`, member = contracts.find(item => item.action === action && item.role === 'card-art'), terminal = Math.floor(member.count / 2);
      await neutral(); await keyboardTo(target); await page.waitForTimeout(terminal / member.fps * 1000 + 300);
      const focusCompleted = (await frames())[member.name]; check(focusCompleted === terminal, `${action} keyboard focus did not reach expanded peak`);
      await page.locator(target).hover(); await page.waitForTimeout(180); const addHover = (await frames())[member.name];
      await page.mouse.move(1, 1); await page.waitForTimeout(180); const focusOnlyCompleted = (await frames())[member.name];
      await page.locator(target).hover(); await page.keyboard.press('Tab'); await page.waitForTimeout(180); const hoverOnlyCompleted = (await frames())[member.name];
      check([addHover, focusOnlyCompleted, hoverOnlyCompleted].every(frame => frame === terminal), `${action} expanded art changed endpoint while one trigger remained`);
      await neutral(); const reset = (await frames())[member.name]; check(reset === 0, `${action} art did not reset after both triggers left`);
      await page.locator(target).hover(); await page.waitForTimeout(180); const replay = (await frames())[member.name]; check(replay > 0 && replay < terminal, `${action} art did not restart on new hover`);
      peakFocus.push({ action, focusCompleted, addHover, focusOnlyCompleted, hoverOnlyCompleted, reset, replay });
      await neutral();
      const earlyForward = await traceMotion(member, 'pointerenter', () => page.locator(target).hover(), 230, 1);
      check(earlyForward.to > 1 && earlyForward.to < terminal, `${action} early hover was not intermediate`);
      const earlyReturn = await traceMotion(member, 'pointerleave', () => page.mouse.move(1, 1), 500, -1, 0);
      check(earlyReturn.from > 0 && earlyReturn.from < terminal && earlyReturn.sequence.some(item => item.frame > 0 && item.frame < earlyReturn.from), `${action} early leave snapped`);
      const secondForward = await traceMotion(member, 'pointerenter', () => page.locator(target).hover(), 400, 1);
      const partialReturn = await traceMotion(member, 'pointerleave', () => page.mouse.move(1, 1), 180, -1);
      check(partialReturn.from > partialReturn.to && partialReturn.to > 0, `${action} reentry was not tested while returning`);
      const reentry = await traceMotion(member, 'pointerenter', () => page.locator(target).hover(), 850, 1, terminal);
      check(reentry.from > 0 && reentry.from < terminal, `${action} reentry reset/jumped before forward trace`);
      interrupted.push({ action, earlyForward, earlyReturn, secondForward, partialReturn, reentry });
    }
    const themes = [];
    for (const action of Object.keys(genres)) { await neutral(); await page.locator(`[data-action="${action}"]`).scrollIntoViewIfNeeded(); await page.waitForTimeout(350); const normal = await transform(action); await page.locator(`[data-action="${action}"]`).hover(); await page.waitForTimeout(350); const hover = await transform(action); await neutral(); await page.waitForTimeout(350); const reset = await transform(action); await keyboardTo(`[data-action="${action}"]`); await page.waitForTimeout(350); const focus = await transform(action); check(identity(normal) && !identity(hover) && identity(reset) && !identity(focus), `${action} hover/focus zoom lifecycle failed`); themes.push({ action, normal, hover, reset, focus }); }
    await neutral(); return { staticIcons, staticPixelMethod: 'Element PNGs compared byte-for-byte with only parent background temporarily frozen to remove hover background through transparent pixels; restored in finally. No icon appearance or animation style changed.', triggers, cycles, reversals, overlap: { focusOnly, hoverOnly }, peakFocus, interrupted, themes };
  });
  await run('V3-07', 'Reduced motion, modal pause, input modality and genuine lifecycle', async () => {
    await configure(); const paused = async label => { await page.waitForTimeout(360); check(Object.values(await frames()).every(value => value === 0), `${label} leaves sprite motion`); check(await page.locator('#panel').getAttribute('data-motion') === 'paused', `${label} lacks pause state`); check(identity(await transform('genre-xianxia')), `${label} leaves genre transform`); };
    await page.locator('#reduce-motion').check(); await page.locator('.create-book').hover(); await paused('manual reduce'); await keyboardTo('.create-world'); await paused('manual keyboard reduce'); await page.locator('[data-action=genre-xianxia]').hover(); await paused('manual genre reduce');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#reduce-motion').uncheck(); await page.locator('.create-book').hover(); await paused('system reduce overrides manual off'); await keyboardTo('[data-action=genre-xianxia]'); await paused('system genre keyboard reduce');
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await neutral(); await page.locator('.create-book').hover(); await page.waitForTimeout(180); check((await frames())['card-book'] > 0, 'Motion fails to resume'); await page.locator('.create-book').click(); await paused('wizard modal'); await page.keyboard.press('Escape');
    await keyboardTo('.brand-motion'); await page.waitForTimeout(160); await page.locator('.brand-motion').click(); await page.mouse.move(1, 1); await page.waitForTimeout(160); const modality = { visible: await page.locator('.brand-motion').evaluate(el => el.matches(':focus-visible')), frame: (await frames()).logo }; check(modality.visible || modality.frame === 0, 'Stale focus-visible animation');
    await neutral(); await page.locator('[data-action=genre-xianxia]').hover(); await page.waitForTimeout(350); await page.evaluate(() => { window.v3Lifecycle = []; for (const event of ['blur', 'focus']) window.addEventListener(event, () => window.v3Lifecycle.push({ event, hidden: document.hidden, focused: document.hasFocus() })); document.addEventListener('visibilitychange', () => window.v3Lifecycle.push({ event: 'visibilitychange', hidden: document.hidden, focused: document.hasFocus() })); });
    const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }); const other = await context.newPage(); await other.goto('about:blank'); const otherCdp = await context.newCDPSession(other); await otherCdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }); await other.bringToFront(); await page.waitForTimeout(400);
    const lifecycle = await page.evaluate(() => ({ hidden: document.hidden, focused: document.hasFocus(), events: window.v3Lifecycle })), first = await frames(); await page.waitForTimeout(250); const later = await frames(), backgroundTransform = await transform('genre-xianxia'), unexecuted = [];
    if (!lifecycle.focused || lifecycle.hidden) check(Object.values(first).every(value => value === 0) && Object.values(later).every(value => value === 0) && identity(backgroundTransform), 'Real background did not remain paused');
    if (lifecycle.focused) unexecuted.push('Real window blur was not exposed; no synthetic event substituted.'); if (!lifecycle.hidden) unexecuted.push('Real document.hidden was not exposed by tab switching in installed headless Chrome; window blur is recorded separately and no synthetic visibility event was used.');
    await other.close(); await page.bringToFront(); await page.locator('.create-book').hover(); await page.waitForTimeout(180); check((await frames())['card-book'] > 0, 'Foreground motion does not resume');
    return { manualAndSystem: 'passed', modal: 'passed', modality, lifecycle, backgroundFrames: { first, later }, backgroundTransform, lifecycleCoverage: { blurObserved: !lifecycle.focused, hiddenObserved: lifecycle.hidden }, unexecuted };
  });
  await run('V3-08', 'Real local wizard defaults, presets, production filtering, selection and draft composition', async () => {
    await configure(); await page.locator('#draft').fill(''); await page.locator('[data-action=book]').click();
    check(await page.locator('#wizard-dialog').evaluate(el => el.open) && (await page.locator('#wizard-title').innerText()).includes('创作向导'), 'Book did not open usable wizard');
    check(isDeepStrictEqual(await wizardState(), presetFilters.book), 'Wizard defaults are not unrestricted');
    const defaultLists = await wizardLists(presetFilters.book), details = [], initialPicks = await wizardPicks(); check(Object.values(initialPicks).every(id => id === 'blank'), 'New wizard has stale template picks');
    for (const category of reference.WIZARD_CATEGORIES) {
      await page.locator(`[data-wizard-category="${category}"]`).click(); const [first, second] = reference.visibleTemplates(category, asFilters(presetFilters.book)); check(first && second, `Insufficient real templates for ${category}`);
      await page.locator(`[data-template-id="${first.id}"]`).click(); await page.locator(`[data-template-id="${second.id}"]`).click(); check(await page.locator('[data-template-id][aria-pressed=true]').count() === 1 && await page.locator(`[data-template-id="${second.id}"]`).getAttribute('aria-pressed') === 'true', `${category} template selection is not single`);
      await page.locator(`[data-template-id="${second.id}"]`).click(); check(await page.locator('[data-template-id=blank]').getAttribute('aria-pressed') === 'true', `${category} repeated click did not return to blank`);
      await page.locator(`[data-template-id="${first.id}"]`).dblclick(); check(await page.locator('#wizard-detail').isVisible() && await page.locator('#wizard-detail-prompt').innerText() === first.prompt, `${category} detail differs from real prompt`);
      const trap = await checkTabBoundary('#wizard-detail'); await page.keyboard.press('Escape'); check(await page.locator('#wizard-dialog').evaluate(el => el.open) && await page.locator('#wizard-detail').isHidden(), 'Detail Escape closed the whole wizard');
      check(await page.locator(`[data-template-id="${first.id}"]`).evaluate(el => document.activeElement === el), `${category} detail Escape did not return focus to template`);
      await page.locator(`[data-template-id="${first.id}"]`).dblclick(); await page.locator('#wizard-detail-use').click(); check(await page.locator('#wizard-detail').isHidden() && await page.locator(`[data-template-id="${first.id}"]`).getAttribute('aria-pressed') === 'true', `${category} detail use failed`);
      details.push({ category, first: first.id, alternate: second.id, detailPromptMatched: true, trap });
    }
    const picks = await wizardPicks(), composed = expectedDraft(presetFilters.book, picks); await page.locator('#wizard-confirm').click(); await waitWizardClosed();
    check(await page.locator('#draft').inputValue() === composed, 'Selected prompts/position order differ from real composeWizardDraft'); const composedFocus = await assertComposerFocused('Wizard confirm');
    await page.locator('#draft').fill(''); await page.locator('[data-action=book]').click(); await page.locator('#wizard-confirm').click(); await waitWizardClosed(); const blankDraft = expectedDraft(presetFilters.book, Object.fromEntries(reference.WIZARD_CATEGORIES.map(category => [category, 'blank']))); check(await page.locator('#draft').inputValue() === blankDraft, 'Blank wizard did not compose explicit default positioning');

    const preserved = 'V3.3 隔离草稿：保留已有句子。\n含有第二行。', presets = [], keyboard = [];
    await page.locator('#draft').fill(preserved);
    for (const action of wizardActions) {
      const selector = `[data-action="${action}"]`; await page.locator(selector).click(); const state = await wizardState(); check(isDeepStrictEqual(state, presetFilters[action]), `${action} complete preset mismatch`);
      check(await page.locator('[data-wizard-category=theme]').getAttribute('aria-current') === 'true', `${action} did not reset to theme tab`);
      const blank = await wizardPicks(); check(Object.values(blank).every(id => id === 'blank'), `${action} reused previous picks`); const lists = await wizardLists(state);
      await wizardFilter('length', '短篇'); await page.locator('#wizard-cancel').click(); await waitWizardClosed(); check(await page.locator('#draft').inputValue() === preserved, `${action} cancel changed draft`);
      check(await page.locator(selector).evaluate(el => document.activeElement === el), `${action} cancel lost return focus`);
      await page.locator(selector).click(); check(isDeepStrictEqual(await wizardState(), presetFilters[action]) && Object.values(await wizardPicks()).every(id => id === 'blank'), `${action} reopen leaked edited state`); await closeDialog();
      presets.push({ action, state, lists, resetOnReopen: true });
      for (const key of ['Enter', 'Space']) { await keyboardTo(selector); const focus = await page.locator(selector).evaluate(el => ({ visible: el.matches(':focus-visible'), outline: getComputedStyle(el).outlineStyle })); check(focus.visible && focus.outline !== 'none', `${action} invisible keyboard focus`); await page.keyboard.press(key); check(await page.locator('#wizard-dialog').evaluate(el => el.open) && isDeepStrictEqual(await wizardState(), presetFilters[action]), `${action} ${key} wrong wizard`); const trap = await checkTabBoundary('#wizard-dialog'); await closeDialog(); check(await page.locator(selector).evaluate(el => document.activeElement === el) && await page.locator('#draft').inputValue() === preserved, `${action} Escape changed draft or focus`); keyboard.push({ action, key, focus, trap }); }
    }

    await page.locator('[data-action=genre-xianxia]').click(); let filterState = presetFilters['genre-xianxia'];
    const male = reference.WIZARD_TEMPLATES.find(template => reference.isTemplateVisible(template, asFilters(filterState)) && template.channels.includes('男频') && !template.channels.includes('女频')); check(male, 'No real male-only preset for pruning test'); await page.locator(`[data-wizard-category="${male.cat}"]`).click(); await page.locator(`[data-template-id="${male.id}"]`).click();
    await wizardFilter('channel', '女频'); filterState = filtersView(reference.onChannelChange(asFilters(filterState), '女频')); check(isDeepStrictEqual(await wizardState(), filterState), 'Channel linkage failed to clear invalid genre/sub/style'); const prunedPicks = await wizardPicks(); check(prunedPicks[male.cat] === 'blank', 'Invisible male template was not pruned'); const femaleLists = await wizardLists(filterState); await closeDialog();
    await page.locator('[data-action=genre-xianxia]').click(); await wizardFilter('genre', '历史'); const genreChanged = filtersView(reference.onGenreChange(asFilters(presetFilters['genre-xianxia']), '历史')); check(isDeepStrictEqual(await wizardState(), genreChanged), 'Genre change did not clear subgenre'); const genreLists = await wizardLists(genreChanged); await closeDialog();
    await page.locator('[data-action=book]').click(); const longOnly = reference.WIZARD_TEMPLATES.find(template => template.lengths?.includes('长篇') && !template.lengths.includes('短篇')); check(longOnly, 'No real length-restricted template'); await page.locator(`[data-wizard-category="${longOnly.cat}"]`).click(); await page.locator(`[data-template-id="${longOnly.id}"]`).click(); await wizardFilter('length', '短篇'); check((await wizardPicks())[longOnly.cat] === 'blank', 'Length filtering retained invisible selection'); const lengthLists = await wizardLists(await wizardState()); await closeDialog();
    await page.locator('[data-action=book]').click(); for (const tag of reference.WIZARD_BACKGROUNDS.slice(0, 21)) await page.locator(`[data-wizard-tag=bg][data-value="${tag}"]`).click(); const limitState = await wizardState(); check(Object.values(limitState.tags).flat().length === reference.POSITION_TAG_LIMIT && (await page.locator('#wizard-error').innerText()).includes('20'), 'Wizard tag cap is not enforced'); await closeDialog();
    check(await page.locator('#draft').inputValue() === preserved && await page.locator('#send').isDisabled(), 'Wizard browsing submitted/changed draft'); await page.locator('#draft').fill('');
    return { oracle: 'Actual src/lib/creation-wizard compose/filter/position/templates modules imported through local tsx; never the preview implementation', defaultLists, details, picks, composedSha256: hash(Buffer.from(composed)), blankDraft, composedFocus, presets, keyboard, linkedFilters: { prunedTemplate: male.id, femaleState: filterState, femaleLists, genreChanged, genreLists, lengthPrunedTemplate: longOnly.id, lengthLists, tagLimit: Object.values(limitState.tags).flat().length } };
  });
  await run('V3-09', 'Two-step replacement, cancellation and editable append-only quick prompts', async () => {
    await configure(); const original = '  V3.3 隔离审核：原稿必须原样保留。\n尾行含空格。  ', replacement = [];
    await page.locator('#draft').fill(original); await page.locator('[data-action=genre-history]').click(); await page.locator('#wizard-confirm').click(); check(await page.locator('#wizard-replace-row').isVisible() && await page.locator('#draft').inputValue() === original, 'First confirm replaced existing draft'); await closeDialog(); check(await page.locator('#draft').inputValue() === original, 'Escape in replacement step changed draft');
    for (const action of wizardActions) {
      await page.locator('#draft').fill(original); await page.locator(`[data-action="${action}"]`).click(); await page.locator('#wizard-confirm').click(); check(await page.locator('#wizard-replace-row').isVisible() && await page.locator('#draft').inputValue() === original, `${action} skipped replacement confirmation`);
      await page.locator('#wizard-replace-back').click(); check(await page.locator('#wizard-replace-row').isHidden() && await page.locator('#draft').inputValue() === original, `${action} replacement back changed draft`);
      await page.locator('#wizard-confirm').click(); await wizardFilter('length', '短篇'); check(await page.locator('#wizard-replace-row').isHidden(), `${action} filter change kept replacement armed`);
      await page.locator('#wizard-confirm').click(); const available = reference.visibleTemplates('theme', asFilters(await wizardState())); check(available.length, `${action} expected at least one real theme template`); await page.locator('[data-wizard-category=theme]').click(); await page.locator(`[data-template-id="${available[0].id}"]`).click(); check(await page.locator('#wizard-replace-row').isHidden(), `${action} template change kept replacement armed`);
      const filters = await wizardState(), picks = await wizardPicks(), expected = expectedDraft(filters, picks); await page.locator('#wizard-confirm').click(); check(await page.locator('#wizard-replace-row').isVisible() && await page.locator('#draft').inputValue() === original, `${action} second phase did not preserve original`);
      await page.locator('#wizard-replace').click(); await waitWizardClosed(); check(await page.locator('#draft').inputValue() === expected, `${action} confirmed composition differs from production`); const focus = await assertComposerFocused(`${action} replace`); replacement.push({ action, filters, picks, sha256: hash(Buffer.from(expected)), focus });
    }
    const prompts = {}, quick = [], headings = { character: '【角色】', world: '【世界观】', scene: '【场景】' };
    for (const action of quickActions) {
      const selector = `[data-action="${action}"]`; await page.locator('#draft').fill(' \n\t '); await page.locator(selector).click(); const prompt = await page.locator('#draft').inputValue();
      check(await page.locator('dialog[open]').count() === 0 && prompt.startsWith(headings[action]) && prompt.split('\n').filter(line => line.startsWith('・')).length >= 5, `${action} did not insert structured editable template directly`); prompts[action] = prompt; const focus = await assertComposerFocused(action);
      await page.locator('#draft').fill(original); await page.locator(selector).click(); const appended = `${original}\n\n${prompt}`; check(await page.locator('#draft').inputValue() === appended, `${action} did not preserve original bytes and append template`);
      await page.locator(selector).click(); check(await page.locator('#draft').inputValue() === appended, `${action} repeated click duplicated template`);
      await page.locator('#draft').fill(`${appended}\n手动补充：仍可编辑。`); await page.locator(selector).click(); check(await page.locator('#draft').inputValue() === `${appended}\n手动补充：仍可编辑。`, `${action} appended same contained template after editing`);
      for (const key of ['Enter', 'Space']) { await page.locator('#draft').fill(''); await keyboardTo(selector); await page.keyboard.press(key); check(await page.locator('#draft').inputValue() === prompt && await page.locator('dialog[open]').count() === 0, `${action} ${key} did not directly insert prompt`); await assertComposerFocused(`${action} ${key}`); }
      quick.push({ action, heading: headings[action], promptSha256: hash(Buffer.from(prompt)), lines: prompt.split('\n').length, focus, appendPreservedBytes: true, duplicateSuppressed: true, editable: true, keys: ['Enter', 'Space'] });
    }
    await page.locator('#draft').fill(original); for (const action of quickActions) await page.locator(`[data-action="${action}"]`).click(); const combined = [original, ...quickActions.map(action => prompts[action])].join('\n\n'); check(await page.locator('#draft').inputValue() === combined, 'Three different quick templates did not append independently');
    for (const action of ['model', 'mode', 'association', 'add']) { await page.locator(`[data-action="${action}"]`).click(); if (action === 'add') check((await page.locator('#interaction-dialog').innerText()).includes('即将支持'), 'Unsupported upload shown available'); await closeDialog(); check(await page.locator('#draft').inputValue() === combined, `${action} helper changed draft`); }
    await configure('paper', 320, 420); await configure('ink', 560); await page.locator('#draft').click(); await page.keyboard.press('Control+Enter'); check(await page.locator('#draft').inputValue() === combined && await page.locator('#send').isDisabled(), 'Theme/size/key submitted or cleared draft'); await page.locator('#draft').fill('');
    return { replacement, quick, differentTemplatesAppendInOrder: true, composerHelpersPreserveDraft: true, onlySyntheticInput: true, sendDisabled: true };
  });
  await run('V3-10', 'Seven cards reachable in short windows and 200% equivalent layout', async () => {
    const matrix = [], wizardMatrix = [];
    for (const theme of ['paper', 'ink']) for (const [width, height, zoom] of [[560, 520, 1], [320, 420, 1], [320, 420, 2]]) {
      await configure(theme, width, height, zoom); await page.locator('#draft').fill(''); await page.locator('[data-action=character]').click(); const populatedDraft = await assertComposerFocused('Short-window actual quick template'); check(populatedDraft.valueLength > 60, 'Short-window scenario lacks real long quick-template content'); await page.locator('.welcome-scroll').evaluate(el => { el.scrollTop = 0; }); const observed = await geometry(); assertLayout(observed, width, height, zoom); const top = await screenshot(`${theme}-${width}x${height}-z${zoom}-top.png`), reachable = [];
      for (const action of allActions) { await scrollAction(action); const pointer = await visibleAction(action); if (!pointer.fullyVisible || !pointer.receivesPointer) await screenshot(`failure-${theme}-${width}x${height}-z${zoom}-${action}.png`); check(pointer.fullyVisible && pointer.receivesPointer, `${theme}/${width}/${height}/z${zoom}/${action} pointer unreachable: ${JSON.stringify(pointer)}`); await keyboardTo(`[data-action="${action}"]`); const keyboard = await visibleAction(action); check(keyboard.fullyVisible && keyboard.focused, `${theme}/${width}/${height}/z${zoom}/${action} keyboard unreachable: ${JSON.stringify(keyboard)}`); await page.keyboard.press('Enter'); let returned;
        if (wizardActions.includes(action)) { check(await page.locator('#wizard-dialog').evaluate(el => el.open), `${action} short-window wizard not opened`); await closeDialog(); returned = await visibleAction(action); check(returned.fullyVisible && returned.focused, `${theme}/${width}/${height}/z${zoom}/${action} return focus offscreen: ${JSON.stringify(returned)}`); }
        else { check(await page.locator('dialog[open]').count() === 0, `${action} unexpectedly opens modal`); returned = { destination: 'composer', ...await assertComposerFocused(`${action} short-window`) }; }
        reachable.push({ action, pointer, keyboard, returned }); }
      check(await page.locator('#panel .review-header,#panel .review-footer,#panel .review-controls').count() === 0, 'Review tools mixed into product area'); matrix.push({ theme, width, height, zoom, observed, populatedDraft, keptLongDraftDuringAllSevenEntrances: true, reachable, screenshots: [top, await screenshot(`${theme}-${width}x${height}-z${zoom}-last.png`)] });
    }
    try {
      for (const theme of ['paper', 'ink']) for (const [width, height] of [[1000, 760], [560, 520], [320, 420]]) {
        await page.setViewportSize({ width, height }); await configure(theme, width, height); await page.locator('#draft').fill(''); await page.locator('[data-action=genre-scifi]').click();
        const metrics = await page.locator('#wizard-dialog').evaluate(el => { const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; }; return { modal: rect(el), overflow: el.scrollWidth - el.clientWidth, filters: rect(document.querySelector('#wizard-filters')), grid: rect(document.querySelector('#wizard-templates')), footer: rect(el.querySelector('.wizard-footer')), viewport: { width: innerWidth, height: innerHeight } }; });
        const file = `wizard-${theme}-${width}x${height}.png`; await page.screenshot({ path: path.join(evidence, file) });
        check(metrics.modal.x >= -1 && metrics.modal.y >= -1 && metrics.modal.right <= width + 1 && metrics.modal.bottom <= height + 1 && metrics.overflow <= 1, `${theme}/${width} wizard exceeds real viewport: ${JSON.stringify(metrics)}`);
        check(metrics.grid.height >= 84, `${theme}/${width} wizard grid cannot fit one 84px template: ${JSON.stringify(metrics)}`);
        await wizardFilter('length', '短篇'); const visited = [];
        for (const category of reference.WIZARD_CATEGORIES) {
          await page.locator(`[data-wizard-category="${category}"]`).click(); const template = page.locator('[data-template-id]:not([data-template-id=blank])').first(); await template.scrollIntoViewIfNeeded();
          const measure = () => template.evaluate(el => { const card = el.getBoundingClientRect(), grid = el.closest('#wizard-templates').getBoundingClientRect(); return { card: { top: card.y, bottom: card.bottom, height: card.height }, grid: { x: grid.x, top: grid.y, bottom: grid.bottom, width: grid.width, height: grid.height }, fullyVisible: card.y >= grid.y - 1 && card.bottom <= grid.bottom + 1 }; });
          let visible = await measure(); check(visible.grid.height >= visible.card.height, `${theme}/${width}/${category} grid smaller than actual template: ${JSON.stringify(visible)}`);
          if (!visible.fullyVisible) { await page.mouse.move(visible.grid.x + visible.grid.width - 5, (visible.grid.top + visible.grid.bottom) / 2); await page.mouse.wheel(0, (visible.card.top + visible.card.bottom - visible.grid.top - visible.grid.bottom) / 2); await page.waitForTimeout(160); visible = await measure(); }
          if (!visible.fullyVisible) await page.screenshot({ path: path.join(evidence, `failure-wizard-${theme}-${width}-${category}.png`) });
          check(visible.fullyVisible, `${theme}/${width}/${category} template clipped after scrolling: ${JSON.stringify(visible)}`); await template.click(); visited.push({ category, ...visible });
        }
        await page.locator('[data-template-id]:not([data-template-id=blank])').first().dblclick(); check(await page.locator('#wizard-detail').isVisible(), `${theme}/${width} detail unreachable`); const detailFile = `wizard-detail-${theme}-${width}x${height}.png`; await page.screenshot({ path: path.join(evidence, detailFile) }); const detailTrap = await checkTabBoundary('#wizard-detail'); await page.keyboard.press('Escape');
        const wizardTrap = await checkTabBoundary('#wizard-dialog'); await page.locator('#wizard-cancel').click(); await waitWizardClosed(); check(await page.locator('#draft').inputValue() === '', `${theme}/${width} wizard navigation submitted draft`);
        wizardMatrix.push({ theme, width, height, metrics, visited, detailTrap, wizardTrap, screenshots: [file, detailFile], filterAndAllTabsAndDetailAndCancelOperated: true });
      }
    } finally { await page.setViewportSize({ width: 1280, height: 1100 }); }
    return { method: 'Main-card CSS zoom:2 is zoom-equivalent layout, not OS text-only scaling. Wizard matrix separately resizes the actual browser viewport to wide/narrow/short dimensions and operates filters, all four tabs, detail, Tab boundaries and cancel.', matrix, wizardMatrix };
  });
  await run('V3-11', 'Ordinary text and actual image-backed title contrast', async () => {
    const ordinary = [], imageText = [], wizardText = [];
    for (const theme of ['paper', 'ink']) {
      await configure(theme, 1000);
      const samples = await page.evaluate(() => { const parse = value => value.match(/[\d.]+/g).map(Number), over = (f, b) => f.slice(0, 3).map((v, i) => v * (f[3] ?? 1) + b[i] * (1 - (f[3] ?? 1))); const background = el => { const chain = []; for (let current = el; current; current = current.parentElement) chain.unshift(current); return chain.reduce((bg, current) => over(parse(getComputedStyle(current).backgroundColor), bg), [255, 255, 255]); }; return [...document.querySelectorAll('h1,.welcome-subtitle,.card-copy strong,.card-copy small,.composer-hint,.context-row button,.mode-button,.model-button,textarea')].map(el => ({ label: el.className || el.tagName, foreground: parse(getComputedStyle(el, el.tagName === 'TEXTAREA' ? '::placeholder' : null).color), background: background(el) })); });
      for (const sample of samples) { sample.ratio = contrast(sample.foreground, sample.background); check(sample.ratio >= 4.5, `${theme}/${sample.label} contrast ${sample.ratio.toFixed(3)}`); } ordinary.push({ theme, samples });
      await page.locator('[data-action=genre-xianxia]').click();
      const wizardSamples = await page.locator('#wizard-dialog').evaluate(dialog => { const parse = value => value.match(/[\d.]+/g).map(Number), over = (f, b) => f.slice(0, 3).map((value, i) => value * (f[3] ?? 1) + b[i] * (1 - (f[3] ?? 1))), background = el => { const chain = []; for (let current = el; current; current = current.parentElement) chain.unshift(current); return chain.reduce((bg, current) => over(parse(getComputedStyle(current).backgroundColor), bg), [255, 255, 255]); }; return [...dialog.querySelectorAll('h2,#wizard-description,.wizard-filter-row>span,[data-wizard-filter],[data-wizard-tag],[data-wizard-category],[data-template-id] strong,[data-template-id] small,#wizard-summary,#wizard-confirm,#wizard-cancel')].filter(el => el.getClientRects().length).map(el => ({ label: el.textContent, foreground: parse(getComputedStyle(el).color), background: background(el) })); });
      for (const sample of wizardSamples) { sample.ratio = contrast(sample.foreground, sample.background); check(sample.ratio >= 4.5, `${theme}/wizard/${sample.label.slice(0, 18)} contrast ${sample.ratio.toFixed(3)}`); } wizardText.push({ theme, samples: wizardSamples }); await closeDialog();
      for (const width of [1000, 560, 480, 320]) {
        await configure(theme, width);
        for (const action of Object.keys(genres)) for (const state of ['normal', 'hover']) {
          const locator = page.locator(`[data-action="${action}"]`); await locator.scrollIntoViewIfNeeded(); await neutral(); if (state === 'hover') await locator.hover(); await page.waitForTimeout(400);
          const labels = await locator.locator('.genre-copy strong,.genre-copy small').evaluateAll(items => items.map(el => { const r = el.getBoundingClientRect(), p = el.closest('button').getBoundingClientRect(); return { label: el.textContent, foreground: getComputedStyle(el).color.match(/[\d.]+/g).map(Number), x: r.x - p.x, y: r.y - p.y, width: r.width, height: r.height, inlineStyle: el.getAttribute('style') }; }));
          let png;
          try { await locator.locator('.genre-copy strong,.genre-copy small').evaluateAll(items => items.forEach(el => { el.style.setProperty('color', 'transparent', 'important'); el.style.setProperty('text-shadow', 'none', 'important'); })); png = await locator.screenshot(); }
          finally { await locator.locator('.genre-copy strong,.genre-copy small').evaluateAll((items, saved) => items.forEach((el, i) => { if (saved[i].inlineStyle === null) el.removeAttribute('style'); else el.setAttribute('style', saved[i].inlineStyle); }), labels); }
          const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          for (const label of labels) { let minimum = Infinity; for (let y = Math.max(0, Math.floor(label.y)); y < Math.min(decoded.info.height, Math.ceil(label.y + label.height)); y++) for (let x = Math.max(0, Math.floor(label.x)); x < Math.min(decoded.info.width, Math.ceil(label.x + label.width)); x++) { const i = (y * decoded.info.width + x) * 4; minimum = Math.min(minimum, contrast(label.foreground, [...decoded.data.subarray(i, i + 3)])); } check(Number.isFinite(minimum) && minimum >= 4.5, `${theme}/${width}/${action}/${state}/${label.label} image contrast ${minimum.toFixed(3)}`); imageText.push({ theme, width, action, state, label: label.label, minimumRatio: minimum }); }
        }
      }
    }
    return { ordinary, wizardText, imageText, method: 'Ordinary/wizard text uses computed foreground and composited solid ancestor backgrounds. Image-backed titles use actual locally rendered image + mask pixels under full text rectangles with text temporarily transparent, styles restored in finally. Both themes, 1000/560/480/320 widths, normal and hover. Not a full WCAG certification.' };
  });
  await run('V3-12', 'Design scope, input hashes and count-only credential scan', async () => {
    const files = await currentFiles(); let credentialMatchCount = 0, scannedFiles = 0; const patterns = [/\bsk-[A-Za-z0-9_-]{20,}\b/g, /\bark-[A-Za-z0-9-]{20,}\b/g, /\bAKIA[A-Z0-9]{16}\b/g, /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, /\bBearer\s+[A-Za-z0-9._-]{24,}/g];
    for (const file of files.filter(file => /\.(?:html|css|js|mjs|md|json|svg)$/i.test(file))) { const source = await fs.readFile(file, 'utf8'); scannedFiles++; for (const pattern of patterns) credentialMatchCount += [...source.matchAll(pattern)].length; } check(credentialMatchCount === 0, `Credential-format match count: ${credentialMatchCount}`);
    const dependencies = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel=stylesheet][href],img[src]')].map(el => ({ tag: el.tagName, protocol: new URL(el.src || el.href).protocol }))); check(dependencies.every(item => ['file:', 'data:'].includes(item.protocol)), 'Remote dependency');
    const changed = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repository, encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(line => line.slice(3).replace(/^"|"$/g, '').replaceAll('\\', '/'));
    const hashes = []; for (const file of files.filter(file => path.basename(file) !== 'preview-checks.json')) hashes.push({ path: path.relative(directory, file).replaceAll('\\', '/'), sha256: hash(await fs.readFile(file)) });
    check(browserErrors.length === 0 && failedRequests.length === 0 && requests.every(item => ['file:', 'data:'].includes(item.protocol)), 'Browser/resource/network failure during suite');
    return { credentialMatchCount, scannedFiles, scanScope: 'Only current design/chat-empty-state text files; archive-*, evidence* and layout-review-* excluded. No user profiles or external credentials read; matched strings never printed.', dependencies, hashes, changedPathsInDesignDirectory: changed.filter(file => file.startsWith('design/chat-empty-state/') && !file.includes('/archive-')).length, concurrentOrPreexistingPathsOutsideDesign: changed.filter(file => !file.startsWith('design/chat-empty-state/')).length, mutationScope: 'Verifier writes preview-checks.json and evidence-v3/** only. Other repository changes are not attributed to this task.' };
  });
} catch (error) {
  executionError = error.message;
  console.log(`EXECUTION FAIL ${error.message}`);
} finally {
  await browser.close(); const unexecuted = results.flatMap(result => result.details?.unexecuted || []), failed = results.filter(result => result.status === 'failed');
  const report = { designRevision: '3.4', generatedAt: new Date().toISOString(), scope: 'V3.4 local HTML design only: paper-theme warm muted card art, with the existing static icons, creation wizard and quick prompts regressed. Not React business implementation, Electron, installers, real models, persistence or user UI approval. Production pure functions serve as independent verification expectations. Prior results are not reused; v3.3 baseline is preserved in evidence-v3/baseline-v3.3-preview-checks.json.', runtime, selectedCases: selection || 'all V3-01–V3-12', summary: { passed: results.filter(result => result.status === 'passed').length, failed: failed.length, unexecuted: unexecuted.length, allExecutedAssertionsPassed: results.length > 0 && failed.length === 0 && !executionError, fullCoverage: !executionError && unexecuted.length === 0 && results.length === 12 }, results, unexecuted, executionError, browserErrors, failedRequests, networkRequestCount: requests.filter(item => /^https?:$/.test(item.protocol)).length };
  await fs.writeFile(path.join(directory, 'preview-checks.json'), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify(report.summary)); if (failed.length || executionError) process.exitCode = 1;
}
