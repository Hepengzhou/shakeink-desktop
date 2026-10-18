import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink, access, realpath,rename} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {desktopCommandCatalog, publishDesktopCommands} from '../../src/lib/desktop/command-runtime'
import type {DesktopCommand} from '../../desktop/shared/command-registry'

const entries=['dist/main/index.cjs','dist/service/index.cjs','dist/preload/index.cjs','dist/preload/maintenance.cjs','dist/preload/root-relocation.cjs']
const sha=(value:string)=>createHash('sha256').update(value).digest('hex')
async function fixture(run:(project:string,app:string,put:(path:string,value:unknown)=>Promise<void>,session:object)=>Promise<void>){
 const project=await realpath(await mkdtemp(join(tmpdir(),'shakeink-runtime-closure-'))),app=join(project,'release/new/resources/app')
 const manifest={schemaVersion:1,entries:entries.map(path=>({path,sha256:sha('module.exports={}\n'),externals:path===entries[0]?['root','node:fs','electron']:[]})),embeddedLicenses:[]}
 const stage=join(project,'release/new');await mkdir(stage,{recursive:true});await mkdir(join(project,'dist'));await writeFile(join(project,'dist/runtime-dependencies.json'),JSON.stringify(manifest))
 const {createPruneSession}=await import('../../scripts/runtime-dependencies.mjs');const session=await createPruneSession(project,stage)
 const put=async(path:string,value:unknown)=>{const target=join(app,path);await mkdir(join(target,'..'),{recursive:true});await writeFile(target,typeof value==='string'?value:JSON.stringify(value))}
 try{
  await put('package.json',{name:'shakeink',version:'0.1.0',main:entries[0],dependencies:{root:'1',unused:'1'}})
  for(const path of entries)await put(path,'module.exports={}\n')
  await put('dist/runtime-dependencies.json',manifest)
  await put('node_modules/root/package.json',{name:'root',main:'index.cjs',dependencies:{child:'1'},optionalDependencies:{missing:'1'},peerDependencies:{peer:'*',optionalPeer:'*'},peerDependenciesMeta:{optionalPeer:{optional:true}}})
  await put('node_modules/root/index.cjs','module.exports=42')
  await put('node_modules/root/node_modules/child/package.json',{name:'child',type:'module',exports:{import:'./index.js'},dependencies:{root:'1'}})
  await put('node_modules/root/node_modules/child/index.js','export const answer=42')
  await put('node_modules/peer/package.json',{name:'peer',exports:{'.':'./index.cjs'}})
  await put('node_modules/peer/index.cjs','module.exports=1')
  await put('node_modules/peer/engine.wasm','wasm sentinel')
  await put('node_modules/unused/package.json',{name:'unused'})
  await run(project,app,put,session)
 }finally{await rm(project,{recursive:true,force:true})}
}

test('OPT-P01/P02: runtime roots and real nested/export-restricted dependency closure retain resources, omit absent optional peers',async()=>{
 const {runtimePackageName,prunePackagedDependencies,verifyRuntimeDependencies}=await import('../../scripts/runtime-dependencies.mjs')
 assert.equal(runtimePackageName('@prisma/client/runtime/client'),'@prisma/client');assert.equal(runtimePackageName('node:fs'),null);assert.equal(runtimePackageName('electron'),null)
 await fixture(async(project,app,_put,session)=>{
  const before=await readFile(join(app,'node_modules/peer/engine.wasm'))
  const result=await prunePackagedDependencies(project,app,session)
  assert.deepEqual(result.removed,['node_modules/unused']);assert(result.kept.includes('node_modules/root/node_modules/child'))
  assert.deepEqual(await readFile(join(app,'node_modules/peer/engine.wasm')),before)
  assert.deepEqual(Object.keys(JSON.parse(await readFile(join(app,'package.json'),'utf8')).dependencies),['root'])
  await verifyRuntimeDependencies(app);await assert.rejects(access(join(app,'node_modules/unused')))
 })
})

test('OPT-P01/P03: stale/missing entry and required dependency failures happen before any deletion',async()=>{
 const {prunePackagedDependencies}=await import('../../scripts/runtime-dependencies.mjs')
 for(const damage of ['entry','missing','dependency','manifest'] as const)await fixture(async(project,app,put,session)=>{
  if(damage==='entry')await put(entries[1],'changed')
  if(damage==='missing')await rm(join(app,entries[2]))
  if(damage==='dependency')await rm(join(app,'node_modules/peer'),{recursive:true})
  if(damage==='manifest')await put('dist/runtime-dependencies.json',{schemaVersion:1,entries:[],embeddedLicenses:[]})
  await assert.rejects(prunePackagedDependencies(project,app,session));await access(join(app,'node_modules/unused/package.json'))
 })
})

test('OPT-P03: never prune a source project, external symlink or parent fallback',async()=>{
 const {prunePackagedDependencies}=await import('../../scripts/runtime-dependencies.mjs')
 await fixture(async(project,app,_put,session)=>{
  await assert.rejects(prunePackagedDependencies(project,project,session));await access(join(app,'node_modules/unused/package.json'))
  const outside=join(project,'external');await mkdir(outside);await writeFile(join(outside,'package.json'),JSON.stringify({name:'peer',main:'index.cjs'}));await writeFile(join(outside,'index.cjs'),'module.exports=1')
  await rm(join(app,'node_modules/peer'),{recursive:true});await symlink(outside,join(app,'node_modules/peer'),'dir')
  await assert.rejects(prunePackagedDependencies(project,app,session),/outside|symbolic|escape|link/i);await access(join(outside,'index.cjs'));await access(join(app,'node_modules/unused/package.json'))
 })
 await fixture(async(project,app,_put,session)=>{
  await rm(join(app,'node_modules/peer'),{recursive:true});const parent=join(project,'node_modules/peer');await mkdir(parent,{recursive:true});await writeFile(join(parent,'package.json'),JSON.stringify({name:'peer'}))
  await assert.rejects(prunePackagedDependencies(project,app,session));await access(join(app,'node_modules/unused/package.json'))
 })
})

