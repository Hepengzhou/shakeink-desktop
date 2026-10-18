import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createRequire} from 'node:module'
import {build} from 'esbuild'

const execute=promisify(execFile)
test('OPT-P05: inlined official NextRequest/Response match JSON, headers, cookies, redirects and stream cancellation without Next installed',async()=>{
 const {bundleNextServer}=await import('../../scripts/runtime-dependencies.mjs')
 const directory=await mkdtemp(join(tmpdir(),'shakeink-next-inline-'))
 const probe=String.raw`
async function probe(NextRequest,NextResponse){
 const request=new NextRequest('https://local.invalid/a?q=中文',{headers:{cookie:'first=1; second=2'}})
 const response=NextResponse.json({text:'中文',q:request.nextUrl.searchParams.get('q')},{status:201,headers:{'x-local':'yes'}})
 response.cookies.set('one','a',{httpOnly:true,sameSite:'strict',path:'/a'});response.cookies.set('two','b',{secure:true,path:'/'});response.cookies.delete('one')
 const cookies=response.cookies.getAll();const headers=[...response.headers];const text=await response.text()
 let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: 中文\n\n'))},cancel(){cancelled=true}})
 const streamed=new NextResponse(stream,{headers:{'content-type':'text/event-stream'}}),reader=streamed.body.getReader();const chunk=new TextDecoder().decode((await reader.read()).value);await reader.cancel()
 const redirect=NextResponse.redirect('https://local.invalid/next',307)
 return {url:request.nextUrl.pathname,cookie:request.cookies.get('first'),status:response.status,headers,text,cookies,chunk,cancelled,redirect:{status:redirect.status,location:redirect.headers.get('location')}}
}`
 try{
  const source=`import {NextRequest,NextResponse} from 'next/server';${probe};probe(NextRequest,NextResponse).then(x=>console.log(JSON.stringify(x)))`
  const bundled=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,platform:'node',format:'cjs',target:'node24',packages:'external',plugins:[bundleNextServer(process.cwd())],write:false,metafile:true})
  const externals=Object.values(bundled.metafile!.outputs).flatMap(x=>x.imports.filter(x=>x.external).map(x=>x.path))
  assert(!externals.some(x=>x==='next'||x.startsWith('next/')))
  // React is not used by these Next APIs. Resolve it explicitly without copying
  // Next or allowing the temporary probe a parent node_modules fallback.
  const runtime=createRequire(import.meta.url)
  const compiled=bundled.outputFiles![0].text.replaceAll('require("react")',`require(${JSON.stringify(runtime.resolve('react'))})`)
  const file=join(directory,'probe.cjs');await writeFile(file,compiled)
  const actual=JSON.parse((await execute(process.execPath,[file],{cwd:directory,timeout:30000})).stdout)
  const official=runtime('next/server'),expected=await new Function(`${probe};return probe` )()(official.NextRequest,official.NextResponse)
  // Cookie deletion's expires is the fixed Unix epoch, not the wall clock.
  assert.deepEqual(actual,JSON.parse(JSON.stringify(expected)))
 }finally{await rm(directory,{recursive:true,force:true})}
})
