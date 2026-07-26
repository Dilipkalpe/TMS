-- Standard audit actor columns for TMS list screens (CBy / ModBy).
-- created_at / updated_at already exist on most tables; ADD IF NOT EXISTS is safe.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE freight_invoices ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE freight_invoices ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

UPDATE bookings SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE lorry_receipts SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE customers SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE vendors SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE drivers SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE vehicles SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE expenses SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE branches SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE freight_rates SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE quotations SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE freight_invoices SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
UPDATE trips SET created_by = COALESCE(created_by, 'system'), updated_by = COALESCE(updated_by, 'system');
