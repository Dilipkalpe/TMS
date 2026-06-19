import Card, { CardHeader } from './Card'

export default function TableCard({ title, subtitle, action, children, className = '' }) {
  return (
    <Card
      padding={false}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`}
    >
      {(title || subtitle) && (
        <div className="shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800 sm:px-4 sm:py-3">
          <CardHeader title={title} subtitle={subtitle} action={action} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </Card>
  )
}

/** Scrollable panel for forms / multi-section pages */
export function ScrollPanel({ children, className = '' }) {
  return (
    <div className={`min-h-0 flex-1 overflow-auto ${className}`}>
      {children}
    </div>
  )
}
