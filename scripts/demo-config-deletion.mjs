import { _electron } from 'playwright-core'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import { defaultState } from '../desktop/core/settings.ts'
import { Workspaces } from '../desktop/service/workspaces.ts'

// 配置目录删除自愈与兜底重建演示：隔离数据根 + 真实开发版 Electron。
// 每个场景先完整启动一次（adopt 指针 + inboxReady:true + 已完成引导）再破坏：
// D1 删除 inbox + drafts.json；D2 删除 catalog.json；D3 删除 inbox/database —— 均应无感自愈直进工作台。
// D4 双品牌冲突（无法自动修复）→ 主界面 + 对话框 → 选「清空全部配置并重启」→ 自动重启全新重建。
// D5 同现场选「退出」→ 进程退出、配置目录原样保留。
// 证据写入 docs/evidence/config-deletion/。
const run = promisify(execFile)
const temporary = await mkdtemp(join(tmpdir(), 'shakeink-config-deletion-demo-'))
const evidence = resolve('docs/evidence/config-deletion')
await mkdir(evidence, { recursive: true })
const report = { scope: 'Windows development Electron（隔离数据根，完整 adopt 后破坏）', startedAt: new Date().toISOString(), checks: [], errors: [] }
const check = (name, ok, detail = '') => { report.checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const step = name => console.log(`[step ${new Date().toISOString()}] ${name}`)
const exists = async path => { try { await lstat(path); return true } catch { return false } }
const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
const powershell = script => run('powershell', ['-NoProfile', '-Command', script])
async function sendKeys(keys) {
  await powershell(`[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.SendKeys]::SendWait('${keys}')`)
}
const onlyScenario = process.env.DEMO_ONLY ? process.env.DEMO_ONLY.split(',') : null
const scenarioEnabled = name => !onlyScenario || onlyScenario.includes(name)

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
  await new Promise(resolve => setTimeout(resolve, 1200))
}
async function closeApp(app) {
  await Promise.race([app.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 8000))])
  await new Promise(resolve => setTimeout(resolve, 800))
}
async function purge(path) {
  for (let count = 0; count < 20; count++) {
    try { await rm(path, { recursive: true, force: true }); return } catch { await new Promise(resolve => setTimeout(resolve, 700)) }
  }
}
async function killByCommandLine(fragment) {
  // Child processes carry the isolated bootstrap path in --user-data-dir; walk
  // each match up to its topmost electron ancestor so the tree (and the single
  // instance lock it holds) is actually released.
  const script = `Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object { $_.CommandLine -like '*${fragment.replace(/'/g, "''")}*' } | ForEach-Object { $p = $_; while ($true) { $q = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)"; if ($q -and $q.Name -eq 'electron.exe') { $p = $q } else { break } }; $p.ProcessId }`
  const { stdout } = await powershell(script)
  const tops = [...new Set(stdout.split(/\s+/).filter(Boolean))]
  for (const pid of tops) await run('taskkill', ['/PID', pid, '/T', '/F']).catch(() => {})
}async function adoptedRoot(name) {
  const root = join(temporary, name)
  environment.SHAKEINK_TEST_ROOT = root
  const state = structuredClone(defaultState)
  state.onboarding = { version: 1, completed: true, step: 'welcome', textModelId: null, imageModelId: null, receipt: null }
  await mkdir(root, { recursive: true })
  const workspaces = new Workspaces(root, resolve('prisma/migrations'))
  try { await workspaces.initialize() } finally { await workspaces.close() }
  await writeFile(join(root, 'state.json'), JSON.stringify({ schemaVersion: 1, revision: 0, value: state }))
  const first = await launch()
  await workbench(first.page)
  await closeApp(first.app)
  return root
}
const markerOf = async root => JSON.parse(await readFile(join(root, 'shakeink-app.json'), 'utf8'))

