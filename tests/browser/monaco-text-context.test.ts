import assert from 'node:assert/strict'
import {test} from 'node:test'
import {build} from 'esbuild'
import {chromium,type Browser,type Page} from 'playwright-core'
import type {editor as MonacoEditor} from 'monaco-editor'

// This fixture runs the installed Monaco and the production adapter/controller.
// Only Electron menu IPC is held in memory. Clipboard is Chromium's real API;
// these checks do not claim native Electron popup/OS acceptance.
const contents=`
import * as monaco from 'monaco-editor';
import {bindMonacoTextContext} from './src/lib/desktop/monaco-text-context';
import {captureRegisteredTextContext,protectTextContextMouseDown} from './src/lib/desktop/text-context-adapters';
import {installTextContextMenu} from './src/lib/desktop/text-context-menu';
import {registerTextQuoteTarget} from './src/lib/desktop/text-quote-target';
self.MonacoEnvironment={getWorker:()=>new Worker('/monaco-worker.js',{type:'module'})};
const host=document.getElementById('editor');
const model=monaco.editor.createModel('Alpha Ω\\nSecond line\\nThird 中','markdown');
const editor=monaco.editor.create(host,{model,contextmenu:true,minimap:{enabled:false},scrollBeyondLastLine:false,automaticLayout:true,fontSize:16,lineHeight:24});
let disposeAdapter=bindMonacoTextContext(editor),disposeController=null,clipboardGate=null,clipboardResolve=null,quoteGate=null,quoteResolve=null,quoteUsesFocus=false;
let capture=null,quotes=[],menus=[],errors=[],cancelled=[],reads=0,quoteCalls=0,quoteFinished=0;
const pending=new Map();
const quoteDispose=registerTextQuoteTarget({identity:()=> 'fixture-chat',available:()=>true,append:async(text,assertCurrent,focus)=>{quoteCalls++;try{if(quoteGate)await quoteGate;assertCurrent();if(quoteUsesFocus){focus(()=>document.getElementById('quote-target').focus());assertCurrent()}quotes.push(text)}finally{quoteFinished++}}});
window.desktop={readClipboardText:async()=>{reads++;return clipboardGate?await clipboardGate:navigator.clipboard.readText()}};
function controller(){disposeController=installTextContextMenu({document,show:request=>{menus.push(request);return new Promise(resolve=>pending.set(request.requestId,resolve))},cancel:requestId=>{cancelled.push(requestId);pending.get(requestId)?.({requestId,command:null});pending.delete(requestId)},writeText:text=>navigator.clipboard.writeText(text),readText:()=>navigator.clipboard.readText(),nativeEdit:async()=>{throw Error('Ordinary input edit is outside this Monaco fixture')},onError:error=>errors.push(String(error))})}
controller();
editor.addAction({id:'fixture.contextAction',label:'Fixture editor action',contextMenuGroupId:'navigation',contextMenuOrder:1.5,run:()=>{window.f.specialActions++}});
const point=(line,column)=>{const at=editor.getScrolledVisiblePosition({lineNumber:line,column});if(!at)throw Error('Model position not visible');const box=editor.getDomNode().getBoundingClientRect();return {x:box.left+at.left+1,y:box.top+at.top+at.height/2}};
const targetAt=at=>document.elementFromPoint(at.x,at.y);
const take=()=>{capture=captureRegisteredTextContext(editor.getDomNode());if(!capture)throw Error('Monaco did not capture');return {text:capture.text,commands:capture.commands,current:capture.isCurrent()}};
window.f={editor,model,menus,quotes,errors,cancelled,specialActions:0,point,targetAt,take,
 setSelections:rows=>editor.setSelections(rows.map(([a,b,c,d])=>new monaco.Selection(a,b,c,d))),
 select:(a,b,c,d)=>editor.setSelection(new monaco.Selection(a,b,c,d)),
 execute:async id=>{await capture.execute(id,()=>{if(!capture.isCurrent())throw Error('Snapshot changed')})},
 current:()=>capture.isCurrent(),restore:()=>capture.restore(),
 value:()=>editor.getValue(),selections:()=>editor.getSelections().map(s=>[s.selectionStartLineNumber,s.selectionStartColumn,s.positionLineNumber,s.positionColumn]),
 choose:command=>{const request=menus.at(-1);pending.get(request.requestId)?.({requestId:request.requestId,command});pending.delete(request.requestId)},
 deferClipboard:()=>{clipboardGate=new Promise(resolve=>clipboardResolve=resolve)},releaseClipboard:text=>{clipboardResolve(text);clipboardGate=null},reads:()=>reads,
 deferQuote:useFocus=>{quoteUsesFocus=!!useFocus;quoteGate=new Promise(resolve=>quoteResolve=resolve)},releaseQuote:()=>{quoteResolve();quoteGate=null},quoteCalls:()=>quoteCalls,quoteFinished:()=>quoteFinished,
 modelABA:()=>{const ranges=editor.getSelections(),replacement=monaco.editor.createModel(model.getValue(),'markdown');editor.setModel(replacement);editor.setModel(model);editor.setSelections(ranges);replacement.dispose()},
 captureAt:at=>{const captured=captureRegisteredTextContext(targetAt(at),at);return captured?{text:captured.text,kind:captured.kind}:null},
 protectAt:at=>protectTextContextMouseDown(targetAt(at),at),
 stopController:()=>{disposeController?.();disposeController=null},startController:controller,
 unmount:()=>{disposeController?.();disposeAdapter();quoteDispose();editor.dispose();model.dispose()},
};
editor.focus();
`
const bundled=Promise.all([
 build({stdin:{contents,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'esm',outfile:'monaco-context-fixture.js',loader:{'.ttf':'dataurl'},define:{'process.env.NODE_ENV':'"development"'},tsconfig:'tsconfig.json',minify:true}),
 build({entryPoints:['node_modules/monaco-editor/esm/vs/editor/editor.worker.js'],bundle:true,write:false,platform:'browser',format:'esm',minify:true}),
]).then(([main,worker])=>({script:main.outputFiles!.find(file=>file.path.endsWith('.js'))!.text,css:main.outputFiles!.find(file=>file.path.endsWith('.css'))?.text??'',worker:worker.outputFiles![0].text}))
let browser:Browser
test.before(async()=>{browser=await chromium.launch({headless:true,executablePath:process.env.SHAKEINK_TEST_CHROMIUM??'C:/Program Files/Google/Chrome/Application/chrome.exe'})})
test.after(async()=>{await browser?.close()})
async function frames(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))}
async function scenario(run:(page:Page)=>Promise<void>){
 const context=await browser.newContext({viewport:{width:1000,height:600},permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),pageErrors:string[]=[]
 page.setDefaultTimeout(15000);page.on('pageerror',error=>pageErrors.push(error.message))
 try{
  const built=await bundled
  await context.route('**/*',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/monaco-worker.js'){await route.fulfill({contentType:'text/javascript',body:built.worker});return}if(route.request().isNavigationRequest()){await route.fulfill({contentType:'text/html',body:'<style>body{margin:20px}#editor{width:800px;height:300px}</style><div id="editor"></div><button id="outside">Other control</button><textarea id="quote-target" aria-label="Delayed quote receiver"></textarea>'});return}await route.abort()})
  await page.goto('http://127.0.0.1:1/monaco-text-context');await page.addStyleTag({content:built.css});await page.addScriptTag({content:built.script,type:'module'})
  await page.waitForFunction(()=>!!(window as any).f);await page.bringToFront();await frames(page)
  await run(page);assert.deepEqual(pageErrors,[])
 }finally{await page.evaluate(()=>(window as any).f?.unmount()).catch(()=>{});await context.close()}
}
async function menuAt(page:Page,line=1,column=3){
 const before=await page.evaluate(()=>(window as any).f.menus.length),at=await page.evaluate(([line,column])=>(window as any).f.point(line,column),[line,column])
 await page.mouse.click(at.x,at.y,{button:'right'});await page.waitForFunction(before=>(window as any).f.menus.length>before,before)
 await frames(page);assert.equal(await page.locator('.monaco-menu:visible').count(),0)
 return page.evaluate(()=>(window as any).f.menus.at(-1))
}
async function choose(page:Page,command:string|null){await page.evaluate(command=>(window as any).f.choose(command),command);await frames(page)}
async function value(page:Page){return page.evaluate(()=>(window as any).f.value())}

test('TCM14 real Monaco selected copy/cut use the actual Chromium clipboard and preserve edit history',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{(window as any).f.select(1,1,1,6)})
 const copy=await menuAt(page);assert.equal(copy.kind,'editor');assert.equal(copy.commands['text.copy'],true)
 await choose(page,'text.copy');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Alpha');assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
 await menuAt(page);await choose(page,'text.cut');await page.waitForFunction(()=>(window as any).f.value()===' Ω\nSecond line\nThird 中')
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Alpha')
 const undo=await menuAt(page,1,2);assert.equal(undo.commands['text.undo'],true);await choose(page,'text.undo');assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
 const redo=await menuAt(page);assert.equal(redo.commands['text.redo'],true);await choose(page,'text.redo');assert.equal(await value(page),' Ω\nSecond line\nThird 中')
 assert.deepEqual(await page.evaluate(()=>(window as any).f.errors),[])
}))
test('TCM14 multi-cursor non-primary right-click preserves all ranges and quotes in model order',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>(window as any).f.setSelections([[3,1,3,8],[1,1,1,8]]))
 const before=await page.evaluate(()=>(window as any).f.selections()),request=await menuAt(page,1,3)
 assert.equal(request.commands['text.quote'],true);assert.deepEqual(await page.evaluate(()=>(window as any).f.selections()),before)
 assert.equal(await page.evaluate(()=>(window as any).f.take().text),'Alpha Ω\n\nThird 中')
 await choose(page,'text.quote');assert.deepEqual(await page.evaluate(()=>(window as any).f.quotes),['> Alpha Ω\n> \n> Third 中\n\n'])
 assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
 await menuAt(page);await choose(page,'text.copy');assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),'Alpha Ω\nThird 中')
 await menuAt(page);await choose(page,'text.cut');assert.equal(await value(page),'\nSecond line\n');await menuAt(page,1,1);await choose(page,'text.undo');assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
}))
test('TCM14 paste and delete modify the real model and native undo/redo restores each edit',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(async()=>{await navigator.clipboard.writeText('Pasted 中');(window as any).f.select(1,1,1,6)})
 await menuAt(page);await choose(page,'text.pastePlain');assert.equal(await value(page),'Pasted 中 Ω\nSecond line\nThird 中')
 const undo=await menuAt(page);assert.equal(undo.commands['text.undo'],true);await choose(page,'text.undo');assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
 await menuAt(page);await choose(page,'text.redo');assert.equal(await value(page),'Pasted 中 Ω\nSecond line\nThird 中')
 await page.evaluate(()=>(window as any).f.select(2,1,2,7));await menuAt(page,2,3);await choose(page,'text.delete');assert.equal(await value(page),'Pasted 中 Ω\n line\nThird 中')
 await menuAt(page,2,3);await choose(page,'text.undo');assert.equal(await value(page),'Pasted 中 Ω\nSecond line\nThird 中')
 assert.deepEqual(await page.evaluate(()=>(window as any).f.errors),[])
}))
test('TCM14 readonly real Monaco permits selected copy and quote while all modifications are disabled',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.editor.updateOptions({readOnly:true});f.select(1,1,1,6)})
 const request=await menuAt(page);for(const id of ['text.cut','text.paste','text.pastePlain','text.delete','text.undo','text.redo'])assert.equal(request.commands[id],false,id)
 assert.equal(request.commands['text.copy'],true);assert.equal(request.commands['text.quote'],true)
 await choose(page,'text.copy');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Alpha')
 await menuAt(page);await choose(page,'text.quote');assert.deepEqual(await page.evaluate(()=>(window as any).f.quotes),['> Alpha\n\n']);assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
}))
test('TCM12/13 real Monaco invalidates delayed paste after model selection or readonly ABA',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.select(1,1,1,6);f.deferClipboard()});await menuAt(page);await choose(page,'text.paste')
 await page.waitForFunction(()=>(window as any).f.reads()===1)
 await page.evaluate(()=>{const f=(window as any).f;f.select(2,1,2,4);f.select(1,1,1,6);f.releaseClipboard('LATE')});await frames(page)
 assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中');assert.ok((await page.evaluate(()=>(window as any).f.errors)).length>0)
 await page.evaluate(()=>(window as any).f.deferClipboard());await menuAt(page);await choose(page,'text.paste');await page.waitForFunction(()=>(window as any).f.reads()===2)
 await page.evaluate(()=>{const f=(window as any).f;f.editor.updateOptions({readOnly:true});f.editor.updateOptions({readOnly:false});f.releaseClipboard('LATE')});await frames(page)
 assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
}))
test('TCM14 text hits are intercepted once; real find and comment ViewZone input are ordinary sources',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>(window as any).f.select(1,1,1,6));await menuAt(page)
 assert.equal(await page.evaluate(()=>(window as any).f.menus.length),1);await choose(page,'text.copy')
 const margin=await page.locator('.margin').first().boundingBox();assert.ok(margin);assert.equal(await page.evaluate(at=>(window as any).f.captureAt(at),{x:margin.x+5,y:margin.y+10}),null)
 await page.evaluate(()=>{const editor=(window as any).f.editor;editor.focus();editor.trigger('fixture','actions.find',{})});const input=page.locator('.find-widget textarea').first();await input.waitFor({state:'visible'});await input.fill('Alpha');await input.press('Control+a')
 const count=await page.evaluate(()=>(window as any).f.menus.length);await input.click({button:'right'});await page.waitForFunction(count=>(window as any).f.menus.length>count,count)
 assert.equal(await page.evaluate(()=>(window as any).f.menus.at(-1).kind),'input');await choose(page,null);await input.press('Escape');await frames(page);assert.equal(await page.locator('.find-widget').getAttribute('aria-hidden'),'true')
 await page.evaluate(()=>{const f=(window as any).f,node=document.createElement('div');node.style.zIndex='20';node.innerHTML='<input id="comment-zone" value="Comment text"/>';f.editor.changeViewZones((accessor:MonacoEditor.IViewZoneChangeAccessor)=>accessor.addZone({afterLineNumber:2,heightInPx:40,domNode:node}))});await frames(page)
 const zone=page.locator('#comment-zone');await zone.focus();await zone.press('Control+a');const next=await page.evaluate(()=>(window as any).f.menus.length);await zone.click({button:'right'});await page.waitForFunction(next=>(window as any).f.menus.length>next,next)
 assert.equal(await page.evaluate(()=>(window as any).f.menus.at(-1).kind),'input');assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
}))
test('TCM14 editor.context opens the complete original Monaco menu and preserves custom action',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.stopController();f.editor.getAction('editor.action.showContextMenu').run()})
 const original=page.locator('.monaco-menu:visible');await original.waitFor();const baseline=await original.locator('.action-label').allTextContents();assert.ok(baseline.includes('Fixture editor action'))
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('.monaco-menu').length===0);await page.evaluate(()=>(window as any).f.startController());await frames(page)
 await page.evaluate(()=>(window as any).f.select(1,1,1,6));const request=await menuAt(page);assert.equal(request.commands['editor.context'],true);await choose(page,'editor.context')
 const reopened=page.locator('.monaco-menu:visible');await reopened.waitFor();assert.deepEqual(await reopened.locator('.action-label').allTextContents(),baseline)
 // Monaco deliberately ignores mouseup for its first 100 ms to avoid the
 // opening right-click also activating an item. Allow that UI guard to settle.
 await page.waitForTimeout(150);await reopened.getByText('Fixture editor action',{exact:true}).click();await page.waitForFunction(()=>(window as any).f.specialActions===1);assert.equal(await page.evaluate(()=>(window as any).f.menus.length),1)
}))
test('TCM14 real Monaco scrollbar is not captured and retains its original behavior',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.model.setValue(Array.from({length:100},(_,index)=>'Synthetic line '+index).join('\n'));f.editor.setPosition({lineNumber:1,column:1})});await frames(page)
 const scrollbar=page.locator('#editor .monaco-scrollable-element > .scrollbar.vertical').first();await scrollbar.waitFor({state:'visible'});const box=await scrollbar.boundingBox();assert.ok(box)
 const point={x:box.x+box.width/2,y:box.y+box.height-20};assert.equal(await page.evaluate(at=>(window as any).f.captureAt(at),point),null)
 await page.evaluate(()=>(window as any).f.stopController());await page.mouse.click(point.x,point.y,{button:'right'});await frames(page);const originalMenuLabels=await page.locator('.monaco-menu:visible .action-label').allTextContents()
 if(originalMenuLabels.length)await page.keyboard.press('Escape');await page.evaluate(()=>(window as any).f.startController());await page.mouse.click(point.x,point.y,{button:'right'});await frames(page)
 assert.equal(await page.evaluate(()=>(window as any).f.menus.length),0);assert.deepEqual(await page.locator('.monaco-menu:visible .action-label').allTextContents(),originalMenuLabels)
}))
test('TCM14 keyboard menu and selectAll stay on the real editor model',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.select(1,3,1,3);f.editor.focus()});await page.keyboard.press('Shift+F10');await page.waitForFunction(()=>(window as any).f.menus.length===1)
 const request=await page.evaluate(()=>(window as any).f.menus.at(-1));assert.equal(request.kind,'editor');assert.equal(request.commands['text.copy'],false);assert.equal(request.commands['text.cut'],false);assert.equal(request.commands['text.quote'],false);assert.equal(request.commands['text.selectAll'],true)
 assert.equal(await page.locator('.monaco-menu:visible').count(),0);await choose(page,'text.selectAll');assert.deepEqual(await page.evaluate(()=>(window as any).f.selections()),[[1,1,3,8]])
 await menuAt(page);await choose(page,'text.copy');assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),'Alpha Ω\nSecond line\nThird 中')
}))
test('TCM12 real Monaco snapshots survive internal focus but reject model, selection and lifecycle changes',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.select(1,1,1,6);f.take();f.restore()});assert.equal(await page.evaluate(()=>(window as any).f.current()),true)
 await page.evaluate(()=>{const f=(window as any).f;f.select(2,1,2,4);f.select(1,1,1,6)});assert.equal(await page.evaluate(()=>(window as any).f.current()),false)
 await page.evaluate(()=>{const f=(window as any).f;f.take();f.editor.trigger('fixture','type',{text:'Replacement'});f.editor.trigger('fixture','undo',{})});assert.equal(await page.evaluate(()=>(window as any).f.current()),false)
 await page.evaluate(()=>{const f=(window as any).f;f.take();f.editor.setModel(null);f.editor.setModel(f.model)});assert.equal(await page.evaluate(()=>(window as any).f.current()),false)
 await page.evaluate(()=>{const f=(window as any).f;f.take();f.editor.dispose()});assert.equal(await page.evaluate(()=>(window as any).f.current()),false)
}))
for(const mutation of ['selection','readonly','model'] as const){
 test('TCM12/13 real Monaco delayed quote rejects '+mutation+' ABA',{timeout:180000},()=>scenario(async page=>{
  await page.evaluate(()=>{const f=(window as any).f;f.select(1,1,1,6);f.deferQuote()});const request=await menuAt(page);assert.equal(request.commands['text.quote'],true)
  await choose(page,'text.quote');await page.waitForFunction(()=>(window as any).f.quoteCalls()===1)
  await page.evaluate(mutation=>{const f=(window as any).f;if(mutation==='selection'){f.select(2,1,2,4);f.select(1,1,1,6)}else if(mutation==='readonly'){f.editor.updateOptions({readOnly:true});f.editor.updateOptions({readOnly:false})}else f.modelABA();f.releaseQuote()},mutation)
  await page.waitForFunction(()=>(window as any).f.quoteFinished()===1);await frames(page)
  assert.deepEqual(await page.evaluate(()=>(window as any).f.quotes),[],'A cancelled source must not reach the delayed receiver append')
  assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中')
 }))
}
test('TCM12/13 real Monaco delayed quote permits layout configuration and receiver focus',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.select(1,1,1,6);f.deferQuote(true)});await menuAt(page);await choose(page,'text.quote');await page.waitForFunction(()=>(window as any).f.quoteCalls()===1)
 await page.evaluate(()=>{const f=(window as any).f;f.editor.updateOptions({lineNumbers:'off',wordWrap:'on',fontSize:18});f.releaseQuote()});await page.waitForFunction(()=>(window as any).f.quoteFinished()===1);await frames(page)
 assert.deepEqual(await page.evaluate(()=>(window as any).f.quotes),['> Alpha\n\n']);assert.equal(await page.evaluate(()=>document.activeElement?.id),'quote-target')
 assert.deepEqual(await page.evaluate(()=>(window as any).f.selections()),[[1,1,1,6]]);assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中');assert.deepEqual(await page.evaluate(()=>(window as any).f.errors),[])
}))
for(const configuration of ['layout','options'] as const){
 test('TCM14 real Monaco pending copy survives '+configuration+' changes',{timeout:180000},()=>scenario(async page=>{
  await page.evaluate(async()=>{await navigator.clipboard.writeText('Before copy');(window as any).f.select(1,1,1,6)});await menuAt(page)
  await page.evaluate(configuration=>{const editor=(window as any).f.editor;if(configuration==='layout')editor.layout({width:700,height:300});else editor.updateOptions({lineNumbers:'off',wordWrap:'on',fontSize:18})},configuration)
  await choose(page,'text.copy');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Alpha');assert.deepEqual(await page.evaluate(()=>(window as any).f.errors),[])
  assert.equal(await value(page),'Alpha Ω\nSecond line\nThird 中');assert.deepEqual(await page.evaluate(()=>(window as any).f.selections()),[[1,1,1,6]])
 }))
}
