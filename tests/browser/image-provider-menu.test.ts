import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { chromium, type Browser, type Page } from "playwright-core"
import { expect } from "@playwright/test"
import { readFile } from "node:fs/promises"

// Real React editor/Base UI; controlled local state and IPC, not native acceptance.
const bundle = build({ stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {ModelConfigurationDialog} from './src/components/desktop/ModelConfigurationDialog';
import {useDesktopStore} from './src/stores/desktop';import {defaultState} from './desktop/core/settings';
const root=createRoot(document.getElementById('app'));
globalThis.mount=(legacy,guide=false,options={})=>{globalThis.submissions=[];globalThis.closeCount=0;globalThis.catalogReads=[];globalThis.discoveries=[];globalThis.tests=[];
const model=legacy?{id:'00000000-0000-4000-8000-000000000102',name:'保留配置',provider:legacy,providerName:legacy==='custom'?'旧自定义供应商':undefined,protocol:'openai',endpoint:legacy==='google'?'https://generativelanguage.googleapis.com/v1beta':'https://fixture.invalid/v1',modelId:legacy==='google'?'gemini-3.1-flash-image':'legacy-image',kind:'IMAGE',contextWindow:0,enabled:true,thinkingLevels:[],defaultThinking:'default',authRevision:1,keyMask:'••••'}:undefined;
useDesktopStore.setState({bootstrap:{...structuredClone(defaultState),platform:'win32',models:model?[model]:[]}});globalThis.savedModels=()=>structuredClone(useDesktopStore.getState().bootstrap.models);
window.desktop={cancelModelConfiguration:async()=>{},discoverModels:async(...args)=>{globalThis.discoveries.push(args);throw Error('No discovery without a key')},testModel:async(...args)=>{globalThis.tests.push(args);throw Error('Unexpected model test')},readModelCatalog:async scope=>{
 globalThis.catalogReads.push(scope);if(scope.provider!=='google')return null;
 if(scope.kind!=='IMAGE'||scope.protocol!=='openai'||scope.endpoint!=='https://generativelanguage.googleapis.com/v1beta')throw Error('Unexpected Google catalog scope');
 const source='https://ai.google.dev/gemini-api/docs/models';
 return {ok:true,provider:'google',kind:'IMAGE',models:options.missingGoogleModel?[]:[{id:'gemini-3.1-flash-image',name:'gemini-3.1-flash-image',kind:'IMAGE',permission:'unknown',source}],authoritative:true,complete:true,unknownCapabilityIds:[],permission:'unknown',sources:[source],checkedAt:'2026-10-15T00:00:00.000Z',warnings:[]};
}};
flushSync(()=>root.render(<ModelConfigurationDialog key={String(legacy)+guide} kind='IMAGE' model={model} onClose={()=>globalThis.closeCount++} onboarding={guide?{onSubmit:async draft=>globalThis.submissions.push(draft),onSelectExisting:async()=>{}}:undefined}/>));};
globalThis.dispose=()=>flushSync(()=>root.unmount());
` }, bundle: true, write: false, platform: "browser", format: "iife", tsconfig: "tsconfig.json" })
let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })
async function scenario(run: (page: Page) => Promise<void>) {
  const page = await browser.newPage()
  page.setDefaultTimeout(5000)
  await page.route("**/*", async route => {
    const asset = /\/brands\/(providers|models)\/([a-z]+)\.svg$/.exec(route.request().url())
    if (asset) await route.fulfill({ contentType: "image/svg+xml", body: await readFile(`public/brands/${asset[1]}/${asset[2]}.svg`) })
    else await route.abort()
  })
  await page.setContent('<base href="https://fixture.invalid/"><style>[data-slot="dialog-overlay"]{position:fixed;inset:0;z-index:50}[data-slot="dialog-content"]{position:fixed;left:25%;top:5%;z-index:51;width:50%;max-height:85vh;overflow:auto;background:white;padding:16px}.z-50{z-index:70}.desktop-choice-popup{background:white;max-height:400px;overflow:auto}button{margin:4px}img,svg{width:20px;height:20px}</style><div id="app"></div>')
  await page.evaluate("globalThis.__name = target => target")
  await page.addScriptTag({ content: (await bundle).outputFiles[0].text })
  try { await run(page) } finally { await page.evaluate(() => (window as any).dispose()); await page.close() }
}
async function exactMenu(page: Page) {
  const list = page.getByRole("listbox", { name: "供应商", exact: true })
  await expect(list).toBeVisible()
  assert.deepEqual(await list.getByRole("option").allTextContents(), ["火山引擎", "OpenAI"])
}
for (const guide of [false, true]) test(`IP-04: ${guide ? "onboarding" : "settings"} has exactly two searchable providers and resets draft on keyboard selection`, async () => scenario(async page => {
  await page.evaluate(guide => (window as any).mount(null, guide), guide)
  const provider = page.getByRole("combobox", { name: "供应商", exact: true })
  await expect(provider).toContainText("火山引擎")
  const logo = provider.locator("img")
  await expect(logo).toHaveAttribute("src", "/brands/providers/volcengine.svg")
  await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await page.getByLabel("API Key", { exact: true }).fill("public-browser-fixture")
  await provider.click(); await exactMenu(page)
  await page.getByLabel("搜索供应商", { exact: true }).fill("Google")
  await expect(page.getByRole("option")).toHaveCount(0)
  await page.getByLabel("搜索供应商", { exact: true }).fill("OpenAI")
  await expect(page.getByRole("option")).toHaveCount(1)
  await page.getByLabel("搜索供应商", { exact: true }).press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(provider).toContainText("OpenAI")
  await expect(page.getByLabel("API Key", { exact: true })).toHaveValue("")
  await expect(page.getByLabel("可用模型", { exact: true })).toContainText("请选择可用模型")
  await provider.click(); await exactMenu(page)
  await page.getByRole("listbox", { name: "供应商", exact: true }).getByRole("option").filter({ hasText: /^火山引擎$/ }).click()
  await expect(provider).toContainText("火山引擎")
  assert.deepEqual(await page.evaluate(() => (window as any).submissions), [])
}))
for (const legacy of ["google", "custom"]) test(`IP-05: legacy ${legacy} current display survives while Base UI still lists only the two allowed providers`, async () => scenario(async page => {
  await page.evaluate(legacy => (window as any).mount(legacy, true), legacy)
  const before = await page.evaluate(() => (window as any).savedModels())
  if (legacy === "google") {
    await expect(page.getByLabel("可用模型", { exact: true })).toContainText("gemini-3.1-flash-image")
    assert.deepEqual(await page.evaluate(() => (window as any).catalogReads), [{provider:"google",kind:"IMAGE",protocol:"openai",endpoint:"https://generativelanguage.googleapis.com/v1beta"}])
  } else assert.deepEqual(await page.evaluate(() => (window as any).catalogReads), [])
  const provider = page.getByRole("combobox", { name: "供应商", exact: true })
  await expect(provider).toContainText(legacy === "custom" ? "旧自定义供应商" : "Google")
  await provider.click(); await exactMenu(page)
  await page.getByLabel("搜索供应商", { exact: true }).press("Escape")
  await expect(page.getByRole("listbox")).not.toBeVisible()
  await page.getByRole("button", { name: "继续", exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).submissions.length)).toBe(1)
  const submitted = await page.evaluate(() => (window as any).submissions[0])
  for (const field of ["id", "provider", "endpoint", "modelId"]) assert.equal(submitted[field], before[0][field])
  assert.equal(submitted.apiKey, "");assert.deepEqual(await page.evaluate(() => (window as any).savedModels()), before)
  assert.deepEqual(await page.evaluate(() => ({discoveries:(window as any).discoveries,tests:(window as any).tests})), {discoveries:[],tests:[]})
  await page.getByLabel("API Key", { exact: true }).fill("public-browser-fixture")
  await provider.click(); await exactMenu(page)
  await page.getByRole("listbox", { name: "供应商", exact: true }).getByRole("option").filter({ hasText: /^OpenAI$/ }).click()
  await expect(page.getByLabel("API Key", { exact: true })).toHaveValue("")
  await expect(page.getByLabel("可用模型", { exact: true })).toContainText("请选择可用模型")
  assert.equal(await page.getByLabel("供应商名称", { exact: true }).count(), 0)
}))
test("IP-05: a missing cached Google model clears the choice and blocks submit and test without reviving the saved ID", async () => scenario(async page => {
  await page.evaluate(() => (window as any).mount("google", true, {missingGoogleModel:true}))
  const before = await page.evaluate(() => (window as any).savedModels())
  const provider = page.getByRole("combobox", { name: "供应商", exact: true })
  await expect(provider).toContainText("Google")
  await expect(page.getByRole("status")).toContainText("请重新选择可用模型")
  await expect(page.getByLabel("可用模型", { exact: true })).toContainText("请选择可用模型")
  await provider.click();await exactMenu(page)
  await page.getByLabel("搜索供应商", { exact: true }).press("Escape")
  await expect(page.getByRole("listbox")).not.toBeVisible()
  await page.getByRole("button", { name: "继续", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("请选择可用模型")
  await page.getByRole("button", { name: "测试连接", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("请选择可用模型")
  assert.deepEqual(await page.evaluate(() => ({submissions:(window as any).submissions,discoveries:(window as any).discoveries,tests:(window as any).tests})), {submissions:[],discoveries:[],tests:[]})
  assert.deepEqual(await page.evaluate(() => (window as any).catalogReads), [{provider:"google",kind:"IMAGE",protocol:"openai",endpoint:"https://generativelanguage.googleapis.com/v1beta"}])
  assert.deepEqual(await page.evaluate(() => (window as any).savedModels()), before)
}))
for (const legacy of ["google", "custom"]) test(`IP-05: canceling legacy ${legacy} settings editor does not submit or mutate saved state`, async () => scenario(async page => {
  await page.evaluate(legacy => (window as any).mount(legacy, false), legacy)
  const before = await page.evaluate(() => (window as any).savedModels())
  const provider = page.getByRole("combobox", { name: "供应商", exact: true })
  await expect(provider).toContainText(legacy === "custom" ? "旧自定义供应商" : "Google")
  await page.getByLabel("API Key", { exact: true }).fill("public-browser-fixture")
  await provider.click(); await exactMenu(page)
  await page.getByRole("listbox", { name: "供应商", exact: true }).getByRole("option").filter({ hasText: /^OpenAI$/ }).click()
  await page.getByRole("button", { name: "取消", exact: true }).click()
  assert.equal(await page.evaluate(() => (window as any).closeCount), 1)
  assert.deepEqual(await page.evaluate(() => (window as any).submissions), [])
  assert.deepEqual(await page.evaluate(() => (window as any).savedModels()), before)
  await page.evaluate(legacy => (window as any).mount(legacy, true), legacy)
  await expect(provider).toContainText(legacy === "custom" ? "旧自定义供应商" : "Google")
}))
