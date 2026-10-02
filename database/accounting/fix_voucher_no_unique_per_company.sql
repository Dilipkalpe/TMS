-- Voucher numbers must be unique per company (multi-tenant), not globally.
-- Legacy constraint vouchers_voucher_no_key blocked JV-YYYYMM-00001 across tenants.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vouchers_voucher_no_key'
      AND conrelid = 'public.vouchers'::regclass
  ) THEN
    ALTER TABLE public.vouchers DROP CONSTRAINT vouchers_voucher_no_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vouchers_company_voucher_no
  ON public.vouchers (company_id, voucher_no);
