import net from 'net';

export interface SendEscPosOptions {
  host: string;
  port: number;
  timeoutMs?: number;
}

/**
 * Push raw ESC/POS bytes to a network receipt printer (typically port 9100).
 * Backend must run on the same LAN as the printer.
 */
export function sendEscPosToPrinter(
  content: string,
  options: SendEscPosOptions
): Promise<void> {
  const { host, port, timeoutMs = 8000 } = options;

  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host, port }, () => {
      client.write(Buffer.from(content, 'latin1'));
      client.end();
    });

    client.setTimeout(timeoutMs);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error(`Printer connection timeout (${host}:${port})`));
    });
    client.on('error', (error) => {
      reject(error);
    });
    client.on('close', (hadError) => {
      if (hadError) return;
      resolve();
    });
  });
}

export function resolveNetworkPrinterEndpoint(config: Record<string, unknown>): {
  host: string;
  port: number;
} {
  const hostRaw = config.printerHost ?? process.env.THERMAL_PRINTER_HOST;
  const portRaw = config.printerPort ?? process.env.THERMAL_PRINTER_PORT ?? 9100;
  const host = typeof hostRaw === 'string' ? hostRaw.trim() : String(hostRaw ?? '').trim();
  const port = typeof portRaw === 'number' ? portRaw : parseInt(String(portRaw), 10);

  if (!host) {
    throw new Error('Network printer host is not configured (printerHost or THERMAL_PRINTER_HOST)');
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error('Network printer port must be between 1 and 65535');
  }

  return { host, port };
}
