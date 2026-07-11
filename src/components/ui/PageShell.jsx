import PageHeader from './PageHeader'

/**
 * Page wrapper — scrolls with the main content area when content is tall.
 */
export default function PageShell({ title, subtitle, actions, filters, summary, children }) {
  return (
    <div className="flex min-h-full flex-col gap-2 sm:gap-3">
      <PageHeader title={title} subtitle={subtitle} actions={actions} compact />
      {filters && <div className="shrink-0">{filters}</div>}
      {summary && <div className="shrink-0">{summary}</div>}
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
