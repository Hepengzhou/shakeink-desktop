import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { build } from "esbuild"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { chromium, type Browser, type Page } from "playwright-core"

const nativeSelectAll=process.platform==='darwin'?'Meta+a':'Control+a'
const nativeUndo=process.platform==='darwin'?'Meta+z':'Control+z'
const nativeDocumentStart=process.platform==='darwin'?'Meta+ArrowUp':'Control+Home'
const nativeSelectNextWord=process.platform==='darwin'?'Alt+Shift+ArrowRight':'Control+Shift+ArrowRight'

// Product CSS and real React previews. Synthetic data only; Chromium component
// tests are separate from the Windows Electron acceptance runner.
const stylesheet = (async () => {
  const path = resolve("src/app/globals.css")
  return (await postcss([tailwindcss()]).process(await readFile(path, "utf8") + "\n" + await readFile("src/app/desktop.css", "utf8"), { from: path })).css
})()
const bundle = build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{createPortal}from'react-dom';
import{MarkdownPreview}from'./src/components/editor/MarkdownPreview';
import{CommentablePreview}from'./src/components/comments/CommentablePreview';
import{CommentBubble}from'./src/components/comments/CommentBubble';
import{HighlightedContent}from'./src/components/admin/PromptsClient';
import{SidebarHoverCard}from'./src/components/layout/SidebarHoverCard';
import{Toaster}from'./src/components/ui/sonner';import{toast}from'sonner';
import{Dialog,DialogContent,DialogTitle,DialogDescription}from'./src/components/ui/dialog';
import{DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem}from'./src/components/ui/dropdown-menu';
const source='# Isolated heading\\n\\nAlpha **bold** [link](https://example.invalid) text.\\n\\n- list text\\n\\n| column |\\n| --- |\\n| table text |\\n\\n\x60\x60\x60js\\nconst value = 7;\\n\x60\x60\x60';
window.mount=(theme)=>{document.documentElement.className=theme;const root=createRoot(document.getElementById('app'));flushSync(()=>root.render(<>
<h1 id='heading'>UI heading text</h1><p id='help'>UI help text</p><span id='status' role='status'>UI status text</span>
<div id='markdown'><MarkdownPreview source={source}/></div>
<div id='commentable'><CommentablePreview source='Alpha manuscript text' threads={[]} showAll isExpanded={()=>false} onToggleThread={()=>{}} onCreateComment={async()=>{}} renderBubble={()=>null}/></div>
<div id='comment'><CommentBubble thread={{id:'isolated',targetType:'CHAPTER_CONTENT',authorName:'UI author',createdAt:new Date().toISOString(),status:'OPEN',quote:'Quoted manuscript',content:'Comment **body**',replies:[]}} showQuote onReply={async()=>{}} onToggleReject={()=>{}} onApply={()=>{}} onApplyParagraph={()=>{}} onDelete={()=>{}}/></div>
<div id='variables'><HighlightedContent content='Isolated {{variable}} original text'/></div>
<div id='hover-preview'><SidebarHoverCard data={{title:'UI entity title',blurb:'Isolated entity original',blurbIsPreview:true,meta:['UI count']}}/></div>
<div id='hover-help'><SidebarHoverCard data={{title:'UI help title',blurb:'UI static help'}}/></div>
{createPortal(<div id='portal' role='tooltip'>UI portal help</div>,document.body)}
</>));};
window.mountOverlay=(kind)=>{const el=document.createElement('div');document.body.appendChild(el);const root=createRoot(el);flushSync(()=>root.render(kind==='toast'?<Toaster/>:kind==='dialog'?<Dialog defaultOpen><DialogContent><DialogTitle id='dialog-title'>UI dialog heading</DialogTitle><DialogDescription id='dialog-description'>UI dialog help</DialogDescription><textarea id='dialog-input' defaultValue='Original dialog input'/></DialogContent></Dialog>:<DropdownMenu><DropdownMenuTrigger id='menu-trigger'>UI menu trigger</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem id='menu-item' onClick={()=>window.menuClicked=true}>UI menu action</DropdownMenuItem></DropdownMenuContent></DropdownMenu>));if(kind==='toast')toast.info('UI notification title',{description:'UI notification help',duration:Infinity});};
` }, bundle: true, write: false, platform: "browser", format: "iife", tsconfig: "tsconfig.json", define: { "process.env.NODE_ENV": '"production"' } }).then(r => r.outputFiles![0].text)
let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })
async function scenario(theme: string, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } }), errors: string[] = []
  page.on("pageerror", e => errors.push(e.message))
  try {
    await page.route("**/*", route => route.abort())
    await page.setContent('<div id="app"></div>')
    await page.addStyleTag({ content: await stylesheet }); await page.addScriptTag({ content: await bundle })
    await page.evaluate(theme => (window as any).mount(theme), theme)
    await run(page); assert.deepEqual(errors, [])
  } finally { await page.close() }
}
async function selection(page: Page, selector: string) {
  await page.evaluate(() => { document.activeElement instanceof HTMLElement && document.activeElement.blur(); window.getSelection()?.removeAllRanges() })
  const box = await page.locator(selector).boundingBox(); assert.ok(box)
  await page.mouse.move(box.x + 3, box.y + box.height / 2); await page.mouse.down()
  await page.mouse.move(box.x + Math.min(box.width - 2, 180), box.y + box.height / 2, { steps: 12 }); await page.mouse.up()
  return page.evaluate(() => window.getSelection()?.toString() ?? "")
}
async function style(page: Page, selector: string) { const styles = await page.locator(selector).evaluateAll(els => els.map(el => getComputedStyle(el).userSelect)); assert.ok(styles.length, selector); assert.equal(new Set(styles).size, 1, selector); return styles[0] }
for (const theme of ["paper", "ink"]) {
  test(`TS-01/08 ${theme} real UI and portal reject mouse selection`, () => scenario(theme, async page => {
    for (const selector of ["#heading", "#help", "#status", "#portal", "#hover-help p", "#hover-preview .font-semibold", "#comment span.font-medium"]) {
      assert.equal(await style(page, selector), "none", selector); assert.equal(await selection(page, selector), "", selector)
      await page.locator(selector).dblclick(); assert.equal(await page.evaluate(() => window.getSelection()?.toString() ?? ""), "", selector)
    }
  }))
  test(`TS-04/05/07 ${theme} real Markdown, comments, variables and entity previews remain selectable`, () => scenario(theme, async page => {
    for (const selector of ["#markdown h1", "#markdown p", "#markdown strong", "#markdown a", "#markdown li", "#markdown td", "#markdown code span", "#commentable [data-block] p", "#comment .markdown-body", "#comment blockquote", "#variables > div", "#hover-preview p"]) assert.equal(await style(page, selector), "text", selector)
    for (const selector of ["#markdown p", "#commentable [data-block] p", "#comment .markdown-body p", "#variables > div", "#hover-preview p"]) assert.ok((await selection(page, selector)).length > 0, selector)
  }))
}
test("TS-02/03/06 nearest content/UI/input boundaries preserve mouse and keyboard editing", () => scenario("paper", async page => {
  await page.locator("#app").evaluate(el => el.insertAdjacentHTML("afterbegin", `<div id="matrix">
    <div data-text-preview><span id="preview-word">Preview original</span><button id="action"><span>UI action</span></button><label id="label">UI label<input id="input" value="Editable input"></label><summary id="summary">UI summary</summary></div>
    <button id="card"><span id="badge">UI badge</span><span data-text-preview id="excerpt">Candidate original <em id="em">bold excerpt</em><span data-text-ui id="inline-ui">UI marker</span></span></button>
    <div contenteditable="true" id="editable">Editable <span id="editable-span">nested text</span><span id="chip" contenteditable="false">UI chip</span></div>
    <div contenteditable="plaintext-only" id="plain">Plain editable</div>
    <div contenteditable="false" data-text-input id="disabled-composer">Retained draft<span contenteditable="false" id="retained-chip">UI chip</span></div>
    <textarea id="readonly" readonly>Readonly original</textarea><textarea id="disabled" disabled>Disabled original</textarea>
    <div class="monaco-editor"><div id="native-context" class="native-edit-context" role="textbox"></div><span id="editor-ui">UI editor chrome</span></div>
    <input id="check" type="checkbox"><input id="input-button" type="button" value="UI action">
  </div>`))
  for (const id of ["preview-word", "input", "excerpt", "em", "editable", "editable-span", "plain", "disabled-composer", "readonly", "disabled", "native-context"]) assert.equal(await style(page, "#" + id), "text", id)
  for (const id of ["action", "action span", "label", "summary", "card", "badge", "inline-ui", "chip", "retained-chip", "check", "input-button", "editor-ui"]) assert.equal(await style(page, "#" + id), "none", id)
  const excerpt = await selection(page, "#excerpt"); assert.match(excerpt, /Candidate/); assert.ok(!excerpt.includes("UI marker"))
  assert.ok((await selection(page, "#disabled-composer")).length > 0)
  const input = page.locator("#input"); await input.focus(); await page.keyboard.press(nativeSelectAll)
  assert.equal(await input.evaluate(el => (el as HTMLInputElement).selectionEnd! - (el as HTMLInputElement).selectionStart!), 14)
  await page.keyboard.type("New original"); assert.equal(await input.inputValue(), "New original")
  await page.keyboard.press(nativeUndo); assert.equal(await input.inputValue(), "Editable input")
  const readonly = page.locator("#readonly"); await readonly.focus(); await page.keyboard.press(nativeSelectAll)
  assert.equal(await readonly.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart), (await readonly.inputValue()).length)
  for (const type of ["text", "search", "url", "tel", "email", "password", "number", "date", "datetime-local", "month", "week", "time"]) {
    await page.locator("#matrix").evaluate((el, type) => el.insertAdjacentHTML("beforeend", `<input id="typed" type="${type}">`), type)
    assert.equal(await style(page, "#typed"), "text", type); await page.locator("#typed").evaluate(el => el.remove())
  }
  await page.locator("#editable").focus(); await page.keyboard.press(nativeDocumentStart); await page.keyboard.press(nativeSelectNextWord)
  assert.ok((await page.evaluate(() => window.getSelection()?.toString() ?? "")).length > 0)
  await page.locator("#action").evaluate(el => el.addEventListener("click", () => { (window as any).clicked = true }))
  await page.locator("#action").click(); assert.equal(await page.evaluate(() => (window as any).clicked), true)
}))
for (const kind of ["toast", "dialog", "menu"]) test(`TS-08 actual ${kind} portal preserves UI policy and controls`, () => scenario("paper", async page => {
  await page.evaluate(kind => (window as any).mountOverlay(kind), kind)
  if (kind === "menu") await page.locator("#menu-trigger").click()
  const selectors = kind === "toast" ? ["[data-sonner-toast] [data-title]", "[data-sonner-toast] [data-description]"] : kind === "dialog" ? ["#dialog-title", "#dialog-description"] : ["#menu-item"]
  for (const selector of selectors) { await page.locator(selector).waitFor(); assert.equal(await style(page, selector), "none"); assert.equal(await selection(page, selector), "") }
  if (kind === "dialog") { assert.equal(await style(page, "#dialog-input"), "text"); await page.locator("#dialog-input").fill("Changed original"); assert.equal(await page.locator("#dialog-input").inputValue(), "Changed original") }
  if (kind === "menu") assert.equal(await page.evaluate(() => (window as any).menuClicked), true, "the UI pointer gesture still invokes the real menu action")
}))
