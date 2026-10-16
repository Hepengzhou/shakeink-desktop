import assert from "node:assert/strict"
import { randomUUID, createHash } from "node:crypto"
import { mkdir, realpath, readdir, lstat, stat, writeFile, readFile } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import { Workspaces } from "../../desktop/service/workspaces"
import { prisma } from "../../src/lib/db"
import { defaultState, stateSchema } from "../../desktop/core/settings"
import { DraftJournal } from "../../desktop/main/draft-journal"
import { workspaceTabSchema } from "../../src/lib/desktop/workspace-draft-source"
import { planningSchema, validatePlanning } from "../../src/lib/planning/domain"
import { books } from "./demo-content"

/** Only creates original fictional books in a new, empty canonical temp folder. */
async function main() {
  assert(process.argv[2], "Supply a newly created /private/tmp/shakeink-readme-* folder")
  const firstRun = process.argv[3] === "--first-run"
  assert(process.argv.length === 3 || (process.argv.length === 4 && firstRun), "Only --first-run is accepted")
  const directory = resolve(process.argv[2])
  assert.equal(directory, await realpath(directory), "No symlink aliases")
  assert(directory.startsWith("/private/tmp/"), "Canonical temporary location required")
  assert(basename(directory).startsWith("shakeink-readme-"), "README-owned prefix required")
  assert((await lstat(directory)).isDirectory(), "A real directory is required")
  assert.deepEqual(await readdir(directory), [], "Refuse nonempty directories")
  const root = join(directory, "data")
  const works = new Workspaces(root, resolve("prisma/migrations"))
  const manifest: { version: number; originalFiction: boolean; models: number; contentSha256: string; books: any[] } = {
    version: 1, originalFiction: true, models: 0,
    contentSha256: createHash("sha256").update(await readFile(resolve("scripts/readme/demo-content.ts"))).digest("hex"), books: [],
  }
  try {
    await works.initialize()
    for (const [bookIndex, book] of books.entries()) {
      const path = join(directory, "book-" + bookIndex)
      await mkdir(path)
      const info = await stat(path, { bigint: true })
      const work = await works.create({ path, device: String(info.dev), inode: String(info.ino) }, { title: book.title, requestId: randomUUID() })
      const records = await works.run(work.id, async () => {
        const novelId = work.novelId
        await prisma.theme.update({ where: { novelId }, data: {
          novelId, title: book.title, synopsis: book.brief, referenceCases: "", channel: "原创长篇", genre: book.genre,
          length: "长篇", tags: book.genre.split(" · "), sellingPoints: bookIndex ? "以纸墨手艺进入北宋市井，在真实限制中建立信用。" : "沿江灯火中的旧案追查，能力与记忆代价相互牵制。", targetAudience: bookIndex ? "喜欢历史市井与人物成长的读者" : "喜欢仙侠悬疑与群像故事的读者",
        } })
        const world = await prisma.world.create({ data: { novelId, name: book.world, description: book.worldDescription } })
        const childWorld = await prisma.world.create({ data: { novelId, parentId: world.id, name: book.subWorld, description: book.subDescription } })
        await prisma.setting.createMany({ data: [
          { novelId, worldId: world.id, type: "GEOGRAPHY", name: bookIndex ? "汴河沿岸" : "十三渡镇", content: { text: book.subDescription } },
          { novelId, worldId: world.id, type: "SOCIETY", name: bookIndex ? "纸铺与货栈" : "照夜司与渡户", content: { text: bookIndex ? "铺主、匠户、船户与书吏各掌一段凭据；原单与信用影响每一次交易。" : "照夜司登记灯籍，渡户负责行舟。封渡令须有签押，旧籍不得私自覆墨。" } },
          { novelId, type: "STYLE", name: "叙述基调", content: { style: bookIndex ? "以细节写市井，知识落在具体的手艺、成本与人情中；克制解释，让人物在交易中作出选择。" : "清冷而有烟火气，以纸、墨、灯、河的细节推动悬疑；超凡能力始终伴随可见的代价。", referenceCases: "", dialogueMark: "DOUBLE_QUOTE", innerDialogueMark: "NONE" } },
        ] })
        const characters = []
        for (const character of book.characters) {
          characters.push(await prisma.character.create({ data: {
            ...character, novelId, roleType: character.roleType,
            aliases: [...character.aliases], personalityTags: [...character.personalityTags],
            motivations: JSON.parse(JSON.stringify(character.motivations)), beliefs: { ...character.beliefs },
            relationships: [], extra: {},
          } }))
        }
        for (const [index, character] of characters.entries()) {
          const relationships = characters.filter(row => row.id !== character.id).map(other => ({
            characterId: other.id, target: other.name,
            description: bookIndex ? (index === 0 ? "因纸铺货单结识，逐步建立合作与信任。" : "共同核对原单，在货运争议中相互试探。") : (other.name === "裴慎" || character.name === "裴慎" ? "因封存南津旧案而立场相争。" : "循七号船线索合作，彼此保留证词与证据。"),
          }))
          await prisma.character.update({ where: { id: character.id }, data: { relationships } })
        }
        const scenes = []
        for (const scene of book.scenes) scenes.push(await prisma.scene.create({ data: { novelId, ...scene } }))
        const volume = await prisma.volume.create({ data: { novelId, index: 1, title: book.volume, summary: book.brief } })
        const chapters = []
        for (const [index, chapter] of book.chapters.entries()) chapters.push(await prisma.chapter.create({ data: {
          volumeId: volume.id, index: index + 1, ...chapter, status: chapter.content ? "WRITTEN" : "OUTLINE",
          wordCount: [...chapter.content.replace(/\s/g, "")].length,
        } }))
        const worldlineId = randomUUID(), narrativeId = randomUUID()
        const events = book.events.map(event => ({
          id: randomUUID(), line: worldlineId, title: event.title, fact: event.fact,
          people: event.people.map(index => characters[index].id),
          time: { kind: "exact", value: event.hour, precision: "hour", label: event.hour === 0 ? "故事起点" : "" }, duration: event.duration,
        }))
        const planning = planningSchema.parse({
          worlds: [{ id: worldlineId, name: bookIndex ? "汴河市井" : "澄江旧案", worldId: world.id, calendar: { kind: "fixed", epoch: bookIndex ? "抵达汴京" : "秋雨夜", hoursPerDay: 24, daysPerMonth: 30, monthsPerYear: 12 } }],
          lines: [{ id: narrativeId, name: bookIndex ? "纸铺与来信" : "照夜寻名", primary: true }],
          events,
          volumes: [{ id: volume.id, line: narrativeId, title: volume.title, summary: volume.summary, order: 0 }],
          chapters: chapters.map((chapter, index) => ({ id: chapter.id, line: narrativeId, volume: volume.id, title: chapter.title, order: index, wordMin: 0, wordBudget: 3000 })),
          cards: chapters.map((chapter, index) => ({
            id: randomUUID(), line: narrativeId, order: index, title: chapter.title, chapter: chapter.id, wordBudget: 3000,
            tellings: [{ id: randomUUID(), character: characters[0].id, narrator: characters[0].name + " · 限知视角", intent: chapter.outline,
              refs: book.chapterEvents[index].map(eventIndex => {
                assert(events[eventIndex], "Every chapter event reference must exist")
                return { line: worldlineId, event: events[eventIndex].id, reveal: events[eventIndex].fact, source: "作者构思" }
              }),
              beats: [{ type: "事件", summary: chapter.outline }],
            }],
          })),
        })
        validatePlanning(planning)
        await prisma.planningDocument.upsert({ where: { novelId }, create: { novelId, data: planning }, update: { data: planning } })
        const foreshadows = []
        for (const foreshadow of book.foreshadows) {
          const { touches: touchInputs, ...data } = foreshadow
          const record = await prisma.foreshadow.create({ data: { novelId, ...data } })
          for (const input of touchInputs) {
            const chapter = chapters[input.chapter], quote = input.summary
            const startOffset = chapter.content.indexOf(quote)
            assert(startOffset >= 0, "The foreshadow quote must occur in the real manuscript")
            const touch = await prisma.foreshadowTouch.create({ data: { novelId, foreshadowId: record.id, chapterId: chapter.id, kind: input.kind, summary: quote } })
            await prisma.foreshadowReference.create({ data: {
              novelId, touchId: touch.id, targetType: "CHAPTER_CONTENT", targetId: chapter.id, identityKey: "chapter:" + chapter.id,
              quote, startOffset, endOffset: startOffset + quote.length,
              prefix: chapter.content.slice(Math.max(0, startOffset - 30), startOffset), suffix: chapter.content.slice(startOffset + quote.length, startOffset + quote.length + 30),
            } })
          }
          foreshadows.push(record)
        }
        // Independently read back the original text, planning and linked records.
        assert.equal(await prisma.character.count({ where: { novelId } }), 3)
        assert.equal(await prisma.chapter.count({ where: { volumeId: volume.id } }), book.chapters.length)
        const readChapters = await prisma.chapter.findMany({ where: { volumeId: volume.id }, orderBy: { index: "asc" } })
        assert.deepEqual(readChapters.map(chapter => ({ title: chapter.title, content: chapter.content, outline: chapter.outline })), book.chapters.map(chapter => ({ ...chapter })))
        assert.equal((await prisma.world.findUniqueOrThrow({ where: { id: world.id } })).description, book.worldDescription)
        assert.equal(await prisma.scene.count({ where: { novelId } }), book.scenes.length)
        assert.deepEqual(planningSchema.parse((await prisma.planningDocument.findUniqueOrThrow({ where: { novelId } })).data), planning)
        assert.equal(await prisma.foreshadow.count({ where: { novelId } }), book.foreshadows.length)
        assert.equal(await prisma.foreshadowTouch.count({ where: { novelId } }), book.foreshadows.reduce((total, item) => total + item.touches.length, 0))
        return { world, childWorld, characters, scenes, volume, chapters, foreshadows }
      })
      manifest.books.push({ workId: work.id, novelId: work.novelId, title: book.title, ...records })
    }
    const first = manifest.books[0], second = manifest.books[1]
    // The real novel list sorts by last update. Keep the opening manuscript's
    // own book first so its world and characters remain visible on initial load.
    await works.run(first.workId, () => prisma.novel.update({ where: { id: first.novelId }, data: { updatedAt: new Date() } }))
    const tabs = [
      { type: "chapter-content", refId: first.chapters[0].id, novelId: first.novelId, title: first.chapters[0].title },
      { type: "character", refId: first.characters[0].id, novelId: first.novelId, title: first.characters[0].name },
      { type: "world", refId: first.world.id, novelId: first.novelId, title: first.world.name },
      { type: "worldline", novelId: first.novelId, title: "世界线" },
      { type: "foreshadow", novelId: first.novelId, title: "伏笔" },
      { type: "chapter-content", refId: second.chapters[0].id, novelId: second.novelId, title: second.chapters[0].title },
    ].map(tab => workspaceTabSchema.parse({ ...tab, id: tab.type + ":" + (tab.refId ?? tab.novelId) }))
    const journal = new DraftJournal(root), release = journal.activate("readme-photography")
    try {
      await journal.persist("readme-photography", {
        version: 1, revision: 1, createdAt: new Date().toISOString(), autosaves: [], issues: [], sources: {
          workspace: { version: 1, tabs, activeTabId: tabs[0].id, subTabs: {}, layout: { version: 1, narrowPane: "content", contentVisible: true, sidebarVisible: true, chatVisible: false, sizes: { sidebar: 23, chat: 0, content: 77 }, lastContentSize: 77, lastSidebarSize: 23, lastChatSize: 30 } },
        },
      })
    } finally { release() }
  } finally { await works.close() }
  const state = structuredClone(defaultState)
  state.settings.user = { penName: "听雨拾舟", email: "", avatarAssetId: null }
  state.settings.appearance = { ...state.settings.appearance, bodyFontSize: 18, wordWrap: true }
  state.onboarding = firstRun ? null : { version: 1, completed: true, step: "welcome", textModelId: null, imageModelId: null, receipt: null }
  stateSchema.parse(state)
  await writeFile(join(root, "state.json"), JSON.stringify({ schemaVersion: 1, revision: 0, value: state }) + "\n")
  await writeFile(join(directory, "README-DEMO-ONLY.json"), JSON.stringify({ originalFiction: true, purpose: "README photography", models: 0 }) + "\n")
  await writeFile(join(directory, "fixture.json"), JSON.stringify(manifest, null, 2) + "\n")
  console.log("Prepared two original fictional books in isolated real databases; 6 characters, 7 chapters, 4 manuscripts, planning, 3 foreshadows, zero models; read-back checks passed.")
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
