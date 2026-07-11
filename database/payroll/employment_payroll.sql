-- Payroll generation & reports with Permanent / Contract / Daily employment types

CREATE OR REPLACE FUNCTION sp_payroll_list_entries(p_run_id UUID)
RETURNS TABLE (
    id UUID, run_id UUID, employee_type VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
    employment_type VARCHAR, basic_salary DECIMAL, trip_incentive DECIMAL, overtime DECIMAL,
    other_allowance DECIMAL, gross_pay DECIMAL, pf_deduction DECIMAL, advance_recovery DECIMAL,
    esi_deduction DECIMAL, insurance_deduction DECIMAL, other_deduction DECIMAL,
    days_worked DECIMAL, net_pay DECIMAL, payment_status VARCHAR, paid_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id, e.run_id, e.employee_type, e.employee_id, e.employee_name,
        COALESCE(e.employment_type, 'Permanent'),
        e.basic_salary, e.trip_incentive, e.overtime, e.other_allowance, e.gross_pay,
        e.pf_deduction, e.advance_recovery, e.esi_deduction, e.insurance_deduction,
        e.other_deduction, e.days_worked, e.net_pay, e.payment_status, e.paid_at
    FROM payroll_entries e
    WHERE e.run_id = p_run_id
    ORDER BY e.employee_name;
END;
$$ LANGUAGE plpgsql;

-- Enhanced payroll generation with employment-type norms (PF, ESI, Insurance)
CREATE OR REPLACE FUNCTION sp_payroll_generate(
    p_month INT, p_year INT, p_created_by VARCHAR DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
    v_run_id UUID;
    v_run_code VARCHAR(30);
    v_period_label VARCHAR(20);
    v_month_names TEXT[] := ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    v_emp RECORD;
    v_basic DECIMAL(12,2);
    v_hra DECIMAL(12,2); v_da DECIMAL(12,2); v_conv DECIMAL(12,2); v_other_allow DECIMAL(12,2);
    v_trip_bonus DECIMAL(12,2); v_overtime DECIMAL(12,2); v_gross DECIMAL(12,2);
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
    v_absent_days DECIMAL(5,2); v_ot_hours DECIMAL(5,2); v_present_days DECIMAL(5,2);
    v_driver_trips INT; v_emp_id_str VARCHAR(20); v_emp_pay_type VARCHAR(20);
    v_apply_pf BOOLEAN; v_apply_esi BOOLEAN; v_apply_ins BOOLEAN;
BEGIN
    IF p_month < 1 OR p_month > 12 THEN RAISE EXCEPTION 'Invalid month: %', p_month; END IF;
    IF EXISTS (
        SELECT 1 FROM payroll_runs WHERE pay_month = p_month AND pay_year = p_year
          AND status IN ('Draft', 'Processed', 'Paid')
    ) THEN RAISE EXCEPTION 'Payroll already exists for %/%', p_month, p_year; END IF;

    v_period_label := v_month_names[p_month] || '-' || p_year::TEXT;
    v_run_code := 'PAY-' || p_year::TEXT || '-' || LPAD(p_month::TEXT, 2, '0');

    INSERT INTO payroll_runs (run_code, pay_month, pay_year, period_label, status, created_by)
    VALUES (v_run_code, p_month, p_year, v_period_label, 'Draft', COALESCE(p_created_by, 'system'))
    RETURNING id INTO v_run_id;

    FOR v_emp IN
        SELECT e.*, d.trips AS driver_trips
        FROM hr_employees e
        LEFT JOIN drivers d ON d.id = e.driver_id
        WHERE e.status IN ('Active', 'On Leave')
          AND (
            e.employment_type = 'Daily' AND COALESCE(e.daily_wage, 0) > 0
            OR e.employment_type <> 'Daily'
              AND (e.basic_salary + e.hra + e.da + e.conveyance + e.other_allowance) > 0
          )
        ORDER BY e.name
    LOOP
        v_emp_pay_type := COALESCE(v_emp.employment_type, 'Permanent');
        v_emp_id_str := v_emp.employee_code;

        SELECT COALESCE(COUNT(*) FILTER (WHERE a.status = 'Present'), 0)
             + COALESCE(COUNT(*) FILTER (WHERE a.status = 'Half Day'), 0) * 0.5,
               COALESCE(COUNT(*) FILTER (WHERE a.status = 'Absent'), 0)
             + COALESCE(COUNT(*) FILTER (WHERE a.status = 'Half Day'), 0) * 0.5,
               COALESCE(SUM(a.overtime_hours), 0)
        INTO v_present_days, v_absent_days, v_ot_hours
        FROM hr_attendance a
        WHERE a.employee_id = v_emp.id
          AND EXTRACT(MONTH FROM a.attendance_date) = p_month
          AND EXTRACT(YEAR FROM a.attendance_date) = p_year;

        v_trip_bonus := 0;
        IF v_emp.employee_type = 'Driver' AND v_emp.driver_id IS NOT NULL THEN
            v_trip_bonus := LEAST(COALESCE(v_emp.driver_trips, 0) * v_trip_rate, v_trip_max);
        END IF;
        v_overtime := ROUND(v_ot_hours * v_ot_rate, 2);

        -- === DAILY: wage × days present ===
        IF v_emp_pay_type = 'Daily' THEN
            v_basic := ROUND(COALESCE(v_emp.daily_wage, 0) * GREATEST(v_present_days, 0), 2);
            v_hra := 0; v_da := 0; v_conv := 0; v_other_allow := 0;
            v_lop := 0;
            v_gross := v_basic + v_trip_bonus + v_overtime;
            v_apply_pf := v_emp.pf_applicable AND v_daily_pf = 1;
            v_apply_esi := FALSE;
            v_apply_ins := COALESCE(v_emp.insurance_applicable, TRUE);
            v_insurance := CASE WHEN v_apply_ins THEN
                ROUND(GREATEST(v_present_days, 0) * v_ins_daily_day, 2)
            ELSE COALESCE(v_emp.insurance_amount, 0) END;
            v_pt := 0;

        -- === CONTRACT: fixed monthly contract pay ===
        ELSIF v_emp_pay_type = 'Contract' THEN
            v_basic := COALESCE(v_emp.basic_salary, 0);
            v_hra := COALESCE(v_emp.hra, 0) * 0.5;
            v_da := COALESCE(v_emp.da, 0) * 0.5;
            v_conv := COALESCE(v_emp.conveyance, 0);
            v_other_allow := COALESCE(v_emp.other_allowance, 0);
            v_lop := 0;
            IF v_absent_days > 0 AND v_work_days > 0 THEN
                v_lop := ROUND(v_basic * v_absent_days / v_work_days, 2);
            END IF;
            v_gross := v_basic + v_hra + v_da + v_conv + v_other_allow + v_trip_bonus + v_overtime - v_lop;
            v_apply_pf := v_emp.pf_applicable AND v_contract_pf = 1;
            v_apply_esi := FALSE;
            v_apply_ins := COALESCE(v_emp.insurance_applicable, TRUE);
            v_insurance := CASE WHEN v_apply_ins THEN
                COALESCE(NULLIF(v_emp.insurance_amount, 0), v_ins_contract)
            ELSE 0 END;
            v_pt := CASE WHEN v_gross >= 15000 THEN v_pt_amt ELSE 0 END;

        -- === PERMANENT: full salary + all statutory ===
        ELSE
            v_basic := COALESCE(v_emp.basic_salary, 0);
            v_hra := COALESCE(v_emp.hra, 0);
            v_da := COALESCE(v_emp.da, 0);
            v_conv := COALESCE(v_emp.conveyance, 0);
            v_other_allow := COALESCE(v_emp.other_allowance, 0);
            v_lop := 0;
            IF v_absent_days > 0 AND v_work_days > 0 THEN
                v_lop := ROUND(v_basic * v_absent_days / v_work_days, 2);
            END IF;
            v_gross := v_basic + v_hra + v_da + v_conv + v_other_allow + v_trip_bonus + v_overtime - v_lop;
            v_apply_pf := COALESCE(v_emp.pf_applicable, TRUE);
            v_apply_esi := COALESCE(v_emp.esi_applicable, TRUE);
            v_apply_ins := COALESCE(v_emp.insurance_applicable, TRUE);
            v_insurance := CASE WHEN v_apply_ins THEN
                COALESCE(NULLIF(v_emp.insurance_amount, 0), v_ins_perm)
            ELSE 0 END;
            v_pt := v_pt_amt;
        END IF;

        IF v_gross < 0 THEN v_gross := 0; END IF;

        v_pf := CASE WHEN v_apply_pf THEN ROUND(v_basic * v_pf_rate / 100, 2) ELSE 0 END;
        v_esi := CASE WHEN v_apply_esi AND v_gross <= v_esi_ceiling THEN
            ROUND(v_gross * v_esi_rate / 100, 2) ELSE 0 END;

        v_advance_rec := LEAST(COALESCE(v_emp.advance, 0),
            GREATEST(v_gross - v_pf - v_esi - v_insurance - v_pt, 0));
        v_other_ded := v_lop + v_pt;
        v_deductions := v_pf + v_esi + v_insurance + v_advance_rec;
        v_net := v_gross - v_deductions - v_other_ded;
        IF v_net < 0 THEN v_net := 0; END IF;

        INSERT INTO payroll_entries (
            run_id, employee_type, employee_id, employee_name, employment_type,
            basic_salary, trip_incentive, overtime, other_allowance, gross_pay,
            pf_deduction, esi_deduction, insurance_deduction, advance_recovery,
            other_deduction, days_worked, net_pay
        ) VALUES (
            v_run_id, v_emp.employee_type, v_emp_id_str, v_emp.name, v_emp_pay_type,
            v_basic, v_trip_bonus, v_overtime, v_hra + v_da + v_conv + v_other_allow, v_gross,
            v_pf, v_esi, v_insurance, v_advance_rec, v_other_ded, v_present_days, v_net
        );

        v_total_gross := v_total_gross + v_gross;
        v_total_ded := v_total_ded + v_deductions + v_other_ded;
        v_total_net := v_total_net + v_net;
        v_count := v_count + 1;
    END LOOP;

    -- Fallback drivers not in hr_employees (Permanent norms)
    FOR v_emp IN
        SELECT d.id, d.name, d.salary, d.advance, d.trips
        FROM drivers d
        WHERE d.status = 'Active' AND COALESCE(d.salary, 0) > 0
          AND NOT EXISTS (SELECT 1 FROM hr_employees e WHERE e.driver_id = d.id)
        ORDER BY d.name
    LOOP
        v_basic := COALESCE(v_emp.salary, 0);
        v_trip_bonus := LEAST(COALESCE(v_emp.trips, 0) * v_trip_rate, v_trip_max);
        v_gross := v_basic + v_trip_bonus;
        v_pf := ROUND(v_basic * v_pf_rate / 100, 2);
        v_esi := CASE WHEN v_gross <= v_esi_ceiling THEN ROUND(v_gross * v_esi_rate / 100, 2) ELSE 0 END;
        v_insurance := v_ins_perm;
        v_advance_rec := LEAST(COALESCE(v_emp.advance, 0), GREATEST(v_gross - v_pf - v_esi - v_insurance - v_pt_amt, 0));
        v_deductions := v_pf + v_esi + v_insurance + v_advance_rec + v_pt_amt;
        v_net := v_gross - v_deductions;
        IF v_net < 0 THEN v_net := 0; END IF;

        INSERT INTO payroll_entries (
            run_id, employee_type, employee_id, employee_name, employment_type,
            basic_salary, trip_incentive, gross_pay, pf_deduction, esi_deduction,
            insurance_deduction, advance_recovery, other_deduction, days_worked, net_pay
        ) VALUES (
            v_run_id, 'Driver', v_emp.id, v_emp.name, 'Permanent',
            v_basic, v_trip_bonus, v_gross, v_pf, v_esi, v_insurance, v_advance_rec, v_pt_amt, 26, v_net
        );

        v_total_gross := v_total_gross + v_gross;
        v_total_ded := v_total_ded + v_deductions;
        v_total_net := v_total_net + v_net;
        v_count := v_count + 1;
    END LOOP;

    UPDATE payroll_runs SET total_gross = v_total_gross, total_deductions = v_total_ded,
        total_net = v_total_net, entry_count = v_count, updated_at = NOW()
    WHERE id = v_run_id;

    RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_get_payslip(p_entry_id UUID)
RETURNS TABLE (
    entry_id UUID, run_id UUID, run_code VARCHAR, period_label VARCHAR,
    pay_month INT, pay_year INT, run_status VARCHAR,
    employee_type VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
    employment_type VARCHAR, department_name VARCHAR, designation_name VARCHAR,
    basic_salary DECIMAL, trip_incentive DECIMAL, overtime DECIMAL,
    other_allowance DECIMAL, gross_pay DECIMAL,
    pf_deduction DECIMAL, esi_deduction DECIMAL, insurance_deduction DECIMAL,
    advance_recovery DECIMAL, other_deduction DECIMAL, days_worked DECIMAL,
    net_pay DECIMAL, payment_status VARCHAR, paid_at TIMESTAMPTZ, company_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT pe.id, pr.id, pr.run_code, pr.period_label, pr.pay_month, pr.pay_year, pr.status,
           pe.employee_type, pe.employee_id, pe.employee_name,
           COALESCE(pe.employment_type, 'Permanent'), d.name, g.name,
           pe.basic_salary, pe.trip_incentive, pe.overtime, pe.other_allowance, pe.gross_pay,
           pe.pf_deduction, pe.esi_deduction, pe.insurance_deduction,
           pe.advance_recovery, pe.other_deduction, pe.days_worked,
           pe.net_pay, pe.payment_status, pe.paid_at, 'TMS Pro Transport'::VARCHAR
    FROM payroll_entries pe
    JOIN payroll_runs pr ON pr.id = pe.run_id
    LEFT JOIN hr_employees e ON e.employee_code = pe.employee_id
    LEFT JOIN hr_departments d ON d.id = e.department_id
    LEFT JOIN hr_designations g ON g.id = e.designation_id
    WHERE pe.id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_salary_register(p_month INT DEFAULT NULL, p_year INT DEFAULT NULL)
RETURNS TABLE (
    run_code VARCHAR, period_label VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
    employee_type VARCHAR, employment_type VARCHAR, days_worked DECIMAL,
    basic_salary DECIMAL, trip_incentive DECIMAL, overtime DECIMAL, other_allowance DECIMAL,
    gross_pay DECIMAL, pf_deduction DECIMAL, esi_deduction DECIMAL, insurance_deduction DECIMAL,
    advance_recovery DECIMAL, other_deduction DECIMAL, net_pay DECIMAL, payment_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT pr.run_code, pr.period_label, pe.employee_id, pe.employee_name, pe.employee_type,
           COALESCE(pe.employment_type, 'Permanent'), pe.days_worked,
           pe.basic_salary, pe.trip_incentive, pe.overtime, pe.other_allowance, pe.gross_pay,
           pe.pf_deduction, pe.esi_deduction, pe.insurance_deduction,
           pe.advance_recovery, pe.other_deduction, pe.net_pay, pe.payment_status
    FROM payroll_entries pe
    JOIN payroll_runs pr ON pr.id = pe.run_id
    WHERE pr.status IN ('Processed', 'Paid')
      AND (p_month IS NULL OR pr.pay_month = p_month)
      AND (p_year IS NULL OR pr.pay_year = p_year)
    ORDER BY pr.pay_year DESC, pr.pay_month DESC, pe.employee_name;
END;
$$ LANGUAGE plpgsql;
