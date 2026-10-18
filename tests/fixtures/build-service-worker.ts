import {randomUUID} from 'node:crypto'
import {rm} from 'node:fs/promises'
import {join} from 'node:path'
import {build} from 'esbuild'
import {bundleNextServer} from '../../scripts/runtime-dependencies.mjs'

/** Compile the actual service with the production bundler options. Test builds
 * own only this unique directory; they never run resource generators or write
 * the application's five distribution entries, manifests or database seed. */
export async function buildServiceWorker(){
 const project=process.cwd(),directory=join(project,'dist',`unique-test-worker-${randomUUID()}`),entry=join(directory,'index.cjs')
 try{
  await build({
   bundle:true,platform:'node',target:'node24',format:'cjs',sourcemap:true,metafile:true,packages:'external',
   define:{'import.meta.url':'__desktopImportMetaUrl'},
   banner:{js:'var __desktopImportMetaUrl = require("node:url").pathToFileURL(__filename).href;'},
   plugins:[bundleNextServer(project)],entryPoints:[join(project,'desktop/service/index.ts')],outfile:entry,
  })
  return{entry,async close(){await rm(directory,{recursive:true,force:true})}}
 }catch(error){await rm(directory,{recursive:true,force:true});throw error}
}
