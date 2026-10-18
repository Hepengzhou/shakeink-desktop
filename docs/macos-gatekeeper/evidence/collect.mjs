// Read-only diagnostics for an existing macOS app; never signs or launches it.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {readFile, writeFile, realpath, stat, readdir, lstat} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve, join, relative} from 'node:path'

const execute = promisify(execFile)
const project = resolve(import.meta.dirname, '../../..')
const app = await realpath(process.argv[2])
const label = process.argv[3]
if (!/^[a-z0-9-]+$/.test(label ?? '')) throw new Error('Expected app path and safe evidence label')
const report = {startedAt: new Date().toISOString(), scope: 'Read-only local app diagnosis; not recipient-machine reproduction', app, commands: [], sourceHashes: {}, binaries: []}
async function command(file, args, timeout = 20000) {
  const startedAt = new Date().toISOString()
  let result
  try {
    const {stdout, stderr} = await execute(file, args, {timeout, maxBuffer: 1024 * 1024})
    result = {file, args, startedAt, code: 0, stdout, stderr}
  } catch (error) {
    result = {file, args, startedAt, code: error.code ?? null, signal: error.signal ?? null, killed: error.killed ?? false, stdout: error.stdout ?? '', stderr: error.stderr ?? '', message: error.message}
  }
  report.commands.push(result)
  await save()
  return result
}
async function save() {
  await writeFile(join(import.meta.dirname, `${label}.json`), JSON.stringify(report, null, 2) + '\n')
}
await command('/usr/bin/sw_vers', [])
await command('/usr/bin/uname', ['-m'])
await command('/usr/bin/git', ['-C', project, 'rev-parse', 'HEAD'])
await command('/usr/bin/git', ['-C', project, 'status', '--short'])
for (const path of ['electron-builder.config.cjs', 'scripts/package-desktop.mjs', 'scripts/macos-menu-localization.mjs', 'scripts/inspect-packaged-app.mjs', 'tests/unit/packaging-config.test.ts', 'desktop/shared/command-catalogs.generated.json']) {
  report.sourceHashes[path] = createHash('sha256').update(await readFile(join(project, path))).digest('hex')
}
const dmg = join(project, 'release/ShakeInk-0.1.0-alpha-mac-arm64.dmg')
report.dmg = {path: relative(project, dmg), bytes: (await stat(dmg)).size, sha256: createHash('sha256').update(await readFile(dmg)).digest('hex')}
await command('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=4', app])
await command('/usr/bin/codesign', ['--display', '--verbose=4', app])
await command('/usr/bin/syspolicy_check', ['distribution', app], 30000)
await command('/usr/sbin/spctl', ['--assess', '--type', 'execute', '--verbose=4', app])
await command('/usr/bin/xcrun', ['stapler', 'validate', app])
await command('/usr/bin/xattr', [app])
await command('/usr/bin/plutil', ['-convert', 'json', '-o', '-', join(app, 'Contents/Info.plist')])
async function walk(path) {
  for (const name of await readdir(path)) {
    const child = join(path, name), info = await lstat(child)
    if (info.isSymbolicLink()) continue
    if (info.isDirectory()) await walk(child)
    else if (info.isFile() && ((info.mode & 0o111) !== 0 || /\.(node|dylib)$/.test(name))) {
      const fd = await import('node:fs/promises').then(fs => fs.open(child, 'r'))
      const magic = Buffer.alloc(4)
      try {await fd.read(magic, 0, 4, 0)} finally {await fd.close()}
      if (['cffaedfe', 'cefaedfe', 'cafebabe', 'bebafeca'].includes(magic.toString('hex'))) {
        const binary = {path: relative(app, child), sha256: createHash('sha256').update(await readFile(child)).digest('hex')}
        report.binaries.push(binary)
        binary.architecture = await command('/usr/bin/lipo', ['-archs', child])
        binary.minimumOS = await command('/usr/bin/otool', ['-l', child])
        // Keep just deployment metadata rather than all Mach-O load commands.
        binary.minimumOS.stdout = binary.minimumOS.stdout.split('\n').filter(line => /LC_BUILD_VERSION|LC_VERSION_MIN_MACOSX/.test(line) || /\b(minos|sdk|version|platform)\b/.test(line)).join('\n')
        binary.signature = await command('/usr/bin/codesign', ['--verify', '--strict', '--verbose=2', child])
      }
    }
  }
}
await walk(join(app, 'Contents'))
report.completedAt = new Date().toISOString()
await save()
console.log(JSON.stringify({output: `${label}.json`, dmg: report.dmg, binaries: report.binaries.length, checks: report.commands.slice(4, 10).map(({file, code, stderr, stdout}) => ({file, code, stderr, stdout}))}, null, 2))
