import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve,join} from 'node:path'
import {lstat,readFile} from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

const project=resolve(import.meta.dirname,'../..')
const execute=promisify(execFile)
const investigated={dmg:'2abef4f3708c20b4dd19e09db39ddc7c0659bf6dbba154b50dc2d19a3c291cda',main:'c9da78c3c79b9e6d6714fbf2a1136c4eb4a93cc5edad0f8ccfb058d681325e7e',info:'65318907738efce8f2837619ae8e363c409cad3a332f9f5d3fd9c25f9d466c44'}
const sha256=async(path:string)=>{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex')}
test('MACREL-11 investigated damaged app fails real integrity without a Team requirement, then the new gate rejects it',{skip:process.platform!=='darwin',timeout:60000},async context=>{
 const {verifyMacSignature}=await import('../../scripts/macos-release.mjs')
 const app=join(project,'release/mac-arm64/玄印写作.app')
 await lstat(app)
 assert.equal(await sha256(join(app,'Contents/MacOS/玄印写作')),investigated.main)
 assert.equal(await sha256(join(app,'Contents/Info.plist')),investigated.info)
 await assert.rejects(execute('/usr/bin/codesign',['--verify','--deep','--strict','--verbose=4',app],{timeout:20000,encoding:'utf8'}),error=>{
  const native=error as Error&{code?:number;stderr?:string}
  assert.equal(native.code,1);assert.match(native.stderr??'',/code has no resources but signature indicates they must be present/);return true
 })
 // The syntactically required Team cannot cause the no--R integrity failure
 // above. This fixed sample must then be rejected specifically at codesign.
 await assert.rejects(verifyMacSignature(app,{teamId:'ABC1234567',arch:process.arch}),/^Error: 发布工具失败：codesign \(1\)$/)
 context.diagnostic(`Fixed investigated main SHA256=${investigated.main}; Info.plist SHA256=${investigated.info}; actual no-R strict/deep exit=1: code has no resources but signature indicates they must be present`)
})

test('MACREL-11 investigated DMG is truly unsigned without Team filtering and rejected without mounting or mutation',{skip:process.platform!=='darwin',timeout:60000},async context=>{
 const {verifyMacArtifact}=await import('../../scripts/macos-release.mjs')
 const dmg=join(project,'release/ShakeInk-0.1.0-alpha-mac-arm64.dmg')
 const before=await sha256(dmg)
 assert.equal(before,investigated.dmg)
 await assert.rejects(execute('/usr/bin/codesign',['--verify','--strict','--verbose=4',dmg],{timeout:20000,encoding:'utf8'}),error=>{
  const native=error as Error&{code?:number;stderr?:string}
  assert.equal(native.code,1);assert.match(native.stderr??'',/code object is not signed at all/);return true
 })
 await assert.rejects(verifyMacArtifact(project,dmg,{teamId:'ABC1234567',arch:'arm64'}),/^Error: 发布工具失败：codesign \(1\)$/)
 const after=await sha256(dmg)
 assert.equal(after,before)
 context.diagnostic(`Fixed investigated DMG SHA256=${before}; actual no-R strict exit=1: code object is not signed at all; final SHA256 unchanged`)
})
