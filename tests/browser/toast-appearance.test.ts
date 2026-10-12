import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { build } from "esbuild"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { chromium, type Browser, type Page } from "playwright-core"

// Real Toaster, Sonner, React, next-themes, Lucide and product CSS. Notification
// inputs/background are isolated fixtures; this is not Electron or business proof.
const stylesheet = (async () => {
  const path = resolve("src/app/globals.css")
  return (await postcss([tailwindcss()]).process(
    await readFile(path, "utf8") + "\n" + await readFile("src/app/desktop.css", "utf8"), { from: path },
  )).css
})()
const bundle = build({ stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';
import{ThemeProvider,useTheme}from'next-themes';import{toast,Toaster as NativeToaster}from'sonner';import{InfoIcon}from'lucide-react';
import{Toaster}from'./src/components/ui/sonner';
window.calls=[];
function Controls(){const{setTheme}=useTheme();window.changeTheme=setTheme;return null}
window.mountToast=({theme='paper',props={},customIcon=false,native=false})=>{
 const root=createRoot(document.getElementById('app'));
 const overrides=customIcon?{...props,icons:{info:<InfoIcon data-custom-icon size={20}/>}}:props;
 const Component=native?NativeToaster:Toaster;
 flushSync(()=>root.render(<ThemeProvider attribute='class' defaultTheme={theme} themes={['paper','ink','light','dark','custom']} enableSystem={true} storageKey='isolated-toast-test'><Controls/><Component position='top-center' richColors {...overrides}/></ThemeProvider>));
};
window.notify=(kind,options={})=>{
 const data={id:'target',testId:'target',duration:Infinity,...options};
 if(data.action===true||typeof data.action==='string')data.action={label:typeof data.action==='string'?data.action:'查看草稿',onClick:()=>window.calls.push('action')};
 if(data.cancel===true)data.cancel={label:'取消',onClick:()=>window.calls.push('cancel')};
 const message=data.message||'隔离消息内容';delete data.message;
 return kind==='normal'?toast.message(message,data):toast[kind](message,data);
};
window.dismissToast=()=>toast.dismiss();
window.promiseToast=()=>{const promise=new Promise(resolve=>{window.resolveToast=resolve});toast.promise(promise,{id:'target',testId:'target',loading:'正在处理隔离任务',success:'隔离任务已完成',duration:Infinity})};
window.customToast=()=>toast.custom(()=> <div data-custom-toast style={{color:'#123456',background:'#ddeeff'}}><span data-description>自定义表面</span><button data-button style={{color:'#654321',background:'#eeddbb'}}>自定义按钮</button></div>,{id:'target',testId:'target',duration:Infinity});
` }, bundle: true, write: false, platform: "browser", format: "iife", tsconfig: "tsconfig.json", define: { "process.env.NODE_ENV": '"production"' } }).then(r => r.outputFiles![0].text)

type Theme = "paper" | "ink"
const palette = {
  paper: { surface: "rgb(252, 248, 238)", text: "rgb(43, 37, 27)", description: "rgb(116, 102, 79)", icons: ["rgb(53, 108, 175)", "rgb(57, 118, 83)", "rgb(163, 109, 24)", "rgb(184, 75, 66)", "rgb(104, 119, 138)"] },
  ink: { surface: "rgb(33, 28, 25)", text: "rgb(236, 231, 225)", description: "rgb(181, 169, 159)", icons: ["rgb(138, 182, 244)", "rgb(137, 197, 157)", "rgb(237, 192, 112)", "rgb(239, 153, 146)", "rgb(176, 187, 201)"] },
}
const kinds = ["info", "success", "warning", "error", "loading", "normal"]
const target = '[data-testid="target"]'
let browser: Browser
test.before(async () => { browser = await chromium.launch({headless:true,...(process.env.XAANINK_TEST_CHROMIUM?{executablePath:process.env.XAANINK_TEST_CHROMIUM}:{})}) })
test.after(async () => { await browser?.close() })
async function scenario(theme: string, options: Record<string, unknown>, run: (page: Page) => Promise<void>) {
  const page = await browser.newPage({viewport:{width:1100,height:900}}), errors: string[] = []
  page.setDefaultTimeout(4000);page.on("pageerror",e=>errors.push(e.message))
  try {
    await page.route("**/*",route=>route.abort())
    await page.setContent('<html><body><input aria-label="编辑输入" value="保留选区"><div id="app"></div><div data-exclusion style="background:var(--popover);color:var(--popover-foreground)">普通浮层CSS探针</div></body></html>')
    await page.addStyleTag({content:await stylesheet});await page.addScriptTag({content:await bundle})
    await page.evaluate(options=>(window as any).mountToast(options),{theme,...options})
    await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
    await run(page);assert.deepEqual(errors,[])
  } finally { await page.close() }
}
async function notify(page: Page, kind: string, options: Record<string, unknown> = {}) {
  await page.evaluate(({kind,options})=>(window as any).notify(kind,options),{kind,options})
  await page.locator(target).waitFor()
  await page.waitForFunction(selector=>document.querySelector(selector)?.getAttribute("data-mounted")==="true",target)
  await page.locator(target).evaluate(async el=>{await new Promise(requestAnimationFrame);await Promise.all(el.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))})
}
async function info(page: Page) {
  return page.locator(target).evaluate(el=>{
    const css=getComputedStyle(el),icon=el.querySelector('[data-icon]'),svg=icon?.querySelector('svg'),content=el.querySelector('[data-content]')!,button=el.querySelector('[data-button]'),description=el.querySelector('[data-description]'),ol=el.closest('[data-sonner-toaster]')!
    return {background:css.backgroundColor,color:css.color,radius:css.borderRadius,font:css.fontSize,line:css.lineHeight,drag:css.getPropertyValue('-webkit-app-region'),rect:el.getBoundingClientRect().toJSON(),theme:ol.getAttribute('data-sonner-theme'),icon:icon?{color:getComputedStyle(icon).color,background:getComputedStyle(icon).backgroundColor,width:icon.getBoundingClientRect().width,svgWidth:svg?parseFloat(getComputedStyle(svg).width):undefined,shape:svg?.getAttribute('class')}:null,contentOverflow:content.scrollWidth>content.clientWidth+1,button:button?{color:getComputedStyle(button).color,background:getComputedStyle(button).backgroundColor,rect:button.getBoundingClientRect().toJSON()}:null,description:description?getComputedStyle(description).color:null}
  })
}
function luminance(color:string){const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4});return channels.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}

for(const theme of ["paper","ink"] as const){
  for(const [index,kind] of kinds.entries())test(`TST-01 ${theme} ${kind}: opaque card and distinct type icon`,()=>scenario(theme,{},async page=>{
    const input=page.getByLabel('编辑输入');await input.focus();await notify(page,kind)
    const actual=await info(page);assert.equal(actual.theme,theme==='ink'?'dark':'light');assert.equal(actual.background,palette[theme].surface);assert.equal(actual.color,palette[theme].text)
    assert.equal(actual.radius,'12px');assert.equal(actual.font,'14px');assert.equal(actual.line,'22px');assert.equal(actual.rect.width,420);assert.equal(actual.drag,'no-drag')
    assert.ok(contrast(actual.color,actual.background)>=4.5);assert.ok(await input.evaluate(el=>document.activeElement===el))
    if(kind==='normal')assert.equal(actual.icon,null)
    else{assert.equal(actual.icon!.color,palette[theme].icons[index]);assert.equal(actual.icon!.width,32);assert.equal(actual.icon!.svgWidth,20);assert.ok(contrast(actual.icon!.color,actual.icon!.background)>=3);assert.match(actual.icon!.shape!,[/info/i,/circle-check/i,/triangle-alert/i,/octagon-x/i,/loader/i][index])}
  }))
  test(`TST-02 ${theme}: long description, action, hover and real keyboard focus`,()=>scenario(theme,{},async page=>{
    await notify(page,'info',{message:'隔离的长消息内容。'.repeat(8),description:'隔离的次级说明，内容自然换行。',action:true})
    const actual=await info(page);assert.equal(actual.description,palette[theme].description);assert.ok(!actual.contentOverflow);assert.ok(contrast(actual.description!,actual.background)>=4.5);assert.ok(actual.button!.rect.height>=32);assert.ok(contrast(actual.button!.color,actual.button!.background)>=4.5)
    await page.keyboard.press('Alt+t');await page.waitForFunction(()=>document.activeElement===document.querySelector('[data-sonner-toaster]'));await page.keyboard.press('Tab');await page.waitForFunction(selector=>document.activeElement===document.querySelector(selector),target)
    assert.equal(await page.locator(target).evaluate(el=>getComputedStyle(el).outlineStyle),'solid')
    await page.keyboard.press('Tab');const button=page.locator(`${target} [data-button]`);assert.ok(await button.evaluate(el=>document.activeElement===el));assert.equal(await button.evaluate(el=>getComputedStyle(el).outlineStyle),'solid')
    await button.hover();assert.notEqual(await button.evaluate(el=>getComputedStyle(el).backgroundColor),actual.button!.background)
    await button.click();assert.deepEqual(await page.evaluate(()=>(window as any).calls),['action']);await page.locator(target).waitFor({state:'detached'})
  }))
  test(`TST-03 ${theme}: loading/promise same ID updates and dismiss`,()=>scenario(theme,{},async page=>{
    await notify(page,'loading');await notify(page,'success');assert.equal(await page.locator('[data-sonner-toast]').count(),1);assert.equal((await info(page)).icon!.color,palette[theme].icons[1])
    await page.evaluate(()=>(window as any).dismissToast());await page.locator(target).waitFor({state:'detached'})
    await page.evaluate(()=>(window as any).promiseToast());await page.locator(`${target}[data-type=loading]`).waitFor()
    await page.evaluate(()=>(window as any).resolveToast('done'));await page.locator(`${target}[data-type=success]`).waitFor();assert.equal(await page.locator('[data-sonner-toast]').count(),1);assert.equal((await info(page)).background,palette[theme].surface)
  }))
  test(`TST-04 ${theme}: stack order, hover and hotkey pause retain duration`,()=>scenario(theme,{},async page=>{
    for(const [id,kind]of[['one','info'],['two','warning'],['three','success']])await page.evaluate(({id,kind})=>(window as any).notify(kind,{id,testId:id}),{id,kind})
    assert.equal(await page.locator('[data-sonner-toast]').count(),3);assert.equal(await page.locator('[data-front=true]').getAttribute('data-testid'),'three')
    await page.locator('[data-front=true]').hover();await page.waitForFunction(()=>document.querySelectorAll('[data-sonner-toast][data-expanded=true]').length===3)
    await page.evaluate(()=>(window as any).dismissToast());await page.locator('[data-sonner-toast]').last().waitFor({state:'detached'})
    await page.mouse.move(600,800);await notify(page,'info',{duration:1800});await page.locator(target).hover();await page.waitForTimeout(2100);assert.equal(await page.locator(target).count(),1)
    await page.mouse.move(600,800);await page.locator(target).waitFor({state:'detached'})
    await notify(page,'info',{duration:1800});await page.keyboard.press('Alt+t');await page.waitForFunction(()=>document.activeElement===document.querySelector('[data-sonner-toaster]'));await page.waitForTimeout(2100);assert.equal(await page.locator(target).count(),1)
    await page.keyboard.press('Escape');await page.locator(target).waitFor({state:'detached'})
  }))
  for(const width of[320,390,560,600,601])test(`TST-05 ${theme} width ${width}: long message fits centered <=420`,()=>scenario(theme,{},async page=>{
    await page.setViewportSize({width,height:900});await notify(page,'error',{message:'导出失败，原草稿仍保留在本机，请检查目录权限。'.repeat(4),description:'说明与操作完整显示。',action:true})
    const actual=await info(page);assert.equal(actual.rect.width,Math.min(420,width-32));assert.ok(actual.rect.left>=15.9&&actual.rect.right<=width-15.9);assert.ok(Math.abs((actual.rect.left+actual.rect.right)/2-width/2)<1);assert.ok(!actual.contentOverflow);assert.ok(actual.button!.rect.right<=actual.rect.right);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  }))
  for(const zoom of[.75,1,1.5,2])test(`TST-06 ${theme} caption zoom ${zoom}: top offset`,()=>scenario(theme,{},async page=>{
    await page.evaluate(zoom=>document.documentElement.style.setProperty('--desktop-caption-zoom',String(zoom)),zoom);await notify(page,'info');assert.ok(Math.abs((await info(page)).rect.top-(44/zoom+16))<1)
  }))
}
test('TST-07 existing toast follows actual theme context and explicit theme overrides',()=>scenario('paper',{},async page=>{
  await notify(page,'info');await page.locator(target).evaluate(el=>(window as any).previousToast=el)
  await page.evaluate(()=>(window as any).changeTheme('ink'));await page.waitForFunction(()=>document.querySelector('[data-sonner-toaster]')?.getAttribute('data-sonner-theme')==='dark')
  assert.equal((await info(page)).background,palette.ink.surface);assert.equal((await info(page)).icon!.color,palette.ink.icons[0]);assert.ok(await page.locator(target).evaluate(el=>(window as any).previousToast===el))
}))
for(const explicit of['light','dark','system'])test(`TST-07 explicit ${explicit} uses matching final theme palette`,()=>scenario('paper',{props:{theme:explicit}},async page=>{
  await page.emulateMedia({colorScheme:'dark'});await notify(page,'info');if(explicit==='system')await page.waitForFunction(()=>document.querySelector('[data-sonner-toaster]')?.getAttribute('data-sonner-theme')==='dark')
  const actual=await info(page);assert.equal(actual.background,explicit==='light'?palette.paper.surface:palette.ink.surface)
}))
test('TST-07 unknown app theme falls back to valid light',()=>scenario('custom',{},async page=>{await notify(page,'info');assert.equal((await info(page)).theme,'light')}))
test('TST-08 custom options merge with scoped classes, icons and single-toast overrides',()=>scenario('paper',{customIcon:true,props:{className:'caller-toaster',style:{'--caller-token':'retained'},toastOptions:{duration:10000,classNames:{toast:'caller-toast',title:'caller-title'}}}},async page=>{
  await notify(page,'info',{classNames:{toast:'single-toast',title:'single-title'},style:{borderWidth:'3px'}})
  assert.match(await page.locator('[data-sonner-toaster]').getAttribute('class')||'',/desktop-toaster/);assert.match(await page.locator(target).getAttribute('class')||'',/cn-toast.*caller-toast/);assert.match(await page.locator(target).getAttribute('class')||'',/single-toast/);assert.equal(await page.locator(`${target} [data-title]`).evaluate(el=>el.classList.contains('caller-title')&&el.classList.contains('single-title')),true)
  assert.equal(await page.locator('[data-sonner-toaster]').evaluate(el=>getComputedStyle(el).getPropertyValue('--caller-token')),'retained');assert.equal(await page.locator('[data-custom-icon]').count(),1);assert.equal(await page.locator(target).evaluate(el=>getComputedStyle(el).borderTopWidth),'3px');assert.equal(await page.locator('[data-close-button]').count(),0)
}))
test('TST-08 explicit cancel and close keep Sonner callbacks and dismissal',()=>scenario('paper',{props:{closeButton:true,toastOptions:{closeButtonAriaLabel:'关闭提示'}}},async page=>{
  await notify(page,'warning',{cancel:true});await page.locator(`${target} [data-cancel]`).click();assert.deepEqual(await page.evaluate(()=>(window as any).calls),['cancel']);await page.locator(target).waitFor({state:'detached'})
  await notify(page,'info',{id:'second'});await page.getByRole('button',{name:'关闭提示',exact:true}).click();await page.locator(target).waitFor({state:'detached'})
}))
test('TST-08 custom top/mobile offset and non-center position retain caller intent',async()=>{
  await scenario('paper',{props:{offset:{top:91,left:20,right:20},mobileOffset:{top:103,left:18,right:18}}},async page=>{await notify(page,'info');assert.ok(Math.abs((await info(page)).rect.top-91)<1);await page.setViewportSize({width:390,height:900});assert.ok(Math.abs((await info(page)).rect.top-103)<1);assert.equal((await info(page)).rect.width,354)})
  await scenario('paper',{props:{position:'top-left'}},async page=>{await notify(page,'info');assert.ok(Math.abs((await info(page)).rect.top-24)<1)})
  await scenario('paper',{},async page=>{await notify(page,'info',{position:'top-left'});assert.ok(Math.abs((await info(page)).rect.top-24)<1)})
})
test('TST-08 global toastOptions duration retains actual auto dismissal',()=>scenario('paper',{props:{toastOptions:{duration:1000}}},async page=>{await notify(page,'info',{duration:undefined});await page.locator(target).waitFor({state:'detached',timeout:1500})}))
test('TST-02 long action label wraps inside narrow card without truncation',()=>scenario('paper',{},async page=>{
 await page.setViewportSize({width:320,height:900});const label='查看完整的草稿内容与详细的保存记录并继续处理待核对修改'.repeat(3);await notify(page,'info',{action:label})
 const actual=await info(page);assert.ok(actual.button!.rect.right<=actual.rect.right);assert.ok(actual.button!.rect.left>=actual.rect.left);assert.ok(actual.button!.rect.height>32);assert.equal(await page.locator(`${target} [data-button]`).textContent(),label);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
}))
test('TST-09 custom/unstyled surfaces preserve native Sonner behavior; reduced motion',async()=>{
 let nativeDescription=''
 await scenario('ink',{native:true,props:{theme:'dark'}},async page=>{await page.evaluate(()=>(window as any).customToast());await page.locator('[data-custom-toast]').waitFor();nativeDescription=await page.locator('[data-custom-toast] [data-description]').evaluate(el=>getComputedStyle(el).color)})
 await scenario('ink',{},async page=>{
  await page.evaluate(()=>(window as any).customToast());await page.locator('[data-custom-toast]').waitFor();assert.equal(await page.locator('[data-custom-toast]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(221, 238, 255)');assert.equal(await page.locator('[data-custom-toast] [data-description]').evaluate(el=>getComputedStyle(el).color),nativeDescription);assert.equal(await page.locator('[data-custom-toast] [data-button]').evaluate(el=>getComputedStyle(el).color),'rgb(101, 67, 33)')
  await page.evaluate(()=>(window as any).dismissToast());await page.locator('[data-sonner-toast]').waitFor({state:'detached'})
  await notify(page,'info',{unstyled:true,style:{background:'#ddeeff',color:'#123456'},description:'自定义说明'});assert.equal(await page.locator(`${target} [data-description]`).evaluate(el=>getComputedStyle(el).color),nativeDescription);assert.equal(await page.locator('[data-exclusion]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 19, 18)')
  await page.evaluate(()=>(window as any).dismissToast());await page.locator(target).waitFor({state:'detached'});await page.emulateMedia({reducedMotion:'reduce'});await notify(page,'loading');assert.equal(await page.locator(`${target} [data-icon] svg`).evaluate(el=>getComputedStyle(el).animationName),'none')
 })
})
