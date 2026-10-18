import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {publishDesktopCommands,desktopCommandCatalog} from '../../src/lib/desktop/command-runtime'

/** Execute the actual production effect body. Only asynchronous module/editor
 * boundaries are controlled, so cleanup and status logic are never reimplemented. */
async function effect(path:string,needle:string,context:Record<string,unknown>){
 const source=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 let body=''
 function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0]?.getText(source).includes(needle))body=node.arguments[0].getText(source);ts.forEachChild(node,visit)}
 visit(source);assert(body,'the actual effect must be found')
 body=body.replace('import("@/lib/desktop/startup-command-catalog")','load()')
 const output=ts.transpile(`const run=${body}`,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}).replace('const run =','return')
 return new Function(...Object.keys(context),output)(...Object.values(context))() as ()=>void
}
const flush=()=>new Promise(resolve=>setImmediate(resolve))

test('OPT-C02: actual startup effect publishes ready, handles failed loading, and disposes a late async result after cancellation',async()=>{
 for(const mode of ['success','failure','cancel'] as const){
  const pending=Promise.withResolvers<any>(),statuses:string[]=[];let disposed=0
  const cleanup=await effect('src/components/desktop/DesktopApp.tsx','initializeStartupCommandCatalog',{platform:'darwin',load:()=>pending.promise,setDesktopCatalogStatus:(_platform:string,status:string)=>statuses.push(status)})
  assert.deepEqual(statuses,['loading'])
  if(mode==='cancel')cleanup()
  if(mode==='failure')pending.reject(Error('unavailable'));else pending.resolve({initializeStartupCommandCatalog:()=>()=>{disposed++}})
  await flush()
  assert.deepEqual(statuses,mode==='success'?['loading','ready']:mode==='failure'?['loading','unavailable']:['loading'])
  if(mode!=='cancel')cleanup()
  assert.equal(disposed,mode==='failure'?0:1)
 }
})

test('OPT-C02: actual first-editor effect exposes live failure, recovers on success, and never publishes ready after disposal',async()=>{
 for(const mode of ['success','failure','cancel'] as const){
  const pending=Promise.withResolvers<()=>void>(),statuses:string[]=[];let disposed=0
  const cleanup=await effect('src/components/editor/MonacoMarkdownEditor.tsx','bindMonacoCommandTarget',{platform:'darwin',editorInstance:{},bindMonacoCommandTarget:()=>pending.promise,setDesktopCatalogStatus:(_platform:string,status:string)=>statuses.push(status),console:{error:()=>{}}})
  if(mode==='cancel')cleanup()
  if(mode==='failure')pending.reject(Error('version/platform/shape mismatch'));else pending.resolve(()=>{disposed++})
  await flush()
  assert.deepEqual(statuses,mode==='success'?['ready']:mode==='failure'?['unavailable']:[])
  if(mode!=='cancel')cleanup()
  assert.equal(disposed,mode==='failure'?0:1)
 }
})

test('OPT-C02: real static command identity wins a live collision; replacing an owner is safe from old disposer',()=>{
 const original=structuredClone(desktopCommandCatalog('darwin').find(row=>row.id==='app.settings')!)
 const old=publishDesktopCommands('static-collision',[{...original,label:'incorrect',scope:'markdown',defaults:['Ctrl+F9']}])
 const replacement=publishDesktopCommands('static-collision',[{...original,label:'incorrect-new',scope:'markdown',defaults:['Ctrl+F10']}])
 try{
  old();const current=desktopCommandCatalog('darwin').find(row=>row.id==='app.settings')!
  assert.equal(current.label,original.label);assert.equal(current.scope,original.scope);assert.equal(current.locked,original.locked)
  assert(current.defaults.includes('Ctrl+F10'));assert(!current.defaults.includes('Ctrl+F9'))
 }finally{old();replacement()}
 assert.deepEqual(desktopCommandCatalog('darwin').find(row=>row.id==='app.settings'),original)
})
