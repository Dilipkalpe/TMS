-- Optional: monthly range partitions for bookings (run when table exceeds ~1M rows per tenant)
-- Requires maintenance window. Test on staging first.
-- Run: npm run perf:partition
--
-- Strategy: LIST partition by company_id keeps tenant data isolated;
-- RANGE sub-partition by booking_date enables fast date-range reports and archival.

\set ON_ERROR_STOP on
\timing on

-- Helper: create next month's partition if using partitioned bookings (manual migration required first)
CREATE OR REPLACE FUNCTION tms_ensure_booking_month_partition(p_year INT, p_month INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    part_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    IF to_regclass('public.bookings_partitioned') IS NULL THEN
        RAISE NOTICE 'bookings_partitioned does not exist — run full migration or use BRIN indexes instead';
        RETURN;
    END IF;

    part_name := format('bookings_y%sm%s', p_year, lpad(p_month::text, 2, '0'));
    start_date := make_date(p_year, p_month, 1);
    end_date := start_date + INTERVAL '1 month';

    IF to_regclass('public.' || part_name) IS NOT NULL THEN
        RAISE NOTICE 'Partition % already exists', part_name;
        RETURN;
    END IF;

    EXECUTE format(
        'CREATE TABLE %I PARTITION OF bookings_partitioned FOR VALUES FROM (%L) TO (%L)',
        part_name, start_date, end_date);
    RAISE NOTICE 'Created partition %', part_name;
END;
$$;

-- Ensure partitions for current and next 2 months (no-op if not migrated yet)
SELECT tms_ensure_booking_month_partition(
    EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    EXTRACT(MONTH FROM CURRENT_DATE)::INT);
SELECT tms_ensure_booking_month_partition(
    EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::INT,
    EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::INT);
SELECT tms_ensure_booking_month_partition(
    EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '2 month')::INT,
    EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '2 month')::INT);

SELECT 'partition helper ready' AS status;
