// Tests the app copied from the actual temporary DMG. No product source patch,
// real user data, signing identity or global network/security setting is used.
import {_electron} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,appendFile,rm,realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname,basename,resolve} from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {runChecked} from './macos-release.mjs'
import {verifyAdhocApp,withMountedAdhocDmg} from './macos-adhoc.mjs'

assert.equal(process.platform,'darwin');assert.equal(process.arch,'arm64')
assert(process.argv.length===3||process.argv.length===4&&process.argv[3]==='--process-network-policy','用法：node scripts/test-adhoc-startup.mjs <本轮临时 DMG> [--process-network-policy]')
const processNetworkPolicy=process.argv[3]==='--process-network-policy'
const execute=promisify(execFile),image=resolve(process.argv[2]),directory=dirname(image)
const manifest=JSON.parse(await readFile(join(directory,'adhoc-test.json'),'utf8'))
assert.equal(manifest.format,'shakeink-adhoc-test-dmg');assert.equal(manifest.artifact.name,basename(image))
const hashFile=async path=>createHash('sha256').update(await readFile(path)).digest('hex')
assert.equal(await hashFile(image),manifest.artifact.sha256)
const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-adhoc-startup-')))
const application=join(temporary,'Applications','玄印写作.app'),data=join(temporary,'data')
const profile=join(temporary,'network.sb'),wrapper=join(temporary,'launch-electron')
const runId=randomUUID(),reportPath=join(directory,`startup-${runId}.json`)
const scope=processNetworkPolicy?'Actual packaged app copied from DMG, isolated test data; process network sandbox with local automation channel.':'Actual packaged app copied from DMG, isolated test data; normal native launch and existing default-session protocol filter checked in an owned blank window. Main/utility/Chromium service processes are not network-isolated.'
const report={format:'shakeink-adhoc-installed-copy-startup',startedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,artifact:basename(image),sha256:manifest.artifact.sha256,scope:scope+' Not Finder/Gatekeeper override or clean macOS 15.7.5 acceptance.',processNetworkPolicy,passed:false,launches:[],errors:[],unverified:['real WeChat download quarantine','Finder Open Anyway exception','clean macOS 15.7.5/M4','full business UI coverage',...processNetworkPolicy?[]:['whole-application offline first launch']]}
const save=()=>writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'})
const policy='(version 1) (allow default) (deny network*) (allow network-inbound network-bind (local ip "localhost:*")) (allow network-outbound (remote ip "localhost:*")) (allow network* (local unix-socket) (remote unix-socket))'
const probe=`const net=require('node:net');const out={}; const external=net.connect({host:'1.1.1.1',port:443});external.setTimeout(2500);external.once('connect',()=>{out.external='connected';external.destroy()});external.once('error',e=>out.external=e.code);external.once('timeout',()=>{out.external='timeout';external.destroy()});external.once('close',()=>{const server=net.createServer(s=>s.end());server.listen(0,'127.0.0.1',()=>{const socket=net.connect(server.address().port,'127.0.0.1');socket.once('connect',()=>out.loopback='connected');socket.once('error',e=>out.loopback=e.code);socket.once('close',()=>server.close(()=>console.log(JSON.stringify(out))))})});`
const quote=value=>`'${value.replaceAll("'","'\\''")}'`
const deadline=async(promise,milliseconds,label)=>{
 let timer
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out')),milliseconds)})])}
 finally{clearTimeout(timer)}
}
let app,ownedChild
const processLogs=[]
try{
  await mkdir(dirname(application))
  await withMountedAdhocDmg(image,async mountpoint=>runChecked('/usr/bin/ditto',[join(mountpoint,'玄印写作.app'),application],{timeout:180000}))
  report.installedCopySignature=await verifyAdhocApp(application)
  if(processNetworkPolicy){
    await writeFile(profile,policy)
    const baseline=JSON.parse((await execute(process.execPath,['-e',probe],{encoding:'utf8',timeout:10000})).stdout)
    const restricted=JSON.parse((await execute('/usr/bin/sandbox-exec',['-f',profile,process.execPath,'-e',probe],{encoding:'utf8',timeout:10000})).stdout)
    assert.equal(baseline.external,'connected','Control must demonstrate the same external endpoint is reachable without policy')
    assert.equal(baseline.loopback,'connected');assert.equal(restricted.external,'EPERM');assert.equal(restricted.loopback,'connected')
    report.networkControl={baseline,restricted,policy,scope:'Sandbox denies non-loopback IP networking; loopback/Unix sockets remain for local control and IPC'}
    await writeFile(wrapper,`#!/bin/sh\nexec /usr/bin/sandbox-exec -f ${quote(profile)} ${quote(join(application,'Contents/MacOS/玄印写作'))} "$@"\n`,{mode:0o700})
  }
  for(const phase of ['first-launch','reopen']){
    const entry={phase,signatureBefore:await verifyAdhocApp(application)}
    report.launches.push(entry);await save()
    const environment={...process.env,SHAKEINK_TEST_ROOT:data}
    delete environment.ELECTRON_RUN_AS_NODE;delete environment.NODE_OPTIONS
    app=await _electron.launch({executablePath:processNetworkPolicy?wrapper:join(application,'Contents/MacOS/玄印写作'),args:[],env:environment,timeout:90000})
    const child=app.process();ownedChild=child
    for(const stream of [child.stdout,child.stderr])stream?.on('data',chunk=>{processLogs.push(String(chunk));if(processLogs.length>100)processLogs.shift()})
    const exited=new Promise(resolveExit=>child.once('exit',(code,signal)=>resolveExit({code,signal})))
    const pageErrors=[]
    const page=await app.firstWindow({timeout:90000})
    page.on('pageerror',error=>pageErrors.push(error.message))
    page.setDefaultTimeout(20000)
    await page.getByRole('button',{name:'账号菜单',includeHidden:true}).waitFor({state:'attached',timeout:90000})
    assert.equal(page.url(),'shakeink://app/')
    const native=await app.evaluate(({app,BrowserWindow,Menu})=>({packaged:app.isPackaged,arch:process.arch,userData:app.getPath('userData'),appPath:app.getAppPath(),sandbox:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox,menus:Menu.getApplicationMenu().items.map(item=>item.label),nodeServerListeners:process._getActiveHandles().filter(handle=>handle.constructor?.name==='Server'&&handle.listening).length}))
    assert.equal(native.packaged,true);assert.equal(native.arch,'arm64');assert.equal(native.userData,data+'-bootstrap')
    assert.equal(native.appPath,join(application,'Contents/Resources/app'));assert.equal(native.sandbox,true);assert.equal(native.nodeServerListeners,0)
    for(const menu of ['文件','编辑','视图','窗口','帮助'])assert(native.menus.includes(menu))
    entry.native={packaged:true,arch:'arm64',isolatedUserData:true,appPathFromInstalledCopy:true,rendererSandbox:true,nodeServerListeners:native.nodeServerListeners,menus:native.menus}
    if(processNetworkPolicy){
     const mainNetwork=await app.evaluate(()=>new Promise(resolveProbe=>{
      const socket=process.getBuiltinModule('node:net').connect({host:'1.1.1.1',port:443})
      socket.setTimeout(2500)
      socket.once('connect',()=>{socket.destroy();resolveProbe('connected')})
      socket.once('error',error=>resolveProbe(error.code))
      socket.once('timeout',()=>{socket.destroy();resolveProbe('timeout')})
    }))
    assert.equal(mainNetwork,'EPERM');entry.mainNetworkDenied=mainNetwork
    const inheritedNetwork=await app.evaluate((_electron,probeCode)=>new Promise(resolveProbe=>{
      process.getBuiltinModule('node:child_process').execFile(process.execPath,['-e',probeCode],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',timeout:10000},(error,stdout)=>{
        if(error){resolveProbe({errorCode:typeof error.code==='number'?error.code:'execution'});return}
        try{resolveProbe(JSON.parse(stdout))}catch{resolveProbe({errorCode:'parse'})}
      })
    }),probe)
     assert.equal(inheritedNetwork.external,'EPERM');assert.equal(inheritedNetwork.loopback,'connected');entry.inheritedChildNetwork=inheritedNetwork
    }
    // Product CSP blocks the workbench's fetch before networking. Its existing
    // default-session onBeforeRequest protocol filter also cancels HTTP(S)
    // before CDP routing. Observe that specific native cancellation from an
    // owned blank window, preserving both existing product security policies.
    const [controlPage]=await deadline(Promise.all([
      app.waitForEvent('window',{timeout:10000}),
      app.evaluate(async({BrowserWindow})=>{
        const control=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}})
        await control.loadURL('about:blank')
      }),
    ]),15000,'Owned hidden network-control window')
    const controlUrl='https://shakeink-adhoc-network-probe.invalid/controlled'
    const [failedRequest,rendererProbe]=await deadline(Promise.all([
      controlPage.waitForEvent('requestfailed',{predicate:request=>request.url()===controlUrl,timeout:10000}),
      controlPage.evaluate(url=>fetch(url).then(()=>({resolved:true})).catch(()=>({resolved:false})),controlUrl),
    ]),15000,'Existing session protocol-filter control')
    assert.equal(rendererProbe.resolved,false)
    assert.equal(failedRequest.failure()?.errorText,'net::ERR_BLOCKED_BY_CLIENT')
    await controlPage.close()
    entry.rendererNetworkGuard={scope:'Existing default-session onBeforeRequest protocol filter only; not whole-process offline acceptance',controlWindow:'Owned hidden about:blank window; product CSP and session filter unchanged',controlUrl,failure:'net::ERR_BLOCKED_BY_CLIENT'}
    const bootstrap=await page.evaluate(()=>window.desktop.bootstrap())
    assert.equal(bootstrap.models.length,0);entry.defaultModels=0
    const theme=page.getByRole('dialog',{name:'选择主题',exact:true})
    await expect(theme).toBeVisible()
    // Controlled React input commits after the real asynchronous settings IPC.
    // Click, then await both persisted state and the visible checked state.
    if(phase==='first-launch')await theme.getByRole('radio',{name:'玄墨',exact:true}).click()
    await expect.poll(async()=>(await page.evaluate(()=>window.desktop.bootstrap())).settings.appearance.theme).toBe('ink')
    await expect(theme.getByRole('radio',{name:'玄墨',exact:true})).toBeChecked()
    entry.themePersisted='ink'
    let novels
    await expect.poll(async()=>{
      novels=await page.evaluate(async()=>{const response=await fetch('/api/novels');return {status:response.status,body:await response.json()}})
      return novels.status
    },{timeout:60000}).toBe(200)
    assert.deepEqual(novels.body.novels,[]);entry.localDatabaseAndIpc=true
    assert.deepEqual(pageErrors,[]);entry.rendererErrors=pageErrors
    const screenshotName=`startup-${runId}-${phase}.png`
    await page.screenshot({path:join(directory,screenshotName)});entry.screenshot=screenshotName
    // Schedule normal app.quit after the evaluation response, rather than
    // treating a forced process kill as successful shutdown.
    await app.evaluate(({app})=>{setTimeout(()=>app.quit(),100)})
    entry.exit=await deadline(exited,45000,'Normal app quit')
    assert.deepEqual(entry.exit,{code:0,signal:null})
    await app.close().catch(()=>{});app=undefined
    entry.signatureAfter=await verifyAdhocApp(application);entry.passed=true;await save()
  }
  const tampered=join(temporary,'Tampered.app')
  await runChecked('/usr/bin/ditto',[application,tampered],{timeout:180000})
  await appendFile(join(tampered,'Contents/Resources/app/LICENSE'),'\nOwned signature-integrity negative fixture.\n')
  let rejection
  try{await execute('/usr/bin/codesign',['--verify','--deep','--strict','--verbose=4',tampered],{encoding:'utf8',timeout:60000})}
  catch(error){if(error.code===1&&/sealed resource is missing or invalid/i.test(String(error.stderr)))rejection={exitCode:1,category:'sealed-resource-invalid'};else throw new Error('Tamper negative did not fail for the expected signature-integrity reason')}
  assert(rejection,'Tampered resource unexpectedly passed codesign')
  report.tamperNegative=rejection
  report.installedCopySignatureAfterNegative=await verifyAdhocApp(application)
  assert.equal(await hashFile(image),manifest.artifact.sha256);report.dmgUnchanged=true
  report.passed=true;report.completedAt=new Date().toISOString();await save()
  console.log(JSON.stringify({passed:true,report:reportPath,launches:report.launches.length,network:processNetworkPolicy?'non-loopback denied by inherited sandbox policy':'existing default-session protocol filter observed; whole-application offline unverified',scope:report.scope},null,2))
}catch(error){
  report.passed=false
  report.errors.push({name:error.name,message:error.message});report.completedAt=new Date().toISOString()
  report.processLog=processLogs.join('').slice(-16000).replaceAll(temporary,'<isolated-test>')
  report.failureWindows=[]
  await save()
  if(app)for(const [index,page] of app.windows().entries()){
    try{
      const state=await deadline((async()=>{
        const screenshot=`startup-${runId}-failure-${index}.png`
        const snapshot={url:page.url(),title:await page.title(),text:(await page.locator('body').innerText({timeout:5000})).slice(0,12000),screenshot}
        await page.screenshot({path:join(directory,screenshot),timeout:10000});return snapshot
      })(),20000,'Optional failure-window diagnostics')
      report.failureWindows.push(state)
    }catch{report.failureWindows.push({unavailable:true})}
  }
  await save();process.exitCode=1
  console.error(JSON.stringify({passed:false,report:reportPath,error:error.message}))
}finally{
  if(app)await deadline(app.close(),15000,'Failure cleanup app close').catch(()=>{})
  const isRunning=()=>ownedChild&&ownedChild.exitCode===null&&ownedChild.signalCode===null
  for(const signal of ['SIGTERM','SIGKILL']){
    if(!isRunning())break
    // Only the ChildProcess created by this harness may be terminated. A forced
    // cleanup never contributes to a successful normal-quit assertion above.
    const exited=new Promise(resolveExit=>ownedChild.once('exit',resolveExit))
    ownedChild.kill(signal)
    await deadline(exited,10000,'Owned test child cleanup').catch(()=>{})
  }
  if(!isRunning())await rm(temporary,{recursive:true,force:true})
  else{
    report.passed=false;report.errors.push({name:'CleanupError',message:'Owned test process still running; isolated test directory retained'})
    await save();process.exitCode=1
  }
}
