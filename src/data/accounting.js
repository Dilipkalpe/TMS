export const chartOfAccounts = {
  Assets: [
    { code: '1001', name: 'Cash in Hand', balance: 320000 },
    { code: '1002', name: 'Bank Account - HDFC', balance: 1860000 },
    { code: '1003', name: 'Bank Account - ICICI', balance: 450000 },
    { code: '1101', name: 'Accounts Receivable', balance: 355000 },
    { code: '1201', name: 'Vehicle Assets', balance: 8500000 },
    { code: '1202', name: 'Office Equipment', balance: 285000 },
    { code: '1301', name: 'Advance to Drivers', balance: 22500 },
    { code: '1302', name: 'Advance to Vendors', balance: 50000 },
  ],
  Liabilities: [
    { code: '2001', name: 'Accounts Payable', balance: 102630 },
    { code: '2101', name: 'Bank Loan - Vehicle', balance: 2500000 },
    { code: '2201', name: 'GST Payable', balance: 185400 },
    { code: '2301', name: 'Outstanding Expenses', balance: 45000 },
    { code: '2401', name: 'Salary Payable', balance: 125000 },
  ],
  Income: [
    { code: '4001', name: 'Freight Income', balance: 4280000 },
    { code: '4002', name: 'Loading Charges Income', balance: 125000 },
    { code: '4003', name: 'Other Income', balance: 45000 },
  ],
  Expenses: [
    { code: '5001', name: 'Fuel Expense', balance: 1250000 },
    { code: '5002', name: 'Salary Expense', balance: 620000 },
    { code: '5003', name: 'Toll Expense', balance: 185000 },
    { code: '5004', name: 'Maintenance Expense', balance: 320000 },
    { code: '5005', name: 'Office Expense', balance: 85000 },
    { code: '5006', name: 'Insurance Expense', balance: 145000 },
    { code: '5007', name: 'Depreciation', balance: 280000 },
  ],
  Capital: [
    { code: '3001', name: 'Owner Capital', balance: 5000000 },
    { code: '3002', name: 'Retained Earnings', balance: 1850000 },
    { code: '3003', name: 'Current Year Profit', balance: 1440000 },
  ],
}

export const ledgerMasters = [
  { name: 'Cash Account', type: 'Asset', code: 'CASH-001', balance: 320000 },
  { name: 'Bank Account', type: 'Asset', code: 'BANK-001', balance: 2310000 },
  { name: 'Customer Ledger', type: 'Asset', code: 'CUST-GRP', balance: 355000 },
  { name: 'Vendor Ledger', type: 'Liability', code: 'VEND-GRP', balance: 102630 },
  { name: 'Driver Ledger', type: 'Asset', code: 'DRV-GRP', balance: 22500 },
  { name: 'Vehicle Ledger', type: 'Asset', code: 'VEH-GRP', balance: 8500000 },
  { name: 'Fuel Ledger', type: 'Expense', code: 'FUEL-001', balance: 1250000 },
  { name: 'Expense Ledger', type: 'Expense', code: 'EXP-GRP', balance: 2685000 },
  { name: 'Income Ledger', type: 'Income', code: 'INC-GRP', balance: 4450000 },
  { name: 'GST Ledger', type: 'Liability', code: 'GST-001', balance: 185400 },
]

export const voucherTypes = ['Payment Voucher', 'Receipt Voucher', 'Journal Voucher', 'Contra Voucher']

export const ledgerTransactions = [
  { date: '2026-06-01', voucherNo: 'OB-001', particular: 'Opening Balance', debit: 0, credit: 0, balance: 95000 },
  { date: '2026-06-05', voucherNo: 'INV-4521', particular: 'Freight - Reliance Logistics', debit: 28500, credit: 0, balance: 123500 },
  { date: '2026-06-10', voucherNo: 'RCP-882', particular: 'Payment Received - NEFT', debit: 0, credit: 50000, balance: 73500 },
  { date: '2026-06-15', voucherNo: 'INV-4589', particular: 'Freight - Tata Steel', debit: 45000, credit: 0, balance: 118500 },
  { date: '2026-06-18', voucherNo: 'RCP-901', particular: 'Payment - Cheque #4521', debit: 0, credit: 6500, balance: 112000 },
]

export const cashBook = [
  { date: '2026-06-16', receipt: 15000, payment: 0, balance: 285000, particular: 'Freight collection - Cash' },
  { date: '2026-06-17', receipt: 0, payment: 12500, balance: 272500, particular: 'Fuel purchase - IOC' },
  { date: '2026-06-17', receipt: 8500, payment: 0, balance: 281000, particular: 'Advance from customer' },
  { date: '2026-06-18', receipt: 0, payment: 3500, balance: 277500, particular: 'Office supplies' },
  { date: '2026-06-18', receipt: 22000, payment: 0, balance: 299500, particular: 'Freight collection' },
]

