import NewRecordForm from '../../components/forms/NewRecordForm'
import { vehiclesApi } from '../../services/api'
import { normalizeDateForApi } from '../../utils/dates'

export default function NewVehicle() {
  return (
    <NewRecordForm
      module="Vehicles"
      title="Add New Record"
      listPath="/vehicles"
      saveLabel="Save Vehicle"
      onSubmit={(form) => vehiclesApi.create({
        number: form.vehiclenumber,
        type: form.type,
        model: form.model,
        capacity: form.capacity,
        owner: form.owner || 'Self',
        status: form.status || 'Active',
        insurance: normalizeDateForApi(form.insuranceexpiry),
        fitness: normalizeDateForApi(form.fitnessexpiry),
        permit: normalizeDateForApi(form.permitexpiry),
        puc: normalizeDateForApi(form.pucexpiry),
      })}
      fields={[
        { name: 'vehiclenumber', label: 'Vehicle Number', placeholder: 'MH-12-AB-1234' },
        { name: 'type', label: 'Type', type: 'select', options: ['32 FT Container', '20 FT Container', 'Trailer', '16 FT Truck'] },
        { name: 'model', label: 'Model', placeholder: 'Tata Prima 4928' },
        { name: 'capacity', label: 'Capacity', placeholder: '32 MT' },
        { name: 'owner', label: 'Owner', type: 'select', options: ['Self', 'Hired'], defaultValue: 'Self' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Maintenance'], defaultValue: 'Active' },
        { name: 'insuranceexpiry', label: 'Insurance Expiry', type: 'date' },
        { name: 'fitnessexpiry', label: 'Fitness Expiry', type: 'date' },
        { name: 'permitexpiry', label: 'Permit Expiry', type: 'date' },
        { name: 'pucexpiry', label: 'PUC Expiry', type: 'date' },
      ]}
    />
  )
}
