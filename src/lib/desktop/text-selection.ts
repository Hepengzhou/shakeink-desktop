/** Let authored previews inside clickable/draggable cards behave as text.
 * Controls and links inside a preview retain their own events; standalone
 * manuscript previews retain their comment/selection handlers.
 * Clicks on a preview inside a card are isolated only when they are text
 * selection gestures (drag release, double/triple-click follow-ups, shift
 * range extension); a plain single click keeps the card's natural action. */
export function installTextPreviewSelection(document: Document) {
  const view = document.defaultView
  const interactive = 'button,a,label,summary,[role="button"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="checkbox"],[role="radio"],[role="switch"]'
  const controls = interactive + ',input,textarea,select,[data-text-ui],[data-text-input],[contenteditable]'
  /** Matches the default Windows SM_CXDRAG/SM_CYDRAG drag hysteresis: sub-threshold jiggle stays a plain click. */
  const DRAG_THRESHOLD_PX = 4
  function previewAt(target: EventTarget | null) {
    if (!(target instanceof Element)) return null
    const preview = target.closest<HTMLElement>('[data-text-preview]')
    if (!preview) return null
    const control = target.closest(controls)
    return control && preview.contains(control) ? null : preview
  }
  const suspended = new Map<HTMLElement, string>()
  let restoreTimer: ReturnType<typeof setTimeout> | undefined
  let downAt: { x: number; y: number } | null = null
  function restore() {
    clearTimeout(restoreTimer)
    for (const [card, value] of suspended) if (card.getAttribute('draggable') === 'false') card.setAttribute('draggable', value)
    suspended.clear()
  }
  function release() { if (suspended.size) restoreTimer = setTimeout(restore, 0) }
  function down(event: MouseEvent) {
    downAt = event.button === 0 ? { x: event.clientX, y: event.clientY } : null
    if (event.button !== 0) return
    restore()
    const card = previewAt(event.target)?.closest<HTMLElement>('[draggable="true"]')
    if (!card) return
    suspended.set(card, card.getAttribute('draggable')!)
    card.setAttribute('draggable', 'false')
  }
  function click(event: MouseEvent) {
    const preview = previewAt(event.target)
    if (!preview?.parentElement?.closest(interactive + ',[draggable]')) return
    if (event.type === 'click') {
      const moved = downAt !== null &&
        (Math.abs(event.clientX - downAt.x) > DRAG_THRESHOLD_PX || Math.abs(event.clientY - downAt.y) > DRAG_THRESHOLD_PX)
      // A plain single click is not a selection gesture: keep the card's natural
      // action. Synthetic/keyboard clicks (detail 0) always pass, independent of
      // stale press coordinates. Only selection gestures stay isolated: drag
      // releases beyond the drag hysteresis, double/triple-click follow-ups
      // (so a double click nets exactly one card action) and shift range clicks.
      if (event.detail === 0 || (event.detail === 1 && !event.shiftKey && !moved)) return
      event.preventDefault()
    }
    // Keep the native word/range selection, and avoid opening/replacing the
    // card while its excerpt is being read. Card chrome still runs its action.
    event.stopPropagation()
  }
  document.addEventListener('mousedown', down, true)
  document.addEventListener('mouseup', release, true)
  document.addEventListener('click', click, true)
  document.addEventListener('dblclick', click, true)
  view?.addEventListener('blur', restore)
  return () => {
    document.removeEventListener('mousedown', down, true)
    document.removeEventListener('mouseup', release, true)
    document.removeEventListener('click', click, true)
    document.removeEventListener('dblclick', click, true)
    view?.removeEventListener('blur', restore)
    restore()
  }
}
