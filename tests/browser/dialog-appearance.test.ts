import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { build } from "esbuild"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { chromium, type Browser, type Locator, type Page } from "playwright-core"

// DIA-01..08 appearance/interaction checks only. React, installed Base UI,
// shared UI, CreateNovelDialog, ScenarioPanel/ChatView/ConfigForm and product
// CSS are real. Their GET data below are isolated memory fixtures, not local
// database, supplier, native Electron, installed-package or business proof.
// Settings layout and planning/foreshadow elements are explicitly CSS probes.
// Scenario prose stays empty. Its unrelated lazy Monaco module is replaced
// by a throwing boundary, so accidentally rendering it fails this fixture.
const stylesheet = (async () => {
  const path = resolve("src/app/globals.css")
  const [globals, desktop] = await Promise.all([
    readFile(path, "utf8"), readFile(resolve("src/app/desktop.css"), "utf8"),
  ])
  return (await postcss([tailwindcss()]).process(`${globals}\n${desktop}`, { from: path })).css
})()

const bundle = build({
  stdin: { loader: "tsx", resolveDir: process.cwd(), sourcefile: "dialog-appearance-fixture.tsx", contents: `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription} from './src/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from './src/components/ui/dropdown-menu';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './src/components/ui/select';
import {TooltipProvider,Tooltip,TooltipTrigger,TooltipContent} from './src/components/ui/tooltip';
import {ModelChoiceSelect} from './src/components/desktop/ModelChoiceSelect';
import {CreateNovelDialog} from './src/components/layout/CreateNovelDialog';
import {ScenarioPanel} from './src/components/content/scenario/ScenarioPanel';
import {onboardingDialogGuard} from './src/lib/desktop/onboarding-flow';
import {useChatStore} from './src/stores/chat';
import planning from './src/components/content/planning/planning.module.css';

function Shared({kind}) {
 const [open,setOpen]=useState(false),[inner,setInner]=useState(false);
 const guarded=kind==='guard';
 return <><input aria-label='背景输入' defaultValue='隔离背景'/><button onClick={()=>globalThis.backgroundClicks++}>背景按钮</button>
 <Dialog open={open} onOpenChange={guarded?onboardingDialogGuard:setOpen} disablePointerDismissal={guarded||undefined}>
  <DialogTrigger onClick={()=>setOpen(true)}>打开对话框</DialogTrigger>
  <DialogContent showCloseButton={!guarded} className={kind==='settings'?'desktop-settings':undefined}>
   {kind==='settings'?<><aside className='desktop-settings-nav'><DialogTitle>设置CSS探针</DialogTitle><nav><button>通用</button><button>外观</button></nav></aside><section className='desktop-settings-right'><DialogDescription>真实desktop-settings类，两栏CSS探针。</DialogDescription><input aria-label='设置探针输入'/></section></>:<>
   <DialogTitle>{guarded?'引导guard夹具':'实际共享对话框'}</DialogTitle><DialogDescription>真实共享Base UI配置。</DialogDescription>
   <input aria-label='对话框输入'/><button>父层按钮</button>
   {!guarded&&<Dialog open={inner} onOpenChange={setInner}><DialogTrigger>打开内层</DialogTrigger><DialogContent><DialogTitle>实际内层对话框</DialogTitle><DialogDescription>真实嵌套Portal。</DialogDescription><input aria-label='内层输入'/><button>内层按钮</button></DialogContent></Dialog>}
   </>}
  </DialogContent>
 </Dialog></>;
}
function Wizard() {
 const [open,setOpen]=useState(false);
 return <><button onClick={()=>setOpen(true)}>打开原创作向导</button><CreateNovelDialog open={open} onOpenChange={setOpen} novels={[]}/></>;
}
function PlanningProbe({kind}) {
 // These four names correspond to the four real PlanningWorkspace render
 // branches. Only their actual CSS module selectors/layout are exercised here.
 const drawer=kind==='period-detail'||kind==='event-detail';
 return <div data-testid='planning-overlay' role='dialog' aria-label={'规划CSS探针 '+kind} className={planning.dialog+(drawer?' '+planning.eventDrawer:'')}>
 {kind==='create-form'?<form data-testid='planning-surface'><h3>规划创建表单CSS探针</h3><input aria-label='规划探针输入'/><button type='button'>关闭</button></form>:<div className={planning.detail} data-testid='planning-surface'><h3>{kind} CSS探针</h3><button>关闭</button></div>}
 </div>;
}
function Exclusions() {
 const [choice,setChoice]=useState(null);
 return <div style={{padding:40,display:'flex',gap:20,alignItems:'start'}}>
 <DropdownMenu><DropdownMenuTrigger>打开实际菜单</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>菜单项目</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
 <Select items={[{value:'a',label:'选项甲'}]}><SelectTrigger aria-label='打开实际Select'><SelectValue placeholder='选择'/></SelectTrigger><SelectContent><SelectItem value='a'>选项甲</SelectItem></SelectContent></Select>
 <TooltipProvider><Tooltip><TooltipTrigger>实际工具提示</TooltipTrigger><TooltipContent>原Tooltip内容</TooltipContent></Tooltip></TooltipProvider>
 <div style={{width:200}}><ModelChoiceSelect label='实际Combobox' value={choice} options={[{id:'local-option',label:'隔离选项'}]} onChange={setChoice}/></div>
 <div data-testid='foreshadow-probe' role='dialog' aria-label='伏笔定位浮窗CSS探针' className='fixed z-[110] rounded-xl border border-border bg-popover text-popover-foreground shadow-2' style={{left:40,top:250}}>原伏笔role与class CSS探针</div>
 <div className='scpane' style={{position:'absolute',left:40,top:340}}><div data-testid='inline-probe' className='sc-config'>内联卡片CSS探针</div></div>
 </div>;
}
globalThis.mountAppearance=({kind,planningKind,status='active'})=>{
 globalThis.backgroundClicks=0;globalThis.fixtureCalls=[];window.desktop={};
 useChatStore.setState({draft:'',accountId:'isolated-dialog-author',recoveryStatus:'ready'});
 const scenario={id:'isolated-lab',novelId:'isolated-novel',title:'样式夹具试验场',cast:[],sceneIds:[],premise:'',prose:'',proseAt:null,status,createdAt:'2026-10-12T00:00:00.000Z',updatedAt:'2026-10-12T00:00:00.000Z'};
 window.fetch=async(input,init={})=>{
  const path=String(input),method=init.method||'GET';globalThis.fixtureCalls.push({path,method});
  if(method!=='GET')throw Error('Appearance fixture forbids mutation '+method+' '+path);
  if(path==='/api/templates/wizard?enabled=true')return Response.json({templates:[{template:{id:'isolated-theme',cat:'theme',title:'样式夹具主题',summary:'仅供对话层检查',channels:[],genres:[],tags:[],prompt:'隔离详情内容'},version:1,enabled:true,source:'user'}],revision:1});
  if(path==='/api/novels/isolated-novel/scenarios/isolated-lab')return Response.json({scenario,turns:[],nodes:[],cards:[]});
  if(path==='/api/novels/isolated-novel/characters')return Response.json({characters:[]});
  if(path==='/api/novels/isolated-novel/scenes')return Response.json({scenes:[]});
  throw Error('Unexpected appearance fixture request '+path);
 };
 const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity},mutations:{retry:false}}});
 const root=createRoot(document.getElementById('app'));
 const content=kind==='wizard'?<Wizard/>:kind==='planning'?<PlanningProbe kind={planningKind}/>:kind==='scenario'?<ScenarioPanel novelId='isolated-novel' refId='isolated-lab'/>:kind==='exclusions'?<Exclusions/>:<Shared kind={kind}/>;
 flushSync(()=>root.render(<QueryClientProvider client={client}>{content}</QueryClientProvider>));
 globalThis.disposeAppearance=()=>{flushSync(()=>root.unmount());client.clear()};
};
` },
  bundle: true, write: false, platform: "browser", format: "iife", tsconfig: "tsconfig.json",
  outfile: "dialog-appearance-fixture.js", loader: { ".css": "local-css" },
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "unmounted-monaco-boundary", setup(build) {
    build.onResolve({ filter: /\/MonacoMarkdownEditor$/ }, () => ({ path: "unmounted-monaco", namespace: "appearance-fixture" }))
    build.onLoad({ filter: /.*/, namespace: "appearance-fixture" }, () => ({
      contents: "export default function MonacoMarkdownEditor(){throw Error('Monaco is outside this appearance fixture')}", loader: "js",
    }))
  } }],
}).then(result => ({
  js: result.outputFiles!.find(file => file.path.endsWith(".js"))!.text,
  css: result.outputFiles!.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n"),
}))

