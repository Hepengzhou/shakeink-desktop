"use client"
import { useQuery } from "@tanstack/react-query"
export interface SelectableModel {
  id: string; name: string; provider: string; modelId: string; tier: "NORMAL" | "ADVANCED"
  contextWindow: number; free: boolean
  thinkingEfforts: { value: string; label: string; description?: string }[]
}
export interface ModelsResponse { defaultModelId: string | null; models: SelectableModel[] }
/** The picker and send gate share the real local directory, without choosing a fallback. */
export function useChatModels() {
  return useQuery({
    queryKey: ["chat-models"],
    queryFn: async (): Promise<ModelsResponse> => {
      const res = await fetch("/api/models")
      if (!res.ok) throw new Error("加载模型列表失败")
      return await res.json() as ModelsResponse
    },
    staleTime: 5 * 60 * 1000,
  })
}
