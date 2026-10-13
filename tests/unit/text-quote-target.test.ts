import test from 'node:test'
import assert from 'node:assert/strict'
import {formatTextQuote,registerTextQuoteTarget,captureTextQuoteTarget} from '../../src/lib/desktop/text-quote-target'
test('TCM11 new literal tokens are escaped without rewriting old draft chips',()=>{
 assert.equal(formatTextQuote('选中\n第二行'),'> 选中\n> 第二行\n\n')
 assert.equal(formatTextQuote('@[角色/原文](id)'),'> @\\[角色/原文](id)\n\n')
 assert.equal(formatTextQuote('@\\[角色/已转义](id)'),'> @\\[角色/已转义](id)\n\n')
})
test('TCM12 quote lease rejects target A-B-A and disposal',async()=>{
 let identity='A',notify=()=>{},available=true;const appended:string[]=[]
 const release=registerTextQuoteTarget({identity:()=>identity,available:()=>available,append:text=>{appended.push(text)},subscribe:listener=>{notify=listener;return()=>{notify=()=>{}}}})
 const lease=captureTextQuoteTarget()!;assert.ok(lease)
 identity='B';notify();identity='A';notify();assert.equal(lease.isCurrent(),false)
 await assert.rejects(()=>lease.append('old'));assert.deepEqual(appended,[])
 const valid=captureTextQuoteTarget()!;await valid.append('新的文本');assert.deepEqual(appended,['> 新的文本\n\n'])
 available=false;assert.equal(captureTextQuoteTarget(),null);release();assert.equal(valid.isCurrent(),false)
})