type Theme = "paper" | "ink"
let browser: Browser
test.before(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) })
})
test.after(async () => { await browser?.close() })

async function scenario(theme: Theme, options: Record<string, unknown>, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const errors: string[] = []
  page.setDefaultTimeout(3500)
  page.on("pageerror", error => errors.push(error.message))
  try {
    await page.route("**/*", route => route.request().isNavigationRequest()
      ? route.fulfill({ contentType: "text/html", body: `<html class="${theme}"><body><div id="app" style="height:100vh"></div></body></html>` })
      : route.abort())
    await page.goto("http://127.0.0.1:1/dialog-appearance-isolated")
    const compiled = await bundle
    await page.addStyleTag({ content: `${await stylesheet}\n${compiled.css}` })
    await page.addScriptTag({ content: compiled.js })
    await page.evaluate(options => (window as any).mountAppearance(options), options)
    await run(page)
    assert.deepEqual(errors, [], "appearance fixture must run without page errors")
    assert.ok((await page.evaluate(() => (window as any).fixtureCalls)).every((call: any) => call.method === "GET"), "no mutation or generation may be exercised")
  } finally {
    await page.evaluate(() => (window as any).disposeAppearance?.()).catch(() => {})
    await page.close()
  }
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})))
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
}

async function styleOf(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect()
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")!
    context.fillStyle = style.backgroundColor; context.fillRect(0, 0, 1, 1)
    const rgba = Array.from(context.getImageData(0, 0, 1, 1).data)
    return { background: style.backgroundColor, rgba, backdrop: style.backdropFilter,
      prefixedBackdrop: style.getPropertyValue("-webkit-backdrop-filter"),
      prefixedSupported: CSS.supports("-webkit-backdrop-filter", "none"),
      filter: style.filter, shadow: style.boxShadow, ring: style.getPropertyValue("--tw-ring-shadow"),
      border: style.borderTopWidth, width: box.width, height: box.height, left: box.left, top: box.top,
      position: style.position, classes: element.className }
  })
}

