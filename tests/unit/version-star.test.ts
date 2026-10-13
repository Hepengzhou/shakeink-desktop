import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
const read=(path:string)=>readFile(path,'utf8')

test('VS-01: package and lock declare the same valid alpha release',async()=>{
 const pkg=JSON.parse(await read('package.json')),lock=JSON.parse(await read('package-lock.json'))
 assert.equal(pkg.version,'0.10.0-alpha');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version)
 const require=createRequire(import.meta.url);assert.equal(require('semver').valid(pkg.version),pkg.version)
})
test('VS-01: display is derived from the installed version without freezing other releases',async()=>{
 const {displayAppVersion}=await import('../../desktop/shared/project-info')
 assert.equal(displayAppVersion('0.10.0-alpha'),'0.10-alpha')
 for(const version of ['0.10.1-alpha','0.10.0-beta','0.11.2','1.0.0','unknown'])assert.equal(displayAppVersion(version),version)
})
test('VS-05: standalone About has precise link, escaped actual version and offline CSP',async()=>{
 const {projectAboutHtml}=await import('../../desktop/main/project-about')
 const {PROJECT_REPOSITORY_URL,PROJECT_STAR_COPY}=await import('../../desktop/shared/project-info')
 const html=projectAboutHtml('<img src=x onerror=alert(1)>','ink')
 assert.ok(html.includes(`href="${PROJECT_REPOSITORY_URL}"`));assert.ok(html.includes(PROJECT_STAR_COPY.about.message))
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));assert.ok(!/<script\b|<[^>]*\bon(?:click|error)\s*=/i.test(html))
 assert.ok(html.includes("default-src 'none'"));assert.ok(html.includes('color-scheme:dark'))
 assert.ok(projectAboutHtml('0.10-alpha','paper').includes('color-scheme:light'))
})
test('VS-06: only exact project navigation opens externally and rejected open reports once',async()=>{
 const {installProjectAboutLinks}=await import('../../desktop/main/project-about')
 const {PROJECT_REPOSITORY_URL}=await import('../../desktop/shared/project-info')
 const handlers=new Map<string,Function>();let popup:Function=()=>{},opens:string[]=[],errors=0
 const contents={on:(event:string,handler:Function)=>{handlers.set(event,handler)},setWindowOpenHandler:(handler:Function)=>{popup=handler}}
 installProjectAboutLinks(contents as any,async url=>{opens.push(url)},()=>{errors++})
 for(const url of ['file:///C:/test','javascript:alert(1)','https://github.com.evil.invalid/','https://github.com/mySingleLive/xaanink-desktop/issues',PROJECT_REPOSITORY_URL+'?x=1',PROJECT_REPOSITORY_URL+'#star','https://user@github.com/mySingleLive/xaanink-desktop']){
  let prevented=false;handlers.get('will-navigate')!({preventDefault(){prevented=true}},url);assert.equal(prevented,true)
  assert.deepEqual(popup({url}),{action:'deny'})
 }
 assert.deepEqual(opens,[])
 handlers.get('will-navigate')!({preventDefault(){}},PROJECT_REPOSITORY_URL)
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(opens,[PROJECT_REPOSITORY_URL]);assert.equal(errors,0)
 assert.deepEqual(popup({url:PROJECT_REPOSITORY_URL}),{action:'deny'})
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(opens,[PROJECT_REPOSITORY_URL,PROJECT_REPOSITORY_URL])
 installProjectAboutLinks(contents as any,async()=>{throw Error('blocked')},()=>{errors++})
 handlers.get('will-navigate')!({preventDefault(){}},PROJECT_REPOSITORY_URL)
 await new Promise(resolve=>setImmediate(resolve));assert.equal(errors,1)
})
test('VS-07/08: trusted fixed IPC, retained native Mac About and packaged credits',async()=>{
 const main=await read('desktop/main/index.ts'),preload=await read('desktop/preload/index.ts')
 assert.match(main,/desktop:open-project-repository[^\n]*trusted\(event\)[^\n]*shell\.openExternal\(PROJECT_REPOSITORY_URL\)/)
 assert.match(preload,/openProjectRepository:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("desktop:open-project-repository"\)/)
 assert.match(main,/applicationVersion:\s*displayAppVersion\(app.getVersion\(\)\)/)
 assert.match(main,/version:\s*""/);assert.match(main,/app.showAboutPanel\(\)/)
 assert.ok(!main.match(/app.setAboutPanelOptions\(\{[^}]*credits\s*:/))
 const credits=await read('build/Credits.html'),{PROJECT_REPOSITORY_URL,PROJECT_STAR_COPY}=await import('../../desktop/shared/project-info')
 assert.ok(credits.includes(`href="${PROJECT_REPOSITORY_URL}"`));assert.ok(credits.includes(PROJECT_STAR_COPY.about.label));assert.ok(credits.includes(PROJECT_STAR_COPY.about.message))
 assert.ok(!/<script\b|on(?:click|error)=/i.test(credits))
 assert.equal((credits.match(/href="/g)??[]).length,1);assert.ok(!/\b(?:src|url)\s*[=(]/i.test(credits))
 const require=createRequire(import.meta.url),config=require('../../electron-builder.config.cjs')
 assert.ok(config.mac.extraFiles.some((file:any)=>file.from==='build/Credits.html'&&file.to==='Resources/Credits.html'))
})
