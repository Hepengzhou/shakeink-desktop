// Actual Windows development Electron, real compiled UI, and real isolated DB.
// This is the approved dialog-style target only; no proposed CSS or mock API.
import assert from 'node:assert/strict'
import { _electron } from 'playwright'
import { expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { defaultState, stateSchema } from '../desktop/core/settings.ts'
import { VersionedStore } from '../desktop/core/versioned-store.ts'

assert.equal(process.platform, 'win32', 'Run on actual Windows')
assert.equal(process.argv.length, 2, 'No packaged, platform-switch, or CSS override mode')
const evidence = resolve('docs/evidence/dialog-style')
const temporary = await mkdtemp(join(tmpdir(), 'shakeink-dialog-style-'))
const root = join(temporary, 'data')
const startedAt = new Date().toISOString()
const records = [], checks = [], errors = [], consoleErrors = [], rendererHttpRequests = [], runtime = []
let app, page, currentTheme, currentScene = 'fixture'
await mkdir(evidence, { recursive: true })
const output = name => join(evidence, `windows-${name}`)
const redact = value => String(value).replaceAll(temporary, '<isolated-temp>').replaceAll(process.cwd(), '<repo>')
const expectedShadows = {
  paper: ['rgba(96, 74, 38, 0.14) 0px 12px 32px 0px', 'rgba(96, 74, 38, 0.08) 0px 2px 8px 0px'],
  ink: ['rgba(0, 0, 0, 0.28) 0px 12px 32px 0px', 'rgba(0, 0, 0, 0.18) 0px 2px 8px 0px'],
}
const sources = [
  'src/app/desktop.css', 'src/components/ui/dialog.tsx',
  'src/components/content/planning/planning.module.css',
  'src/components/layout/CreateNovelDialog.tsx', 'src/components/content/scenario/ScenarioPanel.tsx',
  'scripts/seed-dialog-style-fixture.ts', 'scripts/smoke-dialog-style.mjs',
  'dist/main/index.cjs', 'dist/service/index.cjs', 'dist/preload/index.cjs', 'out/index.html',
]
const sourceHashes = {}
for (const file of sources) sourceHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex')
async function hashCss(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await hashCss(path)
    else if (entry.name.endsWith('.css')) sourceHashes[path.slice(resolve('.').length + 1).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(path)).digest('hex')
  }
}
await hashCss(resolve('out/_next'))

