// Explicit temporary test distribution. The formal package entry is unchanged.
import {fileURLToPath} from 'node:url'
import {dirname,join,basename} from 'node:path'
import {createRequire} from 'node:module'
import {access,mkdir,mkdtemp,writeFile,symlink,rename,readFile,lstat} from 'node:fs/promises'
import {constants} from 'node:fs'
import {randomUUID,createHash} from 'node:crypto'
import {build,Platform} from 'electron-builder'
import {Arch} from 'builder-util'
import {inspectLocalRuntime} from './packaging-runtime.mjs'
import {preparePackageResources} from './prepare-package-resources.mjs'
import {installMacMenuLocalization} from './macos-menu-localization.mjs'
import {inspectPackagedApp,verifyPackagedDependencies} from './inspect-packaged-app.mjs'
import {runChecked} from './macos-release.mjs'
import {assertAdhocHost,createAdhocConfiguration,signAdhocApp,verifyAdhocDmg} from './macos-adhoc.mjs'

const project=dirname(dirname(fileURLToPath(import.meta.url)))
const mode=assertAdhocHost(process.platform,process.arch,process.argv.slice(2))
for(const tool of ['/usr/bin/codesign','/usr/bin/hdiutil','/usr/bin/lipo','/usr/bin/ditto'])await access(tool,constants.X_OK)
const gatekeeper=(await runChecked('/usr/sbin/spctl',['--status'])).stdout??''
if(!/assessments enabled/i.test(gatekeeper))throw new Error('Gatekeeper 未启用，不能验收临时测试包')
const runtime=await inspectLocalRuntime(project,process.platform,process.arch)
if(mode==='preflight'){
  console.log(JSON.stringify({stage:'adhoc-preflight',platform:process.platform,arch:process.arch,electron:runtime.version,gatekeeper:'enabled',certificate:'not-used'}))
}else{
  // Avoid discovering/importing signing credentials even if the build shell has
  // them configured. This affects this temporary process, not the parent shell.
  for(const name of ['CSC_LINK','CSC_KEY_PASSWORD','CSC_KEYCHAIN','CSC_NAME','CSC_KEYCHAIN_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_KEYCHAIN_PROFILE','APPLE_KEYCHAIN','APPLE_API_KEY','APPLE_API_KEY_ID','APPLE_API_ISSUER'])delete process.env[name]
  process.env.CSC_IDENTITY_AUTO_DISCOVERY='false'
  const require=createRequire(import.meta.url)
  const base=require(join(project,'electron-builder.config.cjs'))
  const version=JSON.parse(await readFile(join(project,'package.json'),'utf8')).version
  if(!/^[0-9A-Za-z.+-]+$/.test(version)||typeof base.productName!=='string'||basename(base.productName)!==base.productName)throw new Error('不安全的临时产物名称')
  const release=join(project,'release'),stagingRoot=join(release,'.staging')
  await mkdir(stagingRoot,{recursive:true})
  const stage=await mkdtemp(join(stagingRoot,'adhoc-arm64-'))
  const buildOutput=join(stage,'build'),volume=join(stage,'volume')
  await mkdir(volume)
  await preparePackageResources(project)
  const config={
    ...createAdhocConfiguration(base,buildOutput),
    electronDist:runtime.electronDist,
    afterPack:async context=>{
      const app=join(context.appOutDir,`${context.packager.appInfo.productFilename}.app`)
      await installMacMenuLocalization(app)
      await inspectPackagedApp(project,app)
      await verifyPackagedDependencies(join(app,'Contents/Resources/app'))
    },
  }
  console.log(JSON.stringify({stage:'adhoc-build',platform:'darwin',arch:'arm64',electron:runtime.version,notarized:false,publish:'never'}))
  await build({projectDir:project,config,publish:'never',targets:Platform.MAC.createTarget('dir',Arch.arm64)})
  const appName=`${base.productName}.app`,application=join(volume,appName)
  await runChecked('/usr/bin/ditto',[join(buildOutput,'mac-arm64',appName),application],{timeout:180000})
  const signature=await signAdhocApp(application,{allowedRoot:stage,entitlements:join(project,'build/entitlements.mac.plist')})
  const instructions=`玄印写作 macOS arm64 临时测试包（${version}）

此包内的应用及原生组件使用 Ad-hoc 签名，不包含 Apple 验证的开发者身份。
DMG 容器未签名、未公证。本包不代表正式发布的签名、公证验收通过。

安装与“仍要打开”
1. 完整下载 DMG，挂载后把“${appName}”拖入 Applications（应用程序）。
2. 从“应用程序”打开玄印写作。若系统提示开发者无法验证或 Apple 无法检查恶意软件，关闭该提示。
3. 打开“系统设置 → 隐私与安全性”，向下滚动到“安全性”。
4. 如果出现玄印写作对应的“仍要打开”，点击它，按系统提示认证并确认“打开”。此入口通常只在尝试打开后约一小时内显示。
5. 该操作为单个应用建立用户例外；它不会让此包变为已公证应用。

如果提示“已损坏”、没有“仍要打开”，或仍无法启动，请保留系统版本、完整错误及 DMG 的 SHA-256 并反馈，按该环境未通过处理。
本说明不保证每个系统/受管理设备都提供上述入口。没有为用户关闭 Gatekeeper 或清除下载隔离的步骤。

测试范围
实际签名完整性和本机启动结果见包外的检查清单与测试报告；这些结果不等于已在你的设备验证。
干净 macOS 15.7.5 / M4、微信真实下载后的隔离与“仍要打开”、目标机断网首启须分别实测。
应用运行时使用正常的数据目录；本轮自动启动测试使用另建的隔离测试目录。

Apple 官方操作说明：https://support.apple.com/zh-cn/102445
`
  await writeFile(join(volume,'安装说明.txt'),instructions,{flag:'wx'})
  await symlink('/Applications',join(volume,'Applications'))
  const name=`ShakeInk-${version}-mac-arm64-adhoc-test.dmg`,image=join(stage,name)
  // hdiutil creates an unsigned container. Only the inner app is Ad-hoc signed.
  const {createAdhocDmg}=await import('./macos-adhoc.mjs')
  await createAdhocDmg(volume,image,{allowedRoot:stage})
  const archiveCheck=await verifyAdhocDmg(project,image)
  const stat=await lstat(image)
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error('临时 DMG 必须为普通文件')
  const sha256=createHash('sha256').update(await readFile(image)).digest('hex')
  const delivery=join(stage,'.delivery')
  await mkdir(delivery)
  await rename(image,join(delivery,name))
  await writeFile(join(delivery,'安装说明.txt'),instructions,{flag:'wx'})
  await writeFile(join(delivery,'SHA256SUMS.txt'),`${sha256}  ${name}\n`,{flag:'wx'})
  const sanitize=value=>JSON.parse(JSON.stringify(value).replaceAll(stage,'<staging>').replaceAll(project,'<project>'))
  const manifest={format:'shakeink-adhoc-test-dmg',schemaVersion:1,version,platform:'darwin',arch:'arm64',checkedAt:new Date().toISOString(),artifact:{name,size:stat.size,sha256},applicationSignature:'adhoc',containerSignature:'unsigned',notarized:false,formalReleaseAccepted:false,hardenedRuntime:false,staticVerification:sanitize({signature,archiveCheck}),startup:{status:'not-run',scope:'Separate actual installed-copy startup report required'},unverified:['clean macOS 15.7.5/M4','real WeChat download quarantine and Open Anyway','target-machine offline first launch','complete business acceptance']}
  await writeFile(join(delivery,'adhoc-test.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'})
  const destination=join(release,`adhoc-macos-arm64-${randomUUID()}`)
  await rename(delivery,destination)
  console.log(JSON.stringify({stage:'adhoc-static-verified',directory:destination,dmg:join(destination,name),sha256,notarized:false,startup:'not-run'},null,2))
}
