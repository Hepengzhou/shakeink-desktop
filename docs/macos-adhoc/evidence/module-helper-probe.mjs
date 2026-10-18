import {mkdtemp,mkdir,cp,readFile,readdir,lstat,writeFile} from 'node:fs/promises'
import {join,resolve,relative} from 'node:path'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
const project=resolve(import.meta.dirname,'../../..'),execute=promisify(execFile)
const source=join(project,'node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Helper.app')
const temporary=await mkdtemp('/private/tmp/shakeink-adhoc-helper-probe-'),stage=join(temporary,'release/.staging/adhoc-arm64-native-probe'),app=join(stage,'Electron Helper.app')
async function hashTree(root){const results=[];async function walk(dir){for(const name of(await readdir(dir)).sort()){const path=join(dir,name),stat=await lstat(path);if(stat.isDirectory())await walk(path);else if(stat.isFile())results.push({path:relative(root,path),sha256:createHash('sha256').update(await readFile(path)).digest('hex')});else throw new Error('Unexpected helper fixture type')}}await walk(root);return results}
const before=await hashTree(source),commands=[]
await mkdir(stage,{recursive:true});await cp(source,app,{recursive:true,dereference:false,errorOnExist:true,force:false})
async function run(args){try{const result=await execute('/usr/bin/codesign',args,{timeout:60000,encoding:'utf8'});commands.push({tool:'/usr/bin/codesign',args,exitCode:0,...result});return result}catch(error){commands.push({tool:'/usr/bin/codesign',args,exitCode:error.code,stdout:error.stdout,stderr:error.stderr});throw error}}
const entitlements=join(project,'build/entitlements.mac.plist')
await run(['--force','--sign','-','--timestamp=none','--options','0','--entitlements',entitlements,join(app,'Contents/MacOS/Electron Helper')])
await run(['--force','--sign','-','--timestamp=none','--options','0','--entitlements',entitlements,app])
await run(['--verify','--strict','--deep','--verbose=4',app])
const display=await run(['--display','--verbose=4',app])
const after=await hashTree(source)
const result={scope:'Real codesign probe on a private copied Electron Helper; no application launch or final DMG acceptance',temporary,source,sourceBefore:before,sourceAfter:after,sourceUnchanged:JSON.stringify(before)===JSON.stringify(after),commands,zeroResourceSeal:/Sealed Resources version=2.*\bfiles=0\b/.test(display.stdout+display.stderr)}
await writeFile(join(project,'docs/macos-adhoc/evidence/module-helper-probe.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({sourceUnchanged:result.sourceUnchanged,zeroResourceSeal:result.zeroResourceSeal,temporary,nativeStrictExit:0}))
