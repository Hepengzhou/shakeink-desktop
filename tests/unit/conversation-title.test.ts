import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildTitlePrompt,
  defaultConversationTitle,
  sanitizeGeneratedTitle,
  CONVERSATION_TITLE_MAX_LENGTH,
  TITLE_PROMPT_INPUT_LIMIT,
} from "../../src/lib/services/conversation-title"
import { createConversationTitleRequester } from "../../src/components/chat/conversation-title"

// CT-10：默认标题与创建语义（chat-turn.ts:194 stripMentionPayloads + slice(0,50)）逐字一致；
// 硬编码输入→输出对，不 import 其私有代码。
test("CT-10: defaultConversationTitle mirrors creation semantics exactly", () => {
  assert.equal(defaultConversationTitle("帮我写一个海底探险的故事"), "帮我写一个海底探险的故事")
  assert.equal(defaultConversationTitle("@[角色/林舟](role-1)续写第三章"), "@[角色/林舟]续写第三章")
  const sixty = "一二三四五六七八九十".repeat(6)
  assert.equal(defaultConversationTitle(sixty), "一二三四五六七八九十".repeat(5))
  // UTF-16 码元语义钉死：49 个 BMP 字 + 一个代理对 emoji，slice(0,50) 劈开代理对留下孤立高位代理
  const astral = "字".repeat(49) + "😀尾"
  assert.equal(defaultConversationTitle(astral), "字".repeat(49) + "😀".slice(0, 1))
})

// CT-11：生成标题清洗规则
test("CT-11: sanitizeGeneratedTitle strips wrappers, keeps real titles, caps length", () => {
  assert.equal(sanitizeGeneratedTitle("深海沉船之谜"), "深海沉船之谜")
  assert.equal(sanitizeGeneratedTitle('"深海沉船之谜"'), "深海沉船之谜")
  assert.equal(sanitizeGeneratedTitle("《深海沉船之谜》"), "深海沉船之谜")
  assert.equal(sanitizeGeneratedTitle('""深海沉船之谜""'), "深海沉船之谜")
  assert.equal(sanitizeGeneratedTitle("「深海之谜」。"), "深海之谜")
  // 非整体包裹不误伤：书名号是标题内容的一部分
  assert.equal(sanitizeGeneratedTitle("《活着》读后感"), "《活着》读后感")
  // 多行取首个非空行
  assert.equal(sanitizeGeneratedTitle("标题\n第二行"), "标题")
  assert.equal(sanitizeGeneratedTitle("\n  \n  深海之谜  \n"), "深海之谜")
  // 行首 markdown 标记
  assert.equal(sanitizeGeneratedTitle("## 深海之谜"), "深海之谜")
  assert.equal(sanitizeGeneratedTitle("- 深海之谜"), "深海之谜")
  // 结尾标点
  assert.equal(sanitizeGeneratedTitle("深海之谜。"), "深海之谜")
  assert.equal(sanitizeGeneratedTitle("深海之谜！？"), "深海之谜")
  // 30 码点硬上限，代理对不碎
  const long = "标".repeat(40)
  assert.equal(sanitizeGeneratedTitle(long), "标".repeat(30))
  const emoji = sanitizeGeneratedTitle("😀".repeat(35))!
  assert.equal([...emoji].length, 30)
  assert.doesNotMatch(emoji, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u)
  assert.equal(CONVERSATION_TITLE_MAX_LENGTH, 30)
  // 不可用输出
  assert.equal(sanitizeGeneratedTitle(""), null)
  assert.equal(sanitizeGeneratedTitle("  \n \n "), null)
  assert.equal(sanitizeGeneratedTitle("。！？"), null)
  assert.equal(sanitizeGeneratedTitle('"""'), null)
})

