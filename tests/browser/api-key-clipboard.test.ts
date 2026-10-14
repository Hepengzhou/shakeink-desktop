import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { chromium, type Browser, type Page } from "playwright-core"

// Real Controller, Input, React state, Chromium editing/undo; clipboard and
// menu bridge stay in memory. Actual OS/native menu is covered separately.
// Darwin command routing stays a fixture below. Untouched undo/redo are native
// Chromium operations, so press the actual host OS keys; a Windows run does
// not establish macOS native keyboard/menu acceptance.
const nativeUndo = process.platform === "darwin" ? "Meta+z" : "Control+z"
const nativeRedo = process.platform === "win32" ? "Control+y" : process.platform === "darwin" ? "Meta+Shift+z" : "Control+Shift+z"
const nativeCopy = process.platform === "darwin" ? "Meta+c" : "Control+c"
const bundle=build({stdin:{resolveDir:process.cwd(),loader:"tsx",contents:`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {Input} from './src/components/ui/input';import {DesktopCommandController} from './src/components/desktop/DesktopCommandController';
import {useDesktopStore} from './src/stores/desktop';import {defaultState} from './desktop/core/settings';
globalThis.keyState='public-fixture';globalThis.clipboard='paste-fixture';globalThis.writes=[];globalThis.menus=[];globalThis.errors=[];globalThis.copyEvents=0;
let writeGate=null,menuGate=null;
window.desktop={writeClipboardText:async text=>{globalThis.writes.push(text);await writeGate?.promise},readClipboardText:async()=>globalThis.clipboard,showTextContextMenu:async state=>{globalThis.menus.push(state);return {requestId:state.requestId,command:await menuGate?.promise??null}},cancelTextContextMenu:async()=>{}};
useDesktopStore.setState({bootstrap:{...defaultState,platform:'darwin'}});
function App(){const [value,setValue]=useState('public-fixture');const [shown,setShown]=useState(false);
 return <><DesktopCommandController/>
  <Input aria-label='API Key' type={shown?'text':'password'} data-desktop-clipboard='api-key' value={value} onChange={e=>{globalThis.keyState=e.target.value;setValue(e.target.value)}} onCopy={()=>{globalThis.copyEvents++}}/>
  <button id='toggle' aria-pressed={shown} onClick={()=>setShown(v=>!v)}>toggle</button>
  <input id='outside'/><input id='ordinary' type='password' defaultValue='ordinary-fixture'/></>}
const root=createRoot(document.getElementById('app'));flushSync(()=>root.render(<App/>));
globalThis.override=overrides=>useDesktopStore.setState(state=>({bootstrap:{...state.bootstrap,settings:{...state.bootstrap.settings,shortcuts:{...state.bootstrap.settings.shortcuts,darwin:overrides}}}}));
globalThis.gate=kind=>{let resolve;const promise=new Promise(yes=>resolve=yes);const gate={promise,resolve};if(kind==='write')writeGate=gate;else menuGate=gate;globalThis.release=resolve};
globalThis.dispose=()=>flushSync(()=>root.unmount());
`},bundle:true,write:false,platform:"browser",format:"iife",tsconfig:"tsconfig.json",plugins:[{name:"memory-errors",setup(build){build.onResolve({filter:/^sonner$/},args=>({path:args.path,namespace:"fixture"}));build.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:"export const toast={info:x=>globalThis.errors.push(x),error:x=>globalThis.errors.push(x)}"}))}}]})
let browser:Browser
test.before(async()=>{const executablePath=process.env.XAANINK_TEST_CHROMIUM;browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})})})
test.after(async()=>{await browser?.close()})
async function scenario(run:(page:Page)=>Promise<void>){
 const page=await browser.newPage();await page.route("**/*",route=>route.abort())
 await page.setContent('<div id="app"></div>');await page.evaluate("globalThis.__name = target => target")
 // about:blank is an insecure context without randomUUID; the app only needs a UUID mint.
 await page.evaluate(()=>{if(typeof crypto.randomUUID!=="function"){let n=0;Object.defineProperty(crypto,"randomUUID",{configurable:true,value:()=>`00000000-0000-4000-8000-${String(++n).padStart(12,"0")}`})}})
 await page.addScriptTag({content:(await bundle).outputFiles[0].text})
 try{await page.getByLabel("API Key").focus();await run(page)}finally{await page.evaluate(()=>(window as any).dispose());await page.close()}
}
const select=(page:Page,start=0,end=6)=>page.getByLabel("API Key").evaluate((element:HTMLInputElement,[start,end])=>element.setSelectionRange(start,end),[start,end])
const settle=(page:Page)=>page.evaluate(async()=>{for(let n=0;n<8;n++)await Promise.resolve()})
const lastMenu=async(page:Page)=>{const menus=await page.evaluate(()=>(window as any).menus);return menus.at(-1)}
const dispatchMenu=(page:Page)=>page.evaluate(()=>{document.querySelector('[aria-label="API Key"]')!.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))})
const toggle=async(page:Page)=>{await page.locator("#toggle").click();await page.getByLabel("API Key").focus()}

