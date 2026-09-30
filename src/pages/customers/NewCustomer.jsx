import { useEffect, useState } from 'react'
import NewRecordForm from '../../components/forms/NewRecordForm'
import { customersApi, tdsApi } from '../../services/api'

export default function NewCustomer() {
  const [sectionOptions, setSectionOptions] = useState([{ value: '', label: '— None —' }])

  useEffect(() => {
    tdsApi.sections(true)
      .then((rows) => setSectionOptions([
        { value: '', label: '— None —' },
        ...(rows || []).map((s) => ({ value: s.id, label: `${s.sectionCode} — ${s.name}` })),
      ]))
      .catch(() => {})
  }, [])

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
        pan: form.pan || undefined,
        address: form.address,
        creditLimit: Number(form.creditlimit) || 0,
        tdsApplicable: form.tdsApplicable === 'Yes',
        defaultTdsSectionId: form.defaultTdsSectionId || undefined,
      })}
      fields={[
        { name: 'customername', label: 'Customer Name', placeholder: 'Company name' },
        { name: 'contactperson', label: 'Contact Person', placeholder: 'Mr. / Ms.' },
        { name: 'phone', label: 'Phone', placeholder: '+91 98200 12345' },
        { name: 'email', label: 'Email', placeholder: 'email@company.com' },
        { name: 'gstnumber', label: 'GST Number', placeholder: '27AABCR1234F1Z5' },
        { name: 'pan', label: 'PAN', placeholder: 'ABCDE1234F' },
        { name: 'address', label: 'Address', placeholder: 'City, State' },
        { name: 'creditlimit', label: 'Credit Limit (₹)', type: 'number', placeholder: '500000' },
        { name: 'tdsApplicable', label: 'TDS Applicable', type: 'select', options: ['No', 'Yes'], defaultValue: 'No' },
        { name: 'defaultTdsSectionId', label: 'Default TDS Section', type: 'select', options: sectionOptions },
      ]}
    />
  )
}
