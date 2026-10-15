import assert from 'node:assert/strict'
import { _electron } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

assert.equal(process.platform, 'win32', 'Actual Windows required')
const label = process.argv[2] ?? 'windows-01'
assert(/^[a-z0-9-]+$/.test(label))
const evidence = resolve('docs/evidence/sidebar-surface-fix', label)
await mkdir(resolve('docs/evidence/sidebar-surface-fix'), { recursive: true })
await mkdir(evidence) // Each attempt is immutable, including failures.
const fixtureDirectory = await mkdtemp(join(tmpdir(), 'shakeink-sidebar-')), root = join(fixtureDirectory, 'data')
const hash = value => createHash('sha256').update(value).digest('hex')
const safe = value => String(value).replaceAll(fixtureDirectory, '<isolated-fixture>').replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '<key-shaped-text>')
const sources = ['scripts/verify-sidebar-surfaces.mjs', 'scripts/seed-sidebar-navigation.ts', 'scripts/sidebar-native-hit-test.ps1', 'src/app/globals.css', 'src/app/desktop.css', 'src/components/layout/SidebarHoverCard.tsx', 'src/components/layout/SidebarTree.tsx', 'src/components/layout/DashboardShell.tsx', 'src/components/layout/useSidebarDrawer.ts', 'src/components/layout/sidebar-navigation-state.tsx', 'tests/browser/sidebar-surfaces.test.ts', 'tests/helpers/sidebar-drawer-fixture.ts', 'package-lock.json']
sources.push('src/components/layout/ChatPanel.tsx', 'src/components/layout/ContentTabs.tsx', 'src/components/content/ThemePanel.tsx')
const sourceHashes = async () => Object.fromEntries(await Promise.all(sources.map(async path => [path, hash(await readFile(path))])))
async function bundles(path, result = {}) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name)
    if (entry.isDirectory()) await bundles(file, result)
    else if (/\.(cjs|js|css|html)$/.test(entry.name)) result[relative(resolve('.'), file).replaceAll('\\', '/')] = hash(await readFile(file))
  }
  return result
}
const bundleHashes = async () => ({ ...await bundles(resolve('dist')), ...await bundles(resolve('out')) })
const report = { status: 'running', startedAt: new Date().toISOString(), scope: 'Actual Windows development Electron, production React/IPC and real isolated Workspaces/PGlite, public synthetic records, zero models. Playwright synthesizes pointer/keyboard; separate HWND WM_NCHITTEST is real native measurement.', packaged: false, checks: [], nativeHitTests: [], screenshots: [], errors: [], httpRequests: [], unavailable: ['NSIS installation', 'macOS', 'physical mouse input'] }
let app, page, native
async function save() { await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n') }
function passed(id, details = {}) { report.checks.push({ id, status: 'passed', ...details }) }
async function screenshot(name) {
  const path = join(evidence, name + '.png'); await page.screenshot({ path })
  report.screenshots.push({ path: relative(resolve('.'), path).replaceAll('\\', '/'), sha256: hash(await readFile(path)) })
}
async function seed() {
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/seed-sidebar-navigation.ts', fixtureDirectory], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''; const timer = setTimeout(() => { child.kill(); reject(Error('Isolated seed timeout')) }, 180000)
    child.stdout.on('data', bytes => { output += bytes }); child.stderr.on('data', bytes => { output += bytes })
    child.on('error', reject); child.on('close', code => { clearTimeout(timer); code === 0 ? done() : reject(Error(safe(output.slice(-1500)))) })
  })
}
async function startNative() {
  const helper = resolve('scripts/sidebar-native-hit-test.ps1').replaceAll("'", "''")
  const command = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); while($null -ne ($surfaceLine=[Console]::ReadLine())) { try { $surfaceRequest=$surfaceLine | ConvertFrom-Json; $surfaceProbe=& '${helper}' -WindowHandle ([long]$surfaceRequest.windowHandle) -PointsJson ([string]$surfaceRequest.pointsJson); [Console]::WriteLine([string]$surfaceProbe) } catch { [Console]::WriteLine((@{error=$_.Exception.Message} | ConvertTo-Json -Compress)) } }`
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  let output = '', pending = null
  child.stdout.on('data', bytes => {
    output += bytes
    for (;;) {
      const end = output.indexOf('\n'); if (end < 0) break
      const line = output.slice(0, end).trim(); output = output.slice(end + 1); if (!line || !pending) continue
      const request = pending; pending = null; clearTimeout(request.timer)
      try { const value = JSON.parse(line); value.error ? request.reject(Error(value.error)) : request.done(value) } catch (error) { request.reject(error) }
    }
  })
  child.stderr.on('data', () => {})
  child.on('error', error => pending?.reject(error))
  child.on('exit', code => { if (pending) { clearTimeout(pending.timer); pending.reject(Error('Native helper exited ' + code)) } })
  return {
    async probe(points) {
      assert.equal(pending, null)
      const windowHandle = await app.evaluate(({ BrowserWindow }) => { const bytes = BrowserWindow.getAllWindows()[0].getNativeWindowHandle(); return bytes.length === 8 ? bytes.readBigUInt64LE().toString() : bytes.readUInt32LE().toString() })
      return new Promise((done, reject) => { pending = { done, reject, timer: setTimeout(() => { pending = null; reject(Error('Native probe timeout')) }, 15000) }; child.stdin.write(JSON.stringify({ windowHandle, pointsJson: JSON.stringify(points) }) + '\n') })
    },
    close() { child.stdin.end(); child.kill() },
  }
}
const tooltip = () => page.locator('[data-sidebar-hover-card]')
const category = name => page.locator('.sidebar-navigation').getByRole('tab', { name, exact: true }).click()
async function hitCard() { return tooltip().evaluate(el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.right - 8].every(x => { const hit = document.elementFromPoint(x, r.top + r.height / 2); return !!hit && el.contains(hit) }) }) }
async function settleWorkspace() {
  await page.waitForFunction(() => ['open', 'closed'].includes(document.querySelector('.dashboard-shell')?.dataset.sidebarPhase))
  await page.evaluate(() => new Promise((done, reject) => {
    let previous, stable = 0; const deadline = performance.now() + 5000
    const tick = () => {
      const current = [...document.querySelectorAll('.workspace-group > [data-panel]')].map(el => el.getBoundingClientRect().width)
      stable = previous && current.length === previous.length && current.every((width, index) => Math.abs(width - previous[index]) < .02) ? stable + 1 : 0
      previous = current
      if (stable >= 5) return done()
      if (performance.now() > deadline) return reject(Error('Actual workspace panel geometry did not settle'))
      requestAnimationFrame(tick)
    }; requestAnimationFrame(tick)
  }))
}
async function layoutSnapshot(stage) {
  report.layoutObservations ??= []
  report.layoutObservations.push({ stage, ...await page.evaluate(() => {
    const describe = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return { tag: el.tagName, id: el.id, class: el.className, hidden: el.hidden, ariaHidden: el.getAttribute('aria-hidden'), inert: !!el.closest('[inert]'), display: s.display, visibility: s.visibility, opacity: s.opacity, rect: r.toJSON() } }
    const theme = document.querySelector('[data-testid="theme-panel"]'), ancestors = []
    for (let el = theme; el && ancestors.length < 8; el = el.parentElement) ancestors.push(describe(el))
    return { time: performance.now(), phase: document.querySelector('.dashboard-shell')?.dataset.sidebarPhase, mode: document.querySelector('.dashboard-shell')?.dataset.drawerMode, narrowPane: document.querySelector('.dashboard-shell')?.dataset.narrowPane, panels: [...document.querySelectorAll('.workspace-group > [data-panel]')].map(describe), tabs: [...document.querySelectorAll('.content-tabs-track [data-tab-id]')].map(el => ({ id: el.dataset.tabId, selected: el.getAttribute('aria-selected'), title: el.getAttribute('aria-label') })), themeAncestors: ancestors }
  }) })
}
async function endingVersions(assertStable) {
  report.sourceHashesAfter = await sourceHashes(); report.bundleHashesAfter = await bundleHashes()
  report.executableHashAfter = hash(await readFile('node_modules/electron/dist/electron.exe'))
  const changedSources = sources.filter(path => report.sourceHashes[path] !== report.sourceHashesAfter[path]), names = [...new Set([...Object.keys(report.bundleHashes), ...Object.keys(report.bundleHashesAfter)])], changedBundles = names.filter(path => report.bundleHashes[path] !== report.bundleHashesAfter[path])
  report.artifactStability = { sourcesUnchanged: changedSources.length === 0, bundlesUnchanged: changedBundles.length === 0, executableUnchanged: report.executableHash === report.executableHashAfter, changedSources, changedBundles }
  if (assertStable) { assert.deepEqual(changedSources, []); assert.deepEqual(changedBundles, []); assert.equal(report.artifactStability.executableUnchanged, true) }
}

try {
  report.sourceHashes = await sourceHashes(); report.bundleHashes = await bundleHashes()
  report.executableHash = hash(await readFile('node_modules/electron/dist/electron.exe'))
  await seed(); const fixture = JSON.parse(await readFile(join(fixtureDirectory, 'fixture.json'), 'utf8')); assert.equal(fixture.synthetic, true)
  report.fixture = { synthetic: true, workDatabases: fixture.works.length, models: 0 }
  const env = { ...process.env, SHAKEINK_TEST_ROOT: root }; delete env.ELECTRON_RUN_AS_NODE
  app = await _electron.launch({ args: [resolve('.')], env, timeout: 90000 })
  report.ownedProcessId = app.process().pid
  page = await app.firstWindow({ timeout: 90000 }); page.setDefaultTimeout(15000)
  page.on('pageerror', error => report.errors.push(safe(error.message)))
  page.on('request', request => { if (/^https?:/i.test(request.url())) report.httpRequests.push(request.url().split('?')[0]) })
  await page.context().setOffline(true)
  await page.getByRole('button', { name: '暂不配置', exact: true }).click({ timeout: 60000 })
  await page.locator('.dashboard-shell').waitFor()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ width: 1800, height: 1000 }))
  await page.evaluate(() => document.fonts.ready)
  const boot = await page.evaluate(() => window.desktop.bootstrap()); assert.equal(boot.dataRoot, root); assert.equal(boot.models.length, 0)
  assert.equal(page.url(), 'shakeink://app/'); assert.equal(await page.evaluate(() => navigator.onLine), false)
  report.runtime = await app.evaluate(({ BrowserWindow }) => ({ platform: process.platform, electron: process.versions.electron, chromium: process.versions.chrome, bounds: BrowserWindow.getAllWindows()[0].getBounds(), zoom: BrowserWindow.getAllWindows()[0].webContents.getZoomFactor(), listeningServers: process._getActiveHandles().filter(h => h.constructor.name === 'Server' && h.listening).length }))
  assert.equal(report.runtime.listeningServers, 0); passed('real-offline-IPC-workspace')
  native = await startNative()
  await page.waitForFunction(ids => { const tabs = [...document.querySelectorAll('.content-tabs-track [data-tab-id]')]; return tabs.length === ids.length && ids.every(id => tabs.some(tab => tab.dataset.tabId === id)) && tabs.find(tab => tab.dataset.tabId === ids[0])?.getAttribute('aria-selected') === 'true' }, fixture.tabs.map(tab => tab.id))
  await settleWorkspace(); await layoutSnapshot('initial-real-journal-restored')
  for (const theme of ['ink', 'paper']) {
    console.log('Sidebar surfaces: ' + theme)
    await page.evaluate(async theme => { const current = await window.desktop.bootstrap(); await window.desktop.settings({ type: 'update', revision: current.revision, settings: { ...current.settings, appearance: { ...current.settings.appearance, theme, zoom: 1 } } }) }, theme)
    await page.waitForFunction(theme => document.documentElement.classList.contains(theme), theme)
    await settleWorkspace(); await layoutSnapshot(theme + '-before-original-theme-tab-click')
    await page.locator('.content-tabs-track [data-tab-id="' + fixture.tabs[1].id + '"]').click()
    await settleWorkspace(); await layoutSnapshot(theme + '-after-original-theme-tab-click')
    if (!await page.getByTestId('theme-panel').isVisible()) {
      await category('设定')
      const work = page.locator('.sidebar-navigation .nav-work-group[data-work-id="' + fixture.works[0].novelId + '"]'); await work.waitFor()
      const toggle = work.locator('.nav-group-toggle'); if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
      await work.getByRole('button', { name: '主题', exact: true }).click()
      await settleWorkspace(); await layoutSnapshot(theme + '-after-original-navigation-theme-entry')
    }
    await page.waitForFunction(id => document.querySelector('.content-tabs-track [data-tab-id="' + id + '"]')?.getAttribute('aria-selected') === 'true', fixture.tabs[1].id)
    await page.getByTestId('theme-panel').waitFor({ state: 'visible' }); await settleWorkspace(); await layoutSnapshot(theme + '-real-visible-theme-panel')
    await category('正文'); await page.getByRole('button', { name: '第 1 章 出发', exact: true }).waitFor()
    const scroll = await page.locator('.tree-scroll').evaluate(el => {
      const style = getComputedStyle(el), bar = getComputedStyle(el, '::-webkit-scrollbar'), thumb = getComputedStyle(el, '::-webkit-scrollbar-thumb'), track = getComputedStyle(el, '::-webkit-scrollbar-track')
      const max = el.scrollHeight - el.clientHeight; el.scrollTop = 80
      return { standardWidth: style.scrollbarWidth, width: bar.width, color: thumb.backgroundColor, border: thumb.borderLeftWidth, radius: thumb.borderRadius, clip: thumb.backgroundClip, track: track.backgroundColor, max, scrollTop: el.scrollTop, dpr: devicePixelRatio }
    })
    // Chromium resolves a CSS border to whole physical pixels before exposing
    // its used value (3 CSS px becomes 4 physical px / 1.5 = 2.66667 CSS px).
    const usedBorder = Number((Math.floor(3 * scroll.dpr) / scroll.dpr).toPrecision(6)) + 'px'
    assert.equal(scroll.standardWidth, 'auto'); assert.equal(scroll.width, '10px'); assert.equal(scroll.border, usedBorder); assert.equal(scroll.radius, '6px'); assert.equal(scroll.clip, 'content-box'); assert.equal(scroll.track, 'rgba(0, 0, 0, 0)'); assert(scroll.max > 80 && scroll.scrollTop > 0)
    const contentScroll = await page.getByTestId('theme-panel').evaluate(el => {
      const style = getComputedStyle(el), bar = getComputedStyle(el, '::-webkit-scrollbar'), thumb = getComputedStyle(el, '::-webkit-scrollbar-thumb'), track = getComputedStyle(el, '::-webkit-scrollbar-track')
      return { standardWidth: style.scrollbarWidth, width: bar.width, color: thumb.backgroundColor, border: thumb.borderLeftWidth, radius: thumb.borderRadius, clip: thumb.backgroundClip, track: track.backgroundColor, max: el.scrollHeight - el.clientHeight }
    })
    assert(contentScroll.max > 0, 'Comparison must use a real overflowing content scroll container')
    assert.deepEqual(Object.fromEntries(Object.entries(scroll).filter(([key]) => !['max', 'scrollTop', 'dpr'].includes(key))), Object.fromEntries(Object.entries(contentScroll).filter(([key]) => key !== 'max')))
    passed(theme + '-global-scrollbar-and-actual-scroll', { navigation: scroll, realThemePanel: contentScroll }); await screenshot(theme + '-scrollbar')
    await category('角色'); const row = page.locator('.sidebar-navigation').getByRole('button', { name: '林舟 · 主角', exact: true }); await row.hover(); await tooltip().waitFor()
    const rowBox = await row.boundingBox(), cardBox = await tooltip().boundingBox(); assert(rowBox && cardBox)
    assert(Math.abs(cardBox.x - rowBox.x - rowBox.width - 8) < 1); assert(Math.abs(cardBox.y - rowBox.y) < 1)
    const chatBox = await page.locator('.workspace-chat').boundingBox(); assert(chatBox && cardBox.x >= chatBox.x && cardBox.x + cardBox.width <= chatBox.x + chatBox.width)
    assert.equal(await hitCard(), true); assert.equal(await tooltip().evaluate(el => getComputedStyle(el).getPropertyValue('-webkit-app-region')), 'no-drag')
    passed(theme + '-card-visible-over-real-chat', { row: rowBox, card: cardBox, chat: chatBox }); await screenshot(theme + '-hover-card')
    const captionPoint = await page.locator('.desktop-sidebar-controls').evaluate(el => {
      const r = el.getBoundingClientRect(), x = r.right - 16, y = r.top + 16, hit = document.elementFromPoint(x, y)
      if (!hit || !el.contains(hit) || hit.closest('button')) throw Error('Actual blank caption point required for native calibration')
      return { label: 'caption-calibration', x, y }
    })
    const points = [{ label: 'card-center', x: cardBox.x + cardBox.width / 2, y: cardBox.y + cardBox.height / 2 }, { label: 'card-right', x: cardBox.x + cardBox.width - 8, y: cardBox.y + cardBox.height / 2 }, captionPoint]
    const nativeResult = await native.probe(points)
    assert.equal(await hitCard(), true); const afterBox = await tooltip().boundingBox(); assert(afterBox && Math.abs(afterBox.x - cardBox.x) < 1 && Math.abs(afterBox.y - cardBox.y) < 1)
    assert.deepEqual(nativeResult.points.map(point => point.label), points.map(point => point.label))
    for (const point of nativeResult.points) assert.equal(point.hit, point.label === 'caption-calibration' ? 2 : 1, 'Actual caption must be HTCAPTION and hover surface HTCLIENT')
    report.nativeHitTests.push({ theme, status: 'passed', ...nativeResult }); passed(theme + '-native-card-client-hit')
    await tooltip().hover(); await page.waitForTimeout(300); assert.equal(await tooltip().count(), 1); passed(theme + '-card-hover-retained')
    await category('正文'); await tooltip().waitFor({ state: 'detached' }); const chapter = page.getByRole('button', { name: '第 1 章 出发', exact: true }); await chapter.hover(); await tooltip().waitFor()
    await page.locator('.tree-scroll').evaluate(el => { el.scrollTop += 30 }); await tooltip().waitFor({ state: 'detached' }); await page.waitForTimeout(450); assert.equal(await tooltip().count(), 0); passed(theme + '-scroll-cleans-card')
    await category('角色'); await row.hover(); await tooltip().waitFor(); await page.locator('.sidebar-navigation').getByRole('button', { name: '展开或收起左侧导航栏', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.dashboard-shell')?.dataset.sidebarPhase === 'closing'); assert.equal(await tooltip().count(), 0)
    await page.waitForFunction(() => document.querySelector('.dashboard-shell')?.dataset.sidebarPhase === 'closed'); await page.locator('[data-sidebar-restore]').filter({ visible: true }).first().click()
    await page.waitForFunction(() => document.querySelector('.dashboard-shell')?.dataset.sidebarPhase === 'open'); await page.waitForTimeout(450); assert.equal(await tooltip().count(), 0); passed(theme + '-drawer-cleans-card-without-revival')
    await row.hover(); await tooltip().waitFor(); assert.equal(await hitCard(), true)
    const modalOverlap = await page.evaluate(async () => {
      const card = document.querySelector('[data-sidebar-hover-card]')
      if (!card) throw Error('Existing real card required')
      const observed = new Promise((done, reject) => {
        const deadline = performance.now() + 3000
        const inspect = () => {
          const modal = document.querySelector('[data-slot="dialog-content"]')
          if (modal) {
            const style = getComputedStyle(modal), rect = modal.getBoundingClientRect()
            if (style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0 && rect.width > 0) {
              const r = card.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
              done({ sameCard: card.isConnected, count: document.querySelectorAll('[data-sidebar-hover-card]').length, covered: !!hit && !card.contains(hit) }); return
            }
          }
          if (performance.now() > deadline) { reject(Error('Visible real Dialog frame not observed')); return }
          requestAnimationFrame(inspect)
        }
        requestAnimationFrame(inspect)
      })
      document.querySelector('.sidebar-navigation .create-action').click()
      return observed
    })
    assert.equal(modalOverlap.sameCard, true); assert.equal(modalOverlap.count, 1); assert.equal(modalOverlap.covered, true); passed(theme + '-business-modal-above-existing-card', modalOverlap)
    await page.getByRole('dialog', { name: '创作向导', exact: true }).waitFor()
    await page.keyboard.press('Escape'); await page.getByRole('dialog', { name: '创作向导', exact: true }).waitFor({ state: 'hidden' }); await page.mouse.move(1000, 800); await tooltip().waitFor({ state: 'detached' })
    await save()
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.httpRequests, [])
  await endingVersions(true)
  passed('no-page-errors-http-or-changing-artifacts'); report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.failure = safe(error.stack ?? error); process.exitCode = 1
  if (page) { try { await layoutSnapshot('failure'); await screenshot('failure') } catch (diagnosticError) { report.diagnosticError = safe(diagnosticError.message) } }
  try { await endingVersions(false) } catch (versionError) { report.endingVersionError = safe(versionError.message) }
}
finally {
  native?.close(); await app?.close().catch(error => { report.closeError = safe(error.message); report.status = 'failed'; process.exitCode = 1 })
  report.completedAt = new Date().toISOString(); await save()
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, nativeHitTests: report.nativeHitTests.length, failure: report.failure, evidence: relative(resolve('.'), evidence) }))
}
