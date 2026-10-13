import assert from "node:assert/strict"
import { test } from "node:test"
import { randomUUID } from "node:crypto"
import type { Conversation, Message } from "../../src/generated/prisma/client"
import type { LanguageModel } from "ai"
import type { PublicModel } from "../../desktop/core/settings"
import { builtinModels } from "../../desktop/shared/builtin-model-catalog"
import { localModelRecord, snapshotForRecord } from "../../desktop/service/models"
import { ModelConfigurationService } from "../../desktop/main/model-configuration"
import { ModelGateway } from "../../desktop/core/model-authorization"
import { createAgentTools } from "../../src/lib/ai/tools"
import { compactCreationTools } from "../../src/lib/ai/compact-tools"
import { assertPromptFits, estimateToolTokens } from "../../src/lib/ai/prompt-budget"
import { manageConversationContext } from "../../src/lib/ai/context-compression"
import { ContextBudgetError } from "../../src/lib/ai/context-protection"
import { CHAT_SYSTEM_CURRENT } from "../../src/lib/prompts/chat-system"
import { STORY_WORKFLOW_PROMPT } from "../../src/lib/prompts/story-workflow"
import { withTurnReminder, toModelMessages } from "../../src/lib/ai/chat"
import { composeWizardDraft } from "../../src/lib/creation-wizard/compose"
import { freshWizardFilters } from "../../src/lib/creation-wizard/presets"
import { WIZARD_TEMPLATES } from "../../src/lib/creation-wizard/templates"
import { WIZARD_CATEGORIES, isTemplateVisible } from "../../src/lib/creation-wizard/filter"

const configured = (modelId: string, extra: Partial<PublicModel> = {}): PublicModel => ({
  id: randomUUID(), name: modelId, provider: "deepseek", modelId, protocol: "openai", endpoint: "https://api.deepseek.com",
  kind: "TEXT", contextWindow: 0, enabled: true, authRevision: 1, keyMask: "••••••••", thinkingLevels: ["low", "high", "max"], defaultThinking: "high", ...extra,
})
const ids = ["deepseek-flash", "deepseek-v4-pro"]
test("CC01: exact builtin DeepSeek model windows have official metadata", () => {
  for (const id of ids) assert.equal(builtinModels("deepseek", "TEXT").find(row => row.id === id)?.contextWindow, 1_000_000)
})
test("CC01: authenticated list without capacity inherits official metadata; explicit returned capacity wins", async () => {
  for (const contextWindow of [undefined, 1048576]) {
    const fetcher: typeof fetch = async () => Response.json({ data: ids.map(id => ({ id, ...(contextWindow ? { context_length: contextWindow } : {}) })) })
    const gateway = new ModelGateway({ keyFor: async () => "synthetic-test-only-key", fetch: fetcher })
    const service = new ModelConfigurationService({ gateway, fetch: fetcher, repository: { read: async () => ({ models: [] }) as never, keyFor: async () => { throw Error("No saved credentials") } } })
    try {
      const result = await service.discover("test-only", randomUUID(), { provider: "deepseek", kind: "TEXT", protocol: "openai", endpoint: "https://api.deepseek.com", apiKey: "synthetic-test-only-key" })
      assert.equal(result.ok, true)
      if (result.ok) for (const id of ids) assert.equal(result.models.find(row => row.id === id)?.contextWindow, contextWindow ?? 1_000_000)
    } finally { await service.close() }
  }
})
test("CC02/03: old unknown official configurations receive runtime capacity without rewriting identity or immutable snapshot", () => {
  for (const id of ids) for (const endpoint of ["https://api.deepseek.com", "https://api.deepseek.com/", "https://api.deepseek.com/v1", "https://api.deepseek.com/v1/", "https://api.deepseek.com:443/v1"]) {
    const model = configured(id, { endpoint }), before = structuredClone(model), record = localModelRecord(model)
    assert.equal(record.contextWindow, 1_000_000)
    assert.deepEqual(model, before); assert.deepEqual(snapshotForRecord(record), before)
    assert.equal(record.id, model.id); assert.equal(record.apiKeyEncrypted, "")
    for (const contextWindow of [16384, 1048576]) assert.equal(localModelRecord({ ...model, contextWindow }).contextWindow, contextWindow)
  }
})
test("CC04: unknown models and out-of-scope endpoints never inherit a published capacity", () => {
  for (const extra of [
    { modelId: "deepseek-flash-unknown" }, { provider: "custom" }, { provider: "openai" }, { protocol: "anthropic" as const }, { kind: "IMAGE" as const },
    ...["http://api.deepseek.com", "https://proxy.invalid/v1", "https://api.deepseek.com.proxy.invalid", "https://api.deepseek.com:444", "https://author@api.deepseek.com", "https://api.deepseek.com/beta", "https://api.deepseek.com/v2", "https://api.deepseek.com/?scope=other", "https://api.deepseek.com/#other"].map(endpoint => ({ endpoint })),
  ]) assert.equal(localModelRecord(configured(ids[0], extra)).contextWindow, 16_000, JSON.stringify(extra))
})
test("CC05: actual xianxia wizard draft, fixed creation prompts and real tool schemas fit both corrected models; small windows retain hard protection", async () => {
  const filters = freshWizardFilters("仙侠")
  const picks = Object.fromEntries(WIZARD_CATEGORIES.map(cat => [cat, WIZARD_TEMPLATES.find(row => row.cat === cat && isTemplateVisible(row, filters)) ?? null])) as Parameters<typeof composeWizardDraft>[1]
  assert.ok(WIZARD_CATEGORIES.every(cat => picks[cat]))
  const history = [{ id: "isolated-user", role: "USER", content: composeWizardDraft(filters, picks), toolCalls: [], parts: [] }] as unknown as Message[]
  const system = CHAT_SYSTEM_CURRENT.replace("{{novelContext}}", "（隔离空作品）") + STORY_WORKFLOW_PROMPT
  const tools = createAgentTools({ userId: "local-author", novelId: "isolated-budget" })
  assert.ok(await estimateToolTokens(tools) > 16000)
  const compact = compactCreationTools(tools, 16000)
  assert.ok(await estimateToolTokens(compact.activeSet()) < 16000)
  const conversation = { id: "isolated-chat", summary: "", summarizedThroughId: null, lastFirstStepInputTokens: null, lastPromptEstimate: null } as Conversation
  const run = async (model: PublicModel) => {
    const modelRecord = localModelRecord(model)
    const toolTokens = Math.max(3000, Math.min(16000, Math.floor(modelRecord.contextWindow * .4))) + 2400
    return manageConversationContext({ conversation, history, system, renderSystem: async () => system, model: {} as LanguageModel, modelRecord,
      extraTokens: toolTokens, validateFinal: (value, messages) => assertPromptFits(value, withTurnReminder(toModelMessages(messages), "standard"), toolTokens, modelRecord.contextWindow),
      summarize: async () => { throw Error("A new conversation must not discard its sole author request") }, persist: async () => { throw Error("No summary write is needed") },
    })
  }
  for (const id of ids) {
    const result = await run(configured(id))
    assert.equal(result.compressed, false); assert.deepEqual(result.messages, history); assert.ok(result.promptEstimate > 16000)
    await assert.rejects(run(configured(id, { contextWindow: 16384 })), ContextBudgetError)
  }
})
