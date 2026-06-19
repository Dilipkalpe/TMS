export default function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`rounded-[12px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${padding ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3 sm:mb-3">
      <div>
        {title && <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
