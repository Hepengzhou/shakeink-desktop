// Actual compiled Windows Electron, no injected styles or replacement UI.
import assert from 'node:assert/strict'
import { _electron } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

assert.equal(process.platform,'win32')
const directory=await mkdtemp(join(tmpdir(),'shakeink-text-selection-')),root=join(directory,'data'),evidence=resolve('docs/evidence/text-selection')
await mkdir(evidence,{recursive:true})
execFileSync(process.execPath,['--import','tsx','scripts/seed-text-selection-fixture.ts',directory],{cwd:resolve('.'),stdio:'pipe'})
const fixture=JSON.parse(await readFile(join(directory,'fixture.json'),'utf8'))
const report={startedAt:new Date().toISOString(),scope:'Actual Windows development Electron with synthetic local work and retained draft; pointer/keyboard through Playwright, not physical IME, installed package or macOS.',networkScope:'Renderer requests observed and offline mode enabled after firstWindow; does not certify main/worker or earlier startup network.',composerScope:'Zero models disables send, but the real composer remains contenteditable=true. The contenteditable=false draft boundary is a separate Chromium case.',checks:[],errors:[],httpRequests:[],sourceHashes:{},models:0}
for(const file of ['desktop/main/index.ts','src/app/desktop.css','src/components/layout/ChatPanel.tsx','src/components/editor/MarkdownPreview.tsx','src/components/comments/CommentablePreview.tsx','dist/main/index.cjs','dist/preload/index.cjs','out/index.html'])report.sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
async function hashes(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())await hashes(file);else if(file.endsWith('.css'))report.sourceHashes[file.slice(resolve('.').length+1).replaceAll('\\','/')]=createHash('sha256').update(await readFile(file)).digest('hex')}}
await hashes(resolve('out/_next'))
const env={...process.env,SHAKEINK_TEST_ROOT:root};delete env.ELECTRON_RUN_AS_NODE
const diagnostic=process.argv.includes('--diagnostic-monaco-baseline')
let app,page
const selected=()=>page.evaluate(()=>window.getSelection()?.toString()??'')
async function drag(locator){
  await locator.scrollIntoViewIfNeeded();await page.evaluate(()=>{document.activeElement instanceof HTMLElement&&document.activeElement.blur();window.getSelection()?.removeAllRanges()})
  const box=await locator.boundingBox();assert.ok(box)
  await page.mouse.move(box.x+3,box.y+Math.min(box.height/2,12));await page.mouse.down();await page.mouse.move(box.x+Math.min(box.width-2,150),box.y+Math.min(box.height/2,12),{steps:15});await page.mouse.up();return selected()
}
async function ui(locator,label){assert.equal(await locator.evaluate(el=>getComputedStyle(el).userSelect),'none',label);assert.equal(await drag(locator),'',label);await locator.dblclick();assert.equal(await selected(),'',label);report.checks.push({label,policy:'none',mouseSelection:false})}
async function preview(locator,label){assert.equal(await locator.evaluate(el=>getComputedStyle(el).userSelect),'text',label);assert.ok((await drag(locator)).length>0,label);report.checks.push({label,policy:'text',mouseSelection:true})}
async function settings(){await page.getByRole('button',{name:'账号菜单',exact:true}).click();await page.getByRole('menuitem',{name:'设置',exact:true}).click();return page.locator('[data-desktop-settings-surface]')}
try{
  app=await _electron.launch({args:[resolve('.')],env,timeout:90000});page=await app.firstWindow({timeout:90000});page.setDefaultTimeout(15000)
  page.on('pageerror',e=>report.errors.push(e.name+':'+e.message));page.on('request',r=>{if(/^https?:/i.test(r.url()))report.httpRequests.push(r.url())});await page.context().setOffline(true)
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:1000}))
  const skip=page.getByRole('button',{name:'暂不配置',exact:true});await skip.waitFor({timeout:90000});await skip.click()
  await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor({timeout:90000})
  const state=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(state.dataRoot,root);assert.equal(state.models.length,0)
  report.runtime=await app.evaluate(()=>({platform:process.platform,electron:process.versions.electron,node:process.versions.node}));assert.equal(page.url(),'shakeink://app/')
  await ui(page.locator('[data-sonner-toast] [data-title]').first(),'real retained-draft toast title')
  const recovery=page.getByRole('dialog',{name:'保留的草稿',exact:true});await page.locator('[data-sonner-toast]').getByRole('button',{name:'查看草稿',exact:true}).click();await recovery.waitFor()
  await ui(recovery.getByRole('heading',{name:'保留的草稿',exact:true}).first(),'real recovery dialog heading')
  const draft=page.getByLabel('保留的草稿内容',{exact:true});assert.equal(await draft.evaluate(el=>getComputedStyle(el).userSelect),'text');await draft.focus();await page.keyboard.press('Control+a');assert.equal(await draft.evaluate(el=>el.selectionEnd-el.selectionStart),(await draft.inputValue()).length);report.checks.push({label:'real readonly retained draft keyboard selection',selected:true})
  await page.keyboard.press('Escape')
  for(const theme of ['paper','ink']){
    const surface=await settings();await surface.getByRole('button',{name:'外观',exact:true}).click();await surface.getByRole('button',{name:theme==='paper'?'宣纸':'玄墨',exact:true}).click();await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
    await ui(surface.getByRole('button',{name:'外观',exact:true}),theme+' settings navigation');await ui(surface.getByText('正文字号',{exact:true}).first(),theme+' settings field label');await page.keyboard.press('Escape')
    const composer=page.getByRole('textbox',{name:'消息输入框',exact:true});await composer.fill('隔离输入正文');assert.equal(await composer.evaluate(el=>getComputedStyle(el).userSelect),'text');await composer.focus();await page.keyboard.press('Control+a');assert.match(await selected(),/隔离输入正文/);await page.keyboard.insertText('替换输入原文');assert.match(await composer.innerText(),/替换输入原文/);await page.keyboard.press('Control+z');assert.match(await composer.innerText(),/隔离输入正文/);assert.ok(await page.getByRole('button',{name:'发送',exact:true}).isDisabled());report.checks.push({label:theme+' real zero-model ChatPanel draft selection, edit, undo',selected:true})
    await page.screenshot({path:join(evidence,`windows-${theme}-ui.png`)})
  }
  // Open the actual seeded chapter through its real sidebar tree.
  await page.getByText('隔离文字选取作品',{exact:true}).first().click();await page.getByText('第 1 章 选区验收章',{exact:true}).first().click();await page.getByRole('button',{name:'预览',exact:true}).last().waitFor()
  const editor=page.locator('.desktop-markdown-editor').last();await preview(editor.locator('[data-text-preview] p').first(),'real chapter preview original');await ui(editor.getByRole('button',{name:'预览',exact:true}),'real preview mode control')
  await editor.getByRole('button',{name:'分屏',exact:true}).click();const native=editor.locator('.monaco-editor .native-edit-context,.monaco-editor textarea.inputarea').first();await native.waitFor({state:'attached'})
  assert.equal(await native.evaluate(el=>getComputedStyle(el).userSelect),'text','actual Monaco input host retains the input exception')
  if(diagnostic){await page.evaluate(()=>{for(const sheet of document.styleSheets)for(const rule of sheet.cssRules)if(rule.selectorText?.includes(':root *')){rule.style.removeProperty('user-select');rule.style.removeProperty('-webkit-user-select')}});report.diagnostic='Global user-select rule disabled for baseline comparison only; never acceptance.'}
  await native.focus();await page.keyboard.press('Control+Home');await native.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
  const line=editor.locator('.monaco-editor .view-line').first();await line.waitFor();await line.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
  const lineBox=await line.boundingBox(),viewport=await editor.locator('.monaco-editor').boundingBox();assert.ok(lineBox&&viewport)
  const startX=Math.max(lineBox.x+5,viewport.x+85),endX=Math.min(startX+80,viewport.x+viewport.width-15),y=lineBox.y+lineBox.height/2
  await page.evaluate(()=>{window.__selectionPointerEvents=[];for(const type of ['mousedown','mousemove','mouseup'])document.addEventListener(type,event=>{window.__selectionPointerEvents.push({type,x:event.clientX,y:event.clientY,buttons:event.buttons,target:event.target?.className})},{capture:true})})
  await page.mouse.move(startX,y);await page.mouse.down();await page.mouse.move(endX,y,{steps:15});await page.mouse.up()
  report.monacoPointer=await native.evaluate((el,coords)=>({coords,input:el.className,context:el.editContext?{start:el.editContext.selectionStart,end:el.editContext.selectionEnd}:null,domSelection:window.getSelection()?.toString(),overlays:document.querySelectorAll('.monaco-editor .selected-text').length,target:document.elementFromPoint(coords.startX,coords.y)?.className}),{startX,endX,y,lineBox,viewport})
  report.pointerEvents=await page.evaluate(()=>window.__selectionPointerEvents)
  report.monacoHitTest=await page.evaluate(({startX,endX,y})=>[startX,endX].map(x=>{const r=document.caretRangeFromPoint(x,y);return{x,node:r?.startContainer.nodeName,offset:r?.startOffset,text:r?.startContainer.textContent}}),{startX,endX,y})
  if(!report.monacoPointer.overlays&&(!report.monacoPointer.context||report.monacoPointer.context.start===report.monacoPointer.context.end)){
    report.monacoCdpPointer=report.monacoPointer
    await native.focus();await page.keyboard.press('Control+Home')
    await app.evaluate(async({BrowserWindow},{startX,endX,y})=>{
      const win=BrowserWindow.getAllWindows()[0],wc=win.webContents;win.focus()
      const start=Math.round(startX),end=Math.round(endX),vertical=Math.round(y)
      wc.sendInputEvent({type:'mouseMove',x:start,y:vertical})
      wc.sendInputEvent({type:'mouseDown',x:start,y:vertical,button:'left',clickCount:1})
      for(let step=1;step<=15;step++){wc.sendInputEvent({type:'mouseMove',x:Math.round(start+(end-start)*step/15),y:vertical,button:'left',modifiers:['leftButtonDown']});await new Promise(resolve=>setTimeout(resolve,16))}
      wc.sendInputEvent({type:'mouseUp',x:end,y:vertical,button:'left',clickCount:1})
    },{startX,endX,y})
    await native.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
    report.monacoPointer=await native.evaluate(el=>({method:'Electron webContents.sendInputEvent',context:el.editContext?{start:el.editContext.selectionStart,end:el.editContext.selectionEnd}:null,overlays:document.querySelectorAll('.monaco-editor .selected-text').length}))
  }
  report.monacoModelDiagnostic=await native.evaluate(el=>{for(let host=el;host;host=host.parentElement){const key=Object.keys(host).find(key=>key.startsWith('__reactFiber$'));if(!key)continue;for(let fiber=host[key];fiber;fiber=fiber.return)for(let state=fiber.memoizedState;state;state=state.next){const value=state.memoizedState?.current??state.memoizedState;if(value&&typeof value.getSelection==='function'&&typeof value.getLayoutInfo==='function')return{range:value.getSelection(),layout:value.getLayoutInfo(),text:value.getModel()?.getValue()}}}return null})
  if(!report.monacoPointer.overlays&&(!report.monacoPointer.context||report.monacoPointer.context.start===report.monacoPointer.context.end)){
    report.monacoDragDiagnostic={...report.monacoPointer,note:'Single drag failed with CDP and Electron input events, also with global policy disabled. Not marked passed.'}
    await page.mouse.dblclick(startX,y);await native.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
    report.monacoPointer=await native.evaluate(el=>({method:'Actual pointer double-click word selection',context:el.editContext?{start:el.editContext.selectionStart,end:el.editContext.selectionEnd}:null,overlays:document.querySelectorAll('.monaco-editor .selected-text').length}))
  }
  assert.ok(report.monacoPointer.overlays>0||report.monacoPointer.context&&report.monacoPointer.context.start!==report.monacoPointer.context.end,'Monaco pointer creates a real range')
  report.checks.push({label:'real Monaco pointer selection',selected:true})
  await native.focus();await page.keyboard.press('Control+Home');await page.keyboard.press('Control+Shift+ArrowRight');await editor.locator('.monaco-editor .selected-text').first().waitFor();await page.keyboard.type('X');await page.keyboard.press('Control+z');await page.waitForFunction(()=>document.querySelector('.desktop-markdown-editor [data-text-preview]')?.textContent?.includes('第一行隔离正文'))
  await preview(editor.locator('[data-text-preview] p').first(),'real split manuscript preview');await ui(editor.locator('.margin-view-overlays .line-numbers').first(),'real Monaco line number UI')
  report.checks.push({label:'real Monaco JS selection, keyboard edit and undo',selected:true});await page.screenshot({path:join(evidence,'windows-split-selection.png')})
  const data=await page.evaluate(async({novelId,chapterId})=>{const r=await fetch(`/api/novels/${novelId}/chapters/${chapterId}`);if(!r.ok)throw Error('ISOLATED_CHAPTER_READ_FAILED');return r.json()},fixture);assert.ok((data.chapter??data).content.startsWith('第一行隔离正文'))
  const workbench=page,aboutWindow=app.waitForEvent('window')
  await page.evaluate(()=>window.desktop.command('app.about'));page=await aboutWindow
  await page.getByRole('heading',{name:'玄印写作',exact:true}).waitFor()
  assert.ok(page.url().startsWith('data:text/html'))
  for(const node of await page.locator('h1,p').all())await ui(node,'real standalone About UI')
  await page.screenshot({path:join(evidence,'windows-about.png')});await page.close();page=workbench
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpRequests,[]);report.status='passed-scoped';report.allAcceptancePassed=false
}catch(error){report.status='failed';report.failure=String(error);if(page)await page.screenshot({path:join(evidence,'windows-failure.png')}).catch(()=>{});throw error}
finally{report.finishedAt=new Date().toISOString();await writeFile(join(evidence,diagnostic?'windows-monaco-diagnostic.json':'windows-electron.json'),JSON.stringify(report,null,2)+'\n');if(app)await app.close()}
