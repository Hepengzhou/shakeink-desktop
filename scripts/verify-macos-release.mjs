import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {preflightMacRelease, verifyReleaseDirectory} from './macos-release.mjs'

const project = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
try {
  if (args.length === 1 && args[0] === '--preflight') {
    if (process.platform !== 'darwin') {
      console.log(JSON.stringify({stage: 'macos-signing-preflight', applicable: false, platform: process.platform}))
    } else {
      await preflightMacRelease()
      console.log(JSON.stringify({stage: 'macos-signing-preflight', ready: true}))
    }
  } else {
    if (process.platform !== 'darwin') throw new Error('macOS 发布包的系统信任校验必须在 macOS 执行')
    if (args.length !== 3 || args[1] !== '--team-id' || !/^[A-Z0-9]{10}$/.test(args[2])) throw new Error('用法：npm run package:verify:mac -- <已验包目录> --team-id <预期的10位Team ID>')
    const directory = resolve(args[0])
    await verifyReleaseDirectory(project, directory, {teamId: args[2]})
    console.log(JSON.stringify({stage: 'macos-release-reverified', directory, passed: true}))
  }
} catch (error) {
  // Command helpers expose bounded stage errors; never print env or credential values.
  console.error(error.message)
  process.exitCode = 1
}
