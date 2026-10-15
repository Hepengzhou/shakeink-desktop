export interface ConversationTitleRequester {
  /** fire-and-forget；返回的内部 promise 仅供测试确定性 await，调用方忽略 */
  request(conversationId: string, invalidate: () => void): Promise<void>
}

/**
 * 后台会话短标题请求守卫：同一会话每窗口期至多发起一次。
 * 永久态（not-default）保留守卫；暂时性原因（网络/非 2xx/no-model/failed 等）移出守卫允许后续回合重试。
 * fetcher 延迟到请求时才取全局 fetch（桌面传输层在模块导入后才安装）。
 */
export function createConversationTitleRequester(fetcher?: typeof fetch): ConversationTitleRequester {
  const requested = new Set<string>()
  return {
    request(conversationId, invalidate) {
      if (requested.has(conversationId)) return Promise.resolve()
      requested.add(conversationId)
      return (fetcher ?? fetch)(`/api/chat/conversations/${conversationId}/title`, { method: "POST" })
        .then(async res => {
          const data = await res.json().catch(() => null) as { changed?: boolean; reason?: string } | null
          if (!res.ok) { requested.delete(conversationId); return }
          if (data?.changed) { invalidate(); return }
          if (data?.reason !== "not-default") requested.delete(conversationId)
        })
        .catch(() => { requested.delete(conversationId) })
    },
  }
}

export const conversationTitleRequester = createConversationTitleRequester()
