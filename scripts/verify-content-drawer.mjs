import assert from 'node:assert/strict'
import {_electron} from 'playwright-core'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtemp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises'
import {tmpdir,homedir,release,arch} from 'node:os'
import {dirname,join,relative,resolve} from 'node:path'

// This is a real product acceptance harness. It never replaces the renderer
// body, imports a renderer store, changes React state, or creates a fake editor.
assert.equal(process.platform,'win32','Actual Windows is required')
const label=process.argv[2]
assert(label&&/^[a-z0-9-]+$/.test(label),'Specify a safe, immutable evidence label')
const executablePath=process.argv[3]?resolve(process.argv[3]):null
const executable=executablePath??resolve('node_modules/electron/dist/electron.exe')
const evidenceParent=resolve('docs/evidence/content-drawer'),evidence=join(evidenceParent,'windows-'+label)
await mkdir(evidenceParent,{recursive:true})
await mkdir(evidence) // EEXIST rejects before an earlier attempt can be overwritten.
const directory=await mkdtemp(join(tmpdir(),'xaanink-sidebar-')),root=join(directory,'data')
const ownedFixtures=[directory],hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const safe=input=>[...ownedFixtures.map(path=>[path,'<isolated-fixture>']),[process.cwd(),'<repo>'],[homedir(),'<home>'],[tmpdir(),'<temp>']].reduce((text,[path,replacement])=>text.replaceAll(path,replacement).replaceAll(path.replaceAll('\\','\\\\'),replacement),String(input)).replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g,'<redacted-key-shaped-text>')
const local=path=>relative(resolve('.'),path).replaceAll('\\','/')
const report={status:'running',startedAt:new Date().toISOString(),packaged:!!executablePath,
 scope:'Actual Windows Electron or directory package; production React workspace, isolated real Workspaces/PGlite/IPC. CDP supplies keyboard/pointer. Actual HWND WM_NCHITTEST probes native regions. All measured geometry is CSS pixels; explicit zoom changes are not a physical-pixel invariance claim.',
 operatingSystem:{platform:process.platform,release:release(),architecture:arch()},checks:[],errors:[],httpRequests:[],captures:[],nativeHitTests:[],launches:[],sourceHashes:{},bundleHashes:{},
 unavailable:['macOS','physical mouse window drag','physical Windows IME','NSIS installation','system display/DPI change'],
 observationBoundary:'Renderer request/pageerror observation and offline emulation begin at firstWindow on every launch; no pre-entry network instrumentation or service-worker network claim.'}
