-- Predictive Maintenance module for TMS Pro
-- Run: npm run maintenance:install

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS odometer INT NOT NULL DEFAULT 0;

ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(30) DEFAULT 'SCHEDULED';
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS odometer INT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMPTZ;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ;

UPDATE maintenance_records
SET description = COALESCE(description, type),
    record_type = COALESCE(record_type, 'SCHEDULED'),
    performed_at = COALESCE(performed_at, record_date::timestamptz)
WHERE description IS NULL OR performed_at IS NULL;

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type    VARCHAR(100) NOT NULL,
    interval_km     INT,
    interval_days   INT,
    last_service_at TIMESTAMPTZ,
    next_due_at     TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_schedules_vehicle ON maintenance_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maint_schedules_due ON maintenance_schedules(next_due_at) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS spare_parts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    unit_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_qty   INT NOT NULL DEFAULT 0,
    min_stock   INT NOT NULL DEFAULT 5,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spare_parts_sku ON spare_parts(sku);
