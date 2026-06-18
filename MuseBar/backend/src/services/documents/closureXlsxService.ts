import ExcelJS from 'exceljs';
import type { Pool } from 'pg';
import type { ClosureBulletinData } from '../printing/types';

type VatBand = { amount?: number; vat?: number; ttc?: number };
type VatBreakdown = {
  vat_10?: VatBand;
  vat_20?: VatBand;
};

export type DailyClosureRow = {
  id: number;
  period_start: Date;
  period_end: Date;
  total_transactions: number;
  fond_de_caisse: number;
  total_amount: number;
  total_vat: number;
  tips_total: number | null;
  change_total: number | null;
  payment_methods_breakdown: Record<string, number>;
  vat_breakdown: VatBreakdown;
  first_sequence: number | null;
  last_sequence: number | null;
  closure_hash: string;
  reconciliation_ok: boolean;
};

export type DailyOrderRow = {
  id: number;
  sequence_number: number | null;
  created_at: Date;
  payment_method: string;
  operation_type: string;
  total_amount: number;
  total_vat: number;
  tips: number;
  change: number;
  card_total: number;
  cash_total: number;
  vat_breakdown: VatBreakdown;
};

export type ClosureExportData =
  | { kind: 'daily'; orderRows: DailyOrderRow[] }
  | { kind: 'period'; dailyRows: DailyClosureRow[] };

export type AccountingRow = {
  label: string;
  sourceId: string | number;
  date: string;
  periodStart: string;
  periodEnd: string;
  transactions: number | null;
  paymentMethod: string;
  totalTtc: number;
  totalHt: number;
  totalVat: number;
  vat10Ttc: number;
  vat10Ht: number;
  vat10Vat: number;
  vat20Ttc: number;
  vat20Ht: number;
  vat20Vat: number;
  card: number;
  cash: number;
  tips: number;
  change: number;
  fond: number | null;
  firstSequence: number | null;
  lastSequence: number | null;
  hash: string;
  reconciliation: string;
};

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function roundTo4(amount: number): number {
  return Math.round(amount * 10000) / 10000;
}

function vatFromTtc(ttc: number, rate: 0.1 | 0.2): number {
  return roundTo4(ttc / (rate === 0.1 ? 11 : 6));
}

function parsePaymentBreakdown(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = toNumber(value);
  }
  return out;
}

function parseVatBreakdown(raw: unknown): VatBreakdown {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as Record<string, unknown>;
  const parseBand = (band: unknown): VatBand | undefined => {
    if (!band || typeof band !== 'object') return undefined;
    const b = band as Record<string, unknown>;
    return {
      amount: toNumber(b.amount),
      vat: toNumber(b.vat),
      ttc: b.ttc == null ? undefined : toNumber(b.ttc),
    };
  };
  return {
    vat_10: parseBand(row.vat_10),
    vat_20: parseBand(row.vat_20),
  };
}

function buildVatBreakdownFromTtc(vat10Ttc: number, vat20Ttc: number): VatBreakdown {
  const vat10 = vatFromTtc(vat10Ttc, 0.1);
  const vat20 = vatFromTtc(vat20Ttc, 0.2);
  return {
    vat_10: {
      ttc: roundTo4(vat10Ttc),
      vat: vat10,
      amount: roundTo4(vat10Ttc - vat10),
    },
    vat_20: {
      ttc: roundTo4(vat20Ttc),
      vat: vat20,
      amount: roundTo4(vat20Ttc - vat20),
    },
  };
}

