import { _electron } from 'playwright-core'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { defaultState } from '../desktop/core/settings.ts'
import { Workspaces } from '../desktop/service/workspaces.ts'

// 配置目录删除场景复现：隔离数据根 + 真实 Electron，观察各删除组合的启动行为。
const run = promisify(execFile)
const temporary = await mkdtemp(join(tmpdir(), 'shakeink-deletion-repro-'))
const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
const exists = async path => { try { await lstat(path); return true } catch { return false } }

async function seed() {
  const root = join(temporary, `data-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const state = structuredClone(defaultState)
  state.onboarding = { version: 1, completed: true, step: 'welcome', textModelId: null, imageModelId: null, receipt: null }
  await mkdir(root, { recursive: true })
  const workspaces = new Workspaces(root, resolve('prisma/migrations'))
  try { await workspaces.initialize() } finally { await workspaces.close() }
  await writeFile(join(root, 'state.json'), JSON.stringify({ schemaVersion: 1, revision: 0, value: state }))
  return root
}
async function teardown(app) {
  if (!app) return
  const pid = app.process()?.pid
  await Promise.race([app.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))])
  if (pid) { try { process.kill(pid, 0); await run('taskkill', ['/PID', String(pid), '/T', '/F']).catch(() => {}) } catch { /* 已退出 */ } }
}
async function tryLaunch(root, timeoutMs = 22000) {
  let app
  try {
    app = await _electron.launch({ args: [resolve('.')], env: { ...environment, SHAKEINK_TEST_ROOT: root }, timeout: 18000 })
    const page = await app.firstWindow({ timeout: timeoutMs })
    const kind = await page.evaluate(() => ({
      workbench: typeof window.desktop?.bootstrap === 'function',
      restricted: typeof window.desktopRootRelocation?.state === 'function',
      url: location.href,
    })).catch(error => ({ error: String(error).split('\n')[0] }))
    const state = kind.restricted ? await page.evaluate(() => window.desktopRootRelocation.state()).catch(() => null) : null
    return { window: true, kind, state }
  } catch (error) {
    return { window: false, error: String(error).split('\n')[0] }
  } finally {
    await teardown(app)
  }
}
async function purge(path) {
  for (let count = 0; count < 20; count++) {
    try { await rm(path, { recursive: true, force: true }); return } catch { await new Promise(resolve => setTimeout(resolve, 700)) }
  }
}

const scenarios = [
  ['baseline 健康根', async () => {}],
  ['删除 drafts.json', async root => { await rm(join(root, 'drafts.json'), { force: true }) }],
  ['删除 inbox/database', async root => { await rm(join(root, 'inbox', 'database'), { recursive: true, force: true }) }],
  ['删除整个 inbox 目录', async root => { await rm(join(root, 'inbox'), { recursive: true, force: true }) }],
  ['删除 catalog.json', async root => { await rm(join(root, 'catalog.json'), { force: true }) }],
  ['删除 inbox + drafts.json（用户报告组合）', async root => { await rm(join(root, 'inbox'), { recursive: true, force: true }); await rm(join(root, 'drafts.json'), { force: true }) }],
]
for (const [name, damage] of scenarios) {
  const root = await seed()
  await damage(root)
  const result = await tryLaunch(root)
  console.log(`${name}: window=${result.window} kind=${JSON.stringify(result.kind)}${result.state ? ' state.phase=' + result.state.phase : ''}${result.error ? ' error=' + result.error : ''}`)
  console.log(`  修复后现场: inbox=${await exists(join(root, 'inbox'))} database=${await exists(join(root, 'inbox', 'database'))} catalog=${await exists(join(root, 'catalog.json'))}`)
  await purge(root)
}
await purge(temporary)
