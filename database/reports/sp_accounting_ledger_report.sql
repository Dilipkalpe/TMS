-- General ledger report with running balance (GET /api/accounting/ledger-report)

CREATE OR REPLACE FUNCTION sp_accounting_ledger_report(
    p_company_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    line_date DATE,
    voucher TEXT,
    particular TEXT,
    ref_no TEXT,
    debit NUMERIC,
    credit NUMERIC,
    balance NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    WITH lines AS (
        SELECT
            p.payment_date AS line_date,
            p.booking_id AS voucher,
            ('Receipt - ' || COALESCE(p.payment_mode, '') || ' - ' || p.booking_id)::TEXT AS particular,
            COALESCE(p.reference_no, '') AS ref_no,
            0::NUMERIC AS debit,
            p.amount AS credit,
            1 AS sort_key
        FROM booking_payments p
        WHERE p.company_id = p_company_id
          AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
          AND (p_to_date IS NULL OR p.payment_date <= p_to_date)

        UNION ALL

        SELECT
            e.expense_date,
            e.id,
            COALESCE(e.description, e.category),
            '',
            e.amount,
            0::NUMERIC,
            2
        FROM expenses e
        WHERE e.company_id = p_company_id
          AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
          AND (p_to_date IS NULL OR e.expense_date <= p_to_date)

        UNION ALL

        SELECT
            be.expense_date,
            be.booking_id,
            ('Booking expense - ' || be.category)::TEXT,
            '',
            be.amount,
            0::NUMERIC,
            3
        FROM booking_expenses be
        WHERE be.company_id = p_company_id
          AND (p_from_date IS NULL OR be.expense_date >= p_from_date)
          AND (p_to_date IS NULL OR be.expense_date <= p_to_date)

        UNION ALL

        SELECT
            (c.created_at AT TIME ZONE 'UTC')::DATE,
            c.booking_id,
            ('Broker - ' || c.broker_name)::TEXT,
            '',
            c.amount,
            0::NUMERIC,
            4
        FROM booking_broker_charges c
        WHERE c.company_id = p_company_id
          AND (p_from_date IS NULL OR (c.created_at AT TIME ZONE 'UTC')::DATE >= p_from_date)
          AND (p_to_date IS NULL OR (c.created_at AT TIME ZONE 'UTC')::DATE <= p_to_date)

        UNION ALL

        SELECT
            v.voucher_date,
            v.voucher_no,
            COALESCE(v.narration, v.party_name, v.voucher_type),
            '',
            CASE WHEN v.voucher_type = 'Payment' THEN v.total_amount ELSE 0::NUMERIC END,
            CASE WHEN v.voucher_type = 'Receipt' THEN v.total_amount ELSE 0::NUMERIC END,
            5
        FROM vouchers v
        WHERE v.company_id = p_company_id
          AND v.voucher_type IN ('Receipt', 'Payment')
          AND (p_from_date IS NULL OR v.voucher_date >= p_from_date)
          AND (p_to_date IS NULL OR v.voucher_date <= p_to_date)
    ),
    ordered AS (
        SELECT * FROM lines
        ORDER BY line_date, sort_key, voucher
    )
    SELECT
        o.line_date,
        o.voucher,
        o.particular,
        o.ref_no,
        o.debit,
        o.credit,
        SUM(o.credit - o.debit) OVER (
            ORDER BY o.line_date, o.sort_key, o.voucher
            ROWS UNBOUNDED PRECEDING
        ) AS balance
    FROM ordered o;
$$;
