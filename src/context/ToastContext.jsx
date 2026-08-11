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
  const bottomToasts = toasts.filter((t) => t.position !== 'top')
  const topToasts = toasts.filter((t) => t.position === 'top')

  const renderToast = (t) => {
    const Icon = ICONS[t.type] ?? Info
    const isTop = t.position === 'top'
    return (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-start space-x-3 rounded-xl border shadow-lg ${
          isTop ? 'p-4' : 'p-3'
        } ${STYLES[t.type] ?? STYLES.info}`}
      >
        <Icon className={`mt-0.5 shrink-0 ${isTop ? 'h-6 w-6' : 'h-5 w-5'}`} />
        <div className="min-w-0 flex-1">
          {t.title && <p className={`font-semibold ${isTop ? 'text-base' : 'text-sm'}`}>{t.title}</p>}
          {t.message && <p className={`whitespace-pre-line opacity-90 ${isTop ? 'text-sm' : 'text-xs'}`}>{t.message}</p>}
        </div>
        <button type="button" onClick={() => onDismiss(t.id)} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <>
      {topToasts.length > 0 && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[110] flex w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 flex-col space-y-2">
          {topToasts.map(renderToast)}
        </div>
      )}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col-reverse space-y-2 sm:bottom-6 sm:right-6">
        {bottomToasts.map(renderToast)}
      </div>
    </>
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
      const { title, message, type = 'info', duration, position = 'bottom' } = options
      const autoDuration = duration ?? (type === 'error' && message?.includes('\n') ? 6000 : type === 'warning' && position === 'top' ? 8000 : 3500)
      const id = crypto.randomUUID?.() ?? String(Date.now())
      setToasts((prev) => [...prev.slice(-4), { id, title, message, type, position }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), autoDuration)
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
