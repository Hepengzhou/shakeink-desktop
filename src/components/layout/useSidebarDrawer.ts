"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useGroupRef } from "react-resizable-panels"
import { desktopWorkspaceDraftSource, registerWorkspaceLayoutAdapter, type WorkspaceLayout } from "@/lib/desktop/workspace-draft-source"
import { settledWorkspaceLayout } from "@/lib/desktop/workspace-layout"
import { composeSidebarLayout, projectSidebarLayout, springProgress, type SidebarAxis, type SidebarSizes } from "@/lib/desktop/sidebar-layout"

type Phase = "open" | "opening" | "closing" | "closed"
type Motion = { from: number; to: number; started: number; duration: number }
type View = { contentVisible: boolean; contentMounted: boolean; sidebarVisible: boolean; chatVisible: boolean; contentAnimating: boolean; sidebarAnimating: boolean; chatAnimating: boolean; narrowPane: "chat" | "content" | "sidebar"; mode: "wide" | "narrow"; phase: Phase; underlay: "chat" | "content" }
const at = (motion: Motion, now: number) => motion.duration === 0 ? motion.to : motion.from + (motion.to - motion.from) * springProgress((now - motion.started) / motion.duration)
const done = (motion: Motion, now: number) => now - motion.started >= motion.duration
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Owns every imperative Group write, including registration repins and restore.
 * Sidebar and the newest chat/content axis have independent motion tracks, but
 * a single compositor writes the complete current layout once per frame. */
