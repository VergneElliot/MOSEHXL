import { describe, expect, it } from 'vitest';
import {
  convertArchiveToCSV,
  convertArchiveToPDF,
  convertArchiveToXML,
} from './archiveExportFormat';

describe('convertArchiveToXML', () => {
  it('emits compliance header and daily closure block', () => {
    const xml = convertArchiveToXML({
      export_type: 'DAILY',
      compliance_info: {
        legal_reference: 'Article 286-I-3 bis du CGI',
        export_timestamp: '2026-10-22T12:00:00.000Z',
        register_id: 'CR-est-1',
      },
      closure_data: {
        total_transactions: 4,
        total_amount: 120,
        total_vat: 20,
        period_start: '2026-10-21T02:00:00.000Z',
        period_end: '2026-10-22T01:59:59.999Z',
      },
    });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<register_id>CR-est-1</register_id>');
    expect(xml).toContain('<daily_closure>');
    expect(xml).toContain('<total_transactions>4</total_transactions>');
    expect(xml).toContain('</musebar_export>');
  });

  it('falls back to default legal reference when missing', () => {
    const xml = convertArchiveToXML({ export_type: 'FULL' });
    expect(xml).toContain('Article 286-I-3 bis du CGI');
    expect(xml).not.toContain('<daily_closure>');
  });
});

describe('convertArchiveToCSV', () => {
  it('formats DAILY rows', () => {
    const csv = convertArchiveToCSV({
      export_type: 'DAILY',
      compliance_info: { export_timestamp: '2026-10-22T12:00:00.000Z' },
      closure_data: {
        total_transactions: 2,
        total_amount: 50,
        total_vat: 8,
        period_start: 'a',
        period_end: 'b',
      },
    });
    expect(csv.split('\n')[0]).toContain('Export Type');
    expect(csv).toContain('DAILY,a,b,2,50,8,2026-10-22T12:00:00.000Z');
  });

  it('formats MONTHLY and ANNUAL from period/summary', () => {
    const monthly = convertArchiveToCSV({
      export_type: 'MONTHLY',
      period: { start: '2026-09-01', end: '2026-09-30' },
      summary: { total_transactions: 10, total_amount: 100, total_vat: 15 },
      compliance_info: { export_timestamp: 'ts' },
    });
    expect(monthly).toContain('MONTHLY,2026-09-01,2026-09-30,10,100,15,ts');

    const annual = convertArchiveToCSV({
      export_type: 'ANNUAL',
      period: { start: '2026-01-01', end: '2026-12-31' },
      summary: { total_transactions: 100, total_amount: 1000, total_vat: 150 },
      compliance_info: { export_timestamp: 'ts2' },
    });
    expect(annual).toContain('ANNUAL,2026-01-01,2026-12-31,100,1000,150,ts2');
  });
});

describe('convertArchiveToPDF', () => {
  it('returns a non-empty PDF buffer with MuseBar title metadata', async () => {
    const buf = await convertArchiveToPDF({
      export_type: 'MONTHLY',
      compliance_info: {
        export_timestamp: '2026-10-22T12:00:00.000Z',
        legal_reference: 'Article 286-I-3 bis du CGI',
      },
      period: { start: '2026-09-01', end: '2026-09-30' },
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });
});
