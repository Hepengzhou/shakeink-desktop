import assert from 'node:assert/strict'
import {mkdtemp,realpath,cp,rm,writeFile,mkdir,readFile} from 'node:fs/promises'
import {join,resolve,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
const execute=promisify(execFile),require=createRequire(import.meta.url)
const output=resolve(process.argv[2]??'database-cache-benchmark.json'),root=await realpath(await mkdtemp(join(tmpdir(),'shakeink-cache-benchmark-')))
const pgliteDirectory=dirname(require.resolve('@electric-sql/pglite')),pglitePackage=JSON.parse(await readFile(join(pgliteDirectory,'../package.json'),'utf8'))
const inputs={};for(const path of[join(pgliteDirectory,'index.cjs'),join(pgliteDirectory,'pglite.wasm'),resolve('tests/fixtures/database-cache-phase.ts')])inputs[path]=createHash('sha256').update(await readFile(path)).digest('hex')
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2}
const report={
 schemaVersion:1,startedAt:new Date().toISOString(),node:process.version,pglite:pglitePackage.version,inputs,
 method:{
  schedule:[128,32,32,128],independentProcesses:4,warmup:{pointReads:64,fullScans:1},formalScansPerProcess:3,
  aggregation:'median of three scans per OS process; per-configuration median of two process values equals their arithmetic mean',
  mixed:{operations:64,pointReads:32,commitUpdates:16,writeThenRollback:16,seed:0x6d2b79f5},
  thresholds:{scan:{relative:0.1,absoluteMs:50},mixed:{relative:0.1,absoluteMs:20}},
 },rounds:[],passed:false,
}
await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(report,null,2))
const phase=async args=>{const{stdout}=await execute(process.execPath,['--import','tsx',resolve('tests/fixtures/database-cache-phase.ts'),...args],{timeout:180000,maxBuffer:16*1024*1024});return JSON.parse(stdout.trim().split('\n').at(-1))}
try{
 const seedRoot=join(root,'seed');await mkdir(seedRoot);report.seed=await phase(['seed',seedRoot]);await writeFile(output,JSON.stringify(report,null,2))
 // Copy the same closed, publicly seeded data before any timed process runs.
 const roots=[];for(let index=0;index<report.method.schedule.length;index++){const path=join(root,`round-${index}`);await cp(join(seedRoot,'work/database'),path,{recursive:true});roots.push(path)}
 for(const[index,cacheMB]of report.method.schedule.entries()){const result=await phase(['benchmark',roots[index],String(cacheMB)]);assert.equal(result.cacheMB,cacheMB);assert.equal(result.finalScan.checksum,report.seed.checksum);report.rounds.push({index,...result});await writeFile(output,JSON.stringify(report,null,2))}
 assert.equal(new Set(report.rounds.map(row=>row.pid)).size,4)
 const aggregate=cacheMB=>{const rows=report.rounds.filter(row=>row.cacheMB===cacheMB);assert.equal(rows.length,2);return{scanMs:median(rows.map(row=>row.scanMedianMs)),mixedMs:median(rows.map(row=>row.mixed.milliseconds)),coldScanMs:median(rows.map(row=>row.coldScan.milliseconds)),coldPointReadMs:median(rows.map(row=>row.coldPointReadMs)),warmupMs:median(rows.map(row=>row.warmup.milliseconds)),components:Object.fromEntries(['point-read','commit-update','write-then-rollback'].map(kind=>[kind,median(rows.map(row=>row.mixed.components[kind].milliseconds))]))}}
 report.baseline=aggregate(128);report.candidate=aggregate(32);report.gates={}
 for(const[field,absoluteMs]of[['scanMs',50],['mixedMs',20]]){const baseline=report.baseline[field],candidate=report.candidate[field],allowedMs=Math.max(baseline*0.1,absoluteMs);report.gates[field]={baselineMs:baseline,candidateMs:candidate,changeMs:candidate-baseline,changePercent:(candidate/baseline-1)*100,allowedMs,passed:candidate-baseline<=allowedMs}}
 report.passed=Object.values(report.gates).every(gate=>gate.passed);report.completedAt=new Date().toISOString();await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,passed:report.passed,baseline:report.baseline,candidate:report.candidate,gates:report.gates},null,2));if(!report.passed)process.exitCode=1
}catch(error){report.error=String(error?.stack??error);await writeFile(output,JSON.stringify(report,null,2));throw error}finally{await rm(root,{recursive:true,force:true})}
