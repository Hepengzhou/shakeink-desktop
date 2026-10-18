// Inspect the immutable DMG payload and compare it with local build inputs.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {readFile, writeFile, stat} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join, resolve} from 'node:path'
const execute = promisify(execFile)
const project = resolve(import.meta.dirname, '../../..')
const native = JSON.parse(await readFile(join(import.meta.dirname, 'dmg-native.json'), 'utf8'))
const manifest = JSON.parse(await readFile(join(project, 'release/package-static-darwin-arm64.json'), 'utf8')).contents
const sha = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const report = {checkedAt: new Date().toISOString(), commands: [], compared: [], deployment: [], sourceUnchanged: {}}
async function command(file, args) {
  try {const {stdout, stderr} = await execute(file, args, {timeout: 30000, maxBuffer: 1024 * 1024}); report.commands.push({file, args, code: 0, stdout, stderr})}
  catch (error) {report.commands.push({file, args, code: error.code ?? null, signal: error.signal ?? null, stdout: error.stdout ?? '', stderr: error.stderr ?? ''})}
}
for (const path of ['Contents/Info.plist', 'Contents/MacOS/玄印写作', 'Contents/Resources/app/dist/main/index.cjs', 'Contents/Resources/app/dist/service/index.cjs']) {
  const dmg = await sha(join(native.app, path)), unpacked = await sha(join(project, 'release/mac-arm64/玄印写作.app', path))
  report.compared.push({path, dmg, unpacked, recordedBuild: manifest.files.find(file => file.path === path)?.sha256, equal: dmg === unpacked && dmg === manifest.files.find(file => file.path === path)?.sha256})
}
report.runtimeExecutable = {raw: await sha(join(project, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')), packaged: await sha(join(native.app, 'Contents/MacOS/玄印写作'))}
await command('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', join(project, 'node_modules/electron/dist/Electron.app')])
const dmg = join(project, native.dmg.path)
await command('/usr/bin/hdiutil', ['verify', dmg])
await command('/usr/bin/codesign', ['--display', '--verbose=4', dmg])
await command('/usr/bin/xcrun', ['stapler', 'validate', dmg])
for (const binary of native.binaries) {
  const minos = [...binary.minimumOS.stdout.matchAll(/^\s*minos\s+(\S+)/gm)].map(match => match[1])
  report.deployment.push({path: binary.path, architectures: binary.architecture.stdout.trim(), minos, signatureExit: binary.signature.code})
}
for (const [path, expected] of Object.entries(native.sourceHashes)) report.sourceUnchanged[path] = {expected, actual: await sha(join(project, path)), equal: expected === await sha(join(project, path))}
report.dmgUnchanged = {bytes: (await stat(dmg)).size, sha256: await sha(dmg), equal: native.dmg.sha256 === await sha(dmg)}
await writeFile(join(import.meta.dirname, 'comparison.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({compared: report.compared.map(({path, equal})=>({path, equal})), runtimeExecutable: report.runtimeExecutable, commands: report.commands.map(({file, code, stderr, stdout})=>({file, code, stderr, stdout})), deployment: report.deployment, sourceUnchanged: Object.values(report.sourceUnchanged).every(row=>row.equal), dmgUnchanged: report.dmgUnchanged}, null, 2))
