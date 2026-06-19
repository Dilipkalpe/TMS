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
  slate: {
    card: 'border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
}

export default function StatusSummaryCards({ cards = [] }) {
  if (!cards.length) return null

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {cards.map((card) => {
        const Icon = Icons[card.icon] || Icons.Circle
        const style = colorStyles[card.color] || colorStyles.blue
        return (
          <div
            key={card.label}
            className={`flex items-center justify-between rounded-lg border-2 px-3 py-2.5 sm:px-4 sm:py-3 ${style.card}`}
          >
            <div>
              <p className={`text-xs font-semibold sm:text-sm ${style.text}`}>{card.label}</p>
              <p className={`text-xl font-bold sm:text-2xl ${style.text}`}>{card.count}</p>
            </div>
            <div className={`rounded-lg p-2 ${style.icon}`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
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
