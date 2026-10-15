import {_electron as electron} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename,dirname,join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {defaultState} from '../desktop/core/settings.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'

assert.equal(process.platform,'win32','This acceptance runs on actual Windows')
const temporary=await mkdtemp(join(tmpdir(),'shakeink-composer-send-')),root=join(temporary,'data')
const evidence=resolve('docs/evidence/composer-send-options'),checks=[],errors=[],requests=[]
const startedAt=new Date().toISOString()
let app,page
await mkdir(root,{recursive:true});await mkdir(evidence,{recursive:true})
const capture=name=>join(evidence,name)
async function launch(){
 app=await electron.launch({args:[resolve('.')],env:{...process.env,SHAKEINK_TEST_ROOT:root},timeout:45000})
 page=await app.firstWindow({timeout:45000});page.setDefaultTimeout(10000)
 page.on('pageerror',error=>errors.push(error.message))
 page.on('request',request=>{if(/^https?:/i.test(request.url()))requests.push(new URL(request.url()).protocol)})
 await page.getByRole('button',{name:'暂不配置',exact:true}).click({timeout:45000})
 await expect(page.locator('.chat-composer-editable')).toBeVisible()
 await expect(page.locator('.chatpane')).toHaveAttribute('aria-busy','false')
 assert.equal(page.url(),'shakeink://app/')
 const state=await page.evaluate(()=>window.desktop.bootstrap())
 assert.equal(state.platform,'win32');assert.equal(state.models.length,0)
 assert.deepEqual(state.settings.shortcuts.win32,{})
}
async function close(){
 const closed=app.waitForEvent('close',{timeout:30000})
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close())
 await closed;app=undefined
}
async function menu(selected){
 await page.getByRole('button',{name:'对话模式',exact:true}).click()
 const popup=page.getByRole('menu'),items=popup.getByRole('menuitem')
 await expect(popup).toBeVisible();await expect(items).toHaveCount(2)
 assert.deepEqual(await items.allTextContents(),['标准模式','计划模式'])
 assert.doesNotMatch(await popup.innerText(),/发送方式|Enter|换行/)
 await page.screenshot({path:capture(`${selected}-menu.png`)})
 return popup
}
async function composeLines(){
 const composer=page.locator('.chat-composer-editable')
 await expect(composer).toHaveAttribute('data-placeholder',/Enter 发送，Shift\+Enter 换行/)
 await composer.fill('专项输入第一行');await composer.press('Shift+Enter');await page.keyboard.insertText('专项输入第二行')
 assert.match(await composer.innerText(),/专项输入第一行\n专项输入第二行/)
 await expect(page.getByRole('dialog',{name:'尚未配置模型',exact:true})).not.toBeVisible()
 return composer
}
async function sendGate(composer){
 await composer.press('Enter')
 const gate=page.getByRole('dialog',{name:'尚未配置模型',exact:true})
 await expect(gate).toBeVisible();await gate.getByRole('button',{name:'取消',exact:true}).click()
 await expect(gate).not.toBeVisible()
}
try{
 const workspaces=new Workspaces(root,resolve('prisma/migrations'))
 try{await workspaces.initialize()}finally{await workspaces.close()}
 // Isolated completed-onboarding precondition, with no model/secret/provider.
 await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:{...defaultState,onboarding:{version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}}}))
 await launch()
 let popup=await menu('standard');await popup.getByRole('menuitem',{name:'计划模式',exact:true}).click()
 await expect(page.getByRole('button',{name:'对话模式'})).toContainText('计划模式')
 popup=await menu('plan');await popup.getByRole('menuitem',{name:'标准模式',exact:true}).click()
 await expect(page.getByRole('button',{name:'对话模式'})).toContainText('标准模式')
 checks.push('CSO-08: actual Windows mode menus contain only standard/plan choices and both choices work')
 let composer=await composeLines()
 checks.push('CSO-09a: default Shift+Enter inserts a real contenteditable newline without sending')
 for(const marker of ['isComposing','keyCode229']){
  await composer.evaluate((element,marker)=>{
   const event=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true,isComposing:marker==='isComposing',keyCode:marker==='keyCode229'?229:13})
   element.dispatchEvent(event)
   if(event.defaultPrevented)throw Error('Composition Enter must remain unconsumed')
  },marker)
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  await expect(page.getByRole('dialog',{name:'尚未配置模型',exact:true})).not.toBeVisible()
 }
 checks.push('CSO-10a: synthetic isComposing and keyCode229 Enter do not trigger the model gate')
 await sendGate(composer)
 checks.push('CSO-09b: ordinary Enter reaches the real no-model send gate; no provider request is made')
 await composer.fill('')
 await page.evaluate(()=>localStorage.setItem('chat-model-effort-memory',JSON.stringify({version:0,state:{enterToSend:false,modelEffortMemory:{'local-test-model':'high'},lastModelChoice:{modelId:'local-test-model',effort:'high'}}})))
 await close();await launch()
 popup=await menu('restart');await page.keyboard.press('Escape')
 composer=await composeLines();await sendGate(composer)
 const memory=await page.evaluate(()=>JSON.parse(localStorage.getItem('chat-model-effort-memory')).state)
 assert.deepEqual(memory,{modelEffortMemory:{'local-test-model':'high'},lastModelChoice:{modelId:'local-test-model',effort:'high'}})
 checks.push('CSO-10b: actual close/reopen ignores legacy false preference, retains model memories and default keys')
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[])
 const listeners=await app.evaluate(()=>process._getActiveHandles().filter(handle=>handle.constructor.name==='Server'&&handle.listening).length)
 assert.equal(listeners,0)
 checks.push('scope guard: no configured models, no renderer HTTP requests, no main-process listening servers')
 const sourceHashes=Object.fromEntries(await Promise.all(['src/components/layout/ChatPanel.tsx','src/stores/chat.ts','src/lib/desktop/composer-shortcuts.ts','dist/main/index.cjs'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])))
 await writeFile(capture('windows-electron.json'),JSON.stringify({status:'passed',scope:'Actual Windows development Electron; real React composer; Playwright mouse/CDP keyboard; isolated data. No provider, physical IME, package, macOS or full-suite acceptance.',startedAt,completedAt:new Date().toISOString(),checks,errors,rendererHttpRequests:requests.length,listeningServers:listeners,sourceHashes},null,2)+'\n')
 console.log(JSON.stringify({status:'passed',checks:checks.length,evidence:'docs/evidence/composer-send-options/windows-electron.json'}))
}catch(error){
 await page?.screenshot({path:capture('failure.png')}).catch(()=>{})
 await writeFile(capture('windows-electron-failure.json'),JSON.stringify({status:'failed',startedAt,checks,error:String(error).replaceAll(temporary,'<isolated-temp>').replaceAll(process.cwd(),'<repo>'),errors},null,2)+'\n')
 throw error
}finally{
 await app?.close().catch(()=>{})
 // This exact directory is created above by mkdtemp and owns both test roots.
  assert.equal(dirname(resolve(temporary)),resolve(tmpdir()))
  assert.ok(basename(temporary).startsWith('shakeink-composer-send-'))
 await rm(temporary,{recursive:true,force:true})
}
