-- Remove demo / seed / test operational data from tms_pro
-- Keeps: users, branches, company_settings, ledger_accounts, vouchers, HR/payroll schema data
-- Run: psql -U postgres -d tms_pro -f database/cleanup_demo_data.sql

\set ON_ERROR_STOP on
\timing on

BEGIN;

-- Booking finance (CASCADE when bookings deleted, but explicit for clarity)
DELETE FROM transport_bills;
DELETE FROM booking_payments;
DELETE FROM booking_broker_charges;
DELETE FROM booking_expenses;
DELETE FROM provisions;
DELETE FROM brokers;

-- Portal / tracking linked to bookings
DELETE FROM booking_tracking_tokens;
DELETE FROM booking_status_history;

-- LR before bookings (booking_id FK)
DELETE FROM lorry_receipts;

-- All bookings (seed BK-1038..1042 + test entries)
DELETE FROM bookings;

-- Global expenses from seed
DELETE FROM expenses;

-- Performance test leftovers
DELETE FROM lorry_receipts WHERE lr_number LIKE 'LR-P%';
DELETE FROM bookings WHERE id LIKE 'BK-P%';
DELETE FROM expenses WHERE id LIKE 'EX-P%';
DELETE FROM customers WHERE id LIKE 'CU-P%';
DELETE FROM vendors WHERE id LIKE 'VD-P%';
DELETE FROM drivers WHERE id LIKE 'DR-P%';
DELETE FROM vehicles WHERE id LIKE 'VN-P%';

-- Seed master data (database/seed.sql)
DELETE FROM customers WHERE id IN ('C-001','C-002','C-003','C-004','C-005','C-006');
DELETE FROM vendors WHERE id IN ('VN-001','VN-002','VN-003','VN-004','VN-005');
DELETE FROM drivers WHERE id IN ('D-001','D-002','D-003','D-004','D-005','D-006');
DELETE FROM vehicles WHERE id IN ('V-001','V-002','V-003','V-004','V-005','V-006');

-- Demo trips from DbSeeder
DELETE FROM trip_status_history WHERE trip_id IN (SELECT id FROM trips WHERE trip_code LIKE 'TRP-DEMO%');
DELETE FROM trip_stops WHERE trip_id IN (SELECT id FROM trips WHERE trip_code LIKE 'TRP-DEMO%');
DELETE FROM trips WHERE trip_code LIKE 'TRP-DEMO%';

COMMIT;

VACUUM ANALYZE bookings, lorry_receipts, customers, vendors, drivers, vehicles, expenses,
  booking_payments, booking_broker_charges, booking_expenses, transport_bills, provisions, brokers;

SELECT 'demo cleanup done' AS status,
  (SELECT count(*) FROM bookings) AS bookings_left,
  (SELECT count(*) FROM customers) AS customers_left,
  (SELECT count(*) FROM lorry_receipts) AS lr_left;