const sourceRoots=['src','desktop'],sourceExtras=['scripts/verify-content-drawer.mjs','scripts/seed-sidebar-navigation.ts','scripts/sidebar-native-hit-test.ps1','package-lock.json']
let app,page,native,fixture,editorDom,editorHandle,expectedText,editorBaseline,bundleRoots=[],env
const shell=()=>page.locator('.dashboard-shell')
const viewport=()=>page.locator('.content-drawer-viewport')
const inner=()=>page.locator('.content-drawer-inner')
const contentPhase=()=>shell().getAttribute('data-content-phase')
const sidebar=()=>page.locator('.sidebar-navigation')
const restore=()=>page.locator('[data-content-restore]').filter({visible:true})
const activePanel=()=>page.locator('.content-tabs [role=tabpanel]:not([hidden])')
const pause=ms=>page.waitForTimeout(ms)
const historyMarker='【动画前建立的撤销历史标记】'
async function frames(){await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))))}
async function settle(){
 await page.waitForFunction(()=>{const s=document.querySelector('.dashboard-shell');return s&&['open','closed'].includes(s.dataset.contentPhase)&&['open','closed'].includes(s.dataset.sidebarPhase)})
 await page.evaluate(()=>new Promise((done,reject)=>{let old=null,stable=0;const deadline=performance.now()+5000;const tick=()=>{const widths=[...document.querySelectorAll('.workspace-sidebar,.workspace-chat,.workspace-content')].map(e=>e.parentElement.getBoundingClientRect().width);stable=old&&widths.length===old.length&&widths.every((w,i)=>Math.abs(w-old[i])<.02)?stable+1:0;old=widths;if(stable>=5)return done();if(performance.now()>deadline)return reject(Error('Actual workspace panels failed to settle'));requestAnimationFrame(tick)};requestAnimationFrame(tick)}))
 await frames()
}
async function record(id,details={}){report.checks.push({id,status:'passed',...details})}
async function save(){report.lastUpdatedAt=new Date().toISOString();await writeFile(join(evidence,'report.json'),safe(JSON.stringify(report,null,2))+'\n')}
async function stage(id,run){console.log('Content drawer target: '+id);const before=report.checks.length;await run();if(before===report.checks.length)await record(id);await save()}
async function screenshot(name){const path=join(evidence,name+'.png');await page.screenshot({path});return{path:local(path),sha256:hash(await readFile(path))}}
async function walk(path){return(await Promise.all((await readdir(path,{withFileTypes:true})).map(e=>e.isDirectory()?walk(join(path,e.name)):join(path,e.name)))).flat()}
async function snapshotVersions(){
 for(const file of [...(await Promise.all(sourceRoots.map(walk))).flat().filter(f=>/\.(?:tsx?|css)$/.test(f)),...sourceExtras])report.sourceHashes[local(resolve(file))]=hash(await readFile(file))
 bundleRoots=executablePath?[join(dirname(executablePath),'resources')]:[resolve('dist'),resolve('.next/static'),resolve('out')]
 for(const path of bundleRoots)for(const file of(await walk(path)).filter(f=>/\.(?:js|cjs|css|html|asar)$/.test(f)))report.bundleHashes[local(file)]=hash(await readFile(file))
 report.electronExecutableHash=hash(await readFile(executable))
}
async function endingVersions(requireStable){
 const changedSources=[],changedBundles=[]
 for(const[file,before]of Object.entries(report.sourceHashes))if(hash(await readFile(resolve(file)))!==before)changedSources.push(file)
 const after={};for(const path of bundleRoots)for(const file of(await walk(path)).filter(f=>/\.(?:js|cjs|css|html|asar)$/.test(f)))after[local(file)]=hash(await readFile(file))
 for(const file of new Set([...Object.keys(report.bundleHashes),...Object.keys(after)]))if(after[file]!==report.bundleHashes[file])changedBundles.push(file)
 const executableUnchanged=hash(await readFile(executable))===report.electronExecutableHash
 report.versionStability={sourcesUnchanged:!changedSources.length,bundlesUnchanged:!changedBundles.length,executableUnchanged,changedSources,changedBundles}
 if(requireStable){assert.deepEqual(changedSources,[],'Production/harness source changed during acceptance');assert.deepEqual(changedBundles,[],'Loaded bundle changed during acceptance');assert(executableUnchanged,'Electron executable changed during acceptance')}
}
async function runProcess(command,args){return new Promise((done,reject)=>{const child=spawn(command,args,{cwd:process.cwd(),windowsHide:true,env:process.env,stdio:['ignore','pipe','pipe']});let output='';const timer=setTimeout(()=>{child.kill();reject(Error('Seed process timed out'))},180000);for(const stream of[child.stdout,child.stderr])stream.on('data',b=>output+=b);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);code===0?done():reject(Error('Seed failed '+code+': '+safe(output.slice(-2000))))})})}
async function launch(launchEnv,name){
 app=await _electron.launch({args:executablePath?[]:[resolve('.')],...(executablePath?{executablePath}:{}),env:launchEnv,timeout:90000})
 page=await app.firstWindow({timeout:90000});page.setDefaultTimeout(15000)
 page.on('pageerror',e=>report.errors.push({launch:name,message:safe(e.message)}))
 page.on('request',r=>{if(/^https?:/i.test(r.url()))report.httpRequests.push({launch:name,method:r.method(),url:safe(r.url().split('?')[0])})})
 await page.context().setOffline(true)
 const skip=page.getByRole('button',{name:'暂不配置',exact:true});await skip.waitFor({timeout:60000});await skip.click();await skip.waitFor({state:'hidden'})
 await shell().waitFor({timeout:60000});await settle();await page.evaluate(()=>document.fonts.ready)
 const boot=await page.evaluate(()=>window.desktop.bootstrap())
 assert(boot.dataRoot===launchEnv.XAANINK_TEST_ROOT,'Only the owned fixture root is open');assert.equal(boot.models.length,0);assert.equal(page.url(),'xaanink://app/');assert.equal(await page.evaluate(()=>navigator.onLine),false)
 const runtime=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return{platform:process.platform,electron:process.versions.electron,chromium:process.versions.chrome,node:process.versions.node,bounds:w.getBounds(),contentBounds:w.getContentBounds(),zoom:w.webContents.getZoomFactor(),mainListeningServers:process._getActiveHandles().filter(h=>h.constructor.name==='Server'&&h.listening).length}})
 assert.equal(runtime.mainListeningServers,0,'No main-process HTTP listener')
 report.launches.push({name,protocol:page.url(),models:0,rendererOffline:true,runtime});await record(name+'-real-isolated-offline',{models:0,mainListeningServers:0})
}
async function bounds(width,height=1000){await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setBounds(size),{width,height});await settle();const actual=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getBounds());assert.equal(actual.width,width);assert.equal(actual.height,height)}
async function appearance(patch,{settled=true}={}){await page.evaluate(async patch=>{const b=await window.desktop.bootstrap();await window.desktop.settings({type:'update',revision:b.revision,settings:{...b.settings,appearance:{...b.settings.appearance,...patch}}})},patch);if(patch.theme)await page.waitForFunction(t=>document.documentElement.classList.contains(t),patch.theme);if(patch.zoom)assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()),patch.zoom);if(settled)await settle()}
async function workspace(){return page.evaluate(async()=>{const b=await window.desktop.bootstrap();return(await window.desktop.readDraft(b.draftSessionId))?.sources?.workspace})}
async function persisted(predicate){const deadline=Date.now()+8000;for(;;){const value=await workspace();if(predicate(value))return value;if(Date.now()>deadline)throw Error('Real IPC workspace target did not persist');await pause(60)}}
async function hideButton(){const direct=page.locator('.content-tabs').getByRole('button',{name:/^(显示 \/ 隐藏内容面板|隐藏内容面板)$/}).filter({visible:true});if(await direct.count())return direct.first();await page.getByRole('button',{name:'所有标签',exact:true}).click();return page.getByRole('menuitem',{name:'显示 / 隐藏内容面板',exact:true})}
async function toggleByKeyboard(){await page.keyboard.press('Control+Alt+r')}
async function showViaRestore(){await restore().first().focus();await page.keyboard.press('Enter')}
async function switcher(name){await page.getByRole('navigation',{name:'创作工作区',exact:true}).getByRole('button',{name,exact:true}).click()}
async function category(name){await sidebar().getByRole('tab',{name,exact:true}).click();for(const b of await sidebar().locator('.nav-group-toggle[aria-expanded=false]').all())await b.press('Enter');await frames()}

// Read-only discovery of the actual editor object retained by React hooks.
// No editor setter, model setter, business store or mocked editor is used.
async function bindActualEditor(){
 editorDom=activePanel().locator('.monaco-editor').first();await editorDom.waitFor({timeout:60000});editorHandle=await editorDom.elementHandle()
 editorBaseline=await editorDom.evaluate(element=>{
  let editor=null
  for(let node=element;node&&!editor;node=node.parentElement){const key=Object.keys(node).find(k=>k.startsWith('__reactFiber$'));for(let fiber=key&&node[key];fiber&&!editor;fiber=fiber.return)for(let hook=fiber.memoizedState;hook&&!editor;hook=hook.next)for(const value of[hook.memoizedState,hook.memoizedState?.current])if(value&&typeof value.getSelections==='function'&&typeof value.getModel==='function'&&value.getDomNode?.()===element)editor=value}
  if(!editor||!editor.getModel())throw Error('Actual Monaco editor/model could not be observed')
  const model=editor.getModel();window.contentDrawerEditor={editor,model,element,disposals:0};editor.onDidDispose(()=>window.contentDrawerEditor.disposals++)
  return{modelId:model.id,uri:model.uri.toString(),selection:editor.getSelections(),layout:editor.getLayoutInfo(),scrollTop:editor.getScrollTop(),scrollLeft:editor.getScrollLeft(),version:model.getVersionId(),alternativeVersion:model.getAlternativeVersionId(),text:model.getValue()}
 })
 expectedText=editorBaseline.text
 assert(editorBaseline.modelId&&editorBaseline.layout.width>0&&editorBaseline.layout.height>0)
 await record('CD-N02-pre-action-real-Monaco-baseline',{modelId:editorBaseline.modelId,modelUriHash:hash(Buffer.from(editorBaseline.uri)),textHash:hash(Buffer.from(expectedText)),selection:editorBaseline.selection,layout:editorBaseline.layout,scrollTop:editorBaseline.scrollTop,scrollLeft:editorBaseline.scrollLeft,version:editorBaseline.version,alternativeVersion:editorBaseline.alternativeVersion})
}
async function editorState(){return page.evaluate(()=>{const p=window.contentDrawerEditor,e=p?.editor,m=e?.getModel();if(!p)return null;return{sameElement:p.element.isConnected&&e.getDomNode()===p.element,sameModel:m===p.model,disposals:p.disposals,modelId:m?.id,text:m?.getValue(),selection:e.getSelections(),layout:e.getLayoutInfo(),scrollTop:e.getScrollTop(),scrollLeft:e.getScrollLeft(),version:m?.getVersionId(),alternativeVersion:m?.getAlternativeVersionId()}})}
async function retainedEditor(id,{selection=true,scroll=true}={}){assert.equal(await editorHandle.evaluate(e=>e.isConnected),true,'Hidden DOM remains connected; invisibility is not disposal');const state=await editorState();assert(state.sameElement&&state.sameModel&&state.disposals===0,id+': actual editor and model objects retained');assert.equal(state.text,expectedText,id+': exact current draft');assert.equal(state.modelId,editorBaseline.modelId);if(selection)assert.deepEqual(state.selection,editorBaseline.selection,id+': selection preserved');if(scroll){assert(Math.abs(state.scrollTop-editorBaseline.scrollTop)<.1,id+': vertical scroll preserved');assert(Math.abs(state.scrollLeft-editorBaseline.scrollLeft)<.1,id+': horizontal scroll preserved')};await record(id,{sameEditor:true,sameModel:true,disposals:state.disposals,draftHash:hash(Buffer.from(state.text)),selection:state.selection,scrollTop:state.scrollTop,scrollLeft:state.scrollLeft})}
async function resetEditorBaseline(){const state=await editorState();editorBaseline={...editorBaseline,selection:state.selection,layout:state.layout,scrollTop:state.scrollTop,scrollLeft:state.scrollLeft,version:state.version,alternativeVersion:state.alternativeVersion}}

