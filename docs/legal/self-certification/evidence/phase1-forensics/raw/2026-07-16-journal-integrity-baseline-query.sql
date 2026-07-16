SET default_transaction_read_only = on;
BEGIN READ ONLY;

\echo '### A. Journal overview'
SELECT establishment_id, count(*) AS entries, min(sequence_number) AS min_seq, max(sequence_number) AS max_seq,
       min(timestamp) AS first_entry, max(timestamp) AS last_entry
FROM legal_journal GROUP BY establishment_id;

\echo '### B. Sequence gaps and chain-link breaks'
WITH j AS (
  SELECT sequence_number, previous_hash, current_hash, timestamp,
         lag(current_hash) OVER (ORDER BY sequence_number) AS prior_hash,
         lag(sequence_number) OVER (ORDER BY sequence_number) AS prior_seq
  FROM legal_journal
)
SELECT sequence_number, prior_seq,
       (sequence_number = COALESCE(prior_seq, 0) + 1) AS seq_ok,
       (previous_hash = COALESCE(prior_hash, repeat('0', 64))) AS link_ok,
       timestamp
FROM j
WHERE NOT (sequence_number = COALESCE(prior_seq, 0) + 1)
   OR NOT (previous_hash = COALESCE(prior_hash, repeat('0', 64)))
ORDER BY sequence_number;

\echo '### C. Non-SHA marker entries (full)'
SELECT sequence_number, transaction_type, previous_hash, current_hash,
       transaction_data::text, register_id, timestamp, created_at
FROM legal_journal
WHERE current_hash !~ '^[0-9a-f]{64}$' OR previous_hash !~ '^[0-9a-f]{64}$'
ORDER BY sequence_number;

\echo '### D. Rows around migration splice (604-613)'
SELECT sequence_number, transaction_type, amount, vat_amount, payment_method,
       timestamp, created_at, left(previous_hash,16) AS prev16, left(current_hash,16) AS curr16
FROM legal_journal WHERE sequence_number BETWEEN 604 AND 613 ORDER BY sequence_number;

\echo '### E. Hash recomputation with CURRENT trigger format, bucketed by month'
WITH j AS (
  SELECT *,
    encode(digest(
      previous_hash || '|' || concat_ws('|',
        sequence_number::text, transaction_type::text,
        CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END,
        amount::text, vat_amount::text, payment_method::text,
        to_char(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        register_id::text
      ), 'sha256'), 'hex') AS recomputed_hash
  FROM legal_journal
)
SELECT date_trunc('month', timestamp) AS month, count(*) AS entries,
       count(*) FILTER (WHERE current_hash = recomputed_hash) AS pass,
       count(*) FILTER (WHERE current_hash <> recomputed_hash) AS fail
FROM j GROUP BY 1 ORDER BY 1;

\echo '### F. First and last failing/passing timestamps in June 2026 (deployment boundary)'
WITH j AS (
  SELECT *,
    encode(digest(
      previous_hash || '|' || concat_ws('|',
        sequence_number::text, transaction_type::text,
        CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END,
        amount::text, vat_amount::text, payment_method::text,
        to_char(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        register_id::text
      ), 'sha256'), 'hex') AS recomputed_hash
  FROM legal_journal
  WHERE timestamp >= '2026-06-01' AND timestamp < '2026-07-01'
)
SELECT (current_hash = recomputed_hash) AS passes, count(*),
       min(timestamp) AS first_ts, max(timestamp) AS last_ts,
       min(sequence_number) AS first_seq, max(sequence_number) AS last_seq
FROM j GROUP BY 1 ORDER BY 1;

\echo '### G. Transaction type distribution'
SELECT transaction_type, count(*) FROM legal_journal GROUP BY 1 ORDER BY 2 DESC;

COMMIT;
