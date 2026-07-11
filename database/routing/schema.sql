-- Phase 5: AI Route Optimization

ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_fuel_l DECIMAL(10,2);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS eta_minutes INT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS optimization_savings_pct DECIMAL(5,2);

CREATE TABLE IF NOT EXISTS route_optimization_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id                 UUID REFERENCES trips(id) ON DELETE SET NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    traffic_aware           BOOLEAN NOT NULL DEFAULT TRUE,
    toll_optimized          BOOLEAN NOT NULL DEFAULT TRUE,
    fuel_optimized          BOOLEAN NOT NULL DEFAULT TRUE,
    original_distance_km    DECIMAL(10,2),
    optimized_distance_km   DECIMAL(10,2),
    original_eta_minutes    INT,
    optimized_eta_minutes   INT,
    toll_cost               DECIMAL(12,2),
    fuel_cost               DECIMAL(12,2),
    fuel_liters             DECIMAL(10,2),
    savings_pct             DECIMAL(5,2),
    stop_order              JSONB,
    route_polyline          TEXT,
    provider                VARCHAR(50) DEFAULT 'TMS_HEURISTIC',
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ
);

-- Upgrade legacy/partial route_optimization_jobs tables
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS traffic_aware BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS toll_optimized BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS fuel_optimized BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS original_distance_km DECIMAL(10,2);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS optimized_distance_km DECIMAL(10,2);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS original_eta_minutes INT;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS optimized_eta_minutes INT;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS toll_cost DECIMAL(12,2);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS fuel_cost DECIMAL(12,2);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS fuel_liters DECIMAL(10,2);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS savings_pct DECIMAL(5,2);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS stop_order JSONB;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'TMS_HEURISTIC';
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_route_jobs_trip ON route_optimization_jobs(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_jobs_created ON route_optimization_jobs(created_at DESC);
