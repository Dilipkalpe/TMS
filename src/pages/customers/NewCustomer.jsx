import NewRecordForm from '../../components/forms/NewRecordForm'

export default function NewCustomer() {
  return (
    <NewRecordForm
      module="Customers"
      title="Add New Record"
      listPath="/customers"
      saveLabel="Save Customer"
      fields={[
        { label: 'Company Name', placeholder: 'Customer name' },
        { label: 'Contact Person', placeholder: 'Contact name' },
        { label: 'Phone', placeholder: '+91 98200 12345' },
        { label: 'Email', type: 'email', placeholder: 'email@company.com' },
        { label: 'GSTIN', placeholder: '27AABCR1234F1Z5' },
        { label: 'Address', placeholder: 'Full address' },
        { label: 'Credit Limit (₹)', type: 'number', placeholder: '500000' },
      ]}
    />
  )
}
