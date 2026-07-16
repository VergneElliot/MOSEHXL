SET default_transaction_read_only = on;
BEGIN READ ONLY;

\echo '### Seq 128-130: full rows'
SELECT sequence_number, transaction_type, order_id, amount, vat_amount, payment_method,
       register_id, timestamp, created_at, previous_hash, current_hash,
       transaction_data::text AS data
FROM legal_journal WHERE sequence_number IN (128, 129, 130) ORDER BY sequence_number;

\echo '### Seq 129-130: microsecond-precision timestamp variants'
WITH v AS (
  SELECT *,
    previous_hash || '|' || sequence_number::text || '|' || transaction_type::text || '|' ||
      (CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END) AS head,
    (amount::float8)::text AS a_f, to_char(amount,'FM999999990.00') AS a_d2,
    (vat_amount::float8)::text AS v_f, to_char(vat_amount,'FM999999990.00') AS v_d2
  FROM legal_journal WHERE sequence_number IN (128, 129, 130)
)
SELECT sequence_number,
  (current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||payment_method||'|'||to_char(timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'|'||register_id,'sha256'),'hex')) AS us_utc_d2,
  (current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||payment_method||'|'||to_char(timestamp AT TIME ZONE 'Europe/Paris','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'|'||register_id,'sha256'),'hex')) AS us_paris_d2,
  (current_hash = encode(digest(head||'|'||a_f||'|'||v_f||'|'||payment_method||'|'||to_char(timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')||'|'||register_id,'sha256'),'hex')) AS us_utc_f,
  (current_hash ~ '^[0-9a-f]{64}$') AS looks_like_sha
FROM v ORDER BY sequence_number;

COMMIT;
