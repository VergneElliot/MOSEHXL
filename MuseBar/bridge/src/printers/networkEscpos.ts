import net from 'node:net';

import type { BridgeConfig } from '../config';
import type { BridgePrintJob } from '../cloudClient';

export interface NetworkPrinterOptions {
  host: string;
  port: number;
  timeoutMs?: number;
}

export function sendEscPosBuffer(buffer: Buffer, options: NetworkPrinterOptions): Promise<void> {
  const { host, port, timeoutMs = 8000 } = options;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const client = net.createConnection({ host, port }, () => {
      client.write(buffer);
      client.end();
    });

    const settleResolve = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const settleReject = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    client.setTimeout(timeoutMs);
    client.on('timeout', () => {
      client.destroy();
      settleReject(new Error(`Printer connection timeout (${host}:${port})`));
    });
    client.on('error', (error) => {
      settleReject(error);
    });
    client.on('close', (hadError) => {
      if (hadError) return;
      settleResolve();
    });
  });
}

export async function printEscPosJob(job: BridgePrintJob, config: BridgeConfig): Promise<void> {
  if (job.payload_format !== 'escpos') {
    throw new Error(`Unsupported payload format: ${job.payload_format}`);
  }
  if (config.printerDriver !== 'network-escpos') {
    throw new Error(`Unsupported printer driver: ${config.printerDriver}`);
  }

  const payload = Buffer.from(job.payload_base64, 'base64');
  await sendEscPosBuffer(payload, {
    host: config.printerHost,
    port: config.printerPort,
    timeoutMs: config.printerTimeoutMs,
  });
}
