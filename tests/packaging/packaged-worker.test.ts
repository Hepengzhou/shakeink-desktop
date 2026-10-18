import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,realpath,rm,readFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
const execute=promisify(execFile)

test('OPT-P05: actual packaged service/Prisma commits, preserves content after rejected mutation, closes and reopens in a new OS process without module fallback',{timeout:180000},async t=>{
 const application=resolve(process.env.SHAKEINK_TEST_PACKAGE_APP??'release/mac-arm64/玄印写作.app'),appRoot=join(application,'Contents/Resources/app')
 const temporary=await realpath(await mkdtemp(join(tmpdir(),'shakeink-packaged-orm-'))),root=join(temporary,'data'),directory=join(temporary,'work')
 await mkdir(directory)
 try{
  let novelId=''
  for(const phase of ['write','reopen']){
   const {stdout}=await execute(process.execPath,['--import','tsx',resolve('tests/fixtures/packaged-worker-phase.ts'),appRoot,root,directory,phase,novelId],{timeout:80000,maxBuffer:1024*1024})
   const result=JSON.parse(stdout.trim().split('\n').at(-1)!);assert.equal(result.passed,true);assert.equal(result.phase,phase)
   t.diagnostic(JSON.stringify({phase,cacheProfiles:result.cacheProfiles}))
   if(phase==='write')novelId=result.novelId;else assert.equal(result.novelId,novelId)
  }
  assert((await readFile(join(root,'inbox/database/PG_VERSION'),'utf8')).trim())
 }finally{await rm(temporary,{recursive:true,force:true})}
})
