-- Dashboard home overview (single JSON round-trip for GET /api/dashboard/home)

CREATE OR REPLACE FUNCTION sp_dashboard_home(
    p_company_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_from DATE := COALESCE(
        p_date_from,
        (SELECT MIN(lr.lr_date)
         FROM lorry_receipts lr
         WHERE lr.company_id = p_company_id
           AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)),
        (v_today - INTERVAL '1 year')::DATE
    );
    v_to DATE := COALESCE(p_date_to, v_today);
    v_span INT := v_to - v_from + 1;
    v_prev_to DATE := v_from - 1;
    v_prev_from DATE := v_prev_to - (v_span - 1);
    v_fetch_from DATE := LEAST(v_from, v_prev_from);

    v_total_lr INT;
    v_in_transit INT;
    v_delivered INT;
    v_pending_delivery INT;
    v_lr_revenue NUMERIC;
    v_booking_revenue NUMERIC;

    v_total_cur INT; v_total_prev INT;
    v_in_transit_cur INT; v_in_transit_prev INT;
    v_delivered_cur INT; v_delivered_prev INT;
    v_pending_cur INT; v_pending_prev INT;
    v_lr_rev_cur NUMERIC; v_lr_rev_prev NUMERIC;
    v_book_rev_cur NUMERIC; v_book_rev_prev NUMERIC;

    v_status_total INT;
    v_delivered_slice INT;
    v_in_transit_slice INT;
    v_pending_slice INT;
    v_cancelled_slice INT;

    v_lr_dest_count INT;
    v_result JSONB;
