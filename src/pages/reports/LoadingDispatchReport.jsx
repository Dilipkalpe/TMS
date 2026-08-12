import { useMemo, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function LoadingDispatchReport() {
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.loadingDispatch({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate, applied.workflow],
  )

  const dispatched = paged.items.filter((r) => r.dispatched).length

  const columns = [
    { key: 'sheetNumber', label: 'Sheet No.' },
    { key: 'lrNumber', label: 'LR No.' },
    {
      key: 'workflowLabel',
      label: 'Workflow',
      render: (r) => (
        <Badge variant={r.workflow === 'booking' ? 'info' : 'warning'}>
          {r.workflowLabel || '—'}
        </Badge>
      ),
    },
    { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
    { key: 'loadingAt', label: 'Loading At' },
    { key: 'loadingLocation', label: 'Location', render: (r) => r.loadingLocation || '—' },
    { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
    { key: 'route', label: 'Route', render: (r) => r.route || '—' },
    { key: 'quantityTons', label: 'Qty (T)', render: (r) => r.quantityTons ?? '—' },
    { key: 'loadingStatus', label: 'Loading', render: (r) => r.loadingStatus || '—' },
    {
      key: 'dispatched',
      label: 'Dispatch',
      render: (r) => (
        <Badge variant={r.dispatched ? 'green' : 'orange'}>
          {r.dispatched ? 'Dispatched' : 'Pending'}
        </Badge>
      ),
    },
    { key: 'stage', label: 'LR Stage', render: (r) => <Badge variant={statusVariant(r.lrStatus)}>{r.stage || r.lrStatus || '—'}</Badge> },
  ]

  return (
    <ERPListPage
      module="Reports"
      title="Loading & Dispatch Report"
      statusCards={[
        { label: 'Sheets', color: 'blue', icon: 'Package', count: paged.total },
        { label: 'On page dispatched', color: 'green', icon: 'Truck', count: dispatched },
        { label: 'On page pending', color: 'orange', icon: 'Clock', count: paged.items.length - dispatched },
      ]}
      showActions={false}
      searchPlaceholder="Sheet no., LR, vehicle..."
      columns={columns}
      sortKey="loadingAt"
      filterRow={(
        <ReportFilterRow
          showWorkflow
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