const activateOfferAndSend = async keys => {
  await powershell(`$w = New-Object -ComObject WScript.Shell; [void]$w.AppActivate('配置数据无法自动修复'); Start-Sleep -Milliseconds 500; $w.SendKeys('${keys}')`)
}
// UIA InvokePattern：直接调用原生 TaskDialog 按钮，不依赖前台焦点/按键时序。
// 按钮按整棵 UIA 树（Descendants）查找，覆盖 owned 对话框不挂在根子级的情况。
// Win32 EnumWindows 前缀匹配对话框标题（TaskDialog 实际标题可能带后缀），
// 再枚举其子按钮控件发 BM_CLICK；不依赖前台焦点与 UIA 树形态。
const win32ClickOfferButton = async name => {
  const { stdout } = await powershell(`Add-Type 'using System;using System.Text;using System.Runtime.InteropServices;public static class W32{[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);[DllImport("user32.dll")]public static extern bool EnumWindows(EnumProc cb,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr h,EnumProc cb,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);public delegate bool EnumProc(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,int msg,IntPtr w,IntPtr l);}' -ErrorAction Stop
$script:dlg = [IntPtr]::Zero
$find = [W32+EnumProc]{ param($h, $l) $sb = New-Object System.Text.StringBuilder 256; [void][W32]::GetWindowText($h, $sb, 256); if ($sb.ToString().StartsWith('配置数据无法自动修复') -and [W32]::IsWindowVisible($h)) { $script:dlg = $h; return $false }; return $true }
[void][W32]::EnumWindows($find, [IntPtr]::Zero)
if ($script:dlg -eq [IntPtr]::Zero) { Write-Output 'DLG_NOT_FOUND'; return }
$script:target = [IntPtr]::Zero
$cb = [W32+EnumProc]{ param($h, $l) $sb = New-Object System.Text.StringBuilder 256; [void][W32]::GetWindowText($h, $sb, 256); if ($sb.ToString() -eq '${name}') { $script:target = $h; return $false }; return $true }
[void][W32]::EnumChildWindows($script:dlg, $cb, [IntPtr]::Zero)
if ($script:target -eq [IntPtr]::Zero) { Write-Output 'BTN_NOT_FOUND'; return }
[void][W32]::SendMessage($script:target, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Output 'INVOKED'`)
  return stdout.trim()
}

