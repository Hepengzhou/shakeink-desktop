import {_electron} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve,join,dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {Workspaces} from '../desktop/service/workspaces.ts'
import {defaultState} from '../desktop/core/settings.ts'
const temporary=await mkdtemp(join(tmpdir(),'xaanink-version-star-'))
const packaged=process.argv.includes('--packaged')
const evidence=resolve('docs/evidence/version-star',packaged?'windows-package':'windows-electron')
await mkdir(evidence,{recursive:true})
const report={startedAt:new Date().toISOString(),status:'running',packaged,scope:'Actual Windows Electron with production UI, isolated resumed onboarding state, no models or credentials. Real IPC/standalone native window; shell.openExternal intercepted to verify exact routing, not OS browser launch. Renderer network observation begins after firstWindow, includes offline reload. Not macOS, physical keyboard, system DPI or NSIS install.',checks:[],errors:[],httpRequests:0,externalTargets:[],runtime:[],sourceHashes:{}}
const url='https://github.com/mySingleLive/xaanink-desktop'
let app,page,theme
const redact=value=>String(value).replaceAll(temporary,'<isolated-temp>').replaceAll(process.cwd(),'<repo>')
const sources=['package.json','package-lock.json','desktop/main/index.ts','desktop/main/project-about.ts','desktop/shared/project-info.ts','desktop/preload/index.ts','src/components/desktop/ProjectStarPrompt.tsx','src/components/desktop/SettingsDialog.tsx','src/components/desktop/OnboardingController.tsx','src/app/desktop.css','electron-builder.config.cjs','build/Credits.html']
for(const file of sources)report.sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
const stateFile=root=>join(root,'state.json')
async function saved(root){return JSON.parse(await readFile(stateFile(root),'utf8'))}
async function openSettings(){await page.getByRole('button',{name:'账号菜单',exact:true}).click();await page.getByRole('menuitem',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'关于我们',exact:true}).click()}
async function launch(root){
 app=await _electron.launch({args:packaged?[]:[resolve('.')],...(packaged?{executablePath:resolve('release/win-unpacked/玄印写作.exe')}:{}),env:{...process.env,XAANINK_TEST_ROOT:root},timeout:60000})
 page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(20000)
 page.on('pageerror',error=>report.errors.push(redact(error.message)));page.on('request',request=>{if(/^https?:/i.test(request.url()))report.httpRequests++})
 await page.context().setOffline(true)
 await page.waitForURL('xaanink://app/',{timeout:60000})
 await app.evaluate(({BrowserWindow,shell})=>{BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900});globalThis.projectOpens=[];shell.openExternal=async url=>{globalThis.projectOpens.push(url)}})
}
async function externalCount(){return app.evaluate(()=>globalThis.projectOpens.length)}
async function snapshotCheck(root,action){const before=await readFile(stateFile(root),'utf8');await action();assert.equal(await readFile(stateFile(root),'utf8'),before)}
async function check(id,action){await action();report.checks.push({theme,id,status:'passed'})}
async function captureMain(name){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
 const pixels=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows().find(win=>win.webContents.getURL().startsWith('xaanink://')).webContents.capturePage()).toPNG().toString('base64'))
 await writeFile(join(evidence,name),Buffer.from(pixels,'base64'))
}
async function fullyInside(locator){
 const geometry=await locator.evaluate(element=>{const rect=element.getBoundingClientRect();return {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:innerWidth,height:innerHeight}})
 assert.ok(geometry.left>=-1&&geometry.top>=-1&&geometry.right<=geometry.width+1&&geometry.bottom<=geometry.height+1,JSON.stringify(geometry))
 return geometry
}
try{
 assert.equal(process.platform,'win32')
 for(theme of ['paper','ink']){
  const root=join(temporary,theme);await mkdir(root)
  const spaces=new Workspaces(root,resolve('prisma/migrations'));try{await spaces.initialize()}finally{await spaces.close()}
  const state=structuredClone(defaultState);state.settings.appearance.theme=theme
  state.onboarding={version:1,completed:false,step:'image-choice',textModelId:null,imageModelId:null,receipt:null}
  await writeFile(stateFile(root),JSON.stringify({schemaVersion:1,revision:0,value:state}))
  await launch(root)
  const choice=page.getByRole('dialog',{name:'要配置文生图模型吗？',exact:true})
  await expect(choice).toBeVisible({timeout:60000});await page.reload();await expect(choice).toBeVisible({timeout:60000})
  await check('VS-03-completion-gate',async()=>{
   await expect(page.getByRole('button',{name:'给玄印一颗 Star',exact:true})).toHaveCount(0);assert.equal(await externalCount(),0)
   await choice.getByRole('button',{name:'跳过',exact:true}).click()
   await expect(page.getByRole('dialog',{name:'欢迎使用',exact:true})).toBeVisible()
   assert.equal((await saved(root)).value.onboarding.completed,true);assert.equal((await saved(root)).value.onboarding.receipt.type,'image-choice')
  })
  const welcome=page.getByRole('dialog',{name:'欢迎使用',exact:true})
  await check('VS-03-welcome',()=>snapshotCheck(root,async()=>{
   await welcome.getByRole('button',{name:'给玄印一颗 Star',exact:true}).click();await expect.poll(externalCount).toBe(1)
   await expect(welcome).toBeVisible();await expect(welcome.getByRole('button',{name:'开始创作',exact:true})).toBeVisible()
   await captureMain(`${theme}-welcome.png`)
  }))
  await check('VS-03-focus',async()=>{await welcome.getByRole('button',{name:'开始创作',exact:true}).click();await expect(welcome).not.toBeVisible();await expect(page.getByRole('button',{name:'账号菜单',exact:true})).toBeFocused()})
  await openSettings()
  const settings=page.getByRole('dialog',{name:'设置',exact:true})
  await check('VS-01/02-settings',()=>snapshotCheck(root,async()=>{
   await expect(settings).toContainText('0.10-alpha');await expect(settings.locator('.desktop-settings-group > div > :last-child')).toHaveClass(/desktop-project-star-settings/)
   await settings.getByRole('button',{name:'去 GitHub 点亮 Star',exact:true}).click();await expect.poll(externalCount).toBe(2)
   await captureMain(`${theme}-settings.png`)
  }))
  await check('VS-09-settings-zoom',async()=>{
   await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.setBounds({width:800,height:600});win.webContents.setZoomFactor(1.5)})
   await expect.poll(()=>page.evaluate(()=>window.innerWidth)).toBeLessThanOrEqual(534)
   await expect.poll(()=>page.evaluate(()=>window.innerWidth)).toBeGreaterThanOrEqual(532)
   await expect.poll(()=>page.evaluate(()=>window.innerHeight)).toBeLessThanOrEqual(400)
   const row=settings.locator('.desktop-project-star-settings'),cta=row.getByRole('button')
   await cta.scrollIntoViewIfNeeded();await expect(cta).toBeInViewport()
   await fullyInside(settings);await fullyInside(cta)
   assert.equal(await settings.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true)
   assert.equal(await row.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true)
   const label=await row.locator('.desktop-project-star-copy').boundingBox(),button=await cta.boundingBox();assert.ok(label&&button&&label.x<label.x+label.width&&button.x>=label.x+label.width)
   const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio}))
   report.checks.push({theme,id:'VS-09-settled-geometry',...geometry,status:'passed'})
   await captureMain(`${theme}-settings-small.png`)
  })
  await settings.getByRole('button',{name:'关闭设置',exact:true}).click()
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('desktop:onboarding',{detail:'full'})))
  await check('VS-09-welcome-zoom',async()=>{
   await expect(welcome).toBeVisible();const start=welcome.getByRole('button',{name:'开始创作',exact:true})
   const star=welcome.getByRole('button',{name:'给玄印一颗 Star',exact:true});await star.scrollIntoViewIfNeeded();await star.click();await expect.poll(externalCount).toBe(3);await fullyInside(star);await captureMain(`${theme}-welcome-small-star.png`)
   await start.scrollIntoViewIfNeeded();await expect(start).toBeInViewport();assert.equal(await welcome.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true)
   await fullyInside(welcome);await fullyInside(start);await captureMain(`${theme}-welcome-small.png`)
   await start.click();await expect(welcome).not.toBeVisible()
  })
  await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.webContents.setZoomFactor(1);win.setBounds({width:1440,height:900})})
  const popup=app.waitForEvent('window');await page.evaluate(()=>window.desktop.command('app.about'));const about=await popup
  about.setDefaultTimeout(20000)
  await check('VS-05-about',async()=>{
   await expect(about.getByRole('heading',{name:'玄印写作',exact:true})).toBeVisible();await expect(about.locator('body')).toContainText('版本 0.10-alpha')
   assert.equal(await about.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),theme==='ink'?'dark':'light')
   const preferences=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(win=>win.getTitle()==='关于玄印写作').webContents.getLastWebPreferences())
   assert.equal(preferences.nodeIntegration,false);assert.equal(preferences.sandbox,true);assert.equal(preferences.contextIsolation,true);assert.ok(!preferences.preload)
   await snapshotCheck(root,async()=>{await about.getByRole('link',{name:'☆ 在 GitHub 支持玄印 ↗',exact:true}).click({noWaitAfter:true});await expect.poll(externalCount).toBe(4)})
   await expect(about.getByRole('heading',{name:'玄印写作',exact:true})).toBeVisible();await about.screenshot({path:join(evidence,`${theme}-about.png`)})
  })
  await check('VS-06-about-denial',async()=>{
   assert.equal(await about.evaluate(()=>window.open('https://evil.invalid/')),null);assert.equal(await externalCount(),4)
   await about.evaluate(()=>{location.href='https://github.com.evil.invalid/'})
   const retained=await app.evaluate(async({BrowserWindow})=>{const contents=BrowserWindow.getAllWindows().find(win=>win.getTitle()==='关于玄印写作').webContents;return {url:contents.getURL(),heading:await contents.executeJavaScript('document.querySelector("h1").textContent')}})
   assert.ok(retained.url.startsWith('data:'));assert.equal(retained.heading,'玄印写作');assert.equal(await externalCount(),4)
  })
  await check('VS-07-untrusted-handler',async()=>{
   const denied=await app.evaluate(async({ipcMain,BrowserWindow})=>{
    const handler=ipcMain._invokeHandlers.get('desktop:open-project-repository'),windows=BrowserWindow.getAllWindows(),main=windows.find(win=>win.webContents.getURL().startsWith('xaanink://')),child=windows.find(win=>win!==main),frame=main.webContents.mainFrame,results=[]
    for(const event of [{sender:child.webContents,senderFrame:child.webContents.mainFrame},{sender:main.webContents,senderFrame:{}}, {sender:{},senderFrame:frame}]){try{await handler(event);results.push(false)}catch{results.push(true)}}
    // Isolated predicate check against the actual registered handler, not a real navigation.
    const descriptor=Object.getOwnPropertyDescriptor(frame,'url')
    Object.defineProperty(frame,'url',{value:'https://evil.invalid/',configurable:true})
    try{try{await handler({sender:main.webContents,senderFrame:frame});results.push(false)}catch{results.push(true)}}finally{if(descriptor)Object.defineProperty(frame,'url',descriptor);else delete frame.url}
    return results
   });assert.deepEqual(denied,[true,true,true,true]);assert.equal(await externalCount(),4)
  })
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(win=>win.getTitle()==='关于玄印写作').close())
  const bootstrap=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(bootstrap.models.length,0);assert.equal(bootstrap.version,'0.10-alpha')
  const runtime=await app.evaluate(({app,nativeTheme})=>({platform:process.platform,electron:process.versions.electron,version:app.getVersion(),packaged:app.isPackaged,themeSource:nativeTheme.themeSource,listeningServers:process._getActiveHandles().filter(handle=>handle.constructor.name==='Server'&&handle.listening).length}))
  assert.equal(runtime.version,'0.10.0-alpha');assert.equal(runtime.packaged,packaged);assert.equal(runtime.listeningServers,0);assert.equal(runtime.themeSource,theme==='ink'?'dark':'light');report.runtime.push({theme,...runtime})
  report.externalTargets.push(...await app.evaluate(()=>globalThis.projectOpens));assert.ok(report.externalTargets.every(target=>target===url))
  await app.close();app=undefined
  await launch(root);await expect(page.getByRole('dialog',{name:'尚未配置文本模型',exact:true})).toBeVisible({timeout:60000})
  await page.getByRole('button',{name:'暂不配置',exact:true}).click();assert.equal((await page.evaluate(()=>window.desktop.bootstrap())).version,'0.10-alpha')
  report.checks.push({theme,id:'VS-10-restart-offline',status:'passed'});await app.close();app=undefined
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.httpRequests,0);report.status='passed'
}catch(error){report.status='failed';report.error=redact(error.stack??error);await page?.screenshot({path:join(evidence,'failure.png')}).catch(()=>{});process.exitCode=1}
finally{
 await app?.close().catch(()=>{});assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('xaanink-version-star-'))
 await rm(temporary,{recursive:true,force:true});report.cleanedIsolatedData=true;report.completedAt=new Date().toISOString()
 await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error,evidence}))
}
