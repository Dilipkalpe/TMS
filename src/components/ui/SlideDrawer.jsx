import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePopupKeyboard } from '../../hooks/usePopupKeyboard'

/** Right-side slide panel for filters / detail panels. */
export default function SlideDrawer({ open, onClose, title, children, footer, width = 'md' }) {
  const contentRef = useRef(null)

  usePopupKeyboard({ id: 'slide-drawer', open, onClose })

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-slate-700 dark:bg-slate-900 ${
          widths[width] ?? widths.md
        } ${open ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
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
        <div className="min-h-0 flex-1 overflow-auto mobile-scroll-y px-4 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-200 px-4 py-3 dark:border-slate-800">{footer}</div>
        ) : null}
      </aside>
    </>
  )
}
