import { useEffect, useState } from 'react'
import NewRecordForm from '../../components/forms/NewRecordForm'
import { vendorsApi, tdsApi } from '../../services/api'

export default function NewVendor() {
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
        pan: form.pan || undefined,
        address: form.address,
        category: form.category,
        tdsApplicable: form.tdsApplicable === 'Yes',
        defaultTdsSectionId: form.defaultTdsSectionId || undefined,
      })}
      fields={[
        { name: 'vendorname', label: 'Vendor Name', placeholder: 'Company name' },
        { name: 'contactperson', label: 'Contact Person', placeholder: 'Contact name' },
        { name: 'phone', label: 'Phone', placeholder: '+91 98100 11111' },
        { name: 'email', label: 'Email', placeholder: 'email@vendor.com' },
        { name: 'gstnumber', label: 'GST Number', placeholder: '27AABCV1234F1Z5' },
        { name: 'pan', label: 'PAN', placeholder: 'ABCDE1234F' },
        { name: 'category', label: 'Category', type: 'select', options: ['Fuel', 'Maintenance', 'Toll', 'Office'] },
        { name: 'address', label: 'Address', placeholder: 'City, State' },
        { name: 'tdsApplicable', label: 'TDS Applicable', type: 'select', options: ['No', 'Yes'], defaultValue: 'No' },
        { name: 'defaultTdsSectionId', label: 'Default TDS Section', type: 'select', options: sectionOptions },
      ]}
    />
  )
}
