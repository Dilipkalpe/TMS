import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { useApiResource } from '../../hooks/useApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function CashFlowReport() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useApiResource(() => reportsApi.cashFlow())
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTitle, setDetailTitle] = useState('')
  const [detailRows, setDetailRows] = useState([])

  const openDetails = async (row) => {
    if (!row.monthNo) return
    setDetailTitle(`${row.month} ${row.year ?? new Date().getFullYear()} — Cash entries`)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await reportsApi.cashFlowDetails({ month: row.monthNo, year: row.year ?? new Date().getFullYear() })
      setDetailRows(res?.entries ?? [])
    } catch {
      setDetailRows([])
    } finally {
      setDetailLoading(false)
    }
  }

  const detailColumns = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'mode', label: 'Mode' },
    { key: 'refNo', label: 'Ref No', render: (r) => r.refNo || '-' },
    { key: 'particular', label: 'Particular' },
    { key: 'amount', label: 'Amount', render: (r) => (
      <span className={r.type === 'Inflow' ? 'text-green-600' : 'text-red-500'}>
        {formatCurrency(r.amount)}
      </span>
    ) },
  ]

  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'inflow', label: 'Inflow', render: (r) => <span className="text-green-600">{formatCurrency(r.inflow)}</span> },
    { key: 'outflow', label: 'Outflow', render: (r) => <span className="text-red-500">{formatCurrency(r.outflow)}</span> },
    { key: 'net', label: 'Net Cash Flow', render: (r) => <span className={`font-semibold ${r.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(r.net)}</span> },
    {
      key: 'details',
      label: 'Details',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => openDetails(r)}>View entries</Button>
      ),
    },
  ]

  return (
    <>
      <ERPListPage
        onAdd={() => navigate(addRecordRoutes.voucher)}
        module="Reports"
        title="Cash Flow Report"
        statusCards={registerStatusCards('Total Months', data.length, 'blue', 'Banknote')}
        showActions={false}
        searchKeys={['month']}
        columns={columns}
        data={data}
        sortKey="month"
        defaultSortDir="asc"
        loading={loading}
        error={error}
        onRefreshExternal={refresh}
        filterRow={<ReportFilterRow />}
      />
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detailTitle} size="xl">
        {detailLoading ? (
          <p className="text-sm text-slate-500">Loading cash entries…</p>
        ) : detailRows.length === 0 ? (
          <p className="text-sm text-slate-500">No cash entries for this month.</p>
        ) : (
          <ERPDataTable columns={detailColumns} data={detailRows} showSerial showActions={false} />
        )}
      </Modal>
    </>
  )
}
