import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,readdir,symlink,lstat,rm} from 'node:fs/promises'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'

const load=()=>import('../../scripts/macos-adhoc.mjs')
const temporary=async(fn:(root:string)=>Promise<void>)=>{const root=await mkdtemp(join(tmpdir(),'shakeink-adhoc-unit-'));try{await fn(root)}finally{await rm(root,{recursive:true,force:true})}}
const minimalJit='<?xml version="1.0"?><plist><dict><key>com.apple.security.cs.allow-jit</key><true/></dict></plist>'
const display='Signature=adhoc\nTeamIdentifier=not set\nCodeDirectory v=20400 flags=0x2(adhoc) hashes=2+1\nSealed Resources version=2 rules=13 files=4\n'
type Call={tool:string;args:string[]}
const unsignedContainer=(image:string)=>Object.assign(new Error('private unsigned diagnostic'),{code:1,stderr:`${image}: code object is not signed at all\n`})
const containerProbe=(tool:string,args:string[])=>tool.endsWith('codesign')&&args.includes('--display')&&args.at(-1)?.endsWith('.dmg')
const goodRun=(calls:Call[],mutate?:(tool:string,args:string[])=>unknown)=>async(tool:string,args:string[])=>{calls.push({tool,args});const value=mutate?.(tool,args);if(value!==undefined)return value as {stdout?:string;stderr?:string};if(tool.endsWith('lipo'))return {stdout:'arm64\n'};if(args.includes('--entitlements')&&args.includes('--display'))return {stdout:minimalJit};if(args.includes('--display'))return {stderr:display};return {stdout:''}}
async function fixture(root:string){const stage=join(root,'release/.staging/adhoc-arm64-fixture');await mkdir(stage,{recursive:true});const app=join(stage,'source/玄印写作.app');const paths=['Contents/MacOS/玄印写作','Contents/Frameworks/Nested.app/Contents/MacOS/Nested','Contents/Frameworks/Safe.framework/Versions/A/Safe','Contents/Resources/app/addon.node','Contents/Resources/app/lib.dylib','Contents/Resources/app/helper'];for(const path of paths){await mkdir(dirname(join(app,path)),{recursive:true});await writeFile(join(app,path),Buffer.from([0xcf,0xfa,0xed,0xfe,0,0,0,0]))}await writeFile(join(app,'Contents/Resources/readme.txt'),'ordinary resource');await symlink('A',join(app,'Contents/Frameworks/Safe.framework/Versions/Current'));await symlink('Versions/Current/Safe',join(app,'Contents/Frameworks/Safe.framework/Safe'));const entitlements=join(root,'jit.plist');await writeFile(entitlements,minimalJit);return {stage,app,entitlements,paths}}

test('ADH-01 host/arguments are restricted before any write',async()=>{
 const {assertAdhocHost}=await load();assert.equal(assertAdhocHost('darwin','arm64',[]),'build');assert.equal(assertAdhocHost('darwin','arm64',['--preflight']),'preflight')
 for(const [platform,arch,args]of [['darwin','x64',[]],['win32','arm64',[]],['linux','arm64',[]],['darwin','arm64',['--zip']],['darwin','arm64',['--preflight','--preflight']]] as [string,string,string[]][])assert.throws(()=>assertAdhocHost(platform,arch,args))
})

test('ADH-02 derived config is dir-only and cannot weaken the original release path',async()=>{
 const {createAdhocConfiguration}=await load();const base={forceCodeSigning:true,publish:null,mac:{identity:'IDENTITY',notarize:true,hardenedRuntime:true,target:['dmg','zip'],entitlements:'build/entitlements.mac.plist'},dmg:{sign:true,writeUpdateInfo:false},win:{signExecutable:false},directories:{output:'release'},files:['dist/**']};const before=structuredClone(base)
 const derived=createAdhocConfiguration(base,'/tmp/release/.staging/adhoc-arm64-fixture/output')
 assert.deepEqual(base,before);assert.equal(derived.forceCodeSigning,false);assert.equal(derived.mac.identity,null);assert.equal(derived.mac.notarize,false);assert.equal(derived.mac.hardenedRuntime,false);assert.deepEqual(derived.mac.target,['dir']);assert.equal(derived.dmg.sign,false);assert.equal(derived.dmg.writeUpdateInfo,false);assert.equal(derived.publish,null);assert.deepEqual(derived.files,base.files)
 const {releaseMode,preflightMacRelease}=await import('../../scripts/macos-release.mjs');assert.throws(()=>releaseMode('darwin',['--adhoc']));await assert.rejects(preflightMacRelease({env:{}}),/APPLE_KEYCHAIN_PROFILE/)
})

