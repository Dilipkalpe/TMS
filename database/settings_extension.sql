-- TMS Transport — company settings logo + contact fields + document flow

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS transport_license_no VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS fleet_size INT DEFAULT 0;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_flow VARCHAR(40) NOT NULL DEFAULT 'FirstBookingThenLR';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id UUID;

-- Drop legacy singleton CHECK (id = 1) so each tenant can have its own settings row.
ALTER TABLE company_settings DROP CONSTRAINT IF EXISTS company_settings_id_check;

-- Replace DEFAULT 1 with a sequence so new rows get unique ids (idempotent).
CREATE SEQUENCE IF NOT EXISTS company_settings_id_seq;
SELECT setval(
  'company_settings_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM company_settings), 1), 1)
);
ALTER TABLE company_settings ALTER COLUMN id SET DEFAULT nextval('company_settings_id_seq');
ALTER SEQUENCE company_settings_id_seq OWNED BY company_settings.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_settings_company_id
  ON company_settings (company_id)
  WHERE company_id IS NOT NULL;

-- Allowed values: FirstLRThenBooking | FirstBookingThenLR
UPDATE company_settings
SET document_flow = 'FirstBookingThenLR'
WHERE document_flow IS NULL OR document_flow = '';

UPDATE company_settings SET
    phone = COALESCE(phone, '+91 22 1234 5678'),
    email = COALESCE(email, 'info@tmstransport.com')
WHERE id = 1;
