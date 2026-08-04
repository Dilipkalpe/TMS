import PartyMasterForm from '../../components/masters/PartyMasterForm'
import { consigneesApi } from '../../services/api'

export default function NewConsignee() {
  return (
    <PartyMasterForm
      module="Consignees"
      title="Add Consignee"
      listPath="/consignees"
      saveLabel="Save Consignee"
      api={consigneesApi}
      kind="consignee"
    />
  )
}
