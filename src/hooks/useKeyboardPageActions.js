import { useEffect } from 'react'
import { useKeyboardShortcutsOptional } from '../context/KeyboardShortcutContext'

export function useKeyboardPageActions(actions, deps = []) {
  const kbd = useKeyboardShortcutsOptional()

  useEffect(() => {
    if (!kbd || actions.enabled === false) return undefined
    return kbd.registerPageActions({
      onSave: actions.onSave,
      onNew: actions.onNew,
      onNewF2: actions.onNewF2,
      onSearch: actions.onSearch,
      onLookup: actions.onLookup,
      onPrint: actions.onPrint,
      onPreview: actions.onPreview,
      onDeleteRow: actions.onDeleteRow,
      onAddRow: actions.onAddRow,
      onCancel: actions.onCancel,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    kbd,
    actions.onSave,
    actions.onNew,
    actions.onNewF2,
    actions.onSearch,
    actions.onLookup,
    actions.onPrint,
    actions.onPreview,
    actions.onDeleteRow,
    actions.onAddRow,
    actions.onCancel,
    actions.enabled,
    ...deps,
  ])
}

export function useAutoFocus(rootRef) {
  const kbd = useKeyboardShortcutsOptional()

  useEffect(() => {
    if (!kbd?.tallyMode) return
    kbd.autoFocusForm(rootRef?.current)
  }, [kbd, rootRef])
}
