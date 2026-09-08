-- UP
-- Personal profile fields + per-establishment calendar color on memberships.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE user_establishment_memberships
  ADD COLUMN IF NOT EXISTS calendar_color VARCHAR(7);

-- Curated palette (same order as backend CALENDAR_COLOR_PALETTE).
WITH palette AS (
  SELECT * FROM (VALUES
    (0, '#1565C0'),
    (1, '#2E7D32'),
    (2, '#C62828'),
    (3, '#6A1B9A'),
    (4, '#EF6C00'),
    (5, '#00838F'),
    (6, '#AD1457'),
    (7, '#4527A0'),
    (8, '#558B2F'),
    (9, '#0277BD'),
    (10, '#F9A825'),
    (11, '#5D4037'),
    (12, '#00695C'),
    (13, '#D84315'),
    (14, '#283593'),
    (15, '#9E9D24'),
    (16, '#6D4C41'),
    (17, '#00897B'),
    (18, '#7B1FA2'),
    (19, '#E65100'),
    (20, '#37474F'),
    (21, '#1B5E20'),
    (22, '#B71C1C'),
    (23, '#01579B')
  ) AS t(idx, color)
),
ranked AS (
  SELECT
    m.id,
    (ROW_NUMBER() OVER (PARTITION BY m.establishment_id ORDER BY m.id) - 1) AS rn
  FROM user_establishment_memberships m
  WHERE m.calendar_color IS NULL
)
UPDATE user_establishment_memberships m
SET calendar_color = CASE
  WHEN r.rn < 24 THEN p.color
  ELSE upper('#' || lpad(to_hex((100000 + r.rn * 9973) % 16777216), 6, '0'))
END
FROM ranked r
LEFT JOIN palette p ON p.idx = r.rn
WHERE m.id = r.id
  AND m.calendar_color IS NULL;

-- Resolve collisions after generated overflow colors (rare).
DO $$
DECLARE
  rec RECORD;
  i INT;
  n INT;
  candidate TEXT;
BEGIN
  FOR rec IN
    SELECT establishment_id, upper(calendar_color) AS color, array_agg(id ORDER BY id) AS ids
    FROM user_establishment_memberships
    WHERE is_active = TRUE
    GROUP BY establishment_id, upper(calendar_color)
    HAVING COUNT(*) > 1
  LOOP
    FOR i IN 2..array_length(rec.ids, 1) LOOP
      n := 0;
      LOOP
        candidate := upper('#' || lpad(to_hex((200000 + rec.ids[i] * 7919 + n) % 16777216), 6, '0'));
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM user_establishment_memberships
          WHERE establishment_id = rec.establishment_id
            AND is_active = TRUE
            AND upper(calendar_color) = candidate
        );
        n := n + 1;
        EXIT WHEN n > 10000;
      END LOOP;
      UPDATE user_establishment_memberships
      SET calendar_color = candidate
      WHERE id = rec.ids[i];
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE user_establishment_memberships
  ALTER COLUMN calendar_color SET DEFAULT '#1565C0';

UPDATE user_establishment_memberships
SET calendar_color = '#1565C0'
WHERE calendar_color IS NULL;

ALTER TABLE user_establishment_memberships
  ALTER COLUMN calendar_color SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_calendar_color_per_est
  ON user_establishment_memberships (establishment_id, upper(calendar_color))
  WHERE is_active = TRUE;

-- DOWN
DROP INDEX IF EXISTS uq_membership_calendar_color_per_est;

ALTER TABLE user_establishment_memberships
  ALTER COLUMN calendar_color DROP DEFAULT;

ALTER TABLE user_establishment_memberships
  DROP COLUMN IF EXISTS calendar_color;

ALTER TABLE users
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS date_of_birth;
