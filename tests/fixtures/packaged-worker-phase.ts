import assert from 'node:assert/strict'
import {Worker} from 'node:worker_threads'
import {stat,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {RpcPeer} from '../../desktop/service/rpc'
import type {LocalResponse} from '../../desktop/shared/ipc'
import {defaultState} from '../../desktop/core/settings'
import {freezeTaskDefaults} from '../../desktop/shared/task-defaults'
async function main(){
const [appRoot,root,directory,phase,previousId='']=process.argv.slice(2)
const identity=await stat(directory,{bigint:true})
let novelId=previousId
 const bootstrap=String.raw`
 const {registerHooks,isBuiltin}=require('node:module'),{realpathSync,writeFileSync}=require('node:fs'),{fileURLToPath}=require('node:url'),{sep,join}=require('node:path'),{workerData}=require('node:worker_threads');
 registerHooks({resolve(specifier,context,next){const result=next(specifier,context);if(result.url.startsWith('file:')){const p=realpathSync(fileURLToPath(result.url));if(p!==workerData.appRoot&&!p.startsWith(workerData.appRoot+sep))throw Error('Module escaped package: '+specifier)}else if(!isBuiltin(result.url))throw Error('Unexpected module '+specifier);return result}});
 const {PGlite}=require(join(workerData.appRoot,'node_modules/@electric-sql/pglite'));
 const create=PGlite.create,defaults=[...PGlite.defaultStartParams],profiles=[];
 PGlite.create=async function(...args){
   const engine=await Reflect.apply(create,this,args),options=args[0];
   // Count internal bootstrap engines, but never issue SQL against them.
   if(options.noInitDb){profiles.push({noInitDb:true});writeFileSync(workerData.profile,JSON.stringify(profiles));return engine;}
   const settings=await engine.query("SELECT name,setting,unit,source FROM pg_settings WHERE name IN ('server_version','shared_buffers','wal_buffers','transaction_buffers','subtransaction_buffers') ORDER BY name");
   profiles.push({options:{relaxedDurability:options.relaxedDurability,startParams:options.startParams,loadDataDir:options.loadDataDir instanceof Blob},defaults,settings:settings.rows,wasmBytes:engine.mod.HEAPU8.byteLength});
   writeFileSync(workerData.profile,JSON.stringify(profiles));return engine;
 };
 require(workerData.entry);
 `
   const profilePath=join(root,'..',`packaged-cache-${phase}.json`)
   const worker=new Worker(bootstrap,{eval:true,workerData:{appRoot,entry:join(appRoot,'dist/service/index.cjs'),root,migrations:join(appRoot,'prisma/migrations'),databaseSeed:join(appRoot,'prisma/empty-database.json'),profile:profilePath}})
   const rpc=new RpcPeer(worker,async method=>{if(method==='model.defaults')return freezeTaskDefaults(defaultState.settings.agent,0);throw Error('Unexpected model/network call: '+method)})
   worker.on('error',()=>rpc.dispose());worker.on('exit',()=>rpc.dispose())
   async function request(path:string,method='GET',body?:unknown){
    const id=randomUUID(),reply=await rpc.call<LocalResponse>('start',{version:1,id,path,method,headers:body?{'content-type':'application/json'}:{},body:body?Array.from(Buffer.from(JSON.stringify(body))):undefined})
    const chunks:Uint8Array[]=[]
    for(;;){const chunk=await rpc.call<{done:boolean;bytes:Uint8Array}>('read',id);if(chunk.done)break;chunks.push(chunk.bytes)}
    return {status:reply.status,body:JSON.parse(Buffer.concat(chunks).toString())}
   }
   try{
    await rpc.call('ready')
    if(phase==='write'){
     const created=await rpc.call<{novel:{id:string}}>('create-work',{selection:{path:directory,device:String(identity.dev),inode:String(identity.ino)},input:{title:'独立包事务测试',requestId:'optimization-work'}})
     novelId=created.novel.id
     const first=await request('/api/admin/prompts','POST',{key:'optimization.persist',name:'事务测试',content:'原始中文内容'})
     assert.equal(first.status,201)
     const duplicate=await request('/api/admin/prompts','POST',{key:'optimization.persist',name:'不应写入',content:'禁止覆盖'})
     assert(duplicate.status>=400)
    }
    const list=await request('/api/novels');assert.equal(list.status,200);assert.equal(list.body.novels.length,1);assert.equal(list.body.novels[0].id,novelId)
    const theme=await request(`/api/novels/${novelId}/theme`);assert.equal(theme.status,200);assert.equal(theme.body.theme.title,'独立包事务测试')
    const prompts=await request('/api/admin/prompts'),saved=prompts.body.prompts.filter((row:{key:string})=>row.key==='optimization.persist')
    assert.equal(saved.length,1);assert.equal(saved[0].content,'原始中文内容')
    assert.equal(await rpc.call('close'),true)
   }finally{await rpc.call('close').catch(()=>{});rpc.dispose();await worker.terminate()}
const profiles=JSON.parse(await readFile(profilePath,'utf8'))
assert(profiles.length>=2,'actual packaged inbox and work engines must both be observed')
assert.equal(profiles.some((profile:{noInitDb?:boolean})=>profile.noInitDb),false,'packaged seed must avoid all temporary initdb engines')
assert.equal(profiles.filter((profile:{options:{loadDataDir:boolean}})=>profile.options.loadDataDir).length,phase==='write'?2:0,'only the two new databases receive the seed, not reopened databases')
for(const profile of profiles){
 assert.equal(profile.options.relaxedDurability,false)
 assert.deepEqual(profile.options.startParams,[...profile.defaults,'-c','shared_buffers=32MB'])
 assert.equal(profile.settings.find((x:{name:string})=>x.name==='shared_buffers').setting,'4096')
 assert(profile.wasmBytes>0)
}
console.log(JSON.stringify({passed:true,phase,novelId,cacheProfiles:profiles}))

}
void main().catch(error=>{console.error(error);process.exitCode=1})
