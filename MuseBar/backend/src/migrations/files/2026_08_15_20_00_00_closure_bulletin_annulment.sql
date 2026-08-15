-- UP
-- Legal correction path for erroneous closure bulletins (NF525 inalterability).
-- A wrong bulletin is never edited or deleted: it stays in the archive and is
-- flagged as annulled, then replaced by a corrective bulletin that references it.

ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS superseded_by_bulletin_id INTEGER
    REFERENCES closure_bulletins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_closure_bulletins_active_daily
  ON closure_bulletins (establishment_id, period_end DESC)
  WHERE closure_type = 'DAILY' AND is_closed = TRUE AND voided_at IS NULL;

-- Replaces the blanket "no update on closed bulletin" rule with one that still
-- forbids every fiscal mutation but permits a one-way annulment stamp.
-- Also fixes the previous version returning NEW on DELETE (NULL in a BEFORE
-- DELETE trigger), which silently cancelled deletion of *open* bulletins.
CREATE OR REPLACE FUNCTION prevent_closed_bulletin_modification()
RETURNS TRIGGER AS $$
DECLARE
    old_core closure_bulletins;
    new_core closure_bulletins;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_closed = TRUE THEN
            RAISE EXCEPTION 'Deletion of a closed bulletin is forbidden for legal compliance';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.is_closed = TRUE THEN
        -- The row must end up annulled, and an existing annulment stamp is
        -- one-way: it can never be cleared, moved, or re-dated.
        IF NEW.voided_at IS NULL THEN
            RAISE EXCEPTION 'Modification of a closed bulletin is forbidden for legal compliance';
        END IF;
        IF OLD.voided_at IS NOT NULL AND OLD.voided_at <> NEW.voided_at THEN
            RAISE EXCEPTION 'Bulletin % is already annulled; its annulment stamp is immutable', OLD.id;
        END IF;
        IF OLD.superseded_by_bulletin_id IS NOT NULL
           AND OLD.superseded_by_bulletin_id IS DISTINCT FROM NEW.superseded_by_bulletin_id THEN
            RAISE EXCEPTION 'Bulletin % already references its corrective bulletin', OLD.id;
        END IF;

        -- Everything except the annulment stamp must be byte-identical.
        old_core := OLD;
        new_core := NEW;
        old_core.voided_at := NULL;
        old_core.voided_by := NULL;
        old_core.void_reason := NULL;
        old_core.superseded_by_bulletin_id := NULL;
        new_core.voided_at := NULL;
        new_core.voided_by := NULL;
        new_core.void_reason := NULL;
        new_core.superseded_by_bulletin_id := NULL;

        IF old_core IS DISTINCT FROM new_core THEN
            RAISE EXCEPTION 'Modification of a closed bulletin is forbidden for legal compliance';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DOWN
DROP INDEX IF EXISTS idx_closure_bulletins_active_daily;

CREATE OR REPLACE FUNCTION prevent_closed_bulletin_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        IF OLD.is_closed = TRUE THEN
            RAISE EXCEPTION 'Modification of closed bulletin is forbidden for legal compliance';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS superseded_by_bulletin_id,
  DROP COLUMN IF EXISTS void_reason,
  DROP COLUMN IF EXISTS voided_by,
  DROP COLUMN IF EXISTS voided_at;
