import ERPPageTitle from './ERPPageTitle'

export default function ERPContentPage({ module, title, toolbar, children, report = false, fillViewport = false }) {
  return (
    <div className={`flex w-full flex-col ${fillViewport ? 'h-full min-h-0 flex-1 overflow-hidden' : 'min-h-full'} ${report ? 'min-h-0 flex-1' : ''}`}>
      <ERPPageTitle module={module} title={title} />
      <div
        className={`flex flex-col rounded-lg border border-primary/20 bg-white shadow-sm dark:bg-slate-900 ${
          fillViewport ? 'min-h-0 flex-1 overflow-hidden' : 'flex-1'
        }`}
      >
        {toolbar && (
          <div className="shrink-0 border-b border-primary/15 px-2 py-2 sm:px-3">{toolbar}</div>
        )}
        <div className={`${fillViewport ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-1 sm:p-2' : `p-2 sm:p-3 ${report ? 'min-h-0' : ''}`}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
