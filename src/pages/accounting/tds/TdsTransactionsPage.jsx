import { useCallback, useEffect, useState } from 'react'
import ERPContentPage from '../../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input, { Select } from '../../../components/ui/Input'
import ERPDataTable from '../../../components/ui/ERPDataTable'
import { tdsApi } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import { formatCurrency } from '../../../components/ui/ReportFilters'
import { RefreshCw, Undo2 } from 'lucide-react'

export default function TdsTransactionsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    direction: '',
    status: '',
    financialYear: '',
    from: '',
    to: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.direction) params.direction = filters.direction
      if (filters.status) params.status = filters.status
      if (filters.financialYear) params.financialYear = filters.financialYear
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      setRows(await tdsApi.transactions(params) || [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  useEffect(() => { load() }, [load])

  const handleReverse = async (row) => {
    if (row.status === 'REVERSED' || row.reversalOfTxnId) return
    if (!window.confirm(`Reverse TDS txn for ${row.partyName || row.partyId}?`)) return
    try {
      await tdsApi.reverse(row.id, { remarks: 'Reversed from UI' })
      toast({ title: 'Reversed', type: 'success' })
      await load()
    } catch (err) {
      toast({ title: 'Reverse failed', message: err.message, type: 'error' })
    }
  }

  const columns = [
    { key: 'transactionDate', label: 'Date' },
    { key: 'direction', label: 'Direction' },
    { key: 'sectionCode', label: 'Section' },
    { key: 'partyName', label: 'Party' },
    { key: 'baseAmount', label: 'Base', render: (r) => formatCurrency(r.baseAmount) },
    { key: 'tdsAmount', label: 'TDS', render: (r) => formatCurrency(r.tdsAmount) },
    { key: 'ratePercent', label: 'Rate %' },
    { key: 'sourceRef', label: 'Source' },
    { key: 'financialYear', label: 'FY' },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        r.status === 'POSTED' && !r.reversalOfTxnId ? (
          <Button size="sm" variant="outline" icon={Undo2} onClick={() => handleReverse(r)}>Reverse</Button>
        ) : null
      ),
    },
  ]

  return (
    <ERPContentPage module="Accounting" title="TDS Transactions">
      <Card>
        <CardHeader title="Filters" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Direction"
            options={[{ value: '', label: 'All' }, { value: 'PAYABLE', label: 'Payable' }, { value: 'RECEIVABLE', label: 'Receivable' }]}
            value={filters.direction}
            onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
          />
          <Select
            label="Status"
            options={[{ value: '', label: 'All' }, { value: 'POSTED', label: 'Posted' }, { value: 'REVERSED', label: 'Reversed' }]}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          />
          <Input label="Financial Year" value={filters.financialYear} onChange={(e) => setFilters((f) => ({ ...f, financialYear: e.target.value }))} placeholder="2025-26" />
          <Input label="From" type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          <Input label="To" type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </div>
        <Button className="mt-3" variant="outline" icon={RefreshCw} onClick={load}>Refresh</Button>
      </Card>
      <Card className="mt-4" padding={false}>
        {loading ? <p className="px-4 py-4 text-sm text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={rows} showActions={false} selectable={false} exportFilename="tds-transactions" />
        )}
      </Card>
    </ERPContentPage>
  )
}
