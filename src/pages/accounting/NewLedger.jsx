import NewRecordForm from '../../components/forms/NewRecordForm'
import { accountingApi } from '../../services/api'

export default function NewLedger() {
  return (
    <NewRecordForm
      module="Accounting"
      title="Add New Record"
      listPath="/accounting/ledger-master"
      saveLabel="Save Ledger"
      fields={[
        { name: 'code', label: 'Ledger Code', placeholder: 'LED-001' },
        { name: 'name', label: 'Ledger Name', placeholder: 'Ledger name' },
        { name: 'type', label: 'Type', type: 'select', options: ['Asset', 'Liability', 'Income', 'Expense'] },
        { name: 'balance', label: 'Opening Balance (₹)', type: 'number', placeholder: '0' },
        { name: 'group', label: 'Group', type: 'select', options: ['Cash', 'Bank', 'Customer', 'Vendor', 'Driver', 'Vehicle'] },
      ]}
      onSubmit={(form) => accountingApi.createLedger(form)}
    />
  )
}