BEGIN
    IF v_from > v_to THEN
        RAISE EXCEPTION 'dateFrom must be on or before dateTo';
    END IF;

    -- Current period counts
    SELECT COUNT(*)::INT INTO v_total_lr
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to;

    SELECT COUNT(*)::INT INTO v_in_transit
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status = 'In Transit';

    SELECT COUNT(*)::INT INTO v_delivered
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status IN (
          'Delivery Completed', 'POD Uploaded', 'Invoice Generated',
          'Expense Added', 'Expense Approved', 'Closed'
      );

    SELECT COUNT(*)::INT INTO v_pending_delivery
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status NOT IN ('Closed', 'Delivery Completed', 'POD Uploaded', 'Draft');

    SELECT COALESCE(SUM(lr.freight), 0) INTO v_lr_revenue
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to;

    SELECT COALESCE(SUM(b.freight), 0) INTO v_booking_revenue
    FROM bookings b
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      AND b.booking_date BETWEEN v_from AND v_to;

    -- Trend windows (current vs previous period of equal length)
    SELECT
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_from AND v_to),
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_prev_from AND v_prev_to)
    INTO v_total_cur, v_total_prev
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_fetch_from AND v_to;

    SELECT
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_from AND v_to AND lr.status = 'In Transit'),
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_prev_from AND v_prev_to AND lr.status = 'In Transit')
    INTO v_in_transit_cur, v_in_transit_prev
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_fetch_from AND v_to;

    SELECT
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_from AND v_to AND lr.status IN ('Delivery Completed', 'POD Uploaded', 'Closed')),
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_prev_from AND v_prev_to AND lr.status IN ('Delivery Completed', 'POD Uploaded', 'Closed'))
    INTO v_delivered_cur, v_delivered_prev
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_fetch_from AND v_to;

    SELECT
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_from AND v_to
            AND lr.status NOT IN ('Closed', 'Delivery Completed', 'POD Uploaded', 'Draft')),
        COUNT(*) FILTER (WHERE lr.lr_date BETWEEN v_prev_from AND v_prev_to
            AND lr.status NOT IN ('Closed', 'Delivery Completed', 'POD Uploaded', 'Draft'))
    INTO v_pending_cur, v_pending_prev
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_fetch_from AND v_to;

    SELECT
        COALESCE(SUM(lr.freight) FILTER (WHERE lr.lr_date BETWEEN v_from AND v_to), 0),
        COALESCE(SUM(lr.freight) FILTER (WHERE lr.lr_date BETWEEN v_prev_from AND v_prev_to), 0)
    INTO v_lr_rev_cur, v_lr_rev_prev
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_fetch_from AND v_to;

    SELECT
        COALESCE(SUM(b.freight) FILTER (WHERE b.booking_date BETWEEN v_from AND v_to), 0),
        COALESCE(SUM(b.freight) FILTER (WHERE b.booking_date BETWEEN v_prev_from AND v_prev_to), 0)
    INTO v_book_rev_cur, v_book_rev_prev
    FROM bookings b
    WHERE b.company_id = p_company_id
      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
      AND b.booking_date BETWEEN v_prev_from AND v_to;

    -- Status donut slices
    SELECT COUNT(*)::INT INTO v_status_total
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to;

    SELECT COUNT(*)::INT INTO v_delivered_slice
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status IN (
          'Delivery Completed', 'POD Uploaded', 'Closed',
          'Invoice Generated', 'Expense Added', 'Expense Approved'
      );

    SELECT COUNT(*)::INT INTO v_in_transit_slice
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status = 'In Transit';

    SELECT COUNT(*)::INT INTO v_pending_slice
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status IN ('LR Created', 'Loading Completed', 'Transit Pass Generated', 'Draft');

    SELECT COUNT(*)::INT INTO v_cancelled_slice
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to
      AND lr.status = 'Cancelled';

    SELECT COUNT(DISTINCT lr.to_city)::INT INTO v_lr_dest_count
    FROM lorry_receipts lr
    WHERE lr.company_id = p_company_id
      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
      AND lr.lr_date BETWEEN v_from AND v_to;

    v_result := jsonb_build_object(
        'dateFrom', v_from,
        'dateTo', v_to,
        'lrStatusTotal', COALESCE(v_status_total, 0),
        'kpis', jsonb_build_array(
            jsonb_build_object('label', 'Total LR', 'key', 'totalLr', 'value', v_total_lr,
                'trendPct', CASE WHEN v_total_prev = 0 THEN CASE WHEN v_total_cur > 0 THEN 100 ELSE 0 END
                    ELSE ROUND(ABS(100.0 * (v_total_cur - v_total_prev) / v_total_prev), 1) END,
                'trendUp', v_total_cur >= v_total_prev),
            jsonb_build_object('label', 'In Transit', 'key', 'inTransit', 'value', v_in_transit,
                'trendPct', CASE WHEN v_in_transit_prev = 0 THEN CASE WHEN v_in_transit_cur > 0 THEN 100 ELSE 0 END
                    ELSE ROUND(ABS(100.0 * (v_in_transit_cur - v_in_transit_prev) / v_in_transit_prev), 1) END,
                'trendUp', v_in_transit_cur >= v_in_transit_prev),
            jsonb_build_object('label', 'Delivered', 'key', 'delivered', 'value', v_delivered,
                'trendPct', CASE WHEN v_delivered_prev = 0 THEN CASE WHEN v_delivered_cur > 0 THEN 100 ELSE 0 END
                    ELSE ROUND(ABS(100.0 * (v_delivered_cur - v_delivered_prev) / v_delivered_prev), 1) END,
                'trendUp', v_delivered_cur >= v_delivered_prev),
            jsonb_build_object('label', 'Pending Delivery', 'key', 'pendingDelivery', 'value', v_pending_delivery,
                'trendPct', CASE WHEN v_pending_prev = 0 THEN CASE WHEN v_pending_cur > 0 THEN 100 ELSE 0 END
                    ELSE ROUND(ABS(100.0 * (v_pending_cur - v_pending_prev) / v_pending_prev), 1) END,
                'trendUp', v_pending_cur < v_pending_prev),
            jsonb_build_object('label', 'LR Revenue', 'key', 'todaysRevenue', 'value', v_lr_revenue,
                'trendPct', CASE WHEN v_lr_rev_prev = 0 THEN CASE WHEN v_lr_rev_cur > 0 THEN 100 ELSE 0 END
                    ELSE ROUND(ABS(100.0 * (v_lr_rev_cur - v_lr_rev_prev) / v_lr_rev_prev), 1) END,
                'trendUp', v_lr_rev_cur >= v_lr_rev_prev),
            jsonb_build_object('label', 'Booking Revenue', 'key', 'monthlyRevenue', 'value', v_booking_revenue,
                'trendPct', CASE WHEN v_book_rev_prev = 0 THEN CASE WHEN v_book_rev_cur > 0 THEN 100 ELSE 0 END
                    ELSE ROUND(ABS(100.0 * (v_book_rev_cur - v_book_rev_prev) / v_book_rev_prev), 1) END,
                'trendUp', v_book_rev_cur >= v_book_rev_prev)
        ),
        'lrTrend', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', to_char(d.day, 'DD Mon'),
                    'created', COALESCE(day_stats.created, 0),
                    'delivered', COALESCE(day_stats.delivered, 0),
                    'pending', COALESCE(day_stats.pending, 0)
                ) ORDER BY d.day
            ), '[]'::jsonb)
            FROM generate_series(v_from, v_to, INTERVAL '1 day') AS d(day)
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::INT AS created,
                    COUNT(*) FILTER (WHERE lr.status IN ('Delivery Completed', 'POD Uploaded', 'Closed'))::INT AS delivered,
                    COUNT(*) FILTER (WHERE lr.status IN ('LR Created', 'Loading Completed', 'In Transit'))::INT AS pending
                FROM lorry_receipts lr
                WHERE lr.company_id = p_company_id
                  AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                  AND lr.lr_date = d.day::DATE
            ) day_stats ON TRUE
        ),
        'lrStatusSummary', (
            SELECT COALESCE(jsonb_agg(slice ORDER BY slice->>'label'), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'label', 'Delivered', 'value', v_delivered_slice,
                    'percent', CASE WHEN v_status_total = 0 THEN 0
                        ELSE ROUND(100.0 * v_delivered_slice / v_status_total, 1) END
                ) AS slice
                UNION ALL
                SELECT jsonb_build_object(
                    'label', 'In Transit', 'value', v_in_transit_slice,
                    'percent', CASE WHEN v_status_total = 0 THEN 0
                        ELSE ROUND(100.0 * v_in_transit_slice / v_status_total, 1) END
                )
                UNION ALL
                SELECT jsonb_build_object(
                    'label', 'Pending', 'value', v_pending_slice,
                    'percent', CASE WHEN v_status_total = 0 THEN 0
                        ELSE ROUND(100.0 * v_pending_slice / v_status_total, 1) END
                )
                UNION ALL
                SELECT jsonb_build_object(
                    'label', 'Cancelled', 'value', v_cancelled_slice,
                    'percent', CASE WHEN v_status_total = 0 THEN 0
                        ELSE ROUND(100.0 * v_cancelled_slice / v_status_total, 1) END
                )
                WHERE v_cancelled_slice > 0
            ) slices
        ),
        'topDestinations', (
            CASE WHEN v_lr_dest_count >= 3 THEN (
                SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.name, 'count', t.cnt)), '[]'::jsonb)
                FROM (
                    SELECT lr.to_city AS name, COUNT(*)::INT AS cnt
                    FROM lorry_receipts lr
                    WHERE lr.company_id = p_company_id
                      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                      AND lr.lr_date BETWEEN v_from AND v_to
                    GROUP BY lr.to_city
                    ORDER BY cnt DESC
                    LIMIT 5
                ) t
            ) ELSE (
                SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.name, 'count', t.cnt)), '[]'::jsonb)
                FROM (
                    SELECT b.to_city AS name, COUNT(*)::INT AS cnt
                    FROM bookings b
                    WHERE b.company_id = p_company_id
                      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                      AND b.booking_date BETWEEN v_from AND v_to
                    GROUP BY b.to_city
                    ORDER BY cnt DESC
                    LIMIT 5
                ) t
            ) END
        ),
        'recentLrs', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'lrNumber', lr.lr_number,
                    'date', to_char(lr.lr_date, 'DD/MM/YYYY'),
                    'customer', COALESCE(NULLIF(lr.customer_name, ''), NULLIF(lr.consignor, ''), '—'),
                    'from', lr.from_city,
                    'to', lr.to_city,
                    'status', lr.status
                ) ORDER BY lr.lr_date DESC, lr.lr_number DESC
            ), '[]'::jsonb)
            FROM (
                SELECT *
                FROM lorry_receipts lr
                WHERE lr.company_id = p_company_id
                  AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                ORDER BY lr.lr_date DESC, lr.lr_number DESC
                LIMIT 8
            ) lr
        ),
        'pendingDeliveries', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'lrNumber', lr.lr_number,
                    'destination', lr.to_city,
                    'customer', COALESCE(NULLIF(lr.customer_name, ''), NULLIF(lr.consignor, ''), '—'),
                    'dueDate', to_char(lr.lr_date + INTERVAL '3 days', 'DD/MM/YYYY')
                ) ORDER BY lr.lr_date ASC
            ), '[]'::jsonb)
            FROM (
                SELECT *
                FROM lorry_receipts lr
                WHERE lr.company_id = p_company_id
                  AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                  AND lr.status IN ('In Transit', 'Transit Pass Generated', 'Loading Completed')
                ORDER BY lr.lr_date ASC
                LIMIT 8
            ) lr
        ),
        'notifications', (
            SELECT COALESCE(jsonb_agg(sub.n), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'id', 'n-vehicle',
                    'type', 'warning',
                    'title', 'Vehicle assignment pending',
                    'message', pending_vehicle.cnt || ' LR waiting for vehicle assignment',
                    'time', NULL,
                    'path', '/lr?status=vehicle-assigned'
                ) AS n
                FROM (
                    SELECT COUNT(*)::INT AS cnt
                    FROM lorry_receipts lr
                    WHERE lr.company_id = p_company_id
                      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                      AND lr.lr_date BETWEEN v_from AND v_to
                      AND lr.status = 'Loading Completed'
                      AND COALESCE(lr.vehicle_number, '') = ''
                ) pending_vehicle
                WHERE pending_vehicle.cnt > 0
                UNION ALL
                SELECT jsonb_build_object(
                    'id', 'n-expense',
                    'type', 'info',
                    'title', 'Expense approval pending',
                    'message', pending_expense.cnt || ' LR pending expense approval',
                    'time', NULL,
                    'path', '/lr?status=expense-pending'
                )
                FROM (
                    SELECT COUNT(*)::INT AS cnt
                    FROM lorry_receipts lr
                    WHERE lr.company_id = p_company_id
                      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                      AND lr.lr_date BETWEEN v_from AND v_to
                      AND lr.status IN ('Expense Added', 'Invoice Generated')
                ) pending_expense
                WHERE pending_expense.cnt > 0
                UNION ALL
                SELECT jsonb_build_object(
                    'id', 'n-' || lr.lr_number,
                    'type', CASE WHEN lr.status ILIKE '%Deliver%' THEN 'success' ELSE 'info' END,
                    'title', 'LR ' || lr.lr_number,
                    'message', lr.status || ' · ' || lr.from_city || ' → ' || lr.to_city,
                    'time', to_char(lr.updated_at AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI'),
                    'path', '/lr/' || replace(lr.lr_number, '/', '~')
                )
                FROM (
                    SELECT *
                    FROM lorry_receipts lr
                    WHERE lr.company_id = p_company_id
                      AND (p_branch_id IS NULL OR lr.branch_id = p_branch_id)
                      AND lr.lr_date BETWEEN v_from AND v_to
                    ORDER BY lr.updated_at DESC
                    LIMIT 3
                ) lr
                LIMIT 6
            ) sub
        )
    );

    RETURN v_result;
END;
$$;
