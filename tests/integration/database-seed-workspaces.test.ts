import assert from 'node:assert/strict'
import test from 'node:test'
import {createHash} from 'node:crypto'
import {mkdtemp,mkdir,readFile,writeFile,appendFile,readdir,realpath,rm,stat,symlink} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {PGlite} from '@electric-sql/pglite'
import {Workspaces,type WorkRecord} from '../../desktop/service/workspaces'
import {loadMigrations,type Migration} from '../../desktop/service/database/migrations'
import {LocalTemplateLibrary} from '../../desktop/service/template-library'
import {LOCAL_AUTHOR_ID} from '../../desktop/service/context'
import {prisma} from '../../src/lib/db'
import {PROMPT_TEMPLATES} from '../../prisma/seed-templates'
import {WIZARD_TEMPLATES} from '../../src/lib/creation-wizard/templates'
import {createSeedArchive,recordSync} from '../fixtures/database-cache-phase'

const migrations=resolve('prisma/migrations'),seedPromise=createSeedArchive()
const withSeed=(root:string,seed:Blob)=>Reflect.construct(Workspaces,[root,migrations,seed]) as Workspaces
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex')
async function selection(path:string){const info=await stat(path,{bigint:true});return{path,device:String(info.dev),inode:String(info.ino)}}
async function createWork(works:Workspaces,path:string,key:string){await mkdir(path);return works.create(await selection(path),{title:`公开seed作品${key}`,requestId:`seed-${key}`})}
async function files(path:string):Promise<Record<string,string>>{
 const result:Record<string,string>={}
 for(const row of await readdir(path,{withFileTypes:true})){if(row.isDirectory())for(const[key,value]of Object.entries(await files(join(path,row.name))))result[`${row.name}/${key}`]=value;else if(row.isSymbolicLink())result[row.name]='symlink';else result[row.name]=sha(await readFile(join(path,row.name)))}
 return result
}
type Call={dataDir?:string;noInitDb:boolean;loadDataDir:boolean;seedMatches:boolean;startParams:unknown;relaxedDurability:unknown;thisMatches:boolean;argsCount:number;sync:ReturnType<typeof recordSync>;options:Record<string,unknown>}
function observe(seed:Blob){
 const original=PGlite.create,calls:Call[]=[]
 PGlite.create=(async function(this:typeof PGlite,...args:unknown[]){
  const options=args[0] as Record<string,unknown>,call:Call={dataDir:typeof options.dataDir==='string'?options.dataDir:undefined,noInitDb:options.noInitDb===true,loadDataDir:options.loadDataDir instanceof Blob,seedMatches:options.loadDataDir===seed,startParams:options.startParams,relaxedDurability:options.relaxedDurability,thisMatches:this===PGlite,argsCount:args.length,sync:[],options}
  calls.push(call)
  const engine=await Reflect.apply(original,this,args)
  // Count internal bootstrap engines too. They are not SQL-ready and must not
  // be queried. Normal engines and every original argument are unchanged.
  if(!call.noInitDb)call.sync=recordSync(engine)
  return engine
 }) as typeof PGlite.create
 return{calls,restore:()=>{PGlite.create=original}}
}
function assertOptions(calls:Call[],root:string){
 const direct=calls.filter(row=>row.dataDir?.startsWith(root));assert(direct.length>0)
 for(const call of direct){assert(call.thisMatches);assert.equal(call.argsCount,1);assert.equal(call.relaxedDurability,false);assert.deepEqual(call.startParams,[...PGlite.defaultStartParams,'-c','shared_buffers=32MB']);assert(!('initialMemory' in call.options));assert(!('maximum' in call.options));assert(call.sync.length>0);assert(call.sync.every(row=>row.relaxed===false&&row.completed&&!row.error))}
}
async function originalSchema(works:Workspaces,id:string){
 const expected=(await loadMigrations(migrations)).map(({id,checksum})=>({id,checksum})).sort((a,b)=>a.id.localeCompare(b.id))
 await works.run(id,async()=>{assert.deepEqual(await prisma.$queryRawUnsafe('SELECT id,checksum FROM "_desktop_migrations" ORDER BY id'),expected);assert.equal((await prisma.user.findMany()).length,1);assert.equal((await prisma.user.findMany())[0].id,LOCAL_AUTHOR_ID)})
}
async function content(works:Workspaces,work:WorkRecord,marker:string){
 return works.run(work.id,async()=>{
  assert.deepEqual((await prisma.novel.findMany()).map(row=>row.id),[work.novelId])
  const volume=await prisma.volume.create({data:{novelId:work.novelId,index:1,title:'公开卷',summary:marker}})
  const chapter=await prisma.chapter.create({data:{volumeId:volume.id,index:1,title:'公开章',outline:'原大纲',content:marker}})
  await prisma.$transaction(async tx=>{await tx.chapter.update({where:{id:chapter.id},data:{content:marker+' 提交'}})})
  let wrote=false
  await assert.rejects(prisma.$transaction(async tx=>{await tx.chapter.update({where:{id:chapter.id},data:{content:'禁止持久化的回滚正文'}});await tx.chapter.create({data:{volumeId:volume.id,index:2,title:'回滚章',outline:'回滚'}});wrote=true;throw Error('OPT-M07 actual write rollback')},{timeout:30000}),/OPT-M07 actual write rollback/)
  assert(wrote);assert.equal((await prisma.chapter.findUniqueOrThrow({where:{id:chapter.id}})).content,marker+' 提交');assert.equal(await prisma.chapter.count(),1)
  await assert.rejects(prisma.chapter.create({data:{volumeId:volume.id,index:1,title:'重复不得覆盖',outline:'重复'}}),/unique|duplicate/i)
  const saved=await prisma.chapter.findUniqueOrThrow({where:{id:chapter.id}});assert.equal(saved.content,marker+' 提交');return{volumeId:volume.id,chapterId:chapter.id,createdAt:saved.createdAt,marker:marker+' 提交'}
 })
}

