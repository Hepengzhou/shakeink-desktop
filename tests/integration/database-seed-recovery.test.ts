import assert from 'node:assert/strict'
import test from 'node:test'
import {createHash,randomUUID} from 'node:crypto'
import {mkdtemp,mkdir,readFile,readdir,realpath,rm,writeFile,lstat} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {Worker} from 'node:worker_threads'
import {build} from 'esbuild'
import {DataRootManager,RootMigrationCrash,type MigrationHost,type RootPointer} from '../../desktop/core/data-root'
import {directoryIdentity} from '../../desktop/core/root-ownership'
import {Workspaces} from '../../desktop/service/workspaces'
import {LocalTemplateLibrary} from '../../desktop/service/template-library'
import {RpcPeer} from '../../desktop/service/rpc'
import {createRootStartupBuffer,readRootStartup,type RootStartupResult} from '../../desktop/shared/root-startup'
import {defaultState} from '../../desktop/core/settings'
import {freezeTaskDefaults} from '../../desktop/shared/task-defaults'

const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex')
type Inventory={directories:string[];files:{path:string;bytes:number;sha256:string}[]}
async function inventory(root:string):Promise<Inventory>{
 const result:Inventory={directories:['.'],files:[]}
 async function visit(directory:string,relative:string){
  for(const entry of(await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const path=join(directory,entry.name),name=relative?`${relative}/${entry.name}`:entry.name
   assert(!entry.isSymbolicLink(),'this closed public fixture contains only real directories and files')
   if(entry.isDirectory()){result.directories.push(name);await visit(path,name)}
   else{assert(entry.isFile());const bytes=await readFile(path);result.files.push({path:name,bytes:bytes.length,sha256:sha(bytes)})}
  }
 }
 await visit(root,'');return result
}
async function closedHost(pointer:RootPointer):Promise<MigrationHost>{
 const files=['shakeink-app.json','catalog.json'],directories=['inbox/database']
 async function visit(path:string,relative:string){for(const entry of await readdir(path,{withFileTypes:true})){const name=`${relative}/${entry.name}`;if(entry.isDirectory()){directories.push(name);await visit(join(path,entry.name),name)}else{assert(entry.isFile()&&!entry.isSymbolicLink());files.push(name)}}}
 await visit(join(pointer.root.path,'inbox/database'),'inbox/database')
 return{async quiesce(){return{source:pointer.root,ownedFiles:files,ownedDirectories:directories,assertClosed(){},release(){}}}}
}
async function absent(path:string){try{await lstat(path);return false}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return true;throw error}}
async function launch(entry:string,root:string,bootstrap:string,databaseSeed:string){
 const startup=createRootStartupBuffer(),worker=new Worker(entry,{workerData:{root,bootstrap,databaseSeed,migrations:resolve('prisma/migrations'),startup}})
 let defaultsRequests=0,closed=false
 const rpc=new RpcPeer(worker,async method=>{if(method==='model.defaults'){defaultsRequests++;return freezeTaskDefaults(defaultState.settings.agent,0)}throw Error('Seed recovery startup must not call main or network services')})
 worker.on('error',()=>rpc.dispose());worker.on('exit',()=>rpc.dispose())
 return{
  rpc,
  result():RootStartupResult{
   assert.notEqual(Atomics.wait(new Int32Array(startup,0,4),0,0,45000),'timed-out','actual service must publish the production startup envelope')
   const result=readRootStartup(startup);assert(result);assert.equal(defaultsRequests,0,'startup may not depend on asynchronous main RPC');return result
  },
  async close(){if(closed)return;closed=true;await rpc.call('close').catch(()=>undefined);rpc.dispose();await worker.terminate()},
 }
}
async function prompts(rpc:RpcPeer){
 const id=randomUUID(),reply=await rpc.call<{status:number}>('start',{version:1,id,path:'/api/admin/prompts',method:'GET',headers:{}})
 const chunks:Uint8Array[]=[]
 for(;;){const part=await rpc.call<{done:boolean;bytes?:Uint8Array}>('read',id);if(part.done)break;assert(part.bytes);chunks.push(part.bytes)}
 assert.equal(reply.status,200);return JSON.parse(Buffer.concat(chunks).toString('utf8')) as{prompts:{id:string;key:string;content:string;version:number}[]}
}

