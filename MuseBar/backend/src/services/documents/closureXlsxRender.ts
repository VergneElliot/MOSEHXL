import ExcelJS from 'exceljs';
import type { Pool } from 'pg';
import type { ClosureBulletinData } from '../printing/types';
import type { AccountingRow, ClosureExportData, DailyClosureRow, DailyOrderRow } from './closureXlsxTypes';
import { dateOnly, dateOnlyYmd, dateTime } from './closureXlsxParse';
import { buildClosureExportData } from './closureXlsxFetch';
import { buildClosureAccountingRows } from './closureXlsxRows';

export function closureExportFilename(bulletin: ClosureBulletinData, extension: 'pdf' | 'xlsx'): string {
  return `bilan-cloture-${bulletin.closure_type.toLowerCase()}-${dateOnlyYmd(bulletin.period_start)}-${dateOnlyYmd(bulletin.period_end)}.${extension}`;
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
