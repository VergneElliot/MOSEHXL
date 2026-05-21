-- UP
-- P3-L4: Extend legal_journal immutability to block TRUNCATE in addition to UPDATE/DELETE.

CREATE OR REPLACE FUNCTION prevent_legal_journal_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'TRUNCATE of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_truncate ON legal_journal;
CREATE TRIGGER trigger_prevent_legal_journal_truncate
  BEFORE TRUNCATE ON legal_journal
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_legal_journal_truncate();

-- DOWN
DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_truncate ON legal_journal;
DROP FUNCTION IF EXISTS prevent_legal_journal_truncate();
SELECT 1;
