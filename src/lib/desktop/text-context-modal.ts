const selector='[data-slot="dialog-content"],[role="dialog"][aria-modal="true"],[role="alertdialog"],dialog[open]'
/** Monaco's persistent nonmodal find widget must not block application text. */
export function activeTextDialogs(document:Document){
 return [...document.querySelectorAll<HTMLElement>(selector)].filter(element=>!element.closest('[hidden],[aria-hidden="true"],[inert]')&&element.getClientRects().length>0)
}
