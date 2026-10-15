import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { summarizeConversationTitle } from "@/lib/services/conversation-title"

type RouteContext = { params: Promise<{ id: string }> }

/** 后台总结生成会话短标题；幂等：标题仍为默认截断时才替换，失败静默保留原标题 */
export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }
  const conversation = await prisma.conversation.findUnique({ where: { id }, select: { id: true, userId: true } })
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 })
  }
  const result = await summarizeConversationTitle(session.user.id, id, { abortSignal: request.signal })
  return NextResponse.json(result)
}
