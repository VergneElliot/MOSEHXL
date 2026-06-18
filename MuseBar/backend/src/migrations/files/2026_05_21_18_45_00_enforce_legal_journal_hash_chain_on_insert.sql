-- UP
-- P3-L5: Enforce legal_journal hash chain invariants at DB level on INSERT.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION enforce_legal_journal_insert_integrity()
RETURNS TRIGGER AS $$
DECLARE
  last_sequence INTEGER;
  last_hash TEXT;
  expected_sequence INTEGER;
  expected_previous_hash TEXT;
  timestamp_for_hash TEXT;
  order_id_for_hash TEXT;
  payload TEXT;
  expected_current_hash TEXT;
BEGIN
  SELECT lj.sequence_number, lj.current_hash
    INTO last_sequence, last_hash
  FROM legal_journal lj
  WHERE lj.establishment_id = NEW.establishment_id
  ORDER BY lj.sequence_number DESC
  LIMIT 1;

  expected_sequence := COALESCE(last_sequence, 0) + 1;
  expected_previous_hash := COALESCE(
    last_hash,
    '0000000000000000000000000000000000000000000000000000000000000000'
  );

  IF NEW.sequence_number IS DISTINCT FROM expected_sequence THEN
    RAISE EXCEPTION
      'Invalid legal journal sequence number %, expected % for establishment %',
      NEW.sequence_number,
      expected_sequence,
      NEW.establishment_id;
  END IF;

  IF NEW.previous_hash IS DISTINCT FROM expected_previous_hash THEN
    RAISE EXCEPTION
      'Invalid legal journal previous_hash for sequence % (expected %, got %)',
      NEW.sequence_number,
      expected_previous_hash,
      NEW.previous_hash;
  END IF;

  timestamp_for_hash := to_char(
    NEW.timestamp AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  order_id_for_hash := CASE
    WHEN NEW.order_id IS NULL THEN 'null'
    WHEN NEW.order_id = 0 THEN ''
    ELSE NEW.order_id::text
  END;

  payload := concat_ws(
    '|',
    NEW.sequence_number::text,
    NEW.transaction_type::text,
    order_id_for_hash,
    NEW.amount::text,
    NEW.vat_amount::text,
    NEW.payment_method::text,
    timestamp_for_hash,
    NEW.register_id::text
  );

  expected_current_hash := encode(
    digest(expected_previous_hash || '|' || payload, 'sha256'),
    'hex'
  );

  IF NEW.current_hash IS DISTINCT FROM expected_current_hash THEN
    RAISE EXCEPTION
      'Invalid legal journal current_hash for sequence % (expected %, got %)',
      NEW.sequence_number,
      expected_current_hash,
      NEW.current_hash;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_legal_journal_insert_integrity ON legal_journal;
CREATE TRIGGER trigger_enforce_legal_journal_insert_integrity
  BEFORE INSERT ON legal_journal
  FOR EACH ROW
  EXECUTE FUNCTION enforce_legal_journal_insert_integrity();

-- DOWN
DROP TRIGGER IF EXISTS trigger_enforce_legal_journal_insert_integrity ON legal_journal;
DROP FUNCTION IF EXISTS enforce_legal_journal_insert_integrity();
SELECT 1;
