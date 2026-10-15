import { generateText } from "@/lib/ai/generate"
import { instantiateModel } from "@/lib/ai/provider"
import { prisma } from "@/lib/db"
import { stripMentionPayloads } from "@/lib/mention-token"
import { listLocalModels, localModelRecord, resolveLocalModel } from "@desktop/service/models"

/** 生成标题的硬上限（Unicode 码点）；提示词约束之外的兜底 */
export const CONVERSATION_TITLE_MAX_LENGTH = 30
/** 喂给模型的首条用户消息/助手回复各自的截断长度 */
export const TITLE_PROMPT_INPUT_LIMIT = 1200

/** 与会话创建逻辑（chat-turn.ts）逐字一致的默认标题：首条消息剥离 @引用负载后截断 50 */
export function defaultConversationTitle(firstUserMessageContent: string): string {
  return stripMentionPayloads(firstUserMessageContent).slice(0, 50)
}

/** 成对包裹标题的引号/书名号（开符号 → 闭符号） */
const QUOTE_CLOSE_FOR: Record<string, string> = { "\"": "\"", "'": "'", "“": "”", "‘": "’", "「": "」", "『": "』", "《": "》" }
const QUOTE_CHARS = new Set([...Object.keys(QUOTE_CLOSE_FOR), ...Object.values(QUOTE_CLOSE_FOR)])

/**
 * 清洗模型输出的标题：取首个非空行，去行首 markdown 标记；
 * 循环剥离「成对包裹整个标题」的引号/书名号与结尾标点（非整体包裹不误伤，如《活着》读后感）；
 * 30 码点硬截断兜底。不可用输出（空/纯标点/纯引号）返回 null。
 */
export function sanitizeGeneratedTitle(raw: string): string | null {
  let text = raw.split("\n").map(line => line.trim()).find(line => line.length > 0) ?? ""
  text = text.replace(/^[#>*\-、\s]+/, "")
  let previous = ""
  while (text !== previous) {
    previous = text
    text = text.replace(/[。！？；…，．,.;!?~·\s]+$/, "")
    const close = QUOTE_CLOSE_FOR[text[0] ?? ""]
    if (close !== undefined && text.length >= 2 && text[text.length - 1] === close) text = text.slice(1, -1).trim()
  }
  if (!text || [...text].every(ch => QUOTE_CHARS.has(ch))) return null
  const chars = [...text]
  return chars.length > CONVERSATION_TITLE_MAX_LENGTH ? chars.slice(0, CONVERSATION_TITLE_MAX_LENGTH).join("") : text
}

/** 标题总结提示词：中文 ≤15 字（最好 ≤12），英文等 ≤8 词，只输出标题本身 */
export function buildTitlePrompt(input: { userMessage: string; assistantReply?: string }): string {
  const user = stripMentionPayloads(input.userMessage).slice(0, TITLE_PROMPT_INPUT_LIMIT)
  const lines = [
    "请为以下写作助手对话生成一个简短标题。",
    "要求：一句话概括对话主题，有总结性和代表性；中文不超过15个汉字（最好不超过12个）；英文或其他语言不超过8个单词；不要使用引号、书名号，结尾不要标点；只输出标题文字本身，不要输出任何解释。",
    "",
    `【作者】${user}`,
  ]
  const assistant = input.assistantReply?.slice(0, TITLE_PROMPT_INPUT_LIMIT)
  if (assistant) lines.push("", `【参谋】${assistant}`)
  return lines.join("\n")
}

export type ConversationTitleResult =
  | { changed: true; title: string }
  | { changed: false; reason: "no-content" | "not-default" | "no-model" | "empty" | "stale" | "failed" }

/**
 * 后台用大模型总结会话短标题并替换正式标题。幂等：仅当标题仍等于首条 USER 消息
 * 重算出的默认截断标题时才生成；无默认文本模型静默跳过；任何生成失败只 warn 不抛出。
 */
export async function summarizeConversationTitle(userId: string, conversationId: string, options: { abortSignal?: AbortSignal } = {}): Promise<ConversationTitleResult> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true, title: true } })
  if (!conversation) return { changed: false, reason: "no-content" }
  const firstUser = await prisma.message.findFirst({ where: { conversationId, role: "USER" }, orderBy: { createdAt: "asc" }, select: { content: true } })
  if (!firstUser) return { changed: false, reason: "no-content" }
  const expected = defaultConversationTitle(firstUser.content)
  if (conversation.title !== expected) return { changed: false, reason: "not-default" }
  // 只读 catalog 预检（永不触发 model-required 弹窗）；无默认文本模型静默跳过
  const catalog = await listLocalModels(userId, "TEXT")
  if (!catalog.defaultModelId) return { changed: false, reason: "no-model" }
  try {
    const firstAssistant = await prisma.message.findFirst({ where: { conversationId, role: "ASSISTANT" }, orderBy: { createdAt: "asc" }, select: { content: true } })
    // intent "selection"：解析失败只抛错不弹窗；显式注入 resolvedModel 后 generateText 不再以 invoke intent 二次解析
    const model = await resolveLocalModel(userId, "text", undefined, "selection")
    const resolvedModel = instantiateModel(localModelRecord(model))
    const result = await generateText({
      userId,
      action: "conversation.title",
      resolvedModel,
      abortSignal: options.abortSignal,
      prompt: buildTitlePrompt({ userMessage: firstUser.content, assistantReply: firstAssistant?.content }),
    })
    const title = sanitizeGeneratedTitle(result.text)
    if (!title) return { changed: false, reason: "empty" }
    if (title === conversation.title) return { changed: false, reason: "not-default" }
    // CAS 写入：并发回合同时触发时至多一次生效
    const updated = await prisma.conversation.updateMany({ where: { id: conversationId, title: expected }, data: { title } })
    if (!updated.count) return { changed: false, reason: "stale" }
    return { changed: true, title }
  } catch (error) {
    // 只记录错误类型名：供应商错误对象可能携带请求体（含用户内容），不落日志
    console.warn("[conversation-title] 生成失败，保留原标题：", error instanceof Error ? error.name : "UnknownError")
    return { changed: false, reason: "failed" }
  }
}
