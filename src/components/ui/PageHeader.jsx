export default function PageHeader({ title, subtitle, actions, compact = false }) {
  return (
    <div
      className={`flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
        compact ? '' : 'mb-4 sm:mb-6'
      } animate-fade-in`}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-slate-800 sm:text-xl lg:text-2xl dark:text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">{actions}</div>
      )}
    </div>
  )
}
