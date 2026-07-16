SET default_transaction_read_only = on;
BEGIN READ ONLY;

\echo '### The 5 entries matching no standard format variant'
WITH v AS (
  SELECT *,
    previous_hash || '|' || sequence_number::text || '|' || transaction_type::text || '|' ||
      (CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END) AS head,
    to_char(timestamp AT TIME ZONE 'UTC',          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts_utc,
    to_char(timestamp AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts_paris,
    (amount::float8)::text AS a_f, to_char(amount,'FM999999990.00') AS a_d2, amount::text AS a_d4,
    (vat_amount::float8)::text AS v_f, to_char(vat_amount,'FM999999990.00') AS v_d2, vat_amount::text AS v_d4
  FROM legal_journal
), m AS (
  SELECT * FROM v WHERE NOT (
    current_hash = encode(digest(head||'|'||a_f ||'|'||v_f ||'|'||payment_method||'|'||ts_utc  ||'|'||register_id,'sha256'),'hex') OR
    current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||payment_method||'|'||ts_utc  ||'|'||register_id,'sha256'),'hex') OR
    current_hash = encode(digest(head||'|'||a_d4||'|'||v_d4||'|'||payment_method||'|'||ts_utc  ||'|'||register_id,'sha256'),'hex') OR
    current_hash = encode(digest(head||'|'||a_f ||'|'||v_f ||'|'||payment_method||'|'||ts_paris||'|'||register_id,'sha256'),'hex') OR
    current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||payment_method||'|'||ts_paris||'|'||register_id,'sha256'),'hex') OR
    current_hash = encode(digest(head||'|'||a_d4||'|'||v_d4||'|'||payment_method||'|'||ts_paris||'|'||register_id,'sha256'),'hex')
  )
)
SELECT sequence_number, transaction_type, order_id, amount, vat_amount, payment_method,
       register_id, timestamp, left(transaction_data::text, 200) AS data_preview
FROM m ORDER BY sequence_number;

\echo '### Test genesis-format for seq 1 (empty orderId, 0.00 amounts, literal payload)'
SELECT sequence_number,
  (current_hash = encode(digest(
     previous_hash || '|' || sequence_number::text || '|ARCHIVE||0.00|0.00|SYSTEM|' ||
     to_char(timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || '|' || register_id,
   'sha256'),'hex')) AS genesis_utc,
  (current_hash = encode(digest(
     previous_hash || '|' || sequence_number::text || '|ARCHIVE||0.00|0.00|SYSTEM|' ||
     to_char(timestamp AT TIME ZONE 'Europe/Paris','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || '|' || register_id,
   'sha256'),'hex')) AS genesis_paris
FROM legal_journal WHERE sequence_number = 1;

\echo '### Era boundaries by sequence (for the record): last paris_d2 / first utc_f, etc.'
WITH v AS (
  SELECT sequence_number, timestamp, current_hash,
    previous_hash || '|' || sequence_number::text || '|' || transaction_type::text || '|' ||
      (CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END) AS head,
    payment_method, register_id,
    to_char(timestamp AT TIME ZONE 'UTC',          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts_utc,
    to_char(timestamp AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts_paris,
    (amount::float8)::text AS a_f, to_char(amount,'FM999999990.00') AS a_d2, amount::text AS a_d4,
    (vat_amount::float8)::text AS v_f, to_char(vat_amount,'FM999999990.00') AS v_d2, vat_amount::text AS v_d4
  FROM legal_journal
), c AS (
  SELECT sequence_number, timestamp,
    CASE
      WHEN current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||payment_method||'|'||ts_utc  ||'|'||register_id,'sha256'),'hex') THEN 'utc_d2'
      WHEN current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||payment_method||'|'||ts_paris||'|'||register_id,'sha256'),'hex') THEN 'paris_d2'
      WHEN current_hash = encode(digest(head||'|'||a_f ||'|'||v_f ||'|'||payment_method||'|'||ts_utc  ||'|'||register_id,'sha256'),'hex') THEN 'utc_f'
      WHEN current_hash = encode(digest(head||'|'||a_f ||'|'||v_f ||'|'||payment_method||'|'||ts_paris||'|'||register_id,'sha256'),'hex') THEN 'paris_f'
      WHEN current_hash = encode(digest(head||'|'||a_d4||'|'||v_d4||'|'||payment_method||'|'||ts_utc  ||'|'||register_id,'sha256'),'hex') THEN 'utc_d4'
      ELSE 'none'
    END AS fmt
  FROM v
)
SELECT fmt, count(*), min(sequence_number) AS first_seq, max(sequence_number) AS last_seq,
       min(timestamp) AS first_ts, max(timestamp) AS last_ts
FROM c GROUP BY fmt ORDER BY min(sequence_number);

COMMIT;