export const bankBook = [
  { date: '2026-06-16', deposit: 50000, withdrawal: 0, balance: 2180000, particular: 'NEFT - Reliance Logistics' },
  { date: '2026-06-17', deposit: 0, withdrawal: 42000, balance: 2138000, particular: 'MRF Tyres - Payment' },
  { date: '2026-06-17', deposit: 35000, withdrawal: 0, balance: 2173000, particular: 'NEFT - Asian Paints' },
  { date: '2026-06-18', deposit: 0, withdrawal: 25000, balance: 2148000, particular: 'Salary - Rajesh Kumar' },
  { date: '2026-06-18', deposit: 85000, withdrawal: 0, balance: 2233000, particular: 'NEFT - Tata Steel' },
]

export const dayBook = [
  { date: '2026-06-18', voucherNo: 'RCP-901', type: 'Receipt', ledger: 'Reliance Logistics', debit: 0, credit: 6500 },
  { date: '2026-06-18', voucherNo: 'PAY-456', type: 'Payment', ledger: 'Indian Oil Corporation', debit: 12500, credit: 0 },
  { date: '2026-06-18', voucherNo: 'JRN-112', type: 'Journal', ledger: 'GST Adjustment', debit: 2500, credit: 2500 },
  { date: '2026-06-18', voucherNo: 'CNT-089', type: 'Contra', ledger: 'Cash to Bank', debit: 20000, credit: 20000 },
  { date: '2026-06-18', voucherNo: 'INV-4601', type: 'Sales', ledger: 'Asian Paints', debit: 42000, credit: 0 },
]

export const journalRegister = [
  { date: '2026-06-18', voucherNo: 'JRN-112', debitLedger: 'GST Input', creditLedger: 'GST Output', amount: 2500, narration: 'GST adjustment entry' },
  { date: '2026-06-17', voucherNo: 'JRN-111', debitLedger: 'Depreciation', creditLedger: 'Vehicle Assets', amount: 15000, narration: 'Monthly depreciation' },
  { date: '2026-06-15', voucherNo: 'JRN-110', debitLedger: 'Bad Debts', creditLedger: 'Accounts Receivable', amount: 5000, narration: 'Write off irrecoverable amount' },
]

export const receiptRegister = [
  { date: '2026-06-18', voucherNo: 'RCP-901', party: 'Reliance Logistics', mode: 'Cheque', amount: 6500, narration: 'Freight payment' },
  { date: '2026-06-18', voucherNo: 'RCP-902', party: 'Asian Paints', mode: 'NEFT', amount: 22000, narration: 'Freight payment' },
  { date: '2026-06-17', voucherNo: 'RCP-900', party: 'Adani Ports', mode: 'NEFT', amount: 38000, narration: 'Full freight settlement' },
]

export const paymentRegister = [
  { date: '2026-06-18', voucherNo: 'PAY-456', party: 'Indian Oil Corporation', mode: 'Cash', amount: 12500, narration: 'Fuel purchase' },
  { date: '2026-06-17', voucherNo: 'PAY-455', party: 'MRF Tyres Ltd', mode: 'Bank Transfer', amount: 42000, narration: 'Tyre replacement' },
  { date: '2026-06-17', voucherNo: 'PAY-454', party: 'Rajesh Kumar', mode: 'Bank Transfer', amount: 25000, narration: 'June salary' },
]

export const purchaseRegister = [
  { date: '2026-06-15', billNo: 'PB-0456', vendor: 'Indian Oil Corporation', amount: 125000, gst: 22500, total: 147500 },
  { date: '2026-06-12', billNo: 'PB-0455', vendor: 'MRF Tyres Ltd', amount: 42000, gst: 7560, total: 49560 },
  { date: '2026-06-10', billNo: 'PB-0454', vendor: 'Tata Motors Service', amount: 18500, gst: 3330, total: 21830 },
]

export const salesRegister = [
  { date: '2026-06-18', lrNo: 'LR-2026-0892', customer: 'Reliance Logistics', route: 'Mumbai → Pune', freight: 28500, gst: 5130, total: 33630 },
  { date: '2026-06-18', lrNo: 'LR-2026-0891', customer: 'Tata Steel Ltd', route: 'Jamshedpur → Kolkata', freight: 52000, gst: 9360, total: 61360 },
  { date: '2026-06-17', lrNo: 'LR-2026-0890', customer: 'Adani Ports', route: 'Mundra → Ahmedabad', freight: 38000, gst: 6840, total: 44840 },
]

