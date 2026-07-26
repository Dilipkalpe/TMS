import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { freightRatesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function FreightRateList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => freightRatesApi.list(buildListParams({ page, pageSize, search })),
    [],
  )

  const columns = [
    { key: 'fromCity', label: 'From' },
    { key: 'toCity', label: 'To' },
    { key: 'branchName', label: 'Branch', render: (r) => r.branchName || '—' },
    { key: 'vehicleType', label: 'Vehicle Type' },
    { key: 'customerId', label: 'Customer Id' },
    { key: 'rateAmount', label: 'Rate', render: (r) => formatCurrency(r.rateAmount) },
    { key: 'rateUnit', label: 'Unit' },
    { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? 'Yes' : 'No') },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate(addRecordRoutes.freightRates)}
      module="Freight Rates"
      title="Freight Rate Master"
      statusCards={[{ label: 'Total Rates', color: 'blue', icon: 'IndianRupee', count: paged.total }]}
      searchPlaceholder="From, to, vehicle type..."
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="fromCity"
      onRowClick={(r) => navigate(`/freight-rates/${r.id}`)}
      onEdit={(r) => navigate(`/freight-rates/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete rate ${r.fromCity} → ${r.toCity}?`)) return
        try {
          await freightRatesApi.remove(r.id)
          toast({ title: 'Deleted', type: 'success' })
          paged.refresh()
        } catch (err) {
          toast({ title: 'Delete failed', message: err.message, type: 'error' })
        }
      }}
      exportFilename="freight-rates-export.csv"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      searchValue={paged.search}
    />
  )
}
