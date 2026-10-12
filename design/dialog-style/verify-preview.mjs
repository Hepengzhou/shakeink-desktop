// Only verifies the local HTML review artifact; never counts as product tests.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
const directory=resolve('design/dialog-style')
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,ignoreDefaultArgs:['--hide-scrollbars']})
const page=await browser.newPage({viewport:{width:1440,height:1250},deviceScaleFactor:1})
const errors=[],failed=[],network=[],checks=[]
page.on('pageerror',error=>errors.push(error.message))
page.on('requestfailed',request=>failed.push(request.failure()?.errorText))
page.on('request',request=>{if(/^https?:/i.test(request.url()))network.push(request.url())})
try{
  const observations=JSON.parse(await readFile(join(directory,'preview-observations.json'),'utf8'))
  assert.equal(observations.revision,'v2');assert.equal(observations.overlayOpacity,.10)
  assert.equal(observations.records.length,24)
  for(const record of observations.records){
    assert.equal(record.viewport.width,1440);assert.equal(record.viewport.height,900)
    assert.equal(record.pngDimensions.width,Math.round(1440*record.dpr));assert.equal(record.pngDimensions.height,Math.round(900*record.dpr))
    const expected=record.scene==='menu'?0:['profile','confirm','wizard-detail'].includes(record.scene)?2:1
    assert.equal(record.dialogs.length,expected)
    assert(record.scene==='menu'?record.overlays.length===0:record.overlays.length>=1)
    if(record.look==='proposed'){
      assert(record.overlays.every(item=>item.backdrop==='none'&&item.background==='rgba(0, 0, 0, 0.1)'))
      assert(record.dialogs.every(item=>item.shadow.includes('12px 32px')))
    }
  }
  await page.goto(pathToFileURL(join(directory,'index.html')).href)
  for(const theme of ['paper','ink']){
    await page.locator(`[data-theme="${theme}"]`).click()
    for(const scene of ['settings','profile','wizard','wizard-detail','planning','drawer','confirm','scenario','menu']){
      await page.locator('#scene').selectOption(scene)
      for(const look of ['proposed','current']){
        await page.locator(`[data-look="${look}"]`).click()
        await page.locator('#shot').evaluate(el=>el.decode())
        assert.equal(await page.locator('#canvas').getAttribute('class'),theme+' '+look)
        assert.equal(await page.locator('[data-theme][aria-pressed=true]').count(),1)
        assert.equal(await page.locator('[data-look][aria-pressed=true]').count(),1)
        if(['planning','drawer','scenario'].includes(scene)&&look==='proposed'){
          const style=await page.locator('.shade').evaluate(el=>{const s=getComputedStyle(el);return{color:s.backgroundColor,backdrop:s.backdropFilter,webkit:CSS.supports('-webkit-backdrop-filter','none')?s.getPropertyValue('-webkit-backdrop-filter'):null}})
          assert.equal(style.color,'rgba(0, 0, 0, 0.1)');assert.equal(style.backdrop,'none');if(style.webkit!==null)assert.equal(style.webkit,'none')
          assert((await page.locator('.dialog-card:visible').evaluate(el=>getComputedStyle(el).boxShadow)).includes('12px 32px'))
        }
        checks.push({theme,scene,look,imageDecoded:true})
      }
    }
    assert((await readFile(join(directory,`${theme}-menu-current.png`))).equals(await readFile(join(directory,`${theme}-menu-proposed.png`))),'menu pixels must remain unchanged')
  }
  await page.locator('[data-theme="paper"]').click();await page.locator('#scene').selectOption('settings');await page.locator('[data-look="proposed"]').click();await page.locator('#shot').evaluate(el=>el.decode())
  await page.screenshot({path:join(directory,'html-preview-paper.png'),fullPage:true})
  await page.locator('[data-theme="ink"]').click();await page.locator('#shot').evaluate(el=>el.decode())
  await page.screenshot({path:join(directory,'html-preview-ink.png'),fullPage:true})
  await page.setViewportSize({width:560,height:1050})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  assert.equal(overflow,false)
  await page.locator('[data-theme="paper"]').focus();await page.keyboard.press('Enter')
  assert.equal(await page.locator('[data-theme="paper"]').getAttribute('aria-pressed'),'true')
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(network,[])
  await writeFile(join(directory,'html-checks.json'),JSON.stringify({revision:'v2',overlayOpacity:.10,purpose:'Design HTML rendering/controls only; product tests not executed',browser:await browser.version(),node:process.version,captureRecordsValidated:24,networkObservationScope:'Captured renderer observation begins after firstWindow returned; no main/worker startup network claim',checks,menuPixelEquality:true,narrowPageOverflow:false,keyboardControl:true,pageErrors:errors,failedRequests:failed,httpRequests:network},null,2)+'\n')
  console.log(JSON.stringify({purpose:'design-html-only',scenarios:checks.length,menuPixelEquality:true,errors:errors.length,httpRequests:network.length}))
}finally{await browser.close()}
