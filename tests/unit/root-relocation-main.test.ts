import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {transformSync} from 'esbuild'
const source=ts.createSourceFile('main.ts',readFileSync('desktop/main/index.ts','utf8'),ts.ScriptTarget.Latest,true),branch=source.statements.at(-1)!
assert.ok(branch&&ts.isIfStatement(branch))
// The previous lost -> backup recovery -> explicit locate oracle is retained
// at docs/evidence/backup-removal/root-relocation-main-before-removal.test.ts.
// This contract now routes physical loss directly to strict root relocation.
for(const mode of ['lost','blocked','none'] as const)test(`actual first synchronous main branch routes ${mode} before any ordinary worker or source session`,async()=>{
 const trace:string[]=[],decision={mode},work=Promise.withResolvers<void>()
 const deps={app:{requestSingleInstanceLock:()=>true,hasSingleInstanceLock:()=>true,quit(){trace.push('quit')},exit(){trace.push('exit')}},assertNoLegacyBackupRecovery:(path:string,assertLock:()=>void)=>{assert.equal(path,'/bootstrap');assertLock()},classifyStartupRecovery:(paths:unknown,family:unknown)=>{assert.deepEqual(paths,{bootstrap:'/bootstrap',recoveryRoot:'/isolated'});trace.push('classify');return{kind:'none'}},executeStartupRepair:async()=>assert.fail('none classification never repairs'),selectBrandStartupPaths:()=>assert.fail('none classification never reselects'),launchStartupRecovery:async()=>assert.fail('none classification never opens the recovery window'),rootRelocationPreflight:(path:string)=>{assert.equal(path,'/bootstrap');trace.push('relocation-preflight');return decision},launchRootRelocation:(path:string,current:unknown)=>{assert.equal(path,'/bootstrap');assert.equal(current,decision);trace.push('relocation');return work.promise},rootMaintenanceRequired:()=>{trace.push('migration-preflight');return true},launchRootMaintenance:()=>{trace.push('migration');return work.promise},launch:()=>{trace.push('ordinary');return work.promise},bootstrapPath:'/bootstrap',isolatedRoot:'/isolated',join:()=>'',homedir:()=>'',resolve:(path:string)=>path,startupSelectionError:null,dialog:{showErrorBox(){trace.push('failure')}}}
 const environment={startupPaths:{defaultRoot:'/isolated'},...deps}
 new Function(...Object.keys(environment),transformSync(branch.getText(source),{loader:'ts'}).code)(...Object.values(environment))
 assert.deepEqual(trace,mode==='none'?['classify','relocation-preflight','migration-preflight','migration']:['classify','relocation-preflight','relocation'])
 work.resolve();await new Promise(resolve=>setImmediate(resolve))
})
test('denied stable instance lock does not inspect root files or create any recovery/workbench window',()=>{
 const calls:string[]=[],fail=()=>{throw Error('must not run')};new Function('startupPaths','app','rootRelocationPreflight','rootMaintenanceRequired','launchRootRelocation','launchRootMaintenance','launch',transformSync(branch.getText(source),{loader:'ts'}).code)({defaultRoot:'/isolated'},{requestSingleInstanceLock:()=>false,quit:()=>calls.push('quit')},fail,fail,fail,fail,fail);assert.deepEqual(calls,['quit'])
})
test('actual ordinary startup passes legacy, relocation and migration triage before launching the existing workbench',async()=>{
 const trace:string[]=[],deps={app:{requestSingleInstanceLock:()=>true,hasSingleInstanceLock:()=>true},assertNoLegacyBackupRecovery:(path:string,guard:()=>void)=>{assert.equal(path,'/bootstrap');guard();trace.push('legacy-check')},classifyStartupRecovery:()=>{trace.push('classify');return{kind:'none'}},executeStartupRepair:async()=>assert.fail('none classification never repairs'),selectBrandStartupPaths:()=>assert.fail('none classification never reselects'),launchStartupRecovery:async()=>assert.fail('none classification never opens the recovery window'),rootRelocationPreflight:()=>{trace.push('relocation-preflight');return{mode:'none'}},rootMaintenanceRequired:()=>{trace.push('migration-preflight');return false},inboxLeaseRecoveryRequired:()=>{trace.push('inbox-preflight');return false},launchInboxLeaseRecovery:()=>assert.fail('no inbox repair pending'),launchRootRelocation:()=>assert.fail('no physical loss'),launchRootMaintenance:()=>assert.fail('no migration pending'),launch:async()=>{trace.push('ordinary')},bootstrapPath:'/bootstrap',isolatedRoot:null,join:(...parts:string[])=>parts.join('/'),resolve:(path:string)=>path,homedir:()=>'/home/author',startupSelectionError:null,dialog:{showErrorBox:()=>assert.fail('ordinary startup should not fail')}}
 const environment={startupPaths:{defaultRoot:'/test/data'},...deps}
 new Function(...Object.keys(environment),transformSync(branch.getText(source),{loader:'ts'}).code)(...Object.values(environment));await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(trace,['legacy-check','classify','relocation-preflight','migration-preflight','inbox-preflight','ordinary'])
})