export const trialBalance = [
  { account: 'Cash in Hand', debit: 320000, credit: 0 },
  { account: 'Bank Account', debit: 2310000, credit: 0 },
  { account: 'Accounts Receivable', debit: 355000, credit: 0 },
  { account: 'Vehicle Assets', debit: 8500000, credit: 0 },
  { account: 'Accounts Payable', debit: 0, credit: 102630 },
  { account: 'Bank Loan', debit: 0, credit: 2500000 },
  { account: 'GST Payable', debit: 0, credit: 185400 },
  { account: 'Freight Income', debit: 0, credit: 4280000 },
  { account: 'Fuel Expense', debit: 1250000, credit: 0 },
  { account: 'Salary Expense', debit: 620000, credit: 0 },
  { account: 'Owner Capital', debit: 0, credit: 5000000 },
  { account: 'Current Year Profit', debit: 0, credit: 1440000 },
]

export const profitLoss = {
  income: [
    { name: 'Freight Income', amount: 4280000 },
    { name: 'Loading Charges', amount: 125000 },
    { name: 'Other Income', amount: 45000 },
  ],
  expenses: [
    { name: 'Fuel', amount: 1250000 },
    { name: 'Salary', amount: 620000 },
    { name: 'Toll', amount: 185000 },
    { name: 'Maintenance', amount: 320000 },
    { name: 'Office Expense', amount: 85000 },
    { name: 'Insurance', amount: 145000 },
    { name: 'Depreciation', amount: 280000 },
  ],
}

export const balanceSheet = {
  assets: [
    { name: 'Cash', amount: 320000 },
    { name: 'Bank', amount: 2310000 },
    { name: 'Accounts Receivable', amount: 355000 },
    { name: 'Vehicle Assets', amount: 8500000 },
    { name: 'Office Assets', amount: 285000 },
    { name: 'Advance', amount: 72500 },
  ],
  liabilities: [
    { name: 'Creditors', amount: 102630 },
    { name: 'Loans', amount: 2500000 },
    { name: 'GST Payable', amount: 185400 },
    { name: 'Outstanding Expenses', amount: 170000 },
  ],
  capital: [
    { name: 'Owner Capital', amount: 5000000 },
    { name: 'Current Year Profit', amount: 1440000 },
  ],
}

export const outstandingCustomers = [
  { name: 'Reliance Logistics', amount: 125000, days0_30: 45000, days30_60: 35000, days60_90: 25000, days90plus: 20000 },
  { name: 'Tata Steel Ltd', amount: 85000, days0_30: 55000, days30_60: 20000, days60_90: 10000, days90plus: 0 },
  { name: 'ITC Limited', amount: 68000, days0_30: 30000, days30_60: 28000, days60_90: 10000, days90plus: 0 },
  { name: 'Mahindra & Mahindra', amount: 45000, days0_30: 45000, days30_60: 0, days60_90: 0, days90plus: 0 },
  { name: 'Asian Paints', amount: 32000, days0_30: 12000, days30_60: 10000, days60_90: 10000, days90plus: 0 },
]

export const outstandingVendors = [
  { name: 'Indian Oil Corporation', amount: 45000, days0_30: 25000, days30_60: 15000, days60_90: 5000, days90plus: 0 },
  { name: 'MRF Tyres Ltd', amount: 28000, days0_30: 0, days30_60: 28000, days60_90: 0, days90plus: 0 },
  { name: 'Tata Motors Service', amount: 18500, days0_30: 18500, days30_60: 0, days60_90: 0, days90plus: 0 },
]

export const gstSummary = {
  inputGST: 285400,
  outputGST: 470800,
  netGST: 185400,
  inputBreakdown: [
    { month: 'Apr', amount: 42000 },
    { month: 'May', amount: 48500 },
    { month: 'Jun', amount: 52000 },
  ],
  outputBreakdown: [
    { month: 'Apr', amount: 68000 },
    { month: 'May', amount: 72000 },
    { month: 'Jun', amount: 78000 },
  ],
}

export const driverLedger = [
  { date: '2026-06-01', type: 'Opening', salary: 0, advance: 0, deduction: 0, balance: 5000 },
  { date: '2026-06-05', type: 'Advance', salary: 0, advance: 3000, deduction: 0, balance: 8000 },
  { date: '2026-06-15', type: 'Salary', salary: 25000, advance: 0, deduction: 0, balance: -17000 },
  { date: '2026-06-17', type: 'Deduction', salary: 0, advance: 0, deduction: 500, balance: -16500 },
]

export const vehicleLedger = [
  { date: '2026-06-01', fuel: 0, maintenance: 0, tripIncome: 0, expenses: 0, netProfit: 0, balance: 125000 },
  { date: '2026-06-05', fuel: 12500, maintenance: 0, tripIncome: 28500, expenses: 1850, netProfit: 14150, balance: 139150 },
  { date: '2026-06-10', fuel: 9800, maintenance: 0, tripIncome: 42000, expenses: 2200, netProfit: 30000, balance: 169150 },
  { date: '2026-06-15', fuel: 11200, maintenance: 18500, tripIncome: 35000, expenses: 1500, netProfit: 3800, balance: 172950 },
]
