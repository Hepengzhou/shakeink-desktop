// Read-only evidence: expected absence of Apple trust is separate from integrity.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve,dirname,basename,join} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {verifyAdhocApp,withMountedAdhocDmg} from '../../../scripts/macos-adhoc.mjs'

const execute=promisify(execFile),image=resolve(process.argv[2])
const metadata=JSON.parse(await readFile(join(dirname(image),'adhoc-test.json'),'utf8'))
const hash=async()=>createHash('sha256').update(await readFile(image)).digest('hex')
assert.equal(metadata.format,'shakeink-adhoc-test-dmg');assert.equal(await hash(),metadata.artifact.sha256)
const report={checkedAt:new Date().toISOString(),artifact:basename(image),sha256:metadata.artifact.sha256,scope:'Read-only native policy observations; Apple trust rejection/tool failure are not integrity or startup passes',checks:[]}
async function command(label,tool,args,redact=[]){
 let result
 try{result={exitCode:0,...await execute(tool,args,{encoding:'utf8',timeout:90000,maxBuffer:1024*1024})}}
 catch(error){result={exitCode:typeof error.code==='number'?error.code:null,signal:error.signal??null,killed:!!error.killed,toolError:typeof error.code==='string'?error.code:undefined,stdout:error.stdout??'',stderr:error.stderr??''}}
 for(const field of ['stdout','stderr'])for(const path of [image,...redact])result[field]=result[field].replaceAll(path,path===image?'<dmg>':'<mounted-app>')
 report.checks.push({label,tool,args:args.map(value=>value===image?'<dmg>':redact.includes(value)?'<mounted-app>':value),...result})
 return result
}
report.host=await command('host','/usr/bin/sw_vers',[])
const status=await command('Gatekeeper enabled','/usr/sbin/spctl',['--status'])
assert.equal(status.exitCode,0);assert.match(status.stdout,/assessments enabled/)
await command('DMG actual signature display','/usr/bin/codesign',['--display','--verbose=4',image])
await withMountedAdhocDmg(image,async mountpoint=>{
 const application=join(mountpoint,'玄印写作.app')
 report.signatureBefore=await verifyAdhocApp(application)
 await command('Application signature display','/usr/bin/codesign',['--display','--verbose=4',application],[application])
 await command('Application Gatekeeper assessment','/usr/sbin/spctl',['--assess','--type','execute','--verbose=4',application],[application])
 await command('Application distribution assessment','/usr/bin/syspolicy_check',['distribution',application],[application])
 await command('Application notarization ticket','/usr/bin/xcrun',['stapler','validate',application],[application])
 report.signatureAfter=await verifyAdhocApp(application)
})
await command('DMG notarization ticket','/usr/bin/xcrun',['stapler','validate',image])
assert.equal(await hash(),metadata.artifact.sha256);report.dmgUnchanged=true
await writeFile(join(import.meta.dirname,'native-policy.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({recorded:true,output:join(import.meta.dirname,'native-policy.json'),checks:report.checks.map(({label,exitCode,toolError})=>({label,exitCode,toolError})),scope:report.scope},null,2))
