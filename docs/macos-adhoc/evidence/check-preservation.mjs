import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve,join} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import assert from 'node:assert/strict'
const project=resolve(import.meta.dirname,'../../..'),execute=promisify(execFile)
const previous=JSON.parse(await readFile(join(import.meta.dirname,'preservation-before.json'),'utf8'))
const actual={}
for(const path of Object.keys(previous.hashes))actual[path]=createHash('sha256').update(await readFile(join(project,path))).digest('hex')
assert.deepEqual(actual,previous.hashes,'Formal release, original user change or original damaged DMG changed')
const diff=(await execute('/usr/bin/git',['diff','--name-only','--','src','desktop','prisma'],{cwd:project,encoding:'utf8'})).stdout.trim().split('\n').filter(Boolean)
assert.deepEqual(diff,['desktop/shared/command-catalogs.generated.json'])
const report={checkedAt:new Date().toISOString(),passed:true,hashes:actual,businessDiffFromHead:diff,preexistingUserFilePreserved:true,formalFiveFilesUnchanged:true,originalDamagedDmgPreserved:true,scope:'SHA-256 compared with before this temporary task; existing user generated catalogue diff preserved, other tracked business sources unchanged'}
await writeFile(join(import.meta.dirname,'preservation-after.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({passed:true,files:Object.keys(actual).length,businessDiffFromHead:diff}))
