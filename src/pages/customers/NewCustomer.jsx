import NewRecordForm from '../../components/forms/NewRecordForm'
import { customersApi } from '../../services/api'

export default function NewCustomer() {
  return (
    <NewRecordForm
      module="Customers"
      title="Add New Record"
      listPath="/customers"
      saveLabel="Save Customer"
      onSubmit={(form) => customersApi.create({
        name: form.customername,
        contact: form.contactperson,
        phone: form.phone,
        email: form.email,
        gst: form.gstnumber,
        address: form.address,
        creditLimit: Number(form.creditlimit) || 0,
      })}
      fields={[
        { name: 'customername', label: 'Customer Name', placeholder: 'Company name' },
        { name: 'contactperson', label: 'Contact Person', placeholder: 'Mr. / Ms.' },
        { name: 'phone', label: 'Phone', placeholder: '+91 98200 12345' },
        { name: 'email', label: 'Email', placeholder: 'email@company.com' },
        { name: 'gstnumber', label: 'GST Number', placeholder: '27AABCR1234F1Z5' },
        { name: 'address', label: 'Address', placeholder: 'City, State' },
        { name: 'creditlimit', label: 'Credit Limit (₹)', type: 'number', placeholder: '500000' },
      ]}
    />
  )
}
