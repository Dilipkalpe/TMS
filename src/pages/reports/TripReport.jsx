import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

function stageCards(summary, total) {
  const byStage = summary?.byStage ?? []
  const pick = (...names) => byStage
    .filter((x) => names.includes(x.stage) || names.includes(x.status))
    .reduce((s, x) => s + (x.count ?? 0), 0)
  return [
    { label: 'Total LRs', color: 'violet', icon: 'Route', count: summary?.total ?? total },
    { label: 'Booking → LR', color: 'blue', icon: 'FileText', count: summary?.bookingCount ?? 0 },
    { label: 'Direct LR', color: 'orange', icon: 'FileSpreadsheet', count: summary?.directCount ?? 0 },
    { label: 'At Hub', color: 'green', icon: 'GitBranch', count: pick('Hub Received', 'Available for Re-Manifest') },
  ]
}

export default function TripReport() {
  const navigate = useNavigate()
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.trips({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate, applied.status, applied.vehicle, applied.workflow],
  )

  const columns = [
    { key: 'lr', label: 'LR No.' },
    { key: 'date', label: 'LR Date' },
    {
      key: 'workflowLabel',
      label: 'Workflow',
      render: (r) => (
        <Badge variant={r.workflow === 'booking' ? 'info' : 'warning'}>
          {r.workflowLabel || (r.bookingId ? 'Booking' : 'Direct LR')}
        </Badge>
      ),
    },
    { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
    { key: 'stage', label: 'Stage', render: (r) => <Badge variant={statusVariant(r.status)}>{r.stage || r.status}</Badge> },
    { key: 'route', label: 'Route' },
    { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
    { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
    { key: 'currentHub', label: 'Hub', render: (r) => r.currentHub || '—' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'expense', label: 'Expense', render: (r) => formatCurrency(r.expense) },
    { key: 'profit', label: 'Profit', render: (r) => (
      <span className={`font-semibold ${(r.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {formatCurrency(r.profit)}
      </span>
    ) },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.bookings)}
      module="Reports"
      title="LR / Trip Register"
      statusCards={stageCards(paged.summary, paged.total)}
      showActions={false}
      searchPlaceholder="LR No., booking, vehicle, driver..."
      searchKeys={['lr', 'bookingId', 'vehicle', 'driver', 'route', 'stage', 'workflowLabel']}
      columns={columns}
      sortKey="date"
      filterRow={(
        <ReportFilterRow
          showStatus
          showVehicle
          showWorkflow
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
