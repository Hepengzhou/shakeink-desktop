import { _electron } from 'playwright-core'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { defaultState } from '../desktop/core/settings.ts'
import { Workspaces } from '../desktop/service/workspaces.ts'

// API Key 回填与明文/密文切换的真实界面验收：隔离数据根 + 真实保存 IPC 落 Key
// + 真实 Electron 窗口。截图与菜单能力写入 docs/evidence/api-key-reveal/。
const demoKey = 'sk-demo-eye-toggle-20261015-not-a-real-key'
const temporary = await mkdtemp(join(tmpdir(), 'shakeink-api-key-reveal-'))
const root = join(temporary, 'data')
const evidence = resolve('docs/evidence/api-key-reveal')
await mkdir(evidence, { recursive: true })
const report = { scope: 'Windows development Electron', startedAt: new Date().toISOString(), checks: [], menus: [], errors: [] }
const check = (name, ok, detail = '') => { report.checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const step = name => console.log(`[step ${new Date().toISOString()}] ${name}`)

const environment = { ...process.env, SHAKEINK_TEST_ROOT: root }
delete environment.ELECTRON_RUN_AS_NODE

async function launch() {
  const app = await _electron.launch({ args: [resolve('.')], env: environment, timeout: 60000 })
  const page = await app.firstWindow({ timeout: 60000 })
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => report.errors.push(String(error.message).replaceAll(temporary, '<isolated>')))
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.setBounds({ x: 140, y: 60, width: 1280, height: 860 })
    win.focus()
  })
  return { app, page }
}

