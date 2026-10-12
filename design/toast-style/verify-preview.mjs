// Only verifies and screenshots this local HTML review artifact. No product tests.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const directory = resolve('design/toast-style')
const sourceFiles = ['src/components/ui/sonner.tsx','src/app/providers.tsx','src/app/globals.css','src/app/desktop.css','src/components/desktop/DesktopApp.tsx']
const hashes = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
const sourceBefore = await hashes()
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const page = await browser.newPage({viewport:{width:1440,height:1320},deviceScaleFactor:1})
page.setDefaultTimeout(7000)
const errors = [], failures = [], requests = [], checks = []
page.on('pageerror', error => errors.push(error.message))
page.on('requestfailed', request => failures.push({url:request.url(),error:request.failure()?.errorText}))
page.on('request', request => { if (/^https?:/i.test(request.url())) requests.push(request.url()) })
const rgba = color => color.match(/[\d.]+/g)?.map(Number)
const alpha = color => { const channels=rgba(color); return channels?.length===3?1:channels?.[3] }
const luminance = color => rgba(color).slice(0,3).map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0)
const contrast = (one,two) => { const a=luminance(one),b=luminance(two); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05) }
const inspect = selector => page.locator(selector).evaluate(element => {
  const style = getComputedStyle(element), icon = element.querySelector('[data-icon]'), button = element.querySelector('[data-button]'), description = element.querySelector('[data-description]')
  const rect = element.getBoundingClientRect(), host=element.closest('.demo-frame')?.getBoundingClientRect()
  return {type:element.dataset.type||'normal',theme:element.closest('[data-sonner-toaster]').dataset.sonnerTheme,background:style.backgroundColor,color:style.color,radius:style.borderRadius,opacity:style.opacity,filter:style.backdropFilter,rect:rect.toJSON(),host:host?.toJSON(),icon:icon?{color:getComputedStyle(icon).color,background:getComputedStyle(icon).backgroundColor,svg:icon.querySelector('svg')?.outerHTML}:null,button:button?{color:getComputedStyle(button).color,background:getComputedStyle(button).backgroundColor,rect:button.getBoundingClientRect().toJSON()}:null,description:description?{color:getComputedStyle(description).color}:null,overflow:element.scrollWidth>element.clientWidth+1}
})
const proposedFront = '.proposed-frame [data-sonner-toast][data-front="true"]'
const currentFront = '.current-frame [data-sonner-toast][data-front="true"]'
const stable = async selector => { await page.locator(selector).waitFor(); await page.waitForFunction(selector=>{const element=document.querySelector(selector);return element&&getComputedStyle(element).opacity==='1'},selector); await page.waitForTimeout(450) }

