import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Each original test file runs in a new Node process. A stuck process is a
// failed, incomplete file, never a passing test or a replacement assertion.
const tag = process.argv[2] ?? 'initial'
const startIndex = Number(process.argv[3] ?? 0)
if (!/^[a-z0-9-]+$/.test(tag) || !Number.isInteger(startIndex) || startIndex < 0) throw Error('Invalid evidence tag or start index')
const directory = resolve(`docs/evidence/chat-empty-state/browser-files-${tag}`)
const allFiles = readdirSync('tests/browser').filter(name => name.endsWith('.test.ts')).sort()
const files = allFiles.slice(startIndex)
if (files.length === 0) throw Error('No test files selected')
const startedAt = new Date().toISOString()
const sanitize = value => String(value).replaceAll(process.cwd(), '<repo>').replaceAll(tmpdir(), '<isolated-temp>').replaceAll(homedir(), '<home>')
const countKeys = ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
mkdirSync(directory, { recursive: true })

async function runFile(name) {
  const file = `tests/browser/${name}`
  const args = ['--import', 'tsx', '--test', '--test-reporter=tap', '--test-force-exit', '--test-concurrency=1', '--test-timeout=300000', file]
  const tap = join(directory, name.replace(/\.test\.ts$/, '.tap'))
  const fileStartedAt = new Date().toISOString()
  writeFileSync(tap, '')
  let raw = '', watchdogError = null, lastOutput = Date.now(), observedTests = false, exited = false, normallyClosed = false, cleanupCommandStatus = null
  const child = spawn(process.execPath, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
  const childSpawnedAt = new Date().toISOString()
  let resolveStopped
  let cleanupDone = null
  const stopped = new Promise(resolve => { resolveStopped = resolve })
  const closed = new Promise(resolve => {
    child.once('error', error => { watchdogError = sanitize(error); resolve(null) })
    child.once('exit', () => { exited = true })
    child.once('close', code => { normallyClosed = true; resolve(code) })
  })
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    raw += chunk.toString(); lastOutput = Date.now()
    observedTests ||= /^\s*(?:not )?ok \d+ - /m.test(raw)
    appendFileSync(tap, sanitize(chunk.toString()))
  })
  async function stop(reason) {
    if (watchdogError) return
    watchdogError = reason
    // The PID belongs to this freshly spawned child. Never enumerate or kill
    // unrelated browser processes. Windows needs the owned descendant tree.
    if (!exited && child.pid) {
      if (process.platform === 'win32') {
        await new Promise(resolve => {
          const killer = spawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
            ['-NoProfile', '-NonInteractive', '-File', resolve('scripts/stop-owned-test-tree.ps1'), '-OwnedTestPid', String(child.pid), '-RunnerPid', String(process.pid), '-StartedAt', fileStartedAt, '-SpawnedAt', childSpawnedAt], { stdio: 'ignore', windowsHide: true })
          const limit = setTimeout(() => { cleanupCommandStatus = 'timeout'; killer.kill(); killer.unref(); resolve() }, 10000)
          killer.once('error', () => { cleanupCommandStatus = 'spawn-error'; clearTimeout(limit); resolve() })
          killer.once('close', code => { cleanupCommandStatus ??= code; clearTimeout(limit); resolve() })
        })
      } else child.kill('SIGKILL')
    }
    // An exited child may have a descendant holding the pipe open. Its file
    // is still incomplete; closing our read ends only releases the runner.
    child.stdout.destroy(); child.stderr.destroy()
    await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 3000))])
    if (!exited) child.unref()
    resolveStopped(null)
  }
  const beginStop = reason => { cleanupDone ??= stop(reason) }
  const deadline = setTimeout(() => { beginStop('File exceeded 5 minutes including setup and teardown') }, 300000)
  const inactivity = setInterval(() => {
    if (observedTests && Date.now() - lastOutput >= 120000) beginStop('No test output for 2 minutes after observed cases; file teardown or next case incomplete')
  }, 1000)
  const exitCode = await Promise.race([closed, stopped])
  if (watchdogError && cleanupDone) await cleanupDone
  clearTimeout(deadline); clearInterval(inactivity)
  const output = sanitize(raw)
  writeFileSync(tap, output)
  const observedCounts = Object.fromEntries(countKeys.map(key => [key, Number([...output.matchAll(new RegExp('^# ' + key + ' (\\d+)', 'gm'))].at(-1)?.[1] ?? NaN)]))
  const complete = !watchdogError && normallyClosed && Number.isInteger(exitCode) &&
    countKeys.every(key => Number.isInteger(observedCounts[key]) && observedCounts[key] >= 0) &&
    observedCounts.tests === observedCounts.pass + observedCounts.fail + observedCounts.cancelled + observedCounts.skipped + observedCounts.todo
  const counts = complete ? observedCounts : null
  const report = {
    file, startedAt: fileStartedAt, completedAt: new Date().toISOString(),
    command: [process.execPath, ...args].map(sanitize), exitCode, complete,
    status: exitCode === 0 && complete && counts.fail === 0 && counts.cancelled === 0 ? 'passed' : 'failed',
    counts, observedCounts, failureTitles: [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]),
    ownedChildPid: child.pid, watchdogError, cleanupCommandStatus,
    cleanupFailure: watchdogError && child.pid && (!exited || (process.platform === 'win32' && cleanupCommandStatus !== 0)) ? 'Owned tree cleanup was not confirmed; stop before launching another file' : null,
    observedOkLines: (output.match(/^ok \d+ - /gm) ?? []).length,
    testHash: createHash('sha256').update(readFileSync(file)).digest('hex'),
  }
  writeFileSync(tap.replace(/\.tap$/, '.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ file, status: report.status, counts, watchdogError }))
  return report
}

const reports = []
for (const name of files) {
  const report = await runFile(name)
  reports.push(report)
  if (report.cleanupFailure) break
}
const unattemptedFiles = files.slice(reports.length).map(name => `tests/browser/${name}`)
const complete = reports.length === files.length && reports.every(report => report.complete)
const counts = complete ? Object.fromEntries(countKeys.map(key => [key, reports.reduce((sum, report) => sum + report.counts[key], 0)])) : null
const sources = ['src/components/layout/ChatPanel.tsx', 'src/components/layout/CreateNovelDialog.tsx', 'src/components/chat/ModelPicker.tsx', 'src/components/chat/use-agent-chat.ts', 'src/components/chat/ChatEmptyState.tsx', 'src/lib/chat-empty-state.ts', 'src/lib/creation-wizard/presets.ts']
const report = {
  scope: 'Selected sorted browser file slice from startIndex; sequential fresh processes and original assertions. A slice is not the whole repository suite. Watchdog terminations remain failed/incomplete; not native or supplier acceptance.',
  startedAt, completedAt: new Date().toISOString(), node: process.version, platform: process.platform,
  status: complete && reports.every(report => report.status === 'passed') ? 'passed' : 'failed',
  expectedFiles: files.length, repositoryFiles: allFiles.length, startIndex, files: reports.length, unattemptedFiles, complete, counts, passedFiles: reports.filter(report => report.status === 'passed').length,
  failedFiles: reports.filter(report => report.status !== 'passed').map(report => report.file), reports,
  hashes: Object.fromEntries(sources.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])),
}
writeFileSync(resolve(directory, `../browser-full-files-${tag}.json`), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ ...report, reports: undefined, hashes: undefined }))
process.exitCode = report.status === 'passed' ? 0 : 1
