'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { printEscPosJob } = require('../src/printers/networkEscpos');

test('printEscPosJob rejects unsupported payload formats', async () => {
  await assert.rejects(
    () => printEscPosJob(
      { payload_format: 'pdf', payload_base64: '' },
      {
        printerDriver: 'network-escpos',
        printerHost: '192.168.0.95',
        printerPort: 9100,
      }
    ),
    /Unsupported payload format/
  );
});
