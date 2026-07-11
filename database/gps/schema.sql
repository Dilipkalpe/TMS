-- Phase 1: GPS Live Tracking & Geofencing for TMS Pro
-- Run: npm run gps:install

ALTER TABLE gps_tracks ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'DEVICE';
ALTER TABLE gps_tracks ADD COLUMN IF NOT EXISTS accuracy_meters DECIMAL(8,2);
ALTER TABLE gps_tracks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS vehicle_last_position (
    vehicle_id      VARCHAR(20) PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    speed_kmh       DECIMAL(6,2),
    heading         DECIMAL(6,2),
    trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
    source          VARCHAR(30) NOT NULL DEFAULT 'DEVICE',
    recorded_at     TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS speed_kmh DECIMAL(6,2);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS heading DECIMAL(6,2);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS trip_id UUID;
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'DEVICE';
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS geofences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    shape_type      VARCHAR(20) NOT NULL DEFAULT 'CIRCLE',
    center_lat      DECIMAL(10,7),
    center_lng      DECIMAL(10,7),
    radius_meters   INT,
    polygon_geojson JSONB,
    color           VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    alert_on_enter  BOOLEAN NOT NULL DEFAULT false,
    alert_on_exit   BOOLEAN NOT NULL DEFAULT true,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE geofences ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS shape_type VARCHAR(20) DEFAULT 'CIRCLE';
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS center_lat DECIMAL(10,7);
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS center_lng DECIMAL(10,7);
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS radius_meters INT;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS polygon_geojson JSONB;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3B82F6';
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS alert_on_enter BOOLEAN DEFAULT false;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS alert_on_exit BOOLEAN DEFAULT true;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE geofences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS geofence_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id     UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id) ON DELETE CASCADE,
    applies_to_all  BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE geofence_assignments ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(20);
ALTER TABLE geofence_assignments ADD COLUMN IF NOT EXISTS applies_to_all BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS geofence_vehicle_state (
    geofence_id     UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    is_inside       BOOLEAN NOT NULL DEFAULT false,
    last_event_at   TIMESTAMPTZ,
    PRIMARY KEY (geofence_id, vehicle_id)
);

ALTER TABLE geofence_vehicle_state ADD COLUMN IF NOT EXISTS is_inside BOOLEAN DEFAULT false;
ALTER TABLE geofence_vehicle_state ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS geofence_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id     UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    event_type      VARCHAR(10) NOT NULL,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    speed_kmh       DECIMAL(6,2),
    recorded_at     TIMESTAMPTZ NOT NULL,
    acknowledged    BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(10);
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7);
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7);
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS speed_kmh DECIMAL(6,2);
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(100);
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS gps_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    device_imei     VARCHAR(50),
    api_key_hash    VARCHAR(200) NOT NULL,
    label           VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS device_imei VARCHAR(50);
ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(200);
ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS label VARCHAR(100);
ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes (after column upgrades)
CREATE INDEX IF NOT EXISTS idx_vehicle_last_position_recorded ON vehicle_last_position(recorded_at DESC);
DELETE FROM vehicle_last_position a USING vehicle_last_position b WHERE a.vehicle_id = b.vehicle_id AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_last_position_vehicle_id ON vehicle_last_position(vehicle_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_geofence_assign_all ON geofence_assignments(geofence_id) WHERE applies_to_all = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_geofence_assign_vehicle ON geofence_assignments(geofence_id, vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geofence_events_vehicle ON geofence_events(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_unack ON geofence_events(acknowledged) WHERE acknowledged = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_devices_imei ON gps_devices(device_imei) WHERE device_imei IS NOT NULL;
