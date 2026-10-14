import { z } from 'zod'
import { VersionedStore, type StoreOptions } from '../core/versioned-store'
import { PROVIDER_PRESETS, type CatalogScope, type CatalogResult } from '../shared/model-catalog'
import { LEGACY_OFFICIAL_ENDPOINTS } from '../shared/provider-capabilities'
import { modelChoices, offlineCatalog } from '../shared/builtin-model-catalog'

const text = z.string().trim().min(1).max(2048).regex(/^[^\x00-\x1f\x7f]+$/)
const scopeSchema = z.object({ provider: z.enum(['openai', 'anthropic', 'google', 'xai', 'deepseek', 'moonshot', 'zai', 'xiaomi', 'alibaba', 'minimax', 'tencent', 'bytedance']), kind: z.enum(['TEXT', 'IMAGE']), protocol: z.enum(['openai', 'anthropic']), endpoint: z.url().max(2048) }).strict()
const entrySchema = z.object({ id: text.max(200), name: text.max(200), kind: z.enum(['TEXT', 'IMAGE']), permission: z.literal('unknown'), source: text, contextWindow: z.number().int().positive().max(100_000_000).optional(), maxOutputTokens: z.number().int().positive().max(100_000_000).optional(), thinkingLevels: z.array(text.max(30)).max(16).optional(), defaultThinking: text.max(30).optional(), available: z.literal(false).optional(), notes: z.array(text).max(32).optional() }).strict()
const snapshotSchema = z.object({ scope: scopeSchema, checkedAt: z.iso.datetime(), models: z.array(entrySchema).max(10000), complete: z.boolean(), unknownCapabilityIds: z.array(text.max(200)).max(10000) }).strict()
const snapshotsSchema = z.array(snapshotSchema).max(128)
const normalize = (scope: CatalogScope): CatalogScope => ({ provider: scope.provider, kind: scope.kind, protocol: scope.protocol, endpoint: scope.endpoint.replace(/\/+$/, '') })
const scopeKey = (scope: CatalogScope) => JSON.stringify(normalize(scope))
export class CatalogRepositoryError extends Error { constructor(readonly code: 'CATALOG_READ_FAILED' | 'CATALOG_SAVE_FAILED' | 'CANCELLED') { super(code) } }

/** One main-process owner. This file is independent of models, settings and Keys. */
export class ModelCatalogRepository {
  private readonly store: VersionedStore<z.infer<typeof snapshotsSchema>>
  private readonly tickets = new Map<string, number>()
  private sequence = 0
  private queue: Promise<unknown> = Promise.resolve()
  constructor(readonly path: string, options: StoreOptions = {}) { this.store = new VersionedStore(path, [], snapshotsSchema.parse, options) }
  begin(scope: CatalogScope) { const ticket = ++this.sequence; this.tickets.set(scopeKey(scope), ticket); return ticket }
  async read(scope: CatalogScope): Promise<CatalogResult | null> {
    if (scope.provider === 'custom') return null
    scopeSchema.parse(normalize(scope))
    try {
      const current = await this.store.read(), snapshot = current.value.find(row => scopeKey(row.scope) === scopeKey(scope))
      if (!snapshot) return null
      const result: CatalogResult = { ok: true, provider: scope.provider, kind: scope.kind, models: snapshot.models, authoritative: true, complete: snapshot.complete, permission: 'unknown', checkedAt: snapshot.checkedAt, sources: [...new Set(snapshot.models.map(m => m.source))], unknownCapabilityIds: snapshot.unknownCapabilityIds, warnings: snapshot.complete ? [] : ['上次目录含能力尚未确认的型号，仅显示已确认类别的型号'] }
      return { ...result, models: modelChoices(scope.provider, scope.kind, result) }
    } catch { throw new CatalogRepositoryError('CATALOG_READ_FAILED') }
  }
  replace(scope: CatalogScope, result: CatalogResult, assertCurrent: () => void, ticket: number): Promise<void> {
    const normalized = normalize(scope), preset = PROVIDER_PRESETS.find(p => p.id === scope.provider), expected = scope.kind === 'TEXT' ? preset?.textEndpoint : preset?.imageEndpoint
    if (scope.provider === 'custom' || !expected || preset?.protocol !== scope.protocol || ![expected, ...(LEGACY_OFFICIAL_ENDPOINTS[scope.provider] ?? [])].includes(normalized.endpoint) || result.provider !== scope.provider || result.kind !== scope.kind || !(result.authoritative === true || result.complete)) return Promise.reject(new CatalogRepositoryError('CATALOG_SAVE_FAILED'))
    const guard = () => { assertCurrent(); if (this.tickets.get(scopeKey(scope)) !== ticket) throw new CatalogRepositoryError('CANCELLED') }
    const work = this.queue.then(async () => {
      try {
        guard()
        const publicCatalog = offlineCatalog(result)
        const snapshot = snapshotSchema.parse({ scope: normalized, checkedAt: result.checkedAt, complete: result.complete, unknownCapabilityIds: result.unknownCapabilityIds, models: modelChoices(scope.provider, scope.kind, result).map(entry => {
          const safe = publicCatalog.models.find(row => row.id === entry.id)!
          // Copy only the public contract, never caller-owned draft fields.
          return { id: safe.id, name: safe.name, kind: safe.kind, source: safe.source, permission: 'unknown', contextWindow: entry.contextWindow, maxOutputTokens: entry.maxOutputTokens, thinkingLevels: entry.thinkingLevels, defaultThinking: entry.defaultThinking, notes: entry.notes, ...(safe.available === false ? { available: false } : {}) }
        }) })
        const before = await this.store.read(); guard()
        await this.store.update(before.revision, [...before.value.filter(row => scopeKey(row.scope) !== scopeKey(scope)), snapshot], guard)
      } catch (error) { guard(); if (error instanceof CatalogRepositoryError) throw error; throw new CatalogRepositoryError('CATALOG_SAVE_FAILED') }
    })
    this.queue = work.catch(() => undefined)
    return work
  }
}
