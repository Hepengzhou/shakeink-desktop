/** Live isolated Windows acceptance. Existing credentials remain encrypted on
 * disk and are decrypted only by the application's actual main-process vault.
 * Reports contain public model IDs, statuses and counts, never response bodies. */
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,readFile,writeFile,rm,realpath} from 'node:fs/promises'
import {tmpdir,homedir} from 'node:os'
import {join,resolve,dirname,basename} from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import {_electron} from 'playwright-core'
import {defaultState,stateSchema} from '../desktop/core/settings.ts'
import {selectBrandStartupPaths} from '../desktop/main/brand-startup-paths.ts'
import {Workspaces} from '../desktop/service/workspaces.ts'

assert.equal(process.platform,'win32')
const modelId=process.argv.find(value=>value.startsWith('--model='))?.slice(8)??'deepseek-flash'
assert.ok(['deepseek-flash','deepseek-v4-pro'].includes(modelId))
const full=process.argv.includes('--full'),legacy=process.argv.includes('--legacy-zero')
const evidence=resolve('docs/evidence/creation-context'),temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-creation-')))
const root=join(temporary,'data'),work=join(temporary,'novel'),runId=`${modelId}-${legacy?'zero':'saved'}-${full?'full':'first'}-${Date.now()}`
const report={startedAt:new Date().toISOString(),modelId,legacyZero:legacy,full,status:'running',stage:'prepare-profile',checks:[],turns:[],errors:[],limitations:['Windows development Electron, not an installed package or macOS.','Native directory picker supplies an isolated empty test directory.','No independent TCP listener probe.'],isolation:{userWorksRead:false},sourceHashes:{}}
let app,page,conversationId,novelId,lastTurnId
await mkdir(evidence,{recursive:true});await mkdir(work,{recursive:true})
const out=()=>join(evidence,`${runId}.json`)
async function persist(){await writeFile(out(),JSON.stringify(report,null,2)+'\n')}
function check(label,value={}){report.checks.push({label,...value});console.log(JSON.stringify({event:'check',modelId,label,...value}))}
async function json(path){return page.evaluate(async path=>{const response=await fetch(path);if(!response.ok)throw Error(`TEST_READ_HTTP_${response.status}`);return response.json()},path)}
async function detail(){const rows=(await json('/api/chat/conversations')).conversations;if(!conversationId)conversationId=rows[0]?.id;if(!conversationId)return null;const result=await json(`/api/chat/conversations/${conversationId}`);novelId=result.conversation.novelId;return result}
async function settled(){const deadline=Date.now()+600000;for(;;){const data=await detail();if(data){const turn=data.turnState?.turn,attempt=data.turnState?.attempts?.at(-1);if(turn&&turn.id!==lastTurnId&&!['queued','running'].includes(turn.status)){const snapshot=attempt?.defaultsSnapshot??turn.defaultsSnapshot;assert.equal(snapshot.textModelId,report.testModelId,'Actual task must use the selected exact model');const calls=data.messages.filter(row=>row.turnId===turn.id).flatMap(row=>Array.isArray(row.toolCalls)?row.toolCalls:[]);const summary={number:report.turns.length+1,status:turn.status,attemptStatus:attempt?.status,errorCode:attempt?.errorCode??null,actualModelId:modelId,tools:calls.map(call=>({name:call.toolName,ok:call.output?.ok??null,code:call.output?.code??null}))};lastTurnId=turn.id;report.turns.push(summary);await persist();console.log(JSON.stringify({event:'turn',modelId,...summary}));assert.ok(!['failed','interrupted','cancelled'].includes(turn.status),`TEST_TURN_${turn.status}_${summary.errorCode??'UNKNOWN'}`);return data}}if(Date.now()>deadline)throw Error('TEST_TURN_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,1500))}}
async function send(message){const input=page.getByRole('textbox',{name:'消息输入框',exact:true});await input.fill(message);await page.getByRole('button',{name:'发送',exact:true}).click();return settled()}
async function workflow(){return json(`/api/novels/${novelId}/story-workflow`)}
async function outline(){return json(`/api/novels/${novelId}/outline`)}
async function chapterCounts(){const data=await outline();const volumes=data.volumes??data.outline?.volumes??[];const chapters=volumes.flatMap(volume=>volume.chapters??[]);let written=0,length=0;const fingerprints=[];for(const chapter of chapters){const data=await json(`/api/novels/${novelId}/chapters/${chapter.id}`);const row=data.chapter??data,content=row.content??'';fingerprints.push({id:chapter.id,version:row.version,hash:createHash('sha256').update(content).digest('hex')});if(content.trim()){written++;length+=content.length}}return{volumes:volumes.length,chapters:chapters.length,written,length,fingerprints}}
try{
  const sourcePaths=selectBrandStartupPaths({appData:process.env.APPDATA,home:homedir(),isolatedRoot:null})
  // Windows safeStorage wraps secrets with the DPAPI-protected OSCrypt key in
  // Local State. Copy only that encrypted envelope to the disposable profile;
  // never copy browser/session state or decrypt credentials in this runner.
  const encryption=JSON.parse(await readFile(join(sourcePaths.bootstrap,'session','Local State'),'utf8')).os_crypt
  assert.ok(encryption?.encrypted_key,'Existing OS-protected encryption envelope is required')
  const bootstrapEncryption=JSON.parse(await readFile(join(sourcePaths.bootstrap,'Local State'),'utf8')).os_crypt
  await mkdir(root+'-bootstrap',{recursive:true});await writeFile(join(root+'-bootstrap','Local State'),JSON.stringify({os_crypt:bootstrapEncryption}))
  const saved=stateSchema.parse(JSON.parse(await readFile(join(sourcePaths.defaultRoot,'state.json'),'utf8')).value)
  const originalStateHash=createHash('sha256').update(await readFile(join(sourcePaths.defaultRoot,'state.json'))).digest('hex')
  const source=saved.models.find(row=>row.provider==='deepseek'&&row.modelId===modelId&&row.enabled&&row.kind==='TEXT'&&row.protocol==='openai'&&/^https:\/\/api\.deepseek\.com(?:\/v1)?\/?$/.test(row.endpoint))
  assert.ok(source,'An enabled saved exact official DeepSeek model is required')
  const state=structuredClone(defaultState),model={...source,id:randomUUID(),name:modelId,contextWindow:legacy?0:source.contextWindow,defaultThinking:'low'}
  report.savedContextWindow=source.contextWindow;report.testContextWindow=model.contextWindow;report.testModelId=model.id
  state.models=[model];state.settings.agent={textModelId:model.id,reviewModelId:model.id,imageModelId:null,mode:'standard',thinking:'low'}
  state.settings.appearance.theme='ink';state.settings.general.defaultParent=temporary
  state.onboarding={version:1,completed:true,step:'welcome',textModelId:model.id,imageModelId:null,receipt:null}
  const works=new Workspaces(root,resolve('prisma/migrations'));try{await works.initialize()}finally{await works.close()}
  await mkdir(join(root,'session'),{recursive:true});await writeFile(join(root,'session','Local State'),JSON.stringify({os_crypt:encryption}))
  await writeFile(join(root,'state.json'),JSON.stringify({schemaVersion:1,revision:0,value:state}))
  for(const file of ['desktop/shared/provider-capabilities.ts','desktop/service/models.ts','desktop/handlers/chat/route.ts','dist/main/index.cjs','dist/service/index.cjs'])report.sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
  const env={...process.env,SHAKEINK_TEST_ROOT:root};delete env.ELECTRON_RUN_AS_NODE
  app=await _electron.launch({args:[resolve('.')],env,timeout:90000});page=await app.firstWindow({timeout:90000});page.setDefaultTimeout(15000)
  // Do not collect renderer text, raw HTTP, stderr, or user data in evidence.
  page.on('pageerror',error=>report.errors.push({kind:'renderer',name:error.name}))
  await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor({timeout:90000})
  report.runtime=await app.evaluate(()=>({platform:process.platform,electron:process.versions.electron,node:process.versions.node}))
  const boot=await page.evaluate(()=>window.desktop.bootstrap());assert.equal(boot.dataRoot,root)
  assert.equal(await app.evaluate(({app})=>app.getPath('userData')),root+'-bootstrap');report.isolation.actualTestRoot=true
  // A dedicated test credential may be inherited privately from the caller's
  // environment. Only main reads its value; it never crosses page evaluation,
  // command arguments, reporting, or the worker boundary.
  report.dedicatedCredential=await app.evaluate(async({safeStorage},{root,id})=>{
    const key=process.env.SHAKEINK_CREATION_TEST_KEY
    if(!key)return false
    const fs=process.getBuiltinModule('fs/promises'),path=process.getBuiltinModule('path'),file=path.join(root,'state.json'),state=JSON.parse(await fs.readFile(file,'utf8'))
    state.value.models.find(row=>row.id===id).encryptedKey=safeStorage.encryptString(key).toString('base64')
    await fs.writeFile(file,JSON.stringify(state));delete process.env.SHAKEINK_CREATION_TEST_KEY;return true
  },{root,id:model.id})
  report.vault=await app.evaluate(async({safeStorage},{root,id})=>{
    const fs=process.getBuiltinModule('fs/promises'),path=process.getBuiltinModule('path'),stored=JSON.parse(await fs.readFile(path.join(root,'state.json'),'utf8')).value.models.find(row=>row.id===id)
    let decryptable=false,roundtrip=false
    try{roundtrip=safeStorage.decryptString(safeStorage.encryptString('isolated-protection-check'))==='isolated-protection-check'}catch{}
    try{decryptable=!!safeStorage.decryptString(Buffer.from(stored.encryptedKey,'base64'))}catch{}
    return{available:safeStorage.isEncryptionAvailable(),roundtrip,decryptable,storedModelFound:!!stored}
  },{root,id:model.id})
  report.stage='credential-precondition';assert.ok(report.vault.decryptable,'TEST_CREDENTIAL_PROFILE_UNAVAILABLE')
  await app.evaluate(({dialog,BrowserWindow},{work})=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[work]});BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:1000})},{work})
  report.stage='official-catalog'
  const catalog=await page.evaluate(async({id,modelId,endpoint})=>{const result=await window.desktop.discoverModels(crypto.randomUUID(),{id,provider:'deepseek',kind:'TEXT',protocol:'openai',endpoint,modelId,apiKey:''});return result.ok?{ok:true,ids:result.models.map(row=>row.id),windows:result.models.map(row=>({id:row.id,contextWindow:row.contextWindow??null}))}:{ok:false,code:result.code,status:result.status}},{id:model.id,modelId,endpoint:model.endpoint})
  report.catalog=catalog;assert.equal(catalog.ok,true);assert.ok(catalog.ids.includes(modelId),'Exact requested model must appear in authenticated official /models');check('authenticated official catalog includes exact requested model')
  report.stage='wizard';await page.getByRole('button',{name:'仙侠',exact:true}).click()
  const wizard=page.getByRole('dialog',{name:'创作向导',exact:true});await wizard.waitFor()
  // Four actual local templates. The preset still starts at 仙侠.
  for(const name of ['主题','世界','角色','剧情']){await wizard.locator('nav').getByRole('button',{name:new RegExp(name)}).click();const cards=wizard.locator('button[aria-pressed]').filter({has:page.locator('span.line-clamp-2')});await cards.nth(1).waitFor();await cards.nth(1).click()}
  await wizard.getByRole('button',{name:'确定',exact:true}).click();await wizard.waitFor({state:'hidden'})
  const input=page.getByRole('textbox',{name:'消息输入框',exact:true});await input.waitFor();const draft=await input.innerText();assert.ok(draft.startsWith('我想创作一部新小说'))
  await input.fill(draft+'\n\n本次为隔离验收，按短篇规模只创作一卷一章，正文800字。先用简短方案给出必要简报并开始保存资料，从主题、世界、主角、剧情和叙事细纲逐步到首章正文抽卡。我会逐次在问答面板认可产物；不要扩大篇幅。暂定书名可以沿用。')
  check('actual xianxia wizard selects four templates and composes visible draft')
  report.stage='first-send';await page.getByRole('button',{name:'发送',exact:true}).click();let current=await settled();check('actual exact model first send completed without generation failure')
  if(full){
    report.stage='full-workflow';let adoptedCandidate=false
    for(let index=0;index<45;index++){
      const counts=await chapterCounts();if(counts.written){check('chapter body adopted and saved',counts);break}
      const interaction=current.turnState?.turn?.interaction
      if(interaction?.state==='pending'){
        const payload=interaction.payload
        if(interaction.kind==='planApproval'){
          await page.getByRole('button',{name:/批准|认可|执行/}).last().click()
        }else{
          for(const [qi,question] of payload.questions.entries()){const preferred=question.options.findIndex(option=>/认可|确认|采用|开始|继续|直接/.test(option)&&!/暂|不认可|不采用|取消|修改|返回|重新/.test(option));await page.getByTestId(`ask-option-${qi}-${Math.max(0,preferred)}`).last().click()}
          // Single-question options submit immediately in the real component.
          if(payload.questions.length>1)await page.getByRole('button',{name:'提交回答',exact:true}).last().click()
        }
        current=await settled()
        if(payload?.contentApproval?.kind==='candidate'){
          const approval=payload.contentApproval,adopted=(await json(`/api/novels/${novelId}/chapters/${approval.chapterId}/candidates/${approval.candidateId}`)).candidate
          assert.equal(adopted.status,'accepted','TEST_CANDIDATE_NOT_ACCEPTED')
          const saved=(await json(`/api/novels/${novelId}/chapters/${approval.chapterId}`)).chapter
          assert.equal(createHash('sha256').update(saved.content).digest('hex'),approval.candidateHash,'TEST_CANDIDATE_BODY_NOT_COMMITTED')
          adoptedCandidate=true;check('actual author candidate approval commits matching chapter body')
        }
      }else current=await send('继续本次一卷一章的仙侠短篇创作，按已保存状态补齐必要资料和第一章叙事细纲，评审通过后请我在问答面板认可，然后抽正文候选并请我选择采用。不要重复确认已有信息。')
      if(index===44)throw Error('TEST_WORKFLOW_NO_BODY_AFTER_45_TURNS')
    }
    const counts=await chapterCounts();assert.ok(counts.written>0&&counts.length>=300);report.finalCounts=counts
    const flow=(await workflow()).workflow;assert.ok(flow?.brief?.trim());const kinds=new Set(flow.artifacts.map(row=>row.kind))
    for(const kind of ['theme','world','character','worldline','world-event','narrative','narrative-card','chapter-outline','chapter-content'])assert.ok(kinds.has(kind),`TEST_MISSING_ARTIFACT_${kind.replaceAll('-','_').toUpperCase()}`)
    assert.ok(adoptedCandidate,'TEST_CANDIDATE_ADOPTION_NOT_OBSERVED')
    assert.ok(report.turns.some(turn=>turn.tools.some(call=>call.name==='drawChapterCandidates'&&call.ok===true)),'TEST_DRAW_RECEIPT_NOT_OBSERVED')
    report.workflow={version:flow.version,phase:flow.phase,briefPresent:true,kinds:[...kinds],adoptedCandidate:true}
    report.stage='reopen'
    await app.close();app=undefined
    app=await _electron.launch({args:[resolve('.')],env,timeout:90000});page=await app.firstWindow({timeout:90000});await page.getByRole('button',{name:'账号菜单',exact:true}).waitFor({timeout:90000})
    assert.deepEqual(await chapterCounts(),counts);check('closed and reopened body persists',counts)
  }
  report.isolation.userStateUnchanged=createHash('sha256').update(await readFile(join(sourcePaths.defaultRoot,'state.json'))).digest('hex')===originalStateHash
  assert.ok(report.isolation.userStateUnchanged);assert.deepEqual(report.errors,[]);report.status='passed';report.completedAt=new Date().toISOString();await persist();console.log(JSON.stringify({event:'complete',modelId,status:report.status,evidence:out()}))
}catch(error){report.status='failed';report.failure={name:error.name,code:/TEST_[A-Z_0-9]+/.exec(error.message)?.[0]??'ACCEPTANCE_INCOMPLETE'};report.completedAt=new Date().toISOString();await persist();console.log(JSON.stringify({event:'failed',modelId,failure:report.failure,evidence:out()}));process.exitCode=1}
finally{await app?.close().catch(()=>{});assert.equal(dirname(temporary),resolve(tmpdir()));assert.ok(basename(temporary).startsWith('shakeink-creation-'));await rm(temporary,{recursive:true,force:true})}
