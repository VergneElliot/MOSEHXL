import { pool } from '../../db/pool';

export async function getSaleSummaryForPeriod(
  establishmentId: string,
  start: Date,
  end: Date
): Promise<{ count: number; amount: number; vat: number }> {
  const result = await pool.query(
    `
      SELECT
        COUNT(*)::int AS sale_count,
        COALESCE(SUM(amount), 0)::numeric AS sale_amount,
        COALESCE(SUM(vat_amount), 0)::numeric AS sale_vat
      FROM legal_journal
      WHERE establishment_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
        AND transaction_type = 'SALE'
    `,
    [establishmentId, start, end]
  );

  const row = result.rows[0] as {
    sale_count?: number | string;
    sale_amount?: number | string;
    sale_vat?: number | string;
  } | undefined;
  return {
    count: Number(row?.sale_count ?? 0),
    amount: Number(row?.sale_amount ?? 0),
    vat: Number(row?.sale_vat ?? 0),
  };
}

export async function getJournalStatsSummary(establishmentId: string): Promise<Record<string, unknown>> {
  const statsQuery = `
    SELECT
      COUNT(*) as total_entries,
      MIN(sequence_number) as first_sequence,
      MAX(sequence_number) as last_sequence,
      MIN(timestamp) as first_entry_date,
      MAX(timestamp) as last_entry_date,
      SUM(CASE WHEN transaction_type = 'SALE' THEN 1 ELSE 0 END) as sales_count,
      SUM(CASE WHEN transaction_type = 'REFUND' THEN 1 ELSE 0 END) as refunds_count,
      SUM(CASE WHEN transaction_type = 'CORRECTION' THEN 1 ELSE 0 END) as corrections_count,
      SUM(CASE WHEN transaction_type = 'CLOSURE' THEN 1 ELSE 0 END) as closures_count,
      SUM(CASE WHEN transaction_type = 'CHANGE' THEN 1 ELSE 0 END) as change_count
    FROM legal_journal
    WHERE establishment_id = $1
  `;

  const statsResult = await pool.query(statsQuery, [establishmentId]);
  return statsResult.rows[0] ?? {};
}
