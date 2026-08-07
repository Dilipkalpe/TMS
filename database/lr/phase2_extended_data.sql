-- Phase 2: JSON extended data for checklist, signatures, invoice lines, settlement
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT '{}';
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT '{}';
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT '{}';
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT '{}';
