'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { parsePrintersJson } = require('../dist/config');
const { resolvePrinterEndpoint } = require('../dist/printers/networkEscpos');

test('parsePrintersJson validates slug host and port', () => {
  const printers = parsePrintersJson(JSON.stringify([
    { slug: 'bar', host: '192.168.0.95', port: 9100 },
    { slug: 'cuisine', host: '192.168.0.96' },
  ]));
  assert.deepEqual(printers, [
    { slug: 'bar', host: '192.168.0.95', port: 9100 },
    { slug: 'cuisine', host: '192.168.0.96', port: 9100 },
  ]);
});

test('resolvePrinterEndpoint routes kitchen jobs by slug', () => {
  const endpoint = resolvePrinterEndpoint(
    {
      document_type: 'kitchen_order',
      metadata: { kitchen_printer_slug: 'cuisine' },
    },
    {
      printerHost: '192.168.0.95',
      printerPort: 9100,
      printers: [
        { slug: 'bar', host: '192.168.0.95', port: 9100 },
        { slug: 'cuisine', host: '192.168.0.96', port: 9100 },
      ],
    }
  );
  assert.deepEqual(endpoint, { host: '192.168.0.96', port: 9100 });
});

test('resolvePrinterEndpoint falls back to default printer for receipts', () => {
  const endpoint = resolvePrinterEndpoint(
    { document_type: 'receipt', metadata: {} },
    {
      printerHost: '192.168.0.95',
      printerPort: 9100,
      printers: [{ slug: 'bar', host: '192.168.0.99', port: 9100 }],
    }
  );
  assert.deepEqual(endpoint, { host: '192.168.0.95', port: 9100 });
});
