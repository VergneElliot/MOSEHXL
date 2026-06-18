'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadDotEnv(filePath = path.join(process.cwd(), '.env')) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (process.env[key] != null) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalInt(name, defaultValue) {
  const raw = process.env[name]?.trim();
  if (!raw) return defaultValue;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be an integer`);
  }
  return value;
}

function loadConfig() {
  loadDotEnv();
  const apiUrl = required('MUSEBAR_API_URL').replace(/\/$/, '');
  const printerPort = optionalInt('PRINTER_PORT', 9100);
  if (printerPort < 1 || printerPort > 65535) {
    throw new Error('PRINTER_PORT must be between 1 and 65535');
  }

  return {
    apiUrl,
    establishmentId: required('ESTABLISHMENT_ID'),
    bridgeKey: required('BRIDGE_KEY'),
    printerDriver: process.env.PRINTER_DRIVER?.trim() || 'network-escpos',
    printerHost: required('PRINTER_HOST'),
    printerPort,
    pollIntervalMs: optionalInt('POLL_INTERVAL_MS', 2000),
    printerTimeoutMs: optionalInt('PRINTER_TIMEOUT_MS', 8000),
  };
}

module.exports = { loadConfig, loadDotEnv };