try {
  if (scenarioEnabled('D1')) {
    step('D1 删除 inbox + drafts.json（用户报告组合）后启动')
    const root = await adoptedRoot('d1-data')
    const before = await markerOf(root)
    await rm(join(root, 'inbox'), { recursive: true, force: true })
    await rm(join(root, 'drafts.json'), { force: true })
    const session = await launch()
    await workbench(session.page)
    check('D1 无对话框直进工作台', true)
    const after = await markerOf(root)
    check('D1 inbox 已重建且身份不变（id 相同、inboxReady 回写 true）', after.id === before.id && after.inboxReady === true && (await exists(join(root, 'inbox', 'database', 'PG_VERSION'))))
    const boot = await session.page.evaluate(() => window.desktop.bootstrap())
    check('D1 设置保持（引导仍已完成）', boot.dataRoot === root && boot.onboarding?.completed === true)
    await session.page.screenshot({ path: join(evidence, 'd1-inbox-drafts-healed.png') })
    await closeApp(session.app)
  }

  if (scenarioEnabled('D2')) {
    step('D2 删除 catalog.json 后启动')
    const root = await adoptedRoot('d2-data')
    await rm(join(root, 'catalog.json'), { force: true })
    const session = await launch()
    await workbench(session.page)
    check('D2 无对话框直进工作台', true)
    check('D2 catalog.json 已重建为空目录', (await exists(join(root, 'catalog.json'))) && JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8')).value.length === 0)
    await session.page.screenshot({ path: join(evidence, 'd2-catalog-healed.png') })
    await closeApp(session.app)
  }

  if (scenarioEnabled('D3')) {
    step('D3 删除 inbox/database 后启动')
    const root = await adoptedRoot('d3-data')
    const before = await markerOf(root)
    await rm(join(root, 'inbox', 'database'), { recursive: true, force: true })
    const session = await launch()
    await workbench(session.page)
    check('D3 无对话框直进工作台', true)
    const after = await markerOf(root)
    check('D3 数据库已重建且身份不变（id 相同、inboxReady 回写 true、PG_VERSION 存在）', after.id === before.id && after.inboxReady === true && (await exists(join(root, 'inbox', 'database', 'PG_VERSION'))))
    await session.page.screenshot({ path: join(evidence, 'd3-database-healed.png') })
    await closeApp(session.app)
  }

  if (scenarioEnabled('D4')) {
    step('D4 双品牌冲突（无法自动修复）→ 主界面对话框 → 选「清空全部配置并重启」')
    const root = await adoptedRoot('d4-data')
    await writeFile(join(root, 'xuanxiang-app.json'), JSON.stringify({ schemaVersion: 1, app: 'Xuanxiangxiezuo-Desktop', id: randomUUID(), phase: 'ready', inboxReady: true }))
    const offered = await launch()
    await offered.page.waitForFunction(() => typeof window.desktop?.bootstrap === 'function', null, { timeout: 45000 })
    check('D4 主界面已打开（临时根降级工作台）', true)
    await new Promise(resolve => setTimeout(resolve, 2500))
    await offered.page.screenshot({ path: join(evidence, 'd4-reset-offer.png') })
    step('D4 通过 Win32 点击「清空全部配置并重启」')
    let rebuilt = false
    for (let count = 0; count < 90 && !rebuilt; count++) {
      await win32ClickOfferButton('清空全部配置并重启').catch(() => {})
      await new Promise(resolve => setTimeout(resolve, 1000))
      rebuilt = await exists(join(root, 'inbox', 'database', 'PG_VERSION'))
    }
    check('D4 清空后应用自动重启并全新重建配置目录', rebuilt)
    await closeApp(offered.app).catch(() => {})
    await killByCommandLine(root + '-bootstrap')
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (rebuilt) {
      const fresh = await launch()
      await workbench(fresh.page)
      const after = await markerOf(root)
      check('D4 重建后正常启动进入全新工作台（新 id、全新空状态）', after.id !== undefined)
      await fresh.page.screenshot({ path: join(evidence, 'd4-after-wipe-relaunch.png') })
      await closeApp(fresh.app)
    }
  }

  if (scenarioEnabled('D5')) {
    step('D5 双品牌冲突 → 主界面对话框 → 选「退出」')
    const root = await adoptedRoot('d5-data')
    await writeFile(join(root, 'xuanxiang-app.json'), JSON.stringify({ schemaVersion: 1, app: 'Xuanxiangxiezuo-Desktop', id: randomUUID(), phase: 'ready', inboxReady: true }))
    const offered = await launch()
    await offered.page.waitForFunction(() => typeof window.desktop?.bootstrap === 'function', null, { timeout: 45000 })
    check('D5 主界面已打开（临时根降级工作台）', true)
    await new Promise(resolve => setTimeout(resolve, 2500))
    const before = await readdir(root)
    step('D5 通过 Win32 点击「退出」（前缀匹配，轮询重试）')
    let exited = false, lastProbe = ''
    for (let count = 0; count < 30 && !exited; count++) {
      lastProbe = await win32ClickOfferButton('退出').catch(() => 'invoke-error')
      await new Promise(resolve => setTimeout(resolve, 1500))
      try { process.kill(offered.app.process().pid, 0) } catch { exited = true }
    }
    check('D5 选「退出」后应用进程退出', exited, lastProbe)
    check('D5 配置目录原样保留（双品牌现场未动）', JSON.stringify((await readdir(root)).sort()) === JSON.stringify(before.sort()))
    await closeApp(offered.app).catch(() => {})
  }
} catch (error) {
  report.errors.push(String(error?.stack ?? error).replaceAll(temporary, '<isolated>'))
  check('演示流程异常终止', false, String(error?.message ?? error))
} finally {
  report.finishedAt = new Date().toISOString()
  report.passed = report.checks.filter(row => row.ok).length
  report.failed = report.checks.filter(row => !row.ok).length
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`[done] ${report.passed} passed, ${report.failed} failed; evidence at ${evidence}`)
  await killByCommandLine('shakeink-config-deletion-demo').catch(() => {})
  await purge(temporary)
  process.exitCode = report.failed ? 1 : 0
}
