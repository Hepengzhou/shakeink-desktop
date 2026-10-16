import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Workspaces } from "../../desktop/service/workspaces"
import { LOCAL_AUTHOR_ID, getDatabaseContext } from "../../desktop/service/context"
import { guardWorkspace } from "./workspace-guard.mjs"

// Fixture data preparation only. No UI control, message edits or model requests.
async function main() {
  assert.equal(process.argv.length, 3)
  const { base, root } = await guardWorkspace(process.argv[2], { allowConfiguredModels: true })
  const record = JSON.parse(await readFile(join(base, "capture-process.json"), "utf8"))
  assert.equal(record.scope, "README isolated demo")
  assert(Number.isSafeInteger(record.pid) && record.pid > 0)
  let stopped = false
  try { process.kill(record.pid, 0) } catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") stopped = true; else throw error }
  assert(stopped, "Close the owned demo app before preparing data")
  const works = new Workspaces(root, resolve("prisma/migrations"))
  try {
    await works.initialize()
    await works.run("inbox", async () => {
      const db = getDatabaseContext().database
      const select = {
        id: true, title: true, updatedAt: true,
        messages: { orderBy: { id: "asc" as const }, select: { id: true, conversationId: true, role: true, content: true, parts: true, toolCalls: true, turnId: true, attemptId: true, createdAt: true } },
      }
      const receipt = await db.$transaction(async tx => {
        const where = { userId: LOCAL_AUTHOR_ID, novelId: null }
        const before = await tx.conversation.findMany({ where, select, orderBy: { id: "asc" } })
        assert.equal(before.length, 2, "Only the two authorized demo discussions are expected")
        assert(before.every(row => row.messages.filter(message => message.role === "USER").length === 1))
        const useful = before.find(row => row.messages.some(message => message.role === "USER" && message.content.startsWith("请给初次写长篇小说的人")))
        assert(useful, "Expected original complete question")
        const hash = (rows: typeof before) => createHash("sha256").update(JSON.stringify(rows.map(row => ({ id: row.id, messages: row.messages })))).digest("hex")
        const messageHash = hash(before)
        await writeFile(join(base, "README-CHAT-TITLES-BEFORE.json"), JSON.stringify(before.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })), null, 2) + "\n", { flag: "wx", mode: 0o600 })
        for (const row of before) await tx.conversation.update({ where: { id: row.id }, data: { title: row.id === useful.id ? "开篇目标与关键选择" : "写作需求梳理", updatedAt: row.updatedAt } })
        const after = await tx.conversation.findMany({ where, select, orderBy: { id: "asc" } })
        assert.equal(hash(after), messageHash, "Every original message field must remain unchanged")
        return { scope: "README isolated demo", titlesPrepared: 2, messagesUnchanged: true, messageSha256Before: messageHash, messageSha256After: hash(after), newModelCalls: 0 }
      })
      await writeFile(join(base, "README-CHAT-TITLES.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx", mode: 0o600 })
    })
    console.log("Two demo conversation titles prepared; every message unchanged; no model request.")
  } finally { await works.close() }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Demo title preparation failed"); process.exitCode = 1 })
