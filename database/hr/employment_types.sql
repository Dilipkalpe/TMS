-- TMS Pro — Employment types: Permanent, Contract, Daily + statutory norms

ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) NOT NULL DEFAULT 'Permanent';
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS daily_wage DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS esi_applicable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS insurance_applicable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Drop old constraint if exists and add employment_type check
DO $$ BEGIN
    ALTER TABLE hr_employees DROP CONSTRAINT IF EXISTS hr_employees_employment_type_check;
    ALTER TABLE hr_employees ADD CONSTRAINT hr_employees_employment_type_check
        CHECK (employment_type IN ('Permanent', 'Contract', 'Daily'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS ix_hr_employees_employment ON hr_employees(employment_type);

-- Payroll entry columns for employment-based deductions
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20);
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS esi_deduction DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS insurance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS days_worked DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Statutory settings per employment norms
INSERT INTO payroll_settings (key, value, description) VALUES
    ('esi_rate', '0.75', 'ESI employee contribution % of gross (Permanent staff)'),
    ('esi_wage_ceiling', '21000', 'Max gross for ESI applicability'),
    ('insurance_permanent', '500', 'Monthly insurance deduction — Permanent'),
    ('insurance_contract', '300', 'Monthly insurance deduction — Contract'),
    ('insurance_daily_per_day', '30', 'Insurance per day worked — Daily'),
    ('contract_pf_applicable', '0', 'Apply PF for Contract (0=no, 1=yes)'),
    ('daily_pf_applicable', '0', 'Apply PF for Daily workers (0=no, 1=yes)')
ON CONFLICT (key) DO NOTHING;

-- Default norms on existing employees
UPDATE hr_employees SET employment_type = 'Permanent' WHERE employment_type IS NULL OR employment_type = '';
UPDATE hr_employees SET
    pf_applicable = TRUE, esi_applicable = TRUE, insurance_applicable = TRUE,
    insurance_amount = 500
WHERE employment_type = 'Permanent' AND insurance_amount = 0;

UPDATE hr_employees SET
    pf_applicable = FALSE, esi_applicable = FALSE, insurance_applicable = TRUE,
    insurance_amount = 300
WHERE employment_type = 'Contract';

UPDATE hr_employees SET employment_type = 'Permanent', pf_applicable = TRUE, esi_applicable = TRUE
WHERE driver_id IS NOT NULL;
