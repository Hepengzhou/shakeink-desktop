import {_electron} from 'playwright-core'
import {expect} from '@playwright/test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm,realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve,dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {defaultState} from '../desktop/core/settings.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'

assert.equal(process.platform,'win32')
const label=process.argv[2]??'windows-final';assert.match(label,/^[a-z0-9-]+$/)
const temp=await realpath(await mkdtemp(join(tmpdir(),'shakeink-catalog-native-'))),root=join(temp,'data'),parent=resolve('docs/evidence/model-catalog-fix'),evidence=join(parent,label)
await mkdir(parent,{recursive:true});await mkdir(evidence);await mkdir(root)
const report={status:'running',scope:'Actual Windows development Electron, real compiled React/preload/main IPC and durable directory. Official GET /models responses are controlled protocol fixtures, never supplier or paid-call acceptance. Public fixture credentials only; isolated data. No HTTP service or outbound network.',startedAt:new Date().toISOString(),checks:[],errors:[],sourceHashes:{},bundleHashes:{}}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const redact=value=>String(value).replaceAll(temp,'<isolated-temp>').replaceAll(process.cwd(),'<repo>')
const sources=['desktop/main/model-catalog-repository.ts','desktop/main/model-configuration.ts','desktop/main/model-provider-adapters.ts','desktop/main/index.ts','desktop/shared/builtin-model-catalog.ts','desktop/shared/verified-model-seeds.json','desktop/shared/model-catalog.ts','desktop/shared/ipc.ts','desktop/preload/index.ts','src/components/desktop/ModelConfigurationDialog.tsx','scripts/verify-model-catalog-refresh.mjs']
for(const file of sources)report.sourceHashes[file]=hash(await readFile(file))
for(const file of ['dist/main/index.cjs','dist/preload/index.cjs'])report.bundleHashes[file]=hash(await readFile(file))
async function uiHashes(directory){for(const item of await readdir(directory,{withFileTypes:true})){const file=join(directory,item.name);if(item.isDirectory())await uiHashes(file);else if(/\.(js|css|html)$/.test(file))report.bundleHashes[file.slice(process.cwd().length+1)]=hash(await readFile(file))}}
await uiHashes(resolve('out'))
let app,page
const guard=join(temp,'offline-guard.cjs'),harness=join(temp,'catalog-main.cjs'),networkReport=join(temp,'network.txt')
const scope={provider:'deepseek',kind:'TEXT',protocol:'openai',endpoint:'https://api.deepseek.com'}
async function check(id,work){await work();report.checks.push({id,status:'passed'})}
async function close(){await app.close();app=page=undefined}
async function launch(mode){
  app=await _electron.launch({args:[harness],env:{...process.env,SHAKEINK_TEST_ROOT:root,SHAKEINK_CATALOG_FIXTURE_MODE:mode,SHAKEINK_CATALOG_NETWORK_REPORT:networkReport},timeout:60000})
  page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(12000)
  page.on('pageerror',error=>report.errors.push(redact(error.message)))
  page.on('request',request=>{if(/^https?:/i.test(request.url()))report.errors.push('Unexpected renderer HTTP request')})
  await page.context().setOffline(true)
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1280,height:900}))
  await page.waitForURL('shakeink://app/',{timeout:45000})
  const boot=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(boot.platform,'win32');assert.equal(boot.dataRoot,root)
  if(!boot.models.length)await page.getByRole('button',{name:'暂不配置',exact:true}).click({timeout:45000})
  await page.getByRole('button',{name:/^账号菜单/}).click();await page.getByRole('menuitem',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'模型',exact:true}).click()
}
const dialog=()=>page.getByRole('dialog',{name:'配置模型',exact:true})
async function openModels(){await dialog().getByLabel('可用模型',{exact:true}).click();return page.getByRole('listbox',{name:'可用模型',exact:true})}
try{
  const workspaces=new Workspaces(root,resolve('prisma/migrations'));try{await workspaces.initialize()}finally{await workspaces.close()}
  const state=structuredClone(defaultState);state.settings.appearance.theme='ink';state.onboarding={version:1,completed:true,step:'welcome',textModelId:null,imageModelId:null,receipt:null}
  await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state}))
  await writeFile(guard,`
const fs=require('node:fs'),net=require('node:net');
const denied=()=>{fs.appendFileSync(process.env.SHAKEINK_CATALOG_NETWORK_REPORT,'network-denied\\n');throw Error('Catalog verification forbids external network');};
globalThis.__catalogFixtureRows=[{id:'deepseek-v4-pro'}];globalThis.__catalogFixtureCalls=0;
globalThis.fetch=async function(input){const url=typeof input==='string'||input instanceof URL?String(input):input?.url;
 if(url==='https://api.deepseek.com/models'&&process.env.SHAKEINK_CATALOG_FIXTURE_MODE==='fixture'){globalThis.__catalogFixtureCalls++;return Response.json({data:globalThis.__catalogFixtureRows});}
 return denied();};
for(const name of ['node:http','node:https']){const api=require(name);api.request=denied;api.get=denied;}
for(const [prototype,name] of [[net.Server.prototype,'listen'],[net.Socket.prototype,'connect']]){const original=prototype[name];prototype[name]=function(...args){const normalized=Array.isArray(args[0])?args[0]:net._normalizeArgs(args);if(!normalized[0]?.path)return denied();return original.apply(this,args);};}
`)
  execFileSync(process.execPath,['--require',guard,'-e',`const net=require('node:net'),assert=require('node:assert/strict');assert.throws(()=>net.createServer().listen(0),/forbids/);assert.throws(()=>new net.Socket().connect(443,'example.invalid'),/forbids/);`],{env:{...process.env,SHAKEINK_CATALOG_NETWORK_REPORT:networkReport},timeout:10000})
  assert.equal((await readFile(networkReport,'utf8')).trim().split('\n').length,2);await writeFile(networkReport,'')
  await writeFile(harness,`
require(${JSON.stringify(guard)});
const workers=require('node:worker_threads'),Worker=workers.Worker;workers.Worker=class extends Worker{constructor(file,options={}){super(file,{...options,execArgv:[...(options.execArgv??[]),'--require',${JSON.stringify(guard)}]});}};
const {app,session,net}=require('electron');net.fetch=()=>{throw Error('External Electron fetch forbidden');};net.request=()=>{throw Error('External Electron request forbidden');};
app.setAppPath(${JSON.stringify(resolve('.'))});app.whenReady().then(()=>session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>callback({cancel:true})));
require(${JSON.stringify(resolve('dist/main/index.cjs'))});
`)
  await launch('fixture');await page.getByRole('button',{name:'添加文本模型',exact:true}).click()
  await check('MC-12-seeds-and-live-prune',async()=>{
    let list=await openModels();await expect(list.getByRole('option')).toHaveCount(2);await list.getByRole('option').filter({hasText:/^deepseek-flash/}).click()
    await dialog().getByLabel('API Key',{exact:true}).fill('public-catalog-native-fixture')
    await expect.poll(()=>app.evaluate(()=>globalThis.__catalogFixtureCalls),{timeout:15000}).toBe(1)
    await expect(dialog().getByLabel('可用模型',{exact:true})).toContainText('deepseek-v4-pro')
    await expect(dialog()).toContainText('已替换为下一个可用模型')
    list=await openModels();await expect(list.getByRole('option')).toHaveCount(1);await expect(list.getByRole('option')).toContainText('deepseek-v4-pro');assert.equal(await list.getByText('deepseek-flash',{exact:true}).count(),0)
    await page.screenshot({path:join(evidence,'live-replaced.png')});await page.keyboard.press('Escape')
    const stored=JSON.parse(await readFile(join(root,'model-catalogs.json'),'utf8'));assert.deepEqual(stored.value[0].models.map(m=>m.id),['deepseek-v4-pro']);assert.equal(JSON.stringify(stored).includes('public-catalog-native-fixture'),false)
  })
  await dialog().getByRole('button',{name:'取消',exact:true}).click();await close()
  await launch('offline');await page.getByRole('button',{name:'添加文本模型',exact:true}).click()
  await check('MC-12-offline-restart-no-key',async()=>{
    await expect(dialog().getByLabel('API Key',{exact:true})).toHaveValue('');const list=await openModels();await expect(list.getByRole('option')).toHaveCount(1);await expect(list.getByRole('option')).toContainText('deepseek-v4-pro')
    await page.screenshot({path:join(evidence,'offline-restarted.png')});await page.keyboard.press('Escape')
    const cached=await page.evaluate(scope=>window.desktop.readModelCatalog(scope),scope);assert.ok(cached.ok);assert.equal(cached.models[0].permission,'unknown');assert.equal(await app.evaluate(()=>globalThis.__catalogFixtureCalls),0)
    assert.equal((await page.evaluate(()=>window.desktop.bootstrap())).models.length,0)
  })
  await dialog().getByRole('button',{name:'取消',exact:true}).click();await close()
  await launch('fixture');await page.getByRole('button',{name:'添加文本模型',exact:true}).click()
  await check('MC-12-empty-refresh',async()=>{
    await app.evaluate(()=>{globalThis.__catalogFixtureRows=[]})
    await dialog().getByLabel('API Key',{exact:true}).fill('public-catalog-native-fixture')
    await expect.poll(()=>app.evaluate(()=>globalThis.__catalogFixtureCalls),{timeout:15000}).toBe(1)
    const list=await openModels();await expect(list.getByRole('option')).toHaveCount(0);await page.screenshot({path:join(evidence,'empty-updated.png')});await page.keyboard.press('Escape')
    assert.deepEqual(JSON.parse(await readFile(join(root,'model-catalogs.json'),'utf8')).value[0].models,[])
  })
  await dialog().getByRole('button',{name:'取消',exact:true}).click();await close()
  await launch('offline');await page.getByRole('button',{name:'添加文本模型',exact:true}).click()
  await check('MC-12-empty-offline-restart',async()=>{const list=await openModels();await expect(list.getByRole('option')).toHaveCount(0);await page.screenshot({path:join(evidence,'empty-restarted.png')});await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>window.desktop.bootstrap())).models.length,0)})
  await dialog().getByRole('button',{name:'取消',exact:true}).click()
  const encrypted=await app.evaluate(({safeStorage})=>{assertProtection();return safeStorage.encryptString('public-catalog-native-fixture').toString('base64');function assertProtection(){if(!safeStorage.isEncryptionAvailable())throw Error('OS protection unavailable')}})
  await close()
  const statePath=join(root,'state.json'),saved=JSON.parse(await readFile(statePath,'utf8'))
  saved.value.models=[{id:'00000000-0000-4000-8000-000000000001',name:'公开旧型号夹具',...scope,modelId:'deepseek-flash',enabled:true,contextWindow:0,thinkingLevels:[],defaultThinking:'default',authRevision:1,keyMask:'••••••••',encryptedKey:encrypted}]
  await writeFile(statePath,JSON.stringify(saved));const before=await readFile(statePath,'utf8')
  await launch('offline');await page.getByRole('button',{name:'编辑模型 公开旧型号夹具',exact:true}).click()
  await check('MC-12-old-record-cannot-reinsert-or-save',async()=>{
    await expect(dialog().getByLabel('可用模型',{exact:true})).toContainText('请选择可用模型');await dialog().getByRole('button',{name:'保存模型',exact:true}).click();await expect(dialog()).toBeVisible();await expect(dialog().getByRole('alert')).toContainText('请选择可用模型')
    await page.screenshot({path:join(evidence,'removed-old-record.png')});assert.equal(await readFile(statePath,'utf8'),before)
  })
  const handles=await app.evaluate(()=>process._getActiveHandles().filter(handle=>handle.constructor.name==='Server'&&handle.listening).length);assert.equal(handles,0)
  report.runtime=await app.evaluate(()=>({platform:process.platform,versions:process.versions}));report.listeningServers=handles
  assert.equal(await readFile(networkReport,'utf8'),'');assert.deepEqual(report.errors,[])
  report.changedSources=[];for(const file of sources)if(hash(await readFile(file))!==report.sourceHashes[file])report.changedSources.push(file);assert.deepEqual(report.changedSources,[])
  report.status='passed'
}catch(error){report.status='failed';report.error=redact(error.stack??error);process.exitCode=1;if(page)await page.screenshot({path:join(evidence,'failure.png')}).catch(()=>{})}
finally{
  await app?.close().catch(()=>{});assert.equal(dirname(resolve(temp)),resolve(tmpdir()));assert.ok(basename(temp).startsWith('shakeink-catalog-native-'));await rm(temp,{recursive:true,force:true});report.cleanedIsolatedData=true;report.completedAt=new Date().toISOString()
  await writeFile(join(evidence,'windows-electron.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error}))
}
