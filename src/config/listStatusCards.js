/** Shared status card presets for ERP list pages */
export const bookingStatusCards = (data) => [
  { label: 'Pending', value: 'Pending', color: 'orange', icon: 'FileText', count: 0 },
  { label: 'Confirmed', value: 'Confirmed', color: 'blue', icon: 'CheckCircle', count: 0 },
  { label: 'In Transit', value: 'In Transit', color: 'violet', icon: 'Truck', count: 0 },
  { label: 'Delivered', value: 'Delivered', color: 'green', icon: 'PackageCheck', count: 0 },
].map((s) => ({ ...s, count: data.filter((d) => d.status === s.value).length }))

export const paymentStatusCards = (data) => [
  { label: 'Unpaid', value: 'Unpaid', color: 'red', icon: 'AlertTriangle', count: 0 },
  { label: 'Partial', value: 'Partial', color: 'orange', icon: 'CircleDollarSign', count: 0 },
  { label: 'Paid', value: 'Paid', color: 'green', icon: 'CheckCircle', count: 0 },
  { label: 'Total', value: null, color: 'blue', icon: 'Receipt', count: data.length },
].map((s) => ({
  ...s,
  count: s.value ? data.filter((d) => d.payment === s.value).length : data.length,
}))

export const vehicleStatusCards = (data) => [
  { label: 'Active', value: 'Active', color: 'green', icon: 'Truck', count: 0 },
  { label: 'Maintenance', value: 'Maintenance', color: 'orange', icon: 'Wrench', count: 0 },
  { label: 'On Leave', value: 'On Leave', color: 'amber', icon: 'UserX', count: 0 },
  { label: 'Total Fleet', value: null, color: 'blue', icon: 'Layers', count: data.length },
].map((s) => ({
  ...s,
  count: s.value ? data.filter((d) => d.status === s.value).length : data.length,
}))

export const driverStatusCards = (data) => [
  { label: 'Active', value: 'Active', color: 'green', icon: 'UserCircle', count: 0 },
  { label: 'On Leave', value: 'On Leave', color: 'orange', icon: 'CalendarOff', count: 0 },
  { label: 'Total Drivers', value: null, color: 'blue', icon: 'Users', count: data.length },
  { label: 'Total Trips', value: null, color: 'violet', icon: 'Route', count: data.reduce((s, d) => s + d.trips, 0) },
].map((s) => ({
  ...s,
  count: s.value ? data.filter((d) => d.status === s.value).length : s.count,
}))

export const expenseCategoryCards = (data) => {
  const cats = ['Fuel', 'Toll', 'Maintenance', 'Salary']
  return cats.map((c) => ({
    label: c,
    color: c === 'Fuel' ? 'orange' : c === 'Salary' ? 'green' : c === 'Maintenance' ? 'violet' : 'blue',
    icon: c === 'Fuel' ? 'Fuel' : c === 'Toll' ? 'Milestone' : c === 'Maintenance' ? 'Wrench' : 'Wallet',
    count: data.filter((d) => d.category === c).length,
  }))
}

export const lrStatusCards = (data) => [
  { label: 'To Pay', value: 'To Pay', color: 'orange', icon: 'FileText', count: 0 },
  { label: 'Paid', value: 'Paid', color: 'green', icon: 'CheckCircle', count: 0 },
  { label: 'TBB', value: 'TBB', color: 'blue', icon: 'Clock', count: 0 },
  { label: 'Total LR', value: null, color: 'violet', icon: 'Files', count: data.length },
].map((s) => ({
  ...s,
  count: s.value ? data.filter((d) => d.paymentType === s.value).length : data.length,
}))

export const registerStatusCards = (label, count, color = 'blue', icon = 'FileSpreadsheet') => [
  { label: 'Posted', color: 'green', icon: 'CheckCircle', count: Math.floor(count * 0.85) },
  { label: 'Open', color: 'blue', icon: 'FolderOpen', count: Math.floor(count * 0.1) },
  { label: 'Draft', color: 'orange', icon: 'FilePen', count: Math.floor(count * 0.05) },
  { label: label, color, icon, count },
]
