import PageHeader from './PageHeader'

/**
 * Viewport-fit page wrapper — no document scroll; content scrolls inside panels only.
 */
export default function PageShell({ title, subtitle, actions, filters, summary, children }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden sm:gap-3">
      <PageHeader title={title} subtitle={subtitle} actions={actions} compact />
      {filters && <div className="shrink-0">{filters}</div>}
      {summary && <div className="shrink-0">{summary}</div>}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
