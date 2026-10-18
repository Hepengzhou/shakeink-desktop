import {createHash} from "node:crypto"
import {lstat,readFile,readdir,realpath} from "node:fs/promises"
import {dirname,join,resolve} from "node:path"
import {z} from "zod"

const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
const digest=z.string().regex(/^[a-f0-9]{64}$/)
const manifestSchema=z.object({
 format:z.literal('shakeink-empty-pglite'),schemaVersion:z.literal(1),fingerprintFormat:z.literal('runtime-metadata-without-scripts-keywords-v1'),pgliteVersion:z.string().min(1).max(80),
 archive:z.object({path:z.literal('empty-database.tar.gz'),bytes:z.number().int().positive().max(16*1024*1024),sha256:digest}).strict(),
 inputs:z.array(z.object({path:z.string().min(1).max(256),sha256:digest}).strict()).min(5).max(512),
}).strict()

async function regular(path:string,maximum:number){
 const info=await lstat(path)
 if(!info.isFile()||info.isSymbolicLink()||info.size<=0||info.size>maximum||await realpath(path)!==resolve(path))throw Error('DATABASE_SEED_UNSAFE')
 return readFile(path)
}

/** Fixed installed-resource inventory; the manifest cannot choose read paths. */
export async function databaseSeedInputs(packageRoot:string){
 const paths=['package.json']
 async function walk(directory:string){
  for(const name of (await readdir(join(packageRoot,directory))).sort()){
   const relative=directory+'/'+name,info=await lstat(join(packageRoot,relative))
   if(info.isSymbolicLink())throw Error('DATABASE_SEED_RUNTIME_UNSAFE')
   if(info.isDirectory())await walk(relative)
   else if(info.isFile()&&/\.(?:cjs|wasm|data)$/.test(name))paths.push(relative)
  }
 }
 await walk('dist');paths.sort()
 for(const required of ['dist/index.cjs','dist/pglite.wasm','dist/initdb.wasm','dist/pglite.data'])if(!paths.includes(required))throw Error('DATABASE_SEED_RUNTIME_INCOMPLETE')
 const inputs=[]
 for(const path of paths){
  let bytes=await regular(join(packageRoot,path),128*1024*1024)
  if(path==='package.json'){
   // electron-builder removes only these development fields. Preserve every
   // runtime field and object-key order, including exports condition priority.
   const runtimeMetadata=JSON.parse(bytes.toString());delete runtimeMetadata.scripts;delete runtimeMetadata.keywords
   bytes=Buffer.from(JSON.stringify(runtimeMetadata))
  }
  inputs.push({path,sha256:sha(bytes)})
 }
 const metadata=JSON.parse((await regular(join(packageRoot,'package.json'),256*1024)).toString())
 if(metadata.name!=='@electric-sql/pglite'||typeof metadata.version!=='string')throw Error('DATABASE_SEED_RUNTIME_INVALID')
 return {pgliteVersion:metadata.version as string,inputs}
}

/** No authoritative data-root IO. Only build resources and installed runtime. */
export async function readDatabaseSeed(manifestPath:string,packageRoot:string):Promise<Blob>{
 const manifest=manifestSchema.parse(JSON.parse((await regular(manifestPath,128*1024)).toString()))
 const runtime=await databaseSeedInputs(packageRoot)
 if(manifest.pgliteVersion!==runtime.pgliteVersion||JSON.stringify(manifest.inputs)!==JSON.stringify(runtime.inputs))throw Error('DATABASE_SEED_RUNTIME_MISMATCH')
 const bytes=await regular(join(dirname(manifestPath),manifest.archive.path),16*1024*1024)
 if(bytes.length!==manifest.archive.bytes||sha(bytes)!==manifest.archive.sha256)throw Error('DATABASE_SEED_ARCHIVE_MISMATCH')
 return new Blob([new Uint8Array(bytes)])
}
