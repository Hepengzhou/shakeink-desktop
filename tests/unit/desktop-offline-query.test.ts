import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {QueryClient,QueryObserver,onlineManager,isCancelledError} from '@tanstack/react-query'

async function actualProviderClient(){
 const source=ts.createSourceFile('providers.tsx',await readFile('src/app/providers.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 let initialize=''
 function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='useState'&&node.arguments[0]?.getText(source).includes('new QueryClient'))initialize=node.arguments[0].getText(source);ts.forEachChild(node,visit)}
 visit(source);assert(initialize,'execute the actual provider initializer, without a replacement test default')
 return new Function('QueryClient',`return (${initialize})()`)(QueryClient) as QueryClient
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5))
async function wait(check:()=>boolean){for(let i=0;i<200&&!check();i++)await tick();assert(check())}

test('OPT-O01: actual desktop Provider executes local queries and mutations while offline',async()=>{
 const client=await actualProviderClient();client.mount();onlineManager.setOnline(false)
 let reads=0,writes=0;const pending:Promise<unknown>[]=[]
 try{
  pending.push(client.fetchQuery({queryKey:['offline-read'],queryFn:async()=>++reads}))
  const mutation=client.getMutationCache().build(client,{mutationFn:async()=>++writes});pending.push(mutation.execute(undefined))
  await tick()
  assert.notEqual(client.getQueryState(['offline-read'])?.fetchStatus,'paused')
  assert.notEqual(mutation.state.isPaused,true)
  assert.deepEqual(await Promise.all(pending),[1,1]);assert.equal(reads,1);assert.equal(writes,1)
 }finally{onlineManager.setOnline(true);await Promise.allSettled(pending);client.unmount();client.clear()}
})

test('OPT-O02: offline local errors, cancellation, invalidation and reconnection retain query semantics',async()=>{
 const client=await actualProviderClient();client.mount();onlineManager.setOnline(false)
 try{
  assert.equal(client.getDefaultOptions().queries?.refetchOnReconnect,true)
  const failure=Error('local authorization refused')
  await assert.rejects(client.fetchQuery({queryKey:['offline-error'],retry:false,queryFn:async()=>{throw failure}}),error=>error===failure)
  let aborted=false,started=false
  const pending=client.fetchQuery({queryKey:['offline-cancel'],retry:false,queryFn:({signal})=>{started=true;return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('cancelled'))},{once:true}))}}).catch(error=>error)
  await tick();assert(started);await client.cancelQueries({queryKey:['offline-cancel']});assert(aborted);assert(isCancelledError(await pending))
  let reads=0
  const observer=new QueryObserver(client,{queryKey:['offline-active'],staleTime:0,queryFn:async()=>++reads}),release=observer.subscribe(()=>{})
  try{
   await wait(()=>reads===1&&client.getQueryState(['offline-active'])?.fetchStatus==='idle');await client.invalidateQueries({queryKey:['offline-active']});assert.equal(reads,2)
   onlineManager.setOnline(true);await wait(()=>reads===3)
  }finally{release()}
 }finally{onlineManager.setOnline(true);client.unmount();client.clear()}
})
