import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import electron from 'electron'
import { guardWorkspace } from './workspace-guard.mjs'

// Launch only. All user-interface actions remain with the current CUA tool.
assert.equal(process.platform, 'darwin')
const resume = process.argv[3] === '--resume-demo'
assert(process.argv.length === 3 || (process.argv.length === 4 && resume), 'Only --resume-demo is accepted')
// Explicitly resume this strictly guarded fixture after the user configured it.
// This does not decrypt, print, alter or invoke configured models.
const { base, root } = await guardWorkspace(process.argv[2], { allowConfiguredModels: resume })
const environment = { ...process.env, SHAKEINK_TEST_ROOT: root }
delete environment.ELECTRON_RUN_AS_NODE
const child = spawn(electron, [resolve('.')], { env: environment, stdio: 'ignore' })
await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject) })
await writeFile(join(base, 'capture-process.json'), JSON.stringify({ pid: child.pid, startedAt: new Date().toISOString(), scope: 'README isolated demo' }) + '\n')
console.log('Isolated README app launched; use CUA for all UI actions. PID ' + child.pid)
child.on('exit', code => { process.exitCode = code ?? 1 })