test('OPT-C01: startup full catalog has no dependency path to Monaco runtime',async()=>{
 const result=await build({entryPoints:['src/lib/desktop/startup-command-catalog.ts'],bundle:true,platform:'browser',write:false,metafile:true,loader:{'.css':'empty'},logLevel:'silent'})
 assert(!Object.keys(result.metafile!.inputs).some(path=>path.includes('node_modules/monaco-editor/')&&!path.endsWith('/package.json')))
 const {initializeStartupCommandCatalog}=await import('../../src/lib/desktop/startup-command-catalog')
 const generated=JSON.parse(await readFile('desktop/shared/command-catalogs.generated.json','utf8'))
 for(const platform of ['darwin','win32'] as const){const release=initializeStartupCommandCatalog(platform);try{assert.deepEqual(desktopCommandCatalog(platform),generated.platforms[platform].commands)}finally{release()}}
})

test('OPT-C02: two live owners override snapshot metadata/defaults; disposal restores snapshot and preserves static labels',()=>{
 const row=(binding:string,when:string):DesktopCommand=>({id:'monaco.optimization.sentinel',label:'Sentinel',group:'Editor',scope:'markdown',locked:false,defaults:[binding],monacoBindings:[{binding,when,weight:1,secondaryWeight:0}]} as DesktopCommand)
 const snapshot=publishDesktopCommands('opt-snapshot',[row('Ctrl+K','old')],-1)
 const live=publishDesktopCommands('opt-live',[row('Ctrl+L','live')])
 const live2=publishDesktopCommands('opt-live-2',[row('Ctrl+M','live2')])
 try{
  let current=desktopCommandCatalog('darwin').find(x=>x.id==='monaco.optimization.sentinel') as ReturnType<typeof row>
  assert.deepEqual(current.defaults,['Ctrl+L','Ctrl+M']);assert.equal((current as any).monacoBindings[0].when,'live')
  live();current=desktopCommandCatalog('darwin').find(x=>x.id==='monaco.optimization.sentinel')!
  assert.deepEqual(current.defaults,['Ctrl+M']);live2();assert.deepEqual(desktopCommandCatalog('darwin').find(x=>x.id==='monaco.optimization.sentinel')!.defaults,['Ctrl+K'])
 }finally{live();live2();snapshot()}
 assert(!desktopCommandCatalog('darwin').some(x=>x.id==='monaco.optimization.sentinel'))
})

test('OPT-P03 review regressions: root node_modules symlink, historical target, missing source manifest and reused capability are rejected before deletion',async()=>{
 const {prunePackagedDependencies,createPruneSession}=await import('../../scripts/runtime-dependencies.mjs')
 await fixture(async(project,app,_put,session)=>{
  await assert.rejects(createPruneSession(project,join(project,'release/new')),/empty new staging/)
  await assert.rejects(prunePackagedDependencies(project,app))
  const outside=join(project,'external-dependencies');await rename(join(app,'node_modules'),outside);await symlink(outside,join(app,'node_modules'),'dir')
  await assert.rejects(prunePackagedDependencies(project,app,session),/symbolic|escape|link/i)
  await access(join(outside,'unused/package.json'))
 })
 await fixture(async(project,app,_put,session)=>{
  await rm(join(project,'dist/runtime-dependencies.json'))
  await assert.rejects(prunePackagedDependencies(project,app,session));await access(join(app,'node_modules/unused/package.json'))
 })
 await fixture(async(project,app,_put,session)=>{
  await prunePackagedDependencies(project,app,session)
  await assert.rejects(prunePackagedDependencies(project,app,session),/capability/)
 })
})

test('OPT-P02 review regression: actual dynamic import-only external root and deep exports use import conditions',async()=>{
 const {verifyRuntimeDependencies}=await import('../../scripts/runtime-dependencies.mjs')
 await fixture(async(_project,app,put)=>{
  await put('node_modules/esm-only/package.json',{name:'esm-only',type:'module',exports:{'.':{import:'./index.mjs'},'./deep':{import:'./deep.mjs'}}})
  await put('node_modules/esm-only/index.mjs','export const answer=42');await put('node_modules/esm-only/deep.mjs','export const deep=43')
  const manifest=JSON.parse(await readFile(join(app,'dist/runtime-dependencies.json'),'utf8'))
  manifest.entries[0].externals.push({specifier:'esm-only',kind:'dynamic-import'},{specifier:'esm-only/deep',kind:'dynamic-import'})
  await put('dist/runtime-dependencies.json',manifest)
  assert((await verifyRuntimeDependencies(app)).roots.includes('esm-only'))
  manifest.entries[0].externals.at(-1).kind='require-call';await put('dist/runtime-dependencies.json',manifest)
  await assert.rejects(verifyRuntimeDependencies(app),/exports|exported/i)
 })
})