try {
  // 健康数据根 + 已完成引导的空模型状态（与既有验收脚本一致）。
  step('seed root')
  const state = structuredClone(defaultState)
  state.onboarding = { version: 1, completed: true, step: 'welcome', textModelId: null, imageModelId: null, receipt: null }
  await mkdir(root, { recursive: true })
  const workspaces = new Workspaces(root, resolve('prisma/migrations'))
  try { await workspaces.initialize() } finally { await workspaces.close() }
  await writeFile(join(root, 'state.json'), JSON.stringify({ schemaVersion: 1, revision: 0, value: state }))

  step('launch'); const { app, page } = await launch()
  await page.waitForFunction(() => typeof window.desktop?.bootstrap === 'function', null, { timeout: 45000 })
  await page.getByText('创建作品', { exact: true }).first().waitFor()
  await new Promise(resolve => setTimeout(resolve, 2500))
  const skipModel = page.getByRole('button', { name: '暂不配置', exact: true })
  if (await skipModel.count()) await skipModel.click()
  await app.evaluate(({ Menu }) => {
    globalThis.revealMenus = []
    const popup = Menu.prototype.popup
    Menu.prototype.popup = function (options) {
      globalThis.revealMenus.push(this.items.map(item => ({ id: item.id, label: item.label, enabled: item.enabled })))
      globalThis.lastRevealMenu = this
      return popup.call(this, options)
    }
  })

  // 经真实保存 IPC（与对话框同一主进程处理器）写入演示 Key；之后打开编辑对话框即“再次打开”。
  step('save demo model')
  const saved = await page.evaluate(key => window.desktop.settings({ type: 'save-model', revision: 0, model: {
    name: '演示模型', provider: 'deepseek', protocol: 'openai', modelId: 'deepseek-flash',
    endpoint: 'https://api.deepseek.com', kind: 'TEXT', contextWindow: 128000, enabled: true,
    thinkingLevels: [], defaultThinking: 'default', apiKey: key,
  } }), demoKey)
  check('演示模型经真实保存路径落盘', saved.models.length === 1 && saved.models[0].keyMask === '••••••••' && !('encryptedKey' in saved.models[0]))
  await page.evaluate(() => window.desktop.bootstrap()).then(boot => check('隔离数据根生效', boot.dataRoot === root, boot.dataRoot))

  step('open settings'); await page.evaluate(() => window.desktop.command('app.settings'))
  step('models section'); await page.locator('.desktop-settings-nav nav button', { hasText: '模型' }).click()
  step('edit model'); await page.getByLabel('编辑模型 演示模型').click()

  const keyField = page.getByLabel('API Key', { exact: true })
  await keyField.waitFor()
  step('wait refill'); await page.waitForFunction(() => document.querySelector('[aria-label="API Key"]').value.length > 0)
  const maskedValue = await keyField.inputValue()
  check('再次打开时输入框回填已保存 Key', maskedValue === demoKey)
  check('默认密文形态（type=password）', await keyField.getAttribute('type') === 'password')
  check('默认闭眼图标（aria-label 显示 API Key）', await page.getByLabel('显示 API Key', { exact: true }).count() === 1)
  await page.screenshot({ path: join(evidence, '01-masked-refilled.png') })

  // 密文态：右键菜单【复制】禁用，快捷键复制不动剪贴板。
  await app.evaluate(({ clipboard }) => clipboard.writeText('SENTINEL-NOT-COPIED'))
  await keyField.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+c')
  const afterMaskedCopy = await app.evaluate(({ clipboard }) => clipboard.readText())
  check('密文态快捷键复制无效', afterMaskedCopy === 'SENTINEL-NOT-COPIED')
  step('masked menu'); await keyField.click({ button: 'right' })
  for (let n = 0; n < 50 && (await app.evaluate(() => globalThis.revealMenus.length)) < 1; n++) await new Promise(resolve => setTimeout(resolve, 100))
  await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; globalThis.lastRevealMenu?.closePopup(win) })
  const maskedMenu = (await app.evaluate(() => globalThis.revealMenus)).at(-1)
  report.menus.push({ form: 'masked', items: maskedMenu })
  const maskedCopy = maskedMenu.find(item => item.id === 'text.copy')
  check('密文态右键菜单【复制】不可点击', maskedCopy && maskedCopy.label === '复制' && maskedCopy.enabled === false, JSON.stringify(maskedMenu))

  // 明文态：眼睛切换、可复制。鼠标按压眼睛按钮即完成一次切换；按压期间校验无动画。
  step('eye animation')
  const eyeButton = page.getByLabel('显示 API Key', { exact: true })
  const animStyle = await eyeButton.evaluate(el => { const cs = getComputedStyle(el); return { transitionProperty: cs.transitionProperty, transitionDuration: cs.transitionDuration } })
  check('眼睛按钮无过渡动画', animStyle.transitionProperty === 'none' || animStyle.transitionDuration === '0s', JSON.stringify(animStyle))
  const restY = await eyeButton.evaluate(el => el.getBoundingClientRect().y)
  const eyeBox = await eyeButton.boundingBox()
  await page.mouse.move(eyeBox.x + eyeBox.width / 2, eyeBox.y + eyeBox.height / 2)
  await page.mouse.down()
  const pressedY = await page.evaluate(() => document.querySelector('[aria-label="显示 API Key"]').getBoundingClientRect().y)
  check('按住眼睛按钮无下移动画', pressedY === restY, `静止 y=${restY} → 按住 y=${pressedY}`)
  await page.mouse.up()

  step('reveal plaintext')
  check('点击后睁眼明文（type=text）', await keyField.getAttribute('type') === 'text')
  check('图标切换为隐藏 API Key', await page.getByLabel('隐藏 API Key', { exact: true }).count() === 1)
  check('明文内容仍是已保存 Key', await keyField.inputValue() === demoKey)
  await page.screenshot({ path: join(evidence, '02-plaintext-revealed.png') })
  await keyField.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+c')
  const afterPlainCopy = await app.evaluate(({ clipboard }) => clipboard.readText())
  check('明文态快捷键复制生效', afterPlainCopy === demoKey)
  step('plain menu'); await keyField.click({ button: 'right' })
  for (let n = 0; n < 50 && (await app.evaluate(() => globalThis.revealMenus.length)) < 2; n++) await new Promise(resolve => setTimeout(resolve, 100))
  await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; globalThis.lastRevealMenu?.closePopup(win) })
  const plainMenu = (await app.evaluate(() => globalThis.revealMenus)).at(-1)
  report.menus.push({ form: 'plaintext', items: plainMenu })
  const plainCopy = plainMenu.find(item => item.id === 'text.copy')
  check('明文态右键菜单【复制】可点击', plainCopy && plainCopy.label === '复制' && plainCopy.enabled === true)

  // 切回密文。
  step('remask'); await page.getByLabel('隐藏 API Key', { exact: true }).click()
  check('再次点击回到闭眼密文', await keyField.getAttribute('type') === 'password' && await keyField.inputValue() === demoKey)
  await page.screenshot({ path: join(evidence, '03-remasked.png') })

  step('cleanup'); await app.evaluate(({ clipboard }) => clipboard.writeText(''))
  await app.close()
  report.finishedAt = new Date().toISOString()
  report.status = report.checks.every(row => row.ok) && report.errors.length === 0 ? 'passed' : 'failed'
} catch (error) {
  report.status = 'failed'
  report.errors.push(String(error?.stack ?? error).replaceAll(temporary, '<isolated>'))
} finally {
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  for (let n = 0; n < 10; n++) {
    try { await rm(temporary, { recursive: true, force: true }); break }
    catch { await new Promise(resolve => setTimeout(resolve, 700)) }
  }
}
console.log(`API Key reveal acceptance: ${report.status}`)
process.exit(report.status === 'passed' ? 0 : 1)
