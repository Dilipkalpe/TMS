/**
 * Keyboard event normalization utilities.
 */

/** @param {KeyboardEvent} e */
export function normalizeKeyEvent(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  let key = e.key.toLowerCase()
  if (key === ' ') key = 'space'
  if (key.length === 1 && /[a-z0-9]/.test(key)) {
    parts.push(key)
  } else if (key.startsWith('arrow')) {
    parts.push(key)
  } else if (key.startsWith('f') && /^f\d+$/.test(key)) {
    parts.push(key)
  } else if (['escape', 'enter', 'tab', 'home', 'end', 'pageup', 'pagedown', 'delete', 'backspace'].includes(key)) {
    parts.push(key)
  } else {
    parts.push(key)
  }
  return parts.join('+')
}

/** @param {EventTarget | null} target */
export function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA') return !(/** @type {HTMLTextAreaElement} */ (target)).readOnly
  if (tag === 'INPUT') {
    const input = /** @type {HTMLInputElement} */ (target)
    if (input.readOnly || input.disabled) return false
    const type = (input.type || 'text').toLowerCase()
    return !['button', 'submit', 'reset', 'image', 'hidden', 'file'].includes(type)
  }
  if (tag === 'SELECT') return !(/** @type {HTMLSelectElement} */ (target)).disabled
  if (target.getAttribute('role') === 'combobox') return true
  return false
}

/** @param {HTMLElement} el */
export function isFocusableEditable(el) {
  if (!el || el.hidden) return false
  if (el.closest('[aria-hidden="true"], [hidden], .hidden')) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false
  if (el.hasAttribute('readonly') || el.getAttribute('aria-readonly') === 'true') return false
  if (el.tabIndex < 0 && !isEditableTarget(el) && el.getAttribute('data-kbd-focus') !== 'true') return false
  if (el.getAttribute('data-kbd-focus') === 'true') return true
  return isEditableTarget(el) || (el.tabIndex >= 0 && !['BUTTON'].includes(el.tagName))
}

/** @param {ParentNode} [root] */
export function getEditableElements(root = document) {
  const selector = [
    'input:not([type=hidden]):not([disabled]):not([readonly])',
    'textarea:not([disabled]):not([readonly])',
    'select:not([disabled])',
    '[contenteditable="true"]',
    '[data-kbd-focus="true"]',
  ].join(',')
  return [...root.querySelectorAll(selector)].filter((el) => isFocusableEditable(/** @type {HTMLElement} */ (el)))
}

/** @param {HTMLElement} el @param {boolean} reverse @param {ParentNode|null} [rootOverride] */
export function focusNextEditable(el, reverse = false, rootOverride = null) {
  const root = rootOverride ?? el.closest('[data-kbd-form-root]') ?? document
  const all = getEditableElements(root)
  const idx = all.indexOf(el)
  if (idx === -1) {
    all[reverse ? all.length - 1 : 0]?.focus()
    return true
  }
  const next = all[idx + (reverse ? -1 : 1)]
  if (next) {
    next.focus()
    if (next instanceof HTMLInputElement && next.select) next.select()
    return true
  }
  return false
}

/** @param {ParentNode} [root] */
export function focusFirstEditable(root = document) {
  const first = getEditableElements(root)[0]
  if (first) {
    first.focus()
    if (first instanceof HTMLInputElement) first.select?.()
    return true
  }
  return false
}

/** @param {ParentNode} [root] */
export function focusLastEditable(root = document) {
  const all = getEditableElements(root)
  const last = all[all.length - 1]
  if (last) {
    last.focus()
    return true
  }
  return false
}

/** Prevent shortcut when typing in inputs — except explicit global combos */
export function shouldBlockGlobalShortcut(e, combo) {
  if (!isEditableTarget(e.target)) return false
  const alwaysGlobal = ['f1', 'f3', 'ctrl+k', 'escape']
  if (alwaysGlobal.includes(combo)) return false
  if (combo.startsWith('alt+')) return false
  if (combo.startsWith('ctrl+')) return false
  return true
}
