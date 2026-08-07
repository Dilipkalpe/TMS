import { useEffect } from 'react'
import { pushPopup } from '../keyboard/popupKeyboardManager'

/**
 * Register a popup layer for keyboard priority handling.
 */
export function usePopupKeyboard({ id, open, onClose, onConfirm, onArrow, focusSearch }) {
  useEffect(() => {
    if (!open) return undefined
    return pushPopup({
      id,
      onCancel: onClose,
      onConfirm,
      onArrow,
      focusSearch,
    })
  }, [id, open, onClose, onConfirm, onArrow, focusSearch])
}
