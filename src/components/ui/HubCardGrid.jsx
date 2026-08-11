import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import Card from './Card'

function filterCards(cards, canAccessPath) {
  if (!canAccessPath) return cards
  return cards.filter((card) => canAccessPath(card.path))
}

function HubCards({ cards, iconFallback = 'FileText', columns = 'xl' }) {
  const gridClass =
    columns === 'lg'
      ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  return (
    <div className={gridClass}>
      {cards.map((item) => {
        const Icon = Icons[item.icon] || Icons[iconFallback] || Icons.FileText
        return (
          <Link key={item.path} to={item.path} className="block h-full">
            <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

/**
 * Reports-style hub card grid.
 * @param {{ cards?: Array, sections?: Array<{ title: string, description?: string, cards: Array }>, canAccessPath?: (path: string) => boolean, iconFallback?: string, columns?: 'lg' | 'xl' }} props
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
          const visible = filterCards(section.cards || [], canAccessPath)
          if (!visible.length) return null
          return (
            <div key={section.title}>
              <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{section.title}</h2>
              {section.description && (
                <p className="mb-4 text-sm text-slate-500">{section.description}</p>
              )}
              <HubCards cards={visible} iconFallback={iconFallback} columns={columns} />
            </div>
          )
        })}
      </div>
    )
  }

  const visible = filterCards(cards || [], canAccessPath)
  if (!visible.length) return null
  return <HubCards cards={visible} iconFallback={iconFallback} columns={columns} />
}
