'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadDotEnv } = require('../src/config');

test('loadDotEnv reads key value pairs without overriding process env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'musebar-bridge-'));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, 'MUSEBAR_API_URL=https://mosehxl.com\nPRINTER_PORT=9100\n');

  delete process.env.MUSEBAR_API_URL;
  process.env.PRINTER_PORT = '9200';
  loadDotEnv(envPath);

  assert.equal(process.env.MUSEBAR_API_URL, 'https://mosehxl.com');
  assert.equal(process.env.PRINTER_PORT, '9200');
});
