-- TMS Pro — Payroll stored procedures (PostgreSQL functions)
-- Called by Tms.Api PayrollService via Npgsql

-- List payroll runs with optional filters
CREATE OR REPLACE FUNCTION sp_payroll_list_runs(
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL
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
    voucher_no VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id, r.run_code, r.pay_month, r.pay_year, r.period_label, r.status,
        r.total_gross, r.total_deductions, r.total_net, r.entry_count,
        r.payment_mode, r.processed_at, r.paid_at, r.voucher_no, r.created_at
    FROM payroll_runs r
    WHERE (p_month IS NULL OR r.pay_month = p_month)
      AND (p_year IS NULL OR r.pay_year = p_year)
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
    ORDER BY r.pay_year DESC, r.pay_month DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get single run header
CREATE OR REPLACE FUNCTION sp_payroll_get_run(p_run_id UUID)
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
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id, r.run_code, r.pay_month, r.pay_year, r.period_label, r.status,
        r.total_gross, r.total_deductions, r.total_net, r.entry_count,
        r.payment_mode, r.processed_at, r.paid_at, r.remarks, r.created_at
    FROM payroll_runs r
    WHERE r.id = p_run_id;
END;
$$ LANGUAGE plpgsql;

-- List entries for a run
CREATE OR REPLACE FUNCTION sp_payroll_list_entries(p_run_id UUID)
RETURNS TABLE (
    id UUID,
    run_id UUID,
    employee_type VARCHAR,
    employee_id VARCHAR,
    employee_name VARCHAR,
    basic_salary DECIMAL,
    trip_incentive DECIMAL,
    overtime DECIMAL,
    other_allowance DECIMAL,
    gross_pay DECIMAL,
    pf_deduction DECIMAL,
    advance_recovery DECIMAL,
    other_deduction DECIMAL,
    net_pay DECIMAL,
    payment_status VARCHAR,
    paid_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id, e.run_id, e.employee_type, e.employee_id, e.employee_name,
        e.basic_salary, e.trip_incentive, e.overtime, e.other_allowance, e.gross_pay,
        e.pf_deduction, e.advance_recovery, e.other_deduction, e.net_pay,
        e.payment_status, e.paid_at
    FROM payroll_entries e
    WHERE e.run_id = p_run_id
    ORDER BY e.employee_name;
END;
$$ LANGUAGE plpgsql;

-- Dashboard summary
CREATE OR REPLACE FUNCTION sp_payroll_summary()
RETURNS TABLE (
    total_runs BIGINT,
    draft_runs BIGINT,
    processed_runs BIGINT,
    paid_runs BIGINT,
    total_paid_amount DECIMAL,
    active_drivers BIGINT,
    last_run_period VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'Draft')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'Processed')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'Paid')::BIGINT,
        COALESCE(SUM(total_net) FILTER (WHERE status = 'Paid'), 0),
        (SELECT COUNT(*) FROM drivers WHERE status = 'Active')::BIGINT,
        (SELECT period_label FROM payroll_runs
         WHERE status <> 'Cancelled'
         ORDER BY pay_year DESC, pay_month DESC LIMIT 1)
    FROM payroll_runs
    WHERE status <> 'Cancelled';
END;
$$ LANGUAGE plpgsql;

