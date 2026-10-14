import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { builtinModels, modelChoices, excludedBuiltinModel } from '../../desktop/shared/builtin-model-catalog'
import { PROVIDER_PRESETS, type CatalogResult, type CatalogEntry, type ConfigurationDraft } from '../../desktop/shared/model-catalog'
import { ModelConfigurationService } from '../../desktop/main/model-configuration'
import { ModelGateway } from '../../desktop/core/model-authorization'

const entry = (id: string, kind: 'TEXT' | 'IMAGE' = 'TEXT'): CatalogEntry => ({ id, name: id, kind, permission: 'listed-unverified', source: 'https://fixture.invalid/models' })
const result = (provider: ConfigurationDraft['provider'], models: CatalogEntry[], extra = {}): CatalogResult => ({ ok: true, provider, kind: 'TEXT', models, complete: true, permission: 'listed-unverified', sources: [], unknownCapabilityIds: [], checkedAt: '2026-10-15T00:00:00.000Z', warnings: [], ...extra })
const draft = (provider: ConfigurationDraft['provider'] = 'deepseek', kind: 'TEXT' | 'IMAGE' = 'TEXT'): ConfigurationDraft => { const preset = PROVIDER_PRESETS.find(p => p.id === provider)!; return { provider, kind, protocol: preset.protocol ?? 'openai', endpoint: (kind === 'TEXT' ? preset.textEndpoint : preset.imageEndpoint) ?? 'https://fixture.invalid/v1', apiKey: 'public-catalog-fixture' } }
async function service(fetcher: typeof fetch, run: (s: ModelConfigurationService) => Promise<void>, catalogs?: unknown) {
  const s = new ModelConfigurationService({ repository: { read: async () => ({ models: [] }) as never, keyFor: async () => { throw Error('No saved Key') } }, gateway: new ModelGateway({ keyFor: async () => 'unused', fetch: fetcher }), fetch: fetcher, timeoutMs: 1000, ...(catalogs ? { catalogs } : {}) } as ConstructorParameters<typeof ModelConfigurationService>[0])
  try { await run(s) } finally { await s.close() }
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }

test('MC-02: complete official catalog replaces missing builtin IDs for every preset scope', () => {
  for (const preset of PROVIDER_PRESETS.filter(p => p.id !== 'custom')) for (const kind of ['TEXT', 'IMAGE'] as const) {
    const rows = builtinModels(preset.id, kind), selected = rows.find(m => m.available !== false)
    const live = result(preset.id, selected ? [{ ...selected, permission: 'listed-unverified' }] : [], { kind })
    assert.deepEqual(modelChoices(preset.id, kind, live).map(m => m.id), selected ? [selected.id] : [], `${preset.id}/${kind}`)
  }
})
test('MC-03: authoritative empty and capability-incomplete catalogs never resurrect seeds', () => {
  assert.deepEqual(modelChoices('deepseek', 'TEXT', result('deepseek', [])), [])
  assert.deepEqual(modelChoices('deepseek', 'TEXT', result('deepseek', [entry('deepseek-v4-pro')], { authoritative: true, complete: false, unknownCapabilityIds: ['unknown'] })).map(m => m.id), ['deepseek-v4-pro'])
})
test('MC-05: denied, wrong-kind, retired Tencent and incompatible models cannot be choices', () => {
  assert.deepEqual(modelChoices('deepseek', 'TEXT', result('deepseek', [{ ...entry('deepseek-flash'), available: false }, entry('image', 'IMAGE'), entry('deepseek-chat')])), [])
  assert.deepEqual(modelChoices('tencent', 'TEXT', result('tencent', [entry('qwen3.5-flash'), entry('qwen3.5-plus')])), [])
  assert.equal(excludedBuiltinModel('tencent', 'TEXT', 'glm-5v-turbo', Date.parse('2026-10-29T00:00:00Z')), false)
  assert.equal(excludedBuiltinModel('tencent', 'TEXT', 'glm-5v-turbo', Date.parse('2026-10-30T00:00:00Z')), true)
})
for (const [provider, id] of [['openai', 'gpt-6.1-sol'], ['zai', 'glm-5.3'], ['minimax', 'MiniMax-M3'], ['bytedance', 'doubao-seed-2-1-pro-260915']] as const) test(`MC-02: ${provider} discovery never fills missing official IDs from static metadata`, async () => {
  await service(async () => Response.json({ data: [{ id }] }), async s => {
    const actual = await s.discover('fixture', randomUUID(), draft(provider)); assert.equal(actual.ok, true)
    if (actual.ok) { assert.deepEqual(actual.models.map(m => m.id), [id]); assert.equal((actual as CatalogResult & { authoritative?: boolean }).authoritative, true) }
  })
})

