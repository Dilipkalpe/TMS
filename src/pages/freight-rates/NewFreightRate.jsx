import NewRecordForm from '../../components/forms/NewRecordForm'
import { freightRatesApi } from '../../services/api'

const vehicleTypes = [
  { value: '32 FT Container', label: '32 FT Container' },
  { value: '20 FT Container', label: '20 FT Container' },
  { value: 'Trailer', label: 'Trailer' },
  { value: '16 FT Truck', label: '16 FT Truck' },
]

export default function NewFreightRate() {
  return (
    <NewRecordForm
      module="Freight Rates"
      title="Add Freight Rate"
      listPath="/freight-rates"
      saveLabel="Save Rate"
      onSubmit={(form) => freightRatesApi.create({
        fromCity: form.fromcity,
        toCity: form.tocity,
        vehicleType: form.vehicletype || null,
        customerId: form.customerid || null,
        rateAmount: Number(form.rateamount) || 0,
        rateUnit: form.rateunit || 'PerTrip',
        validFrom: form.validfrom || null,
        validTo: form.validto || null,
        notes: form.notes || null,
        isActive: true,
      })}
      fields={[
        { name: 'fromcity', label: 'From City', placeholder: 'Mumbai' },
        { name: 'tocity', label: 'To City', placeholder: 'Delhi' },
        { name: 'vehicletype', label: 'Vehicle Type', type: 'select', options: [{ value: '', label: 'Any' }, ...vehicleTypes] },
        { name: 'customerid', label: 'Customer Id (optional)', placeholder: 'C-001' },
        { name: 'rateamount', label: 'Rate Amount (₹)', type: 'number', placeholder: '45000' },
        { name: 'rateunit', label: 'Rate Unit', type: 'select', options: [
          { value: 'PerTrip', label: 'Per Trip' },
          { value: 'PerTon', label: 'Per Ton' },
          { value: 'PerKm', label: 'Per Km' },
        ] },
        { name: 'validfrom', label: 'Valid From', type: 'date' },
        { name: 'validto', label: 'Valid To', type: 'date' },
        { name: 'notes', label: 'Notes', placeholder: 'Optional notes' },
      ]}
    />
  )
}
