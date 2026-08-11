import { useParams, useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Button from '../../components/ui/Button'
import ItemMasterForm from '../../components/masters/ItemMasterForm'
import { useApiItem } from '../../hooks/useApiResource'
import { itemsApi } from '../../services/api'
import { ArrowLeft } from 'lucide-react'

export default function ItemDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { item, loading, error } = useApiItem(itemsApi.get, id, [id])

  if (loading) {
    return (
      <ERPContentPage module="Items" title="Item Details">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  if (error || !item) {
    return (
      <ERPContentPage module="Items" title="Item Details">
        <p className="text-sm text-red-500">{error || 'Item not found'}</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/items')}>Back</Button>
      </ERPContentPage>
    )
  }

  return (
    <ItemMasterForm
      title={`Edit ${item.name}`}
      listPath="/items"
      saveLabel="Update Item"
      api={itemsApi}
      initial={item}
      isEdit
    />
  )
}
