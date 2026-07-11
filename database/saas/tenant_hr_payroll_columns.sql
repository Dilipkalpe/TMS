-- Tenant columns for HR & Payroll (idempotent)

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

CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON hr_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
