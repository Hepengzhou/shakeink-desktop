import test from 'node:test'
import assert from 'node:assert/strict'
import seeds from '../../desktop/shared/verified-model-seeds.json'
import research from '../../docs/model-catalog-fix/official-seeds-research.json'
import { builtinModels, modelChoices, excludedBuiltinModel, offlineCatalog } from '../../desktop/shared/builtin-model-catalog'
import type { CatalogResult, CatalogEntry } from '../../desktop/shared/model-catalog'
const live = (provider: CatalogResult['provider'], kind: CatalogResult['kind'], models: CatalogEntry[]): CatalogResult => ({ ok:true,provider,kind,models,authoritative:true,complete:true,unknownCapabilityIds:[],permission:'listed-unverified',sources:[],checkedAt:'2026-10-15T00:00:00Z',warnings:[] })

test('MC-01: every offline seed has an independently checked official source and date', () => {
  const unique = new Set<string>()
  for (const seed of seeds) {
    const key = [seed.provider,seed.kind,seed.id].join('/')
    assert.ok(!unique.has(key)); unique.add(key)
    const verified = research.providers.find(row => row.provider === seed.provider && row.kind === seed.kind)
    assert.ok(verified?.ids.includes(seed.id), key); assert.equal(seed.checkedAt,research.checkedAt); assert.ok(verified?.sources.includes(seed.source),seed.source)
    const rows=builtinModels(seed.provider as CatalogResult['provider'],seed.kind as CatalogResult['kind'])
    const candidate=rows.find(row=>row.id===seed.id);assert.ok(candidate);assert.equal(candidate.permission,'unknown');assert.match(candidate.source,/^https:\/\//)
  }
  assert.deepEqual(builtinModels('zai','TEXT'),[]);assert.deepEqual(builtinModels('custom','TEXT'),[])
  assert.deepEqual(builtinModels('deepseek','TEXT').map(row=>row.id),['deepseek-flash','deepseek-v4-pro'])
  assert.ok(!builtinModels('tencent','TEXT').some(row=>['qwen3.5-flash','qwen3.5-plus'].includes(row.id)))
})
test('MC-02/05: exact live metadata wins and missing/denied IDs do not survive replacement', () => {
  const publicRow=builtinModels('deepseek','TEXT')[0],newRow={...publicRow,id:'new-live',name:'Live',permission:'listed-unverified' as const}
  const rows=modelChoices('deepseek','TEXT',live('deepseek','TEXT',[{...publicRow,contextWindow:99999},newRow]))
  assert.equal(rows[0].contextWindow,99999);assert.equal(rows.filter(row=>row.id===publicRow.id).length,1)
  assert.equal(rows.some(row=>row.id==='deepseek-v4-pro'),false)
  assert.deepEqual(modelChoices('deepseek','TEXT',live('deepseek','TEXT',[{...publicRow,available:false}])),[])
  assert.ok(!modelChoices('deepseek','TEXT',live('openai','TEXT',[newRow])).some(row=>row.id==='new-live'))
})
test('MC-07: subscription grants require current confirmation and are stripped from offline snapshots', () => {
  const restricted:CatalogEntry={id:'MiniMax-M3.1-Flash-Preview',name:'Restricted',kind:'TEXT',source:'https://fixture.invalid',permission:'listed-unverified'}
  assert.deepEqual(modelChoices('minimax','TEXT',live('minimax','TEXT',[restricted])),[])
  const online=live('minimax','TEXT',[{...restricted,available:true}]);assert.equal(modelChoices('minimax','TEXT',online).length,1)
  assert.deepEqual(modelChoices('minimax','TEXT',offlineCatalog(online)),[])
})
test('MC-05: live additions cannot reinstate retired, OTHER, edit-only or wrong-kind IDs', () => {
  for(const [provider,kind,ids] of [['openai','TEXT',['chatgpt-4o-latest','text-embedding-3-large','gpt-oss-20b']],['alibaba','IMAGE',['qwen-image-edit','wan2.5-i2i-preview']],['anthropic','TEXT',['claude-opus-4-1-20250805','claude-opus-4-20250514','claude-3-5-sonnet-20241022']],['tencent','TEXT',['qwen3.5-flash','qwen3.5-plus']]] as const){
    assert.deepEqual(modelChoices(provider,kind,live(provider,kind,ids.map(id=>({id,name:id,kind,source:'https://fixture.invalid',permission:'listed-unverified',available:true})))),[])
  }
  assert.equal(excludedBuiltinModel('anthropic','TEXT','claude-sonnet-4-5-20250929',Date.parse('2026-11-29')),false)
  assert.equal(excludedBuiltinModel('anthropic','TEXT','claude-sonnet-4-5-20250929',Date.parse('2026-11-30')),true)
})
