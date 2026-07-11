import ERPPageTitle from './ERPPageTitle'

/** Form, detail & report pages — title bar + scrollable content panel */
export default function ERPContentPage({ module, title, toolbar, children }) {
  return (
    <div className="flex min-h-full flex-col">
      <ERPPageTitle module={module} title={title} />
      <div className="flex flex-col rounded-lg border border-primary/20 bg-white shadow-sm dark:bg-slate-900">
        {toolbar && (
          <div className="shrink-0 border-b border-primary/15 px-2 py-2 sm:px-3">{toolbar}</div>
        )}
        <div className="p-2 sm:p-3">{children}</div>
      </div>
    </div>
  )
}
