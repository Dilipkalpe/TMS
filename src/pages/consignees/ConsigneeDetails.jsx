import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Button from '../../components/ui/Button'
import PartyMasterForm from '../../components/masters/PartyMasterForm'
import { useApiItem } from '../../hooks/useApiResource'
import { consigneesApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'

export default function ConsigneeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item, loading, error } = useApiItem(consigneesApi.get, id, [id])

  if (loading) {
    return (
      <ERPContentPage module="Consignees" title="Consignee Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !item) {
    return (
      <ERPContentPage module="Consignees" title="Consignee Details">
        <p className="text-sm text-red-500">{error || 'Consignee not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/consignees')}>Back</Button>
      </ERPContentPage>
    )
  }

  return (
    <PartyMasterForm
      module="Consignees"
      title={`Edit ${item.name}`}
      listPath="/consignees"
      saveLabel="Update Consignee"
      api={consigneesApi}
      kind="consignee"
      initial={item}
      isEdit
    />
  )
}
