export const lrList = [
  { lrNumber: 'LR-2026-0892', lrDate: '2026-06-18', consignor: 'Reliance Industries', consignee: 'Reliance Retail', from: 'Mumbai', to: 'Pune', vehicle: 'MH-12-AB-1234', driver: 'Rajesh Kumar', material: 'Electronics', quantity: '12 MT', freight: 28500, gst: 5130, balance: 18500, paymentType: 'To Pay' },
  { lrNumber: 'LR-2026-0891', lrDate: '2026-06-18', consignor: 'Tata Steel', consignee: 'Tata Motors', from: 'Jamshedpur', to: 'Kolkata', vehicle: 'MH-14-CD-5678', driver: 'Suresh Patel', material: 'Steel Coils', quantity: '24 MT', freight: 52000, gst: 9360, balance: 32000, paymentType: 'To Pay' },
  { lrNumber: 'LR-2026-0890', lrDate: '2026-06-17', consignor: 'Adani Mundra', consignee: 'Adani Ahmedabad', from: 'Mundra', to: 'Ahmedabad', vehicle: 'GJ-01-EF-9012', driver: 'Amit Singh', material: 'Containers', quantity: '2 Units', freight: 38000, gst: 6840, balance: 0, paymentType: 'Paid' },
]

export const defaultLR = {
  lrNumber: 'LR-2026-0893',
  lrDate: '2026-06-18',
  consignor: '',
  consignee: '',
  from: '',
  to: '',
  vehicle: '',
  driver: '',
  material: '',
  quantity: '',
  freight: 0,
  gst: 0,
  hamali: 0,
  loadingCharges: 0,
  unloadingCharges: 0,
  insurance: 0,
  advance: 0,
  balance: 0,
  paymentType: 'To Pay',
  remarks: '',
}

export const vehicles = ['MH-12-AB-1234', 'MH-14-CD-5678', 'GJ-01-EF-9012', 'DL-01-GH-3456', 'KA-05-IJ-7890']
export const drivers = ['Rajesh Kumar', 'Suresh Patel', 'Amit Singh', 'Vikram Sharma', 'Ramesh Yadav']
export const paymentTypes = ['To Pay', 'Paid', 'To Be Billed', 'TBB']
