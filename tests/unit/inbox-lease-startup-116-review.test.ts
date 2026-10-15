import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {hostname,tmpdir} from 'node:os'
import {mkdtemp,mkdir,realpath,writeFile,readFile,rm,lstat,readdir} from 'node:fs/promises'
import {join} from 'node:path'
import ts from 'typescript'
import {transformSync} from 'esbuild'
import {DataRootManager} from '../../desktop/core/data-root'
import {directoryIdentity} from '../../desktop/core/root-ownership'
import {inboxLeaseRecoveryRequired} from '../../desktop/main/inbox-lease-recovery'
import {assertNoLegacyBackupRecovery} from '../../desktop/main/legacy-recovery-preflight'
import {rootRelocationPreflight} from '../../desktop/main/root-relocation-preflight'
import {rootMaintenanceRequired} from '../../desktop/main/root-maintenance-preflight'
import {RootMigrationRequests} from '../../desktop/main/root-migration-request'
import {classifyStartupRecovery,executeStartupRepair} from '../../desktop/main/startup-recovery'

const source=ts.createSourceFile('main.ts',readFileSync('desktop/main/index.ts','utf8'),ts.ScriptTarget.Latest,true)
const branch=source.statements.at(-1)
assert.ok(branch&&ts.isIfStatement(branch)&&branch.getText(source).includes('app.requestSingleInstanceLock()'))
const code=transformSync(branch.getText(source),{loader:'ts'}).code
async function fixture(existing=true){
 const base=await realpath(await mkdtemp(join(tmpdir(),'xuanxiang-inbox-startup116-'))),boot=join(base,'bootstrap'),root=join(base,'root'),inbox=join(root,'inbox'),lock=join(inbox,'.xuanxiang-lock')
 await mkdir(boot)
 if(existing){await mkdir(join(inbox,'database'),{recursive:true});await writeFile(join(root,'xuanxiang-app.json'),JSON.stringify({schemaVersion:1,app:'Xuanxiangxiezuo-Desktop',id:randomUUID(),phase:'ready',inboxReady:true}));await writeFile(join(root,'catalog.json'),JSON.stringify({schemaVersion:1,revision:0,value:[]}));await new DataRootManager(boot,root).adopt(await directoryIdentity(root))}
 return{base,boot,root,inbox,lock,cleanup:()=>rm(base,{recursive:true,force:true})}
}
async function start(boot:string,defaultRoot:string,overrides?:(deps:Record<string,unknown>)=>Record<string,unknown>){
 const trace:string[]=[],exits:number[]=[]
 const deps:Record<string,unknown>={app:{requestSingleInstanceLock:()=>true,hasSingleInstanceLock:()=>true,getPath:()=>'/unused-appdata',exit(code:number){exits.push(code)},quit(){trace.push('quit')}},BrowserWindow:{getAllWindows:()=>[]},assertNoLegacyBackupRecovery:(path:string,guard:()=>void)=>{trace.push('legacy');assertNoLegacyBackupRecovery(path,guard)},classifyStartupRecovery:(paths:{bootstrap:string;recoveryRoot:string},family:'legacy'|'current')=>{trace.push('classify');return classifyStartupRecovery(paths,family)},executeStartupRepair:async()=>{throw Error('unexpected repair in inbox lease fixture')},selectBrandStartupPaths:()=>{throw Error('unexpected reselection in inbox lease fixture')},offerConfigReset:async()=>{trace.push('reset-offer')},launchStartupRecovery:async()=>{trace.push('recovery-window')},samePath:(a:string,b:string)=>a===b,rootRelocationPreflight:(path:string)=>{trace.push('relocation');return rootRelocationPreflight(path)},rootMaintenanceRequired:(path:string)=>{trace.push('maintenance');return rootMaintenanceRequired(path)},inboxLeaseRecoveryRequired:(pointer:Parameters<typeof inboxLeaseRecoveryRequired>[0])=>{trace.push('inbox');return inboxLeaseRecoveryRequired(pointer)},recoverInboxLeaseAutomatically:async(_path:string,options:{assertColdHost:()=>void})=>{trace.push('inbox-auto');options.assertColdHost();return false},launchRootRelocation:async()=>{trace.push('relocation-window')},launchRootMaintenance:async(path:string,root:string)=>{assert.equal(path,boot);assert.equal(root,defaultRoot);trace.push('maintenance-window')},launchInboxLeaseRecovery:async(_path:string,guard:()=>void)=>{trace.push('inbox-cold');guard()},launch:async()=>{trace.push('ordinary')},bootstrapPath:boot,startupPaths:{bootstrap:boot,defaultRoot,encryptionFamily:'legacy'},startupSelectionError:null,isolatedRoot:null,join,resolve:(path:string)=>path,homedir:()=>'/unused-fixture-home',dialog:{showErrorBox(){trace.push('blocked-error')}}}
 deps.trace=trace
 if(overrides)Object.assign(deps,overrides(deps))
 new Function(...Object.keys(deps),`let worker,window,repository,modelService;let failedRootCode=null,ordinaryWorkerExited=false;${code}`)(...Object.values(deps))
 const terminal=(entry:string)=>['ordinary','recovery-window','reset-offer','blocked-error','inbox-window','inbox-cold','relocation-window','maintenance-window'].includes(entry)
 for(let count=0;count<500&&!exits.length&&!trace.some(terminal);count++)await new Promise<void>(resolve=>setTimeout(resolve,10))
 return{trace,exits}
}
test('IL116-S01 real first-start and existing-root filesystem triage retain ordinary routing with no recovery writes',async()=>{
 for(const existing of [false,true]){const f=await fixture(existing);try{
  const {trace,exits}=await start(f.boot,f.root);assert.deepEqual(trace,['legacy','classify','relocation','maintenance','inbox','ordinary']);assert.deepEqual(exits,[])
  await assert.rejects(lstat(join(f.boot,'session')),{code:'ENOENT'});if(existing)await assert.rejects(lstat(join(f.inbox,'.xuanxiang-lease-recovery.json')),{code:'ENOENT'})
 }finally{await f.cleanup()}}
})
test('IL116-S02 actual main branch auto-repairs an inbox lease before the ordinary host and rechecks original triage in its cold guard',async()=>{
 const f=await fixture();try{
  await mkdir(f.lock);const bytes=JSON.stringify({token:randomUUID(),pid:process.pid,host:hostname()});await writeFile(join(f.lock,'owner.json'),bytes)
  const {trace,exits}=await start(f.boot,f.root);assert.deepEqual(trace,['legacy','classify','relocation','maintenance','inbox','inbox-auto','legacy','relocation','maintenance','inbox-cold','legacy','relocation','maintenance']);assert.deepEqual(exits,[]);assert.equal(await readFile(join(f.lock,'owner.json'),'utf8'),bytes)
 }finally{await f.cleanup()}
})
test('IL116-S03 genuine armed migration retains maintenance priority over an existing inbox lock',async()=>{
 const f=await fixture();try{
  await mkdir(f.lock);await writeFile(join(f.lock,'owner.json'),'retained lock bytes')
  const target=join(f.base,'new-root');await mkdir(target);const manager=new DataRootManager(f.boot,f.root),nonce=randomUUID()
  const requests=new RootMigrationRequests(f.boot,{resolveSource:()=>manager.resolve(),assertStableLock(){},assertOwner(value){assert.equal(value,nonce)},assertClosed(){}})
  const prepared=await requests.prepare(nonce,await directoryIdentity(target));await requests.arm(nonce,prepared.requestId)
  const {trace,exits}=await start(f.boot,f.root);assert.deepEqual(trace,['legacy','classify','relocation','maintenance','maintenance-window']);assert.deepEqual(exits,[]);assert.equal(await readFile(join(f.lock,'owner.json'),'utf8'),'retained lock bytes')
 }finally{await f.cleanup()}
})
test('IL116-S04 unknown inbox audit blocks actual top-level startup without either ordinary or repair launch',async()=>{
 const f=await fixture();try{
  const path=join(f.inbox,'.xuanxiang-lease-recovery.json');await writeFile(path,'unknown audit bytes')
  const {trace,exits}=await start(f.boot,f.root);assert.deepEqual(trace,['legacy','classify','relocation','maintenance','inbox','blocked-error']);assert.deepEqual(exits,[1]);assert.equal(await readFile(path,'utf8'),'unknown audit bytes')
 }finally{await f.cleanup()}
})
test('IL116-S05 an unparseable root pointer is quarantined by real startup repair and launch continues',async()=>{
 const base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-startup116-pointer-'))),root=join(base,'data'),boot=root+'-bootstrap'
 try{
  await mkdir(join(root,'inbox','database'),{recursive:true});await mkdir(boot)
  await writeFile(join(root,'shakeink-app.json'),JSON.stringify({schemaVersion:1,app:'ShakeInk',id:randomUUID(),phase:'ready',inboxReady:true}))
  await writeFile(join(root,'catalog.json'),JSON.stringify({schemaVersion:1,revision:0,value:[]}))
  await writeFile(join(boot,'data-root.json'),'{broken pointer')
  const {trace,exits}=await start(boot,root,deps=>({
   isolatedRoot:root,
   startupPaths:{bootstrap:boot,defaultRoot:root,encryptionFamily:'current'},
   executeStartupRepair:async(paths:{bootstrap:string;recoveryRoot:string},repair:'pointer'|'marker'|'marker-new-id'|'resume-init'|'content',family:'legacy'|'current',guards:{assertLock():void})=>{(deps.trace as string[]).push(`repair:${repair}`);await executeStartupRepair(paths,repair,family,guards)},
   selectBrandStartupPaths:()=>{(deps.trace as string[]).push('reselect');return{bootstrap:boot,defaultRoot:root,encryptionFamily:'current'}},
  }))
  assert.deepEqual(trace,['legacy','classify','repair:pointer','reselect','relocation','relocation','maintenance','inbox','ordinary']);assert.deepEqual(exits,[])
  const entries=await readdir(boot),quarantined=entries.filter(name=>/^data-root\.corrupt-.+\.json$/.test(name))
  assert.equal(quarantined.length,1);assert.equal(await readFile(join(boot,quarantined[0]),'utf8'),'{broken pointer')
  await assert.rejects(lstat(join(boot,'data-root.json')),{code:'ENOENT'})
 }finally{await rm(base,{recursive:true,force:true})}
})
test('IL116-S06 a missing inbox/database/catalog is rebuilt by real content repair and launch continues',async()=>{
 for(const kind of ['inbox','database+catalog']){
  const base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-startup116-content-'))),root=join(base,'data'),boot=root+'-bootstrap'
  try{
   const id=randomUUID()
   await mkdir(join(root,'inbox','database'),{recursive:true});await mkdir(boot)
   await writeFile(join(root,'shakeink-app.json'),JSON.stringify({schemaVersion:1,app:'ShakeInk',id,phase:'ready',inboxReady:true}))
   await writeFile(join(root,'catalog.json'),JSON.stringify({schemaVersion:1,revision:0,value:[]}))
   await writeFile(join(root,'inbox','database','PG_VERSION'),'17\n')
   await new DataRootManager(boot,root).adopt(await directoryIdentity(root))
   if(kind==='inbox')await rm(join(root,'inbox'),{recursive:true,force:true})
   else{await rm(join(root,'inbox','database'),{recursive:true,force:true});await rm(join(root,'catalog.json'),{force:true})}
   const {trace,exits}=await start(boot,root,deps=>({
    isolatedRoot:root,
    startupPaths:{bootstrap:boot,defaultRoot:root,encryptionFamily:'current'},
    executeStartupRepair:async(paths:{bootstrap:string;recoveryRoot:string},repair:'pointer'|'marker'|'marker-new-id'|'resume-init'|'content',family:'legacy'|'current',guards:{assertLock():void})=>{(deps.trace as string[]).push(`repair:${repair}`);await executeStartupRepair(paths,repair,family,guards)},
    selectBrandStartupPaths:()=>{(deps.trace as string[]).push('reselect');return{bootstrap:boot,defaultRoot:root,encryptionFamily:'current'}},
   }))
   assert.deepEqual(trace,['legacy','classify','repair:content','reselect','relocation','relocation','maintenance','inbox','ordinary']);assert.deepEqual(exits,[])
   const inbox=await lstat(join(root,'inbox')),database=await lstat(join(root,'inbox','database'))
   assert.equal(inbox.isDirectory()&&!inbox.isSymbolicLink(),true);assert.equal(database.isDirectory()&&!database.isSymbolicLink(),true)
   assert.deepEqual(JSON.parse(await readFile(join(root,'catalog.json'),'utf8')),{schemaVersion:1,revision:0,value:[]})
   const marker=JSON.parse(await readFile(join(root,'shakeink-app.json'),'utf8'))
   assert.equal(marker.id,id);assert.equal(marker.inboxReady,false)
   const bootEntries=await readdir(boot),pointerQuarantine=bootEntries.filter(name=>/^data-root\.corrupt-.+\.json$/.test(name))
   assert.equal(pointerQuarantine.length,1);assert.equal(JSON.parse(await readFile(join(boot,pointerQuarantine[0]),'utf8')).rootId,id)
   assert.equal(bootEntries.includes('data-root.json'),false)
  }finally{await rm(base,{recursive:true,force:true})}
 }
})
