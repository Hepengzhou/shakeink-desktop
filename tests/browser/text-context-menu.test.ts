import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {readFile as readAsync} from 'node:fs/promises'
import {resolve,sep} from 'node:path'
import {build} from 'esbuild'
import ts from 'typescript'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import {chromium,type Browser,type Page} from 'playwright-core'

// Reuse the existing declared HTTP-only fixture, while mounting the full real
// ChatPanel + Controller. Menu/clipboard IPC are in-memory here; real native
// menu/clipboard acceptance is a separate Windows runner.
const fixtureSource=ts.createSourceFile('fixture.ts',readFileSync('tests/browser/chat-empty-state.test.ts','utf8'),ts.ScriptTarget.Latest,true)
let contents=''
function find(node:ts.Node){if(ts.isNoSubstitutionTemplateLiteral(node)&&node.text.includes('globalThis.mountChatEmpty'))contents=node.text;ts.forEachChild(node,find)}
find(fixtureSource);assert.ok(contents)
contents=`import {DesktopCommandController} from './src/components/desktop/DesktopCommandController';import {MarkdownPreview} from './src/components/editor/MarkdownPreview';import {Input} from './src/components/ui/input';import {Dialog,DialogContent,DialogTitle,DialogDescription} from './src/components/ui/dialog';\n`+contents
contents=contents.replace("const bridgeCalls=[],unexpected=[];","const bridgeCalls=[],unexpected=[],menus=[];let clipboard='',fieldValue='Initial editable text',clipboardGate=null,releaseClipboard=null;const pending=new Map();")
contents=contents.replace("readClipboardText:async()=>{bridgeCalls.push('readClipboardText');return ''},","readClipboardText:async()=>{bridgeCalls.push('readClipboardText');return clipboardGate?await clipboardGate:clipboard},")
contents=contents.replace("writeClipboardText:async text=>{bridgeCalls.push(['writeClipboardText',text])},","writeClipboardText:async text=>{clipboard=text;bridgeCalls.push(['writeClipboardText',text])},showTextContextMenu:async request=>{menus.push(request);return await new Promise(resolve=>pending.set(request.requestId,resolve))},cancelTextContextMenu:async id=>{pending.get(id)?.({requestId:id,command:null});pending.delete(id)},")
contents=contents.replace("function App(){const [width", "function App(){const [field,setField]=useState(fieldValue);const [width")
contents=contents.replace("let setWidth,setHeight,setSideWizard;","let setWidth,setHeight,setSideWizard,setMenusDialog;")
contents=contents.replace("function App(){const [field", "function App(){const [menusDialog,menusSet]=useState(false);setMenusDialog=menusSet;const [field")
contents=contents.replace("<ChatPanel userId='fixture-author'/>","<DesktopCommandController/><ChatPanel userId='fixture-author'/>")
contents=contents.replace("<CreateNovelDialog open={sideWizard}","<div id='text-fixtures'><div id='markdown-fixture'><MarkdownPreview source={'First **paragraph**.\\n\\nSecond paragraph.'}/></div><Input id='text-input' aria-label='Text fixture input' value={field} onChange={e=>{fieldValue=e.target.value;setField(e.target.value)}}/><Input id='email-input' type='email' defaultValue='writer@example.invalid'/><Input id='readonly-input' readOnly defaultValue='Readonly source'/><div data-text-preview id='preview-a' tabIndex={0}>Selected user text</div><div data-text-preview id='preview-b' tabIndex={0}>Other source</div></div><CreateNovelDialog open={sideWizard}")
contents=contents.replace("</QueryClientProvider>","<Dialog open={menusDialog}><DialogContent><DialogTitle>Text menu outer</DialogTitle><DialogDescription>Isolated shared component</DialogDescription><Input id='dialog-input' defaultValue='Outer field'/><Dialog open={menusDialog}><DialogContent><DialogTitle>Text menu inner</DialogTitle><DialogDescription>Isolated nested portal</DialogDescription><Input id='nested-input' defaultValue='Nested field'/></DialogContent></Dialog></DialogContent></Dialog></QueryClientProvider>")
contents=contents.replace("<div id='text-fixtures'>","<div id='text-fixtures'><textarea id='textarea-input' defaultValue='First line\\nSecond line'/><div id='generic-editable' contentEditable suppressContentEditableWarning>Editable content</div><div id='plain-editable' contentEditable='plaintext-only'>Plain content</div>{[['email','writer@example.invalid'],['number','123456'],['date','2026-10-13'],['datetime-local','2026-10-13T10:11'],['month','2026-10'],['week','2026-W42'],['time','10:11']].map(([type,value])=><React.Fragment key={type}><Input type={type} id={'special-'+type} defaultValue={value}/><input disabled type={type} style={{display:'block',width:300,height:32}} id={'disabled-'+type} defaultValue={value}/></React.Fragment>)}")
contents=contents.replace("return {model,calls,bridgeCalls,unexpected,client,", "return {model,calls,bridgeCalls,unexpected,client,menus,dialog:()=>setMenusDialog(true),deferClipboard:()=>{clipboardGate=new Promise(resolve=>releaseClipboard=resolve)},releaseClipboard:text=>{releaseClipboard?.(text);clipboardGate=null},clipboard:()=>clipboard,fieldValue:()=>fieldValue,chooseMenu:command=>{const request=menus.at(-1);pending.get(request.requestId)?.({requestId:request.requestId,command});pending.delete(request.requestId)},")
const bundle=build({stdin:{contents,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'esm',outfile:'text-context-fixture.js',external:['/brand/*'],loader:{'.ttf':'dataurl'},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},minify:true,tsconfig:'tsconfig.json'}).then(result=>({script:result.outputFiles!.find(file=>file.path.endsWith('.js'))!.text,css:result.outputFiles!.find(file=>file.path.endsWith('.css'))?.text??''}))
const cssPath=resolve('src/app/globals.css'),stylesheet=(async()=>(await postcss([tailwindcss()]).process(await readAsync(cssPath,'utf8'),{from:cssPath})).css+'\n'+await readAsync('src/app/desktop.css','utf8'))()
let browser:Browser
test.before(async()=>{browser=await chromium.launch({headless:true,executablePath:process.env.SHAKEINK_TEST_CHROMIUM??'C:/Program Files/Google/Chrome/Application/chrome.exe'})})
test.after(async()=>{await browser?.close()})
async function frames(page:Page){await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))))}
async function scenario(run:(page:Page)=>Promise<void>){
 const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors:string[]=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message))
 try{
  await page.route('**/*',async route=>{if(route.request().isNavigationRequest()){await route.fulfill({contentType:'text/html',body:'<div id="app"></div>'});return}const root=resolve('public'),path=resolve(root,'.'+decodeURIComponent(new URL(route.request().url()).pathname));if(path.startsWith(root+sep)){try{await route.fulfill({body:await readAsync(path),contentType:path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream'});return}catch{}}await route.abort()})
  await page.goto('http://127.0.0.1:1/text-context-component')
  const built=await bundle;await page.addStyleTag({content:await stylesheet});if(built.css)await page.addStyleTag({content:built.css})
  await page.addScriptTag({content:built.script,type:'module'});await page.waitForFunction(()=>typeof (window as any).mountChatEmpty==='function')
  await page.evaluate(()=>{(window as any).f=(window as any).mountChatEmpty({models:false,width:900,height:700})})
  await page.waitForFunction(()=>(window as any).f.state().recoveryStatus==='ready');await page.bringToFront();await frames(page)
  await run(page);assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>(window as any).f.unexpected),[])
 }finally{await page.evaluate(()=>(window as any).f?.unmount()).catch(()=>{});await page.close()}
}
async function count(page:Page){return page.evaluate(()=>(window as any).f.menus.length)}
async function menu(page:Page,selector:string,kind:'all'|'triple'='all'){
 const source=page.locator(selector).first();await source.scrollIntoViewIfNeeded();await frames(page)
 if(kind==='triple')await source.click({clickCount:3})
 else await source.evaluate(el=>{if(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement){el.focus();if(typeof el.selectionStart==='number')el.setSelectionRange(0,el.value.length);else document.execCommand('selectAll',false)}else{el instanceof HTMLElement&&el.focus();const range=document.createRange();range.selectNodeContents(el);const s=document.getSelection();s?.removeAllRanges();s?.addRange(range)}})
 await frames(page);const before=await count(page);await source.click({button:'right'});await page.waitForFunction(before=>(window as any).f.menus.length>before,before)
 return page.evaluate(()=>(window as any).f.menus.at(-1))
}
async function choose(page:Page,command:string){await page.evaluate(command=>(window as any).f.chooseMenu(command),command);await frames(page)}
test('TCM04/05 real Markdown preview copies only selected text and has no history', {timeout:180000},()=>scenario(async page=>{
 const request=await menu(page,'#preview-a','triple');assert.equal(request.kind,'preview');assert.equal(request.commands['text.copy'],true);assert.equal(request.commands['text.undo'],false)
 await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),'Selected user text')
 const markdown=await menu(page,'#markdown-fixture [data-text-preview]');assert.equal(markdown.commands['text.copy'],true)
 await choose(page,'text.copy');assert.match(await page.evaluate(()=>(window as any).f.clipboard()),/First paragraph\./)
}))
test('TCM10/11 full ChatPanel quote preserves old chip and native undo, no model or send',{timeout:180000},()=>scenario(async page=>{
 const initial='Existing @[角色/原标签](character:fixture)';await page.evaluate(initial=>(window as any).f.patch({draft:initial}),initial);await page.getByTestId('composer-editor').locator('.composer-chip').waitFor()
 await page.evaluate(()=>(window as any).f.pin())
 const request=await menu(page,'#preview-a');assert.equal(request.commands['text.quote'],true)
 await choose(page,'text.quote');const draft=await page.evaluate(()=>(window as any).f.state().draft)
 assert.equal(draft,initial+'\n\n> Selected user text\n\n');assert.ok(await page.evaluate(()=>(window as any).f.sameEditor()&&(window as any).f.sameChip()))
 assert.ok(await page.getByTestId('composer-editor').evaluate(el=>el===document.activeElement))
 assert.deepEqual(await page.evaluate(()=>(window as any).f.calls.filter((call:any)=>call.method==='POST')),[])
 await page.getByTestId('composer-editor').press('Control+z');await frames(page);assert.equal(await page.evaluate(()=>(window as any).f.state().draft),initial)
 await page.getByTestId('composer-editor').press('Control+y');await frames(page);assert.equal(await page.evaluate(()=>(window as any).f.state().draft),draft)
}))
test('TCM06/07 ordinary and special real controls copy/cut/paste with React state',{timeout:180000},()=>scenario(async page=>{
 const request=await menu(page,'#text-input');assert.equal(request.kind,'input');assert.equal(request.commands['text.cut'],true)
 await choose(page,'text.cut');assert.equal(await page.locator('#text-input').inputValue(),'');assert.equal(await page.evaluate(()=>(window as any).f.fieldValue()),'')
 await menu(page,'#text-input');await choose(page,'text.paste');assert.equal(await page.locator('#text-input').inputValue(),'Initial editable text')
 const special=await menu(page,'#email-input');assert.equal(special.commands['text.copy'],true);await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),'writer@example.invalid')
 const readonly=await menu(page,'#readonly-input');assert.equal(readonly.commands['text.copy'],true);assert.equal(readonly.commands['text.cut'],false);assert.equal(readonly.commands['text.undo'],false)
 await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),'Readonly source')
}))
test('TCM12 pending menu and quote reject input/DOM and conversation ABA',{timeout:180000},()=>scenario(async page=>{
 await menu(page,'#text-input');await page.locator('#text-input').fill('Changed');await choose(page,'text.cut');assert.equal(await page.locator('#text-input').inputValue(),'Changed')
 await menu(page,'#preview-a');await page.evaluate(()=>{const a=document.getElementById('preview-a')!;a.setAttribute('data-original','B');a.setAttribute('data-original','A')});await choose(page,'text.quote')
 assert.equal(await page.evaluate(()=>(window as any).f.state().draft),'')
 await menu(page,'#preview-a');await page.evaluate(()=>{const f=(window as any).f,initial=f.state().conversationId;f.patch({conversationId:'B'});f.patch({conversationId:initial})});await choose(page,'text.quote');assert.equal(await page.evaluate(()=>(window as any).f.state().draft),'')
}))
test('TCM12 clipboard completion cannot revive a cancelled input transaction',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>(window as any).f.deferClipboard());await menu(page,'#text-input');await choose(page,'text.paste')
 await page.waitForFunction(()=>(window as any).f.bridgeCalls.includes('readClipboardText'))
 await page.evaluate(()=>{const input=document.getElementById('text-input')!;input.setAttribute('readonly','');input.removeAttribute('readonly')});await frames(page)
 await page.evaluate(()=>(window as any).f.releaseClipboard('LATE_CLIPBOARD'));await frames(page)
 assert.equal(await page.locator('#text-input').inputValue(),'Initial editable text')
 assert.equal(await page.evaluate(()=>(window as any).f.fieldValue()),'Initial editable text')
}))
test('TCM13 quote waiting for composer focus still rejects source cancellation',{timeout:180000},()=>scenario(async page=>{
 await menu(page,'#preview-a')
 await page.getByTestId('composer-editor').evaluate(el=>{(window as any).restoreFocus=el.focus.bind(el);(el as HTMLElement).focus=()=>{}})
 await choose(page,'text.quote')
 await page.evaluate(()=>{const source=document.getElementById('preview-a')!;source.setAttribute('data-aba','B');source.setAttribute('data-aba','A')});await frames(page)
 await page.getByTestId('composer-editor').evaluate(el=>{(el as HTMLElement).focus=(window as any).restoreFocus});await frames(page)
 assert.equal(await page.evaluate(()=>(window as any).f.state().draft),'')
}))
test('TCM04 real user and assistant messages allow word and whole paragraph copy',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>{const f=(window as any).f;f.response('fixture-text-chat',200,{messages:[{id:'text-user',role:'USER',content:'User message can be copied.'},{id:'text-ai',role:'ASSISTANT',content:'Assistant **selected** reply.'}]});f.request('fixture-text-chat')})
 await page.getByText('User message can be copied.',{exact:true}).waitFor()
 let request=await menu(page,'.chatpane [data-text-preview]:has-text("User message can be copied.")','triple');assert.equal(request.commands['text.copy'],true);await choose(page,'text.copy')
 assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),'User message can be copied.')
 request=await menu(page,'.chatpane [data-text-preview] strong');assert.equal(request.commands['text.copy'],true);await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),'selected')
}))
test('TCM08 actual nested Base UI Dialog portal input supports copy and disables quote',{timeout:180000},()=>scenario(async page=>{
 await page.evaluate(()=>(window as any).f.dialog());await page.locator('#nested-input').waitFor();await frames(page)
 const request=await menu(page,'#nested-input');assert.equal(request.kind,'input');assert.equal(request.commands['text.quote'],false);assert.equal(request.commands['text.copy'],true)
 await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),'Nested field')
}))
test('TCM11 composer quote snapshots visible chip labels and escapes only new literal tokens',{timeout:180000},()=>scenario(async page=>{
 const old='> @[角色/原标签](character:fixture)';await page.evaluate(old=>(window as any).f.patch({draft:old}),old);await page.getByTestId('composer-editor').locator('.composer-chip').waitFor()
 await menu(page,'[data-testid="composer-editor"]');await choose(page,'text.quote')
 assert.equal(await page.evaluate(()=>(window as any).f.state().draft),old+'\n\n> > 原标签\n\n')
 await page.evaluate(()=>{const source=document.getElementById('preview-a')!;source.style.whiteSpace='pre-wrap';source.textContent='@[场景/原文](scene:other:id) <img src=x>\n第二行'});await menu(page,'#preview-a');await choose(page,'text.quote')
 const draft=await page.evaluate(()=>(window as any).f.state().draft);assert.match(draft,/> @\\\[场景\/原文\]\(scene:other:id\) <img src=x>\n> 第二行\n\n$/)
 assert.equal(await page.getByTestId('composer-editor').locator('.composer-chip').count(),1);assert.equal(await page.getByTestId('composer-editor').locator('img').count(),0)
 await page.evaluate(draft=>(window as any).f.patch({draft:draft+' '}),draft);await frames(page);assert.equal(await page.getByTestId('composer-editor').locator('.composer-chip').count(),1)
}))
test('TCM06/08 textarea and both contenteditable modes use native changes and history',{timeout:180000},()=>scenario(async page=>{
 for(const id of ['textarea-input','generic-editable','plain-editable']){
  const request=await menu(page,'#'+id);assert.equal(request.kind,'input');assert.equal(request.commands['text.copy'],true)
  const before=id==='textarea-input'?await page.locator('#'+id).inputValue():await page.locator('#'+id).textContent()
  await choose(page,'text.cut');assert.equal(id==='textarea-input'?await page.locator('#'+id).inputValue():await page.locator('#'+id).textContent(),'')
  await menu(page,'#'+id);await choose(page,'text.paste');assert.equal(id==='textarea-input'?await page.locator('#'+id).inputValue():await page.locator('#'+id).textContent(),before)
 }
}))
test('TCM07/08 structured inputs copy their actual native selection including disabled sources',{timeout:180000},()=>scenario(async page=>{
 for(const type of ['email','number','date','datetime-local','month','week','time']){
  const source=page.locator('#special-'+type);await source.scrollIntoViewIfNeeded();await source.focus();await page.keyboard.press('Control+a');await frames(page)
  const selected=await page.evaluate(()=>document.getSelection()?.toString()??'');const before=await count(page);await source.click({button:'right',position:{x:20,y:15}});await page.waitForFunction(before=>(window as any).f.menus.length>before,before)
  const request=await page.evaluate(()=>(window as any).f.menus.at(-1));assert.equal(request.kind,'input');assert.equal(request.commands['text.copy'],!!selected,type)
  const rightSelection=await page.evaluate(()=>document.getSelection()?.toString()??'')
  if(selected){await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),rightSelection,type+' '+JSON.stringify(await page.evaluate(()=>({active:document.activeElement?.id,selection:document.getSelection()?.toString(),request:(window as any).f.menus.at(-1),calls:(window as any).f.bridgeCalls.slice(-3)}))))}else await choose(page,'text.selectAll')
  const disabled=page.locator('#disabled-'+type);await disabled.scrollIntoViewIfNeeded();await frames(page);const box=(await disabled.boundingBox())!;assert.ok(box)
  await page.mouse.move(box.x+8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+118,box.y+box.height/2,{steps:12});await page.mouse.up();await frames(page)
  await page.mouse.click(box.x+30,box.y+box.height/2,{button:'right'});await frames(page)
  const actual=await page.evaluate(()=>document.getSelection()?.toString()??''),pending=await page.evaluate(()=>(window as any).f.menus.at(-1));assert.equal(pending.commands['text.selectAll'],false,type);assert.equal(pending.commands['text.copy'],!!actual,type)
  if(actual){await choose(page,'text.copy');assert.equal(await page.evaluate(()=>(window as any).f.clipboard()),actual,type)}else await choose(page,'text.copy')
 }
}))
