import { useState } from 'react'

export default function Tabs({ tabs, defaultTab, fill = false }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const current = tabs.find((t) => t.id === active)

  return (
    <div className={fill ? 'flex h-auto min-h-0 flex-col overflow-visible lg:h-full lg:overflow-hidden' : ''}>
      <div className="mb-2 flex shrink-0 gap-1 overflow-x-auto mobile-scroll-x rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm ${
              active === tab.id
                ? 'bg-white text-primary shadow-sm dark:bg-slate-800'
                : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={fill ? 'report-tabs-panel min-h-0 flex-1 overflow-visible lg:overflow-hidden' : ''}>
        <div className={fill ? 'min-h-0 flex-1 overflow-visible lg:overflow-hidden' : ''}>{current?.content}</div>
      </div>
    </div>
  )
}
