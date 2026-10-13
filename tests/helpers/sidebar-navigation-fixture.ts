import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {build} from 'esbuild'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import type {Browser,Page} from 'playwright-core'

const cssPath=resolve('src/app/globals.css')
const styles=postcss([tailwindcss()]).process(readFileSync(cssPath,'utf8'),{from:cssPath}).then(r=>r.css+'\n'+readFileSync('src/app/desktop.css','utf8'))
// The navigation is real React. Only its API returns public synthetic records;
// this fixture never proves database, IPC or native-window acceptance.
const bundle=build({stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {ThemeProvider} from 'next-themes';
import {SidebarTree} from './src/components/layout/SidebarTree';import {useTabsStore} from './src/stores/tabs';import {useChatStore} from './src/stores/chat';
import {useDesktopStore} from './src/stores/desktop';
import {registerSceneLeaveGuard,useSceneUiStore} from './src/stores/scene-ui';
window.mountSidebar=({width=260,theme='ink',long=false}={})=>{
 const calls=[],requests=[],failures={},query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
 const novels=[{id:'isolated-a',title:long?'用于隔离测试的非常长作品名称 English words and more content':'隔离作品甲',coverUrl:null},{id:'isolated-b',title:'隔离作品乙',coverUrl:null}];
 const roles=['PROTAGONIST','SUPPORTING','ANTAGONIST'];const data={};
 for(const n of novels){data['/api/novels/'+n.id+'/characters']={characters:roles.map((roleType,i)=>({id:n.id+'-c'+i,name:['林舟','周宁','段离'][i],roleType,avatarUrl:null}))};data['/api/novels/'+n.id+'/foreshadow-characters']={foreshadowCharacters:[{id:n.id+'-fc',name:'过客',note:'',revealedCharacterId:null}]};data['/api/novels/'+n.id+'/worlds']={worlds:[]};data['/api/novels/'+n.id+'/cascade']={pendingCount:0};data['/api/novels/'+n.id+'/scenarios']={scenarios:[]};data['/api/novels/'+n.id]={novel:{...n,volumes:[{id:n.id+'-v',index:1,title:'第一卷',chapters:[{id:n.id+'-ch',index:1,title:'出发',status:'WRITTEN',wordCount:0}]}]}};}
 data['/api/novels']={novels,unavailableWorks:[]};data['/api/chat/conversations']={conversations:[{id:'a-conv',novelId:'isolated-a',title:'甲会话',updatedAt:'2026-10-13'},{id:'b-conv',novelId:'isolated-b',title:'乙会话',updatedAt:'2026-10-13'},{id:'unbound',novelId:null,title:'未绑定指引',updatedAt:'2026-10-13'}]};
 window.fetch=async(path,init)=>{const url=String(path),method=init?.method??'GET';requests.push({path:url,method});const failure=failures[url];let payload=data[url]??{};const match=url.match(/^(.*\\/scenarios)(?:\\/([^/]+))?$/);if(!failure&&match&&method!=='GET'){const list=data[match[1]]??={scenarios:[]};if(method==='POST'){const body=JSON.parse(init.body);const scenario={id:'created-'+requests.length,novelId:url.includes('isolated-a')?'isolated-a':'isolated-b',title:body.title,status:'CONFIGURING',turnCount:0,nodeCount:0};list.scenarios.push(scenario);payload={scenario}}else if(method==='PATCH'){const row=list.scenarios.find(r=>r.id===match[2]);Object.assign(row,JSON.parse(init.body));payload={scenario:row}}else if(method==='DELETE'){list.scenarios=list.scenarios.filter(r=>r.id!==match[2]);payload={}}}return new Response(JSON.stringify(failure?{error:failure}:payload),{status:failure?500:200,headers:{'Content-Type':'application/json'}})};
 query.setQueryData(['novels'],data['/api/novels']);
 useTabsStore.setState({tabs:[{id:'kept',type:'theme',novelId:'isolated-a',title:'已开面板'}],activeTabId:'kept',activationNonce:5});useChatStore.setState({accountId:'sidebar-fixture',conversationId:'kept-conversation'});
 document.documentElement.className=theme;document.body.dataset.platform='win32';
 useDesktopStore.setState({bootstrap:{platform:'win32',dataRoot:'isolated-only',settings:{appearance:{zoom:1},shortcuts:{win32:{},darwin:{}}}}});
 const root=createRoot(document.getElementById('app'));flushSync(()=>root.render(<QueryClientProvider client={query}><ThemeProvider attribute='class' forcedTheme={theme}><div id='sidebar-fixture' className='workspace-sidebar' style={{width,height:650}}><SidebarTree user={{id:'sidebar-fixture',name:'隔离用户',email:'sidebar@example.invalid'}} onToggleSidebar={()=>calls.push('toggle')}/></div></ThemeProvider></QueryClientProvider>));
 let stopGuard=()=>{},finishGuard=()=>{};
 window.sidebarFixture={calls,requests,data,failures,query,sceneUi:useSceneUiStore,state:()=>({tabs:useTabsStore.getState(),chat:useChatStore.getState()}),guard:mode=>{stopGuard();stopGuard=registerSceneLeaveGuard(useTabsStore.getState().activeTabId,()=>mode==='reject'?Promise.reject(new Error('隔离场景草稿尚未保存')):new Promise(resolve=>finishGuard=resolve))},finishGuard:()=>finishGuard(),clearGuard:()=>stopGuard(),resize:w=>{document.getElementById('sidebar-fixture').style.width=w+'px'},unmount:()=>{stopGuard();root.unmount()}};
};`},bundle:true,loader:{'.css':'empty'},platform:'browser',format:'iife',write:false,tsconfig:'tsconfig.json'}).then(r=>r.outputFiles![0].text)
export async function withSidebar(browser:Browser,options:{width?:number;theme?:'paper'|'ink';long?:boolean},run:(page:Page)=>Promise<void>){
 const page=await browser.newPage({viewport:{width:1000,height:700}}),errors:string[]=[]
 page.setDefaultTimeout(5000)
 page.on('pageerror',e=>errors.push(e.message))
 try{await page.route('**/*',route=>route.abort());await page.setContent('<div id="app"></div>');await page.evaluate('globalThis.__name=target=>target');await page.addStyleTag({content:await styles});await page.addScriptTag({content:await bundle});await page.evaluate(o=>(window as any).mountSidebar(o),options);await page.waitForTimeout(100);await run(page);if(errors.length)throw new Error(errors.join('\n'))}catch(error){throw new Error(String(error)+'\nFixture errors: '+errors.join('; ')+'\nFocus: '+await page.evaluate(()=>document.activeElement?.outerHTML)+'\n'+await page.locator('body').innerText())}finally{await page.close()}
}
