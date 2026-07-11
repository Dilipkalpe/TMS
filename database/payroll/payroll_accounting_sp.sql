-- Payroll accounting stored procedures (links payment to TMS accounting with attendants)

CREATE OR REPLACE FUNCTION sp_payroll_credit_ledger(p_mode VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    IF UPPER(COALESCE(p_mode, '')) = 'CASH' THEN
        RETURN 'Cash in Hand';
    ELSIF UPPER(COALESCE(p_mode, '')) IN ('CHEQUE', 'BANK TRANSFER', 'NEFT') THEN
        RETURN 'Bank Account - HDFC';
    ELSIF UPPER(COALESCE(p_mode, '')) = 'UPI' THEN
        RETURN 'Bank Account - ICICI';
    END IF;
    RETURN 'Bank Account - HDFC';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION sp_payroll_next_voucher_no(p_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_count INT;
    v_prefix VARCHAR(3);
    v_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
BEGIN
    v_prefix := UPPER(SUBSTRING(p_type FROM 1 FOR 3));
    SELECT COUNT(*) + 1 INTO v_count FROM vouchers WHERE voucher_type = p_type;
    RETURN v_prefix || '-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_update_ledger_balance(
    p_ledger_name VARCHAR,
    p_debit DECIMAL,
    p_credit DECIMAL
) RETURNS VOID AS $$
BEGIN
    IF p_ledger_name IS NULL THEN RETURN; END IF;
    UPDATE ledger_accounts SET
        balance = balance + COALESCE(p_debit, 0) - COALESCE(p_credit, 0)
    WHERE name = p_ledger_name;
END;
$$ LANGUAGE plpgsql;

-- Post payroll payment to accounting (payment voucher + PF journal attendant)
CREATE OR REPLACE FUNCTION sp_payroll_post_accounting(
    p_run_id UUID,
    p_payment_mode VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_run RECORD;
    v_voucher_id UUID;
    v_voucher_no VARCHAR(30);
    v_jv_id UUID;
    v_jv_no VARCHAR(30);
    v_credit_ledger VARCHAR(200);
    v_debit_ledger VARCHAR(200) := 'Salary Expense';
    v_pf_ledger VARCHAR(200) := 'PF Payable';
    v_total_pf DECIMAL(14,2);
    v_narration TEXT;
BEGIN
    SELECT r.* INTO v_run FROM payroll_runs r WHERE r.id = p_run_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll run not found';
    END IF;
    IF v_run.voucher_id IS NOT NULL THEN
        RAISE EXCEPTION 'Accounting already posted for payroll %', v_run.run_code;
    END IF;
    IF v_run.total_net <= 0 THEN
        RAISE EXCEPTION 'Cannot post accounting: net pay is zero';
    END IF;

    SELECT COALESCE(SUM(pf_deduction), 0) INTO v_total_pf
    FROM payroll_entries WHERE run_id = p_run_id;

    v_credit_ledger := sp_payroll_credit_ledger(p_payment_mode);
    v_voucher_no := sp_payroll_next_voucher_no('Payment');
    v_narration := 'Payroll payment ' || v_run.run_code || ' (' || v_run.period_label || ') — '
        || v_run.entry_count || ' employees';

    -- Payment voucher: net salary paid via cash/bank
    INSERT INTO vouchers (voucher_no, voucher_date, voucher_type, party_name, mode, narration, total_amount)
    VALUES (
        v_voucher_no,
        CURRENT_DATE,
        'Payment',
        'Payroll - ' || v_run.period_label,
        COALESCE(p_payment_mode, 'Bank Transfer'),
        v_narration,
        v_run.total_net
    )
    RETURNING id INTO v_voucher_id;

    INSERT INTO voucher_lines (voucher_id, ledger_name, debit, credit, line_narration)
    VALUES (v_voucher_id, v_debit_ledger, v_run.total_net, 0, v_narration);

    INSERT INTO voucher_lines (voucher_id, ledger_name, debit, credit, line_narration)
    VALUES (v_voucher_id, v_credit_ledger, 0, v_run.total_net, v_narration);

    INSERT INTO payroll_accounting_attendants (
        run_id, voucher_id, voucher_no, link_type,
        debit_ledger, credit_ledger, amount, narration
    ) VALUES (
        p_run_id, v_voucher_id, v_voucher_no, 'Payment',
        v_debit_ledger, v_credit_ledger, v_run.total_net, v_narration
    );

    PERFORM sp_payroll_update_ledger_balance(v_debit_ledger, v_run.total_net, 0);
    PERFORM sp_payroll_update_ledger_balance(v_credit_ledger, 0, v_run.total_net);

    UPDATE payroll_runs SET voucher_id = v_voucher_id, voucher_no = v_voucher_no
    WHERE id = p_run_id;

    -- PF journal attendant (statutory liability)
    IF v_total_pf > 0 THEN
        v_jv_no := sp_payroll_next_voucher_no('Journal');
        v_narration := 'PF deduction payroll ' || v_run.run_code || ' (' || v_run.period_label || ')';

        INSERT INTO vouchers (voucher_no, voucher_date, voucher_type, party_name, mode, narration, total_amount)
        VALUES (v_jv_no, CURRENT_DATE, 'Journal', 'PF - ' || v_run.period_label, NULL, v_narration, v_total_pf)
        RETURNING id INTO v_jv_id;

        INSERT INTO voucher_lines (voucher_id, ledger_name, debit, credit, line_narration)
        VALUES (v_jv_id, v_debit_ledger, v_total_pf, 0, v_narration);

        INSERT INTO voucher_lines (voucher_id, ledger_name, debit, credit, line_narration)
        VALUES (v_jv_id, v_pf_ledger, 0, v_total_pf, v_narration);

        INSERT INTO payroll_accounting_attendants (
            run_id, voucher_id, voucher_no, link_type,
            debit_ledger, credit_ledger, amount, narration
        ) VALUES (
            p_run_id, v_jv_id, v_jv_no, 'Journal',
            v_debit_ledger, v_pf_ledger, v_total_pf, v_narration
        );

        PERFORM sp_payroll_update_ledger_balance(v_debit_ledger, v_total_pf, 0);
        PERFORM sp_payroll_update_ledger_balance(v_pf_ledger, 0, v_total_pf);
    END IF;

    RETURN v_voucher_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_payroll_list_attendants(p_run_id UUID)
RETURNS TABLE (
    id UUID,
    run_id UUID,
    voucher_id UUID,
    voucher_no VARCHAR,
    link_type VARCHAR,
    debit_ledger VARCHAR,
    credit_ledger VARCHAR,
    amount DECIMAL,
    narration TEXT,
    voucher_date DATE,
    voucher_type VARCHAR,
    payment_mode VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id, a.run_id, a.voucher_id, a.voucher_no, a.link_type,
        a.debit_ledger, a.credit_ledger, a.amount, a.narration,
        v.voucher_date, v.voucher_type, v.mode, a.created_at
    FROM payroll_accounting_attendants a
    JOIN vouchers v ON v.id = a.voucher_id
    WHERE a.run_id = p_run_id
    ORDER BY a.created_at;
END;
$$ LANGUAGE plpgsql;

-- Updated get run (includes accounting voucher ref)
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
    voucher_id UUID,
    voucher_no VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id, r.run_code, r.pay_month, r.pay_year, r.period_label, r.status,
        r.total_gross, r.total_deductions, r.total_net, r.entry_count,
        r.payment_mode, r.processed_at, r.paid_at, r.remarks,
        r.voucher_id, r.voucher_no, r.created_at
    FROM payroll_runs r
    WHERE r.id = p_run_id;
END;
$$ LANGUAGE plpgsql;

-- Mark paid + accounting integration
CREATE OR REPLACE FUNCTION sp_payroll_mark_paid(
    p_run_id UUID,
    p_payment_mode VARCHAR DEFAULT 'Bank Transfer'
)
RETURNS TABLE (
    voucher_id UUID,
    voucher_no VARCHAR
) AS $$
DECLARE
    v_status VARCHAR;
    v_entry RECORD;
    v_vid UUID;
    v_vno VARCHAR(30);
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
        FROM payroll_entries WHERE run_id = p_run_id
    LOOP
        IF v_entry.employee_type = 'Driver' AND v_entry.advance_recovery > 0 THEN
            UPDATE drivers SET
                advance = GREATEST(COALESCE(advance, 0) - v_entry.advance_recovery, 0),
                updated_at = NOW()
            WHERE id = v_entry.employee_id;
        END IF;
        IF v_entry.advance_recovery > 0 THEN
            UPDATE hr_employees SET
                advance = GREATEST(COALESCE(advance, 0) - v_entry.advance_recovery, 0),
                updated_at = NOW()
            WHERE employee_code = v_entry.employee_id;
        END IF;
    END LOOP;

    v_vid := sp_payroll_post_accounting(p_run_id, p_payment_mode);
    SELECT voucher_no INTO v_vno FROM payroll_runs WHERE id = p_run_id;

    UPDATE payroll_entries SET payment_status = 'Paid', paid_at = NOW()
    WHERE run_id = p_run_id;

    UPDATE payroll_runs SET
        status = 'Paid',
        payment_mode = COALESCE(p_payment_mode, 'Bank Transfer'),
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_run_id;

    RETURN QUERY SELECT v_vid, v_vno;
END;
$$ LANGUAGE plpgsql;
