-- Invoice Compliance Verification Script (Phase D)
-- Read-only checks. Each section returns only anomalies.
-- Rule of thumb: empty result set = PASS for that section.

\echo '=== Invoice Compliance Verification: START ==='

\echo ''
\echo '[1/8] Duplicate invoice_number in same establishment'
SELECT
  establishment_id,
  invoice_number,
  COUNT(*) AS duplicate_count
FROM legal_invoices
GROUP BY establishment_id, invoice_number
HAVING COUNT(*) > 1;

\echo ''
\echo '[2/8] Duplicate sequence triplet (establishment, year, sequence)'
SELECT
  establishment_id,
  invoice_year,
  invoice_sequence,
  COUNT(*) AS duplicate_count
FROM legal_invoices
GROUP BY establishment_id, invoice_year, invoice_sequence
HAVING COUNT(*) > 1;

\echo ''
\echo '[3/8] Sequence gaps per establishment/year'
WITH ordered AS (
  SELECT
    establishment_id,
    invoice_year,
    invoice_sequence,
    LAG(invoice_sequence) OVER (
      PARTITION BY establishment_id, invoice_year
      ORDER BY invoice_sequence
    ) AS previous_sequence
  FROM legal_invoices
)
SELECT
  establishment_id,
  invoice_year,
  previous_sequence,
  invoice_sequence AS current_sequence
FROM ordered
WHERE previous_sequence IS NOT NULL
  AND invoice_sequence <> previous_sequence + 1;

\echo ''
\echo '[4/8] Missing mandatory legal fields'
SELECT
  id,
  establishment_id,
  invoice_number,
  payment_due_date,
  payment_terms,
  late_penalty_terms,
  recovery_fee_note
FROM legal_invoices
WHERE payment_due_date IS NULL
   OR payment_terms IS NULL
   OR TRIM(payment_terms) = ''
   OR late_penalty_terms IS NULL
   OR TRIM(late_penalty_terms) = ''
   OR recovery_fee_note IS NULL
   OR TRIM(recovery_fee_note) = '';

\echo ''
\echo '[5/8] Missing seller legal identity in business snapshot'
SELECT
  id,
  establishment_id,
  invoice_number,
  business_info->>'name' AS business_name,
  business_info->>'address' AS business_address,
  business_info->>'siret' AS business_siret,
  business_info->>'tax_identification' AS business_tax_identification
FROM legal_invoices
WHERE COALESCE(TRIM(business_info->>'name'), '') = ''
   OR COALESCE(TRIM(business_info->>'address'), '') = ''
   OR COALESCE(TRIM(business_info->>'siret'), '') = ''
   OR COALESCE(TRIM(business_info->>'tax_identification'), '') = '';

\echo ''
\echo '[6/8] Hash-chain mismatch'
WITH chain AS (
  SELECT
    id,
    establishment_id,
    invoice_year,
    invoice_number,
    invoice_sequence,
    invoice_hash,
    previous_invoice_hash,
    LAG(invoice_hash) OVER (
      PARTITION BY establishment_id, invoice_year
      ORDER BY invoice_sequence
    ) AS expected_previous_hash
  FROM legal_invoices
)
SELECT
  id,
  establishment_id,
  invoice_year,
  invoice_number,
  invoice_sequence,
  previous_invoice_hash,
  expected_previous_hash
FROM chain
WHERE (expected_previous_hash IS NULL AND previous_invoice_hash IS NOT NULL AND TRIM(previous_invoice_hash) <> '')
   OR (expected_previous_hash IS NOT NULL AND previous_invoice_hash IS DISTINCT FROM expected_previous_hash);

\echo ''
\echo '[7/8] Invalid invoice_hash format (expected 64-char SHA-256 hex)'
SELECT
  id,
  establishment_id,
  invoice_number,
  invoice_hash
FROM legal_invoices
WHERE invoice_hash IS NULL
   OR invoice_hash !~ '^[0-9a-f]{64}$';

\echo ''
\echo '[8/8] Immutability trigger presence check'
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname = 'legal_invoices'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

\echo ''
\echo '=== Invoice Compliance Verification: END ==='
