import NewRecordForm from '../../components/forms/NewRecordForm'
import { quotationsApi } from '../../services/api'

const vehicleTypes = [
  { value: '', label: 'Any' },
  { value: '32 FT Container', label: '32 FT Container' },
  { value: '20 FT Container', label: '20 FT Container' },
  { value: 'Trailer', label: 'Trailer' },
  { value: '16 FT Truck', label: '16 FT Truck' },
]

export default function NewQuotation() {
  return (
    <NewRecordForm
      module="Quotations"
      title="New Quotation"
      listPath="/quotations"
      saveLabel="Save Quotation"
      onSubmit={(form) => quotationsApi.create({
        customerName: form.customername,
        customerId: form.customerid || null,
        fromCity: form.fromcity,
        toCity: form.tocity,
        vehicleType: form.vehicletype || null,
        freight: Number(form.freight) || 0,
        validUntil: form.validuntil || null,
        notes: form.notes || null,
      })}
      fields={[
        { name: 'customername', label: 'Customer Name', placeholder: 'Customer / company' },
        { name: 'customerid', label: 'Customer Id (optional)', placeholder: 'C-001' },
        { name: 'fromcity', label: 'From City', placeholder: 'Mumbai' },
        { name: 'tocity', label: 'To City', placeholder: 'Delhi' },
        { name: 'vehicletype', label: 'Vehicle Type', type: 'select', options: vehicleTypes },
        { name: 'freight', label: 'Freight (₹)', type: 'number', placeholder: '45000' },
        { name: 'validuntil', label: 'Valid Until', type: 'date' },
        { name: 'notes', label: 'Notes', placeholder: 'Optional notes' },
      ]}
    />
  )
}
