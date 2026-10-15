import {spawn} from 'node:child_process'
import {appendFileSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {homedir,tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
const kind=process.argv[2]
if(!['core','browser'].includes(kind))throw Error('Specify core or browser')
const tag=process.argv[3]??'final'
if(!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid evidence tag')
const dirs=kind==='core'?['tests/unit','tests/integration']:['tests/browser']
const files=dirs.flatMap(dir=>readdirSync(dir).filter(name=>name.endsWith('.test.ts')).map(name=>`${dir}/${name}`)).sort()
const concurrency=process.env.SHAKEINK_REGRESSION_CONCURRENCY??'2',testTimeout=process.env.SHAKEINK_REGRESSION_TIMEOUT??'120000'
if(!/^[1-4]$/.test(concurrency)||!/^\d+$/.test(testTimeout))throw Error('Invalid test limits')
const args=['--import','tsx','--test','--test-reporter=tap',`--test-concurrency=${concurrency}`,`--test-timeout=${testTimeout}`,...files]
if(process.env.SHAKEINK_REGRESSION_FORCE_EXIT==='1')args.splice(4,0,'--test-force-exit')
const startedAt=new Date().toISOString(),directory=resolve('docs/evidence/chat-empty-state')
mkdirSync(directory,{recursive:true})
const sanitize=value=>String(value).replaceAll(process.cwd(),'<repo>').replaceAll(tmpdir(),'<isolated-temp>').replaceAll(homedir(),'<home>')
const prefix=`${kind}-full-${tag}`,tap=join(directory,`${prefix}.tap`)
let raw='',error=null
writeFileSync(tap,'')
const child=spawn(process.execPath,args,{env:process.env,stdio:['ignore','pipe','pipe']})
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{raw+=chunk.toString();appendFileSync(tap,sanitize(chunk.toString()))})
const timeout=setTimeout(()=>{error='Whole suite exceeded 30 minutes';child.kill()},1800000)
const status=await new Promise(resolve=>{child.on('error',failure=>{error=sanitize(failure);resolve(null)});child.on('close',code=>resolve(code))})
clearTimeout(timeout)
const output=sanitize(raw)
writeFileSync(tap,output)
const counts=Object.fromEntries(['tests','suites','pass','fail','cancelled','skipped','todo'].map(key=>[key,Number([...output.matchAll(new RegExp('^# '+key+' (\\d+)','gm'))].at(-1)?.[1]??NaN)]))
const failureTitles=[...output.matchAll(/^not ok \d+ - (.+)$/gm)].map(m=>m[1])
const sources=['src/components/layout/ChatPanel.tsx','src/components/layout/CreateNovelDialog.tsx','src/components/chat/ModelPicker.tsx','src/components/chat/use-agent-chat.ts','src/components/chat/ChatEmptyState.tsx','src/lib/chat-empty-state.ts','src/lib/creation-wizard/presets.ts']
const hashes=Object.fromEntries(sources.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]))
const report={scope:kind==='core'?'Full active unit/integration suite; not supplier/native acceptance':'Full browser component suite with controlled fixtures; not native acceptance',kind,startedAt,completedAt:new Date().toISOString(),node:process.version,platform:process.platform,command:[process.execPath,...args].map(sanitize),exitCode:status,status:status===0?'passed':'failed',counts,failureTitles,error,hashes}
writeFileSync(join(directory,`${prefix}.json`),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({...report,command:undefined,hashes:undefined}))
process.exitCode=status??1
