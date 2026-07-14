-- TMS Transport — company settings logo + contact fields + document flow

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS transport_license_no VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS fleet_size INT DEFAULT 0;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS document_flow VARCHAR(40) NOT NULL DEFAULT 'FirstBookingThenLR';

-- Allowed values: FirstLRThenBooking | FirstBookingThenLR
UPDATE company_settings
SET document_flow = 'FirstBookingThenLR'
WHERE document_flow IS NULL OR document_flow = '';

UPDATE company_settings SET
    phone = COALESCE(phone, '+91 22 1234 5678'),
    email = COALESCE(email, 'info@tmstransport.com')
WHERE id = 1;
