import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/operations/gps', label: 'Live Map', end: true },
  { to: '/operations/gps/geofences', label: 'Geofences', end: false },
  { to: '/operations/gps/alerts', label: 'Alerts', end: false },
]

export default function GpsNav() {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-primary text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
