import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  loggerError: vi.fn(),
  epsonHandler: vi.fn(),
  listPrintingConfigurations: vi.fn(),
  savePrintingConfiguration: vi.fn(),
  managerGetService: vi.fn(),
  managerClearService: vi.fn(),
  buildTestReceiptData: vi.fn(),
  buildReceiptDataForOrder: vi.fn(),
  buildClosureBulletinData: vi.fn(),
  logPrintingHistory: vi.fn(),
}));

vi.mock('../app', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const mode = req.header('x-test-auth-mode');
    if (mode === 'no-est') {
      (req as express.Request & { user?: unknown }).user = {
        id: 7,
        email: 'staff@example.com',
        role: 'staff',
        is_admin: false,
        establishment_id: null,
      };
      return next();
    }

    (req as express.Request & { user?: unknown }).user = {
      id: 8,
      email: 'staff@example.com',
      role: 'staff',
      is_admin: false,
      establishment_id: 'est-1',
    };
    return next();
  },
}));

vi.mock('../utils/logger', () => ({
  getLogger: () => ({
    error: mocks.loggerError,
  }),
}));

vi.mock('../printing/epsonPollHandler', () => ({
  epsonServerDirectPollHandler: mocks.epsonHandler,
}));

vi.mock('../printing/printingConfigRepo', () => ({
  ALLOWED_PRINT_PROVIDERS: ['epson-server-direct', 'digital'],
  listPrintingConfigurations: mocks.listPrintingConfigurations,
  savePrintingConfiguration: mocks.savePrintingConfiguration,
  parseConfigCell: vi.fn(),
}));

vi.mock('../printing/printDataRepo', () => ({
  buildTestReceiptData: mocks.buildTestReceiptData,
  buildReceiptDataForOrder: mocks.buildReceiptDataForOrder,
  buildClosureBulletinData: mocks.buildClosureBulletinData,
  logPrintingHistory: mocks.logPrintingHistory,
}));

vi.mock('../printing/printingServiceManager', () => ({
  createPrintingServiceManager: () => ({
    getPrintingService: mocks.managerGetService,
    clearPrintingService: mocks.managerClearService,
  }),
}));

import printingRouter from './printing';

const app = express();
app.use(express.json());
app.use('/printing', printingRouter);

