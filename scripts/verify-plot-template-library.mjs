import { _electron as electron } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'
import { createHash } from 'node:crypto'

const require = createRequire(import.meta.url)
require('tsx/cjs')
const { WIZARD_TEMPLATES } = require('../src/lib/creation-wizard/templates')
const { Workspaces } = require('../desktop/service/workspaces')
const { defaultState, stateSchema } = require('../desktop/core/settings')
const coverage = JSON.parse(await readFile('docs/prompt-library-expansion/coverage.json', 'utf8'))
const evidence = resolve('docs/evidence/plot-template-library/windows')
const temporary = await realpath(await mkdtemp(join(tmpdir(), 'xaanink-plot-native-')))
const root = join(temporary, 'data')
const report = { startedAt: new Date().toISOString(), platform: process.platform, status: 'running', scope: 'Actual Windows development Electron, production React/IPC/PGlite, isolated data, native menu callback, offline renderer requests blocked. No supplier generation, physical menu click, installer or macOS claim.', checks: [], errors: [], httpRequests: [], sourceHashes: {} }
let app, page, passed = false
await mkdir(evidence, { recursive: true })
for (const file of ['src/lib/creation-wizard/templates/index.ts', 'src/lib/creation-wizard/templates/plot-prompt.ts', 'src/lib/creation-wizard/templates/plot-structures.ts', 'src/lib/creation-wizard/templates/plot-genres.ts', 'src/lib/creation-wizard/templates/curation.ts', 'desktop/service/template-library.ts', 'dist/service/index.cjs']) {
  report.sourceHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex')
}
const check = (name, details = {}) => report.checks.push({ name, ...details })
async function launch() {
  app = await electron.launch({ executablePath: require('electron'), args: [resolve('.')], env: { ...process.env, XAANINK_TEST_ROOT: root }, timeout: 60000 })
  await app.context().route(/^https?:\/\//, route => { report.httpRequests.push(route.request().url()); return route.abort() })
  page = await app.firstWindow({ timeout: 60000 }); page.setDefaultTimeout(15000)
  page.on('pageerror', error => report.errors.push(error.message))
  // Dismiss only the existing no-model notice; do not run the setup workflow.
  await page.getByRole('button', { name: '暂不配置', exact: true }).click({ timeout: 60000 })
  await page.getByRole('button', { name: /^账号菜单：/ }).waitFor({ timeout: 60000 })
  await app.evaluate(({ app, BrowserWindow }) => { app.focus({ steal: true }); BrowserWindow.getAllWindows()[0].focus() })
}
async function manager() {
  await app.evaluate(({ Menu }) => {
    globalThis.__plotCapturedMenu = null
    if (!globalThis.__plotMenuHook) {
      const original = Menu.prototype.popup
      Menu.prototype.popup = function(options) { globalThis.__plotCapturedMenu = this; return original.call(this, options) }
      globalThis.__plotMenuHook = true
    }
  })
  await page.getByRole('button', { name: '应用程序菜单', exact: true }).click()
  await expect.poll(() => app.evaluate(() => !!globalThis.__plotCapturedMenu)).toBe(true)
  await app.evaluate(() => {
    const menu = globalThis.__plotCapturedMenu
    const item = menu?.items.find(row => row.label === '文件')?.submenu?.items.find(row => row.label === '模板与提示词')
    if (!item) throw Error('Template native menu callback missing')
    menu.closePopup()
    item.click()
  })
  await expect(page.getByRole('dialog', { name: '模板与提示词', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: '创作模板', exact: true }).click()
}
async function catalog() { return page.evaluate(async () => (await (await fetch('/api/templates/wizard')).json()).templates) }
async function verifyListeners() {
  const pid = app.process().pid
  assert.ok(Number.isSafeInteger(pid) && pid > 0)
  const command = `$processRows = Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId
$targetIds = [System.Collections.Generic.HashSet[int]]::new()
[void]$targetIds.Add(${pid})
do {
  $changed = $false
  foreach ($row in $processRows) {
    if ($targetIds.Contains([int]$row.ParentProcessId) -and $targetIds.Add([int]$row.ProcessId)) { $changed = $true }
  }
} while ($changed)
$listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $targetIds.Contains([int]$_.OwningProcess) } | Select-Object LocalAddress,LocalPort,OwningProcess)
ConvertTo-Json -Depth 4 -Compress -InputObject $listeners`
  const listeners = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true }))
  for (const listener of listeners) assert.ok(['127.0.0.1', '::1'].includes(listener.LocalAddress), 'instrumentation must bind only loopback')
  const distinct = [...new Map(listeners.map(row => [row.LocalPort, row])).values()]
  for (const listener of distinct) {
    const address = listener.LocalAddress === '::1' ? '[::1]' : '127.0.0.1'
    const response = await fetch(`http://${address}:${listener.LocalPort}/json/version`, { signal: AbortSignal.timeout(3000) })
    assert.ok(response.ok)
    const version = await response.json()
    assert.match(version.Browser ?? '', /Chrome|Electron|node\.js/i, 'only Playwright Chrome/Node debugger listeners allowed')
  }
  check('Windows process-tree listeners are only the required Playwright debugger instrumentation', { listenerCount: distinct.length, instrumentation: app.process().spawnargs.filter(arg => /^--(?:inspect|remote-debugging)/.test(arg)) })
}
async function close() { if (app) { await app.close(); app = null } }
try {
  assert.equal(process.platform, 'win32')
  const works = new Workspaces(root, resolve('prisma/migrations'))
  try { await works.initialize() } finally { await works.close() }
  const initial = structuredClone(defaultState)
  initial.onboarding = { version: 1, completed: true, step: 'welcome', textModelId: null, imageModelId: null, receipt: null }
  await writeFile(join(root, 'state.json'), JSON.stringify({ schemaVersion: 1, revision: 0, value: stateSchema.parse(initial) }))
  const state = JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))
  assert.deepEqual(state.value.models, []); check('Isolated startup retains no configured models')
  await launch(); assert.match(page.url(), /^xaanink:/)
  await manager()
  const rows = await catalog()
  assert.equal(rows.length, coverage.expected.all)
  assert.equal(rows.filter(row => row.template.cat === 'plot').length, coverage.expected.plot)
  for (const { id } of coverage.groups.flatMap(group => group.templates)) {
    const row = rows.find(row => row.template.id === id), expected = WIZARD_TEMPLATES.find(row => row.id === id)
    assert.ok(row, id); assert.deepEqual(row.template, expected); assert.equal(row.source, 'builtin'); assert.equal(row.enabled, true)
  }
  check('All focused prompts match current source through actual worker IPC', { focused: coverage.expected.focused, wizard: rows.length, plot: coverage.expected.plot })
  const selected = rows.find(row => row.template.id === 'plot-scifi-time-loop')
  await page.getByRole('button', { name: new RegExp(selected.template.title) }).click()
  await expect(page.getByRole('textbox', { name: '创作模板拼贴内容', exact: true })).toHaveValue(selected.template.prompt)
  await page.screenshot({ path: join(evidence, 'manager.png') }); check('Actual manager shows complete new prompt')
  await page.keyboard.press('Escape')
  await page.getByTestId('sidebar').getByRole('button', { name: '创建作品', exact: true }).click()
  const wizard = page.getByRole('dialog', { name: '创作向导', exact: true })
  await expect(wizard).toBeVisible(); await wizard.getByRole('button', { name: /^剧情\s*160$/ }).click()
  const saveCat = rows.find(row => row.template.id === 'plot-structure-save-the-cat')
  await wizard.getByRole('button', { name: new RegExp(saveCat.template.title) }).dblclick()
  await expect(wizard.getByText(saveCat.template.prompt, { exact: true })).toBeVisible()
  await page.screenshot({ path: join(evidence, 'wizard-detail.png') })
  await wizard.getByRole('button', { name: '使用此模板', exact: true }).click(); await wizard.getByRole('button', { name: '确定', exact: true }).click()
  await expect(wizard).not.toBeVisible()
  const composer = page.getByRole('textbox', { name: '消息输入框', exact: true })
  await expect(composer).toContainText(saveCat.template.prompt, { useInnerText: true })
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled()
  await page.screenshot({ path: join(evidence, 'composer.png') }); check('Actual wizard prepares complete fifteen-beat composer draft; sending disabled without a model')
  await manager(); await page.getByRole('button', { name: new RegExp(selected.template.title) }).click()
  const edited = selected.template.prompt + '\n作者验收设定：仅主角保留上一轮记忆。'
  await page.getByRole('textbox', { name: '创作模板拼贴内容', exact: true }).fill(edited)
  await page.getByRole('switch').click(); await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(async () => (await catalog()).find(row => row.template.id === selected.template.id)?.version).toBe(2)
  assert.equal((await catalog()).find(row => row.template.id === selected.template.id).enabled, false)
  check('Actual manager explicitly saves an author revision and disabled state')
  await close(); await launch(); await manager()
  const reopened = await catalog(), persisted = reopened.find(row => row.template.id === selected.template.id)
  assert.equal(reopened.length, coverage.expected.all); assert.equal(persisted.version, 2); assert.equal(persisted.enabled, false); assert.equal(persisted.source, 'customized'); assert.equal(persisted.template.prompt, edited)
  await page.getByRole('button', { name: new RegExp(selected.template.title) }).click()
  await expect(page.getByRole('textbox', { name: '创作模板拼贴内容', exact: true })).toHaveValue(edited)
  await page.screenshot({ path: join(evidence, 'reopened.png') }); check('Offline process restart preserves expanded catalog and author changes through real disk and worker startup')
  await verifyListeners()
  assert.deepEqual(report.errors, []); assert.deepEqual(report.httpRequests, [])
  check('No renderer HTTP requests or page errors during scoped workflow')
  report.status = 'passed'; passed = true
} catch (error) {
  report.status = 'failed'; report.error = String(error).replaceAll(temporary, '<isolated-temp>')
  try { await page?.screenshot({ path: join(evidence, 'failure.png') }) } catch {}
  throw error
} finally {
  report.completedAt = new Date().toISOString(); await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  await close().catch(() => {})
  // Only delete the exact directory allocated by mkdtemp for this test.
  if (passed) {
    assert.equal(dirname(temporary).toLowerCase(), (await realpath(tmpdir())).toLowerCase())
    assert.ok(basename(temporary).startsWith('xaanink-plot-native-'))
    await rm(temporary, { recursive: true, force: true })
  }
}
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, platform: report.platform }))
