import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomUUID} from 'node:crypto'
import {mkdtemp,mkdir,writeFile,rename,rm,realpath} from 'node:fs/promises'
import {writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DataRootManager} from '../../desktop/core/data-root'
import {directoryIdentity} from '../../desktop/core/root-ownership'
import {RootRelocationController,RootRelocationControllerError,type RootRelocationControllerOptions} from '../../desktop/main/root-relocation-controller'
import type {RootRelocationPhase,RootRelocationState} from '../../desktop/shared/root-relocation'

const deferred=<T,>()=>{let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no});return{resolve,reject,promise}}
async function fixture(extra:Partial<RootRelocationControllerOptions>={},mode:'blocked'|'lost'='blocked'){
 const base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-recovery-controller-'))),boot=join(base,'boot'),defaultRoot=join(base,'root'),owner=randomUUID()
 await mkdir(boot)
 let wipes=0,restarts=0,quits=0,picks=0
 const trace:string[]=[]
 const options:RootRelocationControllerOptions={bootstrap:await directoryIdentity(boot),mode,theme:'paper',notice:mode==='blocked'?'pointer-invalid':undefined,defaultPath:defaultRoot,assertStableLock(){},assertCold(){},assertOwner(nonce){if(nonce!==owner)throw Error('owner')},async chooseDirectory(){picks++;return null},async confirm(){return true},async restart(){restarts++},async quit(){quits++},wipe:async()=>{wipes++;trace.push('wipe')},...extra}
 return{base,boot,defaultRoot,owner,options,trace,controller:new RootRelocationController(options),wipes:()=>wipes,restarts:()=>restarts,quits:()=>quits,picks:()=>picks,close:()=>rm(base,{recursive:true,force:true})}
}
async function lostFixture(extra:Partial<RootRelocationControllerOptions>={}){
 const f=await fixture({...extra},'lost')
 const root=join(f.base,'original'),moved=join(f.base,'moved')
 await mkdir(join(root,'inbox','database'),{recursive:true})
 await writeFile(join(root,'xuanxiang-app.json'),JSON.stringify({schemaVersion:1,app:'Xuanxiangxiezuo-Desktop',id:randomUUID(),phase:'ready',inboxReady:true}))
 await writeFile(join(root,'catalog.json'),JSON.stringify({schemaVersion:1,revision:0,value:[]}))
 await writeFile(join(root,'inbox','database','PG_VERSION'),'17\n')
 const pointer=await new DataRootManager(f.boot,root).adopt(await directoryIdentity(root))
 await rename(root,moved)
 return{...f,root,moved,pointer}
}

