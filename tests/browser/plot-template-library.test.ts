import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtemp, rm, readFile, realpath } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve, dirname, basename } from "node:path"
import { build } from "esbuild"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { chromium, type Browser, type Page } from "playwright-core"
import { Workspaces } from "../../desktop/service/workspaces"
import { LocalTemplateLibrary } from "../../desktop/service/template-library"
import { dispatchTemplateRequest } from "../../desktop/service/template-dispatcher"
import { WIZARD_TEMPLATES } from "../../src/lib/creation-wizard/templates"

const stylesheet = (async () => { const path = resolve("src/app/globals.css"); return (await postcss([tailwindcss()]).process(await readFile(path, "utf8"), { from: path })).css })()
const bundle = build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React from 'react'; import {createRoot} from 'react-dom/client'; import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {CreateNovelDialog} from './src/components/layout/CreateNovelDialog'; import {useChatStore} from './src/stores/chat';
window.mountPlotWizard=()=>{
 window.desktop={}; useChatStore.setState({draft:'',accountId:'local-author',recoveryStatus:'ready',newConversationRequested:false,newConversationPayload:null});
 window.fetch=async(input,init={})=>{const result=await window.plotLibraryRequest(String(input),init.method||'GET',init.body||null);return new Response(result.body,{status:result.status,headers:{'content-type':'application/json'}})};
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}}); createRoot(document.getElementById('app')).render(React.createElement(QueryClientProvider,{client},React.createElement(CreateNovelDialog,{open:true,onOpenChange:()=>{},novels:[]})));
 window.plotDraft=()=>useChatStore.getState().newConversationPayload;
};` }, bundle: true, platform: "browser", format: "iife", write: false, tsconfig: "tsconfig.json" }).then(r => r.outputFiles![0].text)
let browser: Browser, works: Workspaces, base: string
test.before(async () => {
  base = await mkdtemp(join(tmpdir(), "xaanink-plot-browser-")); works = new Workspaces(join(base, "data"), resolve("prisma/migrations")); await works.initialize()
  await works.runWithGlobal("inbox", () => new LocalTemplateLibrary().initialize())
  browser = await chromium.launch({ headless: true, ...(process.env.XAANINK_TEST_CHROMIUM ? { executablePath: process.env.XAANINK_TEST_CHROMIUM } : {}) })
})
test.after(async () => {
  await browser?.close(); await works?.close()
  if (base) {
    const target = await realpath(base)
    assert.equal(dirname(target).toLowerCase(), (await realpath(tmpdir())).toLowerCase()); assert.ok(basename(target).startsWith("xaanink-plot-browser-"))
    await rm(target, { recursive: true, force: true })
  }
})
async function scenario(run: (page: Page, calls: string[]) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }), errors: string[] = [], calls: string[] = []
  page.setDefaultTimeout(5000); page.on("pageerror", e => errors.push(e.message))
  try {
    await page.route("**/*", route => route.request().isNavigationRequest() ? route.fulfill({ contentType: "text/html", body: '<div id="app"></div>' }) : route.abort())
    await page.exposeFunction("plotLibraryRequest", async (path: string, method: string, body: string | null) => {
      calls.push(path)
      return works.runWithGlobal("inbox", async () => {
        const response = await dispatchTemplateRequest(new Request(new URL(path, "https://local.invalid"), { method, body, headers: { "content-type": "application/json" } }))
        assert.ok(response, path); return { body: await response.text(), status: response.status }
      })
    })
    await page.goto("http://127.0.0.1:1/plot-wizard"); await page.addStyleTag({ content: await stylesheet }); await page.addScriptTag({ content: await bundle })
    await page.evaluate(() => (window as any).mountPlotWizard()); await page.getByRole("button", { name: /^剧情\s*160$/ }).click()
    await run(page, calls); assert.deepEqual(errors, []); assert.ok(calls.every(path => path === "/api/templates/wizard?enabled=true"), "no model/send requests")
  } finally { await page.close() }
}
test("PLX09 real React wizard reads the real local catalog and preserves a complete fifteen-beat draft without sending", async () => scenario(async page => {
  const template = WIZARD_TEMPLATES.find(t => t.id === "plot-structure-save-the-cat")!
  assert.ok(template)
  await page.getByRole("button", { name: new RegExp(template.title) }).dblclick(); await page.getByText(template.prompt, { exact: true }).waitFor()
  await page.getByRole("button", { name: "使用此模板", exact: true }).click(); await page.getByRole("button", { name: "确定", exact: true }).click()
  const payload = await page.evaluate(() => (window as any).plotDraft())
  assert.ok(payload.draft.endsWith(template.prompt)); assert.equal(payload.novelId, null); assert.ok(!payload.autoSend)
}))
test("PLX09 real genre controls expose romance, xianxia and scifi templates in either channel", async () => scenario(async page => {
  await page.getByRole("button", { name: "女频", exact: true }).click()
  await page.getByRole("button", { name: "仙侠奇缘", exact: true }).click()
  const xianxia = WIZARD_TEMPLATES.find(t => t.id === "plot-xianxia-old-mentor")!
  assert.ok(xianxia); await page.getByRole("button", { name: new RegExp(xianxia.title) }).waitFor()
  await page.getByRole("button", { name: "现代言情", exact: true }).click()
  const romance = WIZARD_TEMPLATES.find(t => t.id === "plot-romance-fake-relationship")!
  assert.ok(romance); await page.getByRole("button", { name: new RegExp(romance.title) }).waitFor()
  await page.getByRole("button", { name: "男频", exact: true }).click(); await page.getByRole("button", { name: "科幻", exact: true }).click()
  const scifi = WIZARD_TEMPLATES.find(t => t.id === "plot-scifi-time-loop")!
  assert.ok(scifi); await page.getByRole("button", { name: new RegExp(scifi.title) }).dblclick(); await page.getByText(scifi.prompt, { exact: true }).waitFor()
  assert.equal(await page.getByRole("button", { name: new RegExp(romance.title) }).count(), 0)
}))
