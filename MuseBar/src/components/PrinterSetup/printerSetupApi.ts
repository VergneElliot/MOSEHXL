import { apiConfig } from '../../config/api';
import { apiCore } from '../../services/api';
import type { Printer, PrinterConfigValues, PrintingConfig } from './printerSetupProviders';

interface PrintingConfigurationsResponse {
  configurations?: Array<PrintingConfig & { is_active?: boolean }>;
}

export interface PrintingTestResponse {
  success?: boolean;
  message?: string;
  printJobId?: string;
}

interface PrintingConfigurationSaveResponse {
  configuration?: PrintingConfig;
  message?: string;
}

interface PrintersResponse {
  printers?: Printer[];
}

function authHeaders(json = false): Record<string, string> {
  const token = apiCore.getToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchActivePrintingConfiguration(): Promise<PrintingConfig | null> {
  const response = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as PrintingConfigurationsResponse;
  if (!data.configurations || data.configurations.length === 0) return null;
  return data.configurations.find((c) => c.is_active) ?? null;
}

export async function savePrintingConfiguration(
  provider: string,
  config: PrinterConfigValues
): Promise<PrintingConfig | null> {
  const response = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
    body: JSON.stringify({ provider, config }),
  });
  if (!response.ok) {
    throw new Error('Failed to save configuration');
  }
  const saved = (await response.json()) as PrintingConfigurationSaveResponse;
  return saved.configuration ?? null;
}

export async function requestTestPrint(): Promise<PrintingTestResponse> {
  const response = await fetch(apiConfig.getEndpoint('/api/printing/test'), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(true),
  });
  return (await response.json()) as PrintingTestResponse;
}

/** Resolves to null when the endpoint is unavailable so the caller keeps its current list. */
export async function fetchPrinters(): Promise<Printer[] | null> {
  const response = await fetch(apiConfig.getEndpoint('/api/printing/printers'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as PrintersResponse;
  return data.printers || [];
}
