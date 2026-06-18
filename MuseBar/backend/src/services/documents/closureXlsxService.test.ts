import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  fetchDailyClosuresInPeriod,
  isPeriodClosureBulletin,
  renderClosureDailyXlsx,
  renderClosurePeriodXlsx,
  type DailyClosureRow,
  type DailyOrderRow,
} from './closureXlsxService';
import type { ClosureBulletinData } from '../printing/types';

const bulletin: ClosureBulletinData = {
  id: 3,
  closure_type: 'MONTHLY',
  period_start: '2026-05-01T00:00:00.000Z',
  period_end: '2026-05-31T23:59:59.000Z',
  total_transactions: 3,
  fond_de_caisse: 50,
  total_amount: 300,
  total_vat: 50,
  vat_breakdown: {
    vat_10: { amount: 0, vat: 0, ttc: 0 },
    vat_20: { amount: 250, vat: 50, ttc: 300 },
  },
  payment_methods_breakdown: { card: 200, cash: 100 },
  first_sequence: 1,
  last_sequence: 3,
  closure_hash: 'hash',
  is_closed: true,
  closed_at: '2026-06-01T00:00:00.000Z',
  created_at: '2026-06-01T00:00:00.000Z',
  business_info: {
    name: 'Test Bar',
    address: 'Addr',
    phone: '01',
    email: 'bar@test.fr',
  },
};

const dailyRows: DailyClosureRow[] = [
  {
    id: 1,
    period_start: new Date('2026-05-01T00:00:00.000Z'),
    period_end: new Date('2026-05-01T23:59:59.000Z'),
    total_transactions: 1,
    fond_de_caisse: 50,
    total_amount: 100,
    total_vat: 16.67,
    tips_total: 2,
    change_total: 1,
    payment_methods_breakdown: { card: 80, cash: 20 },
    vat_breakdown: { vat_20: { amount: 83.33, vat: 16.67, ttc: 100 } },
    first_sequence: 1,
    last_sequence: 1,
    closure_hash: 'daily-hash-1',
    reconciliation_ok: true,
  },
  {
    id: 2,
    period_start: new Date('2026-05-02T00:00:00.000Z'),
    period_end: new Date('2026-05-02T23:59:59.000Z'),
    total_transactions: 2,
    fond_de_caisse: 50,
    total_amount: 200,
    total_vat: 33.33,
    tips_total: 0,
    change_total: 0,
    payment_methods_breakdown: { card: 120, cash: 80 },
    vat_breakdown: { vat_20: { amount: 166.67, vat: 33.33, ttc: 200 } },
    first_sequence: 2,
    last_sequence: 3,
    closure_hash: 'daily-hash-2',
    reconciliation_ok: true,
  },
];

const orderRows: DailyOrderRow[] = [
  {
    id: 10,
    sequence_number: 101,
    created_at: new Date('2026-05-01T12:00:00.000Z'),
    payment_method: 'card',
    operation_type: 'sale',
    total_amount: 120,
    total_vat: 20,
    tips: 0,
    change: 0,
    card_total: 120,
    cash_total: 0,
    vat_breakdown: { vat_20: { amount: 100, vat: 20, ttc: 120 } },
  },
  {
    id: 11,
    sequence_number: 102,
    created_at: new Date('2026-05-01T13:00:00.000Z'),
    payment_method: 'cash',
    operation_type: 'sale',
    total_amount: 55,
    total_vat: 5,
    tips: 0,
    change: 0,
    card_total: 0,
    cash_total: 55,
    vat_breakdown: { vat_10: { amount: 50, vat: 5, ttc: 55 } },
  },
];

async function loadFirstSheet(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  expect(sheet).toBeTruthy();
  return sheet;
}

describe('closureXlsxService', () => {
  it('detects period bulletins', () => {
    expect(isPeriodClosureBulletin('DAILY')).toBe(false);
    expect(isPeriodClosureBulletin('WEEKLY')).toBe(true);
    expect(isPeriodClosureBulletin('MONTHLY')).toBe(true);
    expect(isPeriodClosureBulletin('ANNUAL')).toBe(true);
  });

  it('renders period XLSX with period total then one row per daily closure', async () => {
    const sheet = await loadFirstSheet(await renderClosurePeriodXlsx(bulletin, dailyRows));

    expect(sheet.getRow(5).values).toContain('Total soumis à TVA 20%');
    expect(sheet.getRow(5).values).not.toContain('TVA 20% HT');
    expect(sheet.getRow(6).getCell(1).value).toBe('TOTAL PÉRIODE');
    expect(sheet.getRow(6).getCell(8).value).toBe(300);
    expect(sheet.getRow(7).getCell(1).value).toBe('CLÔTURE JOUR');
    expect(sheet.getRow(7).getCell(2).value).toBe(1);
    expect(sheet.getRow(8).getCell(2).value).toBe(2);
  });

  it('renders daily XLSX with daily total then one row per order', async () => {
    const dailyBulletin = { ...bulletin, closure_type: 'DAILY' as const };
    const sheet = await loadFirstSheet(await renderClosureDailyXlsx(dailyBulletin, orderRows));

    expect(sheet.getRow(6).getCell(1).value).toBe('TOTAL JOUR');
    expect(sheet.getRow(7).getCell(1).value).toBe('COMMANDE');
    expect(sheet.getRow(7).getCell(2).value).toBe(101);
    expect(sheet.getRow(7).getCell(15).value).toBe(120);
    expect(sheet.getRow(8).getCell(2).value).toBe(102);
    expect(sheet.getRow(8).getCell(16).value).toBe(55);
  });

  it('fetches only the latest daily closure per day for period exports', async () => {
    const mockPool = {
      query: async (sql: string) => {
        expect(sql).toContain('DISTINCT ON (period_start::date)');
        expect(sql).toContain('created_at DESC, id DESC');
        return { rows: [] };
      },
    };

    await fetchDailyClosuresInPeriod(
      mockPool as never,
      'est-1',
      '2026-05-01T00:00:00.000Z',
      '2026-05-31T23:59:59.000Z'
    );
  });
});
