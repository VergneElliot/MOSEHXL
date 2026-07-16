SET default_transaction_read_only = on;
BEGIN READ ONLY;

-- Brute-force format matrix: timestamp rendering x amount formatting.
-- ts variants: utc  = to_char(ts AT TIME ZONE 'UTC', ...'Z')
--              paris= to_char(ts AT TIME ZONE 'Europe/Paris', ...'Z')  (wall clock mislabeled Z)
-- amount variants: f = float8 shortest repr ('11'), d2 = 2dp ('11.00'), d4 = 4dp ('11.0000')

\echo '### Format matrix pass counts by month (all 21284 entries)'
WITH v AS (
  SELECT sequence_number, timestamp, current_hash,
    previous_hash || '|' || sequence_number::text || '|' || transaction_type::text || '|' ||
      (CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END) AS head,
    payment_method::text || '|' AS pm,
    register_id::text AS reg,
    to_char(timestamp AT TIME ZONE 'UTC',          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts_utc,
    to_char(timestamp AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ts_paris,
    (amount::float8)::text     AS a_f,  to_char(amount, 'FM999999990.00')     AS a_d2,  amount::text     AS a_d4,
    (vat_amount::float8)::text AS v_f,  to_char(vat_amount, 'FM999999990.00') AS v_d2,  vat_amount::text AS v_d4
  FROM legal_journal
), m AS (
  SELECT date_trunc('month', timestamp) AS month, sequence_number,
    (current_hash = encode(digest(head||'|'||a_f ||'|'||v_f ||'|'||pm||ts_utc  ||'|'||reg,'sha256'),'hex')) AS utc_f,
    (current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||pm||ts_utc  ||'|'||reg,'sha256'),'hex')) AS utc_d2,
    (current_hash = encode(digest(head||'|'||a_d4||'|'||v_d4||'|'||pm||ts_utc  ||'|'||reg,'sha256'),'hex')) AS utc_d4,
    (current_hash = encode(digest(head||'|'||a_f ||'|'||v_f ||'|'||pm||ts_paris||'|'||reg,'sha256'),'hex')) AS paris_f,
    (current_hash = encode(digest(head||'|'||a_d2||'|'||v_d2||'|'||pm||ts_paris||'|'||reg,'sha256'),'hex')) AS paris_d2,
    (current_hash = encode(digest(head||'|'||a_d4||'|'||v_d4||'|'||pm||ts_paris||'|'||reg,'sha256'),'hex')) AS paris_d4
  FROM v
)
SELECT month, count(*) AS entries,
  count(*) FILTER (WHERE utc_f)    AS utc_f,
  count(*) FILTER (WHERE utc_d2)   AS utc_d2,
  count(*) FILTER (WHERE utc_d4)   AS utc_d4,
  count(*) FILTER (WHERE paris_f)  AS paris_f,
  count(*) FILTER (WHERE paris_d2) AS paris_d2,
  count(*) FILTER (WHERE paris_d4) AS paris_d4,
  count(*) FILTER (WHERE NOT (utc_f OR utc_d2 OR utc_d4 OR paris_f OR paris_d2 OR paris_d4)) AS no_match
FROM m GROUP BY month ORDER BY month;

COMMIT;
