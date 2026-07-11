import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { lrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'

export default function LRList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      lrApi.list(buildListParams({ page, pageSize, search, filter, filterKey: 'paymentType' })),
    [],
  )

  const columns = [
    { key: 'lrNumber', label: 'LR No.' },
    { key: 'lrDate', label: 'Date' },
    { key: 'consignor', label: 'Consignor' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'freight', label: 'Freight', render: (r) => formatCurrency(r.freight) },
    { key: 'paymentType', label: 'Payment', render: (r) => <Badge variant={statusVariant(r.paymentType === 'Paid' ? 'Paid' : 'Pending')}>{r.paymentType}</Badge> },
  ]

  const handleDelete = async (row) => {
    if (!row?.lrNumber) {
      toast({ title: 'Delete failed', message: 'LR number is missing.', type: 'error' })
      return
    }
    if (!window.confirm(`Delete LR ${row.lrNumber}?`)) return
    try {
      await lrApi.remove(row.lrNumber)
      toast({ title: 'Deleted', message: `LR ${row.lrNumber} removed.`, type: 'success' })
      paged.refresh()
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  const handlePrintLr = async (row) => {
    try {
      const lr = await lrApi.get(row.lrNumber)
      print(<LRPrintFormat lr={lr} company={company} />)
    } catch (err) {
      toast({ title: 'Print failed', message: err.message, type: 'error' })
    }
  }

  return (
    <ERPListPage
      module="LR Management"
      title="LR List"
      statusCards={[{ label: 'Total LR', color: 'violet', icon: 'Files', count: paged.total }]}
      onAdd={() => navigate('/lr/generate')}
      searchPlaceholder="LR No., consignor, route..."
      filterOptions={['(All)', 'To Pay', 'Paid', 'TBB']}
      filterKey="paymentType"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="lrDate"
      onRowClick={(r) => navigate(`/lr/${encodeURIComponent(r.lrNumber)}/edit`)}
      onEdit={(r) => navigate(`/lr/${encodeURIComponent(r.lrNumber)}/edit`)}
      onDelete={handleDelete}
      onPrint={handlePrintLr}
      rowPrintTitle="Print LR"
      exportFilename="lr-export.csv"
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      onServerFilter={paged.setFilter}
      searchValue={paged.search}
    />
  )
}
