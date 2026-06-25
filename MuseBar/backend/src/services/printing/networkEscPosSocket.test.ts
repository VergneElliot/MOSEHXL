import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolveNetworkPrinterEndpoint } from './networkEscPosSocket';

describe('resolveNetworkPrinterEndpoint', () => {
  const originalHost = process.env.THERMAL_PRINTER_HOST;
  const originalPort = process.env.THERMAL_PRINTER_PORT;

  beforeEach(() => {
    delete process.env.THERMAL_PRINTER_HOST;
    delete process.env.THERMAL_PRINTER_PORT;
  });

  afterEach(() => {
    if (originalHost === undefined) delete process.env.THERMAL_PRINTER_HOST;
    else process.env.THERMAL_PRINTER_HOST = originalHost;
    if (originalPort === undefined) delete process.env.THERMAL_PRINTER_PORT;
    else process.env.THERMAL_PRINTER_PORT = originalPort;
  });

  it('reads host and port from config', () => {
    expect(resolveNetworkPrinterEndpoint({ printerHost: '192.168.0.95', printerPort: 9100 })).toEqual({
      host: '192.168.0.95',
      port: 9100,
    });
  });

  it('falls back to env when host omitted in config', () => {
    process.env.THERMAL_PRINTER_HOST = '10.0.0.50';
    process.env.THERMAL_PRINTER_PORT = '9100';
    expect(resolveNetworkPrinterEndpoint({})).toEqual({ host: '10.0.0.50', port: 9100 });
  });

  it('throws when host is missing', () => {
    expect(() => resolveNetworkPrinterEndpoint({})).toThrow(/host is not configured/i);
  });
});
