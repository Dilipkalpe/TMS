-- Extra indexes for large-table list & report queries (idempotent)
-- Run: npm run perf:indexes

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_bookings_date_desc ON bookings (booking_date DESC, id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_name ON bookings (customer_name);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON bookings (payment);

CREATE INDEX IF NOT EXISTS idx_lr_date_desc ON lorry_receipts (lr_date DESC, lr_number);
CREATE INDEX IF NOT EXISTS idx_expenses_date_desc ON expenses (expense_date DESC, id);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors (name);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers (name);
CREATE INDEX IF NOT EXISTS idx_vehicles_number ON vehicles (number);

CREATE INDEX IF NOT EXISTS idx_bookings_perf ON bookings (id) WHERE id LIKE 'BK-P%';
CREATE INDEX IF NOT EXISTS idx_customers_perf ON customers (id) WHERE id LIKE 'CU-P%';

-- FK & tenant-scoped indexes (dashboard, reports, joins)
CREATE INDEX IF NOT EXISTS idx_lorry_receipts_booking_id ON lorry_receipts (booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings (driver_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON booking_payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_date ON booking_payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_booking_expenses_booking_id ON booking_expenses (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_expenses_date ON booking_expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_booking_broker_charges_booking_id ON booking_broker_charges (booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_company_date ON bookings (company_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_company_status ON bookings (company_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers (company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors (company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company_status ON drivers (company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles (company_id, status);
CREATE INDEX IF NOT EXISTS idx_lorry_receipts_company ON lorry_receipts (company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses (company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_period ON payroll_runs (company_id, pay_year DESC, pay_month DESC);
CREATE INDEX IF NOT EXISTS idx_gps_tracks_company_recorded ON gps_tracks (company_id, recorded_at DESC);

-- Branch-scoped list filters
CREATE INDEX IF NOT EXISTS idx_vehicles_company_branch ON vehicles (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company_branch ON drivers (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_branch ON customers (company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company_branch_date ON bookings (company_id, branch_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_company_branch_date ON expenses (company_id, branch_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_lorry_receipts_company_date ON lorry_receipts (company_id, lr_date DESC);

-- Composite name/number indexes for tenant-scoped sorts
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers (company_id, name);
CREATE INDEX IF NOT EXISTS idx_vendors_company_name ON vendors (company_id, name);
CREATE INDEX IF NOT EXISTS idx_drivers_company_name ON drivers (company_id, name);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_number ON vehicles (company_id, number);

-- Trigram GIN indexes for ILIKE / Contains search (company-scoped lists)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vendors_name_trgm ON vendors USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drivers_name_trgm ON drivers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_number_trgm ON vehicles USING gin (number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_trgm ON bookings USING gin (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bookings_id_trgm ON bookings USING gin (id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lr_number_trgm ON lorry_receipts USING gin (lr_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_expenses_desc_trgm ON expenses USING gin (description gin_trgm_ops);

-- BRIN indexes for time-series tables at millions of rows (minimal storage, fast range scans)
CREATE INDEX IF NOT EXISTS idx_bookings_date_brin ON bookings USING brin (booking_date);
CREATE INDEX IF NOT EXISTS idx_lorry_receipts_date_brin ON lorry_receipts USING brin (lr_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date_brin ON expenses USING brin (expense_date);
CREATE INDEX IF NOT EXISTS idx_gps_tracks_recorded_brin ON gps_tracks USING brin (recorded_at);

ANALYZE customers, vendors, drivers, vehicles, bookings, lorry_receipts, expenses, booking_payments, booking_expenses;

SELECT 'perf indexes created' AS status;
