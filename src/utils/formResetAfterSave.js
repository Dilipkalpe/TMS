import { focusFirstEditable } from '../keyboard/keyUtils'

/**
 * After a successful create/save, reset all controls on the page and focus the first field
 * so the user can enter the next record (ERP “Save & New” behavior).
 *
 * @param {object} opts
 * @param {() => void} opts.reset - Clears form state (and related UI state)
 * @param {ParentNode|null} [opts.formRoot] - Optional [data-kbd-form-root] / form container
 * @param {boolean} [opts.focusFirst=true]
 */
export function clearControlsAfterSave({ reset, formRoot = null, focusFirst = true } = {}) {
  reset?.()
  if (!focusFirst) return
  requestAnimationFrame(() => {
    const root = formRoot
      || document.querySelector('[data-kbd-form-root]')
      || document
    focusFirstEditable(root)
  })
}

/** Build a blank object from a template (all string fields → '', keep functions/objects via factory). */
export function blankFromTemplate(template) {
  if (typeof template === 'function') return template()
  return { ...template }
}
