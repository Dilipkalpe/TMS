import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import { registerStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function CustomerReport() {
  const navigate = useNavigate()
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.customers({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate],
  )

  const columns = [
    { key: 'name', label: 'Customer / Consignor' },
    { key: 'trips', label: 'Total LRs' },
    { key: 'bookingLrs', label: 'Booking LRs', render: (r) => r.bookingLrs ?? 0 },
    { key: 'directLrs', label: 'Direct LRs', render: (r) => r.directLrs ?? 0 },
    { key: 'open', label: 'Open LRs' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'outstanding', label: 'Booking Outstanding', render: (r) => formatCurrency(r.outstanding) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.voucher)}
      module="Reports"
      title="Customer Report"
      statusCards={registerStatusCards('Customers', paged.total, 'green', 'Users')}
      showActions={false}
      searchPlaceholder="Customer name..."
      searchKeys={['name']}
      columns={columns}
      sortKey="freight"
      filterRow={(
        <ReportFilterRow
          value={filters}
          onChange={setFilters}
          onApply={(next) => {
            setApplied(toReportQuery(next))
            paged.setPage(1)
          }}
        />
      )}
      {...serverListProps(paged)}
    />
  )
}
