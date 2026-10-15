// 启动配置目录丢失/损坏修复 · 真实系统验证（SR-R-01~05，docs/reviews/2026-10-11-startup-recovery-test-cases.md §8）
// 真实启动编译后的 Electron 应用（dist/ + out/），全部数据写入 SHAKEINK_TEST_ROOT 指向的
// mkdtemp 隔离临时根，不访问网络。模式参照 scripts/smoke-root-relocation.mjs：
// playwright _electron.launch + --remote-debugging-port，重置后应用真实 app.relaunch，
// 用 chromium.connectOverCDP 重连新进程。平台中立：路径一律 node:path，无 darwin 断言。
// 失败时保留临时夹具并写 docs/evidence/startup-recovery/failure.{json,png}。
import {_electron as electron,chromium} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {mkdtemp,mkdir,rm,readFile,writeFile,realpath,readdir,lstat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

const require=createRequire(import.meta.url)
const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-startup-recovery-')))
const root=join(temporary,'data'),bootstrap=`${root}-bootstrap`
const markerPath=join(root,'shakeink-app.json'),catalogPath=join(root,'catalog.json'),pointerPath=join(bootstrap,'data-root.json')
const evidence=resolve('docs/evidence/startup-recovery')
const startedAt=new Date().toISOString(),checks=[],errors=[],pids=new Set(),logs=[]
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r))
const port=server.address().port;await new Promise(r=>server.close(r))
let app,page,browser,passed=false
const alive=pid=>{try{process.kill(pid,0);return true}catch{return false}}
// 全新初始化后根目录允许出现的全部名称（drafts.json/state.json 视退出时落盘时机可有可无）。
const freshRootEntries=new Set(['shakeink-app.json','xuanxiang-app.json','catalog.json','state.json','drafts.json','backup-plan.json','restore-draft-barrier.json','application-restore-drafts.json','inbox','session','assets','backups'])
const attach=pid=>{pids.add(pid);return pid}
const pointer=async()=>JSON.parse(await readFile(pointerPath,'utf8'))
const marker=async()=>JSON.parse(await readFile(markerPath,'utf8'))
async function launch(){
 app=await electron.launch({executablePath:require('electron'),args:[resolve('.'),`--remote-debugging-port=${port}`],env:{...process.env,SHAKEINK_TEST_ROOT:root},timeout:60000})
 attach(app.process().pid);app.process().stderr.on('data',data=>logs.push(data.toString()))
 page=await app.firstWindow({timeout:60000});page.on('pageerror',error=>errors.push(error.message))
 return app.process().pid
}
async function connect(){
 const until=Date.now()+90000;let last
 while(Date.now()<until){try{
  browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:2000})
  const context=browser.contexts()[0]
  await expect.poll(()=>context.pages().some(p=>p.url()==='shakeink://app/'),{timeout:5000}).toBe(true)
  page=context.pages().find(p=>p.url()==='shakeink://app/');page.on('pageerror',error=>errors.push(error.message))
  const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),native=info.processInfo.find(p=>p.type==='browser')
  assert(native);attach(native.id);await cdp.detach();return native.id
 }catch(error){last=error;await new Promise(r=>setTimeout(r,250))}}
 throw last
}
async function waitProcessExit(pid,exitEvent){
 if(exitEvent)await Promise.race([exitEvent,new Promise((_,reject)=>setTimeout(()=>reject(Error('应用进程未在预期时间内退出')),90000).unref())])
 await expect.poll(()=>alive(pid),{timeout:30000}).toBe(false)
}
async function quitWorkbench(pid){
 await page.evaluate(()=>window.desktop.command('app.quit')).catch(()=>{})
 await waitProcessExit(pid)
 app=null
}
async function workbenchWithOnboarding(){
 await page.getByRole('button',{name:'账号菜单',includeHidden:true}).waitFor({timeout:60000})
 assert.equal(page.url(),'shakeink://app/')
 assert.equal(await page.getByRole('heading',{name:'无法修复数据目录',exact:true}).count(),0)
 await expect(page.getByRole('dialog',{name:'选择主题',exact:true})).toBeVisible({timeout:30000})
}
async function freshRootState(){
 const pointerValue=await pointer(),markerValue=await marker(),catalog=JSON.parse(await readFile(catalogPath,'utf8'))
 assert.equal(pointerValue.root.path,root);assert.equal(markerValue.id,pointerValue.rootId)
 assert.equal(markerValue.phase,'ready');assert.equal(markerValue.inboxReady,true);assert.equal(markerValue.app,'ShakeInk')
 assert.equal(catalog.schemaVersion,1);assert.ok(Array.isArray(catalog.value)&&catalog.value.length===0)
 return {pointerValue,markerValue}
}
try{
 await mkdir(evidence,{recursive:true})
 // SR-R-01：目录整体缺失 → 真实启动自动初始化并进入新人引导。
 assert.equal(await lstat(root).catch(()=>null),null);assert.equal(await lstat(bootstrap).catch(()=>null),null)
 await launch()
 await workbenchWithOnboarding()
 await page.screenshot({path:join(evidence,'sr-r-01-fresh-onboarding.png')})
 const first=await freshRootState()
 await lstat(join(root,'inbox','database','PG_VERSION'))
 const baselineEntries=(await readdir(root)).sort()
 assert.ok(baselineEntries.every(name=>freshRootEntries.has(name))&&baselineEntries.includes('inbox')&&baselineEntries.includes('session'))
 const firstPointerBytes=await readFile(pointerPath)
 await quitWorkbench(app.process().pid)
 checks.push('SR-R-01: real cold launch with a fully missing isolated root auto-initialized marker/catalog/inbox database and bootstrap pointer, opened the workbench and the 选择主题 onboarding dialog, then exited normally')
 // SR-R-02：marker 删除（指针完好）→ 启动自动修复，身份不变。
 await rm(markerPath)
 await launch()
 await workbenchWithOnboarding()
 await page.screenshot({path:join(evidence,'sr-r-02-marker-repaired.png')})
 const repaired=await freshRootState()
 assert.deepEqual(await readFile(pointerPath),firstPointerBytes)
 assert.equal(repaired.pointerValue.rootId,first.pointerValue.rootId);assert.equal(repaired.markerValue.id,first.markerValue.id)
 assert.equal(repaired.pointerValue.revision,first.pointerValue.revision)
 await quitWorkbench(app.process().pid)
 checks.push('SR-R-02: with the app marker deleted but pointer intact, the next real startup repaired the marker silently into the workbench; rootId, marker id and pointer revision are unchanged')
 // SR-R-05：catalog 损坏（不可自动修复）→ 恢复对话框，退出保留现状。
 const pointerBytes=await readFile(pointerPath),markerBytes=await readFile(markerPath)
 await writeFile(catalogPath,'{"schemaVersion":1,"revision":1,"value":[{"broken":')
 const corruptCatalogBytes=await readFile(catalogPath)
 await launch()
 const section=()=>page.locator('section[aria-labelledby="root-relocation-title"]')
 await page.getByRole('heading',{name:'无法修复数据目录',exact:true}).waitFor({timeout:60000})
 await expect(page.getByText('数据目录中的文件丢失或损坏，无法自动修复。',{exact:false})).toBeVisible()
 assert.deepEqual((await section().getByRole('button').allTextContents()).map(text=>text.trim()),['重置配置数据','退出应用'])
 await page.screenshot({path:join(evidence,'sr-r-05-recovery-dialog.png')})
 const quitPid=app.process().pid,quitExit=new Promise(r=>app.process().once('exit',r))
 await section().getByRole('button',{name:'退出应用',exact:true}).click()
 await waitProcessExit(quitPid,quitExit);app=null
 assert.deepEqual(await readFile(catalogPath),corruptCatalogBytes)
 assert.deepEqual(await readFile(pointerPath),pointerBytes);assert.deepEqual(await readFile(markerPath),markerBytes)
 checks.push('SR-R-05: the unrepairable catalog surfaced the 无法修复数据目录 dialog with exactly 重置配置数据/退出应用; choosing 退出应用 exited the process and catalog/marker/pointer bytes are unchanged')
 // SR-R-03/04：catalog 保持损坏 → 重置二次确认 → 真实 relaunch → 全新初始化与新人引导；二次启动正常。
 await launch()
 await page.getByRole('heading',{name:'无法修复数据目录',exact:true}).waitFor({timeout:60000})
 await section().getByRole('button',{name:'重置配置数据',exact:true}).click()
 await page.getByRole('heading',{name:'确认重置配置数据',exact:true}).waitFor({timeout:30000})
 await expect(page.getByText('此操作不可撤销',{exact:true})).toBeVisible()
 const confirmText=await section().textContent()
 assert.ok(confirmText.includes('不可撤销')&&confirmText.includes(root))
 assert.deepEqual((await section().getByRole('button').allTextContents()).map(text=>text.trim()),['确认清空并重置','返回'])
 await page.screenshot({path:join(evidence,'sr-r-03-reset-confirm.png')})
 const resettingObserved=page.getByRole('heading',{name:'正在重置数据目录…',exact:true}).waitFor({timeout:45000}).then(()=>true,()=>false)
 const oldProcess=app.process(),oldPid=oldProcess.pid,relaunchExit=new Promise(r=>oldProcess.once('exit',r))
 await section().getByRole('button',{name:'确认清空并重置',exact:true}).click()
 assert.equal(await resettingObserved,true)
 await waitProcessExit(oldPid,relaunchExit);app=null
 const newPid=await connect();assert.notEqual(newPid,oldPid);assert.equal(alive(oldPid),false)
 await workbenchWithOnboarding()
 await page.screenshot({path:join(evidence,'sr-r-03-relaunched-onboarding.png')})
 const fresh=await freshRootState()
 assert.notEqual(fresh.pointerValue.rootId,first.pointerValue.rootId)
 await quitWorkbench(newPid);browser=null
 const stateText=await readFile(join(root,'state.json'),'utf8').catch(()=>null)
 assert.ok(stateText===null||!JSON.parse(stateText)?.value?.onboarding)
 const resetEntries=(await readdir(root)).sort()
 assert.ok(resetEntries.every(name=>freshRootEntries.has(name)),`reset root contains non-fresh entries: ${resetEntries.join(',')}`)
 assert.ok(resetEntries.includes('shakeink-app.json')&&resetEntries.includes('catalog.json')&&resetEntries.includes('inbox'))
 const bootstrapEntries=await readdir(bootstrap)
 const controlLike=name=>name==='root-migration.json'||name==='root-migration-request.json'||name.startsWith('root-relocation-')||/^\.?application-recovery-/.test(name)||/^\.?application-restore-/.test(name)||/^\.?desktop-recovery-layout-/.test(name)||name.startsWith('data-root.corrupt-')
 assert.ok(!bootstrapEntries.some(controlLike))
 checks.push('SR-R-03: reset confirmation showed the destructive warning with 不可撤销 and the root path; 确认清空并重置 displayed 正在重置数据目录…, wiped the root and bootstrap control files, relaunched into a fresh workbench with 选择主题 onboarding, a new rootId, an empty catalog index and no persisted onboarding progress')
 // SR-R-04：重置完成后的二次启动。
 await launch()
 await workbenchWithOnboarding()
 await page.screenshot({path:join(evidence,'sr-r-04-second-startup.png')})
 const second=await freshRootState()
 assert.equal(second.pointerValue.rootId,fresh.pointerValue.rootId);assert.equal(second.markerValue.id,fresh.markerValue.id)
 await quitWorkbench(app.process().pid)
 checks.push('SR-R-04: a second cold startup after the reset enters the workbench normally with the same rootId and resumes the persisted (incomplete) onboarding state without any recovery dialog')
 assert.deepEqual(errors,[])
 const report={scope:'development real Electron startup-recovery verification: isolated roots via SHAKEINK_TEST_ROOT, real process exits and one real app.relaunch reconnected over Chromium DevTools Protocol; not packaged installation, not formal acceptance',startedAt,completedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,node:process.version,checks,errors,passed:true}
 const redacted=JSON.stringify(report).split(JSON.stringify(temporary).slice(1,-1)).join('<isolated-fixture>')
 await writeFile(join(evidence,'startup-recovery.json'),redacted+'\n')
 passed=true;console.log('Startup recovery smoke passed. Evidence:',join(evidence,'startup-recovery.json'))
}catch(error){
 const redact=value=>JSON.stringify(value).split(JSON.stringify(temporary).slice(1,-1)).join('<isolated-fixture>')
 await writeFile(join(evidence,'failure.json'),redact({startedAt,platform:process.platform,arch:process.arch,node:process.version,checks,errors,error:String(error),log:logs.join('').slice(-8000)})+'\n')
 try{await page?.screenshot({path:join(evidence,'failure.png')})}catch{}
 throw error
}finally{
 if(app){const timer=setTimeout(()=>{try{app?.process().kill('SIGKILL')}catch{}},5000);try{await app.close().catch(()=>{})}finally{clearTimeout(timer)}}
 if(browser)await browser.close().catch(()=>{})
 for(const pid of pids)if(alive(pid))try{process.kill(pid,'SIGTERM')}catch{}
 await new Promise(r=>setTimeout(r,250))
 for(const pid of pids)if(alive(pid))try{process.kill(pid,'SIGKILL')}catch{}
 if(passed)await rm(temporary,{recursive:true,force:true});else console.log('Retained isolated startup-recovery fixture:',temporary)
}
