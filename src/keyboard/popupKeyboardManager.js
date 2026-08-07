/**
 * Popup keyboard stack — highest priority layer.
 */

/** @typedef {{ id: string, onConfirm?: () => void, onCancel?: () => void, onArrow?: (dir: 'up'|'down') => void, focusSearch?: () => void }} PopupLayer */

/** @type {PopupLayer[]} */
let stack = []

/** @type {Set<(stack: PopupLayer[]) => void>} */
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn([...stack]))
}

/** @returns {PopupLayer | undefined} */
export function getTopPopup() {
  return stack[stack.length - 1]
}

/** @param {PopupLayer} layer */
export function pushPopup(layer) {
  stack = stack.filter((p) => p.id !== layer.id)
  stack.push(layer)
  notify()
  return () => popPopup(layer.id)
}

/** @param {string} id */
export function popPopup(id) {
  stack = stack.filter((p) => p.id !== id)
  notify()
}

/** @param {(stack: PopupLayer[]) => void} fn */
export function subscribePopups(fn) {
  listeners.add(fn)
  fn([...stack])
  return () => listeners.delete(fn)
}

/** @param {KeyboardEvent} e */
export function handlePopupKeydown(e) {
  const top = getTopPopup()
  if (!top) return false

  if (e.key === 'Escape') {
    e.preventDefault()
    top.onCancel?.()
    return true
  }

  if (e.key === 'Enter' && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
    if (e.target instanceof HTMLButtonElement) return false
    if (top.onConfirm) {
      e.preventDefault()
      top.onConfirm()
      return true
    }
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (top.onArrow) {
      e.preventDefault()
      top.onArrow(e.key === 'ArrowDown' ? 'down' : 'up')
      return true
    }
  }

  if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
    if (top.focusSearch) {
      e.preventDefault()
      top.focusSearch()
      return true
    }
  }

  return false
}
