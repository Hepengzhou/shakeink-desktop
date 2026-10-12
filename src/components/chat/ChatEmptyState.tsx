"use client"

import { useId, useRef } from "react"
import { useTheme } from "next-themes"
import { useChatEmptyMotion } from "./use-chat-empty-motion"
import "./chat-empty-state.css"

export type ChatEmptyPreset = "仙侠" | "历史" | "科幻"
export type ChatEmptyPromptKind = "character" | "world" | "scene"

type Props = {
  onCreate: (preset?: ChatEmptyPreset) => void
  onPrompt: (kind: ChatEmptyPromptKind) => void
  disabled?: boolean
  modalOpen?: boolean
}

const actions = [
  { kind: "book", title: "创建作品", subtitle: "写下故事的第一笔" },
  { kind: "character", title: "新角色", subtitle: "让想象中的人鲜活起来" },
  { kind: "world", title: "新世界观", subtitle: "构建故事中的天地" },
  { kind: "scene", title: "新场景", subtitle: "让每一幕跃然眼前" },
] as const

const genres = [
  { kind: "xianxia", title: "仙侠", subtitle: "山海之间，自有天地" },
  { kind: "history", title: "历史", subtitle: "落笔处，风云再起" },
  { kind: "scifi", title: "科幻", subtitle: "向未知，再走一步" },
] as const

/** Welcome presentation only. The original ChatPanel owns every business action and the composer. */
export function ChatEmptyState({ onCreate, onPrompt, disabled = false, modalOpen = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { theme } = useTheme()
  const imageTheme = theme === "ink" ? "ink" : "paper"
  useChatEmptyMotion(rootRef, disabled, modalOpen)

  return (
    <div ref={rootRef} className="chat-empty-state" data-testid="chat-empty-state" aria-labelledby={titleId}>
      <div className="chat-empty-gutter">
        <div className="chat-empty-content">
          <div className="chat-empty-head">
            <div className="chat-empty-brand" data-motion-target="logo" tabIndex={disabled ? -1 : 0} role="img" aria-label="玄印" aria-disabled={disabled || undefined}>
              <span className="chat-empty-sprite chat-empty-logo" data-sprite="logo" data-frame="0" aria-hidden="true" />
            </div>
            <h1 id={titleId}>今天，想写点什么？</h1>
            <p className="chat-empty-subtitle">让一个念头，长成一个故事。</p>
          </div>
          <div className="chat-empty-actions">
            <div className="chat-empty-action-grid" aria-label="创作入口">
              {actions.map(action => (
                <button
                  key={action.kind}
                  type="button"
                  className="chat-empty-action"
                  data-action={action.kind}
                  data-motion-target="card"
                  aria-label={action.title}
                  disabled={disabled}
                  onClick={() => action.kind === "book" ? onCreate() : onPrompt(action.kind)}
                >
                  {/* Static colored icons deliberately never participate in the scheduler. */}
                  <img className="chat-empty-symbol" src={`/brand/chat-empty/${action.kind}-${imageTheme}-first.png`} width={26} height={26} alt="" draggable={false} />
                  <span className="chat-empty-card-copy"><strong>{action.title}</strong><small>{action.subtitle}</small></span>
                  <span className="chat-empty-sprite chat-empty-card-art" data-sprite={`card-${action.kind}`} data-role="card-art" data-frame="0" aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="chat-empty-genre-grid" aria-label="从小说题材开始">
              {genres.map(genre => (
                <button
                  key={genre.kind}
                  type="button"
                  className="chat-empty-genre"
                  data-action={`genre-${genre.kind}`}
                  aria-label={genre.title}
                  disabled={disabled}
                  onClick={() => onCreate(genre.title)}
                >
                  <img className="chat-empty-genre-image" src={`/brand/chat-empty/theme-${genre.kind}-v3.png`} width={1942} height={809} alt="" draggable={false} />
                  <span className="chat-empty-genre-copy"><strong>{genre.title}</strong><small>{genre.subtitle}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
