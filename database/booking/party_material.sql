-- Booking party/material master references (nullable; historical Customer column retained).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignor_id VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consignee_id VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS material_id VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_bookings_consignor_id ON bookings (consignor_id) WHERE consignor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_consignee_id ON bookings (consignee_id) WHERE consignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_material_id ON bookings (material_id) WHERE material_id IS NOT NULL;

-- Deactivate legacy Booking Customer field config (UI removed; keep column for history).
UPDATE field_configurations
SET is_active = FALSE,
    is_visible = FALSE,
    is_required = FALSE,
    updated_at = NOW()
WHERE module = 'Booking'
  AND technical_field_name = 'Customer'
  AND is_active = TRUE;

-- Align Consignor/Consignee defaults with new Booking UX (required when visible).
UPDATE field_configurations
SET is_required = TRUE,
    updated_at = NOW()
WHERE module = 'Booking'
  AND technical_field_name IN ('Consignor', 'Consignee')
  AND is_active = TRUE
  AND is_visible = TRUE;
