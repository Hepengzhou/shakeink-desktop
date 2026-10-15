import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { build } from "esbuild"
import ts from "typescript"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import type { Browser, Page } from "playwright-core"
import type { WorkspaceLayout } from "../../src/lib/desktop/workspace-draft-source"

const driverTimings = new WeakMap<Page, { label: string; start: number; end: number }[]>()
let diagnosticSerial = 0
export async function recordDrawerDriverAction(page: Page, label: string, action: () => Promise<unknown>) {
  const start = Date.now()
  try { return await action() } finally {
    const timings = driverTimings.get(page) ?? []
    timings.push({ label, start, end: Date.now() }); driverTimings.set(page, timings)
  }
}

const chatSource = ts.createSourceFile("ChatPanel.tsx", readFileSync("src/components/layout/ChatPanel.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let header = ""
function visit(node: ts.Node) {
  if (ts.isJsxElement(node)) {
    const attr = node.openingElement.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(chatSource) === "className")
    if (attr && ts.isJsxAttribute(attr) && attr.initializer && ts.isStringLiteral(attr.initializer) && /\bdesktop-drag\b/.test(attr.initializer.text) && /\bh-11\b/.test(attr.initializer.text)) header = node.getText(chatSource)
  }
  ts.forEachChild(node, visit)
}
visit(chatSource); assert(header, "The current real ChatPanel caption must be available")
const cssPath = resolve("src/app/globals.css")
const css = postcss([tailwindcss()]).process(readFileSync(cssPath, "utf8"), { from: cssPath }).then(r => r.css + "\n" + readFileSync("src/app/desktop.css", "utf8"))
// Real DashboardShell, SidebarTree, Group/Panel, stores, adapter and ContentTabs.
// Only AI body side effects and unrelated business panel bodies are isolated.
// This test does not prove database/IPC or native caption hit testing.
const bundle = build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {ThemeProvider} from 'next-themes';
import {DashboardShell} from './src/components/layout/DashboardShell';import {useTabsStore,buildTabId} from './src/stores/tabs';import {useDesktopStore} from './src/stores/desktop';
import {ContentTabs} from './src/components/layout/ContentTabs';
import {desktopWorkspaceDraftSource} from './src/lib/desktop/workspace-draft-source';
window.mountDrawer=(theme='ink',captionOnly=false,initialLayout=null,observeLayout=false)=>{
 window.desktop={}; document.documentElement.className=theme;document.body.dataset.platform='win32';
 window.drawerLayoutObservation=observeLayout?{writes:[],changes:[],panelConfigs:{},groupDefaults:[]}:null;
 useDesktopStore.setState({bootstrap:{platform:'win32',dataRoot:'isolated-only',settings:{appearance:{zoom:1},shortcuts:{win32:{},darwin:{}}}}});
 useTabsStore.setState({tabs:[],activeTabId:null,activationNonce:0,subTabs:{}});
 if(initialLayout){const id=buildTabId('theme','isolated');desktopWorkspaceDraftSource.restore({version:1,tabs:initialLayout.contentVisible?[{id,type:'theme',novelId:'isolated',title:'隔离内容'}]:[],activeTabId:initialLayout.contentVisible?id:null,subTabs:{},layout:initialLayout})}
 const query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});query.setQueryData(['novels'],{novels:[],unavailableWorks:[]});query.setQueryData(['chat-conversations'],[]);
 const requests=[];window.fetch=async(path)=>{requests.push(String(path));return new Response(JSON.stringify(String(path).includes('conversations')?{conversations:[]}:{novels:[],unavailableWorks:[]}))};
 const calls=[],root=createRoot(document.getElementById('app'));flushSync(()=>root.render(<QueryClientProvider client={query}><ThemeProvider attribute='class' forcedTheme={theme}>{captionOnly?<div className='workspace-content' style={{height:500}}><ContentTabs fullscreen sidebarHidden onShowSidebar={()=>calls.push('sidebar')} onToggleFullscreen={()=>calls.push('fullscreen')} onToggleContent={()=>calls.push('content')}/></div>:<DashboardShell user={{id:'drawer-fixture',name:'隔离用户',email:'drawer@example.invalid'}}/>}</ThemeProvider></QueryClientProvider>));
 window.drawerSeedNavigation=()=>{const novel={id:'hover-work',title:'隔离悬停作品',coverUrl:null};for(const [key,value] of [['worlds',{worlds:[]}],['characters',{characters:[]}],['foreshadow-characters',{foreshadowCharacters:[]}],['cascade',{pendingCount:0}],['novels',{novel:{...novel,characters:[],volumes:[]}}]])query.setQueryData([key,novel.id],value);query.setQueryData(['novels'],{novels:[novel],unavailableWorks:[]})};
 let serial=0;window.drawerFixture={requests,calls,appearance:(platform,zoom)=>{document.body.dataset.platform=platform;document.documentElement.style.setProperty('--desktop-caption-zoom',String(zoom));flushSync(()=>useDesktopStore.setState({bootstrap:{platform,dataRoot:'isolated-only',settings:{appearance:{zoom},shortcuts:{win32:{},darwin:{}}}}}))},open:()=>{const id=buildTabId('theme','isolated');flushSync(()=>useTabsStore.setState({tabs:[{id,type:'theme',novelId:'isolated',title:'隔离内容'}],activeTabId:id,activationNonce:++serial}))},read:()=>desktopWorkspaceDraftSource.read().layout,restore:layout=>desktopWorkspaceDraftSource.restore({...desktopWorkspaceDraftSource.read(),layout}),unmount:()=>flushSync(()=>root.unmount())};
};` }, bundle: true, loader: { ".css": "empty" }, platform: "browser", format: "iife", write: false, tsconfig: "tsconfig.json", plugins: [{ name: "unrelated-chat-and-content-bodies", setup(api) {
  api.onResolve({ filter: /^react-resizable-panels$/ }, () => ({ path: "real-layout-observer", namespace: "drawer-layout-observer" }))
  api.onLoad({ filter: /.*/, namespace: "drawer-layout-observer" }, () => ({ loader: "tsx", resolveDir: process.cwd(), contents: `
