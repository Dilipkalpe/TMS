import * as Icons from 'lucide-react'

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

export default function StatCard({ label, value, change, icon, color = 'blue', compact = false }) {
  const Icon = Icons[icon] || Icons.Activity
  const isPositive = change?.startsWith('+')

  return (
    <div
      className={`shrink-0 rounded-[12px] border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        compact ? 'min-w-[132px] p-2.5 sm:min-w-0 sm:p-3' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className={`rounded-lg ${compact ? 'p-1.5' : 'rounded-xl p-2.5'} ${colorMap[color]}`}>
          <Icon className={compact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-5 w-5'} />
        </div>
        {change && (
          <span className={`text-[10px] font-medium sm:text-xs ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {change}
          </span>
        )}
      </div>
      <p className={`mt-1.5 font-bold text-slate-800 dark:text-slate-100 ${compact ? 'text-sm sm:text-lg' : 'text-2xl'}`}>
        {value}
      </p>
      <p className={`text-slate-500 dark:text-slate-400 ${compact ? 'text-[10px] sm:text-xs' : 'mt-1 text-sm'}`}>
        {label}
      </p>
    </div>
  )
}
