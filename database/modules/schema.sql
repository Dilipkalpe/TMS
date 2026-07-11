-- Enterprise modules for TMS Pro (single-tenant)
-- Order matters for foreign keys

CREATE TABLE IF NOT EXISTS trips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_code       VARCHAR(50) NOT NULL UNIQUE,
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id       VARCHAR(20) REFERENCES drivers(id) ON DELETE SET NULL,
    booking_id      VARCHAR(20) REFERENCES bookings(id) ON DELETE SET NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    origin          VARCHAR(200) NOT NULL,
    destination     VARCHAR(200) NOT NULL,
    planned_start   TIMESTAMPTZ,
    planned_end     TIMESTAMPTZ,
    actual_start    TIMESTAMPTZ,
    actual_end      TIMESTAMPTZ,
    distance_km     DECIMAL(10,2),
    toll_cost       DECIMAL(12,2) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_stops (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    sequence_no     INT NOT NULL,
    address         VARCHAR(300) NOT NULL,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    planned_arrival TIMESTAMPTZ,
    status          VARCHAR(30) DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS trip_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    status          VARCHAR(30) NOT NULL,
    note            TEXT,
    changed_by      VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
    booking_id      VARCHAR(20) REFERENCES bookings(id) ON DELETE SET NULL,
    liters          DECIMAL(10,2) NOT NULL,
    cost_per_liter  DECIMAL(10,2) NOT NULL,
    total_cost      DECIMAL(12,2) NOT NULL,
    odometer        INT,
    mileage_kmpl    DECIMAL(8,2),
    station_name    VARCHAR(200),
    filled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_suspicious   BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_tracks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    speed_kmh       DECIMAL(6,2),
    heading         DECIMAL(6,2),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gps_tracks_vehicle ON gps_tracks(vehicle_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      VARCHAR(20) NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    otp_code        VARCHAR(6),
    otp_verified    BOOLEAN NOT NULL DEFAULT false,
    recipient_name  VARCHAR(200),
    delivery_lat    DECIMAL(10,7),
    delivery_lng    DECIMAL(10,7),
    signature_url   TEXT,
    photo_url       TEXT,
    confirmed_by    VARCHAR(100),
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(30) NOT NULL,
    entity_id       VARCHAR(50) NOT NULL,
    doc_type        VARCHAR(100) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    file_url        TEXT,
    expires_at      DATE,
    renewed_at      DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    channel         VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'UNREAD',
    metadata        JSONB,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no      VARCHAR(50) NOT NULL UNIQUE,
    customer_id     VARCHAR(20) REFERENCES customers(id) ON DELETE SET NULL,
    booking_id      VARCHAR(20) REFERENCES bookings(id) ON DELETE SET NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
    issued_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    due_at          DATE,
    paid_at         DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description     VARCHAR(300) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,2) NOT NULL,
    amount          DECIMAL(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_type    VARCHAR(30) NOT NULL DEFAULT 'LOAD',
    origin          VARCHAR(200) NOT NULL,
    destination     VARCHAR(200) NOT NULL,
    available_at    TIMESTAMPTZ,
    rate            DECIMAL(14,2),
    capacity_kg     DECIMAL(12,2),
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS freight_bids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    bidder_name     VARCHAR(200) NOT NULL,
    amount          DECIMAL(14,2) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    address         TEXT,
    capacity_cbm    DECIMAL(12,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    sku             VARCHAR(50) NOT NULL,
    description     VARCHAR(300),
    quantity        DECIMAL(12,2) NOT NULL DEFAULT 0,
    weight_kg       DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS iot_devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id) ON DELETE SET NULL,
    device_type     VARCHAR(50) NOT NULL,
    device_serial   VARCHAR(100) NOT NULL UNIQUE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iot_sensor_readings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
    metric          VARCHAR(50) NOT NULL,
    value           DECIMAL(14,4) NOT NULL,
    unit            VARCHAR(20),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_type   VARCHAR(50) NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    predicted_value DECIMAL(14,2) NOT NULL,
    confidence      DECIMAL(5,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
