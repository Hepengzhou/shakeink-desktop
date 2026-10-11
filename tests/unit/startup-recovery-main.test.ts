import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {transformSync} from 'esbuild'
import {BrandStartupPathError} from '../../desktop/main/brand-startup-paths'

// The actual last startup branch of desktop/main/index.ts is extracted and run
// against controlled dependencies; startup-recovery seams are stubbed, and the
// mutable module variables live on the bindings object so writes are visible.
const source=ts.createSourceFile('main.ts',readFileSync('desktop/main/index.ts','utf8'),ts.ScriptTarget.Latest,true)
const branch=source.statements.at(-1)!
assert.ok(branch&&ts.isIfStatement(branch)&&branch.getText(source).includes('app.requestSingleInstanceLock()'))
const loadSelection=source.statements.find(node=>node.getText(source).startsWith('try{startupPaths=selectBrandStartupPaths'))
assert.ok(loadSelection)
const branchCode=transformSync(branch.getText(source),{loader:'ts'}).code
const loadCode=transformSync(loadSelection.getText(source),{loader:'ts'}).code
interface RunResult{trace:string[];errors:string[];windows:{sourcePath:string|null;recoveryRoot:string}[];bindings:Record<string,any>}
function run(overrides:Record<string,unknown>|((bindings:Record<string,any>)=>Record<string,unknown>)={},load=false):RunResult{
 const trace:string[]=[],errors:string[]=[],windows:any[]=[]
 const bindings:Record<string,unknown>={
  app:{requestSingleInstanceLock:()=>true,hasSingleInstanceLock:()=>true,whenReady:()=>Promise.resolve(),getPath:(key:string)=>key==='appData'?'/appdata':`/path/${key}`,setPath(){},quit(){trace.push('quit')},exit(code:number){trace.push(`exit:${code}`)}},
  BrandStartupPathError,
  assertNoLegacyBackupRecovery:(_path:string,guard:()=>void)=>{trace.push('legacy');guard()},
  classifyStartupRecovery:(_paths:unknown,_family:unknown)=>{trace.push('classify');return{kind:'none'}},
  executeStartupRepair:async(_paths:unknown,repair:unknown,_family:unknown,_guards:unknown)=>{trace.push(`repair:${String(repair)}`)},
  selectBrandStartupPaths:()=>{trace.push('reselect');return{bootstrap:'/bootstrap',defaultRoot:'/reselected-root',encryptionFamily:'current'}},
  rootRelocationPreflight:()=>{trace.push('relocation-preflight');return{mode:'none',pointer:null}},
  launchRootRelocation:async()=>{trace.push('relocation-window')},
  rootMaintenanceRequired:()=>{trace.push('maintenance-preflight');return false},
  launchRootMaintenance:async()=>{trace.push('maintenance-window')},
  inboxLeaseRecoveryRequired:()=>{trace.push('inbox-preflight');return false},
  launchInboxLeaseRecovery:async()=>{trace.push('inbox-window')},
  launchStartupRecovery:async(_path:string,input:unknown)=>{const request=input as {sourcePath:string|null;recoveryRoot:string};trace.push('recovery-window');windows.push({sourcePath:request.sourcePath,recoveryRoot:request.recoveryRoot})},
  launch:async()=>{trace.push('ordinary')},
  bootstrapPath:'/bootstrap',
  startupPaths:{bootstrap:'/bootstrap',defaultRoot:'/root',encryptionFamily:'current'},
  startupSelectionError:null,
  isolatedRoot:null,
  join:(...parts:string[])=>parts.join('/'),
  resolve:(path:string)=>path,
  homedir:()=>'/home',
  dialog:{showErrorBox:(_title:string,message:string)=>{errors.push(message);trace.push('error-box')}},
  BrowserWindow:{getAllWindows:()=>[]},
  worker:undefined,window:undefined,repository:undefined,modelService:undefined,
  failedRootCode:null,ordinaryWorkerExited:false,
 }
 bindings.trace=trace
 Object.assign(bindings,typeof overrides==='function'?overrides(bindings):overrides)
 new Function('bindings',`with(bindings){${load?`${loadCode}\n`:''}${branchCode}}`)(bindings)
 return{trace,errors,windows,bindings:bindings as Record<string,any>}
}
const tick=async()=>{for(let count=0;count<20;count++)await new Promise(resolve=>setImmediate(resolve))}