test('SR-U-80 a blocked controller with wipe exposes canReset and reset enters the confirmation phase',async()=>{
 const f=await fixture();try{
  await f.controller.start(f.owner)
  const blocked=f.controller.state();assert.equal(blocked.phase,'blocked');assert.equal(blocked.canReset,true);assert.equal(blocked.defaultPath,f.defaultRoot)
  await f.controller.reset(f.owner)
  const confirm=f.controller.state();assert.equal(confirm.phase,'reset-confirm');assert.equal(confirm.canChoose,false);assert.equal(confirm.canCancel,false);assert.equal(confirm.canReset,false);assert.equal(confirm.canRestart,false)
 }finally{await f.close()}
})
test('SR-U-81 reset-back returns to the exact blocked view',async()=>{
 const f=await fixture();try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner);await f.controller.resetBack(f.owner)
  const state=f.controller.state();assert.equal(state.phase,'blocked');assert.equal(state.notice,'pointer-invalid');assert.equal(state.canChoose,false);assert.equal(state.canReset,true)
 }finally{await f.close()}
})
test('SR-U-82 a confirmed reset runs wiping through complete and triggers the automatic restart',async()=>{
 const f=await fixture();const phases:RootRelocationPhase[]=[],states:RootRelocationState[]=[]
 try{
  f.controller.subscribe(state=>{phases.push(state.phase);states.push(state)})
  await f.controller.start(f.owner);await f.controller.reset(f.owner);await f.controller.resetConfirm(f.owner)
  assert.deepEqual(phases.filter((phase,index)=>index===0||phase!==phases[index-1]),['checking','blocked','reset-confirm','resetting','complete'])
  assert.ok(states.some(state=>state.phase==='complete'&&state.notice==='reset-complete'&&state.canRestart&&!state.canReset),'complete publishes reset-complete with a restart affordance')
  assert.equal(f.wipes(),1);assert.equal(f.restarts(),1);assert.equal(f.quits(),0)
 }finally{await f.close()}
})
test('SR-U-83 a failed wipe lands in reset-failed and a retry confirm succeeds',async()=>{
 let failures=1
 const f=await fixture({wipe:async()=>{if(failures-->0)throw Error('EPERM 占用')}})
 try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner)
  await assert.rejects(f.controller.resetConfirm(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='RESET_FAILED')
  const failed=f.controller.state();assert.equal(failed.phase,'reset-failed');assert.equal(failed.notice,'reset-failed');assert.equal(failed.canRestart,false)
  assert.equal(f.restarts(),0)
  await f.controller.resetConfirm(f.owner)
  assert.equal(f.controller.state().phase,'complete');assert.equal(f.controller.state().notice,'reset-complete');assert.equal(f.restarts(),1)
 }finally{await f.close()}
})
test('SR-U-84 without an injected wipe there is no reset capability at all',async()=>{
 const f=await fixture({wipe:undefined,defaultPath:undefined})
 try{
  await f.controller.start(f.owner)
  assert.equal(f.controller.state().canReset,false);assert.equal(f.controller.state().defaultPath,null)
  await assert.rejects(f.controller.reset(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='CANNOT_RESET')
  assert.equal(f.controller.state().phase,'blocked')
 }finally{await f.close()}
})
test('SR-U-85 reset and back from unavailable and cancelled restore the original view',async()=>{
 const f=await lostFixture();try{
  await f.controller.start(f.owner);assert.equal(f.controller.state().phase,'unavailable');assert.equal(f.controller.state().canReset,true)
  await f.controller.reset(f.owner);assert.equal(f.controller.state().phase,'reset-confirm')
  await f.controller.resetBack(f.owner)
  const back=f.controller.state();assert.equal(back.phase,'unavailable');assert.equal(back.notice,'root-unavailable');assert.equal(back.canChoose,true);assert.equal(back.canReset,true)
  await f.controller.cancel(f.owner);assert.equal(f.controller.state().phase,'cancelled')
  await f.controller.reset(f.owner);await f.controller.resetBack(f.owner)
  const cancelled=f.controller.state();assert.equal(cancelled.phase,'cancelled');assert.equal(cancelled.canChoose,true);assert.equal(cancelled.canReset,true)
 }finally{await f.close()}
})
test('SR-U-86 a forged reset during picking is rejected and the in-flight choose is untouched',async()=>{
 const gate=deferred<string|null>();let picks=0
 const f=await lostFixture({async chooseDirectory(){picks++;return gate.promise}})
 try{
  await f.controller.start(f.owner)
  const choose=f.controller.choose(f.owner);await new Promise(resolve=>setImmediate(resolve))
  assert.equal(f.controller.state().phase,'picking')
  await assert.rejects(f.controller.reset(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='CANNOT_RESET')
  assert.equal(f.controller.state().phase,'picking');assert.equal(picks,1)
  gate.resolve(null);await choose
  assert.equal(f.controller.state().phase,'cancelled')
 }finally{gate.resolve(null);await f.close()}
})
test('SR-U-86b forged reset on a relocation complete and forged reset-back elsewhere are rejected',async()=>{
 const f=await lostFixture({async chooseDirectory(){return f.moved}})
 try{
  await f.controller.start(f.owner);await f.controller.choose(f.owner);assert.equal(f.controller.state().phase,'complete')
  await assert.rejects(f.controller.reset(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='CANNOT_RESET')
  assert.equal(f.controller.state().phase,'complete')
 }finally{await f.close()}
 const g=await fixture();try{
  await g.controller.start(g.owner)
  await assert.rejects(g.controller.resetBack(g.owner),error=>error instanceof RootRelocationControllerError)
  assert.equal(g.controller.state().phase,'blocked')
 }finally{await g.close()}
})
test('SR-U-87 reset from a cancelled view physically drains the choose flight before wipe runs',async()=>{
 const f=await lostFixture({async chooseDirectory(){f.trace.push('picker-enter');f.trace.push('picker-resolve');return null}})
 try{
  await f.controller.start(f.owner)
  let reset:Promise<void>|undefined
  // The cancelled publication precedes the choose flight's physical cleanup;
  // a reset admitted here must still wait for that flight and the core drain.
  f.controller.subscribe(state=>{if(state.phase==='cancelled'&&!reset)reset=f.controller.reset(f.owner)})
  await f.controller.choose(f.owner)
  await reset
  assert.equal(f.controller.state().phase,'reset-confirm')
  await f.controller.resetConfirm(f.owner)
  assert.deepEqual(f.trace,['picker-enter','picker-resolve','wipe'])
  assert.equal(f.restarts(),1)
 }finally{await f.close()}
})
test('SR-U-88 quit during resetting is deferred until the wipe settles',async()=>{
 const gate=deferred<void>()
 const f=await fixture({wipe:async()=>{f.trace.push('wipe');await gate.promise}})
 try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner)
  const confirm=f.controller.resetConfirm(f.owner);void confirm.catch(()=>{})
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.controller.state().phase,'resetting')
  const quit=f.controller.quit(f.owner);await new Promise(resolve=>setImmediate(resolve))
  assert.equal(f.quits(),0,'process quit must not truncate fs.rm')
  gate.resolve();await Promise.allSettled([confirm,quit])
  assert.equal(f.restarts(),1,'a settled successful wipe proceeds to the automatic restart');assert.equal(f.quits(),0)
 }finally{gate.resolve();await f.close()}
 const blocked=deferred<void>()
 const g=await fixture({wipe:async()=>{await blocked.promise;throw Error('EPERM 占用')}})
 try{
  await g.controller.start(g.owner);await g.controller.reset(g.owner)
  const confirm=g.controller.resetConfirm(g.owner);void confirm.catch(()=>{})
  await new Promise(resolve=>setImmediate(resolve));assert.equal(g.controller.state().phase,'resetting')
  let quitDone=false;const quit=g.controller.quit(g.owner).then(()=>{quitDone=true})
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(g.quits(),0,'quit waits while the failing wipe is still running')
  blocked.resolve();await Promise.allSettled([confirm,quit])
  assert.equal(quitDone,true);assert.equal(g.quits(),1,'a settled failed wipe releases the pending quit');assert.equal(g.controller.state().phase,'reset-failed')
 }finally{blocked.resolve();await g.close()}
})
test('SR-U-89 restart after reset-complete skips the relocation receipt verification',async()=>{
 let failures=1,restarts=0
 const f=await fixture({async restart(){if(failures-->0)throw Error('controlled handoff failure');restarts++}})
 try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner)
  await assert.rejects(f.controller.resetConfirm(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='PROCESS_HANDOFF_FAILED')
  assert.equal(f.controller.state().phase,'complete');assert.equal(f.controller.state().canRestart,true)
  writeFileSync(join(f.boot,'data-root.json'),'foreign post-reset pointer')
  await f.controller.restart(f.owner)
  assert.equal(restarts,1,'reset completion restarts on the trusted closure without a relocation receipt')
 }finally{await f.close()}
})
test('SR-U-90 an ordinary relocation complete still requires the exact receipt chain for restart',async()=>{
 let failures=1,restarts=0
 const f=await lostFixture({async chooseDirectory(){return f.moved},async restart(){if(failures-->0)throw Error('controlled handoff failure');restarts++}})
 try{
  await f.controller.start(f.owner)
  await assert.rejects(f.controller.choose(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='PROCESS_HANDOFF_FAILED')
  assert.equal(f.controller.state().phase,'complete');assert.equal(f.controller.state().canRestart,true)
  writeFileSync(join(f.boot,'data-root.json'),'foreign post-failure pointer')
  await assert.rejects(f.controller.restart(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='DURABILITY_UNCONFIRMED')
  assert.equal(restarts,0)
 }finally{await f.close()}
})
test('SR-U-91 cancel is refused while a reset owns the flight and never publishes cancelled over reset views',async()=>{
 const gate=deferred<void>()
 const f=await fixture({wipe:async()=>{f.trace.push('wipe');await gate.promise}})
 try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner)
  await assert.rejects(f.controller.cancel(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='CANNOT_CANCEL')
  assert.equal(f.controller.state().phase,'reset-confirm','a forged cancel cannot erase the confirm view')
  const confirm=f.controller.resetConfirm(f.owner);void confirm.catch(()=>{})
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.controller.state().phase,'resetting')
  await assert.rejects(f.controller.cancel(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='CANNOT_CANCEL')
  assert.equal(f.controller.state().phase,'resetting','no cancelled publication while the wipe is in flight')
  gate.resolve();await confirm
  assert.equal(f.controller.state().notice,'reset-complete');assert.equal(f.restarts(),1);assert.equal(f.quits(),0)
 }finally{gate.resolve();await f.close()}
})
test('SR-U-91b quit from the reset-confirm view still exits without running the wipe',async()=>{
 const f=await fixture()
 try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner)
  await f.controller.quit(f.owner)
  assert.equal(f.quits(),1);assert.equal(f.wipes(),0);assert.equal(f.restarts(),0)
 }finally{await f.close()}
})
test('SR-U-92 a failed automatic restart after reset keeps the reset-complete notice and the manual retry',async()=>{
 let failures=1,restarts=0
 const f=await fixture({async restart(){if(failures-->0)throw Error('controlled handoff failure');restarts++}})
 try{
  await f.controller.start(f.owner);await f.controller.reset(f.owner)
  await assert.rejects(f.controller.resetConfirm(f.owner),error=>error instanceof RootRelocationControllerError&&error.code==='PROCESS_HANDOFF_FAILED')
  const state=f.controller.state()
  assert.equal(state.phase,'complete');assert.equal(state.notice,'reset-complete','the reset outcome copy is not rewritten to operation-failed');assert.equal(state.canRestart,true)
  await f.controller.restart(f.owner)
  assert.equal(restarts,1,'the resetCompleted flag survives and the trusted restart closure is retried')
 }finally{await f.close()}
})
