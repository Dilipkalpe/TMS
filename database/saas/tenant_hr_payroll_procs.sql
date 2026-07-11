-- Tenant-scoped HR & Payroll procedures — run LAST (after hr/payroll install scripts).
\ir ../hr/upgrade_drop_employee_sp.sql

DROP FUNCTION IF EXISTS sp_hr_summary();
DROP FUNCTION IF EXISTS sp_hr_list_departments();
DROP FUNCTION IF EXISTS sp_hr_save_department(uuid, character varying, character varying, text, character varying);
DROP FUNCTION IF EXISTS sp_hr_delete_employee(uuid);
DROP FUNCTION IF EXISTS sp_payroll_summary();
DROP FUNCTION IF EXISTS sp_payroll_generate(integer, integer, character varying);
DROP FUNCTION IF EXISTS sp_payroll_list_runs(integer, integer, character varying);
DROP FUNCTION IF EXISTS sp_payroll_get_run(uuid);
DROP FUNCTION IF EXISTS sp_payroll_list_runs(uuid, integer, integer, character varying);
DROP FUNCTION IF EXISTS sp_payroll_get_run(uuid, uuid);

DROP FUNCTION IF EXISTS sp_payroll_list_runs(uuid, integer, integer, character varying);
DROP FUNCTION IF EXISTS sp_payroll_get_run(uuid, uuid);

CREATE OR REPLACE FUNCTION sp_hr_summary(p_company_id UUID)
RETURNS TABLE (
    total_employees BIGINT, active_employees BIGINT, on_leave BIGINT,
    departments BIGINT, pending_leaves BIGINT, today_present BIGINT, today_absent BIGINT
) AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT COUNT(*) FROM hr_employees WHERE company_id = p_company_id)::BIGINT,
        (SELECT COUNT(*) FROM hr_employees WHERE company_id = p_company_id AND status = 'Active')::BIGINT,
        (SELECT COUNT(*) FROM hr_employees WHERE company_id = p_company_id AND status = 'On Leave')::BIGINT,
        (SELECT COUNT(*) FROM hr_departments WHERE company_id = p_company_id AND status = 'Active')::BIGINT,
        (SELECT COUNT(*) FROM hr_leave_requests WHERE company_id = p_company_id AND status = 'Pending')::BIGINT,
        (SELECT COUNT(*) FROM hr_attendance a JOIN hr_employees e ON e.id = a.employee_id
         WHERE e.company_id = p_company_id AND a.attendance_date = CURRENT_DATE AND a.status = 'Present')::BIGINT,
        (SELECT COUNT(*) FROM hr_attendance a JOIN hr_employees e ON e.id = a.employee_id
         WHERE e.company_id = p_company_id AND a.attendance_date = CURRENT_DATE AND a.status = 'Absent')::BIGINT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_list_departments(p_company_id UUID)
