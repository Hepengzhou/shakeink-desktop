import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { build } from "esbuild"
import ts from "typescript"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import type { Browser, Page } from "playwright-core"

// The real caption is extracted, not a reimplementation of its drawer controls.
const chatSource = ts.createSourceFile("ChatPanel.tsx", readFileSync("src/components/layout/ChatPanel.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let header = ""
function findHeader(node: ts.Node) {
  if (ts.isJsxElement(node)) {
    const attr = node.openingElement.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(chatSource) === "className")
    if (attr && ts.isJsxAttribute(attr) && attr.initializer && ts.isStringLiteral(attr.initializer) && /\bdesktop-drag\b/.test(attr.initializer.text) && /\bh-11\b/.test(attr.initializer.text)) header = node.getText(chatSource)
  }
  ts.forEachChild(node, findHeader)
}
findHeader(chatSource)
assert(header, "The real ChatPanel caption must be extractable")

const cssPath = resolve("src/app/globals.css")
const css = postcss([tailwindcss()]).process(readFileSync(cssPath, "utf8"), { from: cssPath }).then(r => r.css + "\n" + readFileSync("src/app/desktop.css", "utf8") + `
.drawer-test-body{height:100%;overflow:auto;padding:20px;font:14px/24px sans-serif;box-sizing:border-box}
.drawer-test-body p{margin:0 0 18px;overflow-wrap:normal;word-break:normal}
.drawer-test-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:18px}
.drawer-test-fields label{display:grid;gap:4px;min-width:0}.drawer-test-fields input{width:100%;min-width:0;border:1px solid;padding:4px;box-sizing:border-box}
.drawer-test-actions{display:flex;gap:12px;flex-wrap:wrap}.drawer-test-actions button{border:1px solid;padding:4px 8px}
`)

const bodySource = `
import React,{useRef,useState} from 'react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './src/components/ui/dropdown-menu';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './src/components/ui/select';
import {TooltipProvider,Tooltip,TooltipTrigger,TooltipContent} from './src/components/ui/tooltip';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription,DialogClose} from './src/components/ui/dialog';
import {useDesktopCommands} from './src/lib/desktop/use-command-target';
let serial=0;
function Choice({name='内容选项'}){const [value,setValue]=useState('one');return <Select value={value} onValueChange={setValue}><SelectTrigger aria-label={name}><SelectValue/></SelectTrigger><SelectContent aria-label={name+'列表'}><SelectItem value='one'>第一项</SelectItem><SelectItem value='two'>第二项</SelectItem></SelectContent></Select>}
function Body({tab}){
 const instance=useRef(++serial),editor=useRef(null),[draft,setDraft]=useState(''),[controlled,setControlled]=useState(false),[dialogText,setDialogText]=useState('');
 useDesktopCommands({'fixture.editor':()=>{window.contentFixture.editorCalls++}},editor);
 return <section data-content-instance={instance.current} className='drawer-test-body' data-geometry='body'>
 <p data-lines='first'>这是隔离测试段落，用真实内容外壳检验抽屉运动时文字行框是否保持完整。段落自然换行，测试不会给它添加禁止换行规则，也不会通过固定业务宽度掩盖外壳挤压。它包含足够长的正文来揭示中间动画帧的变化。</p>
 <p data-lines='second'>The drawer must preserve every existing line, field width and relative position while its visible viewport becomes smaller. Natural wrapping remains enabled so a squeezed panel creates an observable regression.</p>
 <div className='drawer-test-fields' data-geometry='fields'><label data-geometry='field-a'><span>第一列字段名称及帮助文字</span><input ref={editor} className='desktop-markdown-editor' aria-label='隔离正文草稿' value={draft} onChange={e=>setDraft(e.target.value)}/></label><label data-geometry='field-b'><span>第二列字段说明</span><input aria-label='隔离第二字段' defaultValue='保持两列布局'/></label></div>
 <div className='drawer-test-actions' data-geometry='actions'>
 <DropdownMenu modal={false}><DropdownMenuTrigger render={<button aria-label='内容菜单'/>}>内容菜单</DropdownMenuTrigger><DropdownMenuContent aria-label='内容菜单浮层'><DropdownMenuItem>隔离菜单选项</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
 <DropdownMenu open={controlled} onOpenChange={setControlled} modal={false}><DropdownMenuTrigger render={<button aria-label='受控内容菜单'/>}>受控菜单</DropdownMenuTrigger><DropdownMenuContent aria-label='受控内容菜单浮层'><DropdownMenuItem>受控隔离菜单选项</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
 <Choice/>
 <TooltipProvider><Tooltip><TooltipTrigger render={<button aria-label='内容提示'/>}>内容提示</TooltipTrigger><TooltipContent>隔离内容提示</TooltipContent></Tooltip></TooltipProvider>
 <Dialog><DialogTrigger render={<button aria-label='业务弹窗'/>}>业务弹窗</DialogTrigger><DialogContent aria-label='隔离业务弹窗'><DialogTitle>隔离业务弹窗</DialogTitle><DialogDescription>实际共享 Dialog，验证输入和内部 Select 的模态边界。</DialogDescription><input aria-label='弹窗文字' value={dialogText} onChange={e=>setDialogText(e.target.value)}/><Choice name='弹窗选项'/><DialogClose render={<button aria-label='保存弹窗'/>}>保存</DialogClose></DialogContent></Dialog>
 </div><div style={{height:1100}}><p data-lines='third'>滚动内容用于确认保留业务实例、草稿、选区及滚动位置。此区域仅是隔离数据，不能替代真实 Monaco 或数据库验收。</p></div>
 </section>
}
export const renderTabContent=tab=><Body tab={tab}/>;
export const StagedSaveSurface=({children})=>children;export const StagedInterceptionBootstrap=()=>null;export const StorySources=()=>null;export const StoryActivityBanner=()=>null;export const StoryLivePreview=()=>null;
`

// Real DashboardShell, useSidebarDrawer, Group/Panel, SidebarTree, ContentTabs,
// stores, command runtime and UI primitives. Only unrelated bodies are isolated.
// Capturing ContentTabs props invokes the real Shell callbacks during inert frames.
const bundle = build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {ThemeProvider} from 'next-themes';
import {DashboardShell} from './src/components/layout/DashboardShell';import {useTabsStore,buildTabId} from './src/stores/tabs';import {useDesktopStore} from './src/stores/desktop';
import {desktopWorkspaceDraftSource} from './src/lib/desktop/workspace-draft-source';
import {desktopCommandTargets,rememberDesktopCommandTarget,desktopEditorTarget} from './src/lib/desktop/command-runtime';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './src/components/ui/dropdown-menu';
function External(){return <aside style={{position:'fixed',bottom:0,left:0,zIndex:40}}><button aria-label='外部焦点'>外部焦点</button><DropdownMenu modal={false}><DropdownMenuTrigger render={<button aria-label='内容外菜单'/>}>内容外菜单</DropdownMenuTrigger><DropdownMenuContent aria-label='内容外菜单浮层'><DropdownMenuItem>内容外菜单选项</DropdownMenuItem></DropdownMenuContent></DropdownMenu></aside>}
window.mountContentDrawer=(theme='ink')=>{
 window.desktop={};document.documentElement.className=theme;document.body.dataset.platform='win32';
 useDesktopStore.setState({bootstrap:{platform:'win32',dataRoot:'isolated-only',settings:{appearance:{zoom:1},shortcuts:{win32:{},darwin:{}}}}});useTabsStore.setState({tabs:[],activeTabId:null,activationNonce:0,subTabs:{}});
 const query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});query.setQueryData(['novels'],{novels:[],unavailableWorks:[]});query.setQueryData(['chat-conversations'],[]);
 const requests=[];window.fetch=async(path)=>{requests.push(String(path));return new Response(JSON.stringify(String(path).includes('conversations')?{conversations:[]}:{novels:[],unavailableWorks:[]}))};
 const root=createRoot(document.getElementById('app'));let nonce=0;
 window.contentFixture={requests,editorCalls:0,open:(count=1)=>{const tabs=Array.from({length:count},(_,i)=>({id:buildTabId('theme','isolated-'+i),type:'theme',novelId:'isolated-'+i,title:'隔离内容长标题 '+i}));flushSync(()=>useTabsStore.setState({tabs,activeTabId:tabs[0].id,activationNonce:++nonce}))},activate:()=>flushSync(()=>useTabsStore.setState(s=>({activationNonce:s.activationNonce+1}))),hide:()=>window.contentFixture.props.onToggleContent(),fullscreen:()=>window.contentFixture.props.onToggleFullscreen(),toggle:()=>desktopCommandTargets.execute('view.content',null),sidebar:()=>desktopCommandTargets.execute('view.sidebar',null),read:()=>desktopWorkspaceDraftSource.read().layout,restore:layout=>desktopWorkspaceDraftSource.restore({...desktopWorkspaceDraftSource.read(),layout}),editorTarget:()=>desktopEditorTarget()?.getAttribute('aria-label')??null,remember:()=>rememberDesktopCommandTarget(document.querySelector('[aria-label="隔离正文草稿"]')),editorEnabled:()=>desktopCommandTargets.enabled('fixture.editor',document.querySelector('[aria-label="隔离正文草稿"]')),edit:()=>desktopCommandTargets.execute('fixture.editor',document.querySelector('[aria-label="隔离正文草稿"]')),unmount:()=>flushSync(()=>root.unmount())};
 flushSync(()=>root.render(<QueryClientProvider client={query}><ThemeProvider attribute='class' forcedTheme={theme}><DashboardShell user={{id:'content-drawer-fixture',name:'隔离用户',email:'content-drawer@example.invalid'}}/><External/></ThemeProvider></QueryClientProvider>));
};` }, bundle: true, loader: { ".css": "empty" }, platform: "browser", format: "iife", write: false, tsconfig: "tsconfig.json", plugins: [{ name: "isolated-content-body-real-shell", setup(api) {
  api.onResolve({ filter: /^\.\/ChatPanel$/ }, () => ({ path: "chat-caption", namespace: "content-drawer-chat" }))
  api.onLoad({ filter: /.*/, namespace: "content-drawer-chat" }, () => ({ loader: "tsx", resolveDir: process.cwd(), contents: `import React,{useRef,useState} from 'react';import {PanelLeft,PanelRight,MessageSquare} from 'lucide-react';import {useDesktopStore} from './src/stores/desktop';let serial=0;export function ChatPanel({sidebarHidden,onShowSidebar,contentHidden,onShowContent}){const instance=useRef(++serial),[draft,setDraft]=useState('');const desktopBootstrap=useDesktopStore(s=>s.bootstrap),messages=[],currentConversation=null;return <div className='chatpane' data-chat-instance={instance.current} style={{height:'100%'}}>${header}<input aria-label='隔离对话草稿' value={draft} onChange={e=>setDraft(e.target.value)}/></div>}` }))
  api.onResolve({ filter: /^\.\/ContentTabs$/ }, () => ({ path: "content-props", namespace: "content-drawer-props" }))
  api.onLoad({ filter: /.*/, namespace: "content-drawer-props" }, () => ({ loader: "tsx", resolveDir: process.cwd(), contents: `import React from 'react';import {ContentTabs as Real} from './src/components/layout/ContentTabs';export function ContentTabs(props){window.contentFixture.props=props;return <Real {...props}/>}` }))
  api.onResolve({ filter: /^@\/components\/content\/(registry|StagedSaveSurface|StoryWorkflowPanel)$/ }, args => ({ path: args.path, namespace: "content-drawer-body" }))
  api.onLoad({ filter: /.*/, namespace: "content-drawer-body" }, () => ({ loader: "tsx", resolveDir: process.cwd(), contents: bodySource }))
} }] }).then(r => r.outputFiles![0].text)

export async function withContentDrawer(browser: Browser, options: { width?: number; height?: number; theme?: "ink" | "paper"; reduced?: boolean }, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: options.width ?? 1280, height: options.height ?? 760 }, reducedMotion: options.reduced ? "reduce" : "no-preference" }), errors: string[] = []
  page.setDefaultTimeout(5000)
  page.on("pageerror", e => errors.push(e.message))
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()) })
  try {
    await page.route("**/*", route => route.abort()); await page.setContent('<div id="app"></div>')
    // tsx preserves function names with this pure annotation helper when Node
    // serializes nested callbacks to Playwright; it has no application behavior.
    await page.evaluate("window.__name = (value) => value")
    await page.addStyleTag({ content: await css }); await page.addScriptTag({ content: await bundle })
    await page.evaluate(theme => (window as any).mountContentDrawer(theme), options.theme ?? "ink")
    await page.waitForTimeout(80)
    assert.equal(await page.locator(".dashboard-shell").count(), 1, "Real DashboardShell mounted before behavioral assertions")
    await run(page); assert.deepEqual(errors, [], "Content drawer fixture has no page errors")
  } catch (error) { throw new Error(`${error instanceof Error ? error.stack : String(error)}\nFixture page errors: ${errors.join("; ")}`) } finally { await page.close() }
}

export type ContentSample = {
  time: number; phase?: string; sidebarPhase?: string; mode?: string; pane?: string; exists: boolean;
  width: number; height: number; visible: number; x: number; viewportRight: number; innerRight: number; translate: number; inert: boolean;
  geometry: Record<string, number[]>; lines: Record<string, number[][]>; caption: number[]; captionPadding: string; captionScale: string; region: string;
}

// Runs in the page. The old implementation has no fixed inner: measure its real
// ContentTabs instead, so RED is a measured width/line failure, not a missing hook.
function captureSample(): ContentSample {
  const root = document.querySelector<HTMLElement>(".dashboard-shell")!, viewport = document.querySelector<HTMLElement>(".content-drawer-viewport") ?? document.querySelector<HTMLElement>("#content"), inner = document.querySelector<HTMLElement>(".content-drawer-inner") ?? document.querySelector<HTMLElement>(".content-tabs")
  const empty = { time: performance.now(), phase: root.dataset.contentPhase, sidebarPhase: root.dataset.sidebarPhase, mode: root.dataset.drawerMode, pane: root.dataset.narrowPane, exists: false, width: 0, height: 0, visible: 0, x: 0, viewportRight: 0, innerRight: 0, translate: 0, inert: false, geometry: {}, lines: {}, caption: [], captionPadding: "", captionScale: "", region: "" }
  if (!inner || !viewport) return empty
  const i = inner.getBoundingClientRect(), v = viewport.getBoundingClientRect(), geometry: Record<string, number[]> = {}, lines: Record<string, number[][]> = {}
  const rect = (b: DOMRect) => [b.x - i.x, b.y - i.y, b.width, b.height]
  for (const el of inner.querySelectorAll<HTMLElement>("[data-geometry]")) if (!el.closest("[hidden]")) geometry[el.dataset.geometry!] = rect(el.getBoundingClientRect())
  for (const el of inner.querySelectorAll<HTMLElement>("[data-lines]")) if (!el.closest("[hidden]")) { const range = document.createRange(); range.selectNodeContents(el); lines[el.dataset.lines!] = Array.from(range.getClientRects(), rect) }
  const caption = inner.querySelector<HTMLElement>(".desktop-drag")!, style = caption ? getComputedStyle(caption) : null, transform = getComputedStyle(inner).transform
  return { ...empty, exists: true, width: i.width, height: i.height, visible: v.width, x: i.x, viewportRight: v.right, innerRight: i.right, translate: transform === "none" ? 0 : new DOMMatrix(transform).m41, inert: !!inner.closest("[inert]"), geometry, lines, caption: caption ? rect(caption.getBoundingClientRect()) : [], captionPadding: style?.paddingRight ?? "", captionScale: getComputedStyle(inner).getPropertyValue("--content-tab-scale").trim(), region: style?.getPropertyValue("-webkit-app-region") ?? "" }
}

export async function sampleContent(page: Page): Promise<ContentSample> { return page.evaluate(captureSample) }
export async function framesDuring(page: Page, action: () => Promise<unknown>, duration = 720): Promise<ContentSample[]> {
  await page.evaluate(({ source, duration }) => {
    const sample = new Function(`return (${source})`)(), samples: ContentSample[] = [sample()], start = performance.now()
    ;(window as any).contentFramePromise = new Promise(resolve => {
      const step = () => { samples.push(sample()); if (performance.now() - start < duration) requestAnimationFrame(step); else resolve(samples) }
      requestAnimationFrame(step)
    })
  }, { source: captureSample.toString(), duration })
  await action()
  return page.evaluate(() => (window as any).contentFramePromise)
}

export async function openContent(page: Page, count = 1) {
  await page.evaluate(count => (window as any).contentFixture.open(count), count)
  await page.waitForTimeout(680)
  assert.equal(await page.locator('[data-content-instance]').count(), count, "Isolated business body exists inside real ContentTabs")
  assert.equal((await sampleContent(page)).exists, true)
}

function near(actual: number, expected: number, title: string, tolerance = .35) { assert(Math.abs(actual - expected) <= tolerance, `${title}: actual ${actual}, expected ${expected}`) }
function arraysNear(actual: number[], expected: number[], title: string) { assert.equal(actual.length, expected.length, `${title} rect arity`); actual.forEach((value, index) => near(value, expected[index], `${title}[${index}]`)) }

export function assertFixedFrames(samples: ContentSample[], reference: ContentSample, label: string, options: { requireMoving?: boolean; translation?: boolean } = {}) {
  const phaseMoving = (sample: ContentSample) => sample.phase === "opening" || sample.phase === "closing"
  const firstExisting = samples.findIndex(sample => sample.exists)
  assert(firstExisting >= 0, `${label}: real content exists in the captured sequence`)
  const initial = samples[firstExisting], terminal = samples.at(-1)!
  const phaseStart = samples.findIndex(phaseMoving)
  // Geometry, not a production phase flag, determines the interval. In
  // particular a prematurely-set open/closed flag cannot hide later reflow.
  const visibleStart = firstExisting > 0 ? firstExisting : samples.findIndex((sample, index) => index > firstExisting && sample.exists && Math.abs(sample.visible - initial.visible) > .35)
  const starts = [phaseStart, visibleStart].filter(index => index >= 0)
  const start = starts.length ? Math.min(...starts) : firstExisting
  let lastNonterminal = -1, lastMovingPhase = -1
  samples.forEach((sample, index) => {
    if (index >= start && sample.exists && Math.abs(sample.visible - terminal.visible) > .35) lastNonterminal = index
    if (index >= start && phaseMoving(sample)) lastMovingPhase = index
  })
  const end = Math.max(lastNonterminal, lastMovingPhase)
  const moving = samples.slice(start, end + 1).filter(sample => sample.exists)
  if (options.requireMoving !== false) assert(moving.length >= 8, `${label}: continuous rAF capture requires at least 8 moving frames; got ${moving.length}`)
  for (const [index, sample] of moving.entries()) {
    near(sample.width, reference.width, `${label} frame ${index} fixed inner width`)
    near(sample.height, reference.height, `${label} frame ${index} fixed inner height`)
    for (const [key, expected] of Object.entries(reference.geometry)) arraysNear(sample.geometry[key] ?? [], expected, `${label} frame ${index} ${key}`)
    for (const [key, expected] of Object.entries(reference.lines)) {
      assert.equal(sample.lines[key]?.length, expected.length, `${label} frame ${index} ${key} line count`)
      expected.forEach((line, n) => arraysNear(sample.lines[key][n], line, `${label} frame ${index} ${key} line ${n}`))
    }
    arraysNear(sample.caption, reference.caption, `${label} frame ${index} caption`)
    assert.equal(sample.captionPadding, reference.captionPadding, `${label} caption safe padding`)
    assert.equal(sample.captionScale, reference.captionScale, `${label} caption scale`)
    if (options.translation !== false) {
      near(sample.translate, Math.max(sample.width - sample.visible, 0), `${label} frame ${index} mirrored drawer translation`)
      near(sample.innerRight - sample.viewportRight, sample.translate, `${label} frame ${index} right anchor`)
    }
    if (Math.abs(sample.visible - terminal.visible) > .35) assert(phaseMoving(sample), `${label} frame ${index}: nonterminal visible width ${sample.visible} requires a moving phase, got ${sample.phase}`)
  }
  return moving
}
