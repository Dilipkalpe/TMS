import { useCallback } from 'react'
import LookupSelect from './LookupSelect'
import { vehiclesApi } from '../../services/api'

/**
 * Vehicle picker for forms that store vehicleId — supports quick-create + list refresh.
 */
export default function VehicleLookupSelect({
  label = 'Vehicle',
  vehicleId = '',
  vehicles = [],
  onVehicleIdChange,
  onVehiclesRefresh,
  className = '',
  placeholder = 'Search vehicle number…',
}) {
  const selectedNumber = vehicles.find((v) => v.id === vehicleId)?.number ?? ''

  const refreshAndResolve = useCallback(async (number, createdId) => {
    let list = vehicles
    if (onVehiclesRefresh) {
      list = await onVehiclesRefresh()
    } else {
      const res = await vehiclesApi.list({ search: number, pageSize: 20 })
      list = res.items ?? res ?? []
    }
    const match = list.find((v) =>
      (createdId && v.id === createdId)
      || v.number?.toLowerCase() === number.toLowerCase(),
    )
    onVehicleIdChange?.(match?.id ?? '', match?.number ?? number)
    return list
  }, [vehicles, onVehicleIdChange, onVehiclesRefresh])

  return (
    <LookupSelect
      label={label}
      type="vehicles"
      className={className}
      placeholder={placeholder}
      value={selectedNumber}
      onChange={(number) => {
        const match = vehicles.find((v) => v.number?.toLowerCase() === number.toLowerCase())
        onVehicleIdChange?.(match?.id ?? '', number)
      }}
      onRecordCreated={async (result) => {
        await refreshAndResolve(result.label, result.id)
      }}
    />
  )
}