RETURNS TABLE (
    id UUID, code VARCHAR, name VARCHAR, description TEXT,
    status VARCHAR, employee_count BIGINT, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.code, d.name, d.description, d.status,
           (SELECT COUNT(*) FROM hr_employees e WHERE e.department_id = d.id AND e.company_id = p_company_id)::BIGINT,
           d.created_at
    FROM hr_departments d
    WHERE d.company_id = p_company_id
    ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_save_department(
    p_company_id UUID, p_id UUID, p_code VARCHAR, p_name VARCHAR,
    p_description TEXT DEFAULT NULL, p_status VARCHAR DEFAULT 'Active'
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO hr_departments (company_id, code, name, description, status)
        VALUES (p_company_id, p_code, p_name, p_description, COALESCE(p_status, 'Active'))
        RETURNING id INTO v_id;
    ELSE
        UPDATE hr_departments SET
            code = p_code, name = p_name, description = p_description,
            status = COALESCE(p_status, status), updated_at = NOW()
        WHERE id = p_id AND company_id = p_company_id
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_list_employees(
    p_company_id UUID,
    p_department_id UUID DEFAULT NULL,
    p_employee_type VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_employment_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_code VARCHAR, name VARCHAR, employee_type VARCHAR,
    employment_type VARCHAR, department_id UUID, department_name VARCHAR,
    designation_id UUID, designation_name VARCHAR,
    driver_id VARCHAR, email VARCHAR, phone VARCHAR,
    date_of_joining DATE, basic_salary DECIMAL, daily_wage DECIMAL,
    hra DECIMAL, da DECIMAL, conveyance DECIMAL, other_allowance DECIMAL,
    advance DECIMAL, pf_applicable BOOLEAN, esi_applicable BOOLEAN,
    insurance_applicable BOOLEAN, insurance_amount DECIMAL,
    contract_end_date DATE, status VARCHAR, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.employee_code, e.name, e.employee_type,
           COALESCE(e.employment_type, 'Permanent'),
           e.department_id, d.name, e.designation_id, g.name,
           e.driver_id, e.email, e.phone, e.date_of_joining,
           e.basic_salary, COALESCE(e.daily_wage, 0),
           e.hra, e.da, e.conveyance, e.other_allowance, e.advance,
           e.pf_applicable, COALESCE(e.esi_applicable, FALSE),
           COALESCE(e.insurance_applicable, TRUE), COALESCE(e.insurance_amount, 0),
           e.contract_end_date, e.status, e.created_at
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id AND d.company_id = p_company_id
    LEFT JOIN hr_designations g ON g.id = e.designation_id
    WHERE e.company_id = p_company_id
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
      AND (p_employee_type IS NULL OR p_employee_type = '' OR e.employee_type = p_employee_type)
      AND (p_status IS NULL OR p_status = '' OR e.status = p_status)
      AND (p_employment_type IS NULL OR p_employment_type = '' OR e.employment_type = p_employment_type)
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_get_employee(p_company_id UUID, p_id UUID)
RETURNS TABLE (
    id UUID, employee_code VARCHAR, name VARCHAR, employee_type VARCHAR,
    employment_type VARCHAR, department_id UUID, department_name VARCHAR,
    designation_id UUID, designation_name VARCHAR,
    driver_id VARCHAR, email VARCHAR, phone VARCHAR,
    date_of_joining DATE, date_of_birth DATE, gender VARCHAR, address TEXT,
    bank_account VARCHAR, bank_ifsc VARCHAR, pan VARCHAR,
    basic_salary DECIMAL, daily_wage DECIMAL, hra DECIMAL, da DECIMAL,
    conveyance DECIMAL, other_allowance DECIMAL, advance DECIMAL,
    pf_applicable BOOLEAN, esi_applicable BOOLEAN, insurance_applicable BOOLEAN,
    insurance_amount DECIMAL, contract_end_date DATE,
    license_number VARCHAR, license_expiry DATE, assigned_vehicle_id VARCHAR,
    route_allowance DECIMAL, fuel_allowance DECIMAL, loading_allowance DECIMAL,
    halting_allowance DECIMAL, driver_bhatta DECIMAL,
    status VARCHAR, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.employee_code, e.name, e.employee_type, COALESCE(e.employment_type, 'Permanent'),
           e.department_id, d.name, e.designation_id, g.name, e.driver_id, e.email, e.phone,
           e.date_of_joining, e.date_of_birth, e.gender, e.address, e.bank_account, e.bank_ifsc, e.pan,
           e.basic_salary, COALESCE(e.daily_wage, 0), e.hra, e.da, e.conveyance, e.other_allowance, e.advance,
           e.pf_applicable, COALESCE(e.esi_applicable, FALSE), COALESCE(e.insurance_applicable, TRUE),
           COALESCE(e.insurance_amount, 0), e.contract_end_date,
           e.license_number, e.license_expiry, e.assigned_vehicle_id,
           COALESCE(e.route_allowance, 0), COALESCE(e.fuel_allowance, 0),
           COALESCE(e.loading_allowance, 0), COALESCE(e.halting_allowance, 0), COALESCE(e.driver_bhatta, 0),
           e.status, e.created_at
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id AND d.company_id = p_company_id
    LEFT JOIN hr_designations g ON g.id = e.designation_id
    WHERE e.id = p_id AND e.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION sp_hr_delete_employee(p_company_id UUID, p_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM hr_employees WHERE id = p_id AND company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_summary(p_company_id UUID)
RETURNS TABLE (
    total_runs BIGINT, draft_runs BIGINT, processed_runs BIGINT, paid_runs BIGINT,
    total_paid_amount DECIMAL, active_drivers BIGINT, active_employees BIGINT, last_run_period VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'Draft')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'Processed')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'Paid')::BIGINT,
        COALESCE(SUM(total_net) FILTER (WHERE status = 'Paid'), 0),
        (SELECT COUNT(*) FROM drivers WHERE status = 'Active' AND company_id = p_company_id)::BIGINT,
        (SELECT COUNT(*) FROM hr_employees WHERE status = 'Active' AND company_id = p_company_id)::BIGINT,
        (SELECT period_label FROM payroll_runs
         WHERE company_id = p_company_id AND status <> 'Cancelled'
         ORDER BY pay_year DESC, pay_month DESC LIMIT 1)
    FROM payroll_runs
    WHERE company_id = p_company_id AND status <> 'Cancelled';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_list_runs(
    p_company_id UUID, p_month INT DEFAULT NULL, p_year INT DEFAULT NULL, p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    run_code VARCHAR,
    pay_month INT,
    pay_year INT,
    period_label VARCHAR,
    status VARCHAR,
    total_gross DECIMAL,
    total_deductions DECIMAL,
    total_net DECIMAL,
    entry_count INT,
    payment_mode VARCHAR,
    processed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    remarks TEXT,
    voucher_id UUID,
    voucher_no VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id, r.run_code, r.pay_month, r.pay_year, r.period_label, r.status,
        r.total_gross, r.total_deductions, r.total_net, r.entry_count,
        r.payment_mode, r.processed_at, r.paid_at, r.remarks, r.voucher_id, r.voucher_no, r.created_at
    FROM payroll_runs r
    WHERE r.company_id = p_company_id
      AND (p_month IS NULL OR r.pay_month = p_month)
      AND (p_year IS NULL OR r.pay_year = p_year)
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
    ORDER BY r.pay_year DESC, r.pay_month DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_get_run(p_company_id UUID, p_run_id UUID)
RETURNS TABLE (
    id UUID,
    run_code VARCHAR,
    pay_month INT,
    pay_year INT,
    period_label VARCHAR,
    status VARCHAR,
    total_gross DECIMAL,
    total_deductions DECIMAL,
    total_net DECIMAL,
    entry_count INT,
    payment_mode VARCHAR,
    processed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    remarks TEXT,
    voucher_id UUID,
    voucher_no VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id, r.run_code, r.pay_month, r.pay_year, r.period_label, r.status,
        r.total_gross, r.total_deductions, r.total_net, r.entry_count,
        r.payment_mode, r.processed_at, r.paid_at, r.remarks, r.voucher_id, r.voucher_no, r.created_at
    FROM payroll_runs r
    WHERE r.id = p_run_id AND r.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Tenant-aware payroll generation (based on tms_transport_payroll.sql)
CREATE OR REPLACE FUNCTION sp_payroll_generate(
    p_company_id UUID, p_month INT, p_year INT, p_created_by VARCHAR DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
    v_run_id UUID; v_run_code VARCHAR(30); v_period_label VARCHAR(20);
    v_month_names TEXT[] := ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    v_emp RECORD; v_basic DECIMAL(12,2); v_hra DECIMAL(12,2); v_da DECIMAL(12,2);
    v_conv DECIMAL(12,2); v_other_allow DECIMAL(12,2); v_trip_bonus DECIMAL(12,2);
    v_overtime DECIMAL(12,2); v_tms_allow DECIMAL(12,2); v_gross DECIMAL(12,2);
    v_pf DECIMAL(12,2); v_esi DECIMAL(12,2); v_insurance DECIMAL(12,2);
    v_advance_rec DECIMAL(12,2); v_pt DECIMAL(12,2); v_lop DECIMAL(12,2); v_other_ded DECIMAL(12,2);
    v_deductions DECIMAL(12,2); v_net DECIMAL(12,2);
    v_total_gross DECIMAL(14,2) := 0; v_total_ded DECIMAL(14,2) := 0; v_total_net DECIMAL(14,2) := 0;
    v_count INT := 0;
    v_pf_rate DECIMAL := fn_payroll_setting_decimal('pf_rate', 12);
    v_esi_rate DECIMAL := fn_payroll_setting_decimal('esi_rate', 0.75);
    v_esi_ceiling DECIMAL := fn_payroll_setting_decimal('esi_wage_ceiling', 21000);
    v_trip_rate DECIMAL := fn_payroll_setting_decimal('trip_bonus_per_trip', 25);
    v_trip_max DECIMAL := fn_payroll_setting_decimal('trip_bonus_max', 5000);
    v_ot_rate DECIMAL := fn_payroll_setting_decimal('overtime_rate_per_hour', 100);
    v_pt_amt DECIMAL := fn_payroll_setting_decimal('professional_tax', 200);
    v_work_days DECIMAL := fn_payroll_setting_decimal('working_days_per_month', 26);
    v_ins_perm DECIMAL := fn_payroll_setting_decimal('insurance_permanent', 500);
    v_ins_contract DECIMAL := fn_payroll_setting_decimal('insurance_contract', 300);
    v_ins_daily_day DECIMAL := fn_payroll_setting_decimal('insurance_daily_per_day', 30);
    v_contract_pf INT := fn_payroll_setting_decimal('contract_pf_applicable', 0)::INT;
    v_daily_pf INT := fn_payroll_setting_decimal('daily_pf_applicable', 0)::INT;
    v_route_def DECIMAL := fn_payroll_setting_decimal('route_allowance_default', 1500);
    v_fuel_per_trip DECIMAL := fn_payroll_setting_decimal('fuel_allowance_per_trip', 50);
    v_load_allow DECIMAL := fn_payroll_setting_decimal('loading_unloading_allowance', 500);
    v_halt_per_trip DECIMAL := fn_payroll_setting_decimal('halting_allowance_per_trip', 100);
    v_bhatta_day DECIMAL := fn_payroll_setting_decimal('driver_bhatta_per_day', 200);
    v_safety_bonus DECIMAL := fn_payroll_setting_decimal('tms_safety_bonus', 1000);
    v_absent_days DECIMAL(5,2); v_ot_hours DECIMAL(5,2); v_present_days DECIMAL(5,2);
    v_driver_trips INT; v_emp_id_str VARCHAR(20); v_emp_pay_type VARCHAR(20);
    v_apply_pf BOOLEAN; v_apply_esi BOOLEAN; v_apply_ins BOOLEAN;
BEGIN
    IF p_month < 1 OR p_month > 12 THEN RAISE EXCEPTION 'Invalid month: %', p_month; END IF;
    IF EXISTS (
        SELECT 1 FROM payroll_runs
        WHERE company_id = p_company_id AND pay_month = p_month AND pay_year = p_year
          AND status IN ('Draft','Processed','Paid')
    ) THEN RAISE EXCEPTION 'Payroll already exists for %/%', p_month, p_year; END IF;

    v_period_label := v_month_names[p_month] || '-' || p_year::TEXT;
    v_run_code := 'PAY-' || p_year::TEXT || '-' || LPAD(p_month::TEXT, 2, '0');
    INSERT INTO payroll_runs (company_id, run_code, pay_month, pay_year, period_label, status, created_by)
    VALUES (p_company_id, v_run_code, p_month, p_year, v_period_label, 'Draft', COALESCE(p_created_by, 'system'))
    RETURNING id INTO v_run_id;

    FOR v_emp IN
        SELECT e.*, d.trips AS driver_trips, d.license_expiry AS driver_license_expiry
        FROM hr_employees e
        LEFT JOIN drivers d ON d.id = e.driver_id AND d.company_id = p_company_id
        WHERE e.company_id = p_company_id AND e.status IN ('Active', 'On Leave')
          AND (e.employment_type = 'Daily' AND COALESCE(e.daily_wage, 0) > 0
            OR e.employment_type <> 'Daily' AND (e.basic_salary + e.hra + e.da + e.conveyance + e.other_allowance) > 0)
        ORDER BY e.name
    LOOP
        v_emp_pay_type := COALESCE(v_emp.employment_type, 'Permanent');
        v_emp_id_str := v_emp.employee_code;
        v_tms_allow := 0;

        SELECT COALESCE(COUNT(*) FILTER (WHERE a.status = 'Present'), 0)
             + COALESCE(COUNT(*) FILTER (WHERE a.status = 'Half Day'), 0) * 0.5,
               COALESCE(COUNT(*) FILTER (WHERE a.status = 'Absent'), 0)
             + COALESCE(COUNT(*) FILTER (WHERE a.status = 'Half Day'), 0) * 0.5,
               COALESCE(SUM(a.overtime_hours), 0)
        INTO v_present_days, v_absent_days, v_ot_hours
        FROM hr_attendance a WHERE a.employee_id = v_emp.id
          AND EXTRACT(MONTH FROM a.attendance_date) = p_month AND EXTRACT(YEAR FROM a.attendance_date) = p_year;

        v_trip_bonus := 0;
        v_driver_trips := COALESCE(v_emp.driver_trips, 0);
        IF v_emp.employee_type = 'Driver' AND v_emp.driver_id IS NOT NULL THEN
            v_trip_bonus := LEAST(v_driver_trips * v_trip_rate, v_trip_max);
            v_tms_allow := COALESCE(NULLIF(v_emp.route_allowance, 0), v_route_def)
                + (v_driver_trips * v_fuel_per_trip) + COALESCE(v_emp.fuel_allowance, 0)
                + COALESCE(v_emp.loading_allowance, 0)
                + (v_driver_trips * COALESCE(NULLIF(v_emp.halting_allowance, 0), v_halt_per_trip))
                + (GREATEST(v_present_days, 0) * COALESCE(NULLIF(v_emp.driver_bhatta, 0), v_bhatta_day))
                + v_safety_bonus;
        ELSIF v_emp.employee_type = 'Loader' THEN
            v_tms_allow := COALESCE(v_emp.loading_allowance, v_load_allow);
        END IF;

        v_overtime := ROUND(v_ot_hours * v_ot_rate, 2);

        IF v_emp_pay_type = 'Daily' THEN
            v_basic := ROUND(COALESCE(v_emp.daily_wage, 0) * GREATEST(v_present_days, 0), 2);
            v_hra := 0; v_da := 0; v_conv := 0; v_other_allow := 0; v_lop := 0;
            v_gross := v_basic + v_trip_bonus + v_overtime + v_tms_allow;
            v_apply_pf := v_emp.pf_applicable AND v_daily_pf = 1;
            v_apply_esi := FALSE; v_apply_ins := COALESCE(v_emp.insurance_applicable, TRUE);
            v_insurance := CASE WHEN v_apply_ins THEN ROUND(GREATEST(v_present_days, 0) * v_ins_daily_day, 2) ELSE 0 END;
            v_pt := 0;
        ELSIF v_emp_pay_type = 'Contract' THEN
            v_basic := COALESCE(v_emp.basic_salary, 0);
            v_hra := COALESCE(v_emp.hra, 0) * 0.5; v_da := COALESCE(v_emp.da, 0) * 0.5;
            v_conv := COALESCE(v_emp.conveyance, 0); v_other_allow := COALESCE(v_emp.other_allowance, 0);
            v_lop := CASE WHEN v_absent_days > 0 AND v_work_days > 0 THEN ROUND(v_basic * v_absent_days / v_work_days, 2) ELSE 0 END;
            v_gross := v_basic + v_hra + v_da + v_conv + v_other_allow + v_trip_bonus + v_overtime + v_tms_allow - v_lop;
            v_apply_pf := v_emp.pf_applicable AND v_contract_pf = 1; v_apply_esi := FALSE;
            v_apply_ins := COALESCE(v_emp.insurance_applicable, TRUE);
            v_insurance := CASE WHEN v_apply_ins THEN COALESCE(NULLIF(v_emp.insurance_amount, 0), v_ins_contract) ELSE 0 END;
            v_pt := CASE WHEN v_gross >= 15000 THEN v_pt_amt ELSE 0 END;
        ELSE
            v_basic := COALESCE(v_emp.basic_salary, 0);
            v_hra := COALESCE(v_emp.hra, 0); v_da := COALESCE(v_emp.da, 0);
            v_conv := COALESCE(v_emp.conveyance, 0); v_other_allow := COALESCE(v_emp.other_allowance, 0);
            v_lop := CASE WHEN v_absent_days > 0 AND v_work_days > 0 THEN ROUND(v_basic * v_absent_days / v_work_days, 2) ELSE 0 END;
            v_gross := v_basic + v_hra + v_da + v_conv + v_other_allow + v_trip_bonus + v_overtime + v_tms_allow - v_lop;
            v_apply_pf := COALESCE(v_emp.pf_applicable, TRUE);
            v_apply_esi := COALESCE(v_emp.esi_applicable, TRUE);
            v_apply_ins := COALESCE(v_emp.insurance_applicable, TRUE);
            v_insurance := CASE WHEN v_apply_ins THEN COALESCE(NULLIF(v_emp.insurance_amount, 0), v_ins_perm) ELSE 0 END;
            v_pt := v_pt_amt;
        END IF;

        IF v_gross < 0 THEN v_gross := 0; END IF;
        v_pf := CASE WHEN v_apply_pf THEN ROUND(v_basic * v_pf_rate / 100, 2) ELSE 0 END;
        v_esi := CASE WHEN v_apply_esi AND v_gross <= v_esi_ceiling THEN ROUND(v_gross * v_esi_rate / 100, 2) ELSE 0 END;
        v_advance_rec := LEAST(COALESCE(v_emp.advance, 0), GREATEST(v_gross - v_pf - v_esi - v_insurance - v_pt, 0));
        v_other_ded := v_lop + v_pt;
        v_deductions := v_pf + v_esi + v_insurance + v_advance_rec;
        v_net := v_gross - v_deductions - v_other_ded;
        IF v_net < 0 THEN v_net := 0; END IF;

        INSERT INTO payroll_entries (
            company_id, run_id, employee_type, employee_id, employee_name, employment_type,
            basic_salary, trip_incentive, overtime, other_allowance, tms_allowance, gross_pay,
            pf_deduction, esi_deduction, insurance_deduction, advance_recovery,
            other_deduction, days_worked, net_pay
        ) VALUES (
            p_company_id, v_run_id, v_emp.employee_type, v_emp_id_str, v_emp.name, v_emp_pay_type,
            v_basic, v_trip_bonus, v_overtime, v_hra + v_da + v_conv + v_other_allow, v_tms_allow, v_gross,
            v_pf, v_esi, v_insurance, v_advance_rec, v_other_ded, v_present_days, v_net
        );
        v_total_gross := v_total_gross + v_gross; v_total_ded := v_total_ded + v_deductions + v_other_ded;
        v_total_net := v_total_net + v_net; v_count := v_count + 1;
    END LOOP;

    FOR v_emp IN
        SELECT d.id, d.name, d.salary, d.advance, d.trips FROM drivers d
        WHERE d.company_id = p_company_id AND d.status = 'Active' AND COALESCE(d.salary, 0) > 0
          AND NOT EXISTS (SELECT 1 FROM hr_employees e WHERE e.driver_id = d.id AND e.company_id = p_company_id)
    LOOP
        v_basic := COALESCE(v_emp.salary, 0);
        v_driver_trips := COALESCE(v_emp.trips, 0);
        v_trip_bonus := LEAST(v_driver_trips * v_trip_rate, v_trip_max);
        v_tms_allow := v_route_def + (v_driver_trips * v_fuel_per_trip) + (v_driver_trips * v_halt_per_trip)
            + (26 * v_bhatta_day) + v_safety_bonus;
        v_gross := v_basic + v_trip_bonus + v_tms_allow;
        v_pf := ROUND(v_basic * v_pf_rate / 100, 2);
        v_esi := CASE WHEN v_gross <= v_esi_ceiling THEN ROUND(v_gross * v_esi_rate / 100, 2) ELSE 0 END;
        v_insurance := v_ins_perm;
        v_advance_rec := LEAST(COALESCE(v_emp.advance, 0), GREATEST(v_gross - v_pf - v_esi - v_insurance - v_pt_amt, 0));
        v_net := v_gross - v_pf - v_esi - v_insurance - v_advance_rec - v_pt_amt;
        IF v_net < 0 THEN v_net := 0; END IF;
        INSERT INTO payroll_entries (
            company_id, run_id, employee_type, employee_id, employee_name, employment_type,
            basic_salary, trip_incentive, tms_allowance, gross_pay, pf_deduction, esi_deduction,
            insurance_deduction, advance_recovery, other_deduction, days_worked, net_pay
        ) VALUES (
            p_company_id, v_run_id, 'Driver', v_emp.id, v_emp.name, 'Permanent',
            v_basic, v_trip_bonus, v_tms_allow, v_gross, v_pf, v_esi, v_insurance, v_advance_rec, v_pt_amt, 26, v_net
        );
        v_total_gross := v_total_gross + v_gross; v_total_ded := v_total_ded + v_pf + v_esi + v_insurance + v_advance_rec + v_pt_amt;
        v_total_net := v_total_net + v_net; v_count := v_count + 1;
    END LOOP;

    UPDATE payroll_runs SET total_gross = v_total_gross, total_deductions = v_total_ded,
        total_net = v_total_net, entry_count = v_count, updated_at = NOW() WHERE id = v_run_id;
    RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Remaining tenant-scoped HR & Payroll procedures (replace inline SQL in C# services)

DROP FUNCTION IF EXISTS sp_hr_list_designations(uuid);
DROP FUNCTION IF EXISTS sp_hr_list_attendance(uuid, date, uuid, integer, integer);
DROP FUNCTION IF EXISTS sp_hr_list_leave_types(uuid);
DROP FUNCTION IF EXISTS sp_hr_list_leave_requests(uuid, character varying, uuid);
DROP FUNCTION IF EXISTS sp_hr_apply_leave(uuid, uuid, uuid, date, date, numeric, text);
DROP FUNCTION IF EXISTS sp_hr_list_holidays(uuid, integer);
DROP FUNCTION IF EXISTS sp_hr_ensure_employee(uuid, uuid);
DROP FUNCTION IF EXISTS sp_hr_ensure_department(uuid, uuid);
DROP FUNCTION IF EXISTS sp_hr_ensure_leave_request(uuid, uuid);
DROP FUNCTION IF EXISTS sp_hr_upsert_attendance(uuid, uuid, date, character varying, time without time zone, time without time zone, numeric, text);
DROP FUNCTION IF EXISTS sp_payroll_list_settings(uuid);
DROP FUNCTION IF EXISTS sp_payroll_update_setting(uuid, character varying, text);
DROP FUNCTION IF EXISTS sp_payroll_list_payslips(uuid, uuid, character varying, integer, integer);
DROP FUNCTION IF EXISTS sp_payroll_salary_register(uuid, integer, integer);
DROP FUNCTION IF EXISTS sp_payroll_ensure_run(uuid, uuid);
DROP FUNCTION IF EXISTS sp_payroll_ensure_entry(uuid, uuid);
DROP FUNCTION IF EXISTS sp_payroll_ensure_setting(uuid, character varying);

CREATE OR REPLACE FUNCTION sp_hr_list_designations(p_company_id UUID)
RETURNS TABLE (
    id UUID, code VARCHAR, name VARCHAR, department_id UUID,
    department_name VARCHAR, grade_level INT, status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.code, g.name, g.department_id, d.name, g.grade_level, g.status
    FROM hr_designations g
    LEFT JOIN hr_departments d ON d.id = g.department_id AND d.company_id = p_company_id
    WHERE g.company_id = p_company_id
    ORDER BY g.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_list_attendance(
    p_company_id UUID,
    p_date DATE DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_id UUID, employee_code VARCHAR, employee_name VARCHAR,
    attendance_date DATE, status VARCHAR, check_in TIME, check_out TIME,
    overtime_hours DECIMAL, remarks TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.employee_id, e.employee_code, e.name,
           a.attendance_date, a.status, a.check_in, a.check_out,
           a.overtime_hours, a.remarks
    FROM hr_attendance a
    JOIN hr_employees e ON e.id = a.employee_id AND e.company_id = p_company_id
    WHERE (p_date IS NULL OR a.attendance_date = p_date)
      AND (p_employee_id IS NULL OR a.employee_id = p_employee_id)
      AND (p_month IS NULL OR EXTRACT(MONTH FROM a.attendance_date) = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM a.attendance_date) = p_year)
    ORDER BY a.attendance_date DESC, e.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_list_leave_types(p_company_id UUID)
RETURNS TABLE (
    id UUID, code VARCHAR, name VARCHAR, days_per_year INT,
    is_paid BOOLEAN, status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT lt.id, lt.code, lt.name, lt.days_per_year, lt.is_paid, lt.status
    FROM hr_leave_types lt
    WHERE lt.company_id = p_company_id
    ORDER BY lt.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_list_leave_requests(
    p_company_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_id UUID, employee_code VARCHAR, employee_name VARCHAR,
    leave_type_id UUID, leave_type_name VARCHAR,
    from_date DATE, to_date DATE, days DECIMAL, reason TEXT,
    status VARCHAR, approved_by VARCHAR, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT lr.id, lr.employee_id, e.employee_code, e.name,
           lr.leave_type_id, lt.name,
           lr.from_date, lr.to_date, lr.days, lr.reason,
           lr.status, lr.approved_by, lr.approved_at, lr.created_at
    FROM hr_leave_requests lr
    JOIN hr_employees e ON e.id = lr.employee_id AND e.company_id = p_company_id
    JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
    WHERE (lr.company_id = p_company_id OR e.company_id = p_company_id)
      AND (p_status IS NULL OR p_status = '' OR lr.status = p_status)
      AND (p_employee_id IS NULL OR lr.employee_id = p_employee_id)
    ORDER BY lr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_apply_leave(
    p_company_id UUID,
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_from_date DATE,
    p_to_date DATE,
    p_days DECIMAL,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO hr_leave_requests (company_id, employee_id, leave_type_id, from_date, to_date, days, reason, status)
    VALUES (p_company_id, p_employee_id, p_leave_type_id, p_from_date, p_to_date, p_days, p_reason, 'Pending')
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_list_holidays(p_company_id UUID, p_year INT DEFAULT NULL)
RETURNS TABLE (id UUID, holiday_date DATE, name VARCHAR, year INT) AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.holiday_date, h.name, h.year
    FROM hr_holidays h
    WHERE h.company_id = p_company_id
      AND (p_year IS NULL OR h.year = p_year)
    ORDER BY h.holiday_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_ensure_employee(p_company_id UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM hr_employees WHERE id = p_id AND company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_ensure_department(p_company_id UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM hr_departments WHERE id = p_id AND company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_ensure_leave_request(p_company_id UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM hr_leave_requests lr
        LEFT JOIN hr_employees e ON e.id = lr.employee_id
        WHERE lr.id = p_id AND (lr.company_id = p_company_id OR e.company_id = p_company_id)
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_upsert_attendance(
    p_company_id UUID,
    p_employee_id UUID,
    p_date DATE,
    p_status VARCHAR,
    p_check_in TIME DEFAULT NULL,
    p_check_out TIME DEFAULT NULL,
    p_overtime_hours DECIMAL DEFAULT 0,
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO hr_attendance (company_id, employee_id, attendance_date, status, check_in, check_out, overtime_hours, remarks)
    VALUES (p_company_id, p_employee_id, p_date, p_status, p_check_in, p_check_out, COALESCE(p_overtime_hours, 0), p_remarks)
    ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
        status = EXCLUDED.status,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        overtime_hours = EXCLUDED.overtime_hours,
        remarks = EXCLUDED.remarks,
        company_id = EXCLUDED.company_id,
        updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_list_settings(p_company_id UUID)
RETURNS TABLE (key VARCHAR, value TEXT, description TEXT, updated_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT s.key, s.value, s.description, s.updated_at
    FROM payroll_settings s
    WHERE s.company_id = p_company_id
    ORDER BY s.key;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_update_setting(p_company_id UUID, p_key VARCHAR, p_value TEXT)
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
    UPDATE payroll_settings SET value = p_value, updated_at = NOW()
    WHERE key = p_key AND company_id = p_company_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_list_payslips(
    p_company_id UUID,
    p_run_id UUID DEFAULT NULL,
    p_employee_id VARCHAR DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID, run_id UUID, run_code VARCHAR, period_label VARCHAR,
    employee_id VARCHAR, employee_name VARCHAR, employee_type VARCHAR,
    gross_pay DECIMAL, net_pay DECIMAL, payment_status VARCHAR, paid_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT pe.id, pe.run_id, pr.run_code, pr.period_label,
           pe.employee_id, pe.employee_name, pe.employee_type,
           pe.gross_pay, pe.net_pay, pe.payment_status, pe.paid_at
    FROM payroll_entries pe
    JOIN payroll_runs pr ON pr.id = pe.run_id AND pr.company_id = p_company_id
    WHERE pe.company_id = p_company_id
      AND pr.status <> 'Cancelled'
      AND (p_run_id IS NULL OR pe.run_id = p_run_id)
      AND (p_employee_id IS NULL OR p_employee_id = '' OR pe.employee_id = p_employee_id)
      AND (p_month IS NULL OR pr.pay_month = p_month)
      AND (p_year IS NULL OR pr.pay_year = p_year)
    ORDER BY pr.pay_year DESC, pr.pay_month DESC, pe.employee_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_salary_register(
    p_company_id UUID,
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL
)
RETURNS TABLE (
    run_code VARCHAR, period_label VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
    employee_type VARCHAR, employment_type VARCHAR, days_worked DECIMAL,
    basic_salary DECIMAL, trip_incentive DECIMAL, overtime DECIMAL, other_allowance DECIMAL,
    tms_allowance DECIMAL, gross_pay DECIMAL,
    pf_deduction DECIMAL, esi_deduction DECIMAL, insurance_deduction DECIMAL,
    advance_recovery DECIMAL, other_deduction DECIMAL, net_pay DECIMAL, payment_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT pr.run_code, pr.period_label, pe.employee_id, pe.employee_name, pe.employee_type,
           COALESCE(pe.employment_type, 'Permanent'), pe.days_worked,
           pe.basic_salary, pe.trip_incentive, pe.overtime, pe.other_allowance,
           COALESCE(pe.tms_allowance, 0), pe.gross_pay,
           pe.pf_deduction, pe.esi_deduction, pe.insurance_deduction,
           pe.advance_recovery, pe.other_deduction, pe.net_pay, pe.payment_status
    FROM payroll_entries pe
    JOIN payroll_runs pr ON pr.id = pe.run_id AND pr.company_id = p_company_id
    WHERE pe.company_id = p_company_id
      AND pr.status IN ('Processed', 'Paid')
      AND (p_month IS NULL OR pr.pay_month = p_month)
      AND (p_year IS NULL OR pr.pay_year = p_year)
    ORDER BY pr.pay_year DESC, pr.pay_month DESC, pe.employee_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_ensure_run(p_company_id UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM payroll_runs WHERE id = p_id AND company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_ensure_entry(p_company_id UUID, p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM payroll_entries WHERE id = p_id AND company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_ensure_setting(p_company_id UUID, p_key VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM payroll_settings WHERE key = p_key AND company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

-- Paginated list procedures (HR / Payroll list screens)

DROP FUNCTION IF EXISTS sp_hr_list_employees_paged(uuid, integer, integer, character varying, uuid, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS sp_payroll_list_runs_paged(uuid, integer, integer, character varying, integer, integer, character varying);
DROP FUNCTION IF EXISTS sp_payroll_list_payslips_paged(uuid, integer, integer, character varying, uuid, character varying, integer, integer);

CREATE OR REPLACE FUNCTION sp_hr_list_employees_paged(
    p_company_id UUID,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50,
    p_search VARCHAR DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_employee_type VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_employment_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_code VARCHAR, name VARCHAR, employee_type VARCHAR,
    employment_type VARCHAR, department_id UUID, department_name VARCHAR,
    designation_id UUID, designation_name VARCHAR,
    driver_id VARCHAR, email VARCHAR, phone VARCHAR,
    date_of_joining DATE, basic_salary DECIMAL, daily_wage DECIMAL,
    hra DECIMAL, da DECIMAL, conveyance DECIMAL, other_allowance DECIMAL,
    advance DECIMAL, pf_applicable BOOLEAN, esi_applicable BOOLEAN,
    insurance_applicable BOOLEAN, insurance_amount DECIMAL,
    contract_end_date DATE, status VARCHAR, created_at TIMESTAMPTZ,
    total_count BIGINT
) AS $$
DECLARE
    v_page INT := GREATEST(COALESCE(p_page, 1), 1);
    v_size INT := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
    v_offset INT := (v_page - 1) * v_size;
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT e.id, e.employee_code, e.name, e.employee_type,
               COALESCE(e.employment_type, 'Permanent') AS employment_type,
               e.department_id, d.name AS department_name,
               e.designation_id, g.name AS designation_name,
               e.driver_id, e.email, e.phone, e.date_of_joining,
               e.basic_salary, COALESCE(e.daily_wage, 0) AS daily_wage,
               e.hra, e.da, e.conveyance, e.other_allowance, e.advance,
               e.pf_applicable, COALESCE(e.esi_applicable, FALSE) AS esi_applicable,
               COALESCE(e.insurance_applicable, TRUE) AS insurance_applicable,
               COALESCE(e.insurance_amount, 0) AS insurance_amount,
               e.contract_end_date, e.status, e.created_at
        FROM hr_employees e
        LEFT JOIN hr_departments d ON d.id = e.department_id AND d.company_id = p_company_id
        LEFT JOIN hr_designations g ON g.id = e.designation_id
        WHERE e.company_id = p_company_id
          AND (p_department_id IS NULL OR e.department_id = p_department_id)
          AND (p_employee_type IS NULL OR p_employee_type = '' OR e.employee_type = p_employee_type)
          AND (p_status IS NULL OR p_status = '' OR e.status = p_status)
          AND (p_employment_type IS NULL OR p_employment_type = '' OR e.employment_type = p_employment_type)
          AND (
              p_search IS NULL OR p_search = '' OR
              e.name ILIKE '%' || p_search || '%' OR
              e.employee_code ILIKE '%' || p_search || '%' OR
              COALESCE(d.name, '') ILIKE '%' || p_search || '%' OR
              COALESCE(g.name, '') ILIKE '%' || p_search || '%' OR
              e.employee_type ILIKE '%' || p_search || '%' OR
              COALESCE(e.employment_type, '') ILIKE '%' || p_search || '%'
          )
    )
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.name
    LIMIT v_size OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_list_runs_paged(
    p_company_id UUID,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50,
    p_search VARCHAR DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID, run_code VARCHAR, pay_month INT, pay_year INT, period_label VARCHAR,
    status VARCHAR, total_gross DECIMAL, total_deductions DECIMAL, total_net DECIMAL,
    entry_count INT, payment_mode VARCHAR, processed_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
    remarks TEXT, voucher_id UUID, voucher_no VARCHAR, created_at TIMESTAMPTZ,
    total_count BIGINT
) AS $$
DECLARE
    v_page INT := GREATEST(COALESCE(p_page, 1), 1);
    v_size INT := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
    v_offset INT := (v_page - 1) * v_size;
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT r.id, r.run_code, r.pay_month, r.pay_year, r.period_label, r.status,
               r.total_gross, r.total_deductions, r.total_net, r.entry_count,
               r.payment_mode, r.processed_at, r.paid_at, r.remarks,
               r.voucher_id, r.voucher_no, r.created_at
        FROM payroll_runs r
        WHERE r.company_id = p_company_id
          AND (p_month IS NULL OR r.pay_month = p_month)
          AND (p_year IS NULL OR r.pay_year = p_year)
          AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
          AND (
              p_search IS NULL OR p_search = '' OR
              r.run_code ILIKE '%' || p_search || '%' OR
              r.period_label ILIKE '%' || p_search || '%' OR
              r.status ILIKE '%' || p_search || '%'
          )
    )
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.pay_year DESC, f.pay_month DESC, f.created_at DESC
    LIMIT v_size OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_list_payslips_paged(
    p_company_id UUID,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50,
    p_search VARCHAR DEFAULT NULL,
    p_run_id UUID DEFAULT NULL,
    p_employee_id VARCHAR DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID, run_id UUID, run_code VARCHAR, period_label VARCHAR,
    employee_id VARCHAR, employee_name VARCHAR, employee_type VARCHAR,
    gross_pay DECIMAL, net_pay DECIMAL, payment_status VARCHAR, paid_at TIMESTAMPTZ,
    total_count BIGINT
) AS $$
DECLARE
    v_page INT := GREATEST(COALESCE(p_page, 1), 1);
    v_size INT := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
    v_offset INT := (v_page - 1) * v_size;
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT pe.id, pe.run_id, pr.run_code, pr.period_label,
               pe.employee_id, pe.employee_name, pe.employee_type,
               pe.gross_pay, pe.net_pay, pe.payment_status, pe.paid_at
        FROM payroll_entries pe
        JOIN payroll_runs pr ON pr.id = pe.run_id AND pr.company_id = p_company_id
        WHERE pe.company_id = p_company_id
          AND pr.status <> 'Cancelled'
          AND (p_run_id IS NULL OR pe.run_id = p_run_id)
          AND (p_employee_id IS NULL OR p_employee_id = '' OR pe.employee_id = p_employee_id)
          AND (p_month IS NULL OR pr.pay_month = p_month)
          AND (p_year IS NULL OR pr.pay_year = p_year)
          AND (
              p_search IS NULL OR p_search = '' OR
              pe.employee_name ILIKE '%' || p_search || '%' OR
              pe.employee_id ILIKE '%' || p_search || '%' OR
              pr.period_label ILIKE '%' || p_search || '%' OR
              pr.run_code ILIKE '%' || p_search || '%'
          )
    )
    SELECT f.*, COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.period_label DESC, f.employee_name
    LIMIT v_size OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;
