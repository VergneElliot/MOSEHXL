import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  isPeriodClosureBulletin,
  renderClosurePeriodXlsx,
  type DailyClosureRow,
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
  vat_breakdown: { vat_10: { amount: 0, vat: 0 }, vat_20: { amount: 250, vat: 50 } },
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
    period_start: new Date('2026-05-01'),
    period_end: new Date('2026-05-01'),
    total_transactions: 1,
    fond_de_caisse: 50,
    total_amount: 100,
    total_vat: 16.67,
    tips_total: 2,
    change_total: 1,
    payment_methods_breakdown: { card: 80, cash: 20 },
    vat_breakdown: { vat_20: { amount: 83.33, vat: 16.67 } },
  },
  {
    id: 2,
    period_start: new Date('2026-05-02'),
    period_end: new Date('2026-05-02'),
    total_transactions: 2,
    fond_de_caisse: 50,
    total_amount: 200,
    total_vat: 33.33,
    tips_total: 0,
    change_total: 0,
    payment_methods_breakdown: { card: 120, cash: 80 },
    vat_breakdown: { vat_20: { amount: 166.67, vat: 33.33 } },
  },
];

describe('closureXlsxService', () => {
  it('detects period bulletins', () => {
    expect(isPeriodClosureBulletin('DAILY')).toBe(false);
    expect(isPeriodClosureBulletin('WEEKLY')).toBe(true);
    expect(isPeriodClosureBulletin('MONTHLY')).toBe(true);
    expect(isPeriodClosureBulletin('ANNUAL')).toBe(true);
  });

  it('renders XLSX with one row per daily closure plus totals', async () => {
    const buffer = await renderClosurePeriodXlsx(bulletin, dailyRows);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeTruthy();
    expect(sheet.rowCount).toBeGreaterThanOrEqual(7);
    const totalCell = sheet.getRow(sheet.rowCount).getCell(1).value;
    expect(totalCell).toBe('TOTAL');
  });
});
