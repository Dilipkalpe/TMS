-- Accounting seed data (run after schema.sql + seed.sql)
INSERT INTO ledger_accounts (code, name, account_type, group_name, balance) VALUES
('1001', 'Cash in Hand', 'Asset', 'Assets', 320000),
('1002', 'Bank Account - HDFC', 'Asset', 'Assets', 1860000),
('1003', 'Bank Account - ICICI', 'Asset', 'Assets', 450000),
('1101', 'Accounts Receivable', 'Asset', 'Assets', 355000),
('1201', 'Vehicle Assets', 'Asset', 'Assets', 8500000),
('2001', 'Accounts Payable', 'Liability', 'Liabilities', -102630),
('2201', 'GST Payable', 'Liability', 'Liabilities', -185400),
('4001', 'Freight Income', 'Income', 'Income', -4280000),
('5001', 'Fuel Expense', 'Expense', 'Expenses', 1250000),
('5002', 'Salary Expense', 'Expense', 'Expenses', 620000),
('3001', 'Owner Capital', 'Capital', 'Capital', -5000000)
ON CONFLICT (code) DO NOTHING;

INSERT INTO vouchers (voucher_no, voucher_date, voucher_type, party_name, mode, narration, total_amount) VALUES
('RCP-901', '2026-06-18', 'Receipt', 'Reliance Logistics', 'Cheque', 'Freight payment', 6500),
('RCP-902', '2026-06-18', 'Receipt', 'Asian Paints', 'NEFT', 'Freight payment', 22000),
('PAY-456', '2026-06-18', 'Payment', 'Indian Oil Corporation', 'Cash', 'Fuel purchase', 12500),
('PAY-455', '2026-06-17', 'Payment', 'MRF Tyres Ltd', 'Bank Transfer', 'Tyre replacement', 42000),
('JRN-112', '2026-06-18', 'Journal', 'GST Adjustment', NULL, 'GST adjustment entry', 2500),
('CNT-089', '2026-06-18', 'Contra', 'Cash to Bank', 'Transfer', 'Cash deposited to bank', 20000)
ON CONFLICT (voucher_no) DO NOTHING;

UPDATE company_settings SET
  company_name = 'TMS Pro Logistics Pvt Ltd',
  address = '123, Transport Nagar, Andheri East, Mumbai - 400069',
  gstin = '27AABCT1234F1Z5',
  pan = 'AABCT1234F',
  financial_year = '2025-26',
  gst_rate = 18
WHERE id = 1;