function assertOverlay(style: Awaited<ReturnType<typeof styleOf>>, label: string) {
  assert.deepEqual(style.rgba.slice(0, 3), [0, 0, 0], `${label}: overlay must remain black (${style.background})`)
  assert.ok(Math.abs(style.rgba[3] / 255 - .10) <= 1 / 255, `${label}: expected 10% opacity, got ${style.background}`)
  assert.equal(style.backdrop, "none", `${label}: standard backdrop-filter must not blur`)
  if (style.prefixedSupported) assert.equal(style.prefixedBackdrop, "none", `${label}: supported prefixed backdrop-filter must not blur`)
}

function splitShadows(value: string) {
  const result: string[] = []; let depth = 0, start = 0
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++
    else if (value[i] === ")") depth--
    else if (value[i] === "," && depth === 0) { result.push(value.slice(start, i).trim()); start = i + 1 }
  }
  result.push(value.slice(start).trim()); return result
}

function visibleShadows(value: string) {
  return splitShadows(value).filter(segment => !segment.startsWith("rgba(0, 0, 0, 0) "))
}

async function normalizedShadow(page: Page, value: string) {
  return page.evaluate(value => {
    const reference = document.createElement("div"); reference.style.boxShadow = value
    document.body.append(reference); const result = getComputedStyle(reference).boxShadow; reference.remove(); return result
  }, value)
}

function expectedShadow(theme: Theme) {
  return theme === "paper" ? "0 12px 32px rgba(96,74,38,.14),0 2px 8px rgba(96,74,38,.08)"
    : "0 12px 32px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.18)"
}

async function assertSurface(page: Page, locator: Locator, theme: Theme, ring: boolean, label: string, expectedBorder = "1px") {
  const style = await styleOf(locator), segments = splitShadows(style.shadow)
  const expected = splitShadows(await normalizedShadow(page, expectedShadow(theme)))
  assert.deepEqual(segments.slice(-2), expected, `${label}: exact two theme-specific light shadows must be present (${style.shadow})`)
  if (ring) {
    assert.ok(style.ring.trim(), `${label}: original Tailwind ring variable must remain`)
    assert.ok(segments.some(segment => /0px 0px 0px 1px/.test(segment) && !segment.includes("rgba(0, 0, 0, 0)")), `${label}: computed one-pixel ring must remain visible`)
  } else assert.equal(style.border, expectedBorder, `${label}: original panel border must remain`)
}

