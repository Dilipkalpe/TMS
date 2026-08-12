import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import ERPContentPage from './ERPContentPage'
import { withHubTheme } from '../../config/hubTheme'

export const HUB_TONE_CLASSES = {
  blue: { icon: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  sky: { icon: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300', chip: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  teal: { icon: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300', chip: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  indigo: { icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300', chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
  amber: { icon: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', chip: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  violet: { icon: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  green: { icon: 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300', chip: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' },
  rose: { icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  orange: { icon: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300', chip: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
  cyan: { icon: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300', chip: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' },
  stone: { icon: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300', chip: 'bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-300' },
  lime: { icon: 'bg-lime-50 text-lime-800 dark:bg-lime-950/50 dark:text-lime-300', chip: 'bg-lime-50 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300' },
  slate: { icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  ink: { icon: 'bg-slate-900 text-amber-300 dark:bg-slate-950 dark:text-amber-300', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
}

function filterCards(cards, canAccessPath) {
  if (!canAccessPath) return cards
  return (cards || []).filter((card) => canAccessPath(card.path))
}

function filterQuickActions(actions, canAccessPath) {
  if (!canAccessPath) return actions || []
  return (actions || []).filter((action) => action?.path && canAccessPath(action.path))
}

export function HubKpiCard({ label, value, hint, tone = 'default' }) {
  const valueClass =
    tone === 'ok'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-900 dark:text-slate-50'

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function HubModuleTile({ item, iconFallback = 'Layers' }) {
  const Icon = Icons[item.icon] || Icons[iconFallback] || Icons.Layers
  const tone = HUB_TONE_CLASSES[item.tone] || HUB_TONE_CLASSES.blue
  const liveChip = ['Live', 'Map', 'AI', 'Active'].includes(item.chip)

  return (
    <Link
      to={item.path}
      className="group flex h-full min-h-[128px] flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-[11px] ${tone.icon}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {item.chip ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              liveChip ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : tone.chip
            }`}
          >
            {item.chip}
          </span>
        ) : null}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-all group-hover:gap-1.5">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}

export function HubModuleGrid({ cards, canAccessPath, iconFallback = 'Layers', columns = 'xl' }) {
  const themed = withHubTheme(filterCards(cards, canAccessPath))
  const gridClass =
    columns === 'lg'
      ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  if (!themed.length) return null
  return (
    <div className={gridClass}>
      {themed.map((item) => (
        <HubModuleTile key={item.path} item={item} iconFallback={iconFallback} />
      ))}
    </div>
  )
}

/**
 * App-wide Option B hub shell: banner + optional KPIs + grouped module tiles.
 * Cards and quick actions are both gated by canAccessPath (role menus + plan features).
 */
export default function CommandCenterHub({
  module,
  title,
  eyebrow = 'Workspace',
  headline,
  description,
  quickActions = [],
  kpis = [],
  cards,
  sections,
  canAccessPath,
  iconFallback = 'Layers',
  columns = 'xl',
  children,
}) {
  const visibleQuickActions = filterQuickActions(quickActions, canAccessPath)

  const resolvedSections = (sections?.length
    ? sections.map((section) => ({
        ...section,
        cards: withHubTheme(filterCards(section.cards || [], canAccessPath)),
      }))
    : cards?.length
      ? [{ title: null, description: null, cards: withHubTheme(filterCards(cards, canAccessPath)) }]
      : []
  ).filter((s) => s.cards?.length)

  return (
    <ERPContentPage module={module} title={title}>
      <div className="space-y-5">
        {(headline || description || visibleQuickActions.length > 0 || kpis.length > 0) && (
          <div className={`grid gap-4 ${kpis.length ? 'lg:grid-cols-[1.35fr_1fr]' : ''}`}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#164a73] via-primary to-[#2a7ab0] px-5 py-5 text-white shadow-lg shadow-primary/20 sm:px-6 sm:py-6">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-accent/30 blur-[1px]"
                aria-hidden
              />
              <div className="relative z-[1]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/70">{eyebrow}</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{headline || title}</h2>
                {description ? (
                  <p className="mt-2 max-w-md text-sm text-white/85">{description}</p>
                ) : null}
                {visibleQuickActions.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {visibleQuickActions.map((action, idx) => (
                      <Link
                        key={action.path + action.label}
                        to={action.path}
                        className={
                          (action.variant === 'accent' || (action.variant == null && idx === 0))
                            ? 'rounded-[10px] bg-accent px-3.5 py-2 text-xs font-bold text-[#1a1205] transition hover:bg-amber-400'
                            : 'rounded-[10px] border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20'
                        }
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {kpis.length > 0 ? (
              <div className={`grid gap-3 ${kpis.length > 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {kpis.map((kpi) => (
                  <HubKpiCard key={kpi.label} {...kpi} />
                ))}
              </div>
            ) : null}
          </div>
        )}

        {children}

        {resolvedSections.map((section, idx) => (
          <section key={section.title || `section-${idx}`} className="space-y-3">
            {(section.title || section.description) ? (
              <div>
                {section.title ? (
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{section.title}</h3>
                ) : null}
                {section.description ? (
                  <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>
                ) : null}
              </div>
            ) : null}
            <HubModuleGrid
              cards={section.cards}
              canAccessPath={canAccessPath}
              iconFallback={iconFallback}
              columns={columns}
            />
          </section>
        ))}
      </div>
    </ERPContentPage>
  )
}