try {
  await page.goto(pathToFileURL(join(directory,'index.html')).href)
  await stable(proposedFront)
  await stable(currentFront)
  const current=await inspect(currentFront)
  assert.equal(current.theme,'paper'); assert.equal(alpha(current.background),0)
  checks.push({check:'current source reproduces invalid theme and transparent info background',current})
  for (const theme of ['paper','ink']) {
    await page.getByRole('button',{name:theme==='paper'?'宣纸':'玄墨',exact:true}).click()
    await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
    const colors=[]
    for(const type of ['info','success','warning','error','loading','normal']) {
      await page.getByLabel('内容场景',{exact:true}).selectOption('short')
      await page.getByLabel('消息类型',{exact:true}).selectOption(type)
      await page.waitForFunction(type=>{const element=document.querySelector('.proposed-frame [data-sonner-toast][data-front="true"]');return element&&(element.dataset.type||'normal')===type},type)
      await stable(proposedFront)
      const state=await inspect(proposedFront)
      assert.equal(state.theme,theme==='ink'?'dark':'light')
      assert.equal(alpha(state.background),1); assert.equal(state.radius,'12px'); assert.equal(state.filter,'none')
      assert.ok(contrast(state.color,state.background)>=4.5)
      assert.ok(!state.overflow)
      assert.equal(await page.locator(`${proposedFront} [data-button]`).count(),0)
      assert.equal(await page.locator(`${proposedFront} [data-description]`).count(),0)
      await page.keyboard.press('Shift');await page.locator(proposedFront).focus()
      assert.equal(await page.locator(proposedFront).evaluate(element=>getComputedStyle(element).outlineStyle),'solid')
      assert.ok(state.rect.top-state.host.top>=60-1)
      if(type!=='normal'){assert.ok(state.icon?.svg);assert.equal(alpha(state.icon.background),1);assert.ok(contrast(state.icon.color,state.icon.background)>=3);colors.push(state.icon.color)}
      checks.push({check:'short message',theme,type,state})
    }
    assert.equal(new Set(colors).size,5)
    await page.getByLabel('消息类型',{exact:true}).selectOption('info')
    for(const scene of ['action','long']) {
      await page.getByLabel('内容场景',{exact:true}).selectOption(scene)
      await stable(proposedFront)
      const state=await inspect(proposedFront)
      assert.ok(state.button);assert.equal(alpha(state.background),1);assert.equal(alpha(state.button.background),1)
      assert.ok(contrast(state.button.color,state.button.background)>=4.5);assert.ok(!state.overflow)
      if(state.description){assert.ok(contrast(state.description.color,state.background)>=4.5);assert.equal(state.description.color,theme==='paper'?'rgb(116, 102, 79)':'rgb(181, 169, 159)')}
      const button=page.locator(`${proposedFront} [data-button]`)
      await page.locator(proposedFront).focus();await page.keyboard.press('Tab')
      assert.ok(await button.evaluate(element=>document.activeElement===element))
      assert.ok(await button.evaluate(element=>getComputedStyle(element).outlineStyle==='solid'))
      const base=state.button.background;await button.hover()
      const hover=await button.evaluate(element=>getComputedStyle(element).backgroundColor)
      assert.notEqual(hover,base)
      await button.click()
      await page.getByText('已点击示例操作。产品中将继续执行消息原有的业务操作。',{exact:true}).waitFor()
      checks.push({check:'message with action and focus/hover/callback',theme,scene,state,hover})
      await page.getByRole('button',{name:'重新显示',exact:true}).click();await stable(proposedFront)
    }
    await page.getByLabel('内容场景',{exact:true}).selectOption('progress');await stable(proposedFront)
    assert.equal((await inspect(proposedFront)).type,'loading')
    await page.getByRole('button',{name:'模拟完成',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.proposed-frame [data-sonner-toast][data-front="true"]')?.dataset.type==='success')
    assert.equal(await page.locator('.proposed-frame [data-sonner-toast]').count(),1)
    checks.push({check:'same ID loading changes to success',theme})
    await page.getByLabel('内容场景',{exact:true}).selectOption('stack');await stable(proposedFront)
    assert.equal(await page.locator('.proposed-frame [data-sonner-toast]').count(),3)
    await page.locator(proposedFront).hover();await page.waitForTimeout(450)
    assert.equal(await page.locator('.proposed-frame [data-sonner-toast][data-expanded="true"]').count(),3)
    checks.push({check:'three messages expand on hover',theme})
    await page.getByLabel('内容场景',{exact:true}).selectOption('action');await page.getByLabel('消息类型',{exact:true}).selectOption('info');await stable(proposedFront)
    await page.mouse.move(5,5)
    await page.screenshot({path:join(directory,`preview-${theme}.png`),fullPage:true})
  }
  for(const width of [601,600,560,320,390]){
    await page.setViewportSize({width,height:1320})
    await page.getByLabel('内容场景',{exact:true}).selectOption('long');await stable(proposedFront)
    const state=await inspect(proposedFront)
    assert.ok(!state.overflow)
    assert.ok(state.rect.width<=420)
    assert.ok(state.rect.left>=state.host.left+15);assert.ok(state.rect.right<=state.host.right-15)
    assert.ok(state.rect.bottom<=state.host.bottom)
    assert.ok(state.button.rect.left>=state.rect.left);assert.ok(state.button.rect.right<=state.rect.right)
    assert.ok(Math.abs((state.rect.left+state.rect.right)/2-(state.host.left+state.host.right)/2)<=1)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    checks.push({check:'narrow viewport long message',width,state})
  }
  await page.screenshot({path:join(directory,'preview-narrow.png'),fullPage:true})
  await page.emulateMedia({reducedMotion:'reduce'})
  const reduced=await page.locator('.proposal-spin').first().evaluate(element=>getComputedStyle(element).animationName)
  assert.equal(reduced,'none');checks.push({check:'reduced motion disables proposed loader spin'})
  await page.setViewportSize({width:1440,height:1320})
  await page.getByLabel('内容场景',{exact:true}).selectOption('action');await page.getByLabel('消息类型',{exact:true}).selectOption('info');await stable(proposedFront)
  await page.getByRole('button',{name:'宣纸',exact:true}).focus();await page.keyboard.press('Enter')
  await page.waitForFunction(()=>document.documentElement.classList.contains('paper'))
  assert.equal(await page.getByRole('button',{name:'宣纸',exact:true}).getAttribute('aria-pressed'),'true')
  checks.push({check:'keyboard theme switch updates existing toast'})
  assert.deepEqual(await hashes(),sourceBefore)
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(requests,[])
  const report={date:'2026-10-12',revision:'v1',scope:'Local HTML design fixture only; not product tests or platform acceptance',productImplementation:false,productTestsExecuted:false,fullTestsExecuted:false,currentSourceImported:true,sourceHashes:sourceBefore,checks,errors,failedRequests:failures,httpRequests:requests}
  await writeFile(join(directory,'preview-checks.json'),JSON.stringify(report,null,2)+'\n')
  console.log(`HTML design checks passed: ${checks.length}; product source hashes unchanged; no HTTP requests.`)
}catch(error){await page.screenshot({path:join(directory,'preview-check-failure.png'),fullPage:true});throw error}finally{await browser.close()}
