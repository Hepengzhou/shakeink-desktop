/** The welcome is a presentation of an idle, recovered conversation, never a business-state placeholder. */
export interface ChatWelcomeState {
  recoveryStatus: string; messageCount: number; loading: boolean; loadError: boolean
  generating: boolean; creatingNovel: boolean; following: boolean; suspended: boolean
  question: boolean; plan: boolean; request: boolean; selection: boolean; queueCount: number
  notice: boolean; activePlan: boolean; progress: boolean
}
export function canShowChatWelcome(state: ChatWelcomeState): boolean {
  return state.recoveryStatus === "ready" && state.messageCount === 0 && state.queueCount === 0 &&
    !state.loading && !state.loadError && !state.generating && !state.creatingNovel && !state.following &&
    !state.suspended && !state.question && !state.plan && !state.request && !state.selection &&
    !state.notice && !state.activePlan && !state.progress
}
export const QUICK_PROMPTS = {
  character: "【角色】\n请帮我创建一个适合当前故事的新角色，并与已有设定保持一致。\n・姓名与身份：\n・外貌与鲜明特征：\n・性格、目标与弱点：\n・人物背景与关键关系：\n・成长弧线与剧情作用：",
  world: "【世界观】\n请帮我搭建当前故事的世界观，并与已有设定保持一致。\n・时代背景与地理格局：\n・核心规则、能力体系与限制：\n・社会制度、文化与主要势力：\n・历史事件与当下矛盾：\n・可以推动故事的冲突与秘密：",
  scene: "【场景】\n请帮我设计一个适合当前故事的新场景，并与已有设定保持一致。\n・场景名称、地点与时间：\n・空间布局与环境特征：\n・氛围、光线、声音与气味：\n・出场人物与关键物件：\n・场景的剧情作用与潜在冲突：",
} as const
export type QuickPromptKind = keyof typeof QUICK_PROMPTS
/** Return only inserted text, so existing editor nodes and the author's whitespace survive. */
export function quickPromptSuffix(draft: string, kind: QuickPromptKind): string {
  const prompt = QUICK_PROMPTS[kind]
  return draft.includes(prompt) ? "" : `${draft ? "\n\n" : ""}${prompt}`
}
export function hasSelectedModel(modelId: string | null, catalog: { models: readonly {id: string}[] } | undefined): boolean {
  return modelId !== null && !!catalog?.models.some(model => model.id === modelId)
}