async function fixture(options = {}) {
  const { ModelCatalogRepository } = await import('../../desktop/main/model-catalog-repository')
  const root = await mkdtemp(join(tmpdir(), 'xaanink-catalog-')), path = join(root, 'model-catalogs.json')
  return { root, path, repo: new ModelCatalogRepository(path, options), reopen: () => new ModelCatalogRepository(path), async close() { await rm(root, { recursive: true, force: true }) } }
}
test('MC-03/06/07: durable replacement, empty snapshots, no credentials/grants and scope isolation', async () => {
  const f = await fixture()
  try {
    const d = draft(), snapshot = result('deepseek', [entry('deepseek-v4-pro')], { authoritative: true })
    await f.repo.replace(d, snapshot, () => {}, f.repo.begin(d))
    const restored = await f.reopen().read(d); assert.ok(restored)
    assert.deepEqual(restored.models.map(m => m.id), ['deepseek-v4-pro']); assert.equal(restored.models[0].permission, 'unknown')
    assert.equal(await f.repo.read(draft('openai')), null); assert.equal(await f.repo.read(draft('deepseek', 'IMAGE')), null)
    assert.equal(await f.repo.read({ ...d, endpoint: 'https://api.deepseek.com/other' }), null)
    assert.deepEqual((await f.repo.read({ ...d, endpoint: d.endpoint + '/' }))?.models, restored.models)
    const bytes = await readFile(f.path, 'utf8'); assert.equal(bytes.includes(d.apiKey), false); assert.equal(bytes.includes('listed-unverified'), false); assert.equal(bytes.includes('apiKey'), false)
    await f.repo.replace(d, result('deepseek', [], { authoritative: true }), () => {}, f.repo.begin(d))
    assert.deepEqual((await f.reopen().read(d))?.models, [])
    await assert.rejects(f.repo.replace(draft('custom'), result('custom', [], { authoritative: true }), () => {}, 1))
    assert.equal(await f.repo.read({ ...d, protocol: 'anthropic' }), null)
  } finally { await f.close() }
})
test('MC-04/08: incomplete, stale and cancelled commits cannot overwrite a confirmed snapshot', async () => {
  const f = await fixture()
  try {
    const d = draft(), old = result('deepseek', [entry('deepseek-v4-pro')], { authoritative: true })
    await f.repo.replace(d, old, () => {}, f.repo.begin(d)); const before = await readFile(f.path, 'utf8')
    await assert.rejects(f.repo.replace(d, result('deepseek', [] , { complete: false }), () => {}, f.repo.begin(d)))
    await assert.rejects(f.repo.replace(d, old, () => { throw Error('cancelled') }, f.repo.begin(d)))
    const stale = f.repo.begin(d), newest = f.repo.begin(d)
    await f.repo.replace(d, result('deepseek', [], { authoritative: true }), () => {}, newest)
    await assert.rejects(f.repo.replace(d, old, () => {}, stale))
    assert.deepEqual((await f.repo.read(d))?.models, [])
    assert.notEqual(await readFile(f.path, 'utf8'), before)
  } finally { await f.close() }
})
test('MC-04: service persists only validated authoritative responses; failure and cancelled late requests preserve disk', async () => {
  const f = await fixture()
  try {
    const d = draft()
    await f.repo.replace(d, result('deepseek', [entry('deepseek-v4-pro')], { authoritative: true }), () => {}, f.repo.begin(d))
    const before = await readFile(f.path, 'utf8')
    for (const fetcher of [async () => Response.json({}, { status: 401 }), async () => { throw Error('network') }, async () => new Response('{broken'), async () => Response.json({ data: [], has_more: true })]) {
      await service(fetcher, async s => { assert.equal((await s.discover('fixture', randomUUID(), d)).ok, false) }, f.repo)
      assert.equal(await readFile(f.path, 'utf8'), before)
    }
    const gate = deferred<Response>()
    await service(() => gate.promise, async s => { const id = randomUUID(), pending = s.discover('fixture', id, d); await new Promise(r => setImmediate(r)); s.cancel('fixture', id); assert.equal((await pending).ok, false); gate.resolve(Response.json({ data: [] })); await new Promise(r => setImmediate(r)) }, f.repo)
    assert.equal(await readFile(f.path, 'utf8'), before)
    await service(async () => Response.json({ data: [{ id: 'deepseek-flash' }, { id: 'unclassified' }] }), async s => { const actual = await s.discover('fixture', randomUUID(), d); assert.equal(actual.ok, true); if (actual.ok) assert.equal(actual.complete, false) }, f.repo)
    assert.deepEqual((await f.reopen().read(d))?.models.map(m => m.id), ['deepseek-flash'])
  } finally { await f.close() }
})
test('MC-08: write failure preserves file and corrupted cache raises an error', async () => {
  const f = await fixture()
  try {
    const d = draft(), live = result('deepseek', [entry('deepseek-v4-pro')], { authoritative: true })
    await f.repo.replace(d, live, () => {}, f.repo.begin(d)); const before = await readFile(f.path, 'utf8')
    const { ModelCatalogRepository } = await import('../../desktop/main/model-catalog-repository')
    const failing = new ModelCatalogRepository(f.path, { beforeRename: async () => { throw Error('fixture-write-failed') } })
    await assert.rejects(failing.replace(d, result('deepseek', [], { authoritative: true }), () => {}, failing.begin(d)))
    assert.equal(await readFile(f.path, 'utf8'), before)
    await writeFile(f.path, '{corrupt'); await assert.rejects(f.reopen().read(d))
  } finally { await f.close() }
})
test('MC-07: subscription existence never transfers an account grant to a restarted catalog', async () => {
  const f=await fixture()
  try{
    for(const subscribed of [false,true])await service(async()=>Response.json({data:[{id:'MiniMax-M3.1-Flash-Preview'}]}),async s=>{
      const d={...draft('minimax'),apiKey:subscribed?'sk-cp-public-catalog-fixture':'public-catalog-fixture'}
      const live=await s.discover('fixture',randomUUID(),d);assert.equal(live.ok,true);if(!live.ok)return
      assert.equal(modelChoices('minimax','TEXT',live).length,subscribed?1:0)
      assert.deepEqual((await f.reopen().read(d))?.models,[])
    },f.repo)
  }finally{await f.close()}
})