async function openShared(page: Page) {
  await page.getByRole("button", { name: "打开对话框", exact: true }).click()
  await page.locator('[data-slot="dialog-content"]').waitFor(); await settle(page)
}

for (const theme of ["paper", "ink"] as const) {
  test(`DIA-01 ${theme}: real shared Base UI backdrop is black 10%, has no blur, and does not filter background`, async () => scenario(theme, { kind: "shared" }, async page => {
    await openShared(page)
    assertOverlay(await styleOf(page.locator('[data-slot="dialog-overlay"]')), `${theme} shared`)
    assert.equal(await page.locator('[aria-label="背景输入"]').evaluate(element => getComputedStyle(element).filter), "none")
    assert.equal(await page.locator("#app").evaluate(element => getComputedStyle(element).filter), "none")
  }))

  test(`DIA-01 ${theme}: real shared surface has both exact light shadows and keeps its original ring`, async () => scenario(theme, { kind: "shared" }, async page => {
    await openShared(page)
    await assertSurface(page, page.locator('[data-slot="dialog-content"]'), theme, true, `${theme} shared`)
  }))

  test(`DIA-02 ${theme}: desktop-settings CSS probe keeps 880px and two columns while removing the old heavy shadow`, async () => scenario(theme, { kind: "settings" }, async page => {
    await openShared(page)
    const surface = page.locator(".desktop-settings"), box = await styleOf(surface)
    assert.equal(box.width, 880); assert.equal(box.height, 680)
    const columns = await page.locator(".desktop-settings").evaluate(element => {
      const nav = element.querySelector(".desktop-settings-nav")!.getBoundingClientRect(), right = element.querySelector(".desktop-settings-right")!.getBoundingClientRect()
      return { width: nav.width, gap: right.left - nav.right, rightWidth: right.width }
    })
    assert.equal(columns.width, 174); assert.equal(columns.gap, 0); assert.ok(columns.rightWidth > 600)
    assert.doesNotMatch(box.shadow, /30px 100px/, "old settings-specific 30px/100px heavy shadow must be gone")
    await assertSurface(page, surface, theme, true, `${theme} wide settings CSS probe`)
  }))

  for (const planningKind of ["create-form", "frozen-period-detail", "period-detail", "event-detail"]) {
    test(`DIA-05 ${theme} ${planningKind}: actual planning CSS-module probe uses black 10%, no blur and light shadow without changing placement`, async () => scenario(theme, { kind: "planning", planningKind }, async page => {
      const overlay = page.getByTestId("planning-overlay"), surface = page.getByTestId("planning-surface")
      await overlay.waitFor(); await settle(page)
      const box = await styleOf(surface), drawer = planningKind === "period-detail" || planningKind === "event-detail"
      if (drawer) { assert.equal(box.width, 420); assert.equal(box.left, 1020); assert.equal(box.top, 0); assert.equal(box.height, 1000) }
      else { assert.equal(box.width, 600); assert.equal(box.left, 420); assert.ok(Math.abs(box.top + box.height / 2 - 500) < 1) }
      assertOverlay(await styleOf(overlay), `${theme} ${planningKind} CSS probe`)
      await assertSurface(page, surface, theme, false, `${theme} ${planningKind} CSS probe`)
    }))
  }

  test(`DIA-06 ${theme}: original wizard local detail has a 10% local backdrop and light shadow; maximum combined dimming is 19%`, async () => scenario(theme, { kind: "wizard" }, async page => {
    await page.getByRole("button", { name: "打开原创作向导" }).click()
    await page.getByRole("button", { name: /样式夹具主题/ }).dblclick()
    await page.getByText("隔离详情内容", { exact: true }).waitFor(); await settle(page)
    const detail = page.getByRole("button", { name: "关闭详情", exact: true }).locator("xpath=../..")
    const localOverlay = detail.locator(".."); const outerOverlay = page.locator('[data-slot="dialog-overlay"]')
    const local = await styleOf(localOverlay), outer = await styleOf(outerOverlay)
    const parent = await styleOf(page.locator('[data-slot="dialog-content"]'))
    assert.equal(local.position, "absolute"); assert.equal(local.width, parent.width); assert.equal(local.height, parent.height)
    assertOverlay(local, `${theme} original wizard local detail`)
    assertOverlay(outer, `${theme} original wizard outer layer`)
    assert.ok(Math.abs((1 - (1 - outer.rgba[3] / 255) * (1 - local.rgba[3] / 255)) - .19) < .004, "two local 10% layers may darken at most the normalized 19% combination")
    await assertSurface(page, detail, theme, false, `${theme} original wizard detail`)
  }))

  test(`DIA-07 ${theme}: original active ScenarioPanel/ConfigForm fixture uses local dialog appearance`, async () => scenario(theme, { kind: "scenario", status: "active" }, async page => {
    // Compare the untouched sc-config CSS in this same theme/context. Paper's
    // pre-existing missing chat-line token yields 0px; do not invent a 1px baseline.
    const baselineBorder = await page.locator(".scpane").evaluate(element => {
      const probe = document.createElement("div"); probe.className = "sc-config"
      element.append(probe); const border = getComputedStyle(probe).borderTopWidth; probe.remove(); return border
    })
    await page.getByRole("button", { name: "配置", exact: true }).click()
    const config = page.getByTestId("scenario-config"); await config.waitFor(); await settle(page)
    const overlay = config.locator("../.."), style = await styleOf(overlay)
    assert.equal(style.position, "absolute"); assert.ok(style.height < 1000)
    assertOverlay(style, `${theme} original active scenario overlay`)
    await assertSurface(page, config, theme, false, `${theme} original active scenario ConfigForm`, baselineBorder)
  }))

  test(`DIA-07 ${theme}: original draft ScenarioPanel/ChatView inline ConfigForm retains its old shadow-2 and has no dialog overlay`, async () => scenario(theme, { kind: "scenario", status: "draft" }, async page => {
    const config = page.getByTestId("scenario-config"); await config.waitFor(); await settle(page)
    assert.equal(await page.locator(".desktop-dialog-overlay,[data-slot=dialog-overlay],.desktop-scenario-dialog").count(), 0)
    assert.equal(await config.evaluate(element => !!element.closest(".desktop-dialog-surface,.desktop-dialog-overlay")), false)
    const oldShadow = theme === "paper" ? "0 8px 24px -8px rgba(96,74,38,.14)" : "0 8px 24px -8px rgba(0,0,0,.6)"
    assert.equal((await styleOf(config)).shadow, await normalizedShadow(page, oldShadow), "actual inline ConfigForm must retain product shadow-2")
  }))

  test(`DIA-08 ${theme}: real Menu/Select/Tooltip/ModelChoiceSelect and explicit foreshadow-role/inline CSS probes remain excluded`, async () => scenario(theme, { kind: "exclusions" }, async page => {
    const light = splitShadows(await normalizedShadow(page, expectedShadow(theme)))
    async function excluded(locator: Locator, label: string) {
      await locator.waitFor(); await settle(page)
      assert.equal(await page.locator(".desktop-dialog-overlay,[data-slot=dialog-overlay]").count(), 0, `${label}: no dialog backdrop`)
      assert.equal(await locator.evaluate(element => !!element.closest(".desktop-dialog-surface,.desktop-dialog-overlay")), false, `${label}: no dialog appearance class`)
      const shadow = (await styleOf(locator)).shadow
      assert.ok(!light.every(segment => splitShadows(shadow).includes(segment)), `${label}: no dialog two-shadow treatment`)
      return shadow
    }
    const oldShadow = await normalizedShadow(page, theme === "paper" ? "0 8px 24px -8px rgba(96,74,38,.14)" : "0 8px 24px -8px rgba(0,0,0,.6)")
    assert.deepEqual(visibleShadows(await excluded(page.getByTestId("foreshadow-probe"), "foreshadow role=dialog CSS probe")), splitShadows(oldShadow))
    assert.equal(await excluded(page.getByTestId("inline-probe"), "inline sc-config CSS probe"), oldShadow)
    await page.getByRole("button", { name: "打开实际菜单" }).click()
    assert.notEqual(await excluded(page.locator('[data-slot="dropdown-menu-content"]'), "actual Menu"), "none")
    await page.keyboard.press("Escape"); await settle(page)
    await page.getByRole("combobox", { name: "打开实际Select" }).click()
    assert.notEqual(await excluded(page.locator('[data-slot="select-content"]'), "actual Select"), "none")
    await page.keyboard.press("Escape"); await settle(page)
    await page.getByRole("button", { name: "实际工具提示" }).hover()
    assert.equal(await excluded(page.locator('[data-slot="tooltip-content"]'), "actual Tooltip"), "none")
    await page.mouse.move(1300, 900); await settle(page)
    await page.locator(".desktop-choice-trigger").click()
    assert.equal(await excluded(page.locator(".desktop-choice-popup"), "actual ModelChoiceSelect/Combobox"), await normalizedShadow(page, "0 8px 24px rgba(0,0,0,.2)"))
  }))
}

