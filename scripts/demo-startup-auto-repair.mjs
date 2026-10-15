import { _electron } from 'playwright-core'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { defaultState } from '../desktop/core/settings.ts'
import { Workspaces } from '../desktop/service/workspaces.ts'

// 启动自动修复演示：隔离数据根 + 真实开发版 Electron 窗口。
// S1 强杀进程（残留写入锁）→ 重启自动修锁进工作台；
// S2a 删除应用标记 shakeink-app.json → 重启自动重建；
// S2b 损坏根指针 data-root.json → 重启自动隔离重建；
// S3 损坏设置 state.json → 重启隔离保留并以默认设置启动。
// 截图与检查报告写入 docs/evidence/startup-auto-repair/。
const run = promisify(execFile)
const temporary = await mkdtemp(join(tmpdir(), 'shakeink-auto-repair-demo-'))
const root = join(temporary, 'data')
const bootstrap = root + '-bootstrap'
const evidence = resolve('docs/evidence/startup-auto-repair')
await mkdir(evidence, { recursive: true })
const report = { scope: 'Windows development Electron（隔离数据根）', startedAt: new Date().toISOString(), checks: [], errors: [] }
const check = (name, ok, detail = '') => { report.checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const step = name => console.log(`[step ${new Date().toISOString()}] ${name}`)
const exists = async path => { try { await lstat(path); return true } catch { return false } }
const environment = { ...process.env, SHAKEINK_TEST_ROOT: root }
delete environment.ELECTRON_RUN_AS_NODE

async function launch() {
  const app = await _electron.launch({ args: [resolve('.')], env: environment, timeout: 60000 })
  const page = await app.firstWindow({ timeout: 45000 })
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => report.errors.push(String(error.message).replaceAll(temporary, '<isolated>')))
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.setBounds({ x: 120, y: 50, width: 1280, height: 860 })
    win.focus()
  })
  return { app, page }
}
async function workbench(page) {
  await page.waitForFunction(() => typeof window.desktop?.bootstrap === 'function', null, { timeout: 45000 })
  await page.getByText('创建作品', { exact: true }).first().waitFor({ timeout: 30000 })
  const skipModel = page.getByRole('button', { name: '暂不配置', exact: true })
  if (await skipModel.count()) await skipModel.click()
  await new Promise(resolve => setTimeout(resolve, 1500))
}
async function bootstrapInfo(page) {
  return page.evaluate(() => window.desktop.bootstrap())
}
async function killTree(app) {
  const pid = app.process().pid
  await run('taskkill', ['/PID', String(pid), '/T', '/F'])
  for (let count = 0; count < 100; count++) {
    try { process.kill(pid, 0) } catch { return }
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw Error('killed process still alive')
}
async function closeApp(app) {
  await Promise.race([app.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 8000))])
  await new Promise(resolve => setTimeout(resolve, 800))
}
const lockPath = join(root, 'inbox', '.shakeink-lock')
const auditPath = join(root, 'inbox', '.shakeink-lease-recovery.json')
const markerPath = join(root, 'shakeink-app.json')
const pointerPath = join(bootstrap, 'data-root.json')

