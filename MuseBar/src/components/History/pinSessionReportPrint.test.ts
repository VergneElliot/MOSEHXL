import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { printPinSessionReport } from './pinSessionReportPrint';
import type { PinSessionReportSnapshot } from '../../services/api/pinSessionReports';

describe('printPinSessionReport', () => {
  const write = vi.fn();
  const close = vi.fn();
  const open = vi.fn();

  beforeEach(() => {
    write.mockReset();
    close.mockReset();
    open.mockReset();
    vi.stubGlobal('open', vi.fn(() => ({
      document: { open, write, close },
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes an informative print document', () => {
    const snap: PinSessionReportSnapshot = {
      informational: true,
      pin_session_id: 's1',
      staff_user_id: 1,
      staff_display_name: 'Ada',
      period_start: '2026-10-28T10:00:00.000Z',
      period_end: '2026-10-28T12:00:00.000Z',
      session_closed: true,
      order_count: 2,
      total_amount: 20,
      payment_breakdown: { card: 12, cash: 8 },
      vat_breakdown: {
        vat_10: { amount: 0, vat: 0, ttc: 0 },
        vat_20: { amount: 16.67, vat: 3.33, ttc: 20 },
      },
      order_ids: [1, 2],
    };
    printPinSessionReport(snap);
    expect(write).toHaveBeenCalled();
    const html = String(write.mock.calls[0]?.[0] ?? '');
    expect(html).toContain('Rapport de session PIN');
    expect(html).toContain('informatif');
    expect(html).toContain('Ada');
  });
});
