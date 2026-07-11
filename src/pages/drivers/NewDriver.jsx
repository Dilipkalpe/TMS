import NewRecordForm from '../../components/forms/NewRecordForm'
import { driversApi } from '../../services/api'

export default function NewDriver() {
  return (
    <NewRecordForm
      module="Drivers"
      title="Add New Record"
      listPath="/drivers"
      saveLabel="Save Driver"
      onSubmit={(form) => driversApi.create({
        name: form.name,
        license: form.licensenumber,
        licenseExpiry: form.licenseexpiry,
        phone: form.phone,
        email: form.email,
        address: form.address,
        salary: Number(form.salary) || 0,
        status: form.status,
      })}
      fields={[
        { name: 'name', label: 'Driver Name', placeholder: 'Full name' },
        { name: 'licensenumber', label: 'License Number', placeholder: 'MH-2020-1234567' },
        { name: 'licenseexpiry', label: 'License Expiry', type: 'date' },
        { name: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
        { name: 'email', label: 'Email', placeholder: 'email@example.com' },
        { name: 'address', label: 'Address', placeholder: 'City, State' },
        { name: 'salary', label: 'Monthly Salary (₹)', type: 'number', placeholder: '25000' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave'] },
      ]}
    />
  )
}
