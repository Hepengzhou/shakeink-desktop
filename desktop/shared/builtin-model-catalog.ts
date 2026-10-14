import seeds from './verified-model-seeds.json'
import { officialModel } from './provider-capabilities'
import type { CatalogEntry, CatalogResult, ConfigurationKind, ConfigurationProviderId } from './model-catalog'

const anthropicRetired = new Set(['claude-opus-4-1-20250805', 'claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-2.0', 'claude-2.1', 'claude-3-sonnet-20240229', 'claude-1.0', 'claude-1.1', 'claude-1.2', 'claude-1.3', 'claude-instant-1.0', 'claude-instant-1.1', 'claude-instant-1.2'])
const aliEditOnly = new Set(['qwen-image-edit-max', 'qwen-image-edit-max-2026-01-16', 'qwen-image-edit-plus', 'qwen-image-edit-plus-2025-12-15', 'qwen-image-edit-plus-2025-10-30', 'qwen-image-edit', 'wan2.5-i2i-preview', 'wanx2.1-imageedit'])
const tencentRetired = new Set(['qwen3.5-flash', 'qwen3.5-plus'])
export function excludedBuiltinModel(provider: ConfigurationProviderId, kind: ConfigurationKind, id: string, now = Date.now()) {
  const known = officialModel(provider, id)
  if (provider === 'tencent' && (tencentRetired.has(id) || id === 'glm-5v-turbo' && now >= Date.parse('2026-10-30T00:00:00+08:00'))) return true
  if (provider === 'anthropic' && (kind !== 'TEXT' || anthropicRetired.has(id) || id === 'claude-sonnet-4-5-20250929' && now >= Date.parse('2026-11-30T00:00:00Z'))) return true
  return !!known && (known.kind !== kind || !!known.shutdownDate && Date.parse(known.shutdownDate) <= now) || provider === 'alibaba' && kind === 'IMAGE' && aliEditOnly.has(id)
}
function capacity(provider: ConfigurationProviderId, id: string): Partial<CatalogEntry> {
  const known = officialModel(provider, id)
  if (!known) return {}
  return { contextWindow: known.contextWindow, maxOutputTokens: known.maxOutputTokens, thinkingLevels: known.thinkingLevels ? [...known.thinkingLevels] : undefined, defaultThinking: known.defaultThinking, notes: known.notes ? [...known.notes] : undefined, ...(known.subscriptionOnly ? { available: false } : {}) }
}
/** Small, individually rechecked official seeds; never a full account catalog. */
export function builtinModels(provider: ConfigurationProviderId, kind: ConfigurationKind): CatalogEntry[] {
  return seeds.filter(seed => seed.provider === provider && seed.kind === kind && !excludedBuiltinModel(provider, kind, seed.id)).map(seed => ({ id: seed.id, name: seed.id, kind, permission: 'unknown', source: seed.source, ...capacity(provider, seed.id) }))
}
/** A successfully enumerated official catalog replaces IDs, including an empty
 * catalog. Capability metadata enriches present IDs only; it never adds IDs. */
export function modelChoices(provider: ConfigurationProviderId, kind: ConfigurationKind, catalog: CatalogResult | null): CatalogEntry[] {
  const matching = catalog?.provider === provider && catalog.kind === kind
  const authoritative = matching && (catalog.authoritative === true || catalog.complete)
  const choices = new Map((authoritative ? [] : builtinModels(provider, kind)).map(entry => [entry.id, entry]))
  if (matching) for (const entry of catalog.models) {
    if (entry.kind !== kind || entry.available === false || excludedBuiltinModel(provider, kind, entry.id)) continue
    const defaults = capacity(provider, entry.id)
    const current = { ...defaults, ...entry }
    if (defaults.available === false && entry.available !== true) continue
    choices.set(entry.id, current)
  }
  return [...choices.values()].filter(entry => entry.available !== false)
}
/** Public existence survives restart/Key changes; account grants do not. */
export function offlineCatalog(catalog: CatalogResult): CatalogResult {
  return { ...catalog, permission: 'unknown', models: catalog.models.map(entry => ({ ...entry, permission: 'unknown', available: officialModel(catalog.provider, entry.id)?.subscriptionOnly ? false : entry.available === false ? false : undefined })) }
}
