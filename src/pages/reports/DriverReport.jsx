import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function DriverReport() {
  const navigate = useNavigate()
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.drivers({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate],
  )

  const columns = [
    { key: 'name', label: 'Driver' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'trips', label: 'LRs' },
    { key: 'inTransit', label: 'In Transit' },
    { key: 'revenue', label: 'Freight', render: (r) => formatCurrency(r.revenue) },
    { key: 'salary', label: 'Salary', render: (r) => formatCurrency(r.salary) },
    { key: 'rating', label: 'Rating', render: (r) => (r.rating ? `⭐ ${r.rating}` : '—') },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Driver Report"
      statusCards={registerStatusCards('Drivers', paged.total, 'violet', 'UserCircle')}
      showActions={false}
      searchPlaceholder="Driver name..."
      searchKeys={['name', 'phone']}
      columns={columns}
      sortKey="trips"
      filterRow={(
        <ReportFilterRow
          value={filters}
          onChange={setFilters}
          onApply={() => {
            setApplied(toReportQuery(filters))
            paged.setPage(1)
          }}
        />
      )}
      {...serverListProps(paged)}
    />
  )
}
