import PartyMasterForm from '../../components/masters/PartyMasterForm'
import { consignorsApi } from '../../services/api'

export default function NewConsignor() {
  return (
    <PartyMasterForm
      module="Consignors"
      title="Add Consignor"
      listPath="/consignors"
      saveLabel="Save Consignor"
      api={consignorsApi}
      kind="consignor"
    />
  )
}
