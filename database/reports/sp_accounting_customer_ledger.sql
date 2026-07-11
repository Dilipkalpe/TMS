-- Customer ledger with running balance (GET /api/accounting/customer-ledger)

CREATE OR REPLACE FUNCTION sp_accounting_customer_ledger(
    p_company_id UUID,
    p_customer_id VARCHAR DEFAULT NULL,
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
    WITH scoped_bookings AS (
        SELECT b.id, b.booking_date, b.from_city, b.to_city, b.freight, b.advance
        FROM bookings b
        WHERE b.company_id = p_company_id
          AND (p_customer_id IS NULL OR b.customer_id = p_customer_id)
          AND (p_from_date IS NULL OR b.booking_date >= p_from_date)
          AND (p_to_date IS NULL OR b.booking_date <= p_to_date)
    ),
    lines AS (
        SELECT
            sb.booking_date AS line_date,
            sb.id AS voucher,
            ('Freight - ' || sb.from_city || ' to ' || sb.to_city)::TEXT AS particular,
            NULL::TEXT AS ref_no,
            sb.freight AS debit,
            sb.advance AS credit,
            0 AS sort_key
        FROM scoped_bookings sb
        UNION ALL
        SELECT
            p.payment_date,
            UPPER(SUBSTRING(p.id::TEXT FROM 1 FOR 8)),
            ('Payment - ' || COALESCE(NULLIF(p.payment_mode, ''), 'Cash'))::TEXT,
            p.reference_no,
            0::NUMERIC,
            p.amount,
            1
        FROM booking_payments p
        INNER JOIN scoped_bookings sb ON sb.id = p.booking_id
    ),
    ordered AS (
        SELECT * FROM lines
        ORDER BY line_date, sort_key, voucher
    )
    SELECT
        o.line_date,
        o.voucher,
        o.particular,
        COALESCE(o.ref_no, '') AS ref_no,
        o.debit,
        o.credit,
        SUM(o.debit - o.credit) OVER (
            ORDER BY o.line_date, o.sort_key, o.voucher
            ROWS UNBOUNDED PRECEDING
        ) AS balance
    FROM ordered o;
$$;