test('OPT-M07: one vanilla Blob initializes inbox and two independent works in each of two roots without recursive noInitDb, while original schema, templates, identity and transactions remain live',{timeout:120000},async t=>{
 const seed=await seedPromise,base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-workspaces-'))),observed=observe(seed),ids:string[]=[],started=Date.now(),summaries:Record<string,unknown>[]=[]
 let works:Workspaces|undefined
 try{
  for(let index=0;index<2;index++){
   const root=join(base,`app-${index}`);works=withSeed(root,seed);await works.initialize()
   if(index===1)await mkdir(join(root,'inbox/database')) // Existing empty directory, in addition to the missing-directory path.
   await originalSchema(works,'inbox')
   const library=new LocalTemplateLibrary();await works.runWithGlobal('inbox',async()=>{await library.initialize();const before=await library.list();assert.equal(before.prompts.length,PROMPT_TEMPLATES.length);assert.equal(before.wizardTemplates.length,WIZARD_TEMPLATES.length);const item=await library.createPrompt({key:'seed.public',name:'公开模板',content:`root-${index} {{subject}}`,enabled:true});await assert.rejects(library.createPrompt({key:'seed.public',name:'重复',content:'禁止覆盖',enabled:true}),{code:'TEMPLATE_ID_CONFLICT'});assert.equal((await library.list()).prompts.find(row=>row.id===item.id)?.content,`root-${index} {{subject}}`)})
   const marker=JSON.parse(await readFile(join(root,'shakeink-app.json'),'utf8'));assert.match(marker.id,/^[0-9a-f-]{36}$/);ids.push(marker.id)
   const saved=[]
   for(let child=0;child<2;child++){
    const work=await createWork(works,join(base,`work-${index}-${child}`),`${index}-${child}`);assert.match(work.id,/^[0-9a-f-]{36}$/);ids.push(work.id,work.novelId);await originalSchema(works,work.id);const chapter=await content(works,work,`独立正文${index}-${child} 🙂`);ids.push(chapter.volumeId,chapter.chapterId);assert(chapter.createdAt.getTime()>=started&&chapter.createdAt.getTime()<=Date.now());assert(Date.parse(work.createdAt)>=started);saved.push({work,chapter});summaries.push({root,index,workId:work.id,novelId:work.novelId,...chapter})
   }
   await works.run('inbox',async()=>{assert.equal(await prisma.novel.count(),0);assert.equal(await prisma.chapter.count(),0)})
   await works.close();const reopenStart=observed.calls.length
   works=withSeed(root,seed);await works.initialize()
   for(const{work,chapter}of saved)await works.run(work.id,async()=>{assert.equal(await prisma.novel.count(),1);assert.equal(await prisma.chapter.count(),1);assert.equal((await prisma.chapter.findUniqueOrThrow({where:{id:chapter.chapterId}})).content,chapter.marker)})
   await works.runWithGlobal('inbox',async()=>{assert.equal((await library.list()).prompts.find(row=>row.key==='seed.public')?.content,`root-${index} {{subject}}`)})
   await works.close();assert(observed.calls.slice(reopenStart).every(row=>!row.loadDataDir&&!row.noInitDb))
  }
  assert.equal(new Set(ids).size,ids.length,'application, work, novel and content identities must remain independent')
  assertOptions(observed.calls,base)
  t.diagnostic(JSON.stringify({summaries,calls:observed.calls.map(({options,sync,...row})=>({...row,syncCalls:sync.length}))}))
  const loaded=observed.calls.filter(row=>row.loadDataDir);assert.equal(loaded.length,6,'new inbox + two works in each root must use the supplied Blob');assert(loaded.every(row=>row.seedMatches))
  assert.equal(observed.calls.filter(row=>row.noInitDb).length,0,'seed initialization must eliminate internal noInitDb engine creation; the recorder counts it rather than suppressing it')
 }finally{observed.restore();await works?.close();await rm(base,{recursive:true,force:true})}
})