-- Generate payroll for month/year from active drivers
CREATE OR REPLACE FUNCTION sp_payroll_generate(
    p_month INT,
    p_year INT,
    p_created_by VARCHAR DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
    v_run_id UUID;
    v_run_code VARCHAR(30);
    v_period_label VARCHAR(20);
    v_month_names TEXT[] := ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    v_driver RECORD;
    v_basic DECIMAL(12,2);
    v_trip_bonus DECIMAL(12,2);
    v_pf DECIMAL(12,2);
    v_advance_rec DECIMAL(12,2);
    v_gross DECIMAL(12,2);
    v_deductions DECIMAL(12,2);
    v_net DECIMAL(12,2);
    v_total_gross DECIMAL(14,2) := 0;
    v_total_ded DECIMAL(14,2) := 0;
    v_total_net DECIMAL(14,2) := 0;
    v_count INT := 0;
BEGIN
    IF p_month < 1 OR p_month > 12 THEN
        RAISE EXCEPTION 'Invalid month: %', p_month;
    END IF;

    IF EXISTS (
        SELECT 1 FROM payroll_runs
        WHERE pay_month = p_month AND pay_year = p_year
          AND status IN ('Draft', 'Processed', 'Paid')
    ) THEN
        RAISE EXCEPTION 'Payroll already exists for %/%', p_month, p_year;
    END IF;

    v_period_label := v_month_names[p_month] || '-' || p_year::TEXT;
    v_run_code := 'PAY-' || p_year::TEXT || '-' || LPAD(p_month::TEXT, 2, '0');

    INSERT INTO payroll_runs (run_code, pay_month, pay_year, period_label, status, created_by)
    VALUES (v_run_code, p_month, p_year, v_period_label, 'Draft', COALESCE(p_created_by, 'system'))
    RETURNING id INTO v_run_id;

    FOR v_driver IN
        SELECT d.id, d.name, d.salary, d.advance, d.trips, d.status
        FROM drivers d
        WHERE d.status = 'Active' AND COALESCE(d.salary, 0) > 0
        ORDER BY d.name
    LOOP
        v_basic := COALESCE(v_driver.salary, 0);
        v_trip_bonus := LEAST(COALESCE(v_driver.trips, 0) * 25, 5000);
        v_gross := v_basic + v_trip_bonus;
        v_pf := ROUND(v_basic * 0.12, 2);
        v_advance_rec := LEAST(COALESCE(v_driver.advance, 0), GREATEST(v_gross - v_pf, 0));
        v_deductions := v_pf + v_advance_rec;
        v_net := v_gross - v_deductions;
        IF v_net < 0 THEN v_net := 0; END IF;

        INSERT INTO payroll_entries (
            run_id, employee_type, employee_id, employee_name,
            basic_salary, trip_incentive, gross_pay,
            pf_deduction, advance_recovery, net_pay
        ) VALUES (
            v_run_id, 'Driver', v_driver.id, v_driver.name,
            v_basic, v_trip_bonus, v_gross,
            v_pf, v_advance_rec, v_net
        );

        v_total_gross := v_total_gross + v_gross;
        v_total_ded := v_total_ded + v_deductions;
        v_total_net := v_total_net + v_net;
        v_count := v_count + 1;
    END LOOP;

    UPDATE payroll_runs SET
        total_gross = v_total_gross,
        total_deductions = v_total_ded,
        total_net = v_total_net,
        entry_count = v_count,
        updated_at = NOW()
    WHERE id = v_run_id;

    RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Process (approve) a draft run
CREATE OR REPLACE FUNCTION sp_payroll_process(p_run_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status FROM payroll_runs WHERE id = p_run_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll run not found';
    END IF;
    IF v_status <> 'Draft' THEN
        RAISE EXCEPTION 'Only Draft payroll can be processed (current: %)', v_status;
    END IF;

    UPDATE payroll_runs SET
        status = 'Processed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_run_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Mark run and entries as paid; recover advance from drivers
CREATE OR REPLACE FUNCTION sp_payroll_mark_paid(
    p_run_id UUID,
    p_payment_mode VARCHAR DEFAULT 'Bank Transfer'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR;
    v_entry RECORD;
BEGIN
    SELECT status INTO v_status FROM payroll_runs WHERE id = p_run_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll run not found';
    END IF;
    IF v_status <> 'Processed' THEN
        RAISE EXCEPTION 'Only Processed payroll can be paid (current: %)', v_status;
    END IF;

    FOR v_entry IN
        SELECT employee_id, employee_type, advance_recovery
        FROM payroll_entries
        WHERE run_id = p_run_id
    LOOP
        IF v_entry.employee_type = 'Driver' AND v_entry.advance_recovery > 0 THEN
            UPDATE drivers SET
                advance = GREATEST(COALESCE(advance, 0) - v_entry.advance_recovery, 0),
                updated_at = NOW()
            WHERE id = v_entry.employee_id;
        END IF;
    END LOOP;

    UPDATE payroll_entries SET
        payment_status = 'Paid',
        paid_at = NOW()
    WHERE run_id = p_run_id;

    UPDATE payroll_runs SET
        status = 'Paid',
        payment_mode = COALESCE(p_payment_mode, 'Bank Transfer'),
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_run_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Cancel draft run
CREATE OR REPLACE FUNCTION sp_payroll_cancel(p_run_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status FROM payroll_runs WHERE id = p_run_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll run not found';
    END IF;
    IF v_status <> 'Draft' THEN
        RAISE EXCEPTION 'Only Draft payroll can be cancelled (current: %)', v_status;
    END IF;

    UPDATE payroll_runs SET status = 'Cancelled', updated_at = NOW()
    WHERE id = p_run_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
