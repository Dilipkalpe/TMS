import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
}

const STYLES = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
}

function ToastContainer(props) {
  const { toasts, onDismiss } = props
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col-reverse space-y-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] ?? Info
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start space-x-3 rounded-xl border p-3 shadow-lg ${STYLES[t.type] ?? STYLES.info}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              {t.title && <p className="text-sm font-semibold">{t.title}</p>}
              {t.message && <p className="text-xs opacity-90">{t.message}</p>}
            </div>
            <button type="button" onClick={() => onDismiss(t.id)} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ToastProvider(props) {
  const { children } = props
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (options = {}) => {
      const { title, message, type = 'info', duration = 3500 } = options
      const id = crypto.randomUUID?.() ?? String(Date.now())
      setToasts((prev) => [...prev.slice(-4), { id, title, message, type }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
