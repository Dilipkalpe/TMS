import { withHubTheme } from './hubTheme'

export const mastersCards = withHubTheme([
  { title: 'Vehicles', path: '/vehicles', icon: 'Truck', description: 'Fleet vehicle register and details', tone: 'blue', chip: 'Fleet' },
  { title: 'Customers', path: '/customers', icon: 'Users', description: 'Customer master and outstanding balances', tone: 'teal', chip: 'Party' },
  { title: 'Drivers / HR', path: '/hr/employees', icon: 'Briefcase', description: 'Driver and employee master records', tone: 'indigo', chip: 'People' },
  { title: 'Vendors', path: '/vendors', icon: 'Building2', description: 'Vendor and broker master', tone: 'amber', chip: 'Party' },
  { title: 'Consignors', path: '/consignors', icon: 'Package', description: 'Sender master for LR From location and details', tone: 'violet', chip: 'LR' },
  { title: 'Consignees', path: '/consignees', icon: 'MapPin', description: 'Receiver master for LR To location and details', tone: 'rose', chip: 'LR' },
  { title: 'Items', path: '/items', icon: 'Boxes', description: 'Goods and commodity master for LR lines', tone: 'emerald', chip: 'Goods' },
  { title: 'Freight Rates', path: '/freight-rates', icon: 'IndianRupee', description: 'Route and vehicle-type freight rate master', tone: 'orange', chip: 'Rate' },
])
