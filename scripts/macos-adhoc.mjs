// An explicitly temporary, non-notarized arm64 path. This module never changes
// the Developer ID release gate and never accesses Apple accounts/keychains.
import {lstat,readdir,realpath,readFile,open,mkdtemp,mkdir,rm} from 'node:fs/promises'
import {basename,dirname,join,isAbsolute,sep,extname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {inspectPackagedApp,verifyPackagedDependencies} from './inspect-packaged-app.mjs'

/** @typedef {{stdout?: string, stderr?: string}} CommandResult */
/** @typedef {(tool: string,args: string[],options?: import('node:child_process').ExecFileOptions) => Promise<CommandResult>} CommandRunner */
/** @typedef {{run?: CommandRunner}} ReadOptions */
/** @typedef {{allowedRoot: string,entitlements: string,run?: CommandRunner}} SignOptions */
/** @typedef {{allowedRoot: string,run?: CommandRunner}} DmgOptions */

const appName='玄印写作.app'
const execute=promisify(execFile)
const inside=(root,path)=>path===root||path.startsWith(root+sep)
const output=result=>`${result?.stdout??''}\n${result?.stderr??''}`
// Raw diagnostics stay private so the unsigned-container gate can distinguish
// an actual missing signature from tool/permission/time-limit failures. All
// public errors below are reconstructed without raw output or arguments.
/** @type {CommandRunner} */
async function runAdhocTool(tool,args,options={}){return execute(tool,args,{timeout:60000,maxBuffer:4*1024*1024,...options,encoding:'utf8'})}
async function command(run,tool,args,options={}){
 try{return await run(tool,args,options)}catch(error){throw Object.assign(new Error(`Ad-hoc 工具失败：${basename(tool)} (${typeof error?.code==='number'?error.code:'execution'})`),typeof error?.code==='number'?{code:error.code}:{})}
}

export function assertAdhocHost(platform,arch,args=[]){
 if(platform!=='darwin'||arch!=='arm64')throw new Error('Ad-hoc 临时构建仅支持本机 macOS arm64')
 if(!Array.isArray(args)||args.length>1||args.length===1&&args[0]!=='--preflight')throw new Error('用法：package-adhoc-macos.mjs [--preflight]')
 return args[0]==='--preflight'?'preflight':'build'
}

export function createAdhocConfiguration(base,outputDirectory){
 if(typeof outputDirectory!=='string'||!isAbsolute(outputDirectory))throw new Error('临时 output 必须为绝对路径')
 return {...base,publish:null,forceCodeSigning:false,directories:{...base.directories,output:outputDirectory},mac:{...base.mac,target:['dir'],identity:null,notarize:false,hardenedRuntime:false},dmg:{...base.dmg,sign:false,writeUpdateInfo:false}}
}

async function ordinaryFile(path){const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink())throw new Error('临时测试文件必须为实际普通文件');return stat}
async function actualDirectory(path){const stat=await lstat(path);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('应用/所属目录根不能是链接或非实际目录');return realpath(path)}

async function ownedStage(allowedRoot){
 if(typeof allowedRoot!=='string'||!isAbsolute(allowedRoot))throw new Error('必须指定本轮自有 staging 目录')
 const root=await actualDirectory(allowedRoot)
 if(!/^adhoc-arm64-[A-Za-z0-9-]+$/.test(basename(root))||basename(dirname(root))!=='.staging'||basename(dirname(dirname(root)))!=='release')throw new Error('只允许写入 release/.staging/adhoc-arm64-* 自有 stage 目录')
 // A symlinked .staging/release must not turn a named safe stage into an
 // unrelated write root. System /var→/private/var normalization is permitted.
 for(const parent of [dirname(allowedRoot),dirname(dirname(allowedRoot))])if((await lstat(parent)).isSymbolicLink())throw new Error('staging 父目录不能是符号链接')
 return root
}

export async function scanAdhocCode(app){
 const root=await actualDirectory(app),objects=[root],binaries=[]
 const machOMagic=new Set(['feedface','feedfacf','cefaedfe','cffaedfe','cafebabe','bebafeca','cafebabf','bfbafeca'])
 async function walk(directory){for(const name of(await readdir(directory)).sort()){
  const path=join(directory,name),stat=await lstat(path)
  if(stat.isSymbolicLink()){
   let target;try{target=await realpath(path)}catch{throw new Error('应用包含悬空或循环链接')}
   if(!inside(root,target))throw new Error('应用链接越过应用根目录')
  }else if(stat.isDirectory()){
   if(/\.(?:app|framework|xpc|appex)$/.test(name))objects.push(path)
   await walk(path)
  }else if(stat.isFile()){
   const handle=await open(path,'r'),magic=Buffer.alloc(4);let bytesRead
   try{bytesRead=(await handle.read(magic,0,4,0)).bytesRead}finally{await handle.close()}
   if(bytesRead===4&&machOMagic.has(magic.toString('hex'))){objects.push(path);binaries.push(path)}
  }else throw new Error('应用含特殊文件类型')
 }}
 await walk(root)
 if(!binaries.length)throw new Error('应用未包含可校验的 Mach-O 文件')
 return {root,objects,binaries}
}

