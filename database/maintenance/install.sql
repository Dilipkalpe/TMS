-- Full maintenance module install (idempotent) — run on production if module fails to load
-- Usage on VPS:
--   docker exec -i $(docker ps -q -f name=postgres) psql -U tms -d tms_pro -f - < database/maintenance/install.sql

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS odometer INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS maintenance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    record_date     DATE NOT NULL,
    type            VARCHAR(100),
    record_type     VARCHAR(30) DEFAULT 'SCHEDULED',
    description     TEXT,
    odometer        INT,
    next_due_at     TIMESTAMPTZ,
    performed_at    TIMESTAMPTZ,
    cost            DECIMAL(12,2) NOT NULL DEFAULT 0,
    vendor          VARCHAR(200),
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(30) DEFAULT 'SCHEDULED';
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS odometer INT;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMPTZ;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

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

ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

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

ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_sku ON spare_parts(sku);

CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    schedule_id     UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    component       VARCHAR(50),
    status          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority        VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    due_at          TIMESTAMPTZ,
    assigned_to     VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_maint_work_orders_vehicle ON maintenance_work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maint_work_orders_status ON maintenance_work_orders(status);

CREATE TABLE IF NOT EXISTS maintenance_prediction_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date   DATE NOT NULL,
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    risk_score      INT NOT NULL,
    risk_level      VARCHAR(10) NOT NULL,
    factors         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_date, vehicle_id)
);

ALTER TABLE maintenance_prediction_snapshots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_maint_snapshots_date ON maintenance_prediction_snapshots(snapshot_date);

UPDATE maintenance_schedules ms SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE ms.vehicle_id = v.id AND ms.company_id IS NULL;
UPDATE maintenance_records mr SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE mr.vehicle_id = v.id AND mr.company_id IS NULL;
UPDATE maintenance_work_orders mwo SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE mwo.vehicle_id = v.id AND mwo.company_id IS NULL;
UPDATE maintenance_prediction_snapshots mps SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE mps.vehicle_id = v.id AND mps.company_id IS NULL;
UPDATE spare_parts SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
