-- FTL / PTL business type and multi-LR loading sheets
-- Run: psql -U tms -d tms_pro -f database/lr/business_type.sql

ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS business_type VARCHAR(10) NOT NULL DEFAULT 'FTL';
ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS customer_id VARCHAR(20);
ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200);

UPDATE lorry_receipts SET business_type = 'FTL' WHERE business_type IS NULL OR business_type = '';

ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS business_type VARCHAR(10) NOT NULL DEFAULT 'FTL';
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(20);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS total_quantity DECIMAL(14,3);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS capacity_limit DECIMAL(14,3);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS capacity_used DECIMAL(14,3);

DROP INDEX IF EXISTS idx_lr_loading_sheets_lr;

CREATE TABLE IF NOT EXISTS lr_loading_sheet_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loading_sheet_id    UUID NOT NULL,
    lr_number           VARCHAR(64) NOT NULL,
    customer_id         VARCHAR(20),
    customer_name       VARCHAR(200),
    quantity_text       VARCHAR(50),
    quantity_tons       DECIMAL(14,3),
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lr_loading_sheet_items_sheet ON lr_loading_sheet_items(loading_sheet_id);
CREATE INDEX IF NOT EXISTS idx_lr_loading_sheet_items_lr ON lr_loading_sheet_items(lr_number);

-- Backfill items from legacy single-lr loading sheets
INSERT INTO lr_loading_sheet_items (id, loading_sheet_id, lr_number, quantity_text, quantity_tons, sort_order, created_at)
SELECT gen_random_uuid(), s.id, s.lr_number, s.material_quantity, NULL, 0, s.created_at
FROM lr_loading_sheets s
WHERE NOT EXISTS (
    SELECT 1 FROM lr_loading_sheet_items i WHERE i.loading_sheet_id = s.id
);

ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS loading_sheet_id UUID;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS loading_sheet_id UUID;

CREATE INDEX IF NOT EXISTS idx_lr_transit_passes_loading_sheet ON lr_transit_passes(loading_sheet_id);
CREATE INDEX IF NOT EXISTS idx_lr_delivery_sheets_loading_sheet ON lr_delivery_sheets(loading_sheet_id);
