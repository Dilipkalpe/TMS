-- Dashboard aggregate stats (single round-trip for GET /api/dashboard/stats)

CREATE OR REPLACE FUNCTION sp_dashboard_stats(
    p_company_id UUID,
    p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_vehicles INT,
    total_drivers INT,
    total_customers INT,
    total_trips INT,
    pending_lr INT,
    todays_bookings INT,
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_profit NUMERIC,
    cash_balance NUMERIC,
    bank_balance NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_income NUMERIC;
    v_general_exp NUMERIC;
    v_booking_exp NUMERIC;
    v_broker_exp NUMERIC;
    v_expenses NUMERIC;
    v_cash_in NUMERIC;
    v_cash_out NUMERIC;
    v_bank_in NUMERIC;
    v_bank_out NUMERIC;
BEGIN
    SELECT COUNT(*)::INT INTO total_vehicles
    FROM vehicles v
    WHERE v.company_id = p_company_id
      AND (p_branch_id IS NULL OR v.branch_id = p_branch_id);

    SELECT COUNT(*)::INT INTO total_drivers
    FROM drivers d
    WHERE d.company_id = p_company_id
      AND (p_branch_id IS NULL OR d.branch_id = p_branch_id);

    SELECT COUNT(*)::INT INTO total_customers
    FROM customers c
    WHERE c.company_id = p_company_id
      AND (p_branch_id IS NULL OR c.branch_id = p_branch_id);

    SELECT COUNT(*)::INT INTO total_trips
    FROM bookings b
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id);

    SELECT COUNT(*)::INT INTO pending_lr
    FROM bookings b
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      AND NOT EXISTS (
          SELECT 1 FROM lorry_receipts lr
          WHERE lr.booking_id = b.id AND lr.company_id = p_company_id
      );

    SELECT COUNT(*)::INT INTO todays_bookings
    FROM bookings b
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      AND b.booking_date = v_today;

    SELECT COALESCE(SUM(b.freight), 0) INTO v_income
    FROM bookings b
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id);

    SELECT COALESCE(SUM(e.amount), 0) INTO v_general_exp
    FROM expenses e
    WHERE e.company_id = p_company_id
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id);

    SELECT COALESCE(SUM(be.amount), 0) INTO v_booking_exp
    FROM booking_expenses be
    INNER JOIN bookings b ON b.id = be.booking_id
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id);

    SELECT COALESCE(SUM(bc.amount), 0) INTO v_broker_exp
    FROM booking_broker_charges bc
    INNER JOIN bookings b ON b.id = bc.booking_id
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id);

    v_expenses := v_general_exp + v_booking_exp + v_broker_exp;
    total_income := v_income;
    total_expenses := v_expenses;
    net_profit := v_income - v_expenses;

    SELECT COALESCE(SUM(bp.amount), 0) INTO v_cash_in
    FROM booking_payments bp
    WHERE bp.company_id = p_company_id AND bp.payment_mode = 'Cash';

    v_cash_in := v_cash_in + COALESCE((
        SELECT SUM(v.total_amount) FROM vouchers v
        WHERE v.company_id = p_company_id AND v.voucher_type = 'Receipt' AND v.mode = 'Cash'
    ), 0);

    SELECT COALESCE(SUM(v.total_amount), 0) INTO v_cash_out
    FROM vouchers v
    WHERE v.company_id = p_company_id AND v.voucher_type = 'Payment' AND v.mode = 'Cash';

    v_cash_out := v_cash_out + COALESCE((
        SELECT SUM(e.amount) FROM expenses e
        WHERE e.company_id = p_company_id AND e.payment_mode = 'Cash'
    ), 0);

    cash_balance := v_cash_in - v_cash_out;

    SELECT COALESCE(SUM(bp.amount), 0) INTO v_bank_in
    FROM booking_payments bp
    WHERE bp.company_id = p_company_id
      AND bp.payment_mode IN ('NEFT', 'RTGS', 'Cheque', 'Bank Transfer', 'UPI');

    v_bank_in := v_bank_in + COALESCE((
        SELECT SUM(v.total_amount) FROM vouchers v
        WHERE v.company_id = p_company_id AND v.voucher_type = 'Receipt'
          AND v.mode IN ('NEFT', 'RTGS', 'Cheque', 'Bank Transfer', 'UPI')
    ), 0);

    SELECT COALESCE(SUM(v.total_amount), 0) INTO v_bank_out
    FROM vouchers v
    WHERE v.company_id = p_company_id AND v.voucher_type = 'Payment'
      AND v.mode IN ('NEFT', 'RTGS', 'Cheque', 'Bank Transfer', 'UPI');

    v_bank_out := v_bank_out + COALESCE((
        SELECT SUM(e.amount) FROM expenses e
        WHERE e.company_id = p_company_id
          AND e.payment_mode IN ('NEFT', 'RTGS', 'Cheque', 'Bank Transfer', 'UPI')
    ), 0);

    bank_balance := v_bank_in - v_bank_out;

    RETURN NEXT;
END;
$$;
