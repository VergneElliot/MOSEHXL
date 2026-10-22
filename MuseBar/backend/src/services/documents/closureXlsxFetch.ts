import type { Pool } from 'pg';
import type { ClosureBulletinData } from '../printing/types';
import type { ClosureExportData, DailyClosureRow, DailyOrderRow } from './closureXlsxTypes';
import {
  buildVatBreakdownFromTtc,
  isPeriodClosureBulletin,
  parsePaymentBreakdown,
  parseVatBreakdown,
  toNumber,
} from './closureXlsxParse';

export async function fetchDailyClosuresInPeriod(
  pool: Pool,
  establishmentId: string,
  periodStart: string,
  periodEnd: string
): Promise<DailyClosureRow[]> {
  const result = await pool.query(
    `SELECT *
     FROM (
       SELECT DISTINCT ON (period_start::date)
         id,
         period_start,
         period_end,
         total_transactions,
         fond_de_caisse,
         total_amount,
         total_vat,
         tips_total,
         change_total,
         payment_methods_breakdown,
         vat_breakdown,
         first_sequence,
         last_sequence,
         closure_hash,
         reconciliation_ok
       FROM closure_bulletins
       WHERE establishment_id = $1
         AND closure_type = 'DAILY'
         AND period_start::date >= $2::date
         AND period_start::date <= $3::date
       ORDER BY period_start::date ASC, created_at DESC, id DESC
     ) latest_daily_closures
     ORDER BY period_start ASC`,
    [establishmentId, periodStart, periodEnd]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    period_start: new Date(row.period_start),
    period_end: new Date(row.period_end),
    total_transactions: Number(row.total_transactions ?? 0),
    fond_de_caisse: toNumber(row.fond_de_caisse),
    total_amount: toNumber(row.total_amount),
    total_vat: toNumber(row.total_vat),
    tips_total: row.tips_total == null ? null : toNumber(row.tips_total),
    change_total: row.change_total == null ? null : toNumber(row.change_total),
    payment_methods_breakdown: parsePaymentBreakdown(row.payment_methods_breakdown),
    vat_breakdown: parseVatBreakdown(row.vat_breakdown),
    first_sequence: row.first_sequence == null ? null : Number(row.first_sequence),
    last_sequence: row.last_sequence == null ? null : Number(row.last_sequence),
    closure_hash: String(row.closure_hash ?? ''),
    reconciliation_ok: Boolean(row.reconciliation_ok),
  }));
}

export async function fetchDailyOrdersInPeriod(
  pool: Pool,
  establishmentId: string,
  periodStart: string,
  periodEnd: string
): Promise<DailyOrderRow[]> {
  const result = await pool.query(
    `WITH item_totals AS (
       SELECT
         oi.order_id,
         SUM(CASE WHEN (oi.tax_rate <= 0.15 OR oi.tax_rate BETWEEN 9 AND 11) THEN oi.total_price ELSE 0 END) AS vat_10_ttc,
         SUM(CASE WHEN NOT (oi.tax_rate <= 0.15 OR oi.tax_rate BETWEEN 9 AND 11) THEN oi.total_price ELSE 0 END) AS vat_20_ttc
       FROM order_items oi
       GROUP BY oi.order_id
     ),
     split_totals AS (
       SELECT
         sb.order_id,
         SUM(CASE WHEN sb.payment_method = 'card' THEN sb.amount ELSE 0 END) AS card_total,
         SUM(CASE WHEN sb.payment_method = 'cash' THEN sb.amount ELSE 0 END) AS cash_total
       FROM sub_bills sb
       GROUP BY sb.order_id
     ),
     sale_sequences AS (
       SELECT DISTINCT ON (lj.order_id)
         lj.order_id,
         lj.sequence_number
       FROM legal_journal lj
       WHERE lj.establishment_id = $1
         AND lj.transaction_type = 'SALE'
       ORDER BY lj.order_id, lj.sequence_number DESC
     )
     SELECT
       o.id,
       o.created_at,
       o.payment_method,
       COALESCE(o.operation_type, 'sale') AS operation_type,
       o.total_amount,
       o.total_tax,
       o.tips,
       o.change,
       o.change_amount,
       ss.sequence_number,
       COALESCE(it.vat_10_ttc, 0) AS vat_10_ttc,
       COALESCE(it.vat_20_ttc, 0) AS vat_20_ttc,
       COALESCE(st.card_total, 0) AS split_card_total,
       COALESCE(st.cash_total, 0) AS split_cash_total
     FROM orders o
     LEFT JOIN item_totals it ON it.order_id = o.id
     LEFT JOIN split_totals st ON st.order_id = o.id
     LEFT JOIN sale_sequences ss ON ss.order_id = o.id
     WHERE o.establishment_id = $1
       AND o.created_at >= $2::timestamptz
       AND o.created_at <= $3::timestamptz
       AND o.status IN ('completed', 'paid')
     ORDER BY o.created_at ASC, o.id ASC`,
    [establishmentId, periodStart, periodEnd]
  );

  return result.rows.map((row) => {
    const totalAmount = toNumber(row.total_amount);
    const operationType = String(row.operation_type ?? 'sale');
    const paymentMethod = String(row.payment_method ?? '');
    const changeAmount = toNumber(row.change_amount);
    let cardTotal = 0;
    let cashTotal = 0;
    if (operationType === 'change' && changeAmount !== 0) {
      cardTotal = changeAmount;
      cashTotal = -changeAmount;
    } else if (paymentMethod === 'split') {
      cardTotal = toNumber(row.split_card_total);
      cashTotal = toNumber(row.split_cash_total);
    } else if (paymentMethod === 'card') {
      cardTotal = totalAmount;
    } else {
      cashTotal = totalAmount;
    }

    return {
      id: Number(row.id),
      sequence_number: row.sequence_number == null ? null : Number(row.sequence_number),
      created_at: new Date(row.created_at),
      payment_method: paymentMethod,
      operation_type: operationType,
      total_amount: totalAmount,
      total_vat: toNumber(row.total_tax),
      tips: toNumber(row.tips),
      change: toNumber(row.change),
      card_total: cardTotal,
      cash_total: cashTotal,
      vat_breakdown: buildVatBreakdownFromTtc(toNumber(row.vat_10_ttc), toNumber(row.vat_20_ttc)),
    };
  });
}

export async function buildClosureExportData(
  pool: Pool,
  establishmentId: string,
  bulletin: ClosureBulletinData
): Promise<ClosureExportData> {
  if (isPeriodClosureBulletin(bulletin.closure_type)) {
    return {
      kind: 'period',
      dailyRows: await fetchDailyClosuresInPeriod(
        pool,
        establishmentId,
        bulletin.period_start,
        bulletin.period_end
      ),
    };
  }

  return {
    kind: 'daily',
    orderRows: await fetchDailyOrdersInPeriod(
      pool,
      establishmentId,
      bulletin.period_start,
      bulletin.period_end
    ),
  };
}