test('ADH-03 scans all native files and nested bundles while allowing Framework version links',async()=>temporary(async root=>{
 const {scanAdhocCode}=await load();const {app,paths}=await fixture(root);const report=await scanAdhocCode(app);assert.equal(report.binaries.length,paths.length);for(const path of paths)assert(report.binaries.some((binary:string)=>binary.endsWith(path)));assert(report.objects.some((object:string)=>object.endsWith('Nested.app')));assert(report.objects.some((object:string)=>object.endsWith('Safe.framework')))
}))

test('ADH-03 scan rejects external, dangling, cyclic links and symlink roots',async()=>temporary(async root=>{
 const {scanAdhocCode}=await load()
 for(const type of ['external','dangling','cycle']){const own=join(root,type);await mkdir(own);const {app}=await fixture(own);const link=join(app,'Contents/Resources/link');await symlink(type==='external'?'/tmp':type==='dangling'?'missing':'cycle',link);if(type==='cycle')await symlink('link',join(app,'Contents/Resources/cycle'));await assert.rejects(scanAdhocCode(app),/链接/)}
 const {app}=await fixture(join(root,'root-link'));const alias=join(root,'alias.app');await symlink(app,alias);await assert.rejects(scanAdhocCode(alias),/根|目录|链接/)
}))

test('ADH-03/04 signing is stage-bounded and completes architecture preflight before writing',async()=>temporary(async root=>{
 const {signAdhocApp}=await load();const {app,stage,entitlements}=await fixture(root);const calls:Call[]=[]
 await assert.rejects(signAdhocApp(app,{allowedRoot:root,entitlements,run:goodRun(calls)}),/staging|stage|目录/);assert.equal(calls.length,0)
 await assert.rejects(signAdhocApp(app,{allowedRoot:stage,entitlements,run:goodRun(calls,(tool)=>tool.endsWith('lipo')?{stdout:'x86_64\n'}:undefined)}),/arm64|架构/);assert(!calls.some(call=>call.args.includes('--sign')))
 const alias=join(root,'alias');await symlink(stage,alias);await assert.rejects(signAdhocApp(app,{allowedRoot:alias,entitlements,run:goodRun([])}),/目录|链接|staging/)
}))

test('ADH-04 signs inner code before bundles/top-level, explicitly non-runtime and no deep signing',async()=>temporary(async root=>{
 const {signAdhocApp}=await load();const {app,stage,entitlements}=await fixture(root);const calls:Call[]=[];const report=await signAdhocApp(app,{allowedRoot:stage,entitlements,run:goodRun(calls)});assert.equal(report.signature,'adhoc')
 const signs=calls.filter(call=>call.args.includes('--sign'));assert(signs.length>=9);assert(signs.at(-1)!.args.at(-1)!.endsWith('/玄印写作.app'))
 for(const call of signs){assert.equal(call.tool,'/usr/bin/codesign');assert.equal(call.args[call.args.indexOf('--sign')+1],'-');assert(call.args.includes('--force'));assert(call.args.includes('--timestamp=none'));assert.equal(call.args[call.args.indexOf('--options')+1],'0');assert.equal(call.args[call.args.indexOf('--entitlements')+1],entitlements);assert(!call.args.includes('--deep'))}
 for(const bundle of ['Nested.app','Safe.framework']){const index=signs.findIndex(call=>call.args.at(-1)?.endsWith('/'+bundle));assert(index>=0);assert(signs.slice(0,index).some(call=>call.args.at(-1)?.includes('/'+bundle+'/')))}
 assert(calls.some(call=>call.args.includes('--verify')&&call.args.includes('--deep')&&call.args.includes('--strict')))
 assert(calls.filter(call=>call.tool.endsWith('lipo')).every(call=>!call.args.at(-1)?.endsWith('.app')&&!call.args.at(-1)?.endsWith('.framework')))
}))

test('ADH-04 midway signing failure halts later signatures and independent verification',async()=>temporary(async root=>{
 const {signAdhocApp}=await load();const {app,stage,entitlements}=await fixture(root);const calls:Call[]=[];let signs=0
 await assert.rejects(signAdhocApp(app,{allowedRoot:stage,entitlements,run:goodRun(calls,(_tool,args)=>{if(args.includes('--sign')&&++signs===2)throw new Error('controlled sign failure')})}),/codesign/)
 assert.equal(signs,2);assert(!calls.some(call=>call.args.includes('--verify')));assert(!calls.some(call=>call.args.includes('--sign')&&call.args.at(-1)?.endsWith('/玄印写作.app')))
}))

