import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { ArrowLeft } from 'lucide-react'
import LrEntryActionButtons from '../lr/LrEntryActionButtons'

export function OpsPageHeader({ title, subtitle, breadcrumb, status, statusVariant = 'Paid', actions }) {
  return (
    <div className="mb-2 flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-primary/15 pb-2">
      <div>
        {breadcrumb ? <p className="text-[10px] text-primary">{breadcrumb}</p> : null}
        <h1 className="text-base font-bold uppercase tracking-wide text-primary sm:text-lg">{title}</h1>
        {subtitle ? <p className="text-xs font-medium text-primary/70">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {status && <Badge variant={statusVariant}>{status}</Badge>}
        {actions}
      </div>
    </div>
  )
}

export function OpsSection({ title, icon: Icon, children, className = '', action }) {
  return (
    <section className={`lr-entry-section lr-entry-compact ${className}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {Icon && <Icon className="h-3 w-3" />}
          {title}
        </p>
        {action}
      </div>
      {children}
    </section>
  )
}

export function OpsFooter({ onBack, onCancel, onSave, onSavePrint, onPreview, onClear, onComplete, saving, extra }) {
  const prepend = (
    <>
      {onBack ? (
        <Button size="sm" variant="outline" icon={ArrowLeft} type="button" onClick={onBack}>Back</Button>
      ) : null}
      {extra}
      {onComplete ? (
        <Button size="sm" type="button" onClick={onComplete} disabled={saving} className="bg-green-600 hover:bg-green-700">
          Loading Complete
        </Button>
      ) : null}
    </>
  )

  return (
    <div className="lr-entry-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
      <LrEntryActionButtons
        saving={saving}
        onSave={onSave}
        onCancel={onCancel}
        onSavePrint={onSavePrint}
        onClear={onClear}
        onPreview={onPreview}
        printLabel="Save & Print"
        prependActions={prepend}
      />
    </div>
  )
}

export function OpsGrid({ cols = 2, children, className = '' }) {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
  }[cols] || 'grid-cols-2'
  return <div className={`grid gap-1 ${colClass} ${className}`}>{children}</div>
}

export function OpsStatusPanel({ status, rows = [] }) {
  return (
    <div className="lr-entry-section lr-entry-compact">
      <p className="mb-1 text-[10px] font-semibold uppercase text-primary">Status</p>
      <Badge variant="Paid" className="mb-2">{status}</Badge>
      <dl className="space-y-0.5 text-[10px]">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function OpsLrTable({ rows, onRemove, onAdd, totals }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="lr-entry-items-scroll">
        <table className="w-full min-w-[800px] text-[11px]">
          <thead className="sticky top-0 bg-primary text-white">
            <tr>
              <th className="px-1 py-1">#</th>
              <th className="px-1 py-1">LR No.</th>
              <th className="px-1 py-1">Date</th>
              <th className="px-1 py-1">Customer</th>
              <th className="px-1 py-1">Consignee</th>
              <th className="px-1 py-1">Destination</th>
              <th className="px-1 py-1">Pkgs</th>
              <th className="px-1 py-1">Act.Wt</th>
              <th className="px-1 py-1">Chg.Wt</th>
              {onRemove && <th className="px-1 py-1" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.lrNumber || i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-1 py-0.5">{i + 1}</td>
                <td className="px-1 py-0.5 font-semibold text-primary">{r.lrNumber}</td>
                <td className="px-1 py-0.5">{r.lrDate}</td>
                <td className="px-1 py-0.5">{r.customer}</td>
                <td className="px-1 py-0.5">{r.consignee}</td>
                <td className="px-1 py-0.5">{r.destination}</td>
                <td className="px-1 py-0.5">{r.packages}</td>
                <td className="px-1 py-0.5">{r.actualWeight}</td>
                <td className="px-1 py-0.5">{r.chargedWeight}</td>
                {onRemove && (
                  <td className="px-1 py-0.5">
                    <button type="button" className="text-red-500" onClick={() => onRemove(i)}>×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot className="bg-slate-50 font-semibold dark:bg-slate-900">
              <tr>
                <td colSpan={6} className="px-1 py-1 text-right">Total</td>
                <td className="px-1 py-1">{totals.packages}</td>
                <td className="px-1 py-1">{totals.actualWeight}</td>
                <td className="px-1 py-1">{totals.chargedWeight}</td>
                {onRemove && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {onAdd && (
        <div className="mt-1 shrink-0">
          <Button size="sm" variant="outline" onClick={onAdd}>+ Add LR</Button>
        </div>
      )}
    </div>
  )
}