test('OPT-M06: absent seed cannot advance a real pointer-written recovery journal or change either closed database; valid seed recovers that same journal and reads original templates',{timeout:180000},async t=>{
 const base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-recovery-'))),output=resolve('dist',`seed-recovery-test-${randomUUID()}`),entry=join(output,'index.cjs')
 const root=join(base,'原作者根'),target=join(base,'迁移后根'),bootstrap=join(base,'bootstrap'),validSeed=resolve('prisma/empty-database.json'),missingSeed=resolve('prisma',`missing-recovery-seed-${randomUUID()}.json`)
 const report:Record<string,unknown>={scope:'Real closed public Workspaces/template database, actual DataRootManager pointer-written crash, actual compiled service, same-journal negative and positive controls',startedAt:new Date().toISOString(),passed:false}
 let works:Workspaces|undefined,running:Awaited<ReturnType<typeof launch>>|undefined
 try{
  await build({bundle:true,platform:'node',target:'node24',format:'cjs',packages:'external',entryPoints:['desktop/service/index.ts'],outfile:entry,define:{'import.meta.url':'__desktopImportMetaUrl'},banner:{js:'var __desktopImportMetaUrl = require("node:url").pathToFileURL(__filename).href;'}})
  await mkdir(bootstrap);await mkdir(target);assert(await absent(missingSeed));assert((await readFile(validSeed)).length>0)
  works=new Workspaces(root,resolve('prisma/migrations'));await works.initialize()
  const library=new LocalTemplateLibrary(),original=await works.runWithGlobal('inbox',async()=>{await library.initialize();return library.createPrompt({key:'seed.recovery.public',name:'迁移恢复公开模板',content:'原公开中文正文必须保留 🙂 {{subject}}',enabled:true})})
  await works.close();works=undefined
  const manager=new DataRootManager(bootstrap,root,{hook(phase){if(phase==='pointer-written')throw new RootMigrationCrash('Public fixture interruption after durable pointer write')}})
  await manager.adopt(await directoryIdentity(root));const resolved=await manager.resolve();assert.equal(resolved.state,'existing');if(resolved.state!=='existing')throw Error('Real closed fixture pointer is absent')
  await assert.rejects(manager.migrate(await directoryIdentity(target),await closedHost(resolved.pointer)),RootMigrationCrash)
  const journalPath=join(bootstrap,'root-migration.json'),pointerPath=join(bootstrap,'data-root.json'),journalBefore=await readFile(journalPath),pointerBefore=await readFile(pointerPath),journal=JSON.parse(journalBefore.toString())
  assert.equal(journal.journal.phase,'verified','crash must occur after the new pointer but before committed/recovery cleanup')
  assert.equal(JSON.parse(pointerBefore.toString()).root.path,target);assert.equal(await absent(join(root,'shakeink-app.json')),false);assert.equal(await absent(join(target,'shakeink-app.json')),false)
  const before=await inventory(base);report.beforeBadSeed=before;report.migrationId=journal.journal.migrationId;report.journalBeforeSha256=sha(journalBefore);report.pointerBeforeSha256=sha(pointerBefore);report.workerEntrySha256=sha(await readFile(entry));report.validSeedManifestSha256=sha(await readFile(validSeed))
  running=await launch(entry,root,bootstrap,missingSeed)
  const failed=running.result();assert.deepEqual(failed,{version:1,status:'failed',code:'ROOT_STARTUP_FAILED'});await assert.rejects(running.rpc.call('ready'),/ENOENT|DATABASE_SEED/);await running.close();running=undefined
  const after=await inventory(base);report.afterBadSeed=after;report.badSeedResult=failed
  assert.deepEqual(after,before,'bad seed must leave bootstrap, journal, pointer, stage, source and target file hashes/bytes and every directory entry unchanged')
  assert.equal((await readFile(journalPath)).compare(journalBefore),0);assert.equal((await readFile(pointerPath)).compare(pointerBefore),0)
  assert.equal(JSON.parse((await readFile(journalPath)).toString()).journal.phase,'verified');assert.equal(await absent(join(root,'inbox/database/PG_VERSION')),false);assert.equal(await absent(join(target,'inbox/database/PG_VERSION')),false)
  report.badSeedLeftRecoverableStateUnchanged=true
  // The exact same recoverable journal is a positive control, proving the
  // negative case was valid work that would otherwise mutate/delete root data.
  running=await launch(entry,root,bootstrap,validSeed);assert.deepEqual(running.result(),{version:1,status:'ready',root:target});assert.equal(await running.rpc.call('ready'),true)
  const completed=JSON.parse(await readFile(journalPath,'utf8'));assert.equal(completed.journal.phase,'complete');assert.equal(completed.journal.migrationId,journal.journal.migrationId)
  const retained=(await prompts(running.rpc)).prompts.find(row=>row.key===original.key);assert(retained);assert.equal(retained.id,original.id);assert.equal(retained.content,original.content);assert.equal(retained.version,original.version)
  assert.equal(await absent(join(root,'shakeink-app.json')),true);assert.equal(await absent(join(root,'inbox/database')),true);assert.equal(JSON.parse(await readFile(pointerPath,'utf8')).root.path,target)
  await running.close();running=undefined;report.positiveControl={journalPhase:completed.journal.phase,migrationId:completed.journal.migrationId,root:target,retained,oldManagedRootRemoved:true};report.passed=true
  t.diagnostic(JSON.stringify({migrationId:journal.journal.migrationId,closedFiles:before.files.length,closedDirectories:before.directories.length,beforeInventorySha256:sha(JSON.stringify(before)),afterInventorySha256:sha(JSON.stringify(after)),failed,positivePhase:completed.journal.phase,retainedTemplateId:retained.id}))
 }catch(error){report.error=String(error instanceof Error?error.stack:error);throw error}
 finally{
  await running?.close();await works?.close();report.completedAt=new Date().toISOString()
  if(process.env.SHAKEINK_SEED_RECOVERY_REPORT)await writeFile(resolve(process.env.SHAKEINK_SEED_RECOVERY_REPORT),JSON.stringify(report,null,2))
  await rm(output,{recursive:true,force:true});await rm(base,{recursive:true,force:true})
 }
})
