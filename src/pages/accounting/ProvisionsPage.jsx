import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import TablePagination from '../../components/ui/TablePagination'
import LookupSelect from '../../components/ui/LookupSelect'
import { bookingFinanceApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { Plus, Loader2 } from 'lucide-react'

export default function ProvisionsPage() {
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      bookingFinanceApi.provisions({
        ...buildListParams({ page, pageSize, search }),
        ...(filter && filter !== '(All)' ? { type: filter } : {}),
      }),
    [],
  )
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    provisionType: 'Vendor',
    partyName: '',
    partyId: '',
    amount: '',
    referenceNo: '',
    remarks: '',
  })

  const columns = [
    { key: 'provisionDate', label: 'Date' },
    { key: 'provisionType', label: 'Type' },
    { key: 'partyName', label: 'Party / Vendor' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'referenceNo', label: 'Reference' },
    { key: 'isReversed', label: 'Status', render: (r) => (r.isReversed ? 'Reversed' : 'Active') },
  ]

  const handleSave = async () => {
    if (!form.partyName?.trim() || !Number(form.amount)) {
      toast({ title: 'Validation', message: 'Party name and amount are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await bookingFinanceApi.createProvision({ ...form, amount: Number(form.amount) })
      toast({ title: 'Provision saved', type: 'success' })
      setForm({ provisionType: 'Vendor', partyName: '', partyId: '', amount: '', referenceNo: '', remarks: '' })
      paged.refresh()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Accounting" title="Vendor & Party Provisions">
      <Card>
        <CardHeader title="Create Provision" subtitle="Vendor provision or Party (customer) provision" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Type" options={['Vendor', 'Party']} value={form.provisionType} onChange={(e) => setForm((f) => ({ ...f, provisionType: e.target.value, partyName: '', partyId: '' }))} />
          {form.provisionType === 'Vendor' ? (
            <LookupSelect label="Vendor" type="vendors" value={form.partyName} onChange={(v) => setForm((f) => ({ ...f, partyName: v }))} placeholder="Search vendor…" />
          ) : (
            <LookupSelect label="Customer / Party" type="customers" value={form.partyName} onChange={(v) => setForm((f) => ({ ...f, partyName: v }))} placeholder="Search customer…" />
          )}
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input label="Reference" value={form.referenceNo} onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))} />
          <div className="sm:col-span-2">
            <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
        </div>
        <Button className="mt-3" icon={saving ? Loader2 : Plus} disabled={saving} onClick={handleSave}>Save Provision</Button>
      </Card>

      <Card className="mt-4" padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <CardHeader title="Provision Register" />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              options={['(All)', 'Vendor', 'Party']}
              value={paged.filter}
              onChange={(e) => paged.setFilter(e.target.value)}
            />
            <Input
              placeholder="Search party, reference…"
              value={paged.search}
              onChange={(e) => paged.setSearch(e.target.value)}
            />
          </div>
        </div>
        <p className="px-4 py-1 text-xs text-slate-500">{paged.total.toLocaleString('en-IN')} rows found</p>
        {paged.error && <p className="px-4 py-2 text-sm text-red-500">{paged.error}</p>}
        {paged.loading ? <p className="px-4 py-4 text-sm text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={paged.items} showActions={false} page={1} pageSize={paged.items.length || paged.pageSize} />
        )}
        <TablePagination
          page={paged.page}
          totalPages={Math.max(1, Math.ceil(Math.max(paged.total, 1) / paged.pageSize))}
          totalRecords={paged.total}
          pageSize={paged.pageSize}
          hasMore={paged.hasMore}
          totalIsApproximate={paged.totalIsApproximate}
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
        />
      </Card>
    </ERPContentPage>
  )
}