// CT-12：提示词构成
test("CT-12: buildTitlePrompt carries length/format rules and truncated labeled inputs", () => {
  const prompt = buildTitlePrompt({ userMessage: "@[组/名](entity-9)正文", assistantReply: "回复" })
  assert.match(prompt, /不超过15个汉字/)
  assert.match(prompt, /最好不超过12个/)
  assert.match(prompt, /不超过8个单词/)
  assert.match(prompt, /只输出标题/)
  assert.ok(prompt.includes("@[组/名]正文"), "mention 负载剥离")
  assert.ok(!prompt.includes("(entity-9)"), "技术负载不进提示词")
  assert.ok(prompt.includes("【作者】"))
  assert.ok(prompt.includes("【参谋】回复"))
  const withoutReply = buildTitlePrompt({ userMessage: "正文" })
  assert.ok(!withoutReply.includes("【参谋】"), "无助手回复省略参谋段")
  const longUser = "A".repeat(TITLE_PROMPT_INPUT_LIMIT) + "MARKER"
  const truncated = buildTitlePrompt({ userMessage: longUser })
  assert.ok(truncated.includes("A".repeat(TITLE_PROMPT_INPUT_LIMIT)))
  assert.ok(!truncated.includes("MARKER"), "用户消息截断 1200")
  const longReply = "B".repeat(TITLE_PROMPT_INPUT_LIMIT + 101)
  const replyTruncated = buildTitlePrompt({ userMessage: "正文", assistantReply: longReply })
  assert.ok(replyTruncated.includes("B".repeat(TITLE_PROMPT_INPUT_LIMIT)))
  assert.ok(!replyTruncated.includes("B".repeat(TITLE_PROMPT_INPUT_LIMIT + 1)), "助手回复截断 1200")
})

// CT-20：requester 每会话每窗口期只请求一次；changed:true 触发 invalidate
test("CT-20: requester guards per conversation and invalidates on change", async () => {
  const calls: string[] = []
  let invalidations = 0
  const fetcher = (async (url: unknown) => {
    calls.push(String(url))
    return new Response(JSON.stringify({ changed: true, title: "深海沉船之谜" }), { status: 200 })
  }) as typeof fetch
  const requester = createConversationTitleRequester(fetcher)
  await requester.request("c1", () => { invalidations += 1 })
  await requester.request("c1", () => { invalidations += 1 })
  assert.deepEqual(calls, ["/api/chat/conversations/c1/title"])
  assert.equal(invalidations, 1)
  // 另一会话独立计数
  await requester.request("c2", () => { invalidations += 1 })
  assert.equal(calls.length, 2)
  assert.equal(invalidations, 2)
})

// CT-21：失败/暂时性原因允许下轮重试；not-default 永久跳过
test("CT-21: requester retries after transient failure but not after not-default", async () => {
  let mode: "reject" | "http500" | "not-default" | "no-model" = "reject"
  const calls: string[] = []
  const fetcher = (async (url: unknown) => {
    calls.push(String(url))
    if (mode === "reject") throw new Error("network down")
    if (mode === "http500") return new Response("{}", { status: 500 })
    if (mode === "not-default") return new Response(JSON.stringify({ changed: false, reason: "not-default" }), { status: 200 })
    return new Response(JSON.stringify({ changed: false, reason: "no-model" }), { status: 200 })
  }) as typeof fetch
  const requester = createConversationTitleRequester(fetcher)
  const noop = () => {}
  await requester.request("c1", noop)
  await requester.request("c1", noop)
  assert.equal(calls.length, 2, "fetch 异常后守卫移除，允许重试")
  mode = "http500"
  await requester.request("c1", noop)
  await requester.request("c1", noop)
  assert.equal(calls.length, 4, "非 2xx 后守卫移除，允许重试")
  mode = "no-model"
  await requester.request("c1", noop)
  await requester.request("c1", noop)
  assert.equal(calls.length, 6, "no-model 为暂时性原因，允许重试")
  mode = "not-default"
  await requester.request("c1", noop)
  await requester.request("c1", noop)
  assert.equal(calls.length, 7, "not-default 为永久态，守卫保留不再请求")
})

// CT-22：changed:false 不触发 invalidate
test("CT-22: requester never invalidates when nothing changed", async () => {
  let invalidations = 0
  for (const body of [{ changed: false, reason: "not-default" }, { changed: false, reason: "failed" }, {}]) {
    const fetcher = (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch
    const requester = createConversationTitleRequester(fetcher)
    await requester.request("c1", () => { invalidations += 1 })
  }
  assert.equal(invalidations, 0)
})
