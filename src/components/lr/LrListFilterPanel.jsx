import { Calendar, RotateCcw, Save, Search } from 'lucide-react'
import Input, { Select } from '../ui/Input'

function DateRangeField({ dateFrom, dateTo, onChangeFrom, onChangeTo }) {
  const display = dateFrom && dateTo
    ? `${formatDisplay(dateFrom)} → ${formatDisplay(dateTo)}`
    : dateFrom
      ? `${formatDisplay(dateFrom)} → …`
      : ''

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Date Range</label>
      <div className="relative flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
        <Calendar className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          readOnly
          value={display}
          placeholder="Select date range"
          className="w-full rounded-lg bg-transparent py-2 pl-9 pr-2 text-sm text-slate-700 outline-none dark:text-slate-200"
        />
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChangeFrom(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-800"
          aria-label="Date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChangeTo(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-800"
          aria-label="Date to"
        />
      </div>
    </div>
  )
}

function formatDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function SearchableField({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  )
}

export default function LrListFilterPanel({
  draftFilters,
  onChange,
  statusOptions,
  bookingTypes,
  freightTypes,
  branchOptions = ['(All)'],
  onSearch,
  onClear,
  onSave,
  inDrawer = false,
}) {
  const set = (key, value) => onChange((f) => ({ ...f, [key]: value }))
  const grid = inDrawer ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-5'

  return (
    <div className={inDrawer ? 'space-y-3' : 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-700 dark:bg-slate-900'}>
      <div className={grid}>
        <DateRangeField
          dateFrom={draftFilters.dateFrom}
          dateTo={draftFilters.dateTo}
          onChangeFrom={(v) => set('dateFrom', v)}
          onChangeTo={(v) => set('dateTo', v)}
        />
        <Input label="LR No" placeholder="LR number…" value={draftFilters.lrNo} onChange={(e) => set('lrNo', e.target.value)} />
        <SearchableField label="Customer" placeholder="Search customer…" value={draftFilters.customer} onChange={(v) => set('customer', v)} />
        <SearchableField label="Consignee" placeholder="Search consignee…" value={draftFilters.consignee} onChange={(v) => set('consignee', v)} />
        <SearchableField label="From (Origin)" placeholder="Origin city…" value={draftFilters.fromCity} onChange={(v) => set('fromCity', v)} />
        <SearchableField label="To (Destination)" placeholder="Destination…" value={draftFilters.toCity} onChange={(v) => set('toCity', v)} />
        <Input label="Vehicle No" placeholder="e.g. MH12AB1234" value={draftFilters.vehicle} onChange={(e) => set('vehicle', e.target.value)} />
        <Select label="Branch" options={branchOptions} value={draftFilters.branch} onChange={(e) => set('branch', e.target.value)} />
        <Select label="Status" options={statusOptions} value={draftFilters.status} onChange={(e) => set('status', e.target.value)} />
        <Select label="Booking Type" options={bookingTypes} value={draftFilters.bookingType} onChange={(e) => set('bookingType', e.target.value)} />
        <Select label="Freight Type" options={freightTypes} value={draftFilters.freightType} onChange={(e) => set('freightType', e.target.value)} />
      </div>

      <div className={`flex flex-wrap items-center gap-2 ${inDrawer ? 'border-t border-slate-200 pt-3 dark:border-slate-700' : 'mt-3'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark sm:flex-none"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        {onSave ? (
          <button
            type="button"
            onClick={onSave}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <Save className="h-4 w-4" />
            Save Filter
          </button>
        ) : null}
      </div>
    </div>
  )
}
