-- Dashboard analytics charts (single function, chart key parameter)

CREATE OR REPLACE FUNCTION sp_dashboard_chart(
    p_company_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_chart TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_months TEXT[] := ARRAY['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    v_weekdays TEXT[] := ARRAY['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    v_week_ago DATE := CURRENT_DATE - 7;
    v_result JSONB;
BEGIN
    CASE p_chart
        WHEN 'monthly-revenue' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'month', v_months[m],
                    'value', ROUND(COALESCE(val, 0) / 100000.0, 0)
                ) ORDER BY m
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT EXTRACT(MONTH FROM b.booking_date)::INT AS m, SUM(b.freight) AS val
                FROM bookings b
                WHERE b.company_id = p_company_id
                  AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                GROUP BY 1
            ) t;

        WHEN 'monthly-expenses' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'month', v_months[m],
                    'value', ROUND(COALESCE(val, 0) / 100000.0, 0)
                ) ORDER BY m
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT m, SUM(amt) AS val
                FROM (
                    SELECT EXTRACT(MONTH FROM e.expense_date)::INT AS m, e.amount AS amt
                    FROM expenses e
                    WHERE e.company_id = p_company_id
                      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
                    UNION ALL
                    SELECT EXTRACT(MONTH FROM be.expense_date)::INT, be.amount
                    FROM booking_expenses be
                    INNER JOIN bookings b ON b.id = be.booking_id
                    WHERE b.company_id = p_company_id
                      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                    UNION ALL
                    SELECT EXTRACT(MONTH FROM bc.created_at)::INT, bc.amount
                    FROM booking_broker_charges bc
                    INNER JOIN bookings b ON b.id = bc.booking_id
                    WHERE b.company_id = p_company_id
                      AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                ) raw
                GROUP BY m
            ) t;

        WHEN 'trip-analysis' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', s.label,
                    'value', CASE WHEN s.total = 0 THEN 0 ELSE ROUND(100.0 * s.cnt / s.total)::INT END,
                    'color', CASE s.label
                        WHEN 'Completed' THEN '#2563eb'
                        WHEN 'Delivered' THEN '#2563eb'
                        WHEN 'In Transit' THEN '#0ea5e9'
                        WHEN 'Pending' THEN '#94a3b8'
                        WHEN 'Confirmed' THEN '#8b5cf6'
                        ELSE '#64748b'
                    END
                )
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT b.status AS label, COUNT(*)::INT AS cnt,
                       SUM(COUNT(*)) OVER ()::INT AS total
                FROM bookings b
                WHERE b.company_id = p_company_id
                  AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                GROUP BY b.status
            ) s;

        WHEN 'payment-mix' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', p.label,
                    'value', CASE WHEN p.total = 0 THEN 0 ELSE ROUND(100.0 * p.cnt / p.total)::INT END,
                    'color', CASE p.label
                        WHEN 'Paid' THEN '#10b981'
                        WHEN 'Partial' THEN '#f59e0b'
                        WHEN 'Unpaid' THEN '#ef4444'
                        ELSE '#64748b'
                    END
                )
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT b.payment AS label, COUNT(*)::INT AS cnt,
                       SUM(COUNT(*)) OVER ()::INT AS total
                FROM bookings b
                WHERE b.company_id = p_company_id
                  AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                GROUP BY b.payment
            ) p;

        WHEN 'expense-breakdown' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', e.label,
                    'value', CASE WHEN e.grand_total = 0 THEN 0 ELSE ROUND(100.0 * e.amount / e.grand_total)::INT END,
                    'color', (ARRAY['#f59e0b','#2563eb','#8b5cf6','#10b981','#64748b','#ef4444'])[1 + ((e.rn - 1) % 6)]
                ) ORDER BY e.amount DESC
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT label, amount, grand_total, ROW_NUMBER() OVER (ORDER BY amount DESC) AS rn
                FROM (
                    SELECT label, SUM(amount) AS amount, SUM(SUM(amount)) OVER () AS grand_total
                    FROM (
                        SELECT e.category AS label, e.amount
                        FROM expenses e
                        WHERE e.company_id = p_company_id
                          AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
                        UNION ALL
                        SELECT be.category, be.amount
                        FROM booking_expenses be
                        INNER JOIN bookings b ON b.id = be.booking_id
                        WHERE b.company_id = p_company_id
                          AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                        UNION ALL
                        SELECT 'Broker Charges', bc.amount
                        FROM booking_broker_charges bc
                        INNER JOIN bookings b ON b.id = bc.booking_id
                        WHERE b.company_id = p_company_id
                          AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                    ) raw
                    GROUP BY label
                ) grouped
            ) e;

        WHEN 'fleet-status' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', f.label,
                    'value', CASE WHEN f.total = 0 THEN 0 ELSE ROUND(100.0 * f.cnt / f.total)::INT END,
                    'color', CASE f.label
                        WHEN 'Active' THEN '#2563eb'
                        WHEN 'On Trip' THEN '#0ea5e9'
                        WHEN 'Maintenance' THEN '#f59e0b'
                        WHEN 'Idle' THEN '#94a3b8'
                        ELSE '#64748b'
                    END
                )
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT v.status AS label, COUNT(*)::INT AS cnt,
                       SUM(COUNT(*)) OVER ()::INT AS total
                FROM vehicles v
                WHERE v.company_id = p_company_id
                  AND (p_branch_id IS NULL OR v.branch_id = p_branch_id)
                GROUP BY v.status
            ) f;

        WHEN 'vehicle-utilization' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'vehicle', v.number,
                    'utilization', LEAST(100, v.trips * 2)
                ) ORDER BY v.trips DESC
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT v.number, v.trips
                FROM vehicles v
                WHERE v.company_id = p_company_id
                  AND (p_branch_id IS NULL OR v.branch_id = p_branch_id)
                ORDER BY v.trips DESC
                LIMIT 5
            ) v;

        WHEN 'weekly-bookings' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', v_weekdays[dow + 1],
                    'value', COALESCE(w.cnt, 0)
                ) ORDER BY dow
            ), '[]'::jsonb)
            INTO v_result
            FROM generate_series(0, 6) AS dow
            LEFT JOIN (
                SELECT EXTRACT(DOW FROM b.booking_date)::INT AS dow, COUNT(*)::INT AS cnt
                FROM bookings b
                WHERE b.company_id = p_company_id
                  AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                  AND b.booking_date >= v_week_ago
                GROUP BY 1
            ) w USING (dow);

        WHEN 'route-performance' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', r.label,
                    'value', r.cnt * 10
                ) ORDER BY r.cnt DESC
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT (b.from_city || '-' || b.to_city) AS label, COUNT(*)::INT AS cnt
                FROM bookings b
                WHERE b.company_id = p_company_id
                  AND (p_branch_id IS NULL OR b.branch_id = p_branch_id)
                GROUP BY b.from_city, b.to_city
                ORDER BY cnt DESC
                LIMIT 5
            ) r;

        WHEN 'driver-performance' THEN
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'label', CASE WHEN length(d.name) > 10 THEN left(d.name, 10) || '.' ELSE d.name END,
                    'value', d.trips
                ) ORDER BY d.trips DESC
            ), '[]'::jsonb)
            INTO v_result
            FROM (
                SELECT d.name, d.trips
                FROM drivers d
                WHERE d.company_id = p_company_id
                  AND (p_branch_id IS NULL OR d.branch_id = p_branch_id)
                ORDER BY d.trips DESC
                LIMIT 5
            ) d;

        WHEN 'fleet-gauge' THEN
            SELECT jsonb_build_object(
                'value', CASE WHEN stats.total = 0 THEN 0
                    ELSE ROUND(100.0 * stats.active / stats.total)::INT END
            )
            INTO v_result
            FROM (
                SELECT
                    COUNT(*)::INT AS total,
                    COUNT(*) FILTER (WHERE v.status IN ('Active', 'On Trip'))::INT AS active
                FROM vehicles v
                WHERE v.company_id = p_company_id
                  AND (p_branch_id IS NULL OR v.branch_id = p_branch_id)
            ) stats;

        ELSE
            RAISE EXCEPTION 'Unknown dashboard chart: %', p_chart;
    END CASE;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