describe('printing routes', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.loggerError.mockReset();
    mocks.epsonHandler.mockReset();
    mocks.listPrintingConfigurations.mockReset();
    mocks.savePrintingConfiguration.mockReset();
    mocks.managerGetService.mockReset();
    mocks.managerClearService.mockReset();
    mocks.buildTestReceiptData.mockReset();
    mocks.buildReceiptDataForOrder.mockReset();
    mocks.buildClosureBulletinData.mockReset();
    mocks.logPrintingHistory.mockReset();

    mocks.managerGetService.mockResolvedValue({
      checkPrinterStatus: vi.fn().mockResolvedValue({ connected: true }),
      listPrinters: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Printer 1' }]),
      printReceipt: vi.fn(),
      printClosureBulletin: vi.fn(),
    });
  });

  it('returns 400 when establishment context is missing', async () => {
    const res = await request(app)
      .get('/printing/status')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-auth-mode', 'no-est');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Establishment context required');
  });

  it('returns Epson poll payload when handler succeeds', async () => {
    mocks.epsonHandler.mockImplementation(async (_poolArg, _req, res) =>
      res.status(200).type('text/plain').send('epson-ok')
    );

    const res = await request(app)
      .get('/printing/epson/poll');

    expect(res.status).toBe(200);
    expect(res.text).toBe('epson-ok');
    expect(mocks.epsonHandler).toHaveBeenCalledTimes(1);
  });

  it('returns 500 for Epson poll when handler throws', async () => {
    mocks.epsonHandler.mockRejectedValue(new Error('poll failure'));

    const res = await request(app)
      .get('/printing/epson/poll');

    expect(res.status).toBe(500);
    expect(res.text).toBe('Internal error');
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('returns status payload for authenticated establishment user', async () => {
    const res = await request(app)
      .get('/printing/status')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.establishment_id).toBe('est-1');
    expect(res.body.status).toEqual({ connected: true });
    expect(res.body.printers).toEqual([{ id: 'p1', name: 'Printer 1' }]);
    expect(mocks.managerGetService).toHaveBeenCalledWith('est-1');
  });

  it('returns printers payload for authenticated establishment user', async () => {
    const res = await request(app)
      .get('/printing/printers')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.establishment_id).toBe('est-1');
    expect(res.body.printers).toEqual([{ id: 'p1', name: 'Printer 1' }]);
    expect(mocks.managerGetService).toHaveBeenCalledWith('est-1');
  });

  it('returns 500 when listing printers fails unexpectedly', async () => {
    mocks.managerGetService.mockRejectedValue(new Error('printer service unavailable'));

    const res = await request(app)
      .get('/printing/printers')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to list printers');
    expect(String(res.body.message)).toContain('printer service unavailable');
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('queues test print and returns success message', async () => {
    mocks.buildTestReceiptData.mockResolvedValue({ sequence_number: 999, items: [] });
    const printReceipt = vi.fn().mockResolvedValue({ success: true, message: 'ok' });
    mocks.managerGetService.mockResolvedValue({
      checkPrinterStatus: vi.fn().mockResolvedValue({ connected: true }),
      listPrinters: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Printer 1' }]),
      printReceipt,
      printClosureBulletin: vi.fn(),
    });

    const res = await request(app)
      .post('/printing/test')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Test print queued successfully');
    expect(mocks.buildTestReceiptData).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ establishment_id: 'est-1' })
    );
    expect(printReceipt).toHaveBeenCalledWith(expect.objectContaining({ sequence_number: 999 }));
  });

  it('returns 500 when test print fails unexpectedly', async () => {
    mocks.managerGetService.mockRejectedValue(new Error('service unavailable'));

    const res = await request(app)
      .post('/printing/test')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Test print failed');
    expect(String(res.body.message)).toContain('service unavailable');
  });

  it('returns 400 for invalid provider on configuration update', async () => {
    mocks.savePrintingConfiguration.mockRejectedValue(
      Object.assign(new Error('Provider must be one of: epson-server-direct, digital'), { statusCode: 400 })
    );

    const res = await request(app)
      .post('/printing/configuration')
      .set('Authorization', 'Bearer test-token')
      .send({ provider: 'invalid-provider', config: {} });

    expect(res.status).toBe(400);
    expect(String(res.body.error)).toContain('Provider must be one of');
  });

  it('returns 400 when provider is missing on configuration update', async () => {
    const res = await request(app)
      .post('/printing/configuration')
      .set('Authorization', 'Bearer test-token')
      .send({ config: {} });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Provider is required');
    expect(mocks.savePrintingConfiguration).not.toHaveBeenCalled();
  });

  it('updates configuration and clears cached service on success', async () => {
    mocks.savePrintingConfiguration.mockResolvedValue({
      configuration: {
        id: 10,
        provider: 'epson-server-direct',
        is_active: true,
        config: { pollKey: 'abc' },
      },
    });

    const res = await request(app)
      .post('/printing/configuration')
      .set('Authorization', 'Bearer test-token')
      .send({ provider: 'epson-server-direct', config: {} });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Printing configuration updated successfully');
    expect(mocks.savePrintingConfiguration).toHaveBeenCalledWith(
      expect.anything(),
      'est-1',
      'epson-server-direct',
      {}
    );
    expect(mocks.managerClearService).toHaveBeenCalledWith('est-1');
  });

  it('returns printing configuration list scoped to caller establishment', async () => {
    mocks.listPrintingConfigurations.mockResolvedValue([
      { id: 2, provider: 'epson-server-direct', is_active: true, config: {} },
    ]);

    const res = await request(app)
      .get('/printing/configuration')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.establishment_id).toBe('est-1');
    expect(res.body.configurations).toHaveLength(1);
    expect(mocks.listPrintingConfigurations).toHaveBeenCalledWith(expect.anything(), 'est-1');
  });

  it('returns tenant-scoped printing history with bounded pagination', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, establishment_id: 'est-1', print_type: 'receipt' }],
      })
      .mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

    const res = await request(app)
      .get('/printing/history?limit=999&offset=2')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(500);
    expect(res.body.offset).toBe(2);
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE establishment_id = $1'),
      ['est-1', 500, 2]
    );
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('COUNT(*) FROM printing_history WHERE establishment_id = $1'),
      ['est-1']
    );
  });

  it('falls back to safe defaults for invalid printing history pagination params', async () => {
    mocks.poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app)
      .get('/printing/history?limit=-10&offset=abc')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(50);
    expect(res.body.offset).toBe(0);
    expect(mocks.poolQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('LIMIT $2 OFFSET $3'),
      ['est-1', 50, 0]
    );
  });

  it('returns 500 for printing history when query fails', async () => {
    mocks.poolQuery.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .get('/printing/history')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to get printing history');
    expect(String(res.body.message)).toContain('db down');
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('returns receipt preview and scopes data build to caller establishment', async () => {
    mocks.buildReceiptDataForOrder.mockResolvedValue({
      sequence_number: 456,
      items: [],
    });

    const res = await request(app)
      .get('/printing/receipt/42/preview?type=simplified')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.receipt_data.sequence_number).toBe(456);
    expect(mocks.buildReceiptDataForOrder).toHaveBeenCalledWith(
      expect.anything(),
      'est-1',
      expect.objectContaining({ establishment_id: 'est-1' }),
      42,
      'simplified'
    );
  });

  it('returns 400 for invalid preview order id and skips data building', async () => {
    const res = await request(app)
      .get('/printing/receipt/not-a-number/preview')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid order id');
    expect(mocks.buildReceiptDataForOrder).not.toHaveBeenCalled();
  });

  it('maps preview not-found errors to 404', async () => {
    mocks.buildReceiptDataForOrder.mockRejectedValue(
      Object.assign(new Error('Not found'), { statusCode: 404 })
    );

    const res = await request(app)
      .get('/printing/receipt/42/preview')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Receipt not found');
  });

  it('maps receipt print not-found errors to 404', async () => {
    mocks.buildReceiptDataForOrder.mockRejectedValue(
      Object.assign(new Error('Not found'), { statusCode: 404 })
    );

    const res = await request(app)
      .post('/printing/receipt/42')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Receipt not found');
  });

  it('returns 400 for invalid receipt print order id and skips receipt data build', async () => {
    const res = await request(app)
      .post('/printing/receipt/not-a-number')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid order id');
    expect(mocks.buildReceiptDataForOrder).not.toHaveBeenCalled();
  });

  it('maps closure print not-found errors to 404', async () => {
    mocks.buildClosureBulletinData.mockRejectedValue(
      Object.assign(new Error('Not found'), { statusCode: 404 })
    );

    const res = await request(app)
      .post('/printing/closure/19')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Closure bulletin not found');
  });

  it('returns 400 for invalid closure print bulletin id and skips bulletin data build', async () => {
    const res = await request(app)
      .post('/printing/closure/not-a-number')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid closure bulletin id');
    expect(mocks.buildClosureBulletinData).not.toHaveBeenCalled();
  });
});
