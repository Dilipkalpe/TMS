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

export default function VehicleReport() {
  const navigate = useNavigate()
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.vehicles({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate],
  )

  const columns = [
    { key: 'number', label: 'Vehicle' },
    { key: 'type', label: 'Type', render: (r) => r.type || '—' },
    { key: 'trips', label: 'LRs' },
    { key: 'inTransit', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'revenue', label: 'Freight', render: (r) => formatCurrency(r.revenue) },
    { key: 'utilization', label: 'Delivery %', render: (r) => `${r.utilization ?? 0}%` },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Vehicle Report"
      statusCards={registerStatusCards('Vehicles', paged.total, 'blue', 'Truck')}
      showActions={false}
      searchPlaceholder="Vehicle no...."
      searchKeys={['number', 'type']}
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
