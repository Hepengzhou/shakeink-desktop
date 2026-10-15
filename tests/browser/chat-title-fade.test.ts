import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { test } from "node:test"
import { build } from "esbuild"
import ts from "typescript"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { chromium, type Browser, type Page } from "playwright-core"

// 真实 ChatPanel 头部 JSX + 真实全局/桌面样式，断言标题渐变淡出与侧栏 nav-label 同式。
// 提取与挂载方式沿用 tests/browser/chat-caption-safe-area.test.ts 先例。
const tree = ts.createSourceFile("ChatPanel.tsx", readFileSync("src/components/layout/ChatPanel.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let header = ""
function visit(node: ts.Node) {
  if (ts.isJsxElement(node)) {
    const attr = node.openingElement.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(tree) === "className")
    if (attr && ts.isJsxAttribute(attr) && attr.initializer && ts.isStringLiteral(attr.initializer) && /\bdesktop-drag\b/.test(attr.initializer.text) && /\bh-11\b/.test(attr.initializer.text)) header = node.getText(tree)
  }
  ts.forEachChild(node, visit)
}
visit(tree)
assert(header)

const cssPath = resolve("src/app/globals.css")
const stylesheet = postcss([tailwindcss()]).process(readFileSync(cssPath, "utf8"), { from: cssPath }).then(result => result.css + "\n" + readFileSync("src/app/desktop.css", "utf8"))
const bundle = build({
  stdin: {
    loader: "tsx",
    resolveDir: process.cwd(),
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {PanelLeft,PanelRight,MessageSquare} from 'lucide-react';
import {NavigationLabel} from './src/components/layout/NavigationLabel';
window.mountHeader=(title,hasMessages)=>{
 const messages=hasMessages?[{id:'m1'}]:[];
 const currentConversation={id:'c1',title};
 const desktopBootstrap=null,sidebarHidden=false,contentHidden=false;
 const onShowSidebar=()=>{},onShowContent=()=>{};
 function App(){return <div id='chat'>${header}</div>}
 const root=createRoot(document.getElementById('app'));flushSync(()=>root.render(<App/>));
};`,
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  write: false,
  tsconfig: "tsconfig.json",
}).then(result => result.outputFiles![0].text)

const LONG_TITLE = "关于深海潜水员在马里亚纳海沟发现沉船宝藏的冒险故事构思讨论"
const SHORT_TITLE = "短标题"
let browser: Browser
test.before(async () => { browser = await chromium.launch({ headless: true, ...(process.env.SHAKEINK_TEST_CHROMIUM ? { executablePath: process.env.SHAKEINK_TEST_CHROMIUM } : {}) }) })
test.after(async () => { await browser?.close() })

async function scenario(width: number, title: string, hasMessages: boolean, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({ viewport: { width, height: 300 } })
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  try {
    await page.route("**/*", route => route.abort())
    await page.setContent('<div id="app"></div>')
    await page.addStyleTag({ content: await stylesheet })
    await page.addScriptTag({ content: await bundle })
    await page.evaluate(({ t, m }: { t: string; m: boolean }) => (window as never as { mountHeader: (title: string, hasMessages: boolean) => void }).mountHeader(t, m), { t: title, m: hasMessages })
    await run(page)
    assert.deepEqual(errors, [])
  } finally { await page.close() }
}

test("CT-01: long header title fades with the exact sidebar nav-label mask", async () => {
  await scenario(360, LONG_TITLE, true, async page => {
    const label = page.locator("#chat .nav-label")
    await label.waitFor()
    await page.waitForFunction(() => document.querySelector("#chat .nav-label")?.getAttribute("data-overflow") === "true")
    assert.equal(await label.evaluate(el => getComputedStyle(el).textOverflow), "clip")
    assert.equal(await label.evaluate(el => getComputedStyle(el).whiteSpace), "nowrap")
    assert.match(await label.evaluate(el => getComputedStyle(el).maskImage), /linear-gradient/)
    assert.match(await label.evaluate(el => getComputedStyle(el).maskImage), /24px/)
    assert.equal(await label.getAttribute("title"), LONG_TITLE, "悬停提示完整标题")
    assert.equal(await page.locator("#chat svg").count(), 1, "有内容时显示对话图标")
  })
})

test("CT-02: short header title stays unmasked", async () => {
  await scenario(760, SHORT_TITLE, true, async page => {
    const label = page.locator("#chat .nav-label")
    await label.waitFor()
    await page.waitForFunction(() => {
      const el = document.querySelector("#chat .nav-label")
      return !!el && el.getBoundingClientRect().width > 0 && el.getAttribute("data-overflow") !== "true"
    })
    assert.equal(await label.getAttribute("data-overflow"), null)
    assert.equal(await label.evaluate(el => getComputedStyle(el).maskImage), "none")
    assert.equal(await label.textContent(), SHORT_TITLE)
  })
})

test("CT-03: overflow is re-measured on viewport resize", async () => {
  await scenario(760, LONG_TITLE, true, async page => {
    await page.locator("#chat .nav-label").waitFor()
    const overflow = () => document.querySelector("#chat .nav-label")?.getAttribute("data-overflow") === "true"
    await page.waitForFunction(() => {
      const el = document.querySelector("#chat .nav-label")
      return !!el && el.getBoundingClientRect().width > 0
    })
    // 等一轮渲染帧，让 ResizeObserver 完成首轮测量
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.evaluate(overflow), false, "宽视口不溢出")
    await page.setViewportSize({ width: 360, height: 300 })
    await page.waitForFunction(() => document.querySelector("#chat .nav-label")?.getAttribute("data-overflow") === "true")
    await page.setViewportSize({ width: 760, height: 300 })
    await page.waitForFunction(() => document.querySelector("#chat .nav-label")?.getAttribute("data-overflow") !== "true")
  })
})

test("CT-04: empty conversation keeps the header placeholder without icon", async () => {
  await scenario(760, "", false, async page => {
    const headerBox = await page.locator("#chat > div").boundingBox()
    const rootFont = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    assert(headerBox)
    assert(Math.abs(headerBox!.height - 2.75 * rootFont) < 0.5, "h-11 头部高度保持")
    // 占位 span：改造前为 truncate span、改造后为 NavigationLabel span，均为空文本占位（护栏不断言具体类名）
    const span = page.locator("#chat > div > span").first()
    assert.equal(await span.textContent(), "", "空会话标题占位为空")
    assert.equal(await page.locator("#chat svg").count(), 0, "空会话不显示图标")
  })
})
