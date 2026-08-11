import { useCallback, useEffect, useId, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'
import { usePopupKeyboard } from '../../hooks/usePopupKeyboard'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Single centered validation dialog — error messages only (no duplicate toast/banner).
 * Traps focus inside the dialog while open.
 */
export default function FormValidationPopup({ open, errors, onClose }) {
  const id = useId()
  const panelRef = useRef(null)
  const messages = Object.values(errors ?? {}).filter(Boolean)

  usePopupKeyboard({
    id: `validation-${id}`,
    open: open && messages.length > 0,
    onClose,
    onConfirm: onClose,
  })

  useEffect(() => {
    if (!open || messages.length === 0) return undefined
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector('[data-validation-ok]')?.focus({ preventScroll: true })
    }, 50)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [open, messages.length])

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusables = panelRef.current.querySelectorAll(FOCUSABLE)
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  if (!open || messages.length === 0) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" data-kbd-popup="true" role="presentation">
      <div
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="form-validation-popup-heading"
        onKeyDown={handleKeyDown}
        className="form-validation-popup-panel relative w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-900/60 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="form-validation-popup-body px-5 pb-4 pt-5">
          <div className="form-validation-popup">
            <div className="form-validation-popup-icon" aria-hidden>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <p id="form-validation-popup-heading" className="sr-only">Validation errors</p>
              <ul className="form-validation-popup-list">
                {messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-red-100 bg-red-50/60 px-5 py-3 dark:border-red-900/40 dark:bg-red-950/30">
          <div className="flex justify-end">
            <Button type="button" data-validation-ok onClick={onClose}>OK</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