test('OPT-M07: existing vanilla databases retain contents, migration records and commented 128MB configuration instead of loading the supplied seed',{timeout:90000},async()=>{
 const seed=await seedPromise,base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-existing-'))),root=join(base,'app');let works=new Workspaces(root,migrations),observed:ReturnType<typeof observe>|undefined
 try{
  await works.initialize();await originalSchema(works,'inbox');const work=await createWork(works,join(base,'work'),'existing'),chapter=await content(works,work,'既存不可覆盖正文');await works.close()
  const configs=[join(root,'inbox/database/postgresql.conf'),join(work.path,'database/postgresql.conf')],hashes:Record<string,string>={}
  for(const path of configs){await appendFile(path,"\n# Existing public fixture must be byte-identical\nshared_buffers = '128MB'\nwork_mem = '4MB' # unrelated\n");hashes[path]=sha(await readFile(path))}
  observed=observe(seed);works=withSeed(root,seed);await works.initialize();await originalSchema(works,'inbox');await originalSchema(works,work.id)
  await works.run(work.id,async()=>{assert.equal((await prisma.chapter.findUniqueOrThrow({where:{id:chapter.chapterId}})).content,chapter.marker);assert.equal(await prisma.chapter.count(),1)})
  await works.close();assert(observed.calls.length>=2);assert(observed.calls.every(row=>!row.loadDataDir&&!row.noInitDb));assertOptions(observed.calls,base)
  for(const path of configs)assert.equal(sha(await readFile(path)),hashes[path])
 }finally{observed?.restore();await works.close();await rm(base,{recursive:true,force:true})}
})

