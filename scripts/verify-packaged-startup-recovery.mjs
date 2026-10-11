// Packaged-artifact startup recovery check: real release/win-unpacked exe with an
// isolated missing root must auto-initialize and open the workbench + onboarding.
// No network. Evidence: docs/evidence/startup-recovery/packaged-fresh.json
import {_electron as electron} from 'playwright'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, readFile, writeFile, rm, realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const temporary = await realpath(await mkdtemp(join(tmpdir(), 'xaanink-packaged-recovery-')))
const root = join(temporary, 'data')
const evidence = 'docs/evidence/startup-recovery'
const startedAt = new Date().toISOString(), checks = [], errors = []
let app, passed = false
try {
  await mkdir(evidence, {recursive: true})
  app = await electron.launch({executablePath: resolve('release/win-unpacked/玄印写作.exe'), args: [], env: {...process.env, XAANINK_TEST_ROOT: root}, timeout: 60000})
  const page = await app.firstWindow()
  page.on('pageerror', e => errors.push(e.message))
  await page.getByRole('heading', {name: '选择主题', exact: true}).waitFor({timeout: 90000})
  assert.equal(await page.getByRole('heading', {name: '无法修复数据目录', exact: true}).count(), 0)
  const body = await page.locator('body').innerText()
  assert.ok(body.includes('作品阁'), 'workbench shell not rendered behind onboarding')
  await page.screenshot({path: join(evidence, 'packaged-fresh-onboarding.png')})
  checks.push('packaged win-unpacked exe cold-boots with a missing isolated root: workbench shell renders and the onboarding theme step shows; no recovery dialog')
  const marker = JSON.parse(await readFile(join(root, 'xaanink-app.json'), 'utf8'))
  const pointer = JSON.parse(await readFile(join(`${root}-bootstrap`, 'data-root.json'), 'utf8'))
  assert.equal(marker.phase, 'ready'); assert.equal(marker.inboxReady, true); assert.equal(pointer.rootId, marker.id)
  checks.push('data root initialized on disk: ready marker with inboxReady, pointer rootId matches marker id')
  await page.evaluate(() => window.desktop.command('app.quit')).catch(() => {})
  const pid = app.process().pid
  const deadline = Date.now() + 30000
  let alive = true
  while (Date.now() < deadline && alive) { try { process.kill(pid, 0) } catch { alive = false } if (alive) await new Promise(r => setTimeout(r, 250)) }
  assert.equal(alive, false, 'packaged app did not exit')
  assert.deepEqual(errors, [])
  await writeFile(join(evidence, 'packaged-fresh.json'), JSON.stringify({scope: 'packaged win-unpacked real boot with isolated missing root; not NSIS installation or formal acceptance', startedAt, completedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, passed: true, checks, errors}, null, 2) + '\n')
  passed = true
  console.log('Packaged startup-recovery check passed.')
} catch (error) {
  await writeFile(join(evidence, 'packaged-failure.json'), JSON.stringify({startedAt, error: String(error), checks, errors}, null, 2) + '\n')
  throw error
} finally {
  if (app) { const timer = setTimeout(() => app?.process().kill('SIGKILL'), 5000); try { await app.close().catch(() => {}) } finally { clearTimeout(timer) } }
  if (passed) await rm(temporary, {recursive: true, force: true}); else console.log('Retained fixture:', temporary)
}
