"use client"

import { useEffect, useRef, type RefObject } from "react"
import {
  advanceCardMotion, advanceLogoMotion, createCardMotion, createLogoMotion,
  type CardMotionState, type LogoMotionState,
} from "./chat-empty-motion"

type MotionRecord = {
  target: HTMLElement
  sprite: HTMLElement
  kind: "card" | "logo"
  hovered: boolean
  frame: number
  size: number
  card: CardMotionState
  logo: LogoMotionState
}

const modalSelector = '[data-slot="dialog-content"],[data-slot="dialog-overlay"],[role="dialog"][aria-modal="true"],[role="alertdialog"],dialog[open]'

function hasVisibleModal() {
  return [...document.querySelectorAll<HTMLElement>(modalSelector)].some(element =>
    !element.hidden && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0,
  )
}

/** One scheduler for the five interactive sprites; no React render occurs per frame. */
export function useChatEmptyMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  disabled: boolean,
  modalOpen: boolean,
) {
  const options = useRef({ disabled, modalOpen })
  options.current = { disabled, modalOpen }
  const refreshRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const records: MotionRecord[] = [...root.querySelectorAll<HTMLElement>("[data-motion-target]")].flatMap(target => {
      const sprite = target.querySelector<HTMLElement>("[data-sprite]")
      return sprite ? [{
        target, sprite, kind: target.dataset.motionTarget === "logo" ? "logo" as const : "card" as const,
        hovered: false, frame: 0, size: sprite.getBoundingClientRect().width,
        card: createCardMotion(), logo: createLogoMotion(),
      }] : []
    })
    let pageFocused = document.hasFocus()
    let visibleModal = hasVisibleModal()
    let request: number | null = null
    let disposed = false
    const cleanups: Array<() => void> = []

    const listen = (target: EventTarget, type: string, listener: EventListener, capture = false) => {
      target.addEventListener(type, listener, capture)
      cleanups.push(() => target.removeEventListener(type, listener, capture))
    }
    const allowed = () => !options.current.disabled && !options.current.modalOpen && !visibleModal &&
      !reduced.matches && !document.hidden && pageFocused && root.getClientRects().length > 0 &&
      root.clientHeight > 0 && root.clientWidth > 0
    const paint = (record: MotionRecord, frame: number) => {
      if (record.frame === frame && record.sprite.dataset.frame === String(frame)) return
      record.frame = frame
      record.sprite.dataset.frame = String(frame)
      record.sprite.style.backgroundPosition = `${-frame * record.size}px 0px`
    }
    const animate = (now: number) => {
      request = null
      if (disposed) return
      const canAnimate = allowed()
      root.dataset.motion = canAnimate ? "ready" : "paused"
      let active = false
      for (const record of records) {
        const triggered = record.hovered || (document.activeElement === record.target && record.target.matches(":focus-visible"))
        if (record.kind === "card") {
          const step = advanceCardMotion(record.card, now, triggered, canAnimate)
          record.card = step.state
          paint(record, step.frame)
          active ||= step.active
        } else {
          const step = advanceLogoMotion(record.logo, now, triggered, canAnimate)
          record.logo = step.state
          paint(record, step.frame)
          active ||= step.active
        }
      }
      if (active) request = window.requestAnimationFrame(animate)
    }
    const refresh = () => {
      if (disposed) return
      if (request !== null) window.cancelAnimationFrame(request)
      request = null
      animate(performance.now())
    }
    refreshRef.current = refresh

    for (const record of records) {
      listen(record.target, "pointerenter", event => {
        if ((event as PointerEvent).pointerType !== "touch") record.hovered = true
        refresh()
      })
      listen(record.target, "pointerleave", () => { record.hovered = false; refresh() })
      listen(record.target, "pointercancel", () => { record.hovered = false; refresh() })
      listen(record.target, "focus", refresh)
      listen(record.target, "blur", refresh)
    }
    // Focus-visible can change modality on the same already-focused element.
    // A microtask reads the browser's updated pseudo-class without another RAF.
    const refreshModality = () => queueMicrotask(refresh)
    listen(document, "keydown", refreshModality, true)
    listen(document, "pointerdown", refreshModality, true)
    listen(window, "blur", () => { pageFocused = false; refresh() })
    listen(window, "focus", () => { pageFocused = true; refresh() })
    listen(document, "visibilitychange", refresh)
    listen(reduced, "change", refresh)

    const resize = new ResizeObserver(() => {
      for (const record of records) {
        record.size = record.sprite.getBoundingClientRect().width
        record.sprite.style.backgroundPosition = `${-record.frame * record.size}px 0px`
      }
      refresh()
    })
    resize.observe(root)
    for (const record of records) resize.observe(record.sprite)

    // Ignore sprite frame/style changes. Only modal lifecycle attributes and DOM
    // insertion/removal can affect the application's existing dialog barrier.
    const modals = new MutationObserver(() => {
      const next = hasVisibleModal()
      if (next !== visibleModal) { visibleModal = next; refresh() }
    })
    modals.observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["data-open", "data-closed", "hidden", "aria-hidden", "inert", "role", "aria-modal"],
    })
    refresh()
    return () => {
      disposed = true
      refreshRef.current = null
      if (request !== null) window.cancelAnimationFrame(request)
      cleanups.forEach(cleanup => cleanup())
      resize.disconnect()
      modals.disconnect()
      records.forEach(record => paint(record, 0))
    }
  }, [rootRef])

  useEffect(() => { refreshRef.current?.() }, [disabled, modalOpen])
}
