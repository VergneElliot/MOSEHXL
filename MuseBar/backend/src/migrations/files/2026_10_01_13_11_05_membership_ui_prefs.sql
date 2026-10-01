-- UP
-- Per-PIN (membership) UI preferences: display scale + color mode.
ALTER TABLE user_establishment_memberships
  ADD COLUMN IF NOT EXISTS ui_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_establishment_memberships.ui_prefs IS
  'Per-membership visual prefs (scale_percent, color_mode). Extensible JSON object.';

-- DOWN
ALTER TABLE user_establishment_memberships
  DROP COLUMN IF EXISTS ui_prefs;