function dateOnly(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function dateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function vatBand(vat: VatBreakdown, key: 'vat_10' | 'vat_20'): Required<VatBand> {
  const band = vat[key] ?? {};
  const amount = toNumber(band.amount);
  const vatAmount = toNumber(band.vat);
  const ttc = band.ttc == null ? amount + vatAmount : toNumber(band.ttc);
  return { amount, vat: vatAmount, ttc };
}

function totalHt(vat: VatBreakdown, fallbackTtc: number, fallbackVat: number): number {
  const vat10 = vatBand(vat, 'vat_10');
  const vat20 = vatBand(vat, 'vat_20');
  const fromBands = vat10.amount + vat20.amount;
  return fromBands > 0 ? fromBands : fallbackTtc - fallbackVat;
}

export function isPeriodClosureBulletin(closureType: string): boolean {
  return closureType === 'WEEKLY' || closureType === 'MONTHLY' || closureType === 'ANNUAL';
}

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

function closureExportFilename(bulletin: ClosureBulletinData, extension: 'pdf' | 'xlsx'): string {
  return `bilan-cloture-${bulletin.closure_type.toLowerCase()}-${dateOnly(bulletin.period_start)}-${dateOnly(bulletin.period_end)}.${extension}`;
}

const headers = [
  'Type ligne',
  'ID source',
  'Date',
  'Période début',
  'Période fin',
  'Transactions',
  'Mode paiement',
  'Total TTC',
  'Total HT',
  'Total TVA',
  'Total soumis à TVA 10%',
  'TVA 10%',
  'Total soumis à TVA 20%',
  'TVA 20%',
  'Carte',
  'Espèces',
  'Pourboires',
  'Monnaie',
  'Fond caisse',
  'Première séquence',
  'Dernière séquence',
  'Empreinte',
  'Réconciliation',
];

function rowValues(row: AccountingRow): Array<string | number | null> {
  return [
    row.label,
    row.sourceId,
    row.date,
    row.periodStart,
    row.periodEnd,
    row.transactions,
    row.paymentMethod,
    row.totalTtc,
    row.totalHt,
    row.totalVat,
    row.vat10Ttc,
    row.vat10Vat,
    row.vat20Ttc,
    row.vat20Vat,
    row.card,
    row.cash,
    row.tips,
    row.change,
    row.fond,
    row.firstSequence,
    row.lastSequence,
    row.hash,
    row.reconciliation,
  ];
}

export async function renderClosureXlsx(
  bulletin: ClosureBulletinData,
  exportData: ClosureExportData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bilan clôture');
  const accountingRows = buildClosureAccountingRows(bulletin, exportData);

  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: header.includes('Empreinte') ? 28 : Math.max(12, Math.min(22, header.length + 2)),
  }));

  sheet.mergeCells('A1:W1');
  sheet.getCell('A1').value = `${bulletin.business_info.name} - Bilan comptable ${bulletin.closure_type}`;
  sheet.getCell('A1').font = { bold: true, size: 12 };

  sheet.mergeCells('A2:W2');
  sheet.getCell('A2').value = `Période ${dateOnly(bulletin.period_start)} au ${dateOnly(bulletin.period_end)} - Bulletin #${bulletin.id} - Empreinte ${bulletin.closure_hash}`;

  sheet.mergeCells('A3:W3');
  sheet.getCell('A3').value = `Export généré le ${dateTime(new Date())}`;

  sheet.getRow(5).values = headers;
  sheet.getRow(5).font = { bold: true };

  let rowIndex = 6;
  for (const row of accountingRows) {
    const worksheetRow = sheet.getRow(rowIndex);
    worksheetRow.values = rowValues(row);
    if (row.label.startsWith('TOTAL')) {
      worksheetRow.font = { bold: true };
    }
    rowIndex += 1;
  }

  for (let col = 8; col <= 19; col += 1) {
    sheet.getColumn(col).numFmt = '#,##0.00';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function renderClosurePeriodXlsx(
  bulletin: ClosureBulletinData,
  dailyRows: DailyClosureRow[]
): Promise<Buffer> {
  return renderClosureXlsx(bulletin, { kind: 'period', dailyRows });
}

export async function renderClosureDailyXlsx(
  bulletin: ClosureBulletinData,
  orderRows: DailyOrderRow[]
): Promise<Buffer> {
  return renderClosureXlsx(bulletin, { kind: 'daily', orderRows });
}

export async function buildClosureXlsxAttachment(
  pool: Pool,
  establishmentId: string,
  bulletin: ClosureBulletinData,
  exportData?: ClosureExportData
): Promise<{ buffer: Buffer; filename: string }> {
  const data = exportData ?? await buildClosureExportData(pool, establishmentId, bulletin);
  const buffer = await renderClosureXlsx(bulletin, data);
  return { buffer, filename: closureExportFilename(bulletin, 'xlsx') };
}

export function buildClosurePdfFilename(bulletin: ClosureBulletinData): string {
  return closureExportFilename(bulletin, 'pdf');
}
