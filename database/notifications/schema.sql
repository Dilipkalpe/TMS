-- Phase 2: WhatsApp / SMS Notifications for TMS Pro
-- Run: npm run notifications:install

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS external_channel VARCHAR(20);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS outbox_id UUID;

CREATE TABLE IF NOT EXISTS notification_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    subject         VARCHAR(200),
    body_template   TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, channel, language)
);

DELETE FROM notification_templates a USING notification_templates b
WHERE a.code = b.code AND a.channel = b.channel AND a.language = b.language AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_code_channel_lang
    ON notification_templates (code, channel, language);

CREATE TABLE IF NOT EXISTS notification_outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code   VARCHAR(50),
    channel         VARCHAR(20) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name  VARCHAR(200),
    message_body    TEXT NOT NULL,
    payload         JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    provider        VARCHAR(30),
    provider_message_id VARCHAR(100),
    error_message   TEXT,
    attempt_count   INT NOT NULL DEFAULT 0,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON notification_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(created_at) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS notification_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    entity_id       VARCHAR(50) NOT NULL DEFAULT 'default',
    event_code      VARCHAR(50) NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (entity_type, entity_id, event_code, channel)
);

CREATE TABLE IF NOT EXISTS notification_channel_settings (
    id              INT PRIMARY KEY DEFAULT 1,
    sms_enabled     BOOLEAN NOT NULL DEFAULT true,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    admin_phone     VARCHAR(20),
    default_country_code VARCHAR(5) NOT NULL DEFAULT '91',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO notification_channel_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
