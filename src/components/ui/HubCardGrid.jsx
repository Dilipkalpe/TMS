import { HubModuleGrid } from './CommandCenterHub'
import { withHubTheme } from '../../config/hubTheme'

function filterCards(cards, canAccessPath) {
  if (!canAccessPath) return cards
  return (cards || []).filter((card) => canAccessPath(card.path))
}

/**
 * App-wide hub card grid — Option B command-center tiles.
 * Prefer CommandCenterHub for banner + KPI layouts.
 */
export default function HubCardGrid({
  cards,
  sections,
  canAccessPath,
  iconFallback = 'FileText',
  columns = 'xl',
}) {
  if (sections?.length) {
    return (
      <div className="space-y-8">
        {sections.map((section) => {
          const visible = withHubTheme(filterCards(section.cards || [], canAccessPath))
          if (!visible.length) return null
          return (
            <div key={section.title || section.description} className="space-y-3">
              {section.title ? (
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{section.title}</h2>
              ) : null}
              {section.description ? (
                <p className="text-sm text-slate-500">{section.description}</p>
              ) : null}
              <HubModuleGrid
                cards={visible}
                iconFallback={iconFallback}
                columns={columns}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const visible = withHubTheme(filterCards(cards || [], canAccessPath))
  if (!visible.length) return null
  return (
    <HubModuleGrid
      cards={visible}
      iconFallback={iconFallback}
      columns={columns}
    />
  )
}
