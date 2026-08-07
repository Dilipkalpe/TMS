import { useEffect } from 'react'
import { useKeyboardShortcutsOptional } from '../context/KeyboardShortcutContext'

export function useKeyboardPageActions(actions, deps = []) {
  const kbd = useKeyboardShortcutsOptional()

  useEffect(() => {
    if (!kbd || actions.enabled === false) return undefined
    return kbd.registerPageActions({
      onSave: actions.onSave,
      onNew: actions.onNew,
      onPrint: actions.onPrint,
      onPreview: actions.onPreview,
      onCancel: actions.onCancel,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbd, actions.onSave, actions.onNew, actions.onPrint, actions.onPreview, actions.onCancel, actions.enabled, ...deps])
}

export function useAutoFocus(rootRef) {
  const kbd = useKeyboardShortcutsOptional()

  useEffect(() => {
    if (!kbd?.tallyMode) return
    kbd.autoFocusForm(rootRef?.current)
  }, [kbd, rootRef])
}
