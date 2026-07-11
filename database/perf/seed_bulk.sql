-- Bulk performance / demo dataset for Demo Company (Default tenant)
-- :count rows PER SECTION (default 500000 = 5 lakh)
--
-- Quick test:  npm run demo:seed-quick
-- Full 5 lakh: npm run demo:seed-5lac   (15–90 min depending on hardware)
--
-- Prerequisites: PostgreSQL tms_pro, SaaS schema applied, HR optional (section skipped if missing)
--
-- Sections (11): customers, vendors, drivers, vehicles, hr_employees, bookings,
--                lorry_receipts, expenses, trips, fuel_entries, maintenance_records

\set ON_ERROR_STOP on
\timing on

\if :{?count}
\else
\set count 500000
\endif

\if :{?company_id}
\else
\set company_id 00000000-0000-4000-8000-000000000001
\endif

SELECT :count AS rows_per_section, (:count * 11) AS approximate_total_rows,
       :'company_id' AS demo_company_id;

UPDATE companies
SET name = 'Demo Company', legal_name = 'Demo Company Pvt Ltd', updated_at = NOW()
WHERE id = :'company_id'::uuid;

SET synchronous_commit = OFF;
SET maintenance_work_mem = '256MB';

\echo '=== 1/11 Customers ==='
INSERT INTO customers (
  id, company_id, name, contact, phone, email, outstanding, credit_limit, total_trips, ledger_balance, created_at, updated_at
)
SELECT
  'CU-P' || LPAD(i::text, 7, '0'),
  :'company_id'::uuid,
  'Demo Customer ' || i,
  'Contact ' || i,
  '+91 98' || LPAD((i % 100000000)::text, 8, '0'),
  'cust' || i || '@demo.test',
  (i % 500) * 1000,
  500000,
  i % 200,
  0,
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (id) DO NOTHING;

\echo '=== 2/11 Vendors ==='
INSERT INTO vendors (
  id, company_id, name, contact, phone, category, outstanding, total_bills, created_at, updated_at
)
SELECT
  'VD-P' || LPAD(i::text, 7, '0'),
  :'company_id'::uuid,
  'Demo Vendor ' || i,
  'Vendor Contact ' || i,
  '+91 97' || LPAD((i % 100000000)::text, 8, '0'),
  (ARRAY['Fuel','Maintenance','Tyres','Office'])[1 + (i % 4)],
  (i % 300) * 500,
  i % 50,
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (id) DO NOTHING;

\echo '=== 3/11 Drivers ==='
INSERT INTO drivers (
  id, company_id, name, license, phone, salary, advance, status, trips, rating, created_at, updated_at
)
SELECT
  'DR-P' || LPAD(i::text, 7, '0'),
  :'company_id'::uuid,
  'Demo Driver ' || i,
  'DL-DEMO-' || LPAD(i::text, 7, '0'),
  '+91 96' || LPAD((i % 100000000)::text, 8, '0'),
  25000 + (i % 10) * 1000,
  (i % 20) * 500,
  (ARRAY['Active','Active','Active','On Leave'])[1 + (i % 4)],
  i % 500,
  3.5 + (i % 15) * 0.1,
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (id) DO NOTHING;

\echo '=== 4/11 Vehicles ==='
INSERT INTO vehicles (
  id, company_id, number, type, model, status, trips, revenue, created_at, updated_at
)
SELECT
  'VN-P' || LPAD(i::text, 7, '0'),
  :'company_id'::uuid,
  'MH-D-' || LPAD(i::text, 7, '0'),
  (ARRAY['Truck','Trailer','Container'])[1 + (i % 3)],
  'Model-' || (i % 20),
  (ARRAY['Active','Active','Maintenance','On Trip'])[1 + (i % 4)],
  i % 400,
  (i % 1000) * 5000,
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (id) DO NOTHING;

