import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePopupKeyboard } from '../../hooks/usePopupKeyboard'
import { focusFirstEditable } from '../../keyboard/keyUtils'

export default function Modal({ open, onClose, title, children, footer, size = 'md', confirmOnEnter = false }) {
  const id = useId()
  const contentRef = useRef(null)

  usePopupKeyboard({
    id: `modal-${id}`,
    open,
    onClose,
    onConfirm: confirmOnEnter ? onClose : undefined,
  })

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => focusFirstEditable(contentRef.current ?? document), 80)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  // Portal to body so Enter/keyboard is not stolen by parent grids (e.g. LR Item Details).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-kbd-popup="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        data-kbd-form-root
        className={`relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${sizes[size] ?? sizes.md}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto mobile-scroll-y px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
