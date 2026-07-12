-- Install tenant-aware sp_hr_save_employee (39 parameters including p_company_id).
-- Safe to re-run. No psql meta-commands (runs via Npgsql in API startup).

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'sp_hr_save_employee'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
    END LOOP;
END $$;

ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) NOT NULL DEFAULT 'Permanent';
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS daily_wage DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS esi_applicable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS insurance_applicable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS assigned_vehicle_id VARCHAR(50);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS route_allowance DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS fuel_allowance DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS loading_allowance DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS halting_allowance DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS driver_bhatta DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON hr_employees(company_id);

CREATE OR REPLACE FUNCTION sp_hr_save_employee(
    p_company_id UUID,
    p_id UUID, p_employee_code VARCHAR, p_name VARCHAR,
    p_employee_type VARCHAR DEFAULT 'Staff', p_employment_type VARCHAR DEFAULT 'Permanent',
    p_department_id UUID DEFAULT NULL, p_designation_id UUID DEFAULT NULL, p_driver_id VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL, p_phone VARCHAR DEFAULT NULL,
    p_date_of_joining DATE DEFAULT NULL, p_date_of_birth DATE DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL, p_address TEXT DEFAULT NULL,
    p_bank_account VARCHAR DEFAULT NULL, p_bank_ifsc VARCHAR DEFAULT NULL, p_pan VARCHAR DEFAULT NULL,
    p_basic_salary DECIMAL DEFAULT 0, p_daily_wage DECIMAL DEFAULT 0,
    p_hra DECIMAL DEFAULT 0, p_da DECIMAL DEFAULT 0, p_conveyance DECIMAL DEFAULT 0,
    p_other_allowance DECIMAL DEFAULT 0, p_advance DECIMAL DEFAULT 0,
    p_pf_applicable BOOLEAN DEFAULT TRUE, p_esi_applicable BOOLEAN DEFAULT TRUE,
    p_insurance_applicable BOOLEAN DEFAULT TRUE, p_insurance_amount DECIMAL DEFAULT 0,
    p_contract_end_date DATE DEFAULT NULL,
    p_license_number VARCHAR DEFAULT NULL, p_license_expiry DATE DEFAULT NULL,
    p_assigned_vehicle_id VARCHAR DEFAULT NULL,
    p_route_allowance DECIMAL DEFAULT 0, p_fuel_allowance DECIMAL DEFAULT 0,
    p_loading_allowance DECIMAL DEFAULT 0, p_halting_allowance DECIMAL DEFAULT 0,
    p_driver_bhatta DECIMAL DEFAULT 0, p_status VARCHAR DEFAULT 'Active'
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO hr_employees (
            company_id, employee_code, name, employee_type, employment_type, department_id, designation_id,
            driver_id, email, phone, date_of_joining, date_of_birth, gender, address,
            bank_account, bank_ifsc, pan, basic_salary, daily_wage, hra, da, conveyance,
            other_allowance, advance, pf_applicable, esi_applicable, insurance_applicable,
            insurance_amount, contract_end_date, license_number, license_expiry, assigned_vehicle_id,
            route_allowance, fuel_allowance, loading_allowance, halting_allowance, driver_bhatta, status
        ) VALUES (
            p_company_id, p_employee_code, p_name, COALESCE(p_employee_type, 'Staff'), COALESCE(p_employment_type, 'Permanent'),
            p_department_id, p_designation_id, p_driver_id, p_email, p_phone,
            p_date_of_joining, p_date_of_birth, p_gender, p_address, p_bank_account, p_bank_ifsc, p_pan,
            COALESCE(p_basic_salary, 0), COALESCE(p_daily_wage, 0), COALESCE(p_hra, 0), COALESCE(p_da, 0),
            COALESCE(p_conveyance, 0), COALESCE(p_other_allowance, 0), COALESCE(p_advance, 0),
            COALESCE(p_pf_applicable, TRUE), COALESCE(p_esi_applicable, TRUE),
            COALESCE(p_insurance_applicable, TRUE), COALESCE(p_insurance_amount, 0), p_contract_end_date,
            p_license_number, p_license_expiry, p_assigned_vehicle_id,
            COALESCE(p_route_allowance, 0), COALESCE(p_fuel_allowance, 0),
            COALESCE(p_loading_allowance, 0), COALESCE(p_halting_allowance, 0), COALESCE(p_driver_bhatta, 0),
            COALESCE(p_status, 'Active')
        ) RETURNING id INTO v_id;
    ELSE
        UPDATE hr_employees SET
            employee_code = p_employee_code, name = p_name,
            employee_type = COALESCE(p_employee_type, employee_type),
            employment_type = COALESCE(p_employment_type, employment_type),
            department_id = p_department_id, designation_id = p_designation_id, driver_id = p_driver_id,
            email = p_email, phone = p_phone, date_of_joining = p_date_of_joining, date_of_birth = p_date_of_birth,
            gender = p_gender, address = p_address, bank_account = p_bank_account, bank_ifsc = p_bank_ifsc, pan = p_pan,
            basic_salary = COALESCE(p_basic_salary, basic_salary), daily_wage = COALESCE(p_daily_wage, daily_wage),
            hra = COALESCE(p_hra, hra), da = COALESCE(p_da, da), conveyance = COALESCE(p_conveyance, conveyance),
            other_allowance = COALESCE(p_other_allowance, other_allowance), advance = COALESCE(p_advance, advance),
            pf_applicable = COALESCE(p_pf_applicable, pf_applicable),
            esi_applicable = COALESCE(p_esi_applicable, esi_applicable),
            insurance_applicable = COALESCE(p_insurance_applicable, insurance_applicable),
            insurance_amount = COALESCE(p_insurance_amount, insurance_amount),
            contract_end_date = p_contract_end_date,
            license_number = p_license_number, license_expiry = p_license_expiry,
            assigned_vehicle_id = p_assigned_vehicle_id,
            route_allowance = COALESCE(p_route_allowance, route_allowance),
            fuel_allowance = COALESCE(p_fuel_allowance, fuel_allowance),
            loading_allowance = COALESCE(p_loading_allowance, loading_allowance),
            halting_allowance = COALESCE(p_halting_allowance, halting_allowance),
            driver_bhatta = COALESCE(p_driver_bhatta, driver_bhatta),
            status = COALESCE(p_status, status), updated_at = NOW()
        WHERE id = p_id AND company_id = p_company_id
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
