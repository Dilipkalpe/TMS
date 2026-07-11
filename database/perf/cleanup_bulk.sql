-- Remove Demo Company bulk perf data (CU-P / BK-P / etc. prefixes)
-- Run: npm run demo:cleanup-perf

\set ON_ERROR_STOP on
\timing on

\if :{?company_id}
\else
\set company_id 00000000-0000-4000-8000-000000000001
\endif

DELETE FROM fuel_entries WHERE station_name LIKE 'Demo Fuel Station %';
DELETE FROM trip_stops WHERE trip_id IN (SELECT id FROM trips WHERE trip_code LIKE 'TRP-P%');
DELETE FROM trip_status_history WHERE trip_id IN (SELECT id FROM trips WHERE trip_code LIKE 'TRP-P%');
DELETE FROM trips WHERE trip_code LIKE 'TRP-P%';
DELETE FROM maintenance_records WHERE description LIKE 'Demo maintenance %';
DELETE FROM lorry_receipts WHERE lr_number LIKE 'LR-P%';
DELETE FROM bookings WHERE id LIKE 'BK-P%';
DELETE FROM expenses WHERE id LIKE 'EX-P%';
DELETE FROM hr_employees WHERE employee_code LIKE 'EP-P%';
DELETE FROM customers WHERE id LIKE 'CU-P%';
DELETE FROM vendors WHERE id LIKE 'VD-P%';
DELETE FROM drivers WHERE id LIKE 'DR-P%';
DELETE FROM vehicles WHERE id LIKE 'VN-P%';

VACUUM ANALYZE customers, vendors, drivers, vehicles, bookings, lorry_receipts, expenses;

SELECT 'demo perf cleanup done' AS status;
