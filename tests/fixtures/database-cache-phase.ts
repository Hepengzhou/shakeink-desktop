import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {appendFile, mkdir, readFile, writeFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {performance} from 'node:perf_hooks'
import {PGlite} from '@electric-sql/pglite'
import {PrismaClient} from '../../src/generated/prisma/client'
import {LocalPGliteAdapter} from '../../desktop/service/database/pglite-adapter'
import {Workspaces} from '../../desktop/service/workspaces'
import {DirectoryAuthority} from '../../desktop/main/directory-authority'
import {prisma} from '../../src/lib/db'

// Public, deterministic data. 1027 deliberately leaves a tail in 17-row reads.
export const CACHE_ROWS=1027
export const CACHE_PAYLOAD_BYTES=65536
export const CACHE_SEED=0x6d2b79f5
const table='optimization_cache_payload'
type RawDatabase=Pick<PrismaClient,'$queryRawUnsafe'|'$executeRawUnsafe'>
type DataRow={id:number;payload:string}
export function payload(id:number){
 const block=createHash('sha256').update(`shakeink-public-cache-v1:${id}`).digest('hex')
 const suffix=id===CACHE_ROWS-1?'\n中文尾批🙂\t"quotes" \\ slash\r\n':'\n'
 return block.repeat(Math.ceil(CACHE_PAYLOAD_BYTES/block.length)).slice(0,CACHE_PAYLOAD_BYTES)+suffix
}
export function digestRows(rows:Iterable<DataRow>){const hash=createHash('sha256');for(const row of rows){const bytes=Buffer.from(row.payload);hash.update(`${row.id}:${bytes.length}:`);hash.update(bytes)}return hash.digest('hex')}
export function expectedChecksum(){return digestRows(Array.from({length:CACHE_ROWS},(_,id)=>({id,payload:payload(id)})))}
export async function createSeedArchive(){
 const engine=await PGlite.create({dataDir:'memory://',relaxedDurability:false})
 try{
  assert.deepEqual((await engine.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname,tablename")).rows,[])
  return await engine.dumpDataDir('gzip')
 }finally{await engine.close()}
}
export function fixedIds(count=64){let state=CACHE_SEED;return Array.from({length:count},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%CACHE_ROWS})}
export const median=(values:number[])=>{const ordered=[...values].sort((a,b)=>a-b);const middle=Math.floor(ordered.length/2);return ordered.length%2?ordered[middle]:(ordered[middle-1]+ordered[middle])/2}
export async function createData(db:RawDatabase){
 await db.$executeRawUnsafe(`CREATE TABLE ${table}(id integer PRIMARY KEY,payload text NOT NULL)`)
 await db.$executeRawUnsafe(`ALTER TABLE ${table} ALTER COLUMN payload SET STORAGE EXTERNAL`)
 const started=performance.now()
 for(let start=0;start<CACHE_ROWS;start+=8){const ids=Array.from({length:Math.min(8,CACHE_ROWS-start)},(_,offset)=>start+offset);const values=ids.flatMap(id=>[id,payload(id)]);await db.$executeRawUnsafe(`INSERT INTO ${table}(id,payload) VALUES ${ids.map((_,i)=>`($${i*2+1},$${i*2+2})`).join(',')}`,...values)}
 return performance.now()-started
}
export async function scanData(db:RawDatabase){
 const hash=createHash('sha256');let rows=0,bytes=0;const started=performance.now()
 assert.equal((await db.$queryRawUnsafe<{count:bigint}[]>(`SELECT count(*)::bigint AS count FROM ${table}`))[0].count,BigInt(CACHE_ROWS),'the full dataset must not contain skipped extra rows')
 for(let start=0;start<CACHE_ROWS;start+=17){const batch=await db.$queryRawUnsafe<DataRow[]>(`SELECT id,payload FROM ${table} WHERE id >= $1 AND id < $2 ORDER BY id`,start,Math.min(start+17,CACHE_ROWS));assert.equal(batch.length,Math.min(17,CACHE_ROWS-start));for(const row of batch){assert.equal(row.id,rows);assert.equal(row.payload,payload(row.id));const content=Buffer.from(row.payload);bytes+=content.length;hash.update(`${row.id}:${content.length}:`);hash.update(content);rows++}}
 const checksum=hash.digest('hex');assert.equal(checksum,expectedChecksum());return{milliseconds:performance.now()-started,rows,bytes,checksum}
}
export async function dataShape(db:RawDatabase){
 const [shape]=await db.$queryRawUnsafe<{storage:string;payloadBytes:bigint;tableBytes:bigint;toastBytes:bigint;indexBytes:bigint;totalBytes:bigint}[]>(`SELECT a.attstorage::text AS storage,(SELECT sum(octet_length(payload)) FROM ${table})::bigint AS "payloadBytes",pg_table_size(c.oid)::bigint AS "tableBytes",pg_total_relation_size(c.reltoastrelid)::bigint AS "toastBytes",pg_indexes_size(c.oid)::bigint AS "indexBytes",pg_total_relation_size(c.oid)::bigint AS "totalBytes" FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid WHERE c.relname='${table}' AND a.attname='payload'`)
 assert.equal(shape.storage,'e');assert(Number(shape.payloadBytes)>=64*1024*1024);assert(Number(shape.tableBytes)>=64*1024*1024);assert(Number(shape.toastBytes)>32*1024*1024)
 return Object.fromEntries(Object.entries(shape).map(([key,value])=>[key,typeof value==='bigint'?Number(value):value]))
}
export async function fixedPointReads(db:RawDatabase){for(const id of fixedIds()){const rows=await db.$queryRawUnsafe<DataRow[]>(`SELECT id,payload FROM ${table} WHERE id=$1`,id);assert.deepEqual(rows,[{id,payload:payload(id)}])}return fixedIds()}
export async function transactions(db:PrismaClient){
 const id=CACHE_ROWS+100
 await db.$transaction(async tx=>{await tx.$executeRawUnsafe(`INSERT INTO ${table} VALUES($1,$2)`,id,'committed 中文');assert.deepEqual(await tx.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=$1`,id),[{payload:'committed 中文'}])},{timeout:30000})
 assert.deepEqual(await db.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=$1`,id),[{payload:'committed 中文'}])
 let wrote=false
 await assert.rejects(db.$transaction(async tx=>{await tx.$executeRawUnsafe(`UPDATE ${table} SET payload=$1 WHERE id=0`,'rollback must not survive');await tx.$executeRawUnsafe(`INSERT INTO ${table} VALUES($1,$2)`,id+1,'rolled back insertion');wrote=true;throw Error('OPT-M02 intentional failure after actual writes')},{timeout:30000}),/OPT-M02 intentional failure/)
 assert(wrote);assert.deepEqual(await db.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=0`),[{payload:payload(0)}]);assert.deepEqual(await db.$queryRawUnsafe(`SELECT id FROM ${table} WHERE id=$1`,id+1),[])
 await assert.rejects(db.$executeRawUnsafe(`INSERT INTO ${table} VALUES($1,$2)`,0,'duplicate must be rejected'),/unique|duplicate/i)
 assert.deepEqual(await db.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=0`),[{payload:payload(0)}])
 await db.$executeRawUnsafe(`DELETE FROM ${table} WHERE id=$1`,id)
 assert.equal((await db.$queryRawUnsafe<{count:bigint}[]>(`SELECT count(*)::bigint AS count FROM ${table}`))[0].count,BigInt(CACHE_ROWS))
}
export async function settings(engine:PGlite){
 const names=['server_version','shared_buffers','wal_buffers','transaction_buffers','subtransaction_buffers','fsync','full_page_writes','synchronous_commit']
 const rows=(await engine.query<{name:string;setting:string;unit:string|null;source:string}>('SELECT name,setting,unit,source FROM pg_settings WHERE name=ANY($1::text[]) ORDER BY name',[names])).rows
 return{rows,missing:names.filter(name=>!rows.some(row=>row.name===name)),sharedBuffers:(await engine.query<{shared_buffers:string}>('SHOW shared_buffers')).rows[0].shared_buffers,wasmBytes:wasmBytes(engine)}
}
export function wasmBytes(engine:PGlite){const module=(engine as unknown as{mod:{HEAPU8?:Uint8Array;HEAP8?:Int8Array}}).mod;const heap=module.HEAPU8??module.HEAP8;assert(heap?.buffer.byteLength);return heap.buffer.byteLength}
export function recordSync(engine:PGlite){
 const fs=engine.fs!;assert(fs);const original=fs.syncToFs.bind(fs);const calls:{relaxed:boolean|undefined;completed:boolean;milliseconds:number;error?:string}[]=[]
 fs.syncToFs=async relaxed=>{const call={relaxed,completed:false,milliseconds:0} as typeof calls[number];calls.push(call);const start=performance.now();try{await original(relaxed);call.completed=true}catch(error){call.error=String(error);throw error}finally{call.milliseconds=performance.now()-start}}
 return calls
}
async function engineFor(works:Workspaces,id:string){const slots=(works as unknown as{slots:Map<string,{connection:Promise<{engine:PGlite}>}>}).slots;return(await slots.get(id)!.connection).engine}
const hashFile=async(path:string)=>createHash('sha256').update(await readFile(path)).digest('hex')
type State={workId:string;secondId:string;workPath:string;secondPath:string;checksum:string;configHashes:Record<string,string>}
async function assertMarker(db:RawDatabase,marker:string){assert.deepEqual(await db.$queryRawUnsafe('SELECT value FROM optimization_cache_scope'),[{value:marker}]);assert.deepEqual(await db.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`),[])}
async function dataPhase(root:string,phase:string,seedArchive?:string){
 const app=join(root,'app'),statePath=join(root,'cache-state.json'),configs=[join(app,'inbox/database/postgresql.conf'),join(root,'work/database/postgresql.conf'),join(root,'second/database/postgresql.conf')]
 let state:State
 if(phase==='fallback'){
  state=JSON.parse(await readFile(statePath,'utf8'));const reports:Record<string,unknown>[]=[]
  for(const [index,path]of configs.entries()){const engine=await PGlite.create({dataDir:resolve(path,'..'),relaxedDurability:false});const db=new PrismaClient({adapter:new LocalPGliteAdapter(engine)});try{const configuration=await settings(engine);assert.equal(configuration.sharedBuffers,'128MB');if(index===1){const scan=await scanData(db);assert.equal(scan.checksum,state.checksum);await fixedPointReads(db);reports.push({path,configuration,scan,shape:await dataShape(db)})}else{await assertMarker(db,index===0?'inbox only':'second work only');reports.push({path,configuration})}}finally{await db.$disconnect();await engine.close()}}
  for(const path of configs)assert.equal(await hashFile(path),state.configHashes[path]);return{phase,pid:process.pid,passed:true,reports,configHashes:state.configHashes}
 }
 const seed=seedArchive?new Blob([Uint8Array.from(await readFile(seedArchive))]):undefined
 const originalCreate=PGlite.create,seedCalls:{noInitDb:boolean;loadDataDir:boolean;dataDir:unknown}[]=[]
 if(seed)PGlite.create=(async function(this:typeof PGlite,...args:unknown[]){const options=args[0] as Record<string,unknown>;seedCalls.push({noInitDb:options.noInitDb===true,loadDataDir:options.loadDataDir===seed,dataDir:options.dataDir});return Reflect.apply(originalCreate,this,args)}) as typeof PGlite.create
 const works=Reflect.construct(Workspaces,[app,resolve('prisma/migrations'),seed]) as Workspaces;const reports:Record<string,unknown>[]=[];let writeMs:number|undefined
 try{
  await works.initialize()
  if(phase==='seed'){
   const grants=new DirectoryAuthority();await mkdir(join(root,'work'));await mkdir(join(root,'second'))
   const create=async(name:string)=>{const grant=await grants.issue(join(root,name),'create-work','cache-probe');return works.create(await grants.consume(grant.id,'create-work','cache-probe'),{title:`公开缓存测试${name}`,requestId:`cache-${name}`})}
   const work=await create('work'),second=await create('second');state={workId:work.id,secondId:second.id,workPath:work.path,secondPath:second.path,checksum:expectedChecksum(),configHashes:{}}
   for(const[id,marker]of[['inbox','inbox only'],[second.id,'second work only']])await works.run(id,async()=>{await prisma.$executeRawUnsafe('CREATE TABLE optimization_cache_scope(value text PRIMARY KEY)');await prisma.$executeRawUnsafe('INSERT INTO optimization_cache_scope VALUES($1)',marker)})
   await works.run(work.id,async()=>{writeMs=await createData(prisma);await transactions(prisma)})
  }else state=JSON.parse(await readFile(statePath,'utf8'))
  for(const[id,marker]of[['inbox','inbox only'],[state!.workId,'large data'],[state!.secondId,'second work only']]){
   await works.run(id,async()=>{const engine=await engineFor(works,id),configuration=await settings(engine);if(id===state!.workId){const scan=await scanData(prisma);assert.equal(scan.checksum,state!.checksum);await fixedPointReads(prisma);reports.push({id,configuration,scan,shape:await dataShape(prisma)})}else{await assertMarker(prisma,marker);reports.push({id,configuration})}})
  }
 }finally{try{await works.close()}finally{if(seed)PGlite.create=originalCreate}}
 if(seed){assert.equal(seedCalls.filter(row=>row.noInitDb).length,0,'seed-backed process must not recursively create noInitDb engines');assert.equal(seedCalls.filter(row=>row.loadDataDir).length,phase==='seed'?3:0,'only new inbox and two work databases import the supplied seed')}
 if(phase==='seed'){
  for(const path of configs){await appendFile(path,"\n# Public optimization fixture: preserve these original bytes.\nshared_buffers = '128MB' # original default for rollback\nlog_min_messages = warning # unrelated setting\n");state!.configHashes[path]=await hashFile(path)}
  await writeFile(statePath,JSON.stringify(state!,null,2))
 }else for(const path of configs)assert.equal(await hashFile(path),state!.configHashes[path])
 return{phase,pid:process.pid,passed:true,reports,writeMs,configHashes:state!.configHashes,checksum:state!.checksum,...(seed?{seedCalls}: {})}
}
export async function mixedBatch(db:PrismaClient){
 const ids=fixedIds(),operations:{index:number;id:number;kind:string;milliseconds:number}[]=[];const started=performance.now()
 for(const[index,id]of ids.entries()){
  const operationStart=performance.now();const kind=index%4===0?'point-read':index%4===1?'commit-update':index%4===2?'write-then-rollback':'point-read'
  if(kind==='point-read'){assert.deepEqual(await db.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=$1`,id),[{payload:payload(id)}])}
  else if(kind==='commit-update'){await db.$transaction(async tx=>{await tx.$executeRawUnsafe(`UPDATE ${table} SET payload=$1 WHERE id=$2`,payload(id),id)},{timeout:30000})}
  else{let wrote=false;await assert.rejects(db.$transaction(async tx=>{await tx.$executeRawUnsafe(`UPDATE ${table} SET payload=$1 WHERE id=$2`,'this changed payload must roll back',id);wrote=true;throw Error('OPT-M03 intentional rollback')},{timeout:30000}),/OPT-M03 intentional rollback/);assert(wrote);assert.deepEqual(await db.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=$1`,id),[{payload:payload(id)}])}
  operations.push({index,id,kind,milliseconds:performance.now()-operationStart})
 }
 return{milliseconds:performance.now()-started,operations,components:Object.fromEntries(['point-read','commit-update','write-then-rollback'].map(kind=>[kind,{count:operations.filter(row=>row.kind===kind).length,milliseconds:operations.filter(row=>row.kind===kind).reduce((sum,row)=>sum+row.milliseconds,0)}]))}
}
async function performancePhase(root:string,cacheMB:number){
 assert([32,128].includes(cacheMB));const defaults=[...PGlite.defaultStartParams],options={dataDir:root,relaxedDurability:false,startParams:[...defaults,'-c',`shared_buffers=${cacheMB}MB`]};const openStart=performance.now(),engine=await PGlite.create(options),openMs=performance.now()-openStart;const syncCalls=recordSync(engine),db=new PrismaClient({adapter:new LocalPGliteAdapter(engine)})
 try{
  assert.deepEqual(PGlite.defaultStartParams,defaults);const configuration=await settings(engine);assert.equal(configuration.sharedBuffers,`${cacheMB}MB`)
  const coldStart=performance.now();assert.deepEqual(await db.$queryRawUnsafe(`SELECT payload FROM ${table} WHERE id=$1`,fixedIds(1)[0]),[{payload:payload(fixedIds(1)[0])}]);const coldPointReadMs=performance.now()-coldStart,coldScan=await scanData(db)
  const warmupStart=performance.now();await fixedPointReads(db);const warmupScan=await scanData(db),warmupMs=performance.now()-warmupStart
  const scans=[];for(let i=0;i<3;i++)scans.push(await scanData(db));const mixed=await mixedBatch(db),finalScan=await scanData(db)
  await engine.syncToFs();assert(syncCalls.length>0);assert(syncCalls.every(call=>call.relaxed===false&&call.completed&&!call.error));assert.deepEqual(PGlite.defaultStartParams,defaults)
  return{pid:process.pid,cacheMB,node:process.version,pglite:'0.5.8',options,openMs,configuration,wasmBytesAfter:wasmBytes(engine),coldPointReadMs,coldScan,warmup:{pointReadIds:fixedIds(),scan:warmupScan,milliseconds:warmupMs},scans,scanMedianMs:median(scans.map(row=>row.milliseconds)),mixed,finalScan,shape:await dataShape(db),syncCalls}
 }finally{await db.$disconnect();await engine.close()}
}
async function main(){const[phase,root,arg]=process.argv.slice(2);const result=phase==='benchmark'?await performancePhase(root,Number(arg)):await dataPhase(root,phase,arg);console.log(JSON.stringify(result))}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))void main().catch(error=>{console.error(error);process.exitCode=1})
