import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Button from '../../components/ui/Button'
import PartyMasterForm from '../../components/masters/PartyMasterForm'
import { useApiItem } from '../../hooks/useApiResource'
import { consignorsApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'

export default function ConsignorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item, loading, error } = useApiItem(consignorsApi.get, id, [id])

  if (loading) {
    return (
      <ERPContentPage module="Consignors" title="Consignor Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !item) {
    return (
      <ERPContentPage module="Consignors" title="Consignor Details">
        <p className="text-sm text-red-500">{error || 'Consignor not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/consignors')}>Back</Button>
      </ERPContentPage>
    )
  }

  return (
    <PartyMasterForm
      module="Consignors"
      title={`Edit ${item.name}`}
      listPath="/consignors"
      saveLabel="Update Consignor"
      api={consignorsApi}
      kind="consignor"
      initial={item}
      isEdit
    />
  )
}
