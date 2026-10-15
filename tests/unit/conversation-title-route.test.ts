import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { runInNewContext } from "node:vm"
import { test } from "node:test"
import ts from "typescript"

interface FixtureOptions {
  session?: { user: { id: string } } | null
  conversation?: { id: string; userId: string } | null
  serviceResult?: unknown
}

async function fixture(options: FixtureOptions = {}) {
  const session = options.session === undefined ? { user: { id: "local-author" } } : options.session
  const conversation = options.conversation === undefined ? { id: "c1", userId: "local-author" } : options.conversation
  const serviceResult = options.serviceResult ?? { changed: true, title: "深海沉船之谜" }
  const calls: unknown[][] = []
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/auth": { auth: async () => session },
    "@/lib/db": { prisma: { conversation: { findUnique: async () => conversation } } },
    "@/lib/services/conversation-title": { summarizeConversationTitle: async (...args: unknown[]) => { calls.push(args); return serviceResult } },
  }
  const exports = {} as { POST: (request: Request, ctx: unknown) => Promise<Response> }
  const source = await readFile(join(process.cwd(), "desktop/handlers/chat/conversations/[id]/title/route.ts"), "utf8")
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: (id: string) => mocks[id] ?? {}, Response, Error })
  return { calls, post: () => exports.POST(new Request("https://local.invalid/api/chat/conversations/c1/title", { method: "POST" }), { params: Promise.resolve({ id: "c1" }) }) }
}

test("CT-37: unauthenticated, missing or foreign conversation are rejected before any work", async () => {
  const anonymous = await fixture({ session: null })
  assert.equal((await anonymous.post()).status, 401)
  assert.equal(anonymous.calls.length, 0)
  const missing = await fixture({ conversation: null })
  assert.equal((await missing.post()).status, 404)
  assert.equal(missing.calls.length, 0)
  const foreign = await fixture({ conversation: { id: "c1", userId: "someone-else" } })
  assert.equal((await foreign.post()).status, 404)
  assert.equal(foreign.calls.length, 0)
})

test("CT-38: owned conversation delegates with request abort signal and relays the result", async () => {
  const f = await fixture()
  const response = await f.post()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { changed: true, title: "深海沉船之谜" })
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0][0], "local-author")
  assert.equal(f.calls[0][1], "c1")
  const options = f.calls[0][2] as { abortSignal?: unknown }
  assert.ok(options?.abortSignal instanceof AbortSignal, "请求取消信号透传给生成服务")
})
