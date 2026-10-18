import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,rm,writeFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createSeedArchive} from '../fixtures/database-cache-phase'
const execute=promisify(execFile)

test('OPT-M02: >64MiB EXTERNAL data survives real Workspaces transactions, independent process reopen and original 128MB rollback without rewriting configuration',{timeout:240000},async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'shakeink-cache-data-'))),phases:Record<string,unknown>[]=[]
 try{
  for(const phase of['seed','reopen','fallback']){
   const{stdout}=await execute(process.execPath,['--import','tsx',resolve('tests/fixtures/database-cache-phase.ts'),phase,root],{timeout:100000,maxBuffer:4*1024*1024})
   const result=JSON.parse(stdout.trim().split('\n').at(-1)!);assert.equal(result.passed,true);phases.push(result)
  }
  assert.equal(new Set(phases.map(row=>row.pid)).size,3,'every phase must run in a distinct OS process')
  assert.deepEqual(phases[0].configHashes,phases[1].configHashes);assert.deepEqual(phases[1].configHashes,phases[2].configHashes)
  if(process.env.SHAKEINK_CACHE_REPORT)await writeFile(resolve(process.env.SHAKEINK_CACHE_REPORT),JSON.stringify({rootRemovedAfterRun:true,phases},null,2))
  // Assert after the full durable-data exercise, so RED proves actual engine
  // behavior rather than an absent test module or missing fixture.
  for(const result of phases.slice(0,2))for(const report of result.reports as {configuration:{sharedBuffers:string}}[])assert.equal(report.configuration.sharedBuffers,'32MB','actual Workspaces SHOW shared_buffers must be 32MB')
 }finally{await rm(root,{recursive:true,force:true})}
})

test('OPT-M07: the seed-backed >64MiB EXTERNAL path preserves the full three-OS-process dataset and original 128MB fallback',{timeout:240000},async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'shakeink-cache-seeded-data-'))),archive=join(root,'vanilla.tar.gz'),phases:Record<string,unknown>[]=[]
 try{
  const seed=await createSeedArchive();await writeFile(archive,new Uint8Array(await seed.arrayBuffer()))
  for(const phase of['seed','reopen','fallback']){
   const{stdout}=await execute(process.execPath,['--import','tsx',resolve('tests/fixtures/database-cache-phase.ts'),phase,root,archive],{timeout:100000,maxBuffer:4*1024*1024})
   const result=JSON.parse(stdout.trim().split('\n').at(-1)!);assert.equal(result.passed,true);phases.push(result)
  }
  assert.equal(new Set(phases.map(row=>row.pid)).size,3)
  assert.deepEqual(phases[0].configHashes,phases[1].configHashes);assert.deepEqual(phases[1].configHashes,phases[2].configHashes)
  for(const result of phases.slice(0,2))for(const report of result.reports as {configuration:{sharedBuffers:string}}[])assert.equal(report.configuration.sharedBuffers,'32MB')
  if(process.env.SHAKEINK_SEEDED_CACHE_REPORT)await writeFile(resolve(process.env.SHAKEINK_SEEDED_CACHE_REPORT),JSON.stringify({rootRemovedAfterRun:true,archiveBytes:seed.size,phases},null,2))
 }finally{await rm(root,{recursive:true,force:true})}
})
