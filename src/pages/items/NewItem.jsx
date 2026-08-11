import ItemMasterForm from '../../components/masters/ItemMasterForm'
import { itemsApi } from '../../services/api'

export default function NewItem() {
  return (
    <ItemMasterForm
      title="Add Item"
      listPath="/items"
      saveLabel="Save Item"
      api={itemsApi}
    />
  )
}
