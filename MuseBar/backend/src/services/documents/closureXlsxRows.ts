import type { ClosureBulletinData } from '../printing/types';
import type { AccountingRow, ClosureExportData, DailyClosureRow, DailyOrderRow } from './closureXlsxTypes';
import { dateOnly, dateTime, toNumber, totalHt, vatBand } from './closureXlsxParse';

function accountingRowFromBulletin(
  bulletin: ClosureBulletinData,
  label: string,
  sourceId: string | number
): AccountingRow {
  const vat10 = vatBand(bulletin.vat_breakdown, 'vat_10');
  const vat20 = vatBand(bulletin.vat_breakdown, 'vat_20');
  return {
    label,
    sourceId,
    date: dateOnly(bulletin.period_start),
    periodStart: dateTime(bulletin.period_start),
    periodEnd: dateTime(bulletin.period_end),
    transactions: bulletin.total_transactions,
    paymentMethod: '',
    totalTtc: bulletin.total_amount,
    totalHt: totalHt(bulletin.vat_breakdown, bulletin.total_amount, bulletin.total_vat),
    totalVat: bulletin.total_vat,
    vat10Ttc: vat10.ttc,
    vat10Ht: vat10.amount,
    vat10Vat: vat10.vat,
    vat20Ttc: vat20.ttc,
    vat20Ht: vat20.amount,
    vat20Vat: vat20.vat,
    card: toNumber(bulletin.payment_methods_breakdown?.card),
    cash: toNumber(bulletin.payment_methods_breakdown?.cash),
    tips: bulletin.tips_total ?? 0,
    change: bulletin.change_total ?? 0,
    fond: bulletin.fond_de_caisse,
    firstSequence: bulletin.first_sequence,
    lastSequence: bulletin.last_sequence,
    hash: bulletin.closure_hash,
    reconciliation: '',
  };
}

function accountingRowFromDailyClosure(row: DailyClosureRow): AccountingRow {
  const vat10 = vatBand(row.vat_breakdown, 'vat_10');
  const vat20 = vatBand(row.vat_breakdown, 'vat_20');
  return {
    label: 'CLÔTURE JOUR',
    sourceId: row.id,
    date: dateOnly(row.period_start),
    periodStart: dateTime(row.period_start),
    periodEnd: dateTime(row.period_end),
    transactions: row.total_transactions,
    paymentMethod: '',
    totalTtc: row.total_amount,
    totalHt: totalHt(row.vat_breakdown, row.total_amount, row.total_vat),
    totalVat: row.total_vat,
    vat10Ttc: vat10.ttc,
    vat10Ht: vat10.amount,
    vat10Vat: vat10.vat,
    vat20Ttc: vat20.ttc,
    vat20Ht: vat20.amount,
    vat20Vat: vat20.vat,
    card: toNumber(row.payment_methods_breakdown.card),
    cash: toNumber(row.payment_methods_breakdown.cash),
    tips: row.tips_total ?? 0,
    change: row.change_total ?? 0,
    fond: row.fond_de_caisse,
    firstSequence: row.first_sequence,
    lastSequence: row.last_sequence,
    hash: row.closure_hash,
    reconciliation: row.reconciliation_ok ? 'OK' : 'ÉCART',
  };
}

function accountingRowFromOrder(row: DailyOrderRow): AccountingRow {
  const vat10 = vatBand(row.vat_breakdown, 'vat_10');
  const vat20 = vatBand(row.vat_breakdown, 'vat_20');
  return {
    label: 'COMMANDE',
    sourceId: row.sequence_number ?? row.id,
    date: dateTime(row.created_at),
    periodStart: '',
    periodEnd: '',
    transactions: 1,
    paymentMethod: row.payment_method,
    totalTtc: row.total_amount,
    totalHt: totalHt(row.vat_breakdown, row.total_amount, row.total_vat),
    totalVat: row.total_vat,
    vat10Ttc: vat10.ttc,
    vat10Ht: vat10.amount,
    vat10Vat: vat10.vat,
    vat20Ttc: vat20.ttc,
    vat20Ht: vat20.amount,
    vat20Vat: vat20.vat,
    card: row.card_total,
    cash: row.cash_total,
    tips: row.tips,
    change: row.change,
    fond: null,
    firstSequence: row.sequence_number,
    lastSequence: row.sequence_number,
    hash: '',
    reconciliation: '',
  };
}

export function buildClosureAccountingRows(
  bulletin: ClosureBulletinData,
  exportData: ClosureExportData
): AccountingRow[] {
  const totalRow = accountingRowFromBulletin(
    bulletin,
    exportData.kind === 'daily' ? 'TOTAL JOUR' : 'TOTAL PÉRIODE',
    bulletin.id
  );

  if (exportData.kind === 'daily') {
    return [totalRow, ...exportData.orderRows.map(accountingRowFromOrder)];
  }

  return [totalRow, ...exportData.dailyRows.map(accountingRowFromDailyClosure)];
}
