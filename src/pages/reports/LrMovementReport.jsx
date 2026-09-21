import { useMemo, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'
import {
  defaultReportFilters,
  toReportQuery,
} from '../../utils/reportQuery'

export default function LrMovementReport() {
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.lrMovement({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [
      applied.fromDate,
      applied.toDate,
      applied.status,
      applied.vehicle,
      applied.lrNumber,
      applied.consignor,
      applied.consignee,
      applied.driver,
      applied.origin,
      applied.destination,
      applied.currentLocation,
      applied.movementType,
    ],
  )

  const columns = [
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'LR Date' },
    { key: 'bookingNo', label: 'Booking No.', render: (r) => r.bookingNo || r.bookingId || '—' },
    { key: 'vehicleNo', label: 'Vehicle No.', render: (r) => r.vehicleNo || r.vehicle || '—' },
    { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
    { key: 'consignor', label: 'Consignor', render: (r) => r.consignor || '—' },
    { key: 'consignee', label: 'Consignee', render: (r) => r.consignee || '—' },
    { key: 'origin', label: 'Origin', render: (r) => r.origin || '—' },
    { key: 'destination', label: 'Destination', render: (r) => r.destination || '—' },
    {
      key: 'movementType',
      label: 'Movement Type',
      render: (r) => (
        <Badge variant={r.movementType === 'Direct' ? 'warning' : 'info'}>
          {r.movementType || '—'}
        </Badge>
      ),
    },
    { key: 'fromLocation', label: 'From Location', render: (r) => r.fromLocation || '—' },
    { key: 'toLocation', label: 'To Location', render: (r) => r.toLocation || '—' },
    {
      key: 'eventName',
      label: 'Event / Movement',
      render: (r) => r.eventName || r.event || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge variant={statusVariant(r.status)}>{r.status || '—'}</Badge>,
    },
    { key: 'eventDate', label: 'Event Date' },
    { key: 'eventTime', label: 'Event Time' },
    { key: 'currentLocation', label: 'Current Location', render: (r) => r.currentLocation || '—' },
    { key: 'remarks', label: 'Remarks', render: (r) => r.remarks || '—' },
  ]

  return (
    <ERPListPage
      module="Reports"
      title="LR Movement Report"
      statusCards={[
        { label: 'LRs (filter)', color: 'violet', icon: 'Route', count: paged.summary?.lrCount ?? paged.total },
        { label: 'Events (page)', color: 'blue', icon: 'GitBranch', count: paged.summary?.eventCount ?? paged.items.length },
        { label: 'Hub (page)', color: 'green', icon: 'Package', count: paged.summary?.hubCount ?? 0 },
        { label: 'Direct (page)', color: 'orange', icon: 'Truck', count: paged.summary?.directCount ?? 0 },
      ]}
      showActions={false}
      searchPlaceholder="LR No., booking, vehicle, driver, route..."
      searchKeys={['lrNumber', 'bookingNo', 'vehicleNo', 'driver', 'consignor', 'consignee', 'eventName', 'status']}
      columns={columns}
      sortKey="eventDate"
      filterRow={(
        <ReportFilterRow
          showStatus
          showVehicle
          showMovementFilters
          value={filters}
          onChange={setFilters}
          onApply={(next) => {
            setApplied(toReportQuery(next))
            paged.setPage(1)
          }}
          title="LR Movement Filters"
        />
      )}
      {...serverListProps(paged)}
    />
  )
}