test("K01/K04: masked copy/cut shortcuts are silently blocked while paste and undo/redo stay native",async()=>scenario(async page=>{
 await select(page);await page.keyboard.press("Meta+c");await settle(page)
 assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);assert.equal(await page.evaluate(()=>(window as any).copyEvents),0)
 await page.keyboard.press("Meta+x");await settle(page);assert.equal(await page.getByLabel("API Key").inputValue(),"public-fixture")
 await page.evaluate(()=>{(window as any).clipboard='<img src=x>'});await select(page);await page.keyboard.press("Meta+v");await settle(page)
 assert.equal(await page.getByLabel("API Key").inputValue(),"<img src=x>-fixture");assert.equal(await page.evaluate(()=>(window as any).keyState),"<img src=x>-fixture")
 assert.equal(await page.locator("img").count(),0)
 await page.keyboard.press(nativeUndo);assert.equal(await page.getByLabel("API Key").inputValue(),"public-fixture")
 await page.keyboard.press(nativeRedo);assert.equal(await page.getByLabel("API Key").inputValue(),"<img src=x>-fixture")
 assert.equal(await page.getByLabel("API Key").getAttribute("type"),"password")
}))
test("K03/K07: the eye toggle switches the mask and the context menu copy state follows the form",async()=>scenario(async page=>{
 await select(page);await dispatchMenu(page);await settle(page)
 const masked=await lastMenu(page)
 assert.equal(masked.commands["text.copy"],false,"Masked form disables 复制")
 assert.equal(masked.commands["text.paste"],true);assert.equal(masked.commands["text.selectAll"],true);assert.equal(masked.commands["text.quote"],false)
 await toggle(page)
 assert.equal(await page.getByLabel("API Key").getAttribute("type"),"text");assert.equal(await page.locator("#toggle").getAttribute("aria-pressed"),"true")
 await select(page)
 await page.evaluate(()=>{(window as any).gate('menu')});await dispatchMenu(page);await settle(page)
 const shown=await lastMenu(page)
 assert.equal(shown.commands["text.copy"],true,"Plaintext form enables 复制");assert.equal(shown.commands["text.quote"],false,"The Key never becomes quotable")
 await page.evaluate(()=>(window as any).release("text.copy"));await settle(page)
 assert.deepEqual(await page.evaluate(()=>(window as any).writes),["public"])
 await page.keyboard.press(nativeCopy);await settle(page);assert.equal(await page.evaluate(()=>(window as any).copyEvents),1,"Plaintext copy falls through to Chromium")
 await toggle(page);assert.equal(await page.getByLabel("API Key").getAttribute("type"),"password")
 await select(page);await dispatchMenu(page);await settle(page)
 const remasked=await lastMenu(page)
 assert.equal(remasked.commands["text.copy"],false,"Returning to the masked form disables 复制 again")
}))
test("K05: removed/rebound bindings never resurrect masked copy or bypass confirmed paste",async()=>scenario(async page=>{
 await select(page);await page.evaluate(()=>(window as any).override({"text.copy":[],"text.cut":[],"text.paste":[]}));await page.keyboard.press("Meta+v");await settle(page)
 assert.equal(await page.getByLabel("API Key").inputValue(),"public-fixture")
 await page.evaluate(()=>(window as any).override({"text.paste":["Cmd+Alt+V"],"text.copy":["Cmd+Alt+C"]}))
 await page.keyboard.press("Meta+v");await settle(page);assert.equal(await page.getByLabel("API Key").inputValue(),"public-fixture")
 await page.keyboard.press("Meta+Alt+c");await settle(page)
 assert.deepEqual(await page.evaluate(()=>(window as any).writes),[],"A custom binding cannot re-enable masked copy");assert.equal(await page.evaluate(()=>(window as any).copyEvents),0)
 await page.keyboard.press("Meta+Alt+v");await settle(page);assert.equal(await page.getByLabel("API Key").inputValue(),"paste-fixture-fixture")
}))
test("K06: actual DOM focus A to B to A revokes a pending plaintext menu choice",async()=>scenario(async page=>{
 await toggle(page);await select(page)
 await page.evaluate(()=>{(window as any).gate('menu')});await dispatchMenu(page);await settle(page)
 assert.equal((await lastMenu(page)).commands["text.copy"],true)
 await page.locator("#outside").focus();await page.getByLabel("API Key").focus();await page.evaluate(()=>(window as any).release('text.cut'));await settle(page)
 assert.deepEqual(await page.evaluate(()=>(window as any).writes),[])
 assert.equal(await page.getByLabel("API Key").inputValue(),"public-fixture");assert.equal(await page.evaluate(()=>(window as any).keyState),"public-fixture")
}))
