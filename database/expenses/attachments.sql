-- Supporting documents for general company expenses (Expense Management).
-- Files are stored on disk under App_Data; only metadata is in the DB.

CREATE TABLE IF NOT EXISTS expense_attachments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id       VARCHAR(20) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    file_name        VARCHAR(260) NOT NULL,
    stored_file_name VARCHAR(260) NOT NULL,
    relative_path    VARCHAR(500) NOT NULL,
    file_extension   VARCHAR(20) NOT NULL,
    file_size        BIGINT NOT NULL DEFAULT 0,
    content_type     VARCHAR(120),
    uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by      VARCHAR(100),
    is_active        BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense
    ON expense_attachments(expense_id) WHERE is_active = true;
