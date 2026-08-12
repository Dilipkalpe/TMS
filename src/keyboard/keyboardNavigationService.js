/**
 * Global keyboard navigation service — dispatches shortcuts by priority:
 * Popup → Grid → Page → Navigation → Form (Tally Enter-as-Tab)
 */

import { buildShortcutMap } from './shortcutRegistry'
import {
  focusFirstEditable, focusLastEditable, focusNextEditable,
  isEditableTarget, normalizeKeyEvent, shouldBlockGlobalShortcut,
} from './keyUtils'
import { getTopPopup, handlePopupKeydown } from './popupKeyboardManager'

export class KeyboardNavigationService {
  constructor() {
    this.shortcutMap = buildShortcutMap()
    this.pageActions = null
    this.gridActions = null
    this.handlers = {}
    this.tallyMode = false
    this.enabled = true
    this.lookupTrigger = null
  }

  setTallyMode(v) { this.tallyMode = !!v }
  setEnabled(v) { this.enabled = !!v }
  setHandlers(h) { this.handlers = { ...this.handlers, ...h } }
  registerPageActions(actions) { this.pageActions = actions }
  unregisterPageActions() { this.pageActions = null }
  registerGridActions(actions) { this.gridActions = actions }
  unregisterGridActions() { this.gridActions = null }
  registerLookupTrigger(fn) { this.lookupTrigger = fn }
  unregisterLookupTrigger() { this.lookupTrigger = null }

  handleKeyDown(e) {
    if (!this.enabled) return false

    if (handlePopupKeydown(e)) return true

    const combo = normalizeKeyEvent(e)

    if (this.gridActions?.onKeyDown?.(e)) return true

    if (this.tallyMode && e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target
      if (target instanceof HTMLElement && isEditableTarget(target)) {
        if (target.closest('[data-kbd-grid]')) return false
        // Modals / lookup add popups own Enter-as-Tab within the dialog.
        if (target.closest('[data-kbd-popup], [role="dialog"]')) return false
        if (target.tagName === 'TEXTAREA' && e.shiftKey) return false
        // Comboboxes own Enter (open list / select highlight). Do not treat as Tab.
        if (target.getAttribute('role') === 'combobox') return false
        e.preventDefault()
        focusNextEditable(target, e.shiftKey)
        return true
      }
    }

    if (shouldBlockGlobalShortcut(e, combo)) return false

    const defs = this.shortcutMap.get(combo) ?? []
    for (const def of defs) {
      if (this.dispatchShortcut(def, e, combo)) return true
    }
    return false
  }

  dispatchShortcut(def, e, combo) {
    const { action, path } = def

    if (action === 'help:open') {
      e.preventDefault()
      this.handlers.onHelpOpen?.()
      return true
    }
    if (action === 'search:open') {
      if (this.pageActions?.onSearch) {
        e.preventDefault()
        this.pageActions.onSearch()
        return true
      }
      e.preventDefault()
      this.handlers.onSearchOpen?.()
      return true
    }
    if (action === 'lookup:open') {
      if (this.pageActions?.onLookup) {
        e.preventDefault()
        this.pageActions.onLookup()
        return true
      }
      e.preventDefault()
      this.lookupTrigger?.()
      this.handlers.onLookupOpen?.()
      return true
    }
    if (action?.startsWith('tab:')) {
      e.preventDefault()
      const idx = parseInt(action.split(':')[1], 10) - 1
      this.handlers.onTabSwitch?.(idx)
      return true
    }
    if (action === 'focus:first') {
      e.preventDefault()
      focusFirstEditable()
      return true
    }
    if (action === 'focus:last') {
      e.preventDefault()
      focusLastEditable()
      return true
    }
    if (action === 'page:save' && this.pageActions?.onSave) {
      if (combo === 'f2' && this.pageActions.onNewF2) {
        e.preventDefault()
        this.pageActions.onNewF2()
        return true
      }
      e.preventDefault()
      this.pageActions.onSave()
      return true
    }
    if (action === 'page:new' && this.pageActions?.onNew) {
      e.preventDefault()
      this.pageActions.onNew()
      return true
    }
    if (action === 'page:print' && this.pageActions?.onPrint) {
      e.preventDefault()
      this.pageActions.onPrint()
      return true
    }
    if (action === 'page:preview' && this.pageActions?.onPreview) {
      e.preventDefault()
      this.pageActions.onPreview()
      return true
    }
    if (action === 'grid:delete' && this.pageActions?.onDeleteRow) {
      e.preventDefault()
      this.pageActions.onDeleteRow()
      return true
    }
    if (action === 'grid:insert' && this.pageActions?.onAddRow) {
      e.preventDefault()
      this.pageActions.onAddRow()
      return true
    }
    if (path && this.handlers.navigate) {
      if (['f6', 'f7'].includes(combo) && this.gridActions) return false
      if (combo === 'f2' && this.pageActions?.onSave) return false
      e.preventDefault()
      this.handlers.navigate(path)
      return true
    }
    return false
  }
}

export const keyboardNavigationService = new KeyboardNavigationService()
