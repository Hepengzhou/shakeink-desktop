import {_electron} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename,dirname,join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {defaultState} from '../desktop/core/settings.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'
import {prisma} from '../src/lib/db.ts'

assert.equal(process.platform,'win32','Actual Windows required')
const tag=process.argv[2]??'v2-green'
assert.ok(['v2-red','v2-green'].includes(tag),'Current revision writes isolated v2 evidence; both runs use the same assertions')
const temporary=await mkdtemp(join(tmpdir(),'shakeink-composer-height-'))
const evidence=resolve('docs/evidence/composer-height',tag)
await mkdir(evidence,{recursive:true})
const report={status:'running',startedAt:new Date().toISOString(),scope:'Actual Windows development Electron, compiled original React composer, isolated real local inbox/database, no models. Playwright/CDP input; not physical IME, macOS or installed package acceptance.',checks:[],measurements:[],errors:[],rendererHttpRequests:0,runtime:[],sourceHashes:{},bundleHashes:{}}
let app,page,theme
const redact=value=>String(value).replaceAll(temporary,'<isolated-temp>').replaceAll(process.cwd(),'<repo>')
const hash=value=>createHash('sha256').update(value).digest('hex')
for(const file of ['src/components/layout/ChatPanel.tsx','src/components/chat/chat-empty-dock.css','scripts/verify-composer-height.mjs'])report.sourceHashes[file]=hash(await readFile(file))
async function bundleHashes(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=join(directory,entry.name)
  if(entry.isDirectory())await bundleHashes(file)
  else if(/\.(?:js|css|html|cjs)$/.test(file))report.bundleHashes[file.slice(process.cwd().length+1)]=hash(await readFile(file))
 }
}
await bundleHashes(resolve('out'));report.bundleHashes['dist/main/index.cjs']=hash(await readFile('dist/main/index.cjs'))
const editor=()=>page.getByTestId('composer-editor')
const lines=count=>Array.from({length:count},(_,i)=>`高度验证 ${i+1}`).join('\n')
async function metrics(label){
 const measured=await editor().evaluate(element=>{
  const style=getComputedStyle(element),rect=element.getBoundingClientRect()
  return {inlineHeight:element.style.height,maxHeight:style.maxHeight,minHeight:style.minHeight,height:rect.height,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,scrollTop:element.scrollTop,innerHeight,innerWidth,top:rect.top,bottom:rect.bottom}
 })
 report.measurements.push({theme,label,...measured});return measured
}
async function check(id,action){await action();report.checks.push({theme,id,status:'passed'})}
async function toolbar(){
 const mode=page.getByRole('button',{name:'对话模式',exact:true})
 await expect(mode).toBeInViewport({ratio:1})
 await expect(page.getByRole('button',{name:'发送',exact:true})).toBeInViewport({ratio:1})
 await mode.click();await expect(page.getByRole('menu')).toBeVisible()
 await page.getByRole('menuitem',{name:'标准模式',exact:true}).click()
 await expect(page.getByRole('menu')).not.toBeVisible()
}
async function bounds(height){
 await app.evaluate(({BrowserWindow},height)=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height}),height)
 await expect.poll(()=>page.evaluate(()=>innerHeight<=650)).toBe(height===650)
}
async function longDraft(label,expected){
 await editor().fill(lines(40))
 await expect.poll(()=>editor().evaluate(element=>element.style.height)).toBe('420px')
 const m=await metrics(label)
 assert.equal(m.maxHeight,`${expected}px`)
 assert.ok(Math.abs(m.height-expected)<1,`${label}: measured ${m.height}px, expected ${expected}px`)
 assert.ok(m.scrollHeight>m.clientHeight)
 assert.equal(await editor().count(),1)
 await toolbar()
}
async function scroll(label){
 await editor().evaluate(element=>{element.scrollTop=0})
 await expect.poll(()=>editor().evaluate(element=>element.scrollTop)).toBe(0)
 const before=await metrics(`${label}-before`)
 await editor().hover();await page.mouse.wheel(0,600)
 await expect.poll(()=>editor().evaluate(element=>element.scrollTop)).toBeGreaterThan(before.scrollTop)
 const after=await metrics(`${label}-after`)
 assert.equal(after.height,before.height)
 await toolbar()
}
async function shrink(minimum){
 await editor().fill('短文')
 await expect.poll(()=>editor().evaluate(element=>element.getBoundingClientRect().height)).toBeLessThan(100)
 const short=await metrics('short')
 assert.equal(short.minHeight,`${minimum}px`);assert.ok(short.height>=minimum)
 await editor().fill('')
 await expect.poll(()=>editor().evaluate(element=>element.getBoundingClientRect().height)).toBe(minimum)
 await metrics('empty')
}
async function launch(){
 const root=join(temporary,theme),workspaces=new Workspaces(root,resolve('prisma/migrations'))
 try{
  await workspaces.initialize()
  await workspaces.run('inbox',async()=>{
   const conversation=await prisma.conversation.create({data:{userId:'local-author',title:'输入框高度验证会话'}})
   await prisma.message.create({data:{conversationId:conversation.id,role:'USER',content:'隔离目录中的输入框高度验证消息。'}})
  })
 }finally{await workspaces.close()}
 const state=structuredClone(defaultState);state.settings.appearance.theme=theme
 state.onboarding={version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}
 await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state}))
 app=await _electron.launch({args:[resolve('.')],env:{...process.env,SHAKEINK_TEST_ROOT:root},timeout:60000})
 page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(12000)
 page.on('pageerror',error=>report.errors.push(redact(error.message)))
 page.on('request',request=>{if(/^https?:/i.test(request.url()))report.rendererHttpRequests++})
 await page.context().setOffline(true)
 await bounds(900)
 await page.getByRole('button',{name:'暂不配置',exact:true}).click({timeout:45000})
 await expect(page.getByTestId('chat-empty-state')).toBeVisible()
 await expect(page.locator('.chatpane')).toHaveAttribute('aria-busy','false')
 await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
 assert.equal(page.url(),'shakeink://app/')
 const bootstrap=await page.evaluate(()=>window.desktop.bootstrap())
 assert.equal(bootstrap.platform,'win32');assert.equal(bootstrap.models.length,0);assert.equal(bootstrap.dataRoot,root)
 report.runtime.push({theme,...await app.evaluate(()=>({platform:process.platform,versions:process.versions,listeningServers:process._getActiveHandles().filter(handle=>handle.constructor.name==='Server'&&handle.listening).length}))})
}
try{
 for(theme of ['paper','ink']){
  await launch()
  await check('CH-01',async()=>{
   // Save old implementation measurements before an expected red assertion.
   await editor().fill(lines(40));await expect.poll(()=>editor().evaluate(e=>parseFloat(e.style.height))).toBeGreaterThan(100)
   await metrics('normal-welcome-initial')
   await longDraft('normal-welcome',420)
   await page.screenshot({path:join(evidence,`${theme}-welcome-420.png`)})
  })
  await check('CH-02',async()=>{
   await editor().fill(lines(14))
   await expect.poll(()=>editor().evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(420)
   const middle=await metrics('middle');assert.ok(middle.height>280&&middle.height<420)
   await shrink(48)
  })
  await check('CH-03',async()=>{await longDraft('scroll-welcome',420);await scroll('welcome')})
  await check('CH-04',async()=>{
   await bounds(650);await longDraft('short-welcome',288);await scroll('short-welcome')
   await page.screenshot({path:join(evidence,`${theme}-welcome-288.png`)})
  })
  await editor().fill('');await bounds(900)
  await page.locator('.workspace-sidebar').getByText('输入框高度验证会话',{exact:true}).click()
  await expect(page.getByTestId('chat-empty-state')).not.toBeVisible()
  await expect(page.getByText('隔离目录中的输入框高度验证消息。',{exact:true})).toBeVisible()
  await check('CH-05',async()=>{
   await longDraft('normal-conversation',420);await scroll('conversation');await shrink(52)
   await longDraft('conversation-capture',420)
   await page.screenshot({path:join(evidence,`${theme}-conversation-420.png`)})
  })
  await check('CH-06',async()=>{await bounds(650);await longDraft('short-conversation',420);await scroll('short-conversation')})
  await check('CH-07',async()=>{
   await editor().fill('第一行');await editor().press('Shift+Enter');await page.keyboard.insertText('第二行')
   assert.match(await editor().innerText(),/第一行\n第二行/)
   await expect(page.getByRole('dialog',{name:'尚未配置模型',exact:true})).not.toBeVisible()
   await shrink(52)
  })
  await app.close();app=undefined
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.rendererHttpRequests,0)
 assert.ok(report.runtime.every(item=>item.listeningServers===0))
 report.checks.push({id:'CH-08',status:'passed'});report.status='passed'
}catch(error){
 report.status='failed';report.error=redact(error.stack||error)
 if(page){await metrics('failure').catch(()=>{});await page.screenshot({path:join(evidence,'failure.png')}).catch(()=>{})}
 process.exitCode=1
}finally{
 await app?.close().catch(()=>{})
 assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('shakeink-composer-height-'))
 await rm(temporary,{recursive:true,force:true});report.cleanedIsolatedData=true
 report.completedAt=new Date().toISOString()
 await writeFile(join(evidence,'windows-electron.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error,evidence:`docs/evidence/composer-height/${tag}/windows-electron.json`}))
}
