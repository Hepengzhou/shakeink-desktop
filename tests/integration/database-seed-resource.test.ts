import assert from "node:assert/strict"
import {test} from "node:test"
import {mkdtemp,rm,readFile,writeFile,symlink,mkdir,readdir,realpath,copyFile,cp} from "node:fs/promises"
import {join} from "node:path"
import {tmpdir} from "node:os"
import {randomUUID,createHash} from "node:crypto"
import {Worker} from "node:worker_threads"
import {build} from "esbuild"
import {PGlite} from "@electric-sql/pglite"
import {createRootStartupBuffer,readRootStartup} from "../../desktop/shared/root-startup"

const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')

test('M06 real vanilla seed round-trips with matching runtime and rejects damaged or foreign resources',async t=>{
 const {generateDatabaseSeed}=await import('../../scripts/database-seed.mjs')
 const {loadDatabaseSeed:readSeed}=await import('../../desktop/service/database/seed')
 const loadDatabaseSeed=(path:string)=>readSeed(path,join(process.cwd(),'node_modules/@electric-sql/pglite'))
 const directory=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-resources-')))
 try{
  await generateDatabaseSeed(process.cwd(),directory)
  const path=join(directory,'empty-database.json'),archive=join(directory,'empty-database.tar.gz')
  const original=await readFile(path),originalArchive=await readFile(archive),manifest=JSON.parse(original.toString())
  assert.equal(manifest.archive.bytes,originalArchive.length);assert.equal(manifest.archive.sha256,sha(originalArchive))
  assert(manifest.inputs.some((input:{path:string})=>input.path==='dist/pglite.wasm'))
  const blob=await loadDatabaseSeed(path),db=await PGlite.create({loadDataDir:blob,relaxedDurability:false})
  try{
   assert.deepEqual((await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows,[])
   assert.deepEqual((await db.query("SELECT nspname FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema' ORDER BY nspname")).rows,[{nspname:'public'}])
   await db.query('SELECT $1::text AS body',['公开中文空库验证'])
  }finally{await db.close()}
  const mutations:[string,(value:typeof manifest)=>void,RegExp][]=[
   ['extra field',v=>{v.unexpected='forbidden'},/unrecognized_keys/],['version',v=>{v.pgliteVersion='0.0.0'},/DATABASE_SEED_RUNTIME_MISMATCH/],
   ['archive path',v=>{v.archive.path='../escape.tar.gz'},/invalid_value/],['archive bytes',v=>{v.archive.bytes=-1},/too_small/],
   ['archive zero bytes',v=>{v.archive.bytes=0},/too_small/],['archive noninteger bytes',v=>{v.archive.bytes=1.5},/invalid_type/],
   ['archive nonfinite bytes',v=>{v.archive.bytes=Infinity},/invalid_type/],['archive oversized bytes',v=>{v.archive.bytes=16*1024*1024+1},/too_big/],
   ['archive malformed hash',v=>{v.archive.sha256='invalid'},/invalid_format/],['input malformed hash',v=>{v.inputs[0].sha256='invalid'},/invalid_format/],
   ['archive extra field',v=>{v.archive.extra=true},/unrecognized_keys/],['input extra field',v=>{v.inputs[0].extra=true},/unrecognized_keys/],
   ['foreign input path',v=>{v.inputs[0].path='../private'},/DATABASE_SEED_RUNTIME_MISMATCH/],
   ['archive hash',v=>{v.archive.sha256='0'.repeat(64)},/DATABASE_SEED_ARCHIVE_MISMATCH/],['input hash',v=>{v.inputs[0].sha256='0'.repeat(64)},/DATABASE_SEED_RUNTIME_MISMATCH/],
   ['missing input',v=>{v.inputs.pop()},/DATABASE_SEED_RUNTIME_MISMATCH/],['duplicate input',v=>{v.inputs.push(v.inputs[0])},/DATABASE_SEED_RUNTIME_MISMATCH/],
  ]
  for(const [name,mutate,reason]of mutations)await t.test(name,async()=>{
   const changed=structuredClone(manifest);mutate(changed);await writeFile(path,JSON.stringify(changed));await assert.rejects(loadDatabaseSeed(path),reason);await writeFile(path,original)
  })
  await t.test('damaged archive',async()=>{const corrupt=Buffer.from(originalArchive);corrupt[0]^=1;await writeFile(archive,corrupt);await assert.rejects(loadDatabaseSeed(path),/DATABASE_SEED_ARCHIVE_MISMATCH/);await writeFile(archive,originalArchive)})
  await t.test('symlink manifest',async()=>{const link=join(directory,'linked.json');await symlink(path,link);await assert.rejects(loadDatabaseSeed(link),/DATABASE_SEED_UNSAFE/)})
  await t.test('symlink ancestor',async()=>{const link=directory+'-link';await symlink(directory,link);try{await assert.rejects(loadDatabaseSeed(join(link,'empty-database.json')),/DATABASE_SEED_UNSAFE/)}finally{await rm(link)}})
  await t.test('oversized manifest',async()=>{await writeFile(path,' '.repeat(128*1024+1));await assert.rejects(loadDatabaseSeed(path),/DATABASE_SEED_UNSAFE/);await writeFile(path,original)})
  await t.test('symlink archive',async()=>{await rm(archive);await symlink(path,archive);await assert.rejects(loadDatabaseSeed(path),/DATABASE_SEED_UNSAFE/);await rm(archive);await writeFile(archive,originalArchive)})
  await t.test('missing archive',async()=>{await rm(archive);await assert.rejects(loadDatabaseSeed(path),{code:'ENOENT'});await writeFile(archive,originalArchive)})
  await t.test('app without its own runtime rejects a matching parent-project dependency',async()=>{
   const prisma=join(directory,'empty-app','prisma');await mkdir(prisma,{recursive:true})
   await copyFile(path,join(prisma,'empty-database.json'));await copyFile(archive,join(prisma,'empty-database.tar.gz'))
   await assert.rejects(readSeed(join(prisma,'empty-database.json')))
  })
  await t.test('builder removes only scripts/keywords; changed runtime metadata remains rejected',async()=>{
   const {readDatabaseSeed}=await import('../../desktop/shared/database-seed')
   const runtime=join(directory,'packaged-pglite');await cp(join(process.cwd(),'node_modules/@electric-sql/pglite'),runtime,{recursive:true})
   const metadataPath=join(runtime,'package.json'),metadata=JSON.parse(await readFile(metadataPath,'utf8'))
   delete metadata.scripts;delete metadata.keywords;await writeFile(metadataPath,JSON.stringify(metadata,null,2))
   assert((await readDatabaseSeed(path,runtime)) instanceof Blob)
   metadata.main='./dist/foreign.cjs';await writeFile(metadataPath,JSON.stringify(metadata,null,2))
   await assert.rejects(readDatabaseSeed(path,runtime),/DATABASE_SEED_RUNTIME_MISMATCH/)
  })
 }finally{await rm(directory,{recursive:true,force:true})}
})

test('M06 bad or absent required seed fails before bootstrap recovery or app-root writes',async()=>{
 const output=join(process.cwd(),'dist','seed-startup-test-'+randomUUID())
 const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-seed-startup-')))
 try{
  await build({bundle:true,platform:'node',target:'node24',format:'cjs',packages:'external',entryPoints:['desktop/service/index.ts'],outfile:join(output,'index.cjs'),define:{'import.meta.url':'__desktopImportMetaUrl'},banner:{js:'var __desktopImportMetaUrl = require("node:url").pathToFileURL(__filename).href;'}})
  for(const supplied of [false,true]){
   const base=join(temporary,String(supplied));await mkdir(base)
   const bootstrap=join(base,'bootstrap'),root=join(base,'app');await mkdir(bootstrap)
   const startup=createRootStartupBuffer(),worker=new Worker(join(output,'index.cjs'),{workerData:{root,bootstrap,migrations:join(process.cwd(),'prisma/migrations'),startup,...(supplied?{databaseSeed:join(base,'missing-seed.json')}:{})}})
   worker.on('error',()=>{})
   try{
    const header=new Int32Array(startup,0,4);assert.notEqual(Atomics.wait(header,0,0,25000),'timed-out')
    assert.equal(readRootStartup(startup)?.status,'failed')
    assert.deepEqual(await readdir(bootstrap),[])
    await assert.rejects(readFile(join(root,'shakeink-app.json')),{code:'ENOENT'})
   }finally{await worker.terminate()}
  }
 }finally{await rm(output,{recursive:true,force:true});await rm(temporary,{recursive:true,force:true})}
})
