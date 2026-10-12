// Actual Windows Electron, compiled product UI and real isolated draft/clipboard
// IPC. No CSS injection, mock bridge, network service or platform appearance switch.
import assert from 'node:assert/strict'
import { _electron } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

assert.equal(process.platform,'win32')
const evidence=resolve('docs/evidence/toast-style')
await mkdir(evidence,{recursive:true})
const records=[],checks=[],errors=[],httpRequests=[],runtimes=[]
const sources=['src/components/ui/sonner.tsx','src/app/desktop.css','src/app/providers.tsx','dist/main/index.cjs','dist/preload/index.cjs','out/index.html']
const sourceHashes={}
for(const path of sources)sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex')
async function hashCss(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())await hashCss(path);else if(entry.name.endsWith('.css'))sourceHashes[path.slice(resolve('.').length+1).replaceAll('\\','/')]=createHash('sha256').update(await readFile(path)).digest('hex')}}
await hashCss(resolve('out/_next'))
const palettes={paper:{background:'rgb(252, 248, 238)',info:'rgb(53, 108, 175)',success:'rgb(57, 118, 83)'},ink:{background:'rgb(33, 28, 25)',info:'rgb(138, 182, 244)',success:'rgb(137, 197, 157)'}}
const startedAt=new Date().toISOString()
for(const initialTheme of['paper','ink']){
  const directory=await mkdtemp(join(tmpdir(),'xaanink-toast-style-')),root=join(directory,'data')
  execFileSync(process.execPath,['--import','tsx','scripts/seed-toast-style-fixture.ts',directory,initialTheme],{cwd:resolve('.'),stdio:'pipe'})
  console.log(`Prepared isolated ${initialTheme} prerequisites.`)
  const env={...process.env,XAANINK_TEST_ROOT:root};delete env.ELECTRON_RUN_AS_NODE
  let app,page,clipboardCaptured=false,theme=initialTheme
  const toastSelector=type=>`[data-sonner-toast][data-type="${type}"]:not([data-removed="true"])`
  async function stable(locator){await locator.waitFor();await locator.evaluate(async el=>{await new Promise(requestAnimationFrame);await Promise.all(el.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))})}
  async function capture(type,scene,zoom=1){
    const locator=page.locator(toastSelector(type)).first();await stable(locator);await locator.hover()
    const style=await locator.evaluate(el=>{const css=getComputedStyle(el),icon=el.querySelector('[data-icon]'),button=el.querySelector('[data-button]');return{background:css.backgroundColor,color:css.color,radius:css.borderRadius,rect:el.getBoundingClientRect().toJSON(),drag:css.getPropertyValue('-webkit-app-region'),icon:icon?{color:getComputedStyle(icon).color,width:icon.getBoundingClientRect().width,svgWidth:icon.querySelector('svg').getBoundingClientRect().width}:null,button:button?{text:button.textContent,drag:getComputedStyle(button).getPropertyValue('-webkit-app-region')}:null,theme:el.closest('[data-sonner-toaster]').dataset.sonnerTheme,dpr:devicePixelRatio,captionZoom:Number(getComputedStyle(document.documentElement).getPropertyValue('--desktop-caption-zoom'))}})
    assert.equal(style.theme,theme==='ink'?'dark':'light');assert.equal(style.background,palettes[theme].background);assert.equal(style.icon.color,palettes[theme][type]);assert.equal(style.icon.width,32);assert.equal(style.icon.svgWidth,20);assert.equal(style.rect.width,Math.min(420,await page.evaluate(()=>innerWidth)-32));assert.equal(style.radius,'12px');assert.equal(style.drag,'no-drag');assert.ok(Math.abs(style.rect.top-(44/zoom+16))<1.2);assert.equal(style.captionZoom,zoom)
    const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}))
    assert.ok(Math.abs((style.rect.left+style.rect.right)/2-viewport.width/2)<1.2);assert.ok(style.rect.right<=viewport.width-15.9)
    const screenshot=`windows-${initialTheme}-${scene}.png`,encoded=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64')),buffer=Buffer.from(encoded,'base64'),dimensions=await sharp(buffer).metadata()
    await writeFile(join(evidence,screenshot),buffer)
    assert.ok(Math.abs(dimensions.width-viewport.width*style.dpr)<=2);assert.ok(Math.abs(dimensions.height-viewport.height*style.dpr)<=2)
    records.push({initialTheme,theme,type,scene,zoom,style,screenshot,png:{width:dimensions.width,height:dimensions.height},viewport})
    return locator
  }
  async function settings(){
    const existing=page.locator('[data-desktop-settings-surface]')
    if(!await existing.isVisible()){
      const recovery=page.getByRole('dialog',{name:'保留的草稿',exact:true});if(await recovery.isVisible())await page.keyboard.press('Escape')
      const directoryTab=page.getByRole('button',{name:'作品目录',exact:true});if(await directoryTab.isVisible())await directoryTab.click()
      await page.getByRole('button',{name:'账号菜单',exact:true}).click();await page.getByRole('menuitem',{name:'设置',exact:true}).click()
    }
    await existing.waitFor();return existing
  }
  async function openRecovery(){const surface=await settings();await surface.getByRole('button',{name:'通用',exact:true}).click();await surface.getByRole('button',{name:'查看草稿',exact:true}).click();await page.getByRole('dialog',{name:'保留的草稿',exact:true}).waitFor()}
  async function copyDraft(){
    await page.evaluate(selector=>window.__toastPreviousSuccess=document.querySelector(selector),toastSelector('success'))
    await page.getByRole('button',{name:'复制内容',exact:true}).click()
    await page.waitForFunction(selector=>{const current=document.querySelector(selector);return current&&current!==window.__toastPreviousSuccess},toastSelector('success'))
  }
  try{
    app=await _electron.launch({args:[resolve('.')],env,timeout:90000});page=await app.firstWindow({timeout:90000});page.setDefaultTimeout(8000)
    page.on('pageerror',e=>errors.push({initialTheme,message:String(e.message).replaceAll(directory,'<isolated-temp>')}));page.on('request',r=>{if(/^https?:/i.test(r.url()))httpRequests.push({initialTheme,url:r.url()})})
    await page.context().setOffline(true)
    await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.setBounds({width:1440,height:900})})
    await page.locator(toastSelector('info')).first().waitFor({timeout:90000})
    await page.keyboard.press('Alt+t')
    await page.getByRole('button',{name:'暂不配置',exact:true}).click({timeout:30000})
    await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor({timeout:90000})
    const state=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(state.dataRoot,root);assert.equal(state.models.length,0);assert.equal(state.platform,'win32')
    runtimes.push(await app.evaluate(({BrowserWindow})=>({platform:process.platform,electron:process.versions.electron,zoom:BrowserWindow.getAllWindows()[0].webContents.getZoomFactor(),sandbox:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox})))
    await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
    const retained=await capture('info','startup');assert.match(await retained.textContent(),/已保留 1 项待核对草稿/)
    assert.equal(await retained.locator('[data-button]').evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-app-region')),'no-drag')
    await retained.getByRole('button',{name:'查看草稿',exact:true}).click();await page.getByRole('dialog',{name:'保留的草稿',exact:true}).waitFor();assert.match(await page.getByLabel('保留的草稿内容',{exact:true}).inputValue(),/隔离消息框专项草稿/)
    await page.getByText('保留的编辑副本',{exact:true}).waitFor()
    checks.push({id:'TST-W01/W02',initialTheme,step:'real startup unmatched autosave info action opens original draft view'})
    await app.evaluate(async({clipboard,ClipboardItem})=>{
      const items=await clipboard.read(),copies=[]
      for(const item of items){const payload={};for(const type of item.types)payload[type]=await item.getType(type);copies.push(new ClipboardItem(payload))}
      globalThis.__toastClipboardSnapshot=copies
      if(copies.length)await clipboard.write(copies)
    });clipboardCaptured=true
    await copyDraft();await capture('success','copy');assert.equal(await app.evaluate(async({clipboard})=>await clipboard.readText()),'隔离消息框专项草稿')
    checks.push({id:'TST-W02',initialTheme,step:'real clipboard IPC emits success'})
    for(const zoom of[.75,1,1.5,2]){
      const surface=await settings();await surface.getByRole('button',{name:'外观',exact:true}).click();await surface.getByLabel('界面缩放',{exact:true}).selectOption(String(zoom))
      await page.waitForFunction(async zoom=>(await window.desktop.bootstrap()).settings.appearance.zoom===zoom,zoom)
      assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()),zoom)
      await page.waitForFunction(zoom=>Number(getComputedStyle(document.documentElement).getPropertyValue('--desktop-caption-zoom'))===zoom,zoom)
      await openRecovery();await copyDraft();await capture('success',`zoom-${zoom}`,zoom);checks.push({id:'TST-W03',initialTheme,zoom,step:'real settings control changes native zoom and message safety distance'})
    }
    const surface=await settings();await surface.getByRole('button',{name:'外观',exact:true}).click();await surface.getByLabel('界面缩放',{exact:true}).selectOption('1')
    await page.waitForFunction(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--desktop-caption-zoom'))===1)
    await openRecovery();await copyDraft()
    await page.locator(toastSelector('success')).first().evaluate(el=>{window.__toastOriginalNode=el;window.__toastOriginalText=el.textContent})
    const appearance=await settings();await appearance.getByRole('button',{name:'外观',exact:true}).click();theme=initialTheme==='paper'?'ink':'paper';await appearance.getByRole('button',{name:theme==='ink'?'玄墨':'宣纸',exact:true}).click()
    await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
    assert.ok(await page.evaluate(()=>window.__toastOriginalNode?.isConnected&&window.__toastOriginalNode.dataset.removed!=='true'&&getComputedStyle(window.__toastOriginalNode).opacity==='1'&&window.__toastOriginalNode.textContent===window.__toastOriginalText))
    assert.ok(await page.locator(toastSelector('success')).first().evaluate(el=>window.__toastOriginalNode===el));await capture('success','theme-switch');assert.ok(await page.locator(toastSelector('success')).first().evaluate(el=>window.__toastOriginalNode===el&&window.__toastOriginalNode.textContent===window.__toastOriginalText))
    checks.push({id:'TST-W04',initialTheme,toTheme:theme,step:'real theme UI changes existing notification without replacing its DOM node'})
    console.log(`Windows ${initialTheme}: startup, real draft action/clipboard, four native zooms and existing toast theme change passed.`)
  }catch(error){
    if(page){await page.screenshot({path:join(evidence,`windows-${initialTheme}-failure.png`)}).catch(()=>{});console.log(await page.locator('body').innerText().catch(()=>'<no renderer body>'))}
    await writeFile(join(evidence,'windows-failure.json'),JSON.stringify({initialTheme,errors,httpRequests,runtimes,message:String(error)},null,2)+'\n')
    throw error
  }finally{
    try{if(clipboardCaptured&&app){await app.evaluate(async({clipboard})=>{if(globalThis.__toastClipboardSnapshot.length)await clipboard.write(globalThis.__toastClipboardSnapshot);else clipboard.clear();delete globalThis.__toastClipboardSnapshot});console.log(`Restored clipboard snapshot for current ${initialTheme} run.`)}}finally{if(app)await app.close()}
  }
}
assert.deepEqual(errors,[]);assert.deepEqual(httpRequests,[])
await writeFile(join(evidence,'windows-electron.json'),JSON.stringify({startedAt,finishedAt:new Date().toISOString(),platform:'win32',scope:'Actual development Electron and real isolated journal/clipboard IPC; not installed package or macOS',isolatedData:true,models:0,clipboardRestored:true,clipboardRestorationScope:'Only this successful rerun preconditions; an earlier failed run could not restore its original clipboard because read() objects were read-only and OS history was disabled. That original content has not been recovered.',networkObservationScope:'Renderer only, firstWindow return through close; does not certify main/worker startup network',sourceHashes,runtimes,records,checks,errors,rendererHttpRequests:httpRequests,notExecuted:['warning/loading/normal business scenarios in native UI (browser component matrix covers them)','macOS','installed package','physical keyboard/IME','full regression']},null,2)+'\n')
console.log(`Windows Electron scoped checks passed: ${records.length} captured states, ${checks.length} interactions.`)
