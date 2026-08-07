-- TMS module extensions: audit fields, trip refs, delivery/POD detail columns
-- Idempotent — safe to re-run

ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS business_type VARCHAR(10) DEFAULT 'FTL';
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS total_quantity DECIMAL(12,3);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS capacity_limit DECIMAL(12,3);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS capacity_used DECIMAL(12,3);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS loader_name VARCHAR(100);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(100);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS seal_number VARCHAR(50);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS trip_no VARCHAR(30);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100);
ALTER TABLE lr_loading_sheets ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) NOT NULL DEFAULT 'Active';

CREATE TABLE IF NOT EXISTS lr_loading_sheet_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loading_sheet_id    UUID NOT NULL REFERENCES lr_loading_sheets(id) ON DELETE CASCADE,
    lr_number           VARCHAR(64) NOT NULL,
    customer_id         VARCHAR(50),
    customer_name       VARCHAR(200),
    quantity_text       VARCHAR(50),
    quantity_tons       DECIMAL(12,3),
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lr_loading_sheet_items_sheet ON lr_loading_sheet_items(loading_sheet_id);

ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS loading_sheet_id UUID;
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS seal_number VARCHAR(50);
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS seal_condition VARCHAR(30);
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS transit_type VARCHAR(30) DEFAULT 'By Road';
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS trip_no VARCHAR(30);
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS expected_delivery DATE;
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100);
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) NOT NULL DEFAULT 'Active';
ALTER TABLE lr_transit_passes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS loading_sheet_id UUID;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS trip_no VARCHAR(30);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS delivery_time TIME;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS packages_total INT;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS packages_received INT;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS packages_damaged INT;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS actual_weight DECIMAL(12,3);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS charged_weight DECIMAL(12,3);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS condition VARCHAR(30) DEFAULT 'Good';
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS receiver_designation VARCHAR(100);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS receiver_mobile VARCHAR(20);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS completed_by VARCHAR(100);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS pod_no VARCHAR(30);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS pod_status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS delivery_note_no VARCHAR(30);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS receiver_seal VARCHAR(100);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100);
ALTER TABLE lr_delivery_sheets ADD COLUMN IF NOT EXISTS record_status VARCHAR(30) NOT NULL DEFAULT 'Active';

ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS trip_no VARCHAR(30);
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(20);
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS bill_no VARCHAR(50);
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30);
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS advance_taken DECIMAL(12,2) DEFAULT 0;
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS reimbursed DECIMAL(12,2) DEFAULT 0;
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS modified_by VARCHAR(100);
ALTER TABLE lr_expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_lr_loading_sheets_status ON lr_loading_sheets(record_status);
CREATE INDEX IF NOT EXISTS idx_lr_transit_passes_status ON lr_transit_passes(record_status);
CREATE INDEX IF NOT EXISTS idx_lr_delivery_sheets_pod ON lr_delivery_sheets(pod_status);
CREATE INDEX IF NOT EXISTS idx_lr_expenses_trip ON lr_expenses(trip_no);