test('OPT-M07: create=true resumes a nonempty PG_VERSION database without import, and imports only an explicitly empty partial database; migration failures retain evidence',{timeout:90000},async()=>{
 const seed=await seedPromise,base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-creating-')));let works:Workspaces|undefined;const observed=observe(seed)
 try{
  for(const empty of[false,true]){
   const label=empty?'empty':'nonempty',root=join(base,label),path=join(base,`work-${label}`);works=withSeed(root,seed);await works.initialize();await originalSchema(works,'inbox')
   const brokenSql='CREATE TABLE seed_partial_must_rollback(id integer); INVALID SQL',broken:Migration={id:'seed-broken',sql:brokenSql,checksum:sha(brokenSql)}
   ;(works as unknown as{migrations:Migration[]}).migrations=[broken]
   await assert.rejects(createWork(works,path,label),/syntax error/);await works.close();const manifest=JSON.parse(await readFile(join(path,'shakeink-work.json'),'utf8'));assert.equal(manifest.phase,'creating');assert((await readFile(join(path,'database/PG_VERSION'),'utf8')).trim())
   await writeFile(join(path,'failure-evidence.txt'),'公开失败证据，不自动擦除')
   if(empty){await rm(join(path,'database'),{recursive:true});await mkdir(join(path,'database'))}
   const start=observed.calls.length;works=withSeed(root,seed);await works.initialize();const work=await works.create(await selection(path),{title:`公开seed作品${label}`,requestId:`seed-${label}`});await originalSchema(works,work.id)
   await works.run(work.id,async()=>{assert.deepEqual(await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE tablename='seed_partial_must_rollback'"),[])})
   await works.close();assert.equal(await readFile(join(path,'failure-evidence.txt'),'utf8'),'公开失败证据，不自动擦除');const retried=observed.calls.slice(start).filter(row=>row.dataDir===join(path,'database'));assert(retried.length>0);assert.equal(retried.filter(row=>row.loadDataDir).length,empty?1:0);assert(observed.calls.slice(start).every(row=>!row.noInitDb))
  }
 }finally{observed.restore();await works?.close();await rm(base,{recursive:true,force:true})}
})

test('OPT-M07: missing PG_VERSION, unknown nonempty inbox, and linked database paths are rejected without importing or changing original bytes',{timeout:90000},async()=>{
 const seed=await seedPromise,base=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-damaged-')));let works:Workspaces|undefined,observed:ReturnType<typeof observe>|undefined
 try{
  for(const kind of['damaged-work','damaged-ready-inbox','unknown-inbox','linked-inbox']){
   const root=join(base,kind),path=join(base,`work-${kind}`);works=new Workspaces(root,migrations);await works.initialize();let id='inbox'
   if(kind.startsWith('damaged')){await works.run('inbox',()=>prisma.user.count());if(kind==='damaged-work'){const work=await createWork(works,path,kind);id=work.id}await works.close();await rm(join(kind==='damaged-work'?path:join(root,'inbox'),'database/PG_VERSION'))}
   else if(kind==='unknown-inbox'){await mkdir(join(root,'inbox/database'));await writeFile(join(root,'inbox/database/unknown.bin'),'existing public data must survive')}
   else{const target=join(base,'link-target');await mkdir(target);await writeFile(join(target,'original.txt'),'outside target remains unchanged');await symlink(target,join(root,'inbox/database'),'dir')}
   await works.close();const beforeRoot=await files(root),beforeWork=kind==='damaged-work'?await files(path):undefined,linkBefore=kind==='linked-inbox'?await files(join(base,'link-target')):undefined
   observed=observe(seed);works=withSeed(root,seed);await works.initialize();await assert.rejects(works.run(id,()=>prisma.user.count()),/数据库缺失|路径无效|不能自动重建/);await works.close();assert.equal(observed.calls.length,0,'a damaged/nonempty database must be rejected before any seed import or engine creation');assert.deepEqual(await files(root),beforeRoot);if(beforeWork)assert.deepEqual(await files(path),beforeWork);if(linkBefore)assert.deepEqual(await files(join(base,'link-target')),linkBefore);observed.restore();observed=undefined
  }
 }finally{observed?.restore();await works?.close();await rm(base,{recursive:true,force:true})}
})