test('ADH-05 every object is independently verified; bad identity/runtime/entitlements/seal/arch rejects at its gate',async()=>temporary(async root=>{
 const {verifyAdhocApp,scanAdhocCode}=await load();const {app}=await fixture(root);const calls:Call[]=[];const scan=await scanAdhocCode(app);await verifyAdhocApp(app,{run:goodRun(calls)})
 for(const object of scan.objects)assert(calls.some(call=>call.args.includes('--verify')&&call.args.includes('--strict')&&call.args.at(-1)===object))
 for(const changed of [display.replace('Signature=adhoc','Signature=Developer ID'),display+'Authority=Developer ID Application: Fixture (ABC1234567)\n',display.replace('TeamIdentifier=not set','TeamIdentifier=ABC1234567'),display.replace('0x2(adhoc)','0x10002(adhoc,runtime)'),display.replace('Sealed Resources version=2 rules=13 files=4','Sealed Resources=none')])await assert.rejects(verifyAdhocApp(app,{run:goodRun([],(_tool,args)=>args.includes('--display')&&!args.includes('--entitlements')?{stderr:changed}:undefined)}))
 await assert.rejects(verifyAdhocApp(app,{run:goodRun([],(tool)=>tool.endsWith('lipo')?{stdout:'x86_64'}:undefined)}),/架构|arm64/)
 await assert.rejects(verifyAdhocApp(app,{run:goodRun([],(_tool,args)=>args.includes('--display')&&args.includes('--entitlements')?{stdout:minimalJit.replace('</dict>','<key>com.apple.security.cs.disable-library-validation</key><true/></dict>')}:undefined)}),/entitlement|权限|JIT/)
 await assert.rejects(verifyAdhocApp(app,{run:goodRun([],(_tool,args)=>{if(args.includes('--verify')&&args.at(-1)?.endsWith('addon.node'))throw new Error('controlled native integrity failure')})}),/codesign/)
}))

test('ADH-05 legal zero-resource nested Helper seal is allowed; top application still needs sealed resources',async()=>temporary(async root=>{
 const {verifyAdhocApp}=await load();const {app}=await fixture(root)
 await verifyAdhocApp(app,{run:goodRun([],(_tool,args)=>args.includes('--display')&&!args.includes('--entitlements')&&args.at(-1)?.endsWith('/Nested.app')?{stderr:display.replace('files=4','files=0')}:undefined)})
 await assert.rejects(verifyAdhocApp(app,{run:goodRun([],(_tool,args)=>args.includes('--display')&&!args.includes('--entitlements')&&args.at(-1)?.endsWith('/玄印写作.app')?{stderr:display.replace('files=4','files=0')}:undefined)}),/资源封印/)
}))

test('ADH-04 refuses excessive signing entitlement before any mutation',async()=>temporary(async root=>{
 const {signAdhocApp}=await load();const {app,stage,entitlements}=await fixture(root);await writeFile(entitlements,minimalJit.replace('allow-jit','allow-unsigned-executable-memory'));const calls:Call[]=[];await assert.rejects(signAdhocApp(app,{allowedRoot:stage,entitlements,run:goodRun(calls)}),/entitlement|权限|JIT/);assert(!calls.some(call=>call.args.includes('--sign')))
}))

test('ADH-06/07 DMG creation stays in own stage, never overwrites and verifies UDZO without signing container',async()=>temporary(async root=>{
 const {createAdhocDmg}=await load();const {stage,app}=await fixture(root);const image=join(stage,'ShakeInk-0.1.0-alpha-mac-arm64-adhoc-test.dmg');const calls:Call[]=[]
 // The controlled creation port is async, as production execFile is.
 await createAdhocDmg(dirname(app),image,{allowedRoot:stage,run:async(tool,args)=>{calls.push({tool,args});if(args[0]==='create')await writeFile(image,'controlled image');if(containerProbe(tool,args))throw unsignedContainer(image);return {stdout:''}}})
 assert.equal(calls[0].tool,'/usr/bin/hdiutil');assert(calls[0].args.includes('UDZO'));assert(!calls[0].args.includes('-ov'));assert.deepEqual(calls[1],{tool:'/usr/bin/hdiutil',args:['verify',image]});assert(!calls.some(call=>call.args.includes('--sign')))
 await assert.rejects(createAdhocDmg(dirname(app),image,{allowedRoot:stage,run:goodRun([])}),/存在|覆盖/)
 await assert.rejects(createAdhocDmg(dirname(app),join(root,'escape.dmg'),{allowedRoot:stage,run:goodRun([])}),/目录|stage|范围/)
}))

