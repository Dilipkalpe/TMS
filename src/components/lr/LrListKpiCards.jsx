import * as Icons from 'lucide-react'

const styles = {
  blue: {
    card: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white',
    label: 'text-blue-800',
    value: 'text-blue-900',
    icon: 'bg-blue-100 text-blue-600',
  },
  orange: {
    card: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white',
    label: 'text-orange-800',
    value: 'text-orange-900',
    icon: 'bg-orange-100 text-orange-600',
  },
  green: {
    card: 'border-green-200 bg-gradient-to-br from-green-50 to-white',
    label: 'text-green-800',
    value: 'text-green-900',
    icon: 'bg-green-100 text-green-600',
  },
  violet: {
    card: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white',
    label: 'text-violet-800',
    value: 'text-violet-900',
    icon: 'bg-violet-100 text-violet-600',
  },
  teal: {
    card: 'border-teal-200 bg-gradient-to-br from-teal-50 to-white',
    label: 'text-teal-800',
    value: 'text-teal-900',
    icon: 'bg-teal-100 text-teal-600',
  },
}

export default function LrListKpiCards({ cards = [] }) {
  if (!cards.length) return null

  return (
    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-5 lg:gap-2">
      {cards.map((card) => {
        const Icon = Icons[card.icon] || Icons.Circle
        const s = styles[card.color] || styles.blue
        const Tag = card.onClick ? 'button' : 'div'
        const value = typeof card.count === 'number'
          ? card.count.toLocaleString('en-IN')
          : card.count

        return (
          <Tag
            key={card.label}
            type={card.onClick ? 'button' : undefined}
            onClick={card.onClick}
            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2 ${s.card} ${
              card.onClick ? 'cursor-pointer transition hover:shadow-md' : ''
            }`}
          >
            <div className="min-w-0 text-left">
              <p className={`text-[11px] font-semibold sm:text-xs ${s.label}`}>{card.label}</p>
              {card.subtitle ? (
                <p className="text-[10px] text-slate-500">{card.subtitle}</p>
              ) : null}
              <p className={`truncate text-base font-bold sm:text-lg ${s.value}`}>{value}</p>
            </div>
            <div className={`ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${s.icon}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </Tag>
        )
      })}
    </div>
  )
}
