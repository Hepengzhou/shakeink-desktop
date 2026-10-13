import {_electron} from 'playwright'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {basename,dirname,join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {defaultState} from '../desktop/core/settings.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'

assert.equal(process.platform,'win32','Actual Windows required')
const tag=process.argv[2]??'green'
assert.ok(['red','green'].includes(tag))
const temporary=await mkdtemp(join(tmpdir(),'xaanink-image-providers-'))
const evidence=resolve('docs/evidence/image-providers',tag)
await mkdir(evidence,{recursive:true})
const report={status:'running',startedAt:new Date().toISOString(),scope:'Actual Windows development Electron; compiled real settings and onboarding React, isolated local state. New-provider checks have zero models/Key; legacy-edit checks use synthetic records and an OS-encrypted public fixture credential. Network/error observation starts after firstWindow and includes an offline reload, not process startup audit. Playwright/CDP input. Not macOS, installed package or supplier-call acceptance.',checks:[],errors:[],rendererHttpRequests:0,runtime:[],sourceHashes:{},bundleHashes:{}}
const hash=value=>createHash('sha256').update(value).digest('hex')
const redact=value=>String(value).replaceAll(temporary,'<isolated-temp>').replaceAll(process.cwd(),'<repo>')
for(const file of ['desktop/shared/model-catalog.ts','src/components/chat/provider-logos.tsx','src/components/desktop/ModelConfigurationDialog.tsx','src/components/desktop/ModelChoiceSelect.tsx','scripts/verify-image-providers.mjs'])report.sourceHashes[file]=hash(await readFile(file))
async function hashes(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=join(directory,entry.name);if(entry.isDirectory())await hashes(file);else if(/\.(?:js|css|html|svg)$/.test(file))report.bundleHashes[file.slice(process.cwd().length+1)]=hash(await readFile(file))}}
await hashes(resolve('out'));report.bundleHashes['dist/main/index.cjs']=hash(await readFile('dist/main/index.cjs'))
let app,page,theme
async function launch(root){
 app=await _electron.launch({args:[resolve('.')],env:{...process.env,XAANINK_TEST_ROOT:root},timeout:60000})
 page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(12000)
 page.on('pageerror',error=>report.errors.push(redact(error.message)))
 page.on('request',request=>{if(/^https?:/i.test(request.url()))report.rendererHttpRequests++})
 await page.context().setOffline(true)
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
 await page.waitForURL('xaanink://app/',{timeout:45000})
}
async function settings(){
 await page.getByRole('button',{name:'账号菜单',exact:true}).click()
 await page.getByRole('menuitem',{name:'设置',exact:true}).click()
 await page.getByRole('button',{name:'模型',exact:true}).click()
}
async function legacyEdit(root){
 // Public synthetic fixture encrypted by the actual OS provider, never a real Key.
 const encrypted=await app.evaluate(({safeStorage})=>{assertProtection();return safeStorage.encryptString('public-image-provider-fixture').toString('base64');function assertProtection(){if(!safeStorage.isEncryptionAvailable())throw Error('OS key protection unavailable')}})
 await app.close();app=undefined;page=undefined
 const fixtures=['google','custom'].map((provider,index)=>({id:`00000000-0000-4000-8000-00000000010${index+1}`,name:`旧配置 ${provider}`,provider,...(provider==='custom'?{providerName:'旧自定义供应商'}:{}),protocol:'openai',endpoint:provider==='google'?'https://generativelanguage.googleapis.com/v1beta':'https://fixture.invalid/v1',modelId:provider==='google'?'gemini-3.1-flash-image':'fixture-custom-image',kind:'IMAGE',contextWindow:0,enabled:true,thinkingLevels:[],defaultThinking:'default',authRevision:1,keyMask:'••••••••',encryptedKey:encrypted}))
 const stateFile=join(root,'state.json'),saved=JSON.parse(await readFile(stateFile,'utf8'));saved.value.models=fixtures
 await writeFile(stateFile,JSON.stringify(saved))
 await launch(root);await page.getByRole('button',{name:'暂不配置',exact:true}).click({timeout:45000});await settings()
 for(const fixture of fixtures){
  await page.getByRole('button',{name:`编辑模型 ${fixture.name}`,exact:true}).click()
  let dialog=page.getByRole('dialog',{name:'配置模型',exact:true}),provider=dialog.getByLabel('供应商',{exact:true})
  await expect(provider).toContainText(fixture.provider==='custom'?'旧自定义供应商':'Google')
  await provider.click();let list=page.getByRole('listbox',{name:'供应商',exact:true})
  await expect(list).toBeVisible();await expect(list.getByRole('option')).toHaveCount(2)
  assert.deepEqual(await list.getByRole('option').allTextContents(),['火山引擎','OpenAI'])
  await page.screenshot({path:join(evidence,`${theme}-legacy-${fixture.provider}-menu.png`)})
  await list.getByRole('option').filter({hasText:/^OpenAI$/}).click()
  await expect(dialog.getByLabel('API Key',{exact:true})).toHaveValue('')
  await expect(dialog.getByLabel('可用模型',{exact:true})).toContainText('请选择可用模型')
  await dialog.getByRole('button',{name:'取消',exact:true}).click()
  assert.deepEqual(JSON.parse(await readFile(stateFile,'utf8')).value.models.sort((a,b)=>a.id.localeCompare(b.id)),[...fixtures].sort((a,b)=>a.id.localeCompare(b.id)))
  await page.getByRole('button',{name:`编辑模型 ${fixture.name}`,exact:true}).click()
  dialog=page.getByRole('dialog',{name:'配置模型',exact:true})
  await expect(dialog.getByLabel('供应商',{exact:true})).toContainText(fixture.provider==='custom'?'旧自定义供应商':'Google')
  await dialog.getByRole('button',{name:'保存模型',exact:true}).click()
  await expect(dialog).not.toBeVisible()
  const persisted=JSON.parse(await readFile(stateFile,'utf8')).value.models.find(item=>item.id===fixture.id)
  assert.deepEqual(persisted,fixture)
  report.checks.push({theme,id:`IP-05-${fixture.provider}-cancel-save`,status:'passed'})
 }
 await app.close();app=undefined;page=undefined
 await launch(root);await page.getByRole('button',{name:'暂不配置',exact:true}).click({timeout:45000});await settings()
 assert.equal((await page.evaluate(()=>window.desktop.bootstrap())).models.length,2)
 for(const fixture of fixtures){await page.getByRole('button',{name:`编辑模型 ${fixture.name}`,exact:true}).click();const dialog=page.getByRole('dialog',{name:'配置模型',exact:true});await expect(dialog.getByLabel('供应商',{exact:true})).toContainText(fixture.provider==='custom'?'旧自定义供应商':'Google');await dialog.getByRole('button',{name:'取消',exact:true}).click()}
 report.checks.push({theme,id:'IP-05-reopen',status:'passed'})
}
async function check(id,action){await action();report.checks.push({theme,id,status:'passed'})}
async function verifyMenu(entry){
 const dialog=page.getByRole('dialog',{name:entry==='onboarding'?'配置文生图模型':'配置模型',exact:true})
 const provider=dialog.getByLabel('供应商',{exact:true})
 await expect(dialog).toBeVisible()
 await provider.click()
 const list=page.getByRole('listbox',{name:'供应商',exact:true})
 await expect(list).toBeVisible()
 await expect(list.getByRole('option')).toHaveCount(2)
 const names=await list.getByRole('option').allTextContents()
 report.checks.push({theme,id:`${entry}-observed-menu`,names})
 assert.deepEqual(names,['火山引擎','OpenAI'])
 const logos=list.locator('img')
 assert.deepEqual(await logos.evaluateAll(images=>images.map(image=>({src:image.getAttribute('src'),alt:image.alt}))),[{src:'/brands/providers/volcengine.svg',alt:'火山引擎'},{src:'/brands/providers/openai.svg',alt:'OpenAI'}])
 await expect.poll(()=>logos.evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true)
 await page.screenshot({path:join(evidence,`${theme}-${entry}-menu.png`)})
 await page.getByLabel('搜索供应商',{exact:true}).fill('自定义')
 await expect(list.getByRole('option')).toHaveCount(0)
 await page.getByLabel('搜索供应商',{exact:true}).fill('')
 await list.getByRole('option').filter({hasText:/^OpenAI$/}).click()
 await expect(provider).toContainText('OpenAI')
 await expect(dialog.getByLabel('API Key',{exact:true})).toHaveValue('')
 await expect(dialog.getByLabel('可用模型',{exact:true})).toContainText('请选择可用模型')
 await provider.click();await list.getByRole('option').filter({hasText:/^火山引擎$/}).click()
 await expect(provider).toContainText('火山引擎')
 assert.equal((await page.evaluate(()=>window.desktop.bootstrap())).models.length,0)
}
try{
 for(theme of ['paper','ink']){
  const root=join(temporary,theme);await mkdir(root,{recursive:true})
  const workspaces=new Workspaces(root,resolve('prisma/migrations'))
  try{await workspaces.initialize()}finally{await workspaces.close()}
  const state=structuredClone(defaultState);state.settings.appearance.theme=theme
  state.onboarding={version:1,completed:false,step:'image',textModelId:null,imageModelId:null,receipt:null}
  await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state}))
  await launch(root)
  await expect(page.getByRole('dialog',{name:'配置文生图模型',exact:true})).toBeVisible({timeout:45000})
  await page.reload();await expect(page.getByRole('dialog',{name:'配置文生图模型',exact:true})).toBeVisible({timeout:45000})
  await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme)
  assert.equal(page.url(),'xaanink://app/')
  const bootstrap=await page.evaluate(()=>window.desktop.bootstrap())
  assert.equal(bootstrap.platform,'win32');assert.equal(bootstrap.models.length,0);assert.equal(bootstrap.dataRoot,root)
  await check('IP-07-onboarding',()=>verifyMenu('onboarding'))
  await page.getByRole('button',{name:'跳过',exact:true}).click()
  await page.getByRole('button',{name:'开始创作',exact:true}).click()
  await settings()
  await page.getByRole('button',{name:'添加文生图模型',exact:true}).click()
  await check('IP-07-settings',()=>verifyMenu('settings'))
  await page.getByRole('dialog',{name:'配置模型',exact:true}).getByRole('button',{name:'取消',exact:true}).click()
  await page.getByRole('button',{name:'添加文本模型',exact:true}).click()
  const textDialog=page.getByRole('dialog',{name:'配置模型',exact:true})
  await textDialog.getByLabel('供应商',{exact:true}).click()
  const textList=page.getByRole('listbox',{name:'供应商',exact:true})
  await expect(textList).toBeVisible();await expect(textList.getByRole('option')).toHaveCount(13)
  assert.deepEqual(await textList.getByRole('option').allTextContents(),['深度求索','阿里巴巴','月之暗面','智谱','Xiaomi','MiniMax','腾讯','火山引擎','OpenAI','Anthropic','Google','xAI','自定义供应商'])
  await textList.getByRole('option').filter({hasText:/^火山引擎$/}).click()
  await expect(textDialog.getByLabel('供应商',{exact:true}).locator('img')).toHaveAttribute('src','/brands/providers/volcengine.svg')
  report.checks.push({theme,id:'IP-02-text',status:'passed'})
  report.runtime.push({theme,...await app.evaluate(()=>({platform:process.platform,versions:process.versions,listeningServers:process._getActiveHandles().filter(handle=>handle.constructor.name==='Server'&&handle.listening).length}))})
  assert.equal((await page.evaluate(()=>window.desktop.bootstrap())).models.length,0)
  await legacyEdit(root)
  await app.close();app=undefined;page=undefined
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.rendererHttpRequests,0)
 assert.ok(report.runtime.every(item=>item.listeningServers===0));report.status='passed'
}catch(error){
 report.status='failed';report.error=redact(error.stack||error)
 if(page)await page.screenshot({path:join(evidence,'failure.png')}).catch(()=>{})
 process.exitCode=1
}finally{
 await app?.close().catch(()=>{})
 assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('xaanink-image-providers-'))
 await rm(temporary,{recursive:true,force:true});report.cleanedIsolatedData=true;report.completedAt=new Date().toISOString()
 await writeFile(join(evidence,'windows-electron.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error,evidence:`docs/evidence/image-providers/${tag}/windows-electron.json`}))
}
