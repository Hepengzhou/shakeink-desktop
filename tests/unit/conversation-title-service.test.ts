import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { runInNewContext } from "node:vm"
import { test } from "node:test"
import ts from "typescript"

import { stripMentionPayloads } from "../../src/lib/mention-token"

const FIRST_USER = "帮我写一个深海潜水员发现沉船秘密的故事开头"
const FIRST_REPLY = "好的，这是一个开头：咸涩的海水……"
const GENERATED = "深海沉船之谜"

interface FixtureOptions {
  conversation?: { id: string; title: string } | null
  firstUser?: string | null
  firstAssistant?: string | null
  defaultModelId?: string | null
  generated?: string
  generateThrows?: boolean
  updateCount?: number
}

async function fixture(options: FixtureOptions = {}) {
  const defaultTitle = stripMentionPayloads(FIRST_USER).slice(0, 50)
  const conversation = options.conversation === undefined ? { id: "c1", title: defaultTitle } : options.conversation
  const firstUser = options.firstUser === undefined ? FIRST_USER : options.firstUser
  const firstAssistant = options.firstAssistant === undefined ? FIRST_REPLY : options.firstAssistant
  const defaultModelId = options.defaultModelId === undefined ? "model-1" : options.defaultModelId
  const generated = options.generated ?? GENERATED
  const calls = {
    catalog: [] as unknown[][],
    resolve: [] as unknown[][],
    generate: [] as Record<string, unknown>[],
    update: [] as Record<string, unknown>[],
    warns: [] as unknown[][],
  }
  const publicModel = { id: "model-1", name: "作者的模型" }
  const mocks: Record<string, unknown> = {
    "@/lib/db": {
      prisma: {
        conversation: {
          findUnique: async () => conversation,
          updateMany: async (args: unknown) => { calls.update.push(JSON.parse(JSON.stringify(args)) as Record<string, unknown>); return { count: options.updateCount ?? 1 } },
        },
        message: {
          findFirst: async (args: { where: { role: string } }) =>
            args.where.role === "USER" ? (firstUser === null ? null : { content: firstUser }) : (firstAssistant === null ? null : { content: firstAssistant }),
        },
      },
    },
    "@/lib/mention-token": { stripMentionPayloads },
    "@desktop/service/models": {
      listLocalModels: async (...args: unknown[]) => { calls.catalog.push(args); return { defaultModelId, models: [] } },
      resolveLocalModel: async (...args: unknown[]) => { calls.resolve.push(args); return publicModel },
      localModelRecord: (model: unknown) => ({ record: model }),
    },
    "@/lib/ai/provider": { instantiateModel: (record: unknown) => ({ model: "MODEL", modelRecord: record }) },
    "@/lib/ai/generate": {
      generateText: async (opts: Record<string, unknown>) => {
        calls.generate.push(opts)
        if (options.generateThrows) throw new Error("provider down")
        return { text: generated, promptTokens: 1, completionTokens: 1, cost: 0 }
      },
    },
  }
  const exports = {} as { summarizeConversationTitle: (userId: string, conversationId: string, options?: { abortSignal?: AbortSignal }) => Promise<unknown> }
  const source = await readFile(join(process.cwd(), "src/lib/services/conversation-title.ts"), "utf8")
  const sandbox = { exports, require: (id: string) => mocks[id] ?? {}, console: { ...console, warn: (...args: unknown[]) => { calls.warns.push(args) } }, Error }
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, sandbox)
  return { calls, defaultTitle, run: async (runOptions?: { abortSignal?: AbortSignal }) => JSON.parse(JSON.stringify(await exports.summarizeConversationTitle("local-author", "c1", runOptions))) as unknown }
}

test("CT-30: conversation without USER message skips generation", async () => {
  const f = await fixture({ firstUser: null })
  assert.deepEqual(await f.run(), { changed: false, reason: "no-content" })
  assert.equal(f.calls.catalog.length, 0)
  assert.equal(f.calls.generate.length, 0)
})

test("CT-31: customized title is never overwritten", async () => {
  const f = await fixture({ conversation: { id: "c1", title: "我的定制标题" } })
  assert.deepEqual(await f.run(), { changed: false, reason: "not-default" })
  assert.equal(f.calls.catalog.length, 0)
  assert.equal(f.calls.resolve.length, 0)
  assert.equal(f.calls.generate.length, 0)
  assert.equal(f.calls.update.length, 0)
})

test("CT-32: no default text model skips silently without resolving (no popup path)", async () => {
  const f = await fixture({ defaultModelId: null })
  assert.deepEqual(await f.run(), { changed: false, reason: "no-model" })
  assert.equal(f.calls.catalog.length, 1)
  assert.equal(f.calls.resolve.length, 0)
  assert.equal(f.calls.generate.length, 0)
})

test("CT-33: happy path resolves with selection intent, records CAS write", async () => {
  const f = await fixture()
  const signal = AbortSignal.timeout(5000)
  const result = await f.run({ abortSignal: signal })
  assert.deepEqual(result, { changed: true, title: GENERATED })
  assert.deepEqual(f.calls.resolve, [["local-author", "text", undefined, "selection"]])
  assert.equal(f.calls.generate.length, 1)
  const generated = f.calls.generate[0]
  assert.equal(generated.action, "conversation.title")
  assert.deepEqual(generated.resolvedModel, { model: "MODEL", modelRecord: { record: { id: "model-1", name: "作者的模型" } } })
  assert.equal(generated.abortSignal, signal, "abortSignal 透传（窗口关闭即中止，不占 LongTask 名额）")
  assert.match(String(generated.prompt), /【作者】/)
  assert.match(String(generated.prompt), /【参谋】/)
  assert.deepEqual(f.calls.update, [{ where: { id: "c1", title: f.defaultTitle }, data: { title: GENERATED } }])
})

test("CT-34: generation failure stays silent and writes nothing", async () => {
  const f = await fixture({ generateThrows: true })
  assert.deepEqual(await f.run(), { changed: false, reason: "failed" })
  assert.equal(f.calls.update.length, 0)
  assert.equal(f.calls.warns.length, 1, "失败仅落 console.warn")
  const payload = JSON.stringify(f.calls.warns)
  assert.ok(!payload.includes(FIRST_USER) && !payload.includes("【作者】"), "warn 载荷不得含提示词/用户内容")
})

test("CT-35: concurrent turns lose the CAS race gracefully", async () => {
  const f = await fixture({ updateCount: 0 })
  assert.deepEqual(await f.run(), { changed: false, reason: "stale" })
})

test("CT-36: dirty model output is sanitized before writing; empty output writes nothing", async () => {
  const dirty = await fixture({ generated: "\n\n《深海沉船之谜》。\n（以上为标题）" })
  assert.deepEqual(await dirty.run(), { changed: true, title: GENERATED })
  assert.deepEqual(dirty.calls.update[0], { where: { id: "c1", title: dirty.defaultTitle }, data: { title: GENERATED } })
  const empty = await fixture({ generated: "  \n 。！？ " })
  assert.deepEqual(await empty.run(), { changed: false, reason: "empty" })
  assert.equal(empty.calls.update.length, 0)
})

test("CT-36b: generated title equal to current title is not rewritten", async () => {
  const f = await fixture({ generated: FIRST_USER })
  assert.deepEqual(await f.run(), { changed: false, reason: "not-default" })
  assert.equal(f.calls.resolve.length, 1, "此路径模型已被调用，与 CT-31 区分")
  assert.equal(f.calls.update.length, 0)
})
