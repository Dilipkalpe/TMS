import NewRecordForm from '../../components/forms/NewRecordForm'

export default function NewLedger() {
  return (
    <NewRecordForm
      module="Accounting"
      title="Add New Record"
      listPath="/accounting/ledger-master"
      saveLabel="Save Ledger"
      fields={[
        { label: 'Ledger Code', placeholder: 'LED-001' },
        { label: 'Ledger Name', placeholder: 'Ledger name' },
        { label: 'Type', type: 'select', options: ['Asset', 'Liability', 'Income', 'Expense'] },
        { label: 'Opening Balance (₹)', type: 'number', placeholder: '0' },
        { label: 'Group', type: 'select', options: ['Cash', 'Bank', 'Customer', 'Vendor', 'Driver', 'Vehicle'] },
      ]}
    />
  )
}
