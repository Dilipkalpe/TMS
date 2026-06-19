import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { lrList } from '../../data/lr'
import { lrStatusCards } from '../../config/listStatusCards'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { addRecordRoutes } from '../../config/addRecordRoutes'

export default function LRList() {
  const navigate = useNavigate()

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

  return (
    <ERPListPage
      module="LR"
      title="LR List"
      statusCards={lrStatusCards(lrList)}
      
      onAdd={() => navigate('/lr/generate')}
      searchPlaceholder="LR No., consignor, consignee..."
      searchKeys={['lrNumber', 'consignor', 'consignee', 'from', 'to']}
      filterOptions={['(All)', 'To Pay', 'Paid', 'TBB']}
      filterKey="paymentType"
      columns={columns}
      data={lrList}
      sortKey="lrDate"
    />
  )
}
