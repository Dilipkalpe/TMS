-- Phase 4: Predictive Maintenance enhancements

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

CREATE INDEX IF NOT EXISTS idx_maint_snapshots_date ON maintenance_prediction_snapshots(snapshot_date);