import React,{useCallback} from 'react';import {Group as ActualGroup,Panel as ActualPanel} from '${resolve("node_modules/react-resizable-panels/dist/react-resizable-panels.js").replaceAll("\\", "/")}';
export * from '${resolve("node_modules/react-resizable-panels/dist/react-resizable-panels.js").replaceAll("\\", "/")}';
// Observation only: original Group/Panel still own registration, constraints,
// reallocation, resize and public API. No layout result is altered here.
export function Group(props){
 const geometry=()=>Object.fromEntries([...document.querySelectorAll('.workspace-group > [data-panel]')].map(panel=>{const r=panel.getBoundingClientRect(),s=getComputedStyle(panel);return[panel.id,{width:r.width,height:r.height,flexGrow:s.flexGrow,flexShrink:s.flexShrink,flexBasis:s.flexBasis,display:s.display}]}));
 const observed=useCallback(handle=>{const observation=window.drawerLayoutObservation;
  const forwarded=handle&&observation?{getLayout:()=>handle.getLayout(),setLayout:sizes=>{const event={time:performance.now(),input:structuredClone(sizes),before:structuredClone(handle.getLayout()),panels:geometry()};const result=handle.setLayout(sizes);observation.writes.push({...event,result:structuredClone(result),after:structuredClone(handle.getLayout())});return result}}:handle;
  if(observation)observation.api=forwarded;
  if(typeof props.groupRef==='function')props.groupRef(forwarded);else if(props.groupRef)props.groupRef.current=forwarded;
 },[props.groupRef]);
 if(window.drawerLayoutObservation)window.drawerLayoutObservation.groupDefaults.push({time:performance.now(),layout:props.defaultLayout?structuredClone(props.defaultLayout):null});
 const changed=useCallback((layout,metadata)=>{const observation=window.drawerLayoutObservation;if(observation)observation.changes.push({time:performance.now(),layout:structuredClone(layout),metadata:structuredClone(metadata),panels:geometry()});props.onLayoutChanged?.(layout,metadata)},[props.onLayoutChanged]);
 return <ActualGroup {...props} groupRef={window.drawerLayoutObservation?observed:props.groupRef} onLayoutChanged={window.drawerLayoutObservation?changed:props.onLayoutChanged}/>;
}
export function Panel(props){if(window.drawerLayoutObservation)window.drawerLayoutObservation.panelConfigs[props.id]={min:props.minSize,max:props.maxSize,default:props.defaultSize,resize:props.groupResizeBehavior};return <ActualPanel {...props}/>}
` }))
  api.onResolve({ filter: /^\.\/ChatPanel$/ }, () => ({ path: "chat-caption", namespace: "drawer-fixture" }))
  api.onLoad({ filter: /.*/, namespace: "drawer-fixture" }, () => ({ loader: "tsx", resolveDir: process.cwd(), contents: `import React,{useRef,useState} from 'react';import {PanelLeft,PanelRight,MessageSquare} from 'lucide-react';import {useDesktopStore} from './src/stores/desktop';let serial=0;export function ChatPanel({sidebarHidden,onShowSidebar,contentHidden,onShowContent}){const instance=useRef(++serial),[draft,setDraft]=useState('');const desktopBootstrap=useDesktopStore(s=>s.bootstrap),messages=[],currentConversation=null;return <div className='chatpane' data-chat-instance={instance.current} style={{height:'100%'}}>${header}<input aria-label='隔离对话草稿' value={draft} onChange={e=>setDraft(e.target.value)}/></div>}` }))
  api.onResolve({ filter: /^@\/components\/content\/(registry|StagedSaveSurface|StoryWorkflowPanel)$/ }, args => ({ path: args.path, namespace: "drawer-content" }))
  api.onLoad({ filter: /.*/, namespace: "drawer-content" }, () => ({ loader: "tsx", resolveDir: process.cwd(), contents: `import React,{useRef,useState} from 'react';let serial=0;function Body({tab}){const instance=useRef(++serial),[draft,setDraft]=useState('');return <section data-content-instance={instance.current}><input aria-label='隔离正文草稿' value={draft} onChange={e=>setDraft(e.target.value)}/></section>}export const renderTabContent=tab=><Body tab={tab}/>;export const StagedSaveSurface=({children})=>children;export const StagedInterceptionBootstrap=()=>null;export const StorySources=()=>null;export const StoryActivityBanner=()=>null;export const StoryLivePreview=()=>null;` }))
} }] }).then(r => r.outputFiles![0].text)

export async function withDrawer(browser: Browser, options: { width?: number; height?: number; deviceScaleFactor?: number; theme?: "ink" | "paper"; reduced?: boolean; emptyCaption?: boolean; initialLayout?: WorkspaceLayout; observeLayout?: boolean }, run: (page: Page) => Promise<void>) {
  const diagnosticId = ++diagnosticSerial
  const page = await browser.newPage({ viewport: { width: options.width ?? 1280, height: options.height ?? 700 }, deviceScaleFactor: options.deviceScaleFactor ?? 1, reducedMotion: options.reduced ? "reduce" : "no-preference" }), errors: string[] = []
  page.setDefaultTimeout(5000)
  page.on("pageerror", e => errors.push(e.message))
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()) })
  try {
    await page.route("**/*", route => route.abort()); await page.setContent('<div id="app"></div>'); await page.addStyleTag({ content: await css }); await page.addScriptTag({ content: await bundle })
    if(options.observeLayout || process.env.SHAKEINK_REGRESSION_DIAGNOSTIC)await page.evaluate('globalThis.__name=target=>target')
    await page.evaluate(args => (window as any).mountDrawer(args.theme, args.emptyCaption, args.initialLayout, args.observeLayout), { theme: options.theme ?? "ink", emptyCaption: options.emptyCaption ?? false, initialLayout: options.initialLayout ?? null, observeLayout: options.observeLayout ?? false })
    await page.waitForTimeout(80); assert(await page.locator(options.emptyCaption ? ".content-tabs" : ".dashboard-shell").count(), `Real component not mounted: ${await page.locator("#app").innerHTML()}`)
    if (process.env.SHAKEINK_REGRESSION_DIAGNOSTIC && !options.emptyCaption) await page.evaluate(() => {
      const diagnostic = { frames: [] as any[], events: [] as any[] }; (window as any).sideDriverDiagnostic = diagnostic
      const snapshot = () => {
        const shell = document.querySelector<HTMLElement>('.dashboard-shell')!, inner = document.querySelector('.sidebar-drawer-inner')!, panel = document.querySelector('#sidebar')!, caption = inner.querySelector('.desktop-sidebar-controls')!
        const i = inner.getBoundingClientRect(), v = panel.getBoundingClientRect(), c = caption.getBoundingClientRect(), right = document.querySelector('.content-drawer-inner')?.getBoundingClientRect(), rv = document.querySelector('.content-drawer-viewport')?.getBoundingClientRect()
        return { time: performance.now(), wall: Date.now(), phase: shell.dataset.sidebarPhase, contentPhase: shell.dataset.contentPhase, mode: shell.dataset.drawerMode, pane: shell.dataset.narrowPane, width: i.width, height: i.height, visible: v.width, offset: new DOMMatrix(getComputedStyle(inner).transform).m41, caption: { x: c.x - i.x, y: c.y - i.y, width: c.width, height: c.height }, contentW: right?.width, contentV: rv?.width, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio } }
      }
      for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
        const pointer = event as PointerEvent, target = event.target as HTMLElement, button = target.closest('button')
        diagnostic.events.push({ type, trusted: event.isTrusted, clientX: pointer.clientX, clientY: pointer.clientY, target: { tag: target.tagName, id: target.id, aria: button?.getAttribute('aria-label'), text: button?.textContent, inert: !!target.closest('[inert]') }, ...snapshot() })
      }, true)
      const tick = () => { diagnostic.frames.push(snapshot()); requestAnimationFrame(tick) }
      tick()
    })
    await run(page); assert.deepEqual(errors, [], "Real drawer shell has no page errors")
  } catch (error) { throw new Error(`${error instanceof Error ? error.stack : String(error)}\nFixture page errors: ${errors.join("; ")}\n${await page.locator("#app").innerText()}`) } finally {
    if (process.env.SHAKEINK_REGRESSION_DIAGNOSTIC && !options.emptyCaption) {
      await mkdir(process.env.SHAKEINK_REGRESSION_DIAGNOSTIC, { recursive: true })
      await writeFile(`${process.env.SHAKEINK_REGRESSION_DIAGNOSTIC}/${basename(process.argv[1] ?? 'sidebar')}-${diagnosticId}-${options.width ?? 1280}-${options.initialLayout ? 'saved' : 'new'}.json`, JSON.stringify({ options, errors, driverTimings: driverTimings.get(page), trace: await page.evaluate(() => (window as any).sideDriverDiagnostic), resizeFrames: await page.evaluate(async () => await (window as any).drawerResizeFrames ?? null) }, null, 2) + "\n")
    }
    await page.close()
  }
}

export async function sampleDrawer(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".dashboard-shell")!, inner = document.querySelector<HTMLElement>(".sidebar-drawer-inner")!, outer = document.querySelector<HTMLElement>("#sidebar")!
    const caption = inner.querySelector<HTMLElement>(".desktop-sidebar-controls")!, create = inner.querySelector<HTMLElement>('button[aria-label="创建作品"]') ?? inner.querySelector<HTMLElement>("button")!
    const i = inner.getBoundingClientRect(), o = outer.getBoundingClientRect(), c = caption.getBoundingClientRect(), b = create.getBoundingClientRect()
    return { phase: root.dataset.sidebarPhase, mode: root.dataset.drawerMode, width: i.width, height: i.height, captionTop: c.top, visible: o.width, translate: new DOMMatrix(getComputedStyle(inner).transform).m41, relativeCaption: { x: c.x - i.x, y: c.y - i.y, width: c.width, height: c.height }, relativeButton: { x: b.x - i.x, y: b.y - i.y, width: b.width, height: b.height }, inert: !!inner.closest("[inert]"), style: { font: getComputedStyle(create).fontSize, whiteSpace: getComputedStyle(create).whiteSpace } }
  })
}
