-- Tenant isolation: company_id on module tables (GPS, maintenance, HR, payroll, notifications, modules)

ALTER TABLE geofences ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE geofence_events ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE geofence_assignments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE geofence_vehicle_state ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE vehicle_last_position ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE gps_devices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE gps_tracks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE maintenance_prediction_snapshots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

ALTER TABLE fuel_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE proof_of_delivery ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE notification_channel_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE freight_bids ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE iot_sensor_readings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE ai_chat_sessions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE forecast_snapshots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE route_optimization_jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

ALTER TABLE hr_departments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_leave_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_leave_balances ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_leave_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE hr_holidays ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE payroll_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

UPDATE geofences SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE geofence_events ge SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE ge.vehicle_id = v.id AND ge.company_id IS NULL;
UPDATE geofence_assignments ga SET company_id = COALESCE(g.company_id, '00000000-0000-4000-8000-000000000001')
FROM geofences g WHERE ga.geofence_id = g.id AND ga.company_id IS NULL;
UPDATE geofence_vehicle_state gvs SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE gvs.vehicle_id = v.id AND gvs.company_id IS NULL;
UPDATE vehicle_last_position vlp SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE vlp.vehicle_id = v.id AND vlp.company_id IS NULL;
UPDATE gps_devices gd SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE gd.vehicle_id = v.id AND gd.company_id IS NULL;
UPDATE gps_tracks gt SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE gt.vehicle_id = v.id AND gt.company_id IS NULL;

UPDATE maintenance_schedules ms SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE ms.vehicle_id = v.id AND ms.company_id IS NULL;
UPDATE maintenance_records mr SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE mr.vehicle_id = v.id AND mr.company_id IS NULL;
UPDATE maintenance_work_orders mwo SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE mwo.vehicle_id = v.id AND mwo.company_id IS NULL;
UPDATE spare_parts SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE maintenance_prediction_snapshots mps SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE mps.vehicle_id = v.id AND mps.company_id IS NULL;

UPDATE fuel_entries fe SET company_id = COALESCE(v.company_id, '00000000-0000-4000-8000-000000000001')
FROM vehicles v WHERE fe.vehicle_id = v.id AND fe.company_id IS NULL;
UPDATE proof_of_delivery pod SET company_id = COALESCE(b.company_id, '00000000-0000-4000-8000-000000000001')
FROM bookings b WHERE pod.booking_id = b.id AND pod.company_id IS NULL;
UPDATE documents SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE notifications SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE notification_templates SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE notification_outbox SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE notification_preferences SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE notification_channel_settings SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE invoices SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE invoice_lines SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE marketplace_listings SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE freight_bids SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE warehouses SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE warehouse_inventory SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE iot_devices SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE iot_sensor_readings SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE ai_chat_sessions SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE ai_messages SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE forecast_snapshots SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE route_optimization_jobs SET company_id = COALESCE(t.company_id, '00000000-0000-4000-8000-000000000001')
FROM trips t WHERE route_optimization_jobs.trip_id = t.id AND route_optimization_jobs.company_id IS NULL;

UPDATE hr_departments SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE hr_designations d SET company_id = COALESCE(dep.company_id, '00000000-0000-4000-8000-000000000001')
FROM hr_departments dep WHERE d.department_id = dep.id AND d.company_id IS NULL;
UPDATE hr_employees SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE hr_leave_types SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE hr_leave_balances lb SET company_id = COALESCE(e.company_id, '00000000-0000-4000-8000-000000000001')
FROM hr_employees e WHERE lb.employee_id = e.id AND lb.company_id IS NULL;
UPDATE hr_leave_requests lr SET company_id = COALESCE(e.company_id, '00000000-0000-4000-8000-000000000001')
FROM hr_employees e WHERE lr.employee_id = e.id AND lr.company_id IS NULL;
UPDATE hr_attendance a SET company_id = COALESCE(e.company_id, '00000000-0000-4000-8000-000000000001')
FROM hr_employees e WHERE a.employee_id = e.id AND a.company_id IS NULL;
UPDATE hr_holidays SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;

UPDATE payroll_runs SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE payroll_entries pe SET company_id = COALESCE(pr.company_id, '00000000-0000-4000-8000-000000000001')
FROM payroll_runs pr WHERE pe.run_id = pr.id AND pe.company_id IS NULL;
UPDATE payroll_settings SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_geofences_company ON geofences(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON hr_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_company ON ledger_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id);

CREATE TABLE IF NOT EXISTS accounting_report_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    report_type     VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
    result_json     JSONB,
    error_text      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_accounting_report_jobs_pending ON accounting_report_jobs(status, created_at) WHERE status = 'Pending';
CREATE INDEX IF NOT EXISTS idx_accounting_report_jobs_company_type ON accounting_report_jobs(company_id, report_type, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_company ON warehouse_inventory(company_id);
