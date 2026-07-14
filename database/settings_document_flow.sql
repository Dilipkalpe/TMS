-- Company Document Flow Preference (LR ↔ Booking sequence).
-- Safe to re-run. Applied via CoreSchemaMigrator / settings_extension.sql as well.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS document_flow VARCHAR(40) NOT NULL DEFAULT 'FirstBookingThenLR';

UPDATE company_settings
SET document_flow = 'FirstBookingThenLR'
WHERE document_flow IS NULL OR TRIM(document_flow) = '';
