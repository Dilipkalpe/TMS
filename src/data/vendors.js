export const vendors = [
  { id: 'VN-001', name: 'Indian Oil Corporation', contact: 'Mr. Deepak Joshi', phone: '+91 98100 11111', email: 'fuel@iocl.com', gst: '27AABCI0001A1Z5', address: 'Mumbai, Maharashtra', outstanding: 45000, category: 'Fuel', totalBills: 124 },
  { id: 'VN-002', name: 'MRF Tyres Ltd', contact: 'Ms. Kavita Nair', phone: '+91 98100 22222', email: 'sales@mrf.com', gst: '33AABCM0002B1Z3', address: 'Chennai, Tamil Nadu', outstanding: 28000, category: 'Maintenance', totalBills: 18 },
  { id: 'VN-003', name: 'Tata Motors Service', contact: 'Mr. Ravi Iyer', phone: '+91 98100 33333', email: 'service@tatamotors.com', gst: '27AABCT0003C1Z8', address: 'Pune, Maharashtra', outstanding: 18500, category: 'Maintenance', totalBills: 32 },
  { id: 'VN-004', name: 'NHAI Toll Plaza', contact: 'Toll Operations', phone: '+91 98100 44444', email: 'toll@nhai.gov.in', gst: '07AABCN0004D1Z2', address: 'Delhi NCR', outstanding: 12000, category: 'Toll', totalBills: 256 },
  { id: 'VN-005', name: 'Office Supplies Co.', contact: 'Mr. Sanjay Mehta', phone: '+91 98100 55555', email: 'orders@officesupplies.com', gst: '27AABCO0005E1Z6', address: 'Mumbai, Maharashtra', outstanding: 8500, category: 'Office', totalBills: 45 },
]

export const purchaseBills = [
  { billNo: 'PB-2026-0456', date: '2026-06-15', vendor: 'Indian Oil Corporation', amount: 125000, gst: 22500, total: 147500, status: 'Paid' },
  { billNo: 'PB-2026-0455', date: '2026-06-12', vendor: 'MRF Tyres Ltd', amount: 42000, gst: 7560, total: 49560, status: 'Unpaid' },
  { billNo: 'PB-2026-0454', date: '2026-06-10', vendor: 'Tata Motors Service', amount: 18500, gst: 3330, total: 21830, status: 'Partial' },
  { billNo: 'PB-2026-0453', date: '2026-06-08', vendor: 'NHAI Toll Plaza', amount: 8500, gst: 0, total: 8500, status: 'Paid' },
]

export const vendorLedger = [
  { date: '2026-06-01', voucher: 'OB', particular: 'Opening Balance', debit: 0, credit: 35000, balance: -35000 },
  { date: '2026-06-08', voucher: 'PB-0453', particular: 'Toll Charges - June Week 1', debit: 8500, credit: 0, balance: -26500 },
  { date: '2026-06-10', voucher: 'PB-0454', particular: 'Vehicle Service - MH-12-AB-1234', debit: 21830, credit: 0, balance: -46630 },
  { date: '2026-06-12', voucher: 'PAY-334', particular: 'Payment to IOC - Fuel', debit: 0, credit: 100000, balance: 53370 },
  { date: '2026-06-15', voucher: 'PB-0456', particular: 'Diesel Purchase - Bulk', debit: 147500, credit: 0, balance: -94130 },
]
