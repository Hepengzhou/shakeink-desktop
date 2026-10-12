import {_electron} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename,dirname,join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {defaultState} from '../desktop/core/settings.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'

assert.equal(process.platform,'win32','Actual Windows required')
const temporary=await mkdtemp(join(tmpdir(),'xaanink-chat-empty-')),evidence=resolve('docs/evidence/chat-empty-state')
const checks=[],errors=[],httpRequests=[],runtime=[],nativeObservations=[],screenshots=[],startedAt=new Date().toISOString()
const limitations=[]
let app,page,theme
await mkdir(evidence,{recursive:true})
const output=name=>join(evidence,name)
const redact=value=>String(value).replaceAll(temporary,'<isolated-temp>').replaceAll(process.cwd(),'<repo>')
async function check(label,action){await action();checks.push({theme,label,status:'passed'})}
async function capture(name){
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.chat-empty-state img')].map(image=>image.decode().catch(()=>{})))})
 await page.screenshot({path:output(name)});screenshots.push(name)
}
async function launch(selectedTheme){
 theme=selectedTheme
 const root=join(temporary,theme);await mkdir(root,{recursive:true})
 const workspaces=new Workspaces(root,resolve('prisma/migrations'))
 try{await workspaces.initialize()}finally{await workspaces.close()}
 const state=structuredClone(defaultState);state.settings.appearance.theme=theme
 state.onboarding={version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}
 await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state}))
 app=await _electron.launch({args:[resolve('.')],env:{...process.env,XAANINK_TEST_ROOT:root},timeout:60000})
 page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(12000)
 await page.context().setOffline(true)
 // Playwright enables focus emulation on Chromium pages by default. Remove
 // that test override so native Windows blur/visibility events remain real.
 const protocol=await page.context().newCDPSession(page)
 await protocol.send('Emulation.setFocusEmulationEnabled',{enabled:false})
 page.on('pageerror',error=>errors.push({theme,message:redact(error.message)}))
 page.on('request',request=>{if(/^https?:/i.test(request.url()))httpRequests.push({theme,protocol:new URL(request.url()).protocol})})
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
 const skip=page.getByRole('button',{name:'暂不配置',exact:true})
 await skip.waitFor({timeout:45000});await skip.click()
 await expect(page.getByTestId('chat-empty-state')).toBeVisible()
 await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
 assert.equal(page.url(),'xaanink://app/')
 const bootstrap=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(bootstrap.models.length,0);assert.equal(bootstrap.platform,'win32');assert.equal(bootstrap.dataRoot,root)
 runtime.push(await app.evaluate(({app})=>({platform:process.platform,versions:process.versions,version:app.getVersion(),listeningServers:process._getActiveHandles().filter(h=>h.constructor.name==='Server'&&h.listening).length})))
}
async function run(){
 const welcome=page.getByTestId('chat-empty-state'),editor=page.getByTestId('composer-editor')
 await check('CES-11: offline first page has exactly seven approved real entries',async()=>{
  await expect(welcome.getByRole('button')).toHaveCount(7)
  assert.deepEqual(await welcome.getByRole('button').evaluateAll(elements=>elements.map(e=>e.getAttribute('aria-label'))),['创建作品','新角色','新世界观','新场景','仙侠','历史','科幻'])
  assert.equal(await page.getByRole('button',{name:'发送',exact:true}).isDisabled(),true)
 })
 await check('CES-09: card grid and composer share edges; four cards equal; actual theme filter',async()=>{
  const measured=await page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON()
   return {cards:rect('.chat-empty-actions'),composer:rect('.chat-empty-composer'),heights:[...document.querySelectorAll('.chat-empty-action')].map(e=>e.getBoundingClientRect().height),filter:getComputedStyle(document.querySelector('.chat-empty-card-art')).filter}
  })
  assert.ok(Math.abs(measured.cards.left-measured.composer.left)<1);assert.ok(Math.abs(measured.cards.width-measured.composer.width)<1)
  assert.ok(measured.cards.width<=801);assert.ok(measured.heights.every(h=>Math.abs(h-114)<1))
  assert.equal(measured.filter,theme==='paper'?'grayscale(1) sepia(0.5) brightness(0.62)':'grayscale(1) brightness(0.62)')
 });await capture(`${theme}-welcome.png`)
 await check('CES-04: real quick prompts append and native Undo retains author text; no send',async()=>{
  await editor.fill('作者尚未发送的灵感');await welcome.getByRole('button',{name:'新角色',exact:true}).click()
  await expect(editor).toContainText('【角色】');await expect(editor).toContainText('作者尚未发送的灵感');await expect(editor).toBeFocused()
  await editor.press('Control+z');await expect(editor).toHaveText('作者尚未发送的灵感')
  await editor.press('Control+y');await expect(editor).toContainText('【角色】')
  const original=await editor.innerText();await welcome.getByRole('button',{name:'新角色',exact:true}).click();assert.equal(await editor.innerText(),original)
  for(const [button,marker] of [['新世界观','【世界观】'],['新场景','【场景】']]){await welcome.getByRole('button',{name:button,exact:true}).click();await expect(editor).toContainText(marker)}
  assert.equal(await page.getByRole('button',{name:'发送',exact:true}).isDisabled(),true)
  assert.equal(await page.locator('[data-testid="composer-editor"]').count(),1)
 })
 await check('CES-03: real creation wizard cancel preserves draft; template library is locally loaded',async()=>{
  const before=await editor.innerText();await welcome.getByRole('button',{name:'创建作品',exact:true}).click()
  const wizard=page.getByRole('dialog',{name:'创作向导',exact:true});await expect(wizard).toBeVisible()
  await expect(wizard.getByRole('button',{name:'确定',exact:true})).toBeEnabled()
  await wizard.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await editor.innerText(),before)
 })
 for(const [genre,tags] of [['仙侠',['古典仙侠','修仙界','热血','升级流']],['历史',['架空历史','古代','正剧','权谋']],['科幻',['星际文明','星际','烧脑','经营']]]){
  await check(`CES-02: ${genre} opens the real wizard with channel, length, genre and four tag groups`,async()=>{
   await welcome.getByRole('button',{name:genre,exact:true}).click()
   const wizard=page.getByRole('dialog',{name:'创作向导',exact:true});await expect(wizard).toBeVisible()
   for(const name of ['男频','长篇',genre,...tags])await expect(wizard.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true')
   await wizard.getByRole('button',{name:'取消',exact:true}).click()
  })
 }
 await check('CES-03: confirm prepares a new unassociated unsent work; no DB work is created',async()=>{
  await editor.fill('');await welcome.getByRole('button',{name:'仙侠',exact:true}).click()
  const wizard=page.getByRole('dialog',{name:'创作向导',exact:true});await expect(wizard.getByRole('button',{name:'确定',exact:true})).toBeEnabled();await wizard.getByRole('button',{name:'确定',exact:true}).click()
  await expect(wizard).not.toBeVisible();await expect(editor).toBeFocused();await expect(editor).toContainText('仙侠');await expect(page.getByRole('button',{name:'选择要创作的小说',exact:true})).toContainText('待创建')
  const result=await page.evaluate(async()=>{const response=await fetch('/api/novels');return response.json()});assert.equal(result.novels.length,0)
  assert.equal(await page.getByRole('button',{name:'发送',exact:true}).isDisabled(),true)
 })
 await editor.fill('')
 await check('CES-07/08: actual native blur and hide clear the frame; hover expands once and reverses',async()=>{
  const button=welcome.getByRole('button',{name:'新角色',exact:true}),sprite=button.locator('[data-role="card-art"]')
  await button.hover();await expect(sprite).toHaveAttribute('data-frame','12');await page.waitForTimeout(200);await expect(sprite).toHaveAttribute('data-frame','12')
  // A second actual native window receives focus. Calling blur() on the only
  // window can leave Windows without a new foreground target and change nothing.
  nativeObservations.push(await app.evaluate(async({BrowserWindow,app})=>{
   const main=BrowserWindow.getAllWindows()[0]
   const helper=new BrowserWindow({width:280,height:180,show:false,skipTaskbar:true,title:'窗口焦点验收',webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}})
   globalThis.__chatEmptyFocusWindow=helper
   await helper.loadURL('about:blank');main.blur();helper.show();app.focus({steal:true});helper.focus();helper.webContents.focus()
   return {kind:'focus-transfer',mainFocused:main.isFocused(),helperFocused:helper.isFocused()}
  }))
  await page.waitForFunction(()=>!document.hasFocus());await expect(sprite).toHaveAttribute('data-frame','0')
  await app.evaluate(({BrowserWindow})=>{globalThis.__chatEmptyFocusWindow.destroy();delete globalThis.__chatEmptyFocusWindow;const main=BrowserWindow.getAllWindows()[0];main.focus();main.webContents.focus()})
  await page.waitForFunction(()=>document.hasFocus());await button.hover();await expect(sprite).toHaveAttribute('data-frame','12')
  const visibilityProtocol=await page.context().newCDPSession(page)
  await visibilityProtocol.send('Emulation.setFocusEmulationEnabled',{enabled:false})
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide())
  const nativeHidden=await app.evaluate(({BrowserWindow})=>!BrowserWindow.getAllWindows()[0].isVisible())
  assert.equal(nativeHidden,true);await expect(sprite).toHaveAttribute('data-frame','0')
  const observed=await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus(),frame:document.querySelector('[data-sprite="card-character"]').getAttribute('data-frame')}))
  assert.equal(observed.focused,false)
  nativeObservations.push({kind:'native-hide',theme,nativeHidden,...observed})
  if(!observed.hidden)limitations.push(`${theme}: actual native window was hidden and animation reset via real blur, but Chromium under automation still reported document.hidden=false; a true document.hidden visibilitychange branch was not observed.`)
  await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.show();win.focus()});await page.waitForFunction(()=>!document.hidden&&document.hasFocus())
  await page.mouse.move(10,10);await expect(sprite).toHaveAttribute('data-frame','0')
 })
 await check('CES-09: actual short window keeps bottom composer and all cards reachable',async()=>{
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1000,height:650}))
  await welcome.getByRole('button',{name:'科幻',exact:true}).scrollIntoViewIfNeeded();await expect(welcome.getByRole('button',{name:'科幻',exact:true})).toBeInViewport();await expect(editor).toBeInViewport()
 });await capture(`${theme}-short.png`)
 await app.close();app=undefined
}
try{
 for(const selectedTheme of ['paper','ink']){await launch(selectedTheme);await run()}
 assert.deepEqual(errors,[]);assert.deepEqual(httpRequests,[]);assert.ok(runtime.every(r=>r.listeningServers===0))
 const sourceHashes=Object.fromEntries(await Promise.all(['src/components/layout/ChatPanel.tsx','src/components/layout/CreateNovelDialog.tsx','src/components/chat/ChatEmptyState.tsx','src/components/chat/use-chat-empty-motion.ts','public/brand/chat-empty/manifest.json','dist/main/index.cjs','out/index.html','scripts/smoke-chat-empty-state.mjs'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])))
 await writeFile(output('windows-electron.json'),JSON.stringify({status:'passed',startedAt,completedAt:new Date().toISOString(),scope:'Actual Windows development Electron, compiled production React, real isolated local API/database. CDP keyboard with focus emulation explicitly disabled; native second-window focus transfer and BrowserWindow visibility. See limitations for document.hidden. No physical IME, supplier endpoint, package or macOS acceptance.',checks,screenshots,errors,rendererHttpRequests:httpRequests.length,runtime,nativeObservations,limitations,sourceHashes},null,2)+'\n')
 console.log(JSON.stringify({status:'passed',checks:checks.length,evidence:'docs/evidence/chat-empty-state/windows-electron.json'}))
}catch(error){
 nativeObservations.push({kind:'failure-observation',theme,...await app?.evaluate(({BrowserWindow})=>({windows:BrowserWindow.getAllWindows().map(w=>({visible:w.isVisible(),focused:w.isFocused(),url:w.webContents.getURL(),backgroundThrottling:w.webContents.getBackgroundThrottling()}))})).catch(()=>({})),...await page?.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus(),visibility:document.visibilityState})).catch(()=>({}))})
 await page?.screenshot({path:output('failure.png')}).catch(()=>{})
 await writeFile(output('windows-electron-failure.json'),JSON.stringify({status:'failed',startedAt,theme,checks,errors,nativeObservations,error:redact(error.stack||error)},null,2)+'\n');throw error
}finally{
 await app?.close().catch(()=>{})
 assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('xaanink-chat-empty-'))
 await rm(temporary,{recursive:true,force:true})
}
