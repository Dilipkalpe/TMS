-- TMS Pro v1.0 — Enforce NOT NULL on company_id (production hardening)
--
-- Prerequisites:
--   1. database/saas/schema.sql (core tenant columns + backfill)
--   2. database/saas/tenant_modules.sql (module columns + backfill)
--   3. database/saas/tenant_hr_payroll_columns.sql (if HR/payroll installed)
--
-- This script validates that no NULL company_id rows remain, then applies NOT NULL.
-- Platform Super Admin users intentionally keep users.company_id NULL — that table is excluded.
--
-- Run manually after backfill verification. Safe to re-run (idempotent on already-NOT-NULL columns).

CREATE OR REPLACE FUNCTION tms_enforce_company_id_not_null(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    null_count BIGINT;
    regclass_name REGCLASS;
BEGIN
    regclass_name := to_regclass('public.' || p_table);
    IF regclass_name IS NULL THEN
        RAISE NOTICE 'Skipping % — table does not exist', p_table;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table
          AND column_name = 'company_id'
    ) THEN
        RAISE NOTICE 'Skipping % — no company_id column', p_table;
        RETURN;
    END IF;

    EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id IS NULL', p_table) INTO null_count;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Migration aborted: % has % row(s) with NULL company_id. Run backfill scripts first.', p_table, null_count;
    END IF;

    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', p_table);
    RAISE NOTICE 'Enforced NOT NULL on %.company_id', p_table;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        -- Core business (database/saas/schema.sql)
        'branches', 'customers', 'vendors', 'drivers', 'vehicles',
        'bookings', 'lorry_receipts', 'expenses', 'brokers',
        'booking_broker_charges', 'booking_expenses', 'booking_payments',
        'transport_bills', 'provisions', 'ledger_accounts', 'vouchers',
        'voucher_lines', 'company_settings', 'trips',
        -- GPS & geofencing
        'geofences', 'geofence_events', 'geofence_assignments', 'geofence_vehicle_state',
        'vehicle_last_position', 'gps_devices', 'gps_tracks',
        -- Maintenance
        'maintenance_schedules', 'maintenance_records', 'maintenance_work_orders',
        'spare_parts', 'maintenance_prediction_snapshots', 'fuel_entries',
        -- Enterprise modules
        'proof_of_delivery', 'documents', 'notifications', 'notification_templates',
        'notification_outbox', 'notification_preferences', 'notification_channel_settings',
        'invoices', 'invoice_lines', 'marketplace_listings', 'freight_bids',
        'warehouses', 'warehouse_inventory', 'iot_devices', 'iot_sensor_readings',
        'ai_chat_sessions', 'ai_messages', 'forecast_snapshots', 'route_optimization_jobs',
        -- HR & payroll
        'hr_departments', 'hr_designations', 'hr_employees', 'hr_leave_types',
        'hr_leave_balances', 'hr_leave_requests', 'hr_attendance', 'hr_holidays',
        'payroll_runs', 'payroll_entries', 'payroll_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        PERFORM tms_enforce_company_id_not_null(tbl);
    END LOOP;
END $$;

-- Pre-flight report (run separately to audit before migration):
-- SELECT table_name, null_count FROM (
--   SELECT 'bookings' AS table_name, COUNT(*) FILTER (WHERE company_id IS NULL) AS null_count FROM bookings
--   UNION ALL SELECT 'invoices', COUNT(*) FILTER (WHERE company_id IS NULL) FROM invoices
--   -- extend as needed
-- ) q WHERE null_count > 0;

DROP FUNCTION IF EXISTS tms_enforce_company_id_not_null(TEXT);