test("DIA-03: real nested Base UI keeps one backdrop; top Escape leaves parent and returns focus, Tab and pointer cannot act behind parent", async () => scenario("paper", { kind: "shared" }, async page => {
  const background = await page.getByRole("button", { name: "背景按钮" }).boundingBox()
  assert.ok(background)
  await openShared(page)
  await page.getByRole("button", { name: "打开内层", exact: true }).click()
  await page.getByRole("textbox", { name: "内层输入" }).waitFor(); await settle(page)
  assert.equal(await page.locator('[data-slot="dialog-overlay"]').count(), 1, "Base UI should not stack a second shared backdrop")
  assert.equal(await page.locator('[data-slot="dialog-content"]').count(), 2)
  await page.getByRole("button", { name: "内层按钮" }).focus(); await page.keyboard.press("Escape"); await settle(page)
  assert.equal(await page.locator('[data-slot="dialog-content"]').count(), 1)
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "打开内层")
  await page.getByRole("textbox", { name: "对话框输入" }).focus()
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab"); await settle(page)
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-slot="dialog-content"]')), true, "Tab must stay in actual popup")
  }
  assert.equal(await page.evaluate(() => (window as any).backgroundClicks), 0)
  await page.mouse.click(background.x + background.width / 2, background.y + background.height / 2); await settle(page)
  assert.equal(await page.locator('[data-slot="dialog-content"]').count(), 0, "ordinary outside click still closes")
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "打开对话框")
  assert.equal(await page.evaluate(() => (window as any).backgroundClicks), 0)
}))

