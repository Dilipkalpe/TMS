import NewRecordForm from '../../components/forms/NewRecordForm'
import { vendorsApi } from '../../services/api'

export default function NewVendor() {
  return (
    <NewRecordForm
      module="Vendors"
      title="Add New Record"
      listPath="/vendors"
      saveLabel="Save Vendor"
      onSubmit={(form) => vendorsApi.create({
        name: form.vendorname,
        contact: form.contactperson,
        phone: form.phone,
        email: form.email,
        gst: form.gstnumber,
        address: form.address,
        category: form.category,
      })}
      fields={[
        { name: 'vendorname', label: 'Vendor Name', placeholder: 'Company name' },
        { name: 'contactperson', label: 'Contact Person', placeholder: 'Contact name' },
        { name: 'phone', label: 'Phone', placeholder: '+91 98100 11111' },
        { name: 'email', label: 'Email', placeholder: 'email@vendor.com' },
        { name: 'gstnumber', label: 'GST Number', placeholder: '27AABCV1234F1Z5' },
        { name: 'category', label: 'Category', type: 'select', options: ['Fuel', 'Maintenance', 'Toll', 'Office'] },
        { name: 'address', label: 'Address', placeholder: 'City, State' },
      ]}
    />
  )
}
