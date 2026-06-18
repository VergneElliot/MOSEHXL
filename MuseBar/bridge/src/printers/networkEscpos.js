'use strict';

const net = require('node:net');

function sendEscPosBuffer(buffer, options) {
  const { host, port, timeoutMs = 8000 } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    const client = net.createConnection({ host, port }, () => {
      client.write(buffer);
      client.end();
    });

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    client.setTimeout(timeoutMs);
    client.on('timeout', () => {
      client.destroy();
      settle(reject, new Error(`Printer connection timeout (${host}:${port})`));
    });
    client.on('error', (error) => {
      settle(reject, error);
    });
    client.on('close', (hadError) => {
      if (hadError) return;
      settle(resolve);
    });
  });
}

async function printEscPosJob(job, config) {
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

module.exports = { printEscPosJob, sendEscPosBuffer };
