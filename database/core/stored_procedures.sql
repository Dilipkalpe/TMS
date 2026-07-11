-- Core TMS stored procedures (idempotent)

CREATE OR REPLACE FUNCTION sp_next_booking_number()
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 1042)
        FROM bookings
        WHERE id ~ '^BK-[0-9]+$'
    );
END;
$$ LANGUAGE plpgsql;
