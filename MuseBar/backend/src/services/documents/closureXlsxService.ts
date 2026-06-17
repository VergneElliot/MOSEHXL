import ExcelJS from 'exceljs';
import type { Pool } from 'pg';
import type { ClosureBulletinData } from '../printing/types';

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
  vat_breakdown: {
    vat_10?: { amount?: number; vat?: number; ttc?: number };
    vat_20?: { amount?: number; vat?: number; ttc?: number };
  };
};

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function parsePaymentBreakdown(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = toNumber(value);
  }
  return out;
}

function parseVatBreakdown(raw: unknown): DailyClosureRow['vat_breakdown'] {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as Record<string, unknown>;
  const parseBand = (band: unknown) => {
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
    `SELECT
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
       vat_breakdown
     FROM closure_bulletins
     WHERE establishment_id = $1
       AND closure_type = 'DAILY'
       AND period_start::date >= $2::date
       AND period_start::date <= $3::date
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
  }));
}

export async function renderClosurePeriodXlsx(
  bulletin: ClosureBulletinData,
  dailyRows: DailyClosureRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Recap clôtures');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Transactions', key: 'transactions', width: 14 },
    { header: 'Total TTC', key: 'total_ttc', width: 14 },
    { header: 'Total TVA', key: 'total_vat', width: 14 },
    { header: 'TVA 10%', key: 'vat_10', width: 12 },
    { header: 'TVA 20%', key: 'vat_20', width: 12 },
    { header: 'Carte', key: 'card', width: 12 },
    { header: 'Espèces', key: 'cash', width: 12 },
    { header: 'Pourboires', key: 'tips', width: 12 },
    { header: 'Monnaie', key: 'change', width: 12 },
    { header: 'Fond caisse', key: 'fond', width: 12 },
  ];

  sheet.mergeCells('A1:K1');
  sheet.getCell('A1').value = `${bulletin.business_info.name} — Récapitulatif ${bulletin.closure_type}`;
  sheet.getCell('A1').font = { bold: true, size: 12 };

  sheet.mergeCells('A2:K2');
  sheet.getCell('A2').value = `Période ${bulletin.period_start.slice(0, 10)} au ${bulletin.period_end.slice(0, 10)}`;

  const headers = [
    'Date',
    'Transactions',
    'Total TTC',
    'Total TVA',
    'TVA 10%',
    'TVA 20%',
    'Carte',
    'Espèces',
    'Pourboires',
    'Monnaie',
    'Fond caisse',
  ];
  sheet.getRow(4).values = headers;
  sheet.getRow(4).font = { bold: true };

  let rowIndex = 5;
  for (const row of dailyRows) {
    sheet.getRow(rowIndex).values = [
      row.period_start.toISOString().slice(0, 10),
      row.total_transactions,
      row.total_amount,
      row.total_vat,
      toNumber(row.vat_breakdown.vat_10?.vat),
      toNumber(row.vat_breakdown.vat_20?.vat),
      toNumber(row.payment_methods_breakdown.card),
      toNumber(row.payment_methods_breakdown.cash),
      row.tips_total ?? 0,
      row.change_total ?? 0,
      row.fond_de_caisse,
    ];
    rowIndex += 1;
  }

  const totals = dailyRows.reduce(
    (acc, row) => ({
      transactions: acc.transactions + row.total_transactions,
      total_ttc: acc.total_ttc + row.total_amount,
      total_vat: acc.total_vat + row.total_vat,
      vat_10: acc.vat_10 + toNumber(row.vat_breakdown.vat_10?.vat),
      vat_20: acc.vat_20 + toNumber(row.vat_breakdown.vat_20?.vat),
      card: acc.card + toNumber(row.payment_methods_breakdown.card),
      cash: acc.cash + toNumber(row.payment_methods_breakdown.cash),
      tips: acc.tips + (row.tips_total ?? 0),
      change: acc.change + (row.change_total ?? 0),
      fond: acc.fond + row.fond_de_caisse,
    }),
    {
      transactions: 0,
      total_ttc: 0,
      total_vat: 0,
      vat_10: 0,
      vat_20: 0,
      card: 0,
      cash: 0,
      tips: 0,
      change: 0,
      fond: 0,
    }
  );

  const totalRow = sheet.getRow(rowIndex);
  totalRow.font = { bold: true };
  totalRow.values = [
    'TOTAL',
    totals.transactions,
    totals.total_ttc,
    totals.total_vat,
    totals.vat_10,
    totals.vat_20,
    totals.card,
    totals.cash,
    totals.tips,
    totals.change,
    totals.fond,
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildClosureXlsxAttachment(
  pool: Pool,
  establishmentId: string,
  bulletin: ClosureBulletinData
): Promise<{ buffer: Buffer; filename: string } | null> {
  if (!isPeriodClosureBulletin(bulletin.closure_type)) {
    return null;
  }

  const dailyRows = await fetchDailyClosuresInPeriod(
    pool,
    establishmentId,
    bulletin.period_start,
    bulletin.period_end
  );

  const buffer = await renderClosurePeriodXlsx(bulletin, dailyRows);
  const filename = `closure-recap-${bulletin.id}.xlsx`;
  return { buffer, filename };
}