test('SR-U-104 auto-init removes the dangling pointer, reselects matching paths and continues to ordinary launch',async()=>{
 const classify:string[]=[]
 const r=run({classifyStartupRecovery:()=>{classify.push('classify');return{kind:'auto-init'}}})
 await tick()
 assert.deepEqual(classify,['classify'])
 assert.deepEqual(r.trace,['legacy','repair:pointer','reselect','relocation-preflight','relocation-preflight','maintenance-preflight','inbox-preflight','ordinary'])
 assert.equal(r.bindings.startupPaths.defaultRoot,'/reselected-root','startupPaths updated from the reselection')
 assert.equal(r.bindings.startupSelectionError,null)
 assert.deepEqual(r.windows,[])
})
test('SR-U-104b a failing auto-init/repair execution degrades to the recovery window without a partial launch',async()=>{
 for(const kind of[{kind:'auto-init'},{kind:'repair',repair:'marker'}]){
  const trace:string[]=[]
  const r=run({classifyStartupRecovery:()=>{trace.push('classify');return kind},executeStartupRepair:async()=>{throw Error('controlled repair failure')}})
  await tick()
  assert.deepEqual(r.trace,['legacy','recovery-window']);assert.deepEqual(r.windows,[{sourcePath:null,recoveryRoot:'/home/.xaanink'}])
 }
})
test('SR-U-105 the dialog classification routes straight to the recovery window with its source path',async()=>{
 const r=run({classifyStartupRecovery:()=>({kind:'dialog',reason:'content-damaged',sourcePath:'/root'})})
 await tick()
 assert.deepEqual(r.trace,['legacy','recovery-window'])
 assert.deepEqual(r.windows,[{sourcePath:'/root',recoveryRoot:'/home/.xaanink'}])
})
test('SR-U-106 a startup barrier failure terminates the live worker before opening the recovery window',async()=>{
 const r=run(bindings=>({launch:async()=>{bindings.failedRootCode='ROOT_STARTUP_TIMEOUT';bindings.trace.push('ordinary');throw Error('ROOT_STARTUP_TIMEOUT')},worker:{terminate:async()=>{bindings.ordinaryWorkerExited=true;bindings.workerTerminated=true}}}))
 await tick()
 assert.deepEqual(r.trace,['legacy','classify','relocation-preflight','maintenance-preflight','inbox-preflight','ordinary','recovery-window'])
 assert.equal(r.bindings.workerTerminated,true,'worker terminated before the window')
 assert.equal(r.bindings.failedRootCode,null)
 assert.deepEqual(r.windows,[{sourcePath:'/root',recoveryRoot:'/home/.xaanink'}])
 assert.deepEqual(r.errors,[])
})
test('SR-U-106b worker already exited skips termination; terminate failure or window failure falls back to the error box',async()=>{
 const exited=run(bindings=>({launch:async()=>{bindings.failedRootCode='ROOT_STARTUP_TIMEOUT';throw Error('ROOT_STARTUP_TIMEOUT')},worker:{terminate:async()=>{throw Error('must not terminate an exited worker')}},ordinaryWorkerExited:true}))
 await tick()
 assert.deepEqual(exited.trace.slice(-1),['recovery-window']);assert.deepEqual(exited.errors,[])
 const terminateFails=run(bindings=>({launch:async()=>{bindings.failedRootCode='ROOT_STARTUP_FAILED';throw Error('ROOT_STARTUP_FAILED')},worker:{terminate:async()=>{bindings.trace.push('terminate-failed');throw Error('EPERM')}}}))
 await tick()
 assert.deepEqual(terminateFails.trace.slice(-3),['terminate-failed','error-box','exit:1']);assert.deepEqual(terminateFails.windows,[])
 const windowFails=run(bindings=>({launch:async()=>{bindings.failedRootCode='ROOT_INITIALIZATION_FAILED';throw Error('ROOT_INITIALIZATION_FAILED')},worker:{terminate:async()=>{bindings.ordinaryWorkerExited=true}},launchStartupRecovery:async()=>{throw Error('window failed')}}))
 await tick()
 assert.deepEqual(windowFails.trace.slice(-2),['error-box','exit:1'])
})
test('SR-U-107 legacy recovery pending, lock errors and bootstrap conflicts keep the plain error box',async()=>{
 const legacy=run({launch:async()=>{throw Error('LEGACY_BACKUP_RECOVERY_PENDING')}})
 await tick()
 assert.deepEqual(legacy.trace,['legacy','classify','relocation-preflight','maintenance-preflight','inbox-preflight','error-box','exit:1'])
 assert.ok(legacy.errors[0].includes('旧版本'));assert.deepEqual(legacy.windows,[])
 const lockedTrace:string[]=[]
 const locked=run({app:{requestSingleInstanceLock:()=>false,hasSingleInstanceLock:()=>false,whenReady:()=>Promise.resolve(),getPath:()=>'/x',setPath(){},quit(){lockedTrace.push('quit')},exit(){}}})
 await tick()
 assert.deepEqual(lockedTrace,['quit']);assert.deepEqual(locked.trace,[])
 const conflict=run({startupPaths:null,startupSelectionError:new BrandStartupPathError('BRAND_BOOTSTRAP_CONFLICT')})
 await tick()
 assert.deepEqual(conflict.trace,['error-box','exit:1']);assert.deepEqual(conflict.windows,[])
})
test('SR-U-108 a module-load BRAND_DEFAULT_INVALID carries family-aware recovery paths into classification',async()=>{
 const calls:{paths:unknown;family:unknown}[]=[]
 const r=run({
  selectBrandStartupPaths:()=>{throw new BrandStartupPathError('BRAND_DEFAULT_INVALID',{bootstrap:'/legacy-boot',defaultRoot:'/home/.xuanxiang',encryptionFamily:'legacy'})},
  classifyStartupRecovery:(paths:unknown,family:unknown)=>{calls.push({paths,family});return{kind:'dialog',reason:'default-invalid',sourcePath:null}},
 },true)
 await tick()
 assert.deepEqual(calls,[{paths:{bootstrap:'/bootstrap',recoveryRoot:'/home/.xuanxiang'},family:'legacy'}])
 assert.deepEqual(r.trace,['legacy','recovery-window']);assert.deepEqual(r.windows,[{sourcePath:null,recoveryRoot:'/home/.xuanxiang'}])
 assert.equal(r.bindings.startupPaths.encryptionFamily,'legacy')
})
test('SR-U-109 a reselection that would switch families is refused and never writes a pointer',async()=>{
 const r=run({
  startupPaths:{bootstrap:'/legacy-boot',defaultRoot:'/home/.xuanxiang',encryptionFamily:'legacy'},
  classifyStartupRecovery:()=>({kind:'auto-init'}),
  selectBrandStartupPaths:()=>({bootstrap:'/bootstrap',defaultRoot:'/home/.xaanink',encryptionFamily:'current'}),
 })
 await tick()
 assert.deepEqual(r.trace,['legacy','repair:pointer','recovery-window'])
 assert.deepEqual(r.windows,[{sourcePath:null,recoveryRoot:'/home/.xuanxiang'}])
 assert.equal(r.bindings.startupPaths.encryptionFamily,'legacy','original family selection retained')
})
test('SR-U-110 a none classification with a retained selection error reselects once, else opens the recovery window',async()=>{
 const healed=run({startupSelectionError:new BrandStartupPathError('BRAND_DEFAULT_INVALID',{bootstrap:'/bootstrap',defaultRoot:'/root',encryptionFamily:'current'})})
 await tick()
 assert.deepEqual(healed.trace,['legacy','classify','reselect','relocation-preflight','maintenance-preflight','inbox-preflight','ordinary'])
 assert.equal(healed.bindings.startupSelectionError,null)
 const stillBroken=run({startupSelectionError:new BrandStartupPathError('BRAND_DEFAULT_INVALID',{bootstrap:'/bootstrap',defaultRoot:'/root',encryptionFamily:'current'}),selectBrandStartupPaths:()=>{throw Error('still invalid')}})
 await tick()
 assert.deepEqual(stillBroken.trace,['legacy','classify','recovery-window'])
 assert.deepEqual(stillBroken.windows,[{sourcePath:null,recoveryRoot:'/home/.xaanink'}])
})
