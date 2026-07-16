SET default_transaction_read_only = on;
BEGIN READ ONLY;

\echo '### 1. Overview by closure_type'
SELECT closure_type, count(*) AS n,
       count(*) FILTER (WHERE total_amount = 0) AS zero_amount,
       count(*) FILTER (WHERE total_transactions = 0) AS zero_tx,
       count(*) FILTER (WHERE is_closed) AS closed,
       min(period_start) AS first_period, max(period_start) AS last_period
FROM closure_bulletins
WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
GROUP BY closure_type ORDER BY closure_type;

\echo '### 2. Zero-amount DAILY bulletins'
SELECT id, period_start AT TIME ZONE 'Europe/Paris' AS day_paris,
       total_transactions, total_amount, total_vat,
       first_sequence, last_sequence, closed_at, created_at,
       left(closure_hash, 16) AS hash16
FROM closure_bulletins
WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
  AND closure_type = 'DAILY'
  AND total_amount = 0
ORDER BY period_start;

\echo '### 3. Same-day DAILY duplicates (Paris calendar day)'
WITH d AS (
  SELECT id, (period_start AT TIME ZONE 'Europe/Paris')::date AS day_paris,
         total_transactions, total_amount, total_vat,
         first_sequence, last_sequence, closed_at, created_at,
         reconciliation_ok
  FROM closure_bulletins
  WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
    AND closure_type = 'DAILY'
)
SELECT day_paris, count(*) AS n,
       array_agg(id ORDER BY total_amount DESC, closed_at DESC NULLS LAST) AS ids,
       array_agg(total_amount ORDER BY total_amount DESC) AS amounts,
       array_agg(total_transactions ORDER BY total_amount DESC) AS txs
FROM d
GROUP BY day_paris
HAVING count(*) > 1
ORDER BY day_paris;

\echo '### 4. Backfilled closures (closed_at more than 1 day after period_end)'
SELECT id, (period_start AT TIME ZONE 'Europe/Paris')::date AS day_paris,
       period_start, period_end, closed_at, created_at,
       total_transactions, total_amount,
       (closed_at - period_end) AS delay
FROM closure_bulletins
WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
  AND closure_type = 'DAILY'
  AND closed_at IS NOT NULL
  AND closed_at > period_end + interval '1 day'
ORDER BY delay DESC
LIMIT 30;

\echo '### 5. Zero-tx with non-zero amount (or reverse)'
SELECT id, (period_start AT TIME ZONE 'Europe/Paris')::date AS day_paris,
       total_transactions, total_amount, total_vat,
       first_sequence, last_sequence, closed_at,
       reconciliation_ok, reconciliation_details
FROM closure_bulletins
WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
  AND closure_type = 'DAILY'
  AND (
    (total_transactions = 0 AND total_amount <> 0)
    OR (total_transactions > 0 AND total_amount = 0)
  )
ORDER BY period_start;

\echo '### 6. Calendar days with SALE journal entries but no DAILY bulletin'
WITH sales_days AS (
  SELECT DISTINCT (timestamp AT TIME ZONE 'Europe/Paris')::date AS day_paris
  FROM legal_journal
  WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
    AND transaction_type = 'SALE'
    AND timestamp >= '2025-08-01'
),
bulletin_days AS (
  SELECT DISTINCT (period_start AT TIME ZONE 'Europe/Paris')::date AS day_paris
  FROM closure_bulletins
  WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
    AND closure_type = 'DAILY'
    AND period_start >= '2025-08-01'
    AND total_amount > 0
)
SELECT s.day_paris,
       (SELECT count(*) FROM legal_journal lj
        WHERE lj.establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
          AND lj.transaction_type = 'SALE'
          AND (lj.timestamp AT TIME ZONE 'Europe/Paris')::date = s.day_paris) AS sale_count,
       (SELECT coalesce(sum(amount),0) FROM legal_journal lj
        WHERE lj.establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
          AND lj.transaction_type = 'SALE'
          AND (lj.timestamp AT TIME ZONE 'Europe/Paris')::date = s.day_paris) AS sale_total
FROM sales_days s
LEFT JOIN bulletin_days b ON b.day_paris = s.day_paris
WHERE b.day_paris IS NULL
ORDER BY s.day_paris;

\echo '### 7. Reconciliation_ok distribution'
SELECT reconciliation_ok, count(*)
FROM closure_bulletins
WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
  AND closure_type = 'DAILY'
GROUP BY reconciliation_ok;

\echo '### 8. Sample month reconciliation: journal SALE totals vs DAILY bulletins (2025-08)'
WITH journal AS (
  SELECT (timestamp AT TIME ZONE 'Europe/Paris')::date AS day_paris,
         count(*) AS sales, sum(amount) AS amount, sum(vat_amount) AS vat
  FROM legal_journal
  WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
    AND transaction_type = 'SALE'
    AND timestamp >= '2025-08-01' AND timestamp < '2025-09-01'
  GROUP BY 1
),
bulletins AS (
  SELECT (period_start AT TIME ZONE 'Europe/Paris')::date AS day_paris,
         sum(total_transactions) AS txs, sum(total_amount) AS amount, sum(total_vat) AS vat
  FROM closure_bulletins
  WHERE establishment_id = 'ce1b61b1-10e7-430c-97aa-69297fafb780'
    AND closure_type = 'DAILY'
    AND period_start >= '2025-08-01' AND period_start < '2025-09-01'
    AND total_amount > 0
  GROUP BY 1
)
SELECT coalesce(j.day_paris, b.day_paris) AS day_paris,
       j.sales AS journal_sales, j.amount AS journal_amount,
       b.txs AS bulletin_txs, b.amount AS bulletin_amount,
       (coalesce(j.amount,0) - coalesce(b.amount,0)) AS delta_amount
FROM journal j
FULL OUTER JOIN bulletins b ON j.day_paris = b.day_paris
ORDER BY 1;

COMMIT;