async function startCapture(name){await page.evaluate(name=>{
 const ids=new WeakMap();let serial=0;const identity=value=>{if(!value)return null;if(!ids.has(value))ids.set(value,++serial);return ids.get(value)}
 const measure=()=>{
  const s=document.querySelector('.dashboard-shell'),v=document.querySelector('.content-drawer-viewport'),inner=document.querySelector('.content-drawer-inner'),tabs=inner?.querySelector('.content-tabs')
  if(!v||!inner||!tabs)throw Error('Real content drawer viewport/inner/tabs missing')
  const r=inner.getBoundingClientRect(),vr=v.getBoundingClientRect(),css=getComputedStyle(inner),matrix=new DOMMatrixReadOnly(css.transform==='none'?undefined:css.transform)
  const elements=[...inner.querySelectorAll('.content-tabs-caption,.content-tabs > .desktop-drag,.content-tabs-viewport,.content-tabs-track,.content-tab,.content-tab-title,.content-tab-suffix,.content-tabs-tools,.content-tabs-tool,[role=tabpanel]:not([hidden]),[role=tabpanel]:not([hidden]) :is(button,input,textarea,label,h1,h2,h3,p,span,[role=tablist],[role=tab],.desktop-markdown-editor,.monaco-editor,.view-lines,.view-line,.lines-content,.monaco-scrollable-element)')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'&&!e.closest('[role=tabpanel][hidden]'))
  const items=elements.map(e=>{const b=e.getBoundingClientRect(),style=getComputedStyle(e);const lines=[];for(const node of e.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){const range=document.createRange();range.selectNodeContents(node);for(const box of range.getClientRects())lines.push({x:box.x-r.x,y:box.y-r.y,w:box.width,h:box.height});range.detach()};return{id:identity(e),tag:e.tagName,role:e.getAttribute('role'),x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,text:[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(''),value:'value'in e?e.value:null,scrollTop:e.scrollTop,scrollLeft:e.scrollLeft,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,fontSize:style.fontSize,lineHeight:style.lineHeight,whiteSpace:style.whiteSpace,overflowWrap:style.overflowWrap,padding:style.padding,lines}})
  const p=window.contentDrawerEditor,e=p?.editor,m=e?.getModel(),monacoVisible=!!p?.element.closest('[role=tabpanel]:not([hidden])')
  return{phase:s.dataset.contentPhase,sidebarPhase:s.dataset.sidebarPhase,mode:s.dataset.drawerMode,pane:s.dataset.narrowPane,innerId:identity(inner),tabsId:identity(tabs),activePanelId:identity(inner.querySelector('[role=tabpanel]:not([hidden])')),w:r.width,h:r.height,v:vr.width,viewportHeight:vr.height,rightOverhang:r.right-vr.right,leftOffset:r.left-vr.left,transform:{a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d,tx:matrix.e,ty:matrix.f},captionScale:getComputedStyle(tabs).getPropertyValue('--content-tab-scale'),viewportInert:v.inert,items,editor:p?{sameElement:p.element.isConnected&&e.getDomNode()===p.element,sameModel:m===p.model,modelId:m?.id,disposals:p.disposals,visiblePanel:monacoVisible,layout:e.getLayoutInfo(),selection:e.getSelections(),scrollTop:e.getScrollTop(),scrollLeft:e.getScrollLeft(),version:m?.getVersionId(),alternativeVersion:m?.getAlternativeVersionId()}:null}
 }
 const state=window.contentDrawerCapture={name,active:true,units:'CSS pixels',baselineStrategy:'first moving rAF with complete W/H and V > 0; preflight and all samples including zero V retained',preflight:measure(),baseline:null,baselineIndex:null,frames:[]}
 const tick=time=>{if(!state.active)return;const sample={time,...measure()};state.frames.push(sample);if(!state.baseline&&['opening','closing'].includes(sample.phase)&&sample.w>0&&sample.h>0&&sample.v>0){state.baseline=sample;state.baselineIndex=state.frames.length-1}requestAnimationFrame(tick)};requestAnimationFrame(tick)
 },name)}
async function stopCapture(name,{terminal,allowInstant=false,checkEditorGeometry=true}={}){
 await settle();const capture=await page.evaluate(()=>{window.contentDrawerCapture.active=false;return window.contentDrawerCapture})
 const file=join(evidence,name+'-frames.json');await writeFile(file,safe(JSON.stringify(capture,null,2))+'\n')
 const moving=capture.frames.filter(f=>['opening','closing'].includes(f.phase)),b=capture.baseline;let compared=0,maxDelta=0
 if(!allowInstant){assert(moving.length>3,name+': multiple actual rAF motion frames required');assert(b,name+': visible moving baseline required')}else assert.equal(moving.length,0,name+': reduced motion reaches the target without moving rAF frames')
 for(let i=0;i<capture.frames.length;i++){
  const f=capture.frames[i];if(!['opening','closing'].includes(f.phase)||i<capture.baselineIndex)continue;compared++
  assert.equal(f.innerId,capture.preflight.innerId);assert.equal(f.tabsId,capture.preflight.tabsId);assert.equal(f.activePanelId,capture.preflight.activePanelId)
  assert.equal(f.mode,b.mode,name+': breakpoint CSS mode deferred throughout motion')
  assert(Math.abs(f.w-b.w)<.08,name+': full W frozen');assert(Math.abs(f.h-b.h)<.08,name+': full H frozen')
  for(const key of['a','d'])assert(Math.abs(f.transform[key]-1)<.0001,name+': no scale');for(const key of['b','c','ty'])assert(Math.abs(f.transform[key])<.0001,name+': no skew/vertical transform')
  const expected=Math.max(f.w-f.v,0);assert(Math.abs(f.transform.tx-expected)<.2,name+': right-anchored translate W−V');assert(Math.abs(f.rightOverhang-expected)<.2,name+': actual right-anchor geometry')
  assert.equal(f.viewportInert,true,name+': moving content is inert');assert.equal(f.captionScale,b.captionScale,name+': frozen caption scale')
  assert.deepEqual(f.items.map(e=>e.id),b.items.map(e=>e.id),name+': fresh selector count/identities; no cached detached elements')
  for(let j=0;j<b.items.length;j++){
   const before=b.items[j],after=f.items[j];for(const key of['x','y','w','h']){const delta=Math.abs(after[key]-before[key]);maxDelta=Math.max(maxDelta,delta);assert(delta<.25,name+': unchanged relative '+key+' '+before.tag+' '+before.text.slice(0,20))}
   for(const key of['text','value','fontSize','lineHeight','whiteSpace','overflowWrap','padding'])assert.equal(after[key],before[key],name+': unchanged '+key)
   assert.equal(after.lines.length,before.lines.length,name+': text never gains wrapped line boxes')
   for(let k=0;k<before.lines.length;k++)for(const key of['x','y','w','h'])assert(Math.abs(after.lines[k][key]-before.lines[k][key])<.25,name+': fixed text line box '+key)
   if(before.tag==='TEXTAREA'){assert.equal(after.scrollHeight,before.scrollHeight,name+': textarea content line extent');assert.equal(after.scrollWidth,before.scrollWidth)}
  }
  if(f.editor){assert(f.editor.sameElement&&f.editor.sameModel&&f.editor.disposals===0,name+': real Monaco/editor model retained per frame');assert.equal(f.editor.modelId,capture.preflight.editor.modelId);assert.equal(f.editor.version,capture.preflight.editor.version,name+': model text version retained');assert.equal(f.editor.alternativeVersion,capture.preflight.editor.alternativeVersion,name+': undo position retained');assert.deepEqual(f.editor.selection,capture.preflight.editor.selection,name+': pre-action selection retained');for(const key of['scrollTop','scrollLeft'])assert(Math.abs(f.editor[key]-capture.preflight.editor[key])<.1,name+': actual Monaco '+key);if(checkEditorGeometry&&f.editor.visiblePanel&&b.editor.visiblePanel){for(const key of['width','height','contentWidth','contentHeight'])assert(Math.abs(f.editor.layout[key]-b.editor.layout[key])<.25,name+': actual Monaco layoutInfo '+key)}}
 }
 if(terminal)assert.equal(await contentPhase(),terminal,name+': latest terminal intent')
 const item={name,status:'passed',frameCount:capture.frames.length,movingFrames:moving.length,comparedMovingFrames:compared,baselineIndex:capture.baselineIndex,maximumRelativeGeometryDelta:maxDelta,terminal,units:'CSS pixels',tolerances:{frozenWH:.08,rightAnchor:.2,relativeGeometryAndLineBoxes:.25},source:local(file)}
 report.captures.push(item);await record(name,item)
}
async function closeDrawer(name,{nativeTest=false}={}){await startCapture(name);await(await hideButton()).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.dashboard-shell')?.dataset.contentPhase==='closing');if(nativeTest){await pause(65);await nativeRegions(name+'-native',{moving:true,leak:true})};await stopCapture(name,{terminal:'closed'});assert.equal(await viewport().evaluate(e=>e.inert),true);assert(await restore().count()>0)}
async function openDrawer(name,{nativeTest=false}={}){await startCapture(name);await showViaRestore();await page.waitForFunction(()=>document.querySelector('.dashboard-shell')?.dataset.contentPhase==='opening');if(nativeTest){await pause(65);await nativeRegions(name+'-native',{moving:true,leak:true})};await stopCapture(name,{terminal:'open'});assert.equal(await viewport().evaluate(e=>e.inert),false)}

// Warm, serial actual HWND helper. It is the existing native probe, unchanged.
async function startNative(){
 const helper=resolve('scripts/sidebar-native-hit-test.ps1').replaceAll("'","''")
 const command=`[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); while($null -ne ($drawerLine=[Console]::ReadLine())) { try { $drawerRequest=$drawerLine | ConvertFrom-Json; $drawerProbe=& '${helper}' -WindowHandle ([long]$drawerRequest.windowHandle) -PointsJson ([string]$drawerRequest.pointsJson); [Console]::WriteLine([string]$drawerProbe) } catch { [Console]::WriteLine((@{error=$_.Exception.Message} | ConvertTo-Json -Compress)) } }`
 const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:['pipe','pipe','pipe']});let buffer='',stderr='',pending=null
 child.stderr.on('data',b=>stderr+=b);child.stdout.on('data',b=>{buffer+=b;for(;;){const end=buffer.indexOf('\n');if(end<0)break;const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);if(!line)continue;const p=pending;pending=null;if(!p)continue;clearTimeout(p.timer);try{const result=JSON.parse(line);result.error?p.reject(Error(result.error)):p.done(result)}catch{p.reject(Error('Native helper returned invalid JSON'))}}})
 child.on('error',e=>pending?.reject(e));child.on('exit',code=>{if(pending){clearTimeout(pending.timer);pending.reject(Error('Native helper exited '+code+': '+safe(stderr)))}})
 return{async probe(points){assert.equal(pending,null);const windowHandle=await app.evaluate(({BrowserWindow})=>{const b=BrowserWindow.getAllWindows()[0].getNativeWindowHandle();return b.length===8?b.readBigUInt64LE().toString():b.readUInt32LE().toString()});return new Promise((done,reject)=>{pending={done,reject,timer:setTimeout(()=>{pending=null;reject(Error('Native probe timeout'))},15000)};child.stdin.write(JSON.stringify({windowHandle,pointsJson:JSON.stringify(points)})+'\n')})},close(){child.stdin.end();child.kill()}}
}
async function nativeRegions(name,{moving=false,leak=false}={}){
 const zoom=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getZoomFactor())
 const before=await page.evaluate(({leak})=>{
  const shell=document.querySelector('.dashboard-shell'),inner=document.querySelector('.content-drawer-inner'),v=document.querySelector('.content-drawer-viewport'),ir=inner.getBoundingClientRect(),vr=v.getBoundingClientRect()
  const captions=[...document.querySelectorAll('.chatpane > .desktop-drag,.content-tabs > .desktop-drag')].filter(e=>e.getClientRects().length&&!e.closest('[inert],[aria-hidden=true]'))
  let caption=null,point=null
  for(const c of captions){const r=c.getBoundingClientRect();const start=Math.max(r.left+8,leak?vr.right-ir.width+12:r.left+8),end=Math.min(r.right-8,leak?vr.left-12:r.right-8);for(let x=end;x>start;x-=6){const y=r.top+Math.min(16,r.height/2),hit=document.elementFromPoint(x,y);if(hit&&c.contains(hit)&&!hit.closest('button,[role=tab],input,textarea,[data-no-drag],.content-tabs-viewport')){caption=c;point={label:'caption',x,y};break}}if(point)break}
  if(!point)throw Error('No blank real caption point'+(leak?' inside space released by right drawer':''))
  const button=[...document.querySelectorAll('.desktop-windows-menu,[data-content-restore]')].find(e=>e.getClientRects().length&&!e.closest('[inert]'))
  if(!button)throw Error('Fixed window menu/restore button missing');const b=button.getBoundingClientRect(),buttonPoint={label:'button',x:b.left+b.width/2,y:b.top+b.height/2}
  window.contentDrawerNativeProbe={caption,button,point,buttonPoint,leak}
  return{phase:shell.dataset.contentPhase,mode:shell.dataset.drawerMode,points:[point,buttonPoint],releasedZone:{left:vr.right-ir.width,right:vr.left},buttonLabel:button.getAttribute('aria-label')}
 },{leak})
 if(moving)assert(['opening','closing'].includes(before.phase),name+': moving before actual HWND probe')
 const result=await native.probe(before.points.map(p=>({...p,x:p.x*zoom,y:p.y*zoom})))
 const after=await page.evaluate(()=>{const p=window.contentDrawerNativeProbe,inside=(e,point)=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(point.x,point.y);return e.isConnected&&point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom&&!!hit&&e.contains(hit)},i=document.querySelector('.content-drawer-inner').getBoundingClientRect(),v=document.querySelector('.content-drawer-viewport').getBoundingClientRect();return{phase:document.querySelector('.dashboard-shell').dataset.contentPhase,sameCaption:inside(p.caption,p.point)&&!document.elementFromPoint(p.point.x,p.point.y)?.closest('button,[role=tab],input,[data-no-drag],.content-tabs-viewport'),sameButton:inside(p.button,p.buttonPoint),leakPointStillValid:!p.leak||(p.point.x>v.right-i.width&&p.point.x<v.left)}})
 const observation={name,before,after,zoom,...result,status:'checking'};report.nativeHitTests.push(observation)
 if(!after.sameCaption||!after.sameButton||!after.leakPointStillValid||(moving&&(before.phase!==after.phase||!['opening','closing'].includes(after.phase)))){observation.status='inconclusive';throw Error(name+': point/phase moved during actual native sample; no settled result is counted as moving pass')}
 try{assert.equal(result.points.find(p=>p.label==='caption')?.hit,2,name+': HTCAPTION released caption');assert.equal(result.points.find(p=>p.label==='button')?.hit,1,name+': HTCLIENT fixed button');observation.status='passed'}catch(e){observation.status='failed';throw e}
 await record(name,{driver:'actual HWND WM_NCHITTEST',phaseBefore:before.phase,phaseAfter:after.phase,dpi:result.dpi})
}
async function nativeControls(name){
 const state=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return{zoom:w.webContents.getZoomFactor(),content:w.getContentBounds(),maximized:w.isMaximized(),fullscreen:w.isFullScreen()}})
 assert.equal(state.fullscreen,false,'Native caption controls tested outside OS fullscreen')
 const controls=await page.evaluate(zoom=>{const menu=document.querySelector('.desktop-windows-menu'),r=menu?.getBoundingClientRect();const unsafe=[...document.querySelectorAll('.content-drawer-inner button,.content-drawer-inner [role=tab]')].filter(e=>{if(e.closest('[inert]'))return false;const b=e.getBoundingClientRect();return b.width>0&&b.top<32/zoom&&b.right>innerWidth-138/zoom&&b.left<innerWidth});return{menu:r?.toJSON(),unsafe:unsafe.map(e=>e.getAttribute('aria-label')??e.textContent)}},state.zoom)
 assert.deepEqual(controls.unsafe,[],name+': content controls stay outside fixed right native safe area');assert(controls.menu&&controls.menu.right*state.zoom<=state.content.width-138+.5,name+': fixed app menu clears native controls')
 const points=[{label:'minimize',x:state.content.width-115,y:16},{label:'maximize',x:state.content.width-69,y:16},{label:'close',x:state.content.width-23,y:16}]
 const result=await native.probe(points),expected={minimize:8,maximize:9,close:20},entry={name,state,controls,...result,status:'checking'};report.nativeHitTests.push(entry)
 try{for(const p of result.points)assert.equal(p.hit,expected[p.label],name+': native '+p.label+' hit region');entry.status='passed'}catch(e){entry.status='failed';throw e};await record(name,{driver:'actual HWND WM_NCHITTEST native system buttons',hits:result.points.map(p=>({label:p.label,hit:p.hit})),maximized:state.maximized})
}

