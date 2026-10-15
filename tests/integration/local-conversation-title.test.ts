import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Workspaces } from "../../desktop/service/workspaces"
import { configureModelTransport } from "../../desktop/service/models"
import { ModelService } from "../../desktop/main/model-service"
import { ModelRepository, type ModelDraft } from "../../desktop/main/model-repository"
import { ModelGateway } from "../../desktop/core/model-authorization"
import { defaultConversationTitle, summarizeConversationTitle } from "../../src/lib/services/conversation-title"
import { prisma } from "../../src/lib/db"

// 接线方式沿用 tests/integration/local-model-generation.test.ts 先例：
// 真实 Workspaces（PGlite）+ 真实 ModelRepository/ModelService/ModelGateway，仅 HTTP 出口打桩。
const draft: ModelDraft = { name: "作者的模型", provider: "custom", protocol: "openai", modelId: "fixture-text", endpoint: "https://fixture.invalid/v1", kind: "TEXT", contextWindow: 128000, enabled: true, thinkingLevels: [], defaultThinking: "default", apiKey: "fixture-title-main-key" }
const protection = { isEncryptionAvailable: () => true, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() }
const FIRST_USER = "帮我构思一个深海潜水员发现沉船秘密的故事开头"

async function setup(options: { withDefaultModel: boolean; generated?: string }) {
  const root = await mkdtemp(join(tmpdir(), "xaanink-title-"))
  const works = new Workspaces(join(root, "app"), join(process.cwd(), "prisma/migrations"))
  let repo!: ModelRepository
  const calls: { url: string; auth: string | null }[] = []
  const methods: string[] = []
  const gateway = new ModelGateway({
    keyFor: (id, rev) => repo.keyFor(id, rev),
    fetch: async (url, init) => {
      calls.push({ url: String(url), auth: new Headers(init?.headers).get("authorization") })
      const chunks = [
        { id: "fixture", created: 1, model: draft.modelId, choices: [{ index: 0, delta: { role: "assistant", content: options.generated ?? "深海沉船之谜" }, finish_reason: null }] },
        { id: "fixture", created: 1, model: draft.modelId, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 9, completion_tokens: 6, total_tokens: 15 } },
      ]
      return new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } })
    },
  })
  repo = new ModelRepository(join(root, "state.json"), protection, gateway)
  const service = new ModelService(repo, gateway)
  configureModelTransport(async (method, input) => {
    methods.push(method)
    if (method === "model.catalog") return repo.read() as never
    if (method === "model.defaults") return service.defaults() as never
    if (method === "model.resolve") return service.resolve(input) as never
    if (method === "model.start") return service.start(input) as never
    if (method === "model.read") return service.read(input) as never
    if (method === "model.cancel") return service.cancel(input) as never
    throw new Error("Unexpected main call " + method)
  })
  await works.initialize()
  let state = await repo.saveModel(0, draft)
  if (options.withDefaultModel) {
    state.settings.agent.textModelId = state.models[0].id
    state = await repo.updateSettings(state.revision, state.settings)
  }
  return { root, works, service, calls, methods }
}

async function seedConversation(title: string) {
  const conversation = await prisma.conversation.create({ data: { userId: "local-author", title } })
  await prisma.message.create({ data: { conversationId: conversation.id, role: "USER", content: FIRST_USER } })
  await prisma.message.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: "好的，这是开头：咸涩的海水压在舱壁上……" } })
  return conversation
}

test("CT-40: first-turn conversation gets its model-generated short title with usage recorded", async () => {
  const env = await setup({ withDefaultModel: true })
  try {
    const result = await env.works.runWithGlobal("inbox", async () => {
      const conversation = await seedConversation(defaultConversationTitle(FIRST_USER))
      const outcome = await summarizeConversationTitle("local-author", conversation.id, { abortSignal: AbortSignal.timeout(30_000) })
      const stored = await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } })
      const usage = await prisma.usageRecord.findFirst({ where: { action: "conversation.title" } })
      return { outcome, stored, usage }
    })
    assert.deepEqual(result.outcome, { changed: true, title: "深海沉船之谜" })
    assert.equal(result.stored.title, "深海沉船之谜")
    assert(result.usage, "标题生成必须记用量")
    assert.equal(result.usage!.promptTokens, 9)
    assert.equal(result.usage!.completionTokens, 6)
    assert.equal(JSON.stringify(result.usage).includes(draft.apiKey), false, "用量与快照不得含密钥")
    assert.equal(env.calls.length, 1)
    assert.equal(env.calls[0].url, draft.endpoint + "/chat/completions")
    assert.equal(env.calls[0].auth, "Bearer " + draft.apiKey, "密钥只在主进程授权出口注入")
  } finally { await env.service.close(); await env.works.close(); await rm(env.root, { recursive: true, force: true }) }
})

test("CT-41: no default text model skips silently without touching the provider", async () => {
  const env = await setup({ withDefaultModel: false })
  try {
    const result = await env.works.runWithGlobal("inbox", async () => {
      const conversation = await seedConversation(defaultConversationTitle(FIRST_USER))
      const outcome = await summarizeConversationTitle("local-author", conversation.id)
      const stored = await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } })
      return { outcome, stored }
    })
    assert.deepEqual(result.outcome, { changed: false, reason: "no-model" })
    assert.equal(result.stored.title, defaultConversationTitle(FIRST_USER), "原标题保留")
    assert.equal(env.calls.length, 0)
    assert.ok(!env.methods.includes("model.resolve"), "无模型时连解析都不发起（永不弹窗）")
  } finally { await env.service.close(); await env.works.close(); await rm(env.root, { recursive: true, force: true }) }
})

test("CT-42: customized title is never overwritten", async () => {
  const env = await setup({ withDefaultModel: true })
  try {
    const result = await env.works.runWithGlobal("inbox", async () => {
      const conversation = await seedConversation("我亲自命名的会话")
      const outcome = await summarizeConversationTitle("local-author", conversation.id)
      const stored = await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } })
      return { outcome, stored }
    })
    assert.deepEqual(result.outcome, { changed: false, reason: "not-default" })
    assert.equal(result.stored.title, "我亲自命名的会话")
    assert.equal(env.calls.length, 0)
    assert.ok(!env.methods.includes("model.resolve"))
  } finally { await env.service.close(); await env.works.close(); await rm(env.root, { recursive: true, force: true }) }
})
