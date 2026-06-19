import NewRecordForm from '../../components/forms/NewRecordForm'

export default function NewVehicle() {
  return (
    <NewRecordForm
      module="Vehicles"
      title="Add New Record"
      listPath="/vehicles"
      saveLabel="Save Vehicle"
      fields={[
        { label: 'Vehicle Number', placeholder: 'MH-12-AB-1234' },
        { label: 'Type', type: 'select', options: ['32 FT Container', '20 FT Container', 'Trailer', '16 FT Truck'] },
        { label: 'Model', placeholder: 'Tata Prima 4928' },
        { label: 'Capacity', placeholder: '32 MT' },
        { label: 'Owner', type: 'select', options: ['Self', 'Hired'] },
        { label: 'Status', type: 'select', options: ['Active', 'Maintenance'] },
        { label: 'Insurance Expiry', type: 'date' },
        { label: 'Fitness Expiry', type: 'date' },
        { label: 'Permit Expiry', type: 'date' },
        { label: 'PUC Expiry', type: 'date' },
      ]}
    />
  )
}
