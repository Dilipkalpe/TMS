-- Rollback: remove NOT NULL constraint from company_id columns
-- Use only if deployment must be reversed before data corruption occurs.
-- Does NOT remove company_id columns or backfilled values.

CREATE OR REPLACE FUNCTION tms_drop_company_id_not_null(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_regclass('public.' || p_table) IS NULL THEN
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

    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id DROP NOT NULL', p_table);
    RAISE NOTICE 'Dropped NOT NULL on %.company_id', p_table;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'branches', 'customers', 'vendors', 'drivers', 'vehicles',
        'bookings', 'lorry_receipts', 'expenses', 'brokers',
        'booking_broker_charges', 'booking_expenses', 'booking_payments',
        'transport_bills', 'provisions', 'ledger_accounts', 'vouchers',
        'voucher_lines', 'company_settings', 'trips',
        'geofences', 'geofence_events', 'geofence_assignments', 'geofence_vehicle_state',
        'vehicle_last_position', 'gps_devices', 'gps_tracks',
        'maintenance_schedules', 'maintenance_records', 'maintenance_work_orders',
        'spare_parts', 'maintenance_prediction_snapshots', 'fuel_entries',
        'proof_of_delivery', 'documents', 'notifications', 'notification_templates',
        'notification_outbox', 'notification_preferences', 'notification_channel_settings',
        'invoices', 'invoice_lines', 'marketplace_listings', 'freight_bids',
        'warehouses', 'warehouse_inventory', 'iot_devices', 'iot_sensor_readings',
        'ai_chat_sessions', 'ai_messages', 'forecast_snapshots', 'route_optimization_jobs',
        'hr_departments', 'hr_designations', 'hr_employees', 'hr_leave_types',
        'hr_leave_balances', 'hr_leave_requests', 'hr_attendance', 'hr_holidays',
        'payroll_runs', 'payroll_entries', 'payroll_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        PERFORM tms_drop_company_id_not_null(tbl);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS tms_drop_company_id_not_null(TEXT);
