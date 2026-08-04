import * as Icons from 'lucide-react'

export default function LrStatusTabs({ tabs, selectedStage, counts = {}, totalCount = 0, onSelect }) {
  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = Icons[tab.icon] || Icons.Circle
          const active = selectedStage === tab.stage
          const count = tab.stage === 'lr-list'
            ? (totalCount || counts.totalLR || 0)
            : (counts[tab.stage] ?? 0)
          return (
            <button
              key={tab.stage}
              type="button"
              onClick={() => onSelect(tab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                active
                  ? 'bg-white text-primary shadow-sm dark:bg-slate-800'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${
                active ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
