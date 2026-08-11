import * as Icons from 'lucide-react'

const colorStyles = {
  orange: {
    card: 'border-orange-300 bg-orange-50/80 dark:border-orange-800 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
  },
  green: {
    card: 'border-green-300 bg-green-50/80 dark:border-green-800 dark:bg-green-950/40',
    text: 'text-green-700 dark:text-green-400',
    icon: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  },
  blue: {
    card: 'border-blue-300 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  },
  red: {
    card: 'border-red-300 bg-red-50/80 dark:border-red-800 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    icon: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  },
  amber: {
    card: 'border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
  },
  violet: {
    card: 'border-violet-300 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-400',
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-400',
  },
  teal: {
    card: 'border-teal-300 bg-teal-50/80 dark:border-teal-800 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-400',
    icon: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
  },
  slate: {
    card: 'border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
}

export default function StatusSummaryCards({ cards = [], columns = null }) {
  if (!cards.length) return null

  const colClass = columns === 5
    ? 'grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-2'
    : 'grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-8'

  return (
    <div className={`status-summary-cards ${colClass}`}>
      {cards.map((card) => {
        const Icon = Icons[card.icon] || Icons.Circle
        const style = colorStyles[card.color] || colorStyles.blue
        const Tag = card.onClick ? 'button' : 'div'
        const displayValue = card.isAmount
          ? card.count
          : typeof card.count === 'number'
            ? card.count.toLocaleString('en-IN')
            : card.count
        return (
          <Tag
            key={card.label}
            type={card.onClick ? 'button' : undefined}
            onClick={card.onClick}
            className={`flex w-full items-center justify-between rounded-lg border-2 px-2.5 py-1.5 text-left sm:px-3 sm:py-2 ${style.card} ${
              card.onClick ? 'cursor-pointer transition hover:shadow-md' : ''
            }`}
          >
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold sm:text-xs ${style.text}`}>{card.label}</p>
              {card.subtitle ? (
                <p className="text-[10px] font-medium text-slate-500">{card.subtitle}</p>
              ) : null}
              <p className={`truncate text-base font-bold sm:text-lg ${style.text}`}>{displayValue}</p>
            </div>
            {!card.isAmount && (
              <div className={`shrink-0 rounded-md p-1.5 ${style.icon}`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            )}
          </Tag>
        )
      })}
    </div>
  )
}

export function countStatus(data, field, mapping) {
  return mapping.map((m) => ({
    ...m,
    count: data.filter((row) => {
      if (m.match) return m.match(row)
      return row[field] === m.value
    }).length,
  }))
}
