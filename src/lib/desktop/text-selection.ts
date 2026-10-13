/** Let authored previews inside clickable/draggable cards behave as text.
 * Controls and links inside a preview retain their own events; standalone
 * manuscript previews retain their comment/selection handlers. */
export function installTextPreviewSelection(document: Document) {
  const view = document.defaultView
  const interactive = 'button,a,label,summary,[role="button"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="checkbox"],[role="radio"],[role="switch"]'
  const controls = interactive + ',input,textarea,select,[data-text-ui],[data-text-input],[contenteditable]'
  function previewAt(target: EventTarget | null) {
    if (!(target instanceof Element)) return null
    const preview = target.closest<HTMLElement>('[data-text-preview]')
    if (!preview) return null
    const control = target.closest(controls)
    return control && preview.contains(control) ? null : preview
  }
  const suspended = new Map<HTMLElement, string>()
  let restoreTimer: ReturnType<typeof setTimeout> | undefined
  function restore() {
    clearTimeout(restoreTimer)
    for (const [card, value] of suspended) if (card.getAttribute('draggable') === 'false') card.setAttribute('draggable', value)
    suspended.clear()
  }
  function release() { if (suspended.size) restoreTimer = setTimeout(restore, 0) }
  function down(event: MouseEvent) {
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
    // Keep the native word/range selection, and avoid opening/replacing the
    // card while its excerpt is being read. Card chrome still runs its action.
    event.stopPropagation()
    if (event.type === 'click') event.preventDefault()
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
