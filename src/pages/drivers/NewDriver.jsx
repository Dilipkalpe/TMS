import NewRecordForm from '../../components/forms/NewRecordForm'

export default function NewDriver() {
  return (
    <NewRecordForm
      module="Drivers"
      title="Add New Record"
      listPath="/drivers"
      saveLabel="Save Driver"
      fields={[
        { label: 'Full Name', placeholder: 'Driver name' },
        { label: 'License Number', placeholder: 'MH-2020-1234567' },
        { label: 'License Expiry', type: 'date' },
        { label: 'Phone', placeholder: '+91 98765 43210' },
        { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        { label: 'Address', placeholder: 'City, State' },
        { label: 'Monthly Salary (₹)', type: 'number', placeholder: '25000' },
        { label: 'Status', type: 'select', options: ['Active', 'On Leave'] },
      ]}
    />
  )
}
