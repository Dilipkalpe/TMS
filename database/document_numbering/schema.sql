-- Standardized document numbering (company + branch + FY + document type).
-- Applied by DocumentNumberingSchemaMigrator at API startup.

CREATE TABLE IF NOT EXISTS document_number_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    branch_id               UUID NOT NULL,
    document_type           VARCHAR(40) NOT NULL,
    prefix                  VARCHAR(20) NOT NULL,
    format_pattern          VARCHAR(120) NOT NULL DEFAULT '{company}/{branch}/{fy}/{prefix}/{seq}',
    fy_format               VARCHAR(20) NOT NULL DEFAULT 'YY-YY',
    running_number_length   INT NOT NULL DEFAULT 5,
    reset_rule              VARCHAR(20) NOT NULL DEFAULT 'FinancialYear',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_number_configs UNIQUE (company_id, branch_id, document_type),
    CONSTRAINT ck_document_number_configs_reset CHECK (reset_rule IN ('FinancialYear', 'Never')),
    CONSTRAINT ck_document_number_configs_pad CHECK (running_number_length >= 1 AND running_number_length <= 12)
);

CREATE INDEX IF NOT EXISTS idx_document_number_configs_company
    ON document_number_configs (company_id, branch_id);

CREATE TABLE IF NOT EXISTS document_number_sequences (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    branch_id               UUID NOT NULL,
    document_type           VARCHAR(40) NOT NULL,
    financial_year          VARCHAR(20) NOT NULL,
    current_number          INT NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_number_sequences UNIQUE (company_id, branch_id, document_type, financial_year),
    CONSTRAINT ck_document_number_sequences_num CHECK (current_number >= 0)
);

CREATE INDEX IF NOT EXISTS idx_document_number_sequences_lookup
    ON document_number_sequences (company_id, branch_id, document_type, financial_year);

-- Atomic next-number (concurrency-safe).
CREATE OR REPLACE FUNCTION sp_next_document_number(
    p_company_id UUID,
    p_branch_id UUID,
    p_document_type VARCHAR,
    p_financial_year VARCHAR
) RETURNS INT AS $$
DECLARE
    v_next INT;
BEGIN
    INSERT INTO document_number_sequences (
        id, company_id, branch_id, document_type, financial_year, current_number, updated_at
    )
    VALUES (
        gen_random_uuid(), p_company_id, p_branch_id, p_document_type, p_financial_year, 1, NOW()
    )
    ON CONFLICT (company_id, branch_id, document_type, financial_year)
    DO UPDATE SET
        current_number = document_number_sequences.current_number + 1,
        updated_at = NOW()
    RETURNING current_number INTO v_next;

    RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Widen document number columns for new format (e.g. ABC/PUN/2026-27/BKG/00001).
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop FKs that reference bookings(id) so we can alter the PK column width.
    FOR r IN
        SELECT con.conname AS constraint_name, rel.relname AS table_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_class ref ON ref.oid = con.confrelid
        WHERE con.contype = 'f'
          AND ref.relname = 'bookings'
          AND pg_get_constraintdef(con.oid) LIKE '%(id)%'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'id'
    ) THEN
        ALTER TABLE bookings ALTER COLUMN id TYPE VARCHAR(64);
    END IF;

    -- Re-widen common booking_id FK columns (recreate FKs if table exists).
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lorry_receipts') THEN
        ALTER TABLE lorry_receipts ALTER COLUMN booking_id TYPE VARCHAR(64);
        ALTER TABLE lorry_receipts ALTER COLUMN lr_number TYPE VARCHAR(64);
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'lorry_receipts_booking_id_fkey'
        ) THEN
            BEGIN
                ALTER TABLE lorry_receipts
                    ADD CONSTRAINT lorry_receipts_booking_id_fkey
                    FOREIGN KEY (booking_id) REFERENCES bookings(id);
            EXCEPTION WHEN others THEN NULL;
            END;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_payments') THEN
        ALTER TABLE booking_payments ALTER COLUMN booking_id TYPE VARCHAR(64);
        ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(64);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_payments_receipt_no
            ON booking_payments (receipt_no) WHERE receipt_no IS NOT NULL;
        BEGIN
            ALTER TABLE booking_payments
                ADD CONSTRAINT booking_payments_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_broker_charges') THEN
        ALTER TABLE booking_broker_charges ALTER COLUMN booking_id TYPE VARCHAR(64);
        BEGIN
            ALTER TABLE booking_broker_charges
                ADD CONSTRAINT booking_broker_charges_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_expenses') THEN
        ALTER TABLE booking_expenses ALTER COLUMN booking_id TYPE VARCHAR(64);
        BEGIN
            ALTER TABLE booking_expenses
                ADD CONSTRAINT booking_expenses_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_bills') THEN
        ALTER TABLE transport_bills ALTER COLUMN booking_id TYPE VARCHAR(64);
        BEGIN
            ALTER TABLE transport_bills
                ADD CONSTRAINT transport_bills_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
        ALTER TABLE trips ALTER COLUMN booking_id TYPE VARCHAR(64);
        ALTER TABLE trips ALTER COLUMN trip_code TYPE VARCHAR(64);
        BEGIN
            ALTER TABLE trips
                ADD CONSTRAINT trips_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proof_of_delivery') THEN
        ALTER TABLE proof_of_delivery ALTER COLUMN booking_id TYPE VARCHAR(64);
        ALTER TABLE proof_of_delivery ADD COLUMN IF NOT EXISTS pod_no VARCHAR(64);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_proof_of_delivery_pod_no
            ON proof_of_delivery (pod_no) WHERE pod_no IS NOT NULL;
        BEGIN
            ALTER TABLE proof_of_delivery
                ADD CONSTRAINT proof_of_delivery_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
        ALTER TABLE fuel_entries ALTER COLUMN booking_id TYPE VARCHAR(64);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices ALTER COLUMN booking_id TYPE VARCHAR(64);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_status_history') THEN
        ALTER TABLE booking_status_history ALTER COLUMN booking_id TYPE VARCHAR(64);
        BEGIN
            ALTER TABLE booking_status_history
                ADD CONSTRAINT booking_status_history_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_tracking_tokens') THEN
        ALTER TABLE booking_tracking_tokens ALTER COLUMN booking_id TYPE VARCHAR(64);
        BEGIN
            ALTER TABLE booking_tracking_tokens
                ADD CONSTRAINT booking_tracking_tokens_booking_id_fkey
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
                  WHEN others THEN NULL;
        END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
        ALTER TABLE quotations ALTER COLUMN quote_no TYPE VARCHAR(64);
        ALTER TABLE quotations ALTER COLUMN booking_id TYPE VARCHAR(64);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'freight_invoices') THEN
        ALTER TABLE freight_invoices ALTER COLUMN invoice_no TYPE VARCHAR(64);
        ALTER TABLE freight_invoices ALTER COLUMN booking_id TYPE VARCHAR(64);
        ALTER TABLE freight_invoices ALTER COLUMN lr_number TYPE VARCHAR(64);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_listings') THEN
        BEGIN
            ALTER TABLE marketplace_listings ALTER COLUMN booking_id TYPE VARCHAR(64);
        EXCEPTION WHEN undefined_column THEN NULL;
        END;
    END IF;
END $$;
