import {_electron as electron} from 'playwright'
import {mkdtemp,rm,writeFile,mkdir,realpath,stat} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {performance} from 'node:perf_hooks'
import assert from 'node:assert/strict'
const executable=resolve(process.argv[2]),output=resolve(process.argv[3]),runs=Number(process.argv[4]??3)
const report={scope:'macOS packaged Electron, isolated fresh empty root; process working set from app.getAppMetrics (KiB), main includes service worker; startup is launch-to-account-control-attached, OS disk cache uncontrolled; no global forced GC',executable,platform:process.platform,arch:process.arch,node:process.version,runs:[]}
await mkdir(resolve(output,'..'),{recursive:true})
for(let index=0;index<runs;index++){
 const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-perf-')));let app
 const run={index,errors:[]};report.runs.push(run)
 try{
  const began=performance.now(),env={...process.env,SHAKEINK_TEST_ROOT:join(temporary,'data')};delete env.NODE_OPTIONS;delete env.ELECTRON_RUN_AS_NODE;app=await electron.launch({executablePath:executable,args:[],env,timeout:90000})
  const page=await app.firstWindow({timeout:90000});page.on('pageerror',e=>run.errors.push(e.message))
  await page.getByRole('button',{name:/^账号菜单/,includeHidden:true}).waitFor({state:'attached',timeout:90000});run.readyMs=performance.now()-began
  await page.evaluate(()=>{globalThis.perfTasks=[];globalThis.perfObserver=new PerformanceObserver(list=>globalThis.perfTasks.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration}))));globalThis.perfObserver.observe({type:'longtask',buffered:true})})
  await page.waitForTimeout(5000)
  run.processes=await app.evaluate(({app,BrowserWindow})=>({packaged:app.isPackaged,sandbox:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox,metrics:app.getAppMetrics().map(x=>({type:x.type,workingSetKiB:x.memory.workingSetSize,privateKiB:x.memory.privateBytes??null})),servers:process._getActiveHandles().filter(x=>x?.constructor?.name==='Server'&&x.listening).length}))
  assert.equal(run.processes.packaged,true);assert.equal(run.processes.sandbox,true);assert.equal(run.processes.servers,0)
  run.workingSetKiB=run.processes.metrics.reduce((sum,x)=>sum+x.workingSetKiB,0)
  run.renderer=await page.evaluate(()=>({heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('/_next/')&&x.name.endsWith('.js')).map(x=>({name:new URL(x.name).pathname,bytes:x.decodedBodySize})),longTasks:globalThis.perfTasks}))
  // Custom protocol ResourceTiming does not expose response sizes. Enumerate
  // parsed scripts through CDP and measure their actual packaged file bytes.
  const cdp=await page.context().newCDPSession(page),urls=new Set()
  cdp.on('Debugger.scriptParsed',event=>{if(event.url.startsWith('shakeink://app/_next/')&&event.url.split('?')[0].endsWith('.js'))urls.add(event.url)})
  await cdp.send('Debugger.enable');await cdp.send('Runtime.evaluate',{expression:'1'});await cdp.detach()
  run.parsedScripts=[]
  for(const url of [...urls].sort()){
   const path=decodeURIComponent(new URL(url).pathname)
   const file=join(executable,'../../Resources/app/out',path)
   run.parsedScripts.push({path,bytes:(await stat(file)).size})
  }
  run.scriptBytes=run.parsedScripts.reduce((sum,x)=>sum+x.bytes,0)
  assert(run.scriptBytes>0,'CDP must observe the real parsed startup scripts')
  run.longTaskMs=run.renderer.longTasks.reduce((sum,x)=>sum+x.duration,0)
  const bootstrap=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(bootstrap.models.length,0)
  assert.deepEqual(run.errors,[])
  const child=app.process(),exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})))
  await app.evaluate(({app})=>{setTimeout(()=>app.quit(),50)});run.exit=await Promise.race([exit,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('normal quit timeout')),45000);t.unref()})]);assert.deepEqual(run.exit,{code:0,signal:null});await app.close();app=undefined
  run.passed=true
 }catch(error){run.error=String(error);throw error}
 finally{
  if(app){const guard=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close()}finally{clearTimeout(guard)}}
  await writeFile(output,JSON.stringify(report,null,2)+'\n');await rm(temporary,{recursive:true,force:true})
 }
}
const median=key=>report.runs.map(x=>x[key]).sort((a,b)=>a-b)[Math.floor(runs/2)]
report.medians=Object.fromEntries(['readyMs','workingSetKiB','scriptBytes','longTaskMs'].map(key=>[key,median(key)]))
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.medians))
