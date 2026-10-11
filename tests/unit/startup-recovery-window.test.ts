import assert from 'node:assert/strict'
import {test} from 'node:test'
import {EventEmitter} from 'node:events'
import {createRequire} from 'node:module'
import {build} from 'esbuild'
import {randomUUID} from 'node:crypto'
import {mkdtemp,mkdir,realpath,rm,writeFile,readFile,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DataRootManager} from '../../desktop/core/data-root'
import {directoryIdentity} from '../../desktop/core/root-ownership'
import {rootRelocationPreflight} from '../../desktop/main/root-relocation-preflight'

// Actual window module bundled with real controller/startup-recovery/FS.
// Electron surfaces are controlled; never a native app run.
const require=createRequire(import.meta.url)
const closeAccentBoundary={installWindowsCloseAccent(){},updateWindowsCloseAccentColor(){}}
const bundle=build({entryPoints:['desktop/main/root-relocation-window.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,
 plugins:[{name:'controlled-close-accent',setup(plugin){plugin.onResolve({filter:/^\.\/native-close-accent$/},()=>({path:'review:close-accent',external:true}))}}],
}).then(result=>result.outputFiles[0].text)
interface WindowRecord{preferences:{title:string};titles:string[];webContents:unknown}
async function fixture(kind:'recovery'|'history'|'marker-invalid'){
 const base=await realpath(await mkdtemp(join(tmpdir(),'xaanink-recovery-window-'))),bootstrap=join(base,'bootstrap'),root=join(base,'root'),out=join(base,'out')
 for(const path of[bootstrap,out])await mkdir(path)
 if(kind==='history')await writeFile(join(bootstrap,'root-migration-request.json'),'{"schemaVersion":1}')
 if(kind==='marker-invalid'){await mkdir(join(root,'inbox','database'),{recursive:true});await writeFile(join(root,'catalog.json'),'{}');await writeFile(join(root,'xaanink-app.json'),JSON.stringify({schemaVersion:1,app:'XaanInk',id:randomUUID(),phase:'ready',inboxReady:true}));await new DataRootManager(bootstrap,root).adopt(await directoryIdentity(root));await writeFile(join(root,'xaanink-app.json'),'{损坏标记')}
 await writeFile(join(out,'index.html'),'<p>restricted recovery</p>')
 const trace:string[]=[],handlers=new Map<string,(...args:any[])=>any>(),instances:any[]=[],paths=new Map<string,string>()
 const isolated={storagePath:null,setPermissionRequestHandler(){},setPermissionCheckHandler(){},webRequest:{onBeforeRequest(){}},protocol:{handle(){}}}
 const app=Object.assign(new EventEmitter(),{setPath:(key:string,value:string)=>{paths.set(key,value);trace.push(`path:${key}`)},getPath:(key:string)=>paths.get(key),hasSingleInstanceLock:()=>true,whenReady:async()=>{},getAppPath:()=>base,getVersion:()=>'0.1.0',setAboutPanelOptions(){},showAboutPanel(){},relaunch:()=>trace.push('relaunch'),quit:()=>trace.push('quit')})
 class Window extends EventEmitter{
  static getAllWindows(){return instances.filter(value=>!value.destroyed)}
  destroyed=false;preferences:any;titles:string[]=[];webContents:any
  constructor(value:any){super();this.preferences=value;this.webContents=Object.assign(new EventEmitter(),{id:31,mainFrame:{url:'xaanink://app/'},session:value.webPreferences.session,send:()=>trace.push('event'),setWindowOpenHandler:(cb:any)=>this.webContents.openHandler=cb});instances.push(this);trace.push('window')}
  isDestroyed(){return this.destroyed}setMenu(){}show(){trace.push('show')}focus(){}minimize(){}setTitle(value:string){this.titles.push(value);this.preferences.title=value}async loadURL(url:string){assert.equal(url,'xaanink://app/');trace.push('load')}
 }
 const electron={app,BrowserWindow:Window,ipcMain:{handle:(id:string,cb:any)=>handlers.set(id,cb)},Menu:{buildFromTemplate:(value:any)=>({items:value,popup(){}}),setApplicationMenu(){}},nativeTheme:{shouldUseDarkColors:false},dialog:{showOpenDialog:async()=>({canceled:true,filePaths:[]}),showMessageBox:async()=>({response:1})},session:{fromPartition:(name:string,options:any)=>{assert.equal(name,'xaanink-root-relocation');assert.deepEqual(options,{cache:false});return isolated},get defaultSession(){throw Error('must not open original session')}}}
 const module={exports:{}as{launchRootRelocation(bootstrap:string,preflight:ReturnType<typeof rootRelocationPreflight>,recovery?:unknown):Promise<void>;launchStartupRecovery(bootstrap:string,input:unknown):Promise<void>}}
 new Function('module','exports','require','__dirname','process',await bundle)(module,module.exports,(id:string)=>id==='electron'?electron:id==='review:close-accent'?closeAccentBoundary:require(id),join(base,'bundle/main'),process)
 const event=()=>({sender:instances[0].webContents,senderFrame:instances[0].webContents.mainFrame})
 return{base,bootstrap,root,trace,handlers,instances,paths,api:module.exports,
  state:()=>handlers.get('desktop:relocation-state')!(event()),
  command:(value:unknown)=>handlers.get('desktop:relocation-command')!(event(),value),
  close:()=>rm(base,{recursive:true,force:true})}
}
const recoveryInput=(f:{root:string})=>({recoveryRoot:f.root,home:join(f.root,'unused-home'),isolatedRoot:f.root,family:'current',sourcePath:null})

test('SR-U-100 launchStartupRecovery opens a blocked reset-capable window without any preflight history',async()=>{
 const f=await fixture('recovery')
 try{
  await f.api.launchStartupRecovery(f.bootstrap,recoveryInput(f))
  const state=f.state();assert.equal(state.phase,'blocked');assert.equal(state.notice,'pointer-invalid');assert.equal(state.canReset,true);assert.equal(state.defaultPath,f.root)
  assert.equal(f.instances[0].titles.at(-1),'数据目录恢复 · 玄印写作')
 }finally{await f.close()}
})
test('SR-U-101 relocation preflight POINTER_REQUIRED keeps the locate window with the history notice and a reset exit',async()=>{
 const f=await fixture('history')
 try{
  await f.api.launchRootRelocation(f.bootstrap,rootRelocationPreflight(f.bootstrap),recoveryInput(f))
  const state=f.state();assert.equal(state.phase,'blocked');assert.equal(state.notice,'history-needs-recovery');assert.equal(state.canReset,true);assert.equal(state.defaultPath,f.root)
  assert.equal(f.instances[0].preferences.title,'定位原数据目录 · 玄印写作')
  assert.equal(f.instances[0].titles.includes('数据目录恢复 · 玄印写作'),false)
 }finally{await f.close()}
})
test('SR-U-102 relocation preflight ROOT_MARKER_INVALID switches to the recovery notice and title',async()=>{
 const f=await fixture('marker-invalid')
 try{
  assert.equal(rootRelocationPreflight(f.bootstrap).code,'ROOT_MARKER_INVALID')
  await f.api.launchRootRelocation(f.bootstrap,rootRelocationPreflight(f.bootstrap),recoveryInput(f))
  const state=f.state();assert.equal(state.phase,'blocked');assert.equal(state.notice,'pointer-invalid');assert.equal(state.canReset,true)
  assert.equal(f.instances[0].titles.at(-1),'数据目录恢复 · 玄印写作')
 }finally{await f.close()}
})
test('SR-U-103 the IPC whitelist accepts the reset command trio, rejects anything else and the confirm runs the real wipe',async()=>{
 const f=await fixture('recovery')
 try{
  await mkdir(join(f.root,'inbox'),{recursive:true});await writeFile(join(f.root,'junk.txt'),'损坏残留');await writeFile(join(f.bootstrap,'data-root.json'),'{损坏指针');await writeFile(join(f.bootstrap,'root-migration.json'),'{}')
  await f.api.launchStartupRecovery(f.bootstrap,recoveryInput(f))
  for(const bad of['reset-confirm-now','wipe',{type:'reset'},'choose'])await assert.rejects(f.command(bad))
  await f.command('reset');assert.equal(f.state().phase,'reset-confirm')
  await f.command('reset-back');assert.equal(f.state().phase,'blocked')
  await f.command('reset');await f.command('reset-confirm')
  assert.deepEqual(await readdir(f.root),[],'default root emptied by the real wipe')
  assert.deepEqual(await readdir(f.bootstrap),['session'],'control/history files cleared, session retained')
  assert.deepEqual(f.trace.filter(value=>['relaunch','quit'].includes(value)),['relaunch','quit'])
  assert.equal(f.state().phase,'complete');assert.equal(f.state().notice,'reset-complete')
 }finally{await f.close()}
})
