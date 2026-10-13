export type SidebarSizes = { sidebar: number; chat: number; content: number }
export type SidebarAxis = "chat" | "content"

const finite = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value! : fallback
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

/** Project a settled desktop intent before starting a motion. Sizes are percentages;
 * the Group's measured CSS width supplies the pixel constraints. Narrow drawers
 * use a separate overlay and never save their full width as this preference. */
export function projectSidebarLayout(input: {
  width: number; sidebarVisible: boolean; contentVisible: boolean; chatVisible: boolean
  sidebar?: number; chat?: number; content?: number
}): SidebarSizes {
  const width = Math.max(finite(input.width, 900), 1)
  const contentVisible = input.contentVisible
  const chatVisible = !contentVisible || input.chatVisible
  const chatMin = chatVisible ? Math.min(420 / width * 100, 100) : 0
  const contentMin = contentVisible ? 30 : 0
  const sidebarMin = Math.min(200 / width * 100, Math.max(100 - chatMin - contentMin, 0))
  const sidebarMax = Math.min(420 / width * 100, Math.max(100 - chatMin - contentMin - 1e-10, sidebarMin))
  const sidebar = input.sidebarVisible ? clamp(finite(input.sidebar, 260 / width * 100), sidebarMin, sidebarMax) : 0
  if (!contentVisible) return { sidebar, chat: 100 - sidebar, content: 0 }
  if (!chatVisible) return { sidebar, chat: 0, content: 100 - sidebar }
  const content = clamp(finite(input.content, (100 - sidebar) / 2), Math.min(contentMin, 100 - sidebar - chatMin), 100 - sidebar - chatMin)
  return { sidebar, content, chat: 100 - sidebar - content }
}

/** The sole frame compositor: the newest secondary axis owns the intent and the
 * remaining pane absorbs sidebar motion, rather than two stale whole layouts. */
export function composeSidebarLayout(sidebar: number, axis: SidebarAxis, value: number, contentMounted: boolean): SidebarSizes {
  const s = clamp(finite(sidebar, 0), 0, 100)
  if (!contentMounted) return { sidebar: s, chat: 100 - s, content: 0 }
  const secondary = clamp(finite(value, 0), 0, 100 - s)
  return axis === "content" ? { sidebar: s, content: secondary, chat: 100 - s - secondary } : { sidebar: s, chat: secondary, content: 100 - s - secondary }
}

/** Critical damping; exact endpoints, monotonic and without overshoot. */
export function springProgress(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return 1 - (1 + 6.6 * t) * Math.exp(-6.6 * t)
}
