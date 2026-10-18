import {mkdtemp,mkdir,writeFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createAdhocDmg} from '../../../scripts/macos-adhoc.mjs'
const project=resolve(import.meta.dirname,'../../..'),execute=promisify(execFile)
const temporary=await mkdtemp('/private/tmp/shakeink-adhoc-container-probe-'),stage=join(temporary,'release/.staging/adhoc-arm64-native-container'),source=join(stage,'source'),image=join(stage,'container-probe.dmg')
const commands=[]
await mkdir(source,{recursive:true});await writeFile(join(source,'probe.txt'),'Unsigned container probe only. No app or user data.\n');await writeFile(join(source,'padding.bin'),Buffer.alloc(1024*1024))
let result,failure
try{result=await createAdhocDmg(source,image,{allowedRoot:stage,run:async(tool,args,options)=>{try{const output=await execute(tool,args,{...options,encoding:'utf8'});commands.push({tool,args,exitCode:0,...output});return output}catch(error){commands.push({tool,args,exitCode:error.code,stdout:error.stdout,stderr:error.stderr});throw error}}})}catch(error){failure=String(error)}
if(failure){await writeFile(join(project,'docs/macos-adhoc/evidence/module-container-probe.json'),JSON.stringify({scope:'Native tiny unsigned DMG probe failed; no positive product/final DMG acceptance',temporary,failure,commands},null,2)+'\n');console.log(JSON.stringify({failure,commands}));process.exit(1)}
for(const [tool,args]of [['/usr/bin/hdiutil',['verify',image]],['/usr/bin/codesign',['--display','--verbose=4',image]]]){
 try{const output=await execute(tool,args,{timeout:60000,encoding:'utf8'});commands.push({tool,args,exitCode:0,...output})}
 catch(error){commands.push({tool,args,exitCode:error.code,stdout:error.stdout,stderr:error.stderr})}
}
await writeFile(join(project,'docs/macos-adhoc/evidence/module-container-probe.json'),JSON.stringify({scope:'Native tiny unsigned DMG fixture and exact display diagnostic; no product or final DMG acceptance',temporary,result,commands},null,2)+'\n')
console.log(JSON.stringify({containerSignature:result.containerSignature,commands:commands.map(command=>({tool:command.tool,args:command.args,exitCode:command.exitCode})),temporary}))