test("DIA-04: actual onboarding guard plus disablePointerDismissal veto Escape/outside clicks and render no close button", async () => scenario("ink", { kind: "guard" }, async page => {
  await openShared(page)
  assert.equal(await page.locator('[data-slot="dialog-close"]').count(), 0)
  await page.getByRole("textbox", { name: "对话框输入" }).focus(); await page.keyboard.press("Escape"); await settle(page)
  assert.equal(await page.locator('[data-slot="dialog-content"]').count(), 1)
  await page.mouse.click(20, 900); await settle(page)
  assert.equal(await page.locator('[data-slot="dialog-content"]').count(), 1)
  assert.equal(await page.evaluate(() => (window as any).backgroundClicks), 0)
}))

test("DIA-06: original wizard Escape and local outside click close only detail while keeping the parent wizard", async () => scenario("paper", { kind: "wizard" }, async page => {
  await page.getByRole("button", { name: "打开原创作向导" }).click()
  const card = page.getByRole("button", { name: /样式夹具主题/ })
  await card.dblclick(); await page.getByRole("button", { name: "关闭详情" }).waitFor(); await settle(page)
  await page.getByRole("button", { name: "关闭详情" }).focus(); await page.keyboard.press("Escape"); await settle(page)
  assert.equal(await page.getByRole("button", { name: "关闭详情" }).count(), 0)
  assert.equal(await page.getByRole("dialog", { name: "创作向导" }).count(), 1)
  await card.dblclick(); await page.getByRole("button", { name: "关闭详情" }).waitFor(); await settle(page)
  const overlay = page.getByRole("button", { name: "关闭详情" }).locator("xpath=../../..")
  await overlay.click({ position: { x: 10, y: 10 } }); await settle(page)
  assert.equal(await page.getByRole("button", { name: "关闭详情" }).count(), 0)
  assert.equal(await page.getByRole("dialog", { name: "创作向导" }).count(), 1)
}))
