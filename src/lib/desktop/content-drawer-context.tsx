"use client"

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react"

/** Portal ownership is local to the content drawer. Business modal Dialogs reset
 * this context, so their inputs and nested popups keep working while it moves. */
export const ContentDrawerInteractionContext = createContext<{ paused: boolean; captionZoom: number | null; registerCaptionPreparation: (prepare: () => boolean) => () => void } | null>(null)
export const useContentDrawerInteraction = () => useContext(ContentDrawerInteractionContext)
/** A parent Root survives its Popup/children being unmounted. Its pause history
 * prevents newly remounted submenus from reviving old default/controlled intent. */
export const ContentDrawerPopupParentContext = createContext(false)

/** A paused controlled root may still receive its caller's old `open=true`.
 * Latch that intent closed until a new trigger event (or a false controlled
 * value) arrives; merely resuming the drawer must never resurrect a popup. */
export function useContentDrawerPopup<Details extends { isCanceled: boolean }>(props: { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean, details: Details) => void }) {
  const context = useContentDrawerInteraction(), paused = context?.paused ?? false
  const parentPaused = useContext(ContentDrawerPopupParentContext) && context !== null
  const history = useRef(false)
  const [localOpen, setLocalOpen] = useState(() => parentPaused ? false : props.defaultOpen ?? false)
  const [blocked, setBlocked] = useState(() => parentPaused && props.open === true)
  useLayoutEffect(() => {
    if (paused) { history.current = true; setLocalOpen(false); if (props.open) setBlocked(true) }
    else if (props.open === false) setBlocked(false)
  }, [paused, props.open])
  return {
    paused, owned: context !== null, wasPaused: context !== null && (paused || history.current || parentPaused),
    open: paused || blocked ? false : props.open ?? localOpen,
    onOpenChange: (open: boolean, details: Details) => {
      if (paused && open) return
      // Base UI's cancel() updates this real event object's isCanceled getter.
      // Let the caller veto the transition before changing our local state.
      props.onOpenChange?.(open, details)
      if (details.isCanceled || paused) return
      setBlocked(false)
      if (props.open === undefined) setLocalOpen(open)
    },
  }
}
