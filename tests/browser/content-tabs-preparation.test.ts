import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {build} from 'esbuild'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import {chromium,type Browser,type Page} from 'playwright-core'

const cssPath=resolve('src/app/globals.css')
const css=postcss([tailwindcss()]).process(readFileSync(cssPath,'utf8'),{from:cssPath}).then(result=>result.css+'\n'+readFileSync('src/app/desktop.css','utf8'))
const bundle=build({
 stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';
import{ContentTabs}from'./src/components/layout/ContentTabs';
import{ContentDrawerInteractionContext}from'./src/lib/desktop/content-drawer-context';
import{useTabsStore,buildTabId}from'./src/stores/tabs';import{useDesktopStore}from'./src/stores/desktop';
window.mountPreparation=(scale=1,count=1,title='隔离内容长标题')=>{
 window.desktop={};document.documentElement.className='ink';document.body.dataset.platform='win32';
 useDesktopStore.setState({bootstrap:{platform:'win32',dataRoot:'isolated-preparation-only',settings:{appearance:{zoom:scale},shortcuts:{win32:{},darwin:{}}}}});
 const tabs=Array.from({length:count},(_,i)=>({id:buildTabId('theme','isolated-'+i),type:'theme',novelId:'isolated-'+i,title:title+' '+i}));
 useTabsStore.setState({tabs,activeTabId:tabs[0].id,activationNonce:0,subTabs:{}});
 const query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});query.setQueryData(['novels'],{novels:[],unavailableWorks:[]});
 const root=createRoot(document.getElementById('app'));
 const state={callback:null};window.preparation={
  callback:()=>state.callback(),
  width:value=>{document.getElementById('preparation-host').style.width=value+'px'},
  flush:callback=>flushSync(callback),
  snapshot:()=>{
   const caption=document.querySelector('.content-tabs-caption'),viewport=document.querySelector('.content-tabs-viewport'),tools=document.querySelector('.content-tabs-tools'),style=getComputedStyle(caption);
   return{caption:caption.getBoundingClientRect().width,available:caption.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),capacity:viewport.style.getPropertyValue('--content-tabs-viewport-width'),viewport:viewport.getBoundingClientRect().width,tools:tools.getBoundingClientRect().width,compact:tools.dataset.compact,menu:!!tools.querySelector('.content-tabs-menu-trigger'),tabs:Array.from(caption.querySelectorAll('.content-tab')).map(el=>({width:el.getBoundingClientRect().width,min:getComputedStyle(el).minWidth,max:getComputedStyle(el).maxWidth})),scale:getComputedStyle(caption).getPropertyValue('--content-tab-scale')};
  },
  settle:()=>{
   const calls=[];let consecutive=0;
   for(let index=0;index<12&&consecutive<2;index++){
    let ready;flushSync(()=>{ready=state.callback()});calls.push({ready,...window.preparation.snapshot()});consecutive=ready?consecutive+1:0;
   }
   return calls;
  },
  unmount:()=>flushSync(()=>root.unmount()),
 };
 const registerCaptionPreparation=callback=>{state.callback=callback;return()=>{if(state.callback===callback)state.callback=null}};
 flushSync(()=>root.render(<QueryClientProvider client={query}><ContentDrawerInteractionContext.Provider value={{paused:true,captionZoom:scale,registerCaptionPreparation}}><div id='preparation-host' style={{width:899,height:200}}><ContentTabs fullscreen={false} onToggleFullscreen={()=>{}} onToggleContent={()=>{}}/></div></ContentDrawerInteractionContext.Provider></QueryClientProvider>));
};`},
 bundle:true,loader:{'.css':'empty'},platform:'browser',format:'iife',write:false,tsconfig:'tsconfig.json',plugins:[{
  name:'isolate-unrelated-content-body',setup(api){
   api.onResolve({filter:/^@\/components\/content\/(registry|StagedSaveSurface|StoryWorkflowPanel)$/},args=>({path:args.path,namespace:'preparation-body'}))
   api.onLoad({filter:/.*/,namespace:'preparation-body'},()=>({loader:'tsx',resolveDir:process.cwd(),contents:`import React from 'react';export const renderTabContent=tab=><section data-public-body={tab.id}/>;export const StagedSaveSurface=({children})=>children;export const StagedInterceptionBootstrap=()=>null;export const StorySources=()=>null;export const StoryActivityBanner=()=>null;export const StoryLivePreview=()=>null;`}))
  },
 }],
}).then(result=>result.outputFiles![0].text)

let browser:Browser
test.before(async()=>{browser=await chromium.launch({headless:true,...(process.env.SHAKEINK_TEST_CHROMIUM?{executablePath:process.env.SHAKEINK_TEST_CHROMIUM}:{})})})
test.after(async()=>{await browser?.close()})
type Snapshot={caption:number;available:number;capacity:string;viewport:number;tools:number;compact:string;menu:boolean;tabs:{width:number;min:string;max:string}[];scale:string}
type Prepared=Snapshot&{ready:boolean}
async function fixture(run:(page:Page)=>Promise<void>,options:{scale?:number;count?:number;title?:string}={}){
 const page=await browser.newPage({viewport:{width:1024,height:768}}),errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 try{
  await page.route('**/*',route=>route.abort());await page.setContent('<div id="app"></div>');await page.evaluate('window.__name=value=>value')
  await page.addStyleTag({content:await css});await page.addScriptTag({content:await bundle})
  await page.evaluate(options=>(window as any).mountPreparation(options.scale??1,options.count??1,options.title??'隔离内容长标题'),options)
  await run(page);assert.deepEqual(errors,[],'the actual ContentTabs fixture has no page errors')
 }finally{await page.evaluate(()=>(window as any).preparation?.unmount()).catch(()=>{});await page.close()}
}
function stable(calls:Prepared[],label:string){
 assert(calls.length<=12&&calls.length>=2,`${label}: preparation must converge within the fixed query bound`)
 assert(calls.at(-1)!.ready&&calls.at(-2)!.ready,`${label}: repeated stable measurements must return true`)
 assert.deepEqual(calls.at(-1),calls.at(-2),`${label}: applied capacity and real tab/tool boxes must remain identical`)
}

test('OPT-U01: real ContentTabs prepare stays false while committed compact tools change the applied capacity, then becomes repeatably true',async t=>fixture(async page=>{
 const result=await page.evaluate(()=>{
  const fixture=(window as any).preparation,wide=fixture.settle(),before=fixture.snapshot();let first:boolean
  fixture.width(269.4);fixture.flush(()=>{first=fixture.callback()});const afterCommit=fixture.snapshot()
  const second=fixture.callback(),afterSecond=fixture.snapshot(),third=fixture.callback(),afterThird=fixture.snapshot(),fourth=fixture.callback(),afterFourth=fixture.snapshot()
  return{wide,before,first:first!,afterCommit,second,afterSecond,third,afterThird,fourth,afterFourth}
 })
 t.diagnostic(JSON.stringify(result));stable(result.wide,'initial complete wide caption')
 assert.equal(result.before.compact,'false');assert.equal(result.before.menu,false);assert.equal(result.first,false,'uncommitted compact/menu flags must keep preparation pending')
 assert.equal(result.afterCommit.compact,'true');assert.equal(result.afterCommit.menu,true);assert(result.afterCommit.tools<result.before.tools,'real compact commit removes the two full-size tools')
 assert(Math.abs(parseFloat(result.afterSecond.capacity)-parseFloat(result.afterCommit.capacity))>1,'the real tools change must actually change applied capacity; do not assume a hardcoded 27/55')
 assert.equal(result.second,false,'matching tool flags cannot report ready while this measurement changes applied capacity')
 assert.equal(result.third,true);assert.equal(result.fourth,true);assert.deepEqual(result.afterThird,result.afterSecond);assert.deepEqual(result.afterFourth,result.afterThird)
}))

test('OPT-U01: unchanged capacity cannot bypass the original uncommitted tool-flags guard',async t=>fixture(async page=>{
 const result=await page.evaluate(()=>{
  const fixture=(window as any).preparation,wide=fixture.settle();fixture.width(269.4);const pending:{ready:boolean;snapshot:Snapshot}[]=[]
  fixture.flush(()=>{for(let index=0;index<2;index++)pending.push({ready:fixture.callback(),snapshot:fixture.snapshot()})})
  return{wide,pending,settled:fixture.settle()}
 })
 t.diagnostic(JSON.stringify(result));stable(result.wide,'initial wide')
 assert.equal(result.pending[0].snapshot.compact,'false');assert.equal(result.pending[1].snapshot.compact,'false');assert.equal(result.pending[0].snapshot.capacity,result.pending[1].snapshot.capacity)
 assert.equal(result.pending[0].ready,false);assert.equal(result.pending[1].ready,false,'capacity stability must not replace the original flags check');stable(result.settled,'committed compact')
}))

for(const scale of[.8,1.1,1.333333])for(const count of[1,7])test(`OPT-U01: ${scale} scale and ${count} real long-title tabs converge at fractional and compact boundaries`,async t=>fixture(async page=>{
 const groups=await page.evaluate(()=>{
  const fixture=(window as any).preparation,groups=[]
  for(const width of[899.125,269.4,270.333333,398.666667,899.125]){fixture.width(width);groups.push({width,calls:fixture.settle()})}
  return groups
 })
 t.diagnostic(JSON.stringify(groups));for(const group of groups)stable(group.calls,`${scale}/${count} at ${group.width}px`)
},{scale,count,title:'这是检验真实长标题布局与容量收敛的公开标签'.repeat(6)}))
