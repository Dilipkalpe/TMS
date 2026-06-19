import ERPPageTitle from './ERPPageTitle'

/** Form, detail & report pages — title bar + scrollable content panel */
export default function ERPContentPage({ module, title, toolbar, children }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ERPPageTitle module={module} title={title} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-primary/20 bg-white shadow-sm dark:bg-slate-900">
        {toolbar && (
          <div className="shrink-0 border-b border-primary/15 px-2 py-2 sm:px-3">{toolbar}</div>
        )}
        <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">{children}</div>
      </div>
    </div>
  )
}