try {
  step('S0 准备健康隔离数据根（真实 Workspaces 初始化 + 已完成引导的设置）')
  const state = structuredClone(defaultState)
  state.onboarding = { version: 1, completed: true, step: 'welcome', textModelId: null, imageModelId: null, receipt: null }
  await mkdir(root, { recursive: true })
  const workspaces = new Workspaces(root, resolve('prisma/migrations'))
  try { await workspaces.initialize() } finally { await workspaces.close() }
  await writeFile(join(root, 'state.json'), JSON.stringify({ schemaVersion: 1, revision: 0, value: state }))

  step('S1.1 首次启动并等待工作台')
  const first = await launch()
  await workbench(first.page)
  for (let count = 0; count < 100 && !(await exists(join(lockPath, 'owner.json'))); count++) await new Promise(resolve => setTimeout(resolve, 150))
  check('S1 应用运行期间持有收件箱写入锁', await exists(join(lockPath, 'owner.json')))
  const markerBefore = JSON.parse(await readFile(markerPath, 'utf8'))
  await first.page.screenshot({ path: join(evidence, 's1-1-before-kill.png') })

  step('S1.2 taskkill /T /F 强杀整个进程树（模拟上次未正常关闭）')
  await killTree(first.app)
  await closeApp(first.app)
  const staleOwner = await exists(join(lockPath, 'owner.json'))
  check('S1 强杀后写入锁残留（异常关闭现场成立）', staleOwner)
  const staleLease = JSON.parse(await readFile(join(lockPath, 'owner.json'), 'utf8'))
  check('S1 强杀后尚无修复审计', !(await exists(auditPath)))

  step('S1.3 再次启动（应自动修锁，无对话框，直接进入工作台）')
  const relaunched = await launch()
  await workbench(relaunched.page)
  check('S1 重启后无修复对话框、直接呈现工作台', true)
  const audit = JSON.parse(await readFile(auditPath, 'utf8'))
  check('S1 修复审计落盘且相位为 recovered', audit.payload?.phase === 'recovered', audit.payload?.phase)
  const liveLease = JSON.parse(await readFile(join(lockPath, 'owner.json'), 'utf8'))
  let liveOwnerAlive = false
  try { process.kill(liveLease.pid, 0); liveOwnerAlive = true } catch { /* 属主进程不存在 */ }
  check('S1 当前写入锁为新进程存活租约（残留锁已被修复接管）', liveLease.pid !== staleLease.pid && liveLease.token !== staleLease.token && liveOwnerAlive, `stale.pid=${staleLease.pid} live.pid=${liveLease.pid}`)
  const boot1 = await bootstrapInfo(relaunched.page)
  check('S1 数据根与设置保持（引导仍已完成）', boot1.dataRoot === root && boot1.onboarding?.completed === true)
  await relaunched.page.screenshot({ path: join(evidence, 's1-2-auto-repaired.png') })
  await closeApp(relaunched.app)
  check('S1 正常退出后写入锁随之释放', !(await exists(lockPath)))

  step('S2a 删除应用标记 shakeink-app.json 后启动（应自动重建并进入工作台）')
  await rm(markerPath)
  const markerRebuilt = await launch()
  await workbench(markerRebuilt.page)
  const markerAfter = JSON.parse(await readFile(markerPath, 'utf8'))
  check('S2a 应用标记已自动重建且根身份不变', markerAfter.id === markerBefore.id && markerAfter.phase === 'ready' && markerAfter.inboxReady === true, `id=${markerAfter.id}`)
  const boot2a = await bootstrapInfo(markerRebuilt.page)
  check('S2a 设置未受影响（引导仍已完成）', boot2a.onboarding?.completed === true)
  await markerRebuilt.page.screenshot({ path: join(evidence, 's2a-marker-rebuilt.png') })
  await closeApp(markerRebuilt.app)

  step('S2b 损坏根指针 data-root.json 后启动（应自动隔离重建并进入工作台）')
  await writeFile(pointerPath, '{broken pointer')
  const pointerRepaired = await launch()
  await workbench(pointerRepaired.page)
  const quarantinedPointer = (await readdir(bootstrap)).filter(name => /^data-root\.corrupt-.+\.json$/.test(name))
  check('S2b 损坏指针被隔离保留', quarantinedPointer.length === 1 && (await readFile(join(bootstrap, quarantinedPointer[0]), 'utf8')) === '{broken pointer', quarantinedPointer[0])
  check('S2b 新指针已重建', await exists(pointerPath))
  const boot2b = await bootstrapInfo(pointerRepaired.page)
  check('S2b 数据根与设置保持（引导仍已完成）', boot2b.dataRoot === root && boot2b.onboarding?.completed === true)
  await pointerRepaired.page.screenshot({ path: join(evidence, 's2b-pointer-repaired.png') })
  await closeApp(pointerRepaired.app)

  step('S3 损坏设置 state.json 后启动（应隔离保留 + 默认设置启动）')
  await writeFile(join(root, 'state.json'), '{corrupt state!!!')
  const quarantined = await launch()
  await quarantined.page.waitForFunction(() => typeof window.desktop?.bootstrap === 'function', null, { timeout: 45000 })
  await new Promise(resolve => setTimeout(resolve, 2500))
  const quarantinedState = (await readdir(root)).filter(name => /^state\.corrupt-.+\.json$/.test(name))
  check('S3 损坏 state.json 被隔离保留（原字节一致）', quarantinedState.length === 1 && (await readFile(join(root, quarantinedState[0]), 'utf8')) === '{corrupt state!!!', quarantinedState[0])
  check('S3 原路径不再阻塞（已移开）', !(await exists(join(root, 'state.json'))))
  const boot3 = await bootstrapInfo(quarantined.page)
  check('S3 以默认设置正常启动（引导重置为出厂 null）', boot3.dataRoot === root && boot3.onboarding === null, `onboarding=${JSON.stringify(boot3.onboarding)}`)
  await quarantined.page.screenshot({ path: join(evidence, 's3-state-quarantined.png') })
  await closeApp(quarantined.app)
} catch (error) {
  report.errors.push(String(error?.stack ?? error).replaceAll(temporary, '<isolated>'))
  check('演示流程异常终止', false, String(error?.message ?? error))
} finally {
  report.finishedAt = new Date().toISOString()
  report.passed = report.checks.filter(row => row.ok).length
  report.failed = report.checks.filter(row => !row.ok).length
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`[done] ${report.passed} passed, ${report.failed} failed; evidence at ${evidence}`)
  await rm(temporary, { recursive: true, force: true })
  process.exitCode = report.failed ? 1 : 0
}
