export function lookupEntityLabel(type, employeeType) {
  if (type === 'employees') return employeeType || 'Employee'
  const labels = {
    customers: 'Customer',
    vendors: 'Vendor',
    vehicles: 'Vehicle',
    drivers: 'Driver',
  }
  return labels[type] ?? 'Record'
}

export function resolveQuickCreatePayload(type, employeeType) {
  if (type === 'employees') return { type: 'employees', employeeType: employeeType || 'Staff' }
  if (type === 'drivers') return { type: 'drivers', employeeType: 'Driver' }
  return { type, employeeType: undefined }
}
