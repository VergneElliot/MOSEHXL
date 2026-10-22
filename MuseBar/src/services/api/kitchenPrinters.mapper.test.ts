import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createKitchenPrinter, getKitchenPrinters } from './kitchenPrinters';
import { request } from './core';

vi.mock('./core', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

const raw = {
  id: 2,
  name: 'Bar',
  slug: 'bar',
  connection_type: 'network_escpos' as const,
  connection_config: { host: '10.0.0.8', port: 9100 },
  display_order: 3,
  is_active: true,
};

describe('kitchenPrinters API DTO mapper', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('maps printer connection config fields', async () => {
    mockedRequest.mockResolvedValueOnce([
      { ...raw, connection_config: null, display_order: null, is_active: false },
    ]);
    const [printer] = await getKitchenPrinters();
    expect(printer).toMatchObject({
      id: '2',
      name: 'Bar',
      connectionType: 'network_escpos',
      connectionConfig: {},
      displayOrder: 0,
      isActive: false,
    });
  });

  it('createKitchenPrinter posts camel→snake and maps the response', async () => {
    mockedRequest.mockResolvedValueOnce(raw);
    const printer = await createKitchenPrinter({
      name: 'Bar',
      slug: '  bar  ',
      connectionType: 'network_escpos',
      connectionConfig: { host: '10.0.0.8', port: 9100 },
      displayOrder: 3,
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/kitchen-printers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Bar',
          slug: 'bar',
          connection_type: 'network_escpos',
          connection_config: { host: '10.0.0.8', port: 9100 },
          display_order: 3,
        }),
      })
    );
    expect(printer).toMatchObject({
      id: '2',
      connectionConfig: { host: '10.0.0.8', port: 9100 },
    });
  });
});