\echo '=== 5/11 HR Employees (requires: npm run hr:install) ==='
INSERT INTO hr_employees (
  id, company_id, employee_code, name, employee_type, employment_type,
  driver_id, phone, basic_salary, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  :'company_id'::uuid,
  'EP-P' || LPAD(i::text, 7, '0'),
  'Demo Employee ' || i,
  (ARRAY['Driver','Staff','Office','Mechanic','Loader'])[1 + (i % 5)],
  (ARRAY['Permanent','Permanent','Contract','Daily'])[1 + (i % 4)],
  CASE WHEN (i % 5) = 0 THEN 'DR-P' || LPAD(i::text, 7, '0') ELSE NULL END,
  '+91 95' || LPAD((i % 100000000)::text, 8, '0'),
  18000 + (i % 20) * 500,
  'Active',
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (employee_code) DO NOTHING;

\echo '=== 6/11 Bookings ==='
INSERT INTO bookings (
  id, company_id, booking_date, customer_id, customer_name, from_city, to_city, material,
  vehicle_id, vehicle_number, driver_id, driver_name,
  freight, status, payment, advance, balance, created_at, updated_at
)
SELECT
  'BK-P' || LPAD(i::text, 7, '0'),
  :'company_id'::uuid,
  DATE '2024-01-01' + ((i % 730))::int,
  'CU-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'Demo Customer ' || ((i - 1) % :count + 1),
  (ARRAY['Mumbai','Delhi','Pune','Chennai','Ahmedabad'])[1 + (i % 5)],
  (ARRAY['Bangalore','Kolkata','Hyderabad','Jaipur','Surat'])[1 + ((i + 2) % 5)],
  (ARRAY['Steel','Cement','Electronics','Textile'])[1 + (i % 4)],
  'VN-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'MH-D-' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'DR-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'Demo Driver ' || ((i - 1) % :count + 1),
  15000 + (i % 50) * 1000,
  (ARRAY['Pending','Confirmed','In Transit','Delivered'])[1 + (i % 4)],
  (ARRAY['Unpaid','Partial','Paid'])[1 + (i % 3)],
  (i % 5) * 2000,
  15000 + (i % 50) * 1000 - (i % 5) * 2000,
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (id) DO NOTHING;

\echo '=== 7/11 Lorry Receipts ==='
INSERT INTO lorry_receipts (
  company_id, lr_number, lr_date, booking_id, consignor, consignee, from_city, to_city,
  vehicle_id, vehicle_number, driver_id, driver_name, freight, gst, balance,
  payment_type, created_at, updated_at
)
SELECT
  :'company_id'::uuid,
  'LR-P' || LPAD(i::text, 8, '0'),
  DATE '2024-01-01' + ((i % 730))::int,
  'BK-P' || LPAD(i::text, 7, '0'),
  'Demo Consignor ' || i,
  'Demo Consignee ' || i,
  (ARRAY['Mumbai','Delhi','Pune'])[1 + (i % 3)],
  (ARRAY['Bangalore','Kolkata','Hyderabad'])[1 + (i % 3)],
  'VN-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'MH-D-' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'DR-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'Demo Driver ' || ((i - 1) % :count + 1),
  18000 + (i % 40) * 800,
  ROUND((18000 + (i % 40) * 800) * 0.18, 2),
  12000 + (i % 30) * 500,
  'To Pay',
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (lr_number) DO NOTHING;

\echo '=== 8/11 Expenses ==='
INSERT INTO expenses (
  id, company_id, expense_date, category, description, vehicle_id, vehicle_number,
  vendor_id, vendor_name, amount, payment_mode, status, created_at, updated_at
)
SELECT
  'EX-P' || LPAD(i::text, 7, '0'),
  :'company_id'::uuid,
  DATE '2024-01-01' + ((i % 730))::int,
  (ARRAY['Fuel','Salary','Toll','Maintenance','Office'])[1 + (i % 5)],
  'Demo expense ' || i,
  'VN-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'MH-D-' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'VD-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'Demo Vendor ' || ((i - 1) % :count + 1),
  500 + (i % 100) * 250,
  (ARRAY['Cash','Bank','UPI'])[1 + (i % 3)],
  'Approved',
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (id) DO NOTHING;

\echo '=== 9/11 Trips (requires: npm run modules:install) ==='
INSERT INTO trips (
  id, company_id, trip_code, vehicle_id, driver_id, booking_id, status,
  origin, destination, planned_start, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  :'company_id'::uuid,
  'TRP-P' || LPAD(i::text, 7, '0'),
  'VN-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'DR-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'BK-P' || LPAD(i::text, 7, '0'),
  (ARRAY['PLANNED','ASSIGNED','IN_TRANSIT','COMPLETED'])[1 + (i % 4)],
  (ARRAY['Mumbai','Delhi','Pune'])[1 + (i % 3)],
  (ARRAY['Bangalore','Kolkata','Hyderabad'])[1 + (i % 3)],
  NOW() - (i % 180) * INTERVAL '1 day',
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i
ON CONFLICT (trip_code) DO NOTHING;

\echo '=== 10/11 Fuel entries (requires: npm run modules:install) ==='
INSERT INTO fuel_entries (
  id, company_id, vehicle_id, booking_id, liters, cost_per_liter, total_cost,
  odometer, station_name, filled_at, created_at
)
SELECT
  gen_random_uuid(),
  :'company_id'::uuid,
  'VN-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  'BK-P' || LPAD(i::text, 7, '0'),
  40 + (i % 80),
  90 + (i % 15),
  (40 + (i % 80)) * (90 + (i % 15)),
  10000 + (i % 50000),
  'Demo Fuel Station ' || ((i - 1) % 500 + 1),
  NOW() - (i % 365) * INTERVAL '1 day',
  NOW()
FROM generate_series(1, :count) AS i;

\echo '=== 11/11 Maintenance records ==='
INSERT INTO maintenance_records (
  vehicle_id, record_date, type, record_type, description, cost, vendor, created_at
)
SELECT
  'VN-P' || LPAD(((i - 1) % :count + 1)::text, 7, '0'),
  DATE '2024-01-01' + ((i % 730))::int,
  'Service',
  'SCHEDULED',
  'Demo maintenance ' || i,
  1000 + (i % 50) * 200,
  'Demo Vendor ' || ((i - 1) % :count + 1),
  NOW()
FROM generate_series(1, :count) AS i;

RESET synchronous_commit;

\echo '=== ANALYZE ==='
ANALYZE customers, vendors, drivers, vehicles, bookings, lorry_receipts, expenses;
ANALYZE hr_employees;
ANALYZE trips, fuel_entries;
ANALYZE maintenance_records;

\echo '=== Row counts (Demo Company perf prefix) ==='
SELECT 'customers' AS section, COUNT(*) AS rows FROM customers WHERE company_id = :'company_id'::uuid AND id LIKE 'CU-P%'
UNION ALL SELECT 'vendors', COUNT(*) FROM vendors WHERE company_id = :'company_id'::uuid AND id LIKE 'VD-P%'
UNION ALL SELECT 'drivers', COUNT(*) FROM drivers WHERE company_id = :'company_id'::uuid AND id LIKE 'DR-P%'
UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles WHERE company_id = :'company_id'::uuid AND id LIKE 'VN-P%'
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings WHERE company_id = :'company_id'::uuid AND id LIKE 'BK-P%'
UNION ALL SELECT 'lorry_receipts', COUNT(*) FROM lorry_receipts WHERE company_id = :'company_id'::uuid AND lr_number LIKE 'LR-P%'
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses WHERE company_id = :'company_id'::uuid AND id LIKE 'EX-P%'
UNION ALL SELECT 'hr_employees', COUNT(*) FROM hr_employees WHERE company_id = :'company_id'::uuid AND employee_code LIKE 'EP-P%'
UNION ALL SELECT 'trips', COUNT(*) FROM trips WHERE company_id = :'company_id'::uuid AND trip_code LIKE 'TRP-P%'
UNION ALL SELECT 'fuel_entries', COUNT(*) FROM fuel_entries WHERE company_id = :'company_id'::uuid AND station_name LIKE 'Demo Fuel Station %'
UNION ALL SELECT 'maintenance_records', COUNT(*) FROM maintenance_records WHERE description LIKE 'Demo maintenance %';

SELECT 'Demo Company seed complete' AS status;
