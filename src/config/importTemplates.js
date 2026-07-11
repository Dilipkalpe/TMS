export const importTemplates = {
  customers: {
    entity: 'customers',
    label: 'Customers',
    columns: ['name', 'contact', 'phone', 'email', 'gst', 'address'],
    required: ['name'],
    sampleFilename: 'customers-import-template.csv',
  },
  vendors: {
    entity: 'vendors',
    label: 'Vendors',
    columns: ['name', 'category', 'contact', 'phone', 'gst'],
    required: ['name'],
    sampleFilename: 'vendors-import-template.csv',
  },
  vehicles: {
    entity: 'vehicles',
    label: 'Vehicles',
    columns: ['number', 'type', 'model', 'status'],
    required: ['number'],
    sampleFilename: 'vehicles-import-template.csv',
  },
  employees: {
    entity: 'employees',
    label: 'Employees',
    columns: [
      'employeeCode', 'name', 'employeeType', 'employmentType',
      'phone', 'email', 'dateOfJoining', 'licenseNumber', 'licenseExpiry', 'status',
    ],
    required: ['employeeCode', 'name'],
    sampleFilename: 'employees-import-template.csv',
  },
}
