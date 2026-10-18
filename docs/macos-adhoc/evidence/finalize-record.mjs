// Finalize only external temporary-test metadata after actual evidence passes.
import {readFile,writeFile,rename,copyFile} from 'node:fs/promises'
import {createHash,randomUUID} from 'node:crypto'
import {resolve,join,basename} from 'node:path'
import assert from 'node:assert/strict'
const project=resolve(import.meta.dirname,'../../..')
const directory=join(project,'release/adhoc-macos-arm64-27fa8867-ecd9-4686-a30c-0851e34be0d0')
const reportName='startup-5a328271-b9f9-41e2-8306-c4d731bd6029.json'
const metadata=JSON.parse(await readFile(join(directory,'adhoc-test.json'),'utf8'))
const startup=JSON.parse(await readFile(join(directory,reportName),'utf8'))
const policy=JSON.parse(await readFile(join(import.meta.dirname,'native-policy.json'),'utf8'))
const core=JSON.parse(await readFile(join(import.meta.dirname,'core-final.json'),'utf8'))
assert.equal(metadata.format,'shakeink-adhoc-test-dmg');assert.equal(metadata.formalReleaseAccepted,false);assert.equal(metadata.notarized,false)
const bytes=await readFile(join(directory,metadata.artifact.name))
assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.artifact.sha256)
assert.equal(startup.sha256,metadata.artifact.sha256);assert.equal(policy.sha256,metadata.artifact.sha256)
assert.equal(startup.passed,true);assert.deepEqual(startup.errors,[])
assert.deepEqual(startup.launches.map(item=>item.phase),['first-launch','reopen'])
for(const launch of startup.launches){
 assert.equal(launch.passed,true);assert.deepEqual(launch.exit,{code:0,signal:null})
 for(const signature of [launch.signatureBefore,launch.signatureAfter]){assert.equal(signature.signature,'adhoc');assert.equal(signature.nativeObjects,26);assert.equal(signature.machOBinaries,17)}
 assert.equal(launch.native.packaged,true);assert.equal(launch.native.arch,'arm64');assert.equal(launch.native.rendererSandbox,true)
 assert.equal(launch.native.isolatedUserData,true);assert.equal(launch.native.appPathFromInstalledCopy,true)
 assert.equal(launch.localDatabaseAndIpc,true);assert.equal(launch.defaultModels,0);assert.equal(launch.themePersisted,'ink');assert.deepEqual(launch.rendererErrors,[])
 assert.equal(launch.rendererNetworkGuard.failure,'net::ERR_BLOCKED_BY_CLIENT')
}
assert.deepEqual(startup.tamperNegative,{exitCode:1,category:'sealed-resource-invalid'})
assert.equal(startup.installedCopySignatureAfterNegative.signature,'adhoc');assert.equal(startup.dmgUnchanged,true)
const assessment=policy.checks.find(item=>item.label==='Application Gatekeeper assessment')
assert.equal(assessment.exitCode,3);assert.match(assessment.stderr,/rejected/)
metadata.startup={status:'passed',report:reportName,scope:startup.scope,macOS:'27.0.1 (26A434)',launches:2,normalExitCodes:[0,0],tamperNegative:'sealed-resource-invalid'}
metadata.unverified=[...new Set([...metadata.unverified,...startup.unverified])]
metadata.appleTrust={status:'rejected',gatekeeperEnabled:true,spctlExitCode:3,notarized:false,tickets:'missing',evidence:'native-policy.json'}
metadata.regression={unitTests:{pass:35,fail:0},typecheck:'passed',core:{...core.counts,inputsUnchanged:core.inputsUnchanged},legacyPackageTests:{pass:45,fail:2,reason:'Old fixed artifact resources differ from newly rebuilt input; actual new DMG resources independently passed'}}
const temporary=join(directory,`adhoc-test-${randomUUID()}.tmp`)
await writeFile(temporary,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});await rename(temporary,join(directory,'adhoc-test.json'))
await copyFile(join(import.meta.dirname,'native-policy.json'),join(directory,'native-policy.json'))
const summary=`玄印写作 Ad-hoc 临时测试 DMG 验证摘要（2026-10-16）

安装包：${metadata.artifact.name}
SHA-256：${metadata.artifact.sha256}
大小：${metadata.artifact.size} 字节

已通过：DMG完整性；应用26个原生代码对象、17个Mach-O的arm64与Ad-hoc严格验签；资源与包内依赖；本机macOS 27.0.1 arm64真实安装副本首次启动、正常退出和重开；主题持久化、本地数据库/IPC、默认无模型、renderer沙盒保持开启；启动前后签名；改动自有副本封印资源被codesign拒绝；原DMG散列不变。

启动报告：${reportName}
签名及原生信任观察：adhoc-test.json、native-policy.json
安装操作：安装说明.txt

限制：应用使用Ad-hoc签名，DMG容器未签名；无Apple开发者身份、未公证、无票据。Gatekeeper实际拒绝（exit3），不能作为正式发布通过。原正式签名、公证门保留。未修改正常业务源码。

未验证：干净macOS 15.7.5/M4；微信真实下载隔离；Finder“仍要打开”实际点击；整应用断网首启。外层进程网络策略与Chromium沙盒冲突的两次失败原记录保留；最终只验证现有defaultSession协议过滤器的具体ERR_BLOCKED_BY_CLIENT拒绝，不代表整个应用的网络隔离。

回归：发布策略相关单元35/35、类型检查通过；全量core 2179项中2162通过、17项既有失败（无新增失败标题）；旧包回归47项中45通过、2项旧包与新构建输入资源不一致，未覆盖旧样本。完整业务验收不能称全部通过。
`
await writeFile(join(directory,'验证摘要.txt'),summary,{flag:'wx'})
await writeFile(join(import.meta.dirname,'delivery-final.json'),JSON.stringify({checkedAt:new Date().toISOString(),artifact:metadata.artifact,applicationSignature:'adhoc',containerSignature:'unsigned',notarized:false,startupReport:reportName,startupPassed:true,formalReleaseAccepted:false,unverified:metadata.unverified},null,2)+'\n')
console.log(JSON.stringify({finalized:true,directory,report:basename(reportName),sha256:metadata.artifact.sha256,formalReleaseAccepted:false}))
