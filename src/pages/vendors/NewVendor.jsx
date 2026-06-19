import NewRecordForm from '../../components/forms/NewRecordForm'

export default function NewVendor() {
  return (
    <NewRecordForm
      module="Vendors"
      title="Add New Record"
      listPath="/vendors"
      saveLabel="Save Vendor"
      fields={[
        { label: 'Vendor Name', placeholder: 'Vendor name' },
        { label: 'Contact Person', placeholder: 'Contact name' },
        { label: 'Category', type: 'select', options: ['Fuel', 'Maintenance', 'Toll', 'Office'] },
        { label: 'Phone', placeholder: '+91 98100 11111' },
        { label: 'Email', type: 'email', placeholder: 'email@vendor.com' },
        { label: 'GSTIN', placeholder: '27AABCV1234F1Z5' },
        { label: 'Address', placeholder: 'Full address' },
      ]}
    />
  )
}
