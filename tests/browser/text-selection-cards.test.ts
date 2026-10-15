import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { build } from "esbuild"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { chromium, type Browser, type Page } from "playwright-core"

// Actual React cards, handlers, stores and product CSS; only data is synthetic.
// All queries are seeded, all external requests are blocked, and no provider,
// user directory, OS clipboard, Electron or native packaging is involved.
const stylesheet = (async () => {
  const path = resolve("src/app/globals.css")
  const css = await readFile(path, "utf8") + "\n" + await readFile("src/app/desktop.css", "utf8")
  return (await postcss([tailwindcss()]).process(css, { from: path })).css
})()
const bundle = build({
  stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React,{useEffect}from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';
import{CandidateDrawCard}from'./src/components/chat/CandidateDrawCard';
import{SceneWorkspace}from'./src/components/content/scene/SceneWorkspace';
import{CharactersPanel}from'./src/components/content/CharactersPanel';
import{ItemsPanel}from'./src/components/content/ItemsPanel';
import{LevelSystemEditor}from'./src/components/content/LevelSystemEditor';
import{useTabsStore}from'./src/stores/tabs';import{useChatStore}from'./src/stores/chat';
import{useSceneUiStore}from'./src/stores/scene-ui';
import{installTextPreviewSelection}from'./src/lib/desktop/text-selection';
import{Button}from'./src/components/ui/button';
const novelId='isolated-selection-work';
const scene={id:'isolated-scene',novelId,name:'UI scene name',description:'Scene original manuscript words for selection.',coordinates:'UI coordinates',parentId:null,version:1,worldId:null,factionId:null,exteriorImageUrl:null,interiorImageUrl:null,order:0};
const character={id:'isolated-character',novelId,name:'UI character name',roleType:'PROTAGONIST',bio:'Character original manuscript words for selection.',personality:'',age:'UI age',occupation:'UI occupation',avatarUrl:null};
const item={id:'isolated-item',novelId,name:'UI item name',description:'Item original manuscript words for selection.',iconUrl:null,aliases:[],tags:['UI item tag'],levels:[]};
const level={name:'UI level name',description:'Level original manuscript words for selection.',aliases:[],tags:['UI level tag'],condition:'',abilities:[],children:[]};
const content={form:'SINGLE',scope:'CHARACTER',description:'',rules:'',levels:[level],pathways:[]};
const draw={drawId:'isolated-draw',chapterId:'isolated-chapter',chapterTitle:'UI chapter title',wordMin:0,wordBudget:0,failures:[],candidates:[{id:'isolated-candidate',variant:'isolated',label:'UI candidate badge',status:'ready',hardChecks:[],wordCount:47,excerpt:'Candidate original manuscript words for selection.'}]};
window.mountCards=(kind,theme,empty=false)=>{
 document.documentElement.className=theme;useChatStore.setState({accountId:'isolated-account',conversationId:'isolated-conversation'});
 useSceneUiStore.setState({prefs:{},drafts:{},submissions:{},reference:null});
 useTabsStore.setState({tabs:[],activeTabId:null});
 const query=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity,gcTime:Infinity,refetchOnWindowFocus:false}}});
 query.setQueryData(['scenes',novelId],{scenes:[{...scene,description:empty?'':scene.description}]});
 query.setQueryData(['scene-factions',novelId],{factions:[]});
 query.setQueryData(['characters',novelId],{characters:[{...character,bio:empty?'':character.bio}]});
 query.setQueryData(['items',novelId],{items:[{...item,description:empty?'':item.description}]});
 query.setQueryData(['characters','isolated-future-work'],{characters:[{...character,id:'isolated-future-character',name:'UI future character name',novelId:'isolated-future-work'}]});
 const root=createRoot(document.getElementById('app'));
 let stopSelection=()=>{};function SelectionLifecycle({children}){useEffect(()=>{stopSelection=installTextPreviewSelection(document);return()=>stopSelection()},[]);return children}
 let body=kind==='candidate'?<CandidateDrawCard novelId={novelId} draw={draw}/>:kind==='scene'?<SceneWorkspace novelId={novelId}/>:kind==='character'?<CharactersPanel novelId={novelId}/>:kind==='item'?<ItemsPanel novelId={novelId}/>:<LevelSystemEditor content={{...content,levels:[{...level,description:empty?'':level.description}]}} onChange={()=>{}} settingId='isolated-level-system' settingName='UI level system'/>;
 let future=false,controls=false,boundaries=false;const actions={button:0,link:0,card:0,planning:0,checkbox:0,label:0,planningControl:0,checkboxControl:0};
 const render=()=>flushSync(()=>root.render(<SelectionLifecycle><QueryClientProvider client={query}>{body}{future&&<div id='future-card'><CharactersPanel novelId='isolated-future-work'/></div>}{controls&&<article id='nested-controls-card' role='button' draggable onClick={()=>{actions.card++}}><div data-text-preview id='nested-controls-preview'><span>Nested original words</span><Button id='nested-real-button' onClick={event=>{event.stopPropagation();actions.button++}}>UI nested button</Button><a id='nested-real-link' href='#isolated-link-target' onClick={()=>{actions.link++}}>Original reference link</a><input id='nested-real-input' defaultValue='Nested input original'/></div></article>}{boundaries&&<div id='regression-boundaries'>
 <article id='planning-regression-card' draggable onClick={()=>{actions.planning++}}><span id='planning-regression-chrome'>UI planning header</span><p id='planning-regression-preview' data-text-preview><span>Planning original prose words</span><Button id='planning-real-control' onClick={event=>{event.stopPropagation();actions.planningControl++}}>UI planning control</Button></p></article>
 <div id='checkbox-regression-card' role='checkbox' aria-checked='false' onClick={()=>{actions.checkbox++}}><span id='checkbox-regression-chrome'>UI checkbox toggle</span><p id='checkbox-regression-preview' data-text-preview><span>Checkbox original prose words</span><Button id='checkbox-real-control' onClick={event=>{event.stopPropagation();actions.checkboxControl++}}>UI checkbox control</Button></p></div>
 <label id='label-regression-card'><span id='label-regression-chrome'>UI label toggle</span><span id='label-regression-preview' data-text-preview>Label original prose words</span><input id='label-real-control' type='checkbox' onChange={()=>{actions.label++}}/></label>
 </div>}</QueryClientProvider></SelectionLifecycle>));
 render();
 const events=[];document.addEventListener('dragstart',event=>{queueMicrotask(()=>events.push({target:event.target instanceof Element?event.target.tagName:'',prevented:event.defaultPrevented,types:[...(event.dataTransfer?.types??[])],chip:event.dataTransfer?.getData('application/x-shakeink-chip')??'',plain:event.dataTransfer?.getData('text/plain')??''}))});
 window.cardsFixture={events,actions,active:()=>useTabsStore.getState().activeTabId,tabs:()=>useTabsStore.getState().tabs,reference:()=>useSceneUiStore.getState().reference,stopSelection:()=>stopSelection(),addFutureCard:()=>{future=true;render()},addNestedControls:()=>{controls=true;render()},addRegressionBoundaries:()=>{boundaries=true;render()},dispose:()=>{root.unmount();query.clear()}};
};` },
  bundle: true, write: false, outfile: "isolated-selection-cards.js", platform: "browser", format: "iife",
  tsconfig: "tsconfig.json", define: { "process.env.NODE_ENV": '"production"' },
}).then(result => ({
  js: result.outputFiles!.find(file => file.path.endsWith(".js"))!.text,
  css: result.outputFiles!.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n"),
}))

type CardKind = "candidate" | "scene" | "character" | "item" | "level"
const selectors = {
  candidate: { card: '[data-testid="candidate-card-isolated"]', content: '[data-testid="candidate-card-isolated"] > p', ui: '[data-testid="candidate-card-isolated"] > div:first-child > span:first-child', word: "Candidate" },
  scene: { card: ".scene-card", content: ".scene-card .line-clamp-2", ui: ".scene-card h3", word: "Scene" },
  character: { card: '[role="button"][draggable]', content: '[role="button"] .line-clamp-2', ui: '[data-slot="card-content"] > div:first-child > span', word: "Character" },
  item: { card: '[role="button"][draggable]', content: '[role="button"] .line-clamp-2', ui: '[data-slot="card-content"] > div:first-child > span.font-medium', word: "Item" },
  level: { card: '[data-concept-name="UI level name"]', content: '[data-concept-name="UI level name"] .line-clamp-2', ui: '[data-concept-name="UI level name"] .font-semibold', word: "Level" },
} as const
let browser: Browser
test.before(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) })
})
test.after(async () => { await browser?.close() })

async function scenario(kind: CardKind, theme: string, empty: boolean, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  page.setDefaultTimeout(5000)
  const errors: string[] = [], requests: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  try {
    await page.route("**/*", route => route.request().url() === "http://selection-cards.invalid/"
      ? route.fulfill({ contentType: "text/html", body: '<div id="app" style="height:960px"></div>' })
      : (requests.push(route.request().url()), route.abort()))
    await page.goto("http://selection-cards.invalid/")
    const assets = await bundle
    await page.addStyleTag({ content: await stylesheet + "\n" + assets.css })
    await page.addScriptTag({ content: assets.js })
    await page.evaluate(({ kind, theme, empty }) => (window as any).mountCards(kind, theme, empty), { kind, theme, empty })
    await page.locator(selectors[kind].content).waitFor()
    await run(page)
    assert.deepEqual(errors, [], "real cards must render without page errors")
    assert.deepEqual(requests, [], "seeded component tests must not request backend, model or images")
  } finally {
    await page.evaluate(() => (window as any).cardsFixture?.dispose())
    await page.close()
  }
}

async function clearSelection(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.getSelection()?.removeAllRanges()
    ;(window as any).cardsFixture.events.length = 0
  })
}

// Use DOM geometry only to choose actual mouse coordinates; never create a Range
// selection in this test. Choosing the first rendered text line avoids the blank
// lower area of CandidateThumb's min-height and line-clamped descriptions.
async function firstTextLine(page: Page, selector: string) {
  return page.locator(selector).evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let text: Text | null
    while ((text = walker.nextNode() as Text | null)) {
      if (!text.textContent?.trim()) continue
      const range = document.createRange(); range.selectNodeContents(text)
      const box = range.getClientRects()[0]
      if (box?.width) return { x: box.x, y: box.y, width: box.width, height: box.height }
    }
    throw Error("No visible card text")
  })
}

async function dragText(page: Page, selector: string) {
  await clearSelection(page)
  const box = await firstTextLine(page, selector)
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + 1, y); await page.mouse.down()
  await page.mouse.move(box.x + Math.min(box.width - 1, 180), y, { steps: 20 }); await page.mouse.up()
  return page.evaluate(() => ({
    text: window.getSelection()?.toString() ?? "",
    active: (window as any).cardsFixture.active(),
    drags: [...(window as any).cardsFixture.events],
  }))
}

async function doubleClickText(page: Page, selector: string) {
  await clearSelection(page)
  const box = await firstTextLine(page, selector)
  await page.mouse.dblclick(box.x + Math.min(16, box.width / 2), box.y + box.height / 2)
  return page.evaluate(() => ({ text: window.getSelection()?.toString() ?? "", active: (window as any).cardsFixture.active() }))
}

for (const theme of ["paper", "ink"]) {
  for (const kind of Object.keys(selectors) as CardKind[]) {
    test(`TS-06/07 cards ${theme} actual ${kind} preview drag preserves selected original and card state`, () => scenario(kind, theme, false, async page => {
      const { content, card, word } = selectors[kind]
      const result = await dragText(page, content)
      assert.match(result.text, new RegExp(word), "actual mouse drag must select the original preview: " + JSON.stringify(result))
      assert.doesNotMatch(result.text, /UI /, "selection must omit adjacent UI labels")
      assert.equal(result.active, null, "selecting preview words must not open a tab")
      assert.equal(await page.locator(card).count(), 1, "selection must not replace the card with its editor")
      assert.equal(result.drags.filter(event => !event.prevented).length, 0, "selecting original text must not start an entity reference drag")
    }))

    test(`TS-06/07 cards ${theme} actual ${kind} double click selects original words without opening editor`, () => scenario(kind, theme, false, async page => {
      const { content, card, word } = selectors[kind]
      const result = await doubleClickText(page, content)
      assert.match(result.text, new RegExp(word))
      assert.equal(result.active, null, "double clicking preview words must not open a tab")
      assert.equal(await page.locator(card).count(), 1, "double clicking preview must leave its DOM text mounted")
    }))

    test(`TS-01/07 cards ${theme} actual ${kind} name/badge stays unselectable and original card action works`, () => scenario(kind, theme, false, async page => {
      const { ui, card } = selectors[kind]
      assert.equal(await page.locator(ui).evaluate(element => getComputedStyle(element).userSelect), "none")
      const result = await doubleClickText(page, ui)
      assert.equal(result.text, "", "UI name/badge must not create a text selection")
      if (kind === "level") assert.equal(await page.locator(card).count(), 0, "UI click retains opening level details")
      else assert.ok(result.active, "UI click retains opening the real content tab")
    }))
  }
}

for (const kind of ["scene", "character", "item", "level"] as CardKind[]) {
  test(`TS-07 actual ${kind} non-preview header retains real reference drag payload`, () => scenario(kind, "paper", false, async page => {
    const { ui } = selectors[kind]
    const result = await dragText(page, ui)
    assert.equal(result.text, "", "dragged UI header stays unselectable")
    assert.equal(result.active, null, "reference dragging must not click/open the card")
    const reference = result.drags.find(event => event.types.includes("application/x-shakeink-chip") && !event.prevented)
    assert.ok(reference, "actual product dragstart must write the reference MIME")
    const chip = JSON.parse(reference.chip)
    assert.equal(chip.kind, kind === "scene" ? "scene" : kind === "level" ? "setting" : kind)
    if (kind === "level") assert.match(reference.plain, /isolated-level-system·UI level name/)
    assert.ok(reference.plain.startsWith("@["))
  }))

  test(`TS-07 actual ${kind} empty-description help remains UI`, () => scenario(kind, "paper", true, async page => {
    const { content } = selectors[kind]
    assert.equal(await page.locator(content).evaluate(element => getComputedStyle(element).userSelect), "none")
    assert.equal((await doubleClickText(page, content)).text, "")
  }))
}

test("TS-07 actual scene footer quote retains its real store action without selecting UI or opening a tab", () => scenario("scene", "paper", false, async page => {
  const quote = page.locator(".scene-card footer button").filter({ hasText: "引用" })
  assert.equal(await quote.evaluate(element => getComputedStyle(element).userSelect), "none")
  await clearSelection(page); await quote.click()
  const result = await page.evaluate(() => ({ text: window.getSelection()?.toString() ?? "", active: (window as any).cardsFixture.active(), reference: (window as any).cardsFixture.reference() }))
  assert.equal(result.text, ""); assert.equal(result.active, null)
  assert.equal(result.reference?.chip.kind, "scene")
  assert.equal(result.reference?.novelId, "isolated-selection-work")
}))

async function holdPreview(page: Page, kind: CardKind) {
  await clearSelection(page)
  const box = await firstTextLine(page, selectors[kind].content)
  await page.mouse.move(box.x + 2, box.y + box.height / 2)
  await page.mouse.down()
  assert.equal(await page.locator(selectors[kind].card).getAttribute("draggable"), "false", "real helper must suspend native card drag before the pointer moves")
}

for (const kind of ["scene", "character", "item", "level"] as CardKind[]) {
  test(`TS-07 helper actual ${kind} preview press suspends draggable and mouseup restores it`, () => scenario(kind, "paper", false, async page => {
    await holdPreview(page, kind)
    await page.mouse.up()
    await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute("draggable") === "true", selectors[kind].card)
    assert.equal(await page.evaluate(() => (window as any).cardsFixture.active()), null, "mouseup click on original text must not open the card")
  }))

  test(`TS-07 helper actual ${kind} window blur event restores a held preview card`, () => scenario(kind, "paper", false, async page => {
    await holdPreview(page, kind)
    // This explicitly tests the DOM blur lifecycle. Native Windows window-focus
    // changes remain the Electron acceptance runner's responsibility.
    await page.evaluate(() => window.dispatchEvent(new Event("blur")))
    assert.equal(await page.locator(selectors[kind].card).getAttribute("draggable"), "true")
    await page.mouse.up()
  }))

  test(`TS-07 helper actual ${kind} provider cleanup restores a held card and removes click interception`, () => scenario(kind, "paper", false, async page => {
    await holdPreview(page, kind)
    // Invoke the exact disposer held by the useEffect lifecycle; retain the DOM
    // only so its restored attribute and removal of listeners are observable.
    await page.evaluate(() => (window as any).cardsFixture.stopSelection())
    assert.equal(await page.locator(selectors[kind].card).getAttribute("draggable"), "true")
    await page.mouse.up()
    if (kind === "level") assert.equal(await page.locator(selectors[kind].card).count(), 0)
    else assert.ok(await page.evaluate(() => (window as any).cardsFixture.active()))
  }))
}

test("TS-06 helper retains actual nested Button, anchor navigation and input editing within previews", () => scenario("candidate", "paper", false, async page => {
  await page.evaluate(() => (window as any).cardsFixture.addNestedControls())
  await page.locator("#nested-real-button").click()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.button), 1, "actual Button handler must run")
  assert.equal(await page.locator("#nested-controls-card").getAttribute("draggable"), "true", "nested UI control must not suspend the parent card")
  assert.equal(await page.locator("#nested-real-button").evaluate(element => getComputedStyle(element).userSelect), "none")
  await page.locator("#nested-real-link").click()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.link), 1, "anchor handler must run")
  assert.equal(await page.evaluate(() => window.location.hash), "#isolated-link-target", "anchor's native default action must remain active")
  const input = page.locator("#nested-real-input")
  await input.focus(); await page.keyboard.press("Control+a"); await page.keyboard.type("Replacement original")
  assert.equal(await input.inputValue(), "Replacement original")
  await page.keyboard.press("Control+z"); assert.equal(await input.inputValue(), "Nested input original")
  assert.equal(await page.locator("#nested-controls-card").getAttribute("draggable"), "true")
}))

test("TS-07 helper covers later-mounted actual cards while retaining their UI reference drag", () => scenario("candidate", "paper", false, async page => {
  await page.evaluate(() => (window as any).cardsFixture.addFutureCard())
  const content = '#future-card [role="button"] .line-clamp-2'
  const ui = '#future-card [data-slot="card-content"] > div:first-child > span'
  const selection = await dragText(page, content)
  assert.match(selection.text, /Character/); assert.equal(selection.active, null)
  assert.equal(selection.drags.filter(event => !event.prevented).length, 0)
  const reference = await dragText(page, ui)
  assert.equal(reference.text, ""); assert.equal(reference.active, null)
  assert.ok(reference.drags.some(event => !event.prevented && event.types.includes("application/x-shakeink-chip")))
}))

test("TS-06 helper no-role draggable planning article keeps both preview clicks suppressed while drag is suspended", () => scenario("candidate", "paper", false, async page => {
  await page.evaluate(() => (window as any).cardsFixture.addRegressionBoundaries())
  await clearSelection(page)
  const box = await firstTextLine(page, "#planning-regression-preview")
  await page.mouse.move(box.x + 2, box.y + box.height / 2); await page.mouse.down()
  assert.equal(await page.locator("#planning-regression-card").getAttribute("draggable"), "false")
  await page.mouse.up()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.planning), 0, "mouseup-generated click must be intercepted while draggable is temporarily false")
  const selected = await doubleClickText(page, "#planning-regression-preview")
  assert.match(selected.text, /Planning/)
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.planning), 0, "neither click of the native double click may open planning details")
  await page.locator("#planning-real-control").click()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.planningControl), 1, "actual inner Button handler must still run")
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.planning), 0)
  await page.locator("#planning-regression-chrome").click()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.planning), 1, "planning UI chrome retains its action")
}))

test("TS-06 helper checkbox-card preview selection does not toggle the outer checkbox action", () => scenario("candidate", "paper", false, async page => {
  await page.evaluate(() => (window as any).cardsFixture.addRegressionBoundaries())
  assert.match((await dragText(page, "#checkbox-regression-preview")).text, /Checkbox/)
  assert.match((await doubleClickText(page, "#checkbox-regression-preview")).text, /Checkbox/)
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.checkbox), 0, "preview drag and double click must not toggle the outer role=checkbox")
  await page.locator("#checkbox-real-control").click()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.checkboxControl), 1, "actual inner Button is an independent control")
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.checkbox), 0)
  await page.locator("#checkbox-regression-chrome").click()
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.checkbox), 1, "UI checkbox chrome still toggles once")
}))

test("TS-06 helper label preview prevents native associated-input activation but preserves real controls", () => scenario("candidate", "paper", false, async page => {
  await page.evaluate(() => (window as any).cardsFixture.addRegressionBoundaries())
  const checkbox = page.locator("#label-real-control")
  assert.match((await dragText(page, "#label-regression-preview")).text, /Label/)
  assert.match((await doubleClickText(page, "#label-regression-preview")).text, /Label/)
  assert.equal(await checkbox.isChecked(), false)
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.label), 0, "preview clicks must prevent label's default checkbox activation")
  await checkbox.click()
  assert.equal(await checkbox.isChecked(), true)
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.label), 1, "the real input control retains its native change event")
  await page.locator("#label-regression-chrome").click()
  assert.equal(await checkbox.isChecked(), false)
  assert.equal(await page.evaluate(() => (window as any).cardsFixture.actions.label), 2, "UI label chrome retains native associated-input activation")
}))