export function useSidebarDrawer() {
  const [initialLayout] = useState(() => typeof window !== "undefined" && window.desktop ? desktopWorkspaceDraftSource.read().layout : null)
  const initialNarrow = typeof window !== "undefined" && window.innerWidth < 900
  const initialPane = initialLayout?.narrowPane ?? "chat"
  const [view, setView] = useState<View>({ contentVisible: initialLayout?.contentVisible ?? false, contentMounted: initialLayout?.contentVisible ?? false, sidebarVisible: initialLayout?.sidebarVisible ?? true, chatVisible: initialLayout?.chatVisible ?? true, contentAnimating: false, sidebarAnimating: false, chatAnimating: false, narrowPane: initialPane, mode: initialNarrow ? "narrow" : "wide", phase: (initialNarrow ? initialPane === "sidebar" : initialLayout?.sidebarVisible !== false) ? "open" : "closed", underlay: initialPane === "content" ? "content" : "chat" })
  const state = useRef(view)
  const update = useCallback((patch: Partial<View>) => { state.current = { ...state.current, ...patch }; setView(state.current) }, [])
  const groupRef = useGroupRef()
  const groupElementRef = useRef<HTMLDivElement | null>(null)
  const sidebarElementRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const runtime = useRef({
    width: 0, fixedWidth: 0, visiblePixels: 0, sidebarPixels: 0, openingPercentage: null as number | null, sidebarGoal: null as number | null, sidebar: null as Motion | null, secondary: null as (Motion & { axis: SidebarAxis }) | null,
    axis: "content" as SidebarAxis, current: { sidebar: initialLayout?.sizes.sidebar ?? 20, chat: initialLayout?.sizes.chat ?? 80, content: initialLayout?.sizes.content ?? 0 } as SidebarSizes,
    target: { sidebar: initialLayout?.sizes.sidebar ?? 20, chat: initialLayout?.sizes.chat ?? 80, content: initialLayout?.sizes.content ?? 0 } as SidebarSizes,
    lastSidebar: initialLayout?.lastSidebarSize ?? null, lastContent: initialLayout?.lastContentSize ?? null, lastChat: initialLayout?.lastChatSize ?? null,
    raf: null as number | null, generation: 0, registrationWait: 0, restore: null as WorkspaceLayout | null, needsWrite: false,
    focus: null as HTMLElement | null, restoreFocus: false, closingFocus: false,
    hasMeasuredLayout: false, keepSidebarDivider: false, keepContentDivider: false, registrationRepin: false, writing: false,
  })
  const listeners = useRef(new Set<() => void>())
  const announce = useCallback(() => { for (const listener of listeners.current) listener() }, [])
  const groupWidth = useCallback(() => groupElementRef.current?.getBoundingClientRect().width ?? 0, [])
  const availableWidth = useCallback(() => {
    const panels = groupElementRef.current?.querySelectorAll<HTMLElement>(":scope > [data-panel]")
    const measured = panels ? [...panels].reduce((sum, panel) => sum + panel.getBoundingClientRect().width, 0) : 0
    return measured || groupWidth()
  }, [groupWidth])
  const target = useCallback(() => {
    const r = runtime.current, v = state.current
    const width = v.mode === "wide" ? groupWidth() : r.width
    if (width >= 900) r.width = width
    const available = availableWidth()
    const input = { width: Math.max(r.width, 900), sidebarVisible: v.sidebarVisible, contentVisible: v.contentVisible, chatVisible: v.chatVisible, sidebar: v.mode === "wide" && r.openingPercentage !== null ? r.openingPercentage : v.mode === "wide" && r.sidebarGoal !== null ? r.sidebarGoal / Math.max(available, 1) * 100 : r.target.sidebar, content: r.target.content, chat: r.target.chat }
    const projected = projectSidebarLayout(input)
    r.target = r.axis === "chat" && v.chatVisible && v.contentVisible ? projectSidebarLayout({ ...input, content: 100 - projected.sidebar - input.chat }) : projected
    const sidebarPixels = r.target.sidebar / 100 * available
    if (v.mode === "wide" && r.sidebar && Math.abs(r.sidebar.to - sidebarPixels) > .001) {
      const now = performance.now(), previous = r.sidebar
      r.sidebar = { from: previous.started < 0 ? previous.from : at(previous, now), to: sidebarPixels, started: previous.started < 0 ? -1 : now, duration: previous.started < 0 ? previous.duration : Math.max(previous.duration - (now - previous.started), 0) }
    }
    return r.target
  }, [availableWidth, groupWidth])
  const geometry = useCallback(() => {
    const r = runtime.current, v = state.current
    const actual = sidebarElementRef.current?.getBoundingClientRect().width ?? 0
    const pixels = v.mode === "narrow" ? r.visiblePixels : actual
    if (!v.sidebarAnimating && !r.registrationRepin) {
      r.fixedWidth = v.mode === "narrow" ? groupWidth() : actual > 0 ? actual : r.fixedWidth || target().sidebar / 100 * Math.max(r.width, 900)
      if (v.mode === "narrow") r.visiblePixels = v.phase === "open" ? r.fixedWidth : 0
    }
    const visible = v.mode === "narrow" ? r.visiblePixels : pixels
    rootRef.current?.style.setProperty("--sidebar-drawer-visible-width", `${Math.max(visible, 0)}px`)
    if (innerRef.current) {
      innerRef.current.style.width = `${r.fixedWidth}px`
      innerRef.current.style.transform = `translateX(${Math.min(visible - r.fixedWidth, 0)}px)`
    }
  }, [groupWidth, target])
  const currentLayout = useCallback((): SidebarSizes => {
    const r = runtime.current, layout = groupRef.current?.getLayout()
    if (!r.sidebar && !r.secondary && layout?.sidebar !== undefined && layout.chat !== undefined && state.current.mode === "wide") {
      r.current = { sidebar: layout.sidebar, chat: layout.chat, content: layout.content ?? 0 }
      r.hasMeasuredLayout = true
    }
    return r.current
  }, [groupRef])
  const retainDividers = useCallback(() => {
    const r = runtime.current, v = state.current
    r.keepSidebarDivider ||= v.sidebarVisible && v.chatVisible
    r.keepContentDivider ||= v.contentMounted && v.chatVisible
    r.registrationRepin ||= v.mode === "wide"
  }, [])
  const focusRestore = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const v = state.current
    const selector = v.mode === "narrow" ? 'nav[aria-label="创作工作区"] button' : v.chatVisible ? '.workspace-chat [data-sidebar-restore]' : '.workspace-content [data-sidebar-restore]'
    const candidate = [...root.querySelectorAll<HTMLElement>(selector)].find(el => el.getBoundingClientRect().width > 0 && !el.closest("[inert]"))
    candidate?.focus({ preventScroll: true })
  }, [])
  const frameRef = useRef<(now: number) => void>(() => {})
  const kick = useCallback(() => {
    if (runtime.current.raf === null) runtime.current.raf = requestAnimationFrame(now => frameRef.current(now))
  }, [])
  // This function is the only owner of Group.setLayout in the shell.
  const write = useCallback((sizes: SidebarSizes) => {
    const group = groupRef.current, measured = group?.getLayout()
    if (!group || measured?.sidebar === undefined || measured.chat === undefined) return false
    if (state.current.contentMounted !== (measured.content !== undefined)) return false
    runtime.current.writing = true
    try { group.setLayout({ sidebar: sizes.sidebar, chat: sizes.chat, ...(state.current.contentMounted ? { content: sizes.content } : {}) }) }
    finally { runtime.current.writing = false }
    return true
  }, [groupRef])
  const prepareOpening = useCallback(() => {
    const r = runtime.current
    if (state.current.mode !== "wide" || r.openingPercentage === null || !r.sidebar || r.sidebar.started !== -1) return
    // A newly mounted divider changes available pixels. Initialize the shape
    // from the settled percentage after that DOM commit, while V is still zero.
    const settled = target(), pixels = settled.sidebar / 100 * availableWidth()
    r.fixedWidth = pixels; r.sidebarGoal = pixels; r.sidebar.to = pixels
    r.openingPercentage = null
    r.lastSidebar = settled.sidebar
  }, [availableWidth, target])
  const repinCurrent = useCallback(() => {
    const r = runtime.current, v = state.current
    if (v.mode !== "wide" || (!r.sidebar && !r.registrationRepin) || r.writing) return
    if (r.sidebar) {
      // Natural Group resize can run after our frame and project its cached
      // percentages again. Keep the latest owner pose, never that stale map.
      const axis = r.secondary?.axis ?? r.axis
      r.current = composeSidebarLayout(r.sidebarPixels / Math.max(availableWidth(), 1) * 100, axis, r.current[axis], v.contentMounted)
    }
    const layout = groupRef.current?.getLayout()
    const keys = v.contentMounted ? ["sidebar", "chat", "content"] as const : ["sidebar", "chat"] as const
    if (layout && keys.every(key => layout[key] !== undefined) && keys.some(key => Math.abs(layout[key] - r.current[key]) > .001)) write(r.current)
  }, [availableWidth, groupRef, write])
  frameRef.current = now => {
    const r = runtime.current, v = state.current
    r.raf = null
    const group = groupRef.current, registered = group?.getLayout()
    if (!registered || registered.sidebar === undefined || registered.chat === undefined || v.contentMounted !== (registered.content !== undefined)) {
      if (++r.registrationWait < 100) kick()
      return
    }
    r.registrationWait = 0
    if (r.restore) {
      const restored = r.restore; r.restore = null
      r.current = { sidebar: restored.sizes.sidebar ?? 0, chat: restored.sizes.chat ?? 100, content: restored.sizes.content ?? 0 }
      r.target = target()
      if (v.mode === "wide") write(r.target)
      r.current = r.target; geometry(); announce(); return
    }
    prepareOpening()
    if (r.secondary?.started === -1) r.secondary.started = now
    if (r.sidebar?.started === -1) r.sidebar.started = now
    if (r.sidebar && v.mode === "wide") r.sidebarPixels = at(r.sidebar, now)
    const s = r.sidebar && v.mode === "wide" ? r.sidebarPixels / Math.max(availableWidth(), 1) * 100 : r.current.sidebar
    if (r.sidebar && v.mode === "narrow") r.visiblePixels = at(r.sidebar, now)
    const axis = r.secondary?.axis ?? r.axis
    const axisValue = r.secondary ? at(r.secondary, now) : r.current[axis]
    const composed = composeSidebarLayout(s, axis, axisValue, v.contentMounted)
    r.current = composed
    if (v.mode === "wide" && (r.sidebar || r.secondary || r.needsWrite) && write(composed)) r.registrationRepin = false
    r.needsWrite = false
    geometry()
    if (r.closingFocus) { r.closingFocus = false; focusRestore() }
    if (r.sidebar && done(r.sidebar, now)) {
      const opening = r.sidebar.to > 0
      r.sidebar = null
      r.registrationRepin ||= v.mode === "wide"
      update({ sidebarAnimating: false, phase: opening ? "open" : "closed" })
      r.restoreFocus = opening
      // A resize may cross the breakpoint while the complete shape is frozen.
      const mode = window.innerWidth < 900 ? "narrow" : "wide"
      r.registrationRepin = mode === "wide"
      const previousMode = state.current.mode
      if (mode !== previousMode) {
        // The completed command owns the new mode, not an older pane or desktop
        // visibility preference. Ordinary narrow switches still preserve the
        // desktop width preference; only crossing transfers the latest intent.
        const underlay = !state.current.chatVisible && state.current.contentMounted ? "content" : state.current.underlay === "content" && !state.current.contentMounted ? "chat" : state.current.underlay
        update({ mode, phase: opening ? "open" : "closed", sidebarVisible: opening, narrowPane: opening ? "sidebar" : underlay, underlay })
      }
      if (mode === "wide") {
        if (previousMode === "narrow" && opening) r.target.sidebar = r.lastSidebar ?? 260 / Math.max(groupWidth(), 900) * 100
        const settled = target()
        if (opening) r.lastSidebar = settled.sidebar
        r.current = r.secondary ? composeSidebarLayout(settled.sidebar, r.secondary.axis, at(r.secondary, now), state.current.contentMounted) : settled
        if (previousMode === "narrow") write(r.current) // This frame had no wide Group write yet.
        r.needsWrite = true
      }
      r.sidebarGoal = null
      geometry(); announce()
    }
    if (r.secondary && done(r.secondary, now)) {
      const completed = r.secondary; r.secondary = null
      r.registrationRepin ||= state.current.mode === "wide"
      r.needsWrite ||= state.current.mode === "wide"
      update({ contentAnimating: false, chatAnimating: false })
      if (completed.axis === "content" && !state.current.contentVisible) {
        update({ contentMounted: false, chatVisible: true }); r.current = composeSidebarLayout(r.current.sidebar, "content", 0, false); r.axis = "content"; r.needsWrite = true
      }
      announce()
    }
    if (r.sidebar || r.secondary || r.needsWrite) kick()
    if (!r.sidebar && !r.secondary) { r.keepSidebarDivider = false; r.keepContentDivider = false }
  }
  const startSidebar = useCallback((open: boolean) => {
    const r = runtime.current, v = state.current
    if ((v.phase === "open" || v.phase === "opening") === open) return
    const current = currentLayout()
    retainDividers()
    if (!open && innerRef.current?.contains(document.activeElement)) { r.focus = document.activeElement as HTMLElement; r.closingFocus = true }
    const moving = !!r.sidebar
    const closingWidth = sidebarElementRef.current?.getBoundingClientRect().width ?? 0
    const available = availableWidth()
    r.openingPercentage = null
    r.sidebarGoal = v.mode === "wide" && moving ? open ? r.fixedWidth : 0 : null
    if (v.mode === "narrow") update({ narrowPane: open ? "sidebar" : v.underlay })
    else {
      if (!open && !v.sidebarAnimating && current.sidebar > 0) r.lastSidebar = current.sidebar
      if (open) r.target.sidebar = r.lastSidebar ?? 260 / Math.max(groupWidth(), 900) * 100
      update({ sidebarVisible: open })
    }
    const settled = target()
    if (v.mode === "wide" && open) r.lastSidebar = settled.sidebar
    if (!moving) r.fixedWidth = v.mode === "narrow" ? groupWidth() : open ? settled.sidebar / 100 * available : closingWidth
    const from = v.mode === "narrow" ? r.visiblePixels : closingWidth
    const to = v.mode === "narrow" ? open ? r.fixedWidth : 0 : settled.sidebar / 100 * available
    if (v.mode === "wide") {
      if (open && !moving) r.openingPercentage = settled.sidebar
      r.sidebarGoal = to
      r.sidebarPixels = from
      r.current = composeSidebarLayout(from / Math.max(available, 1) * 100, r.axis, current[r.axis], v.contentMounted)
    }
    r.sidebar = { from, to, started: -1, duration: reducedMotion() ? 0 : open ? 560 : 420 }
    // Constraint projection may change the existing secondary destination.
    if (r.secondary) r.secondary.to = settled[r.secondary.axis]
    else {
      r.axis = state.current.chatVisible ? "content" : "chat"
      if (state.current.contentMounted && Math.abs(current[r.axis] - settled[r.axis]) > .01) r.secondary = { axis: r.axis, from: current[r.axis], to: settled[r.axis], started: -1, duration: r.sidebar.duration }
    }
    update({ sidebarAnimating: true, phase: open ? "opening" : "closing" }); geometry(); kick(); announce()
  }, [availableWidth, currentLayout, geometry, groupWidth, kick, retainDividers, target, update, announce])
  const toggleSidebar = useCallback(() => startSidebar(!(state.current.phase === "open" || state.current.phase === "opening")), [startSidebar])
  const startAxis = useCallback((axis: SidebarAxis, to: number, opening: boolean, from?: number) => {
    const r = runtime.current, current = currentLayout()
    r.axis = axis
    r.secondary = { axis, from: from ?? current[axis], to, started: -1, duration: reducedMotion() ? 0 : opening ? 560 : 420 }
    r.needsWrite = true; kick(); announce()
  }, [currentLayout, kick, announce])
  const showContent = useCallback(() => {
    const v = state.current, r = runtime.current
    if (v.contentVisible) return
    const wasMounted = v.contentMounted, current = currentLayout()
    retainDividers()
    update({ contentVisible: true, contentMounted: true, contentAnimating: true })
    r.axis = "content"
    r.current = { ...current, content: wasMounted ? current.content : 0 }
    r.target.content = r.lastContent ?? (100 - current.sidebar) / 2
    const settled = target(); startAxis("content", settled.content, true, wasMounted ? current.content : 0)
  }, [currentLayout, retainDividers, startAxis, target, update])
  const hideContent = useCallback(() => {
    const v = state.current, r = runtime.current
    if (!v.contentVisible) return
    const current = currentLayout()
    retainDividers()
    r.lastContent = r.secondary?.axis === "content" ? r.secondary.to : current.content
    r.target.content = 0
    update({ contentVisible: false, contentAnimating: true, chatVisible: true, narrowPane: v.narrowPane === "content" ? "chat" : v.narrowPane, underlay: v.underlay === "content" ? "chat" : v.underlay })
    r.axis = "content"
    target(); startAxis("content", 0, false, current.content)
  }, [currentLayout, retainDividers, startAxis, target, update])
  const toggleContent = useCallback(() => state.current.contentVisible ? hideContent() : showContent(), [hideContent, showContent])
  const toggleFullscreen = useCallback(() => {
    const v = state.current, r = runtime.current
    if (!v.contentMounted) return
    const current = currentLayout(), opening = !v.chatVisible
    retainDividers()
    if (!opening) r.lastChat = r.secondary?.axis === "chat" ? r.secondary.to : current.chat
    r.target.chat = opening ? r.lastChat ?? 560 / Math.max(groupWidth(), 900) * 100 : 0
    update({ chatVisible: opening, chatAnimating: true })
    r.axis = "chat"
    const settled = target()
    startAxis("chat", opening ? settled.chat : 0, opening, current.chat)
  }, [currentLayout, groupWidth, retainDividers, startAxis, target, update])
  const showChat = useCallback(() => { if (!state.current.chatVisible) toggleFullscreen() }, [toggleFullscreen])
  const selectPane = useCallback((pane: "chat" | "content" | "sidebar") => {
    if (pane === "sidebar") { startSidebar(true); return }
    if (pane === "content") showContent()
    if (pane === "chat") showChat()
    update({ underlay: pane })
    if (state.current.mode === "narrow" && (state.current.phase === "open" || state.current.phase === "opening")) startSidebar(false)
    else update({ narrowPane: pane })
  }, [showChat, showContent, startSidebar, update])
  const onLayoutChanged = useCallback(() => {
    const r = runtime.current, v = state.current
    // Panel registration can complete in a child-only follow-up commit, after
    // this owner's layout effect. Keep the same snapshot through registration.
    repinCurrent()
    if (!r.sidebar && !r.secondary && !r.restore && !r.needsWrite && !r.registrationRepin && v.mode === "wide") {
      const current = currentLayout(); r.target = { ...current }
      if (v.sidebarVisible && current.sidebar > 0) r.lastSidebar = current.sidebar
      if (v.contentVisible && current.content > 0) r.lastContent = current.content
      if (v.chatVisible && current.chat > 0) r.lastChat = current.chat
    }
    geometry(); announce()
  }, [currentLayout, geometry, announce, repinCurrent])
  useLayoutEffect(() => {
    // Constraint registration can restore the library's cached requested layout
    // after a preserve-pixel-size resize. Repin the captured current shape after
    // the child Group registers, before the browser can paint that older map.
    prepareOpening()
    repinCurrent()
    geometry()
    if (runtime.current.restoreFocus && view.phase === "open") {
      runtime.current.restoreFocus = false
      const previous = runtime.current.focus
      const destination = previous?.isConnected && !previous.closest("[inert],[hidden]") ? previous : innerRef.current?.querySelector<HTMLElement>('button[aria-label="展开或收起左侧导航栏"]')
      if (!document.activeElement?.closest('[data-slot="dialog-content"]')) destination?.focus({ preventScroll: true })
    }
  }, [view, geometry, prepareOpening, repinCurrent])
  useLayoutEffect(() => {
    const group = groupElementRef.current
    if (!group) return
    let observing = true
    const observeRoots = () => {
      observer.disconnect()
      observer.observe(group, { childList: true, attributes: true, attributeFilter: ["style"] })
      for (const panel of group.querySelectorAll(":scope > [data-panel]")) observer.observe(panel, { attributes: true, attributeFilter: ["style"] })
    }
    // The Group deduplicates public callbacks and can skip a child-only commit
    // that restores an older requested layout. Observe only layout roots so its
    // registered shape is repinned before paint, never business descendants.
    const observer = new MutationObserver(records => {
      if (!observing) return
      if (records.some(record => record.type === "childList")) observeRoots()
      const r = runtime.current
      if ((!r.sidebar && !r.registrationRepin) || r.writing || state.current.mode !== "wide") return
      repinCurrent(); geometry()
    })
    observeRoots()
    return () => { observing = false; observer.disconnect() }
  }, [geometry, repinCurrent])
  useEffect(() => {
    const resized = () => {
      const r = runtime.current
      if (r.sidebar) { repinCurrent(); geometry(); return }
      const measured = groupWidth()
      if (state.current.mode === (window.innerWidth < 900 ? "narrow" : "wide") && Math.abs(measured - r.width) < .1) { geometry(); return }
      const mode = window.innerWidth < 900 ? "narrow" : "wide"
      update({ mode, phase: (mode === "narrow" ? state.current.narrowPane === "sidebar" : state.current.sidebarVisible) ? "open" : "closed" })
      if (mode === "wide") { r.current = target(); r.needsWrite = true; kick() }
      geometry()
    }
    const observer = new ResizeObserver(resized)
    if (groupElementRef.current) observer.observe(groupElementRef.current)
    if (sidebarElementRef.current) observer.observe(sidebarElementRef.current)
    window.addEventListener("resize", resized)
    return () => { observer.disconnect(); window.removeEventListener("resize", resized) }
  }, [geometry, groupWidth, kick, repinCurrent, target, update])
  useEffect(() => {
    if (!window.desktop) return
    return registerWorkspaceLayoutAdapter({
      read: () => {
        const r = runtime.current, v = state.current
        const sizes = r.sidebar || r.secondary || r.restore || r.needsWrite ? target() : r.target
        return settledWorkspaceLayout({ version: 1, narrowPane: v.narrowPane, contentVisible: v.contentVisible, sidebarVisible: v.sidebarVisible, chatVisible: v.chatVisible, sizes: v.contentVisible ? { ...sizes } : { sidebar: sizes.sidebar, chat: sizes.chat }, lastContentSize: r.lastContent, lastSidebarSize: r.lastSidebar, lastChatSize: r.lastChat })
      },
      subscribe: listener => { listeners.current.add(listener); return () => { listeners.current.delete(listener) } },
      apply: input => {
        const layout = settledWorkspaceLayout(input), r = runtime.current
        if (r.raf !== null) cancelAnimationFrame(r.raf)
        r.raf = null; r.generation++; r.sidebar = null; r.sidebarGoal = null; r.openingPercentage = null; r.secondary = null; r.needsWrite = false
        r.keepSidebarDivider = false; r.keepContentDivider = false
        r.registrationRepin = false
        r.lastSidebar = layout.lastSidebarSize ?? layout.sizes.sidebar ?? null; r.lastContent = layout.lastContentSize ?? layout.sizes.content ?? null; r.lastChat = layout.lastChatSize ?? layout.sizes.chat ?? null
        r.target = { sidebar: layout.sizes.sidebar ?? 0, chat: layout.sizes.chat ?? 100, content: layout.sizes.content ?? 0 }; r.restore = layout; r.registrationWait = 0
        const mode = window.innerWidth < 900 ? "narrow" : "wide"
        update({ contentVisible: layout.contentVisible, contentMounted: layout.contentVisible, sidebarVisible: layout.sidebarVisible, chatVisible: layout.chatVisible, narrowPane: layout.narrowPane, mode, phase: (mode === "narrow" ? layout.narrowPane === "sidebar" : layout.sidebarVisible) ? "open" : "closed", underlay: layout.narrowPane === "content" ? "content" : "chat", contentAnimating: false, sidebarAnimating: false, chatAnimating: false })
        kick()
      },
    })
  }, [kick, target, update])
  useEffect(() => () => { const r = runtime.current; if (r.raf !== null) cancelAnimationFrame(r.raf); r.generation++ }, [])
  const motion = view.sidebarAnimating || view.contentAnimating || view.chatAnimating
  const registrationLayout = runtime.current.restore?.sizes ?? (runtime.current.hasMeasuredLayout ? view.contentMounted ? { ...runtime.current.current } : { sidebar: runtime.current.current.sidebar, chat: runtime.current.current.chat } : initialLayout && Object.keys(initialLayout.sizes).length ? initialLayout.sizes : undefined)
  return { ...view, initialLayout, registrationLayout, sidebarDividerVisible: view.sidebarVisible && view.chatVisible || motion && runtime.current.keepSidebarDivider, contentDividerVisible: view.contentMounted && (view.chatVisible || motion && runtime.current.keepContentDivider), groupRef, groupElementRef, sidebarElementRef, innerRef, rootRef, toggleSidebar, showSidebar: () => startSidebar(true), hideSidebar: () => startSidebar(false), showContent, hideContent, toggleContent, toggleFullscreen, showChat, selectPane, onLayoutChanged,
    sidebarHidden: view.phase !== "open", interactionPaused: view.phase !== "open", underlayInert: view.mode === "narrow" && view.phase !== "closed" }
}
