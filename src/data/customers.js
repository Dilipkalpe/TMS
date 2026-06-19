export const customers = [
  { id: 'C-001', name: 'Reliance Logistics', contact: 'Mr. Anil Mehta', phone: '+91 98200 12345', email: 'logistics@ril.com', gst: '27AABCR1234F1Z5', address: 'Navi Mumbai, Maharashtra', outstanding: 125000, creditLimit: 500000, totalTrips: 48, ledgerBalance: 125000 },
  { id: 'C-002', name: 'Tata Steel Ltd', contact: 'Ms. Priya Sharma', phone: '+91 98200 23456', email: 'transport@tatasteel.com', gst: '20AABCT5678G1Z2', address: 'Jamshedpur, Jharkhand', outstanding: 85000, creditLimit: 1000000, totalTrips: 62, ledgerBalance: 85000 },
  { id: 'C-003', name: 'Adani Ports', contact: 'Mr. Vikram Shah', phone: '+91 98200 34567', email: 'cargo@adaniports.com', gst: '24AABCA9012H1Z8', address: 'Mundra, Gujarat', outstanding: 0, creditLimit: 750000, totalTrips: 35, ledgerBalance: 0 },
  { id: 'C-004', name: 'Mahindra & Mahindra', contact: 'Mr. Sunil Rao', phone: '+91 98200 45678', email: 'scm@mahindra.com', gst: '27AABCM3456I1Z3', address: 'Nashik, Maharashtra', outstanding: 45000, creditLimit: 400000, totalTrips: 28, ledgerBalance: 45000 },
  { id: 'C-005', name: 'Asian Paints', contact: 'Ms. Neha Gupta', phone: '+91 98200 56789', email: 'dispatch@asianpaints.com', gst: '27AABCA7890J1Z6', address: 'Mumbai, Maharashtra', outstanding: 32000, creditLimit: 300000, totalTrips: 41, ledgerBalance: 32000 },
  { id: 'C-006', name: 'ITC Limited', contact: 'Mr. Rahul Verma', phone: '+91 98200 67890', email: 'logistics@itc.in', gst: '19AABCI1234K1Z9', address: 'Kolkata, WB', outstanding: 68000, creditLimit: 600000, totalTrips: 52, ledgerBalance: 68000 },
]

export const customerLedger = [
  { date: '2026-06-01', voucher: 'OB', particular: 'Opening Balance', debit: 0, credit: 0, balance: 95000 },
  { date: '2026-06-05', voucher: 'INV-4521', particular: 'Freight - Mumbai to Pune', debit: 28500, credit: 0, balance: 123500 },
  { date: '2026-06-10', voucher: 'RCP-882', particular: 'Payment Received - NEFT', debit: 0, credit: 50000, balance: 73500 },
  { date: '2026-06-15', voucher: 'INV-4589', particular: 'Freight - Mumbai to Delhi', debit: 45000, credit: 0, balance: 118500 },
  { date: '2026-06-18', voucher: 'RCP-901', particular: 'Payment Received - Cheque', debit: 0, credit: 6500, balance: 112000 },
]