test('ADH-07 inner mounted verification failure detaches, and detach failure preserves the mount directory',async()=>temporary(async root=>{
 const {withMountedAdhocDmg}=await load();const image=join(root,'fixture.dmg');await writeFile(image,'controlled DMG')
 for(const detachFails of [false,true]){let mount='';const calls:Call[]=[];try{
  await assert.rejects(withMountedAdhocDmg(image,async point=>{mount=point;await writeFile(join(point,'sentinel'),'retain on detach failure');throw new Error('controlled inner validation failure')},{run:async(tool,args)=>{calls.push({tool,args});if(args[0]==='attach'){assert(args.includes('-readonly'));assert(args.includes('-nobrowse'));mount=args[args.indexOf('-mountpoint')+1]}if(args[0]==='detach'&&detachFails)throw new Error('controlled detach error');return {stdout:''}}}),detachFails?/hdiutil/:/controlled inner validation failure/)
  assert.equal(calls[0].args[0],'verify');assert.deepEqual(calls.at(-1),{tool:'/usr/bin/hdiutil',args:['detach',mount]})
  if(detachFails)assert.equal(await readFile(join(mount,'sentinel'),'utf8'),'retain on detach failure');else await assert.rejects(lstat(dirname(mount)),{code:'ENOENT'})
 }finally{if(mount)await rm(dirname(mount),{recursive:true,force:true})}}
}))

test('ADH-07 verifyAdhocDmg enters real mounted app validation and propagates failure before resource probing',async()=>temporary(async root=>{
 const {verifyAdhocDmg}=await load();const image=join(root,'fixture.dmg');await writeFile(image,'controlled DMG');const calls:Call[]=[];let mount=''
 await assert.rejects(verifyAdhocDmg(root,image,{run:async(tool,args)=>{calls.push({tool,args});if(containerProbe(tool,args))throw unsignedContainer(image);if(args[0]==='attach'){mount=args[args.indexOf('-mountpoint')+1];await mkdir(join(mount,'玄印写作.app/Contents/MacOS'),{recursive:true});await writeFile(join(mount,'玄印写作.app/Contents/MacOS/玄印写作'),Buffer.from([0xcf,0xfa,0xed,0xfe]))}if(tool.endsWith('lipo'))return {stdout:'arm64'};if(tool.endsWith('codesign'))throw new Error('controlled app integrity failure');return {stdout:''}}}),/codesign/)
 assert(calls.some(call=>call.tool.endsWith('codesign')&&call.args.includes('--verify')));assert.deepEqual(calls.at(-1),{tool:'/usr/bin/hdiutil',args:['detach',mount]});await assert.rejects(lstat(dirname(mount)),{code:'ENOENT'})
}))

test('ADH-06 actual container signature is read; signed or uncertain tools never report unsigned',async()=>temporary(async root=>{
 const {createAdhocDmg,verifyAdhocDmg}=await load();const {stage,app}=await fixture(root)
 const cases=['signed','unsigned','ambiguous-code1','missing-tool','permission','timeout']
 for(const state of cases){
  const image=join(stage,`${state}.dmg`),calls:Call[]=[]
  const run=async(tool:string,args:string[])=>{
   calls.push({tool,args});if(args[0]==='create'){await writeFile(image,'controlled DMG');return {stdout:''}}
   if(containerProbe(tool,args)){
    if(state==='signed')return {stderr:'Authority=Developer ID Application: Fixture (ABC1234567)\n'}
    if(state==='unsigned')throw unsignedContainer(image)
    if(state==='ambiguous-code1')throw Object.assign(new Error('SECRET diagnostic'),{code:1,stderr:`${image}: other malformed-object error\n`})
    if(state==='missing-tool')throw Object.assign(new Error('SECRET diagnostic'),{code:'ENOENT',stderr:''})
    if(state==='permission')throw Object.assign(new Error('SECRET diagnostic'),{code:'EACCES',stderr:'Permission denied'})
    throw Object.assign(new Error('SECRET diagnostic'),{killed:true,signal:'SIGTERM',stderr:''})
   }
   return {stdout:''}
  }
  if(state==='unsigned'){
   const result=await createAdhocDmg(dirname(app),image,{allowedRoot:stage,run});assert.equal(result.containerSignature,'unsigned');assert.equal(calls.filter(call=>containerProbe(call.tool,call.args)).length,1)
  }else{
   await assert.rejects(createAdhocDmg(dirname(app),image,{allowedRoot:stage,run}),error=>{assert.match(String(error),state==='signed'?/容器已签名/:/无法确认.*容器签名/);assert(!String(error).includes('SECRET'));return true})
   calls.length=0;await assert.rejects(verifyAdhocDmg(root,image,{run}),error=>{assert.match(String(error),state==='signed'?/容器已签名/:/无法确认.*容器签名/);assert(!String(error).includes('SECRET'));return true});assert(!calls.some(call=>call.args[0]==='attach'))
  }
 }
}))
