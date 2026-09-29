-- Driver Web Portal (browser GPS) — extends existing GPS tables. PostgreSQL.
-- Reuses vehicle_last_position + gps_tracks (no separate VehicleCurrentLocation tables).

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS portal_pin_hash VARCHAR(200);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS portal_phone VARCHAR(30);

ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS driver_id VARCHAR(20);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS loading_slip_id UUID;
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(30) NOT NULL DEFAULT 'STOPPED';
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS accuracy_meters DECIMAL(8,2);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS location_label VARCHAR(300);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS geocoded_lat DECIMAL(10,7);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS geocoded_lng DECIMAL(10,7);

ALTER TABLE gps_tracks ADD COLUMN IF NOT EXISTS driver_id VARCHAR(20);
ALTER TABLE gps_tracks ADD COLUMN IF NOT EXISTS loading_slip_id UUID;

CREATE TABLE IF NOT EXISTS driver_trip_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    driver_id           VARCHAR(20) NOT NULL,
    vehicle_id          VARCHAR(20) NOT NULL,
    loading_slip_id     UUID,
    lr_number           VARCHAR(50) NOT NULL,
    loading_slip_number VARCHAR(50),
    trip_no             VARCHAR(50),
    customer_name       VARCHAR(200),
    source              VARCHAR(200),
    destination         VARCHAR(200),
    status              VARCHAR(40) NOT NULL DEFAULT 'ASSIGNED',
    tracking_active     BOOLEAN NOT NULL DEFAULT false,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_trip_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES driver_trip_sessions(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL,
    old_status      VARCHAR(40),
    new_status      VARCHAR(40) NOT NULL,
    changed_by      VARCHAR(100),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_drivers_portal_phone ON drivers(portal_phone) WHERE portal_enabled = true;
CREATE INDEX IF NOT EXISTS idx_vlp_driver ON vehicle_last_position(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vlp_tracking ON vehicle_last_position(tracking_status, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_tracks_driver ON gps_tracks(driver_id, recorded_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gps_tracks_loading_slip ON gps_tracks(loading_slip_id, recorded_at DESC) WHERE loading_slip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_trip_sessions_driver ON driver_trip_sessions(driver_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_trip_sessions_vehicle ON driver_trip_sessions(vehicle_id, tracking_active);
CREATE INDEX IF NOT EXISTS idx_driver_trip_sessions_company ON driver_trip_sessions(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_trip_history_session ON driver_trip_status_history(session_id, changed_at DESC);