function childrenFirst(objects){return [...objects].sort((a,b)=>b.split(sep).length-a.split(sep).length||a.localeCompare(b))}
async function verifyArchitectures(binaries,run){
 for(const path of binaries){const result=await command(run,'/usr/bin/lipo',['-archs',path]);if(!(result.stdout??'').trim().split(/\s+/).includes('arm64'))throw new Error('Mach-O 必须包含 arm64 架构')}
}

function checkJit(xml,{required=false}={}){
 const plist=xml.match(/<plist\b[^>]*>[\s\S]*?<\/plist>/)?.[0]
 if(!plist){if(required)throw new Error('缺少最小 JIT entitlement');return}
 const keys=[...plist.matchAll(/<key>\s*([^<]+?)\s*<\/key>/g)].map(match=>match[1])
 if(keys.some(key=>key!=='com.apple.security.cs.allow-jit')||keys.length>1)throw new Error('权限超出最小 JIT entitlement')
 if(keys.length===1&&!/<key>\s*com\.apple\.security\.cs\.allow-jit\s*<\/key>\s*<true\s*\/>/.test(plist))throw new Error('最小 JIT entitlement 值必须为 true')
 if(required&&keys.length!==1)throw new Error('缺少最小 JIT entitlement')
}

function checkAdhocDisplay(display,{seal=false,allowEmptySeal=false}={}){
 if(!/^Signature=adhoc\s*$/m.test(display))throw new Error('实际签名必须为 Signature=adhoc')
 if(/^Authority=/m.test(display)||[...display.matchAll(/^TeamIdentifier=(.*)$/gm)].some(match=>match[1].trim()!=='not set'))throw new Error('Ad-hoc 不得含 Developer ID Authority 或 Team 身份')
 const flags=display.match(/\bflags=0x([0-9a-f]+)\(/i)
 if(!flags||(parseInt(flags[1],16)&0x2)===0||(parseInt(flags[1],16)&0x10000)!==0)throw new Error('实际 Ad-hoc flags 无效或仍启用 hardened runtime')
 if(seal){
  const sealedFiles=display.match(/^Sealed Resources version=2\b.*\bfiles=([0-9]+)\s*$/m)
  if(!sealedFiles||!allowEmptySeal&&Number(sealedFiles[1])<1)throw new Error('应用缺少有效资源封印')
 }
}

/** @param {string} app @param {ReadOptions} [options] */
export async function verifyAdhocApp(app,{run=runAdhocTool}={}){
 const scan=await scanAdhocCode(app)
 await verifyArchitectures(scan.binaries,run)
 for(const path of childrenFirst(scan.objects)){
  await command(run,'/usr/bin/codesign',['--verify','--strict','--verbose=4',path])
  checkAdhocDisplay(output(await command(run,'/usr/bin/codesign',['--display','--verbose=4',path])),{seal:path===scan.root||path.endsWith('.app'),allowEmptySeal:path!==scan.root})
  checkJit(output(await command(run,'/usr/bin/codesign',['--display','--entitlements',':-',path])),{required:path===scan.root||path.endsWith('.app')})
 }
 await command(run,'/usr/bin/codesign',['--verify','--deep','--strict','--verbose=4',scan.root])
 return {signature:'adhoc',arch:'arm64',hardenedRuntime:false,developerIdentity:false,nativeObjects:scan.objects.length,machOBinaries:scan.binaries.length,scope:'Ad-hoc signature/resource integrity and arm64 only; no Developer ID, notarization or Gatekeeper acceptance'}
}

/** @param {string} app @param {SignOptions} options */
export async function signAdhocApp(app,{allowedRoot,entitlements,run=runAdhocTool}){
 const stage=await ownedStage(allowedRoot),root=await actualDirectory(app)
 if(root===stage||!inside(stage,root))throw new Error('签名目标越过本轮自有 staging 目录')
 await ordinaryFile(entitlements);checkJit(await readFile(entitlements,'utf8'),{required:true})
 const scan=await scanAdhocCode(root)
 // Reject every wrong native architecture before the first signing mutation.
 await verifyArchitectures(scan.binaries,run)
 for(const path of childrenFirst(scan.objects))await command(run,'/usr/bin/codesign',['--force','--sign','-','--timestamp=none','--options','0','--entitlements',entitlements,path],{timeout:180000})
 return verifyAdhocApp(root,{run})
}

async function verifyUnsignedContainer(image,run){
 try{await run('/usr/bin/codesign',['--display','--verbose=4',image],{timeout:60000})}
 catch(error){
  if(error?.code===1&&!error.killed&&!error.signal&&typeof error.stderr==='string'&&error.stderr.trim()===`${image}: code object is not signed at all`){
   return {containerSignature:'unsigned',containerCheck:'Actual codesign display exit 1: code object is not signed at all'}
  }
  const status=typeof error?.code==='number'?String(error.code):error?.code==='ENOENT'?'unavailable':error?.code==='EACCES'?'permission':error?.killed?'timeout':'execution'
  throw new Error(`无法确认 DMG 容器签名（codesign ${status}）`)
 }
 // A successful display means a signature exists; an independently signed
 // container must never be reported as this path's unsigned temporary DMG.
 throw new Error('DMG 容器已签名，不符合临时未签容器约束')
}

/** @param {string} sourceFolder @param {string} image @param {DmgOptions} options */
export async function createAdhocDmg(sourceFolder,image,{allowedRoot,run=runAdhocTool}){
 const stage=await ownedStage(allowedRoot),source=await actualDirectory(sourceFolder),parent=await actualDirectory(dirname(image))
 if(source===stage||!inside(stage,source)||!inside(stage,parent)||extname(image)!=='.dmg'||!isAbsolute(image))throw new Error('DMG 输入/输出必须位于本轮自有 stage 范围')
 try{await lstat(image);throw new Error('DMG 已存在，拒绝覆盖')}catch(error){if(error.code!=='ENOENT')throw error}
 await command(run,'/usr/bin/hdiutil',['create','-volname','玄印写作临时测试','-srcfolder',sourceFolder,'-format','UDZO','-fs','HFS+',image],{timeout:600000,maxBuffer:2*1024*1024})
 await ordinaryFile(image)
 await command(run,'/usr/bin/hdiutil',['verify',image],{timeout:180000})
 const container=await verifyUnsignedContainer(image,run)
 return {image,...container,format:'UDZO',scope:'Temporary compressed DMG container integrity and actual unsigned-state check; no notarization'}
}

/**
 * @template T
 * @param {string} image
 * @param {(mountpoint: string) => Promise<T>} callback
 * @param {ReadOptions} [options]
 * @returns {Promise<T>}
 */
export async function withMountedAdhocDmg(image,callback,{run=runAdhocTool}={}){
 await ordinaryFile(image)
 await command(run,'/usr/bin/hdiutil',['verify',image],{timeout:180000})
 const temporary=await mkdtemp(join(tmpdir(),'shakeink-adhoc-mount-')),mountpoint=join(temporary,'volume')
 await mkdir(mountpoint)
 let attempted=false
 try{
  attempted=true
  await command(run,'/usr/bin/hdiutil',['attach','-readonly','-nobrowse','-noautoopen','-mountpoint',mountpoint,image],{timeout:180000})
  return await callback(mountpoint)
 }finally{
  // An interrupted attach can still have mounted the image. If detach fails,
  // retain its owned directory rather than recursively removing a live volume.
  if(attempted)await command(run,'/usr/bin/hdiutil',['detach',mountpoint],{timeout:60000})
  await rm(temporary,{recursive:true,force:true})
 }
}

/** @param {string} project @param {string} image @param {ReadOptions} [options] */
export async function verifyAdhocDmg(project,image,{run=runAdhocTool}={}){
 await ordinaryFile(image)
 const container=await verifyUnsignedContainer(image,run)
 return withMountedAdhocDmg(image,async mountpoint=>{
  const app=join(mountpoint,appName),root=await actualDirectory(app)
  if(!inside(await realpath(mountpoint),root))throw new Error('DMG 应用越过挂载目录')
  const integrity=await verifyAdhocApp(app,{run})
  const contents=await inspectPackagedApp(project,app)
  const dependencies=await verifyPackagedDependencies(join(app,'Contents/Resources/app'))
  return {integrity,staticResources:{version:contents.version,bundleId:contents.bundleId,files:contents.files.length,projectResources:contents.projectResources,scope:contents.scope},dependencies,...container,notarized:false,scope:'Mounted temporary Ad-hoc app integrity, actual unsigned-container check and Node resource/dependency checks; no app execution or Apple trust acceptance'}
 },{run})
}
