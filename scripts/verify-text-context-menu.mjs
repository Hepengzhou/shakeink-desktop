import {_electron} from 'playwright-core'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve,basename,dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {defaultState} from '../desktop/core/settings.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'
import {prisma} from '../src/lib/db.ts'

// The native popup is intentionally chosen through the Windows UI. This
// harness prepares synthetic real repositories and reads real resulting state;
// it never invokes a MenuItem.click callback or replaces a menu result.
export async function launchTextMenuAcceptance(executablePath){
 assert.equal(process.platform,'win32')
 const temporary=await mkdtemp(join(tmpdir(),'shakeink-text-context-menu-')),root=join(temporary,'data')
 const theme=process.env.SHAKEINK_TEXT_MENU_THEME==='ink'?'ink':'paper'
 const evidence=resolve('docs/evidence/text-context-menu'),report={status:'running',scope:executablePath?'Windows packaged offline executable':'Windows development Electron',theme,startedAt:new Date().toISOString(),checks:[],nativeMenus:[],errors:[],httpRequests:0,runtime:null,sourceHashes:{},unavailable:['macOS','physical IME']}
 await mkdir(evidence,{recursive:true})
 const workspaces=new Workspaces(root,resolve('prisma/migrations'));let conversationId
 try{
  await workspaces.initialize()
  await workspaces.run('inbox',async()=>{
   const conversation=await prisma.conversation.create({data:{userId:'local-author',title:'文本菜单隔离验收'}});conversationId=conversation.id
   await prisma.message.create({data:{conversationId,role:'USER',content:'用户消息可以选取并复制。'}})
   await prisma.message.create({data:{conversationId,role:'ASSISTANT',content:'AI 回复的 **选中文字** 可以复制。\n\n第二段可引用到现有草稿。'}})
  })
  const workPath=join(temporary,'work');await mkdir(workPath);const identity=await stat(workPath,{bigint:true})
  const work=await workspaces.create({path:workPath,device:String(identity.dev),inode:String(identity.ino)},{title:'文本菜单验收作品',requestId:'text-menu-seed'})
  await workspaces.run(work.id,async()=>{const volume=await prisma.volume.create({data:{novelId:work.novelId,title:'验收卷',index:1,summary:''}});await prisma.chapter.create({data:{volumeId:volume.id,title:'验收正文章',outline:'',index:1,content:'第一行隔离正文。\n\n第二段 **强调正文** 可复制和编辑。',status:'WRITTEN'}})})
 }finally{await workspaces.close()}
 const state=structuredClone(defaultState);state.settings.appearance.theme=theme;state.onboarding={version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}
 await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state}))
 const environment={...process.env,SHAKEINK_TEST_ROOT:root};delete environment.ELECTRON_RUN_AS_NODE
 const app=await _electron.launch({args:executablePath?[]:[resolve('.')],...(executablePath?{executablePath:resolve(executablePath)}:{}),env:environment,timeout:60000})
 const page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(15000)
 page.on('pageerror',error=>report.errors.push(error.message.replaceAll(temporary,'<isolated>')))
 page.on('request',request=>{if(/^https?:/i.test(request.url()))report.httpRequests++})
 await page.context().setOffline(true)
 await app.evaluate(({BrowserWindow,Menu,ipcMain})=>{
  const window=BrowserWindow.getAllWindows()[0];window.setBounds({x:120,y:80,width:1440,height:900});window.setTitle('玄印写作 · 文本菜单隔离验收');window.focus()
  globalThis.tcmMenus=[];globalThis.tcmChoices=[];globalThis.tcmReplies=[]
  const popup=Menu.prototype.popup
  Menu.prototype.popup=function(options){for(const item of this.items){const click=item.click;if(click)item.click=(...args)=>{globalThis.tcmChoices.push({id:item.id,focused:window.isFocused()});return click.apply(item,args)}}globalThis.tcmMenus.push({ids:this.items.map(item=>item.id||item.type),enabled:this.items.map(item=>item.enabled),x:options.x,y:options.y,zoom:window.webContents.getZoomFactor(),bounds:window.getContentBounds()});return popup.call(this,options)}
  for(const channel of ['desktop:text-context-menu','desktop:text-context-menu-cancel']){const handler=ipcMain._invokeHandlers.get(channel);if(handler){ipcMain.removeHandler(channel);ipcMain.handle(channel,async(...args)=>{const result=await handler(...args);globalThis.tcmReplies.push({channel,result,focused:window.isFocused()});return result})}}
 })
 const skip=page.getByRole('button',{name:'暂不配置',exact:true});await skip.waitFor({timeout:45000});await skip.click()
 await page.locator('.workspace-sidebar').getByText('文本菜单隔离验收',{exact:true}).click()
 await page.getByText('用户消息可以选取并复制。',{exact:true}).waitFor();await page.bringToFront()
 const bootstrap=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(bootstrap.models.length,0);assert.equal(bootstrap.dataRoot,root);assert.equal(page.url(),'shakeink://app/')
 report.runtime=await app.evaluate(()=>({versions:process.versions,platform:process.platform,listeningServers:process._getActiveHandles().filter(handle=>handle.constructor.name==='Server'&&handle.listening).length}))
 for(const file of ['dist/main/index.cjs','dist/preload/index.cjs','src/lib/desktop/text-context-menu.ts','src/lib/desktop/text-context-selection.ts','src/components/layout/ChatPanel.tsx'])report.sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
 const save=async()=>{report.nativeMenus=await app.evaluate(()=>globalThis.tcmMenus);report.nativeChoices=await app.evaluate(()=>globalThis.tcmChoices);report.nativeReplies=await app.evaluate(()=>globalThis.tcmReplies);report.editorEvents=await page.evaluate(()=>globalThis.tcmEditorEvents??[]);report.clipboardCommands=await page.evaluate(()=>globalThis.tcmClipboardCommands??[]);await writeFile(join(evidence,executablePath?'windows-package.json':'windows-electron.json'),JSON.stringify(report,null,2)+'\n')}
 const clipboard=()=>app.evaluate(({clipboard})=>clipboard.readText())
 const composer=()=>page.getByTestId('composer-editor')
 const draft=()=>composer().innerText()
 const copySource=role=>role==='user'?page.getByText('用户消息可以选取并复制。',{exact:true}):page.locator('.chatpane [data-text-preview] strong').first()
 let expectedCopy=''
 const prepare=async(kind)=>{
  const before=await app.evaluate(()=>globalThis.tcmMenus.length)
  if(kind==='user-copy'||kind==='ai-copy'||kind==='quote'){
   if(kind==='quote')await composer().fill('已有隔离草稿')
   const source=copySource(kind==='ai-copy'?'ai':'user');await source.click({clickCount:3});expectedCopy=kind==='ai-copy'?'AI 回复的 选中文字 可以复制。':'用户消息可以选取并复制。';await source.click({button:'right'})
  }else if(kind==='composer-copy'||kind==='composer-cut'||kind==='composer-paste'||kind==='composer-history'){
   await composer().fill(kind==='composer-paste'?'待替换的隔离草稿':'输入框隔离选区');await composer().press('Control+a');await composer().click({button:'right'})
  }else if(kind==='keyboard'){
   await composer().focus();await composer().press('Shift+F10')
  }else if(kind==='zoom'){
   await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.25))
   const source=copySource('user');await source.click({clickCount:3});expectedCopy='用户消息可以选取并复制。';await source.click({button:'right'})
  }else if(kind==='editor-copy'||kind==='editor-quote'||kind==='editor-context'){
   if(!await page.locator('.monaco-editor .view-lines').count()){
    const chapter=page.locator('.workspace-sidebar').getByRole('button',{name:'第 1 章 验收正文章',exact:true})
    if(!await chapter.isVisible())await page.locator('.workspace-sidebar').getByText('文本菜单验收作品',{exact:true}).click()
    await chapter.click()
    if(!await page.locator('.monaco-editor .view-lines').count())await page.getByRole('button',{name:'编辑',exact:true}).first().click()
   }
   const source=page.locator('.monaco-editor .view-lines').first();await source.waitFor()
   await page.evaluate(async()=>{
    await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    if(globalThis.tcmEditorEvents)return
    globalThis.tcmEditorEvents=[];let editor
    globalThis.tcmClipboardCommands=[];const exec=document.execCommand;document.execCommand=function(command,...args){const active=navigator.userActivation.isActive,focus=document.hasFocus(),result=exec.call(this,command,...args);globalThis.tcmClipboardCommands.push({command,active,focus,result});return result}
    document.addEventListener('copy',event=>globalThis.tcmClipboardCommands.push({event:'copy',types:[...(event.clipboardData?.types??[])]}),true)
    for(let node=document.querySelector('.monaco-editor');node&&!editor;node=node.parentElement){const key=Object.keys(node).find(key=>key.startsWith('__reactFiber$'));for(let fiber=key&&node[key];fiber&&!editor;fiber=fiber.return){for(let hook=fiber.memoizedState;hook&&!editor;hook=hook.next){for(const value of [hook.memoizedState,hook.memoizedState?.current])if(value&&typeof value.getSelections==='function'&&typeof value.getModel==='function')editor=value}}}
    if(!editor){globalThis.tcmEditorEvents.push({event:'editor-diagnostic-unavailable'});return}
    const record=event=>globalThis.tcmEditorEvents.push({event,selections:editor.getSelections(),version:editor.getModel()?.getVersionId(),readOnly:editor.getRawOptions().readOnly===true,focus:document.activeElement?.className})
    editor.onDidChangeCursorSelection(()=>record('selection'));editor.onDidChangeConfiguration(()=>record('configuration'));editor.onDidFocusEditorText(()=>record('focus'));editor.onDidBlurEditorText(()=>record('blur'));record('mounted')
   })
   await source.click();await page.keyboard.press('Control+Home');await page.keyboard.press('Shift+End');expectedCopy='第一行隔离正文。';await source.locator('.view-line').first().click({button:'right',position:{x:30,y:8}})
  }else throw Error('Unknown stage')
  const limit=Date.now()+10000;while(await app.evaluate(()=>globalThis.tcmMenus.length)===before){assert.ok(Date.now()<limit,'Native menu did not open');await new Promise(resolve=>setTimeout(resolve,40))}
  await save();return report.nativeMenus.at(-1)
 }
 const verify=async(kind)=>{
  const limit=Date.now()+10000;let value
  for(;;){
   value=kind==='quote'?await draft():await clipboard()
   const valid=['user-copy','ai-copy','zoom','editor-copy'].includes(kind)?value===expectedCopy:kind==='quote'?value.includes('已有隔离草稿')&&value.includes('> 用户消息可以选取并复制。'):kind==='composer-copy'||kind==='composer-cut'?value==='输入框隔离选区':true
   if(valid)break
   if(Date.now()>=limit){const fixtures=['用户消息可以选取并复制。','AI 回复的 选中文字 可以复制。','输入框隔离选区','第一行隔离正文。\n\n第二段 **强调正文** 可复制和编辑。'];report.failedClipboardFixture=typeof value==='string'&&!!value.trim()&&fixtures.some(text=>text.includes(value.trim()))?value:null;throw Error(`Result not applied: ${kind}`)}
   await new Promise(resolve=>setTimeout(resolve,50))
  }
  if(kind==='composer-cut'){assert.equal((await draft()).trim(),'');await composer().press('Control+z');assert.equal((await draft()).trim(),'输入框隔离选区');await composer().press('Control+y');assert.equal((await draft()).trim(),'')}
  if(kind==='composer-paste'){const deadline=Date.now()+5000;while((await draft()).trim()!=='输入框隔离选区'){assert.ok(Date.now()<deadline,'Paste was not applied');await new Promise(resolve=>setTimeout(resolve,40))}await composer().press('Control+z');assert.equal((await draft()).trim(),'待替换的隔离草稿');await composer().press('Control+y');assert.equal((await draft()).trim(),'输入框隔离选区')}
  if(kind==='quote'){assert.equal(await composer().evaluate(el=>document.activeElement===el),true);await composer().press('Control+z');assert.equal((await draft()).trim(),'已有隔离草稿');await composer().press('Control+y');assert.match(await draft(),/> 用户消息可以选取并复制。/)}
  const native=report.nativeMenus.at(-1)
  if(['user-copy','ai-copy','quote','zoom'].includes(kind)){assert.ok(!native.ids.includes('text.undo'));assert.ok(!native.ids.includes('text.redo'))}
  report.checks.push({id:kind,status:'passed'});await save();return {kind,clipboard:await clipboard(),draft:await draft()}
 }
 const finish=async()=>{assert.deepEqual(report.errors,[]);assert.equal(report.httpRequests,0);assert.equal(report.runtime.listeningServers,0);report.status='passed-scoped';report.completedAt=new Date().toISOString();await save();await app.close();assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('shakeink-text-context-menu-'));await rm(temporary,{recursive:true,force:true});report.cleanedIsolatedData=true;await writeFile(join(evidence,executablePath?'windows-package.json':'windows-electron.json'),JSON.stringify(report,null,2)+'\n');return report}
 return {app,page,root,temporary,report,prepare,verify,save,finish,clipboard,draft,composer}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const executablePath=process.argv[2],control=resolve('docs/evidence/text-context-menu',executablePath?'control-package.json':'control-development.json')
 let scenario,sequence=0
 try{
  scenario=await launchTextMenuAcceptance(executablePath);scenario.report.stage='ready';await scenario.save();console.log('Native acceptance ready')
  for(;;){
  let command
  try{command=JSON.parse(await readFile(control,'utf8'))}catch(error){if(!(error instanceof SyntaxError)&&error.code!=='ENOENT')throw error;await new Promise(resolve=>setTimeout(resolve,250));continue}
   if(command.sequence>sequence){
    sequence=command.sequence
    if(command.action==='prepare'){await scenario.prepare(command.kind);scenario.report.stage='menu-'+command.kind;await scenario.save()}
    if(command.action==='verify'){await scenario.verify(command.kind);scenario.report.stage='verified-'+command.kind;await scenario.save()}
    if(command.action==='finish'){await scenario.finish();console.log('Native acceptance finished');break}
    console.log(JSON.stringify({sequence,stage:scenario.report.stage}))
   }
   await new Promise(resolve=>setTimeout(resolve,250))
  }
 }catch(error){if(scenario){scenario.report.status='failed';scenario.report.failure=String(error.stack||error).replaceAll(scenario.temporary,'<isolated>');await scenario.save();await scenario.app.close()}console.error(error);process.exitCode=1}
}
