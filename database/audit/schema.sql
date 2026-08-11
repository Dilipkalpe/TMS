-- Standard audit actor columns for TMS list screens (CBy / MBy).
-- Stores display name (FullName) stamped by AuditSaveChangesInterceptor.
-- created_at / updated_at already exist on most tables; ADD IF NOT EXISTS is safe.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE freight_invoices ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE freight_invoices ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by VARCHAR(200);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200);

-- Widen existing columns if they were created as VARCHAR(100).
ALTER TABLE bookings ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE bookings ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE lorry_receipts ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE lorry_receipts ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE customers ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE customers ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE vendors ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE vendors ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE drivers ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE drivers ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE vehicles ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE vehicles ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE expenses ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE expenses ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE branches ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE branches ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE freight_rates ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE freight_rates ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE quotations ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE quotations ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE freight_invoices ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE freight_invoices ALTER COLUMN updated_by TYPE VARCHAR(200);
ALTER TABLE trips ALTER COLUMN created_by TYPE VARCHAR(200);
ALTER TABLE trips ALTER COLUMN updated_by TYPE VARCHAR(200);

UPDATE bookings SET created_by = 'system' WHERE created_by IS NULL;
UPDATE bookings SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE lorry_receipts SET created_by = 'system' WHERE created_by IS NULL;
UPDATE lorry_receipts SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE customers SET created_by = 'system' WHERE created_by IS NULL;
UPDATE customers SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE vendors SET created_by = 'system' WHERE created_by IS NULL;
UPDATE vendors SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE drivers SET created_by = 'system' WHERE created_by IS NULL;
UPDATE drivers SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE vehicles SET created_by = 'system' WHERE created_by IS NULL;
UPDATE vehicles SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE expenses SET created_by = 'system' WHERE created_by IS NULL;
UPDATE expenses SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE branches SET created_by = 'system' WHERE created_by IS NULL;
UPDATE branches SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE freight_rates SET created_by = 'system' WHERE created_by IS NULL;
UPDATE freight_rates SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE quotations SET created_by = 'system' WHERE created_by IS NULL;
UPDATE quotations SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE freight_invoices SET created_by = 'system' WHERE created_by IS NULL;
UPDATE freight_invoices SET updated_by = 'system' WHERE updated_by IS NULL;
UPDATE trips SET created_by = 'system' WHERE created_by IS NULL;
UPDATE trips SET updated_by = 'system' WHERE updated_by IS NULL;
