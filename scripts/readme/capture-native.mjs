import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile, copyFile, lstat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { guardWorkspace } from './workspace-guard.mjs'

// Native capture only; no Playwright, app input, DOM modification or image edits.
assert.equal(process.platform, 'darwin')
const { base, fixture, configuredModelCount } = await guardWorkspace(process.argv[2], { allowConfiguredModels: true })
const processRecord = JSON.parse(await readFile(join(base, 'capture-process.json'), 'utf8'))
assert.equal(processRecord.scope, 'README isolated demo')
assert(Number.isInteger(processRecord.pid) && processRecord.pid > 0)
const scenes = {
  'workspace-paper.png': ['创作工作台', 'paper', '照夜渡'],
  'characters-paper.png': ['人物心理', 'paper', '照夜渡'],
  'world-paper.png': ['世界设定', 'paper', '照夜渡'],
  'foreshadows-paper.png': ['伏笔与触点', 'paper', '照夜渡'],
  'appearance-paper.png': ['首次运行主题选择', 'paper', null],
  'planning-ink.png': ['世界线规划', 'ink', '照夜渡'],
  'manuscript-ink.png': ['历史穿越正文预览', 'ink', '汴河来信'],
  'ai-workspace-paper.png': ['AI 对话与正文同屏', 'paper', null],
  'ai-workspace-three-column-paper.png': ['导航、AI 对话与正文三栏', 'paper', null],
  'narrative-ink.png': ['叙事线规划', 'ink', '照夜渡'],
}
const file = process.argv[3]
assert(Object.hasOwn(scenes, file), 'Use a checklist filename')
let conversationSource
if (['ai-workspace-paper.png', 'ai-workspace-three-column-paper.png', 'narrative-ink.png'].includes(file)) {
  const receiptPath = join(base, 'README-AI-CAPTURE.json')
  const info = await lstat(receiptPath)
  assert(info.isFile() && !info.isSymbolicLink() && info.size < 8192, 'Bounded regular chat receipt required')
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
  assert.equal(receipt.source, 'model-reply-observed-in-UI')
  assert.equal(receipt.status, 'complete')
  assert.equal(receipt.approvedRequestLimit, 2)
  assert(Number.isInteger(receipt.sentUserMessages) && receipt.sentUserMessages > 0 && receipt.sentUserMessages <= 2)
  assert.equal(receipt.usableReplies, 1)
  assert.equal(receipt.novelAssociated, false)
  conversationSource = { source: receipt.source, replySourceUserMessages: receipt.sentUserMessages, usableReplies: receipt.usableReplies, novelAssociated: false }
}
const run = promisify(execFile)
const windowID = Number((await run('swift', ['-module-cache-path', '/private/tmp/shakeink-readme-swift-cache', resolve('scripts/readme/window-id.swift'), String(processRecord.pid)])).stdout.trim())
assert(Number.isInteger(windowID) && windowID > 0)
const raw = join(base, file)
await run('/usr/sbin/screencapture', ['-x', '-o', '-l', String(windowID), raw])
const bytes = await readFile(raw), metadata = await sharp(bytes).metadata()
const { data, info } = await sharp(bytes).extract({ left: 0, top: 0, width: 210, height: 90 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const controls = { red: 0, yellow: 0, green: 0 }
let sharingIndicatorPixels = 0
for (let index = 0; index < data.length; index += info.channels) {
  const [r, g, b] = data.subarray(index, index + 3)
  if (r > 180 && g < 150 && b < 150) controls.red++
  if (r > 180 && g > 120 && b < 120) controls.yellow++
  if (g > 140 && r < 160 && b < 150) controls.green++
  if (b > 140 && r < 180 && g < 170 && b > r + 40 && b > g + 40) sharingIndicatorPixels++
}
// macOS draws real traffic lights gray when another app has focus. Reject
// the sharing pill; presence of all three actual buttons still needs visual QA.
assert(sharingIndicatorPixels < 60, 'Sharing indicator covers native controls; raw image stays temporary')
const output = resolve('docs/readme-assets')
await mkdir(output, { recursive: true })
await copyFile(raw, join(output, file))
const manifestPath = resolve('docs/readme-rewrite/03-material-manifest.json')
let report
try { report = JSON.parse(await readFile(manifestPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
report ??= { version: 1, date: '2026-10-15', status: 'in-progress', scope: 'macOS arm64 development Electron; prepared original fictional data; assistant makes no model calls during photography; no Windows or package acceptance', capture: 'screencapture -x -o -l <owned-window>; original pixels', contentSha256: fixture.contentSha256, screenshots: [] }
assert.equal(report.contentSha256, fixture.contentSha256)
report.scope = 'macOS arm64 development Electron; original fictional work data; model-use provenance recorded per AI image; no Windows or package acceptance'
if (report.review) report.previousReviews = [...new Set([...(report.previousReviews ?? []), report.review])]
delete report.review
report.status = 'awaiting-independent-review'
report.updatedAt = new Date().toISOString()
report.screenshots = report.screenshots.filter(row => row.file !== file)
report.screenshots.push({ file, title: scenes[file][0], theme: scenes[file][1], book: scenes[file][2], width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), configuredModelCount, ...(conversationSource ? { conversationSource } : {}), nativeControlColorPixels: controls, sharingIndicatorPixels, nativeControlsVisualReview: 'pending', visualReview: 'pending' })
await writeFile(manifestPath, JSON.stringify(report, null, 2) + '\n')
console.log('Native snapshot recorded; content and alerts still require independent visual review: ' + file)
