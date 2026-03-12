-- UP
-- Establishment-scoped key-value settings (happy hour, closure, etc.).
-- Same settings across devices for one establishment; isolated per establishment.
CREATE TABLE IF NOT EXISTS establishment_settings (
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (establishment_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_establishment_settings_establishment_id ON establishment_settings(establishment_id);
COMMENT ON TABLE establishment_settings IS 'Per-establishment settings (happy hour, etc.). Synced across devices; not shared between establishments.';

-- DOWN
DROP TABLE IF EXISTS establishment_settings;
