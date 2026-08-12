import { useMemo, useState } from 'react'
import ERPListPage from '../../components/ui/ERPListPage'
import ReportFilterRow from '../../components/ui/ReportFilterRow'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { reportsApi } from '../../services/api'
import { serverListProps } from '../../utils/serverListProps'
import { defaultReportFilters, toReportQuery } from '../../utils/reportQuery'

export default function HubTransferReport() {
  const initial = useMemo(() => defaultReportFilters(), [])
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(() => toReportQuery(initial))

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => reportsApi.hubTransfer({
      ...buildListParams({ page, pageSize, search }),
      ...applied,
    }),
    [applied.fromDate, applied.toDate, applied.status, applied.hubBranchId],
  )

  const columns = [
    { key: 'manifestNo', label: 'Manifest' },
    { key: 'createdAt', label: 'Date' },
    { key: 'fromHub', label: 'From Hub' },
    { key: 'toDestination', label: 'To Destination' },
    { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicle || '—' },
    { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
    { key: 'lrCount', label: 'LRs' },
    { key: 'packages', label: 'Packages' },
    { key: 'weight', label: 'Weight' },
    { key: 'dispatchAt', label: 'Dispatched', render: (r) => r.dispatchAt || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
    },
    {
      key: 'isInbound',
      label: 'Type',
      render: (r) => (r.isInbound ? 'Inbound' : 'Outbound'),
    },
  ]

  return (
    <ERPListPage
      module="Reports"
      title="Hub Transfer Report"
      statusCards={[
        { label: 'Manifests', color: 'violet', icon: 'GitBranch', count: paged.total },
        { label: 'LRs (page)', color: 'blue', icon: 'Files', count: paged.items.reduce((s, r) => s + (r.lrCount ?? 0), 0) },
        { label: 'Dispatched (page)', color: 'green', icon: 'Truck', count: paged.items.filter((r) => r.status === 'Dispatched' || r.status === 'Completed').length },
      ]}
      showActions={false}
      searchPlaceholder="Manifest, hub, destination, vehicle..."
      columns={columns}
      sortKey="createdAt"
      filterRow={(
        <ReportFilterRow
          showStatus="hub"
          showHub
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