try{
 await snapshotVersions();await runProcess(process.execPath,['--import','tsx','scripts/seed-sidebar-navigation.ts',directory]);fixture=JSON.parse(await readFile(join(directory,'fixture.json'),'utf8'));assert.equal(fixture.synthetic,true)
 report.fixture={synthetic:true,realWorkDatabases:fixture.works.length,source:'unchanged scripts/seed-sidebar-navigation.ts; actual Workspaces/PGlite/DraftJournal schemas',models:0}
 env={...process.env,XAANINK_TEST_ROOT:root};delete env.ELECTRON_RUN_AS_NODE
 await launch(env,'initial');await bounds(1800);await appearance({theme:'ink',zoom:1,uiFontSize:14,wordWrap:true})
 native=await startNative();await native.probe([]);await nativeRegions('CD-N07-caption-calibration');await nativeControls('CD-N07-native-controls-open')

 await stage('CD-N01-02-real-long-body-and-tools',async()=>{
  const chapter=fixture.works[0].volumes[0].chapters[1];await category('正文');await sidebar().getByRole('button',{name:'第 2 章 '+chapter.title,exact:true}).click();await page.locator('.content-tab[data-tab-id="chapter-content:'+chapter.id+'"][aria-selected=true]').waitFor();await activePanel().getByRole('button',{name:'编辑',exact:true}).first().click()
  editorDom=activePanel().locator('.monaco-editor').first();await editorDom.waitFor({timeout:60000});await editorDom.getByRole('textbox',{name:'Editor content',exact:true}).focus();await page.keyboard.press('Control+a')
  const long='用于真实右侧抽屉固定形态验收的长行 中文与 English words remain in the exact same wrapped rows during the animation。'.repeat(5)
  await page.keyboard.insertText(Array.from({length:100},(_,i)=>'第 '+(i+1)+' 行 '+long).join('\n'));await page.keyboard.press('Control+Home');await page.keyboard.press('Control+End');await page.keyboard.insertText(historyMarker);await page.keyboard.press('Control+Home');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight')
  const box=await editorDom.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,280);await pause(180);await frames();await bindActualEditor();assert(editorBaseline.scrollTop>0,'Actual CDP wheel establishes nonzero editor scroll')
  await activePanel().getByRole('button',{name:'正文功能菜单',exact:true}).click();await page.getByRole('menuitem',{name:'版本历史',exact:true}).waitFor();await page.keyboard.press('Escape');await frames();await resetEditorBaseline()
  // Existing autosave changes status text. Wait for actual IPC to contain the
  // new draft before measuring a stable presentation, without disabling save.
  const chapterPath='/api/novels/'+fixture.works[0].novelId+'/chapters/'+chapter.id
  await page.waitForFunction(async({path,text})=>{const r=await fetch(path);if(!r.ok)return false;const value=await r.json();return(value.chapter?.content??value.content)===text},{path:chapterPath,text:expectedText},{timeout:15000})
  await pause(180);await frames();await resetEditorBaseline()
  await closeDrawer('CD-N01-ink-long-body-close',{nativeTest:true});await retainedEditor('CD-N02-hidden-Monaco-kept');await page.evaluate(()=>window.desktop.command('editor.focus'));await page.keyboard.press('Control+z');assert.equal((await editorState()).text,expectedText,'Actual global editor command cannot edit a hidden instance');await nativeRegions('CD-N07-hidden-released-chat-caption',{leak:true});await nativeControls('CD-N07-native-controls-hidden');await openDrawer('CD-N01-ink-long-body-open',{nativeTest:true});await retainedEditor('CD-N02-open-Monaco-kept')
  await editorDom.getByRole('textbox',{name:'Editor content',exact:true}).focus();await page.keyboard.press('Control+z');assert.equal((await editorState()).text,expectedText.slice(0,-historyMarker.length),'Pre-animation history entry still undoable');await page.keyboard.press('Control+y');assert.equal((await editorState()).text,expectedText,'Pre-animation history entry still redoable')
  await resetEditorBaseline();await record('CD-N02-undo-redo-after-motion',{realKeyboardUndoRedo:true,historyCreatedBeforeAnimation:true,sameActualModel:true});await record('CD-N01-real-body',{screenshot:await screenshot('ink-long-body')})
 })

 await stage('CD-N01-03-real-Character-Theme',async()=>{
  await category('角色');await sidebar().getByText(fixture.works[0].characters[0].name,{exact:true}).click();const character=activePanel();await character.getByRole('textbox',{name:'姓名',exact:true}).waitFor();await character.getByRole('textbox',{name:'姓名',exact:true}).fill('用于抽屉验收的较长角色名 English words');await character.getByPlaceholder('一句话概括他的个人故事线：从哪来、正经历什么、要到哪去').fill('合成角色表单长段落。'.repeat(22));await character.getByRole('tab',{name:'身份 · 外在',exact:true}).focus();await pause(1000)
  await closeDrawer('CD-N01-character-close');await openDrawer('CD-N01-character-open');assert.equal(await character.getByRole('textbox',{name:'姓名',exact:true}).inputValue(),'用于抽屉验收的较长角色名 English words');await record('CD-N01-character-form',{screenshot:await screenshot('character-form')})
  await page.locator('.content-tab[data-tab-id="theme:'+fixture.works[0].novelId+'"]').click();await activePanel().getByTestId('theme-panel').waitFor();await activePanel().getByRole('textbox',{name:'书名',exact:true}).fill('主题表单抽屉验收 English title remains intact');await activePanel().getByPlaceholder('一句话讲清楚这本书写什么、爽在哪里').fill('主题简介用于固定版式逐帧检查。'.repeat(25));await activePanel().getByRole('heading',{name:'主题设定',exact:true}).click();await pause(1000)
  await activePanel().getByRole('combobox',{name:'频道',exact:true}).click();await page.getByRole('listbox').waitFor();await startCapture('CD-N03-select-portal-paused');await toggleByKeyboard();await page.waitForFunction(()=>document.querySelector('.dashboard-shell')?.dataset.contentPhase==='closing');await page.getByRole('listbox').waitFor({state:'hidden'});await stopCapture('CD-N03-select-portal-paused',{terminal:'closed'});await openDrawer('CD-N01-theme-open');assert.equal(await page.getByRole('listbox').count(),0,'Paused outer Select does not reopen on settle');await record('CD-N01-theme-form',{screenshot:await screenshot('theme-form')})
  await closeDrawer('CD-N01-theme-close');await openDrawer('CD-N01-theme-reopen')
  await page.locator('.content-tab[data-tab-id="chapter-content:'+fixture.works[0].volumes[0].chapters[1].id+'"]').click();await settle();await retainedEditor('CD-N02-after-real-forms',{scroll:false});await resetEditorBaseline()
 })

 await stage('CD-N03-real-ItemLevelPicker-Popover',async()=>{
  await category('设定');await sidebar().locator('.nav-work-group[data-work-id="'+fixture.works[0].novelId+'"]').getByRole('button',{name:'物品',exact:true}).click();await activePanel().getByRole('button',{name:'新建物品',exact:true}).click();await activePanel().getByRole('button',{name:'选择等级',exact:true}).waitFor();await activePanel().getByRole('button',{name:'选择等级',exact:true}).click()
  const popup=page.getByRole('dialog').filter({has:page.getByText('暂无物品类等级体系，先在世界观设定中创建',{exact:true})});await popup.waitFor();await startCapture('CD-N03-real-item-popover-hide');await(await hideButton()).click();await page.waitForFunction(()=>document.querySelector('.dashboard-shell')?.dataset.contentPhase==='closing');await popup.waitFor({state:'hidden'});await stopCapture('CD-N03-real-item-popover-hide',{terminal:'closed'});await openDrawer('CD-N03-real-item-reopen');assert.equal(await popup.isVisible(),false,'Actual direct ItemLevelPicker Popover stays closed after drawer reopen')
  await record('CD-N03-real-ItemLevelPicker-Popover',{actualComponent:true,fixtureCreatedThroughRealUI:true,trigger:'ordinary visible content toolbar click; outside-click and drawer pause share this real UI path',pauseIsolation:'dedicated browser tests isolate context-driven pause; this native path confirms actual component lifecycle'})
  await page.locator('.content-tab[data-tab-id="chapter-content:'+fixture.works[0].volumes[0].chapters[1].id+'"]').click();await settle();await retainedEditor('CD-N02-after-real-item',{scroll:false});await resetEditorBaseline()
 })

 await stage('CD-N04-reversal-parallel-and-fullscreen',async()=>{
  await startCapture('CD-N04-fast-reversal');await(await hideButton()).focus();await page.keyboard.press('Enter');await pause(80);assert.equal(await contentPhase(),'closing');await showViaRestore();await pause(65);assert.equal(await contentPhase(),'opening');await showViaRestore();await stopCapture('CD-N04-fast-reversal',{terminal:'closed'});await openDrawer('CD-N04-after-reversal-open');await retainedEditor('CD-N02-after-reversal',{scroll:false});await resetEditorBaseline()
  await startCapture('CD-N04-both-drawers');await(await hideButton()).focus();await page.keyboard.press('Enter');await page.keyboard.press('Control+Alt+b');await stopCapture('CD-N04-both-drawers',{terminal:'closed'});assert.equal(await shell().getAttribute('data-sidebar-phase'),'closed');await startCapture('CD-N04-both-drawers-open');await showViaRestore();await page.keyboard.press('Control+Alt+b');await stopCapture('CD-N04-both-drawers-open',{terminal:'open'});assert.equal(await shell().getAttribute('data-sidebar-phase'),'open')
  await page.getByRole('button',{name:'进入全屏',exact:true}).click();await settle();assert((await page.locator('.workspace-chat').evaluate(e=>e.parentElement.getBoundingClientRect().width))<.1);await resetEditorBaseline();await closeDrawer('CD-N04-content-fullscreen-close');await openDrawer('CD-N04-content-fullscreen-open');await retainedEditor('CD-N02-after-fullscreen',{scroll:false});const exit=page.getByRole('button',{name:'退出全屏',exact:true});if(await exit.count())await exit.click();await settle();await resetEditorBaseline()
 })

 await stage('CD-N03-real-tab-drag-cancel',async()=>{
  const order=await page.locator('.content-tabs-track .content-tab[data-tab-id]').evaluateAll(es=>es.map(e=>e.dataset.tabId)),source=page.locator('.content-tabs-track .content-tab[aria-selected=true]'),box=await source.boundingBox()
  await page.mouse.move(box.x+Math.min(40,box.width/2),box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+Math.min(40,box.width/2)+70,box.y+box.height/2,{steps:5});await page.locator('.content-tab-drag-preview').waitFor();await startCapture('CD-N03-tab-drag-paused');await toggleByKeyboard();await page.waitForFunction(()=>document.querySelector('.dashboard-shell')?.dataset.contentPhase==='closing');await page.waitForFunction(()=>!document.querySelector('.content-tab-drag-preview,.content-tab-drag-source'));await page.mouse.up();await stopCapture('CD-N03-tab-drag-paused',{terminal:'closed'});assert.deepEqual(await page.locator('.content-tabs-track .content-tab[data-tab-id]').evaluateAll(es=>es.map(e=>e.dataset.tabId)),order,'Pause cancels actual pointer drag without committing order')
  assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('[inert]')),false,'Cancelled drag does not queue focus into inert content');await openDrawer('CD-N03-tab-drag-reopen');assert.deepEqual(await page.locator('.content-tabs-track .content-tab[data-tab-id]').evaluateAll(es=>es.map(e=>e.dataset.tabId)),order);await retainedEditor('CD-N02-after-tab-drag',{scroll:false});await resetEditorBaseline();await record('CD-N03-real-tab-drag-cancel',{realPointerSequence:true,noOrderCommit:true,noInertFocus:true})
 })

 await stage('CD-N01-05-themes-manual-resize-zoom',async()=>{
  for(const theme of['paper','ink']){await appearance({theme,zoom:1,uiFontSize:14});await closeDrawer('CD-N01-'+theme+'-close');await openDrawer('CD-N01-'+theme+'-open')}
  const separator=page.locator('.workspace-resize-handle').filter({visible:true}).last(),s=await separator.boundingBox(),before=await inner().evaluate(e=>e.getBoundingClientRect().width);await page.mouse.move(s.x+s.width/2,s.y+s.height/2);await page.mouse.down();await page.mouse.move(s.x-95,s.y+s.height/2,{steps:12});await page.mouse.up();await settle();const after=await inner().evaluate(e=>e.getBoundingClientRect().width);assert(Math.abs(after-before)>50,'Real pointer drag changes stationary split width');await closeDrawer('CD-N05-manual-split-close');await openDrawer('CD-N05-manual-split-open');assert(Math.abs((await inner().evaluate(e=>e.getBoundingClientRect().width))-after)<3,'Complete manual width restored');await record('CD-N05-manual-stationary-split',{before,after})
  for(const zoom of[.75,1.25,1.5]){await appearance({zoom});await bounds(1800,1000);await closeDrawer('CD-N05-zoom-'+zoom+'-close');await openDrawer('CD-N05-zoom-'+zoom+'-open');await nativeControls('CD-N07-zoom-'+zoom+'-native-controls')}
  await appearance({zoom:1});await bounds(1800);await closeDrawer('CD-N05-before-live-zoom-close');await startCapture('CD-N05-live-zoom-CSS-geometry');await showViaRestore();await pause(75);await appearance({zoom:1.25},{settled:false});await stopCapture('CD-N05-live-zoom-CSS-geometry',{terminal:'open'});await record('CD-N05-explicit-live-zoom-boundary',{physicalPixelsExpectedToChange:true,measuredUnits:'CSS pixels',frozenCaptionAndLayout:true});await appearance({zoom:1});await bounds(1800);await resetEditorBaseline()
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].maximize());await settle();await nativeControls('CD-N07-maximized-native-controls');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].unmaximize());await settle();await bounds(1800);await resetEditorBaseline()
 })

 await stage('CD-N05-narrow-and-actual-breakpoint-resize',async()=>{
  for(const width of[899,780]){await bounds(width,680);await switcher('查看内容');await settle();assert.equal(await shell().getAttribute('data-drawer-mode'),'narrow');await closeDrawer('CD-N05-narrow-'+width+'-close');await startCapture('CD-N05-narrow-'+width+'-open');await switcher('查看内容');await stopCapture('CD-N05-narrow-'+width+'-open',{terminal:'open'});await startCapture('CD-N05-narrow-'+width+'-return-chat');await switcher('返回对话');await stopCapture('CD-N05-narrow-'+width+'-return-chat',{terminal:'closed'});const draft=await persisted(w=>w?.layout?.narrowPane==='chat');assert.equal(draft.layout.contentVisible,true,'Returning to chat retains desktop content preference');await switcher('查看内容');await settle()}
  await bounds(1800,1000);if(await contentPhase()==='closed')await openDrawer('CD-N05-before-breakpoint-open');await startCapture('CD-N05-closing-WH-across-breakpoint');await(await hideButton()).focus();await page.keyboard.press('Enter');await pause(75);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:899,height:680}));await stopCapture('CD-N05-closing-WH-across-breakpoint',{terminal:'closed'});assert.equal(await shell().getAttribute('data-drawer-mode'),'narrow');assert.equal(await shell().getAttribute('data-narrow-pane'),'chat')
  await startCapture('CD-N05-opening-WH-back-to-wide');await switcher('查看内容');await pause(75);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1700,height:980}));await stopCapture('CD-N05-opening-WH-back-to-wide',{terminal:'open'});assert.equal(await shell().getAttribute('data-drawer-mode'),'wide');await bounds(1800);await retainedEditor('CD-N02-after-real-resizes',{scroll:false});await resetEditorBaseline()
 })

 await stage('CD-N06-reduced-motion-and-cold-target',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await startCapture('CD-N06-reduced-close');await(await hideButton()).focus();await page.keyboard.press('Enter');await stopCapture('CD-N06-reduced-close',{terminal:'closed',allowInstant:true});await startCapture('CD-N06-reduced-open');await showViaRestore();await stopCapture('CD-N06-reduced-open',{terminal:'open',allowInstant:true});await page.emulateMedia({reducedMotion:'no-preference'});await retainedEditor('CD-N02-reduced-kept',{scroll:false})
  const before=await persisted(w=>w?.layout?.contentVisible===true),coldExpectedText=expectedText,journalSamples=[];let collecting=true,journalError=null
  await startCapture('CD-N06-persist-final-close')
  const collect=(async()=>{try{while(collecting){journalSamples.push({time:new Date().toISOString(),layout:(await workspace())?.layout});await pause(45)}}catch(e){journalError=e}})()
  try{await(await hideButton()).focus();await page.keyboard.press('Enter');await stopCapture('CD-N06-persist-final-close',{terminal:'closed'})}finally{collecting=false;await collect}
  if(journalError)throw journalError
  const closed=await persisted(w=>w?.layout?.contentVisible===false);assert.equal(closed.layout.lastContentSize,before.layout.lastContentSize,'Store complete target preference rather than intermediate pixel width');assert.equal(closed.layout.narrowPane,'chat')
  for(const sample of journalSamples){assert.equal(sample.layout.lastContentSize,before.layout.lastContentSize,'Actual disk journal never stores animation width as complete preference');assert([JSON.stringify(before.layout),JSON.stringify(closed.layout)].includes(JSON.stringify(sample.layout)),'Each actual IPC journal sample is the previous or final legal target')}
  await record('CD-N06-actual-journal-during-motion',{sampling:'real desktop.readDraft IPC / on-disk DraftJournal; 45 ms intervals',samples:journalSamples});await app.close();app=null
  await launch(env,'cold-target');assert.equal(await contentPhase(),'closed');assert.equal((await workspace()).layout.contentVisible,false);await openDrawer('CD-N06-cold-restored-open');await activePanel().getByRole('button',{name:'编辑',exact:true}).first().click();await activePanel().locator('.monaco-editor').waitFor({timeout:60000});await bindActualEditor();assert.equal(editorBaseline.text,coldExpectedText,'Actual cold product restores body data');await nativeRegions('CD-N07-cold-caption');await record('CD-N06-cold-target-restoration',{screenshot:await screenshot('cold-restored-open'),savedTarget:closed.layout})
 })

 await stage('CD-N05-07-real-empty-caption-freeze',async()=>{
  await app.close();app=null;native.close();native=null
  const empty=await mkdtemp(join(tmpdir(),'xaanink-sidebar-'));ownedFixtures.push(empty);await runProcess(process.execPath,['--import','tsx','scripts/seed-sidebar-navigation.ts',empty,'--empty-fullscreen']);const emptyEnv={...env,XAANINK_TEST_ROOT:join(empty,'data')};await launch(emptyEnv,'empty-caption');await bounds(1800);assert.equal(await page.locator('.content-tab[data-tab-id]').count(),0);await appearance({zoom:1.25});native=await startNative();await native.probe([]);await closeDrawer('CD-N05-empty-caption-close');await startCapture('CD-N05-empty-caption-live-zoom');await showViaRestore();await pause(75);await appearance({zoom:1.5},{settled:false});await stopCapture('CD-N05-empty-caption-live-zoom',{terminal:'open'});await nativeControls('CD-N07-empty-caption-native-controls');await closeDrawer('CD-N05-empty-caption-hide');await nativeRegions('CD-N07-empty-hidden-released-caption',{leak:true});await record('CD-N05-empty-caption',{realEmptyDraftJournal:true,frozenCaptionZoom:true,physicalPixelInvarianceClaim:false,screenshot:await screenshot('empty-hidden-caption')})
 })
 assert.deepEqual(report.errors,[],'No renderer page errors on any launch');assert.deepEqual(report.httpRequests,[],'No observed external HTTP requests on any launch');await endingVersions(true)
 report.status='passed';report.completedAt=new Date().toISOString();await save();console.log('Actual Windows content drawer verification passed: '+local(evidence))
}catch(error){
 report.status='failed';report.error=safe(error?.stack??error);report.completedAt=new Date().toISOString()
 if(page){try{const capture=await page.evaluate(()=>{const c=window.contentDrawerCapture;if(!c?.active)return null;c.active=false;return c});if(capture){const file=join(evidence,capture.name+'-interrupted-frames.json');await writeFile(file,safe(JSON.stringify(capture,null,2))+'\n');report.interruptedCapture={name:capture.name,status:'incomplete',frameCount:capture.frames.length,source:local(file)}}}catch{};try{report.failureScreenshot=await screenshot('failure')}catch{}}
 try{await endingVersions(false)}catch(e){report.versionCheckError=safe(e)}await save();throw Error(report.error)
}finally{native?.close();await app?.close().catch(()=>{});report.temporaryFixtureRetained=true;await save()}
