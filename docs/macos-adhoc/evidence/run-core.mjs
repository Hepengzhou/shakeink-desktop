// Evidence runner for the complete current unit/integration inventory. Does not
// change the repository's existing test-core harness or any application code.
import {spawn} from 'node:child_process'
import {open,readFile,writeFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,relative,resolve} from 'node:path'

const project=resolve(import.meta.dirname,'../../..')
const walk=async root=>{const rows=[];for(const entry of await readdir(join(project,root),{withFileTypes:true})){if(['generated','retired'].includes(entry.name))continue;const path=join(root,entry.name);if(entry.isDirectory())rows.push(...await walk(path));else if(entry.isFile())rows.push(path)}return rows}
const tests=(await Promise.all(['tests/unit','tests/integration'].map(walk))).flat().filter(path=>path.endsWith('.test.ts')).sort()
const files=[...new Set(['package.json','package-lock.json','electron-builder.config.cjs',...(await Promise.all(['desktop','src','tests','scripts','build'].map(walk))).flat().filter(path=>/\.(tsx?|json|mjs|cjs|plist)$/.test(path))])].sort()
const snapshot=async()=>{const rows={};for(const path of files)rows[path]=createHash('sha256').update(await readFile(join(project,path))).digest('hex');return rows}
const before=await snapshot(),startedAt=new Date().toISOString(),log=await open(join(import.meta.dirname,'core-final.tap'),'w')
const args=['--import','tsx','--test','--test-concurrency=4','--test-timeout=120000','--test-reporter=tap',...tests]
const child=spawn(process.execPath,args,{cwd:project,stdio:['ignore',log.fd,log.fd]})
let timedOut=false
const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM')},900000)
const outcome=await new Promise(resolve=>{child.once('error',error=>resolve({code:null,error:error.code}));child.once('exit',(code,signal)=>resolve({code,signal}))})
clearTimeout(timer);await log.close()
const after=await snapshot(),changed=files.filter(path=>before[path]!==after[path]),tap=await readFile(join(import.meta.dirname,'core-final.tap'),'utf8')
const counts={};for(const key of ['tests','pass','fail','cancelled','skipped','todo'])counts[key]=Number(tap.match(new RegExp('^# '+key+' (\\d+)$','m'))?.[1]??NaN)
const report={scope:'Complete current core inventory, concurrency 4; not signed package or target-system acceptance',startedAt,completedAt:new Date().toISOString(),runtime:process.execPath,command:args,testFiles:tests.length,outcome,timedOut,counts,inputsUnchanged:changed.length===0,changed,sourceHashes:before}
await writeFile(join(import.meta.dirname,'core-final.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({testFiles:tests.length,outcome,timedOut,counts,inputsUnchanged:report.inputsUnchanged,changed}))
process.exitCode=outcome.code??1
