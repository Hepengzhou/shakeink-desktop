import assert from 'node:assert/strict'
import test from 'node:test'
import {mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {Workspaces} from '../../desktop/service/workspaces'
import {prisma} from '../../src/lib/db'
import {LOCAL_AUTHOR_ID} from '../../desktop/service/context'

type ObservedEngine = {query<T>(sql:string):Promise<{rows:T[]}>; fs:{syncToFs(relaxed?:boolean):Promise<void>}; mod:{HEAPU8:Uint8Array}}
async function engineFor(works:Workspaces,id:string) {
  return (await (works as unknown as {slots:Map<string,{connection:Promise<{engine:ObservedEngine}>}>}).slots.get(id)!.connection).engine
}
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
const migrations=join(process.cwd(),'prisma/migrations')

test('OPT-M01: actual inbox/work engines use the reviewed cache without changing defaults or existing configuration', {timeout:90000},async t=>{
  const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-cache-options-')))
  let works=new Workspaces(join(temporary,'root'),migrations)
  const defaults=[...PGlite.defaultStartParams],original=PGlite.create,calls:Record<string,unknown>[]=[]
  PGlite.create=(async (...args:unknown[])=>{
    const options=args[0] as Record<string,unknown>
    calls.push({...options,startParams:Array.isArray(options.startParams)?[...options.startParams]:options.startParams})
    return Reflect.apply(original,PGlite,args)
  }) as typeof PGlite.create
  try {
    await works.initialize();await works.run('inbox',()=>prisma.user.count())
    const inbox=await engineFor(works,'inbox')
    const settings=await inbox.query<{name:string;setting:string;unit:string|null;source:string}>("SELECT name,setting,unit,source FROM pg_settings WHERE name IN ('server_version','shared_buffers','wal_buffers','transaction_buffers','subtransaction_buffers','max_worker_processes','fsync') ORDER BY name")
    t.diagnostic(JSON.stringify({settings:settings.rows,wasmBytes:inbox.mod.HEAPU8.byteLength}))
    assert.equal(settings.rows.find(x=>x.name==='shared_buffers')?.setting,'4096','32MiB cache must be active on the real engine (8KiB blocks)')
    const directory=join(temporary,'work');await mkdir(directory);const identity=await stat(directory,{bigint:true})
    const work=await works.create({path:directory,device:String(identity.dev),inode:String(identity.ino)},{title:'缓存隔离测试',requestId:'cache-options-work'})
    await works.run(work.id,()=>prisma.novel.count())
    const engine=await engineFor(works,work.id)
    assert.equal((await engine.query<{shared_buffers:string}>('SHOW shared_buffers')).rows[0].shared_buffers,'32MB')
    assert.deepEqual(PGlite.defaultStartParams,defaults)
    assert(calls.length>=2)
    for(const options of calls){
      assert.deepEqual(options.startParams,[...defaults,'-c','shared_buffers=32MB'])
      assert.equal(options.relaxedDurability,false)
      assert(!('initialMemory' in options));assert(!('maximum' in options))
    }
    await works.close()
    const configuration=join(directory,'database/postgresql.conf')
    const old=await readFile(configuration,'utf8')
    assert.match(old,/^shared_buffers\s*=\s*128MB/m)
    await writeFile(configuration,old+'\n# Public existing configuration must remain untouched\nwork_mem = 4MB\n')
    const before=sha(await readFile(configuration))
    works=new Workspaces(join(temporary,'root'),migrations);await works.initialize()
    assert.equal(await works.run(work.id,()=>prisma.novel.count()),1)
    assert.equal((await (await engineFor(works,work.id)).query<{shared_buffers:string}>('SHOW shared_buffers')).rows[0].shared_buffers,'32MB')
    await works.close();assert.equal(sha(await readFile(configuration)),before)
  }finally{PGlite.create=original;await works.close();await rm(temporary,{recursive:true,force:true})}
})

test('OPT-M03: strict filesystem synchronization is awaited and its original failure propagates', {timeout:90000},async()=>{
  const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-cache-sync-')))
  const works=new Workspaces(join(temporary,'root'),migrations)
  let restore:(()=>void)|undefined,release:(()=>void)|undefined
  try {
    await works.initialize();await works.run('inbox',()=>prisma.user.count())
    const engine=await engineFor(works,'inbox'),original=engine.fs.syncToFs.bind(engine.fs)
    const entered=Promise.withResolvers<void>(),gate=Promise.withResolvers<void>(),observed:(boolean|undefined)[]=[]
    release=()=>gate.resolve();restore=()=>{engine.fs.syncToFs=original}
    let block=true,settled=false
    engine.fs.syncToFs=async relaxed=>{observed.push(relaxed);if(block){block=false;entered.resolve();await gate.promise}await original(relaxed)}
    const pending=works.run('inbox',()=>prisma.user.update({where:{id:LOCAL_AUTHOR_ID},data:{name:'严格同步公开测试'}})).finally(()=>{settled=true})
    await entered.promise;await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false,'write must wait for actual filesystem sync')
    release();await pending;assert(observed.length>0);assert(observed.every(x=>x===false),'no relaxed filesystem flush is allowed')
    engine.fs.syncToFs=async()=>{throw Error('isolated synchronization failure')}
    await assert.rejects(works.run('inbox',()=>prisma.user.update({where:{id:LOCAL_AUTHOR_ID},data:{name:'不得吞掉同步错误'}})),/isolated synchronization failure/)
    restore();restore=undefined
  }finally{release?.();restore?.();await works.close();await rm(temporary,{recursive:true,force:true})}
})
