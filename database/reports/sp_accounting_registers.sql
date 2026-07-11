-- Accounting registers (journal, receipt, payment, purchase, sales)

CREATE OR REPLACE FUNCTION sp_accounting_register_journal(
    p_company_id UUID,
    p_limit INT DEFAULT 5000,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    row_date DATE,
    voucher_no TEXT,
    debit_ledger TEXT,
    credit_ledger TEXT,
    amount NUMERIC,
    narration TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        v.voucher_date,
        v.voucher_no,
        'GST Input'::TEXT,
        'GST Output'::TEXT,
        v.total_amount,
        v.narration
    FROM vouchers v
    WHERE v.company_id = p_company_id
      AND v.voucher_type = 'Journal'
      AND (p_from_date IS NULL OR v.voucher_date >= p_from_date)
      AND (p_to_date IS NULL OR v.voucher_date <= p_to_date)
    ORDER BY v.voucher_date DESC, v.voucher_no
    LIMIT GREATEST(1, LEAST(p_limit, 50000));
$$;


CREATE OR REPLACE FUNCTION sp_accounting_register_receipt(
    p_company_id UUID,
    p_limit INT DEFAULT 5000,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    row_date DATE,
    voucher_no TEXT,
    party TEXT,
    mode TEXT,
    amount NUMERIC,
    narration TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        v.voucher_date,
        v.voucher_no,
        v.party_name,
        v.mode,
        v.total_amount,
        v.narration
    FROM vouchers v
    WHERE v.company_id = p_company_id
      AND v.voucher_type = 'Receipt'
      AND (p_from_date IS NULL OR v.voucher_date >= p_from_date)
      AND (p_to_date IS NULL OR v.voucher_date <= p_to_date)
    ORDER BY v.voucher_date DESC, v.voucher_no
    LIMIT GREATEST(1, LEAST(p_limit, 50000));
$$;


CREATE OR REPLACE FUNCTION sp_accounting_register_payment(
    p_company_id UUID,
    p_limit INT DEFAULT 5000,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    row_date DATE,
    voucher_no TEXT,
    party TEXT,
    mode TEXT,
    amount NUMERIC,
    narration TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        v.voucher_date,
        v.voucher_no,
        v.party_name,
        v.mode,
        v.total_amount,
        v.narration
    FROM vouchers v
    WHERE v.company_id = p_company_id
      AND v.voucher_type = 'Payment'
      AND (p_from_date IS NULL OR v.voucher_date >= p_from_date)
      AND (p_to_date IS NULL OR v.voucher_date <= p_to_date)
    ORDER BY v.voucher_date DESC, v.voucher_no
    LIMIT GREATEST(1, LEAST(p_limit, 50000));
$$;


CREATE OR REPLACE FUNCTION sp_accounting_register_purchase(
    p_company_id UUID,
    p_limit INT DEFAULT 5000,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    row_date DATE,
    bill_no TEXT,
    vendor TEXT,
    amount NUMERIC,
    gst NUMERIC,
    total NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        e.expense_date,
        e.id,
        e.vendor_name,
        e.amount,
        ROUND(e.amount * 0.18, 0),
        e.amount + ROUND(e.amount * 0.18, 0)
    FROM expenses e
    WHERE e.company_id = p_company_id
      AND e.vendor_name IS NOT NULL
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
    ORDER BY e.expense_date DESC, e.id
    LIMIT GREATEST(1, LEAST(p_limit, 50000));
$$;


CREATE OR REPLACE FUNCTION sp_accounting_register_sales(
    p_company_id UUID,
    p_limit INT DEFAULT 5000,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    row_date DATE,
    lr_no TEXT,
    customer TEXT,
    route TEXT,
    freight NUMERIC,
    gst NUMERIC,
    total NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        l.lr_date,
        l.lr_number,
        l.consignor,
        (l.from_city || ' - ' || l.to_city)::TEXT,
        l.freight,
        l.gst,
        l.freight + l.gst
    FROM lorry_receipts l
    WHERE l.company_id = p_company_id
      AND (p_from_date IS NULL OR l.lr_date >= p_from_date)
      AND (p_to_date IS NULL OR l.lr_date <= p_to_date)
    ORDER BY l.lr_date DESC, l.lr_number
    LIMIT GREATEST(1, LEAST(p_limit, 50000));
$$;
