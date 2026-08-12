import { useMemo, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function DeliveryPodReport() {
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.deliveryPod({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate, applied.status, applied.workflow],
  )

  const columns = [
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'LR Date' },
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
    { key: 'stage', label: 'Stage', render: (r) => <Badge variant={statusVariant(r.status)}>{r.stage || r.status}</Badge> },
    { key: 'consignee', label: 'Consignee', render: (r) => r.consignee || '—' },
    { key: 'route', label: 'Route' },
    { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
    { key: 'deliveryDate', label: 'Delivery Date', render: (r) => r.deliveryDate || '—' },
    { key: 'receiverName', label: 'Receiver', render: (r) => r.receiverName || '—' },
    {
      key: 'packages',
      label: 'Packages',
      render: (r) => (r.packagesTotal == null ? '—' : `${r.packagesReceived ?? 0}/${r.packagesTotal}`),
    },
    { key: 'podNo', label: 'POD No.', render: (r) => r.podNo || '—' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
  ]

  return (
    <ERPListPage
      module="Reports"
      title="Delivery & POD Report"
      statusCards={[
        { label: 'Total', color: 'green', icon: 'PackageCheck', count: paged.total },
        { label: 'With POD (page)', color: 'blue', icon: 'FileCheck', count: paged.items.filter((r) => r.podNo || r.stage === 'POD').length },
        { label: 'Delivery only (page)', color: 'orange', icon: 'Truck', count: paged.items.filter((r) => r.stage === 'Delivery').length },
      ]}
      showActions={false}
      searchPlaceholder="LR No., consignee, destination..."
      columns={columns}
      sortKey="lrDate"
      filterRow={(
        <ReportFilterRow
          showStatus="delivery"
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
