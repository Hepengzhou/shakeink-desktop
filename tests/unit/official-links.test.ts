import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=(path:string)=>readFile(path,'utf8')

test('OL-01: official website, docs and FAQ URLs are the exact approved addresses',async()=>{
 const {PROJECT_WEBSITE_URL,PROJECT_DOCS_URL,PROJECT_FAQ_URL,PROJECT_EXTERNAL_LINKS,PROJECT_REPOSITORY_URL}=await import('../../desktop/shared/project-info')
 assert.equal(PROJECT_WEBSITE_URL,'https://shake.ink')
 assert.equal(PROJECT_DOCS_URL,'https://shake.ink/docs/introduction')
 assert.equal(PROJECT_FAQ_URL,'https://shake.ink/docs/faq')
 assert.deepEqual([...PROJECT_EXTERNAL_LINKS],[PROJECT_REPOSITORY_URL,PROJECT_WEBSITE_URL,PROJECT_DOCS_URL,PROJECT_FAQ_URL])
})
test('OL-02: help menu offers website, docs and FAQ as enabled commands on both platforms',async()=>{
 const catalog=JSON.parse(await read('desktop/shared/commands.json'))
 const labels=Object.fromEntries(catalog.commands.map((command:{id:string,label:string})=>[command.id,command.label]))
 assert.equal(labels['help.website'],'官方网站');assert.equal(labels['help.docs'],'帮助文档');assert.equal(labels['help.faq'],'常见问题')
 assert.deepEqual(catalog.menus.help,['help.website','help.docs','help.faq','help.feedback'])
 const {desktopMenu}=await import('../../desktop/shared/command-registry')
 for(const platform of ['darwin','win32'] as const){
  const help=desktopMenu(platform,{}).find(menu=>menu.id==='help')!
  assert.deepEqual(help.items.map(item=>item.id),platform==='win32'?['help.website','help.docs','help.faq','help.feedback','app.about']:['help.website','help.docs','help.faq','help.feedback'])
  assert.ok(help.items.every(item=>item.enabled))
 }
})
test('OL-03: main process routes each help link command to its fixed URL over the trusted channel',async()=>{
 const main=await read('desktop/main/index.ts'),preload=await read('desktop/preload/index.ts')
 assert.match(main,/ipcMain\.handle\("desktop:command", async \(event, id\) => \{ trusted\(event\)/)
 assert.match(preload,/command:\s*id\s*=>\s*ipcRenderer\.invoke\("desktop:command", id\)/)
 assert.match(main,/"help\.website"\) \{ await shell\.openExternal\(PROJECT_WEBSITE_URL\); return \}/)
 assert.match(main,/"help\.docs"\) \{ await shell\.openExternal\(PROJECT_DOCS_URL\); return \}/)
 assert.match(main,/"help\.faq"\) \{ await shell\.openExternal\(PROJECT_FAQ_URL\); return \}/)
 assert.ok(!/id === "help\.docs"\) return/.test(main))
})
test('OL-04: standalone About lists official links and the whitelist opens exactly the approved set',async()=>{
 const {projectAboutHtml,installProjectAboutLinks}=await import('../../desktop/main/project-about')
 const {PROJECT_WEBSITE_URL,PROJECT_DOCS_URL,PROJECT_FAQ_URL,PROJECT_EXTERNAL_LINKS,PROJECT_REPOSITORY_URL}=await import('../../desktop/shared/project-info')
 const html=projectAboutHtml('0.10-alpha','paper')
 for(const url of [PROJECT_WEBSITE_URL,PROJECT_DOCS_URL,PROJECT_FAQ_URL,PROJECT_REPOSITORY_URL])assert.ok(html.includes(`href="${url}"`),url)
 assert.ok(html.includes('官方网站')&&html.includes('帮助文档')&&html.includes('常见问题'))
 assert.ok(!/<script\b|<[^>]*\bon(?:click|error)\s*=/i.test(html))
 const handlers=new Map<string,Function>();let popup:Function=()=>{};const opens:string[]=[]
 const contents={on:(event:string,handler:Function)=>{handlers.set(event,handler)},setWindowOpenHandler:(handler:Function)=>{popup=handler}}
 installProjectAboutLinks(contents as any,async url=>{opens.push(url)},()=>{})
 for(const url of ['http://shake.ink','http://shake.ink/','http://shake.ink.evil.invalid','https://shake.ink.evil.invalid','http://shake.ink@evil.invalid',PROJECT_WEBSITE_URL+'?x=1',PROJECT_DOCS_URL+'#faq','file:///C:/shake.ink','javascript:alert(1)']){
  let prevented=false;handlers.get('will-navigate')!({preventDefault(){prevented=true}},url);assert.equal(prevented,true)
  assert.deepEqual(popup({url}),{action:'deny'})
 }
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(opens,[])
 for(const url of PROJECT_EXTERNAL_LINKS){handlers.get('will-navigate')!({preventDefault(){}},url);assert.deepEqual(popup({url}),{action:'deny'})}
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(opens,[...PROJECT_EXTERNAL_LINKS].flatMap(url=>[url,url]))
 // Chromium serializes the bare-origin website URL with a trailing slash; it must still open the canonical address.
 for(const emit of [()=>handlers.get('will-navigate')!({preventDefault(){}},PROJECT_WEBSITE_URL+'/'),()=>popup({url:PROJECT_WEBSITE_URL+'/'})])emit()
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(opens,[[...PROJECT_EXTERNAL_LINKS].flatMap(url=>[url,url]),PROJECT_WEBSITE_URL,PROJECT_WEBSITE_URL].flat())
})
test('OL-05: settings about page routes to the help commands and README lists the official links',async()=>{
 const settings=await read('src/components/desktop/SettingsDialog.tsx')
 for(const id of ['help.website','help.docs','help.faq','help.feedback'])assert.ok(settings.includes(`command('${id}')`),id)
 assert.ok(!settings.includes('官网文档上线后启用'));assert.ok(!settings.includes('帮助文档尚未上线'))
 const readme=await read('README.md')
 for(const url of ['https://shake.ink','https://shake.ink/docs/introduction','https://shake.ink/docs/faq'])assert.ok(readme.includes(url),url)
})