async function stable() {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(animation => !animation.effect?.getTiming().iterations || animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})))
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}
async function styles(locator) {
  await expect(locator).toBeVisible()
  return locator.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      tag: element.tagName, classes: element.className, role: element.getAttribute('role'),
      background: style.backgroundColor, backdrop: style.backdropFilter,
      prefixedBackdropSupported: CSS.supports('-webkit-backdrop-filter', 'none'),
      prefixedBackdrop: style.getPropertyValue('-webkit-backdrop-filter'), filter: style.filter,
      shadow: style.boxShadow, borderWidth: style.borderTopWidth, borderColor: style.borderTopColor,
      ring: style.getPropertyValue('--tw-ring-shadow'), dpr: devicePixelRatio, rect: element.getBoundingClientRect().toJSON(),
    }
  })
}
function overlayStyle(info) {
  assert.equal(info.background, 'rgba(0, 0, 0, 0.1)', `${currentScene}: 10% black backdrop`)
  assert.equal(info.backdrop, 'none', `${currentScene}: no backdrop blur`)
  if (info.prefixedBackdropSupported) assert.equal(info.prefixedBackdrop, 'none')
  assert.equal(info.filter, 'none')
}
function surfaceStyle(info, ring = false, borderBaseline) {
  for (const part of expectedShadows[currentTheme]) assert.ok(info.shadow.includes(part), `${currentScene}: theme shadow ${part}; got ${info.shadow}`)
  assert.ok(!info.shadow.includes('100px'), 'Old settings heavy shadow absent')
  if (ring) assert.match(info.shadow, /0px 0px 0px 1px/, 'Original shared Tailwind ring remains')
  else if (borderBaseline) {
    assert.equal(info.borderWidth, borderBaseline.width, 'Original same-theme/context sc-config border width remains')
    assert.equal(info.borderColor, borderBaseline.color, 'Original same-theme/context sc-config border color remains')
  } else {
    const width = Number.parseFloat(info.borderWidth)
    // Chromium snaps thin 1 CSS px borders to integral device pixels at the
    // actual Windows display DPR (for example .666667 CSS px at DPR 1.5).
    assert.ok(width >= 1 / info.dpr - .00001 && width <= 1.00001, `Original 1px border retained after device-pixel snapping: ${info.borderWidth} at DPR ${info.dpr}`)
    assert.notEqual(info.borderColor, 'rgba(0, 0, 0, 0)')
  }
}
async function focusCycle(surface, count = 12) {
  await stable()
  const controls = surface.locator('button:visible:not(:disabled),input:visible:not(:disabled),select:visible:not(:disabled),textarea:visible:not(:disabled),a:visible[href],[tabindex="0"]:visible')
  await expect(controls.first()).toBeVisible()
  // Start at a real boundary control; Base UI may briefly focus an external
  // focus guard while its asynchronous Tab redirection settles.
  await controls.last().focus()
  const observations = []
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(i % 2 === 0 ? 'Tab' : 'Shift+Tab')
    await expect.poll(() => surface.evaluate(element => element.contains(document.activeElement)), { message: `${currentScene}: settled Tab focus remains in current modal` }).toBe(true)
    const info = await surface.evaluate(element => ({ within: element.contains(document.activeElement), active: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 80) || document.activeElement?.tagName }))
    assert.equal(info.within, true, `${currentScene}: focus stays in current modal`)
    observations.push(info.active)
  }
  return observations
}
async function capture(scene, entries, extra = {}) {
  currentScene = scene
  await stable()
  const observed = []
  for (const entry of entries) {
    const info = await styles(entry.locator)
    if (entry.kind === 'overlay') overlayStyle(info)
    if (entry.kind === 'surface') surfaceStyle(info, entry.ring, entry.borderBaseline)
    observed.push({ name: entry.name, kind: entry.kind, ...info })
  }
  const state = await page.evaluate(() => window.desktop.bootstrap())
  assert.equal(state.models.length, 0)
  assert.equal(state.platform, 'win32')
  assert.equal(state.dataRoot, root)
  const environment = await page.evaluate(() => ({
    theme: document.documentElement.className, viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio,
    backgrounds: [...document.querySelectorAll('.workspace-sidebar,.workspace-chat,.workspace-content')].map(element => ({ classes: element.className, filter: getComputedStyle(element).filter })),
    sharedBackdropCount: [...document.querySelectorAll('[data-slot="dialog-overlay"]')].filter(element => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== 'hidden').length,
    compiledStyleSheets: [...document.styleSheets].map(sheet => sheet.href).filter(Boolean),
  }))
  assert.ok(environment.theme.split(' ').includes(currentTheme))
  assert.ok(environment.backgrounds.every(element => element.filter === 'none'))
  if (extra.sharedBackdropCount !== undefined) assert.equal(environment.sharedBackdropCount, extra.sharedBackdropCount)
  const listeningServers = await app.evaluate(() => process._getActiveHandles().filter(handle => handle.constructor.name === 'Server' && handle.listening).length)
  assert.equal(listeningServers, 0, 'No main Node Server listening at scene snapshot')
  assert.equal(errors.length, 0, 'No renderer pageerrors in observed interval')
  assert.equal(consoleErrors.length, 0, 'No renderer console errors in observed interval')
  assert.equal(rendererHttpRequests.length, 0, 'No renderer HTTP(S) requests in observed interval')
  const filename = `windows-${currentTheme}-${scene}.png`
  await page.screenshot({ path: join(evidence, filename) })
  const png = await sharp(join(evidence, filename)).metadata()
  assert.equal(png.width, Math.round(environment.viewport.width * environment.dpr))
  assert.equal(png.height, Math.round(environment.viewport.height * environment.dpr))
  records.push({ theme: currentTheme, scene, filename, status: 'passed', styles: observed, ...environment, ...extra, screenshotPixels: { width: png.width, height: png.height },
    rendererPageErrors: errors.length, rendererConsoleErrors: consoleErrors.length, rendererHttpRequests: rendererHttpRequests.length, mainNodeListeningServerSnapshot: listeningServers,
    networkScope: 'This firstWindow renderer since listeners were attached; main Node Server count only at this scene. Not main/worker lifetime or all OS sockets.' })
}
function sharedEntries(surface) {
  return [
    { name: 'shared backdrop', kind: 'overlay', locator: page.locator('[data-slot="dialog-overlay"]').first() },
    { name: 'shared dialog surface', kind: 'surface', locator: surface, ring: true },
  ]
}
async function launch(theme) {
  currentTheme = theme; currentScene = 'startup'
  const store = new VersionedStore(join(root, 'state.json'), defaultState, stateSchema.parse)
  const snapshot = await store.read()
  snapshot.value.settings.appearance.theme = theme
  await store.update(snapshot.revision, snapshot.value)
  const env = { ...process.env, SHAKEINK_TEST_ROOT: root }
  delete env.ELECTRON_RUN_AS_NODE
  app = await _electron.launch({ args: [resolve('.')], env, timeout: 60000 })
  page = await app.firstWindow({ timeout: 60000 }); page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push({ theme, scene: currentScene, message: redact(error.message) }))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ theme, scene: currentScene, message: redact(message.text()) }) })
  page.on('request', request => { if (/^https?:/i.test(request.url())) rendererHttpRequests.push({ theme, scene: currentScene, protocol: new URL(request.url()).protocol }) })
  await page.context().setOffline(true)
  runtime.push(await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    window.setBounds({ width: 1440, height: 900 })
    return { platform: process.platform, electron: process.versions.electron, chromium: process.versions.chrome, zoom: window.webContents.getZoomFactor(), bounds: window.getBounds() }
  }))
  await page.waitForFunction(theme => document.documentElement.classList.contains(theme), theme)
  const gate = page.getByRole('dialog', { name: '尚未配置文本模型', exact: true })
  await expect(gate).toBeVisible({ timeout: 30000 })
  assert.equal(page.url(), 'shakeink://app/')
  await expect(gate.locator('[data-slot="dialog-close"]')).toHaveCount(0)
  await page.keyboard.press('Escape'); await expect(gate).toBeVisible()
  await page.mouse.click(8, 450); await expect(gate).toBeVisible()
  const focus = await focusCycle(gate, 8)
  await capture('onboarding-guard', sharedEntries(gate), { sharedBackdropCount: 1, escape: 'blocked', outsideClick: 'blocked', tabFocus: focus, closeButton: 'absent' })
  await gate.getByRole('button', { name: '暂不配置', exact: true }).click()
  await expect(gate).not.toBeVisible()
  await page.getByText('对话框专项夹具', { exact: true }).waitFor()
  if (await page.getByRole('button', { name: '显示内容面板', exact: true }).isVisible()) await page.getByRole('button', { name: '显示内容面板', exact: true }).click()
  await page.locator('.workspace-content').waitFor()
}
async function close() {
  const closed = app.waitForEvent('close', { timeout: 30000 })
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await closed; app = undefined; page = undefined
}
async function runTheme(theme) {
  await launch(theme)
  await page.getByRole('button', { name: '账号菜单', exact: true }).click()
  await page.getByRole('menuitem', { name: '设置', exact: true }).click()
  const settings = page.locator('.desktop-settings')
  await expect(settings).toBeVisible()
  await page.getByRole('button', { name: '外观', exact: true }).click()
  const settingsRect = await settings.boundingBox()
  assert.equal(Math.round(settingsRect.width), 880)
  assert.ok(await settings.locator('.desktop-settings-nav').isVisible())
  assert.ok(await settings.locator('.desktop-settings-right').isVisible())
  await capture('settings-wide', sharedEntries(settings), { sharedBackdropCount: 1, width: 880, columns: ['navigation', 'right'] })
  await page.getByRole('button', { name: '用户', exact: true }).click()
  const edit = page.getByRole('button', { name: '编辑用户', exact: true })
  await edit.click()
  const profile = page.getByRole('dialog', { name: '编辑用户', exact: true })
  await expect(profile).toBeVisible()
  const profileFocus = await focusCycle(profile)
  await capture('profile-nested', [...sharedEntries(profile), { name: 'parent settings', kind: 'surface', locator: settings, ring: true }], { sharedBackdropCount: 1, tabFocus: profileFocus })
  await page.keyboard.press('Escape')
  await expect(profile).not.toBeVisible(); await expect(settings).toBeVisible(); await expect(edit).toBeFocused()
  checks.push(`${theme}: profile Escape closes only child and returns focus to Edit User`)
  await page.getByRole('button', { name: '快捷键', exact: true }).click()
  const restore = settings.getByRole('button', { name: '恢复默认', exact: true })
  await restore.click()
  const confirm = page.getByRole('dialog', { name: '恢复默认快捷键', exact: true })
  await expect(confirm).toBeVisible()
  await capture('shortcut-confirm', [...sharedEntries(confirm), { name: 'parent settings', kind: 'surface', locator: settings, ring: true }], { sharedBackdropCount: 1, tabFocus: await focusCycle(confirm) })
  await page.keyboard.press('Escape'); await expect(confirm).not.toBeVisible(); await expect(restore).toBeFocused(); await expect(settings).toBeVisible()
  await page.mouse.click(8, 450); await expect(settings).not.toBeVisible()
  checks.push(`${theme}: nested shortcut confirmation Escape preserves parent and restores trigger; ordinary settings outside click closes`)

  const create = page.getByRole('button', { name: '创建作品', exact: true })
  await create.click()
  const wizard = page.getByRole('dialog', { name: '创作向导', exact: true })
  await expect(wizard).toBeVisible()
  await capture('wizard', sharedEntries(wizard), { sharedBackdropCount: 1, tabFocus: await focusCycle(wizard) })
  const blank = page.getByRole('button', { name: /^空白模板/ }).first()
  await blank.dblclick()
  const detailClose = page.getByRole('button', { name: '关闭详情', exact: true })
  await expect(detailClose).toBeVisible()
  const detailSurface = detailClose.locator('..').locator('..'), detailOverlay = detailSurface.locator('..')
  const wizardBounds = await wizard.boundingBox(), layerBounds = await detailOverlay.boundingBox()
  assert.ok(Math.abs(wizardBounds.x - layerBounds.x) <= 1 && Math.abs(wizardBounds.y - layerBounds.y) <= 1)
  assert.ok(Math.abs(wizardBounds.width - layerBounds.width) <= 2 && Math.abs(wizardBounds.height - layerBounds.height) <= 2)
  await capture('wizard-detail', [...sharedEntries(wizard), { name: 'local detail backdrop', kind: 'overlay', locator: detailOverlay }, { name: 'local detail surface', kind: 'surface', locator: detailSurface }], { sharedBackdropCount: 1, localOverlayWithinWizard: true, maximumCombinedBlackOpacity: 1 - (1 - .1) ** 2 })
  await page.keyboard.press('Escape'); await expect(detailClose).not.toBeVisible(); await expect(wizard).toBeVisible()
  await blank.dblclick(); await expect(detailClose).toBeVisible()
  const localBounds = await detailOverlay.boundingBox()
  await page.mouse.click(localBounds.x + 5, localBounds.y + 5)
  await expect(detailClose).not.toBeVisible(); await expect(wizard).toBeVisible()
  await page.keyboard.press('Escape'); await expect(wizard).not.toBeVisible()
  checks.push(`${theme}: real creation wizard local detail Escape and outside click close only detail; second Escape closes wizard`)

  await page.locator('.workspace-sidebar').getByText('世界线', { exact: true }).click()
  await page.getByRole('combobox', { name: '当前世界线', exact: true }).waitFor()
  const worldSettings = page.getByRole('button', { name: '世界线设置', exact: true })
  await worldSettings.click()
  const formOverlay = page.getByRole('dialog', { name: '世界线设置', exact: true }), form = formOverlay.locator(':scope > form')
  await expect(form).toBeVisible()
  const formRect = await form.boundingBox(), viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  assert.ok(Math.abs(formRect.x + formRect.width / 2 - viewport.width / 2) <= 1)
  assert.ok(Math.abs(formRect.y + formRect.height / 2 - viewport.height / 2) <= 1)
  await capture('planning-form', [{ name: 'planning generic form backdrop', kind: 'overlay', locator: formOverlay }, { name: 'planning generic form', kind: 'surface', locator: form }], { sharedBackdropCount: 0, centered: true, tabFocus: await focusCycle(form) })
  await page.mouse.click(8, 450); await expect(formOverlay).toBeVisible()
  await page.keyboard.press('Escape'); await expect(formOverlay).not.toBeVisible(); await expect(worldSettings).toBeFocused()
  checks.push(`${theme}: planning generic form is centered, traps Tab, blocks outside click, and Escape returns focus`)
  const periods = page.getByRole('button', { name: '时期 1', exact: true })
  await periods.click()
  const periodList = page.getByRole('region', { name: '时期列表', exact: true })
  const viewPeriod = periodList.getByRole('button', { name: '查看时期', exact: true })
  await viewPeriod.click()
  const periodOverlay = page.getByRole('dialog', { name: '时期详情', exact: true }), periodSurface = periodOverlay.locator(':scope > section')
  await expect(periodSurface).toBeVisible()
  const periodRect = await periodSurface.boundingBox()
  assert.equal(Math.round(periodRect.width), 420); assert.ok(Math.abs(periodRect.x + periodRect.width - viewport.width) <= 1); assert.equal(Math.round(periodRect.height), viewport.height)
  await capture('planning-period-detail', [{ name: 'period-detail backdrop', kind: 'overlay', locator: periodOverlay }, { name: 'period-detail side surface', kind: 'surface', locator: periodSurface }], { sharedBackdropCount: 0, rightEdge: true, width: 420, tabFocus: await focusCycle(periodSurface, 8) })
  await page.keyboard.press('Escape'); await expect(periodOverlay).not.toBeVisible(); await expect(viewPeriod).toBeFocused()
  await viewPeriod.click(); await page.mouse.click(8, 450); await expect(periodOverlay).not.toBeVisible()
  await periodList.getByRole('button', { name: '收起', exact: true }).click()
  checks.push(`${theme}: real period side detail remains 420px at right, traps Tab, supports Escape/outside close, and restores trigger focus`)
  await page.getByRole('button', { name: '待定位 1', exact: true }).click()
  const pending = page.getByRole('region', { name: '待定位事件', exact: true })
  const eventTrigger = pending.getByRole('button', { name: '详情', exact: true })
  await eventTrigger.click()
  const eventOverlay = page.getByRole('dialog', { name: '事件详情', exact: true }), eventSurface = eventOverlay.locator(':scope > section')
  await expect(eventSurface).toBeVisible()
  await capture('planning-event-detail', [{ name: 'event-detail backdrop', kind: 'overlay', locator: eventOverlay }, { name: 'event-detail side surface', kind: 'surface', locator: eventSurface }], { sharedBackdropCount: 0, tabFocus: await focusCycle(eventSurface, 8) })
  await page.keyboard.press('Escape'); await expect(eventOverlay).not.toBeVisible(); await expect(eventTrigger).toBeFocused()
  checks.push(`${theme}: real unknown-time event detail opened through pending-events list; Escape restores trigger`)

  await page.locator('.workspace-sidebar').getByText('专项草稿试验场', { exact: true }).click()
  await page.locator('.scpane').getByRole('heading', { name: '专项草稿试验场', exact: true }).waitFor()
  const inline = page.locator('.sc-view.on .sc-config')
  await expect(inline).toBeVisible()
  assert.equal(await page.locator('.desktop-scenario-dialog').count(), 0)
  assert.equal(await page.locator('.desktop-dialog-overlay').count(), 0)
  const inlineInfo = await styles(inline)
  const inlineBorder = { width: inlineInfo.borderWidth, color: inlineInfo.borderColor, source: 'Real draft ConfigForm in same theme/workspace-content/scpane context' }
  const shadow2 = await inline.evaluate(element => getComputedStyle(element).getPropertyValue('--shadow-2'))
  assert.ok(shadow2.trim(), 'Existing inline shadow-2 token remains')
  assert.equal(inlineInfo.shadow, `${theme === 'paper' ? 'rgba(96, 74, 38, 0.14)' : 'rgba(0, 0, 0, 0.6)'} 0px 8px 24px -8px`, 'Original inline shadow-2 stays exact')
  assert.ok(!inlineInfo.shadow.includes('12px 32px'), 'Inline form does not receive modal shadow')
  await capture('scenario-draft-inline', [{ name: 'draft inline ConfigForm', kind: 'inline', locator: inline }], { sharedBackdropCount: 0, dialogOverlayCount: 0, existingShadow2Token: shadow2, inlineDialogClassAbsent: !inlineInfo.classes.includes('desktop-dialog'), originalBorderBaseline: inlineBorder })
  checks.push(`${theme}: real draft ConfigForm remains inline with original shadow-2 and no dialog backdrop`)

  await page.locator('.workspace-sidebar').getByText('专项活动试验场', { exact: true }).click()
  await page.locator('.scpane').getByRole('heading', { name: '专项活动试验场', exact: true }).waitFor()
  await page.locator('.sc-head').getByRole('button', { name: '配置', exact: true }).click()
  const activeSurface = page.locator('.desktop-scenario-dialog > .sc-config'), activeOverlay = page.locator('.desktop-scenario-dialog').locator('..')
  await expect(activeSurface).toBeVisible()
  await page.keyboard.press('Escape'); await expect(activeSurface).toBeVisible()
  await capture('scenario-active-config', [{ name: 'active configuration backdrop', kind: 'overlay', locator: activeOverlay }, { name: 'active configuration surface', kind: 'surface', locator: activeSurface, borderBaseline: inlineBorder }], { sharedBackdropCount: 0, escape: 'remains open, matching existing absence of Escape handler', focusContract: 'Existing local popup has no focus trap; no new trap requirement.', originalBorderBaseline: inlineBorder })
  await activeSurface.getByRole('button', { name: '关闭配置', exact: true }).click(); await expect(activeSurface).not.toBeVisible()
  await page.locator('.sc-head').getByRole('button', { name: '配置', exact: true }).click(); await expect(activeSurface).toBeVisible()
  const activeBounds = await activeOverlay.boundingBox()
  await page.mouse.click(activeBounds.x + 2, activeBounds.y + 2); await expect(activeSurface).not.toBeVisible()
  checks.push(`${theme}: real active configuration uses local dialog style, and existing close button/outside click work`)

  await page.getByRole('button', { name: '账号菜单', exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const menuInfo = await styles(menu)
  assert.ok(!menuInfo.classes.includes('desktop-dialog'))
  assert.ok(menuInfo.classes.split(' ').includes('shadow-md'))
  assert.match(menuInfo.shadow, /0px 0px 0px 1px/, 'Original menu ring remains')
  assert.ok(!menuInfo.shadow.includes('12px 32px'))
  assert.equal(await page.locator('.desktop-dialog-overlay').count(), 0)
  await capture('account-menu', [{ name: 'positioned account menu', kind: 'menu', locator: menu }], { sharedBackdropCount: 0, dialogOverlayCount: 0, originalShadowMdAndRing: menuInfo.shadow })
  await page.keyboard.press('Escape'); await expect(menu).not.toBeVisible(); await expect(page.getByRole('button', { name: '账号菜单', exact: true })).toBeFocused()
  checks.push(`${theme}: positioned account menu has original shadow-md/ring, no modal class/backdrop, and Escape returns focus`)
  await close()
}

try {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/seed-dialog-style-fixture.ts', temporary], { cwd: process.cwd(), encoding: 'utf8', timeout: 60000 })
  for (const theme of ['paper', 'ink']) await runTheme(theme)
  // Include the last Escape/final window close in the observed interval too.
  assert.deepEqual(errors, [], 'No renderer pageerrors through final close')
  assert.deepEqual(consoleErrors, [], 'No renderer console errors through final close')
  assert.deepEqual(rendererHttpRequests, [], 'No renderer HTTP(S) requests through final close')
  const planningBranches = [
    { branch: 'generic form', cssShape: '.dialog > form; centered', actualExecution: 'passed in both themes', scenes: ['planning-form'] },
    { branch: 'period-detail', cssShape: '.dialog.eventDrawer > .detail; 420px right edge', actualExecution: 'passed in both themes', scenes: ['planning-period-detail'] },
    { branch: 'event-detail', cssShape: '.dialog.eventDrawer > .detail; side detail', actualExecution: 'passed in both themes', scenes: ['planning-event-detail'] },
    { branch: 'frozen-period detail', cssShape: '.dialog > .detail; centered', actualExecution: 'not executed', reason: 'Requires kind=period with frozen fork period ID; normal UI opens period-detail and disables Modify Period. No reachable normal trigger found. Source/CSS browser coverage is separate; no React state injection.' },
  ]
  await writeFile(output('electron.json'), JSON.stringify({ status: 'passed', startedAt, completedAt: new Date().toISOString(),
    scope: 'Actual Windows development Electron and compiled real React components, isolated real local DB, Playwright mouse/CDP keyboard. Approved dialog styles and listed interactions only.',
    isolation: { models: 0, credentials: 0, syntheticPreseed: 'Workspaces and Prisma real local DB; not mock HTTP/API', cleanup: 'Exact mkdtemp test directory removed after Electron close' },
    runtime, checks, records, planningBranches, rendererPageErrors: errors, rendererConsoleErrors: consoleErrors, rendererHttpRequests,
    networkScope: 'Renderer observation from firstWindow listener attachment through each launch end; offline renderer context. Per-scene main Node Server listening snapshots only. No claim about main/worker startup or full lifetime, all OS TCP listeners, or provider network acceptance.',
    unexecuted: ['Frozen period centered detail normal UI unreachable', 'Native OS/system dialogs', 'Physical keyboard/IME', 'macOS', 'Installed package', 'Full business regression'], sourceHashes,
  }, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'passed', scenes: records.length, checks: checks.length, evidence: 'docs/evidence/dialog-style/windows-electron.json' }))
} catch (error) {
  await page?.screenshot({ path: output('failure.png') }).catch(() => {})
  const activeFocus = await page?.evaluate(() => document.activeElement?.outerHTML.slice(0, 1500)).catch(() => null)
  await writeFile(output('electron-failure.json'), JSON.stringify({ status: 'failed', startedAt, theme: currentTheme, scene: currentScene, error: redact(error.stack || error), activeFocus, checks, records, rendererPageErrors: errors, rendererConsoleErrors: consoleErrors, rendererHttpRequests, sourceHashes }, null, 2) + '\n')
  throw error
} finally {
  await app?.close().catch(() => {})
  // Verify the exact absolute mkdtemp target before recursive removal on Windows.
  assert.equal(dirname(resolve(temporary)), resolve(tmpdir()))
  assert.ok(basename(temporary).startsWith('shakeink-dialog-style-'))
  await rm(temporary, { recursive: true, force: true })
}
