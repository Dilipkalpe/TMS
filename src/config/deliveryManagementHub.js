import { withHubTheme } from './hubTheme'

export const deliveryManagementCards = withHubTheme([
  { title: 'In Transit', path: '/operations/in-transit/list', icon: 'Truck', description: 'Track consignments on the road', tone: 'blue', chip: 'Live' },
  { title: 'Delivery Complete', path: '/operations/delivery-complete/list', icon: 'PackageCheck', description: 'Mark reached destination and complete delivery', tone: 'emerald', chip: 'Done' },
  { title: 'POD', path: '/operations/delivery/pod/list', icon: 'Upload', description: 'Capture proof of delivery documents', tone: 'amber', chip: 'POD' },
])
